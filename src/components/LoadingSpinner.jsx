import React from 'react';
import './LoadingSpinner.css';

export const LoadingSpinner = ({ 
  size = 'md', 
  message = '',
  fullScreen = false 
}) => (
  <div className={`loading-container ${fullScreen ? 'fullscreen' : ''} loading-${size}`}>
    <div className="spinner" role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
    {message && <p className="loading-message">{message}</p>}
  </div>
);
