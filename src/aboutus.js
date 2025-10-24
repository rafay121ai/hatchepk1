import React, { useState, useEffect } from 'react';
import './aboutus.css';

function AboutUs() {
  const [isVisible, setIsVisible] = useState(false);
  const [isStoryVisible, setIsStoryVisible] = useState(false);
  const [isMissionVisible, setIsMissionVisible] = useState(false);
  const [isValuesVisible, setIsValuesVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const storySection = document.querySelector('.our-story');
      const missionSection = document.querySelector('.our-mission');
      const valuesSection = document.querySelector('.our-values');

      if (storySection) {
        const rect = storySection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsStoryVisible(isInView);
      }

      if (missionSection) {
        const rect = missionSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsMissionVisible(isInView);
      }

      if (valuesSection) {
        const rect = valuesSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        setIsValuesVisible(isInView);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="about-us">
      {/* Hero Section */}
      <section className={`about-hero ${isVisible ? 'fade-in' : ''}`}>
        <div className="about-hero-content">
          <h1 className="about-hero-title">
            <span className="title-word">About</span>
            <span className="title-word">Hatche</span>
          </h1>
          <p className="about-hero-description">
            Empowering learners worldwide with comprehensive e-guides that transform knowledge into action.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className={`our-story ${isStoryVisible ? 'fade-in-up' : ''}`}>
        <div className="story-content">
          <div className="story-text">
            <h2 className="section-title">Our Story</h2>
            <p className="section-paragraph">
              Hatche was born from a simple belief: quality education should be accessible to everyone, everywhere. 
              What started as a small collection of guides has grown into a comprehensive platform serving thousands 
              of learners across the globe.
            </p>
            <p className="section-paragraph">
              We understand that traditional learning doesn't work for everyone. That's why we've created a diverse 
              library of e-guides designed for self-paced learning, allowing you to grow at your own rhythm and on 
              your own terms.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className={`our-mission ${isMissionVisible ? 'fade-in-up' : ''}`}>
        <div className="mission-content">
          <h2 className="section-title-center">Our Mission</h2>
          <p className="mission-description">
            To democratize knowledge and make expert-level education accessible to aspiring learners worldwide. 
            We believe in breaking down barriers and creating pathways to success through comprehensive, 
            well-crafted educational resources.
          </p>
          <div className="mission-pillars">
            <div className="pillar">
              <div className="pillar-icon">📚</div>
              <h3 className="pillar-title">Quality Content</h3>
              <p className="pillar-description">
                Every guide is meticulously crafted by experts in their field, ensuring you receive accurate, 
                up-to-date, and actionable information.
              </p>
            </div>
            <div className="pillar">
              <div className="pillar-icon">🌍</div>
              <h3 className="pillar-title">Global Access</h3>
              <p className="pillar-description">
                Learn from anywhere in the world, at any time. Our digital-first approach means knowledge 
                is always at your fingertips.
              </p>
            </div>
            <div className="pillar">
              <div className="pillar-icon">💡</div>
              <h3 className="pillar-title">Practical Learning</h3>
              <p className="pillar-description">
                We focus on real-world applications and practical skills that you can implement immediately 
                to see tangible results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className={`our-values ${isValuesVisible ? 'fade-in-up' : ''}`}>
        <div className="values-content">
          <h2 className="section-title-center">What We Stand For</h2>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-number">01</div>
              <h3 className="value-title">Excellence</h3>
              <p className="value-description">
                We never compromise on quality. Each guide undergoes rigorous review to meet our high standards.
              </p>
            </div>
            <div className="value-item">
              <div className="value-number">02</div>
              <h3 className="value-title">Accessibility</h3>
              <p className="value-description">
                Education should be available to all. We strive to make our guides affordable and easy to access.
              </p>
            </div>
            <div className="value-item">
              <div className="value-number">03</div>
              <h3 className="value-title">Innovation</h3>
              <p className="value-description">
                We continuously evolve our content and platform to provide the best learning experience possible.
              </p>
            </div>
            <div className="value-item">
              <div className="value-number">04</div>
              <h3 className="value-title">Community</h3>
              <p className="value-description">
                Learning is better together. We foster a supportive community of learners and experts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="cta-content">
          <h2 className="cta-title">Join Our Learning Community</h2>
          <p className="cta-description">
            Start your journey today and discover the joy of learning with Hatche.
          </p>
          <button className="btn btn-primary">
            Explore Our Guides
            <span className="btn-arrow">↗</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default AboutUs;

