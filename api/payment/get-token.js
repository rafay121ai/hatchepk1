// api/payment/get-token.js
import axios from 'axios';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    console.log('=== GET TOKEN REQUEST ===');
    console.log('Request body:', req.body);

    const { basketId, amount, currencyCode = 'PKR' } = req.body;

    // Validate input
    if (!basketId || !amount) {
      console.error('Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: basketId and amount' 
      });
    }

    // Get environment variables
    const merchantId = process.env.MERCHANT_ID;
    const securedKey = process.env.SECURED_KEY;
    const tokenUrl = process.env.PAYFAST_TOKEN_URL;

    console.log('Environment check:', {
      hasMerchantId: !!merchantId,
      hasSecuredKey: !!securedKey,
      hasTokenUrl: !!tokenUrl,
      merchantId: merchantId // Only log in development
    });

    // Validate environment variables
    if (!merchantId || !securedKey || !tokenUrl) {
      console.error('Missing environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error - missing environment variables' 
      });
    }

    console.log('Calling PayFast API...', {
      url: tokenUrl,
      merchantId,
      basketId,
      amount,
      currencyCode
    });

    // Create URL-encoded parameters
    const params = new URLSearchParams({
      MERCHANT_ID: merchantId,
      SECURED_KEY: securedKey,
      BASKET_ID: basketId,
      TXNAMT: amount.toString(),
      CURRENCY_CODE: currencyCode
    });

    // Call PayFast API
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PayFast-Integration/1.0'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('PayFast response:', response.data);

    // Extract token from response
    const token = response.data?.ACCESS_TOKEN;

    if (!token) {
      console.error('No ACCESS_TOKEN in PayFast response:', response.data);
      throw new Error('No ACCESS_TOKEN in response from PayFast');
    }

    console.log('✅ Token received successfully');

    // Return token to frontend
    return res.status(200).json({
      success: true,
      token: token,
      merchantId: merchantId,
      basketId: basketId
    });

  } catch (error) {
    console.error('❌ Error getting PayFast token:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get payment token',
      details: error.response?.data
    });
  }
}
