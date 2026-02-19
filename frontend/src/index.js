import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import toast from 'react-hot-toast';

// Global error handlers to catch unhandled promise rejections and runtime errors
window.addEventListener('unhandledrejection', (event) => {
  try {
    const reason = event.reason;
    const message = (reason && reason.message) || String(reason) || 'Unhandled promise rejection';
    console.warn('Unhandled promise rejection:', reason);
    toast.error(message, { duration: 5000 });
    // Prevent default logging to avoid React overlay in dev
    event.preventDefault();
  } catch (err) {
    console.error('Error handling unhandledrejection:', err);
  }
});

window.addEventListener('error', (event) => {
  try {
    const message = event.message || 'Runtime error';
    console.error('Global error caught:', event.error || message);
    toast.error(message, { duration: 5000 });
    // Prevent default to reduce noisy overlays during geolocation timeouts
    // Note: this may also suppress useful dev-time stack traces; remove if undesired.
    event.preventDefault();
  } catch (err) {
    console.error('Error handling global error:', err);
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('App is ready to work offline!');
  },
  onUpdate: (registration) => {
    toast('New version available! Refresh to update.', {
      icon: '🔄',
      duration: 5000
    });
  }
});

