import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import PeekPasswordInput from '../components/PeekPasswordInput'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import FormError from '../components/FormError'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { formatNigerianPhone, toE164Nigerian } from '../utils/helpers'

const REMEMBER_KEYS = {
  email: 'seliat-remember-email',
  phone: 'seliat-remember-phone',
}

export default function Login() {
  const { theme } = useTheme()
  const { installed } = usePwaInstall()
  const navigate = useNavigate()

  // Which identifier is being used to sign in. Kept as a single toggle
  // (rather than one combined field) since the two need different input
  // types, formatting, and conversion before hitting Supabase.
  const [loginMethod, setLoginMethod] = useState(() =>
    localStorage.getItem(REMEMBER_KEYS.phone) ? 'phone' : 'email'
  )
  const [identifier, setIdentifier] = useState(() =>
    localStorage.getItem(REMEMBER_KEYS[loginMethod]) || ''
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEYS[loginMethod]))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shakeFields, setShakeFields] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const passwordRef = useRef(null)

  const switchMethod = (method) => {
    if (method === loginMethod) return
    setLoginMethod(method)
    setIdentifier(localStorage.getItem(REMEMBER_KEYS[method]) || '')
    setRememberMe(!!localStorage.getItem(REMEMBER_KEYS[method]))
    setError(null)
  }

  const handleIdentifierChange = (value) => {
    setIdentifier(loginMethod === 'phone' ? formatNigerianPhone(value) : value)
    setError(null)
  }

  const handleLogin = async () => {
    if (!identifier || !password) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword(
      loginMethod === 'email'
        ? { email: identifier, password }
        : { phone: toE164Nigerian(identifier), password }
    )

    if (error) {
      setPassword('')
      setError(`The ${loginMethod === 'email' ? 'email' : 'phone number'} or password you entered is incorrect.`)
      setLoading(false)
      setShakeFields(true)
      setTimeout(() => setShakeFields(false), 600)
    } else {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEYS[loginMethod], identifier)
      } else {
        localStorage.removeItem(REMEMBER_KEYS[loginMethod])
      }
    }
  }

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      if (field === 'identifier') passwordRef.current?.focus()
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
    methodToggle: {
      display: 'flex',
      gap: '0.5rem',
    },
    methodPill: {
      flex: 1,
      padding: '0.6rem',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'center',
      transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
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
    installBtn: {
      backgroundColor: theme.primaryLight,
      color: theme.primary,
      border: `1.5px solid ${theme.primary}`,
      borderRadius: '6px',
      padding: '0.85rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
  }

  const inputStyle = (field) => ({
    ...styles.input,
    border: fieldBorder(field),
  })

  const methodPillStyle = (method) => ({
    ...styles.methodPill,
    backgroundColor: loginMethod === method ? theme.primary : 'transparent',
    color: loginMethod === method ? theme.primaryText : theme.textSecondary,
    border: `1.5px solid ${loginMethod === method ? theme.primary : theme.border}`,
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
        input::placeholder { color: ${theme.textMuted}; }
        input:focus { outline: none; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.brandSection}>
          <h1 style={styles.title}>Seliat Estate CDA</h1>
          <p style={styles.subtitle}>Please enter your details</p>
        </div>

        <div style={styles.methodToggle}>
          <button type="button" style={methodPillStyle('email')} onClick={() => switchMethod('email')}>
            Email
          </button>
          <button type="button" style={methodPillStyle('phone')} onClick={() => switchMethod('phone')}>
            Phone
          </button>
        </div>

        <div style={styles.form}>
          <div style={{
            ...styles.fieldWrap,
            animation: shakeFields ? 'shake 0.6s ease' : 'none',
          }}>
            <span style={styles.fieldIcon}>
              {loginMethod === 'email' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={iconColor('identifier')}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={iconColor('identifier')}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              )}
            </span>
            <input
              style={{ ...inputStyle('identifier'), paddingLeft: '2.75rem' }}
              type={loginMethod === 'email' ? 'email' : 'tel'}
              placeholder={loginMethod === 'email' ? 'Email address' : 'e.g. 0801 234 5678'}
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => handleKeyDown(e, 'identifier')}
              autoComplete={loginMethod === 'email' ? 'email' : 'tel'}
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

            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword(p => !p)}
            />
          </div>

          <FormError message={error} />

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
              onClick={() => navigate('/forgot-password')}
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
            onClick={() => navigate('/register')}
            type="button"
          >
            Sign up
          </button>
        </p>

        {!installed && (
          <button
            type="button"
            style={styles.installBtn}
            onClick={() => navigate('/install')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12"/>
              <path d="M7 10l5 5 5-5"/>
              <path d="M4 19h16"/>
            </svg>
            Install This App
          </button>
        )}
      </div>
    </div>
  )
}