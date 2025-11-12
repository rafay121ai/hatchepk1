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
  const [isMobile, setIsMobile] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const canvasContainerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const initRef = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generateDeviceFingerprint = useCallback(() => {
    try {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      return btoa(JSON.stringify(fingerprint)).substring(0, 100);
    } catch (err) {
      return `fallback_${Date.now()}`;
    }
  }, []);

  const getClientIP = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }, []);

  const ensurePurchaseRecord = useCallback(async (gId, usr) => {
    try {
      const ipAddress = await getClientIP();
      await supabase
        .from('purchases')
        .upsert({
          user_id: usr.id,
          guide_id: gId,
          device_id: deviceIdRef.current,
          ip_address: ipAddress,
          purchased_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,guide_id',
          ignoreDuplicates: false
        });
    } catch (err) {
      console.error('Error in ensurePurchaseRecord:', err);
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
        const hasOrder = orders.some(order => {
          const productName = order.product_name || '';
          return productName.toLowerCase().includes(guide.title.toLowerCase()) ||
                 guide.title.toLowerCase().includes(productName.toLowerCase());
        });

        if (hasOrder) {
          await ensurePurchaseRecord(gId, usr);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Error in verifyPurchaseAccess:', err);
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
    } catch (err) {
      console.error('Error in checkConcurrentSessions:', err);
      return true;
    }
  }, []);

  const recordAccessSession = useCallback(async (gId, usr, deviceId, sessionId) => {
    try {
      const ipAddress = await getClientIP();
      
      await supabase
        .from('active_sessions')
        .upsert({
          user_id: usr.id,
          guide_id: gId,
          device_id: deviceId,
          session_id: sessionId,
          ip_address: ipAddress,
          last_heartbeat: new Date().toISOString(),
          started_at: new Date().toISOString()
        }, {
          onConflict: 'session_id',
          ignoreDuplicates: false
        });
    } catch (err) {
      console.error('Error in recordAccessSession:', err);
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
      await supabase
        .from('active_sessions')
        .delete()
        .eq('session_id', sessionId);
    } catch (err) {
      console.error('Error closing session:', err);
    }
  }, []);

  // Render page - SIMPLE & FAST
  const renderPage = useCallback(async (pdf, pageNum) => {
    if (!pdf || rendering) return;
    
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore
      }
      renderTaskRef.current = null;
    }
    
    setRendering(true);
    
    try {
      const page = await pdf.getPage(pageNum);
      const container = canvasContainerRef.current;
      
      if (!container) {
        setRendering(false);
        return;
      }

      const viewport = page.getViewport({ scale: 1 });
      
      // Simple mobile scaling
      const containerWidth = container.clientWidth - 32;
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      // Low DPI for faster rendering on mobile
      const dpr = isMobile ? 1.5 : 2;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      canvas.width = Math.floor(scaledViewport.width * dpr);
      canvas.height = Math.floor(scaledViewport.height * dpr);
      
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;

      container.innerHTML = '';
      container.appendChild(canvas);

      const renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [dpr, 0, 0, dpr, 0, 0]
      });
      
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
      
      setCurrentPage(pageNum);
      setRendering(false);
      
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
      setRendering(false);
    }
  }, [rendering, isMobile]);

  // Load PDF.js dynamically
  const loadPdfJs = useCallback(async () => {
    if (window.pdfjsLib) return;
    
    return new Promise((resolve, reject) => {
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

  // Load PDF document
  const loadPdf = useCallback(async (url) => {
    try {
      if (!window.pdfjsLib) throw new Error('PDF.js not loaded');

      const pdf = await window.pdfjsLib.getDocument({ url }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      
      // Render first page
      await renderPage(pdf, 1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF document');
    }
  }, [renderPage]);

  // Navigation
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1 && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage - 1);
    }
  }, [currentPage, pdfDoc, rendering, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage + 1);
    }
  }, [currentPage, totalPages, pdfDoc, rendering, renderPage]);

  // Keyboard & swipe navigation
  useEffect(() => {
    if (!pdfDoc || !isMobile) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      }
    };

    const container = canvasContainerRef.current;
    if (!container) return;

    let touchStartX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPreviousPage();
        } else {
          goToNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pdfDoc, isMobile, goToPreviousPage, goToNextPage]);

  // Main initialization - PREVENT REPEATED CALLS
  useEffect(() => {
    if (initRef.current) return; // Prevent duplicate initialization
    initRef.current = true;

    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Influencer mode
        if (isInfluencer) {
          if (!guideData || !guideData.file_url) {
            throw new Error("Guide data not provided");
          }
          
          setPdfUrl(guideData.file_url);
          
          if (isMobile) {
            await loadPdfJs();
            await loadPdf(guideData.file_url);
          }
          
          setLoading(false);
          return;
        }

        // Regular purchase mode
        if (!user || !user.id || !user.email) {
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
          throw new Error("Maximum device limit reached. Please close this guide on another device.");
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
            const parts = filePath.split('guides/');
            filePath = parts[parts.length - 1].split('?')[0];
          }

          const { data: signed, error: signErr } = await supabase.storage
            .from("guides")
            .createSignedUrl(filePath, 3600, { download: false });

          if (signErr) {
            throw new Error(`Failed to create signed URL: ${signErr.message}`);
          }

          finalPdfUrl = signed.signedUrl;
        }

        setPdfUrl(finalPdfUrl);
        
        if (isMobile) {
          await loadPdfJs();
          await loadPdf(finalPdfUrl);
        }
        
        heartbeatRef.current = setInterval(() => {
          updateSessionHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);

      } catch (err) {
        console.error("Initialization error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (sessionIdRef.current) {
        closeSession(sessionIdRef.current);
      }
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once!

  // Security protections
  useEffect(() => {
    if (!pdfUrl) return;

    const blockRightClick = (e) => {
      e.preventDefault();
      return false;
    };
    
    const blockKeyboardShortcuts = (e) => {
      // Allow arrow keys for navigation
      if ([37, 38, 39, 40, 32].includes(e.keyCode)) {
        return true;
      }
      
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67, 65].includes(e.keyCode)) {
        e.preventDefault();
        return false;
      }
    };

    const blockSelection = (e) => {
      if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
        return false;
      }
    };

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { display: none !important; }
      }
      .secure-pdf-viewer canvas,
      .secure-pdf-viewer iframe {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', blockRightClick);
    document.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('selectstart', blockSelection);
    document.addEventListener('copy', blockSelection);

    window.addEventListener('beforeprint', (e) => {
      e.preventDefault();
      alert('Printing is disabled for this document.');
    });

    return () => {
      document.removeEventListener('contextmenu', blockRightClick);
      document.removeEventListener('keydown', blockKeyboardShortcuts);
      document.removeEventListener('selectstart', blockSelection);
      document.removeEventListener('copy', blockSelection);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
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

  // Mobile: Canvas rendering with landscape support
  if (isMobile && pdfDoc) {
    return (
      <div className="secure-viewer-mobile">
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

        <div ref={canvasContainerRef} className="pdf-canvas-container" />

        <div className="viewer-controls">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || rendering}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || rendering}
            className="nav-btn"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // Desktop: iframe rendering
  return (
    <div className="secure-viewer-desktop">
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
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="pdf-iframe"
            title="Secure PDF Viewer"
            allow="fullscreen"
          />
        ) : (
          <div className="loading-text">Loading PDF...</div>
        )}
      </div>
    </div>
  );
}
