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
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  // Mobile states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const pdfDocRef = useRef(null);
  const canvasRef = useRef(null);

  // Generate stable device fingerprint - uses localStorage to persist across sessions
  const generateDeviceFingerprint = useCallback(() => {
    try {
      // Check if we already have a device ID stored
      let deviceId = localStorage.getItem('hatche_device_id');
      
      if (!deviceId) {
        // Generate new stable device ID
        const fingerprint = btoa(JSON.stringify({
          ua: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          lang: navigator.language,
          platform: navigator.platform,
          // Add timestamp to make it unique, but store it so it persists
          created: Date.now()
        })).substring(0, 100);
        
        // Create a more stable ID by combining fingerprint with a random component
        deviceId = `device_${fingerprint}_${Date.now()}`;
        localStorage.setItem('hatche_device_id', deviceId);
      }
      
      return deviceId;
    } catch {
      // Fallback: try to get existing or create new
      let deviceId = localStorage.getItem('hatche_device_id');
      if (!deviceId) {
        deviceId = `fallback_${Date.now()}`;
        localStorage.setItem('hatche_device_id', deviceId);
      }
      return deviceId;
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
      
      // First: Clean up stale sessions (older than 2 minutes)
      await supabase.from('active_sessions').delete()
        .eq('user_id', usr.id).eq('guide_id', gId).lt('last_heartbeat', twoMinAgo);
      
      // Second: Remove any old sessions from the SAME device_id
      // This ensures if the same device reopens, it replaces the old session
      await supabase.from('active_sessions').delete()
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .eq('device_id', deviceId);
      
      // Third: Get all active sessions (excluding stale ones)
      const { data: sessions } = await supabase.from('active_sessions').select('device_id')
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .gte('last_heartbeat', twoMinAgo);

      // Count unique device IDs (excluding current device)
      const devices = new Set();
      sessions?.forEach(s => { 
        if (s.device_id !== deviceId) {
          devices.add(s.device_id); 
        }
      });
      
      // Allow if less than 2 OTHER devices are active
      return devices.size < 2;
    } catch (err) {
      console.error('Error checking concurrent sessions:', err);
      // On error, allow access (fail open)
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

  // Load PDF.js from CDN
  const loadPdfJs = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  }, []);

  // Progressive render: Fast preview then crisp upgrade with device pixel ratio
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    try {
      setRendering(true);
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      
      // Get device pixel ratio for high-DPI displays (2x, 3x on mobile)
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x to prevent memory issues
      
      // Get base viewport - account for rotation on mobile
      const baseViewport = page.getViewport({ scale: 1 });
      
      // For mobile, we rotate 90deg, so use height for width calculation
      const containerWidth = isMobile ? window.innerHeight - 100 : window.innerWidth - 32;
      const containerHeight = isMobile ? window.innerWidth - 100 : window.innerHeight - 200;
      
      // Calculate scale to fit container
      const scaleX = containerWidth / baseViewport.width;
      const scaleY = containerHeight / baseViewport.height;
      const baseScale = Math.min(scaleX, scaleY);
      
      // For crisp rendering, multiply by device pixel ratio
      // Use 2x minimum for mobile, up to device limit
      const renderScale = baseScale * Math.max(devicePixelRatio, isMobile ? 2 : 1);
      const quickScale = baseScale * Math.max(devicePixelRatio * 0.8, isMobile ? 1.5 : 1);
      
      // PASS 1: Quick render (FAST - shows immediately)
      const quickViewport = page.getViewport({ scale: quickScale });
      
      // Calculate actual pixel dimensions
      const outputWidth = Math.floor(quickViewport.width);
      const outputHeight = Math.floor(quickViewport.height);
      
      // Set canvas internal resolution (actual pixels) - MUST be integers
      canvas.width = outputWidth * devicePixelRatio;
      canvas.height = outputHeight * devicePixelRatio;
      
      // Set canvas display size (CSS pixels) - MUST match viewport exactly
      canvas.style.width = outputWidth + 'px';
      canvas.style.height = outputHeight + 'px';
      
      // Get context with optimal settings
      const context = canvas.getContext('2d', { 
        alpha: false,
        desynchronized: true // Better performance
      });
      
      // Reset transform and scale for DPR
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(devicePixelRatio, devicePixelRatio);
      
      // Fill with white background
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, outputWidth, outputHeight);
      
      // Render PDF page
      const renderContext = {
        canvasContext: context,
        viewport: quickViewport,
        // Optional: enable text layer for better text rendering
        enableWebGL: false
      };
      
      await page.render(renderContext).promise;
      
      setRendering(false);
      
      // PASS 2: Upgrade to high-quality render in background
      setTimeout(async () => {
        if (!pdfDocRef.current || !canvasRef.current) return;
        
        try {
          // Re-get the page
          const crispPage = await pdfDocRef.current.getPage(pageNum);
          const upgradeCanvas = canvasRef.current;
          
          // Use higher scale for crisp rendering
          const crispViewport = crispPage.getViewport({ scale: renderScale });
          
          // Calculate actual pixel dimensions
          const crispWidth = Math.floor(crispViewport.width);
          const crispHeight = Math.floor(crispViewport.height);
          
          // Set canvas internal resolution (actual pixels)
          upgradeCanvas.width = crispWidth * devicePixelRatio;
          upgradeCanvas.height = crispHeight * devicePixelRatio;
          
          // Set canvas display size (CSS pixels)
          upgradeCanvas.style.width = crispWidth + 'px';
          upgradeCanvas.style.height = crispHeight + 'px';
          
          // Get context
          const upgradeContext = upgradeCanvas.getContext('2d', { 
            alpha: false,
            desynchronized: true
          });
          
          // Reset and scale
          upgradeContext.setTransform(1, 0, 0, 1, 0, 0);
          upgradeContext.scale(devicePixelRatio, devicePixelRatio);
          
          // Fill with white background
          upgradeContext.fillStyle = '#ffffff';
          upgradeContext.fillRect(0, 0, crispWidth, crispHeight);
          
          // Render at higher quality
          await crispPage.render({
            canvasContext: upgradeContext,
            viewport: crispViewport
          }).promise;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✨ Page ${pageNum} upgraded: ${crispWidth}x${crispHeight} @ ${devicePixelRatio}x DPR`);
          }
        } catch (err) {
          console.error('Quality upgrade error:', err);
        }
      }, 300);
      
    } catch (err) {
      console.error('Render error:', err);
      setRendering(false);
    }
  }, [isMobile]);

  // Navigation
  const goToPrev = useCallback(() => {
    if (currentPage > 1 && !rendering) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  }, [currentPage, rendering, renderPage]);

  const goToNext = useCallback(() => {
    if (currentPage < totalPages && !rendering) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  }, [currentPage, totalPages, rendering, renderPage]);

  // Initialize
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        // INFLUENCER MODE
        if (isInfluencer) {
          if (!guideData?.file_url) throw new Error("Guide data missing");
          const url = guideData.file_url;
          setPdfUrl(url);
          
          if (isMobile) {
            await loadPdfJs();
            const pdf = await window.pdfjsLib.getDocument(url).promise;
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            await renderPage(1);
            
            // Show hint after guide loads
            setShowHint(true);
            setTimeout(() => setShowHint(false), 3000);
          }
          
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
        
        if (isMobile) {
          await loadPdfJs();
          const pdf = await window.pdfjsLib.getDocument(finalPdfUrl).promise;
          pdfDocRef.current = pdf;
          setTotalPages(pdf.numPages);
          await renderPage(1);
          
          // Show hint after guide loads
          setShowHint(true);
          setTimeout(() => setShowHint(false), 3000);
        }
        
        setLoading(false);
        
        // Schedule email automation (post-guide engagement and feedback)
        if (user && guideData && !isInfluencer) {
          try {
            const { schedulePostGuideEmail, scheduleFeedbackEmail } = await import('./utils/emailAutomation');
            await schedulePostGuideEmail(user, guideData);
            await scheduleFeedbackEmail(user, guideData);
          } catch (error) {
            console.error('Error scheduling emails:', error);
            // Don't block guide viewing if email scheduling fails
          }
        }
        
        // Heartbeat
        heartbeatRef.current = setInterval(() => {
          updateHeartbeat(sessionIdRef.current);
        }, 30000);

      } catch (err) {
        console.error("Init error:", err);
        if (mounted) {
          setError(err.message || 'Failed to load guide');
          setLoading(false);
        }
      }
    };

    init();

    // Cleanup function
    const cleanup = () => {
      mounted = false;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (sessionIdRef.current) {
        closeSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    };

    // Handle tab close/navigation - cleanup session
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const sessionId = sessionIdRef.current;
        // Try to close session synchronously (best effort)
        // Note: Async operations may not complete on beforeunload
        closeSession(sessionId);
      }
    };

    // Handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - pause heartbeat but keep session
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      } else {
        // Tab is visible again - resume heartbeat
        if (sessionIdRef.current && !heartbeatRef.current) {
          heartbeatRef.current = setInterval(() => {
            updateHeartbeat(sessionIdRef.current);
          }, 30000);
          // Immediate heartbeat on resume
          updateHeartbeat(sessionIdRef.current);
        }
      }
    };

    // Register event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [guideId, user, guideData, isInfluencer, isMobile, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordSession, updateHeartbeat, closeSession, loadPdfJs, renderPage]);

  // Security
  useEffect(() => {
    if (!pdfUrl) return;

    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67].includes(e.keyCode)) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', block);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('selectstart', block);
    document.addEventListener('copy', block);

    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('copy', block);
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

  // MOBILE: Simple canvas viewer
  if (isMobile) {
    return (
      <div className="secure-viewer-mobile secure-pdf-viewer">
        <div className="viewer-header">
          <div className="header-info">
            <span className="header-icon">🔒</span>
            <div>
              <div className="header-title">Secure Viewer</div>
              <div className="header-subtitle">Page {currentPage} of {totalPages}</div>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="pdf-canvas-container">
          <canvas ref={canvasRef} className="pdf-canvas" />
          {showHint && (
            <div className="navigation-hint">
              <span>👉 Press Next</span>
            </div>
          )}
        </div>

        <div className="viewer-controls">
          <button
            onClick={goToPrev}
            disabled={currentPage === 1 || rendering}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages || rendering}
            className="nav-btn"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // DESKTOP: iframe viewer
  return (
    <div className="secure-viewer-desktop secure-pdf-viewer">
      <div className="viewer-header">
        <div className="header-info">
          <span className="header-icon">🔒</span>
          <div>
            <div className="header-title">Secure PDF Viewer</div>
            <div className="header-subtitle">Protected content</div>
          </div>
        </div>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>
      
      <div className="pdf-iframe-container">
        <iframe 
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          className="pdf-iframe"
          title="Secure PDF Viewer"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
