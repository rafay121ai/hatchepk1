import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ourguides.css';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

function OurGuides() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(new Set());

  useEffect(() => {
    const loadGuides = async () => {
      try {
        console.log('Fetching guides from database...');
        console.log('Supabase client:', supabase);
        
        // Test user_sessions table access (non-blocking, background only)
        console.log('Testing user_sessions table access in background...');
        // Run this in background without blocking guides loading
        setTimeout(() => {
          supabase.from('user_sessions').select('*').limit(1)
            .then(({ data: sessionsData, error: sessionsError }) => {
              console.log('User sessions response:', sessionsData, sessionsError);
              if (sessionsError) {
                console.warn('User sessions error (non-critical):', sessionsError.message);
              }
            })
            .catch(sessionsErr => {
              console.warn('User sessions catch error (non-critical):', sessionsErr.message);
            });
        }, 1000); // Run after 1 second delay
        
        // Test basic connection first
        const { data: testData, error: testError } = await supabase
          .from('guides')
          .select('count')
          .limit(1);
        console.log('Connection test:', { testData, testError });
        
        // Fetch guides from the database
        const { data: guidesData, error } = await supabase
          .from('guides')
          .select('*')
          .order('created_at', { ascending: false });
          
        console.log('Guides response:', guidesData, error);
        console.log('Database response:', { guidesData, error });
        console.log('Number of guides found:', guidesData?.length || 0);
        console.log('First guide data:', guidesData?.[0]);
        console.log('User authentication status:', user ? 'Authenticated' : 'Not authenticated');
        console.log('Loading guides regardless of authentication status...');

        if (error) {
          console.error('Error fetching guides:', error);
          console.log('Falling back to default guide');
          // Fallback to default guide if database fails
          setGuides([{
            id: 1,
            title: "The Creator Gold Rush for Pakistani Women",
            cover: "/creatortitle.png",
            description: "A comprehensive guide for Pakistani women to build successful online businesses and become content creators in the digital economy. Learn how to monetize your skills, build a personal brand, and create sustainable income streams through digital platforms.",
            price: 29.99,
            previewChapters: [
              "Chapter 1: Introduction to the Creator Economy",
              "Chapter 2: Building Your Personal Brand",
              "Chapter 3: Content Creation Strategies",
              "Chapter 4: Monetization Methods",
              "Chapter 5: Social Media Marketing"
            ],
            totalChapters: 12,
            author: "Hatche Team",
            rating: 4.9,
            students: 500,
            file_url: "/preview.pdf"
          }]);
        } else {
          console.log('Successfully fetched guides from database:', guidesData);
          
          if (!guidesData || guidesData.length === 0) {
            console.log('No guides found in database, using fallback');
            // No guides in database, use fallback
            setGuides([{
              id: 1,
              title: "The Creator Gold Rush for Pakistani Women",
              cover: "/creatortitle.png",
              description: "A comprehensive guide for Pakistani women to build successful online businesses and become content creators in the digital economy. Learn how to monetize your skills, build a personal brand, and create sustainable income streams through digital platforms.",
              price: 29.99,
              previewChapters: [
                "Chapter 1: Introduction to the Creator Economy",
                "Chapter 2: Building Your Personal Brand",
                "Chapter 3: Content Creation Strategies",
                "Chapter 4: Monetization Methods",
                "Chapter 5: Social Media Marketing"
              ],
              totalChapters: 12,
              author: "Hatche Team",
              rating: 4.9,
              students: 500,
              file_url: "/preview.pdf"
            }]);
          } else {
            // Transform database data to match component structure
            console.log('Transforming guides data...');
            const transformedGuides = guidesData.map(guide => ({
            ...guide,
            cover: "/creatortitle.png", // Default cover image
            previewChapters: [
              "Chapter 1: Introduction to the Creator Economy",
              "Chapter 2: Building Your Personal Brand",
              "Chapter 3: Content Creation Strategies",
              "Chapter 4: Monetization Methods",
              "Chapter 5: Social Media Marketing"
            ],
            totalChapters: 12,
            author: "Hatche Team",
            rating: 4.9,
            students: 500,
            pdfPath: guide.file_url
          }));
          console.log('Transformed guides:', transformedGuides);
          setGuides(transformedGuides);
          }
        }
      } catch (error) {
        console.error('Error loading guides:', error);
        // Fallback to default guide
        setGuides([{
          id: 1,
          title: "The Creator Gold Rush for Pakistani Women",
          cover: "/creatortitle.png",
          description: "A comprehensive guide for Pakistani women to build successful online businesses and become content creators in the digital economy. Learn how to monetize your skills, build a personal brand, and create sustainable income streams through digital platforms.",
          price: 29.99,
          previewChapters: [
            "Chapter 1: Introduction to the Creator Economy",
            "Chapter 2: Building Your Personal Brand",
            "Chapter 3: Content Creation Strategies",
            "Chapter 4: Monetization Methods",
            "Chapter 5: Social Media Marketing"
          ],
          totalChapters: 12,
          author: "Hatche Team",
          rating: 4.9,
          students: 500,
          file_url: "/preview.pdf"
        }]);
      } finally {
        setLoading(false);
      }
    };

    loadGuides();
  }, []);

  // Scroll detection for showing preview buttons
  useEffect(() => {
    const handleScroll = () => {
      const guideCards = document.querySelectorAll('.guide-card');
      const newVisibleCards = new Set();
      
      guideCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        // Card is visible when it's in the viewport
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          newVisibleCards.add(index);
        }
      });
      
      setVisibleCards(newVisibleCards);
    };

    // Use throttled scroll event for better performance
    let scrollTimeout;
    const throttledScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 100);
    };

    window.addEventListener('scroll', throttledScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [guides]);

  const openPreview = async (guide) => {
    try {
      console.log('=== PREVIEW DEBUG ===');
      console.log('Guide object:', guide);
      console.log('Guide ID:', guide.id);
      console.log('Guide title:', guide.title);
      
      // Fetch preview from guide_previews table using correct column names
      console.log('Fetching from guide_previews table...');
      const { data: previewData, error } = await supabase
        .from('guide_previews')
        .select('*')
        .eq('guide_id', guide.id)
        .maybeSingle();
      
      console.log('Preview query result:', { previewData, error });
      
      if (error) {
        console.error('Error fetching preview:', error);
        alert('Error loading preview. Please try again later.');
        return;
      }
      
      if (previewData && previewData.preview_url) {
        console.log('✅ Using preview from guide_previews table:', previewData.preview_url);
        window.open(previewData.preview_url, '_blank');
      } else {
        console.log('❌ No preview found in guide_previews table');
        console.log('Trying alternative approach - fetching all previews...');
        
        // Try to get all previews and see what's available
        const { data: allPreviews, error: allPreviewsError } = await supabase
          .from('guide_previews')
          .select('*');
        
        console.log('All previews in database:', allPreviews);
        console.log('All previews error:', allPreviewsError);
        
        // Try to find a preview by title match
        if (allPreviews && allPreviews.length > 0) {
          const matchingPreview = allPreviews.find(preview => 
            preview.preview_title && guide.title && 
            preview.preview_title.toLowerCase().includes(guide.title.toLowerCase())
          );
          
          if (matchingPreview) {
            console.log('✅ Found matching preview by title:', matchingPreview.preview_url);
            window.open(matchingPreview.preview_url, '_blank');
            return;
          }
        }
        
        console.log('❌ No preview available for this guide');
        alert('Preview not available for this guide. Please contact support.');
      }
    } catch (error) {
      console.error('Error in openPreview:', error);
      alert('Error loading preview. Please try again later.');
    }
  };


  const handlePurchase = async (guide) => {
    console.log('Purchase button clicked for guide:', guide.title);
    console.log('Navigating to checkout with guide data:', guide);
    
    // Scroll to top before navigation
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Small delay to allow scroll to start before navigation
    setTimeout(() => {
      // Redirect to checkout with guide data and return path
      // The ProtectedRoute will handle authentication
      navigate('/checkout', { 
        state: { 
          guide: guide,
          from: '/our-guides',
          returnTo: '/our-guides'
        } 
      });
    }, 100);
  };

  // Authentication handler removed (was unused)

  // Check for purchase success message
  useEffect(() => {
    if (location.state?.purchaseSuccess) {
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [location.state]);

  return (
    <div className="our-guides-page">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message">
          <div className="success-content">
            <span className="success-icon">🎉</span>
            <div className="success-text">
              <h3>Purchase Successful!</h3>
              <p>You now have access to "{location.state?.guideTitle}". Check your guides below.</p>
            </div>
            <button 
              className="close-success"
              onClick={() => setShowSuccessMessage(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="guides-header">
        <div className="guides-header-content">
          <h1 className="guides-title">Our Premium Guides</h1>
          <p className="guides-subtitle">
            Expert-crafted e-guides to accelerate your learning journey
          </p>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="guides-grid-section">
          <div className="guides-grid">
            {loading ? (
              <div className="loading-message">Loading guides...</div>
            ) : guides.length === 0 ? (
              <div className="no-guides-message">No guides available. (Debug: guides.length = {guides.length})</div>
            ) : (
              guides.map((guide, index) => (
              <div key={guide.id} className="guide-card">
                <div className="guide-cover">
                  <img src={guide.cover} alt={guide.title} />
                  {visibleCards.has(index) && (
                    <div className="guide-overlay">
                      <button 
                        className="preview-btn"
                        onClick={() => openPreview(guide)}
                      >
                        Preview
                      </button>
                    </div>
                  )}
                </div>
              
              <div className="guide-content">
                <div className="guide-meta">
                  <span className="guide-author">By {guide.author}</span>
                  <div className="guide-rating">
                    <span className="stars">★★★★★</span>
                    <span className="rating-text">{guide.rating} ({guide.students} students)</span>
                  </div>
                </div>
                
                <h3 className="guide-title">{guide.title}</h3>
                <p className="guide-description">{guide.description}</p>
                
                <div className="guide-stats">
                  <span className="chapters">{guide.totalChapters} Chapters</span>
                  <span className="price">${guide.price}</span>
                </div>
                
                {user && user.purchasedGuides && user.purchasedGuides.includes(guide.id) ? (
                  <button 
                    className="view-btn"
                    onClick={() => {
                      console.log('View guide clicked for:', guide.title);
                      // Open secure PDF viewer
                      window.open(`/secure-pdf-viewer?guide=${guide.id}`, '_blank');
                    }}
                  >
                    View Guide
                  </button>
                ) : (
                  <button 
                    className="purchase-btn"
                    onClick={() => {
                      console.log('Purchase button clicked for:', guide.title);
                      handlePurchase(guide);
                    }}
                  >
                    Purchase Guide
                  </button>
                )}
              </div>
            </div>
              ))
            )}
        </div>
      </section>

    </div>
  );
}

export default OurGuides;
