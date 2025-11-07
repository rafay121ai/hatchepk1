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

        // Note: Order creation and email sending is handled by webhook
        // This page just displays success information

        setOrderInfo({
          basketId: basketId || pendingOrder?.basket_id,
          guideTitle: pendingOrder?.product_name || 'Your Guide',
          amount: pendingOrder?.amount || 0,
          status: status,
          errCode: errCode
        });

        // Track purchase with Google Analytics
        if (typeof window !== 'undefined' && window.gtag && pendingOrder) {
          window.gtag('event', 'purchase', {
            transaction_id: basketId,
            value: pendingOrder.amount,
            currency: 'PKR',
            items: [{
              item_name: pendingOrder.product_name,
              price: pendingOrder.amount,
              quantity: 1
            }]
          });
        }

        // Clear pending order and checkout guide from sessionStorage
        sessionStorage.removeItem('pendingOrder');
        sessionStorage.removeItem('checkoutGuide');

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

