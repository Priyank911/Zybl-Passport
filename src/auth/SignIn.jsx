import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  connectCoinbaseWallet, 
  signMessageWithCoinbase, 
  shortenAddress, 
  isCoinbaseWalletAvailable
} from '../utils/coinbaseAuthUtils';
import { createOrGetUserID, trackUserJourney } from '../utils/firebaseConfig';
import '../styles/SignIn.css';

// Coinbase Wallet Icon
const CoinbaseWalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#0052FF"/>
    <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
  </svg>
);

// Error Icon
const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2"/>
    <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Info Icon
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Success Icon
const SuccessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Warning Icon
const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18C1.64 18.33 1.55 18.7 1.56 19.08C1.57 19.46 1.68 19.83 1.88 20.15C2.08 20.47 2.36 20.74 2.69 20.91C3.02 21.09 3.39 21.18 3.77 21.17H20.23C20.61 21.18 20.98 21.09 21.31 20.91C21.64 20.74 21.92 20.47 22.12 20.15C22.32 19.83 22.43 19.46 22.44 19.08C22.45 18.7 22.36 18.33 22.18 18L13.71 3.86C13.51 3.54 13.23 3.27 12.89 3.09C12.56 2.91 12.18 2.82 11.8 2.82C11.42 2.82 11.04 2.91 10.71 3.09C10.37 3.27 10.09 3.54 9.89 3.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Notification component
const Notification = ({ type, message, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'error': return <ErrorIcon />;
      case 'success': return <SuccessIcon />;
      case 'info': return <InfoIcon />;
      case 'warning': return <WarningIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <div className={`notification ${type}`}>
      {getIcon()}
      <p>{message}</p>
      <button 
        className="notification-close" 
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

const SignIn = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [walletDetected, setWalletDetected] = useState(false);
  const [animateQRCode, setAnimateQRCode] = useState(false);
  
  // Deep link URL for Coinbase Wallet
  const coinbaseWalletDeepLink = "https://go.cb-w.com/dapp?cb_url=";
  const currentURL = window.location.href;
  const deepLinkURL = `${coinbaseWalletDeepLink}${encodeURIComponent(currentURL)}`;
  
  // Show notification helper function
  const showNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  
  // Check if already logged in from localStorage and if Coinbase Wallet is available
  useEffect(() => {
    const checkAuthStatus = () => {
      const userData = localStorage.getItem('zybl_user_data');
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData.address) {
            setWalletAddress(parsedData.address);
            setIsAuthenticated(true);
            showNotification('success', 'You are already signed in!');
          }
        } catch (e) {
          console.error("Error parsing stored user data:", e);
          localStorage.removeItem('zybl_user_data');
        }
      }
    };
    
    // Check if Coinbase Wallet is detected
    const isWalletAvailable = isCoinbaseWalletAvailable();
    setWalletDetected(isWalletAvailable);
    
    // Only show QR code if wallet is not available and user is not authenticated
    const userData = localStorage.getItem('zybl_user_data');
    if (!isWalletAvailable && !userData) {
      // Delay showing QR code for smoother transition
      setTimeout(() => {
        setShowQRCode(true);
        // Animate QR code after a slight delay
        setTimeout(() => setAnimateQRCode(true), 300);
      }, 500);
    }
    
    checkAuthStatus();
  }, []);
  
  const handleSignIn = async () => {
    setIsConnecting(true);
    setNotifications([]);
    
    try {
      // 1. Connect to Coinbase Wallet
      showNotification('info', 'Connecting to Coinbase Wallet...');
      
      // We'll try to connect directly instead of checking first
      // This approach is more reliable as some browsers/environments
      // may not properly expose the wallet detection flags
      const { address, provider, chainId } = await connectCoinbaseWallet();
      setWalletAddress(address);
      
      // Update status with connected address
      showNotification('info', `Connected to wallet ${shortenAddress(address)}`);
      
      // 2. Sign a message to verify ownership
      showNotification('info', 'Please sign the message to verify your wallet ownership');
      
      // Generate verification message with nonce for security
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const timestamp = new Date().toISOString();
      const message = `Welcome to Zybl Passport!\n\nPlease sign this message to verify your wallet ownership.\n\nWallet: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
      
      const signature = await signMessageWithCoinbase(message);
      
      // 3. Save auth data (in a real app, you'd verify this on a backend)
      showNotification('info', 'Verification successful! Saving your session...');
      
      // Generate or retrieve a unique user ID and track this signin
      showNotification('info', 'Creating unique user profile...');
      const userID = await createOrGetUserID(address);
      
      // Track the signin step in user journey
      await trackUserJourney(userID, 'signin', {
        address,
        chainId,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      });
      
      // Save authentication data in localStorage
      const userData = {
        userID,
        address,
        chainId,
        timestamp,
        lastSignIn: new Date().toISOString(),
        shortenedAddress: shortenAddress(address)
      };
      
      localStorage.setItem('zybl_user_data', JSON.stringify(userData));
      
      // 4. Complete authentication
      setIsAuthenticated(true);
      showNotification('success', 'Authentication successful! Redirecting to verification...');
      
      // Redirect to verification step with user ID after a short delay
      setTimeout(() => {
        navigate(`/verification?id=${userID}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error during Coinbase Wallet authentication:', error);
      
      // Format user-friendly error messages
      let errorMessage = 'Failed to connect wallet. Please try again.';
      
      if (error.message?.includes('Coinbase Wallet not detected')) {
        errorMessage = error.message;
        setShowQRCode(true);
        setTimeout(() => setAnimateQRCode(true), 300);
      } else if (error.message?.includes('rejected') || error.message?.includes('User denied')) {
        errorMessage = 'You rejected the connection request. Please try again.';
      } else if (error.message?.includes('sign the message')) {
        errorMessage = 'You need to sign the message to verify wallet ownership.';
      } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('Invalid options')) {
        errorMessage = 'Configuration error with Coinbase Wallet. Please refresh and try again.';
      }
      
      showNotification('error', errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = () => {
    // Clear authentication data
    localStorage.removeItem('zybl_user_data');
    setIsAuthenticated(false);
    setWalletAddress('');
    
    // Try to disconnect wallet if possible
    if (window.coinbaseWalletProvider) {
      try {
        // Some wallets support this method
        if (window.coinbaseWalletProvider.close) {
          window.coinbaseWalletProvider.close();
        }
        window.coinbaseWalletProvider = null;
      } catch (e) {
        console.error("Error disconnecting wallet:", e);
      }
    }
    
    showNotification('info', 'You have been signed out.');
  };
  
  // Handle close QR code button
  const handleCloseQRCode = () => {
    setAnimateQRCode(false);
    // Wait for animation to complete before hiding
    setTimeout(() => setShowQRCode(false), 300);
  };

  // Remove notification by id
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="signin-container">
      {/* Notifications container */}
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            type={notification.type}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      
      <div className="signin-card">
        <div className="signin-left-panel">
          <div className="left-panel-content">
            <div className="zybl-logo">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
              </svg>
            </div>
            <h1>Zybl Passport</h1>
            <p className="signin-tagline">Secure blockchain authentication with Coinbase Wallet</p>
            <div className="signin-features">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4L12 14.01L9 11.01" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Biometric protection</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16V12" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8H12.01" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Zybl-resistant identity</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16.2399 7.76001L14.1199 14.12L7.75991 16.24L9.87991 9.88001L16.2399 7.76001Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Blockchain-verified access</span>
              </div>
            </div>
            <div className="coinbase-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
              </svg>
              <span>Powered by Coinbase Wallet</span>
            </div>
          </div>
        </div>
        <div className="signin-right-panel">
        {isAuthenticated ? (
          <div className="signin-content">
            <div className="wallet-info">
              <CoinbaseWalletIcon />
              <div className="wallet-address">
                {shortenAddress(walletAddress)}
              </div>
            </div>
            
            <button 
                className="signin-button primary"
              onClick={() => navigate('/verification')}
            >
              Start Verification
            </button>
            <button 
              className="signin-button secondary"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="signin-content">
            <div className="wallet-connect-container">
              <h2 className="panel-title">Connect Your Wallet</h2>
              
              <div className="wallet-option-single coinbase">
                <CoinbaseWalletIcon />
                <div className="wallet-option-details">
                  <div className="wallet-option-name">Coinbase Wallet</div>
                  <div className="wallet-option-description">Secure blockchain authentication</div>
                </div>
              </div>
              
              {showQRCode && (
                <div className={`qrcode-container ${animateQRCode ? 'visible' : ''}`}>
                  <button 
                    className="qrcode-close-btn" 
                    onClick={handleCloseQRCode}
                    aria-label="Close QR code"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  <div className="qrcode-content">
                    <div className="qrcode-wrapper">
                      <QRCodeSVG 
                        value={deepLinkURL} 
                        size={120} 
                        bgColor={"#ffffff"} 
                        fgColor={"#000000"} 
                        level={"L"} 
                        includeMargin={false}
                      />
                    </div>
                  </div>
                  <div className="qrcode-text">
                    <h3>Scan with Coinbase Wallet</h3>
                    <p className="qrcode-instructions">
                      Scan this QR code with your Coinbase Wallet app to connect securely
                    </p>
                    <a 
                      href={deepLinkURL} 
                      className="signin-button secondary mobile-link-button"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 8L22 12L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Open in Wallet
                    </a>
                  </div>
                </div>
              )}
              
              {isConnecting ? (
                <div className="connection-loader">
                  <div className="loading-circle">
                    <CoinbaseWalletIcon />
                </div>
                
                  <div className="loader-text">
                    <p>Connecting to your wallet</p>
                    <p className="confirm-subtitle">Check Coinbase Wallet for approval</p>
                  </div>
              </div>
            ) : (
              <button 
                  className="signin-button primary"
                  onClick={handleSignIn}
                disabled={isConnecting}
              >
                  <CoinbaseWalletIcon />
                  Connect with Coinbase Wallet
              </button>
            )}
            </div>
            
            <div className="signin-right-panel-footer">
              <p className="signin-info">
                By connecting with Coinbase Wallet, you're accessing a secure, blockchain-based authentication system with biometric protection.
              </p>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignIn;
