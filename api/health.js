import { admin, db } from '../backend/config/firebase-admin.js';
import pinataService from '../backend/services/pinataService.js';
import dataAggregatorService from '../backend/services/dataAggregatorService.js';

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      monitoring: {
        isActive: true,
        isCurrentlyProcessing: isProcessing,
        processedUsers: processedUsers.size,
        stats: processingStats
      }
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}
