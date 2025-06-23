import React from 'react';
import '../styles/Features.css';

const Features = () => {
  return (    <section className="features-section animate-section" id="features">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-title">PoPaaS Core Features</h2>
          <p className="features-subtitle">
            A comprehensive suite of tools for human verification and Zybl resistance across multiple blockchains
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card animate-item">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.2399 7.76001L14.1199 14.12L7.75991 16.24L9.87991 9.88001L16.2399 7.76001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Biometric Verification</h3>
            <p className="feature-description">
              AI-powered face and voice recognition combined with behavioral pattern analysis for accurate human verification
            </p>
          </div>

          <div className="feature-card animate-item">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12H22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Cross-Chain Support</h3>
            <p className="feature-description">
              Seamless integration with Ethereum, Optimism, Base, Solana, and Bitcoin through privacy-preserving ZK-DIDs
            </p>
          </div>

          <div className="feature-card animate-item">            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Soulbound NFTs</h3>
            <p className="feature-description">
              Non-transferable identity credentials that can be reused across dApps to reduce verification friction
            </p>
          </div>

          <div className="feature-card animate-item">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.7 6.3C14.5132 6.11327 14.2595 6.00687 14 6.00687C13.7405 6.00687 13.4868 6.11327 13.3 6.3L9.3 10.3C9.11327 10.4868 9.00687 10.7405 9.00687 11C9.00687 11.2595 9.11327 11.5132 9.3 11.7C9.48674 11.8867 9.74047 11.9931 10 11.9931C10.2595 11.9931 10.5133 11.8867 10.7 11.7L14.7 7.7C14.8867 7.51326 14.9931 7.25953 14.9931 7C14.9931 6.74047 14.8867 6.48674 14.7 6.3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.15 18.6426L4.34835 9.33925C4.25626 9.0675 4.24194 8.77552 4.30718 8.49584C4.37242 8.21615 4.51459 7.9605 4.7178 7.75732L8.30064 4.17449C8.7045 3.77062 9.34343 3.77062 9.74729 4.17449L11.8255 6.25272C11.9428 6.37 12.1066 6.43703 12.2771 6.43703C12.4475 6.43703 12.6113 6.37 12.7286 6.25272L14.8068 4.17449C15.2107 3.77062 15.8496 3.77062 16.2535 4.17449L19.8363 7.75732C20.0395 7.9605 20.1817 8.21615 20.2469 8.49584C20.3122 8.77552 20.2978 9.0675 20.2058 9.33925L17.4041 18.6426C17.3039 18.9373 17.1113 19.1935 16.8549 19.3742C16.5985 19.555 16.2914 19.652 15.9762 19.6514H8.57795C8.26279 19.652 7.95566 19.555 7.69926 19.3742C7.44286 19.1935 7.25033 18.9373 7.15 18.6426Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Lightweight SDK</h3>
            <p className="feature-description">
              Easy integration with a simple verifyHuman(wallet) function for quick implementation in any dApp
            </p>
          </div>

          <div className="feature-card animate-item">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Dynamic Scoring</h3>
            <p className="feature-description">
              Real-time Zybl Score (0-100) that adapts based on user behavior and verification methods
            </p>
          </div>

          <div className="feature-card animate-item">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6H14C16.2091 6 18 7.79086 18 10V18C18 20.2091 16.2091 22 14 22H10C7.79086 22 6 20.2091 6 18V10C6 7.79086 7.79086 6 10 6Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 2H14V6H10V2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14V14.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="feature-title">Revenue Sharing</h3>
            <p className="feature-description">
              Automated revenue distribution through x402pay and CDP Wallet integration for all ecosystem participants
            </p>
          </div>
        </div>

        <div className="features-highlight">
          <div className="highlight-content">
            <h3>Build Bot-Resistant Ecosystems</h3>
            <p>
              PoPaaS provides the foundation for building truly decentralized, bot-resistant, and revenue-generating ecosystems. 
              From gaming to governance, our platform ensures real human participation while maintaining privacy and security.
            </p>
            <a href="/developers" className="highlight-link">
              Start Building with PoPaaS
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          <div className="highlight-visual">
            <div className="highlight-shape"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
