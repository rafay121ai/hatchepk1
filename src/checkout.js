// Simple checkout component
import React, { useState, useEffect } from 'react';
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
      cardName: '',
      expiryDate: '',
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

      // Create order payload matching your database schema
      const orderPayload = {
        customer_email: user?.email || formData.email,
        customer_name: `${formData.firstName} ${formData.lastName}`,
        product_name: guide.title,
        amount: guide.price,
        by_ref_id: referralId,
        order_status: 'completed', // Mark as completed for demo
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Creating demo order:', orderPayload);
      }

      // Insert order into database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select();

      if (orderError) {
        console.error('Error creating order:', orderError);
        console.error('Order payload was:', orderPayload);
        console.error('Error details:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });
        throw new Error(`Failed to create order: ${orderError.message || 'Please try again.'}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Demo order created successfully:', orderData);
      }

      // Get the created order ID
      const createdOrder = orderData && orderData[0];
      const orderId = createdOrder?.id || 'N/A';

      // Track purchase with Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: orderId,
          value: guide.price,
          currency: 'PKR',
          items: [{
            item_id: guide.id,
            item_name: guide.title,
            price: guide.price,
            quantity: 1
          }]
        });
      }

      // Simulate payment processing delay
      setTimeout(() => {
        // Show success message
        alert(`🎉 Payment Successful!\n\n✅ Transaction Completed\n\nYou now have access to:\n${guide.title}\n\nOrder ID: ${orderId}\nPayment Method: Demo Card\n\nRedirecting to your guides...`);

        // Redirect to Your Guides page
        setTimeout(() => {
          navigate('/your-guides');
        }, 500);
      }, 1500);

    } catch (error) {
      console.error('Payment error:', error);
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
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#1565c0'
          }}>
            <strong>Demo Mode:</strong> This is a demonstration checkout. Clicking "Complete Purchase" will simulate a successful payment and grant you access to the guide.
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
                  <strong>Demo Mode:</strong> This is a simulated payment form. Enter any card details to complete the demo purchase.
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
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cardName">Cardholder Name *</label>
                  <input
                    type="text"
                    id="cardName"
                    name="cardName"
                    value={formData.cardName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryDate">Expiry Date *</label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                      maxLength="5"
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
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Billing Address (Optional)</h3>
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
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '20px',
                  color: '#2e7d32'
                }}>
                  <p>
                    <strong>Secure Demo Checkout:</strong> Click "Complete Purchase" to simulate a successful payment. 
                    You'll immediately get access to the guide!
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
    </div>
  );
}

export default Checkout;
