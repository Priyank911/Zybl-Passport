import React from 'react';
import '../styles/VerificationPopup.css';

const SuccessIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#10b981"/>
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const VerificationPopup = ({ 
  isOpen, 
  onClose, 
  existingFace, 
  onProceedToDashboard 
}) => {
  if (!isOpen) return null;

  const similarityPercent = existingFace ? Math.round(existingFace.similarity * 100) : 95;
  const lastVerified = existingFace?.timestamp ? new Date(existingFace.timestamp).toLocaleDateString() : 'Recently';

  return (
    <div className="verification-popup-overlay">
      <div className="verification-popup">
        <div className="popup-header">
          <div className="success-icon">
            <SuccessIcon />
          </div>
          <h2>Identity Verified!</h2>
          <p>Welcome back! Your biometric authentication is already complete.</p>
        </div>

        <div className="popup-content">
          <div className="verification-details">
            <div className="detail-row">
              <div className="detail-icon">
                <ShieldIcon />
              </div>
              <div className="detail-info">
                <span className="detail-label">Face Match Confidence</span>
                <span className="detail-value">{similarityPercent}%</span>
              </div>
            </div>
              <div className="detail-row">
              <div className="detail-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="detail-info">
                <span className="detail-label">Last Verification</span>
                <span className="detail-value">{lastVerified}</span>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                </svg>
              </div>
              <div className="detail-info">
                <span className="detail-label">Status</span>
                <span className="detail-value status-verified">Verified</span>
              </div>
            </div>
          </div>          <div className="security-notice">
            <div className="notice-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#f59e0b"/>
              </svg>
            </div>
            <p>Your biometric data is securely encrypted and stored. No additional verification needed.</p>
          </div>
        </div>

        <div className="popup-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
          >
            Verify Again
          </button>
          <button 
            className="btn-primary" 
            onClick={onProceedToDashboard}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPopup;
