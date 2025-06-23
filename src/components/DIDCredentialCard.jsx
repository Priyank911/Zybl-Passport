// src/components/DIDCredentialCard.jsx
import React, { useState } from 'react';
import { formatDIDForDisplay } from '../utils/didUtils';
import '../styles/DIDCredential.css';

/**
 * DID Credential Card Component
 * Displays a user's DID credential in a professional card format
 */
const DIDCredentialCard = ({ didDocument, size = 'normal', showActions = false, currentZyblScore = null }) => {
  const [copied, setCopied] = useState(false);

  // If no DID document is provided
  if (!didDocument) {
    return (
      <div className={`did-credential-card ${size} empty`}>
        <div className="no-did-message">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No DID Credential Found</h3>
          <p>Complete the verification and payment process to obtain your Zybl DID credential.</p>
        </div>
      </div>
    );
  }
  // Format DID for display
  const displayDID = formatDIDForDisplay(didDocument, currentZyblScore);
  
  // Get verification status
  const verificationLevel = displayDID.verificationLevel;
  const isVerified = verificationLevel === 'Verified';
  const zyblScore = displayDID.zyblScore;
  
  // Get first character for avatar
  const avatarChar = displayDID.shortId.substring(0, 1).toUpperCase();
  
  return (
    <div className={`did-credential-card ${size}`}>
      <div className="did-header">
        <div className="did-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#0052FF"/>
            <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Zybl DID</span>
        </div>
        <div className={`did-badge ${isVerified ? 'verified' : 'partial'}`}>
          {verificationLevel}
        </div>
      </div>
      
      <div className="did-body">
        <div className="did-avatar">
          <span>{avatarChar}</span>
        </div>
        
        <div className="did-details">
          <h3>{displayDID.displayName}</h3>
          <div className="did-id">{displayDID.id}</div>
        </div>
      </div>
      
      <div className="did-info">
        <div className="info-item">
          <span className="info-label">ISSUED</span>
          <span className="info-value">{displayDID.issued}</span>
        </div>
        <div className="info-item">
          <span className="info-label">NETWORK</span>
          <span className="info-value">{displayDID.network}</span>
        </div>
        <div className="info-item">          <span className="info-label">ZYBL_SCORE</span>
          <span className="info-value score">{zyblScore}%</span>
        </div>
        <div className="info-item">
          <span className="info-label">TYPE</span>
          <span className="info-value">Soulbound</span>
        </div>
      </div>
      
      {size === 'large' && (
        <div className="did-attributes">
          <h4>Attributes</h4>
          <div className="attributes-list">
            {displayDID.attributes.map((attr, index) => (
              <div className="attribute-item" key={index}>
                <span className="attribute-label">{attr.trait_type}</span>
                <span className="attribute-value">{attr.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showActions && (
        <div className="did-actions">
          <button 
            className="secondary-button"
            onClick={() => {
              navigator.clipboard.writeText(displayDID.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DIDCredentialCard;
