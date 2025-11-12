import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './SecureGuideViewer.css';

export default function SecureGuideViewer({ guideId, user, onClose, guideData, isInfluencer = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const deviceIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  const initRef = useRef(false);

  const generateDeviceFingerprint = useCallback(() => {
    try {
      const fp = {
        ua: navigator.userAgent,
        lang: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`
      };
      return btoa(JSON.stringify(fp)).substring(0, 100);
    } catch {
      return `fallback_${Date.now()}`;
    }
  }, []);

  const getClientIP = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }, []);

  const ensurePurchaseRecord = useCallback(async (gId, usr) => {
    try {
      const ipAddress = await getClientIP();
      await supabase.from('purchases').upsert({
        user_id: usr.id,
        guide_id: gId,
        device_id: deviceIdRef.current,
        ip_address: ipAddress,
        purchased_at: new Date().toISOString()
      }, { onConflict: 'user_id,guide_id' });
    } catch (err) {
      console.error('Purchase record error:', err);
    }
  }, [getClientIP]);

  const verifyPurchaseAccess = useCallback(async (gId, usr) => {
    try {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .maybeSingle();

      if (purchase) return true;

      const { data: guide } = await supabase
        .from('guides')
        .select('title')
        .eq('id', gId)
        .maybeSingle();
      
      if (!guide) return false;
      
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', usr.email)
        .eq('order_status', 'completed');

      if (orders && orders.length > 0) {
        const hasOrder = orders.some(order => 
          (order.product_name || '').toLowerCase().includes(guide.title.toLowerCase())
        );

        if (hasOrder) {
          await ensurePurchaseRecord(gId, usr);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Verify access error:', err);
      return false;
    }
  }, [ensurePurchaseRecord]);

  const checkConcurrentSessions = useCallback(async (gId, usr, deviceId) => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .lt('last_heartbeat', twoMinutesAgo);
      
      const { data: activeSessions } = await supabase
        .from('active_sessions')
        .select('device_id')
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .gte('last_heartbeat', twoMinutesAgo);

      const uniqueDevices = new Set();
      activeSessions?.forEach(session => {
        if (session.device_id !== deviceId) {
          uniqueDevices.add(session.device_id);
        }
      });

      return uniqueDevices.size < 2;
    } catch {
      return true;
    }
  }, []);

  const recordAccessSession = useCallback(async (gId, usr, deviceId, sessionId) => {
    try {
      const ipAddress = await getClientIP();
      await supabase.from('active_sessions').upsert({
        user_id: usr.id,
        guide_id: gId,
        device_id: deviceId,
        session_id: sessionId,
        ip_address: ipAddress,
        last_heartbeat: new Date().toISOString(),
        started_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
    } catch (err) {
      console.error('Record session error:', err);
    }
  }, [getClientIP]);

  const updateSessionHeartbeat = useCallback(async (sessionId) => {
    try {
      await supabase
        .from('active_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, []);

  const closeSession = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions').delete().eq('session_id', sessionId);
    } catch (err) {
      console.error('Close session error:', err);
    }
  }, []);

  // Main initialization - ONLY ONCE
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Influencer mode - INSTANT
        if (isInfluencer) {
          if (!guideData || !guideData.file_url) {
            throw new Error("Guide data not provided");
          }
          
          setPdfUrl(guideData.file_url);
          setLoading(false);
          return;
        }

        // Regular purchase mode
        if (!user || !user.id) {
          throw new Error("User not authenticated");
        }

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`;

        const hasAccess = await verifyPurchaseAccess(guideId, user);
        if (!hasAccess) {
          throw new Error("You have not purchased this guide.");
        }

        const canAccess = await checkConcurrentSessions(guideId, user, deviceIdRef.current);
        if (!canAccess) {
          throw new Error("Maximum device limit reached. Please close the guide on another device.");
        }

        const { data: guide, error: guideError } = await supabase
          .from("guides")
          .select("*")
          .eq("id", guideId)
          .single();

        if (guideError || !guide) {
          throw new Error("Guide not found");
        }

        await recordAccessSession(guideId, user, deviceIdRef.current, sessionIdRef.current);

        let finalPdfUrl;
        
        if (guide.file_url && guide.file_url.includes("token=")) {
          finalPdfUrl = guide.file_url;
        } else {
          let filePath = guide.file_url;
          
          if (filePath.includes('/storage/v1/object/public/guides/')) {
            filePath = filePath.split('/storage/v1/object/public/guides/')[1];
          } else if (filePath.includes('guides/')) {
            filePath = filePath.split('guides/').pop().split('?')[0];
          }

          const { data: signed, error: signErr } = await supabase.storage
            .from("guides")
            .createSignedUrl(filePath, 3600, { download: false });

          if (signErr) throw new Error("Failed to create signed URL");

          finalPdfUrl = signed.signedUrl;
        }

        setPdfUrl(finalPdfUrl);
        
        heartbeatRef.current = setInterval(() => {
          updateSessionHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);

      } catch (err) {
        console.error("Init error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionIdRef.current) closeSession(sessionIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Security protections
  useEffect(() => {
    if (!pdfUrl) return;

    const blockRightClick = (e) => { e.preventDefault(); };
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67, 65].includes(e.keyCode)) {
        e.preventDefault();
      }
    };
    const blockSelection = (e) => { e.preventDefault(); };

    const style = document.createElement('style');
    style.textContent = `
      @media print { body * { display: none !important; } }
      .secure-pdf-viewer iframe {
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', blockRightClick);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('selectstart', blockSelection);
    document.addEventListener('copy', blockSelection);

    return () => {
      document.removeEventListener('contextmenu', blockRightClick);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('selectstart', blockSelection);
      document.removeEventListener('copy', blockSelection);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading guide...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-error">
        <div className="error-icon">⚠️</div>
        <div className="error-title">Access Denied</div>
        <div className="error-message">{error}</div>
        <button onClick={onClose} className="error-close-btn">Close</button>
      </div>
    );
  }

  // BOTH Mobile & Desktop: Use iframe (INSTANT loading, browser lazy loads pages)
  return (
    <div className="secure-viewer secure-pdf-viewer">
      <div className="viewer-header">
        <div className="header-info">
          <span className="header-icon">🔒</span>
          <div>
            <div className="header-title">Secure Viewer</div>
            <div className="header-subtitle">Protected content</div>
          </div>
        </div>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>
      
      <div className="pdf-iframe-container">
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-width`}
            className="pdf-iframe"
            title="Secure PDF Viewer"
            allow="fullscreen"
          />
        ) : (
          <div className="loading-text">Loading...</div>
        )}
      </div>
    </div>
  );
}
