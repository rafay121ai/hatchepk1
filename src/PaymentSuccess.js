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

        // Update pending order to completed status
        console.log('📦 Pending order from session:', pendingOrder);
        console.log('🔍 URL params:', { basketId, status, errCode });

        if (!pendingOrder || !pendingOrder.orderId) {
          console.error('❌ No pending order found in sessionStorage');
          setOrderInfo({
            basketId: basketId || 'N/A',
            guideTitle: 'Your Guide',
            amount: 0,
            status: status,
            errCode: errCode
          });
          setLoading(false);
          return;
        }

        // Update order status from 'pending' to 'completed'
        console.log('🔄 Updating order status to completed...');
        
        try {
          const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({
              order_status: 'completed',
              transaction_id: basketId
            })
            .eq('id', pendingOrder.orderId)
            .select();

          if (updateError) {
            console.error('❌ Error updating order:', updateError);
          } else {
            console.log('✅ Order updated to completed:', updatedOrder);
            
            // Send order confirmation email
            try {
              await fetch('/api/emails/send-order-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customerName: pendingOrder.customer_name,
                  customerEmail: pendingOrder.customer_email,
                  guideTitle: pendingOrder.product_name,
                  orderAmount: pendingOrder.amount,
                  orderId: pendingOrder.orderId
                })
              });
              console.log('✅ Order confirmation email sent');
            } catch (emailError) {
              console.error('⚠️ Email error (non-critical):', emailError);
            }
          }
        } catch (updateOrderError) {
          console.error('❌ Update order error:', updateOrderError);
        }

        setOrderInfo({
          basketId: basketId || pendingOrder?.basket_id || 'N/A',
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

