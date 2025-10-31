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
} = require('../../backend/payfast-utils');

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
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment token'
    });
  }
};

