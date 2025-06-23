import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { admin, db } from './config/firebase-admin.js';
import pinataService from './services/pinataService.js';
import dataAggregatorService from './services/dataAggregatorService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Track processed users to avoid duplicates
const processedUsers = new Set();
let isProcessing = false;
let processingStats = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  lastRunTime: null,
  nextRunTime: null
};

// Load already processed users from Firestore on startup
async function loadProcessedUsers() {
  try {
    const ipfsSnapshot = await db.collection('ipfsData').where('status', '==', 'completed').get();
    
    ipfsSnapshot.forEach(doc => {
      processedUsers.add(doc.id);
    });
  } catch (error) {
    console.error('Failed to load processed users:', error.message);
  }
}

// Continuous monitoring and processing service
async function monitorAndProcessUsers() {  if (isProcessing) {
    return;
  }

  try {    isProcessing = true;
    processingStats.lastRunTime = new Date().toISOString();// Get all unique user IDs from USERS collection ONLY
    const allUserIds = new Set();    try {
      const usersSnapshot = await db.collection('users').get();
      usersSnapshot.forEach(doc => {
        // Use ONLY the document ID as the unique user ID
        allUserIds.add(doc.id);      });
    } catch (error) {
      console.error('Could not access users collection:', error.message);
      return;    }

    // Get users that already have CIDs in IPFS (successfully processed)
    const ipfsSnapshot = await db.collection('ipfsData').where('status', '==', 'completed').get();
    const usersWithCIDs = new Set();
    
    ipfsSnapshot.forEach(doc => {
      usersWithCIDs.add(doc.id);    });
    
    // Get ONLY new users that don't have CIDs yet    const newUsersOnly = Array.from(allUserIds).filter(id => !usersWithCIDs.has(id));

    if (newUsersOnly.length === 0) {
      return;
    }

    // Process each NEW user ID only
    for (const userId of newUsersOnly) {      try {
        // Aggregate user data from ALL collections based on this user ID
        const userData = await dataAggregatorService.fetchAllUserData(userId);

        if (!userData || Object.keys(userData).length === 0) {
          // Don't mark as processed since there's no data to process
          processingStats.failed++;
          continue;
        }

        // Create enhanced data package
        const dataPackage = {
          userId: userId,
          exportTimestamp: new Date().toISOString(),
          dataVersion: '1.0',
          appName: 'Zybl-KEY',
          userData: userData,
          metadata: {
            totalCollections: Object.keys(userData).length,
            dataSize: JSON.stringify(userData).length,
            exportedBy: 'auto-monitor-service-users-collection',
            sourceCollection: 'users'
          }
        };// Upload to IPFS
        const filename = `zybl-user-${userId}-${Date.now()}`;
        const ipfsResult = await pinataService.uploadJSON(dataPackage, filename);
        
        if (!ipfsResult.success) {
          throw new Error(`IPFS upload failed: ${ipfsResult.error}`);
        }
        
        // Store CID and metadata in Firestore
        await db.collection('ipfsData').doc(userId).set({
          cid: ipfsResult.cid,
          filename: filename,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          dataSize: JSON.stringify(dataPackage).length,
          collections: Object.keys(userData),
          processedAt: new Date().toISOString(),          status: 'completed',
          ipfsUrl: ipfsResult.ipfsUrl,
          processingMethod: 'auto-monitor-users-collection'
        });

        // Mark as processed
        processedUsers.add(userId);
        processingStats.successful++;        processingStats.totalProcessed++;
        
        // Small delay between processing users to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Failed to process user ID ${userId}:`, error.message);
        processingStats.failed++;
        
        // Store error in Firestore for tracking
        try {
          await db.collection('ipfsData').doc(userId).set({
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: new Date().toISOString(),
            status: 'failed',
            processingMethod: 'auto-monitor-users-collection'
          });
        } catch (storeError) {
          console.error('Failed to store error in Firestore:', storeError.message);
        }      }
    }
    
  } catch (error) {
    console.error('Monitoring cycle failed:', error.message);
  } finally {
    isProcessing = false;
  }
}

// Initialize continuous monitoring
async function startContinuousMonitoring() {
  // First, load already processed users  await loadProcessedUsers();
  
  // Run every 2 hours (0 */2 * * * = every 2 hours at minute 0)
  cron.schedule('0 */2 * * *', () => {
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 2);
    processingStats.nextRunTime = nextRun.toISOString();
    
    monitorAndProcessUsers();
  });  // Run immediately on startup after 10 seconds for initial scan
  setTimeout(() => {
    monitorAndProcessUsers();
  }, 10000);
}

// API Endpoints

// Health check endpoint with processing status
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    monitoring: {
      isActive: true,
      isCurrentlyProcessing: isProcessing,
      processedUsers: processedUsers.size,
      stats: processingStats
    }
  });
});

// Get detailed processing status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    monitoring: {
      isActive: true,
      isCurrentlyProcessing: isProcessing,
      processedUsers: Array.from(processedUsers),
      totalProcessed: processedUsers.size,
      stats: processingStats,
      timestamp: new Date().toISOString()
    }
  });
});

// Get user CID (check if user data is already processed)
app.get('/api/get-user-cid/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const doc = await db.collection('ipfsData').doc(userId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'No IPFS data found for this user ID'
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      userId: userId,
      cid: data.cid,
      ipfsUrl: data.ipfsUrl || `https://gateway.pinata.cloud/ipfs/${data.cid}`,
      timestamp: data.timestamp,
      dataSize: data.dataSize,
      collections: data.collections,
      status: data.status,
      processingMethod: data.processingMethod || 'unknown'
    });

  } catch (error) {
    console.error('Get CID failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user CID',
      error: error.message
    });
  }
});

// Manual trigger for processing (for testing)
app.post('/api/trigger-processing', async (req, res) => {
  try {
    if (isProcessing) {
      return res.status(429).json({
        success: false,
        message: 'Processing already in progress'
      });
    }

    // Trigger processing manually
    setTimeout(() => monitorAndProcessUsers(), 1000);

    res.json({
      success: true,
      message: 'Manual processing triggered - will start in 1 second'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger processing',
      error: error.message
    });
  }
});

// Get all processed users and their CIDs
app.get('/api/all-users', async (req, res) => {
  try {
    const snapshot = await db.collection('ipfsData').get();
    const users = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        userId: doc.id,
        cid: data.cid,
        status: data.status,
        processedAt: data.processedAt,
        dataSize: data.dataSize,
        collections: data.collections,
        ipfsUrl: data.ipfsUrl || `https://gateway.pinata.cloud/ipfs/${data.cid}`
      });
    });

    res.json({
      success: true,
      totalUsers: users.length,
      users: users
    });

  } catch (error) {
    console.error('Get all users failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get all users',
      error: error.message
    });
  }
});

// Reset processed users (for testing - use with caution)
app.post('/api/reset-processed', (req, res) => {
  const count = processedUsers.size;
  processedUsers.clear();
  processingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    lastRunTime: null,
    nextRunTime: null
  };
  
  res.json({
    success: true,
    message: `Reset ${count} processed users. Next monitoring cycle will reprocess all users.`
  });
});

// Test Firestore connection and list collections
app.get('/api/test-firestore', async (req, res) => {
  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Test accessing users collection
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const collections = ['users', 'didDocuments', 'payments', 'userJourneys', 'userSettings', 'verifications', 'walletConnections'];
    const collectionsData = {};
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        collectionsData[collectionName] = {
          documentCount: snapshot.size,
          documents: []
        };
        
        snapshot.forEach(doc => {
          collectionsData[collectionName].documents.push({
            id: doc.id,
            data: doc.data()
          });
        });
      } catch (error) {
        collectionsData[collectionName] = {
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      projectId: admin.app().options.projectId,
      collections: collectionsData
    });
    
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force process all users (including already processed ones)
app.post('/api/force-process-all', async (req, res) => {
  try {
    if (isProcessing) {
      return res.status(429).json({
        success: false,
        message: 'Processing already in progress'
      });
    }

    // Clear processed users list to force reprocessing
    const originalCount = processedUsers.size;
    processedUsers.clear();
    
    // Trigger processing immediately
    setTimeout(() => monitorAndProcessUsers(), 1000);

    res.json({
      success: true,
      message: `Force processing triggered for all users. Cleared ${originalCount} previously processed users.`,
      note: 'This will reprocess ALL users, including those already in IPFS'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger force processing',
      error: error.message
    });
  }
});

// Start server and monitoring
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start continuous monitoring
    startContinuousMonitoring();
  });
} else {
  // For Vercel deployment, just start monitoring without express server
  startContinuousMonitoring();
}

// Export for Vercel
export default app;
