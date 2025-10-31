/**
 * PayFast Payment API Endpoints
 * 
 * This file provides API endpoints for PayFast payment integration.
 * These endpoints should be deployed server-side only.
 */

require('dotenv').config();
const express = require('express');
const router = express.Router();
const {
  getPayFastToken,
  calculateValidationHash,
  verifyIPNHash,
  isTransactionSuccessful,
  getErrorMessage,
  generateBasketId,
  formatOrderDate
} = require('../payfast-utils');

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/payment/get-token
 * Get PayFast access token
 * 
 * Request Body:
 * {
 *   "amount": 299.00,
 *   "basketId": "ORDER-123456789" (optional - will be generated if not provided),
 *   "currencyCode": "PKR" (optional - defaults to PKR)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "token": "abc123xyz...",
 *   "basketId": "ORDER-123456789",
 *   "merchantId": "242347",
 *   "generatedDateTime": "2024-01-01T12:00:00Z"
 * }
 */
router.post('/get-token', async (req, res) => {
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
    return res.json({
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
});

/**
 * POST /api/payment/webhook
 * PayFast IPN (Instant Payment Notification) Webhook Handler
 * 
 * This endpoint receives payment notifications from PayFast.
 * PayFast can send data as form-urlencoded or JSON.
 */
router.post('/webhook', async (req, res) => {
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
});

/**
 * Log transaction for audit trail
 * @param {Object} ipnData - IPN data from PayFast
 * @param {boolean} isSuccess - Whether transaction was successful
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

    // TODO: Implement additional logging mechanism
    // This could be:
    // - Writing to a log file
    // - Storing in a separate transactions_log table
    // - Sending to an external logging service (e.g., Loggly, DataDog)
    // - Writing to Supabase audit log table

    // Example: Store in a transactions_log table (if you have one)
    /*
    const { error: logError } = await supabase
      .from('transactions_log')
      .insert({
        basket_id: ipnData.basket_id,
        transaction_id: ipnData.transaction_id,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        amount: parseFloat(ipnData.transaction_amount),
        payment_method: ipnData.PaymentName,
        error_code: ipnData.err_code,
        error_message: ipnData.err_msg,
        raw_data: JSON.stringify(ipnData),
        logged_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging transaction:', logError);
    }
    */

  } catch (error) {
    console.error('Error in transaction logging:', error);
    // Don't throw - logging errors shouldn't break the IPN handler
  }
}

/**
 * GET /api/payment/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PayFast Payment API',
    timestamp: new Date().toISOString(),
    merchantId: process.env.PAYFAST_MERCHANT_ID ? 'configured' : 'missing'
  });
});

module.exports = router;

