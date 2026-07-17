import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import PeekPasswordInput from '../components/PeekPasswordInput'

export default function Login() {
  const { theme } = useTheme()
  const [email, setEmail] = useState(() => localStorage.getItem('seliat-remember-email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('seliat-remember-email'))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shakeFields, setShakeFields] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const passwordRef = useRef(null)

  const restoreRememberedEmail = () => {
    const savedEmail = localStorage.getItem('seliat-remember-email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    } else {
      setEmail('')
      setRememberMe(false)
    }
  }

  // Login never unmounts while navigating to/from Register or Forgot Password
  // (they're just swapped in via conditional return), so its own state would
  // otherwise sit stale in memory. Reset it fresh every time we come back.
  const returnToLogin = () => {
    setShowRegister(false)
    setShowForgotPassword(false)
    setPassword('')
    setError(null)
    setShakeFields(false)
    restoreRememberedEmail()
  }

  if (showRegister) return <Register onBackToLogin={returnToLogin} />
  if (showForgotPassword) return <ForgotPassword onBackToLogin={returnToLogin} />

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setPassword('')
      setError('The email or password you entered is incorrect.')
      setLoading(false)
      setShakeFields(true)
      setTimeout(() => setShakeFields(false), 600)
    } else {
      if (rememberMe) {
        localStorage.setItem('seliat-remember-email', email)
      } else {
        localStorage.removeItem('seliat-remember-email')
      }
    }
  }

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      if (field === 'email') passwordRef.current?.focus()
      else if (field === 'password') handleLogin()
    }
  }

  const fieldBorder = (field) => {
    if (error) return `1.5px solid ${theme.danger}`
    if (focusedField === field) return `1.5px solid ${theme.primary}`
    return `1.5px solid ${theme.border}`
  }

  const iconColor = (field) => {
    if (error) return theme.danger
    if (focusedField === field) return theme.primary
    return theme.textMuted
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
      padding: '2.25rem 2rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    },
    brandSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: 0,
      letterSpacing: '-0.5px',
      fontFamily: "'DM Sans', sans-serif",
    },
    subtitle: {
      fontSize: '0.875rem',
      color: theme.textMuted,
      margin: 0,
      fontWeight: '500',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
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
      zIndex: 3,
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
      lineHeight: '1.4',
    },
    rememberRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rememberLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      fontSize: '0.85rem',
      color: theme.textSecondary,
      fontWeight: '500',
      cursor: 'pointer',
    },
    checkbox: {
      accentColor: theme.primary,
      width: '15px',
      height: '15px',
      cursor: 'pointer',
    },
    forgotBtn: {
      background: 'none',
      border: 'none',
      fontSize: '0.85rem',
      fontWeight: '500',
      color: theme.primary,
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      padding: 0,
    },
    loginBtn: {
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.9rem',
      fontSize: '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      marginTop: '0.25rem',
      transition: 'opacity 0.15s',
      width: '100%',
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
    registerRow: {
      textAlign: 'center',
      fontSize: '0.875rem',
      color: theme.textSecondary,
      margin: 0,
      fontWeight: '500',
    },
    registerLink: {
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

  const inputStyle = (field) => ({
    ...styles.input,
    border: fieldBorder(field),
  })

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-7px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: ${theme.textMuted}; }
        input:focus { outline: none; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.brandSection}>
          <h1 style={styles.title}>Seliat Estate</h1>
          <p style={styles.subtitle}>Please enter your details</p>
        </div>

        <div style={styles.form}>
          <div style={{
            ...styles.fieldWrap,
            animation: shakeFields ? 'shake 0.6s ease' : 'none',
          }}>
            <span style={styles.fieldIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={iconColor('email')}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              style={{ ...inputStyle('email'), paddingLeft: '2.75rem' }}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => handleKeyDown(e, 'email')}
              autoComplete="email"
            />
          </div>

          <div style={{
            ...styles.fieldWrap,
            animation: shakeFields ? 'shake 0.6s ease' : 'none',
          }}>
            <span style={styles.fieldIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={iconColor('password')}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>

            <PeekPasswordInput
              ref={passwordRef}
              style={{ ...inputStyle('password'), paddingLeft: '2.75rem', paddingRight: '3rem' }}
              placeholder="Password"
              value={password}
              showPassword={showPassword}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => handleKeyDown(e, 'password')}
              autoComplete="current-password"
            />

            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowPassword(p => !p)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
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

          <div style={styles.rememberRow}>
            <label style={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              Remember me
            </label>
            <button
              style={styles.forgotBtn}
              onClick={() => setShowForgotPassword(true)}
              type="button"
            >
              Forgot password?
            </button>
          </div>

          <button
            style={{ ...styles.loginBtn, opacity: loading ? 0.8 : 1 }}
            onClick={handleLogin}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <span style={styles.spinnerWrap}>
                <span style={styles.spinner} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </div>

        <p style={styles.registerRow}>
          Don't have an account?{' '}
          <button
            style={styles.registerLink}
            onClick={() => setShowRegister(true)}
            type="button"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}