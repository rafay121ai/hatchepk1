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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const canvasContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log('Mobile detection:', mobile, 'UserAgent:', navigator.userAgent, 'Width:', window.innerWidth);
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        colorDepth: window.screen.colorDepth
      };
      return btoa(JSON.stringify(fingerprint)).substring(0, 100);
    } catch (err) {
      return `fallback_${Date.now()}_${Math.random()}`;
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

  // Pre-load PDF.js library
  const preloadPdfJs = useCallback(async () => {
    if (window.pdfjsLib) {
      console.log('PDF.js already loaded');
      return;
    }
    
    console.log('Loading PDF.js library...');
    setLoadingProgress(10);
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = false;
      script.onload = () => {
        console.log('PDF.js loaded successfully');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setLoadingProgress(30);
        resolve();
      };
      script.onerror = (err) => {
        console.error('Failed to load PDF.js:', err);
        reject(new Error('Failed to load PDF library'));
      };
      document.head.appendChild(script);
    });
  }, []);

  // Load PDF with PDF.js
  const loadPdfWithPdfJs = useCallback(async (url) => {
    try {
      console.log('Loading PDF from URL:', url);
      setLoadingProgress(40);
      
      if (!window.pdfjsLib) {
        throw new Error('PDF.js not loaded');
      }

      const loadingTask = window.pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
        disableAutoFetch: false,
        disableStream: false,
        withCredentials: false
      });
      
      loadingTask.onProgress = (progress) => {
        if (progress.total > 0) {
          const percent = Math.min(90, 40 + (progress.loaded / progress.total) * 50);
          setLoadingProgress(percent);
          console.log(`Loading progress: ${percent}%`);
        }
      };
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully. Pages:', pdf.numPages);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      
      setLoadingProgress(95);
      
      // Render first page
      await renderPage(pdf, 1);
      
      setLoadingProgress(100);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(`Failed to load PDF: ${err.message}`);
    }
  }, [renderPage]);

  // Render page with proper scaling
  const renderPage = useCallback(async (pdf, pageNum) => {
    if (!pdf || rendering) {
      console.log('Skipping render - pdf:', !!pdf, 'rendering:', rendering);
      return;
    }
    
    // Cancel any existing render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        console.log('Cancel render task error:', e);
      }
      renderTaskRef.current = null;
    }
    
    setRendering(true);
    console.log('Rendering page:', pageNum);
    
    try {
      const page = await pdf.getPage(pageNum);
      const container = canvasContainerRef.current;
      
      if (!container) {
        console.error('Canvas container not found');
        setRendering(false);
        return;
      }

      // Get viewport and calculate scale
      const viewport = page.getViewport({ scale: 1 });
      console.log('Original viewport:', viewport.width, 'x', viewport.height);
      
      // Calculate scale to fit container with padding
      const containerWidth = container.clientWidth - 32;
      const containerHeight = container.clientHeight - 32;
      
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY, 3.0);
      
      console.log('Calculated scale:', scale, 'Container:', containerWidth, 'x', containerHeight);
      
      const scaledViewport = page.getViewport({ scale });

      // Use device pixel ratio for crisp rendering, but cap it
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      console.log('Device pixel ratio:', dpr);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false
      });
      
      canvas.width = Math.floor(scaledViewport.width * dpr);
      canvas.height = Math.floor(scaledViewport.height * dpr);
      
      canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
      canvas.style.height = `${Math.floor(scaledViewport.height)}px`;
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';

      // Clear container and add canvas
      container.innerHTML = '';
      container.appendChild(canvas);

      console.log('Canvas size:', canvas.width, 'x', canvas.height, 'Style:', canvas.style.width, 'x', canvas.style.height);

      // Render
      const renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
        intent: 'display'
      });
      
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
      renderTaskRef.current = null;
      
      console.log('Page rendered successfully');
      setCurrentPage(pageNum);
      setRendering(false);
      
    } catch (err) {
      if (err.name === 'RenderingCancelledException') {
        console.log('Rendering cancelled');
      } else {
        console.error('Error rendering page:', err);
      }
      setRendering(false);
    }
  }, [rendering]);

  // Navigation
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1 && pdfDoc && !rendering) {
      console.log('Going to previous page');
      renderPage(pdfDoc, currentPage - 1);
    }
  }, [currentPage, pdfDoc, rendering, renderPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && pdfDoc && !rendering) {
      console.log('Going to next page');
      renderPage(pdfDoc, currentPage + 1);
    }
  }, [currentPage, totalPages, pdfDoc, rendering, renderPage]);

  // Keyboard navigation
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

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pdfDoc, isMobile, goToPreviousPage, goToNextPage]);

  // Touch swipe support
  useEffect(() => {
    if (!pdfDoc || !isMobile) return;

    const container = canvasContainerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPreviousPage();
        } else {
          goToNextPage();
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pdfDoc, isMobile, goToPreviousPage, goToNextPage]);

  // Main initialization
  useEffect(() => {
    const initializeViewer = async () => {
      try {
        console.log('=== Initializing Viewer ===');
        console.log('Mode:', isInfluencer ? 'Influencer' : 'Purchase');
        console.log('Is Mobile:', isMobile);
        console.log('Guide ID:', guideId);
        console.log('Guide Data:', guideData);
        
        setLoading(true);
        setError(null);
        setLoadingProgress(0);

        // Influencer mode
        if (isInfluencer) {
          console.log('Influencer mode activated');
          
          if (!guideData || !guideData.file_url) {
            throw new Error("Guide data not provided");
          }
          
          const url = guideData.file_url;
          console.log('Using file URL:', url);
          setPdfUrl(url);
          setLoadingProgress(20);
          
          if (isMobile) {
            console.log('Loading PDF.js for mobile...');
            await preloadPdfJs();
            await loadPdfWithPdfJs(url);
          } else {
            console.log('Using iframe for desktop');
            setLoadingProgress(100);
          }
          
          setLoading(false);
          return;
        }

        // Regular purchase mode
        console.log('Purchase mode - verifying access');
        
        if (!user || !user.id || !user.email) {
          throw new Error("User not authenticated");
        }

        setLoadingProgress(5);
        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        setLoadingProgress(10);
        const hasAccess = await verifyPurchaseAccess(guideId, user);
        if (!hasAccess) {
          throw new Error("You have not purchased this guide.");
        }

        setLoadingProgress(15);
        const canAccess = await checkConcurrentSessions(guideId, user, deviceIdRef.current);
        if (!canAccess) {
          throw new Error("Maximum device limit reached (2 devices). Please close this guide on another device.");
        }

        setLoadingProgress(20);
        const { data: guide, error: guideError } = await supabase
          .from("guides")
          .select("*")
          .eq("id", guideId)
          .single();

        if (guideError || !guide) {
          throw new Error("Guide not found");
        }

        await recordAccessSession(guideId, user, deviceIdRef.current, sessionIdRef.current);
        setLoadingProgress(25);

        let finalPdfUrl;
        
        if (guide.file_url && guide.file_url.includes("token=")) {
          finalPdfUrl = guide.file_url;
        } else {
          let filePath = guide.file_url;
          
          if (filePath.includes('/storage/v1/object/public/guides/')) {
            filePath = filePath.split('/storage/v1/object/public/guides/')[1];
          } else if (filePath.includes('/storage/v1/object/sign/guides/')) {
            filePath = filePath.split('/storage/v1/object/sign/guides/')[1].split('?')[0];
          } else if (filePath.includes('guides/')) {
            const parts = filePath.split('guides/');
            filePath = parts[parts.length - 1].split('?')[0];
          }

          const { data: signed, error: signErr } = await supabase.storage
            .from("guides")
            .createSignedUrl(filePath, 3600, {
              download: false
            });

          if (signErr) {
            throw new Error(`Failed to create signed URL: ${signErr.message}`);
          }

          finalPdfUrl = signed.signedUrl;
        }

        console.log('Final PDF URL:', finalPdfUrl);
        setPdfUrl(finalPdfUrl);
        setLoadingProgress(30);
        
        if (isMobile) {
          console.log('Loading PDF.js for mobile...');
          await preloadPdfJs();
          await loadPdfWithPdfJs(finalPdfUrl);
        } else {
          console.log('Using iframe for desktop');
          setLoadingProgress(100);
        }
        
        heartbeatRef.current = setInterval(() => {
          updateSessionHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);
        console.log('=== Viewer Initialized Successfully ===');

      } catch (err) {
        console.error("Initialization error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeViewer();

    return () => {
      console.log('Cleaning up viewer...');
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
          console.log('Cleanup cancel error:', e);
        }
      }
    };
  }, [guideId, user, isMobile, isInfluencer, guideData, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordAccessSession, updateSessionHeartbeat, closeSession, preloadPdfJs, loadPdfWithPdfJs]);

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
      
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67, 65, 86, 88, 90].includes(e.keyCode)) {
        e.preventDefault();
        return false;
      }
      if (e.keyCode === 123 || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 73) || 
          ((e.ctrlKey || e.metaKey) && e.keyCode === 85) ||
          e.keyCode === 44) {
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
        body::after {
          content: "Printing is disabled for this document.";
          display: block !important;
          text-align: center;
          margin-top: 20px;
          font-size: 18px;
        }
      }
      .secure-pdf-viewer canvas,
      .secure-pdf-viewer iframe {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('contextmenu', blockRightClick);
    document.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('selectstart', blockSelection);
    document.addEventListener('dragstart', blockSelection);
    document.addEventListener('copy', blockSelection);

    const preventPrint = (e) => {
      e.preventDefault();
      alert('Printing is disabled for this document.');
      return false;
    };

    window.addEventListener('beforeprint', preventPrint);

    return () => {
      document.removeEventListener('contextmenu', blockRightClick);
      document.removeEventListener('keydown', blockKeyboardShortcuts);
      document.removeEventListener('selectstart', blockSelection);
      document.removeEventListener('dragstart', blockSelection);
      document.removeEventListener('copy', blockSelection);
      window.removeEventListener('beforeprint', preventPrint);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading secure viewer...</div>
        <div className="loading-subtext">
          {loadingProgress < 20 ? 'Verifying purchase...' :
           loadingProgress < 40 ? 'Initializing PDF engine...' :
           loadingProgress < 70 ? 'Loading document...' :
           'Almost ready...'}
        </div>
        <div className="loading-progress-bar">
          <div className="loading-progress-fill" style={{ width: `${loadingProgress}%` }}></div>
        </div>
        <div className="loading-debug">Mobile: {isMobile ? 'Yes' : 'No'} | Progress: {loadingProgress}%</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-error">
        <div className="error-icon">⚠️</div>
        <div className="error-title">Access Denied</div>
        <div className="error-message">{error}</div>
        <button onClick={onClose} className="error-close-btn">
          Close
        </button>
      </div>
    );
  }

  // Mobile: Page-by-page canvas rendering
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
          <button onClick={onClose} className="close-btn" aria-label="Close viewer">✕</button>
        </div>

        <div ref={canvasContainerRef} className="pdf-canvas-container" />

        <div className="viewer-controls">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || rendering}
            className="nav-btn nav-btn-prev"
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || rendering}
            className="nav-btn nav-btn-next"
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
        
        <div className="viewer-hint">
          Swipe or use arrow keys to navigate
        </div>
      </div>
    );
  }

  // Mobile but PDF.js failed - fallback to iframe
  if (isMobile && !pdfDoc && pdfUrl) {
    console.log('Mobile fallback to iframe');
    return (
      <div className="secure-viewer-mobile secure-pdf-viewer">
        <div className="viewer-header">
          <div className="header-info">
            <span className="header-icon">🔒</span>
            <div>
              <div className="header-title">Secure Viewer</div>
              <div className="header-subtitle">Protected content</div>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close viewer">✕</button>
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

  // Desktop: iframe rendering
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
        <button onClick={onClose} className="close-btn" aria-label="Close viewer">✕</button>
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