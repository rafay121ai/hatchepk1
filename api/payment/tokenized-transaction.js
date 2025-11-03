// api/payment/tokenized-transaction.js
// Process payment using temporary token
const axios = require('axios');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    console.log('=== TOKENIZED TRANSACTION REQUEST ===');

    const {
      accessToken,
      instrumentToken,
      transactionId,
      merchantUserId,
      userMobileNumber,
      basketId,
      amount,
      description,
      otp
    } = req.body;

    // Validate required fields
    if (!accessToken || !instrumentToken || !transactionId || !basketId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get environment variables
    const tokenizedUrl = process.env.PAYFAST_TOKENIZED_URL || 
      'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/transaction/tokenized';
    const merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || 'default';

    // Prepare form data
    const params = new URLSearchParams({
      instrument_token: instrumentToken,
      transaction_id: transactionId,
      merchant_user_id: merchantUserId,
      user_mobile_number: userMobileNumber,
      basket_id: basketId,
      order_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      txndesc: description || 'Purchase',
      txnamt: amount.toString(),
      customer_ip: '127.0.0.1',
      merCatCode: merchantCategoryCode
    });

    // Add OTP if provided
    if (otp) {
      params.append('otp', otp);
    }

    console.log('Calling PayFast tokenized transaction API...');

    // Call PayFast API
    const response = await axios.post(tokenizedUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 15000
    });

    console.log('Tokenized transaction response:', response.data);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error in tokenized transaction:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.status_msg || error.message || 'Failed to process payment',
      details: error.response?.data
    });
  }
};
