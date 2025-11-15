import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component for dynamic meta tags
 * Usage: <SEO title="..." description="..." keywords="..." />
 */
export const SEO = ({ 
  title = 'Hatche - Premium Guides for Pakistani Creators',
  description = 'Premium guides for Pakistani creators and entrepreneurs. Build influence, income, and identity with expert-crafted e-guides.',
  keywords = 'premium guides, Pakistani creators, entrepreneurship, digital guides, online courses, business guides, creator economy, how-to guides',
  image = 'https://hatchepk.com/HATCHE800.png',
  url,
  type = 'website',
  schema
}) => {
  const location = useLocation();
  const currentUrl = url || `https://hatchepk.com${location.pathname}`;
  
  // Ensure title is 55-60 characters
  const optimizedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  
  // Ensure description is 150-160 characters
  const optimizedDescription = description.length > 160 
    ? description.substring(0, 157) + '...' 
    : description;

  useEffect(() => {
    // Update document title
    document.title = optimizedTitle;

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // Update meta tags
    updateMetaTag('description', optimizedDescription);
    updateMetaTag('keywords', keywords);
    
    // Open Graph tags
    updateMetaTag('og:title', optimizedTitle, true);
    updateMetaTag('og:description', optimizedDescription, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:type', type, true);
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', optimizedTitle);
    updateMetaTag('twitter:description', optimizedDescription);
    updateMetaTag('twitter:image', image);

    // Add schema markup if provided
    if (schema) {
      let schemaScript = document.querySelector('script[type="application/ld+json"]');
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    }
  }, [optimizedTitle, optimizedDescription, keywords, image, currentUrl, type, schema]);

  return null; // This component doesn't render anything
};

export default SEO;

