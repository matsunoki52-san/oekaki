import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/* ---- iPad Safari: ピンチズーム / ダブルタップズーム / 長押しメニューを抑止 ---- */
const prevent = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', prevent, { passive: false });
document.addEventListener('gesturechange', prevent, { passive: false });
document.addEventListener('contextmenu', (e) => {
  if (!(e.target instanceof HTMLImageElement && e.target.classList.contains('saved-preview'))) e.preventDefault();
});
// 2本指以上の touchmove（ピンチ）はスクロール領域でも止める
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
// ダブルタップズームは CSS の touch-action (none / manipulation) で抑止する

/* ---- Service Worker（本番ビルドのみ） ---- */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
