/**
 * PayFast Payment Gateway Utilities
 * 
 * This module provides utilities for PayFast payment integration including:
 * - Token generation
 * - IPN hash verification
 * - Payment form data creation
 * - Error handling
 */

import CryptoJS from 'crypto-js';

// Interfaces documentation (converted from TypeScript)
/**
 * PayFastTokenRequest:
 * @typedef {Object} PayFastTokenRequest
 * @property {string} basketId - Unique basket/order ID
 * @property {number} amount - Payment amount
 * @property {string} [currencyCode] - Currency code (default: 'PKR')
 */

/**
 * PayFastTokenResponse:
 * @typedef {Object} PayFastTokenResponse
 * @property {string} MERCHANT_ID - Merchant ID
 * @property {string} ACCESS_TOKEN - Access token for payment
 * @property {string} NAME - Merchant name
 * @property {string} GENERATED_DATE_TIME - Token generation timestamp
 */

/**
 * PayFastPaymentData:
 * @typedef {Object} PayFastPaymentData
 * @property {string} basketId - Basket ID
 * @property {number} amount - Payment amount
 * @property {string} customerEmail - Customer email
 * @property {string} customerMobile - Customer mobile number
 * @property {string} description - Transaction description
 * @property {string} orderDate - Order date (YYYY-MM-DD)
 * @property {string} [customerName] - Customer name
 * @property {string} [billingAddress] - Billing address
 * @property {string} [billingCity] - Billing city
 * @property {string} [shippingAddress] - Shipping address
 * @property {Array} [items] - Array of items
 */

/**
 * PayFastIPNData:
 * @typedef {Object} PayFastIPNData
 * @property {string} transaction_id - Transaction ID
 * @property {string} err_code - Error code
 * @property {string} err_msg - Error message
 * @property {string} basket_id - Basket ID
 * @property {string} order_date - Order date
 * @property {string} validation_hash - Validation hash
 * @property {string} PaymentName - Payment method name
 * @property {string} discounted_amount - Discounted amount
 * @property {string} transaction_amount - Transaction amount
 * @property {string} merchant_amount - Merchant amount
 * @property {string} transaction_currency - Transaction currency
 * @property {string} [mobile_no] - Mobile number
 * @property {string} [email_address] - Email address
 * @property {string} [masked_pan] - Masked PAN
 */

/**
 * Get PayFast Access Token
 * NOTE: This function should be called from a backend API endpoint
 * The SECURED_KEY must never be exposed to the frontend
 * 
 * @param {PayFastTokenRequest} data - Token request data
 * @returns {Promise<PayFastTokenResponse>} Token response
 */
export async function getPayFastToken(data) {
  // For frontend, this should call a backend API endpoint
  // Backend will handle the actual token generation with SECURED_KEY
  const backendUrl = process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:3001';
  
  // Prepare request body matching Next.js format
  const requestBody = {
    amount: parseFloat(data.amount),
    ...(data.basketId && { basketId: data.basketId }),
    ...(data.currencyCode && { currencyCode: data.currencyCode })
  };
  
  const response = await fetch(`${backendUrl}/api/payment/get-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  // Check if response is HTML (error page) instead of JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        'Backend server returned HTML instead of JSON. ' +
        'Please ensure the backend server is running. ' +
        'Start it with: cd backend && npm start'
      );
    }
    throw new Error(`Unexpected response format: ${contentType}`);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(errorData.error || `Failed to get payment token (${response.status})`);
  }

  const result = await response.json();
  
  // Return response matching Next.js format
  // Response includes: { success, token, basketId, merchantId, generatedDateTime }
  return {
    ACCESS_TOKEN: result.token,
    MERCHANT_ID: result.merchantId,
    GENERATED_DATE_TIME: result.generatedDateTime,
    // Also include the full response for compatibility
    ...result
  };
}

/**
 * Calculate SHA256 validation hash for IPN verification
 * Format: basket_id|secured_key|merchant_id|err_code
 * 
 * NOTE: This should only be called server-side with the actual SECURED_KEY
 * For frontend use, this is just for reference - actual verification happens server-side
 * 
 * @param {string} basketId - Basket ID
 * @param {string} errCode - Error code
 * @param {string} securedKey - Secured key (server-side only)
 * @param {string} merchantId - Merchant ID
 * @returns {string} SHA256 hash in hex format
 */
export function calculateValidationHash(basketId, errCode, securedKey, merchantId) {
  if (!securedKey || !merchantId) {
    throw new Error('Secured key and merchant ID are required for hash calculation');
  }

  const hashString = `${basketId}|${securedKey}|${merchantId}|${errCode}`;
  return CryptoJS.SHA256(hashString).toString(CryptoJS.enc.Hex);
}

/**
 * Verify PayFast IPN callback data integrity
 * NOTE: This should be called server-side where SECURED_KEY is available
 * 
 * @param {PayFastIPNData} ipnData - IPN data from PayFast
 * @param {string} securedKey - Secured key (server-side only)
 * @param {string} merchantId - Merchant ID
 * @returns {boolean} True if hash matches
 */
export function verifyIPNHash(ipnData, securedKey, merchantId) {
  if (!securedKey || !merchantId) {
    throw new Error('Secured key and merchant ID are required');
  }

  const calculatedHash = calculateValidationHash(
    ipnData.basket_id,
    ipnData.err_code,
    securedKey,
    merchantId
  );
  
  return calculatedHash.toLowerCase() === (ipnData.validation_hash || '').toLowerCase();
}

/**
 * Check if transaction was successful
 * @param {string} errCode - Error code from PayFast
 * @returns {boolean} True if successful
 */
export function isTransactionSuccessful(errCode) {
  return errCode === '000' || errCode === '00';
}

/**
 * Get error message from error code
 * @param {string} errCode - Error code from PayFast
 * @returns {string} Human-readable error message
 */
export function getErrorMessage(errCode) {
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
export function generateBasketId(prefix = 'ORDER') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format date for PayFast (YYYY-MM-DD)
 * @param {Date} date - Date to format (default: current date)
 * @returns {string} Formatted date string
 */
export function formatOrderDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Create PayFast payment form data
 * @param {PayFastPaymentData} paymentData - Payment data
 * @param {string} token - Access token from getPayFastToken
 * @param {Object} config - Configuration object
 * @param {string} config.merchantId - Merchant ID
 * @param {string} config.merchantName - Merchant name
 * @param {string} config.formPostUrl - Form post URL
 * @param {string} config.successUrl - Success redirect URL
 * @param {string} config.failureUrl - Failure redirect URL
 * @param {string} config.checkoutUrl - Checkout/Webhook URL
 * @returns {Object} Form data object ready for submission
 */
export function createPaymentFormData(paymentData, token, config) {
  const {
    basketId,
    amount,
    customerEmail,
    customerMobile,
    description,
    orderDate,
    customerName,
    billingAddress,
    billingCity,
    items
  } = paymentData;

  const {
    merchantId,
    merchantName,
    formPostUrl,
    successUrl,
    failureUrl,
    checkoutUrl
  } = config;

  // Base form data
  const formData = {
    MERCHANT_ID: merchantId,
    MERCHANT_NAME: merchantName,
    TOKEN: token,
    PROCCODE: '00', // Payment code
    TXNAMT: parseFloat(amount).toFixed(2),
    CUSTOMER_MOBILE_NO: customerMobile,
    CUSTOMER_EMAIL_ADDRESS: customerEmail,
    BASKET_ID: basketId,
    ORDER_DATE: orderDate || formatOrderDate(),
    CURRENCY_CODE: 'PKR',
    TXNDESC: description || 'Payment for Hatche Guide',
    SUCCESS_URL: successUrl,
    FAILURE_URL: failureUrl,
    CHECKOUT_URL: checkoutUrl || failureUrl,
    VERSION: '1.0'
  };

  // Add optional fields
  if (customerName) {
    formData.CUSTOMER_NAME = customerName;
  }
  if (billingAddress) {
    formData.BILLING_ADDRESS = billingAddress;
  }
  if (billingCity) {
    formData.BILLING_CITY = billingCity;
  }

  // Add items if provided
  if (items && items.length > 0) {
    items.forEach((item, index) => {
      formData[`ITEM_SKU_${index + 1}`] = item.sku || '';
      formData[`ITEM_NAME_${index + 1}`] = item.name || '';
      formData[`ITEM_PRICE_${index + 1}`] = item.price.toFixed(2);
      formData[`ITEM_QTY_${index + 1}`] = item.qty || 1;
    });
  }

  return formData;
}

/**
 * Submit payment form to PayFast
 * @param {Object} formData - Form data from createPaymentFormData
 * @param {string} formPostUrl - PayFast form post URL
 */
export function submitPaymentForm(formData, formPostUrl) {
  // Create a form element
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formPostUrl;
  form.style.display = 'none';

  // Add all form fields
  Object.keys(formData).forEach(key => {
    if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = formData[key];
      form.appendChild(input);
    }
  });

  // Append form to body and submit
  document.body.appendChild(form);
  form.submit();
}

