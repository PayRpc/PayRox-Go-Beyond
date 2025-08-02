import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/enhanced.css';

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure you have a div with id="root" in your HTML.');
}

// Create root and render the application
const root = ReactDOM.createRoot(rootElement);

// Render the App component with strict mode for development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Basic error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Basic error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});
