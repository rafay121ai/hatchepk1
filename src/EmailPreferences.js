import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './EmailPreferences.css';

function EmailPreferences() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const [preferences, setPreferences] = useState({
    welcomeEmails: true,
    postGuideEmails: true,
    feedbackEmails: true,
    reEngagementEmails: true,
    marketingEmails: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    // Load user preferences
    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (!error && data) {
          setPreferences({
            welcomeEmails: data.welcome_emails ?? true,
            postGuideEmails: data.post_guide_emails ?? true,
            feedbackEmails: data.feedback_emails ?? true,
            reEngagementEmails: data.re_engagement_emails ?? true,
            marketingEmails: data.marketing_emails ?? false
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [email, navigate]);

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert([{
          email: email,
          welcome_emails: preferences.welcomeEmails,
          post_guide_emails: preferences.postGuideEmails,
          feedback_emails: preferences.feedbackEmails,
          re_engagement_emails: preferences.reEngagementEmails,
          marketing_emails: preferences.marketingEmails,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'email'
        });

      if (error) throw error;

      setMessage('Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage('Error saving preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="email-preferences-loading">
        <div className="loading-spinner"></div>
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="email-preferences-page">
      <div className="preferences-container">
        <h1>Email Preferences</h1>
        <p className="preferences-subtitle">
          Manage your email preferences for {email}
        </p>

        <div className="preferences-list">
          <div className="preference-item">
            <div className="preference-info">
              <h3>Welcome Emails</h3>
              <p>Receive welcome email when you sign up</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.welcomeEmails}
                onChange={() => handleToggle('welcomeEmails')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>Post-Guide Engagement</h3>
              <p>Get helpful follow-up emails after viewing guides</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.postGuideEmails}
                onChange={() => handleToggle('postGuideEmails')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>Feedback Requests</h3>
              <p>Receive requests to rate your experience</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.feedbackEmails}
                onChange={() => handleToggle('feedbackEmails')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>Re-engagement Emails</h3>
              <p>Get notified about new guides when you're inactive</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.reEngagementEmails}
                onChange={() => handleToggle('reEngagementEmails')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>Marketing Emails</h3>
              <p>Receive promotional emails and special offers</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.marketingEmails}
                onChange={() => handleToggle('marketingEmails')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="preferences-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailPreferences;

