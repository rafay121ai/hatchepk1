/**
 * Vercel Serverless Function: PayFast IPN Webhook
 * 
 * POST /api/payment/webhook
 * This endpoint receives payment notifications from PayFast.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbG1icWdxa2lqb2RieGZwcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDIxOTQsImV4cCI6MjA3NjgxODE5NH0.FBFN5O8rZIPx0DJTFPto6VokT_VgLZiJeCQcWkLej1w';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const ipnData = req.body;
    
    console.log('=== PAYMENT NOTIFICATION RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Full IPN Data:', JSON.stringify(ipnData, null, 2));

    // Extract fields (support both lowercase and uppercase)
    const basketId = ipnData.basket_id || ipnData.BASKET_ID;
    const errCode = ipnData.err_code || ipnData.ERR_CODE || '000';
    const errMsg = ipnData.err_msg || ipnData.ERR_MSG || '';
    const transactionId = ipnData.transaction_id || ipnData.TRANSACTION_ID;
    const transactionAmount = ipnData.transaction_amount || ipnData.TXNAMT;
    const receivedHash = ipnData.validation_hash || ipnData.VALIDATION_HASH;
    
    console.log('Extracted Data:', {
      basketId,
      errCode,
      errMsg,
      transactionId,
      transactionAmount
    });

    // Verify hash
    const securedKey = process.env.SECURED_KEY;
    const merchantId = process.env.MERCHANT_ID;
    
    if (!securedKey || !merchantId) {
      console.error('Missing credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const calculatedHash = crypto
      .createHash('sha256')
      .update(`${basketId}|${securedKey}|${merchantId}|${errCode}`)
      .digest('hex');
    
    console.log('Hash Validation:', {
      received: receivedHash,
      calculated: calculatedHash,
      match: calculatedHash.toLowerCase() === receivedHash?.toLowerCase()
    });
    
    if (calculatedHash.toLowerCase() !== receivedHash?.toLowerCase()) {
      console.error('❌ HASH VALIDATION FAILED - Possible fraud attempt!');
      return res.status(400).json({ error: 'Invalid hash' });
    }

    // Check if payment was successful
    if (errCode === '000' || errCode === '00') {
      console.log('✅ PAYMENT SUCCESSFUL - Creating order in database');
      
      // Extract order details from IPN data (custom fields we passed)
      const customerEmail = ipnData.customer_email_address || ipnData.CUSTOMER_EMAIL_ADDRESS;
      const customerName = ipnData.customer_name || ipnData.CUSTOMER_NAME;
      const productName = ipnData.product_name || ipnData.PRODUCT_NAME;
      const refId = ipnData.ref_id || ipnData.REF_ID || null;

      // Create order in database (ONLY on successful payment)
      const orderPayload = {
        customer_email: customerEmail,
        customer_name: customerName,
        product_name: productName,
        amount: parseFloat(transactionAmount),
        by_ref_id: refId,
        order_status: 'completed'
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select();

      if (orderError) {
        console.error('❌ Error creating order:', orderError);
      } else {
        console.log('✅ Order created successfully:', orderData[0]?.id);

        // Send order confirmation email (ONLY on successful payment)
        try {
          const emailResponse = await fetch(process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}/api/emails/send-order-confirmation`
            : 'https://hatchepk.com/api/emails/send-order-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: customerName,
              customerEmail: customerEmail,
              guideTitle: productName,
              orderAmount: parseFloat(transactionAmount),
              orderId: orderData[0]?.id
            })
          });

          if (emailResponse.ok) {
            console.log('✅ Order confirmation email sent');
          } else {
            console.error('⚠️ Email failed (non-critical)');
          }
        } catch (emailError) {
          console.error('⚠️ Email error (non-critical):', emailError);
        }
      }

    } else {
      console.log('❌ PAYMENT FAILED - No order created, no email sent');
      console.log('Error Code:', errCode);
      console.log('Error Message:', errMsg);
      // Do nothing - failed payments don't create database entries or send emails
    }
    
    // IMPORTANT: Return 200 status to acknowledge receipt
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Error processing notification');
  }
};

