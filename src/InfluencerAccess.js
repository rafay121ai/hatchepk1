import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InfluencerAccess.css';
import { generateDeviceFingerprint } from './utils/deviceFingerprint';
import { supabase } from './supabaseClient';

// Pre-load guide data and create signed URL in background
async function preloadGuideData(guideId) {
  try {
    // Fetch guide data
    const { data: guide, error } = await supabase
      .from('guides')
      .select('id, title, file_url')
      .eq('id', guideId)
      .maybeSingle();

    if (error || !guide) {
      throw new Error('Failed to fetch guide');
    }

    // Pre-create signed URL if needed
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

    // Store pre-loaded guide data
    sessionStorage.setItem('preloaded_guide_data', JSON.stringify(guide));
    return guide;
  } catch (err) {
    console.error('Pre-load error:', err);
    throw err;
  }
}

function InfluencerAccess() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedCode = code.trim().toLowerCase();  // Convert to lowercase to match database
    
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
      sessionStorage.setItem('influencer_guide_id', data.guideId);
      sessionStorage.setItem('influencer_guide_slug', data.guideSlug);
      sessionStorage.setItem('influencer_guide_title', data.guideTitle);
      sessionStorage.setItem('influencer_name', data.influencerName);
      sessionStorage.setItem('influencer_expires_at', data.expiresAt);

      // PRE-LOAD GUIDE DATA IN BACKGROUND (so it's ready before navigation)
      console.log('⚡ Pre-loading guide data...');
      preloadGuideData(data.guideId).then(() => {
        console.log('✅ Guide pre-loaded, navigating...');
        // Redirect to influencer guide viewer (use slug for clean URLs)
        navigate(`/influencer-guide/${data.guideSlug}`);
      }).catch(err => {
        console.error('⚠️ Pre-load failed, navigating anyway:', err);
        // Navigate even if pre-load fails
        navigate(`/influencer-guide/${data.guideSlug}`);
      });

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

