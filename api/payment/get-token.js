/**
 * Vercel Serverless Function: Get PayFast Access Token
 * 
 * POST /api/payment/get-token
 * 
 * This endpoint generates a PayFast access token for payment processing.
 */

// Load environment variables (Vercel handles this automatically, but we need the utils)
const {
  getPayFastToken,
  generateBasketId
} = require('./payfast-utils');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    });
  }

  try {
    // Log environment variables check (for debugging - don't log actual values)
    const hasMerchantId = !!process.env.PAYFAST_MERCHANT_ID;
    const hasSecuredKey = !!process.env.PAYFAST_SECURED_KEY;
    const hasTokenUrl = !!process.env.PAYFAST_TOKEN_API_URL;
    
    // Log ALL environment variable keys that contain "PAYFAST" (for debugging)
    const allEnvKeys = Object.keys(process.env);
    const payfastKeys = allEnvKeys.filter(k => k.includes('PAYFAST'));
    
    console.log('=== PayFast Environment Variables Check ===');
    console.log('PAYFAST_MERCHANT_ID:', hasMerchantId ? '✓ Set' : '✗ Missing');
    console.log('PAYFAST_SECURED_KEY:', hasSecuredKey ? '✓ Set' : '✗ Missing');
    console.log('PAYFAST_TOKEN_API_URL:', hasTokenUrl ? '✓ Set' : '✗ Missing');
    console.log('All PAYFAST-related env vars found:', payfastKeys);
    console.log('Total env vars:', allEnvKeys.length);
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV || 'not set');
    console.log('===========================================');
    
    // Early validation - if missing, return error immediately
    if (!hasMerchantId || !hasSecuredKey || !hasTokenUrl) {
      const missing = [];
      if (!hasMerchantId) missing.push('PAYFAST_MERCHANT_ID');
      if (!hasSecuredKey) missing.push('PAYFAST_SECURED_KEY');
      if (!hasTokenUrl) missing.push('PAYFAST_TOKEN_API_URL');
      
      return res.status(500).json({
        success: false,
        error: `PayFast credentials not configured. Missing: ${missing.join(', ')}`,
        instructions: 'Please set these in Vercel Dashboard: Settings > Environment Variables. Make sure to select all environments (Production, Preview, Development) and redeploy after adding them.',
        foundEnvVars: payfastKeys
      });
    }

    const { amount, basketId, currencyCode } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Generate basket ID if not provided
    const finalBasketId = basketId || generateBasketId();

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Get token from PayFast
    const tokenResponse = await getPayFastToken({
      basketId: finalBasketId,
      amount: amountNum,
      currencyCode: currencyCode || 'PKR',
    });

    // Return response matching Next.js format
    return res.status(200).json({
      success: true,
      token: tokenResponse.ACCESS_TOKEN,
      basketId: finalBasketId,
      merchantId: tokenResponse.MERCHANT_ID || process.env.PAYFAST_MERCHANT_ID,
      generatedDateTime: tokenResponse.GENERATED_DATE_TIME || new Date().toISOString()
    });

  } catch (error) {
    console.error('PayFast token error:', error);
    console.error('Error stack:', error.stack);
    
    // Return more detailed error information
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment token',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        envCheck: {
          PAYFAST_MERCHANT_ID: !!process.env.PAYFAST_MERCHANT_ID,
          PAYFAST_SECURED_KEY: !!process.env.PAYFAST_SECURED_KEY,
          PAYFAST_TOKEN_API_URL: !!process.env.PAYFAST_TOKEN_API_URL,
        }
      } : undefined
    });
  }
};

