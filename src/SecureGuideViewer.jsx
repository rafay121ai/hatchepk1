import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';

export default function SecureGuideViewer({ guideId, user, onClose, guideData, isInfluencer = false }) {
  const viewer = useRef(null);
  const canvasContainerRef = useRef(null);
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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log('Is mobile device:', mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    console.log("SecureGuideViewer mounted");
    console.log("Props:", { guideId, user: user?.email, guideData, isInfluencer });

    const initializeViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // Skip authentication for influencer access
        if (isInfluencer) {
          console.log("🎓 Influencer mode - skipping authentication");
          await loadInfluencerGuide();
          return;
        }

        console.log("Step 1: Validating user");
        if (!user || !user.id || !user.email) {
          throw new Error("User not authenticated");
        }

        deviceIdRef.current = generateDeviceFingerprint();
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Device/Session IDs generated");

        console.log("Step 2: Verifying purchase");
        const hasAccess = await verifyPurchaseAccess(guideId, user);
        if (!hasAccess) {
          throw new Error("You have not purchased this guide.");
        }
        console.log("✓ Purchase verified");

        console.log("Step 3: Checking concurrent sessions");
        const canAccess = await checkConcurrentSessions(guideId, user, deviceIdRef.current);
        if (!canAccess) {
          throw new Error("Maximum device limit reached (2 devices). Please close this guide on another device.");
        }
        console.log("✓ Concurrent session check passed");

        console.log("Step 4: Fetching guide data");
        const { data: guide, error: guideError } = await supabase
          .from("guides")
          .select("*")
          .eq("id", guideId)
          .single();

        if (guideError) {
          console.error("Guide fetch error:", guideError);
          throw new Error(`Failed to fetch guide: ${guideError.message}`);
        }

        if (!guide) {
          throw new Error("Guide not found");
        }

        console.log("✓ Guide fetched:", guide);

        console.log("Step 5: Recording session");
        await recordAccessSession(guideId, user, deviceIdRef.current, sessionIdRef.current);
        console.log("✓ Session recorded");

        console.log("Step 6: Getting PDF URL");
        let finalPdfUrl;
        
        if (guide.file_url && guide.file_url.includes("token=")) {
          console.log("Using existing signed URL");
          finalPdfUrl = guide.file_url;
        } else {
          console.log("Creating new signed URL");
          let filePath = guide.file_url;
          
          if (filePath.includes('/storage/v1/object/public/guides/')) {
            filePath = filePath.split('/storage/v1/object/public/guides/')[1];
          } else if (filePath.includes('/storage/v1/object/sign/guides/')) {
            filePath = filePath.split('/storage/v1/object/sign/guides/')[1].split('?')[0];
          } else if (filePath.includes('guides/')) {
            const parts = filePath.split('guides/');
            filePath = parts[parts.length - 1].split('?')[0];
          }

          console.log("File path:", filePath);

          const { data: signed, error: signErr } = await supabase.storage
            .from("guides")
            .createSignedUrl(filePath, 3600);

          if (signErr) {
            console.error("Signed URL error:", signErr);
            throw new Error(`Failed to create signed URL: ${signErr.message}`);
          }

          finalPdfUrl = signed.signedUrl;
        }

        console.log("✓ PDF URL ready");
        setPdfUrl(finalPdfUrl);
        
        // Load PDF.js for mobile rendering
        if (isMobile) {
          await loadPdfWithPdfJs(finalPdfUrl);
        }
        
        heartbeatRef.current = setInterval(() => {
          updateSessionHeartbeat(sessionIdRef.current);
        }, 30000);

        setLoading(false);
        console.log("✓ Viewer initialized successfully");

      } catch (err) {
        console.error("Initialization error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeViewer();

    return () => {
      console.log("Cleaning up viewer");
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (sessionIdRef.current) {
        closeSession(sessionIdRef.current);
      }
    };
  }, [guideId, user, isMobile, isInfluencer]);

  // Load guide for influencer access (skip authentication) - OPTIMIZED
  const loadInfluencerGuide = async () => {
    try {
      console.log("🎓 Loading influencer guide...");
      
      if (!guideData || !guideData.file_url) {
        console.error("❌ No guide data or file_url");
        throw new Error("Guide data not provided");
      }

      console.log("File URL:", guideData.file_url);

      // Extract clean file path quickly
      let filePath = guideData.file_url;
      
      if (filePath.includes('/storage/v1/object/public/guides/')) {
        filePath = filePath.split('/storage/v1/object/public/guides/')[1];
      } else if (filePath.includes('/storage/v1/object/sign/guides/')) {
        filePath = filePath.split('/storage/v1/object/sign/guides/')[1].split('?')[0];
      } else if (filePath.includes('guides/')) {
        const parts = filePath.split('guides/');
        filePath = parts[parts.length - 1].split('?')[0];
      }

      console.log("Extracted file path:", filePath);

      // Create signed URL in parallel with PDF.js loading
      const urlPromise = supabase.storage
        .from("guides")
        .createSignedUrl(filePath, 3600);

      // Pre-load PDF.js for mobile while getting URL
      const pdfJsPromise = isMobile ? preloadPdfJs().catch(err => {
        console.error("PDF.js load error:", err);
        return null;
      }) : Promise.resolve();

      // Wait for both in parallel
      const [urlResult] = await Promise.all([urlPromise, pdfJsPromise]);

      console.log("URL Result:", urlResult);

      if (urlResult.error) {
        console.error("❌ Signed URL error:", urlResult.error);
        throw new Error("Failed to access guide file");
      }

      const finalPdfUrl = urlResult.data.signedUrl;
      console.log("✅ PDF URL ready");
      setPdfUrl(finalPdfUrl);

      // Render first page only if mobile (PDF.js already loaded)
      if (isMobile) {
        console.log("📱 Rendering mobile view...");
        await loadPdfWithPdfJs(finalPdfUrl);
      }

      setLoading(false);
      console.log("✅ Influencer guide loaded successfully");

    } catch (err) {
      console.error("❌ Load error:", err);
      setError(err.message || "Failed to load guide");
      setLoading(false);
    }
  };

  // Pre-load PDF.js library (doesn't load PDF yet)
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

  // Load and render PDF (PDF.js already loaded)
  const loadPdfWithPdfJs = async (url) => {
    try {
      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument(url);
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

  // Render a specific page - OPTIMIZED
  const renderPage = async (pdf, pageNum) => {
    if (rendering || !pdf) return;
    
    setRendering(true);
    try {
      const page = await pdf.getPage(pageNum);
      const container = canvasContainerRef.current;
      if (!container) return;

      // Calculate scale - use window width for faster calculation
      const containerWidth = window.innerWidth - 32; // Account for padding
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / viewport.width, 2); // Cap at 2x for performance
      const scaledViewport = page.getViewport({ scale });

      // Use lower DPI for faster initial render (can be improved later)
      const outputScale = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false }); // Disable alpha for performance
      
      canvas.width = scaledViewport.width * outputScale;
      canvas.height = scaledViewport.height * outputScale;
      context.scale(outputScale, outputScale);
      
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      canvas.style.display = 'block';
      canvas.style.maxWidth = '100%';

      // Clear and append canvas
      container.innerHTML = '';
      container.appendChild(canvas);

      // Render with lower quality for faster initial display
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        intent: 'display' // Optimize for display
      }).promise;
      
      setCurrentPage(pageNum);
    } catch (err) {
      console.error('Error rendering page:', err);
    } finally {
      setRendering(false);
    }
  };

  // Navigation handlers
  const goToPreviousPage = () => {
    if (currentPage > 1 && pdfDoc) {
      renderPage(pdfDoc, currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && pdfDoc) {
      renderPage(pdfDoc, currentPage + 1);
    }
  };

  const verifyPurchaseAccess = async (guideId, user) => {
    try {
      console.log("Checking purchases table...");
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('guide_id', guideId)
        .maybeSingle();

      if (purchaseError) {
        console.error('Purchase check error:', purchaseError);
      }

      if (purchase) {
        console.log('✓ Found in purchases table');
        return true;
      }

      console.log("Checking orders table...");
      
      // First, fetch the guide to get its title
      const { data: guide, error: guideError } = await supabase
        .from('guides')
        .select('title')
        .eq('id', guideId)
        .maybeSingle();
      
      if (guideError) {
        console.error('Guide fetch error:', guideError);
        return false;
      }
      
      const guideTitle = guide?.title || '';
      console.log('Guide title:', guideTitle);
      
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', user.email)
        .eq('order_status', 'completed');

      if (orderError) {
        console.error('Orders check error:', orderError);
        return false;
      }

      if (orders && orders.length > 0) {
        const hasOrder = orders.some(order => {
          const productName = order.product_name || '';
          // Compare guide title with product name
          const matches = productName.toLowerCase().includes(guideTitle.toLowerCase()) ||
                         guideTitle.toLowerCase().includes(productName.toLowerCase());
          console.log(`Order ${order.id}: "${productName}" vs Guide "${guideTitle}" - Match: ${matches}`);
          return matches;
        });

        if (hasOrder) {
          console.log('✓ Found in orders, creating purchase record');
          await ensurePurchaseRecord(guideId, user);
          return true;
        }
      }

      console.log('✗ No purchase found');
      return false;
    } catch (error) {
      console.error('Error in verifyPurchaseAccess:', error);
      return false;
    }
  };

  const ensurePurchaseRecord = async (guideId, user) => {
    try {
      const ipAddress = await getClientIP();

      const { error } = await supabase
        .from('purchases')
        .upsert({
          user_id: user.id,
          guide_id: guideId,
          device_id: deviceIdRef.current,
          ip_address: ipAddress,
          purchased_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,guide_id',
          ignoreDuplicates: false
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error creating purchase record:', error);
      }
    } catch (error) {
      console.error('Error in ensurePurchaseRecord:', error);
    }
  };

  const checkConcurrentSessions = async (guideId, user, deviceId) => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: activeSessions, error } = await supabase
        .from('active_sessions')
        .select('device_id, session_id, last_heartbeat')
        .eq('user_id', user.id)
        .eq('guide_id', guideId)
        .gte('last_heartbeat', twoMinutesAgo);

      if (error) {
        console.error('Concurrent session check error (allowing access):', error);
        return true;
      }

      const uniqueDevices = new Set();
      activeSessions?.forEach(session => {
        if (session.device_id !== deviceId) {
          uniqueDevices.add(session.device_id);
        }
      });

      const count = uniqueDevices.size;
      console.log(`Active devices: ${count} (limit: 2)`);
      return count < 2;
    } catch (error) {
      console.error('Error in checkConcurrentSessions:', error);
      return true;
    }
  };

  const recordAccessSession = async (guideId, user, deviceId, sessionId) => {
    try {
      const ipAddress = await getClientIP();
      
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: user.id,
          guide_id: guideId,
          device_id: deviceId,
          session_id: sessionId,
          ip_address: ipAddress,
          last_heartbeat: new Date().toISOString(),
          started_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error recording session:', error);
      }
    } catch (error) {
      console.error('Error in recordAccessSession:', error);
    }
  };

  const updateSessionHeartbeat = async (sessionId) => {
    try {
      await supabase
        .from('active_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  };

  const closeSession = async (sessionId) => {
    try {
      await supabase
        .from('active_sessions')
        .delete()
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const generateDeviceFingerprint = () => {
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
    } catch (error) {
      return `fallback_${Date.now()}_${Math.random()}`;
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  // Security effect (for both mobile and desktop)
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
    document.addEventListener('drop', blockSelection);
    document.addEventListener('copy', blockSelection);
    document.addEventListener('cut', blockSelection);

    window.addEventListener('beforeprint', (e) => {
      e.preventDefault();
      alert('Printing is disabled for this document.');
      return false;
    });

    return () => {
      document.removeEventListener('contextmenu', blockRightClick);
      document.removeEventListener('keydown', blockKeyboardShortcuts);
      document.removeEventListener('selectstart', blockSelection);
      document.removeEventListener('dragstart', blockSelection);
      document.removeEventListener('drop', blockSelection);
      document.removeEventListener('copy', blockSelection);
      document.removeEventListener('cut', blockSelection);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 9999
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '5px solid #333',
          borderTop: '5px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ fontSize: '18px' }}>Loading secure viewer...</div>
        <div style={{ fontSize: '12px', color: '#888' }}>Verifying purchase and initializing</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center',
        zIndex: 9999
      }}>
        <div style={{ fontSize: '64px' }}>⚠️</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Access Denied</div>
        <div style={{ color: '#ff4444', maxWidth: '500px', fontSize: '16px' }}>{error}</div>
        <button 
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#555'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#444'}
        >
          Close
        </button>
      </div>
    );
  }

  // Mobile view: Custom PDF renderer with PDF.js
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(to bottom, #1a1a1a, #0d0d0d)',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          minHeight: '60px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🔒</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>Secure PDF Viewer</div>
              <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.2' }}>
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: '#dc2626',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              flexShrink: 0
            }}
          >
            Close
          </button>
        </div>

        {/* PDF Content */}
        <div 
          ref={canvasContainerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            minHeight: 'calc(100vh - 140px)'
          }}
        />

        {/* Navigation Controls */}
        <div style={{
          padding: '12px 16px',
          background: '#1a1a1a',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0
        }}>
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === 1 ? '#333' : '#73160f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: '10px 20px',
              backgroundColor: currentPage === totalPages ? '#333' : '#73160f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // Desktop view: Show iframe
  return (
    <div className="secure-pdf-viewer" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '8px 16px',
        background: 'linear-gradient(to bottom, #1a1a1a, #0d0d0d)',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        minHeight: '50px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🔒</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>Secure PDF Viewer</div>
            <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.2' }}>Protected content</div>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: '#dc2626',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            transition: 'background 0.2s',
            flexShrink: 0
          }}
          onMouseOver={(e) => e.target.style.background = '#b91c1c'}
          onMouseOut={(e) => e.target.style.background = '#dc2626'}
        >
          Close
        </button>
      </div>
      
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {pdfUrl && (
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              minHeight: 'calc(100vh - 50px)'
            }}
            title="Secure PDF Viewer"
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
}