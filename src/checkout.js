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
  const payfastFormRef = useRef(null); // Hidden form for PayFast submission

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
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to get payment token');
      }

      // Step 2: Create order in database with pending status
      const orderPayload = {
        customer_email: user?.email || formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        product_name: guide.title,
        amount: guide.price,
        by_ref_id: referralId,
        order_status: 'pending', // Will be updated to 'completed' by webhook
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Failed to create order. Please try again.');
      }

      // Step 3: Store order info in sessionStorage for success page
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        basketId: basketId,
        guideTitle: guide.title,
        amount: guide.price,
        orderId: orderData[0]?.id
      }));

      // Step 4: Prepare PayFast form data
      const payfastData = {
        MERCHANT_ID: tokenData.merchantId,
        MERCHANT_NAME: 'Hatche',
        TOKEN: tokenData.token,
        PROCCODE: '00',
        TXNAMT: guide.price.toString(),
        CUSTOMER_MOBILE_NO: formData.phone,
        CUSTOMER_EMAIL_ADDRESS: user?.email || formData.email,
        CUSTOMER_NAME: `${formData.firstName} ${formData.lastName}`,
        SIGNATURE: `SIGNATURE-${Date.now()}`,
        VERSION: 'v1.0',
        TXNDESC: `Purchase: ${guide.title}`,
        SUCCESS_URL: `${window.location.origin}/payment-success`,
        FAILURE_URL: `${window.location.origin}/payment-failure`,
        CHECKOUT_URL: `${window.location.origin}/api/payment/webhook`, // Dynamic - works in any environment
        BASKET_ID: basketId,
        ORDER_DATE: new Date().toISOString().split('T')[0],
        CURRENCY_CODE: 'PKR',
        TRAN_TYPE: 'ECOMM_PURCHASE'
      };

      console.log('Redirecting to PayFast...');
      
      // Submit to PayFast
      submitToPayFast(payfastData);

    } catch (error) {
      console.error('Payment error:', error);
      setSubmitError(error.message || 'An error occurred during checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  // Helper function to submit form to PayFast
  const submitToPayFast = (formData) => {
    // Get PayFast URL from environment or use default
    const payfastUrl = process.env.REACT_APP_PAYFAST_POST_URL || 
      'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction';

    // Use the ref to access the form
    const form = payfastFormRef.current;
    if (!form) {
      console.error('PayFast form ref not found');
      setSubmitError('Form initialization error. Please try again.');
      setIsProcessing(false);
      return;
    }

    form.action = payfastUrl;
    form.method = 'POST';
    form.innerHTML = '';

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value.toString();
        form.appendChild(input);
      }
    });

    // Submit form (redirects to PayFast)
    form.submit();
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
            <strong>Secure Payment:</strong> You will be redirected to PayFast's secure payment gateway to complete your purchase.
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
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  color: '#1565c0'
                }}>
                  <strong>Payment Information:</strong> After clicking "Complete Purchase", you'll be redirected to PayFast's secure payment page to enter your card details.
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
                    When you click "Complete Purchase" below, you'll be redirected to PayFast's secure payment gateway 
                    where you can safely enter your card or wallet details.
                  </p>
                  <p style={{ color: '#757575', marginTop: '1rem', fontSize: '0.9rem' }}>
                    We never store your card details on our servers.
                  </p>
                </div>

                <div className="payment-notice" style={{
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '20px',
                  color: '#2e7d32'
                }}>
                  <p>
                    <strong>✓ SSL Encrypted</strong> | <strong>✓ PCI Compliant</strong> | <strong>✓ Secure Checkout</strong>
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

      {/* Hidden form for PayFast submission */}
      <form ref={payfastFormRef} style={{ display: 'none' }}></form>
    </div>
  );
}

export default Checkout;
