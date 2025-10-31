import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from './utils/payfast';
import './PaymentCancel.css';

function PaymentCancel() {
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
      console.log('Payment failure parameters:', params);
    }
  }, [searchParams]);

  const errCode = transactionDetails.err_code || 'Unknown';
  const errMsg = transactionDetails.err_msg || 'Payment failed';
  const basketId = transactionDetails.basket_id;
  const amount = transactionDetails.merchant_amount || transactionDetails.transaction_amount;

  // Get friendly error message
  const errorMessage = getErrorMessage(errCode);

  return (
    <div className="payment-cancel-page">
      <div className="payment-cancel-container">
        <div className="payment-cancel-card">
          {/* Failure Icon */}
          <div className="cancel-icon">
            <svg
              className="cancel-icon-svg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="payment-cancel-title">Payment Failed</h1>
          <p className="payment-cancel-message">
            Unfortunately, your payment could not be processed.
          </p>

          {/* Error Details */}
          <div className="error-details">
            <h2 className="error-details-title">
              Error Details
            </h2>
            <div className="error-details-list">
              <div className="error-detail-item">
                <span className="error-detail-label">Error Message:</span>
                <p className="error-detail-message">{errorMessage}</p>
              </div>
              <div className="error-detail-row">
                <span className="error-detail-label">Error Code:</span>
                <span className="error-detail-value">{errCode}</span>
              </div>
              {basketId && (
                <div className="error-detail-row">
                  <span className="error-detail-label">Order ID:</span>
                  <span className="error-detail-value">{basketId}</span>
                </div>
              )}
              {amount && (
                <div className="error-detail-row">
                  <span className="error-detail-label">Amount:</span>
                  <span className="error-detail-value">PKR {amount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Common Issues */}
          <div className="common-issues">
            <h3 className="common-issues-title">Common Issues:</h3>
            <ul className="common-issues-list">
              <li className="common-issue-item">
                <span className="issue-bullet">•</span>
                <span>Insufficient balance in your account</span>
              </li>
              <li className="common-issue-item">
                <span className="issue-bullet">•</span>
                <span>Incorrect card details or expired card</span>
              </li>
              <li className="common-issue-item">
                <span className="issue-bullet">•</span>
                <span>Invalid or expired OTP</span>
              </li>
              <li className="common-issue-item">
                <span className="issue-bullet">•</span>
                <span>Transaction limit exceeded</span>
              </li>
              <li className="common-issue-item">
                <span className="issue-bullet">•</span>
                <span>Network connectivity issues</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="payment-cancel-actions">
            <button
              onClick={() => navigate(-1)} // Go back to checkout
              className="btn-primary btn-full"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary btn-full"
            >
              Return to Home
            </button>
          </div>

          <p className="payment-cancel-footer">
            If the problem persists, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancel;
