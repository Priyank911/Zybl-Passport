import React from 'react';
import '../styles/CallToAction.css';

const CallToAction = () => {
  return (    <section className="cta-section animate-section">
      <div className="cta-container">
        <div className="cta-content animate-item">
          <h2 className="cta-title">Build Bot-Resistant dApps with PoPaaS</h2>
          <p className="cta-description">
            Join the growing ecosystem of Web3 projects using PoPaaS for human verification and Zybl resistance.
            Start building truly decentralized, bot-resistant applications today.
          </p>
          <div className="cta-buttons">
            <a href="/developers" className="cta-button primary">Start Building</a>
            <a href="/docs" className="cta-button secondary">View Documentation</a>
          </div>
        </div>
        
        <div className="cta-graphic animate-item">
          <svg width="280" height="280" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
            <path d="M12 2C13.3132 2 14.6136 2.25866 15.8268 2.7612C17.0401 3.26375 18.1425 4.00035 19.0711 4.92893C19.9997 5.85752 20.7362 6.95991 21.2388 8.17317C21.7413 9.38642 22 10.6868 22 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
