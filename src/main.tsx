import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only register SW on web
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.location.href.startsWith('file:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

const container = document.getElementById('root');
if (container) {
  // Hide the HTML loading screen before rendering React
  if (window.hideLoadingScreen) window.hideLoadingScreen();
  
  const root = createRoot(container);
  root.render(<App />);
}
