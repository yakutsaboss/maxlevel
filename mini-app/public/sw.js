const CACHE_NAME = 'maxlevel-__BUILD_HASH__';
const STATIC_ASSETS = [
  '/levelapp/',
  '/levelapp/index.html',
];

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaxLevel - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      text-align: center;
      max-width: 320px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #f8fafc;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    button {
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    button:active { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x1F4F6;</div>
    <h1>You're offline</h1>
    <p>Check your internet connection and try again. Your progress is saved and will sync when you're back online.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;

const OFFLINE_CACHE_KEY = 'offline-page';

// Install: cache static assets + offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).then(() =>
        cache.put(
          new Request(OFFLINE_CACHE_KEY),
          new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static, offline fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/levelapp/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets, with offline fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // If it's a navigation request, serve the offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_CACHE_KEY);
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// Message listener for cache control from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      if (event.source) {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      }
    });
  }
});
