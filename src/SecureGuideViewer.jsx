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
  
  // Mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  // Mobile-specific states
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const canvasRef = useRef(null);

  // Helper functions
  const generateDeviceFingerprint = useCallback(() => {
    try {
      const fp = btoa(JSON.stringify({
        ua: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`
      }));
      return fp.substring(0, 100);
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
      // Check purchases table
      const { data: purchase } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', usr.id)
        .eq('guide_id', gId)
        .maybeSingle();

      if (purchase) return true;

      // Check orders table
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
        const hasOrder = orders.some(o => 
          (o.product_name || '').toLowerCase().includes(guide.title.toLowerCase())
        );
        if (hasOrder) {
          // Create purchase record
          const ip = await getClientIP();
          await supabase.from('purchases').upsert({
            user_id: usr.id,
            guide_id: gId,
            device_id: deviceIdRef.current,
            ip_address: ip,
            purchased_at: new Date().toISOString()
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
      sessions?.forEach(s => {
        if (s.device_id !== deviceId) devices.add(s.device_id);
      });
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
        ip_address: ip, last_heartbeat: new Date().toISOString(),
        started_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
    } catch {}
  }, [getClientIP]);

  const updateHeartbeat = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch {}
  }, []);

  const closeSession = useCallback(async (sessionId) => {
    try {
      await supabase.from('active_sessions').delete().eq('session_id', sessionId);
    } catch {}
  }, []);

  // MOBILE: Render single page to canvas (FAST!)
  const renderPageToCanvas = useCallback(async (pdf, pageNumber) => {
    if (pageRendering || !pdf || !canvasRef.current) return;
    
    setPageRendering(true);
    
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      
      // Calculate scale to fit width
      const scale = (window.innerWidth - 40) / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      
      // Use 1.5x DPI for balance between quality and speed
      const dpr = 1.5;
      
      canvas.width = scaledViewport.width * dpr;
      canvas.height = scaledViewport.height * dpr;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [dpr, 0, 0, dpr, 0, 0]
      }).promise;
      
      setCurrentPage(pageNumber);
      setPageRendering(false);
    } catch (err) {
      console.error('Render error:', err);
      setPageRendering(false);
    }
  }, [pageRendering]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1 && pdfDoc && !pageRendering) {
      renderPageToCanvas(pdfDoc, currentPage - 1);
    }
  }, [currentPage, pdfDoc, pageRendering, renderPageToCanvas]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && pdfDoc && !pageRendering) {
      renderPageToCanvas(pdfDoc, currentPage + 1);
    }
  }, [currentPage, totalPages, pdfDoc, pageRendering, renderPageToCanvas]);

  // Initialize viewer
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
            // Load PDF.js
            if (!window.pdfjsLib) {
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
            }
            
            // Load PDF
            const pdf = await window.pdfjsLib.getDocument(url).promise;
            if (!mounted) return;
            
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            
            // Render first page
            await renderPageToCanvas(pdf, 1);
          }
          
          setLoading(false);
          return;
        }

        // PURCHASE MODE
        if (!user?.id) throw new Error("Not authenticated");

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID?.() || `session_${Date.now()}`;

        // Verify access
        if (!await verifyPurchaseAccess(guideId, user)) {
          throw new Error("You have not purchased this guide.");
        }

        if (!await checkConcurrentSessions(guideId, user, deviceIdRef.current)) {
          throw new Error("Device limit reached. Close the guide on another device.");
        }

        // Get guide
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
          // Load PDF.js
          if (!window.pdfjsLib) {
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
          }
          
          // Load PDF
          const pdf = await window.pdfjsLib.getDocument(finalPdfUrl).promise;
          if (!mounted) return;
          
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          
          // Render first page
          await renderPageToCanvas(pdf, 1);
        }
        
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
  }, [guideId, user, guideData, isInfluencer, isMobile, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordSession, updateHeartbeat, closeSession, renderPageToCanvas]);

  // Security - block download/copy/print
  useEffect(() => {
    if (!pdfUrl) return;

    const preventDefault = (e) => e.preventDefault();
    
    const blockKeys = (e) => {
      // Block save, print, copy
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67].includes(e.keyCode)) {
        e.preventDefault();
      }
      // Block F12, DevTools
      if (e.keyCode === 123) e.preventDefault();
    };

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { display: none !important; }
        body::after {
          content: "Printing is disabled";
          display: block !important;
          text-align: center;
          margin-top: 50px;
        }
      }
      .secure-pdf-viewer * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    window.addEventListener('beforeprint', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('selectstart', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      window.removeEventListener('beforeprint', preventDefault);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [pdfUrl]);

  // Loading state
  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your guide...</div>
      </div>
    );
  }

  // Error state
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

  // MOBILE: Canvas page-by-page viewer
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
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || pageRendering}
            className="nav-btn nav-btn-prev"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || pageRendering}
            className="nav-btn nav-btn-next"
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
