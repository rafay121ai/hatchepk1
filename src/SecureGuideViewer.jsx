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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
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

  useEffect(() => {
    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Influencer mode - instant display
        if (isInfluencer) {
          if (!guideData || !guideData.file_url) {
            throw new Error("Guide data not provided");
          }
          
          setPdfUrl(guideData.file_url);
          
          if (isMobile) {
            if (!window.pdfjsLib) {
              await preloadPdfJs();
            }
            await loadPdfWithPdfJs(guideData.file_url);
          }
          
          setLoading(false);
          return;
        }

        // Regular purchase mode
        if (!user || !user.id || !user.email) {
          throw new Error("User not authenticated");
        }

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const hasAccess = await verifyPurchaseAccess(guideId, user);
        if (!hasAccess) {
          throw new Error("You have not purchased this guide.");
        }

        const canAccess = await checkConcurrentSessions(guideId, user, deviceIdRef.current);
        if (!canAccess) {
          throw new Error("Maximum device limit reached (2 devices). Please close this guide on another device.");
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

        setPdfUrl(finalPdfUrl);
        
        if (isMobile) {
          if (!window.pdfjsLib) {
            await preloadPdfJs();
          }
          await loadPdfWithPdfJs(finalPdfUrl);
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId, user, isMobile, isInfluencer, guideData]);

  // Pre-load PDF.js library
  const preloadPdfJs = async () => {
    if (window.pdfjsLib) return;
    
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  };

  // Load PDF with PDF.js
  const loadPdfWithPdfJs = async (url) => {
    try {
      const loadingTask = window.pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      
      // Render first page
      await renderPage(pdf, 1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF document');
    }
  };

  // Render page - NO ROTATION, normal portrait view
  const renderPage = async (pdf, pageNum) => {
    if (rendering || !pdf) return;
    
    setRendering(true);
    
    try {
      const page = await pdf.getPage(pageNum);
      const container = canvasContainerRef.current;
      if (!container) {
        setRendering(false);
        return;
      }

      // Normal viewport (no rotation)
      const viewport = page.getViewport({ scale: 1 });
      
      // Calculate scale to fit container width
      const containerWidth = Math.min(window.innerWidth - 32, 800);
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      // Use 2.2x DPI for crisp display
      const outputScale = 2.2;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);
      
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';

      // Clear container
      container.innerHTML = '';
      container.appendChild(canvas);

      // Render with high quality
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [outputScale, 0, 0, outputScale, 0, 0]
      }).promise;
      
      setCurrentPage(pageNum);
      setRendering(false);
      
    } catch (err) {
      console.error('Error rendering page:', err);
      setRendering(false);
    }
  };

  // Navigation
  const goToPreviousPage = () => {
    if (currentPage > 1 && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && pdfDoc && !rendering) {
      renderPage(pdfDoc, currentPage + 1);
    }
  };

  // Security protections
  useEffect(() => {
    if (!pdfUrl) return;

    const blockRightClick = (e) => {
      e.preventDefault();
      return false;
    };
    
    const blockKeyboardShortcuts = (e) => {
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
      e.preventDefault();
      return false;
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
      .secure-pdf-viewer * {
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
        <div className="loading-subtext">Verifying purchase and initializing</div>
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
      <div className="secure-viewer-mobile">
        <div className="viewer-header">
          <div className="header-info">
            <span className="header-icon">🔒</span>
            <div>
              <div className="header-title">Secure Viewer</div>
              <div className="header-subtitle">Page {currentPage} of {totalPages}</div>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">Close</button>
        </div>

        <div ref={canvasContainerRef} className="pdf-canvas-container" />

        <div className="viewer-controls">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || rendering}
            className="nav-btn"
          >
            ← Previous
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
        <button onClick={onClose} className="close-btn">Close</button>
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
