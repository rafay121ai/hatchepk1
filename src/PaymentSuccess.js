import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        // Get order info from sessionStorage
        const pendingOrderStr = sessionStorage.getItem('pendingOrder');
        const pendingOrder = pendingOrderStr ? JSON.parse(pendingOrderStr) : null;

        // Get payment details from URL parameters
        const basketId = searchParams.get('BASKET_ID');
        const status = searchParams.get('STATUS');
        const errCode = searchParams.get('ERR_CODE') || '000';

        console.log('Payment success page loaded:', {
          basketId,
          status,
          errCode,
          pendingOrder
        });

        // Update order status to completed
        if (pendingOrder && pendingOrder.orderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ order_status: 'completed' })
            .eq('id', pendingOrder.orderId);

          if (updateError) {
            console.error('Error updating order status:', updateError);
          }
        }

        setOrderInfo({
          basketId: basketId || pendingOrder?.basketId,
          guideTitle: pendingOrder?.guideTitle || 'Your Guide',
          amount: pendingOrder?.amount || 0,
          orderId: pendingOrder?.orderId,
          status: status,
          errCode: errCode
        });

        // Track purchase with Google Analytics
        if (typeof window !== 'undefined' && window.gtag && pendingOrder) {
          window.gtag('event', 'purchase', {
            transaction_id: pendingOrder.orderId,
            value: pendingOrder.amount,
            currency: 'PKR'
          });
        }

        // Clear pending order from sessionStorage
        sessionStorage.removeItem('pendingOrder');

        setLoading(false);
      } catch (error) {
        console.error('Error processing payment success:', error);
        setLoading(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="payment-success-page">
        <div className="loading-spinner"></div>
        <p>Processing your payment...</p>
      </div>
    );
  }

  return (
    <div className="payment-success-page">
      <div className="success-container">
        <div className="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p className="success-message">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        {orderInfo && (
          <div className="order-details">
            <h2>Order Details</h2>
            <div className="detail-row">
              <span className="detail-label">Guide:</span>
              <span className="detail-value">{orderInfo.guideTitle}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value">PKR {orderInfo.amount}</span>
            </div>
            {orderInfo.basketId && (
              <div className="detail-row">
                <span className="detail-label">Transaction ID:</span>
                <span className="detail-value">{orderInfo.basketId}</span>
              </div>
            )}
          </div>
        )}

        <div className="success-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/your-guides')}
          >
            View Your Guides
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;

