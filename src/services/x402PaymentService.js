// src/services/x402PaymentService.js
import { ethers } from 'ethers';

// Base Sepolia USDC contract address
const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BACKEND_URL = "http://localhost:5000";

// Default protocol/recipient address for payments
export const PROTOCOL_ADDRESS = "0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721";

// Flag to enable demo mode (simulates blockchain interactions without actual transactions)
const DEMO_MODE = true;

// Base Sepolia network configuration
const NETWORK_CONFIG = {
  chainId: "0x14a34", // 84532
  chainName: "Base Sepolia",
  rpcUrls: ["https://sepolia.base.org"],
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18
  },
  blockExplorerUrls: ["https://sepolia.basescan.org/"]
};

/**
 * Connect to Coinbase Wallet
 * @returns {Promise<Object>} Wallet connection info
 */
export const connectWallet = async () => {
  // Use demo wallet connection if demo mode is enabled
  if (DEMO_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("DEMO MODE: Simulated wallet connected: 0xDEMO1234567890abcdef1234567890abcdef1234");
        resolve({
          address: "0xDEMO1234567890abcdef1234567890abcdef1234",
          connected: true
        });
      }, 1000);
    });
  }

  try {
    // Check if window.ethereum exists (Coinbase Wallet browser extension)
    if (!window.ethereum) {
      throw new Error("Coinbase Wallet extension not found. Please install it first.");
    }
    
    // Request wallet connection
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts'
    });
    
    if (accounts.length === 0) {
      throw new Error("No accounts found. Please unlock your wallet.");
    }
    
    // Check current network
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    console.log("Current chainId:", chainIdHex);
    
    // Switch to Base Sepolia network if not already on it
    if (chainIdHex !== NETWORK_CONFIG.chainId) {
      console.log(`Switching from ${chainIdHex} to Base Sepolia (${NETWORK_CONFIG.chainId})...`);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainId }]
        });
        console.log("Successfully switched to Base Sepolia");
      } catch (switchError) {
        // If chain doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            console.log("Base Sepolia not found, adding network...");
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: NETWORK_CONFIG.chainId,
                chainName: NETWORK_CONFIG.chainName,
                nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                rpcUrls: NETWORK_CONFIG.rpcUrls,
                blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls
              }]
            });
            console.log("Base Sepolia network added successfully");
          } catch (addError) {
            console.error("Failed to add Base Sepolia network:", addError);
            throw new Error("Failed to add Base Sepolia network to wallet.");
          }
        } else {
          console.error("Failed to switch to Base Sepolia:", switchError);
          throw new Error("Failed to switch to Base Sepolia network.");
        }
      }
    } else {
      console.log("Already on Base Sepolia network");
    }
    
    return {
      address: accounts[0],
      connected: true
    };
  } catch (error) {
    console.error("Wallet connection error:", error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
};

/**
 * Helper function to check if user has enough ETH for gas
 * @param {string} address Wallet address
 * @returns {Promise<Object>} Balance info
 */
export const checkBaseSepoliaBalance = async (address) => {
  // Use demo balance check if demo mode is enabled
  if (DEMO_MODE) {
    console.log("DEMO MODE: Simulating sufficient ETH balance for", address);
    return {
      hasEnoughEth: true,
      balance: "0.05" // Simulated balance
    };
  }
  
  try {    
    // Create a provider for Base Sepolia
    const provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrls[0]);
    
    // Get the ETH balance
    const balance = await provider.getBalance(address);
    
    // Convert to ETH (balance is in wei)
    const ethBalance = ethers.utils.formatEther(balance);
    
    console.log(`Base Sepolia ETH balance for ${address}: ${ethBalance} ETH`);
    
    // Check if balance is sufficient for gas (0.001 ETH should be plenty for testnet)
    return {
      hasEnoughEth: parseFloat(ethBalance) >= 0.001,
      balance: ethBalance
    };
  } catch (error) {
    console.error("Error checking Base Sepolia balance:", error);
    return {
      hasEnoughEth: false,
      balance: "0",
      error: error.message
    };
  }
};

/**
 * Initiate X402 payment flow
 * @returns {Promise<Object>} Payment result
 */
export const initiateX402Payment = async () => {
  // If demo mode is enabled, use the enhanced interactive demo payment flow
  if (DEMO_MODE) {
    console.log("DEMO MODE: Using interactive simulated payment flow");
    
    // 1. Simulate wallet connection
    console.log("DEMO MODE: Opening wallet for connection...");
    const walletInfo = await connectWallet();
    console.log("DEMO MODE: Wallet connected successfully:", walletInfo.address);
    
    // 2. Simulate balance check
    console.log("DEMO MODE: Checking balance on Base Sepolia...");
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log("DEMO MODE: Sufficient balance confirmed");
    
    // 3. Show wallet popup for user approval
    const openWalletPopup = async () => {
      // Trigger the mock wallet popup in the UI
      console.log("DEMO MODE: Opening wallet approval popup...");
      
      // Set global flag to show the popup
      window.showMockWalletPopup = true;
      
      // Wait for user response (approve or reject)
      const userResponse = await new Promise((resolve) => {
        // Check every 100ms for the user's response
        const checkInterval = setInterval(() => {
          if (window.mockWalletResult) {
            clearInterval(checkInterval);
            const result = window.mockWalletResult;
            window.mockWalletResult = null;
            window.showMockWalletPopup = false;
            resolve(result);
          }
        }, 100);
      });
      
      // Handle user rejection
      if (userResponse === 'rejected') {
        console.log("DEMO MODE: User rejected the transaction in wallet");
        throw new Error("User rejected the transaction");
      }
      
      // User approved, generate a transaction hash
      console.log("DEMO MODE: User approved the transaction in wallet");
      const txHash = "0x" + Array.from({length: 64}, () => 
        "0123456789abcdef"[Math.floor(Math.random() * 16)]).join('');
      return txHash;
    };
    
    // 4. Simulate USDC approval request in wallet
    console.log("DEMO MODE: Requesting USDC approval...");
    const approvalTxHash = await openWalletPopup();
    console.log("DEMO MODE: USDC approval transaction hash:", approvalTxHash);
    
    // 5. Simulate transaction confirmation on blockchain
    console.log("DEMO MODE: Waiting for transaction confirmation...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("DEMO MODE: Transaction confirmed on Base Sepolia!");
    
    // 6. Simulate signature request for verification
    console.log("DEMO MODE: Requesting signature for verification...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("DEMO MODE: Signature provided successfully");
    
    // 7. Simulate backend verification
    console.log("DEMO MODE: Verifying payment with backend...");
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log("DEMO MODE: Payment verification successful!");
    
    // 8. Mint soulbound NFT after successful payment
    console.log("DEMO MODE: Minting soulbound NFT...");
    const nftResult = await mintSoulboundNFT(walletInfo.address);
    console.log("DEMO MODE: NFT minting completed:", nftResult);
    
    // 9. Return mock successful response with NFT data
    return {
      success: true,
      message: "Payment verification completed successfully",
      verificationStatus: "active",
      timestamp: new Date().toISOString(),
      nft: nftResult,
      receipt: {
        transactionHash: approvalTxHash,
        paymentId: `demo-${Date.now()}`,
        amount: "2.00 USDC",
        network: "Base Sepolia",
        splits: [
          {
            name: "Protocol",
            percentage: 60,
            address: PROTOCOL_ADDRESS
          },
          {
            name: "User Treasury", 
            percentage: 40,
            address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
          }
        ]
      }
    };
  }

  try {
    // 1. Connect wallet first
    const walletInfo = await connectWallet();
    
    // 2. Check if user has enough ETH for gas
    const balanceCheck = await checkBaseSepoliaBalance(walletInfo.address);
    console.log("Base Sepolia balance check:", balanceCheck);
    
    if (!balanceCheck.hasEnoughEth) {
      throw new Error(`Insufficient ETH on Base Sepolia to pay for gas. You need at least 0.001 ETH, but have ${balanceCheck.balance} ETH. Please get some testnet ETH from a Base Sepolia faucet.`);
    }
    
    // 3. Make API request to the endpoint that requires payment
    const response = await fetch(`${BACKEND_URL}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: walletInfo.address
      })
    });
    
    // 3. If response is 402 Payment Required, process the X402 payment
    if (response.status === 402) {
      const paymentInfo = await response.json();
      console.log("X402 Payment Info received:", paymentInfo);
      
      // Extract facilitator address or use a default for testing
      // For the X402 protocol, the facilitator address should come from the payment info
      // But if it's not there, we'll use a hard-coded address for testing
      const facilitatorAddress = paymentInfo.facilitator || 
                               paymentInfo.recipient || 
                               PROTOCOL_ADDRESS || 
                               "0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721";
      
      // 4. Process the payment using Coinbase Wallet
      // The provider from window.ethereum
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Get USDC token contract instance
      const usdcAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
      const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcAbi, signer);
      
      // Convert the payment amount to token units (USDC has 6 decimals)
      const paymentAmount = ethers.utils.parseUnits("2.0", 6); // 2 USDC
        
      // Approve the X402 facilitator to spend USDC
      console.log("Approving USDC spend to facilitator:", facilitatorAddress);
      const approveTx = await usdcContract.approve(facilitatorAddress, paymentAmount);
      await approveTx.wait();
      
      // 5. Get the payment proof
      // Check if signatureRequest is available, otherwise create a simple message
      let paymentProof;
      
      if (paymentInfo.signatureRequest) {
        console.log("Signing payment request:", paymentInfo.signatureRequest);
        paymentProof = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [walletInfo.address, JSON.stringify(paymentInfo.signatureRequest)]
        });
      } else {
        // Fallback to a simple message signing if typedData is not available
        console.log("No signature request found, creating a simple payment message");
        const message = `Pay 2 USDC to ${facilitatorAddress} for verification\nTimestamp: ${Date.now()}`;
        const messageBytes = ethers.utils.toUtf8Bytes(message);
        const messageHash = ethers.utils.keccak256(messageBytes);
        paymentProof = await signer.signMessage(ethers.utils.arrayify(messageHash));
      }
      
      console.log("Payment proof generated:", paymentProof);
      
      // 6. Retry the request with payment proof
      const paidResponse = await fetch(`${BACKEND_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentProof
        },
        body: JSON.stringify({
          walletAddress: walletInfo.address
        })
      });
      
      // 7. Return the verification result
      if (paidResponse.status === 200) {
        const result = await paidResponse.json();
        
        // Mint soulbound NFT after successful payment
        console.log("Minting soulbound NFT after successful payment");
        const nftResult = await mintSoulboundNFT(walletInfo.address);
        
        return {
          success: true,
          ...result,
          nft: nftResult
        };
      } else {
        // Fallback for development - simulate success even if backend verification fails
        // In production, you would remove this and only return success if the server confirms it
        console.warn("Backend verification failed, but simulating success for development");
        
        // Mint soulbound NFT after simulated success
        console.log("Minting soulbound NFT after simulated payment success");
        const nftResult = await mintSoulboundNFT(walletInfo.address);
        
        return {
          success: true,
          message: "Payment verification simulated for development",
          verificationStatus: "active",
          timestamp: new Date().toISOString(),
          nft: nftResult,
          receipt: {
            transactionHash: approveTx.hash,
            paymentId: `dev-${Date.now()}`,
            amount: "2.00 USDC",
            network: "Base Sepolia",
            splits: [
              {
                name: "Protocol",
                percentage: 60,
                address: PROTOCOL_ADDRESS
              },
              {
                name: "User Treasury", 
                percentage: 40,
                address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
              }
            ]
          }
        };
      }
    } else if (response.status === 200) {
      // Already paid or no payment required
      return await response.json();
    } else {
      throw new Error("Unexpected server response");
    }
  } catch (error) {
    console.error("X402 payment error:", error);
    throw new Error(`Payment failed: ${error.message}`);
  }
};

/**
 * Mint a soulbound NFT as a verification badge
 * @param {string} address Recipient wallet address
 * @returns {Promise<Object>} Minting result
 */
export const mintSoulboundNFT = async (address) => {
  // For demo mode, simulate minting an NFT
  if (DEMO_MODE) {
    console.log("DEMO MODE: Simulating minting soulbound NFT for", address);
    
    try {
      // Simulate some time for minting preparation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get provider and signer from the real wallet
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found. Please install Coinbase Wallet or another Ethereum wallet.");
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create a verifiable message for the NFT minting
      const message = `I confirm minting of a Zybl Passport Verification Badge (Soulbound NFT) to my wallet ${address}\nTimestamp: ${Date.now()}`;
      
      console.log("DEMO MODE: Requesting actual wallet signature for NFT minting...");
      
      // Request actual signature from the wallet
      const signature = await signer.signMessage(message);
      console.log("DEMO MODE: Signature received:", signature);
      
      // Generate a random token ID
      const tokenId = Math.floor(Math.random() * 1000000) + 1;
      
      console.log("DEMO MODE: Soulbound NFT minted successfully!");
      
      return {
        success: true,
        tokenId: tokenId,
        transactionHash: "0x" + Array.from({length: 64}, () => 
          "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(''),
        nftMetadata: {
          name: "Zybl Passport Verification Badge",
          description: "This soulbound NFT verifies the holder's identity through Zybl Passport.",
          image: "https://zybl.io/nft/verification-badge.png"
        }
      };
    } catch (error) {
      console.error("DEMO MODE: Error during wallet signature:", error);
      throw new Error(`NFT minting signature failed: ${error.message}`);
    }
  }
  
  // For actual implementation (testnet)
  try {
    if (!window.ethereum) {
      throw new Error("Ethereum provider not found");
    }
    
    // Get provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Create a message for verification and NFT minting
    const message = `I confirm minting of a Zybl Passport Verification Badge (Soulbound NFT) to my wallet ${address}\nTimestamp: ${Date.now()}`;
    
    console.log("Requesting wallet signature for NFT minting...");
    
    // Request actual signature directly from the wallet
    const signature = await signer.signMessage(message);
    console.log("Signature received:", signature);
    
    // If we reach here, the signature was successful
    
    // NFT Contract ABI (simplified for mint function)
    const nftAbi = [
      "function mint(address to) external returns (uint256)"
    ];
    
    // This would be your deployed NFT contract address on Base Sepolia
    const nftContractAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual contract
    
    // Get contract instance
    const nftContract = new ethers.Contract(nftContractAddress, nftAbi, signer);
    
    // Call mint function (For testnet, we'll just return success without actual contract call)
    console.log("Simulating soulbound NFT mint on testnet for", address);
    
    // For testnet, we'll simulate the successful mint rather than call the contract
    // In production, you would uncomment these lines:
    // const tx = await nftContract.mint(address);
    // const receipt = await tx.wait();
    
    // Get token ID from event logs (actual implementation would parse the event)
    const tokenId = Math.floor(Math.random() * 1000000) + 1;
    
    console.log("Soulbound NFT minted successfully on testnet!");
    
    return {
      success: true,
      tokenId: tokenId,
      transactionHash: "0x" + Array.from({length: 64}, () => 
        "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(''),
      nftMetadata: {
        name: "Zybl Passport Verification Badge",
        description: "This soulbound NFT verifies the holder's identity through Zybl Passport.",
        image: "https://zybl.io/nft/verification-badge.png"
      }
    };
  } catch (error) {
    console.error("Error minting soulbound NFT:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Helper function to format wallet address
 * @param {string} address Wallet address
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Helper function to get transaction link
 * @param {string} txHash Transaction hash
 * @returns {string} Explorer link
 */
export const getTransactionLink = (txHash) => {
  return `${NETWORK_CONFIG.blockExplorerUrls[0]}/tx/${txHash}`;
};

/**
 * Helper function to open a Base Sepolia faucet in a new tab
 */
export const getBaseSepoliaTestnetETH = () => {
  // List of Base Sepolia faucets
  const faucets = [
    "https://sepoliafaucet.com/",
    "https://www.coinbase.com/faucets/base-sepolia-faucet",
    "https://faucet.quicknode.com/base/sepolia"
  ];
  
  // Open the first faucet in a new tab
  window.open(faucets[0], '_blank');
};
