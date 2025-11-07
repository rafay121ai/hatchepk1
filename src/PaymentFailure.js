import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PaymentFailure.css';

function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    // Get error details from URL parameters
    const basketId = searchParams.get('BASKET_ID');
    const errCode = searchParams.get('ERR_CODE');
    const errMsg = searchParams.get('ERR_MSG');

    // Get pending order from sessionStorage
    const pendingOrderStr = sessionStorage.getItem('pendingOrder');
    const pendingOrder = pendingOrderStr ? JSON.parse(pendingOrderStr) : null;

    // Log all URL parameters for debugging
    const allParams = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    
    console.log('🔴 Payment failed - All URL parameters:', allParams);
    console.log('📦 Pending order:', pendingOrder);

    setErrorInfo({
      basketId: basketId || pendingOrder?.basket_id,
      errCode: errCode || 'Unknown',
      errMsg: errMsg || 'Payment was not completed',
      guideTitle: pendingOrder?.product_name || 'Your Guide',
      amount: pendingOrder?.amount || 0,
      allParams: allParams
    });

    // Clear pending order and checkout guide
    sessionStorage.removeItem('pendingOrder');
    sessionStorage.removeItem('checkoutGuide');
  }, [searchParams]);

  const getErrorMessage = (errCode) => {
    const errorMessages = {
      '002': 'Transaction timeout',
      '97': 'Insufficient balance',
      '106': 'Transaction limit exceeded',
      '03': 'Inactive account',
      '104': 'Incorrect details',
      '55': 'Invalid OTP/PIN',
      '54': 'Card expired',
      '13': 'Invalid amount',
      '126': 'Invalid account details',
    };
    return errorMessages[errCode] || 'Payment failed';
  };

  return (
    <div className="payment-failure-page">
      <div className="failure-container">
        <div className="failure-icon">✕</div>
        <h1>Payment Failed</h1>
        <p className="failure-message">
          {errorInfo ? getErrorMessage(errorInfo.errCode) : 'Payment was not completed'}
        </p>

        {errorInfo && errorInfo.errCode && (
          <div className="error-details">
            <div className="detail-row">
              <span className="detail-label">Error Code:</span>
              <span className="detail-value">{errorInfo.errCode}</span>
            </div>
            {errorInfo.errMsg && (
              <div className="detail-row">
                <span className="detail-label">Message:</span>
                <span className="detail-value">{errorInfo.errMsg}</span>
              </div>
            )}
          </div>
        )}

        <div className="failure-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/our-guides')}
          >
            Our Guides
          </button>
        </div>

        <p className="support-text">
          Need help? Contact us at <a href="mailto:info@hatche.com">info@hatche.com</a>
        </p>
      </div>
    </div>
  );
}

export default PaymentFailure;

