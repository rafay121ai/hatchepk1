// Referral tracking utilities

const REFERRAL_KEY = 'hatche_referral_id';
const REFERRAL_PARAM = 'ref';

/**
 * Extract referral ID from URL parameters
 * @param {string} url - The current URL (optional, defaults to window.location)
 * @returns {string|null} - The referral ID or null if not found
 */
export const extractReferralId = (url = window.location.href) => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(REFERRAL_PARAM);
  } catch (error) {
    console.error('Error extracting referral ID:', error);
    return null;
  }
};

/**
 * Store referral ID in localStorage
 * @param {string} referralId - The referral ID to store
 */
export const storeReferralId = (referralId) => {
  if (referralId && referralId.trim()) {
    try {
      // Store in both localStorage and sessionStorage for compatibility
      localStorage.setItem(REFERRAL_KEY, referralId.trim());
      sessionStorage.setItem('refId', referralId.trim());
      sessionStorage.setItem('refTimestamp', Date.now().toString());
      console.log('Referral ID stored:', referralId);
    } catch (error) {
      console.error('Error storing referral ID:', error);
    }
  }
};

/**
 * Get stored referral ID from localStorage
 * @returns {string|null} - The stored referral ID or null if not found
 */
export const getStoredReferralId = () => {
  try {
    return localStorage.getItem(REFERRAL_KEY);
  } catch (error) {
    console.error('Error getting stored referral ID:', error);
    return null;
  }
};

/**
 * Clear stored referral ID from localStorage
 */
export const clearReferralId = () => {
  try {
    localStorage.removeItem(REFERRAL_KEY);
    console.log('Referral ID cleared');
  } catch (error) {
    console.error('Error clearing referral ID:', error);
  }
};

/**
 * Initialize referral tracking - captures ref from URL and stores it
 * Should be called when the app loads
 */
export const initializeReferralTracking = () => {
  console.log('Initializing referral tracking...');
  console.log('Current URL:', window.location.href);
  
  const referralId = extractReferralId();
  console.log('Extracted referral ID:', referralId);
  
  if (referralId) {
    storeReferralId(referralId);
    
    // Clean up the URL by removing the ref parameter
    cleanUrlFromReferral();
    
    console.log('Referral tracking initialized with ID:', referralId);
    return referralId;
  }
  
  console.log('No referral ID found in URL');
  return null;
};

/**
 * Remove referral parameter from URL without causing a page reload
 */
export const cleanUrlFromReferral = () => {
  try {
    const url = new URL(window.location);
    if (url.searchParams.has(REFERRAL_PARAM)) {
      url.searchParams.delete(REFERRAL_PARAM);
      window.history.replaceState({}, document.title, url.pathname + url.search);
      console.log('URL cleaned of referral parameter');
    }
  } catch (error) {
    console.error('Error cleaning URL:', error);
  }
};

/**
 * Generate referral link for an affiliate
 * @param {string} referralId - The affiliate's referral ID
 * @param {string} baseUrl - The base URL (optional, defaults to current domain)
 * @returns {string} - The complete referral link
 */
export const generateReferralLink = (referralId, baseUrl = window.location.origin) => {
  return `${baseUrl}/?ref=${referralId}`;
};

/**
 * Check if a referral ID is valid format
 * @param {string} referralId - The referral ID to validate
 * @returns {boolean} - Whether the referral ID is valid
 */
export const isValidReferralId = (referralId) => {
  if (!referralId || typeof referralId !== 'string') {
    return false;
  }
  
  // Check if it starts with REF- and has proper format
  const refPattern = /^REF-[A-Z0-9]+-[A-Z0-9]+$/;
  return refPattern.test(referralId.trim());
};
