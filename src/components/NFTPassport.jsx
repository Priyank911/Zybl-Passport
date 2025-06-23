// src/components/NFTPassport.jsx
import React, { useState, useEffect } from 'react';
import { shortenAddress } from '../utils/coinbaseAuthUtils';

const NFTPassport = ({ userData }) => {
  // Always show the NFT to match the screenshot
  const [hasNFT] = useState(true);
  const [nftData] = useState({
    id: "1594",
    name: "Zybl Passport Verification Badge",
    issueDate: "20/6/2025",
    walletAddress: userData?.address || "0x9d666a5da996735e5ec29d86f87fab74ee0c2506",
    type: "Soulbound",
    network: "Ethereum Mainnet",
    attributes: [
      { trait_type: "Verification Level", value: "Verified" },
      { trait_type: "Zybl Score", value: 95 },
      { trait_type: "Token", value: "SBT" }
    ]
  });
  
  // Simple version that matches the screenshot
  if (!hasNFT) {
    return (
      <div className="nft-passport empty">
        <div className="no-nft-message">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No Passport NFT Found</h3>
          <p>Complete the verification and payment process to mint your Zybl Passport NFT.</p>
        </div>
      </div>
    );
  }
    return (
    <div className="nft-passport-container">
      <div className="nft-passport-inner">
        {/* Main content */}
        <div className="nft-passport">
          <div className="nft-header">
            <div className="nft-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#0052FF"/>
                <path d="M7 11.5L10.5 15L17 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Zybl Passport</span>
            </div>
            <div className="nft-badge">Verified</div>
          </div>
          
          <div className="nft-image">
            <div className="nft-avatar">Z</div>
          </div>
          
          <div className="nft-details">
            <h3>Zybl Passport Verification Badge</h3>
            <div className="nft-id">#{nftData?.id}</div>
            <div className="nft-info">
              <div className="info-item">
                <span className="info-label">Issued</span>
                <span className="info-value">{nftData?.issueDate}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Type</span>
                <span className="info-value">{nftData?.type}</span>
              </div>
            </div>
          </div>        </div>
      </div>
    </div>
  );
};

export default NFTPassport;
