import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import './FeedbackThankYou.css';

function FeedbackThankYou() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rating = searchParams.get('rating');

  const getRatingMessage = () => {
    const ratingNum = parseInt(rating);
    if (ratingNum >= 4) {
      return {
        title: 'Thank You! 🙏',
        message: 'We\'re thrilled you found our guide helpful! Your feedback helps us create better content for our community.',
        emoji: '🎉'
      };
    } else if (ratingNum === 3) {
      return {
        title: 'Thanks for Your Feedback!',
        message: 'We appreciate you taking the time to share your thoughts. We\'re always working to improve our guides.',
        emoji: '👍'
      };
    } else {
      return {
        title: 'Thank You for Your Honest Feedback',
        message: 'We\'re sorry to hear the guide didn\'t meet your expectations. We\'d love to hear more - please reply to our email or contact us directly.',
        emoji: '💬'
      };
    }
  };

  const ratingData = getRatingMessage();

  return (
    <div className="feedback-thank-you-page">
      <div className="thank-you-container">
        <div className="thank-you-content">
          <div className="thank-you-icon">{ratingData.emoji}</div>
          <h1>{ratingData.title}</h1>
          <p className="thank-you-message">{ratingData.message}</p>

          {rating && (
            <div className="rating-display">
              <p className="rating-label">Your Rating:</p>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= parseInt(rating) ? 'star-filled' : 'star-empty'}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="thank-you-actions">
            <Link to="/our-guides" className="btn btn-primary">
              Explore More Guides
            </Link>
            <Link to="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>

          <p className="help-text">
            Need help? <a href="mailto:hello@hatchepk.com">Contact us</a> - we're here to help!
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeedbackThankYou;

