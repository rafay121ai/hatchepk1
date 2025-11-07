import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InfluencerAccess.css';
import { generateDeviceFingerprint } from './utils/deviceFingerprint';

function InfluencerAccess() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Please enter an access code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();
      console.log('🔑 Generated device fingerprint');

      // Call validation API
      const response = await fetch('/api/influencer/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: trimmedCode,
          deviceFingerprint: deviceFingerprint
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      console.log('✅ Code validated successfully');

      // Store session data in sessionStorage
      sessionStorage.setItem('influencer_session_token', data.sessionToken);
      sessionStorage.setItem('influencer_device_fp', deviceFingerprint);
      sessionStorage.setItem('influencer_guide_title', data.guideTitle);
      sessionStorage.setItem('influencer_name', data.influencerName);
      sessionStorage.setItem('influencer_expires_at', data.expiresAt);

      // Redirect to influencer guide viewer (use encoded title in URL)
      navigate(`/influencer-guide/${encodeURIComponent(data.guideTitle)}`);

    } catch (error) {
      console.error('❌ Access error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="influencer-access-page">
      <div className="influencer-access-container">
        <div className="influencer-logo">
          <img src="/HATCHE800.png" alt="Hatche" className="influencer-logo-img" />
        </div>
        
        <h2>Influencer Access</h2>
        <p className="influencer-subtitle">Enter your exclusive access code below</p>

        {error && (
          <div className="influencer-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="influencer-form">
          <div className="influencer-form-group">
            <label htmlFor="access-code">Access Code</label>
            <input 
              type="text" 
              id="access-code" 
              name="access-code" 
              placeholder="Enter your code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              required
              autoComplete="off"
              spellCheck="false"
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="influencer-submit-btn"
            disabled={loading}
          >
            {loading ? 'Validating...' : 'Access Guide'}
          </button>
        </form>

        {loading && (
          <div className="influencer-loading">
            <div className="influencer-spinner"></div>
            <p>Validating your access...</p>
          </div>
        )}

        <div className="influencer-footer">
          <p>This is a private access page for Hatche influencers.</p>
          <p>Need help? Contact us at <a href="mailto:hello@hatchepk.com">hello@hatchepk.com</a></p>
        </div>
      </div>
    </div>
  );
}

export default InfluencerAccess;

