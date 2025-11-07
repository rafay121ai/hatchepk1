// api/payment/temp-token.js
// Get Temporary Transaction Token (with card details)
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
    console.log('=== GET TEMPORARY TOKEN REQUEST ===');
    
    const {
      accessToken,
      basketId,
      amount,
      merchantUserId,
      userMobileNumber,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      accountType = '4' // 4 for card payment
    } = req.body;

    // Validate input
    if (!accessToken || !basketId || !amount || !cardNumber || !cvv) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const tempTokenUrl = process.env.PAYFAST_TEMP_TOKEN_URL ||
      'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/transaction/token';
    const merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || 'default';

    console.log('Calling PayFast temp token API...');

    // Prepare form data
    const params = new URLSearchParams({
      merchant_user_id: merchantUserId,
      user_mobile_number: userMobileNumber,
      basket_id: basketId,
      txnamt: amount.toString(),
      account_type: accountType,
      card_number: cardNumber,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      cvv: cvv,
      customer_ip: '127.0.0.1',
      merCatCode: merchantCategoryCode,
      order_date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    const response = await axios.post(tempTokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 15000
    });

    console.log('Temp token response:', response.data);

    // Return response
    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error getting temp token:', {
      message: error.message,
      response: error.response?.data
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.status_msg || error.message,
      details: error.response?.data
    });
  }
};

