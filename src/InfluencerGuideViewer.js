import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { generateDeviceFingerprint } from './utils/deviceFingerprint';
import SecureGuideViewer from './SecureGuideViewer';
import './InfluencerGuideViewer.css';

function InfluencerGuideViewer() {
  const { guideSlug } = useParams();
  const navigate = useNavigate();
  const [sessionVerified, setSessionVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guideData, setGuideData] = useState(null);
  const [influencerInfo, setInfluencerInfo] = useState(null);

  useEffect(() => {
    verifyInfluencerSession();
    
    // Set up heartbeat to keep session alive
    const heartbeatInterval = setInterval(() => {
      verifyInfluencerSession();
    }, 60000); // Every 1 minute

    return () => clearInterval(heartbeatInterval);
  }, [guideSlug]);

  const verifyInfluencerSession = async () => {
    try {
      const sessionToken = sessionStorage.getItem('influencer_session_token');
      const deviceFingerprint = sessionStorage.getItem('influencer_device_fp');
      const storedGuideId = sessionStorage.getItem('influencer_guide_id');
      const influencerName = sessionStorage.getItem('influencer_name');
      const expiresAt = sessionStorage.getItem('influencer_expires_at');

      // Check if session data exists
      if (!sessionToken || !deviceFingerprint || !storedGuideId) {
        console.log('❌ No session data found');
        navigate('/influencer-access');
        return;
      }

      // Call verification API
      const response = await fetch('/api/influencer/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          deviceFingerprint: deviceFingerprint
        })
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        console.log('❌ Session invalid');
        sessionStorage.clear();
        setError(data.error || 'Your access has expired or is invalid');
        setTimeout(() => {
          navigate('/influencer-access');
        }, 3000);
        return;
      }

      console.log('✅ Session verified');

      // Set influencer info for badge
      setInfluencerInfo({
        name: influencerName,
        expiresAt: expiresAt
      });

      // Fetch guide data from Supabase by ID (most reliable)
      console.log('🔍 Fetching guide with ID:', storedGuideId);
      
      const { data: guideData, error: guideError } = await supabase
        .from('guides')
        .select('*')
        .eq('id', storedGuideId)
        .maybeSingle();

      console.log('📊 Guide found:', guideData);
      console.log('📊 Error:', guideError);

      if (guideError || !guideData) {
        console.error('❌ Error fetching guide:', guideError);
        console.error('📋 Guide ID searched:', storedGuideId);
        
        setError('Guide not found in database.');
        setLoading(false);
        return;
      }

      console.log('✅ Guide loaded:', guideData.title);

      setGuideData(guideData);
      setSessionVerified(true);
      setLoading(false);

    } catch (error) {
      console.error('❌ Verification error:', error);
      setError('Unable to verify your access. Please try again.');
      setLoading(false);
      setTimeout(() => {
        navigate('/influencer-access');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="influencer-viewer-loading">
        <div className="influencer-spinner"></div>
        <p>Verifying your access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="influencer-viewer-error">
        <div className="error-icon">⚠️</div>
        <h2>Access Error</h2>
        <p>{error}</p>
        <p className="error-redirect">Redirecting you to the access page...</p>
      </div>
    );
  }

  if (!sessionVerified || !guideData) {
    return null;
  }

  return (
    <div className="influencer-guide-viewer">
      {/* Influencer Badge */}
      <div className="influencer-badge">
        <div className="influencer-badge-content">
          <img src="/HATCHE800.png" alt="Hatche" className="influencer-badge-logo" />
          <div className="influencer-badge-text">
            <div className="influencer-badge-title">Influencer Preview</div>
            {influencerInfo && (
              <div className="influencer-badge-name">{influencerInfo.name}</div>
            )}
          </div>
        </div>
        <div className="influencer-badge-expires">
          Expires: {new Date(influencerInfo?.expiresAt).toLocaleDateString()}
        </div>
      </div>

      {/* Use existing SecureGuideViewer component */}
      <SecureGuideViewer 
        guideData={guideData}
        isInfluencer={true}
      />

      {/* Watermark overlay */}
      <div className="influencer-watermark">INFLUENCER PREVIEW - NOT FOR DISTRIBUTION</div>
    </div>
  );
}

export default InfluencerGuideViewer;

