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
  const [isMobile] = useState(() => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  });
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef(null);
  const initRef = useRef(false);

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

      if (orders?.length > 0) {
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
      await supabase.from('active_sessions').delete()
        .eq('user_id', usr.id).eq('guide_id', gId).lt('last_heartbeat', twoMinutesAgo);
      
      const { data: activeSessions } = await supabase
        .from('active_sessions').select('device_id')
        .eq('user_id', usr.id).eq('guide_id', gId).gte('last_heartbeat', twoMinutesAgo);

      const uniqueDevices = new Set();
      activeSessions?.forEach(session => {
        if (session.device_id !== deviceId) uniqueDevices.add(session.device_id);
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
        user_id: usr.id, guide_id: gId, device_id: deviceId, session_id: sessionId,
        ip_address: ipAddress, last_heartbeat: new Date().toISOString(),
        started_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
    } catch (err) {
      console.error('Record session error:', err);
    }
  }, [getClientIP]);

  const updateSessionHeartbeat = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions')
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

  // Load PDF.js and document
  const loadPdfJs = useCallback(async () => {
    if (window.pdfjsLib) return;
    
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }, []);

  const loadPdf = useCallback(async (url) => {
    try {
      if (!window.pdfjsLib) await loadPdfJs();
      
      const pdf = await window.pdfjsLib.getDocument(url).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      return pdf;
    } catch (err) {
      console.error('Load PDF error:', err);
      throw err;
    }
  }, [loadPdfJs]);

  // Render ONLY current page (on demand)
  const renderPage = useCallback(async (pdf, pageNum) => {
    if (rendering || !pdf) return;
    
    setRendering(true);
    
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      
      const containerWidth = Math.min(window.innerWidth - 32, 800);
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const dpr = 1.5; // Lower DPI for speed

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d', { alpha: false });
      
      canvas.width = Math.floor(scaledViewport.width * dpr);
      canvas.height = Math.floor(scaledViewport.height * dpr);
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [dpr, 0, 0, dpr, 0, 0]
      }).promise;
      
      setCurrentPage(pageNum);
      setRendering(false);
    } catch (err) {
      console.error('Render error:', err);
      setRendering(false);
    }
  }, [rendering]);

  const goToPrev = () => {
    if (currentPage > 1 && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage + 1);
    }
  };

  // Initialize ONCE
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        setLoading(true);

        // Influencer mode
        if (isInfluencer) {
          if (!guideData?.file_url) throw new Error("Guide data missing");
          
          setPdfUrl(guideData.file_url);
          
          if (isMobile) {
            const pdf = await loadPdf(guideData.file_url);
            await renderPage(pdf, 1);
          }
          
          setLoading(false);
          return;
        }

        // Purchase mode
        if (!user?.id) throw new Error("Not authenticated");

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}`;

        if (!await verifyPurchaseAccess(guideId, user)) {
          throw new Error("You have not purchased this guide.");
        }

        if (!await checkConcurrentSessions(guideId, user, deviceIdRef.current)) {
          throw new Error("Maximum device limit reached.");
        }

        const { data: guide, error: guideError } = await supabase
          .from("guides").select("*").eq("id", guideId).single();

        if (guideError || !guide) throw new Error("Guide not found");

        await recordAccessSession(guideId, user, deviceIdRef.current, sessionIdRef.current);

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

        setPdfUrl(finalPdfUrl);
        
        if (isMobile) {
          const pdf = await loadPdf(finalPdfUrl);
          await renderPage(pdf, 1);
        }
        
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

    init();

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionIdRef.current) closeSession(sessionIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Security
  useEffect(() => {
    if (!pdfUrl) return;

    const block = (e) => { e.preventDefault(); };
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67, 65].includes(e.keyCode)) {
        e.preventDefault();
      }
    };

    const style = document.createElement('style');
    style.textContent = `
      @media print { body * { display: none !important; } }
      .secure-pdf-viewer * { user-select: none !important; -webkit-user-select: none !important; }
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

  // Mobile: Simple canvas page-by-page
  if (isMobile && pdfDoc) {
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
        </div>

        <div className="viewer-controls">
          <button
            onClick={goToPrev}
            disabled={currentPage === 1 || rendering}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-indicator">{currentPage} / {totalPages}</span>
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

  // Desktop OR Mobile fallback: iframe
  return (
    <div className="secure-viewer-desktop secure-pdf-viewer">
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
