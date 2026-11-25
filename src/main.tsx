import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support when served over http(s) as an installable PWA
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD && !import.meta.env.VITE_SINGLEFILE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
