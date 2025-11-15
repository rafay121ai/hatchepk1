import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ourguides.css';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import { SEO, Breadcrumb } from './components';

function OurGuides() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log('Is mobile device:', mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadGuides = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetching guides from database...');
        }
        
        // Fetch guides from the database with pagination
        const { data: guidesData, error } = await supabase
          .from('guides')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(12); // Limit initial load for performance
          
        if (process.env.NODE_ENV === 'development') {
          console.log('Guides response:', guidesData?.length || 0, 'guides');
        }

        if (error) {
          console.error('Error fetching guides:', error);
          console.log('Falling back to default guide');
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
            setGuides([{
              id: 1,
              title: "The Creator Gold Rush for Pakistani Women.\nBuild Influence, Income & Identity.",
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
            console.log('Transforming guides data...');
            const transformedGuides = guidesData.map(guide => ({
              ...guide,
              cover: "/creatortitle.png",
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
  }, [user]);

  // Scroll detection for showing preview buttons
  useEffect(() => {
    const handleScroll = () => {
      const guideCards = document.querySelectorAll('.guide-card');
      const newVisibleCards = new Set();
      
      guideCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          newVisibleCards.add(index);
        }
      });
      
      setVisibleCards(newVisibleCards);
    };

    let scrollTimeout;
    const throttledScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 100);
    };

    window.addEventListener('scroll', throttledScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [guides]);

  // Mobile-compatible function to open previews
  const openPreviewInNewTab = (url) => {
    console.log('Opening preview URL:', url);
    
    // Detect mobile at the time of click
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    console.log('Is mobile device:', isMobileDevice);
    
    try {
      // Create a temporary link element and trigger click - works better on mobile
      const link = document.createElement('a');
      link.href = url;
      link.target = '_self';
      link.rel = 'noopener noreferrer';
      
      // Make it visible but tiny for better mobile compatibility
      link.style.position = 'fixed';
      link.style.top = '0';
      link.style.left = '0';
      link.style.width = '1px';
      link.style.height = '1px';
      link.style.opacity = '0';
      link.style.pointerEvents = 'none';
      
      document.body.appendChild(link);
      
      // Trigger click
      link.click();
      
      // Remove after a short delay
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);
      
      console.log('Preview opened via link click method');
    } catch (error) {
      console.error('Link click method failed:', error);
      // Fallback: try window.open
      try {
        window.open(url, '_self', 'noopener,noreferrer');
      } catch (e) {
        console.error('All methods failed, navigating directly:', e);
        window.location.href = url;
      }
    }
  };

  const openPreview = async (guide) => {
    try {
      console.log('=== PREVIEW DEBUG ===');
      console.log('Guide object:', guide);
      console.log('Guide ID:', guide.id);
      console.log('Guide title:', guide.title);
      console.log('Is mobile:', isMobile);
      
      // Fetch preview from guide_previews table
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
        openPreviewInNewTab(previewData.preview_url);
      } else {
        console.log('❌ No preview found in guide_previews table');
        console.log('Trying alternative approach - fetching all previews...');
        
        const { data: allPreviews, error: allPreviewsError } = await supabase
          .from('guide_previews')
          .select('*');
        
        console.log('All previews in database:', allPreviews);
        console.log('All previews error:', allPreviewsError);
        
        if (allPreviews && allPreviews.length > 0) {
          const matchingPreview = allPreviews.find(preview => 
            preview.preview_title && guide.title && 
            preview.preview_title.toLowerCase().includes(guide.title.toLowerCase())
          );
          
          if (matchingPreview) {
            console.log('✅ Found matching preview by title:', matchingPreview.preview_url);
            openPreviewInNewTab(matchingPreview.preview_url);
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
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    setTimeout(() => {
      navigate('/checkout', { 
        state: { 
          guide: guide,
          from: '/our-guides',
          returnTo: '/our-guides'
        } 
      });
    }, 100);
  };

  // Check for purchase success message
  useEffect(() => {
    if (location.state?.purchaseSuccess) {
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [location.state]);

  // Generate schema markup for guides page
  const guidesSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Premium Guides for Pakistani Creators",
    "description": "Expert-crafted e-guides to help Pakistani creators build influence, income, and identity",
    "itemListElement": guides.map((guide, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Course",
        "name": guide.title,
        "description": guide.description,
        "provider": {
          "@type": "Organization",
          "name": "Hatche",
          "url": "https://hatchepk.com"
        },
        "offers": {
          "@type": "Offer",
          "price": guide.price,
          "priceCurrency": "PKR"
        }
      }
    }))
  };

  return (
    <div className="our-guides-page">
      <SEO
        title="Premium Guides for Pakistani Creators | How-To Guides & Tutorials | Hatche"
        description="Discover premium how-to guides and step-by-step tutorials for Pakistani creators. Expert-crafted e-guides on entrepreneurship, content creation, and building your online business. Start learning today!"
        keywords="how-to guides, step-by-step tutorials, Pakistani creators, entrepreneurship guides, content creation, online business, digital guides, premium tutorials"
        url="https://hatchepk.com/our-guides"
        schema={guidesSchema}
      />
      <Breadcrumb items={[
        { label: 'Home', path: '/' },
        { label: 'Our Guides', path: '/our-guides' }
      ]} />
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
          <h1 className="guides-title">Learn. Evolve. Hatch.</h1>
          <p className="guides-subtitle">
            Expert-crafted step-by-step guides and tutorials to help you build influence, income, and identity. Learn from comprehensive e-guides designed for Pakistani entrepreneurs and content creators.
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
                  <img 
                    src={guide.cover} 
                    alt={guide.title}
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="300"
                  />
                  {(visibleCards.has(index) || isMobile) && (
                    <div className="guide-overlay">
                      <button 
                        className="preview-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Preview button clicked for:', guide.title);
                          openPreview(guide);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Preview button touched for:', guide.title);
                          openPreview(guide);
                        }}
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
                  
                  <h2 className="guide-title">{guide.title}</h2>
                  <p className="guide-description">{guide.description}</p>
                  
                  <div className="guide-stats">
                    <span className="chapters">{guide.totalChapters} Chapters</span>
                    <span className="price">PKR {guide.price}</span>
                  </div>
                  
                  {user && user.purchasedGuides && user.purchasedGuides.includes(guide.id) ? (
                    <button 
                      className="view-btn"
                      onClick={() => {
                        console.log('View guide clicked for:', guide.title);
                        navigate('/your-guides');
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