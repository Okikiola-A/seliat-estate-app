import { useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const DURATIONS_MS = {
  resident: 30 * 60 * 1000,
  admin: 30 * 60 * 1000,
  guard: 2 * 60 * 60 * 1000,
}

const STORAGE_KEY = 'seliat-session-expiry'

export const clearSessionExpiry = () => localStorage.removeItem(STORAGE_KEY)

// Caps how long a session can last in total, counted from the moment of
// login — independent of in-app activity, and critically, independent of
// the app being fully closed and reopened later. This is a different
// problem from useIdleSignOut (which only protects a device left unlocked
// while the app stays open/running): a closed app has no JS running to
// track idle time at all, so an idle timer alone can never catch "logged
// in, closed the app, came back hours or days later, still signed in."
// The expiry timestamp lives in localStorage and is re-checked fresh on
// every mount/resume instead of depending on a timer surviving the whole
// gap.
//
// `loginNonce` must only change on a genuinely NEW sign-in (not on a
// resumed/refreshed session for the same already-loaded user) — that's
// what starts a fresh countdown. A resumed pre-existing session keeps
// counting from whenever it originally logged in, which is the whole
// point.
export function useSessionExpiry(role, loginNonce) {
  const mountedBefore = useRef(false)

  useEffect(() => {
    if (!role || !DURATIONS_MS[role]) return
    // Skip on the very first render (a fresh page load with an existing
    // resumed session) — only reset the timer when loginNonce actually
    // changes after that, i.e. a real interactive login happened.
    if (mountedBefore.current) {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + DURATIONS_MS[role]))
    }
    mountedBefore.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginNonce])

  useEffect(() => {
    const duration = role ? DURATIONS_MS[role] : null
    if (!duration) return

    const check = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // No timer recorded yet for this session (e.g. one that predates
        // this feature, or the very first check right after login) —
        // start counting from now rather than leave it unbounded.
        localStorage.setItem(STORAGE_KEY, String(Date.now() + duration))
        return
      }
      if (Date.now() > Number(stored)) {
        clearSessionExpiry()
        supabase.auth.signOut()
      }
    }

    check()
    const interval = setInterval(check, 30 * 1000)
    document.addEventListener('visibilitychange', check)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [role])
}