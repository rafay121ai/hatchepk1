import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
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

  // INSTANT LOAD - Use pre-loaded data from InfluencerAccess
  const loadGuideQuick = useCallback(async () => {
    try {
      const sessionToken = sessionStorage.getItem('influencer_session_token');
      const deviceFingerprint = sessionStorage.getItem('influencer_device_fp');
      const storedGuideId = sessionStorage.getItem('influencer_guide_id');
      const influencerName = sessionStorage.getItem('influencer_name');
      const expiresAt = sessionStorage.getItem('influencer_expires_at');

      // Quick validation
      if (!sessionToken || !deviceFingerprint || !storedGuideId) {
        navigate('/influencer-access');
        return;
      }

      // Set UI state immediately
      setInfluencerInfo({
        name: influencerName,
        expiresAt: expiresAt
      });

      // CHECK IF DATA WAS PRE-LOADED (instant!)
      const preloadedData = sessionStorage.getItem('preloaded_guide_data');
      
      if (preloadedData) {
        console.log('⚡ Using pre-loaded guide data (instant!)');
        const guide = JSON.parse(preloadedData);
        
        setGuideData(guide);
        setSessionVerified(true);
        setLoading(false);
        return;
      }

      // Fallback: Fetch if not pre-loaded
      console.log('📥 Fetching guide data (not pre-loaded)');
      const { data: guide, error: guideError } = await supabase
        .from('guides')
        .select('id, title, file_url')
        .eq('id', storedGuideId)
        .maybeSingle();

      if (guideError || !guide) {
        setError('Guide not found.');
        setLoading(false);
        return;
      }

      // Create signed URL if needed
      if (!guide.file_url.includes("token=")) {
        let filePath = guide.file_url;
        
        if (filePath.includes('/storage/v1/object/public/guides/')) {
          filePath = filePath.split('/storage/v1/object/public/guides/')[1];
        } else if (filePath.includes('guides/')) {
          const parts = filePath.split('guides/');
          filePath = parts[parts.length - 1].split('?')[0];
        }

        try {
          filePath = decodeURIComponent(filePath);
        } catch (e) {
          // Already decoded
        }

        const { data: signed, error: signErr } = await supabase.storage
          .from("guides")
          .createSignedUrl(filePath, 3600);

        if (!signErr && signed) {
          guide.file_url = signed.signedUrl;
        }
      }

      setGuideData(guide);
      setSessionVerified(true);
      setLoading(false);

    } catch (error) {
      setError('Unable to load guide.');
      setLoading(false);
    }
  }, [navigate]);

  // Background session verification (doesn't affect initial load)
  const verifySessionInBackground = useCallback(async () => {
    try {
      const sessionToken = sessionStorage.getItem('influencer_session_token');
      const deviceFingerprint = sessionStorage.getItem('influencer_device_fp');

      if (!sessionToken || !deviceFingerprint) {
        return;
      }

      // Verify session silently in background
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
        console.log('❌ Background verification failed - session invalid');
        sessionStorage.clear();
        setError('Your access has expired');
        setTimeout(() => {
          navigate('/influencer-access');
        }, 2000);
      } else {
        console.log('✅ Background verification passed');
      }

    } catch (error) {
      console.error('⚠️ Background verification error:', error);
      // Don't interrupt user experience for background check failures
    }
  }, [navigate]);

  useEffect(() => {
    // Fast initial load - skip API verification, just load guide
    loadGuideQuick();
    
    // Set up heartbeat to verify session periodically (not on initial load)
    const heartbeatInterval = setInterval(() => {
      verifySessionInBackground();
    }, 60000); // Every 1 minute

    return () => clearInterval(heartbeatInterval);
  }, [guideSlug, loadGuideQuick, verifySessionInBackground]);

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

