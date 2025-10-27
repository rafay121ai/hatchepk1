// Enhanced checkout.js with proper validation and loading states
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './checkout.css';
import { useAuth } from './AuthContext';

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

  // Define validation rules
  const validationRules = {
    firstName: validators.name,
    lastName: validators.name,
    email: validators.email,
    phone: validators.phone,
    cardNumber: validators.cardNumber,
    expiryDate: validators.expiryDate,
    cvv: validators.cvv,
    cardName: validators.name,
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
      expiryDate: '',
      cvv: '',
      cardName: '',
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
      // Validate step 2 fields
      const step2Fields = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
      const step2Errors = {};
      let hasError = false;

      step2Fields.forEach(field => {
        const error = validationRules[field](formData[field]);
        if (error) {
          step2Errors[field] = error;
          hasError = true;
        }
      });

      if (hasError) {
        setSubmitError('Please correct the errors above');
        return;
      }
      
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
    setSubmitError('');
  };


  const handlePayment = async () => {
    if (!validateAll()) {
      setSubmitError('Please fill in all required fields correctly');
      return;
    }

    setIsProcessing(true);
    setSubmitError('');

    try {
      // Simulate payment processing with realistic delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const paymentResult = await processPayment();
      
      if (paymentResult.success) {
        // Record order in Supabase
        try {
          const { supabase } = await import('./supabaseClient');
          
          const refId = sessionStorage.getItem('refId');
          const refTimestamp = sessionStorage.getItem('refTimestamp');
          
          // Clear expired referral
          if (refTimestamp && Date.now() - parseInt(refTimestamp) > 6 * 60 * 60 * 1000) {
            sessionStorage.removeItem('refId');
            sessionStorage.removeItem('refTimestamp');
          }
          
          const orderPayload = {
            customer_email: user ? user.email : formData.email,
            customer_name: `${formData.firstName} ${formData.lastName}`,
            product_name: guide.title,
            amount: parseFloat(guide.price),
            by_ref_id: refId || null,
            order_status: 'completed',
          };
          
          console.log('Attempting to insert order:', orderPayload);
          
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload);

          console.log('Order insert result:', { orderData, orderError });

          if (orderError) {
            console.error('Order recording failed:', orderError);
            // Don't fail the payment, just log it
          } else {
            console.log('Order successfully created:', orderData);
          }
        } catch (orderErr) {
          console.error('Order recording exception:', orderErr);
          // Don't fail the payment
        }

        // Update user's purchased guides
        if (user) {
          const updatedUser = {
            ...user,
            purchasedGuides: [...(user.purchasedGuides || []), guide.id],
          };
          updateUser(updatedUser);
        }

        // Redirect with success
        navigate('/our-guides', {
          state: {
            purchaseSuccess: true,
            guideTitle: guide.title,
            conversionTracked: true,
          },
        });
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (err) {
      setSubmitError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    // Simulate payment gateway with more realistic behavior
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 90% success rate (more realistic)
        const success = Math.random() > 0.1;
        
        if (success) {
          resolve({
            success: true,
            paymentId: 'pay_' + Math.random().toString(36).substr(2, 9),
            error: null,
          });
        } else {
          // More realistic error messages
          const errors = [
            'Payment declined. Please check your card details.',
            'Insufficient funds. Please try a different payment method.',
            'Card verification failed. Please contact your bank.',
            'Payment timeout. Please try again.'
          ];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          
          resolve({
            success: false,
            paymentId: null,
            error: randomError,
          });
        }
      }, 2000); // Increased delay for more realistic feel
    });
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
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
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#856404'
          }}>
            <strong>Demo Mode:</strong> This is a simulated checkout process. No real payments will be processed.
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
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
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
                <h2>Payment Information</h2>
                <div className="form-group">
                  <label htmlFor="cardName">Cardholder Name *</label>
                  <input
                    type="text"
                    id="cardName"
                    name="cardName"
                    value={formData.cardName}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={touched.cardName && errors.cardName ? 'error' : ''}
                    required
                  />
                  {touched.cardName && errors.cardName && (
                    <span className="field-error" role="alert">{errors.cardName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number *</label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      handleInputChange({ target: { name: 'cardNumber', value: formatted } });
                    }}
                    onBlur={handleBlur}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    className={touched.cardNumber && errors.cardNumber ? 'error' : ''}
                    required
                  />
                  {touched.cardNumber && errors.cardNumber && (
                    <span className="field-error" role="alert">{errors.cardNumber}</span>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryDate">Expiry Date *</label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={(e) => {
                        const formatted = formatExpiryDate(e.target.value);
                        handleInputChange({ target: { name: 'expiryDate', value: formatted } });
                      }}
                      onBlur={handleBlur}
                      placeholder="MM/YY"
                      maxLength="5"
                      className={touched.expiryDate && errors.expiryDate ? 'error' : ''}
                      required
                    />
                    {touched.expiryDate && errors.expiryDate && (
                      <span className="field-error" role="alert">{errors.expiryDate}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV *</label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="123"
                      maxLength="4"
                      className={touched.cvv && errors.cvv ? 'error' : ''}
                      required
                    />
                    {touched.cvv && errors.cvv && (
                      <span className="field-error" role="alert">{errors.cvv}</span>
                    )}
                  </div>
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
                    <p>**** **** **** {formData.cardNumber.slice(-4)}</p>
                    <p>Expires: {formData.expiryDate}</p>
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
