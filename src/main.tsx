import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { maybeAutoStartStoryTextSync } from './services/storyTextSync';
import { initNativeShell, applyNativeViewport } from './platform/nativeShell';
import { platform } from './platform';
import { applySubdomainRedirect } from './utils/subdomains';

// Поддомены operators/terminal/terra/translation открывают свой раздел
// ещё до монтирования React — без вспышки главной страницы.
applySubdomainRedirect();

// До первого рендера: в Android-ландшафте включаем десктопный viewport,
// чтобы не было вспышки мобильной раскладки.
applyNativeViewport();

// PWA: автообновление без баннера.
// registerType: 'autoUpdate' + skipWaiting/clientsClaim (vite.config.ts) —
// новая версия активируется сразу, поэтому обновляем страницу, как только
// новый service worker забирает контроль. Первую установку не перезагружаем:
// в этот момент страница контролируется впервые (controller === null).
if ('serviceWorker' in navigator && platform.kind === 'web') {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// В нативных приложениях сразу начинает докачиваться текст сценариев.
// На сайте это no-op: 75 МБ без спроса не качаем.
maybeAutoStartStoryTextSync();

void initNativeShell();
