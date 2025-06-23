import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize Firebase Admin SDK for Firestore
let db;

try {
  let serviceAccount;
    // Try to load from JSON file first
  try {
    // Try multiple possible paths for the service account file
    const possiblePaths = [
      join(__dirname, '..', 'firebase-service-account.json'),
      join(process.cwd(), 'firebase-service-account.json'),
      join(process.cwd(), 'backend', 'firebase-service-account.json')
    ];
    
    let serviceAccountFile;
    let usedPath;
    
    for (const path of possiblePaths) {
      try {
        serviceAccountFile = readFileSync(path, 'utf8');
        usedPath = path;
        break;
      } catch (err) {
        // Continue to next path
      }
    }
    
    if (serviceAccountFile) {
      serviceAccount = JSON.parse(serviceAccountFile);
      console.log(`📄 Using firebase-service-account.json from: ${usedPath}`);
    } else {
      throw new Error('firebase-service-account.json not found in any expected location');
    }
  } catch (fileError) {
    // Fallback to environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('🔧 Using FIREBASE_SERVICE_ACCOUNT_KEY from .env');
    } else {
      throw new Error('No Firebase service account found. Please provide firebase-service-account.json or FIREBASE_SERVICE_ACCOUNT_KEY');
    }
  }
  
  // Initialize Firebase Admin (Firestore only - no databaseURL needed)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
  
  // Get Firestore instance (not Realtime Database)
  db = admin.firestore();
  
  console.log('✅ Firebase Admin initialized successfully for Firestore');
  console.log(`🗃️ Project ID: ${admin.app().options.projectId}`);
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('1. Check FIREBASE_SERVICE_ACCOUNT_KEY in .env file');
  console.log('2. Ensure the service account JSON is valid');
  console.log('3. Verify FIREBASE_PROJECT_ID matches your project');
}

export { admin, db };
