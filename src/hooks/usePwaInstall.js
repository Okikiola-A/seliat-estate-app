import { useState, useEffect, useCallback } from 'react'

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

// Chrome (and other Chromium browsers) fire `beforeinstallprompt` once per
// page load when the PWA installability criteria are met, then suppress it
// afterward — there's no way to make the browser show its native prompt
// again on demand. The workaround: capture that event the moment it fires
// and hang onto it, so a persistent on-page button can trigger the exact
// same native install dialog whenever the user actually wants it, instead
// of only getting one unpredictable moment to click it.
//
// iOS Safari never fires this event at all — it has no programmatic
// install API — so iOS users always need the manual "Share -> Add to Home
// Screen" instructions instead. `isIos` lets callers show that fallback.
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    // A captured prompt event can only be triggered once — drop it either
    // way (accepted or dismissed) so a stale, already-spent event can't be
    // reused. If the criteria are still met, Chrome will fire a fresh one.
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return {
    installed,
    canPromptInstall: !!deferredPrompt,
    isIos: isIosDevice(),
    promptInstall,
  }
}