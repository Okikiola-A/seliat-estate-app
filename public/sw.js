const CACHE_NAME = 'seliat-estate-shell-v1'

// Only cache the app shell — never touch Supabase/API requests or anything
// cross-origin. Data always comes from the network; this just makes repeat
// loads faster and lets the login screen show up offline.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests. Everything else (Supabase auth,
  // REST, realtime websockets, WhatsApp links, fonts CDN) passes straight
  // through untouched.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)

      return cached || network
    })
  )
})