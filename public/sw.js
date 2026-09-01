// Bumped from v1: the old cache-first strategy below served a stale
// index.html/bundle for a full extra page load after every deploy (see
// comment on the fetch handler), which left some in-progress bug fixes
// looking like they "hadn't taken effect" when they actually just hadn't
// been fetched yet. Bumping this forces every existing device to drop its
// old cache and start fresh under the corrected strategy.
const CACHE_NAME = 'seliat-estate-shell-v2'

// Only cache the app shell — never touch Supabase/API requests or anything
// cross-origin. Data always comes from the network; caching here is purely
// about making repeat loads faster and letting the login screen show up
// offline, not about serving stale app code.
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

  // Navigation requests (the HTML shell itself) and the hashed JS/CSS it
  // references are NOT equivalent here, even though the old version
  // treated them the same:
  //   - index.html has a fixed, unhashed URL. Its content (which hashed
  //     bundle it points to) changes on every deploy, so serving a cached
  //     copy risks pointing at a bundle from a previous deploy — exactly
  //     the "why isn't my fix showing up" symptom. This needs
  //     network-first: always try the network, and only fall back to
  //     whatever's cached if the network fails (i.e. actually offline).
  //   - The JS/CSS files Vite builds are content-hashed — a code change
  //     always produces a new filename, so the same URL can never
  //     legitimately point to different content. Serving those cache-first
  //     (with a background refresh for next time) is safe and keeps
  //     repeat loads fast, which was the original intent here.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
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