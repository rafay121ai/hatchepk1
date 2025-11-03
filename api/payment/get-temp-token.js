// api/payment/get-temp-token.js
// Get temporary transaction token with card/account details
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
      // Card fields
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      // Bank account fields
      bankCode,
      accountNumber,
      cnicNumber,
      accountTitle
    } = req.body;

    // Determine account type based on provided fields
    const accountType = cardNumber ? '4' : '1'; // 4 = Card, 1 = Bank Account

    // Validate required fields
    if (!accessToken || !basketId || !amount || !merchantUserId || !userMobileNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get environment variables
    const tempTokenUrl = process.env.PAYFAST_TEMP_TOKEN_URL || 
      'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/transaction/token';
    const merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || 'default';

    // Prepare form data
    const params = new URLSearchParams({
      merchant_user_id: merchantUserId,
      user_mobile_number: userMobileNumber,
      basket_id: basketId,
      txnamt: amount.toString(),
      account_type: accountType,
      customer_ip: '127.0.0.1',
      merCatCode: merchantCategoryCode,
      order_date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    // Add card details if provided
    if (cardNumber && expiryMonth && expiryYear && cvv) {
      params.append('card_number', cardNumber.replace(/\s/g, ''));
      params.append('expiry_month', expiryMonth);
      params.append('expiry_year', expiryYear);
      params.append('cvv', cvv);
    }
    
    // Add bank account details if provided
    if (bankCode && accountNumber && cnicNumber) {
      params.append('bank_code', bankCode);
      params.append('account_number', accountNumber);
      params.append('cnic_number', cnicNumber);
      if (accountTitle) {
        params.append('account_title', accountTitle);
      }
    }

    console.log('Calling PayFast temporary token API...');

    // Call PayFast API
    const response = await axios.post(tempTokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 15000
    });

    console.log('Temp token response:', response.data);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Error getting temporary token:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    return res.status(500).json({
      success: false,
      error: error.response?.data?.status_msg || error.message || 'Failed to get temporary token',
      details: error.response?.data
    });
  }
};

