import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import { enforceSessionLimit } from './deviceUtils';
import SecureGuideViewer from './SecureGuideViewer';
import './YourGuides.css';

function YourGuides() {
  const { user } = useAuth();
  const [userGuides, setUserGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSecureViewer, setShowSecureViewer] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState(null);

  useEffect(() => {
    const loadUserGuides = async () => {
      if (!user) {
        setUserGuides([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch user's purchased guides from the orders table
        console.log('Fetching orders for user:', user.email);
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_email', user.email)
          .eq('order_status', 'completed');

        console.log('Orders found:', orders);
        console.log('Orders error:', ordersError);

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          setUserGuides([]);
        } else if (!orders || orders.length === 0) {
          console.log('No completed orders found for user:', user.email);
          setUserGuides([]);
        } else {
          // For each order, fetch the corresponding guide data
          const guidesWithData = await Promise.all(
            orders.map(async (order) => {
              // Try to find the guide by title match
              const { data: guideData, error: guideError } = await supabase
                .from('guides')
                .select('*')
                .eq('title', order.product_name)
                .maybeSingle(); // ✅ won't throw 406 if no rows found
              
              if (guideError) {
                console.warn('Guide not found for order:', order.product_name);
                // Return order data with fallback
                return {
                  id: order.id,
                  title: order.product_name,
                  description: `Purchased guide - ${order.product_name}`,
                  price: order.amount,
                  file_url: null,
                  purchased_at: order.created_at,
                  cover: "/creatortitle.png",
                  author: "Hatche Team",
                  rating: 4.9,
                  students: 500
                };
              }
              
              // Return guide data with order info
              return {
                id: guideData.id, // Use guide ID instead of order ID
                title: guideData.title,
                description: guideData.description,
                price: guideData.price,
                file_url: guideData.file_url, // Use the actual file_url from guides table
                purchased_at: order.created_at,
                cover: "/creatortitle.png",
                author: "Hatche Team",
                rating: 4.9,
                students: 500
              };
            })
          );
          
          setUserGuides(guidesWithData);
        }
      } catch (error) {
        console.error('Error loading user guides:', error);
        setUserGuides([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserGuides();
  }, [user]);

  const openGuide = async (guide) => {
    try {
      // Enforce session limit
      await enforceSessionLimit(user);
      
      // Open secure PDF viewer
      setSelectedGuideId(guide.id);
      setShowSecureViewer(true);
    } catch (error) {
      console.error('Error opening guide:', error);
    }
  };

  const closeSecureViewer = () => {
    setShowSecureViewer(false);
    setSelectedGuideId(null);
  };

  if (loading) {
    return (
      <div className="your-guides-loading">
        <div className="loading-spinner"></div>
        <p>Loading your guides...</p>
      </div>
    );
  }

  return (
    <div className="your-guides-page">
      {showSecureViewer && (
        <SecureGuideViewer 
          guideId={selectedGuideId} 
          user={user} 
          onClose={closeSecureViewer}
          guideData={userGuides.find(guide => guide.id === selectedGuideId)}
        />
      )}
      
      {/* Header */}
      <section className="your-guides-header">
        <div className="your-guides-header-content">
          <h1 className="your-guides-title">Your Guides</h1>
          <p className="your-guides-subtitle">
            Access your purchased guides and continue your learning journey
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="your-guides-content">
        {userGuides.length === 0 ? (
          <div className="no-guides-message">
            <div className="no-guides-icon">📚</div>
            <h2>No guides purchased yet</h2>
            <p>You haven't purchased any guides yet. Explore our premium guides to start your learning journey.</p>
            <a href="/our-guides" className="explore-guides-btn">
              Explore Our Guides
            </a>
          </div>
        ) : (
          <div className="guides-grid">
            {userGuides.map((guide) => (
              <div key={guide.id} className="guide-card">
                <div className="guide-cover">
                  <img src={guide.cover} alt={guide.title} />
                  <div className="guide-status">
                    <span className="status-badge">Owned</span>
                  </div>
                </div>
                
                <div className="guide-content">
                  <h3 className="guide-title">{guide.title}</h3>
                  <p className="guide-description">{guide.description}</p>
                  
                  <div className="guide-meta">
                    <div className="guide-author">
                      <span className="author-label">Author:</span>
                      <span className="author-name">{guide.author}</span>
                    </div>
                    
                    <div className="guide-rating">
                      <span className="rating-stars">⭐ {guide.rating}</span>
                      <span className="rating-count">({guide.students} students)</span>
                    </div>
                  </div>
                  
                  <div className="guide-actions">
                    <button 
                      className="access-guide-btn"
                      onClick={() => openGuide(guide)}
                    >
                      Access Guide
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default YourGuides;
