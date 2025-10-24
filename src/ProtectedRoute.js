import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Auth from './auth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top when component mounts and user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [loading, user]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  // If user is not authenticated, show auth modal
  if (!user) {
    if (!showAuth) {
      // Smooth scroll to top when auth modal appears
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      // Small delay to allow scroll to start before showing modal
      setTimeout(() => {
        setShowAuth(true);
      }, 100);
    }
    
    return (
      <>
        {showAuth && (
          <Auth
            onLogin={(userData) => {
              setShowAuth(false);
              // Redirect back to the original location after login
              const returnPath = location.state?.from || location.state?.returnTo || '/our-guides';
              navigate(returnPath, { replace: true });
            }}
            onClose={() => {
              setShowAuth(false);
              // Redirect to home page if user closes auth modal
              navigate('/');
            }}
          />
        )}
      </>
    );
  }

  // If user is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
