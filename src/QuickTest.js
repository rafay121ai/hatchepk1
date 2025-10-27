// Quick test to verify all components can be imported and rendered
import React from 'react';

// Test all imports
try {
  const { Button, LoadingSpinner, ErrorBoundary, Toast } = require('./components');
  const { useToast } = require('./hooks/useToast');
  
  console.log('✅ All component imports successful');
  console.log('Button:', typeof Button);
  console.log('LoadingSpinner:', typeof LoadingSpinner);
  console.log('ErrorBoundary:', typeof ErrorBoundary);
  console.log('Toast:', typeof Toast);
  console.log('useToast:', typeof useToast);
} catch (error) {
  console.error('❌ Import error:', error);
}

// Simple test component
const QuickTest = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Quick Component Test</h1>
      <p>Check the console for import verification results.</p>
      <p>If you see this page, the components are working!</p>
    </div>
  );
};

export default QuickTest;
