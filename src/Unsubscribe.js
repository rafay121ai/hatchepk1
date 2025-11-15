import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Unsubscribe.css';

function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }
  }, [email, navigate]);

  const handleUnsubscribe = async () => {
    setLoading(true);

    try {
      // Update email preferences to unsubscribe from all
      const { error } = await supabase
        .from('email_preferences')
        .upsert([{
          email: email,
          welcome_emails: false,
          post_guide_emails: false,
          feedback_emails: false,
          re_engagement_emails: false,
          marketing_emails: false,
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString()
        }], {
          onConflict: 'email'
        });

      if (error) throw error;

      setUnsubscribed(true);
    } catch (error) {
      console.error('Error unsubscribing:', error);
      alert('Error processing unsubscribe. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (unsubscribed) {
    return (
      <div className="unsubscribe-page">
        <div className="unsubscribe-container">
          <div className="unsubscribe-success">
            <div className="success-icon">✓</div>
            <h1>You've been unsubscribed</h1>
            <p>We're sorry to see you go! You've been successfully unsubscribed from all marketing emails.</p>
            <p className="note">
              Note: You may still receive transactional emails (order confirmations, password resets, etc.) as these are necessary for your account.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unsubscribe-page">
      <div className="unsubscribe-container">
        <h1>Unsubscribe from Emails</h1>
        <p className="unsubscribe-subtitle">
          We're sorry to see you go! Are you sure you want to unsubscribe {email} from all marketing emails?
        </p>

        <div className="unsubscribe-options">
          <p>You can also:</p>
          <ul>
            <li>
              <a href={`/email-preferences?email=${encodeURIComponent(email)}`}>
                Manage your email preferences instead
              </a>
            </li>
            <li>
              <a href="mailto:hello@hatchepk.com">
                Contact us if you have concerns
              </a>
            </li>
          </ul>
        </div>

        <div className="unsubscribe-actions">
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="btn btn-danger"
          >
            {loading ? 'Processing...' : 'Unsubscribe from All Emails'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default Unsubscribe;

