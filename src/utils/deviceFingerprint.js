/**
 * Device Fingerprinting Utility
 * Generates a unique fingerprint for the current device/browser
 */

export async function generateDeviceFingerprint() {
  try {
    const components = [
      // Browser info
      navigator.userAgent,
      navigator.language,
      navigator.languages ? navigator.languages.join(',') : '',
      
      // Screen info
      window.screen.colorDepth,
      window.screen.width + 'x' + window.screen.height,
      window.screen.availWidth + 'x' + window.screen.availHeight,
      window.screen.pixelDepth,
      
      // Timezone
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Storage
      !!window.sessionStorage,
      !!window.localStorage,
      
      // Hardware
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform,
      navigator.deviceMemory || 'unknown',
      
      // Browser features
      !!window.indexedDB,
      !!window.openDatabase,
      typeof Worker !== 'undefined',
      typeof SharedWorker !== 'undefined',
      
      // Plugins (deprecated but still useful)
      navigator.plugins ? navigator.plugins.length : 0,
      
      // Touch support
      'ontouchstart' in window,
      navigator.maxTouchPoints || 0
    ];

    // Add canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 125, 30);
        ctx.fillStyle = '#069';
        ctx.fillText('HatchePK', 2, 2);
        canvas.toBlob((blob) => {}, 'image/png');
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      components.push('canvas-error');
    }

    // Add WebGL fingerprint
    try {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('webgl-error');
    }

    // Combine all components
    const fingerprint = components.join('|||');
    
    // Hash the fingerprint using SHA-256
    const msgBuffer = new TextEncoder().encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('🔐 Device fingerprint generated:', hashHex.substring(0, 20) + '...');
    
    return hashHex;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a simpler fingerprint
    const fallback = `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${new Date().getTimezoneOffset()}`;
    const msgBuffer = new TextEncoder().encode(fallback);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
}

/**
 * Verify if the device fingerprint matches
 * @param {string} storedFingerprint - Previously stored fingerprint
 * @returns {Promise<boolean>} - Whether fingerprints match
 */
export async function verifyDeviceFingerprint(storedFingerprint) {
  const currentFingerprint = await generateDeviceFingerprint();
  return currentFingerprint === storedFingerprint;
}

