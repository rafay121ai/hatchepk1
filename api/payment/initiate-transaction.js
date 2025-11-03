// api/payment/initiate-transaction.js
const axios = require('axios');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    console.log('=== INITIATE TRANSACTION REQUEST ===');
    console.log('Request body:', req.body);

    const {
      token,
      basketId,
      amount,
      customerEmail,
      customerMobile,
      customerName,
      accountTypeId = '3', // Default to account type 3
      orderDescription
    } = req.body;

    // Validate required fields
    if (!token || !basketId || !amount || !customerEmail || !customerMobile) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get transaction URL from environment
    const transactionUrl = process.env.PAYFAST_TRANSACTION_URL || 
      'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/transaction';
    const merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || 'default';

    console.log('Calling PayFast transaction API...');

    // Prepare form data (as per PayFast docs)
    const params = new URLSearchParams({
      basket_id: basketId,
      txnamt: amount.toString(),
      customer_email_address: customerEmail,
      account_type_id: accountTypeId,
      customer_mobile_no: customerMobile,
      merCatCode: merchantCategoryCode,
      customer_ip: '127.0.0.1',
      order_date: new Date().toISOString().replace('T', ' ').substring(0, 19), // YYYY-MM-DD HH:mm:ss
      otp_required: 'yes',
      recurring_txn: 'no'
    });

    // Call PayFast transaction API
    const response = await axios.post(transactionUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache'
      },
      timeout: 15000
    });

    console.log('PayFast transaction response:', response.data);

    // Return response to frontend
    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Transaction initiation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.status_msg || error.message || 'Failed to initiate transaction',
      details: error.response?.data
    });
  }
};

