import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Função para mostrar erro na tela do celular
const showError = (msg: string) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 30px; color: #ef4444; font-family: sans-serif; background: #fef2f2; height: 100vh; text-align: center;">
        <h1 style="font-size: 20px; font-weight: bold;">Ops! Ocorreu um erro</h1>
        <p style="font-size: 14px; margin-top: 10px; color: #666;">${msg}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: bold;">Tentar Novamente</button>
      </div>
    `;
  }
};

const container = document.getElementById('root');
if (container) {
  const status = document.getElementById('status');
  if (status) status.innerHTML = 'Iniciando interface...';

  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('React Renderizado');
  } catch (e: any) {
    showError('Erro ao iniciar o React: ' + e.message);
  }
}

// Captura erros que acontecem depois do início
window.addEventListener('error', (event) => {
  showError('Erro de execução: ' + event.message);
});
