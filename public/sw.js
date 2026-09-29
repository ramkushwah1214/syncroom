/**
 * SyncRoom Safe Static Asset Service Worker (Phase 11)
 *
 * CRITICAL ARCHITECTURE RULE:
 * This service worker ONLY caches safe static application assets (HTML shell, CSS, JS, fonts, icons).
 * It NEVER intercepts or caches:
 * - Dynamic synchronized room state
 * - Authoritative playback state
 * - Queue state
 * - Room membership
 * - Admin permissions / session tokens
 * - Dynamic /api/* REST requests
 * - WebSocket connections (ws:, wss:)
 */

const CACHE_NAME = 'syncroom-static-v1';

const STATIC_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_SHELL).catch((err) => {
          console.warn('[SyncRoom SW] Pre-cache non-fatal error:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Never intercept WebSockets
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Strictly DO NOT cache any API routes, dynamic endpoints, or session/token requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname.startsWith('/ws') ||
    url.searchParams.has('sessionToken') ||
    url.searchParams.has('sessionId')
  ) {
    return; // Pass through directly to network
  }

  // For SPA page navigations: Network First, fallback to cached /index.html if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html').then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // For static immutable build assets (Vite hashed bundles /assets/*, fonts, icons)
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname === '/manifest.webmanifest')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // For Google Fonts CDN
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((resp) => {
              if (resp && resp.status === 200) {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return resp;
            })
            .catch(() => cached)
        );
      })
    );
    return;
  }
});
