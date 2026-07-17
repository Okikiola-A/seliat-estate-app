import { useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

// Signs the user out after a period of no interaction. Guards against a
// shared/kiosk device (e.g. a gate tablet) being left logged in.
export function useIdleSignOut(enabled) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        supabase.auth.signOut()
      }, IDLE_TIMEOUT_MS)
    }

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [enabled])
}