// eslint-disable-next-line no-unused-vars
import * as faceapi from 'face-api.js';

// Import Firebase modules and use the existing Firebase instance
import { getFirestore, collection, addDoc, query, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Firebase configuration - use the same config as the main project
const firebaseConfig = {
  apiKey: "AIzaSyDiK3T07NvTjFJ5S2gLCRXYLZdfAOM-oz4",
  authDomain: "zybl-key.firebaseapp.com",
  projectId: "zybl-key",
  storageBucket: "zybl-key.firebasestorage.app",
  messagingSenderId: "457906869938",
  appId: "1:457906869938:web:b8932aa47c1b83d0529bab"
};

// Get Firebase instance
let app = null;
let db = null;

try {
  console.log('Setting up Firebase for face verification...');
  
  // Check if Firebase app already exists
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log('Using existing Firebase app');
  } else {
    app = initializeApp(firebaseConfig);
    console.log('Initialized new Firebase app');
  }
  
  db = getFirestore(app);
  console.log('Firebase Firestore initialized successfully for face verification');
  console.log('Database instance:', db ? 'Available' : 'Not available');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  db = null;
}

// Function to generate face vector from detection data
export const generateFaceVector = (detection) => {
  if (!detection || !detection.descriptor) {
    throw new Error('Invalid face detection data');
  }
  return Array.from(detection.descriptor);
};

// Function to encrypt face vector
export const encryptFaceVector = (vector) => {
  if (!vector || !Array.isArray(vector)) {
    throw new Error('Invalid face vector');
  }
  // For now, we'll just store the vector as is
  // In production, you should implement proper encryption
  return vector;
};

// Function to decrypt face vector
export const decryptFaceVector = (encryptedVector) => {
  if (!encryptedVector || !Array.isArray(encryptedVector)) {
    throw new Error('Invalid encrypted vector');
  }
  // For now, we'll just return the vector as is
  // In production, you should implement proper decryption
  return encryptedVector;
};

// Function to calculate similarity between two vectors
export const calculateSimilarity = (vector1, vector2) => {
  try {
    // Ensure vectors are arrays and have the same length
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
      console.error('Invalid vector format:', { vector1, vector2 });
      throw new Error('Vectors must be arrays');
    }

    if (vector1.length !== vector2.length) {
      console.error('Vector length mismatch:', { 
        vector1Length: vector1.length, 
        vector2Length: vector2.length 
      });
      throw new Error('Vectors must be of same length');
    }

    // Pre-process vectors to ensure they're normalized
    const processedVector1 = vector1.map(val => Number(val));
    const processedVector2 = vector2.map(val => Number(val));
    
    // Check for invalid values
    const hasInvalidValues = [...processedVector1, ...processedVector2].some(val => isNaN(val));
    if (hasInvalidValues) {
      console.error('Invalid vector values detected');
      throw new Error('Invalid vector values');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < processedVector1.length; i++) {
      const v1 = processedVector1[i];
      const v2 = processedVector2[i];
      
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      console.warn('Zero norm detected:', { norm1, norm2 });
      return 0;
    }

    const similarity = dotProduct / (norm1 * norm2);
    // Ensure the similarity is within the valid range [0, 1]
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error('Error in calculateSimilarity:', error);
    throw error;
  }
};

// Function to store face vector in Firebase (deprecated - use storeFaceVectorWithUserId)
export const storeFaceVector = async (faceVector) => {
  console.warn('storeFaceVector is deprecated. Use storeFaceVectorWithUserId instead.');
  return await storeFaceVectorWithUserId(faceVector, 'unknown-user');
};

// Function to check for existing face vectors for a specific user
export const checkExistingFaceVectorForUser = async (faceVector, userId) => {
  console.log('checkExistingFaceVectorForUser called for unique session ID:', userId, 'db status:', db ? 'Available' : 'Not available');
  
  // Check if Firebase is available
  if (!db) {
    console.warn('Firebase is not available, skipping face vector check');
    return false;
  }
  
  try {
    if (!Array.isArray(faceVector)) {
      throw new Error('Invalid face vector format');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('🔍 Checking for existing face vector for unique session ID:', userId);
    console.log('📁 Checking path: users/' + userId + '/faceVectors');
    
    // Check in the user-specific subcollection
    const userFaceVectorsRef = collection(db, 'users', userId, 'faceVectors');
    const q = query(userFaceVectorsRef);
    const querySnapshot = await getDocs(q);
    
    console.log('Found', querySnapshot.docs.length, 'existing vectors for unique session ID:', userId);
    
    // Return the most similar face found for this user
    let highestSimilarity = 0;
    let bestMatch = null;
    
    // Keep track of all faces with similarity > 0.7 for debugging
    const similarFaces = [];
    
    for (const doc of querySnapshot.docs) {
      const storedData = doc.data();
      const storedVector = storedData.vector;
      
      if (!Array.isArray(storedVector)) {
        console.warn('Invalid stored vector format in document:', doc.id);
        continue;
      }

      try {
        const similarity = calculateSimilarity(faceVector, storedVector);
        
        // Track faces with significant similarity for debugging
        if (similarity > 0.7) {
          similarFaces.push({
            id: doc.id, 
            similarity, 
            userId: userId,
            sessionId: storedData.sessionId,
            timestamp: storedData.timestamp
          });
        }
        
        // Track the highest similarity found
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = {
            id: doc.id,
            similarity,
            userId: userId,
            sessionId: storedData.sessionId,
            timestamp: storedData.timestamp,
            walletAddress: storedData.walletAddress
          };
        }
      } catch (error) {
        console.warn('Error comparing vectors:', error);
        continue;
      }
    }
    
    // Log all similar faces for debugging
    if (similarFaces.length > 0) {
      console.log('Similar faces found for unique session ID', userId + ':');
      similarFaces.sort((a, b) => b.similarity - a.similarity);
      similarFaces.forEach(face => {
        console.log(`Document ID: ${face.id}, Similarity: ${face.similarity.toFixed(4)}, Session ID: ${face.sessionId}, Timestamp: ${face.timestamp}`);
      });
    }
    
    // If we found a match above threshold, return it
    // 0.9 is a more strict threshold for face recognition (same person)
    if (highestSimilarity > 0.9) {
      console.log('✅ Face match found for unique session ID', userId, 'with similarity:', highestSimilarity.toFixed(4));
      return bestMatch;
    } else if (highestSimilarity > 0.75) {
      // For debugging: log close matches that didn't meet our threshold
      console.log('⚠️ Near match found for unique session ID', userId, 'but below threshold:', highestSimilarity.toFixed(4));
    } else {
      console.log('❌ No face match found for unique session ID:', userId);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking existing face vector for unique session ID:', error);
    return false; // Don't throw, just return false
  }
};

// Function to check for existing face vectors (legacy - checks all users)
export const checkExistingFaceVector = async (faceVector) => {
  console.log('checkExistingFaceVector called (legacy method), db status:', db ? 'Available' : 'Not available');
  console.warn('Using legacy checkExistingFaceVector. Consider using checkExistingFaceVectorForUser for better performance.');
  
  // Check if Firebase is available
  if (!db) {
    console.warn('Firebase is not available, skipping face vector check');
    return false;
  }
  
  try {
    if (!Array.isArray(faceVector)) {
      throw new Error('Invalid face vector format');
    }

    console.log('Checking for existing face vector across all users...');
    const faceVectorsRef = collection(db, 'faceVectors');
    
    const q = query(faceVectorsRef);
    const querySnapshot = await getDocs(q);
    
    console.log('Found', querySnapshot.docs.length, 'existing vectors in legacy collection');
    
    // Return the most similar face found
    let highestSimilarity = 0;
    let bestMatch = null;
    
    // Keep track of all faces with similarity > 0.7 for debugging
    const similarFaces = [];
    
    for (const doc of querySnapshot.docs) {
      const storedData = doc.data();
      const storedVector = storedData.vector;
      
      if (!Array.isArray(storedVector)) {
        console.warn('Invalid stored vector format in document:', doc.id);
        continue;
      }

      try {
        const similarity = calculateSimilarity(faceVector, storedVector);
        
        // Track faces with significant similarity for debugging
        if (similarity > 0.7) {
          similarFaces.push({
            id: doc.id, 
            similarity, 
            walletAddress: storedData.walletAddress
          });
        }
        
        // Track the highest similarity found
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = {
            id: doc.id,
            similarity,
            walletAddress: storedData.walletAddress,
            timestamp: storedData.timestamp
          };
        }
      } catch (error) {
        console.warn('Error comparing vectors:', error);
        continue;
      }
    }
    
    // Log all similar faces for debugging
    if (similarFaces.length > 0) {
      console.log('Similar faces found in legacy collection:');
      similarFaces.sort((a, b) => b.similarity - a.similarity);
      similarFaces.forEach(face => {
        console.log(`ID: ${face.id}, Similarity: ${face.similarity.toFixed(4)}, Wallet: ${face.walletAddress || 'none'}`);
      });
    }
    
    // If we found a match above threshold, return it
    if (highestSimilarity > 0.9) {
      console.log('Face match found in legacy collection with similarity:', highestSimilarity.toFixed(4));
      return bestMatch;
    } else if (highestSimilarity > 0.75) {
      // For debugging: log close matches that didn't meet our threshold
      console.log('Near match found in legacy collection but below threshold:', highestSimilarity.toFixed(4));
    }
    
    return false;
  } catch (error) {
    console.error('Error checking existing face vector in legacy collection:', error);
    return false; // Don't throw, just return false
  }
};

// Function to store face vector in Firebase with user ID (recommended)
export const storeFaceVectorWithUserId = async (faceVector, userId, walletAddress = null) => {
  console.log('storeFaceVectorWithUserId called for unique session ID:', userId, 'wallet:', walletAddress, 'db status:', db ? 'Available' : 'Not available');
  
  // Check if Firebase is available
  if (!db) {
    console.warn('Firebase is not available, skipping face vector storage');
    return false;
  }
  
  try {
    if (!Array.isArray(faceVector)) {
      throw new Error('Invalid face vector format');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Store in user-specific subcollection: users/{uniqueSessionId}/faceVectors/{docId}
    const userFaceVectorsRef = collection(db, 'users', userId, 'faceVectors');
    const timestamp = new Date().toISOString();
    
    const docData = {
      vector: faceVector,
      timestamp: timestamp,
      userId: userId,
      sessionId: userId // Store the session ID explicitly for reference
    };

    // Add wallet address if provided
    if (walletAddress) {
      docData.walletAddress = walletAddress;
    }
    
    const docRef = await addDoc(userFaceVectorsRef, docData);

    console.log('✅ Successfully stored face vector for unique session ID:', userId, 'with document ID:', docRef.id);
    console.log('📁 Storage path: users/' + userId + '/faceVectors/' + docRef.id);
    return true;
  } catch (error) {
    console.error('❌ Error storing face vector for unique session ID:', error);
    return false;
  }
};

// Function to store face vector in Firebase with wallet address (legacy - will be deprecated)
export const storeFaceVectorWithWallet = async (faceVector, walletAddress) => {
  console.log('storeFaceVectorWithWallet called (legacy method), db status:', db ? 'Available' : 'Not available');
  console.warn('storeFaceVectorWithWallet is legacy. Consider using storeFaceVectorWithUserId for better organization.');
  
  // Check if Firebase is available
  if (!db) {
    console.warn('Firebase is not available, skipping face vector storage');
    return false;
  }
  
  try {
    if (!Array.isArray(faceVector)) {
      throw new Error('Invalid face vector format');
    }

    const faceVectorsRef = collection(db, 'faceVectors');
    const timestamp = new Date().toISOString();
    
    const docRef = await addDoc(faceVectorsRef, {
      vector: faceVector,
      timestamp: timestamp,
      walletAddress: walletAddress || 'unknown'
    });

    console.log('Successfully stored face vector with wallet address:', walletAddress, 'ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Error storing face vector with wallet:', error);
    return false;
  }
};

// Utility function to generate a consistent user ID from available data
export const generateUserId = (walletAddress, email, customId) => {
  // Priority: customId > walletAddress > email > fallback
  if (customId) return customId;
  if (walletAddress) return walletAddress;
  if (email) return email;
  
  // Fallback to a session-based ID (not recommended for production)
  console.warn('No user identifier provided, using session-based ID');
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

// Function to get all face vectors for a specific user
export const getUserFaceVectors = async (userId) => {
  console.log('getUserFaceVectors called for user:', userId, 'db status:', db ? 'Available' : 'Not available');
  
  if (!db) {
    console.warn('Firebase is not available');
    return [];
  }
  
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userFaceVectorsRef = collection(db, 'users', userId, 'faceVectors');
    const q = query(userFaceVectorsRef);
    const querySnapshot = await getDocs(q);
    
    const vectors = [];
    querySnapshot.forEach((doc) => {
      vectors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Retrieved', vectors.length, 'face vectors for user:', userId);
    return vectors;
  } catch (error) {
    console.error('Error getting user face vectors:', error);
    return [];
  }
};

// Function to delete a specific face vector for a user
export const deleteUserFaceVector = async (userId, vectorId) => {
  console.log('deleteUserFaceVector called for user:', userId, 'vector:', vectorId, 'db status:', db ? 'Available' : 'Not available');
  
  if (!db) {
    console.warn('Firebase is not available');
    return false;
  }
  
  try {
    if (!userId || !vectorId) {
      throw new Error('User ID and vector ID are required');
    }

    const { doc, deleteDoc } = await import('firebase/firestore');
    const vectorRef = doc(db, 'users', userId, 'faceVectors', vectorId);
    await deleteDoc(vectorRef);
    
    console.log('Successfully deleted face vector:', vectorId, 'for user:', userId);
    return true;
  } catch (error) {
    console.error('Error deleting user face vector:', error);
    return false;
  }
};
