import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './SecureGuideViewer.css';

// IndexedDB for caching rendered pages
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HatchePDFCache', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'id' });
      }
    };
  });
};

const getCachedPage = async (guideId, pageNum) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['pages'], 'readonly');
      const store = tx.objectStore('pages');
      const request = store.get(`${guideId}_${pageNum}`);
      request.onsuccess = () => resolve(request.result?.imageData);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const cachePage = async (guideId, pageNum, imageData) => {
  try {
    const db = await openDB();
    const tx = db.transaction(['pages'], 'readwrite');
    const store = tx.objectStore('pages');
    store.put({ id: `${guideId}_${pageNum}`, imageData, timestamp: Date.now() });
  } catch (err) {
    console.error('Cache error:', err);
  }
};

export default function SecureGuideViewer({ guideId, user, onClose, guideData, isInfluencer = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const deviceIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  // Mobile image-based viewer states
  const [pageImages, setPageImages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingPages, setLoadingPages] = useState(false);
  const scrollContainerRef = useRef(null);

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

  // Convert PDF page to image (WebP for best compression)
  const convertPageToImage = useCallback(async (pdf, pageNum, gId) => {
    try {
      // Check cache first
      const cached = await getCachedPage(gId, pageNum);
      if (cached) {
        return cached;
      }

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      
      // Scale for mobile screen
      const scale = Math.min(window.innerWidth - 32, 800) / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      
      // Render to canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
      
      // Convert to WebP image (smaller size)
      const imageData = canvas.toDataURL('image/webp', 0.85);
      
      // Cache it
      await cachePage(gId, pageNum, imageData);
      
      return imageData;
    } catch (err) {
      console.error(`Error converting page ${pageNum}:`, err);
      return null;
    }
  }, []);

  // Load pages as images (lazy)
  const loadPagesAsImages = useCallback(async (url, gId) => {
    try {
      setLoadingPages(true);
      
      // Lazy load PDF.js only when needed
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
      
      const pdf = await window.pdfjsLib.getDocument(url).promise;
      setTotalPages(pdf.numPages);
      
      // Convert first page immediately
      const firstPageImage = await convertPageToImage(pdf, 1, gId);
      setPageImages([{ page: 1, image: firstPageImage, loaded: true }]);
      setLoading(false);
      
      // Load rest in background (lazy)
      for (let i = 2; i <= Math.min(pdf.numPages, 5); i++) {
        // Use requestIdleCallback to not block UI
        if (window.requestIdleCallback) {
          window.requestIdleCallback(async () => {
            const img = await convertPageToImage(pdf, i, gId);
            setPageImages(prev => [...prev, { page: i, image: img, loaded: true }]);
          });
        } else {
          setTimeout(async () => {
            const img = await convertPageToImage(pdf, i, gId);
            setPageImages(prev => [...prev, { page: i, image: img, loaded: true }]);
          }, i * 100);
        }
      }
      
      setLoadingPages(false);
    } catch (err) {
      console.error('Load pages error:', err);
      setError('Failed to load guide');
      setLoading(false);
    }
  }, [convertPageToImage]);

  // Load page on demand when user navigates
  const loadPageOnDemand = useCallback(async (pageNum) => {
    if (!window.pdfjsLib || !pdfUrl) return;
    
    // Check if already loaded
    const existing = pageImages.find(p => p.page === pageNum);
    if (existing?.loaded) {
      setCurrentPage(pageNum);
      return;
    }
    
    try {
      const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
      const img = await convertPageToImage(pdf, pageNum, guideId || 'influencer');
      setPageImages(prev => [...prev, { page: pageNum, image: img, loaded: true }]);
      setCurrentPage(pageNum);
    } catch (err) {
      console.error('Load page on demand error:', err);
    }
  }, [pdfUrl, pageImages, guideId, convertPageToImage]);

  const goToPrev = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      loadPageOnDemand(newPage);
    }
  }, [currentPage, loadPageOnDemand]);

  const goToNext = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      loadPageOnDemand(newPage);
    }
  }, [currentPage, totalPages, loadPageOnDemand]);

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
            await loadPagesAsImages(url, 'influencer');
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
          await loadPagesAsImages(finalPdfUrl, guideId);
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
    };
  }, [guideId, user, guideData, isInfluencer, isMobile, generateDeviceFingerprint, verifyPurchaseAccess, checkConcurrentSessions, recordSession, updateHeartbeat, closeSession, loadPagesAsImages]);

  // Security
  useEffect(() => {
    if (!pdfUrl) return;

    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67].includes(e.keyCode)) {
        e.preventDefault();
      }
      if (e.keyCode === 123) e.preventDefault();
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
        <div className="loading-subtext">Optimizing for your device</div>
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

  // MOBILE: Image-based scrollable viewer
  if (isMobile) {
    const currentPageData = pageImages.find(p => p.page === currentPage);
    
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

        <div ref={scrollContainerRef} className="pdf-scroll-container">
          {currentPageData?.image ? (
            <img 
              src={currentPageData.image} 
              alt={`Page ${currentPage}`}
              className="pdf-page-image"
            />
          ) : (
            <div className="page-loading">
              <div className="loading-spinner-small"></div>
              <div>Loading page {currentPage}...</div>
            </div>
          )}
        </div>

        <div className="viewer-controls">
          <button
            onClick={goToPrev}
            disabled={currentPage === 1 || loadingPages}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-indicator">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages || loadingPages}
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
