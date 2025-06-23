// src/auth/BiometricVerification.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { trackUserJourney } from '../utils/firebaseConfig';
import FaceRecognition from '../components/FaceRecognition';
import VerificationPopup from '../components/VerificationPopup';
import '../styles/BiometricVerification.css';
import '../styles/FaceRecognition.css';

// Success Icon
const SuccessIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 4L12 14.01L9 11.01" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Face Scan Icon
const FaceScanIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 8V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.46957 20 6 20H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 20H18C18.5304 20 19.0391 19.7893 19.4142 19.4142C19.7893 19.0391 20 18.5304 20 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 12C10 12.5523 10.4477 13 11 13C11.5523 13 12 12.5523 12 12C12 11.4477 11.5523 11 11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 12C14 12.5523 13.5523 13 13 13C12.4477 13 12 12.5523 12 12C12 11.4477 12.4477 11 13 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 15C9.85038 15.6303 10.8846 16 12 16C13.1154 16 14.1496 15.6303 15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Device Fingerprint Icon
const DeviceFingerprintIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 11C12 8.17157 9.82843 6 7 6C4.17157 6 2 8.17157 2 11C2 13.8284 4.17157 16 7 16H12V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11C12 8.17157 14.1716 6 17 6C19.8284 6 22 8.17157 22 11C22 13.8284 19.8284 16 17 16H12V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 16V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Behavior Analysis Icon
const BehaviorAnalysisIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 5L7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 17L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 7L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 17L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

// Authentication indicator
const AuthIndicator = ({ address }) => (
  <div className="auth-indicator">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#0052FF"/>
      <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
    </svg>
    <span className="address">{address}</span>
  </div>
);

const BiometricVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [userData, setUserData] = useState(null);
  const [scanResults, setScanResults] = useState({});
  const [userIdFromUrl, setUserIdFromUrl] = useState(null);
  const [showExistingUserPopup, setShowExistingUserPopup] = useState(false);
  const [existingFaceData, setExistingFaceData] = useState(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [faceVerificationComplete, setFaceVerificationComplete] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const verificationSteps = [
    {
      id: 'face-verification',
      title: 'Face Verification',
      description: 'Confirm your identity with a quick facial scan',
      icon: <FaceScanIcon />,
      progressPercentage: 33,
      metrics: [
        { label: 'Face Match', value: '98%' },
        { label: 'Liveness', value: 'Verified' },
        { label: 'Unique ID', value: '0xabc...123' }
      ]
    },
    {
      id: 'device-fingerprint',
      title: 'Device Fingerprint',
      description: 'Creating a unique signature for your device',
      icon: <DeviceFingerprintIcon />,
      progressPercentage: 66,
      metrics: [
        { label: 'Browser ID', value: 'Chrome 123.45' },
        { label: 'Hardware', value: 'Verified' },
        { label: 'Location', value: 'Secured' }
      ]
    },
    {
      id: 'behavior-analysis',
      title: 'Behavior Analysis',
      description: 'Analyzing behavior patterns for verification',
      icon: <BehaviorAnalysisIcon />,
      progressPercentage: 100,
      metrics: [
        { label: 'Pattern Match', value: '95%' },
        { label: 'Risk Score', value: 'Low' },
        { label: 'Authentication', value: 'Strong' }
      ]
    }
  ];
  
  // Extract user ID from URL
  useEffect(() => {
    try {
      // Parse the user ID from the URL if available
      // Format expected: /verification?id=user123
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
    const storedData = localStorage.getItem('zybl_user_data');
    if (!storedData) {
      // Not authenticated, redirect to signin
      navigate('/signin');
      return;
    }
    
    try {
      const parsedData = JSON.parse(storedData);
      setUserData(parsedData);
    } catch (e) {
      console.error("Error parsing stored user data:", e);
      localStorage.removeItem('zybl_user_data');
      navigate('/signin');
    }
  }, [navigate]);
  // Handle face recognition completion
  const handleFaceVerificationComplete = (faceVector) => {
    console.log('Face verification completed for new user');
    setIsFirstTimeUser(true);
    setFaceVerificationComplete(true);
    
    // Store face vector data for later use
    setScanResults(prev => ({
      ...prev,
      [0]: {
        faceMatch: '98%',
        liveness: 'Verified',
        uniqueId: '0x' + Math.random().toString(16).substring(2, 8),
        faceVector: faceVector
      }
    }));
    
    // Move to next step (fingerprint) after a short delay
    setTimeout(() => {
      setCurrentStep(1);
    }, 2000);
  };

  // Handle existing user found
  const handleExistingUserFound = (existingFace) => {
    console.log('Existing user found:', existingFace);
    setExistingFaceData(existingFace);
    setShowExistingUserPopup(true);
  };

  // Handle popup actions
  const handleProceedToDashboard = async () => {
    setShowExistingUserPopup(false);
    
    // Update user data with verification status
    const verificationStatus = {
      status: 'Verified',
      score: Math.round(existingFaceData.similarity * 100),
      lastVerified: new Date().toISOString(),
      isExistingUser: true
    };
    
    const updatedUserData = {
      ...userData,
      verificationStatus
    };
    
    // Track verification completion in Firebase
    if (userData && userData.userID) {
      await trackUserJourney(userData.userID, 'verification', {
        score: verificationStatus.score,
        timestamp: verificationStatus.lastVerified,
        status: verificationStatus.status,
        isExistingUser: true
      });
    }
    
    localStorage.setItem('zybl_user_data', JSON.stringify(updatedUserData));
    
    // Redirect to dashboard
    navigate('/dashboard');
  };

  const handleVerifyAgain = () => {
    setShowExistingUserPopup(false);
    setExistingFaceData(null);
    // Reset face verification to allow re-verification
    setFaceVerificationComplete(false);
  };
  // Generate random data for verification metrics (for fingerprint and behavior steps)
  const generateRandomData = (step) => {
    const metrics = {};
    
    switch (step) {
      case 1: // Device fingerprint
        metrics.browserInfo = navigator.userAgent.match(/chrome|firefox|safari|edge/i)?.[0] || 'Browser';
        metrics.hardware = Math.random() > 0.2 ? 'Verified' : 'Limited';
        metrics.riskLevel = Math.random() > 0.7 ? 'Low' : 'Medium';
        break;
      case 2: // Behavior analysis
        metrics.patternMatch = Math.floor(85 + Math.random() * 15);
        metrics.trustScore = Math.floor(70 + Math.random() * 30);
        metrics.authStrength = Math.random() > 0.3 ? 'Strong' : 'Medium';
        break;
      default:
        break;
    }
    
    return metrics;
  };

  // Handle verification for fingerprint and behavior steps (steps 1 and 2)
  const startVerification = () => {
    // Only handle steps 1 and 2 - face verification is handled separately
    if (currentStep === 0) return;
    
    setIsVerifying(true);
    
    // Generate random verification data for demo purposes
    const newMetrics = generateRandomData(currentStep);
    
    // Simulate verification process
    setTimeout(async () => {
      // Update results
      setScanResults(prev => ({
        ...prev,
        [currentStep]: newMetrics
      }));
      
      if (currentStep < 2) {
        // Move to the next step
        setCurrentStep(currentStep + 1);
        setIsVerifying(false);
      } else {
        // Complete verification
        setVerificationComplete(true);
        setIsVerifying(false);
          
        // Save verification status to localStorage
        const verificationStatus = {
          status: 'Verified',
          score: 95,
          lastVerified: new Date().toISOString(),          isFirstTimeUser: isFirstTimeUser
        };
        
        const updatedUserData = {
          ...userData,
          verificationStatus,
          // Preserve existing payment status if it exists
          ...(userData.paymentStatus && { paymentStatus: userData.paymentStatus }),
          // Preserve existing DID document if it exists
          ...(userData.didDocument && { didDocument: userData.didDocument })
        };
        
        // Track verification completion in Firebase
        if (userData && userData.userID) {
          await trackUserJourney(userData.userID, 'verification', {
            score: verificationStatus.score,
            timestamp: verificationStatus.lastVerified,
            steps: Object.keys(scanResults).length + 1,
            status: verificationStatus.status,
            isFirstTimeUser: isFirstTimeUser
          });
        }
          localStorage.setItem('zybl_user_data', JSON.stringify(updatedUserData));
        
        // Check if payment is already completed before redirecting
        const userId = userIdFromUrl || (userData && userData.userID);
        
        // If user has already paid, redirect to dashboard instead of payment
        if (userData.paymentStatus && userData.paymentStatus.status === 'paid') {
          console.log("Payment already completed, redirecting to dashboard");
          const dashboardUrl = userId ? `/dashboard?id=${userId}` : '/dashboard';
          setTimeout(() => {
            navigate(dashboardUrl);
          }, 3500);
        } else {
          // Redirect to payment page if payment not completed
          console.log("Payment not completed, redirecting to payment");
          const redirectUrl = userId ? `/payment?id=${userId}` : '/payment';
          setTimeout(() => {
            navigate(redirectUrl);
          }, 3500);
        }
      }    }, 2000);
  };

  if (!userData) {
    return (
      <div className="biometric-container">
        <div className="biometric-loading">
          <div className="loading-spinner"></div>
          <p>Loading verification...</p>
        </div>
      </div>
    );
  }

  const shortenedAddress = userData.shortenedAddress || 
    (userData.address ? `${userData.address.substring(0, 6)}...${userData.address.substring(userData.address.length - 4)}` : '');

  return (
    <div className="biometric-container">
      {/* Existing User Popup */}
      <VerificationPopup
        isOpen={showExistingUserPopup}
        onClose={handleVerifyAgain}
        existingFace={existingFaceData}
        onProceedToDashboard={handleProceedToDashboard}
      />
      
      <div className="verification-progress-bar">
        <div className="progress-steps">
          <div className="step active">Connect Wallet</div>
          <div className="step active current">Verify Identity</div>
          <div className="step">Complete Payment</div>
        </div>
      </div>
        <div className="biometric-card">
        {verificationComplete ? (
          <div className="verification-complete">
            <div className="success-animation">
              <div className="checkmark-circle">
                <SuccessIcon />
              </div>
            </div>
            <h2>Verification Complete</h2>
            <p>Your identity has been successfully verified. Zybl Passport is ready for activation.</p>
            
            <div className="verification-metrics">
              <div className="metric-details">
                <div className="detail-item">
                  <span className="detail-label">Verification Type</span>
                  <span className="detail-value">Biometric + Behavior</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expiration</span>
                  <span className="detail-value">30 days</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Wallet</span>
                  <span className="detail-value">{shortenedAddress}</span>
                </div>
              </div>
            </div>
            
            <div className="verification-redirect">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p>Proceeding to payment</p>
            </div>
          </div>
        ) : (
          <>
            <div className="biometric-header">
              <h1>Identity Verification</h1>
              <div className="step-counter">Step {currentStep + 1} of 3</div>
            </div>
            
            <div className="verification-steps-container">
              <div className="verification-steps-progress">
                {verificationSteps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`step-progress-item ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                  >
                    <div className="step-indicator">
                      {index < currentStep ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                          <path d="M17 9L11 15L7 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="step-content">
                      <span className="step-title">{step.title}</span>
                      {index < currentStep && scanResults[index] && (
                        <span className="step-status">Completed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="verification-step-content">
                <div className="step-header">
                  <div className="step-icon">
                    {verificationSteps[currentStep].icon}
                  </div>
                  <div className="step-info">
                    <h2>{verificationSteps[currentStep].title}</h2>
                    <p>{verificationSteps[currentStep].description}</p>
                  </div>
                </div>
                  {/* Step-specific UI components */}
                {currentStep === 0 && (
                  <div className="face-verification-content">
                    {!faceVerificationComplete ? (                      <FaceRecognition
                        walletAddress={userData?.address}
                        userId={userData?.userID}
                        onVerificationComplete={handleFaceVerificationComplete}
                        onExistingUserFound={handleExistingUserFound}
                        className="biometric-face-recognition"
                      />
                    ) : (
                      <div className="face-verification-success">
                        <div className="success-animation">
                          <div className="success-checkmark">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10" fill="#28a745"/>
                              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                        <h3>Face Verification Complete!</h3>
                        <p>Your biometric signature has been securely captured and stored.</p>
                        
                        {scanResults[0] && (
                          <div className="scan-results">
                            <div className="result-item">
                              <span className="result-label">Face Match</span>
                              <span className="result-value">{scanResults[0].faceMatch}</span>
                            </div>
                            <div className="result-item">
                              <span className="result-label">Liveness</span>
                              <span className={`result-value ${scanResults[0].liveness.toLowerCase()}`}>
                                {scanResults[0].liveness}
                              </span>
                            </div>
                            <div className="result-item">
                              <span className="result-label">Hash ID</span>
                              <span className="result-value">{scanResults[0].uniqueId}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!faceVerificationComplete && (
                      <div className="verification-tips">
                        <div className="tip-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Face the camera directly</span>
                        </div>
                        <div className="tip-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Ensure good lighting</span>
                        </div>
                        <div className="tip-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 16.5V17.5C8 18.0304 8.21071 18.5391 8.58579 18.9142C8.96086 19.2893 9.46957 19.5 10 19.5H19C19.5304 19.5 20.0391 19.2893 20.4142 18.9142C20.7893 18.5391 21 18.0304 21 17.5V6.5C21 5.96957 20.7893 5.46086 20.4142 5.08579C20.0391 4.71071 19.5304 4.5 19 4.5H10C9.46957 4.5 8.96086 4.71071 8.58579 5.08579C8.21071 5.46086 8 5.96957 8 6.5V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 12L3 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 9L3 12L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Remove glasses if possible</span>
                        </div>
                        <div className="tip-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 21H3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Follow the on-screen instructions</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {currentStep === 1 && (
                  <div className="device-fingerprint-content">
                    <div className="fingerprint-container">
                      <div className={`fingerprint-visualization ${isVerifying ? 'scanning' : ''}`}>
                        <div className="fingerprint-circle"></div>
                        <div className="fingerprint-lines">
                          {[...Array(20)].map((_, i) => (
                            <div key={i} className="fp-line" style={{ 
                              transform: `rotate(${i * 18}deg)`,
                              animationDelay: `${i * 0.1}s`
                            }}></div>
                          ))}
                        </div>
                        {isVerifying && <div className="scan-pulse"></div>}
                      </div>
                      
                      {scanResults[1] && (
                        <div className="scan-results fingerprint-results">
                          <div className="result-item">
                            <span className="result-label">Browser</span>
                            <span className="result-value">{scanResults[1].browserInfo}</span>
                          </div>
                          <div className="result-item">
                            <span className="result-label">Hardware</span>
                            <span className={`result-value ${scanResults[1].hardware.toLowerCase()}`}>
                              {scanResults[1].hardware}
                            </span>
                          </div>
                          <div className="result-item">
                            <span className="result-label">Risk</span>
                            <span className={`result-value risk-${scanResults[1].riskLevel.toLowerCase()}`}>
                              {scanResults[1].riskLevel}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="verification-explainer">
                      <h3>Device Fingerprinting</h3>
                      <p>This step creates a unique signature for your device without collecting any personal information, helping us ensure that only authorized devices can access your account.</p>
                    </div>
                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="behavior-analysis-content">
                    <div className="behavior-container">
                      <div className={`behavior-visualization ${isVerifying ? 'analyzing' : ''}`}>
                        <div className="behavior-grid">
                          {[...Array(36)].map((_, i) => {
                            const row = Math.floor(i / 6);
                            const col = i % 6;
                            return (
                              <div 
                                key={i} 
                                className="grid-cell"
                                style={{ 
                                  top: `${row * 20}%`, 
                                  left: `${col * 20}%`,
                                  animationDelay: `${(row + col) * 0.1}s`
                                }}
                              ></div>
                            );
                          })}
                        </div>
                        <div className="behavior-connections">
                          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path 
                              className="connection-path" 
                              d="M10,10 L50,50 L90,30 L70,90 L30,70 Z" 
                              stroke="rgba(0, 82, 255, 0.6)" 
                              strokeWidth="1" 
                              fill="none" 
                            />
                            <path 
                              className="connection-path" 
                              d="M20,80 L40,20 L80,50 L60,10" 
                              stroke="rgba(0, 240, 120, 0.5)" 
                              strokeWidth="1" 
                              fill="none" 
                            />
                          </svg>
                        </div>
                      </div>
                      
                      {scanResults[2] && (
                        <div className="scan-results behavior-results">
                          <div className="result-item">
                            <span className="result-label">Pattern</span>
                            <span className="result-value">{scanResults[2].patternMatch}%</span>
                          </div>
                          <div className="result-item">
                            <span className="result-label">Trust</span>
                            <span className="result-value">{scanResults[2].trustScore}/100</span>
                          </div>
                          <div className="result-item">
                            <span className="result-label">Auth</span>
                            <span className={`result-value ${scanResults[2].authStrength.toLowerCase()}`}>
                              {scanResults[2].authStrength}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="verification-explainer">
                      <h3>Behavior Analysis</h3>
                      <p>We analyze interaction patterns to establish that you're a real person and not an automated system. This step adds an additional layer of security to your verification.</p>
                    </div>
                  </div>
                )}
                  {/* Verification Button - only show for steps 1 and 2, or when face verification is complete */}
                {(currentStep > 0 || faceVerificationComplete) && (
                  <button 
                    className={`verification-button ${isVerifying ? 'verifying' : ''}`}
                    onClick={startVerification}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <span className="verifying-text">
                        Processing
                        <span className="dot-animation">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </span>
                      </span>
                    ) : (
                      <span>{scanResults[currentStep] ? 'Continue' : 'Start Verification'}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        
        <div className="verification-footer">
          <AuthIndicator address={shortenedAddress} />
          <div className="security-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10L11 15L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Secure Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricVerification;
