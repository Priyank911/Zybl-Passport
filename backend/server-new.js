import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { admin, db } from './config/firebase-admin.js';
import { pinataService } from './services/pinataService.js';
import { aggregateUserData } from './services/dataAggregatorService.js';

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

// Continuous monitoring and processing service
async function monitorAndProcessUsers() {
  if (isProcessing) {
    console.log('⏳ Previous processing still running, skipping this cycle...');
    return;
  }

  try {
    isProcessing = true;
    processingStats.lastRunTime = new Date().toISOString();
    console.log('🔍 Checking for new unique IDs in Firestore...');

    // Get all unique user IDs from multiple collections
    const collections = ['users', 'faceVectors', 'payments', 'biometricData', 'userProfiles', 'sessions'];
    const allUserIds = new Set();

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          // Extract user ID from different possible fields
          if (data.userId) allUserIds.add(data.userId);
          if (data.sessionId) allUserIds.add(data.sessionId);
          if (data.userAddress) allUserIds.add(data.userAddress);
          if (data.walletAddress) allUserIds.add(data.walletAddress);
          // Also add document ID as potential user ID
          if (doc.id && doc.id.length > 10) allUserIds.add(doc.id);
        });
        console.log(`📄 Collection ${collectionName}: found ${snapshot.size} documents`);
      } catch (error) {
        console.warn(`⚠️ Could not access collection ${collectionName}:`, error.message);
      }
    }

    console.log(`📊 Found ${allUserIds.size} unique IDs in Firestore`);
    console.log(`🔄 Previously processed: ${processedUsers.size} users`);

    // Get new users (not yet processed)
    const newUserIds = Array.from(allUserIds).filter(id => !processedUsers.has(id));
    console.log(`🆕 New users to process: ${newUserIds.length}`);

    if (newUserIds.length === 0) {
      console.log('✅ No new users to process');
      return;
    }

    // Process each new user ID
    for (const userId of newUserIds) {
      try {
        console.log(`🔄 Processing new user ID: ${userId}`);
        
        // Aggregate user data
        const userData = await aggregateUserData(userId);
        
        if (!userData || Object.keys(userData).length === 0) {
          console.log(`⚠️ No data found for user ID: ${userId}`);
          processedUsers.add(userId); // Mark as processed to avoid retry
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
            exportedBy: 'auto-monitor-service'
          }
        };

        // Upload to IPFS
        const filename = `zybl-user-${userId}-${Date.now()}`;
        const ipfsResult = await pinataService.uploadJSON(dataPackage, filename);
        
        // Store CID and metadata in Firestore
        await db.collection('ipfsData').doc(userId).set({
          cid: ipfsResult.IpfsHash,
          filename: filename,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          dataSize: JSON.stringify(dataPackage).length,
          collections: Object.keys(userData),
          processedAt: new Date().toISOString(),
          status: 'completed',
          ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`,
          processingMethod: 'auto-monitor'
        });

        // Mark as processed
        processedUsers.add(userId);
        processingStats.successful++;
        processingStats.totalProcessed++;
        
        console.log(`✅ Successfully processed user ID: ${userId}`);
        console.log(`📁 IPFS Hash: ${ipfsResult.IpfsHash}`);
        console.log(`🌐 IPFS URL: https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`);
        
        // Small delay between processing users to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to process user ID ${userId}:`, error.message);
        processingStats.failed++;
        
        // Store error in Firestore for tracking
        try {
          await db.collection('ipfsData').doc(userId).set({
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: new Date().toISOString(),
            status: 'failed',
            processingMethod: 'auto-monitor'
          });
        } catch (storeError) {
          console.error('Failed to store error in Firestore:', storeError.message);
        }
      }
    }

    console.log(`✅ Monitoring cycle completed. Total processed: ${processedUsers.size}`);
    console.log(`📈 Stats - Success: ${processingStats.successful}, Failed: ${processingStats.failed}`);
    
  } catch (error) {
    console.error('❌ Monitoring cycle failed:', error.message);
  } finally {
    isProcessing = false;
  }
}

// Initialize continuous monitoring
function startContinuousMonitoring() {
  console.log('🚀 Starting continuous monitoring service...');
  console.log('⏰ Monitoring will run every 60 seconds');
  
  // Run every 60 seconds (1 minute)
  cron.schedule('0 * * * * *', () => {
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + 1);
    processingStats.nextRunTime = nextRun.toISOString();
    
    monitorAndProcessUsers();
  });

  // Run immediately on startup after 10 seconds
  setTimeout(() => {
    console.log('🔄 Running initial monitoring check...');
    monitorAndProcessUsers();
  }, 10000);

  console.log('✅ Continuous monitoring service started successfully');
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

// Start server and monitoring
app.listen(PORT, () => {
  console.log(`🚀 Zybl Auto-Processing Backend Server Started`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Processing status: http://localhost:${PORT}/api/status`);
  console.log(`👥 All users: http://localhost:${PORT}/api/all-users`);
  console.log('');
  
  // Start continuous monitoring
  startContinuousMonitoring();
});
