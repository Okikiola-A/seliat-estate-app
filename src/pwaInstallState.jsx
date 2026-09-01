// Chrome fires `beforeinstallprompt` once per page load, early — and if
// nothing is listening at that exact moment, it's gone for the rest of
// that page load. A React component's useEffect only starts listening once
// that component actually mounts, which is too late if the user hasn't
// navigated to it yet (e.g. it fired right after initial load, but the
// install page is usually visited later, after clicking a link). This
// module sidesteps that by registering the listener here, at the top
// level, the moment this file is first imported — which happens as soon
// as the app's JS bundle runs, before any route-specific component has had
// a chance to mount or not mount.
let deferredPrompt = null
let installed =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  notify()
})

window.addEventListener('appinstalled', () => {
  installed = true
  deferredPrompt = null
  notify()
})

export const pwaInstallState = {
  getDeferredPrompt: () => deferredPrompt,
  getInstalled: () => installed,
  subscribe: (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  // A captured prompt event can only be triggered once — the hook calls
  // this after using it (accepted or dismissed) so a stale, already-spent
  // event can't be reused. If install criteria are still met, Chrome will
  // fire a fresh beforeinstallprompt on its own.
  clearPrompt: () => {
    deferredPrompt = null
  },
}