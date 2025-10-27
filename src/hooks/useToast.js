import { useState, useCallback } from 'react';
import { Toast } from '../components/Toast';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastContainer = () => (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { addToast, ToastContainer };
};

// Usage Example:
// import { useToast } from './hooks/useToast';
// 
// function MyComponent() {
//   const { addToast, ToastContainer } = useToast();
//   
//   const handleSuccess = () => {
//     addToast('Purchase successful!', 'success');
//   };
//   
//   return (
//     <>
//       <button onClick={handleSuccess}>Buy Now</button>
//       <ToastContainer />
//     </>
//   );
// }
