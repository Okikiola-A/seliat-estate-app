import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'

export default function ForgotPassword({ onBackToLogin }) {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [focused, setFocused] = useState(false)
  const emailRef = useRef(null)

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email address'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
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
    backBtn: {
      background: 'none',
      border: 'none',
      color: theme.primary,
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      padding: 0,
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'left',
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
    fieldIcon: {
      position: 'absolute',
      left: '0.9rem',
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 1,
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
    loginRow: {
      textAlign: 'center',
      fontSize: '0.875rem',
      color: theme.textSecondary,
      margin: 0,
      fontWeight: '500',
    },
    loginLink: {
      background: 'none',
      border: 'none',
      color: theme.primary,
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '0.875rem',
      padding: 0,
    },
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 style={styles.title}>Check Your Email</h2>
          <p style={styles.subtitle}>
            We sent a reset link to <strong style={{ color: theme.textPrimary }}>{email}</strong>. Click the link in the email to reset your password.
          </p>
          <button style={styles.submitBtn} onClick={onBackToLogin}>
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`input::placeholder { color: ${theme.textMuted}; } input:focus { outline: none; }`}</style>

      <div style={styles.card}>
        <button style={styles.backBtn} onClick={onBackToLogin}>
          ← Back
        </button>

        <div>
          <h2 style={styles.title}>Forgot Password</h2>
          <p style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Email address</label>
          <div style={styles.fieldWrap}>
            <span style={styles.fieldIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={focused ? theme.primary : theme.textMuted}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              ref={emailRef}
              style={{
                ...styles.input,
                border: focused ? `1.5px solid ${theme.primary}` : `1.5px solid ${theme.border}`,
                paddingLeft: '2.75rem',
              }}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              autoComplete="email"
            />
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
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span style={styles.spinnerWrap}>
              <span style={styles.spinner} />
              Sending...
            </span>
          ) : 'Send Reset Link'}
        </button>

        <p style={styles.loginRow}>
          Remember your password?{' '}
          <button style={styles.loginLink} onClick={onBackToLogin} type="button">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}