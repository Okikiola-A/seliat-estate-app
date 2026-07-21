import { useState } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import PeekPasswordInput from "../components/PeekPasswordInput"
import { validatePassword } from '../utils/helpers'

// This screen is only reached via a real password-recovery session (a
// clicked emailed reset link) — Supabase doesn't require the current
// password to be supplied in that case, unlike a normal signed-in session,
// which is why there's no current-password field here.
export default function ResetPassword({ onDone }) {
  const { theme } = useTheme()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const validate = () => {
    if (!password) return 'Please enter a new password'
    const passwordError = validatePassword(password)
    if (passwordError) return passwordError
    if (password !== confirm) return 'Passwords do not match'
    return null
  }

  const handleReset = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => onDone(), 2000)
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: theme.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: "'DM Sans', sans-serif",
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      backgroundColor: theme.surface,
      borderRadius: '8px',
      padding: '2rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    },
    iconCircle: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: theme.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    title: {
      fontSize: '1.6rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: '0 0 0.25rem 0',
      letterSpacing: '-0.5px',
      fontFamily: "'DM Sans', sans-serif",
    },
    subtitle: {
      fontSize: '0.875rem',
      color: theme.textMuted,
      margin: 0,
      fontWeight: '500',
      lineHeight: '1.6',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: theme.textSecondary,
    },
    fieldWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      padding: '0.85rem 1rem',
      borderRadius: '6px',
      fontSize: '0.95rem',
      backgroundColor: theme.surface,
      color: theme.textPrimary,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: '500',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s',
    },
    eyeBtn: {
      position: 'absolute',
      right: '0.9rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      padding: '0.25rem',
      zIndex: 3,
    },
    errorBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      backgroundColor: theme.dangerBg,
      border: `1px solid ${theme.dangerBorder}`,
    },
    errorText: {
      color: theme.danger,
      fontSize: '0.82rem',
      margin: 0,
      fontWeight: '500',
    },
    submitBtn: {
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.9rem',
      fontSize: '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
      marginTop: '0.25rem',
      transition: 'opacity 0.15s',
    },
    spinnerWrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
    spinner: {
      width: '15px',
      height: '15px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid white',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    },
    signOutLink: {
      background: 'none',
      border: 'none',
      color: theme.primary,
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      padding: 0,
      fontFamily: "'DM Sans', sans-serif",
      marginBottom: '0.5rem',
      display: 'block',
      alignSelf: 'flex-start',
      textAlign: 'left',
      width: 'fit-content',
    },
  }

  const inputStyle = (field) => ({
    ...styles.input,
    border: focusedField === field ? `1.5px solid ${theme.primary}` : `1.5px solid ${theme.border}`,
    paddingRight: '3rem',
  })

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 style={styles.title}>Password Updated</h2>
          <p style={styles.subtitle}>
            Your password has been reset successfully. Taking you back to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`input::placeholder { color: ${theme.textMuted}; } input:focus { outline: none; }`}</style>

      <div style={styles.card}>
        <button
          type="button"
          style={styles.signOutLink}
          onClick={() => supabase.auth.signOut()}
        >
          ← Back
        </button>

        <div>
          <h2 style={styles.title}>Reset Password</h2>
          <p style={styles.subtitle}>Choose a strong new password for your account.</p>
        </div>

        <div style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>New password</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={inputStyle('password')}
                placeholder="Min. 6 characters"
                value={password}
                showPassword={showPassword}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm new password</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={inputStyle('confirm')}
                placeholder="Repeat your new password"
                value={confirm}
                showPassword={showPassword}
                onChange={e => { setConfirm(e.target.value); setError(null) }}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={theme.danger}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinnerWrap}>
                <span style={styles.spinner} />
                Updating...
              </span>
            ) : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}