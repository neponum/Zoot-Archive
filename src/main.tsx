import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker.
// 'prompt' registration (see vite.config.ts): a new deployment fires
// onNeedRefresh and PWAUpdatePrompt shows an in-app banner, so applying the
// update is a user action — an automatic reload could discard unsaved work
// (e.g. an in-progress translation).
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('zoot:pwa-need-refresh'));
      },
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('zoot:pwa-offline-ready'));
      },
    });
    window.__zootUpdateSW = updateSW;
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
