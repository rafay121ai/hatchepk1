/**
 * PayFast Payment Gateway Utilities - Serverless Functions
 * 
 * This module provides server-side utilities for PayFast payment integration.
 * IMPORTANT: This file should only be used on the backend/server-side
 * where the SECURED_KEY can be safely accessed.
 */

const crypto = require('crypto');

/**
 * Get PayFast Access Token (Server-side only)
 * @param {Object} data - Token request data
 * @param {string} data.basketId - Unique basket/order ID
 * @param {number|string} data.amount - Payment amount
 * @param {string} [data.currencyCode] - Currency code (default: 'PKR')
 * @returns {Promise<Object>} Token response
 */
async function getPayFastToken(data) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const securedKey = process.env.PAYFAST_SECURED_KEY;
  const tokenApiUrl = process.env.PAYFAST_TOKEN_API_URL;

  // Debug logging (only show which vars are missing, not their values)
  if (!merchantId || !securedKey || !tokenApiUrl) {
    const missingVars = [];
    if (!merchantId) missingVars.push('PAYFAST_MERCHANT_ID');
    if (!securedKey) missingVars.push('PAYFAST_SECURED_KEY');
    if (!tokenApiUrl) missingVars.push('PAYFAST_TOKEN_API_URL');
    
    console.error('Missing PayFast environment variables:', missingVars.join(', '));
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('PAYFAST')));
    
    throw new Error(`PayFast credentials not configured. Missing: ${missingVars.join(', ')}. Please set these in Vercel dashboard under Settings > Environment Variables.`);
  }

  // Create form data for POST request
  // PayFast requires all fields - ensure none are null/undefined
  const basketId = data.basketId || generateBasketId();
  const amount = parseFloat(data.amount);
  const currencyCode = data.currencyCode || 'PKR';
  
  if (!basketId || !amount || isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid request data: basketId=${basketId}, amount=${amount}`);
  }
  
  // Ensure merchant ID and secured key are strings (not null/undefined)
  if (!merchantId || merchantId.trim() === '') {
    throw new Error('MERCHANT_ID is required and cannot be empty');
  }
  if (!securedKey || securedKey.trim() === '') {
    throw new Error('SECURED_KEY is required and cannot be empty');
  }
  
  const params = new URLSearchParams();
  params.append('MERCHANT_ID', merchantId.trim());
  params.append('SECURED_KEY', securedKey.trim());
  params.append('BASKET_ID', basketId.trim());
  params.append('TXNAMT', amount.toFixed(2)); // Ensure 2 decimal places
  params.append('CURRENCY_CODE', currencyCode.trim());
  
  // Log request (without sensitive values)
  console.log('PayFast Token Request:', {
    MERCHANT_ID: merchantId ? `${merchantId.substring(0, 3)}...` : 'missing',
    SECURED_KEY: securedKey ? 'set' : 'missing',
    BASKET_ID: basketId,
    TXNAMT: amount.toFixed(2),
    CURRENCY_CODE: currencyCode,
    URL: tokenApiUrl,
    allFields: ['MERCHANT_ID', 'SECURED_KEY', 'BASKET_ID', 'TXNAMT', 'CURRENCY_CODE']
  });

  // Use fetch if available (Node.js 18+) or require node-fetch for older versions
  let fetchFunction = fetch;
  if (typeof fetch === 'undefined') {
    try {
      fetchFunction = require('node-fetch');
    } catch (e) {
      throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch');
    }
  }

  // PayFast API expects form-encoded data
  const formData = params.toString();
  
  console.log('PayFast Request URL:', tokenApiUrl);
  console.log('PayFast Request Body (sanitized):', formData.replace(/SECURED_KEY=[^&]*/, 'SECURED_KEY=***'));
  
  const response = await fetchFunction(tokenApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData,
  });
  
  console.log('PayFast Response Status:', response.status, response.statusText);

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch (e) {
      errorText = response.statusText;
    }
    throw new Error(`PayFast token API failed: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Parse JSON response
  let result;
  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
  } else {
    const text = await response.text();
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response format from PayFast API: ${text.substring(0, 200)}`);
    }
  }

  return result;
}

/**
 * Calculate SHA256 validation hash for IPN verification
 * Format: basket_id|secured_key|merchant_id|err_code
 * 
 * @param {string} basketId - Basket ID
 * @param {string} errCode - Error code
 * @returns {string} SHA256 hash in hex format
 */
function calculateValidationHash(basketId, errCode) {
  const securedKey = process.env.PAYFAST_SECURED_KEY;
  const merchantId = process.env.PAYFAST_MERCHANT_ID;

  if (!securedKey || !merchantId) {
    throw new Error('PayFast credentials not configured');
  }

  const hashString = `${basketId}|${securedKey}|${merchantId}|${errCode}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
}

/**
 * Verify PayFast IPN callback data integrity
 * @param {Object} ipnData - IPN data from PayFast
 * @param {string} ipnData.basket_id - Basket ID
 * @param {string} ipnData.err_code - Error code
 * @param {string} ipnData.validation_hash - Validation hash from PayFast
 * @returns {boolean} True if hash matches
 */
function verifyIPNHash(ipnData) {
  // Validate required fields
  if (!ipnData.basket_id || !ipnData.validation_hash || !ipnData.err_code) {
    console.error('Missing required fields for hash verification');
    return false;
  }

  const calculatedHash = calculateValidationHash(
    ipnData.basket_id,
    ipnData.err_code
  );
  
  const receivedHash = (ipnData.validation_hash || '').toLowerCase();
  const isValid = calculatedHash.toLowerCase() === receivedHash;

  if (!isValid) {
    console.error('Hash mismatch:', {
      basket_id: ipnData.basket_id,
      err_code: ipnData.err_code,
      calculated: calculatedHash.toLowerCase(),
      received: receivedHash
    });
  }

  return isValid;
}

/**
 * Check if transaction was successful
 * @param {string} errCode - Error code from PayFast
 * @returns {boolean} True if successful
 */
function isTransactionSuccessful(errCode) {
  return errCode === '000' || errCode === '00';
}

/**
 * Get error message from error code
 * @param {string} errCode - Error code from PayFast
 * @returns {string} Human-readable error message
 */
function getErrorMessage(errCode) {
  const errorMessages = {
    '000': 'Transaction successful',
    '00': 'Transaction successful',
    '002': 'Transaction timeout',
    '97': 'Insufficient balance',
    '106': 'Transaction limit exceeded',
    '03': 'Inactive account',
    '104': 'Incorrect details',
    '55': 'Invalid OTP/PIN',
    '54': 'Card expired',
    '13': 'Invalid amount',
    '126': 'Invalid account details',
    '75': 'Maximum PIN retries exceeded',
    '14': 'Inactive card',
    '15': 'Inactive card',
    '42': 'Invalid CNIC',
    '423': 'Unable to process request',
    '41': 'Details mismatched',
    '9000': 'FRMS rejected',
    '9010': 'FRMS error',
    '308': 'Invalid account details',
    '600': 'OTP expired',
    '309': 'Invalid OTP length',
    '853': 'Invalid account details',
    '04': 'Closed account',
    '537': 'Dormant account',
    '359': 'Blocked account',
    '880': 'Local ecommerce not activated',
    '881': 'Insufficient funds',
    '882': 'Daily transaction limit exceeded',
    '883': 'E-payment service not activated',
  };

  return errorMessages[errCode] || `Unknown error (Code: ${errCode})`;
}

/**
 * Generate unique basket ID
 * @param {string} prefix - Prefix for basket ID (default: 'ORDER')
 * @returns {string} Unique basket ID
 */
function generateBasketId(prefix = 'ORDER') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format date for PayFast (YYYY-MM-DD)
 * @param {Date} date - Date to format (default: current date)
 * @returns {string} Formatted date string
 */
function formatOrderDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  getPayFastToken,
  calculateValidationHash,
  verifyIPNHash,
  isTransactionSuccessful,
  getErrorMessage,
  generateBasketId,
  formatOrderDate
};

