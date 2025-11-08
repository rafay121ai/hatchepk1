import './App.css';
import Home from './Home';
import AboutUs from './aboutus';
import Affiliate from './affiliate';
import OurGuides from './ourguides';
import YourGuides from './YourGuides';
import Checkout from './checkout';
import AffiliateDashboard from './AffiliateDashboard';
import PaymentSuccess from './PaymentSuccess';
import PaymentFailure from './PaymentFailure';
import InfluencerAccess from './InfluencerAccess';
import InfluencerGuideViewer from './InfluencerGuideViewer';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { testSupabaseConnection } from './supabaseTest';
import { initializeReferralTracking } from './referralUtils';
import { AuthProvider } from './AuthContext';
import { initializeDatabase } from './databaseUtils';
import ProtectedRoute from './ProtectedRoute';
import Navigation from './Navigation';
import DatabaseTest from './DatabaseTest';
import Policies from './Policies';
import ErrorBoundary from './components/ErrorBoundary';

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

// Removed unused ScrollToTop component

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Enhanced toggle with body scroll lock
  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    
    // Lock/unlock body scroll and add class for styling
    if (newState) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('menu-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.height = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.classList.remove('menu-open');
    }
  };

  // Close menu function
  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
    document.body.style.height = 'auto';
    document.body.style.position = 'static';
    document.body.style.width = 'auto';
    document.body.classList.remove('menu-open');
  };

  // Initialize referral tracking, test Supabase connection, and initialize database
  useEffect(() => {
    // Initialize Google Analytics
    initGA();
    
    // Initialize referral tracking first
    const referralId = initializeReferralTracking();
    if (referralId && process.env.NODE_ENV === 'development') {
      console.log('Referral tracking initialized with ID:', referralId);
    }
    
    // Test Supabase connection and initialize database
    const runTests = async () => {
      await testSupabaseConnection();
      await initializeDatabase();
    };
    runTests();

    // Cleanup: ensure body scroll is reset on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.height = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.classList.remove('menu-open');
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  return (
    <div className="App">
      {/* Navigation Bar */}
      <Navigation 
        isMenuOpen={isMenuOpen} 
        toggleMenu={toggleMenu} 
        closeMenu={closeMenu} 
      />

      {/* Routes with fade-in wrapper */}
      <div className="page-content fade-in">
        <ErrorBoundary>
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
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-failure" element={<PaymentFailure />} />
            
            {/* Hidden Influencer Access Routes */}
            <Route path="/influencer-access" element={<InfluencerAccess />} />
            <Route path="/influencer-guide/:guideSlug" element={<InfluencerGuideViewer />} />
            
            {/* Policy Routes */}
            <Route path="/return-policy" element={<Policies />} />
            <Route path="/privacy-policy" element={<Policies />} />
            <Route path="/refund-policy" element={<Policies />} />
            <Route path="/terms-conditions" element={<Policies />} />
          </Routes>
        </ErrorBoundary>
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
              <h3 className="footer-heading">Policies</h3>
              <ul className="footer-links">
                <li><Link to="/return-policy">Return Policy</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/refund-policy">Refund Policy</Link></li>
                <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3 className="footer-heading">Information</h3>
              <ul className="footer-links">
                <li><a href="https://maps.google.com/?q=Shaheed-e-millat+rd+Roshan+Tai+Office+Tower" target="_blank" rel="noopener noreferrer">Shaheed-e-millat rd, Roshan Tai Office Tower, 3rd floor, 309</a></li>
                <li><a href="tel:+923311041066">03311041066</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3 className="footer-heading">More questions?</h3>
              <ul className="footer-links">
                <li><a href="mailto:info@hatche.com">info@hatche.com</a></li>
                <li><a href="https://www.instagram.com/hatchepk/" target="_blank" rel="noopener noreferrer">Get in Touch</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Wrap App with Router and AuthProvider
function AppWrapper() {
  return (
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}

export default AppWrapper;
