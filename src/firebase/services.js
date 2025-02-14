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
  orderBy 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './config';

// Authentication Services
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Google Authentication
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user exists in database
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user document if it doesn't exist
      await addDoc(collection(db, 'users'), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: new Date().toISOString()
      });
    }
    
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Conversation Services
export const saveConversation = async (userId, conversation) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const docRef = await addDoc(conversationsRef, {
      userId,
      ...conversation,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateConversation = async (conversationId, updates) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
  } catch (error) {
    throw error;
  }
};

export const getUserConversations = async (userId) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Learning Path Services
export const saveLearningPath = async (userId, path) => {
  try {
    const pathsRef = collection(db, 'learningPaths');
    const docRef = await addDoc(pathsRef, {
      userId,
      ...path,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateLearningPath = async (pathId, updates) => {
  try {
    const pathRef = doc(db, 'learningPaths', pathId);
    await updateDoc(pathRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
};

export const deleteLearningPath = async (pathId) => {
  try {
    const pathRef = doc(db, 'learningPaths', pathId);
    await deleteDoc(pathRef);
  } catch (error) {
    throw error;
  }
};

export const getUserLearningPaths = async (userId) => {
  try {
    const pathsRef = collection(db, 'learningPaths');
    const q = query(
      pathsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// File Upload Service
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    throw error;
  }
}; 