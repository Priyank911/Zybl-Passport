import { db } from '../config/firebase-admin.js';

class DataAggregatorService {
  /**
   * Fetch all data for a specific user ID
   * @param {string} userId - The unique user ID
   * @returns {Promise<Object>} - Aggregated user data
   */  async fetchAllUserData(userId) {
    try {
      const userData = {
        userId: userId,
        exportTimestamp: new Date().toISOString(),
        userData: null,
        verificationStatus: null,
        didDocument: null,
        payments: [],
        userJourney: null,
        userSettings: null,
        walletConnections: [],
        faceVectors: []
      };

      // Use Promise.allSettled to prevent one failure from stopping all requests
      const results = await Promise.allSettled([
        this.getUserData(userId),
        this.getVerificationStatus(userId),
        this.getDIDDocument(userId),
        this.getPaymentHistory(userId),
        this.getUserJourney(userId),
        this.getUserSettings(userId),
        this.getWalletConnections(userId),
        this.getFaceVectors(userId)
      ]);

      // Process results
      if (results[0].status === 'fulfilled' && results[0].value) {
        userData.userData = results[0].value;
      }

      if (results[1].status === 'fulfilled' && results[1].value) {
        userData.verificationStatus = results[1].value;
      }

      if (results[2].status === 'fulfilled' && results[2].value) {
        userData.didDocument = results[2].value;
      }

      if (results[3].status === 'fulfilled' && results[3].value) {
        userData.payments = results[3].value;
      }

      if (results[4].status === 'fulfilled' && results[4].value) {
        userData.userJourney = results[4].value;
      }

      if (results[5].status === 'fulfilled' && results[5].value) {
        userData.userSettings = results[5].value;
      }

      if (results[6].status === 'fulfilled' && results[6].value) {
        userData.walletConnections = results[6].value;
      }

      if (results[7].status === 'fulfilled' && results[7].value) {
        userData.faceVectors = results[7].value;
      }

      // Add summary statistics
      userData.summary = {
        totalPayments: userData.payments.length,
        isVerified: userData.verificationStatus?.status === 'Verified',
        hasDID: !!userData.didDocument,
        hasUserData: !!userData.userData,
        totalWalletConnections: userData.walletConnections.length,
        totalFaceVectors: userData.faceVectors.length,
        dataCompleteness: this.calculateDataCompleteness(userData)      };

      return userData;
    } catch (error) {
      console.error(`❌ Error fetching user data for ${userId}:`, error);
      throw error;
    }
  }
  /**
   * Get user basic data
   */
  async getUserData(userId) {
    try {
      // Check both document ID and userID field patterns
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        return {
          ...userDoc.data(),
          id: userDoc.id,
          source: 'document_id'
        };
      }
      
      // Also try querying by userID field
      const userQuery = db.collection('users').where('userID', '==', userId).limit(1);
      const userSnapshot = await userQuery.get();
      
      if (!userSnapshot.empty) {
        const doc = userSnapshot.docs[0];
        return {
          ...doc.data(),
          id: doc.id,
          source: 'userID_field'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }
  /**
   * Get verification status (updated for your Firestore structure)
   */
  async getVerificationStatus(userId) {
    try {      // Try verification collection with various query patterns
      const queries = [
        // Direct document lookup
        () => db.collection('verifications').doc(userId).get(),
        // Query by userID field (without orderBy to avoid index requirement)
        () => db.collection('verifications').where('userID', '==', userId).get(),
        // Query by userId field (alternative naming, without orderBy)
        () => db.collection('verifications').where('userId', '==', userId).get(),
        // Try alternative collection names
        () => db.collection('verification').doc(userId).get(),
        () => db.collection('userVerifications').doc(userId).get()
      ];
      
      for (const queryFn of queries) {
        try {
          const result = await queryFn();
            if (result.exists) {
            // Direct document result
            return {
              ...result.data(),
              id: result.id,
              source: 'direct_document'
            };
          } else if (!result.empty) {
            // Query result - get the first document (or sort by timestamp if available)
            let selectedDoc = result.docs[0];
            
            // If multiple docs, try to find the most recent one
            if (result.docs.length > 1) {
              const docsWithTimestamp = result.docs.filter(doc => doc.data().timestamp);
              if (docsWithTimestamp.length > 0) {
                selectedDoc = docsWithTimestamp.sort((a, b) => {
                  const aTime = a.data().timestamp;
                  const bTime = b.data().timestamp;
                  if (aTime?.toDate && bTime?.toDate) {
                    return bTime.toDate() - aTime.toDate();
                  }
                  return 0;
                })[0];
              }
            }
            
            return {
              ...selectedDoc.data(),
              id: selectedDoc.id,
              source: 'query_result'
            };
          }
        } catch (queryError) {
          console.warn(`Verification query failed: ${queryError.message}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching verification status:', error);
      return null;
    }
  }

  /**
   * Get DID document
   */
  async getDIDDocument(userId) {
    try {
      const didRef = db.collection('didDocuments').doc(userId);
      const didDoc = await didRef.get();
      
      if (didDoc.exists) {
        return {
          ...didDoc.data(),
          id: didDoc.id
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching DID document:', error);
      return null;
    }
  }
  /**
   * Get payment history (updated for your Firestore structure)
   */
  async getPaymentHistory(userId) {
    try {
      const queries = [
        // Query by userID field
        () => db.collection('payments').where('userID', '==', userId).get(),
        // Query by userId field (alternative)
        () => db.collection('payments').where('userId', '==', userId).get(),
        // Direct document lookup
        () => db.collection('payments').doc(userId).get()
      ];
      
      const allPayments = [];
      
      for (const queryFn of queries) {
        try {
          const result = await queryFn();
          
          if (result.exists) {
            // Direct document result
            allPayments.push({
              ...result.data(),
              id: result.id,
              source: 'direct_document'
            });
          } else if (result.docs) {
            // Query result
            result.docs.forEach(doc => {
              allPayments.push({
                ...doc.data(),
                id: doc.id,
                source: 'query_result'
              });
            });
          }
        } catch (queryError) {
          console.warn(`Payment query failed: ${queryError.message}`);
        }
      }
      
      // Remove duplicates based on document ID
      const uniquePayments = allPayments.filter((payment, index, self) => 
        index === self.findIndex(p => p.id === payment.id)
      );
      
      return uniquePayments;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  /**
   * Get user journey
   */
  async getUserJourney(userId) {
    try {
      const journeyRef = db.collection('userJourneys').doc(userId);
      const journeyDoc = await journeyRef.get();
      
      if (journeyDoc.exists) {
        return {
          ...journeyDoc.data(),
          id: journeyDoc.id
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user journey:', error);
      return null;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId) {
    try {
      const settingsRef = db.collection('userSettings').doc(userId);
      const settingsDoc = await settingsRef.get();
      
      if (settingsDoc.exists) {
        return {
          ...settingsDoc.data(),
          id: settingsDoc.id
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
  }

  /**
   * Get wallet connections
   */
  async getWalletConnections(userId) {
    try {
      const connectionsQuery = db.collection('walletConnections')
        .where('userID', '==', userId);
      
      const snapshot = await connectionsQuery.get();
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('Error fetching wallet connections:', error);
      return [];
    }
  }

  /**
   * Get face vectors
   */
  async getFaceVectors(userId) {
    try {
      // Face vectors are stored under users/{userId}/faceVectors subcollection
      const faceVectorsQuery = db.collection('users').doc(userId)
        .collection('faceVectors');
      
      const snapshot = await faceVectorsQuery.get();
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('Error fetching face vectors:', error);
      return [];
    }
  }

  /**
   * Calculate data completeness percentage
   */
  calculateDataCompleteness(userData) {
    const fields = [
      'userData',
      'verificationStatus', 
      'didDocument',
      'payments',
      'userJourney',
      'userSettings'
    ];
    
    let completedFields = 0;
    fields.forEach(field => {
      if (userData[field] && 
          (Array.isArray(userData[field]) ? userData[field].length > 0 : true)) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Store CID mapping in Firebase
   */
  async storeCIDMapping(userId, cid, metadata = {}) {
    try {
      const cidRef = db.collection('userDataExports').doc(userId);
      
      await cidRef.set({
        userId: userId,
        cid: cid,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
        publicUrl: `https://${cid}.ipfs.dweb.link/`,
        exportTimestamp: new Date(),
        metadata: metadata
      }, { merge: true });

      console.log(`✅ CID mapping stored for user ${userId}: ${cid}`);
      return true;
    } catch (error) {
      console.error(`❌ Error storing CID mapping for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get CID mapping for a user
   */
  async getCIDMapping(userId) {
    try {
      const cidRef = db.collection('userDataExports').doc(userId);
      const cidDoc = await cidRef.get();
      
      if (cidDoc.exists) {
        return cidDoc.data();
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting CID mapping for user ${userId}:`, error);
      return null;
    }
  }
}

export default new DataAggregatorService();
