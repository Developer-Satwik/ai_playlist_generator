import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

// Conversation history structure
const CONVERSATION_STORAGE_KEY = 'learning_conversation_history';

// Helper function to get timestamp
const getTimestamp = () => new Date().toISOString();

// Initialize conversation history from localStorage
const initializeHistory = () => {
  try {
    const storedHistory = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : {
      conversations: [],
      lastUpdated: getTimestamp()
    };
  } catch (error) {
    console.error('Error initializing conversation history:', error);
    return {
      conversations: [],
      lastUpdated: getTimestamp()
    };
  }
};

// Save conversation history to localStorage
const saveHistory = (history) => {
  try {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify({
      ...history,
      lastUpdated: getTimestamp()
    }));
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
};

// Add a new conversation
export const addConversation = async (topic, initialMessage) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const conversationData = {
      userId: user.uid,
      topic,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [{
        type: 'bot',
        content: initialMessage,
        timestamp: new Date().toISOString()
      }]
    };

    const docRef = await addDoc(collection(db, 'conversations'), conversationData);
    return {
      id: docRef.id,
      ...conversationData
    };
  } catch (error) {
    console.error('Error adding conversation:', error);
    throw error;
  }
};

// Add a message to an existing conversation
export const addMessage = async (conversationId, message) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();
    if (conversation.userId !== user.uid) {
      throw new Error('Unauthorized access to conversation');
    }

    const updatedMessages = [...conversation.messages, {
      ...message,
      timestamp: new Date().toISOString()
    }];

    await updateDoc(conversationRef, {
      messages: updatedMessages,
      updatedAt: serverTimestamp()
    });

    return {
      id: conversationId,
      ...conversation,
      messages: updatedMessages
    };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

// Get all conversations for the current user
export const getUserConversations = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    try {
      // Try with the compound query first
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (indexError) {
      // If index error occurs, fall back to simple query and manual sort
      console.warn('Index not ready, falling back to simple query:', indexError);
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        });
    }
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

// Get a specific conversation by ID
export const getConversation = async (conversationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();
    if (conversation.userId !== user.uid) {
      throw new Error('Unauthorized access to conversation');
    }

    return {
      id: conversationId,
      ...conversation
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

// Delete a conversation
export const deleteConversation = async (conversationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated');

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();
    if (conversation.userId !== user.uid) {
      throw new Error('Unauthorized access to conversation');
    }

    await deleteDoc(conversationRef);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

// Clear all conversation history
export const clearHistory = () => {
  try {
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    throw error;
  }
};

// Export conversation history
export const exportHistory = async () => {
  try {
    const history = initializeHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    return blob;
  } catch (error) {
    console.error('Error exporting conversation history:', error);
    throw error;
  }
};

// Import conversation history
export const importHistory = async (jsonFile) => {
  try {
    const text = await jsonFile.text();
    const importedHistory = JSON.parse(text);
    
    // Validate imported data structure
    if (!importedHistory.conversations || !Array.isArray(importedHistory.conversations)) {
      throw new Error('Invalid history format');
    }

    saveHistory(importedHistory);
    return true;
  } catch (error) {
    console.error('Error importing conversation history:', error);
    throw error;
  }
}; 