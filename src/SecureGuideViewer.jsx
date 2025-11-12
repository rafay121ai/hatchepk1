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
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState(0);
  const canvasContainerRef = useRef(null);
  const initRef = useRef(false);
  
  // Detect mobile SYNCHRONOUSLY (before useEffect runs)
  const isMobile = useRef(
    /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768
  ).current;

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

  // Load ALL pages progressively
  const loadAllPages = useCallback(async (url) => {
    try {
      console.log('📄 Starting to load all pages from:', url);
      
      if (!window.pdfjsLib) {
        console.error('❌ PDF.js not loaded!');
        throw new Error('PDF.js not loaded');
      }

      console.log('📥 Fetching PDF document...');
      const loadingTask = window.pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      console.log(`✅ PDF loaded with ${pdf.numPages} pages`);
      setTotalPages(pdf.numPages);
      
      const container = canvasContainerRef.current;
      if (!container) {
        console.error('❌ Container not found!');
        return;
      }

      console.log('📱 Container found, starting progressive render...');

      // Render all pages progressively
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Rendering page ${pageNum}/${pdf.numPages}...`);
        
        // Small delay to prevent blocking (except first page)
        if (pageNum > 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        
        // Scale to fit container
        const containerWidth = Math.min(window.innerWidth - 32, 800);
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Lower DPI for mobile = faster
        const dpr = isMobile ? 1.3 : 2;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        
        canvas.width = Math.floor(scaledViewport.width * dpr);
        canvas.height = Math.floor(scaledViewport.height * dpr);
        canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
        canvas.style.height = `${Math.floor(scaledViewport.height)}px`;
        canvas.className = 'pdf-page';
        canvas.dataset.pageNum = pageNum;

        // Append immediately (progressive display)
        container.appendChild(canvas);
        console.log(`✅ Page ${pageNum} canvas created`);

        // Render
        try {
          await page.render({
            canvasContext: context,
            viewport: scaledViewport,
            transform: [dpr, 0, 0, dpr, 0, 0]
          }).promise;
          
          setLoadedPages(pageNum);
          console.log(`✅ Page ${pageNum} rendered`);
          
          // Hide loading after first page
          if (pageNum === 1) {
            setLoading(false);
            console.log('🎉 First page ready - hiding loader');
          }
        } catch (renderErr) {
          console.error(`Error rendering page ${pageNum}:`, renderErr);
        }
      }
      
      console.log('🎉 All pages loaded successfully!');
    } catch (err) {
      console.error('❌ Error loading pages:', err);
      setError(`Failed to load PDF: ${err.message}`);
      setLoading(false);
    }
  }, [isMobile]);

  // Main initialization - ONLY ONCE
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeViewer = async () => {
      try {
        console.log('🚀 Starting initialization');
        console.log('isMobile:', isMobile);
        console.log('isInfluencer:', isInfluencer);
        
        setLoading(true);
        setError(null);

        // Influencer mode
        if (isInfluencer) {
          console.log('Influencer mode');
          if (!guideData || !guideData.file_url) {
            throw new Error("Guide data not provided");
          }
          
          console.log('PDF URL:', guideData.file_url);
          setPdfUrl(guideData.file_url);
          
          if (isMobile) {
            console.log('📱 Loading for mobile...');
            await loadPdfJs();
            console.log('✅ PDF.js loaded');
            await loadAllPages(guideData.file_url);
            console.log('✅ All pages loaded');
          }
          
          setLoading(false);
          console.log('✅ Viewer ready');
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
          throw new Error("Maximum device limit reached.");
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

        console.log('Final PDF URL:', finalPdfUrl);
        setPdfUrl(finalPdfUrl);
        
        if (isMobile) {
          console.log('📱 Loading for mobile...');
          await loadPdfJs();
          console.log('✅ PDF.js loaded');
          await loadAllPages(finalPdfUrl);
          console.log('✅ All pages loaded');
        }
        
        heartbeatRef.current = setInterval(() => {
          updateSessionHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);
        console.log('✅ Viewer ready');

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
      if ([37, 38, 39, 40, 32].includes(e.keyCode)) return true;
      if ((e.ctrlKey || e.metaKey) && [83, 80, 67, 65].includes(e.keyCode)) {
        e.preventDefault();
      }
    };
    const blockSelection = (e) => { e.preventDefault(); };

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
        {loadedPages > 0 && (
          <div className="loading-subtext">Loaded {loadedPages} of {totalPages} pages</div>
        )}
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

  // Mobile: Scrollable canvas pages OR iframe fallback
  if (isMobile) {
    // If canvas failed to load, fallback to iframe
    if (totalPages === 0 && pdfUrl && !loading) {
      console.log('📱 Canvas failed, using iframe fallback');
      return (
        <div className="secure-viewer-mobile secure-pdf-viewer">
          <div className="viewer-header">
            <div className="header-info">
              <span className="header-icon">🔒</span>
              <div>
                <div className="header-title">Secure Viewer</div>
                <div className="header-subtitle">Mobile view</div>
              </div>
            </div>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>

          <div className="pdf-iframe-container">
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="pdf-iframe"
              title="Secure PDF Viewer"
            />
          </div>
        </div>
      );
    }
    
    // Canvas rendering
    return (
      <div className="secure-viewer-mobile secure-pdf-viewer">
        <div className="viewer-header">
          <div className="header-info">
            <span className="header-icon">🔒</span>
            <div>
              <div className="header-title">Secure Viewer</div>
              <div className="header-subtitle">
                {loadedPages > 0 ? `${loadedPages} of ${totalPages} pages` : 'Loading...'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div ref={canvasContainerRef} className="pdf-canvas-container">
          {totalPages === 0 && !loading && (
            <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
              Loading pages...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: iframe
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
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="pdf-iframe"
            title="Secure PDF Viewer"
          />
        ) : (
          <div className="loading-text">Loading...</div>
        )}
      </div>
    </div>
  );
}
