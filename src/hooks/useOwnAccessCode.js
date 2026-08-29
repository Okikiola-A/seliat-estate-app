import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { generateCode, findActiveCode } from '../utils/helpers'

// Everything needed to display and manage a single person's own delivery
// access code: the current active code (if any), their code history, the
// estate-wide duration bounds, and the generate/revoke/clear actions.
//
// Used by both ResidentScreen (a resident's own code) and AdminDashboard's
// "My Code" tab (an admin's own code) — same feature, same rules, same
// Supabase calls, just two different people looking at their own data. This
// hook is the single place that logic lives, so a fix here (e.g. the
// expires_at timezone bug from an earlier session) only ever needs to
// happen once instead of being kept in sync by hand across two screens.
//
// Presentation is intentionally left to each screen — they render this
// data with slightly different layouts, so only the data/logic layer is
// shared here.
export function useOwnAccessCode(profileId) {
  const [activeCode, setActiveCode] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  // True only until the very first fetch resolves, then stays true forever
  // after. Kept separate from `loading` (which flips back to true on every
  // refetch, including the ones that follow a generate/revoke/clear
  // action) specifically so a screen can show a "no data yet" placeholder
  // on first load, without also blanking out and redrawing the whole card
  // on every subsequent action-triggered refetch — that flash was visible
  // and reported as feeling unpolished, even though the refetch itself is
  // still necessary to pick up the change.
  const [initialized, setInitialized] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState(null)
  const [codeSettings, setCodeSettings] = useState({ default_expiry_hours: 12, max_expiry_hours: 12 })
  const [durationHours, setDurationHours] = useState(12)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('delivery_codes')
      .select('id, code, created_at, used, used_at, revoked, expires_at')
      .eq('resident_id', profileId)
      .order('created_at', { ascending: false })

    if (data) {
      setActiveCode(findActiveCode(data))
      setHistory(data)
    }
    setLoading(false)
    setInitialized(true)
  }, [profileId])

  useEffect(() => {
    // Standard fetch-on-mount pattern, matching every other data-fetching
    // effect in this codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCodes()
    supabase.from('app_settings').select('default_expiry_hours, max_expiry_hours').single().then(({ data }) => {
      if (data) {
        setCodeSettings(data)
        setDurationHours(data.default_expiry_hours)
      }
    })
  }, [fetchCodes])

  // Returns true on success so callers can compose their own follow-up UI
  // behavior (e.g. resetting a pagination page) without this hook needing
  // to know about screen-specific presentation state.
  const generate = async () => {
    setError(null)

    const parsedDuration = Number(durationHours)
    if (!durationHours || Number.isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > codeSettings.max_expiry_hours) {
      setError(`Please enter a duration between 1 and ${codeSettings.max_expiry_hours} hours.`)
      return false
    }

    setGenerating(true)

    const { data: existing } = await supabase
      .from('delivery_codes')
      .select('id')
      .eq('resident_id', profileId)
      .eq('used', false)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      setError('You already have an active code. Use or wait for it to expire first.')
      setGenerating(false)
      await fetchCodes()
      return false
    }

    const newCode = generateCode()

    const { error: rpcError } = await supabase.rpc('generate_delivery_code', {
      p_code: newCode,
      p_duration_hours: parsedDuration,
    })

    if (rpcError) {
      console.error('Failed to generate code:', rpcError)
      setError('Something went wrong. Please try again.')
      setGenerating(false)
      return false
    }

    await fetchCodes()
    setGenerating(false)
    return true
  }

  const revoke = async (code) => {
    setRevoking(true)

    const { error: rpcError } = await supabase.rpc('revoke_own_code', { target_code_id: code.id })

    if (rpcError) {
      console.error('Failed to revoke code:', rpcError)
      alert('Could not revoke this code. Please try again.')
      setRevoking(false)
      return false
    }

    await fetchCodes()
    setRevoking(false)
    return true
  }

  const clearHistory = async () => {
    const { error: deleteError } = await supabase
      .from('delivery_codes')
      .delete()
      .eq('resident_id', profileId)

    if (deleteError) {
      console.error('Failed to clear history:', deleteError)
      alert('Could not clear history. Please try again.')
      return false
    }

    await fetchCodes()
    return true
  }

  return {
    activeCode,
    history,
    initialLoading: loading && !initialized,
    generating,
    revoking,
    error,
    codeSettings,
    durationHours,
    setDurationHours,
    generate,
    revoke,
    clearHistory,
  }
}