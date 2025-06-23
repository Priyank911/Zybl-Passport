// src/components/ActivityFeed.jsx
import React, { useState, useEffect } from 'react';

// Move sampleActivities outside the component to avoid recreating it on every render
const sampleActivities = [
  {
    id: 1,
    type: 'verification',
    title: 'Verification Completed',
    description: 'Your identity was successfully verified',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    icon: 'check'
  },
  {
    id: 2,
    type: 'payment',
    title: 'Payment Successful',
    description: 'You made a payment of 2.00 USDC',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    icon: 'payment'
  },
  {
    id: 3,
    type: 'wallet',
    title: 'Wallet Connected',
    description: 'You connected your Coinbase Wallet',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    icon: 'wallet'
  }
];

const ActivityFeed = ({ activities = [] }) => {
  const [feed, setFeed] = useState([]);
  
  useEffect(() => {
    if (activities.length === 0) {
      setFeed(sampleActivities);
    } else {
      setFeed(activities);
    }
  }, [activities]);
  
  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? 'yesterday' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
      return 'just now';
    }
  };
  
  // Render different icons based on activity type
  const renderIcon = (type) => {
    switch (type) {
      case 'verification':
        return (
          <div className="activity-icon verification">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'payment':
        return (
          <div className="activity-icon payment">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15C13.1046 15 14 14.1046 14 13C14 11.8954 13.1046 11 12 11C10.8954 11 10 11.8954 10 13C10 14.1046 10.8954 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'wallet':
        return (
          <div className="activity-icon wallet">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="activity-icon default">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
    }
  };
    return (
    <div className="feed-content">
      {feed.length > 0 ? (
        <div className="feed-items">
          {feed.map((activity) => (
            <div key={activity.id} className={`feed-item ${activity.type}`}>
              {renderIcon(activity.type)}
              <div className="activity-content">
                <div className="activity-header">
                  <h4>{activity.title}</h4>
                  <span className="activity-time">{getRelativeTime(activity.timestamp)}</span>
                </div>
                <p className="activity-description">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-activity">
          <p>No recent activity to display</p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
