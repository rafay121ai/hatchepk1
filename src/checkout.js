import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './checkout.css';
import { useAuth } from './AuthContext';

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [guide, setGuide] = useState(null);
  
  console.log('Checkout component rendered');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Confirmation

  useEffect(() => {
    console.log('Checkout page loaded, location.state:', location.state);
    
    // Get guide data from navigation state
    if (location.state?.guide) {
      console.log('Guide data received:', location.state.guide);
      setGuide(location.state.guide);
    } else {
      console.log('No guide data found, redirecting to our-guides');
      // Redirect back if no guide selected
      navigate('/our-guides');
    }

    // Pre-fill form with user data if available
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        phone: user.phone
      }));
    }
  }, [location.state, navigate, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Validate personal information
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate payment information
      if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardName) {
        setError('Please fill in all payment fields');
        return;
      }
      setStep(3);
    }
    setError('');
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
    setError('');
  };


  // Test referral ID storage
  const testReferralId = async () => {
    try {
      // Check what's currently in localStorage
      const currentRefId = localStorage.getItem("hatche_referral_id");
      console.log('Current referral ID in localStorage:', currentRefId);
      
      // Check what referral IDs exist in the affiliates table
      const { supabase } = await import('./supabaseClient');
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select('ref_id')
        .not('ref_id', 'is', null);
      
      if (error) {
        console.error('Error fetching affiliates:', error);
        alert('Error fetching affiliates from database');
        return;
      }
      
      console.log('Available affiliate referral IDs:', affiliates);
      
      if (affiliates && affiliates.length > 0) {
        // Use the first valid referral ID
        const validRefId = affiliates[0].ref_id;
        localStorage.setItem("hatche_referral_id", validRefId);
        console.log('Valid referral ID stored:', validRefId);
        alert(`Current: ${currentRefId}\nStored: ${validRefId}\nAvailable: ${affiliates.map(a => a.ref_id).join(', ')}`);
      } else {
        // No valid referral IDs found
        console.log('No affiliate records found in database');
        alert(`Current: ${currentRefId}\nNo affiliate records found in database.`);
      }
    } catch (err) {
      console.error('Error in testReferralId:', err);
      alert('Error testing referral ID');
    }
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      console.log('=== TESTING DATABASE CONNECTION ===');
      const { supabase } = await import('./supabaseClient');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      console.log('Database connection test result:', { data, error });
      
      if (error) {
        console.error('Database connection failed:', error);
        alert(`Database connection failed: ${error.message}`);
      } else {
        console.log('Database connection successful');
        
        // Test inserting a simple order
        const testOrder = {
          customer_email: 'test@example.com',
          customer_name: 'Test User',
          product_name: 'Test Guide',
          amount: 10.00,
          by_ref_id: sessionStorage.getItem('refId') || null,
          order_status: 'completed'
        };
        
        console.log('Testing order insertion with:', testOrder);
        
        const { data: insertData, error: insertError } = await supabase
          .from('orders')
          .insert(testOrder);
        
        console.log('Test insertion result:', { data: insertData, error: insertError });
        
        if (insertError) {
          alert(`Test insertion failed: ${insertError.message}`);
        } else {
          alert('Database connection and test insertion successful!');
        }
      }
    } catch (err) {
      console.error('Database connection test error:', err);
      alert(`Database connection test error: ${err.message}`);
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');
    
    // Safety net: Check if referral ID exists
    if (!sessionStorage.getItem('refId')) {
      console.log("No referral detected, proceeding without ref_id");
    }

    // Log payment attempt details for debugging
    console.log('=== PAYMENT ATTEMPT START ===');
    console.log('User:', user);
    console.log('Guide:', guide);
    console.log('Form Data:', formData);
    console.log('Referral ID from localStorage:', localStorage.getItem('hatche_referral_id'));
    console.log('Current URL:', window.location.href);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, integrate with Stripe/PayPal here
      const paymentResult = await processPayment();
      
      if (paymentResult.success) {
        // Note: Conversion tracking is handled automatically by database trigger
        console.log('Order recorded - conversion will be tracked automatically by database trigger');

        // Record order in Supabase orders table
        try {
          const { supabase } = await import('./supabaseClient');
          
          console.log('=== ORDER INSERTION DEBUG ===');
          console.log('Supabase client:', supabase);
          console.log('User data:', user);
          console.log('Form data:', formData);
          console.log('Guide data:', guide);
          console.log('localStorage refId:', localStorage.getItem("hatche_referral_id"));
          
          // Ensure ref only applies if it exists in URL or session
          let refId = sessionStorage.getItem('refId');
          
          // Optional: Clear expired referral if older than a few hours
          const refTimestamp = sessionStorage.getItem('refTimestamp');
          if (refTimestamp && Date.now() - parseInt(refTimestamp) > 6 * 60 * 60 * 1000) {
            sessionStorage.removeItem('refId');
            sessionStorage.removeItem('refTimestamp');
            refId = null;
            console.log('Referral ID expired and removed');
          }
          
          console.log('Retrieved referral ID from sessionStorage:', refId);
          
          // Final check before sending
          const orderPayload = {
            customer_email: user ? user.email : formData.email,
            customer_name: `${formData.firstName} ${formData.lastName}`,
            product_name: guide.title,
            amount: parseFloat(guide.price), // Ensure it's a number
            by_ref_id: refId || null, // ✅ Will be null if no referral exists
            order_status: "completed", // This matches the default in your SQL
          };
          
          // Validate required fields
          if (!orderPayload.customer_email) {
            throw new Error('Customer email is required');
          }
          if (!orderPayload.customer_name) {
            throw new Error('Customer name is required');
          }
          if (!orderPayload.product_name) {
            throw new Error('Product name is required');
          }
          if (!orderPayload.amount || isNaN(orderPayload.amount)) {
            throw new Error('Valid amount is required');
          }
          
          console.log('Order payload to be inserted:', orderPayload);
          
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload);

          console.log('Supabase response:', { data: orderData, error: orderError });

          if (orderError) {
            console.error('=== ORDER INSERTION ERROR ===');
            console.error('Error details:', orderError);
            console.error('Error message:', orderError.message);
            console.error('Error code:', orderError.code);
            console.error('Error details:', orderError.details);
            console.error('Error hint:', orderError.hint);
          } else {
            console.log('=== ORDER INSERTION SUCCESS ===');
            console.log('Order recorded successfully:', orderData);
          }
        } catch (orderErr) {
          console.error('=== ORDER INSERTION EXCEPTION ===');
          console.error('Exception details:', orderErr);
          console.error('Exception message:', orderErr.message);
          console.error('Exception stack:', orderErr.stack);
        }

        // Update user's purchased guides in localStorage for immediate UI update
        if (user) {
          const updatedUser = {
            ...user,
            purchasedGuides: [...(user.purchasedGuides || []), guide.id]
          };
          updateUser(updatedUser);
        }

        // Redirect to guides page with success message
        navigate('/our-guides', { 
          state: { 
            purchaseSuccess: true, 
            guideTitle: guide.title,
            conversionTracked: true
          } 
        });
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    // Simulate payment processing
    // In production, integrate with Stripe/PayPal
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: 'pay_' + Math.random().toString(36).substr(2, 9)
        });
      }, 1000);
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
          <div style={{ marginBottom: '10px' }}>
            <button 
              onClick={testReferralId}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Test Referral ID
            </button>
            <button 
              onClick={testDatabaseConnection}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Database Connection
            </button>
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
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
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
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
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
                    required
                  />
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
                      setFormData(prev => ({ ...prev, cardNumber: formatted }));
                    }}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    required
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
                      onChange={(e) => {
                        const formatted = formatExpiryDate(e.target.value);
                        setFormData(prev => ({ ...prev, expiryDate: formatted }));
                      }}
                      placeholder="MM/YY"
                      maxLength="5"
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
                      <div className="item-price">${guide.price}</div>
                    </div>
                    <div className="order-total">
                      <div className="total-row">
                        <span>Subtotal:</span>
                        <span>${guide.price}</span>
                      </div>
                      <div className="total-row">
                        <span>Tax:</span>
                        <span>$0.00</span>
                      </div>
                      <div className="total-row total">
                        <span>Total:</span>
                        <span>${guide.price}</span>
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

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              {step > 1 && (
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handlePreviousStep}
                >
                  Previous
                </button>
              )}
              
              {step < 3 ? (
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handleNextStep}
                >
                  Next
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay $${guide.price}`}
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
                <div className="item-price">${guide.price}</div>
              </div>
              
              <div className="summary-total">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${guide.price}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>$0.00</span>
                </div>
                <div className="total-row total">
                  <span>Total:</span>
                  <span>${guide.price}</span>
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
