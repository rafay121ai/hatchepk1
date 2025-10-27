import React from 'react';
import './Button.css';

export const Button = ({ 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  disabled = false,
  children, 
  className = '',
  ...props 
}) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <span className="spinner-small" aria-hidden="true" />}
      {children}
    </button>
  );
};
