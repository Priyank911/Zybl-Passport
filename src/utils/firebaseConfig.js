// Firebase configuration for Zybl Passport
// src/utils/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, query, where, getDocs, orderBy, limit, Timestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDiK3T07NvTjFJ5S2gLCRXYLZdfAOM-oz4",
  authDomain: "zybl-key.firebaseapp.com",
  projectId: "zybl-key",
  storageBucket: "zybl-key.firebasestorage.app",
  messagingSenderId: "457906869938",
  appId: "1:457906869938:web:b8932aa47c1b83d0529bab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const USERS_COLLECTION = 'users';
const USER_JOURNEYS_COLLECTION = 'userJourneys';
const PAYMENTS_COLLECTION = 'payments';
const DID_DOCUMENTS_COLLECTION = 'didDocuments';
const VERIFICATION_COLLECTION = 'verifications';
const USER_SETTINGS_COLLECTION = 'userSettings';
const WALLET_CONNECTIONS_COLLECTION = 'walletConnections';

// Default user settings
const DEFAULT_USER_SETTINGS = {
  notifications: {
    emailNotifications: true,
    securityAlerts: true,
    shareAnonymizedData: true
  },
  walletPreferences: {
    defaultNetwork: 'ethereum',
    autoConnectWallet: true
  },
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    lastUpdated: new Date()
  },
  createdAt: new Date(),
  lastUpdated: new Date()
};

// Helper to safely convert Firestore Timestamp, string, or Date to Date
function safeToDate(val) {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
  if (typeof val === 'string') return new Date(val);
  if (val instanceof Date) return val;
  return new Date(val);
}

/**
 * Create or get existing user ID for wallet address
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<string>} - Unique user ID
 */
export const createOrGetUserID = async (walletAddress) => {
  try {
    // Check if user with this wallet address exists
    const userQuery = query(collection(db, USERS_COLLECTION), where('walletAddress', '==', walletAddress));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      // User exists, return their ID
      const userData = userSnapshot.docs[0].data();
      return userData.userID;
    }
    
    // Create new user with unique ID
    const userID = uuidv4();
    await setDoc(doc(db, USERS_COLLECTION, userID), {
      userID,
      walletAddress,
      createdAt: new Date(),
      lastActive: new Date()
    });
    
    return userID;
  } catch (error) {
    console.error("Error creating/getting user ID:", error);
    // Fallback to local unique ID if Firebase fails
    return `local_${uuidv4()}`;
  }
};

/**
 * Track user journey step
 * @param {string} userID - Unique user ID
 * @param {string} step - Current journey step (signin, verification, payment, dashboard)
 * @param {Object} data - Additional data for this step
 * @returns {Promise<boolean>} - Success status
 */
export const trackUserJourney = async (userID, step, data = {}) => {
  try {
    // Get journey document or create if it doesn't exist
    const journeyRef = doc(db, USER_JOURNEYS_COLLECTION, userID);
    const journeyDoc = await getDoc(journeyRef);
    
    if (journeyDoc.exists()) {
      // Update existing journey
      await updateDoc(journeyRef, {
        [`${step}Completed`]: true,
        [`${step}CompletedAt`]: new Date(),
        [`${step}Data`]: data,
        lastUpdated: new Date()
      });
    } else {
      // Create new journey record
      await setDoc(journeyRef, {
        userID,
        journeyStarted: new Date(),
        [`${step}Completed`]: true,
        [`${step}CompletedAt`]: new Date(),
        [`${step}Data`]: data,
        lastUpdated: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Error tracking user journey step ${step}:`, error);
    return false;
  }
};

/**
 * Get user data from Firebase by userID
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getUserData = async (userID) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userID);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        createdAt: safeToDate(userDoc.data().createdAt),
        lastActive: safeToDate(userDoc.data().lastActive)
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

/**
 * Get user journey data from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object|null>} - User journey data or null if not found
 */
export const getUserJourney = async (userID) => {
  try {
    const journeyRef = doc(db, USER_JOURNEYS_COLLECTION, userID);
    const journeyDoc = await getDoc(journeyRef);
    
    if (journeyDoc.exists()) {
      const data = journeyDoc.data();
      // Convert timestamps to JS Dates
      const formattedData = {
        ...data,
        journeyStarted: safeToDate(data.journeyStarted),
        lastUpdated: safeToDate(data.lastUpdated)
      };
      
      // Convert other timestamps
      ['signin', 'verification', 'payment', 'dashboard'].forEach(step => {
        if (data[`${step}CompletedAt`]) {
          formattedData[`${step}CompletedAt`] = safeToDate(data[`${step}CompletedAt`]);
        }
      });
      
      return formattedData;
    }
    return null;
  } catch (error) {
    console.error("Error getting user journey data:", error);
    return null;
  }
};

/**
 * Get user verification status from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object|null>} - Verification data or null if not found
 */
export const getVerificationStatus = async (userID) => {
  console.log("🔍 Fetching verification status for user:", userID);
  
  try {
    // First try to get verification data from the journey data
    // This is often where verification status is stored
    try {
      console.log("🔍 Looking for verification in user journey data");
      const journeyRef = doc(db, USER_JOURNEYS_COLLECTION, userID);
      const journeyDoc = await getDoc(journeyRef);
      
      if (journeyDoc.exists()) {
        const journeyData = journeyDoc.data();
        
        // If verification step is completed, we consider the user verified
        if (journeyData.verificationCompleted) {
          console.log("✅ Found verification data in user journey");
          const verificationDate = journeyData.verificationCompletedAt?.toDate() || new Date();
          
          // Use verification data from journey or set defaults
          return {
            status: 'Verified',
            score: journeyData.verificationData?.score || 95,
            timestamp: verificationDate,
            lastVerified: verificationDate,
            userID: userID,
            source: 'journey'
          };
        }
      }
    } catch (journeyError) {
      console.warn("⚠️ Error checking journey for verification data:", journeyError);
    }
    
    // Then try verification collection with ordering (might require index)
    try {
      console.log("🔍 Looking in verification collection with ordering");
      const verificationQuery = query(
        collection(db, VERIFICATION_COLLECTION), 
        where('userID', '==', userID),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(verificationQuery);
      if (!snapshot.empty) {
        console.log("✅ Found verification in verification collection with ordering");
        const verificationData = snapshot.docs[0].data();
        return {
          ...verificationData,
          timestamp: safeToDate(verificationData.timestamp),
          lastVerified: safeToDate(verificationData.timestamp),
          source: 'verification_collection'
        };
      }
    } catch (indexError) {
      console.warn("⚠️ Index error for verification query with ordering, falling back to simple query:", indexError);
      // Fall back to simpler query without ordering if index doesn't exist
      try {
        console.log("🔍 Looking in verification collection without ordering");
        const simpleQuery = query(
          collection(db, VERIFICATION_COLLECTION),
          where('userID', '==', userID)
        );
        
        const snapshot = await getDocs(simpleQuery);
        if (!snapshot.empty) {
          console.log("✅ Found verification in verification collection without ordering");
          // Just get the first result since we can't order without the index
          const verificationData = snapshot.docs[0].data();
          return {
            ...verificationData,
            timestamp: safeToDate(verificationData.timestamp),
            lastVerified: safeToDate(verificationData.timestamp),
            source: 'verification_collection_simple'
          };
        }
      } catch (simpleQueryError) {
        console.warn("⚠️ Error in simple verification query:", simpleQueryError);
      }
    }
    
    // Check if user made a payment - if yes, they're likely verified
    try {
      console.log("🔍 Looking in payment history for verification inference");
      const paymentQuery = query(
        collection(db, PAYMENTS_COLLECTION),
        where('userID', '==', userID)
      );
      
      const paymentSnapshot = await getDocs(paymentQuery);
      if (!paymentSnapshot.empty) {
        console.log("✅ Found payments, inferring verification status");
        // If user has payments, we can infer they're verified at some level
        return {
          status: 'Verified',
          score: 90, // Good score for having made a payment
          timestamp: new Date(),
          lastVerified: paymentSnapshot.docs[0].data().timestamp?.toDate() || new Date(),
          userID: userID,
          source: 'payment_inference'
        };
      }
    } catch (paymentError) {
      console.warn("⚠️ Error checking payment history for verification inference:", paymentError);
    }
    
    // Check user data for verification fields
    try {
      console.log("🔍 Looking in user data for verification fields");
      const userDataRef = doc(db, USERS_COLLECTION, userID);
      const userData = await getDoc(userDataRef);
      
      if (userData.exists()) {
        const data = userData.data();
        if (data.verified || data.verificationStatus) {
          console.log("✅ Found verification data in user document");
          return {
            status: data.verified ? 'Verified' : (data.verificationStatus?.status || 'Partial'),
            score: data.verificationScore || data.verificationStatus?.score || 80,
            timestamp: data.lastActive?.toDate() || new Date(),
            lastVerified: data.lastVerified?.toDate() || data.lastActive?.toDate() || new Date(),
            userID: userID,
            source: 'user_data'
          };
        }
      }
    } catch (userDataError) {
      console.warn("⚠️ Error checking user data for verification fields:", userDataError);
    }
    
    // If we got here, no verification data was found
    console.log("❌ No verification data found for this user");
    return null;
  } catch (error) {
    console.error("❌ Error getting verification status:", error);
    // Provide default verification data as fallback
    return {
      status: 'Unverified',
      score: 85, // Default score
      timestamp: new Date(),
      lastVerified: new Date(),
      userID: userID,
      source: 'fallback'
    };
  }
};

/**
 * Get user's DID document from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object|null>} - DID document or null if not found
 */
export const getUserDID = async (userID) => {
  if (!userID) {
    console.error("❌ Cannot fetch DID: userID is null or undefined");
    return null;
  }
  
  console.log("🔍 Fetching DID document for user:", userID);
  try {
    // First try direct document access with user ID
    const didRef = doc(db, DID_DOCUMENTS_COLLECTION, userID);
    let didDoc = await getDoc(didRef);
    
    if (didDoc.exists()) {
      console.log("✅ Found DID document by direct ID");
      const data = didDoc.data();
      return {
        ...data,
        created: data.created?.toDate(),
        updated: data.updated?.toDate()
      };
    }
    
    // If not found by ID, try to find by controller field
    console.log("🔍 DID not found by ID, trying to find by controller/walletAddress");
    try {
      // Try to find by controller field (which might contain wallet address)
      const didByControllerQuery = query(
        collection(db, DID_DOCUMENTS_COLLECTION),
        where('controller', '==', userID)
      );
      
      const controllerSnapshot = await getDocs(didByControllerQuery);
      if (!controllerSnapshot.empty) {
        console.log("✅ Found DID document by controller field");
        const data = controllerSnapshot.docs[0].data();
        return {
          ...data,
          created: data.created?.toDate(),
          updated: data.updated?.toDate()
        };
      }
      
      // Also try to find by walletAddress field
      const userDataRef = doc(db, USERS_COLLECTION, userID);
      const userData = await getDoc(userDataRef);
      
      if (userData.exists()) {
        const walletAddress = userData.data().walletAddress;
        console.log("🔍 Trying to find DID by wallet address:", walletAddress);
        
        if (walletAddress) {
          const didByWalletQuery = query(
            collection(db, DID_DOCUMENTS_COLLECTION),
            where('controller', '==', walletAddress)
          );
          
          const walletSnapshot = await getDocs(didByWalletQuery);
          if (!walletSnapshot.empty) {
            console.log("✅ Found DID document by wallet address");
            const data = walletSnapshot.docs[0].data();
            return {
              ...data,
              created: data.created?.toDate(),
              updated: data.updated?.toDate()
            };
          }
        }
      }
      
      // Also check localStorage as a fallback
      try {
        const storedData = localStorage.getItem('zybl_user_data');
        if (storedData) {
          const localData = JSON.parse(storedData);
          if (localData.didDocument) {
            console.log("✅ Found DID in localStorage");
            return localData.didDocument;
          }
        }
      } catch (localStorageError) {
        console.warn("⚠️ Error checking localStorage for DID:", localStorageError);
      }
      
      console.log("❌ No DID document found for this user");
      return null;
    } catch (queryError) {
      console.warn("⚠️ Error in DID query search:", queryError);
      return null;
    }
  } catch (error) {
    console.error("❌ Error getting DID document:", error);
    return null;
  }
};

/**
 * Get user's payment history from Firebase
 * @param {string} userID - Unique user ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Array of payment records
 */
export const getUserPaymentHistory = async (userID, limitCount = 10) => {
  try {
    // First try with ordering (might require index)
    try {
      const paymentQuery = query(
        collection(db, PAYMENTS_COLLECTION),
        where('userID', '==', userID),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(paymentQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
    } catch (indexError) {
      console.warn("Index error for payment query with ordering, falling back to simple query:", indexError);
      
      // Fall back to simpler query without ordering if index doesn't exist
      const simpleQuery = query(
        collection(db, PAYMENTS_COLLECTION),
        where('userID', '==', userID)
      );
      
      const snapshot = await getDocs(simpleQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
    }
  } catch (error) {
    console.error("Error getting payment history:", error);
    // Return a sample payment as fallback
    return [{
      id: 'sample-payment-1',
      userID: userID,
      amount: '49.99',
      currency: 'USDC',
      status: 'Completed',
      type: 'Subscription',
      timestamp: new Date(),
      network: 'Base Sepolia'
    }];
  }
};

/**
 * Get consolidated user dashboard data from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object>} - Consolidated user data for dashboard
 */
export const getDashboardData = async (userID) => {
  console.log("🔍 Fetching dashboard data for user:", userID);
  
  // Create results object with default values
  const dashboardData = {
    userData: null,
    journeyData: null,
    verificationStatus: {
      status: 'Unverified',
      score: 0,
      lastVerified: null
    },
    didDocument: null,
    payments: [],
    walletConnections: [],
    userSettings: null  };
  
  try {
    // Use Promise.allSettled to prevent one failure from stopping all requests
    console.log("🔄 Starting Firebase data requests");
    const results = await Promise.allSettled([
      getUserData(userID),
      getUserJourney(userID),
      getVerificationStatus(userID),
      getUserDID(userID),
      getUserPaymentHistory(userID, 5),
      getUserSettings(userID),
      getUserWalletConnections(userID)
    ]);
    
    console.log("📊 Firebase data request results:", results.map(r => r.status));
    
    // Process results, using default values for any that failed
    if (results[0].status === 'fulfilled' && results[0].value) {
      console.log("👤 User data received:", results[0].value);
      dashboardData.userData = results[0].value;
    } else {
      console.warn("⚠️ User data not available", results[0].reason);
    }
      if (results[1].status === 'fulfilled' && results[1].value) {
      console.log("🛣️ Journey data received:", results[1].value);
      dashboardData.journeyData = results[1].value;
    } else {
      console.warn("⚠️ Journey data not available", results[1].reason);
    }
    
    if (results[2].status === 'fulfilled' && results[2].value) {
      console.log("✅ Verification status received:", results[2].value);
      dashboardData.verificationStatus = results[2].value;
    } else {
      console.warn("⚠️ Verification status not available", results[2].reason);
    }
    
    if (results[3].status === 'fulfilled' && results[3].value) {
      console.log("🆔 DID document received:", results[3].value);
      dashboardData.didDocument = results[3].value;
    } else {
      console.warn("⚠️ DID document not available", results[3].reason);
      // Try harder to get DID from local storage if available
      try {
        const storedData = localStorage.getItem('zybl_user_data');
        if (storedData) {
          const localData = JSON.parse(storedData);
          if (localData.didDocument) {
            console.log("🔄 Found DID in localStorage, will use that");
            dashboardData.didDocument = localData.didDocument;
            
            // If we have a userID, also attempt to store this DID to Firebase for future use
            if (userID) {
              storeDIDDocument(userID, localData.didDocument)
                .then(success => {
                  if (success) {
                    console.log("✅ Successfully migrated DID from localStorage to Firebase");
                  }
                })
                .catch(err => {
                  console.error("Failed to migrate DID to Firebase:", err);                });
            }
          }
        }
      } catch (localStorageError) {
        console.error("Error checking localStorage for DID:", localStorageError);
      }
    }
    
    if (results[4].status === 'fulfilled' && results[4].value) {
      console.log("💰 Payment history received:", results[4].value);
      dashboardData.payments = results[4].value;
    } else {
      console.warn("⚠️ Payment history not available", results[4].reason);
    }
    
    if (results[5].status === 'fulfilled' && results[5].value) {
      console.log("⚙️ User settings received:", results[5].value);
      dashboardData.userSettings = results[5].value;
    } else {
      console.warn("⚠️ User settings not available", results[5].reason);
      // Use default settings
      dashboardData.userSettings = DEFAULT_USER_SETTINGS;
    }
    
    if (results[6].status === 'fulfilled' && results[6].value) {
      console.log("🔗 Wallet connections received:", results[6].value);
      dashboardData.walletConnections = results[6].value;
    } else {
      console.warn("⚠️ Wallet connections not available", results[6].reason);
    }
    
    // If we failed to get user data from Firebase, try to recover from localStorage
    if (!dashboardData.userData) {
      try {
        const storedData = localStorage.getItem('zybl_user_data');
        if (storedData) {
          const localUserData = JSON.parse(storedData);
          dashboardData.userData = {
            userID: localUserData.userID,
            walletAddress: localUserData.address,
            lastActive: new Date(),
            chainId: localUserData.chainId || 1
          };
          
          // Also try to recover DID from localStorage if not found in Firebase
          if (!dashboardData.didDocument && localUserData.didDocument) {
            dashboardData.didDocument = localUserData.didDocument;
          }
        }
      } catch (localStorageError) {
        console.error("Error recovering data from localStorage:", localStorageError);
      }
    }
    
    return dashboardData;
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    
    // Try to recover from localStorage as a fallback
    try {
      const storedData = localStorage.getItem('zybl_user_data');
      if (storedData) {
        const localUserData = JSON.parse(storedData);
        dashboardData.userData = {
          userID: localUserData.userID,
          walletAddress: localUserData.address,
          lastActive: new Date(),
          chainId: localUserData.chainId || 1
        };
        
        if (localUserData.didDocument) {
          dashboardData.didDocument = localUserData.didDocument;
        }
        
        if (localUserData.verificationStatus) {
          dashboardData.verificationStatus = localUserData.verificationStatus;
        }
      }
    } catch (localStorageError) {
      console.error("Error recovering data from localStorage:", localStorageError);
    }
    
    return dashboardData;
  }
};

/**
 * Store a DID document in Firebase if it doesn't exist already
 * @param {string} userID - User ID to associate with the DID
 * @param {Object} didDocument - DID document to store
 * @returns {Promise<boolean>} - Success status
 */
export const storeDIDDocument = async (userID, didDocument) => {
  if (!userID || !didDocument) {
    console.error("Missing userID or didDocument for storage");
    return false;
  }
  
  try {
    console.log("🔄 Storing DID document for user:", userID);
    
    // First check if this DID already exists
    const didRef = doc(db, DID_DOCUMENTS_COLLECTION, userID);
    const didDoc = await getDoc(didRef);
    
    if (didDoc.exists()) {
      console.log("⚠️ DID document already exists for this user, skipping storage");
      return true; // Already exists, no need to recreate
    }
    
    // Prepare data for storage
    const didData = {
      ...didDocument,
      // Make sure dates are Firestore timestamps
      created: didDocument.created instanceof Date ? 
        Timestamp.fromDate(didDocument.created) : 
        Timestamp.fromDate(new Date(didDocument.created || new Date())),
      updated: Timestamp.fromDate(new Date())
    };
    
    // Store the DID using the userID as document ID
    await setDoc(didRef, didData);
    console.log("✅ Successfully stored DID document in Firebase");
    
    return true;
  } catch (error) {
    console.error("❌ Error storing DID document:", error);
    return false;
  }
};

/**
 * Get user's connected wallets from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Array>} - Array of connected wallet objects
 */
export const getUserWalletConnections = async (userID) => {
  try {
    // First check if there are wallet connections in the dedicated collection
    const walletRef = doc(db, WALLET_CONNECTIONS_COLLECTION, userID);
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists() && walletDoc.data().connections) {
      return walletDoc.data().connections.map(connection => ({
        ...connection,
        connectedAt: safeToDate(connection.connectedAt)
      }));
    }
    
    // If not found in dedicated collection, check the user document
    const userRef = doc(db, USERS_COLLECTION, userID);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().connectedWallets) {
      return userDoc.data().connectedWallets.map(connection => ({
        ...connection,
        connectedAt: safeToDate(connection.connectedAt)
      }));
    }
    
    // No connections found
    return [];
  } catch (error) {
    console.error("Error getting wallet connections:", error);
    return [];
  }
};

/**
 * Store verification status in Firebase
 * @param {string} userID - User ID to associate with verification
 * @param {Object} verificationStatus - Verification data to store
 * @returns {Promise<boolean>} - Success status
 */
export const storeVerificationStatus = async (userID, verificationStatus) => {
  if (!userID || !verificationStatus) {
    console.error("Missing userID or verificationStatus for storage");
    return false;
  }
  
  try {
    console.log("🔄 Storing verification status for user:", userID);
    
    // Create a document ID for the verification record
    const verificationId = `${userID}-${Date.now()}`;
    
    // Prepare data for storage
    const verificationData = {
      ...verificationStatus,
      userID,
      // Make sure timestamp is a Firestore timestamp
      timestamp: verificationStatus.timestamp instanceof Date ? 
        Timestamp.fromDate(verificationStatus.timestamp) : 
        Timestamp.fromDate(new Date(verificationStatus.timestamp || new Date())),
      // Add created timestamp
      created: Timestamp.fromDate(new Date())
    };
    
    // Store the verification status
    await setDoc(doc(db, VERIFICATION_COLLECTION, verificationId), verificationData);
    console.log("✅ Successfully stored verification status in Firebase");
    
    // Also update the user document with verification info
    try {
      const userRef = doc(db, USERS_COLLECTION, userID);
      await updateDoc(userRef, {
        verificationStatus: {
          status: verificationData.status,
          score: verificationData.score,
          lastVerified: verificationData.timestamp
        },
        lastUpdated: Timestamp.fromDate(new Date())
      });
    } catch (userUpdateError) {
      console.warn("⚠️ Could not update user document with verification status:", userUpdateError);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error storing verification status:", error);
    return false;
  }
};

/**
 * Get user settings from Firebase
 * @param {string} userID - Unique user ID
 * @returns {Promise<Object>} - User settings object
 */
export const getUserSettings = async (userID) => {
  try {
    console.log("🔍 Fetching user settings for:", userID);
    const settingsRef = doc(db, USER_SETTINGS_COLLECTION, userID);
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      console.log("✅ Found user settings");
      const data = settingsDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        lastUpdated: data.lastUpdated?.toDate()
      };
    }
    
    // No settings found, create default settings
    console.log("⚠️ No settings found, creating defaults");
    await setDoc(settingsRef, DEFAULT_USER_SETTINGS);
    return DEFAULT_USER_SETTINGS;
  } catch (error) {
    console.error("❌ Error getting user settings:", error);
    return DEFAULT_USER_SETTINGS;
  }
};

/**
 * Update user settings in Firebase
 * @param {string} userID - Unique user ID
 * @param {Object} settings - Settings object to update
 * @returns {Promise<boolean>} - Success status
 */
export const updateUserSettings = async (userID, settings) => {
  try {
    console.log("🔄 Updating user settings for:", userID);
    const settingsRef = doc(db, USER_SETTINGS_COLLECTION, userID);
    
    // First check if settings document exists
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      // Update existing settings
      await updateDoc(settingsRef, {
        ...settings,
        lastUpdated: new Date()
      });
    } else {
      // Create new settings document
      await setDoc(settingsRef, {
        ...DEFAULT_USER_SETTINGS,
        ...settings,
        lastUpdated: new Date()
      });
    }
    
    console.log("✅ Settings updated successfully");
    return true;
  } catch (error) {
    console.error("❌ Error updating user settings:", error);
    return false;
  }
};

/**
 * Get wallet connections for a user
 * @param {string} userId - The user ID
 * @returns {Array} - Array of wallet connections
 */
export const getWalletConnections = async (userId) => {
  try {
    if (!userId) {
      console.error("❌ User ID is required to get wallet connections");
      return [];
    }

    const connectionsCollection = collection(db, WALLET_CONNECTIONS_COLLECTION);
    const q = query(
      connectionsCollection,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const connections = [];
    
    querySnapshot.forEach((doc) => {
      connections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Retrieved ${connections.length} wallet connections for user`);
    return connections;
  } catch (error) {
    console.error("❌ Error getting wallet connections:", error);
    return [];
  }
};

/**
 * Add a new wallet connection for a user
 * @param {string} userId - The user ID
 * @param {object} connectionData - The connection data (address, walletType, etc.)
 * @returns {object|boolean} - The created connection object or false on error
 */
export const addWalletConnection = async (userId, connectionData) => {
  try {
    console.log("🔄 addWalletConnection called with:", { userId, connectionData });
    
    if (!userId) {
      console.error("❌ User ID is required to add a wallet connection");
      return false;
    }
    
    if (!connectionData.address) {
      console.error("❌ Wallet address is required to add a connection");
      return false;
    }
    
    // First check if the wallet is already connected in the user document
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    // Create user document if it doesn't exist
    if (!userDoc.exists()) {
      console.log("👤 Creating new user document for:", userId);
      await setDoc(userRef, {
        email: userId, // Assuming userId is email
        connectedWallets: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    }
    
    if (userDoc.exists() && userDoc.data().connectedWallets) {
      const isAlreadyConnected = userDoc.data().connectedWallets.some(conn => 
        conn.address.toLowerCase() === connectionData.address.toLowerCase() && 
        conn.walletType === connectionData.walletType &&
        conn.isConnected === true
      );
      
      if (isAlreadyConnected) {
        console.warn("⚠️ This wallet is already connected to this user");
        return false;
      }
    }
    
    // Check if this wallet is already connected in the connections collection
    const connectionsCollection = collection(db, WALLET_CONNECTIONS_COLLECTION);
    
    // Simplified query - just check for userId and address
    const q = query(
      connectionsCollection,
      where("userId", "==", userId),
      where("address", "==", connectionData.address)
    );
    
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Check if any of the existing connections are still active/connected
        const hasActiveConnection = querySnapshot.docs.some(doc => {
          const data = doc.data();
          return data.isConnected === true && data.walletType === connectionData.walletType;
        });
        
        if (hasActiveConnection) {
          console.warn("⚠️ This wallet is already connected to this user in the connections collection");
          return false;
        }
      }
    } catch (queryError) {
      console.error("⚠️ Error checking existing connections, proceeding with creation:", queryError);
      // Don't fail the entire operation, just proceed
    }
    
    // Prepare connection data
    const connectionObject = {
      address: connectionData.address,
      walletType: connectionData.walletType || 'unknown',
      chainId: connectionData.chainId || '0x1',
      connectedAt: connectionData.connectedAt || new Date().toISOString(),
      isConnected: connectionData.isConnected || true,
      active: true
    };
    
    // Add to user document
    try {
      const updatedUserDoc = await getDoc(userRef); // Get fresh user document
      if (updatedUserDoc.exists()) {
        await updateDoc(userRef, {
          connectedWallets: arrayUnion(connectionObject),
          lastUpdated: Timestamp.fromDate(new Date())
        });
        console.log("✅ User document updated with new wallet connection");
      } else {
        console.error("❌ User document still doesn't exist after creation attempt");
        // Don't fail the entire operation, just continue without updating user doc
      }
    } catch (userDocError) {
      console.error("⚠️ Error updating user document, but continuing with connection creation:", userDocError);
      // Don't fail the entire operation
    }
    
    // Create the new connection document
    console.log("💾 Creating connection document with data:", {
      userId,
      ...connectionObject,
      createdAt: new Date(),
    });
    
    try {
      const connectionRef = await addDoc(connectionsCollection, {
        userId,
        ...connectionObject,
        createdAt: new Date(),
      });
      
      console.log("✅ Connection document created with ID:", connectionRef.id);
      
      const newConnection = {
        id: connectionRef.id,
        userId,
        ...connectionObject
      };
      
      console.log("✅ New wallet connection added:", newConnection);
      
      // Track this action in the user journey
      try {
        await trackUserJourney(userId, 'wallet_connection_added', {
          walletType: connectionData.walletType,
          address: connectionData.address,
          timestamp: new Date().toISOString()
        });
      } catch (journeyError) {
        console.error("⚠️ Error tracking user journey, but connection created successfully:", journeyError);
      }
      
      return newConnection;
    } catch (docCreationError) {
      console.error("❌ Error creating connection document:", docCreationError);
      return false;
    }
  } catch (error) {
    console.error("❌ Error adding wallet connection:", error);
    return false;
  }
};

/**
 * Remove a wallet connection for a user
 * @param {string} userId - The user ID
 * @param {string|object} connectionIdOrObject - The connection ID or connection object to remove
 * @returns {boolean} - Success status
 */
export const removeWalletConnection = async (userId, connectionIdOrObject) => {
  try {
    if (!userId) {
      console.error("❌ User ID is required to remove a connection");
      return false;
    }
    
    // Handle different types of connection identifiers
    let connectionId;
    let connectionObject;
    
    if (typeof connectionIdOrObject === 'string') {
      // If connectionIdOrObject is a string, it's a connection ID
      connectionId = connectionIdOrObject;
    } else if (typeof connectionIdOrObject === 'object' && connectionIdOrObject.address) {
      // If it's an object with an address, it's a connection object
      connectionObject = connectionIdOrObject;
    } else {
      console.error("❌ Invalid connection identifier");
      return false;
    }
    
    // If we have a connection object, we need to find its ID from the connections collection
    if (connectionObject && !connectionId) {
      const connectionsCollection = collection(db, WALLET_CONNECTIONS_COLLECTION);
      const q = query(
        connectionsCollection,
        where("userId", "==", userId),
        where("address", "==", connectionObject.address)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        connectionId = querySnapshot.docs[0].id;
      }
    }
    
    // If we have a connection ID, delete from the connections collection
    if (connectionId) {
      const connectionRef = doc(db, WALLET_CONNECTIONS_COLLECTION, connectionId);
      const connectionDoc = await getDoc(connectionRef);
      
      if (connectionDoc.exists()) {
        const connectionData = connectionDoc.data();
        
        // Check if this connection belongs to the specified user
        if (connectionData.userId !== userId) {
          console.error("❌ This connection does not belong to the specified user");
          return false;
        }
        
        // Remove the connection
        await deleteDoc(connectionRef);
        
        // Set connectionObject from the document if not already set
        if (!connectionObject) {
          connectionObject = connectionData;
        }
        
        console.log("✅ Wallet connection removed");
      } else {
        console.warn("⚠️ Connection document not found");
        // Continue anyway to check the user document
      }
    }
    
    // Also remove from the user document if we have a connection object
    if (connectionObject) {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().connectedWallets) {
        const connectedWallets = userDoc.data().connectedWallets;
        
        // Find the matching connection in the user document
        const connectionToRemove = connectedWallets.find(conn => 
          conn.address.toLowerCase() === connectionObject.address.toLowerCase() &&
          (!connectionObject.walletType || conn.walletType === connectionObject.walletType)
        );
        
        if (connectionToRemove) {
          // Remove from the user document
          await updateDoc(userRef, {
            connectedWallets: arrayRemove(connectionToRemove),
            lastUpdated: Timestamp.fromDate(new Date())
          });
          
          console.log("✅ Wallet connection removed from user document");
        }
      }
    }
    
    // Track this action in the user journey
    if (connectionObject) {
      await trackUserJourney(userId, 'wallet_connection_removed', {
        walletType: connectionObject.walletType || 'unknown',
        address: connectionObject.address,
        timestamp: new Date().toISOString()
      });
    }
      return true;
  } catch (error) {
    console.error("❌ Error removing wallet connection:", error);
    return false;
  }
};

/**
 * Store payment data in Firebase
 * @param {string} userID - User ID to associate with payment
 * @param {Object} paymentData - Payment data to store
 * @returns {Promise<boolean>} - Success status
 */
export const storePayment = async (userID, paymentData) => {
  if (!userID || !paymentData) {
    console.error("Missing userID or paymentData for storage");
    return false;
  }
  
  try {
    console.log("🔄 Storing payment data for user:", userID);
    
    // Create a unique payment ID
    const paymentId = paymentData.paymentId || `payment-${userID}-${Date.now()}`;
    
    // Prepare data for storage
    const paymentRecord = {
      id: paymentId,
      userID: userID,
      amount: paymentData.amount || '2.00',
      currency: paymentData.currency || 'USDC',
      status: paymentData.status || 'paid',
      transactionId: paymentData.transactionId,
      explorerLink: paymentData.explorerLink,
      network: paymentData.network || 'Base Sepolia',
      timestamp: paymentData.timestamp ? 
        (paymentData.timestamp instanceof Date ? 
          Timestamp.fromDate(paymentData.timestamp) : 
          Timestamp.fromDate(new Date(paymentData.timestamp))
        ) : 
        Timestamp.fromDate(new Date()),
      created: Timestamp.fromDate(new Date())
    };
    
    // Store the payment data
    await setDoc(doc(db, PAYMENTS_COLLECTION, paymentId), paymentRecord);
    console.log("✅ Successfully stored payment data in Firebase");
    
    return true;
  } catch (error) {
    console.error("❌ Error storing payment data:", error);
    return false;
  }
};

export { db };
export default app;
