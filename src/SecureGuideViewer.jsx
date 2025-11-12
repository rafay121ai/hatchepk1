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

  const generateDeviceFingerprint = useCallback(() => {
    try {
      return btoa(JSON.stringify({
        ua: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`
      })).substring(0, 100);
    } catch {
      return `fallback_${Date.now()}`;
    }
  }, []);

  const getClientIP = useCallback(async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      return (await res.json()).ip;
    } catch {
      return 'unknown';
    }
  }, []);

  const verifyPurchaseAccess = useCallback(async (gId, usr) => {
    try {
      const { data: purchase } = await supabase
        .from('purchases').select('*').eq('user_id', usr.id).eq('guide_id', gId).maybeSingle();
      if (purchase) return true;

      const { data: guide } = await supabase
        .from('guides').select('title').eq('id', gId).maybeSingle();
      if (!guide) return false;
      
      const { data: orders } = await supabase
        .from('orders').select('*').eq('customer_email', usr.email).eq('order_status', 'completed');

      if (orders?.length > 0) {
        const hasOrder = orders.some(o => 
          (o.product_name || '').toLowerCase().includes(guide.title.toLowerCase())
        );
        if (hasOrder) {
          const ip = await getClientIP();
          await supabase.from('purchases').upsert({
            user_id: usr.id, guide_id: gId, device_id: deviceIdRef.current,
            ip_address: ip, purchased_at: new Date().toISOString()
          }, { onConflict: 'user_id,guide_id' });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [getClientIP]);

  const checkConcurrentSessions = useCallback(async (gId, usr, deviceId) => {
    try {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await supabase.from('active_sessions').delete()
        .eq('user_id', usr.id).eq('guide_id', gId).lt('last_heartbeat', twoMinAgo);
      
      const { data: sessions } = await supabase.from('active_sessions').select('device_id')
        .eq('user_id', usr.id).eq('guide_id', gId).gte('last_heartbeat', twoMinAgo);

      const devices = new Set();
      sessions?.forEach(s => { if (s.device_id !== deviceId) devices.add(s.device_id); });
      return devices.size < 2;
    } catch {
      return true;
    }
  }, []);

  const recordSession = useCallback(async (gId, usr, deviceId, sessionId) => {
    try {
      const ip = await getClientIP();
      await supabase.from('active_sessions').upsert({
        user_id: usr.id, guide_id: gId, device_id: deviceId, session_id: sessionId,
        ip_address: ip, last_heartbeat: new Date().toISOString(), started_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
    } catch {}
  }, [getClientIP]);

  const updateHeartbeat = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions')
        .update({ last_heartbeat: new Date().toISOString() }).eq('session_id', sessionId);
    } catch {}
  }, []);

  const closeSession = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions').delete().eq('session_id', sessionId);
    } catch {}
  }, []);

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        // INFLUENCER MODE
        if (isInfluencer) {
          if (!guideData?.file_url) throw new Error("Guide data missing");
          setPdfUrl(guideData.file_url);
          setLoading(false);
          return;
        }

        // PURCHASE MODE
        if (!user?.id) throw new Error("Not authenticated");

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID?.() || `session_${Date.now()}`;

        if (!await verifyPurchaseAccess(guideId, user)) {
          throw new Error("You have not purchased this guide.");
        }

        if (!await checkConcurrentSessions(guideId, user, deviceIdRef.current)) {
          throw new Error("Device limit reached. Close on another device.");
        }

        const { data: guide, error: guideError } = await supabase
          .from("guides").select("*").eq("id", guideId).single();

        if (guideError || !guide) throw new Error("Guide not found");

        await recordSession(guideId, user, deviceIdRef.current, sessionIdRef.current);

        // Get PDF URL
        let finalPdfUrl;
        if (guide.file_url?.includes("token=")) {
          finalPdfUrl = guide.file_url;
        } else {
          let filePath = guide.file_url;
          if (filePath.includes('/storage/v1/object/public/guides/')) {
            filePath = filePath.split('/storage/v1/object/public/guides/')[1];
          } else if (filePath.includes('guides/')) {
            filePath = filePath.split('guides/').pop().split('?')[0];
          }

          const { data: signed, error: signErr } = await supabase.storage
            .from("guides").createSignedUrl(filePath, 3600, { download: false });

          if (signErr) throw new Error("Failed to create signed URL");
          finalPdfUrl = signed.signedUrl;
        }

        if (!mounted) return;
        setPdfUrl(finalPdfUrl);
        
        // Heartbeat
        heartbeatRef.current = setInterval(() => {
          updateHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);

      } catch (err) {
        console.error("Init error:", err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionIdRef.current) closeSession(sessionIdRef.current);
    };
  }, [guideId, user, guideData, isInfluencer, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordSession, updateHeartbeat, closeSession]);

  // Security
  useEffect(() => {
    if (!pdfUrl) return;

    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67].includes(e.keyCode)) {
        e.preventDefault();
      }
    };

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

    document.addEventListener('contextmenu', block);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('selectstart', block);
    document.addEventListener('copy', block);

    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('copy', block);
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

  // Universal viewer - works on ALL devices
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
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
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
