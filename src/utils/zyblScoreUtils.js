import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Zybl Score calculation system
export const SCORE_WEIGHTS = {
  BIO_AUTH_COMPLETE: 10, // 10% for completing biometric verification
  EMAIL_SAVED: 2,        // 2% for having email in profile
  METAMASK_CONNECTION: 3, // 3% for each MetaMask connection
  COINBASE_CONNECTION: 3, // 3% for each Coinbase connection
  PROFILE_COMPLETION: 5,  // 5% for complete profile
  WALLET_DIVERSITY: 5,    // 5% bonus for having multiple wallet types
  LONG_TERM_USER: 10,     // 10% bonus for users active > 30 days
  TRANSACTION_HISTORY: 8, // 8% for wallets with transaction history
  MULTI_CHAIN: 7,        // 7% for multi-chain connections
  SOCIAL_VERIFICATION: 12 // 12% for social media verification (future)
};

/**
 * Calculate dynamic Zybl Score based on user profile and connections
 * @param {string} userEmail - User's email
 * @param {Object} userProfile - User profile data from Firebase
 * @param {Array} connections - User's wallet connections
 * @returns {Promise<Object>} Score breakdown and total
 */
export const calculateZyblScore = async (userEmail, userProfile = null, connections = []) => {
  try {
    let scoreBreakdown = {
      bioAuth: 0,
      emailSaved: 0,
      metamaskConnections: 0,
      coinbaseConnections: 0,
      profileCompletion: 0,
      walletDiversity: 0,
      longTermUser: 0,
      transactionHistory: 0,
      multiChain: 0,
      socialVerification: 0
    };

    let totalScore = 0;

    // Get user profile if not provided
    if (!userProfile && userEmail) {
      const userRef = doc(db, 'users', userEmail);
      const userSnap = await getDoc(userRef);
      userProfile = userSnap.exists() ? userSnap.data() : {};
    }

    console.log('🧮 Calculating score with data:', {
      userProfile: userProfile,
      connections: connections,
      userEmail: userEmail
    });

    // 1. Biometric Authentication Complete (10%)
    // Check for verificationData.status === "Verified" OR verificationStatus.status === "Verified"
    const isVerified = userProfile?.verificationData?.status === "Verified" || 
                      userProfile?.verificationStatus?.status === "Verified" ||
                      userProfile?.biometricVerified === true || 
                      userProfile?.biometricCompleted === true;
    
    if (isVerified) {
      scoreBreakdown.bioAuth = SCORE_WEIGHTS.BIO_AUTH_COMPLETE;
      totalScore += SCORE_WEIGHTS.BIO_AUTH_COMPLETE;
      console.log('✅ Bio auth verified (+10%)');
    }

    // 2. Email Saved in Profile (2%)
    if (userProfile?.email || userEmail) {
      scoreBreakdown.emailSaved = SCORE_WEIGHTS.EMAIL_SAVED;
      totalScore += SCORE_WEIGHTS.EMAIL_SAVED;
      console.log('✅ Email saved (+2%)');
    }    // 3. Profile Completion (5%) - Check for firstName, lastName, email in profile object
    // Check both root level and nested profile object
    const hasFirstName = (userProfile?.firstName && userProfile.firstName.trim().length > 0) ||
                         (userProfile?.profile?.firstName && userProfile.profile.firstName.trim().length > 0);
    const hasLastName = (userProfile?.lastName && userProfile.lastName.trim().length > 0) ||
                        (userProfile?.profile?.lastName && userProfile.profile.lastName.trim().length > 0);
    const hasEmail = (userProfile?.email && userProfile.email.trim().length > 0) ||
                     (userProfile?.profile?.email && userProfile.profile.email.trim().length > 0);
    
    console.log('📝 Profile completion check:', {
      hasFirstName: hasFirstName,
      hasLastName: hasLastName,
      hasEmail: hasEmail,
      rootProfile: {
        firstName: userProfile?.firstName,
        lastName: userProfile?.lastName,
        email: userProfile?.email
      },
      nestedProfile: {
        firstName: userProfile?.profile?.firstName,
        lastName: userProfile?.profile?.lastName,
        email: userProfile?.profile?.email
      }
    });
    
    if (hasFirstName && hasLastName && hasEmail) {
      scoreBreakdown.profileCompletion = SCORE_WEIGHTS.PROFILE_COMPLETION;
      totalScore += SCORE_WEIGHTS.PROFILE_COMPLETION;
      console.log('✅ Profile completed (+5%)');
    } else {
      console.log('❌ Profile incomplete - missing:', {
        firstName: !hasFirstName,
        lastName: !hasLastName,
        email: !hasEmail
      });
    }

    // 4. Wallet Connections (3% each)
    // Check both connections array and userProfile.connectedWallets
    let allConnections = [];
    
    if (connections && Array.isArray(connections)) {
      allConnections = [...allConnections, ...connections];
    }
    
    if (userProfile?.connectedWallets && Array.isArray(userProfile.connectedWallets)) {
      allConnections = [...allConnections, ...userProfile.connectedWallets];
    }
    
    // Remove duplicates based on address
    const uniqueConnections = allConnections.filter((conn, index, self) => 
      conn.isConnected === true && 
      conn.address &&
      self.findIndex(c => c.address === conn.address) === index
    );

    console.log('🔗 Found connections:', uniqueConnections);

    if (uniqueConnections.length > 0) {
      // Count MetaMask connections
      const metamaskConnections = uniqueConnections.filter(conn => 
        conn.walletType === 'metamask'
      ).length;
      scoreBreakdown.metamaskConnections = metamaskConnections * SCORE_WEIGHTS.METAMASK_CONNECTION;
      totalScore += scoreBreakdown.metamaskConnections;
      
      if (metamaskConnections > 0) {
        console.log(`✅ MetaMask connections: ${metamaskConnections} (+${scoreBreakdown.metamaskConnections}%)`);
      }

      // Count Coinbase connections  
      const coinbaseConnections = uniqueConnections.filter(conn => 
        conn.walletType === 'coinbase'
      ).length;
      scoreBreakdown.coinbaseConnections = coinbaseConnections * SCORE_WEIGHTS.COINBASE_CONNECTION;
      totalScore += scoreBreakdown.coinbaseConnections;
      
      if (coinbaseConnections > 0) {
        console.log(`✅ Coinbase connections: ${coinbaseConnections} (+${scoreBreakdown.coinbaseConnections}%)`);
      }

      // 5. Wallet Diversity Bonus (5% if both wallet types)
      const hasMetaMask = metamaskConnections > 0;
      const hasCoinbase = coinbaseConnections > 0;
      if (hasMetaMask && hasCoinbase) {
        scoreBreakdown.walletDiversity = SCORE_WEIGHTS.WALLET_DIVERSITY;
        totalScore += SCORE_WEIGHTS.WALLET_DIVERSITY;
        console.log('✅ Wallet diversity bonus (+5%)');
      }

      // 6. Multi-chain Connections (7% if multiple chains)
      const uniqueChains = new Set(uniqueConnections.map(conn => conn.chainId || '1'));
      if (uniqueChains.size > 1) {
        scoreBreakdown.multiChain = SCORE_WEIGHTS.MULTI_CHAIN;
        totalScore += SCORE_WEIGHTS.MULTI_CHAIN;
        console.log(`✅ Multi-chain support: ${uniqueChains.size} chains (+7%)`);
      }
    }

    // 7. Long-term User Bonus (10% for users > 30 days)
    if (userProfile?.createdAt) {
      const accountAge = Date.now() - userProfile.createdAt.toMillis();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (accountAge > thirtyDays) {
        scoreBreakdown.longTermUser = SCORE_WEIGHTS.LONG_TERM_USER;
        totalScore += SCORE_WEIGHTS.LONG_TERM_USER;
        console.log('✅ Long-term user bonus (+10%)');
      }
    }

    // 8. Social Verification (12% - future implementation)
    if (userProfile?.socialVerified === true) {
      scoreBreakdown.socialVerification = SCORE_WEIGHTS.SOCIAL_VERIFICATION;
      totalScore += SCORE_WEIGHTS.SOCIAL_VERIFICATION;
      console.log('✅ Social verification (+12%)');
    }

    // Cap the score at 100%
    totalScore = Math.min(totalScore, 100);

    const result = {
      totalScore,
      scoreBreakdown,
      lastCalculated: new Date(),
      maxPossibleScore: 100
    };

    console.log('📊 Final Zybl Score calculation:', result);

    // Save the calculated score back to the user's profile
    if (userEmail) {
      await updateZyblScoreInFirebase(userEmail, result);
    }

    return result;

  } catch (error) {
    console.error('Error calculating Zybl Score:', error);
    return {
      totalScore: 0,
      scoreBreakdown: {},
      error: error.message,
      lastCalculated: new Date()
    };
  }
};

/**
 * Update Zybl Score in Firebase
 * @param {string} userEmail - User's email
 * @param {Object} scoreData - Score calculation result
 */
export const updateZyblScoreInFirebase = async (userEmail, scoreData) => {
  try {
    const userRef = doc(db, 'users', userEmail);
    await updateDoc(userRef, {
      zyblScore: scoreData.totalScore,
      zyblScoreBreakdown: scoreData.scoreBreakdown,
      zyblScoreLastCalculated: scoreData.lastCalculated
    });
    
    console.log(`✅ Zybl Score updated for ${userEmail}: ${scoreData.totalScore}%`);
  } catch (error) {
    console.error('Error updating Zybl Score in Firebase:', error);
  }
};

/**
 * Get user's current Zybl Score from Firebase
 * @param {string} userEmail - User's email
 * @returns {Promise<number>} Current Zybl Score
 */
export const getUserZyblScore = async (userEmail) => {
  try {
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.zyblScore || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting Zybl Score:', error);
    return 0;
  }
};

/**
 * Trigger score recalculation after user actions
 * @param {string} userEmail - User's email
 * @param {string} action - Action that triggered recalculation
 */
export const recalculateZyblScore = async (userEmail, action = 'manual') => {
  try {
    console.log(`🔄 Recalculating Zybl Score for ${userEmail} due to: ${action}`);
    
    // Get user profile
    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('User not found for score recalculation');
      return null;
    }

    const userProfile = userSnap.data();
    const connections = userProfile.connectedWallets || [];
    
    // Calculate new score
    const newScore = await calculateZyblScore(userEmail, userProfile, connections);
    
    console.log(`📊 New Zybl Score: ${newScore.totalScore}% (was triggered by: ${action})`);
    
    return newScore;
  } catch (error) {
    console.error('Error recalculating Zybl Score:', error);
    return null;
  }
};

/**
 * Get score improvement tips for the user
 * @param {Object} scoreBreakdown - Current score breakdown
 * @returns {Array} Array of improvement suggestions
 */
export const getScoreImprovementTips = (scoreBreakdown) => {
  const tips = [];
  
  if (!scoreBreakdown.bioAuth) {
    tips.push({
      action: 'Complete Biometric Verification',
      points: SCORE_WEIGHTS.BIO_AUTH_COMPLETE,
      description: 'Verify your identity with biometric authentication'
    });
  }
  
  if (!scoreBreakdown.emailSaved) {
    tips.push({
      action: 'Add Email to Profile',
      points: SCORE_WEIGHTS.EMAIL_SAVED,
      description: 'Save your email address in your profile'
    });
  }
  
  if (scoreBreakdown.metamaskConnections === 0) {
    tips.push({
      action: 'Connect MetaMask Wallet',
      points: SCORE_WEIGHTS.METAMASK_CONNECTION,
      description: 'Connect your MetaMask wallet to increase your score'
    });
  }
  
  if (scoreBreakdown.coinbaseConnections === 0) {
    tips.push({
      action: 'Connect Coinbase Wallet',
      points: SCORE_WEIGHTS.COINBASE_CONNECTION,
      description: 'Connect your Coinbase wallet to increase your score'
    });
  }
  
  if (!scoreBreakdown.walletDiversity) {
    tips.push({
      action: 'Diversify Wallet Types',
      points: SCORE_WEIGHTS.WALLET_DIVERSITY,
      description: 'Connect both MetaMask and Coinbase wallets for bonus points'
    });
  }
  
  if (!scoreBreakdown.multiChain) {
    tips.push({
      action: 'Connect Multiple Chains',
      points: SCORE_WEIGHTS.MULTI_CHAIN,
      description: 'Connect wallets on different blockchain networks'
    });
  }
    if (!scoreBreakdown.profileCompletion) {
    tips.push({
      action: 'Complete Your Profile',
      points: SCORE_WEIGHTS.PROFILE_COMPLETION,
      description: 'Add your first name, last name, and email address to your profile'
    });
  }
  
  if (!scoreBreakdown.socialVerification) {
    tips.push({
      action: 'Social Media Verification (Coming Soon)',
      points: SCORE_WEIGHTS.SOCIAL_VERIFICATION,
      description: 'Verify your social media accounts when available'
    });
  }
  
  return tips.sort((a, b) => b.points - a.points); // Sort by highest points first
};

/**
 * Debug function to test score calculation with sample data
 * @param {string} userEmail - User email to test with
 */
export const debugZyblScore = async (userEmail = 'panchalpriyankfullstack@gmail.com') => {
  console.log('🔍 DEBUG: Testing Zybl Score calculation');
  
  // Sample data based on your Firebase structure
  const sampleUserProfile = {
    email: userEmail,
    firstName: 'Priyank',
    lastName: 'Panchal s',
    verificationData: {
      score: 95,
      status: 'Verified',
      steps: 3
    },
    verificationStatus: {
      status: 'Verified',
      biometricCompleted: true
    },
    connectedWallets: [
      {
        active: true,
        address: '0x74f6fd55d12dec288ef0bffa9a866589989ac641',
        chainId: '0x1',
        connectedAt: '2025-06-22T22:33:25.344Z',
        isConnected: true,
        userId: '20481d6b-513b-40eb-95a3-a8a14aa8aa6e',
        walletType: 'metamask'
      }
    ]
  };
  
  console.log('📊 Testing with sample data:', sampleUserProfile);
  
  try {
    const result = await calculateZyblScore(userEmail, sampleUserProfile, sampleUserProfile.connectedWallets);
    console.log('✅ DEBUG Result:', result);
    return result;
  } catch (error) {
    console.error('❌ DEBUG Error:', error);
    return null;
  }
};

/**
 * Test function specifically for profile completion with your Firebase structure
 */
export const testProfileCompletionScore = async () => {
  console.log('🧪 Testing Profile Completion Score with your Firebase structure');
  
  // Test data with nested profile structure from userSettings
  const testDataWithNestedProfile = {
    email: 'panchalpriyankfullstack@gmail.com',
    userSettings: {
      profile: {
        email: 'panchalpriyankfullstack@gmail.com',
        firstName: 'Priyank',
        lastName: 'Panchal s'
      }
    },
    verificationData: {
      status: 'Verified'
    },
    connectedWallets: [
      {
        address: '0x74f6fd55d12dec288ef0bffa9a866589989ac641',
        walletType: 'metamask',
        isConnected: true
      }
    ]
  };
  
  console.log('📋 Test data structure:', testDataWithNestedProfile);
  
  const result = await calculateZyblScore(
    'panchalpriyankfullstack@gmail.com', 
    testDataWithNestedProfile, 
    testDataWithNestedProfile.connectedWallets
  );
  
  console.log('🏆 Test Result:', result);
  console.log('✅ Profile Completion Score:', result.scoreBreakdown?.profileCompletion || 0);
  console.log('📝 Should show 5% for profile completion if firstName, lastName, and email are filled');
  
  return result;
};
