import './App.css';
import Home from './Home';
import AboutUs from './aboutus';
import Affiliate from './affiliate';
import OurGuides from './ourguides';
import YourGuides from './YourGuides';
import Checkout from './checkout';
import AffiliateDashboard from './AffiliateDashboard';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { testSupabaseConnection } from './supabaseTest';
import { initializeReferralTracking } from './referralUtils';
import { AuthProvider } from './AuthContext';
import { initializeDatabase } from './databaseUtils';
// import { testDatabaseAccess } from './debugDatabase';
import ProtectedRoute from './ProtectedRoute';
import Navigation from './Navigation';
import DatabaseTest from './DatabaseTest';
// Using public folder - no import needed, just use the path

// Google Analytics
const GA_TRACKING_ID = 'G-M8M2WM9PVN';

// Initialize Google Analytics
const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID);
  }
};

// Track page views
const trackPageView = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
    });
  }
};

// Track custom events
export const trackEvent = (action, category, label, value) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// ScrollToTop component to handle scroll and fade-in
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly
    window.scrollTo(0, 0);
    
    // Track page view for Google Analytics
    trackPageView(window.location.href);
    
    // Add fade-in animation to page content
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
      pageContent.classList.remove('fade-in');
      // Force reflow to restart animation
      void pageContent.offsetWidth;
      pageContent.classList.add('fade-in');
    }
  }, [pathname]);

  return null;
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Initialize referral tracking, test Supabase connection, and initialize database
  useEffect(() => {
    // Initialize Google Analytics
    initGA();
    
    // Initialize referral tracking first
    const referralId = initializeReferralTracking();
    if (referralId) {
      console.log('Referral tracking initialized with ID:', referralId);
    }
    
    // Check for referral ID in URL and store in sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
      sessionStorage.setItem('refId', ref);
      sessionStorage.setItem('refTimestamp', Date.now().toString());
      console.log('Referral ID detected and stored:', ref);
    }
    
    
    // Test Supabase connection and initialize database
    const runTests = async () => {
      await testSupabaseConnection();
      await initializeDatabase();
    };
    runTests();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
        {/* Navigation Bar */}
        <Navigation 
          isMenuOpen={isMenuOpen} 
          toggleMenu={toggleMenu} 
          closeMenu={closeMenu} 
        />

        {/* Routes with fade-in wrapper */}
        <div className="page-content fade-in">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/our-guides" element={<OurGuides />} />
            <Route path="/your-guides" element={<YourGuides />} />
            <Route path="/affiliate-program" element={<Affiliate />} />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
            <Route path="/database-test" element={<DatabaseTest />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-red-bar"></div>
          <div className="footer-content">
            <div className="footer-columns">
              <div className="footer-column">
                <h3 className="footer-heading">Our guides</h3>
                <ul className="footer-links">
                  <li><Link to="/our-guides">All Guides</Link></li>
                  <li><Link to="/our-guides">Business Guides</Link></li>
                  <li><Link to="/our-guides">Creative Guides</Link></li>
                  <li><Link to="/our-guides">Tech Guides</Link></li>
                </ul>
              </div>
              <div className="footer-column">
                <h3 className="footer-heading">More questions?</h3>
                <ul className="footer-links">
                  <li><a href="tel:+1234567890">+1 234 567 890</a></li>
                  <li><a href="mailto:info@hatche.com">info@hatche.com</a></li>
                  <li><a href="https://www.instagram.com/hatchepk/" target="_blank" rel="noopener noreferrer">Get in Touch</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
