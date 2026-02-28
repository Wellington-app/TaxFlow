import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only register SW on web, not on native apps
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.location.href.startsWith('file:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  // Notify index.html that we reached this point
  if (window.markAppAsLoaded) window.markAppAsLoaded();
}
