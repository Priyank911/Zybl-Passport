import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { shortenAddress } from '../utils/coinbaseAuthUtils';
import { getDashboardData, trackUserJourney, storeDIDDocument, storeVerificationStatus, updateUserSettings } from '../utils/firebaseConfig';
import { calculateZyblScore, recalculateZyblScore, getScoreImprovementTips } from '../utils/zyblScoreUtils';
import DIDCredentialCard from '../components/DIDCredentialCard';
import StatsCard, { StatsIcons } from '../components/StatsCard';
import WalletConnections from '../components/WalletConnections';
import PaymentHistory from '../components/PaymentHistory';
import Logo from '../assets/Logo.png';
import '../styles/Dashboard.css';
import '../styles/Dashboard-modern.css';
import '../styles/chain-indicators.css';
import '../styles/DIDCredential.css';
import '../styles/dashboard-did.css';
import '../styles/Settings.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Zybl Score state
  const [zyblScore, setZyblScore] = useState(0);
  const [zyblScoreBreakdown, setZyblScoreBreakdown] = useState({});
  const [scoreImprovementTips, setScoreImprovementTips] = useState([]);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userIdFromUrl, setUserIdFromUrl] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' });
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Add userId state to track the current user
  const [userId, setUserId] = useState(null);
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  useEffect(() => {
    // Parse the user ID from the URL if available
    // Format expected: /dashboard?id=user123
    const params = new URLSearchParams(location.search);
    const urlUserId = params.get('id');
    setUserIdFromUrl(urlUserId);
    
    // Check authentication from localStorage (just to get userID)
    const checkAuth = async () => {
      const storedData = localStorage.getItem('zybl_user_data');
      if (!storedData) {
        // Not authenticated, redirect to signin
        navigate('/signin');
        return;
      }
      
      try {
        const parsedData = JSON.parse(storedData);
        const currentUserId = urlUserId || parsedData.userID;
        setUserId(currentUserId); // Store userId in state
        
        if (!currentUserId) {
          setError("User ID not found. Please sign in again.");
          navigate('/signin');
          return;
        }
        
        // X402 Payment Verification - Check if payment is required
        if (parsedData.address && (!parsedData.paymentStatus || parsedData.paymentStatus.status !== 'paid')) {
          console.log("🔒 Payment verification required for dashboard access");
          console.log("💳 Payment not found in user data - redirecting to payment page");
          navigate(`/payment?id=${currentUserId}`);
          return;
        }
        
        console.log("✅ Payment status verified from user data");
        if (parsedData.paymentStatus) {
          console.log("💰 Payment details:", {
            status: parsedData.paymentStatus.status,
            transactionId: parsedData.paymentStatus.transactionId,
            amount: parsedData.paymentStatus.amount
          });
        }
        
        // If we have a user ID but URL doesn't have it, update the URL
        if (parsedData.userID && !urlUserId) {
          // Update URL without navigating (just add a query parameter)
          window.history.replaceState(null, '', `${location.pathname}?id=${parsedData.userID}`);
        }
        
        // Load all dashboard data from Firebase using the dashboard data service
        await loadDashboardData(currentUserId);
        
        // Track dashboard view in user journey
        try {
          await trackUserJourney(currentUserId, 'dashboard', {
            timestamp: new Date().toISOString(),
            referrer: document.referrer || 'direct',
            urlHasId: !!urlUserId
          });
        } catch (error) {
          console.error('Error tracking dashboard view:', error);
        }
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        localStorage.removeItem('zybl_user_data');
        navigate('/signin');
      }
    };
    
    checkAuth();
  }, [navigate, location.search]);
  // Load all dashboard data from Firebase
  const loadDashboardData = async (userId) => {
    setIsLoading(true);
    try {
      // Use the Firebase utility to get all dashboard data in one call
      const data = await getDashboardData(userId);
      
      // Check localStorage for additional data if needed
      const isDataMissing = !data.didDocument || 
                           !data.verificationStatus || 
                           data.verificationStatus.score === 0 ||
                           !data.payments || 
                           data.payments.length === 0;
      
      if (isDataMissing) {
        console.log("🔍 Checking localStorage for missing data");
        try {
          const storedData = localStorage.getItem('zybl_user_data');
          if (storedData) {
            const localData = JSON.parse(storedData);
            console.log("📋 Found data in localStorage:", localData);
            
            // If we don't have a DID document but localStorage does, use it
            if (!data.didDocument && localData.didDocument) {
              console.log("🆔 Using DID from localStorage");
              
              // Store the DID to Firebase if it only exists in localStorage
              storeDIDDocument(userId, localData.didDocument)
                .then(success => {
                  if (success) {
                    console.log("✅ Successfully stored DID from localStorage to Firebase");
                  }
                })
                .catch(error => {
                  console.error("Error storing DID to Firebase:", error);
                });
              
              data.didDocument = localData.didDocument;
            }
            
            // If verification score is 0 but localStorage has a better one, use it
            if ((!data.verificationStatus || data.verificationStatus.score === 0) && 
                localData.verificationStatus && 
                localData.verificationStatus.score > 0) {
              console.log("✅ Using verification status from localStorage");
              
              // Store the verification status to Firebase
              storeVerificationStatus(userId, localData.verificationStatus)
                .then(success => {
                  if (success) {
                    console.log("✅ Successfully stored verification status from localStorage to Firebase");
                  }
                })
                .catch(error => {
                  console.error("Error storing verification status to Firebase:", error);
                });
              
              data.verificationStatus = localData.verificationStatus;
            }
            
            // If we have a payment in localStorage but not from Firebase
            if ((!data.payments || data.payments.length === 0) && localData.paymentStatus) {
              console.log("💰 Using payment data from localStorage");
              data.payments = [{
                id: 'local-payment',
                userID: data.userData.userID,
                amount: localData.paymentStatus.amount || '49.99',
                currency: localData.paymentStatus.currency || 'USDC',
                status: localData.paymentStatus.status || 'Completed',
                timestamp: new Date(localData.paymentStatus.timestamp || new Date()),
                transactionId: localData.paymentStatus.transactionId
              }];
            }
          }
        } catch (error) {
          console.error("Error checking localStorage for data:", error);
        }
      }
      
      setDashboardData(data);
      
      // Calculate dynamic Zybl Score after data is loaded
      await calculateAndUpdateZyblScore(userId, data);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh or try again later.');
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('zybl_user_data');
    navigate('/signin');
  };
  // Settings handlers
  useEffect(() => {
    if (dashboardData?.userSettings) {
      setSettings(dashboardData.userSettings);
      
      // Initialize profile form with existing data if available
      if (dashboardData.userSettings.profile) {
        setProfileForm({
          firstName: dashboardData.userSettings.profile.firstName || '',
          lastName: dashboardData.userSettings.profile.lastName || '',
          email: dashboardData.userSettings.profile.email || ''
        });
      }
    }
  }, [dashboardData]);

  const handleSwitchChange = (section, setting) => {
    if (!settings) return;
    
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings };
      newSettings[section][setting] = !newSettings[section][setting];
      return newSettings;
    });
    
    // Provide instant feedback that the setting was changed (but not saved)
    setSettingsMessage({ text: 'Setting changed. Click "Save Changes" to save.', type: 'info' });
    setTimeout(() => {
      if (settingsMessage.type === 'info') {
        setSettingsMessage({ text: '', type: '' });
      }
    }, 3000);
  };  const saveSettings = async () => {
    if (!settings || !dashboardData?.userData?.userID) return;
    
    setIsSavingSettings(true);
    setSettingsMessage({ text: 'Saving settings...', type: 'info' });
    
    try {
      // Include profile information in the settings update
      const updatedSettings = {
        ...settings,
        profile: {
          ...settings.profile,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          lastUpdated: new Date()
        },
        lastUpdated: new Date()
      };
      
      const success = await updateUserSettings(dashboardData.userData.userID, updatedSettings);
      
      if (success) {
        setSettings(updatedSettings); // Update local state with new settings
        setSettingsMessage({ text: 'Settings saved successfully', type: 'success' });
        setTimeout(() => setSettingsMessage({ text: '', type: '' }), 3000);
      } else {
        setSettingsMessage({ text: 'Failed to save settings. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettingsMessage({ text: 'An error occurred while saving settings', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };const handleDangerAction = async (action) => {
    if (!dashboardData?.userData?.userID) return;
    
    switch (action) {
      case 'resetVerification':
        if (window.confirm('Are you sure you want to reset your verification status? This action cannot be undone.')) {
          try {
            setSettingsMessage({ text: 'Resetting verification status...', type: 'info' });
            
            await updateUserSettings(dashboardData.userData.userID, {
              ...settings,
              verificationReset: true,
              verificationResetDate: new Date()
            });
            
            setSettingsMessage({ text: 'Verification status has been reset. Reloading dashboard...', type: 'success' });
            
            // Reload the dashboard data after a short delay
            setTimeout(() => window.location.reload(), 2000);
          } catch (error) {
            console.error('Error resetting verification:', error);
            setSettingsMessage({ text: 'Failed to reset verification status: ' + error.message, type: 'error' });
          }
        }
        break;
        
      case 'disconnectWallet':
        if (window.confirm('Are you sure you want to disconnect your wallet? You will need to sign in again with your wallet to access your Zybl Passport.')) {
          setSettingsMessage({ text: 'Disconnecting wallet...', type: 'info' });
          
          // Small delay to show the message before navigating
          setTimeout(() => {
            localStorage.removeItem('zybl_user_data');
            navigate('/signin');
          }, 1000);
        }
        break;
        
      case 'deleteAccount':
        // Two-step confirmation for account deletion
        if (window.confirm('WARNING: This action will permanently delete all your account data. This cannot be undone.')) {
          if (window.confirm('Are you ABSOLUTELY SURE? This will delete all your verification status, DID credentials, and account data.')) {
            try {
              setSettingsMessage({ text: 'Deleting account data...', type: 'info' });
              
              await updateUserSettings(dashboardData.userData.userID, {
                ...settings,
                accountDeleted: true,
                deletedAt: new Date()
              });
              
              setSettingsMessage({ text: 'Account marked for deletion. Logging out...', type: 'success' });
              
              setTimeout(() => {
                localStorage.removeItem('zybl_user_data');
                navigate('/signin');
              }, 2000);
            } catch (error) {
              console.error('Error deleting account:', error);
              setSettingsMessage({ text: 'Failed to delete account data: ' + error.message, type: 'error' });
            }
          }
        }
        break;
        
      default:
        break;
    }
  };
  // Calculate and update Zybl Score
  const calculateAndUpdateZyblScore = async (userId, dashboardData) => {
    try {
      setIsCalculatingScore(true);
      console.log('🧮 Calculating Zybl Score for user:', userId);
      console.log('📊 Dashboard data for score calculation:', dashboardData);
      
      // Prepare user profile data - combining from multiple sources
      const userProfile = {
        // Check verification data from multiple possible locations
        verificationData: dashboardData?.verificationStatus || dashboardData?.verificationData,
        verificationStatus: dashboardData?.verificationStatus,
        biometricVerified: dashboardData?.verificationStatus?.biometricCompleted || 
                          dashboardData?.verificationData?.status === "Verified" ||
                          dashboardData?.verificationStatus?.status === "Verified",
        biometricCompleted: dashboardData?.verificationStatus?.biometricCompleted ||
                           dashboardData?.verificationData?.status === "Verified" ||
                           dashboardData?.verificationStatus?.status === "Verified",
        // Profile information
        firstName: dashboardData?.profile?.firstName || dashboardData?.firstName || dashboardData?.userSettings?.profile?.firstName || '',
        lastName: dashboardData?.profile?.lastName || dashboardData?.lastName || dashboardData?.userSettings?.profile?.lastName || '',
        email: dashboardData?.profile?.email || dashboardData?.email || dashboardData?.userSettings?.profile?.email || userId,
        bio: dashboardData?.profile?.bio || dashboardData?.bio || '',
        createdAt: dashboardData?.profile?.createdAt || dashboardData?.createdAt || null,
        socialVerified: dashboardData?.profile?.socialVerified || false,
        // Wallet connections
        connectedWallets: dashboardData?.connections || dashboardData?.connectedWallets || dashboardData?.walletConnections || []
      };
      
      // Get connections data from multiple possible sources
      const connections = dashboardData?.connections || 
                         dashboardData?.connectedWallets || 
                         dashboardData?.walletConnections || 
                         [];
      
      console.log('🔍 Prepared data for score calculation:', {
        userProfile: userProfile,
        connections: connections,
        hasVerificationData: !!userProfile.verificationData,
        hasConnections: connections.length > 0
      });
      
      // Calculate the score
      const scoreResult = await calculateZyblScore(userId, userProfile, connections);
      
      // Update state with new score
      setZyblScore(scoreResult.totalScore);
      setZyblScoreBreakdown(scoreResult.scoreBreakdown);
      
      // Generate improvement tips
      const tips = getScoreImprovementTips(scoreResult.scoreBreakdown);
      setScoreImprovementTips(tips);
      
      console.log('✅ Zybl Score calculated:', {
        score: scoreResult.totalScore,
        breakdown: scoreResult.scoreBreakdown,
        tips: tips.length
      });
      
    } catch (error) {
      console.error('Error calculating Zybl Score:', error);
    } finally {
      setIsCalculatingScore(false);
    }
  };

  // Recalculate score when connections change
  const handleScoreRecalculation = async (action = 'connection_change') => {
    if (userId) {
      await recalculateZyblScore(userId, action);
      // Reload dashboard data to get updated score
      await loadDashboardData(userId);
    }
  };

  // If still loading, show loading indicator
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If error occurred, show error message
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            className="dashboard-button primary"
            onClick={() => navigate('/signin')}
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }
    // If no data loaded, show authentication required
  if (!dashboardData || !dashboardData.userData) {
    return (      <div className="dashboard-container">
        <div className="dashboard-error">
          <h2>Authentication Required</h2>
          <p>Please sign in to access your dashboard.</p>
          <button 
            className="dashboard-button primary"
            onClick={() => navigate('/signin')}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }  // Extract all necessary data from the dashboardData object with safer destructuring
  // Use empty objects/arrays as fallbacks to prevent null reference errors
  const userData = dashboardData?.userData || {};
  const verificationStatus = dashboardData?.verificationStatus || { score: 0, status: 'Unverified' };
  const didDocument = dashboardData?.didDocument || null;
  const payments = dashboardData?.payments || [];
  const walletConnections = dashboardData?.walletConnections || [];
  const userSettings = dashboardData?.userSettings || {
    notifications: {
      emailNotifications: true,
      securityAlerts: true,
      shareAnonymizedData: true
    },
    walletPreferences: {
      defaultNetwork: 'ethereum',
      autoConnectWallet: true
    }
  };
  
  // We'll move the localStorage check to the loadDashboardData function to avoid conditional hooks
  
  // Format some data for display with fallbacks for missing data
  const walletAddress = userData?.walletAddress || userData?.address || "0x0000000000000000000000000000000000000000";
  const shortenedAddress = userData?.shortenedAddress || shortenAddress(walletAddress);
  const chainId = userData?.chainId || 1; // Default to Ethereum Mainnet
  const verificationScore = verificationStatus?.score || 0;
  const lastVerified = verificationStatus?.lastVerified ? 
    new Date(verificationStatus.lastVerified).toLocaleDateString() : 
    'Not verified';
  const lastSignIn = userData?.lastActive ? 
    new Date(userData.lastActive).toLocaleString() : 
    new Date().toLocaleString();
    return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-logo">
          <img src={Logo} alt="Zybl Logo" />
          <span>Zybl Passport</span>
        </div>
        
        <nav className="dashboard-nav">
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </a>          <a 
            href="#" 
            className={`nav-item ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Verification
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.58984 13.5098L15.4198 17.4898" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4098 6.50977L8.58984 10.4898" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Connections
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Payment History
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Settings
          </a>
        </nav>
        
        <div className="dashboard-user">
          <div className="user-wallet">
            <div className="coinbase-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
              </svg>
            </div>
            <div className="user-info">
              <span className="user-address">{shortenedAddress}</span>
              <span className="connection-info">Connected with Coinbase Wallet</span>
            </div>
          </div>
          <button 
            className="signout-button"
            onClick={handleSignOut}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">        <div className="dashboard-header">
          <h1>
            {settings?.profile?.firstName 
              ? `Welcome, ${settings.profile.firstName}!` 
              : 'Welcome to Zybl Passport'}
          </h1>
          <p>
            {settings?.profile?.email 
              ? settings.profile.email 
              : 'Your secure gateway to Zybl-resistant applications'}
          </p>
        </div>

        {activeTab === 'dashboard' && (
          <div className="dashboard-main modern">
            <div className="dashboard-grid">
              <div className="dashboard-column main-column">
                {/* Stats Cards Row */}                <div className="stats-cards-container">
                  <StatsCard 
                    title="Verification Score" 
                    value={`${verificationScore}%`} 
                    icon={StatsIcons.verification} 
                    color="green" 
                  />
                  <StatsCard 
                    title="Total Payments" 
                    value={payments ? payments.length : 0} 
                    icon={StatsIcons.payments} 
                    color="blue" 
                  />
                  <StatsCard 
                    title="Last Verified" 
                    value={lastVerified}
                    icon={StatsIcons.activity} 
                    color="purple" 
                  />
                </div>
                
                {/* DID Credential Card */}                <div className="dashboard-card modern-card did-credential-container">
                  <div className="card-header">
                    <h2>Your DID Credential</h2>
                  </div>
                  <div className="card-content">
                    {didDocument ? (
                      <DIDCredentialCard didDocument={didDocument} size="large" showActions={true} currentZyblScore={zyblScore} />
                    ) : (
                      <div className="no-did-message">
                        <p>DID credential not found. Please complete verification and payment to obtain your DID.</p>
                        <button 
                          className="dashboard-button primary"
                          onClick={() => navigate('/payment')}
                        >
                          Complete Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Wallet Card */}
                <div className="dashboard-card wallet-card modern-card">
                  <div className="card-header">
                    <h2>Your Wallet</h2>
                  </div>
                  <div className="card-content">
                    <div className="wallet-details">
                      <div className="wallet-detail">
                        <span className="detail-label">Address</span>
                        <span className="detail-value">{walletAddress}</span>
                      </div>
                      <div className="wallet-detail">
                        <span className="detail-label">Connected With</span>
                        <div className="detail-value with-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                            <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                          </svg>
                          Coinbase Wallet
                        </div>
                      </div>
                      <div className="wallet-detail">
                        <span className="detail-label">Network</span>
                        <span className="detail-value chain-badge">
                          {chainId === 1 ? 'Ethereum Mainnet' : 
                           chainId === 137 ? 'Polygon Mainnet' : 
                           chainId === 84531 ? 'Base Sepolia' : 
                           `Chain ID: ${chainId}`}
                        </span>
                      </div>
                      <div className="wallet-detail">
                        <span className="detail-label">Last Connected</span>
                        <span className="detail-value">{lastSignIn}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Payments Card */}
                <div className="dashboard-card payments-card modern-card">
                  <div className="card-header">
                    <h2>Payment History</h2>
                  </div>
                  <div className="card-content">                    {Array.isArray(payments) ? (
                      payments.length > 0 ? (
                        <div className="payment-history">
                          <table className="payment-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.map((payment, index) => (
                                <tr key={payment.id || index}>
                                  <td>{payment.timestamp ? new Date(payment.timestamp).toLocaleDateString() : 'Unknown'}</td>
                                  <td>{payment.amount} {payment.currency}</td>
                                  <td>{payment.type || 'Subscription'}</td>
                                  <td>
                                    <span className={`payment-status ${payment.status?.toLowerCase() || 'completed'}`}>
                                      {payment.status || 'Completed'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty-state">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3V9L16 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5.75 13C5.75 16.45 8.55 19.25 12 19.25C15.45 19.25 18.25 16.45 18.25 13C18.25 9.55 15.45 6.75 12 6.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <p>No payment history found</p>
                          <button 
                            className="dashboard-button primary"
                            onClick={() => navigate('/payment')}
                          >
                            Make a Payment
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="loading-data">
                        <div className="loading-spinner small"></div>
                        <p>Loading payment history...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right sidebar column */}              <div className="dashboard-column side-column">
                {/* User Profile Card */}
                <div className="dashboard-card profile-card modern-card">
                  <div className="card-header">
                    <h2>User Profile</h2>
                  </div>
                  <div className="card-content">
                    <div className={`profile-card-content ${isProfileExpanded ? 'expanded' : ''}`}>
                      <div className="profile-header" onClick={() => setIsProfileExpanded(!isProfileExpanded)}>
                        <div className="profile-avatar">
                          {settings?.profile?.firstName ? settings.profile.firstName.charAt(0).toUpperCase() : shortenedAddress.charAt(0).toUpperCase()}
                        </div>
                        <div className="profile-info">
                          <div className="profile-name">
                            {settings?.profile?.firstName 
                              ? `${settings.profile.firstName} ${settings.profile.lastName || ''}`.trim() 
                              : shortenedAddress}
                          </div>
                          <div className="profile-email">{settings?.profile?.email || 'No email set'}</div>
                        </div>
                        <div className="profile-expand-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d={isProfileExpanded ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"} 
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      
                      <div className="profile-details">
                        <div className="profile-detail-item">
                          <span className="detail-label">User ID</span>
                          <span className="detail-value user-id">{userData.userID}</span>
                        </div>
                        <div className="profile-detail-item">
                          <span className="detail-label">Verification Score</span>
                          <span className="detail-value score">{verificationScore}%</span>
                        </div>
                        <div className="profile-detail-item">
                          <span className="detail-label">Member Since</span>
                          <span className="detail-value">
                            {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                        <div className="profile-actions">
                          <button 
                            className="profile-action-button"
                            onClick={() => setActiveTab('settings')}
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Activity Feed */}
                <div className="dashboard-card activity-card modern-card">
                  <div className="card-header">
                    <h2>Verification History</h2>
                  </div>                  <div className="card-content">
                    {dashboardData?.journeyData ? (
                      <div className="feed-content">
                        <div className="feed-items">
                          {/* Display verification-related events from the user journey */}
                          {dashboardData.journeyData.verificationCompleted && (
                            <div className="feed-item verification">
                              <div className="activity-icon verification">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <div className="activity-content">
                                <div className="activity-header">
                                  <h4>Wallet Verification</h4>
                                  <span className="activity-time">
                                    {dashboardData.journeyData.verificationCompletedAt ? 
                                      new Date(dashboardData.journeyData.verificationCompletedAt).toLocaleDateString() :
                                      'recently'}
                                  </span>
                                </div>
                                <p className="activity-description">Successfully verified wallet ownership through message signing</p>
                              </div>
                            </div>
                          )}
                          
                          {dashboardData.journeyData.paymentCompleted && (
                            <div className="feed-item payment">
                              <div className="activity-icon payment">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <div className="activity-content">
                                <div className="activity-header">
                                  <h4>Payment Completed</h4>
                                  <span className="activity-time">
                                    {dashboardData.journeyData.paymentCompletedAt ? 
                                      new Date(dashboardData.journeyData.paymentCompletedAt).toLocaleDateString() :
                                      'recently'}
                                  </span>
                                </div>
                                <p className="activity-description">
                                  Successfully completed payment and generated DID
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {dashboardData.journeyData.signinCompleted && (
                            <div className="feed-item login">
                              <div className="activity-icon login">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M21 8V6C21 5.46957 20.7893 4.96086 20.4142 4.58579C20.0391 4.21071 19.5304 4 19 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H19C19.5304 20 20.0391 19.7893 20.4142 19.4142C20.7893 19.0391 21 18.5304 21 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <div className="activity-content">
                                <div className="activity-header">
                                  <h4>Account Login</h4>
                                  <span className="activity-time">
                                    {dashboardData.journeyData.signinCompletedAt ? 
                                      new Date(dashboardData.journeyData.signinCompletedAt).toLocaleDateString() :
                                      'recently'}
                                  </span>
                                </div>
                                <p className="activity-description">Successfully authenticated with wallet</p>
                              </div>
                            </div>
                          )}
                          
                          {/* If no journey events found, show default message */}
                          {!dashboardData.journeyData.verificationCompleted && 
                           !dashboardData.journeyData.paymentCompleted && 
                           !dashboardData.journeyData.signinCompleted && (
                            <div className="empty-state">
                              <p>No verification history found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>No verification history available</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Verification Status Card */}
                <div className="dashboard-card verification-card modern-card">
                  <div className="card-header">
                    <h2>Verification Status</h2>
                  </div>
                  <div className="card-content">
                    <div className="verification-status">
                      <div className="status-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{verificationStatus?.status || 'Not Verified'}</span>
                      </div>
                      <div className="verification-details">
                        <div className="detail-item">
                          <span className="detail-label">Last Verified</span>
                          <span className="detail-value">{lastVerified}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Verification Level</span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${verificationScore}%`}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'verification' && (
          <div className="dashboard-main modern">
            <div className="dashboard-card full-width modern-card">
              <div className="card-header">
                <h2>Your Verification Status</h2>
              </div>
              <div className="card-content verification-tab">
                <div className="verification-tab-content">
                  {/* Main verification status display */}
                  <div className="verification-status-detail">
                    <div className="verification-score-circle" style={{ '--score': `${zyblScore}%` }}>
                      <div className="score-value">
                        {isCalculatingScore ? (
                          <div className="loading-spinner small"></div>
                        ) : (
                          `${zyblScore}%`
                        )}
                      </div>
                      <div className="score-label">Zybl<br/>Score</div>
                    </div>
                    
                    <div className="verification-details-list">
                      <div className="verification-detail-item">
                        <div className="detail-label">Status</div>
                        <div className="detail-value status">
                          <span className={`status-badge ${verificationStatus?.status?.toLowerCase() || 'unverified'}`}>
                            {verificationStatus?.status || 'Not Verified'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="verification-detail-item">
                        <div className="detail-label">Last Verified</div>
                        <div className="detail-value">{lastVerified}</div>
                      </div>
                      
                      <div className="verification-detail-item">
                        <div className="detail-label">DID Status</div>
                        <div className="detail-value">
                          <span className={`status-badge ${didDocument ? 'verified' : 'unverified'}`}>
                            {didDocument ? 'Active' : 'Not Created'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="verification-detail-item">
                        <div className="detail-label">Actions</div>
                        <div className="detail-value">
                          <button 
                            className="verification-action-button"
                            onClick={() => {
                              console.log('🔄 Manual score recalculation triggered');
                              console.log('📊 Current dashboard data:', dashboardData);
                              handleScoreRecalculation('manual_refresh');
                            }}
                            disabled={isCalculatingScore}
                          >
                            {isCalculatingScore ? 'Calculating...' : 'Refresh Score'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Zybl Score Breakdown */}
                    <div className="score-breakdown-section">
                      <h4>Score Breakdown</h4>
                      <div className="score-breakdown-list">
                        {Object.entries(zyblScoreBreakdown)
                          .filter(([key, value]) => value > 0) // Only show items with scores > 0
                          .map(([key, value]) => (
                          <div key={key} className="score-breakdown-item">
                            <div className="breakdown-label">
                              {key === 'bioAuth' && 'Biometric Verification'}
                              {key === 'emailSaved' && 'Email Saved'}
                              {key === 'metamaskConnections' && 'MetaMask Connections'}
                              {key === 'coinbaseConnections' && 'Coinbase Connections'}
                              {key === 'profileCompletion' && 'Profile Completion'}
                              {key === 'walletDiversity' && 'Wallet Diversity'}
                              {key === 'longTermUser' && 'Long-term User'}
                              {key === 'multiChain' && 'Multi-chain Support'}
                              {key === 'socialVerification' && 'Social Verification'}
                            </div>
                            <div className="breakdown-value">
                              +{value}%
                            </div>
                            <div className="breakdown-status">
                              ✅
                            </div>
                          </div>
                        ))}
                        
                        {/* Show a message if no scores are earned yet */}
                        {Object.values(zyblScoreBreakdown).every(value => value === 0) && (
                          <div className="no-scores-message">
                            <p>Complete verification steps to start earning score points</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Score Improvement Tips */}
                    {scoreImprovementTips.length > 0 && (
                      <div className="score-improvement-section">
                        <h4>Improve Your Score</h4>
                        <div className="improvement-tips-list">
                          {scoreImprovementTips.slice(0, 3).map((tip, index) => (
                            <div key={index} className="improvement-tip">
                              <div className="tip-points">+{tip.points}%</div>
                              <div className="tip-content">
                                <div className="tip-action">{tip.action}</div>
                                <div className="tip-description">{tip.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                    {/* DID Credential Card */}
                  <div className="verification-did-container">
                    <h3>Your DID Credential</h3>
                    {didDocument ? (
                      <DIDCredentialCard didDocument={didDocument} size="large" showActions={true} currentZyblScore={zyblScore} />
                    ) : (
                      <div className="no-did-message">
                        <p>DID credential not found. Complete verification and payment to obtain your DID.</p>
                        <button 
                          className="dashboard-button primary"
                          onClick={() => navigate('/payment')}
                        >
                          Complete Payment
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Verification Methods */}
                  <div className="verification-methods-list">
                    <h3>Verification Methods</h3>
                    <div className="verification-methods">
                      <div className="verification-method">
                        <div className="method-icon coinbase-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                            <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                          </svg>
                        </div>
                        <div className="method-details">
                          <div className="method-name">Coinbase Wallet Authentication</div>
                          <div className="method-status verified">Verified</div>
                          <div className="method-description">Your wallet has been verified through secure message signing</div>
                        </div>
                        <button className="method-button">Renew</button>
                      </div>
                      
                      <div className="verification-method">
                        <div className="method-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#2ECE7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M22 4L12 14.01L9 11.01" stroke="#2ECE7D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="method-details">
                          <div className="method-name">Biometric Verification</div>
                          <div className="method-status verified">Verified</div>
                          <div className="method-description">Your biometric verification is active and up to date</div>
                        </div>
                        <button className="method-button">Manage</button>
                      </div>
                      
                      <div className="verification-method">
                        <div className="method-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B'}}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 9H9V15H15V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="method-details">
                          <div className="method-name">Two-Factor Authentication</div>
                          <div className="method-status" style={{background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B'}}>Optional</div>
                          <div className="method-description">Add an extra layer of security with 2FA</div>
                        </div>
                        <button className="method-button">Setup</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'connections' && (
          <div className="dashboard-main modern">
            <div className="connections-page">
              <div className="dashboard-card modern-card">
                <div className="card-header">
                  <h2>Universal Identity Connections</h2>
                  <p className="card-subtitle">Connect multiple accounts to build your cross-chain identity</p>
                </div>
                <div className="card-content">                  <WalletConnections 
                    mainDID={didDocument?.id || "Not Available"} 
                    mainAddress={walletAddress}
                    userEmail={userId}
                    onConnectionChange={handleScoreRecalculation}
                    onConnectWallet={(walletType) => {
                      // In production this would be a real wallet connection
                      // For demo we'll simulate it
                      return new Promise((resolve, reject) => {
                        setTimeout(() => {
                          try {
                            // Generate a mock wallet address
                            const prefix = walletType === 'metamask' ? '0x' : 'cb';
                            const mockAddress = prefix + Math.random().toString(16).substring(2, 14) + Math.random().toString(16).substring(2, 14);
                            
                            // Create connection object
                            const connection = {
                              address: mockAddress,
                              walletType: walletType,
                              connectedAt: new Date().toISOString(),
                              chainId: walletType === 'metamask' ? '0x1' : '1'
                            };
                            
                            // Update dashboardData to include the new connection
                            if (setDashboardData) {
                              setDashboardData(prev => ({
                                ...prev,
                                walletConnections: [...(prev.walletConnections || []), connection]
                              }));
                            }
                            
                            // Trigger score recalculation after wallet connection
                            setTimeout(() => {
                              handleScoreRecalculation(`${walletType}_connection`);
                            }, 500);
                            
                            resolve(connection);
                          } catch (error) {
                            console.error("Error in wallet connection:", error);
                            reject(new Error("Failed to connect wallet"));
                          }
                        }, 1500);
                      });
                    }}
                    storedConnections={dashboardData?.walletConnections || []}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="dashboard-main modern">
            <div className="settings-page">
              {settingsMessage.text && (
                <div className={`settings-message ${settingsMessage.type}`}>
                  {settingsMessage.text}
                </div>
              )}
              
              <div className="settings-grid">
                <div className="dashboard-column main-column">
                  <div className="dashboard-card modern-card settings-card">
                    <div className="card-header">
                      <h2>Account Settings</h2>
                      <button 
                        className="dashboard-button primary small"
                        onClick={saveSettings}
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                    <div className="card-content">
                      <div className="settings-group">
                        <h3>Profile Information</h3>
                        
                        <div className="form-group">
                          <label htmlFor="firstName">First Name</label>
                          <input 
                            type="text" 
                            id="firstName" 
                            name="firstName" 
                            value={profileForm.firstName} 
                            onChange={handleProfileChange}
                            className="settings-input"
                            placeholder="Enter your first name"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="lastName">Last Name</label>
                          <input 
                            type="text" 
                            id="lastName" 
                            name="lastName" 
                            value={profileForm.lastName} 
                            onChange={handleProfileChange}
                            className="settings-input"
                            placeholder="Enter your last name"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="email">Email</label>
                          <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={profileForm.email} 
                            onChange={handleProfileChange}
                            className="settings-input"
                            placeholder="Enter your email address"
                          />
                        </div>
                        
                        <div className="form-actions">
                          <button 
                            className="dashboard-button primary"
                            onClick={saveSettings}
                            disabled={isSavingSettings}
                          >
                            {isSavingSettings ? 'Saving...' : 'Save Profile'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="settings-group">
                        <h3>Notification Preferences</h3>
                        
                        <div className="switch-setting">
                          <div className="switch-info">
                            <div className="switch-label">Email Notifications</div>
                            <div className="switch-description">Receive email notifications for account activity and updates</div>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={settings?.notifications?.emailNotifications} 
                              onChange={() => handleSwitchChange('notifications', 'emailNotifications')}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        
                        <div className="switch-setting">
                          <div className="switch-info">
                            <div className="switch-label">Security Alerts</div>
                            <div className="switch-description">Get notified about important security events and authorization attempts</div>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={settings?.notifications?.securityAlerts}
                              onChange={() => handleSwitchChange('notifications', 'securityAlerts')}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        
                        <div className="switch-setting">
                          <div className="switch-info">
                            <div className="switch-label">Share anonymized data for platform improvement</div>
                            <div className="switch-description">Help us improve by sharing anonymous usage statistics and crash reports</div>
                          </div>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={settings?.notifications?.shareAnonymizedData}
                              onChange={() => handleSwitchChange('notifications', 'shareAnonymizedData')}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="dashboard-column side-column">
                  <div className="dashboard-card modern-card settings-card">
                    <div className="card-header">
                      <h2>Wallet Settings</h2>
                    </div>
                    <div className="card-content">
                      <div className="connected-wallet">
                        <div className="wallet-icon coinbase-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                            <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                          </svg>
                        </div>
                        <div className="wallet-details">
                          <div className="wallet-name">Coinbase Wallet</div>
                          <div className="wallet-address">{walletAddress}</div>
                          <div className="connection-details">
                            <span>Connected {lastSignIn}</span>
                            <span className="chain-name">
                              {chainId === 1 ? 'Ethereum Mainnet' : 
                               chainId === 137 ? 'Polygon Mainnet' : 
                               chainId === 84531 ? 'Base Sepolia' : 
                               `Chain ID: ${chainId}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="wallet-actions">
                        <button 
                          className="wallet-action-button"
                          onClick={() => {
                            handleSwitchChange('walletPreferences', 'autoConnectWallet');
                            // Apply this change immediately
                            if (settings?.walletPreferences) {
                              saveSettings();
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M20.49 9C19.2214 6.52323 16.9593 4.7266 14.225 4.14178C11.4907 3.55695 8.64975 4.23442 6.39344 5.90385C4.13713 7.57328 2.70656 10.0749 2.43787 12.8334C2.16918 15.5919 3.09436 18.3381 4.95 20.39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19.05 3.61001L23 4.00001L22.3 7.80001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M4.95 20.39L1 20L1.7 16.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {settings?.walletPreferences?.autoConnectWallet ? 'Auto-Connect Enabled' : 'Auto-Connect Disabled'}
                        </button>
                        
                        <button 
                          className="wallet-action-button"
                          onClick={() => {
                            // This would typically open a network selector dialog
                            alert('Network management will be available in a future update.');
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Manage Networks
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dashboard-card modern-card danger-zone-card">
                    <div className="card-header">
                      <h2>Danger Zone</h2>
                    </div>
                    <div className="card-content">
                      <div className="danger-zone">
                        <div className="danger-action">
                          <div className="danger-info">
                            <h4>Reset Verification Status</h4>
                            <p>Clear all verification data and start the verification process again</p>
                          </div>
                          <button 
                            className="danger-button"
                            onClick={() => handleDangerAction('resetVerification')}
                          >
                            Reset
                          </button>
                        </div>
                        
                        <div className="danger-action">
                          <div className="danger-info">
                            <h4>Disconnect Wallet</h4>
                            <p>Remove your wallet connection and log out from Zybl Passport</p>
                          </div>
                          <button 
                            className="danger-button"
                            onClick={() => handleDangerAction('disconnectWallet')}
                          >
                            Disconnect
                          </button>
                        </div>
                        
                        <div className="danger-action">
                          <div className="danger-info">
                            <h4>Delete Account Data</h4>
                            <p>Permanently delete your account data from Zybl Passport</p>
                          </div>
                          <button 
                            className="danger-button"
                            onClick={() => handleDangerAction('deleteAccount')}
                          >
                            Delete
                          </button>
                        </div>
                      </div>                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;