import React, { useState } from 'react';
import { Button, LoadingSpinner, ErrorBoundary, Toast } from './components';
import { useToast } from './hooks/useToast';
import './components/Button.css';
import './components/LoadingSpinner.css';
import './components/ErrorBoundary.css';
import './components/Toast.css';

// Test component that throws an error
const ErrorComponent = () => {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('Test error for ErrorBoundary');
  }
  
  return (
    <div>
      <h3>Error Test Component</h3>
      <Button onClick={() => setShouldError(true)}>
        Trigger Error
      </Button>
    </div>
  );
};

// Main test component
const ComponentTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast, ToastContainer } = useToast();

  const handleLoadingTest = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleToastTest = (type) => {
    addToast(`This is a ${type} toast!`, type);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Component Test Page</h1>
      
      {/* Button Tests */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Button Components</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Button variant="primary" size="sm">Small Primary</Button>
          <Button variant="primary" size="md">Medium Primary</Button>
          <Button variant="primary" size="lg">Large Primary</Button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button isLoading={isLoading} onClick={handleLoadingTest}>
            {isLoading ? 'Loading...' : 'Test Loading'}
          </Button>
        </div>
      </section>

      {/* Loading Spinner Tests */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Loading Spinner Components</h2>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h4>Small</h4>
            <LoadingSpinner size="sm" message="Small spinner" />
          </div>
          <div>
            <h4>Medium</h4>
            <LoadingSpinner size="md" message="Medium spinner" />
          </div>
          <div>
            <h4>Large</h4>
            <LoadingSpinner size="lg" message="Large spinner" />
          </div>
        </div>
      </section>

      {/* Toast Tests */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Toast Components</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button onClick={() => handleToastTest('success')}>Success Toast</Button>
          <Button onClick={() => handleToastTest('error')}>Error Toast</Button>
          <Button onClick={() => handleToastTest('warning')}>Warning Toast</Button>
          <Button onClick={() => handleToastTest('info')}>Info Toast</Button>
        </div>
        <ToastContainer />
      </section>

      {/* Error Boundary Test */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Error Boundary Test</h2>
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      </section>

      {/* Individual Toast Test */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Individual Toast Test</h2>
        <Toast 
          message="This is a standalone toast!" 
          type="info" 
          duration={3000}
          onClose={() => console.log('Toast closed')}
        />
      </section>
    </div>
  );
};

export default ComponentTest;
