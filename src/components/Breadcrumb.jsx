import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

/**
 * Breadcrumb Navigation Component
 * Automatically generates breadcrumbs based on current route
 */
export const Breadcrumb = ({ items }) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs if not provided
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbs = [{ label: 'Home', path: '/' }];

    pathnames.forEach((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({ label, path: to });
    });

    return breadcrumbs;
  };

  const breadcrumbs = items || generateBreadcrumbs();

  // Schema markup for breadcrumbs
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.label,
      "item": `https://hatchepk.com${crumb.path}`
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.path} className="breadcrumb-item">
              {index === breadcrumbs.length - 1 ? (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {' > '}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumb;

