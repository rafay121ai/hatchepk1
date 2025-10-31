/**
 * Vercel Serverless Function: PayFast IPN Webhook Handler
 * 
 * POST /api/payment/webhook
 * 
 * This endpoint receives payment notifications from PayFast.
 * PayFast can send data as form-urlencoded or JSON.
 */

const {
  verifyIPNHash,
  isTransactionSuccessful,
  getErrorMessage
} = require('../../backend/payfast-utils');

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Log transaction for audit trail
 */
async function logTransaction(ipnData, isSuccess) {
  try {
    // Log to console (in production, you might want to use a logging service)
    console.log('Transaction log:', {
      timestamp: new Date().toISOString(),
      basket_id: ipnData.basket_id,
      transaction_id: ipnData.transaction_id,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      amount: ipnData.transaction_amount,
      payment_method: ipnData.PaymentName,
      error_code: ipnData.err_code,
      error_message: ipnData.err_msg,
      customer_mobile: ipnData.mobile_no,
      customer_email: ipnData.email_address,
      merchant_amount: ipnData.merchant_amount,
      transaction_currency: ipnData.transaction_currency,
      masked_pan: ipnData.masked_pan
    });
  } catch (error) {
    console.error('Error in transaction logging:', error);
    // Don't throw - logging errors shouldn't break the IPN handler
  }
}

module.exports = async (req, res) => {
  // Set CORS headers (for PayFast to call this endpoint)
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
    // Parse IPN data (can be form-urlencoded or JSON)
    const contentType = req.headers['content-type'] || '';
    let ipnData;

    if (contentType.includes('application/json')) {
      ipnData = req.body;
    } else {
      // Form-urlencoded data (default for PayFast)
      ipnData = req.body;
    }

    // Log incoming IPN for debugging
    console.log('PayFast IPN received:', {
      basket_id: ipnData.basket_id,
      transaction_id: ipnData.transaction_id,
      err_code: ipnData.err_code,
      amount: ipnData.transaction_amount,
    });

    // Verify hash for data integrity
    const isValid = verifyIPNHash(ipnData);
    if (!isValid) {
      console.error('Invalid IPN hash verification', {
        basket_id: ipnData.basket_id,
        received_hash: ipnData.validation_hash,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid hash verification'
      });
    }

    // Check transaction status
    const isSuccess = isTransactionSuccessful(ipnData.err_code);
    const errorMessage = getErrorMessage(ipnData.err_code);

    // Extract transaction details
    const basketId = ipnData.basket_id;
    const transactionId = ipnData.transaction_id;
    const transactionAmount = parseFloat(ipnData.transaction_amount || 0);
    const errCode = ipnData.err_code;
    const errMsg = ipnData.err_msg || errorMessage;
    const paymentMethod = ipnData.PaymentName || 'PayFast';

    // Update database with transaction status
    const orderPayload = {
      order_id: basketId,
      order_status: isSuccess ? 'completed' : 'failed',
      amount: transactionAmount,
      payment_id: transactionId,
      payment_method: paymentMethod,
      payment_date: isSuccess ? new Date().toISOString() : null,
      err_code: errCode,
      err_msg: errMsg,
      raw_response: JSON.stringify(ipnData)
    };

    // Check if order exists
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', basketId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking order:', checkError);
    }

    if (existingOrder) {
      // Update existing order
      const { error: updateError } = await supabase
        .from('orders')
        .update(orderPayload)
        .eq('order_id', basketId);

      if (updateError) {
        console.error('Error updating order:', updateError);
      } else {
        console.log('Order updated successfully:', basketId);
      }
    } else {
      // Create new order (if not exists)
      // Note: You might want to get order details from a temporary store or basket
      const { error: insertError } = await supabase
        .from('orders')
        .insert(orderPayload);

      if (insertError) {
        console.error('Error creating order:', insertError);
      } else {
        console.log('Order created successfully:', basketId);
      }
    }

    // Log transaction for audit trail
    await logTransaction(ipnData, isSuccess);

    console.log('Payment processed:', {
      basket_id: basketId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      message: errorMessage,
    });

    // Return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'IPN received and processed',
    });

  } catch (error) {
    console.error('IPN processing error:', error);
    // Still return 200 to prevent PayFast from retrying
    return res.status(200).json({
      success: false,
      error: 'Internal processing error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

