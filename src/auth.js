import React, { useState, useEffect, useRef } from 'react';
import './auth.css';
import { supabase } from './supabaseClient';

function Auth({ onLogin, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const firstInputRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus management
  useEffect(() => {
    // Store the previously focused element
    previousActiveElement.current = document.activeElement;
    
    // Focus the first input when modal opens
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
    
    // Cleanup: restore focus when modal closes
    return () => {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      setSuccess('Password reset link sent! Check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        await handleForgotPassword(e);
      } else if (isLogin) {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const { email, password } = formData;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Store user data in localStorage
        const userData = {
          id: data.user.id,
          email: data.user.email,
          phone: formData.phone,
          purchasedGuides: [],
          accessHistory: []
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User logged in successfully:', userData.email);
        onLogin(userData);
      }
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const handleRegister = async () => {
    const { email, password, confirmPassword, phone } = formData;
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: 'https://hatchepk.com/auth/callback',
          data: {
            phone: phone
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Store user data in localStorage
        const userData = {
          id: data.user.id,
          email: data.user.email,
          phone: phone,
          firstName: email.split('@')[0], // Extract first name from email
          purchasedGuides: [],
          accessHistory: []
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User registered successfully:', userData.email);
        
        // Send welcome email
        try {
          const { sendWelcomeEmail } = await import('./utils/emailAutomation');
          await sendWelcomeEmail(userData);
        } catch (error) {
          console.error('Error sending welcome email:', error);
          // Don't block registration if email fails
        }
        
        onLogin(userData);
      }
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  // IP fetching function removed (was used for Firebase)

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <div className="auth-header">
          <h2>
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Register')}
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        {resetEmailSent ? (
          <div className="reset-success">
            <div className="success-icon">✓</div>
            <h3>Check Your Email</h3>
            <p>We've sent a password reset link to <strong>{formData.email}</strong></p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
            <button 
              className="auth-btn" 
              onClick={() => {
                setResetEmailSent(false);
                setIsForgotPassword(false);
                setIsLogin(true);
              }}
              style={{ marginTop: '1.5rem' }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  ref={firstInputRef}
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {!isForgotPassword && (
                <>
                  {!isLogin && (
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="03001234567"
                        required
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  {!isLogin && (
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}

                  {isLogin && (
                    <div className="forgot-password-link">
                      <button 
                        type="button" 
                        className="forgot-btn"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                          setSuccess('');
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Login' : 'Register'))}
              </button>
            </form>
            
            <div className="auth-footer">
              {!isForgotPassword ? (
                <p>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    {isLogin ? 'Register' : 'Login'}
                  </button>
                </p>
              ) : (
                <p>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsLogin(true);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    ← Back to Login
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;
