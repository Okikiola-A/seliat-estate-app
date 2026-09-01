import { useSyncExternalStore, useCallback, useState } from 'react'
import { pwaInstallState } from '../pwaInstallState'

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

// Thin wrapper around the shared pwaInstallState module (see that file for
// why the actual event listener lives there instead of here) — this hook
// just subscribes any component that renders it to that shared state, so
// multiple components (or the same one, remounting on navigation) all see
// the same install status without each needing its own listener.
export function usePwaInstall() {
  const deferredPrompt = useSyncExternalStore(pwaInstallState.subscribe, pwaInstallState.getDeferredPrompt)
  const installed = useSyncExternalStore(pwaInstallState.subscribe, pwaInstallState.getInstalled)

  // Tracks whether *this* hook instance just walked the user through a
  // successful install, so the calling screen can show a one-time
  // "installed just now, here's what to do next" state distinct from
  // "was already installed before you even opened this page."
  const [justInstalled, setJustInstalled] = useState(false)

  const promptInstall = useCallback(async () => {
    const prompt = pwaInstallState.getDeferredPrompt()
    if (!prompt) return
    prompt.prompt()
    const choice = await prompt.userChoice
    pwaInstallState.clearPrompt()
    if (choice.outcome === 'accepted') setJustInstalled(true)
  }, [])

  return {
    installed,
    justInstalled,
    canPromptInstall: !!deferredPrompt,
    isIos: isIosDevice(),
    promptInstall,
  }
}