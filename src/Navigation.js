import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import Auth from './auth';
import './auth-nav.css';

function Navigation({ isMenuOpen, toggleMenu, closeMenu }) {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  const handleLogout = async () => {
    await logout();
    closeMenu();
  };

  const handleAuthClick = () => {
    console.log('Login button clicked!');
    setShowAuth(true);
    closeMenu();
    document.body.classList.add('auth-modal-open');
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
    document.body.classList.remove('auth-modal-open');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-menu')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Check if user is an approved affiliate
  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!user?.email) {
        setIsAffiliate(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('status')
          .eq('email', user.email)
          .eq('status', 'approved')
          .maybeSingle();

        if (!error && data) {
          setIsAffiliate(true);
        } else {
          setIsAffiliate(false);
        }
      } catch (err) {
        console.error('Error checking affiliate status:', err);
        setIsAffiliate(false);
      }
    };

    checkAffiliateStatus();
  }, [user]);

  return (
    <>
      <header className="navbar">
        <div className="logo-container">
          <Link to="/">
            <img src="/HATCHE800.png" alt="Hatche Logo" className="logo" />
          </Link>
        </div>

        <nav className="menu">
          <ul className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
            <li><Link to="/" onClick={closeMenu}>Home</Link></li>
            <li><Link to="/our-guides" onClick={closeMenu}>Our Guides</Link></li>
            <li><Link to="/your-guides" onClick={closeMenu}>Your Guides</Link></li>
            <li><Link to="/affiliate-program" onClick={closeMenu}>Affiliate Program</Link></li>
            <li><Link to="/about-us" onClick={closeMenu}>About Us</Link></li>
            {user ? (
              <li>
                <div className="user-menu">
                  <div style={{ fontSize: '10px', color: 'red' }}>
                    Dropdown state: {showUserDropdown ? 'OPEN' : 'CLOSED'}
                  </div>
                  <button 
                    className="user-icon-btn" 
                    onClick={() => {
                      console.log('User icon clicked! Current dropdown state:', showUserDropdown);
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    style={{ 
                      position: 'relative',
                      zIndex: 1000,
                      pointerEvents: 'auto'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                      <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                    </svg>
                  </button>
                  {showUserDropdown && (
                    <div className="user-dropdown" style={{
                      position: 'absolute',
                      top: '100%',
                      right: '0',
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      minWidth: '200px',
                      zIndex: 10001,
                      marginTop: '5px'
                    }}>
                      <div className="dropdown-item user-info">
                        <span className="user-email">{user.email}</span>
                      </div>
                      {isAffiliate && (
                        <Link 
                          to="/affiliate-program" 
                          className="dropdown-item" 
                          onClick={() => {
                            setShowUserDropdown(false);
                            closeMenu();
                          }}
                        >
                          Affiliate Dashboard
                        </Link>
                      )}
                      <button className="dropdown-item logout-btn" onClick={handleLogout}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ) : (
              <li>
                <button 
                  className="auth-btn" 
                  onClick={handleAuthClick}
                  style={{ 
                    position: 'relative',
                    zIndex: 1000,
                    pointerEvents: 'auto'
                  }}
                >
                  Login / Sign Up
                </button>
              </li>
            )}
          </ul>
          <button className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </nav>
      </header>

      {showAuth && (
        <Auth
          onLogin={handleCloseAuth}
          onClose={handleCloseAuth}
        />
      )}
    </>
  );
}

export default Navigation;
