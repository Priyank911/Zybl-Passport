// coinbaseAuthUtils.js
// Dedicated utility for Coinbase Wallet integration for Zybl Passport
import { ethers } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

// Initialize the Coinbase Wallet SDK instance
const initCoinbaseWalletSDK = () => {
  try {
    return new CoinbaseWalletSDK({
      appName: 'Zybl Passport',
      appLogoUrl: 'https://zybl.io/logo.png', // Use absolute URL for better compatibility
      darkMode: true // Set to true for dark mode UI
    });
  } catch (error) {
    console.error("Error initializing Coinbase Wallet SDK:", error);
    throw new Error("Failed to initialize Coinbase Wallet. Please try again.");
  }
};

// Generate a deep link URL for Coinbase Wallet
export const getCoinbaseWalletDeepLink = (redirectUrl = window.location.href) => {
  const coinbaseWalletDeepLink = "https://go.cb-w.com/dapp?cb_url=";
  return `${coinbaseWalletDeepLink}${encodeURIComponent(redirectUrl)}`;
};

// Connect to Coinbase Wallet and get user address
export const connectCoinbaseWallet = async (chainId = 1) => {
  try {
    console.log("Connecting to Coinbase Wallet...");
    
    // Check if Coinbase Wallet is already connected
    if (window.ethereum?.isCoinbaseWallet) {
      console.log("Using existing Coinbase Wallet provider...");
      const provider = window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please ensure your Coinbase Wallet is properly set up.");
      }
      
      const address = accounts[0];
      console.log("Connected to Coinbase Wallet address:", address);
      
      // Save provider reference for later use
      window.coinbaseWalletProvider = provider;
      
      return {
        address,
        provider,
        chainId
      };
    }
    
    // Check if we can find Coinbase Wallet in the providers list
    if (window.ethereum?.providers) {
      const coinbaseProvider = window.ethereum.providers.find(provider => provider.isCoinbaseWallet);
      if (coinbaseProvider) {
        console.log("Found Coinbase Wallet in providers list...");
        const accounts = await coinbaseProvider.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found. Please ensure your Coinbase Wallet is properly set up.");
        }
        
        const address = accounts[0];
        console.log("Connected to Coinbase Wallet address:", address);
        
        // Save provider reference for later use
        window.coinbaseWalletProvider = coinbaseProvider;
        
        return {
          address,
          provider: coinbaseProvider,
          chainId
        };
      }
    }
    
    // Initialize the SDK as a fallback
    const coinbaseWalletSDK = initCoinbaseWalletSDK();
    
    // Define RPC URL based on chainId
    const rpcUrls = {
      1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Ethereum Mainnet
      137: 'https://polygon-rpc.com', // Polygon Mainnet
      // Add more chains as needed
    };
    
    // Default to Ethereum if the chainId is not supported
    const rpcUrl = rpcUrls[chainId] || rpcUrls[1];
    
    // Create Web3 provider
    const provider = coinbaseWalletSDK.makeWeb3Provider(rpcUrl, chainId);
    
    // Request accounts
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please ensure your Coinbase Wallet is properly set up.");
    }
    
    const address = accounts[0];
    console.log("Connected to Coinbase Wallet address:", address);
    
    // Save provider reference for later use
    window.coinbaseWalletProvider = provider;
    
    return {
      address,
      provider,
      chainId
    };
  } catch (error) {
    console.error("Error connecting to Coinbase Wallet:", error);
    
    // Format user-friendly error messages
    if (error.message?.includes('User denied account authorization')) {
      throw new Error('You rejected the connection request. Please try again.');
    } else if (error.message?.includes('Invalid options')) {
      throw new Error('Configuration error with Coinbase Wallet. Please refresh and try again.');
    } else if (error.message?.includes('already pending')) {
      throw new Error('A connection request is already pending. Please check your Coinbase Wallet app.');
    }
    
    throw error;
  }
};

// Generate a signature using Coinbase Wallet
export const signMessageWithCoinbase = async (message) => {
  try {
    console.log("Attempting to sign message with Coinbase Wallet:", message);
    
    // Make sure we have a provider
    let provider = window.coinbaseWalletProvider;
    
    // If we don't have a stored provider, try to find it
    if (!provider) {
      console.log("No stored provider, attempting to find Coinbase Wallet...");
      
      // Try various ways to get the provider
      if (window.ethereum?.isCoinbaseWallet) {
        provider = window.ethereum;
      } else if (window.ethereum?.providers) {
        provider = window.ethereum.providers.find(p => p.isCoinbaseWallet);
      } else if (window.coinbaseWalletExtension) {
        provider = window.coinbaseWalletExtension;
      }
      
      if (!provider) {
        throw new Error('Coinbase Wallet not connected. Please connect first.');
      }
      
      // Store for future use
      window.coinbaseWalletProvider = provider;
    }
    
    // Create ethers provider - using ethers v5 syntax
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();
    
    // Sign the message
    console.log("Signing message with provider:", provider);
    const signature = await signer.signMessage(message);
    console.log("Generated signature:", signature);
    
    return signature;
  } catch (error) {
    console.error("Error signing message with Coinbase Wallet:", error);
    
    if (error.code === 4001 || error.message?.includes('User denied')) {
      throw new Error('You need to sign the message to authenticate');
    }
    
    throw error;
  }
};

// Helper to check if Coinbase Wallet is installed/available
export const isCoinbaseWalletAvailable = () => {
  // Multiple ways to detect Coinbase Wallet
  // 1. Check for the isCoinbaseWallet property
  // 2. Check for the coinbaseWalletExtension property
  // 3. Check for the coinbase property
  return (
    !!window.ethereum?.isCoinbaseWallet || 
    !!window.coinbaseWalletExtension || 
    !!window.ethereum?.providers?.some(provider => provider.isCoinbaseWallet) ||
    !!window.ethereum?.providerMap?.get('CoinbaseWallet') ||
    !!window.coinbase
  );
};

// Helper to get chain name from chainId
export const getChainName = (chainId) => {
  const chains = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet'
  };
  
  return chains[chainId] || `Chain ID ${chainId}`;
};

// Helper to shorten wallet address for display
export const shortenAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Track connection state
let isConnected = false;
export const isWalletConnected = () => isConnected;
export const setWalletConnected = (state) => { isConnected = state; };

// Helper to get user profile data
export const getUserProfile = (address) => {
  if (!address) return null;
  
  return {
    address,
    shortenedAddress: shortenAddress(address),
    connectedWith: 'Coinbase Wallet',
    lastConnected: new Date().toISOString()
  };
};
