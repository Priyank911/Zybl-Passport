// src/auth/Payment.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processPayment } from '../services/paymentService'; // Legacy service
import { initiateX402Payment, connectWallet, formatAddress, getTransactionLink, getBaseSepoliaTestnetETH, PROTOCOL_ADDRESS } from '../services/x402PaymentService'; // X402 service
import { trackUserJourney } from '../utils/firebaseConfig';
import '../styles/Payment.css';
import '../styles/Payment-fixes.css'; // Extra fixes for compact container
import Logo from '../assets/Logo.png';
import logoblack from '../assets/Zybl-black.png';

// Mock Wallet Popup for DEMO_MODE
const MockWalletPopup = ({ show, onApprove, onCancel, amount, recipient }) => {
  if (!show) return null;
  
  return (
    <div className="mock-wallet-overlay">
      <div className="mock-wallet-popup">
        <div className="mock-wallet-header">
          <div className="mock-wallet-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#0052FF"/>
              <path d="M12 6.5A5.5 5.5 0 1 0 17.5 12 5.51 5.51 0 0 0 12 6.5Zm0 8.99a3.49 3.49 0 1 1 0-6.98 3.49 3.49 0 0 1 0 6.98Z" fill="#FFF"/>
            </svg>
            <span>Coinbase Wallet</span>
          </div>
          <button className="mock-wallet-close" onClick={onCancel}>×</button>
        </div>
        
        <div className="mock-wallet-content">
          <h3>Approve USDC Spending</h3>
          <div className="mock-wallet-details">
                <div className="mock-wallet-row">
                  <span className="label">Amount</span>
                  <span className="value">{amount} USDC</span>
                </div>
                <div className="mock-wallet-row">
                  <span className="label">Recipient</span>
                  <span className="value address">{recipient}</span>
                </div>
                <div className="mock-wallet-row">
                  <span className="label">Network</span>
                  <span className="value">Base Sepolia</span>
                </div>
                <div className="mock-wallet-row">
                  <span className="label">Gas Fee</span>
                  <span className="value">~0.0002 ETH</span>
                </div>
          </div>
          
          <div className="mock-wallet-actions">
            <button className="mock-wallet-reject" onClick={onCancel}>Reject</button>
            <button className="mock-wallet-approve" onClick={onApprove}>Approve</button>
          </div>
          
          <div className="mock-wallet-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>This is a simulated wallet approval for demo purposes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern USDC Icon
const USDCIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="usdc-icon">
    <circle cx="12" cy="12" r="11" fill="url(#usdc_gradient)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1"/>
    <path d="M12 5C9.1 5 6.75 7.35 6.75 10.25C6.75 13.15 9.1 15.5 12 15.5C14.9 15.5 17.25 13.15 17.25 10.25C17.25 7.35 14.9 5 12 5ZM12 13.9V11.85H9.95V10.25H12V8.2H13.6V10.25H15.65V11.85H13.6V13.9H12Z" fill="white"/>
    <path d="M12 19.5C7.3 19.5 3.5 15.7 3.5 11C3.5 6.3 7.3 2.5 12 2.5C16.7 2.5 20.5 6.3 20.5 11C20.5 15.7 16.7 19.5 12 19.5ZM12 4C8.15 4 5 7.15 5 11C5 14.85 8.15 18 12 18C15.85 18 19 14.85 19 11C19 7.15 15.85 4 12 4Z" fill="white" fillOpacity="0.5"/>
    <defs>
      <linearGradient id="usdc_gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2775CA"/>
        <stop offset="100%" stopColor="#2059A5"/>
      </linearGradient>
    </defs>
  </svg>
);

// Animated Success Icon
const PaymentSuccessIcon = () => (
  <div className="success-icon-wrapper">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="success-svg">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" className="success-circle"/>
      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="success-check"/>
    </svg>
    <div className="success-ripple"></div>
  </div>
);

// Animated Error Icon
const PaymentErrorIcon = () => (
  <div className="error-icon-wrapper">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="error-svg">
      <circle cx="12" cy="12" r="10" stroke="url(#error_gradient)" strokeWidth="2" className="error-circle"/>
      <path d="M15 9L9 15" stroke="url(#error_gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="error-line-1"/>
      <path d="M9 9L15 15" stroke="url(#error_gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="error-line-2"/>
      <defs>
        <linearGradient id="error_gradient" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5252"/>
          <stop offset="100%" stopColor="#D50000"/>
        </linearGradient>
      </defs>
    </svg>
    <div className="error-ripple"></div>
  </div>
);

// Secure Payment Badge
const SecureBadge = () => (  <div className="secure-payment-badge">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span>Secure X402 USDC Payment</span>
    <div className="secure-badge-pulse"></div>
  </div>
);

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('initial'); // initial, processing, minting, success, error
  const [paymentAmount, setPaymentAmount] = useState(2); // Changed from 25 to 2 USDC for verification
  const [transactionId, setTransactionId] = useState(null);
  const [explorerLink, setExplorerLink] = useState(null); // Link to Base Sepolia explorer
  const [paymentError, setPaymentError] = useState(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('usdc');
  const [revenueSplit, setRevenueSplit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mintingNFT, setMintingNFT] = useState(false);
  const [nftMetadata, setNftMetadata] = useState(null);
  const [userIdFromUrl, setUserIdFromUrl] = useState(null);
  const receiptRef = useRef(null); // Reference for the receipt to print as PDF
  
  // Mock wallet popup state
  const [showMockWallet, setShowMockWallet] = useState(false);
  const [mockWalletData, setMockWalletData] = useState({
    amount: '2.00',
    recipient: PROTOCOL_ADDRESS
  });
  
  // Extract user ID from URL
  useEffect(() => {
    try {
      // Parse the user ID from the URL if available
      // Format expected: /payment?id=user123
      const params = new URLSearchParams(location.search);
      const urlUserId = params.get('id');
      if (urlUserId) {
        console.log("Found user ID in URL:", urlUserId);
        setUserIdFromUrl(urlUserId);
      }
    } catch (error) {
      console.error("Error parsing URL for user ID:", error);
    }
  }, [location.search]);
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const storedData = localStorage.getItem('zybl_user_data');
        if (!storedData) {
          // Not authenticated, redirect to signin
          navigate('/signin');
          return;
        }
        
        const parsedData = JSON.parse(storedData);
        // Check if user has completed verification
        if (!parsedData.verificationStatus) {
          // Verification not completed, redirect to verification
          navigate('/verification');
          return;
        }
        
        // Check if user has already paid - if so, show success screen immediately
        if (parsedData.paymentStatus && parsedData.paymentStatus.status === 'paid') {
          console.log("User has already completed payment, showing success screen");
          setPaymentStatus('success');
          setTransactionId(parsedData.paymentStatus.transactionId);
          setExplorerLink(parsedData.paymentStatus.explorerLink);
          // Set other payment-related state if available
          if (parsedData.paymentStatus.paymentId) {
            // Set any other necessary state from stored payment data
          }
        }
        
        setUserData(parsedData);
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        localStorage.removeItem('zybl_user_data');
        navigate('/signin');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);// Check and connect wallet on mount (for X402 payment)
  useEffect(() => {
    const connectCoinbaseWallet = async () => {
      if (!userData) return;
      
      setIsLoading(true);
      try {
        // Try to connect to Coinbase Wallet if not already connected
        if (!userData.address) {
          const walletInfo = await connectWallet();
          
          // Update userData with wallet info
          const updatedUserData = {
            ...userData,
            address: walletInfo.address,
            connected: walletInfo.connected
          };
          
          localStorage.setItem('zybl_user_data', JSON.stringify(updatedUserData));
          setUserData(updatedUserData);
        }
      } catch (error) {
        console.error("Wallet connection error:", error);
        setPaymentError("Failed to connect to Coinbase Wallet. Please make sure it's installed and try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    connectCoinbaseWallet();
  }, [userData]);
  
  // Watch for mock wallet popup requests
  useEffect(() => {
    const checkMockWalletRequests = setInterval(() => {
      if (window.showMockWalletPopup) {
        setShowMockWallet(true);
        window.showMockWalletPopup = false;
      }
    }, 100);
    
    return () => clearInterval(checkMockWalletRequests);
  }, []);
  
  // Handle wallet approval/rejection
  const handleWalletApprove = () => {
      window.mockWalletResult = 'approved';
    setShowMockWallet(false);
  };
  const handleWalletReject = () => {
      window.mockWalletResult = 'rejected';
    setShowMockWallet(false);
    // This will trigger an error in the payment process
  };
  
  // Watch for mock wallet popup requests
  useEffect(() => {
    const checkMockWalletRequests = setInterval(() => {
      if (window.showMockWalletPopup) {
        setShowMockWallet(true);
        window.showMockWalletPopup = false;
      }
    }, 100);
    
    return () => clearInterval(checkMockWalletRequests);
  }, []);
    // Process payment
  const handlePayment = async () => {
    try {
      // Check if payment has already been completed
      if (userData?.paymentStatus?.status === 'paid') {
        console.log("Payment already completed, showing success screen");
        setPaymentStatus('success');
        setTransactionId(userData.paymentStatus.transactionId);
        setExplorerLink(userData.paymentStatus.explorerLink);
        return;
      }
      
      // Validate that we have all necessary data
      if (!userData || !userData.address) {
        throw new Error('Wallet address not found. Please reconnect your wallet.');
      }
      
      if (!userData.verificationStatus || userData.verificationStatus.status !== 'Verified') {
        throw new Error('Verification status is invalid. Please complete the verification process first.');
      }
      
      setPaymentStatus('processing');
      setProcessingStep(0);
      
      // Clear any previous errors
      setPaymentError(null);
      
      try {
        // Use X402 payment service instead of legacy payment service
        console.log("Initiating X402 payment flow...");
        
        // Step 1: Wallet connection
        setProcessingStep(0);
        
        // Setup mock wallet interaction
        window.mockWalletResult = null;
        
        // We'll use event listeners to synchronize with our enhanced demo flow
        const handleDemoMessage = (message) => {
          console.log("Demo message:", message);
          
          if (message.includes("Wallet connected successfully")) {
            setProcessingStep(1); // Move to step 2
          } 
          else if (message.includes("Opening wallet approval popup")) {
            setProcessingStep(2); // Move to step 3
          }
          else if (message.includes("User approved the transaction")) {
            // User approved in the mock wallet
            setProcessingStep(3); // Move to step 4
          }
          else if (message.includes("Transaction confirmed")) {
            setProcessingStep(4); // Move to step 5
          }
        };
        
        // Override console.log to capture demo mode messages
        const originalConsoleLog = console.log;
        console.log = function() {
          originalConsoleLog.apply(console, arguments);
          if (arguments[0] && typeof arguments[0] === 'string' && 
              arguments[0].includes('DEMO MODE')) {
            handleDemoMessage(arguments[0]);
          }
        };
        
        // Start the payment flow
        const result = await initiateX402Payment();
        console.log("X402 payment result:", result);
        
        // Restore original console.log
        console.log = originalConsoleLog;
        
        // Process successful payment
        if (result && result.success) {
          setTransactionId(result.receipt?.transactionHash || "demo-tx-" + Date.now());
          setExplorerLink(getTransactionLink(result.receipt?.transactionHash) || "#"); 
          
          // Save the NFT metadata if available
          if (result.nft) {
            setNftMetadata(result.nft);
          }
          
          // After successful payment, transition directly to success state
          // The NFT minting is now handled with real wallet signature in the x402PaymentService
          setPaymentStatus('success');
          
          // Set revenue split data if available
          if (result.receipt?.splits) {
            setRevenueSplit(result.receipt.splits);
          }
          
          // Import DID utilities and generate a DID for the user
          const { generateDID } = await import('../utils/didUtils');
          
          // Generate a DID using the user's wallet address and payment info
          const didDocument = generateDID(userData.address, {
            timestamp: new Date().toISOString(),
            verificationScore: userData.verificationStatus?.score || 95,
            network: 'Base Sepolia',
            entropy: result.receipt?.transactionHash || Date.now().toString()
          });
          
          // Create payment status data
          const paymentStatus = {
            status: 'paid',
            amount: paymentAmount,
            currency: 'USDC',
            transactionId: result.receipt?.transactionHash,
            explorerLink: getTransactionLink(result.receipt?.transactionHash),
            network: 'Base Sepolia',
            timestamp: new Date().toISOString(),
            paymentId: result.receipt?.paymentId
          };
          
          // Update user data with payment info and DID for persistence across sessions
          const updatedUserData = {
            ...userData,
            paymentStatus,
            didDocument  // Store the DID document in the user data
          };
            // Track payment completion and DID creation in Firebase
          if (userData && userData.userID) {
            try {
              await trackUserJourney(userData.userID, 'payment', {
                ...paymentStatus,
                nftMinted: !!result.nft,
                didCreated: true,
                didId: didDocument.id
              });
              
              // Also store the complete payment data in Firebase for persistence
              const { storePayment } = await import('../utils/firebaseConfig');
              const paymentStored = await storePayment(userData.userID, paymentStatus);
              if (paymentStored) {
                console.log("✅ Payment data successfully stored in Firebase");
              } else {
                console.warn("⚠️ Failed to store payment data in Firebase");
              }
            } catch (error) {
              console.error("Error tracking payment completion:", error);
            }
          }
          
          // Store updated user data
          localStorage.setItem('zybl_user_data', JSON.stringify(updatedUserData));
          
          // Set local state to trigger re-render
          setUserData(updatedUserData);
          
          // No automatic redirect - user must click the dashboard button
        } else {
          // Handle failed payment with specific error message
          setPaymentError(result?.message || 'Payment processing failed. Please try again.');
          setPaymentStatus('error');
        }
      } catch (error) {
        // Clear the interval if there's an error
        clearInterval(stepInterval);
        throw error;
      }    } catch (error) {      
      console.error('Error processing payment:', error);
      
      // Set user-friendly error message
      let errorMessage = error.message || 
        'An unexpected error occurred during payment processing. Please try again.';
      
      // Check for common testnet ETH issues
      if (errorMessage.includes('insufficient funds') || 
          errorMessage.includes('Insufficient ETH') ||
          errorMessage.includes('gas required exceeds allowance')) {
        errorMessage = 'You need Base Sepolia testnet ETH to pay for transaction fees. Please use the "Get testnet ETH" link below to get some from a faucet and try again.';
      } else if (errorMessage.includes('User rejected') || 
                errorMessage.includes('User denied')) {
        errorMessage = 'You rejected the transaction in your wallet. Please try again and approve the transaction.';
      }
      
      setPaymentError(errorMessage);
      
      // Update UI to show error state
      setPaymentStatus('error');
    }
  };
  
  if (isLoading) {
    return (
      <div className="payment-container">
        <div className="payment-loading">
          <div className="loading-animation">
            <div className="loading-spinner"></div>
            <div className="loading-pulse"></div>
          </div>
          <h3>Loading Payment Interface</h3>
          <p>Setting up your secure payment environment...</p>
        </div>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="payment-container">
        <div className="payment-error-card">
          <PaymentErrorIcon />
          <h3>Authentication Error</h3>
          <p>Unable to load user data. Please try signing in again.</p>
          <button 
            className="primary-button" 
            onClick={() => navigate('/signin')}
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }
  // Improved function for formatting addresses
  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get shortened address from userData with fallback
  const shortenedAddress = userData?.shortenedAddress || formatAddress(userData?.address) || 'Address Unavailable';
  // Generate PDF receipt using window.print()
  const generatePdfReceipt = () => {
    if (receiptRef.current) {
      // Create a new document with styling for printing
      const printWindow = window.open('', '_blank');
      
      // Get current date and format it
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleString();
      
      // Get the receipt information
      const txHash = transactionId;
      const shortenedTx = `${transactionId.substring(0, 8)}...${transactionId.substring(transactionId.length-8)}`;
      const amount = paymentAmount;
      const wallet = shortenedAddress;
      const network = "Base Sepolia (Testnet)";
      
      // Calculate the revenue distribution
      const userTreasuryAmount = (amount * 0.4).toFixed(2);
      const protocolAmount = (amount * 0.25).toFixed(2);
      const validatorsAmount = (amount * 0.2).toFixed(2);
      const communityAmount = (amount * 0.15).toFixed(2);
      
      // Create a base64 encoded version of the logo to include in the PDF
      const logoImg = logoblack; // This uses the imported Logo from the top of the file
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Zybl Payment Receipt - ${shortenedTx}</title>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                color: #000;
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.5;
              }
              .receipt-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 20px;
              }
              .receipt-logo {
                display: flex;
                align-items: center;
              }
              .receipt-logo img {
                height: 40px;
                margin-right: 15px;
              }
              .receipt-title {
                font-size: 24px;
                font-weight: bold;
                margin: 0;
                color: #000;
              }
              .receipt-date {
                font-size: 14px;
                color: #555;
                text-align: right;
              }
              .transaction-card {
                border: 1px solid #eee;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              }
              .info-section {
                margin-bottom: 20px;
              }
              .info-heading {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #000;
                border-bottom: 1px solid #f0f0f0;
                padding-bottom: 10px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
              }
              .info-row {
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
              }
              .info-item {
                margin-bottom: 12px;
              }
              .info-label {
                font-weight: 600;
                color: #555;
                margin-bottom: 5px;
                font-size: 14px;
              }
              .info-value {
                font-weight: 500;
                color: #000;
                font-size: 15px;
              }
              .transaction-hash {
                font-family: monospace;
                word-break: break-all;
              }
              .revenue-bar {
                height: 12px;
                background-color: #f0f0f0;
                border-radius: 6px;
                margin: 5px 0;
                position: relative;
                overflow: hidden;
              }
              .revenue-fill {
                height: 100%;
                position: absolute;
                left: 0;
                top: 0;
                border-radius: 6px;
              }
              .signature-section {
                margin-top: 40px;
                border-top: 1px solid #eee;
                padding-top: 30px;
                position: relative;
              }
              .signature-section::before {
                content: '';
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 80px;
                height: 20px;
                background: #fff;
                border: 1px solid #eee;
                border-radius: 10px;
              }
              .transaction-confirmation {
                background: #f9f9f9;
                border: 1px solid #eee;
                border-radius: 12px;
                padding: 22px;
                margin-bottom: 25px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.03);
                text-align: center;
              }
              .confirmation-header {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 15px;
                color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
              }
              .confirmation-header svg {
                width: 22px;
                height: 22px;
              }
              .transaction-details {
                background: #fff;
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                text-align: left;
                font-family: monospace;
                font-size: 14px;
                word-break: break-all;
                display: flex;
                align-items: center;
                gap: 10px;
                line-height: 1.5;
              }
              .hash-label {
                background: #f0f0f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 600;
                color: #555;
                white-space: nowrap;
                font-family: sans-serif;
              }
              .explorer-button {
                display: inline-block;
                background: #f0f0f0;
                color: #000;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 500;
                transition: all 0.2s;
                margin-bottom: 20px;
                border: 1px solid #e0e0e0;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                max-width: 320px;
                margin: 0 auto 20px;
              }
              .company-signature {
                margin-top: 30px;
                font-weight: bold;
                font-size: 16px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              }
              .signature-img {
                max-width: 150px;
                margin-bottom: 10px;
                opacity: 0.9;
              }
              .signature-border {
                width: 100px;
                height: 1px;
                background: #ddd;
                margin: 8px 0;
              }
              .footer-text {
                margin-top: 15px;
                font-size: 12px;
                color: #777;
                text-align: center;
              }
              .timestamp {
                font-size: 13px;
                color: #777;
                margin-top: 5px;
                font-style: italic;
              }
              @media print {
                .no-print { display: none; }
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-header">
              <div class="receipt-logo">
                <img src="${logoImg}" alt="Zybl Logo" />
                <h1 class="receipt-title">Zybl Passport Receipt</h1>
              </div>
              <div class="receipt-date">${formattedDate}</div>
            </div>
            
            <div class="transaction-card">
              <div class="info-section">
                <div class="info-heading">Transaction Details</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Transaction Hash</div>
                    <div class="info-value transaction-hash">${shortenedTx}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Amount</div>
                    <div class="info-value">${amount} USDC</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">Completed</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Wallet Address</div>
                    <div class="info-value">${wallet}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Network</div>
                    <div class="info-value">${network}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Date</div>
                    <div class="info-value">${formattedDate}</div>
                  </div>
                </div>
              </div>
              
              <div class="info-section">
                <div class="info-heading">Revenue Distribution</div>
                <div style="margin-bottom: 15px;">
                  <div class="info-row">
                    <div class="info-label">User Treasury (40%)</div>
                    <div class="info-value">${userTreasuryAmount} USDC</div>
                  </div>
                  <div class="revenue-bar">
                    <div class="revenue-fill" style="width: 40%; background-color: #000;"></div>
                  </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <div class="info-row">
                    <div class="info-label">Protocol (25%)</div>
                    <div class="info-value">${protocolAmount} USDC</div>
                  </div>
                  <div class="revenue-bar">
                    <div class="revenue-fill" style="width: 25%; background-color: #333;"></div>
                  </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <div class="info-row">
                    <div class="info-label">Validators (20%)</div>
                    <div class="info-value">${validatorsAmount} USDC</div>
                  </div>
                  <div class="revenue-bar">
                    <div class="revenue-fill" style="width: 20%; background-color: #555;"></div>
                  </div>
                </div>
                
                <div>
                  <div class="info-row">
                    <div class="info-label">Community (15%)</div>
                    <div class="info-value">${communityAmount} USDC</div>
                  </div>
                  <div class="revenue-bar">
                    <div class="revenue-fill" style="width: 15%; background-color: #777;"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="signature-section">
              <div class="transaction-confirmation">
                <div class="confirmation-header">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#000000"/>
                    <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Transaction Verified Successfully
                </div>
                
                <div class="transaction-details">
                  <span class="hash-label">TX:</span>
                  ${txHash}
                </div>
                
                <a href="https://sepolia.basescan.org/tx/${txHash}" target="_blank" class="explorer-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View Complete Transaction on Base Explorer
                </a>
                
                <p>Thank you for using Zybl Passport X402!</p>
              </div>
              
              <div class="company-signature">
                <div class="signature-img">
                  <svg viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20,15 Q30,5 40,15 T60,15" stroke="#000" stroke-width="2" fill="none"/>
                    <path d="M65,15 Q75,5 85,15" stroke="#000" stroke-width="2" fill="none"/>
                  </svg>
                </div>
                <div class="signature-border"></div>
                <strong>Zybl Technologies Inc.</strong>
                <span class="timestamp">Issued on ${formattedDate}</span>
              </div>
              
              <p class="footer-text">This is an electronic receipt. No physical signature is required.</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
              <button onclick="window.print()" style="padding: 12px 24px; background: #000; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 16px;">
                Print Receipt
              </button>
              <button onclick="window.close()" style="padding: 12px 24px; margin-left: 12px; background: #444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 16px;">
                Close
              </button>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Auto print after a short delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
      }, 800);
    }
  };
  
  return (
    <div className="payment-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: '5px',
      paddingBottom: '15px'
    }}>
          {/* Background elements */}
          <div className="payment-bg-elements">
            <div className="bg-circle circle1"></div>
            <div className="bg-circle circle2"></div>
            <div className="bg-circle circle3"></div>
            <div className="bg-glow"></div>
          </div>
          
          {/* Mock wallet popup */}
          <MockWalletPopup 
            show={showMockWallet}
            onApprove={handleWalletApprove}
            onCancel={handleWalletReject}
            amount={mockWalletData.amount}
            recipient={formatAddress(mockWalletData.recipient)}
          />
          
          {/* Progress bar */}
          {paymentStatus === 'processing' && (
        <div className="payment-progress-bar-modern" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 36, marginTop: 8 }}>
          <div className="progress-steps-modern" style={{ display: 'flex', gap: 18, background: 'rgba(30,30,30,0.92)', borderRadius: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', padding: '7px 18px', border: '1.5px solid rgba(255,255,255,0.08)' }}>
            <div className="step-modern" style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', opacity: 0.7, padding: '2px 18px', borderRadius: 18, background: 'none' }}>Connect Wallet</div>
            <div className="step-modern" style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', opacity: 0.7, padding: '2px 18px', borderRadius: 18, background: 'none' }}>Verify Identity</div>
            <div className="step-modern" style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', opacity: 1, padding: '2px 18px', borderRadius: 18, background: 'rgba(255,255,255,0.07)' }}>Complete Payment</div>
              </div>
            </div>
          )}
          
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className={`payment-card ${paymentStatus === 'success' ? 'success-screen' : ''} ${paymentStatus === 'initial' ? 'payment-screen' : ''}`}
          style={{ marginBottom: '32px' }}>
            {paymentStatus === 'initial' && (
              <>
                <div className="payment-header">
                  <div className="payment-title">
                    <h1>Complete Payment</h1>
                    <span className="payment-subtitle">One-time verification fee</span>
                  </div>
                  <div className="payment-step">Step 3 of 3</div>
                </div>
                
                <div className="payment-form">
                {/* Left Column */}
                <div className="payment-left-column">
                  <div className="payment-amount-card">
                    <div className="amount-header">
                      <span className="label">Amount</span>
                      <div className="currency-badge">
                        <span>USDC</span>
                        <div className="currency-pulse"></div>
                      </div>
                    </div>
                    <div className="amount-input-container">
                      <USDCIcon />
                      <div className="amount-value">{paymentAmount}</div>
                    </div>
                  </div>
                  
                  <div className="payment-method-selector">
                    <h3>Select Payment Method</h3>
                    <div className="method-options">
                      <div 
                        className={`method-option ${paymentMethod === 'usdc' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('usdc')}
                      >
                        <div className="method-icon">
                          <USDCIcon />
                        </div>
                        <div className="method-details">
                          <span className="method-name">USDC</span>
                          <span className="method-provider">via x402pay</span>
                        </div>
                        <div className="method-check">
                          {paymentMethod === 'usdc' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                              <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>

                      <div 
                        className={`method-option ${paymentMethod === 'eth' ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod('usdc')}
                      >
                        <div className="method-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.9978 3L4.80078 12.2583L11.9978 16.2958V3Z" fill="white" fillOpacity="0.6"/>
                            <path d="M11.998 3L19.1969 12.2583L11.998 16.2958V3Z" fill="white"/>
                            <path d="M11.9978 17.6538L4.80078 13.6163L11.9978 21.2963V17.6538Z" fill="white" fillOpacity="0.6"/>
                            <path d="M11.998 17.6538L19.1969 13.6163L11.998 21.2963V17.6538Z" fill="white"/>
                          </svg>
                        </div>
                        <div className="method-details">
                          <span className="method-name">ETH</span>
                          <span className="method-provider">via x402pay</span>
                        </div>
                        <div className="method-check"></div>
                    </div>
                  </div>
                  
                    <div className="payment-features">
                      <div className="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01L9 11.01" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Secure identity verification</span>
                      </div>
                      <div className="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01L9 11.01" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Access to all compatible dApps</span>
                      </div>
                      <div className="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01L9 11.01" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Transparent revenue distribution</span>
                      </div>
                    </div>
                    
                    <div className="testnet-notice">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>This transaction requires Base Sepolia testnet ETH for gas fees. <a href="#" onClick={(e) => { e.preventDefault(); getBaseSepoliaTestnetETH(); }}>Get testnet ETH</a></span>
                    </div>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="payment-right-column">
                  <div className="payment-summary">
                    <h3>Payment Summary</h3>
                    <div className="summary-items">
                      <div className="summary-item">
                        <span className="item-label">Verification Type</span>
                        <span className="item-value">Zybl Passport</span>
                      </div>
                      <div className="summary-item">
                        <span className="item-label">Wallet Address</span>
                        <span className="item-value address">{shortenedAddress}</span>
                      </div>
                      <div className="summary-item total">
                        <span className="item-label">Total</span>
                        <span className="item-value">
                          <USDCIcon />
                          <span>{paymentAmount} USDC</span>
                        </span>
                      </div>
                    </div>
                  </div>
                      <button 
                    className="payment-button"
                    onClick={handlePayment}
                    disabled={userData?.paymentStatus?.status === 'paid'}
                    aria-label="Pay Now"
                    style={userData?.paymentStatus?.status === 'paid' ? {
                      opacity: 0.5,
                      cursor: 'not-allowed',
                      background: '#666666'
                    } : {}}
                  >
                    <span className="button-text">
                      {userData?.paymentStatus?.status === 'paid' ? 'Payment Completed' : 'Pay Now with X402'}
                    </span>
                    {userData?.paymentStatus?.status === 'paid' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}                  </button>
                  
                  {userData?.paymentStatus?.status === 'paid' && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(0, 200, 83, 0.1)',
                      border: '1px solid rgba(0, 200, 83, 0.3)',
                      borderRadius: '8px',
                      color: '#00C853',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '12px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      You have already completed this payment successfully
                    </div>
                  )}
                  
                  <SecureBadge />
                  </div>
                </div>
              </>
            )}        
            {paymentStatus === 'processing' && (
              <div className="payment-processing">
                <div className="processing-header">
                  <div className="processing-animation">
                    <div className="circle-pulse"></div>
                    <div className="processing-icon">
                      <USDCIcon />
                    </div>
                  </div>
                <h2>Processing Payment</h2>
                </div>
              <p className="processing-subtitle">Please wait while we process your payment</p>
                
                <div className="processing-steps">
                  <div className={`step ${processingStep >= 0 ? 'active' : ''} ${processingStep > 0 ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {processingStep > 0 ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#00C853"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="step-number">1</div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">Connecting Wallet</span>
                      <span className="step-desc">Initializing Coinbase Wallet</span>
                    </div>
                  </div>
                  
                  <div className={`step ${processingStep >= 1 ? 'active' : ''} ${processingStep > 1 ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {processingStep > 1 ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#00C853"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="step-number">2</div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">Checking Balance</span>
                      <span className="step-desc">Verifying ETH for transaction fees</span>
                    </div>
                  </div>
                  
                  <div className={`step ${processingStep >= 2 ? 'active' : ''} ${processingStep > 2 ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {processingStep > 2 ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#00C853"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="step-number">3</div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">Wallet Approval</span>
                      <span className="step-desc">Approving USDC spending in wallet</span>
                    </div>
                  </div>
                  
                  <div className={`step ${processingStep >= 3 ? 'active' : ''} ${processingStep > 3 ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {processingStep > 3 ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#00C853"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="step-number">4</div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">Processing Transaction</span>
                      <span className="step-desc">Confirming on Base Sepolia</span>
                    </div>
                  </div>
                  
                  <div className={`step ${processingStep >= 4 ? 'active' : ''} ${processingStep > 4 ? 'completed' : ''}`}>
                    <div className="step-indicator">
                      {processingStep > 4 ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#00C853"/>
                          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="step-number">5</div>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">Verifying Payment</span>
                      <span className="step-desc">Finalizing verification</span>
                    </div>
                  </div>
                </div>
                
                <div className="payment-amount-summary">
                  <div className="amount-row">
                    <span className="amount-label">Total Amount</span>
                    <div className="amount-display">
                      <USDCIcon />
                      <span>{paymentAmount} USDC</span>
                    </div>
                  </div>
                  <div className="wallet-row">
                    <span className="wallet-label">From Wallet</span>
                    <span className="wallet-address">{shortenedAddress}</span>
                  </div>
                </div>
                
                <div className="processing-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  <p>Please do not close this window during processing</p>
                </div>
                
                <div className="processing-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ 
                    width: `${Math.min(100, (processingStep + 1) * 25)}%` 
                    }}></div>
                  </div>
                </div>
              </div>
            )}
            {paymentStatus === 'minting' && (
              <div className="payment-processing">
                <div className="processing-header">
                  <div className="processing-animation">
                    <div className="circle-pulse"></div>
                    <div className="processing-icon" style={{ background: "linear-gradient(135deg, #0052FF, #002A85)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.42 4.58C19.9183 4.07658 19.3223 3.6779 18.6653 3.40824C18.0082 3.13859 17.3042 3.00131 16.595 3.00131C15.8858 3.00131 15.1818 3.13859 14.5247 3.40824C13.8677 3.6779 13.2717 4.07658 12.77 4.58L12 5.36L11.23 4.58C10.9421 4.29192 10.608 4.06205 10.2429 3.9004C9.87779 3.73876 9.48772 3.64721 9.0925 3.6307C8.69728 3.61419 8.30179 3.67296 7.9257 3.80404C7.5496 3.93513 7.19952 4.1358 6.89752 4.39569C6.59551 4.65558 6.34633 4.97026 6.16177 5.32323C5.97721 5.67619 5.8609 6.06136 5.81995 6.45908C5.779 6.85679 5.81417 7.25913 5.92327 7.6416C6.03236 8.02407 6.21318 8.38002 6.45 8.69L12 14.3L17.54 8.78C18.0435 8.27852 18.4423 7.68248 18.7119 7.02544C18.9816 6.3684 19.1188 5.66437 19.1188 4.95167C19.1188 4.23897 18.9816 3.53494 18.7119 2.8779C18.4423 2.22086 18.0435 1.62482 17.54 1.12334C17.0365 0.621855 16.4405 0.223093 15.7835 -0.0465585C15.1264 -0.31621 14.4224 -0.453335 13.7097 -0.453335C12.997 -0.453335 12.293 -0.31621 11.636 -0.0465585C10.9789 0.223093 10.3829 0.621855 9.87942 1.12334L12 3.24L14.1206 1.12334C14.6241 0.621855 15.2201 0.223093 15.8771 -0.0465585C16.5342 -0.31621 17.2382 -0.453335 17.9509 -0.453335C18.6636 -0.453335 19.3676 -0.31621 20.0247 -0.0465585C20.6817 0.223093 21.2777 0.621855 21.7812 1.12334C22.2847 1.62482 22.6834 2.22086 22.9531 2.8779C23.2228 3.53494 23.36 4.23897 23.36 4.95167C23.36 5.66437 23.2228 6.3684 22.9531 7.02544C22.6834 7.68248 22.2847 8.27852 21.7812 8.78L12 18.64L2.22 8.69C1.73248 8.19243 1.36836 7.58522 1.15765 6.91708C0.946933 6.24894 0.895358 5.53536 1.00726 4.83858C1.11916 4.14179 1.39068 3.48126 1.80148 2.91176C2.21228 2.34225 2.75145 1.87935 3.37357 1.56082C3.99568 1.2423 4.68577 1.07774 5.38795 1.08034C6.09013 1.08294 6.77881 1.25264 7.39826 1.57573C8.01771 1.89881 8.55308 2.3655 8.95925 2.93774C9.36541 3.50998 9.6316 4.17227 9.73775 4.87L12 7.13L14.2622 4.87C14.3684 4.17227 14.6346 3.50998 15.0407 2.93774C15.4469 2.3655 15.9823 1.89881 16.6017 1.57573C17.2212 1.25264 17.9099 1.08294 18.612 1.08034C19.3142 1.07774 20.0043 1.2423 20.6264 1.56082C21.2485 1.87935 21.7877 2.34225 22.1985 2.91176C22.6093 3.48126 22.8808 4.14179 22.9927 4.83858C23.1046 5.53536 23.0531 6.24894 22.8423 6.91708C22.6316 7.58522 22.2675 8.19243 21.78 8.69L20.42 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                <h2>Minting NFT Badge</h2>
                </div>
              <p className="processing-subtitle">Please sign the message to mint your soulbound NFT</p>
                
                <div className="nft-minting-info" style={{
                  background: "rgba(255,255,255,0.07)",
                  padding: "15px",
                  borderRadius: "10px",
                  marginBottom: "20px"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "15px"
                  }}>
                    <div style={{
                      width: "80px",
                      height: "80px",
                      background: "linear-gradient(135deg, #0052FF, #002A85)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "32px",
                      fontWeight: "bold"
                    }}>
                      Z
                    </div>
                  </div>
                  <div style={{
                    textAlign: "center",
                    marginBottom: "15px"
                  }}>
                    <h3 style={{ margin: "0 0 5px 0", fontSize: "1rem" }}>Zybl Passport Verification Badge</h3>
                    <p style={{ margin: "0", fontSize: "0.8rem", opacity: "0.7" }}>
                      Soulbound NFT confirming your verified identity
                    </p>
                  </div>
                </div>
                
                <div className="processing-note" style={{ marginTop: "10px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  <p>Please approve the wallet signature request</p>
                </div>
                
                {mintingNFT && (
                  <div className="minting-progress" style={{ marginTop: "20px" }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ 
                        width: `100%`,
                        animation: "pulse-width 2s infinite"
                      }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}            
            {paymentStatus === 'success' && (
            <div className="payment-success-landscape">
              <div className="success-card-main">
                {/* Left Side - Success Animation */}
                <div className="success-left no-scroll">
                  <div className="success-animation-container">
                    {/* Animated Success Icon with Pulse Effect */}
                    <div style={{
                      position: 'absolute',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: '#000000',
                      border: '2.5px solid #FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                      boxShadow: '0 0 0 4px rgba(255,255,255,0.12)',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M5 12L10 17L19 8" 
                          stroke="#FFFFFF" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="success-checkmark"
                          style={{
                            strokeDasharray: "30",
                            strokeDashoffset: "30",
                            animation: 'checkmark-draw 1.2s ease-in-out forwards'
                          }}
                        />
                      </svg>
                    </div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        animation: `pulse-ring 2.2s ease-out infinite ${i * 0.7}s`,
                        opacity: 0,
                        zIndex: 1
                      }}></div>
                    ))}
                    <div className="success-confetti">
                      {[...Array(24)].map((_, i) => (
                        <div key={i} className="confetti-piece" style={{ 
                          position: 'absolute',
                          animation: `confettiDrop ${Math.random() * 1.2 + 1.2}s ease-out infinite ${i * 0.08}s`,
                          left: `${Math.random() * 200 - 40}px`,
                          top: '-15px',
                          width: `${Math.random() * 4 + 2}px`,
                          height: `${Math.random() * 4 + 2}px`,
                          opacity: Math.random() * 0.9 + 0.3,
                          backgroundColor: '#FFFFFF',
                          borderRadius: '50%',
                        }}></div>
                      ))}
                      {[...Array(8)].map((_, i) => (
                        <div key={i + 24} className="confetti-piece" style={{ 
                          position: 'absolute',
                          animation: `confettiDrop ${Math.random() * 1.5 + 1.0}s ease-out infinite ${i * 0.1}s`,
                          left: `${Math.random() * 180 - 30}px`,
                          top: '-15px',
                          width: `${Math.random() * 3 + 2}px`,
                          height: `${Math.random() * 3 + 2}px`,
                          opacity: Math.random() * 0.7 + 0.4,
                          backgroundColor: '#FFFFFF',
                          transform: `rotate(${Math.random() * 45}deg)`
                        }}></div>
                      ))}
                    </div>
                  </div>
                  <h2 className="success-title">Payment Successful</h2>
                  <p className="success-message">
                    Your Zybl Passport has been activated. Transaction verified on the blockchain.
                  </p>
                </div>
                {/* Right Side - Receipt Details */}
                <div className="success-right scrollable-white">
                  {/* Receipt Card */}
                  <div className="transaction-card" ref={receiptRef} style={{ 
                    padding: '20px',
                    borderRadius: 12,
                    border: '1px solid #EEEEEE',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    background: '#FFFFFF'
                  }}>
                    <div className="receipt-header" style={{ 
                      display: 'flex', 
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 20,
                      borderBottom: '1px solid #F0F0F0',
                      paddingBottom: 16
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.2rem', 
                        fontWeight: 700, 
                        color: '#000000',
                        letterSpacing: '-0.01em',
                        flex: 1,
                        textAlign: 'left'
                      }}>Zybl Passport Receipt</h3>
                      <div style={{ 
                        fontSize: '0.98rem', 
                        color: '#888',
                        fontWeight: 500,
                        marginLeft: 16,
                        whiteSpace: 'nowrap',
                        textAlign: 'right'
                      }}>{new Date().toLocaleString('en-GB')}</div>
                    </div>
                    <div className="receipt-grid" style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 4
                     
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Transaction Hash</div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#000000', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ fontFamily: 'monospace' }}>
                            {transactionId ? 
                              `${transactionId.slice(0, 6)}...${transactionId.slice(-6)}` : 
                              '0x8347...bb1501'
                            }
                          </span>
                          <a 
                            href={explorerLink || `https://sepolia.basescan.org/tx/${transactionId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: '#000000', 
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            View
                          </a>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Amount</div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          color: '#000000', 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <USDCIcon />
                          <span>2 USDC</span>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Status</div>
                        <div style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#000000'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#000000"/>
                            <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Completed</span>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Wallet</div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#000000',
                          fontWeight: 500,
                          fontFamily: 'monospace'
                        }}>
                          {userData?.address ? 
                            `${userData.address.slice(0, 6)}...${userData.address.slice(-4)}` : 
                            '0x9d66...2506'
                          }
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Network</div>
                        <div style={{ fontSize: '0.9rem', color: '#000000', fontWeight: 500 }}>
                          Base Sepolia (Testnet)
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ fontSize: '0.9rem', color: '#777777', fontWeight: 500 }}>Date</div>
                        <div style={{ fontSize: '0.9rem', color: '#000000', fontWeight: 500 }}>
                          19/6/2025, 11:31:45 pm
                        </div>
                      </div>
                    </div>
                    <button 
                      className="print-receipt-button" 
                      onClick={generatePdfReceipt}
                      style={{ 
                        width: '100%',
                        padding: '15px',
                        background: '#000000',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: '1rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginTop: '20px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Print Receipt
                    </button>
                  </div>
                  {/* Revenue Distribution */}
                  <div className="revenue-split-preview" style={{ 
                    padding: '20px',
                    borderRadius: 12,
                    border: '1px solid #EEEEEE',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                    background: '#FFFFFF'
                  }}>
                    <h3 style={{ 
                      fontWeight: 700, 
                      color: '#000000', 
                      marginTop: 0,
                      marginBottom: 16, 
                      fontSize: '1.1rem'
                    }}>Revenue Distribution</h3>
                    <div style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between', 
                        gap: 10
                      }}>
                        <div style={{ width: 110, fontSize: '0.9rem', color: '#555' }}>User Treasury</div>
                        <div style={{ 
                          flex: 1, 
                          height: 6, 
                          background: '#F5F5F5', 
                          borderRadius: 3, 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '40%',
                            background: '#000000',
                            borderRadius: 3
                          }}></div>
                        </div>
                        <div style={{ width: 40, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>40%</div>
                        <div style={{ width: 50, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                          0.80
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between', 
                        gap: 10
                      }}>
                        <div style={{ width: 110, fontSize: '0.9rem', color: '#555' }}>Protocol</div>
                        <div style={{ 
                          flex: 1, 
                          height: 6, 
                          background: '#F5F5F5', 
                          borderRadius: 3, 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '25%',
                            background: '#000000',
                            borderRadius: 3
                          }}></div>
                        </div>
                        <div style={{ width: 40, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>25%</div>
                        <div style={{ width: 50, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                          0.50
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between', 
                        gap: 10
                      }}>
                        <div style={{ width: 110, fontSize: '0.9rem', color: '#555' }}>Validators</div>
                        <div style={{ 
                          flex: 1, 
                          height: 6, 
                          background: '#F5F5F5', 
                          borderRadius: 3, 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '20%',
                            background: '#000000',
                            borderRadius: 3
                          }}></div>
                        </div>
                        <div style={{ width: 40, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>20%</div>
                        <div style={{ width: 50, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                          0.40
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between', 
                        gap: 10
                      }}>
                        <div style={{ width: 110, fontSize: '0.9rem', color: '#555' }}>Community</div>
                        <div style={{ 
                          flex: 1, 
                          height: 6, 
                          background: '#F5F5F5', 
                          borderRadius: 3, 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '15%',
                            background: '#000000',
                            borderRadius: 3
                          }}></div>
                        </div>
                        <div style={{ width: 40, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>15%</div>
                        <div style={{ width: 50, fontSize: '0.9rem', fontWeight: 600, textAlign: 'right' }}>
                          0.30
                        </div>
                      </div>
                    </div>
                    <p style={{ 
                      marginTop: 16,
                      marginBottom: 0,
                      fontSize: '0.9rem',
                      color: '#777777',
                      textAlign: 'center'
                    }}>
                      Full details available in your dashboard
                    </p>
                  </div>
                  {/* Dashboard Button */}
                  <button 
                    className="dashboard-button"
                    onClick={() => {
                      // Use user ID from URL first, then from userData, or just go to dashboard
                      const userId = userIdFromUrl || (userData && userData.userID);
                      navigate(userId ? `/dashboard?id=${userId}` : '/dashboard');
                    }}
                    style={{ 
                      width: '100%',
                      padding: '16px',
                      background: '#000000',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: '1rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: 'auto'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#222222'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#000000'}
                  >
                    Go to Dashboard
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            )}
              {paymentStatus === 'error' && (
            <div className="payment-error" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div
                className="error-card-modern"
                style={{
                  background: 'rgba(20,20,20,0.92)',
                  borderRadius: '20px',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                  border: '1.5px solid rgba(255,0,0,0.08)',
                  maxWidth: 420,
                  width: '100%',
                  padding: '36px 32px 28px 32px',
                  position: 'relative',
                  color: '#fff',
                  textAlign: 'center',
                  margin: '0 auto',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" fill="rgba(255,0,0,0.08)" stroke="#FF3B3B" strokeWidth="2"/>
                    <path d="M16 16L32 32" stroke="#FF3B3B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M32 16L16 32" stroke="#FF3B3B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ color: '#FF3B3B', fontWeight: 800, fontSize: '1.5rem', marginBottom: 10, letterSpacing: '-0.5px' }}>Payment Failed</h2>
                <div style={{ color: '#fff', fontSize: '1rem', marginBottom: 18, fontWeight: 500 }}>{paymentError}</div>
                <div style={{ textAlign: 'left', margin: '0 auto 18px auto', background: 'rgba(255,0,0,0.04)', borderRadius: 10, padding: '18px 16px', border: '1px solid rgba(255,0,0,0.07)' }}>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8, fontSize: '1.08rem' }}>Troubleshooting Tips</div>
                  <ul style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.98rem', margin: 0, paddingLeft: 18 }}>
                        <li>Ensure you have sufficient USDC in your wallet</li>
                    <li>Ensure you have Base Sepolia testnet ETH for gas fees - <a href="#" style={{ color: '#3B82F6', textDecoration: 'underline' }} onClick={(e) => { e.preventDefault(); getBaseSepoliaTestnetETH(); }}>Get testnet ETH</a></li>
                        <li>Check your wallet connection and try again</li>
                        <li>If you see a pending transaction, wait for it to complete</li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                    </div>                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                    {/* Only show Try Again button if payment hasn't been completed successfully */}
                    {(!userData?.paymentStatus || userData.paymentStatus.status !== 'paid') && (
                      <button 
                        className="retry-button"
                      style={{
                        background: 'linear-gradient(90deg, #232323 0%, #181818 100%)',
                        color: '#fff',
                        border: '1.5px solid #FF3B3B',
                        borderRadius: 8,
                        padding: '10px 22px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                        onClick={() => {
                          // Double-check that payment hasn't been completed
                          if (userData?.paymentStatus?.status === 'paid') {
                            console.log("Payment already completed, redirecting to success screen");
                            setPaymentStatus('success');
                            return;
                          }
                          setPaymentStatus('initial');
                        }}
                      >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                        <path d="M1 4V10H7" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.51 15C4.15839 17.3304 5.6375 19.3688 7.66911 20.7358C9.70072 22.1027 12.1565 22.7062 14.5481 22.4453C16.9396 22.1843 19.1272 21.0768 20.7282 19.3326C22.3292 17.5885 23.2388 15.3249 23.3244 12.9602C23.4101 10.5956 22.6665 8.27033 21.2156 6.39055C19.7647 4.51077 17.6984 3.1908 15.3765 2.60564C13.0546 2.02048 10.6135 2.2058 8.41162 3.13281C6.20972 4.05982 4.36618 5.67687 3.19 7.74" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Try Again
                      </button>
                    )}
                    <button 
                      className="contact-support-button"
                    style={{
                      background: 'linear-gradient(90deg, #232323 0%, #181818 100%)',
                      color: '#fff',
                      border: '1.5px solid #3B82F6',
                      borderRadius: 8,
                      padding: '10px 22px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                      onClick={() => window.open('https://support.zybl.io', '_blank', 'noopener,noreferrer')}
                    >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                      <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.1003 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="11.5" r="1" fill="#3B82F6"/>
                      <circle cx="16" cy="11.5" r="1" fill="#3B82F6"/>
                      <circle cx="8" cy="11.5" r="1" fill="#3B82F6"/>
                      </svg>
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
      <MockWalletPopup 
        show={showMockWallet}
        onApprove={handleWalletApprove}
        onCancel={handleWalletReject}
        amount={mockWalletData.amount}
        recipient={mockWalletData.recipient}
      />
      <div className="wallet-footer-container">
        <div className="wallet-address-container">
            <div className="coinbase-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.9 16.9467 17.25 14.6694 17.25 11.8734C17.25 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
              </svg>
            <span
              className="wallet-address"
              title="Copy address"
              onClick={() => {
                navigator.clipboard.writeText(userData?.address || '');
                // Optionally show a toast/notification here
              }}
            >
              {shortenedAddress}
              <span className="copy-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 15H4C3.46957 15 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              </span>
            </span>
            </div>
            <div className="connected-badge">
              <span className="connection-dot"></span>
              <span>Connected</span>
            </div>
          </div>
          <div className="powered-by">
            <span>Powered by</span>
            <span className="provider-name">Zybl Passport</span>
        </div>
      </div>
    </div>
  );
};

export default Payment;
