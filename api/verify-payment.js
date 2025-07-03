// Backend API for verifying x402 payments on Base Sepolia
// /api/verify-payment.js

import { ethers } from 'ethers';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : require('../backend/firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://zybl-key-default-rtdb.firebaseio.com"
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

const db = admin.firestore();

// Base Sepolia configuration
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const USDC_CONTRACT_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const RECEIVER_ADDRESS = "0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721"; // Your wallet address
const REQUIRED_AMOUNT = "2"; // 2 USDC (in human readable format)

// USDC contract ABI (minimal for transfer events)
const USDC_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)"
];

/**
 * Verify payment on Base Sepolia testnet
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { userAddress, userId } = req.body;
    
    if (!userAddress || !userId) {
      return res.status(400).json({ error: 'Missing userAddress or userId' });
    }
    
    console.log(`🔍 Verifying payment for user: ${userId}, address: ${userAddress}`);
    
    // Create provider for Base Sepolia - use new ethers v6 syntax
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000); // Search last ~10k blocks (adjust as needed)
    
    console.log(`📊 Searching blocks ${fromBlock} to ${currentBlock} for USDC transfers`);
    
    // Query for USDC transfer events from user to receiver
    const filter = usdcContract.filters.Transfer(userAddress, RECEIVER_ADDRESS);
    const events = await usdcContract.queryFilter(filter, fromBlock, currentBlock);
    
    console.log(`📋 Found ${events.length} transfer events`);
    
    if (events.length === 0) {
      // No payment found - return 402 Payment Required
      return res.status(402).json({
        error: 'Payment Required',
        message: 'No USDC payment found from your wallet to the receiver address',
        payment_required: {
          amount: REQUIRED_AMOUNT,
          currency: 'USDC',
          token_address: USDC_CONTRACT_ADDRESS,
          receiver_address: RECEIVER_ADDRESS,
          network: 'Base Sepolia',
          chain_id: 84532
        }
      });
    }
    
    // Get USDC decimals (should be 6)
    const decimals = await usdcContract.decimals();
    const requiredAmountWei = ethers.parseUnits(REQUIRED_AMOUNT, decimals);
    
    // Check if any transaction meets the required amount
    let validTransaction = null;
    
    for (const event of events) {
      const amount = event.args.value;
      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;
      
      console.log(`💰 Transaction ${txHash}: ${ethers.formatUnits(amount, decimals)} USDC`);
      
      if (amount >= requiredAmountWei) {
        // Get transaction details
        const tx = await provider.getTransaction(txHash);
        const block = await provider.getBlock(blockNumber);
        
        validTransaction = {
          hash: txHash,
          amount: ethers.formatUnits(amount, decimals),
          from: event.args.from,
          to: event.args.to,
          blockNumber: blockNumber,
          timestamp: block.timestamp,
          explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`
        };
        
        console.log(`✅ Valid payment found: ${validTransaction.hash}`);
        break;
      }
    }
    
    if (!validTransaction) {
      return res.status(402).json({
        error: 'Payment Required',
        message: `Payment amount insufficient. Required: ${REQUIRED_AMOUNT} USDC`,
        payment_required: {
          amount: REQUIRED_AMOUNT,
          currency: 'USDC',
          token_address: USDC_CONTRACT_ADDRESS,
          receiver_address: RECEIVER_ADDRESS,
          network: 'Base Sepolia',
          chain_id: 84532
        }
      });
    }
    
    // Store payment record in Firebase
    try {
      const paymentRef = db.collection('payments').doc(userId);
      await paymentRef.set({
        userId,
        userAddress,
        transactionHash: validTransaction.hash,
        amount: validTransaction.amount,
        currency: 'USDC',
        network: 'Base Sepolia',
        receiverAddress: RECEIVER_ADDRESS,
        timestamp: new Date(validTransaction.timestamp * 1000).toISOString(),
        blockNumber: validTransaction.blockNumber,
        explorerUrl: validTransaction.explorerUrl,
        verified: true,
        createdAt: new Date().toISOString()
      });
      
      console.log(`💾 Payment record stored for user: ${userId}`);
    } catch (dbError) {
      console.error('Error storing payment record:', dbError);
      // Continue even if DB storage fails
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      transaction: validTransaction,
      payment_verified: true
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify payment on blockchain',
      details: error.message
    });
  }
}
