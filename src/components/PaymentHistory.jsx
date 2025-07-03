// Payment History Component for X402 Protocol
// src/components/PaymentHistory.jsx

import React, { useState, useEffect } from 'react';
import '../styles/PaymentHistory.css';

const PaymentHistory = ({ userId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchPaymentHistory();
    }
  }, [userId]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      
      // Get user data from localStorage for wallet address
      const userData = JSON.parse(localStorage.getItem('zybl_user_data'));
      
      if (!userData || !userData.address) {
        setError('User wallet address not found');
        setLoading(false);
        return;
      }
      
      // Check current payment status
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userData.address,
          userId: userId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.transaction) {
          setPayments([{
            id: result.transaction.hash,
            hash: result.transaction.hash,
            amount: result.transaction.amount,
            currency: 'USDC',
            network: 'Base Sepolia',
            status: 'Confirmed',
            timestamp: result.transaction.timestamp || new Date().toISOString(),
            explorerUrl: result.transaction.explorerUrl,
            from: result.transaction.from,
            to: result.transaction.to,
            blockNumber: result.transaction.blockNumber
          }]);
        } else {
          setPayments([]);
        }
      } else if (response.status === 402) {
        // Payment required - no payment history
        setPayments([]);
      } else {
        throw new Error('Failed to fetch payment history');
      }
      
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'success':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="payment-history-loading">
        <div className="loading-spinner"></div>
        <p>Loading payment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-history-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={fetchPaymentHistory} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="payment-history">
      <div className="payment-history-header">
        <div className="payment-stats">
          <div className="stat-item">
            <div className="stat-label">Total Payments</div>
            <div className="stat-value">{payments.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Amount</div>
            <div className="stat-value">
              {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)} USDC
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Network</div>
            <div className="stat-value">Base Sepolia</div>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="no-payments">
          <div className="no-payments-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3>No Payment History</h3>
          <p>Complete your first X402 payment to see transaction history here.</p>
        </div>
      ) : (
        <div className="payment-list">
          {payments.map((payment) => (
            <div key={payment.id} className="payment-item">
              <div className="payment-main">
                <div className="payment-info">
                  <div className="payment-amount">
                    <span className="amount">{payment.amount} {payment.currency}</span>
                    <span 
                      className="status"
                      style={{ color: getStatusColor(payment.status) }}
                    >
                      {payment.status}
                    </span>
                  </div>
                  <div className="payment-details">
                    <div className="detail-item">
                      <span className="label">Transaction Hash:</span>
                      <span className="value">
                        {payment.explorerUrl ? (
                          <a 
                            href={payment.explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="explorer-link"
                          >
                            {formatAddress(payment.hash)}
                          </a>
                        ) : (
                          formatAddress(payment.hash)
                        )}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Date:</span>
                      <span className="value">{formatDate(payment.timestamp)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Network:</span>
                      <span className="value">{payment.network}</span>
                    </div>
                    {payment.blockNumber && (
                      <div className="detail-item">
                        <span className="label">Block:</span>
                        <span className="value">#{payment.blockNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="payment-actions">
                  {payment.explorerUrl && (
                    <a 
                      href={payment.explorerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-transaction-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
