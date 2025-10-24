import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
  const [isTestimonialsVisible, setIsTestimonialsVisible] = useState(false);
  const [isAffiliateVisible, setIsAffiliateVisible] = useState(false);
  const [isFaqVisible, setIsFaqVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const howItWorksSection = document.querySelector('.how-it-works');
      const testimonialsSection = document.querySelector('.testimonials');
      const affiliateSection = document.querySelector('.affiliate-program');
      const faqSection = document.querySelector('.faq');
      
      if (howItWorksSection) {
        const rect = howItWorksSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsHowItWorksVisible(isInView);
      }
      
      if (testimonialsSection) {
        const rect = testimonialsSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsTestimonialsVisible(isInView);
      }
      
      if (affiliateSection) {
        const rect = affiliateSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsAffiliateVisible(isInView);
      }
      
      if (faqSection) {
        const rect = faqSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsFaqVisible(isInView);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section id="home" className={`hero ${isVisible ? 'fade-in' : ''}`}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Take your</span>
            <span className="title-line">first step</span>
          </h1>
          <p className="hero-description">
            Discover the joy of learning and express yourself through knowledge. 
            Join our community for all levels and expertise!
          </p>
          <div className="cta-container">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/our-guides')}
            >
              Explore Guides
              <span className="btn-arrow">↗</span>
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="image-card card-1">
            <div 
              className="card-image business-card"
              style={{ backgroundImage: `url('/guidepic.jpeg')` }}
              onClick={() => navigate('/our-guides')}
            >
            </div>
          </div>
          <div className="image-card card-2">
            <div 
              className="card-image creative-card"
              style={{ backgroundImage: `url('/Studentspic.jpeg')` }}
              onClick={() => navigate('/our-guides')}
            >
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={`how-it-works ${isHowItWorksVisible ? 'fade-in-up' : ''}`}>
        <div className="how-it-works-content">
          <h2 className="how-it-works-title">Start learning without doubts</h2>
          <p className="how-it-works-subtitle">
            We know getting started can be challenging. Here's how we make it easy for you.
          </p>
          
          <div className="features-grid">
            <div className="feature-block">
              <div className="feature-number">1</div>
              <h3 className="feature-title">I don't know where to start.</h3>
              <p className="feature-description">
                Our beginner guides make learning easy from day one.
              </p>
              <div className="feature-arrow">→</div>
            </div>
            
            <div className="feature-block">
              <div className="feature-number">2</div>
              <h3 className="feature-title">I'm afraid I won't keep up.</h3>
              <p className="feature-description">
                Our structured lessons let you progress at your pace.
              </p>
              <div className="feature-arrow">→</div>
            </div>
            
            <div className="feature-block">
              <div className="feature-number">3</div>
              <h3 className="feature-title">I can't find the right guide.</h3>
              <p className="feature-description">
                We offer topics and levels to help you grow with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className={`testimonials ${isTestimonialsVisible ? 'fade-in-up' : ''}`}>
        <div className="testimonials-content">
          <h2 className="testimonials-title">Hear from our learners</h2>
          <p className="testimonials-subtitle">
            Real stories from students who found confidence, passion, and joy through learning.
          </p>
          
          <div className="testimonials-scroll-container">
            <div className="testimonials-scroll">
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "My daughter loves her learning journey! She's mastering new skills while having fun, and the progress has been incredible. We couldn't be happier!"
                </p>
                <div className="testimonial-author">Sophia T.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "I joined the courses for fun, but I ended up finding a second family. The energy, the content, the community—everything is amazing!"
                </p>
                <div className="testimonial-author">Daniel K.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "The perfect mix of structure and creativity. The instructors push you to be your best while keeping the learning fun and inspiring!"
                </p>
                <div className="testimonial-author">Olivia S.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "I never thought I could learn effectively online, but this platform changed everything! The instructors are patient and supportive, and now I feel more confident than ever."
                </p>
                <div className="testimonial-author">Emma R.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "The best place to grow as a learner! The courses are well-structured, and I've improved so much in just a few months! Highly recommend!"
                </p>
                <div className="testimonial-author">Lucas M.</div>
              </div>

              {/* Duplicate testimonials for seamless loop */}
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "My daughter loves her learning journey! She's mastering new skills while having fun, and the progress has been incredible. We couldn't be happier!"
                </p>
                <div className="testimonial-author">Sophia T.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "I joined the courses for fun, but I ended up finding a second family. The energy, the content, the community—everything is amazing!"
                </p>
                <div className="testimonial-author">Daniel K.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "The perfect mix of structure and creativity. The instructors push you to be your best while keeping the learning fun and inspiring!"
                </p>
                <div className="testimonial-author">Olivia S.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "I never thought I could learn effectively online, but this platform changed everything! The instructors are patient and supportive, and now I feel more confident than ever."
                </p>
                <div className="testimonial-author">Emma R.</div>
              </div>
              
              <div className="testimonial-card">
                <div className="stars">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="testimonial-text">
                  "The best place to grow as a learner! The courses are well-structured, and I've improved so much in just a few months! Highly recommend!"
                </p>
                <div className="testimonial-author">Lucas M.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Program Section */}
      <section id="affiliate" className={`affiliate-program ${isAffiliateVisible ? 'fade-in-up' : ''}`}>
        <div className="affiliate-content">
          <h2 className="affiliate-title">Join our affiliate program</h2>
          <p className="affiliate-subtitle">
            From nano influencers to macro creators, we have the perfect commission structure for you. 
            Earn more as your following grows and unlock higher tiers automatically!
          </p>
          
          <div className="affiliate-cards">
            <div className="affiliate-card">
              <div className="card-age">1K - 10K followers</div>
              <h3 className="card-title">Nano Influencers</h3>
              <p className="card-description">
                Perfect for emerging creators building their audience and establishing credibility in the learning space.
              </p>
              <div className="card-features">
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>5% commission rate</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Monthly payouts</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Marketing materials</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Performance tracking</span>
                </div>
              </div>
            </div>
            
            <div className="affiliate-card featured">
              <div className="popular-tag">Popular</div>
              <div className="card-age">10K - 100K followers</div>
              <h3 className="card-title">Micro Influencers</h3>
              <p className="card-description">
                For established creators with engaged communities. Higher commissions and exclusive perks for dedicated partners.
              </p>
              <div className="card-features">
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>15% commission rate</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Bi-weekly payouts</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Exclusive content access</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Priority support</span>
                </div>
              </div>
            </div>
            
            <div className="affiliate-card">
              <div className="card-age">100K+ followers</div>
              <h3 className="card-title">Macro Influencers</h3>
              <p className="card-description">
                For top-tier creators with massive reach. Premium partnership with maximum earning potential and exclusive benefits.
              </p>
              <div className="card-features">
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>25% commission rate</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Weekly payouts</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Custom partnerships</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">◆</span>
                  <span>Dedicated manager</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="affiliate-note">
            <p>
              <strong>Automatic Tier Upgrades:</strong> Your commission rate automatically increases when you cross follower thresholds. 
              No need to reapply - we'll upgrade you as soon as you hit the next milestone!
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={`faq ${isFaqVisible ? 'fade-in-up' : ''}`}>
        <div className="faq-content">
          <h2 className="faq-title">
            <span>Every</span>
            <span>thing you</span>
            <span>need to know</span>
          </h2>
          <p className="faq-subtitle">
            Find all the answers you need before starting your learning journey and begin with confidence.
          </p>
          
          <div className="faq-accordion">
            <div className={`faq-item ${openFaq === 0 ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === 0 ? null : 0)}
              >
                <span>Do I need experience to start?</span>
                <span className="faq-icon">{openFaq === 0 ? '↑' : '↓'}</span>
              </button>
              {openFaq === 0 && (
                <div className="faq-answer">
                  <p>No! We offer guides for all levels, from absolute beginners to advanced learners. Our comprehensive e-books are designed to take you from zero to expert, with clear explanations and practical examples.</p>
                </div>
              )}
            </div>
            
            <div className={`faq-item ${openFaq === 1 ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
              >
                <span>What should I expect from the guides?</span>
                <span className="faq-icon">{openFaq === 1 ? '↑' : '↓'}</span>
              </button>
              {openFaq === 1 && (
                <div className="faq-answer">
                  <p>Our e-guides are comprehensive digital resources with step-by-step instructions, visual examples, and actionable insights. Each guide includes downloadable materials, checklists, and practical exercises to reinforce your learning.</p>
                </div>
              )}
            </div>
            
            <div className={`faq-item ${openFaq === 2 ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
              >
                <span>Can I preview a guide before buying?</span>
                <span className="faq-icon">{openFaq === 2 ? '↑' : '↓'}</span>
              </button>
              {openFaq === 2 && (
                <div className="faq-answer">
                  <p>Yes! We offer free sample chapters and previews for most guides. You can also start with our free beginner guides to get a feel for our content style and approach before making a purchase.</p>
                </div>
              )}
            </div>
            
            <div className={`faq-item ${openFaq === 3 ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
              >
                <span>How long do I have access to the guides?</span>
                <span className="faq-icon">{openFaq === 3 ? '↑' : '↓'}</span>
              </button>
              {openFaq === 3 && (
                <div className="faq-answer">
                  <p>Once you purchase a guide, you have lifetime access! You can download and revisit the material anytime, and we regularly update our guides to keep them current with the latest information and best practices.</p>
                </div>
              )}
            </div>
            
            <div className={`faq-item ${openFaq === 4 ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
              >
                <span>Is there support if I need help?</span>
                <span className="faq-icon">{openFaq === 4 ? '↑' : '↓'}</span>
              </button>
              {openFaq === 4 && (
                <div className="faq-answer">
                  <p>Absolutely! We provide community forums, direct support, and regular Q&A sessions. You're never alone in your learning journey - our community and support team are here to help you succeed with your guides.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;