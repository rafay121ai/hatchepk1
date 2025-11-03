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
    console.log('Full IPN Data:', ipnData);

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
      console.log('✅ PAYMENT SUCCESSFUL');
      
      // Find and update order in database
      // First, try to find order by looking for pending orders with matching product
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('Error fetching orders:', fetchError);
      }

      console.log('Found pending orders:', orders);

      // Update the most recent pending order to completed
      if (orders && orders.length > 0) {
        const orderToUpdate = orders[0]; // Most recent pending order
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({ order_status: 'completed' })
          .eq('id', orderToUpdate.id);

        if (updateError) {
          console.error('Error updating order:', updateError);
        } else {
          console.log('✅ Order updated to completed:', orderToUpdate.id);
        }
      } else {
        console.log('⚠️ No pending orders found to update');
      }

    } else {
      console.log('❌ PAYMENT FAILED');
      console.log('Error Code:', errCode);
      console.log('Error Message:', errMsg);

      // Update order to failed status if found
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('order_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (orders && orders.length > 0) {
        await supabase
          .from('orders')
          .update({ order_status: 'failed' })
          .eq('id', orders[0].id);
        
        console.log('Order marked as failed');
      }
    }
    
    // IMPORTANT: Return 200 status to acknowledge receipt
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Error processing notification');
  }
};

