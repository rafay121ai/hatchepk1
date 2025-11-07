/**
 * Device Fingerprinting Utility
 * Generates a unique fingerprint for the current device/browser
 */

export async function generateDeviceFingerprint() {
  try {
    // Check if we already have a stored fingerprint for this device
    const stored = localStorage.getItem('device_fingerprint');
    if (stored) {
      console.log('🔐 Using stored device fingerprint:', stored.substring(0, 20) + '...');
      return stored;
    }

    // Generate new fingerprint using only STABLE components
    const components = [
      // Browser info (stable)
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      
      // Screen info (stable)
      window.screen.colorDepth,
      window.screen.width + 'x' + window.screen.height,
      window.screen.pixelDepth,
      
      // Timezone (stable)
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Hardware (stable)
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
      
      // Touch support (stable)
      'ontouchstart' in window,
      navigator.maxTouchPoints || 0
    ];

    // Add WebGL fingerprint (more stable than canvas)
    try {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
        components.push(gl.getParameter(gl.VERSION));
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
    
    // Store for future use (persists across sessions on same device)
    localStorage.setItem('device_fingerprint', hashHex);
    
    console.log('🔐 New device fingerprint generated & stored:', hashHex.substring(0, 20) + '...');
    
    return hashHex;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a simpler fingerprint
    const fallback = `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${new Date().getTimezoneOffset()}`;
    const msgBuffer = new TextEncoder().encode(fallback);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('device_fingerprint', hashHex);
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

