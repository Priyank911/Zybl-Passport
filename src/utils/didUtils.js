// didUtils.js - Utilities for handling Decentralized Identifiers (DIDs)
import { ethers } from 'ethers';

/**
 * Generate a DID using a wallet address and additional entropy
 * Format: did:zybl:{method-specific-id}
 * 
 * @param {string} address - User's wallet address
 * @param {Object} additionalData - Additional data to include in the DID generation
 * @returns {Object} - DID object with various properties
 */
export const generateDID = (address, additionalData = {}) => {
  if (!address) {
    throw new Error('Address is required to generate a DID');
  }

  // Create a unique identifier by hashing the address with additional data
  const timestamp = additionalData.timestamp || new Date().toISOString();
  const entropy = additionalData.entropy || Math.random().toString(36).substring(2);
  const verificationScore = additionalData.verificationScore || 95;
  
  // Create a combined string to hash
  const baseString = `${address.toLowerCase()}-${timestamp}-${entropy}`;
  
  // Hash the combined string to create a unique identifier
  const methodSpecificId = ethers.utils.id(baseString).substring(2, 42);
  
  // Format as a proper DID
  const did = `did:zybl:${methodSpecificId}`;
  
  // Create attributes for the DID
  const attributes = [
    {
      trait_type: "Verification Level",
      value: verificationScore >= 90 ? "Verified" : verificationScore >= 70 ? "Partial" : "Basic"
    },
    {
      trait_type: "Zybl Score",
      value: verificationScore
    },
    {
      trait_type: "Token",
      value: "SBT"
    },
    {
      trait_type: "Chain",
      value: additionalData.network || "Ethereum"
    }
  ];

  // Create a complete DID document
  return {
    id: did,
    controller: address,
    created: timestamp,
    updated: timestamp,
    verificationMethod: [
      {
        id: `${did}#keys-1`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: did,
        blockchainAccountId: `eip155:1:${address}`
      }
    ],
    authentication: [`${did}#keys-1`],
    attributes,
    displayName: `Zybl Passport #${methodSpecificId.substring(0, 4)}`,
    shortId: methodSpecificId.substring(0, 8),
    network: additionalData.network || "Ethereum"
  };
};

/**
 * Verify a DID document is valid and belongs to the controller
 * 
 * @param {Object} didDocument - DID document to verify
 * @param {string} controllerAddress - Wallet address that should control this DID
 * @returns {boolean} - True if the DID is valid and controlled by the address
 */
export const verifyDID = (didDocument, controllerAddress) => {
  if (!didDocument || !controllerAddress) return false;
  
  // Check controller matches
  const normalizedController = controllerAddress.toLowerCase();
  const normalizedDocController = didDocument.controller.toLowerCase();
  
  return normalizedDocController === normalizedController;
};

/**
 * Create a formatted display version of the DID for UI
 * 
 * @param {Object} didDocument - DID document
 * @param {number} currentZyblScore - Current Zybl Score (optional, overrides DID document score)
 * @returns {Object} - Formatted DID info for display
 */
export const formatDIDForDisplay = (didDocument, currentZyblScore = null) => {
  if (!didDocument) return null;
  
  // Get verification level from attributes
  const verificationLevel = didDocument.attributes.find(
    attr => attr.trait_type === "Verification Level"
  )?.value || "Unverified";
    // Get Zybl score - use current score if provided, otherwise fall back to DID document
  const zyblScore = currentZyblScore !== null ? currentZyblScore : (didDocument.attributes.find(
    attr => attr.trait_type === "Zybl Score"
  )?.value || 0);
  
  // Parse date for better display
  const issuedDate = new Date(didDocument.created).toLocaleDateString();
  
  return {
    id: didDocument.id,
    shortId: didDocument.shortId || didDocument.id.split(':').pop().substring(0, 8),
    displayName: didDocument.displayName || `Zybl ID #${didDocument.id.split(':').pop().substring(0, 4)}`,
    verificationLevel,
    zyblScore,
    issued: issuedDate,
    network: didDocument.network || "Ethereum",
    controller: didDocument.controller,
    attributes: didDocument.attributes
  };
};