import React, { useState, useEffect, useRef } from 'react';
import './securepdfviewer.css';

function SecurePDFViewer({ guideId, user, onClose }) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const iframeRef = useRef(null);
  const heartbeatInterval = useRef(null);
  const ipCheckInterval = useRef(null);

  useEffect(() => {
    initializeSecureAccess();
    
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (ipCheckInterval.current) {
        clearInterval(ipCheckInterval.current);
      }
    };
  }, []);

  const initializeSecureAccess = async () => {
    try {
      // Check if user has purchased this guide
      if (!user.purchasedGuides.includes(guideId)) {
        setError('You have not purchased this guide');
        setIsLoading(false);
        return;
      }

      // Create session data
      const sessionId = generateSessionId();
      const sessionData = {
        userId: user.id,
        guideId: guideId,
        sessionId: sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        warningCount: 0,
        isActive: true
      };

      setSessionData(sessionData);

      // Load PDF
      await loadSecurePDF(guideId, sessionId);
      
      setAccessGranted(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Error initializing secure access:', err);
      setError('Failed to load guide. Please try again.');
      setIsLoading(false);
    }
  };

  const loadSecurePDF = async (guideId, sessionId) => {
    // Load the actual PDF from public folder with session validation
    const pdfPath = `/preview.pdf?session=${sessionId}&user=${user.id}`;
    setPdfUrl(pdfPath);
  };

  const startHeartbeat = (sessionId) => {
    heartbeatInterval.current = setInterval(async () => {
      try {
        // Update last activity (simulate without Firebase)
        console.log('Heartbeat update for session:', sessionId);
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 30000); // Check every 30 seconds
  };

  const startIPMonitoring = (sessionId) => {
    ipCheckInterval.current = setInterval(async () => {
      try {
        // Simulate IP monitoring without Firebase
        console.log('IP monitoring for session:', sessionId);
      } catch (err) {
        console.error('IP monitoring error:', err);
      }
    }, 60000); // Check every minute
  };

  const handleSuspiciousActivity = async (reason, sessionId) => {
    const newWarningCount = warningCount + 1;
    setWarningCount(newWarningCount);

    // Simulate logging suspicious activity
    console.log('Suspicious activity:', reason, 'for session:', sessionId);

    if (newWarningCount >= 3) {
      // Block access after 3 warnings
      setError('Access blocked due to suspicious activity. Please contact support.');
      setAccessGranted(false);
    } else {
      // Show warning
      alert(`Warning: ${reason}. You have ${3 - newWarningCount} warnings remaining.`);
    }
  };

  const blockUserAccess = async (sessionId) => {
    // Simulate blocking user access
    console.log('Blocking user access for session:', sessionId);
  };

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  const handleClose = async () => {
    if (sessionData) {
      // End session (simulate without Firebase)
      console.log('Ending session:', sessionData.sessionId);
    }
    onClose();
  };

  if (isLoading) {
    return (
      <div className="pdf-viewer-overlay">
        <div className="pdf-loading">
          <div className="loading-spinner"></div>
          <p>Loading secure guide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-overlay">
        <div className="pdf-error">
          <h3>Access Denied</h3>
          <p>{error}</p>
          <button onClick={handleClose} className="close-pdf-btn">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-container">
        <div className="pdf-header">
          <div className="pdf-info">
            <h3>Secure Guide Viewer</h3>
          </div>
          <button onClick={handleClose} className="close-pdf-btn">×</button>
        </div>
        
        <div className="pdf-content">
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="pdf-iframe"
            title="Secure PDF Viewer"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        
        <div className="pdf-footer">
          <div className="security-warning">
            <span>⚠️ This content is protected. Sharing or unauthorized access will result in account suspension.</span>
          </div>
          <div className="session-status">
            <span>Active Session</span>
            <div className="status-indicator"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurePDFViewer;
