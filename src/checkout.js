// Simple checkout component
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './checkout.css';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

// Import validation utilities
import { validators, useFormValidation } from './utils/validation';

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [guide, setGuide] = useState(null);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempTransactionData, setTempTransactionData] = useState(null);

  // Define validation rules
  const validationRules = {
    firstName: validators.name,
    lastName: validators.name,
    email: validators.email,
    phone: validators.phone,
  };

  // Use custom validation hook
  const {
    values: formData,
    errors,
    touched,
    handleChange: handleInputChange,
    handleBlur,
    validateAll,
    setValues,
  } = useFormValidation(
    {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Pakistan',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
    },
    validationRules
  );

  useEffect(() => {
    const loadGuideFromDatabase = async () => {
      const guideData = location.state?.guide;
      if (!guideData) {
        navigate('/our-guides');
        return;
      }

      try {
        // Fetch the guide from the database to ensure we have the latest data
        const { data, error } = await supabase
          .from('guides')
          .select('*')
          .eq('id', guideData.id)
          .single();

        if (error) {
          console.error('Error fetching guide from database:', error);
          // Fallback to state data if database fetch fails
          setGuide(guideData);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('Loaded guide from database:', data);
          }
          setGuide(data);
        }
      } catch (err) {
        console.error('Error loading guide:', err);
        // Fallback to state data
        setGuide(guideData);
      }

      // Pre-fill form with user data if available
      if (user) {
        setValues(prev => ({
          ...prev,
          firstName: user.user_metadata?.firstName || prev.firstName,
          lastName: user.user_metadata?.lastName || prev.lastName,
          email: user.email || prev.email,
          phone: user.user_metadata?.phone || prev.phone,
        }));
      }
    };

    loadGuideFromDatabase();
  }, [location.state, navigate, user, setValues]);

  const handleNextStep = () => {
    if (step === 1) {
      // Validate required fields before moving to next step
      const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
      const hasErrors = requiredFields.some(field => errors[field]);
      const allFilled = requiredFields.every(field => formData[field]);

      if (hasErrors || !allFilled) {
        setSubmitError('Please fill in all required fields correctly');
        return;
      }
    }

    setStep(step + 1);
    setSubmitError('');
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
    setSubmitError('');
  };


  const handlePayment = async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!validateAll()) {
      setSubmitError('Please fill in all required fields correctly');
      return;
    }

    setIsProcessing(true);
    setSubmitError('');

    try {
      // Get referral ID from sessionStorage if available
      const referralId = sessionStorage.getItem('refId');

      // Generate unique basket ID
      const basketId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Step 1: Get access token from our backend API
      // Use relative path so it works with any domain (localhost, vercel, custom domain)
      const tokenResponse = await fetch('/api/payment/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          basketId: basketId,
          amount: guide.price
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        console.error('Token API error:', {
          status: tokenResponse.status,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to initialize payment (${tokenResponse.status})`);
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to get payment token');
      }

      console.log('✅ Access token received:', tokenData.token);

      // Step 2: Create order in database with pending status
      const orderPayload = {
        customer_email: user?.email || formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        product_name: guide.title,
        amount: guide.price,
        by_ref_id: referralId,
        order_status: 'pending',
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Failed to create order. Please try again.');
      }

      // Step 3: Get temporary transaction token with card details
      console.log('Getting temporary transaction token...');
      
      const tempTokenResponse = await fetch('/api/payment/get-temp-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokenData.token,
          basketId: basketId,
          amount: guide.price,
          merchantUserId: user?.id || formData.email,
          userMobileNumber: formData.phone,
          cardNumber: formData.cardNumber,
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv
        })
      });

      if (!tempTokenResponse.ok) {
        const errorData = await tempTokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get transaction token');
      }

      const tempTokenData = await tempTokenResponse.json();
      console.log('Temp token response:', tempTokenData);

      if (!tempTokenData.success) {
        throw new Error(tempTokenData.error || 'Failed to get transaction token');
      }

      const tempResult = tempTokenData.data;

      // Check if OTP is required
      if (tempResult.otp_required) {
        // Store transaction data for OTP step
        setTempTransactionData({
          accessToken: tokenData.token,
          instrumentToken: tempResult.instrument_token,
          transactionId: tempResult.transaction_id,
          basketId: basketId,
          merchantUserId: user?.id || formData.email,
          userMobileNumber: formData.phone,
          amount: guide.price,
          description: guide.title,
          orderId: orderData[0]?.id
        });
        
        setShowOtpPrompt(true);
        setIsProcessing(false);
        return; // Wait for OTP
      }

      // If no OTP required, complete transaction
      await completePayment(tempResult, orderData[0]?.id);

    } catch (error) {
      console.error('Payment error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setSubmitError(error.message || 'An error occurred during checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  // Complete payment after OTP verification
  const completePayment = async (tempResult, orderId) => {
    try {
      // Call tokenized transaction API
      const finalResponse = await fetch('/api/payment/tokenized-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tempTransactionData.accessToken,
          instrumentToken: tempResult.instrument_token,
          transactionId: tempResult.transaction_id,
          merchantUserId: tempTransactionData.merchantUserId,
          userMobileNumber: tempTransactionData.userMobileNumber,
          basketId: tempTransactionData.basketId,
          amount: tempTransactionData.amount,
          description: tempTransactionData.description,
          otp: otp || undefined
        })
      });

      const finalData = await finalResponse.json();
      
      if (!finalData.success) {
        throw new Error(finalData.error || 'Payment failed');
      }

      const result = finalData.data;

      if (result.code === '000' || result.code === '00') {
        // Success - update order
        await supabase
          .from('orders')
          .update({ order_status: 'completed' })
          .eq('id', orderId);

        alert(`🎉 Payment Successful!\n\nTransaction ID: ${result.transaction_id}\n\nYou now have access to: ${guide.title}`);
        
        setTimeout(() => navigate('/your-guides'), 1500);
      } else {
        // Failed
        await supabase
          .from('orders')
          .update({ order_status: 'failed' })
          .eq('id', orderId);
        
        throw new Error(result.status_msg || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment completion error:', error);
      setSubmitError(error.message);
      setIsProcessing(false);
      setShowOtpPrompt(false);
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 6) {
      setSubmitError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsProcessing(true);
    setSubmitError('');

    await completePayment(tempTransactionData, tempTransactionData.orderId);
  };

  if (!guide) {
    return (
      <div className="checkout-loading">
        <div className="loading-spinner"></div>
        <p>Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Checkout</h1>
          <div className="demo-notice" style={{
            backgroundColor: '#e8f5e9',
            border: '1px solid #4caf50',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#2e7d32'
          }}>
                  <strong>Secure Payment:</strong> Enter your card details securely. An OTP will be sent to your mobile.
                </div>
          <div className="checkout-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Information</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Payment</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Confirmation</span>
            </div>
          </div>
        </div>

        <div className="checkout-content">
          <div className="checkout-form">
            {step === 1 && (
              <div className="form-step">
                <h2>Personal Information</h2>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.firstName && errors.firstName ? 'error' : ''}
                      aria-invalid={touched.firstName && errors.firstName ? 'true' : 'false'}
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                      required
                    />
                    {touched.firstName && errors.firstName && (
                      <span id="firstName-error" className="field-error" role="alert">
                        {errors.firstName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.lastName && errors.lastName ? 'error' : ''}
                      required
                    />
                    {touched.lastName && errors.lastName && (
                      <span className="field-error" role="alert">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.email && errors.email ? 'error' : ''}
                    required
                  />
                  {touched.email && errors.email && (
                    <span className="field-error" role="alert">{errors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Mobile Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="03001234567"
                    pattern="[0-9]{11}"
                    className={touched.phone && errors.phone ? 'error' : ''}
                    required
                  />
                  {touched.phone && errors.phone && (
                    <span className="field-error" role="alert">{errors.phone}</span>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-step">
                <h2>Payment Method</h2>
                <div className="demo-notice" style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  color: '#856404'
                }}>
                  <strong>Test Mode:</strong> Using sandbox credentials. This will process a test transaction.
                </div>

                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number *</label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryMonth">Expiry Month *</label>
                    <input
                      type="text"
                      id="expiryMonth"
                      name="expiryMonth"
                      value={formData.expiryMonth}
                      onChange={handleInputChange}
                      placeholder="MM"
                      maxLength="2"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="expiryYear">Expiry Year *</label>
                    <input
                      type="text"
                      id="expiryYear"
                      name="expiryYear"
                      value={formData.expiryYear}
                      onChange={handleInputChange}
                      placeholder="YYYY"
                      maxLength="4"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV *</label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>

                <div className="payment-notice" style={{
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '20px',
                  color: '#1565c0'
                }}>
                  <p>
                    <strong>🔒 Secure Payment:</strong> An OTP will be sent to your mobile number for verification.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="error-message" role="alert">
                {submitError}
              </div>
            )}

            <div className="form-actions">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="btn btn-secondary"
                  disabled={isProcessing}
                >
                  Previous
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePayment}
                  className="btn btn-primary"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing Payment...' : `Complete Purchase - PKR ${guide.price}`}
                </button>
              )}
            </div>
          </div>

          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-item">
              <img 
                src={guide.thumbnail || '/placeholder-guide.png'} 
                alt={guide.title}
                className="summary-image"
              />
              <div className="summary-details">
                <h3>{guide.title}</h3>
                <p className="summary-description">{guide.description}</p>
              </div>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>PKR {guide.price}</span>
            </div>
            <div className="summary-row">
              <span>Tax:</span>
              <span>PKR 0</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>PKR {guide.price}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Enter OTP</h3>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              An OTP has been sent to your mobile number ending in {formData.phone.slice(-4)}
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength="6"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center',
                letterSpacing: '0.5em'
              }}
            />
            {submitError && (
              <div style={{ color: '#f44336', marginBottom: '1rem', fontSize: '14px' }}>
                {submitError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowOtpPrompt(false);
                  setOtp('');
                  setIsProcessing(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleOtpSubmit}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                disabled={isProcessing || otp.length !== 6}
              >
                {isProcessing ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;
