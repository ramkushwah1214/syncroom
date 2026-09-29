import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './audio/SpotifyPlaybackProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register safe static asset service worker (Phase 11 PWA)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        // Service worker active for static shell caching
      })
      .catch((err) => {
        console.warn('[SyncRoom] Service worker registration notice:', err);
      });
  });
}

