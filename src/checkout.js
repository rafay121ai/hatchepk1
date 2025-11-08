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
  const { user } = useAuth();
  const [guide, setGuide] = useState(null);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const payfastFormRef = useRef(null);

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
    },
    validationRules
  );

  useEffect(() => {
    const loadGuideFromDatabase = async () => {
      // Try to get guide from location state first, then from sessionStorage
      let guideData = location.state?.guide;
      
      if (!guideData) {
        // Check if guide data exists in sessionStorage (for page refreshes)
        const storedGuide = sessionStorage.getItem('checkoutGuide');
        if (storedGuide) {
          try {
            guideData = JSON.parse(storedGuide);
          } catch (error) {
            console.error('Error parsing stored guide:', error);
          }
        }
      }
      
      if (!guideData) {
        navigate('/our-guides');
        return;
      }
      
      // Store guide in sessionStorage for page refreshes
      sessionStorage.setItem('checkoutGuide', JSON.stringify(guideData));

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

      // Create order in database with 'pending' status
      const orderPayload = {
        customer_email: user?.email || formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        product_name: guide.title,
        amount: guide.price,
        by_ref_id: referralId,
        order_status: 'pending'
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select();

      if (orderError) {
        console.error('Error creating pending order:', orderError);
        throw new Error('Failed to create order. Please try again.');
      }

      const orderId = orderData[0]?.id;

      // Store order ID and details in sessionStorage
      const orderInfo = {
        orderId: orderId,
        basket_id: basketId,
        customer_email: user?.email || formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        product_name: guide.title,
        amount: guide.price
      };
      sessionStorage.setItem('pendingOrder', JSON.stringify(orderInfo));

      // Submit form to PayFast
      
      const form = payfastFormRef.current;
      if (!form) {
        throw new Error('Form initialization error');
      }

      // PayFast POST URL - PRODUCTION
      const payfastPostUrl = 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction';
      
      form.action = payfastPostUrl;
      form.method = 'POST';
      form.innerHTML = '';

      // Add form fields (matching PHP example with UPPERCASE names)
      // Include order details so webhook can create the order
      const fields = {
        MERCHANT_ID: tokenData.merchantId,
        MERCHANT_NAME: 'Hatche',
        TOKEN: tokenData.token,
        BASKET_ID: basketId,
        TXNAMT: guide.price.toString(),
        CURRENCY_CODE: 'PKR',
        ORDER_DATE: new Date().toISOString().replace('T', ' ').substring(0, 19),
        SUCCESS_URL: `${window.location.origin}/payment-success`,
        FAILURE_URL: `${window.location.origin}/payment-failure`,
        CHECKOUT_URL: `https://hatchepk.com/api/payment/webhook`,
        CUSTOMER_EMAIL_ADDRESS: user?.email || formData.email,
        CUSTOMER_MOBILE_NO: formData.phone,
        SIGNATURE: `SIGNATURE-${Date.now()}`,
        VERSION: 'HATCHE-1.0',
        TXNDESC: `Purchase: ${guide.title}`,
        PROCCODE: '00',
        TRAN_TYPE: 'ECOMM_PURCHASE',
        // Custom fields for order creation (passed back in IPN)
        CUSTOMER_NAME: `${formData.firstName} ${formData.lastName}`,
        PRODUCT_NAME: guide.title,
        REF_ID: referralId || ''
      };

      // Create hidden input fields
      Object.entries(fields).forEach(([key, value]) => {
        if (value) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value.toString();
          form.appendChild(input);
        }
      });

      // Submit form - redirects to PayFast
      form.submit();

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
                <h2>Payment</h2>
                <div className="demo-notice" style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  color: '#856404'
                }}>
                  <strong>Test Credentials:</strong> Use these on PayFast's payment page:<br/>
                  <code style={{display: 'block', marginTop: '8px', fontSize: '13px'}}>
                    Bank Account: 12353940226802034243<br/>
                    NIC: 4210131315089<br/>
                    OTP: 123456
                  </code>
                </div>

                <div className="payment-info-box" style={{
                  backgroundColor: '#f5f5f5',
                  border: '2px dashed #9e9e9e',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  margin: '2rem 0'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                  <h3 style={{ color: '#424242', marginBottom: '1rem' }}>Secure Payment with PayFast</h3>
                  <p style={{ color: '#757575', lineHeight: '1.6' }}>
                    Click "Complete Purchase" to be redirected to PayFast's secure payment page where you'll enter your payment details.
                  </p>
                  <p style={{ color: '#757575', marginTop: '1rem', fontSize: '0.9rem' }}>
                    Your payment information is processed securely by PayFast.
                  </p>
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
                    <strong>✓ SSL Encrypted</strong> | <strong>✓ Secure Checkout</strong> | <strong>✓ Test Mode</strong>
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

      {/* Hidden form for PayFast redirect */}
      <form ref={payfastFormRef} style={{ display: 'none' }}></form>
    </div>
  );
}

export default Checkout;
