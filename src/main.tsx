import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { isNativeApp } from './lib/native';
import { startSync } from './lib/sync';

startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support when served over http(s) as an installable PWA (the native apps bundle everything already)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD && !import.meta.env.VITE_SINGLEFILE && !isNativeApp()) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
