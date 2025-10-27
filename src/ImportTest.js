// Test file to verify all imports work correctly
import React from 'react';

// Test component imports
import { Button, LoadingSpinner, ErrorBoundary, Toast } from './components';

// Test hook import
import { useToast } from './hooks/useToast';

// Test individual component imports
import { Button as ButtonDirect } from './components/Button';
import { LoadingSpinner as LoadingSpinnerDirect } from './components/LoadingSpinner';
import { ErrorBoundary as ErrorBoundaryDirect } from './components/ErrorBoundary';
import { Toast as ToastDirect } from './components/Toast';

// Simple test component
const ImportTest = () => {
  const { addToast, ToastContainer } = useToast();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Import Test - All Components Loaded Successfully!</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>Button Test</h3>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="outline">Outline Button</Button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Loading Spinner Test</h3>
        <LoadingSpinner size="md" message="Loading test..." />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Toast Test</h3>
        <Button onClick={() => addToast('Test toast!', 'success')}>
          Show Toast
        </Button>
        <ToastContainer />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Error Boundary Test</h3>
        <ErrorBoundary>
          <div>
            <p>This content is wrapped in an ErrorBoundary</p>
            <Button>Safe Button</Button>
          </div>
        </ErrorBoundary>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Direct Import Test</h3>
        <ButtonDirect variant="primary">Direct Import Button</ButtonDirect>
      </div>

      <p style={{ color: 'green', fontWeight: 'bold' }}>
        ✅ All imports successful! Components are working correctly.
      </p>
    </div>
  );
};

export default ImportTest;
