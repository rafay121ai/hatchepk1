// Enhanced checkout.js with PayFast payment integration
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './checkout.css';
import { useAuth } from './AuthContext';

// Import validation utilities
import { validators, useFormValidation } from './utils/validation';

// Import PayFast utilities
import { formatOrderDate } from './utils/payfast';

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [guide, setGuide] = useState(null);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Define validation rules (removed card fields - PayFast handles payment)
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
    if (location.state?.guide) {
      setGuide(location.state.guide);
    } else {
      navigate('/our-guides');
    }
  }, [location.state, navigate]);

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setValues(prev => ({
        ...prev,
        email: user.email,
        phone: user.phone || '',
      }));
    }
  }, [user, setValues]);

  const handleNextStep = () => {
    setSubmitError('');
    
    if (step === 1) {
      // Validate step 1 fields
      const step1Fields = ['firstName', 'lastName', 'email', 'phone'];
      const step1Errors = {};
      let hasError = false;

      step1Fields.forEach(field => {
        const error = validationRules[field](formData[field]);
        if (error) {
          step1Errors[field] = error;
          hasError = true;
        }
      });

      if (hasError) {
        setSubmitError('Please correct the errors above');
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      // Step 2 is optional shipping info, just proceed to confirmation
      setStep(3);
    }
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
      // Validate phone number format (Pakistani format: 11 digits starting with 0)
      const phoneRegex = /^0[0-9]{10}$/;
      const cleanedPhone = formData.phone.replace(/\s+/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        throw new Error('Please enter a valid Pakistani mobile number (e.g., 03123456789)');
      }

      // Get referral ID from session
      const refId = sessionStorage.getItem('refId');
      const refTimestamp = sessionStorage.getItem('refTimestamp');
      
      // Clear expired referral (6 hours = 6 * 60 * 60 * 1000 ms)
      if (refTimestamp && Date.now() - parseInt(refTimestamp) > 6 * 60 * 60 * 1000) {
        sessionStorage.removeItem('refId');
        sessionStorage.removeItem('refTimestamp');
      }

      // Step 1: Get access token from backend API
      // IMPORTANT: We MUST use our backend API, NOT PayFast directly
      // Reasons:
      // 1. PayFast API doesn't allow CORS from browsers
      // 2. SECURED_KEY must NEVER be exposed to frontend (security risk)
      // 3. Our backend API handles the PayFast call securely server-side
      const backendUrl = process.env.REACT_APP_BACKEND_API_URL || 'https://hatchepk1.vercel.app';
      const tokenResponse = await fetch(`${backendUrl}/api/payment/get-token`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(guide.price),
          currencyCode: 'PKR',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get payment token');
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Failed to get payment token');
      }

      // Store order information temporarily for IPN handler
      const orderData = {
        basketId: tokenData.basketId,
        customerEmail: user ? user.email : formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerMobile: cleanedPhone,
        productName: guide.title,
        guideId: guide.id,
        amount: parseFloat(guide.price),
        referralId: refId || null,
        userId: user?.id || null
      };

      // Store order data in sessionStorage for IPN verification
      sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

      // Step 2: Create and submit form to PayFast
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = process.env.REACT_APP_PAYFAST_FORM_POST_URL || 
        'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction';

      // Add all required fields
      const fields = {
        MERCHANT_ID: tokenData.merchantId,
        MERCHANT_NAME: process.env.REACT_APP_PAYFAST_MERCHANT_NAME || 'Hatche',
        TOKEN: tokenData.token,
        PROCCODE: '00',
        TXNAMT: guide.price,
        CUSTOMER_MOBILE_NO: cleanedPhone,
        CUSTOMER_EMAIL_ADDRESS: user ? user.email : formData.email,
        SIGNATURE: 'HATCHE-PAYMENT-v1.0',
        VERSION: 'HATCHE-CART-1.0',
        TXNDESC: guide.title || 'Payment for order',
        SUCCESS_URL: `${window.location.origin}/payment/success`,
        FAILURE_URL: `${window.location.origin}/payment/failure`,
        CHECKOUT_URL: `${backendUrl}/api/payment/webhook`,
        BASKET_ID: tokenData.basketId,
        ORDER_DATE: formatOrderDate(),
        CURRENCY_CODE: 'PKR',
        CUSTOMER_NAME: `${formData.firstName} ${formData.lastName}`,
      };

      // Add fields to form
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
      });

      // Submit form
      document.body.appendChild(form);
      form.submit();
      
    } catch (err) {
      setSubmitError(err.message || 'Payment processing failed. Please try again.');
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
            backgroundColor: '#e3f2fd',
            border: '1px solid #90caf9',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#1565c0'
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
                  <label htmlFor="phone">Mobile Number * (Pakistani Format: 03123456789)</label>
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
                  <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '4px' }}>
                    Enter your Pakistani mobile number starting with 0 (11 digits without spaces)
                  </small>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-step">
                <h2>Shipping Information (Optional)</h2>
                <div className="form-group">
                  <label htmlFor="address">Address Line 1</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                  />
                </div>

                <div className="payment-notice" style={{
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '20px',
                  color: '#1565c0'
                }}>
                  <p>
                    <strong>Secure Payment:</strong> You will be redirected to PayFast's secure payment gateway to complete your purchase. 
                    We do not store your payment card details.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="form-step">
                <h2>Order Confirmation</h2>
                <div className="confirmation-content">
                  <div className="order-summary">
                    <h3>Order Summary</h3>
                    <div className="order-item">
                      <div className="item-info">
                        <h4>{guide.title}</h4>
                        <p>Digital Guide</p>
                      </div>
                      <div className="item-price">PKR {guide.price}</div>
                    </div>
                    <div className="order-total">
                      <div className="total-row">
                        <span>Subtotal:</span>
                        <span>PKR {guide.price}</span>
                      </div>
                      <div className="total-row">
                        <span>Tax:</span>
                        <span>PKR 0.00</span>
                      </div>
                      <div className="total-row total">
                        <span>Total:</span>
                        <span>PKR {guide.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="payment-info">
                    <h3>Payment Method</h3>
                    <p>PayFast Secure Payment</p>
                    <p>You will be redirected to PayFast to complete your payment securely.</p>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="error-message" role="alert">{submitError}</div>
            )}

            <div className="form-actions">
              {step > 1 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePreviousStep}
                  disabled={isProcessing}
                >
                  Previous
                </button>
              )}

              {step < 3 ? (
                <button type="button" className="btn-primary" onClick={handleNextStep}>
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  aria-busy={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner-small" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    `Pay PKR ${guide.price}`
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3>Order Summary</h3>
              <div className="summary-item">
                <div className="item-details">
                  <h4>{guide.title}</h4>
                  <p>Digital Guide</p>
                </div>
                <div className="item-price">PKR {guide.price}</div>
              </div>
              
              <div className="summary-total">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>PKR {guide.price}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>PKR 0.00</span>
                </div>
                <div className="total-row total">
                  <span>Total:</span>
                  <span>PKR {guide.price}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
