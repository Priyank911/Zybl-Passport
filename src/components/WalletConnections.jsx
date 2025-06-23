import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { shortenAddress } from '../utils/coinbaseAuthUtils';
import { connectCoinbaseWallet } from '../utils/coinbaseAuthUtils';
import { db } from '../utils/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import '../styles/WalletConnections.css';
// Import ReactFlow and its styles
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Position,
  MarkerType,
  useNodesState, 
  useEdgesState,
  Panel,
  Handle,
  EdgeLabelRenderer,
  getBezierPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { addWalletConnection, removeWalletConnection } from '../utils/firebaseConfig';

const WalletConnections = ({ mainDID, mainAddress, onConnectWallet, storedConnections = [], userEmail }) => {
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [connections, setConnections] = useState(storedConnections);
  const [newConnection, setNewConnection] = useState(null);
  const [showSocialMediaNotice, setShowSocialMediaNotice] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const graphRef = useRef(null);
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  // Fetch user's connected wallets on component mount and listen for real-time updates
  useEffect(() => {
    // Add error boundary to prevent component crashes
    const handleError = (error, context) => {
      console.error(`Error in WalletConnections ${context}:`, error);
      setConnectionError(`Failed to ${context}. Please refresh the page.`);
    };

    const fetchConnections = async () => {
      if (!userEmail) return;
      
      try {
        const userRef = doc(db, "users", userEmail);
        const userSnap = await getDoc(userRef);
        
        // Check both the wallet connections collection and user document
        let walletConnections = [];
        
        if (userSnap.exists() && userSnap.data().connectedWallets) {
          walletConnections = userSnap.data().connectedWallets;
        }
        
        // Also check the dedicated wallet connections collection
        try {
          const connectionsQuery = query(collection(db, "walletConnections"), where("userId", "==", userEmail));
          const connectionsSnap = await getDocs(connectionsQuery);
          
          if (!connectionsSnap.empty) {
            connectionsSnap.forEach(doc => {
              try {
                const connData = doc.data();
                // Only add connections that are explicitly marked as connected
                if (connData.isConnected === true && !walletConnections.some(conn => conn.address === connData.address)) {
                  walletConnections.push({
                    ...connData,
                    id: doc.id,
                    connectedAt: connData.connectedAt instanceof Date ? connData.connectedAt : 
                                (connData.connectedAt?.toDate ? connData.connectedAt.toDate() : new Date())
                  });
                }
              } catch (docError) {
                console.error("Error processing wallet connection document:", docError);
              }
            });
          }
        } catch (err) {
          console.error("Error fetching from wallet connections collection:", err);
        }
        
        setConnections(walletConnections);
      } catch (error) {
        handleError(error, "fetch connections");
      }
    };

    // Initial fetch with error handling
    if (storedConnections.length === 0) {
      fetchConnections().catch(error => handleError(error, "initial fetch"));
    } else {
      setConnections(storedConnections);
    }
    
    // Set up real-time listener for user document changes (for connected wallets)
    let unsubscribe;
    if (userEmail) {
      try {
        const userRef = doc(db, "users", userEmail);
        unsubscribe = onSnapshot(userRef, (snapshot) => {
          try {
            if (snapshot.exists() && snapshot.data().connectedWallets) {
              // Merge existing connections with updated connections from Firebase
              setConnections(prevConnections => {
                try {
                  // Get Firebase connections
                  const firebaseConnections = snapshot.data().connectedWallets;
                  
                  // Validate the data before processing
                  if (!Array.isArray(firebaseConnections)) {
                    console.warn("Firebase connections is not an array:", firebaseConnections);
                    return prevConnections;
                  }
                  
                  // Map existing connections to ensure we keep any additional properties
                  const updatedConnections = firebaseConnections
                    .filter(fbConn => fbConn.isConnected === true) // Only show explicitly connected wallets
                    .map(fbConn => {
                      try {
                        // Find existing connection with same address/type if it exists
                        const existingConn = prevConnections.find(
                          prev => prev.address === fbConn.address && prev.walletType === fbConn.walletType
                        );
                        
                        // Return existing connection data merged with Firebase data, or just Firebase data
                        return existingConn ? { ...existingConn, ...fbConn } : fbConn;
                      } catch (mapError) {
                        console.error("Error processing connection:", fbConn, mapError);
                        return fbConn; // Return as-is if there's an error
                      }
                    });
                  
                  return updatedConnections;
                } catch (setConnectionsError) {
                  console.error("Error in setConnections callback:", setConnectionsError);
                  return prevConnections; // Return previous state if there's an error
                }
              });
            }
          } catch (snapshotError) {
            console.error("Error processing snapshot:", snapshotError);
          }
        }, (error) => {
          handleError(error, "listen for real-time updates");
        });
      } catch (listenerError) {
        handleError(listenerError, "setup real-time listener");
      }
    }
    
    // Clean up listener
    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
      } catch (cleanupError) {
        console.error("Error cleaning up listener:", cleanupError);
      }
    };
  }, [userEmail]); // Remove storedConnections from dependency array to prevent infinite loops

  // Draw the connection graph when the component mounts or connections change
  useEffect(() => {
    if (graphRef.current && mainDID) {
      renderConnectionGraph();
    }
  }, [mainDID, connections, newConnection]);  // Create ReactFlow nodes and edges when connections change - with expanded layout for separated view
  useEffect(() => {
    if (!mainDID || !mainAddress) return;
    
    console.log("🔄 Updating graph with connections:", connections);
    
    // Create nodes and edges for ReactFlow
    const graphNodes = [];
    const graphEdges = [];
    
    // Center position for the graph - adjusted for wider spread
    const centerX = 400;
    const centerY = 150;
    
    // Main DID node (top center)
    graphNodes.push({
      id: 'did-node',
      type: 'didNode',
      data: { 
        label: shortenAddress(mainDID), 
        fullDid: mainDID,
        status: 'Verified' 
      },
      position: { x: centerX, y: 40 },
      className: 'did-node'
    });
    
    // Main address node (left side of DID)
    graphNodes.push({
      id: 'address-node',
      type: 'walletNode',
      data: { 
        label: shortenAddress(mainAddress),
        fullAddress: mainAddress, 
        walletType: 'primary', 
        chainId: connections[0]?.chainId || '1',
        chain: getChainName(connections[0]?.chainId || '1')
      },
      position: { x: centerX - 220, y: centerY },
      className: `address-node ${getChainClass(connections[0]?.chainId || '1')}`
    });
    
    // Edge from DID to main address - with verified label
    graphEdges.push({
      id: 'did-to-address',
      source: 'did-node',
      target: 'address-node',
      type: 'custom',
      animated: true,
      sourceHandle: 'a',
      targetHandle: 'a',
      data: {
        label: 'Verified'
      },
      style: { 
        stroke: '#6C5CE7', 
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#6C5CE7',
      },
    });

    // Social media node (right side of DID) - always show as future implementation
    graphNodes.push({
      id: 'social-node',
      type: 'socialNode',
      data: { 
        label: 'Social Media', 
        status: 'Future Implementation',
        onConnect: () => handleConnectWallet('social')
      },
      position: { x: centerX + 220, y: centerY },
      className: 'social-node'
    });

    // Edge from DID to social node - same style as DID to address
    graphEdges.push({
      id: 'did-to-social',
      source: 'did-node',
      target: 'social-node',
      type: 'custom',
      animated: true,
      sourceHandle: 'a',
      targetHandle: 'a',
      data: {
        label: 'Verified'
      },
      style: { 
        stroke: '#6C5CE7', 
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#6C5CE7',
      },
    });
    
    // Add connected wallet nodes ONLY after successful connection and Firebase storage
    // Filter for unique connections to prevent duplicates and exclude main address
    const validConnections = connections.filter((conn, index, self) => 
      conn.address && 
      conn.walletType && 
      conn.walletType !== 'social' &&
      conn.isConnected === true &&
      // Exclude connections that match the main address
      conn.address.toLowerCase() !== mainAddress.toLowerCase() &&
      // Ensure uniqueness by checking if this is the first occurrence of this address+walletType combination
      self.findIndex(c => 
        c.address === conn.address && 
        c.walletType === conn.walletType
      ) === index
    );
    
    console.log("🔍 Valid connections for graph:", validConnections);
    
    if (validConnections.length > 0) {
      // Position wallets below the main address in a separated vertical layout
      const walletVerticalOffset = 200; // More vertical space for separation
      const walletHorizontalSpread = validConnections.length === 1 ? 0 : 150; // More horizontal spread
      const totalWidth = (validConnections.length - 1) * walletHorizontalSpread;
      const startX = (centerX - 220) - totalWidth / 2; // Center under the main address node
      
      validConnections.forEach((connection, index) => {
        const nodeId = `wallet-node-${connection.address}-${connection.walletType}`;
        const xPos = startX + index * walletHorizontalSpread;
        const yPos = centerY + walletVerticalOffset; // Well below the main address
        const chainClass = getChainClass(connection.chainId || '1');
        
        console.log(`📍 Creating wallet node: ${nodeId} at position (${xPos}, ${yPos})`);
        
        graphNodes.push({
          id: nodeId,
          type: 'walletNode',
          data: { 
            label: shortenAddress(connection.address),
            fullAddress: connection.address,
            walletType: connection.walletType,
            chainId: connection.chainId || '1',
            chain: getChainName(connection.chainId || '1'),
            connection: connection,
            onDisconnect: () => handleStartDisconnect(connection)
          },
          position: { x: xPos, y: yPos },
          className: `wallet-node ${chainClass} ${newConnection === connection.address ? 'highlight-node' : ''}`
        });
        
        // Edge with proper wallet type label and color - CRITICAL: Create edge from primary address to wallet
        const edgeColor = getChainColor(connection.chainId || '1');
        const walletLabel = connection.walletType === 'metamask' ? 'MetaMask' : 'Coinbase';
        const edgeId = `address-to-${nodeId}`;
        
        console.log(`🔗 Creating edge: ${edgeId} from address-node to ${nodeId}`);
        
        graphEdges.push({
          id: edgeId,
          source: 'address-node',
          target: nodeId,
          type: 'custom',
          animated: newConnection === connection.address,
          sourceHandle: 'b',
          targetHandle: 'a',
          data: {
            label: walletLabel
          },
          style: { 
            stroke: edgeColor,
            strokeWidth: 2
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: edgeColor,
          },
        });
      });
    }
    
    console.log("📊 Final graph state:", { 
      nodes: graphNodes.length, 
      edges: graphEdges.length,
      nodeIds: graphNodes.map(n => n.id),
      edgeIds: graphEdges.map(e => e.id)
    });
    
    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [mainDID, mainAddress, connections, newConnection]);

  const handleConnectWallet = async (walletType) => {
    setIsConnectingWallet(true);
    setSelectedWalletType(walletType);
    setConnectionError(null);
    setNewConnection(null);
    setSuccessMessage(null);

    // For social media type, show future implementation dialog
    if (walletType === 'social') {
      setTimeout(() => {
        setIsConnectingWallet(false);
        setShowSocialMediaNotice(true);
      }, 500);
      return;
    }

    try {
      let walletConnection;
      
      // Handle real wallet connections
      if (walletType === 'coinbase') {
        try {
          console.log("🔵 Attempting to connect to Coinbase Wallet...");
          console.log("🔍 Available providers:", {
            ethereum: !!window.ethereum,
            isMetaMask: window.ethereum?.isMetaMask,
            isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
            providers: window.ethereum?.providers?.length || 0
          });
          
          let coinbaseProvider = null;
          
          // First, try to find Coinbase Wallet in providers array
          if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            console.log("🔍 Multiple providers detected, looking for Coinbase Wallet...");
            coinbaseProvider = window.ethereum.providers.find(provider => provider.isCoinbaseWallet);
            console.log("🔵 Found Coinbase provider:", !!coinbaseProvider);
          }
          
          // If not found in providers array, check if window.ethereum itself is Coinbase
          if (!coinbaseProvider && window.ethereum?.isCoinbaseWallet) {
            console.log("🔵 Using window.ethereum as Coinbase provider");
            coinbaseProvider = window.ethereum;
          }
          
          // If still not found, try to use the SDK
          if (!coinbaseProvider) {
            console.log("🔵 No Coinbase provider found, using SDK connection...");
            // Show connecting status
            setSuccessMessage("Opening Coinbase Wallet...");
            
            // Use the actual Coinbase wallet connection function from utils
            const { address, chainId } = await connectCoinbaseWallet();
            
            console.log("🔵 Coinbase SDK connection successful:", { address, chainId });
            
            // Check if this address is the same as main address or already connected
            if (address.toLowerCase() === mainAddress.toLowerCase()) {
              setConnectionError(`This Coinbase wallet address (${shortenAddress(address)}) is the same as your main address. Please switch to a different account in Coinbase Wallet or use a different wallet.`);
              setIsConnectingWallet(false);
              return;
            }
            
            // Check if this wallet is already connected
            const isAlreadyConnected = connections.some(conn => 
              conn.address.toLowerCase() === address.toLowerCase() && 
              conn.isConnected === true
            );
            
            if (isAlreadyConnected) {
              const existingWallet = connections.find(conn => 
                conn.address.toLowerCase() === address.toLowerCase() && 
                conn.isConnected === true
              );
              setConnectionError(`This wallet address (${shortenAddress(address)}) is already connected as ${existingWallet.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} wallet. To connect Coinbase, please switch to a different account in Coinbase Wallet.`);
              setIsConnectingWallet(false);
              return;
            }
            
            walletConnection = {
              address: address,
              walletType: 'coinbase',
              connectedAt: new Date().toISOString(),
              chainId: chainId.toString()
            };
            
            console.log("🔵 Coinbase walletConnection object:", walletConnection);
          } else {
            // Use the found Coinbase provider
            console.log("✅ Coinbase provider found, requesting accounts...");
            
            // Show connecting status
            setSuccessMessage("Opening Coinbase Wallet...");
            
            const accounts = await coinbaseProvider.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            const chainId = await coinbaseProvider.request({ method: 'eth_chainId' });
            
            console.log("🔵 Coinbase connection successful:", { 
              address, 
              chainId,
              provider: 'Coinbase Wallet'
            });
            
            // Check if this address is the same as main address
            if (address.toLowerCase() === mainAddress.toLowerCase()) {
              setConnectionError(`This Coinbase wallet address (${shortenAddress(address)}) is the same as your main address. Please switch to a different account in Coinbase Wallet or use a different wallet.`);
              setIsConnectingWallet(false);
              return;
            }
            
            // Check if this wallet is already connected
            const isAlreadyConnected = connections.some(conn => 
              conn.address.toLowerCase() === address.toLowerCase() && 
              conn.isConnected === true
            );
            
            if (isAlreadyConnected) {
              const existingWallet = connections.find(conn => 
                conn.address.toLowerCase() === address.toLowerCase() && 
                conn.isConnected === true
              );
              setConnectionError(`This wallet address (${shortenAddress(address)}) is already connected as ${existingWallet.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} wallet. To connect Coinbase, please switch to a different account in Coinbase Wallet.`);
              setIsConnectingWallet(false);
              return;
            }
            
            walletConnection = {
              address: address,
              walletType: 'coinbase',
              connectedAt: new Date().toISOString(),
              chainId: chainId.toString()
            };
            
            console.log("🔵 Coinbase walletConnection object:", walletConnection);
          }
        } catch (error) {
          console.error("Coinbase wallet connection error:", error);
          setConnectionError(error.message || "Failed to connect Coinbase wallet. Please try again.");
          setIsConnectingWallet(false);
          return;
        }
      } else if (walletType === 'metamask') {
        try {
          console.log("🦊 Attempting to connect to MetaMask...");
          console.log("🔍 Available providers:", {
            ethereum: !!window.ethereum,
            isMetaMask: window.ethereum?.isMetaMask,
            isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
            providers: window.ethereum?.providers?.length || 0
          });
          
          let metamaskProvider = window.ethereum;
          
          // If multiple providers exist, try to find MetaMask specifically
          if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            console.log("🔍 Multiple providers detected, looking for MetaMask...");
            metamaskProvider = window.ethereum.providers.find(provider => provider.isMetaMask);
            console.log("🦊 Found MetaMask provider:", !!metamaskProvider);
          }
          
          // Connect to MetaMask
          if (!metamaskProvider) {
            console.error("❌ MetaMask provider not found");
            throw new Error("MetaMask not detected. Please install MetaMask extension.");
          }
          
          if (!metamaskProvider.isMetaMask) {
            console.error("❌ Provider is not MetaMask:", {
              isMetaMask: metamaskProvider.isMetaMask,
              isCoinbaseWallet: metamaskProvider.isCoinbaseWallet,
              constructor: metamaskProvider.constructor?.name
            });
            throw new Error("MetaMask not properly detected. Please ensure MetaMask is installed and enabled.");
          }
          
          console.log("✅ MetaMask provider found, requesting accounts...");
          
          // Show connecting status
          setSuccessMessage("Opening MetaMask...");
          
          // Use the specific MetaMask provider
          const accounts = await metamaskProvider.request({ 
            method: 'eth_requestAccounts'
          });
          
          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found in MetaMask. Please unlock MetaMask and try again.");
          }
          
          const address = accounts[0];
          const chainId = await metamaskProvider.request({ method: 'eth_chainId' });
          
          console.log("🦊 MetaMask connection successful:", { 
            address, 
            chainId,
            totalAccounts: accounts.length,
            provider: 'MetaMask'
          });
          
          // Update message to show progress
          setSuccessMessage("Verifying connection...");
          
          // Check if this address is the same as main address
          if (address.toLowerCase() === mainAddress.toLowerCase()) {
            setConnectionError(`This MetaMask wallet address (${shortenAddress(address)}) is the same as your main address. Please switch to a different account in MetaMask or use a different wallet.`);
            setIsConnectingWallet(false);
            return;
          }
          
          // Check if this wallet is already connected (stored in Firebase)
          const isAlreadyConnected = connections.some(conn => 
            conn.address.toLowerCase() === address.toLowerCase() && 
            conn.isConnected === true // Check if any wallet type with this address is connected
          );
          
          if (isAlreadyConnected) {
            const existingWallet = connections.find(conn => 
              conn.address.toLowerCase() === address.toLowerCase() && 
              conn.isConnected === true
            );
            setConnectionError(`This wallet address (${shortenAddress(address)}) is already connected as ${existingWallet.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} wallet. To connect MetaMask, please switch to a different account in MetaMask or create a new account.`);
            setIsConnectingWallet(false);
            return;
          }
          
          walletConnection = {
            address: address,
            walletType: 'metamask',
            connectedAt: new Date().toISOString(),
            chainId: chainId
          };
          
          console.log("🦊 MetaMask walletConnection object:", walletConnection);
        } catch (error) {
          console.error("MetaMask wallet connection error:", error);
          setConnectionError(error.message || "Failed to connect MetaMask wallet. Please try again.");
          setIsConnectingWallet(false);
          return;
        }
      } else if (walletType === 'social') {
        // Handle social media connections (future implementation)
        setTimeout(() => {
          setIsConnectingWallet(false);
          setShowSocialMediaNotice(true);
        }, 500);
        return;
      } else {
        // Unknown wallet type
        setConnectionError(`Unsupported wallet type: ${walletType}`);
        setIsConnectingWallet(false);
        return;
      }
      
      // Show saving status
      setSuccessMessage("Saving connection to your identity...");
      
      // Store in Firebase (using the addWalletConnection utility) - only add to UI after successful firebase save
      const walletConnectionData = {
        ...walletConnection,
        isConnected: true // Mark as explicitly connected
      };
      
      console.log("🔄 Attempting to save wallet connection:", walletConnectionData);
      console.log("👤 User email:", userEmail);
      
      if (!userEmail) {
        throw new Error("User email is required but not available. Please sign in again.");
      }
      
      const storedConnection = await addWalletConnection(
        userEmail,
        walletConnectionData
      );
      
      console.log("💾 addWalletConnection result:", storedConnection);
      
      if (storedConnection) {
        // Add the new connection to state ONLY after successful Firebase save
        // Check if connection already exists in state to prevent duplicates
        const alreadyInState = connections.some(conn => 
          conn.address.toLowerCase() === walletConnectionData.address.toLowerCase() &&
          conn.walletType === walletConnectionData.walletType
        );
        
        if (!alreadyInState) {
          setConnections(prev => [...prev, walletConnectionData]);
        }
        
        // Highlight the new connection in the graph
        setNewConnection(walletConnection.address);
        
        // Show success message with wallet type name capitalized
        setSuccessMessage(`${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet connected successfully!`);
        
        // Clear the highlight after a few seconds
        setTimeout(() => {
          setNewConnection(null);
        }, 5000);
      } else {
        console.error("❌ Failed to save wallet connection - storedConnection is:", storedConnection);
        throw new Error("Failed to save wallet connection to database.");
      }
    } catch (error) {
      console.error(`Error connecting ${selectedWalletType} wallet:`, error);
      setConnectionError(error.message || `Failed to connect ${selectedWalletType} wallet. Please try again.`);
    } finally {
      setIsConnectingWallet(false);
    }
  };
  
  const handleStartDisconnect = (connection) => {
    setSelectedConnection(connection);
    setShowDisconnectModal(true);
  };
  const handleConfirmDisconnect = async () => {
    if (!selectedConnection) return;

    setIsDisconnecting(true);
    setShowDisconnectModal(false);
    setSuccessMessage("Disconnecting wallet...");
    setConnectionError(null);

    try {
      // Use the removeWalletConnection util function from Firebase
      const success = await removeWalletConnection(userEmail, selectedConnection);

      if (success) {
        // Get wallet address before removing from state to use for animation
        const addressToRemove = selectedConnection.address;
        
        // Mark the connection as being removed (for animation)
        setConnections(prev => 
          prev.map(conn => 
            conn.address.toLowerCase() === addressToRemove.toLowerCase() && 
            conn.walletType === selectedConnection.walletType
              ? { ...conn, removing: true }
              : conn
          )
        );
        
        // Short delay to show animation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now actually remove it from state
        setConnections(prev => prev.filter(conn => 
          conn.address.toLowerCase() !== addressToRemove.toLowerCase() ||
          conn.walletType !== selectedConnection.walletType
        ));
        
        const walletType = selectedConnection.walletType.charAt(0).toUpperCase() + 
                          selectedConnection.walletType.slice(1);
        setSuccessMessage(`${walletType} wallet disconnected successfully!`);
      } else {
        throw new Error("Failed to remove wallet connection from database.");
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      setConnectionError(`Failed to disconnect wallet. Error: ${error.message}`);
    } finally {
      setIsDisconnecting(false);
      setSelectedConnection(null);
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectModal(false);
    setSelectedConnection(null);
  };
  
  // Enhanced modern visualization graph with chain-specific styling
  const renderConnectionGraph = () => {
    // Clear any previous content
    const graph = graphRef.current;
    if (!graph) return;
    graph.innerHTML = '';

    // Container for the graph
    const graphContainer = document.createElement('div');
    graphContainer.className = 'graph-visualization';
    
    // Main DID node
    const didNode = document.createElement('div');
    didNode.className = 'graph-node did-node';
    didNode.innerHTML = `
      <div class="node-content">
        <div class="node-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#627EEA"/><path d="M12.3735 3V9.6525L17.9963 12.165L12.3735 3Z" fill="white" fill-opacity="0.602"/><path d="M12.3735 3L6.75 12.165L12.3735 9.6525V3Z" fill="white"/><path d="M12.3735 16.4762V20.9963L18 13.2125L12.3735 16.4762Z" fill="white" fill-opacity="0.602"/><path d="M12.3735 20.9963V16.4755L6.75 13.2125L12.3735 20.9963Z" fill="white"/><path d="M12.3735 15.4295L17.9963 12.165L12.3735 9.6543V15.4295Z" fill="white" fill-opacity="0.2"/><path d="M6.75 12.165L12.3735 15.4295V9.6543L6.75 12.165Z" fill="white" fill-opacity="0.602"/></svg>
        </div>
        <div class="node-title">Primary DID</div>
        <div class="node-value">${shortenAddress(mainDID)}</div>
        <div class="node-action">
          <div class="node-status verified">Verified</div>
        </div>
      </div>
    `;
    graphContainer.appendChild(didNode);
    
    // Arrow connecting DID to main address
    const didArrow = document.createElement('div');
    didArrow.className = 'connection-arrow did-to-address';
    graphContainer.appendChild(didArrow);
    
    // Main address node
    const chainIcon = getChainIcon(connections[0]?.chainId || '1');
    const chainName = getChainName(connections[0]?.chainId || '1');
    const chainClass = getChainClass(connections[0]?.chainId || '1');
    
    const addressNode = document.createElement('div');
    addressNode.className = `graph-node address-node primary-address ${chainClass}`;
    addressNode.innerHTML = `
      <div class="node-content">
        <div class="node-icon">
          ${chainIcon}
        </div>
        <div class="node-title">Primary Address</div>
        <div class="node-value">${shortenAddress(mainAddress)}</div>
        <div class="node-chain ${chainClass}">${chainName}</div>
      </div>
    `;
    graphContainer.appendChild(addressNode);
    
    // Arrow connecting DID to social node
    const didToSocialArrow = document.createElement('div');
    didToSocialArrow.className = 'connection-arrow did-to-social';
    graphContainer.appendChild(didToSocialArrow);
    
    // Container for branches from main address
    const branchContainer = document.createElement('div');
    branchContainer.className = 'branch-container';
    
    // Add social media branch (future implementation)
    const socialBranch = document.createElement('div');
    socialBranch.className = 'branch social-branch';
    socialBranch.innerHTML = `
      <div class="branch-arrow"></div>
      <div class="graph-node social-node">
        <div class="node-content">
          <div class="node-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.58984 13.5098L15.4198 17.4898" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4098 6.50977L8.58984 10.4898" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div class="node-title">Social Media</div>
          <div class="node-value future">Future Implementation</div>
          <div class="node-action">
            <button class="node-button" id="connect-social-btn">
              Connect
            </button>
          </div>
        </div>
      </div>
    `;
    branchContainer.appendChild(socialBranch);
    
    // Add connected wallet branches - only show if explicitly connected and not main address
    const connectedWallets = connections.filter(conn => 
      conn.isConnected === true && 
      conn.address.toLowerCase() !== mainAddress.toLowerCase()
    );
    connectedWallets.forEach((connection, index) => {
      const walletChainIcon = getChainIcon(connection.chainId || '1');
      const walletChainName = getChainName(connection.chainId || '1');
      const walletChainClass = getChainClass(connection.chainId || '1');
      
      const walletBranch = document.createElement('div');
      walletBranch.className = `branch wallet-branch ${walletChainClass}`;
      if (newConnection === connection.address) {
        walletBranch.classList.add('highlight-branch');
      }
      
      const branchId = `wallet-branch-${index}`;
      walletBranch.id = branchId;
      
      walletBranch.innerHTML = `
        <div class="branch-arrow"></div>
        <div class="graph-node wallet-node ${newConnection === connection.address ? 'highlight-node' : ''} ${walletChainClass}">
          <div class="node-content">
            <div class="node-icon">
              ${connection.walletType === 'metamask' 
                ? `<svg width="24" height="24" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09325L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.04183 1L15.0252 10.8431L12.7335 5.09325L2.04183 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                    <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                  </svg>`
              }
            </div>
            <div class="node-title">${connection.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} Wallet</div>
            <div class="node-value">${shortenAddress(connection.address)}</div>
            <div class="node-chain ${walletChainClass}">${walletChainName}</div>
            <div class="node-action">
              <button class="node-button disconnect" data-address="${connection.address}" id="disconnect-btn-${index}">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      `;
      branchContainer.appendChild(walletBranch);
    });
    
    graphContainer.appendChild(branchContainer);
    graph.appendChild(graphContainer);
    
    // Add event listeners for the social media and disconnect buttons
    document.getElementById('connect-social-btn')?.addEventListener('click', () => {
      handleConnectWallet('social');
    });
    
    const eventConnectedWallets = connections.filter(conn => conn.isConnected === true);
    eventConnectedWallets.forEach((connection, index) => {
      document.getElementById(`disconnect-btn-${index}`)?.addEventListener('click', () => {
        handleDisconnectWallet(connection);
      });
    });
  };  // Custom ReactFlow node components
  const DIDNode = ({ data }) => (
    <div className="graph-node-content did-node">
      <Handle type="source" position={Position.Bottom} id="a" style={{ opacity: 0 }} />
      <div className="node-tooltip">{data.fullDid}</div>
      <div className="node-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="#6C5CE7" fillOpacity="0.1"/>
          <circle cx="12" cy="12" r="6" stroke="#6C5CE7" strokeWidth="2"/>
        </svg>
      </div>
      <div className="node-title">Primary DID</div>
      <div className="node-value">{data.label}</div>
      <div className="node-action">
        <div className="node-status verified">{data.status}</div>
      </div>
    </div>
  );
    const WalletNode = ({ data }) => {
    const chainClass = getChainClass(data.chainId || '1');
    const isPrimary = data.walletType === 'primary';
    
    // Icon based on wallet type
    const renderIcon = () => {
      if (data.walletType === 'metamask') {
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#E2761B" fillOpacity="0.1"/>
            <path d="M17.2984 8.50L13.1484 11.56L13.9984 9.23L17.2984 8.50Z" fill="#E2761B"/>
            <path d="M6.7016 8.50L10.8016 11.61L10.0016 9.23L6.7016 8.50Z" fill="#E4761B"/>
            <path d="M15.6484 14.7998L14.3984 16.9998L17.0984 17.9998L17.9984 14.8498L15.6484 14.7998Z" fill="#E2761B"/>
            <path d="M6.00156 14.8498L6.89156 17.9998L9.59156 16.9998L8.34156 14.7998L6.00156 14.8498Z" fill="#E4761B"/>
            <path d="M9.4016 12.3507L8.6516 13.8507L11.3016 14.0007L11.1516 11.0508L9.4016 12.3507Z" fill="#E2761B"/>
            <path d="M14.6016 12.3507L12.8016 10.9988L12.7016 14.0007L15.3516 13.8507L14.6016 12.3507Z" fill="#E2761B"/>
            <path d="M9.59156 16.9998L11.1016 15.9998L9.79156 14.8498L9.59156 16.9998Z" fill="#E2761B"/>
            <path d="M12.9016 15.9998L14.4016 16.9998L14.2016 14.8498L12.9016 15.9998Z" fill="#E2761B"/>
          </svg>
        );
      } else if (data.walletType === 'coinbase') {
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#0052FF" fillOpacity="0.1"/>
            <circle cx="12" cy="12" r="6" fill="#0052FF"/>
          </svg>
        );
      } else { // Primary node
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#627EEA" fillOpacity="0.1"/>
            <path d="M12 4.5L11.9 5.7V15.1L12 15.2L16.1 12.7L12 4.5Z" fill="#627EEA"/>
            <path d="M12 4.5L7.90002 12.7L12 15.2V10.3V4.5Z" fill="#627EEA" fillOpacity="0.8"/>
            <path d="M12 16.5L11.9 16.6V19.7L12 19.9L16.1 14L12 16.5Z" fill="#627EEA"/>
            <path d="M12 19.9V16.5L7.90002 14L12 19.9Z" fill="#627EEA" fillOpacity="0.8"/>
          </svg>
        );
      }
    };

    return (
      <div className={`graph-node-content wallet-node ${chainClass}`}>
        <Handle type="target" position={Position.Top} id="a" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} id="b" style={{ opacity: 0 }} />
        <div className="node-tooltip">{data.fullAddress}</div>
        <div className="node-icon">
          {renderIcon()}
        </div>
        <div className="node-title">{isPrimary ? 'Primary Address' : `${data.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} Wallet`}</div>
        <div className="node-value">{data.label}</div>
        <div className="node-chain">{data.chain}</div>
        {!isPrimary && data.connection && (
          <div className="node-action">
            <button 
              className="disconnect-button" 
              onClick={() => data.onDisconnect(data.connection)}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  };
    const SocialNode = ({ data }) => {
    return (
      <div className="graph-node-content social-node">
        <Handle type="target" position={Position.Top} id="a" style={{ opacity: 0 }} />
        <div className="node-tooltip">Social media connections coming soon</div>
        <div className="node-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#6C5CE7" fillOpacity="0.1"/>
            <path d="M15.6 12.8C16.0418 12.8 16.4 12.4418 16.4 12C16.4 11.5582 16.0418 11.2 15.6 11.2C15.1582 11.2 14.8 11.5582 14.8 12C14.8 12.4418 15.1582 12.8 15.6 12.8Z" fill="#6C5CE7"/>
            <path d="M12 12.8C12.4418 12.8 12.8 12.4418 12.8 12C12.8 11.5582 12.4418 11.2 12 11.2C11.5582 11.2 11.2 11.5582 11.2 12C11.2 12.4418 11.5582 12.8 12 12.8Z" fill="#6C5CE7"/>
            <path d="M8.4 12.8C8.84183 12.8 9.2 12.4418 9.2 12C9.2 11.5582 8.84183 11.2 8.4 11.2C7.95817 11.2 7.6 11.5582 7.6 12C7.6 12.4418 7.95817 12.8 8.4 12.8Z" fill="#6C5CE7"/>
            <path d="M12 18.4C15.5346 18.4 18.4 15.5346 18.4 12C18.4 8.46538 15.5346 5.6 12 5.6C8.46538 5.6 5.6 8.46538 5.6 12C5.6 15.5346 8.46538 18.4 12 18.4Z" stroke="#6C5CE7" strokeWidth="1.5" strokeMiterlimit="10"/>
          </svg>
        </div>
        <div className="node-title">{data.label}</div>
        <div className="node-value future">{data.status}</div>
        <div className="node-action">
          <button className="node-button" onClick={data.onConnect}>Connect</button>
        </div>
      </div>
    );
  };
  
  // Node types configuration for ReactFlow
  const nodeTypes = {
    didNode: DIDNode,
    walletNode: WalletNode,
    socialNode: SocialNode
  };
  // Custom smooth edge component that ensures edges connect directly to nodes
  const CustomEdge = ({ id, source, target, animated, style, data, markerEnd, selected, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) => {
    const edgeType = data?.type || 'default';

    // Use getBezierPath with the actual node positions rather than data.sourceX/Y values
    // This ensures edges connect directly to the nodes rather than floating
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX, 
      targetY,
      sourcePosition: sourcePosition || Position.Bottom,
      targetPosition: targetPosition || Position.Top,
      curvature: 0.15  // Reduced curvature for straighter appearance like in the reference image
    });

    // Get the proper CSS class based on edge type
    let edgeClassName = 'default-edge';
    if (edgeType === 'verified') edgeClassName = 'verified-edge';
    if (edgeType === 'metamask') edgeClassName = 'metamask-edge';
    if (edgeType === 'coinbase') edgeClassName = 'coinbase-edge';
    if (edgeType === 'social') edgeClassName = 'social-edge';

    return (
      <>
        <path
          id={id}
          className={`react-flow__edge-path ${animated ? 'animated' : ''} ${edgeClassName} ${selected ? 'selected' : ''}`}
          d={edgePath}
          style={style}
          markerEnd={markerEnd}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                fontSize: 11,
                pointerEvents: 'all',
                backgroundColor: 'rgba(20, 20, 40, 0.8)',
                padding: '2px 8px',
                borderRadius: '10px',
                color: 'white',
                border: '1px solid rgba(108, 92, 231, 0.3)',
              }}
              className="nodrag nopan edge-label"
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  };

  // Add the custom edge to the edge types
  const edgeTypes = {
    custom: CustomEdge,
  };
  
  // Helper functions for chain information
  const getChainName = (chainId) => {
    const chains = {
      '1': 'Ethereum',
      '5': 'Goerli',
      '11155111': 'Sepolia',
      '56': 'BNB Chain',
      '137': 'Polygon',
      '42161': 'Arbitrum',
      '43114': 'Avalanche',
      '10': 'Optimism',
      '8453': 'Base',
      '84532': 'Base Sepolia',
      '0x1': 'Ethereum',
      '0x5': 'Goerli',
      '0xaa36a7': 'Sepolia',
      '0x38': 'BNB Chain',
      '0x89': 'Polygon',
      '0xa4b1': 'Arbitrum',
      '0xa86a': 'Avalanche',
      '0xa': 'Optimism',
      '0x2105': 'Base',
      '0x14a34': 'Base Sepolia',
    };
    return chains[chainId] || 'Unknown Chain';
  };
  
  const getChainClass = (chainId) => {
    const chainName = getChainName(chainId).toLowerCase().replace(' ', '-');
    return `chain-${chainName}`;
  };
  
  const getChainColor = (chainId) => {
    const chainColors = {
      '1': '#627EEA',
      '5': '#627EEA',
      '11155111': '#627EEA',
      '56': '#F0B90B',
      '137': '#8247E5',
      '42161': '#2D374B',
      '43114': '#E84142',
      '10': '#FF0420',
      '8453': '#0052FF',
      '84532': '#0052FF',
      '0x1': '#627EEA',
      '0x5': '#627EEA',
      '0xaa36a7': '#627EEA',
      '0x38': '#F0B90B',
      '0x89': '#8247E5',
      '0xa4b1': '#2D374B',
      '0xa86a': '#E84142',
      '0xa': '#FF0420',
      '0x2105': '#0052FF',
      '0x14a34': '#0052FF',
    };
    return chainColors[chainId] || '#6C5CE7';
  };
  
  const getChainIcon = (chainId) => {
    const chainName = getChainName(chainId).toLowerCase();
    
    // Simple SVG icons for each chain
    if (chainName.includes('ethereum') || chainName.includes('goerli') || chainName.includes('sepolia')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#627EEA" fillOpacity="0.2"/>
          <path d="M12.373 3v6.652l5.623 2.513L12.373 3z" fill="#627EEA" fillOpacity="0.7"/>
          <path d="M12.373 3L6.75 12.165l5.623-2.512V3z" fill="#627EEA"/>
          <path d="M12.373 16.476v4.52L18 13.212l-5.627 3.264z" fill="#627EEA" fillOpacity="0.7"/>
          <path d="M12.373 20.997v-4.521L6.75 13.212l5.623 7.785z" fill="#627EEA"/>
          <path d="M12.373 15.429l5.623-3.265-5.623-2.511V15.429z" fill="#627EEA" fillOpacity="0.6"/>
          <path d="M6.75 12.165l5.623 3.265V9.654l-5.623 2.51z" fill="#627EEA" fillOpacity="0.8"/>
        </svg>
      );
    } else if (chainName.includes('bnb') || chainName.includes('binance')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#F0B90B" fillOpacity="0.2"/>
          <path d="M12 3.96L14.064 6.024L8.688 11.4L6.624 9.336L12 3.96Z" fill="#F0B90B"/>
          <path d="M15.312 7.272L17.376 9.336L8.688 18.024L6.624 15.96L15.312 7.272Z" fill="#F0B90B"/>
          <path d="M5.376 10.584L7.44 12.648L5.376 14.712L3.312 12.648L5.376 10.584Z" fill="#F0B90B"/>
          <path d="M18.624 10.584L20.688 12.648L12 21.336L9.936 19.272L18.624 10.584Z" fill="#F0B90B"/>
        </svg>
      );
    } else if (chainName.includes('polygon')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#8247E5" fillOpacity="0.2"/>
          <path d="M16.2 9.886C15.779 9.637 15.2691 9.637 14.8244 9.886L12.4256 11.3055L10.7174 12.24L8.35037 13.6595C7.92963 13.9085 7.41968 13.9085 6.97505 13.6595L5.06154 12.5121C4.64079 12.263 4.36632 11.8146 4.36632 11.3181V9.05992C4.36632 8.57521 4.61691 8.12688 5.06154 7.86526L6.96337 6.743C7.38411 6.494 7.89406 6.494 8.33869 6.743L10.2405 7.86526C10.6613 8.11435 10.9357 8.56267 10.9357 9.05992V10.4795L12.644 9.532V8.11435C12.644 7.62964 12.3934 7.18132 11.9488 6.9197L8.33869 4.85248C7.91795 4.60339 7.408 4.60339 6.96337 4.85248L3.30158 6.93223C2.85695 7.18132 2.60636 7.62964 2.60636 8.11435V12.2651C2.60636 12.7498 2.85695 13.1981 3.30158 13.4597L6.97505 15.5269C7.39579 15.776 7.90574 15.776 8.35037 15.5269L10.7174 14.1199L12.4256 13.1729L14.7926 11.7659C15.2134 11.5168 15.7233 11.5168 16.168 11.7659L18.0698 12.8756C18.4905 13.1247 18.765 13.573 18.765 14.0698V16.328C18.765 16.8127 18.5144 17.261 18.0698 17.5226L16.168 18.6574C15.7472 18.9064 15.2373 18.9064 14.7926 18.6574L12.8909 17.5477C12.4701 17.2986 12.1956 16.8503 12.1956 16.353V14.9334L10.4874 15.8809V17.2986C10.4874 17.7833 10.738 18.2316 11.1826 18.4932L14.8444 20.5604C15.2651 20.8095 15.7751 20.8095 16.2197 20.5604L19.8815 18.4932C20.3022 18.2441 20.5767 17.7958 20.5767 17.2986V13.1478C20.5767 12.6631 20.3261 12.2148 19.8815 11.9532L16.2 9.886Z" fill="#8247E5"/>
        </svg>
      );
    } else if (chainName.includes('base')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#0052FF" fillOpacity="0.2"/>
          <path d="M12 4L19.5 8V16L12 20L4.5 16V8L12 4Z" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20V16" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.5 8L12 12L4.5 8" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4.5 16L12 12" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.5 16L12 12" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 4V8" stroke="#0052FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    } else {
      // Generic chain icon
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#6C5CE7" fillOpacity="0.2"/>
          <path d="M7 10H17V14H7V10Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 18H7V6H5V18Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 18H19V6H17V18Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };
  
  return (
    <div className="wallet-connections-container">
      <div className="connections-header">
        <h2>Universal Identity Connections</h2>
        <p className="connections-description">
          Build your cross-chain identity by connecting multiple wallets to your Zybl DID. All connections are secured through cryptographic verification.
        </p>
      </div>        <div className="connections-dashboard">
        <div className="primary-connection-card">
          <div className="primary-connection-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(39, 174, 96, 0.2)"/>
              <path d="M9 12L11 14L15 10" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="primary-connection-details">
            <h3>Primary Zybl DID</h3>
            <div className="primary-did">{shortenAddress(mainDID)}</div>
            <span className="primary-status verified">Verified</span>
          </div>
        </div>

        <div className="primary-address-card">
          <div className="primary-connection-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" fill="rgba(0, 122, 255, 0.2)"/>
              <path d="M8 12H16" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 8H16" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 16H13" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="primary-connection-details">
            <h3>Main Connected Address</h3>
            <div className="primary-address">{shortenAddress(mainAddress)}</div>
            <span className="primary-status connected">Connected</span>
          </div>
        </div>
      </div>      <div className="connection-actions">
        <h3>Connect Wallets</h3>
        <p className="connection-actions-description">
          Connect your crypto wallets to build your cross-chain identity. Your wallet addresses will be securely linked to your DID.
        </p>
        
        {/* Check if both MetaMask and Coinbase are already connected */}
        {connections.some(conn => 
          conn.walletType === 'metamask' && 
          conn.isConnected === true && 
          conn.address.toLowerCase() !== mainAddress.toLowerCase()
        ) && connections.some(conn => 
          conn.walletType === 'coinbase' && 
          conn.isConnected === true && 
          conn.address.toLowerCase() !== mainAddress.toLowerCase()
        ) ? (
          <div className="all-wallets-connected">
            <div className="success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12L10 15L17 8" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>🎉 All supported wallets are connected to your Zybl identity!</p>
          </div>
        ) : (
        <div className="connection-buttons">
          {/* Only show MetaMask connect button if MetaMask is not already connected */}
          {!connections.some(conn => 
            conn.walletType === 'metamask' && 
            conn.isConnected === true && 
            conn.address.toLowerCase() !== mainAddress.toLowerCase()
          ) && (
            <button 
              className={`connect-wallet-btn metamask ${isConnectingWallet && selectedWalletType === 'metamask' ? 'connecting' : ''}`}
              onClick={() => handleConnectWallet('metamask')}
              disabled={isConnectingWallet}
              title="Connect your MetaMask wallet to your Zybl identity"
            >
              <svg width="20" height="20" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09325L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.04183 1L15.0252 10.8431L12.7335 5.09325L2.04183 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="button-text">
                {isConnectingWallet && selectedWalletType === 'metamask' ? (
                  <><div className="loading-spinner"></div> Connecting...</>
                ) : "Connect MetaMask"}
              </span>
            </button>
          )}
          
          {/* Only show Coinbase connect button if Coinbase is not already connected */}
          {!connections.some(conn => 
            conn.walletType === 'coinbase' && 
            conn.isConnected === true && 
            conn.address.toLowerCase() !== mainAddress.toLowerCase()
          ) && (
            <button 
              className={`connect-wallet-btn coinbase ${isConnectingWallet && selectedWalletType === 'coinbase' ? 'connecting' : ''}`}
              onClick={() => handleConnectWallet('coinbase')}
              disabled={isConnectingWallet}
              title="Connect your Coinbase wallet to your Zybl identity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
              </svg>
              <span className="button-text">
                {isConnectingWallet && selectedWalletType === 'coinbase' ? (
                  <><div className="loading-spinner"></div> Connecting...</>
                ) : "Connect Coinbase"}
              </span>
            </button>
          )}
          
          {/* Social button always shown */}
          <button 
            className={`connect-wallet-btn social ${isConnectingWallet && selectedWalletType === 'social' ? 'connecting' : ''}`}
            onClick={() => handleConnectWallet('social')}
            disabled={isConnectingWallet}
            title="Connect your social media accounts (Coming soon)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.58984 13.5098L15.4198 17.4898" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4098 6.50977L8.58984 10.4898" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isConnectingWallet && selectedWalletType === 'social' ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                Connect Social Media
                <span className="future-badge">Coming Soon</span>
              </>
            )}
          </button>
        </div>
        )}
      </div>

      {connectionError && (
        <div className="connection-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ff3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="#ff3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="#ff3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {connectionError}
        </div>
      )}

      {successMessage && (
        <div className="connection-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 12L10 15L17 8" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {successMessage}
        </div>      )}      <div className="connection-graph-container">
        <h3>Connection Graph</h3>
        <div className="react-flow-wrapper">
          {(!mainDID) ? (
            <div className="empty-graph-message">
              <p>DID information is loading...</p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={useMemo(() => nodeTypes, [])}
              edgeTypes={useMemo(() => edgeTypes, [])}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              fitViewOptions={{ padding: 0.3, minZoom: 0.6 }}
              minZoom={0.4}
              maxZoom={1.2}
              defaultZoom={0.8}
              attributionPosition="bottom-left"
              className="connection-graph"
            >
              <Background color="#242444" gap={16} size={1} variant="dots" />
              <Controls showInteractive={false} />
              <Panel position="top-right" className="graph-legend">
                <div className="legend-title">Connection Types</div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#6C5CE7' }}></div>
                  <div className="legend-label">Primary Identity</div>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#E2761B' }}></div>
                  <div className="legend-label">Connected Wallets</div>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>
      </div>

      <div className="active-connections">
        <h3>Active Connections</h3>
        {connections
          .filter(conn => conn.isConnected === true)
          .filter(conn => conn.address.toLowerCase() !== mainAddress.toLowerCase())
          .length === 0 ? (
          <div className="no-connections">
            <p>No wallets connected yet. Use the buttons above to connect your MetaMask or Coinbase wallet.</p>
            <p className="connection-tip">💡 <strong>Tip:</strong> To connect different wallets, make sure to use different accounts in MetaMask and Coinbase Wallet.</p>
          </div>
        ) : (
          <div className="connections-list">
            {connections
              .filter(conn => conn.isConnected === true)
              .filter(conn => conn.address.toLowerCase() !== mainAddress.toLowerCase()) // Exclude main address
              .filter((conn, index, self) => 
                // Remove duplicates based on address + walletType combination
                self.findIndex(c => 
                  c.address === conn.address && 
                  c.walletType === conn.walletType
                ) === index
              )
              .map((connection, index) => (
              <div 
                className={`connection-item ${newConnection === connection.address ? 'new-connection' : ''}`} 
                key={index}
                data-address={connection.address}
              >
                <div className="connection-icon">
                  {connection.walletType === 'metamask' ? (
                    <svg width="24" height="24" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09325L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.04183 1L15.0252 10.8431L12.7335 5.09325L2.04183 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                      <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                    </svg>
                  )}
                </div>
                <div className="connection-info">
                  <div className="connection-type">{connection.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} Wallet</div>
                  <div className="connection-address">{shortenAddress(connection.address)}</div>
                  <div className="connection-details">
                    <span className={`connection-network ${getChainClass(connection.chainId || '1')}`}>
                      {getChainName(connection.chainId || '1')}
                    </span>
                    <span className="connection-time">Connected {connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString() : 'recently'}</span>
                  </div>
                </div>
                <div className="connection-actions">
                  <div className="connection-status-badge connected">
                    {newConnection === connection.address ? 'Recently Added' : 'Connected'}
                  </div>
                  <button 
                    className="disconnect-button" 
                    onClick={() => handleDisconnectWallet(connection)}
                    title="Disconnect wallet"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal for social media future implementation notice */}
      {showSocialMediaNotice && (
        <div className="modal-overlay" onClick={() => setShowSocialMediaNotice(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Coming Soon</h3>
              <button className="modal-close" onClick={() => setShowSocialMediaNotice(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="future-feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.58984 13.5098L15.4198 17.4898" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.4098 6.50977L8.58984 10.4898" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p>Social media connections are planned for a future implementation.</p>
              <p>This feature will allow you to link your social media accounts to your Zybl DID for enhanced identity verification.</p>
              <button className="modal-button" onClick={() => setShowSocialMediaNotice(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for disconnecting wallet */}
      {showDisconnectModal && selectedConnection && (
        <div className="modal-overlay" onClick={() => !isDisconnecting && setShowDisconnectModal(false)}>
          <div className="modal-content disconnect-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Disconnect Wallet</h3>
              <button 
                className="modal-close" 
                onClick={() => !isDisconnecting && setShowDisconnectModal(false)}
                disabled={isDisconnecting}
              >×</button>
            </div>
            <div className="modal-body">
              <div className="disconnect-warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8V12" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16H12.01" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>              <h3>Disconnect Wallet</h3>
              <p>Are you sure you want to disconnect this wallet from your Zybl identity?</p>
              <div className="disconnect-wallet-info">
                <div className="wallet-icon">
                  {selectedConnection?.walletType === 'metamask' ? (
                    <svg width="24" height="24" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09325L32.9582 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.04183 1L15.0252 10.8431L12.7335 5.09325L2.04183 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#0052FF"/>
                      <path d="M12 6.80005C9.20067 6.80005 6.92 9.07738 6.92 11.8734C6.92 14.6694 9.20067 16.9467 12 16.9467C14.7993 16.9467 17.08 14.6694 17.08 11.8734C17.08 9.07738 14.7993 6.80005 12 6.80005ZM12 14.5601C10.5206 14.5601 9.32 13.3621 9.32 11.8867C9.32 10.4114 10.5206 9.21338 12 9.21338C13.4794 9.21338 14.68 10.4114 14.68 11.8867C14.68 13.3621 13.4794 14.5601 12 14.5601Z" fill="white"/>
                    </svg>
                  )}
                </div>
                <div className="wallet-details">
                  <span className="wallet-type">{selectedConnection?.walletType === 'metamask' ? 'MetaMask' : 'Coinbase'} Wallet</span>
                  <span className="wallet-address">{shortenAddress(selectedConnection?.address || '')}</span>
                  <span className={`wallet-chain ${getChainClass(selectedConnection?.chainId || '1')}`}>
                    {getChainName(selectedConnection?.chainId || '1')}
                  </span>
                </div>
              </div>
              <p className="disconnect-note">You can always reconnect this wallet later if needed.</p>
              <div className="modal-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => !isDisconnecting && handleCancelDisconnect()}
                  disabled={isDisconnecting}
                >
                  Cancel
                </button>
                <button 
                  className="disconnect-confirm-button" 
                  onClick={handleConfirmDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Disconnecting...
                    </>
                  ) : 'Disconnect Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnections;
