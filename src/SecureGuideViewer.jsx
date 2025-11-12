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
  
  // Mobile PDF states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const pdfDocRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Cache for rendered pages (store as object URLs from blobs)
  const pageCacheRef = useRef({});
  const preloadingRef = useRef(false);
  const pdfjsLibRef = useRef(null);

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

  // Load PDF.js dynamically with worker (FIX #1)
  const loadPdfJs = useCallback(async () => {
    if (pdfjsLibRef.current) return pdfjsLibRef.current;
    
    try {
      const pdfjs = await import('pdfjs-dist/build/pdf');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      pdfjsLibRef.current = pdfjs;
      return pdfjs;
    } catch (err) {
      console.error('Failed to load PDF.js:', err);
      throw new Error('Failed to load PDF library');
    }
  }, []);

  // Render page to cache using toBlob (FIX #4)
  const renderPageToCache = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || pageCacheRef.current[pageNum]) return;
    
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      
      // Create temporary canvas
      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d', { alpha: false });
      
      // Get viewport with CLAMPED scale (FIX #3)
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = window.innerWidth - 32;
      const baseScale = containerWidth / viewport.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Cap at 1.5x
      const scale = Math.min(baseScale * dpr, 1.5); // Max 1.5x total
      const scaledViewport = page.getViewport({ scale });
      
      // Set canvas size
      tempCanvas.width = scaledViewport.width;
      tempCanvas.height = scaledViewport.height;
      
      // Render
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
      
      // Cache as blob URL (async, faster) (FIX #4)
      return new Promise((resolve) => {
        tempCanvas.toBlob((blob) => {
          if (blob) {
            pageCacheRef.current[pageNum] = URL.createObjectURL(blob);
          }
          resolve();
        }, 'image/webp', 0.8);
      });
      
    } catch (err) {
      console.error(`Error caching page ${pageNum}:`, err);
    }
  }, []);

  // Display page directly on canvas (FIX #2 - no double rendering for first page)
  const renderPageDirect = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    try {
      setPageRendering(true);
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      
      // Get viewport with CLAMPED scale (FIX #3)
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = window.innerWidth - 32;
      const baseScale = containerWidth / viewport.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = Math.min(baseScale * dpr, 1.5);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
      
      setPageRendering(false);
    } catch (err) {
      console.error('Render error:', err);
      setPageRendering(false);
    }
  }, []);

  // Display cached page
  const displayCachedPage = useCallback(async (pageNum) => {
    if (!canvasRef.current) return;
    
    setPageRendering(true);
    
    // If not cached, render directly
    if (!pageCacheRef.current[pageNum]) {
      await renderPageDirect(pageNum);
      return;
    }
    
    // Display from cache
    const cachedUrl = pageCacheRef.current[pageNum];
    if (cachedUrl) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d', { alpha: false });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          setPageRendering(false);
        }
      };
      img.onerror = () => {
        setPageRendering(false);
        renderPageDirect(pageNum);
      };
      img.src = cachedUrl;
    } else {
      setPageRendering(false);
    }
  }, [renderPageDirect]);

  // Preload pages using requestIdleCallback (FIX #5)
  const preloadPages = useCallback((startPage, count) => {
    if (preloadingRef.current || !pdfDocRef.current) return;
    
    preloadingRef.current = true;
    const endPage = Math.min(startPage + count, totalPages);
    
    let currentIdx = startPage;
    
    const preloadNext = () => {
      if (currentIdx > endPage) {
        preloadingRef.current = false;
        return;
      }
      
      const pageNum = currentIdx;
      currentIdx++;
      
      if (!pageCacheRef.current[pageNum]) {
        // Use requestIdleCallback for true background work (FIX #5)
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            renderPageToCache(pageNum).then(preloadNext);
          });
        } else {
          setTimeout(() => {
            renderPageToCache(pageNum).then(preloadNext);
          }, 100);
        }
      } else {
        preloadNext();
      }
    };
    
    preloadNext();
  }, [totalPages, renderPageToCache]);

  // Navigation
  const goToPrev = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      displayCachedPage(newPage);
      
      // Preload previous pages
      if (newPage > 1) {
        preloadPages(Math.max(1, newPage - 3), 3);
      }
    }
  }, [currentPage, displayCachedPage, preloadPages]);

  const goToNext = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      displayCachedPage(newPage);
      
      // Preload next pages
      preloadPages(newPage + 1, 3);
    }
  }, [currentPage, totalPages, displayCachedPage, preloadPages]);

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
            const pdfjs = await loadPdfJs();
            
            // Load PDF with RANGE REQUESTS (FIX #6)
            const pdf = await pdfjs.getDocument({
              url,
              rangeChunkSize: 65536, // 64 KB chunks
              disableAutoFetch: true,
              disableStream: false
            }).promise;
            
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            
            // Render first page DIRECTLY (no caching overhead) (FIX #2)
            await renderPageDirect(1);
            setLoading(false);
            
            // Preload next pages in background (FIX #5)
            setTimeout(() => preloadPages(2, 5), 300);
          } else {
            setLoading(false);
          }
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
          const pdfjs = await loadPdfJs();
          
          // Load PDF with RANGE REQUESTS (FIX #6)
          const pdf = await pdfjs.getDocument({
            url: finalPdfUrl,
            rangeChunkSize: 65536,
            disableAutoFetch: true,
            disableStream: false
          }).promise;
          
          pdfDocRef.current = pdf;
          setTotalPages(pdf.numPages);
          
          // Render first page DIRECTLY (FIX #2)
          await renderPageDirect(1);
          setLoading(false);
          
          // Preload background (FIX #5)
          setTimeout(() => preloadPages(2, 5), 300);
        } else {
          setLoading(false);
        }
        
        // Heartbeat
        heartbeatRef.current = setInterval(() => {
          updateHeartbeat(sessionIdRef.current);
        }, 30000);

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
      
      // Cleanup blob URLs
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(pageCacheRef.current).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [guideId, user, guideData, isInfluencer, isMobile, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordSession, updateHeartbeat, closeSession, loadPdfJs, renderPageDirect, preloadPages]);

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
      .secure-pdf-viewer * {
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

  // MOBILE: Canvas page-by-page viewer
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
          {pageRendering && (
            <div className="page-loading-overlay">
              <div className="loading-spinner-small"></div>
            </div>
          )}
        </div>

        <div className="viewer-controls">
          <button
            onClick={goToPrev}
            disabled={currentPage === 1 || pageRendering}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages || pageRendering}
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
