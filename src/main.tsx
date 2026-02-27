import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for mobile debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #ef4444; font-family: sans-serif; background: #fef2f2; height: 100vh;">
        <h1 style="font-size: 18px; font-weight: bold;">Erro de Inicialização</h1>
        <p style="font-size: 14px; margin-top: 10px;">${msg}</p>
        <pre style="font-size: 10px; background: #fee2e2; padding: 10px; overflow: auto;">${error?.stack || ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 5px;">Tentar Novamente</button>
      </div>
    `;
  }
  return false;
};

// Only register SW on web, not on native apps
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.location.href.startsWith('file:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  try {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Render error:', error);
  }
}
