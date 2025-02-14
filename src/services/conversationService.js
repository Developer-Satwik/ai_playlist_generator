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

// Add a new conversation entry
export const addConversation = (topic, data) => {
  try {
    const history = initializeHistory();
    const newConversation = {
      id: `conv_${Date.now()}`,
      topic,
      timestamp: getTimestamp(),
      data: {
        ...data,
        interactions: data.interactions || []
      }
    };

    history.conversations.unshift(newConversation);
    saveHistory(history);
    return newConversation;
  } catch (error) {
    console.error('Error adding conversation:', error);
    throw error;
  }
};

// Add an interaction to an existing conversation
export const addInteraction = (conversationId, interaction) => {
  try {
    const history = initializeHistory();
    const conversationIndex = history.conversations.findIndex(
      conv => conv.id === conversationId
    );

    if (conversationIndex === -1) {
      throw new Error('Conversation not found');
    }

    const newInteraction = {
      id: `int_${Date.now()}`,
      timestamp: getTimestamp(),
      ...interaction
    };

    history.conversations[conversationIndex].data.interactions.push(newInteraction);
    saveHistory(history);
    return newInteraction;
  } catch (error) {
    console.error('Error adding interaction:', error);
    throw error;
  }
};

// Get all conversations
export const getConversations = () => {
  try {
    const history = initializeHistory();
    return history.conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
};

// Get a specific conversation by ID
export const getConversationById = (conversationId) => {
  try {
    const history = initializeHistory();
    return history.conversations.find(conv => conv.id === conversationId);
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
};

// Update conversation data
export const updateConversation = (conversationId, updates) => {
  try {
    const history = initializeHistory();
    const conversationIndex = history.conversations.findIndex(
      conv => conv.id === conversationId
    );

    if (conversationIndex === -1) {
      throw new Error('Conversation not found');
    }

    history.conversations[conversationIndex] = {
      ...history.conversations[conversationIndex],
      ...updates,
      lastUpdated: getTimestamp()
    };

    saveHistory(history);
    return history.conversations[conversationIndex];
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
};

// Delete a conversation
export const deleteConversation = (conversationId) => {
  try {
    const history = initializeHistory();
    const updatedConversations = history.conversations.filter(
      conv => conv.id !== conversationId
    );

    saveHistory({ ...history, conversations: updatedConversations });
    return true;
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