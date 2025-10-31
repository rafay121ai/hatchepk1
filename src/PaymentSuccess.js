import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [transactionDetails, setTransactionDetails] = useState({});

  useEffect(() => {
    // Extract all query parameters from PayFast redirect
    const params = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Also check window.location.search as fallback
    if (Object.keys(params).length === 0 && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    
    setTransactionDetails(params);

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Payment success parameters:', params);
    }

    // Track successful purchase in Google Analytics
    if (typeof window !== 'undefined' && window.gtag && params.transaction_id) {
      window.gtag('event', 'purchase', {
        transaction_id: params.transaction_id,
        value: parseFloat(params.transaction_amount || params.merchant_amount || 0),
        currency: 'PKR',
        items: [{
          item_id: params.basket_id,
          item_name: 'Guide Purchase',
          price: parseFloat(params.transaction_amount || params.merchant_amount || 0),
          quantity: 1
        }]
      });
    }
  }, [searchParams]);

  const transactionId = transactionDetails.transaction_id;
  const basketId = transactionDetails.basket_id;
  const amount = transactionDetails.transaction_amount || transactionDetails.merchant_amount;
  const errCode = transactionDetails.err_code;

  return (
    <div className="payment-success-page">
      <div className="payment-success-container">
        <div className="payment-success-card">
          {/* Success Icon */}
          <div className="success-icon">
            <svg
              className="check-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="payment-success-title">Payment Successful!</h1>
          <p className="payment-success-message">
            Your payment has been processed successfully.
          </p>

          {/* Transaction Details */}
          <div className="transaction-details">
            <h2 className="transaction-details-title">
              Transaction Details
            </h2>
            <div className="transaction-details-list">
              {transactionId && (
                <div className="transaction-detail-row">
                  <span className="transaction-detail-label">Transaction ID:</span>
                  <span className="transaction-detail-value break-all">
                    {transactionId}
                  </span>
                </div>
              )}
              {basketId && (
                <div className="transaction-detail-row">
                  <span className="transaction-detail-label">Order ID:</span>
                  <span className="transaction-detail-value">{basketId}</span>
                </div>
              )}
              {amount && (
                <div className="transaction-detail-row">
                  <span className="transaction-detail-label">Amount:</span>
                  <span className="transaction-detail-value">PKR {amount}</span>
                </div>
              )}
              {errCode && (
                <div className="transaction-detail-row">
                  <span className="transaction-detail-label">Status Code:</span>
                  <span className="transaction-detail-value status-success">{errCode}</span>
                </div>
              )}
              {transactionDetails.PaymentName && (
                <div className="transaction-detail-row">
                  <span className="transaction-detail-label">Payment Method:</span>
                  <span className="transaction-detail-value">
                    {transactionDetails.PaymentName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="payment-success-actions">
            <button
              onClick={() => navigate('/')}
              className="btn-primary btn-full"
            >
              Return to Home
            </button>
            <button
              onClick={() => navigate('/your-guides')}
              className="btn-secondary btn-full"
            >
              View My Guides
            </button>
          </div>

          <p className="payment-success-footer">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
