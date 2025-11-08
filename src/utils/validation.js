// src/utils/validation.js
import { useState, useCallback } from 'react';

/**
 * Comprehensive form validation utilities
 */

export const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return '';
  },

  password: (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    if (!/(?=.*[a-z])/.test(value)) return 'Password must contain a lowercase letter';
    if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain an uppercase letter';
    if (!/(?=.*\d)/.test(value)) return 'Password must contain a number';
    return '';
  },

  phone: (value) => {
    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (!value) return 'Phone number is required';
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
    return '';
  },

  cardNumber: (value) => {
    // Remove spaces
    const cleaned = value.replace(/\s/g, '');
    if (!cleaned) return 'Card number is required';
    if (!/^\d{13,19}$/.test(cleaned)) return 'Please enter a valid card number';
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) return 'Invalid card number';
    return '';
  },

  expiryDate: (value) => {
    if (!value) return 'Expiry date is required';
    const [month, year] = value.split('/').map(v => parseInt(v));
    
    if (!month || !year) return 'Invalid expiry date format (MM/YY)';
    if (month < 1 || month > 12) return 'Invalid month';
    
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (year < currentYear) return 'Card has expired';
    if (year === currentYear && month < currentMonth) return 'Card has expired';
    
    return '';
  },

  cvv: (value) => {
    if (!value) return 'CVV is required';
    if (!/^\d{3,4}$/.test(value)) return 'CVV must be 3 or 4 digits';
    return '';
  },

  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name contains invalid characters';
    return '';
  },

  instagramUsername: (value) => {
    if (!value) return 'Instagram username is required';
    // Remove @ if present
    const cleaned = value.replace('@', '');
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleaned)) {
      return 'Invalid Instagram username format';
    }
    return '';
  },

  followerCount: (value) => {
    const num = parseInt(value);
    if (!value) return 'Follower count is required';
    if (isNaN(num) || num < 0) return 'Please enter a valid number';
    if (num < 1000) return 'Minimum 1,000 followers required';
    return '';
  },

  required: (fieldName) => (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return '';
  }
};

/**
 * Validate entire form object
 */
export const validateForm = (values, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const validator = rules[field];
    const error = validator(values[field]);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};

/**
 * Custom hook for form validation
 */
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur
    if (validationRules[name]) {
      const error = validationRules[name](values[name]);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  }, [validationRules, values]);

  const validateAll = useCallback(() => {
    const allErrors = validateForm(values, validationRules);
    setErrors(allErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );
    return Object.keys(allErrors).length === 0;
  }, [values, validationRules]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    setValues,
  };
};

/**
 * Example usage in checkout.js:
 * 
 * const checkoutValidation = {
 *   firstName: validators.name,
 *   lastName: validators.name,
 *   email: validators.email,
 *   phone: validators.phone,
 *   cardNumber: validators.cardNumber,
 *   expiryDate: validators.expiryDate,
 *   cvv: validators.cvv,
 * };
 * 
 * const { values, errors, touched, handleChange, handleBlur, validateAll } = 
 *   useFormValidation(initialFormData, checkoutValidation);
 * 
 * const handleSubmit = (e) => {
 *   e.preventDefault();
 *   if (validateAll()) {
 *     // Process form
 *   }
 * };
 */
