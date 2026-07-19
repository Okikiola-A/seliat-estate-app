import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { useTheme } from './context/useTheme'
import { useIdleSignOut } from './hooks/useIdleSignOut'
import { useSessionExpiry, clearSessionExpiry } from './hooks/useSessionExpiry'
import Login from './screens/Login'
import GuardScreen from './screens/GuardScreen'
import ResidentScreen from './screens/ResidentScreen'
import AdminDashboard from './screens/AdminDashboard'
import ResetPassword from './screens/ResetPassword'
import AccountStatus from './screens/AccountStatus'
import PasswordReminderBanner from './components/PasswordReminderBanner'

export default function App() {
  const { applyUserTheme } = useTheme()
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [accountStatus, setAccountStatus] = useState(null)
  const [loginNonce, setLoginNonce] = useState(0)
  const [passwordReminderSnoozed, setPasswordReminderSnoozed] = useState(false)
  const [settingsJumpSignal, setSettingsJumpSignal] = useState(0)

  useIdleSignOut(!!session && !!userProfile)
  useSessionExpiry(userProfile?.role, loginNonce)

  // Mirrors `session` state so the auth listener below (set up once on
  // mount, so its closure would otherwise be stuck seeing session as it
  // was at mount time) can check "is this the same user we already have
  // loaded" against the actual current value.
  const sessionRef = useRef(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const fetchProfile = async (userId) => {
    setAccountStatus(null)

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(error)
      setAccountStatus('not_found')
      setLoading(false)
      return
    }

    if (data.status === 'pending') {
      setAccountStatus('pending')
      setLoading(false)
      return
    }

    setUserProfile(data)
    applyUserTheme(data.dark_mode)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsResetting(true)
        setLoading(false)
        return
      }

      // Mobile browsers/PWAs commonly re-fire SIGNED_IN (or INITIAL_SESSION)
      // for the *same* already-logged-in user when the app resumes from
      // being backgrounded — Supabase re-validating the session on focus,
      // not an actual new login. TOKEN_REFRESHED/USER_UPDATED were already
      // filtered out for this reason; the same problem happens with these
      // other event types too, so check by user id instead of by event
      // name. Only a genuine identity change (real login, or logging out)
      // should trigger the full loading/refetch cycle — that's what
      // remounts the current screen and wipes its local state (e.g. the
      // admin dashboard's active tab resetting to Overview).
      const sameUser = sessionRef.current?.user?.id && newSession?.user?.id === sessionRef.current.user.id
      if (sameUser) {
        setSession(newSession)
        return
      }

      setSession(newSession)
      if (newSession) {
        setLoading(true)
        setLoginNonce(n => n + 1)
        fetchProfile(newSession.user.id)
      } else {
        clearSessionExpiry()
        setUserProfile(null)
        setAccountStatus(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // Runs once to wire up the session bootstrap + auth listener. fetchProfile
    // is intentionally omitted: it's redefined every render, so including it
    // would resubscribe this listener (and re-fetch the session) on every
    // render instead of once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isResetting) {
    return <ResetPassword onDone={() => {
      setIsResetting(false)
      supabase.auth.signOut()
    }} />
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) return <Login />

  if (accountStatus) {
    return (
      <AccountStatus
        status={accountStatus}
        onBackToLogin={async () => {
          await supabase.auth.signOut()
          setAccountStatus(null)
        }}
      />
    )
  }

  if (!userProfile) {
    return (
      <div style={styles.center}>
        <p>Profile not found. Contact your administrator.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      </div>
    )
  }

  const openSettings = () => setSettingsJumpSignal(n => n + 1)

  const onPasswordChanged = () => {
    setUserProfile(prev => ({ ...prev, force_password_change: false }))
  }

  let content
  if (userProfile.role === 'guard') {
    content = <GuardScreen profile={userProfile} openSettingsSignal={settingsJumpSignal} onPasswordChanged={onPasswordChanged} />
  } else if (userProfile.role === 'resident') {
    content = <ResidentScreen profile={userProfile} openSettingsSignal={settingsJumpSignal} onPasswordChanged={onPasswordChanged} />
  } else if (userProfile.role === 'admin') {
    content = <AdminDashboard profile={userProfile} openSettingsSignal={settingsJumpSignal} onPasswordChanged={onPasswordChanged} />
  } else {
    // Admin and supervisor placeholder for now
    content = (
      <div style={styles.center}>
        <h1>Welcome, {userProfile.full_name}</h1>
        <p>Role: {userProfile.role}</p>
        <button style={styles.button} onClick={() => supabase.auth.signOut()}>
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <>
      {userProfile.force_password_change && !passwordReminderSnoozed && (
        <PasswordReminderBanner
          onChangePassword={openSettings}
          onSnooze={() => setPasswordReminderSnoozed(true)}
        />
      )}
      {content}
    </>
  )
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'sans-serif',
  },
  button: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
}