import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './affiliate.css';
import { supabase } from './supabaseClient';
import { getStoredReferralId } from './referralUtils';
import { useAuth } from './AuthContext';
import AffiliateDashboard from './AffiliateDashboard';

function Affiliate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    tier: '',
    instagramUsername: '',
    followerCount: '',
    motivation: '',
    email: user ? user.email : '',
    byRefId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [affiliateStatus, setAffiliateStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Update email when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user]);

  // Check affiliate status when component loads
  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!user?.email) {
        setIsLoadingStatus(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('status, ref_id, tier, tier_name, commission')
          .eq('email', user.email)
          .maybeSingle();

        if (error) {
          console.error('Error checking affiliate status:', error);
          setAffiliateStatus(null);
        } else if (data) {
          setAffiliateStatus(data);
          console.log('Affiliate status:', data);
        } else {
          setAffiliateStatus(null);
        }
      } catch (err) {
        console.error('Exception checking affiliate status:', err);
        setAffiliateStatus(null);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkAffiliateStatus();
  }, [user]);

  // Function to refresh affiliate status
  const refreshAffiliateStatus = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('status, ref_id, tier, tier_name, commission')
        .eq('email', user.email)
        .maybeSingle();

      if (!error && data) {
        setAffiliateStatus(data);
      }
    } catch (err) {
      console.error('Error refreshing affiliate status:', err);
    }
  };

  const tiers = [
    {
      id: 'nano',
      name: 'Nano Influencer',
      followers: '1K - 10K followers',
      commission: '5%',
      description: 'Perfect for emerging creators building their audience',
      benefits: [
        '5% commission rate',
        'Monthly payouts',
        'Marketing materials',
        'Performance tracking'
      ]
    },
    {
      id: 'micro',
      name: 'Micro Influencer',
      followers: '10K - 100K followers',
      commission: '15%',
      description: 'For established creators with engaged communities',
      benefits: [
        '15% commission rate',
        'Bi-weekly payouts',
        'Exclusive content access',
        'Priority support'
      ],
      featured: true
    },
    {
      id: 'macro',
      name: 'Macro Influencer',
      followers: '100K+ followers',
      commission: '25%',
      description: 'For top-tier creators with massive reach',
      benefits: [
        '25% commission rate',
        'Weekly payouts',
        'Custom partnerships',
        'Dedicated manager'
      ]
    }
  ];

  const handleTierSelect = (tierId) => {
    setSelectedTier(tierId);
    setFormData({ ...formData, tier: tierId });
  };


  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('User:', user);
    console.log('Form Data:', formData);
    console.log('Selected Tier:', selectedTier);
    
    // Check if user is logged in
    if (!user) {
      console.log('User not logged in, redirecting to login');
      setSubmitStatus("Please log in to submit your application");
      setTimeout(() => {
        setSubmitStatus('');
        // Redirect to login/signup page
        navigate('/', { 
          state: { 
            from: '/affiliate-program',
            returnTo: '/affiliate-program',
            showAuth: true
          } 
        });
      }, 3000);
      return;
    }
    
    console.log('User is logged in, proceeding with submission');
    setIsSubmitting(true);
    setSubmitStatus('');
    
    try {
      // Validate form data
      if (!formData.tier) {
        setSubmitStatus("Please select a tier");
        setTimeout(() => setSubmitStatus(''), 3000);
        return;
      }
      
      if (!formData.name || !formData.email || !formData.instagramUsername || !formData.motivation) {
        setSubmitStatus("Please fill in all required fields");
        setTimeout(() => setSubmitStatus(''), 3000);
        return;
      }
      
      // Get tier info for database
      const tierInfo = tiers.find(t => t.id === formData.tier);
      
      // Get stored referral ID
      const storedReferralId = getStoredReferralId();
      
      console.log('Submitting affiliate application with data:', {
        tier: formData.tier,
        tier_name: tierInfo.name,
        commission: tierInfo.commission,
        email: formData.email,
        instagram_username: formData.instagramUsername,
        follower_count: formData.followerCount,
        motivation: formData.motivation,
        referral_source: storedReferralId
      });
      
                const { data, error } = await supabase
                  .from("affiliates")
                  .insert([
                    {
                      name: formData.name,
                      tier: formData.tier,
                      tier_name: tierInfo.name,
                      commission: tierInfo.commission,
                      email: formData.email,
                      instagram_username: formData.instagramUsername,
                      follower_count: parseInt(formData.followerCount) || 0,
                      motivation: formData.motivation,
                      status: "pending",
                      by_ref_id: storedReferralId || formData.byRefId || null,
                      ref_id: null // Will be generated when approved
                    },
                  ]);

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setSubmitStatus(`Error: ${error.message}`);
        setTimeout(() => setSubmitStatus(''), 5000);
      } else {
        console.log("Affiliate application submitted successfully:", data);
        setSubmitStatus("success");
        setShowSuccessModal(true);
        
        // Scroll to top to show success popup
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
        setFormData({
          tier: '',
          instagramUsername: '',
          followerCount: '',
          motivation: '',
          email: '',
          byRefId: ''
        });
        setSelectedTier('');
        
        // Reset success message after 5 seconds
        setTimeout(() => setSubmitStatus(''), 5000);
      }
    } catch (error) {
      console.error('Network or other error:', error);
      setSubmitStatus(`Error: ${error.message || 'Something went wrong. Please try again.'}`);
      setTimeout(() => setSubmitStatus(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking affiliate status
  if (isLoadingStatus) {
    return (
      <div className="affiliate-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Checking your affiliate status...</p>
        </div>
      </div>
    );
  }

  // Show dashboard for approved affiliates
  if (affiliateStatus && affiliateStatus.status === 'approved') {
    return (
      <div className="affiliate-page">
        <section className="affiliate-hero">
          <div className="affiliate-hero-content">
            <h1 className="affiliate-hero-title">
              <span>Welcome to your</span>
              <span>Affiliate Dashboard</span>
            </h1>
            <p className="affiliate-hero-description">
              Track your performance, view earnings, and manage your affiliate activities.
            </p>
            <div className="affiliate-info">
              <p><strong>Tier:</strong> {affiliateStatus.tier_name}</p>
              <p><strong>Commission:</strong> {affiliateStatus.commission}%</p>
              <p><strong>Referral ID:</strong> {affiliateStatus.ref_id}</p>
            </div>
          </div>
        </section>
        <AffiliateDashboard />
      </div>
    );
  }

  // Show pending status message
  if (affiliateStatus && affiliateStatus.status === 'pending') {
    return (
      <div className="affiliate-page">
        <section className="affiliate-hero">
          <div className="affiliate-hero-content">
            <h1 className="affiliate-hero-title">
              <span>Application</span>
              <span>Under Review</span>
            </h1>
            <p className="affiliate-hero-description">
              Thank you for your interest in our affiliate program! Your application is currently under review. 
              We'll notify you once it's been processed.
            </p>
            <div className="status-info">
              <p><strong>Status:</strong> Pending Approval</p>
              <p><strong>Tier Applied:</strong> {affiliateStatus.tier_name}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Show application form for non-affiliates
  return (
    <div className="affiliate-page">
      {/* Hero Section */}
      <section className="affiliate-hero">
        <div className="affiliate-hero-content">
          <h1 className="affiliate-hero-title">
            <span>Join our</span>
            <span>affiliate program</span>
          </h1>
          <p className="affiliate-hero-description">
            Partner with us and earn commissions while sharing products you love. 
            Choose the tier that matches your reach and start earning today.
          </p>
        </div>
      </section>

      {/* Tier Selection */}
      <section className="tier-selection">
        <div className="tier-selection-content">
          <h2 className="section-title">Choose your tier</h2>
          <p className="section-subtitle">
            Select the tier that best matches your current following
          </p>
          
          <div className="tiers-grid">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`tier-card ${selectedTier === tier.id ? 'selected' : ''} ${tier.featured ? 'featured' : ''}`}
                onClick={() => handleTierSelect(tier.id)}
              >
                {tier.featured && <div className="popular-badge">Most Popular</div>}
                <div className="tier-header">
                  <div className="tier-followers">{tier.followers}</div>
                  <h3 className="tier-name">{tier.name}</h3>
                  <div className="tier-commission">{tier.commission} commission</div>
                </div>
                <p className="tier-description">{tier.description}</p>
                <div className="tier-benefits">
                  {tier.benefits.map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <span className="benefit-icon">◆</span>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
                <div className="tier-select-indicator">
                  {selectedTier === tier.id ? '✓ Selected' : 'Select'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      {selectedTier && (
        <section className="application-form-section">
          <div className="application-form-content">
            <h2 className="section-title">Complete your application</h2>
            <p className="section-subtitle">
              Tell us about yourself and why you want to join our program
            </p>

            {!user && (
              <div className="login-prompt">
                <p>⚠️ Please log in to submit your affiliate application</p>
              </div>
            )}


            <form className="application-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="instagramUsername">Instagram Username</label>
                <input
                  type="text"
                  id="instagramUsername"
                  name="instagramUsername"
                  value={formData.instagramUsername}
                  onChange={handleInputChange}
                  placeholder="@yourusername"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="followerCount">Current Follower Count</label>
                <input
                  type="number"
                  id="followerCount"
                  name="followerCount"
                  value={formData.followerCount}
                  onChange={handleInputChange}
                  placeholder="10000"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="motivation">Why do you want to join our affiliate program?</label>
                <textarea
                  id="motivation"
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder="Share your motivation beyond financial benefits..."
                  rows="5"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>

              {submitStatus === 'success' && (
                <div className="status-message success">
                  ✓ Application submitted successfully! Check your email for confirmation.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="status-message error">
                  ✗ Something went wrong. Please try again.
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {/* Info Section */}
      <section className="affiliate-info">
        <div className="affiliate-info-content">
          <h2 className="info-title">How it works</h2>
          <div className="info-steps">
            <div className="info-step">
              <div className="step-number">1</div>
              <h3>Apply</h3>
              <p>Choose your tier and submit your application with your Instagram details</p>
            </div>
            <div className="info-step">
              <div className="step-number">2</div>
              <h3>Get Approved</h3>
              <p>We'll review your application and send you a confirmation email within 48 hours</p>
            </div>
            <div className="info-step">
              <div className="step-number">3</div>
              <h3>Start Earning</h3>
              <p>Receive your unique affiliate link and start promoting to earn commissions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-modal-content">
              <div className="success-icon">🎉</div>
              <h2>Congratulations!</h2>
              <p>Your affiliate application has been submitted successfully!</p>
              <p>We'll review your application and get back to you within 48 hours.</p>
              <button 
                className="success-modal-btn"
                onClick={() => {
                  setShowSuccessModal(false);
                  refreshAffiliateStatus();
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Affiliate;