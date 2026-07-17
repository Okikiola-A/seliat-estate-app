import { useState, useRef } from 'react'
import { createIsolatedClient } from '../supabase'
import { useTheme } from '../context/useTheme'
import PeekPasswordInput from '../components/PeekPasswordInput'

import { formatNigerianPhone, validateEmail, validatePhone, validatePassword } from '../utils/helpers'

export default function Register({ onBackToLogin }) {
  const { theme } = useTheme()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    block_number: '',
    house_number: '',
  })

  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const phoneRef = useRef(null)
  const blockRef = useRef(null)
  const houseRef = useRef(null)

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handlePhoneChange = (value) => {
    update('phone', formatNigerianPhone(value))
  }

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Please enter your full name'
    if (!form.email.trim()) return 'Please enter your email address'
    if (!validateEmail(form.email)) return 'Please enter a valid email address'
    if (!form.password) return 'Please enter a password'
    const passwordError = validatePassword(form.password)
    if (passwordError) return passwordError
    if (form.password !== form.confirm_password) return 'Passwords do not match'
    return null
  }

  const validateStep2 = () => {
    if (!form.phone.trim()) return 'Please enter your phone number'
    if (!validatePhone(form.phone)) return 'Please enter a valid 11-digit phone number'
    if (!form.block_number.trim()) return 'Please enter your block'
    if (!form.house_number.trim()) return 'Please enter your house number'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setStep(2)
    setError(null)
  }

  const handleSubmit = async () => {
    const err = validateStep2()
    if (err) { setError(err); return }
    setLoading(true)
    setError(null)

    // Isolated client so this signup's session (if email confirmation is off)
    // or lack thereof (if confirmation is on) never touches the app's main
    // client / global auth listener while this screen is still active.
    const tempClient = createIsolatedClient()

    // The public.users profile row is now created server-side by a
    // Postgres trigger (handle_new_user, fires AFTER INSERT ON auth.users)
    // that reads these fields out of raw_user_meta_data. This replaces the
    // old pattern of doing a separate client-side `.from('users').insert()`
    // call right after signUp().
    //
    // That old pattern depended on the client having an active session
    // immediately after signUp() to satisfy the "insert own profile" RLS
    // policy — true when email confirmation is OFF, but signUp() returns
    // no session at all when confirmation is ON, which would silently fail
    // the insert. Passing the data as signup metadata instead means the
    // trigger (running as SECURITY DEFINER, in the same transaction as the
    // auth.users insert) creates the profile regardless of confirmation
    // status — and if it ever fails, the whole signup atomically rolls
    // back, so there's no orphaned-auth-account case to roll back manually
    // here anymore either.
    const { data, error: signUpError } = await tempClient.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone: form.phone,
          block_number: form.block_number.toUpperCase(),
          house_number: form.house_number,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Supabase deliberately does NOT return an error when signUp() is
    // called with an email that already has an unconfirmed account — it
    // silently returns that existing user instead, to avoid letting
    // someone probe which emails are already registered. The documented
    // way to detect this is an empty identities array on the returned
    // user. Without this check, someone re-submitting this form with an
    // email they (or someone else) already started signing up with would
    // see the normal "Check Your Email" success screen even though no new
    // account or confirmation email was actually created.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account with this email already exists. Check your inbox for a confirmation link, or use a different email address.')
      setLoading(false)
      return
    }

    // Only meaningful if email confirmation is off (signUp() returns an
    // active session in that case) — a no-op otherwise, since there's no
    // session to sign out of yet.
    await tempClient.auth.signOut()
    setSuccess(true)
    setLoading(false)
  }

  const handleKeyDown = (e, nextRef, isLast = false) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isLast) {
        step === 1 ? handleNext() : handleSubmit()
      } else {
        nextRef?.current?.focus()
      }
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: theme.bg,
      display: 'flex',
      alignItems: 'flex-start',
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
      marginTop: '1.5rem',
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
      marginBottom: '0.5rem',
      display: 'block',
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
    },
    stepRow: {
      display: 'flex',
      alignItems: 'center',
    },
    stepDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      flexShrink: 0,
      transition: 'background-color 0.3s',
    },
    stepLine: {
      flex: 1,
      height: '2px',
      transition: 'background-color 0.3s',
    },
    stepLabels: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '-0.5rem',
    },
    stepLabel: {
      fontSize: '0.75rem',
      fontWeight: '600',
      transition: 'color 0.3s',
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
    buttonRow: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '0.25rem',
    },
    submitBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.9rem',
      fontSize: '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      transition: 'opacity 0.15s',
    },
    backButton: {
      flex: 1,
      backgroundColor: 'transparent',
      color: theme.textSecondary,
      border: `1.5px solid ${theme.border}`,
      borderRadius: '6px',
      padding: '0.9rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
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
    successCircle: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: theme.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    successTitle: {
      fontSize: '1.4rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: 0,
      textAlign: 'center',
      fontFamily: "'DM Sans', sans-serif",
    },
    successText: {
      fontSize: '0.9rem',
      color: theme.textSecondary,
      margin: 0,
      textAlign: 'center',
      lineHeight: '1.6',
      fontWeight: '500',
    },
  }

  const inputStyle = (field) => ({
    ...styles.input,
    border: focusedField === field ? `1.5px solid ${theme.primary}` : `1.5px solid ${theme.border}`,
  })

  if (success) {
    return (
      <div style={{ ...styles.container, alignItems: 'center' }}>
        <div style={{ ...styles.card, marginTop: 0 }}>
          <div style={styles.successCircle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 style={styles.successTitle}>Check Your Email</h2>
          <p style={styles.successText}>
            We've sent a confirmation link to <strong style={{ color: theme.textPrimary }}>{form.email}</strong>.
            Click the link to verify your address — after that, your account will be pending admin approval,
            and you'll be able to sign in once it's approved.
          </p>
          <button style={styles.submitBtn} onClick={onBackToLogin}>
            OK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`input::placeholder { color: ${theme.textMuted}; } input:focus { outline: none; }`}</style>

      <div style={styles.card}>
        <div>
          <button style={styles.backBtn} onClick={onBackToLogin}>
            ← Back
          </button>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>
            {step === 1 ? 'Enter your account details' : 'Almost done — a few more details'}
          </p>
        </div>

        <div style={styles.stepRow}>
          <div style={{ ...styles.stepDot, backgroundColor: theme.primary }} />
          <div style={{ ...styles.stepLine, backgroundColor: step === 2 ? theme.primary : theme.border }} />
          <div style={{ ...styles.stepDot, backgroundColor: step === 2 ? theme.primary : theme.border }} />
        </div>
        <div style={styles.stepLabels}>
          <span style={{ ...styles.stepLabel, color: step === 1 ? theme.primary : theme.textMuted }}>Account</span>
          <span style={{ ...styles.stepLabel, color: step === 2 ? theme.primary : theme.textMuted }}>Details</span>
        </div>

        <div style={styles.form}>
          {step === 1 && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Full name</label>
                <input
                  style={inputStyle('full_name')}
                  type="text"
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  onFocus={() => setFocusedField('full_name')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, emailRef)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email address</label>
                <input
                  ref={emailRef}
                  style={inputStyle('email')}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, passwordRef)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.fieldWrap}>
                  <PeekPasswordInput
                    ref={passwordRef}
                    style={{ ...inputStyle('password'), paddingRight: '3rem' }}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    showPassword={showPassword}
                    onChange={e => update('password', e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => handleKeyDown(e, confirmRef)}
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
                <label style={styles.label}>Confirm password</label>
                <div style={styles.fieldWrap}>
                  <PeekPasswordInput
                    ref={confirmRef}
                    style={{ ...inputStyle('confirm_password'), paddingRight: '3rem' }}
                    placeholder="Repeat your password"
                    value={form.confirm_password}
                    showPassword={showPassword}
                    onChange={e => update('confirm_password', e.target.value)}
                    onFocus={() => setFocusedField('confirm_password')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => handleKeyDown(e, null, true)}
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
            </>
          )}

          {step === 2 && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Phone number</label>
                <input
                  ref={phoneRef}
                  style={inputStyle('phone')}
                  type="tel"
                  placeholder="e.g. 0801 234 5678"
                  value={form.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, blockRef)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Street</label>
                <input
                  ref={blockRef}
                  style={inputStyle('block_number')}
                  type="text"
                  placeholder="e.g. Joy Street"
                  value={form.block_number}
                  onChange={e => update('block_number', e.target.value)}
                  onFocus={() => setFocusedField('block_number')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, houseRef)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>House number</label>
                <input
                  ref={houseRef}
                  style={inputStyle('house_number')}
                  type="text"
                  placeholder="e.g. 1, 2, 3"
                  value={form.house_number}
                  onChange={e => update('house_number', e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setFocusedField('house_number')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, null, true)}
                />
              </div>
            </>
          )}

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

          <div style={styles.buttonRow}>
            {step === 2 && (
              <button
                style={styles.backButton}
                onClick={() => { setStep(1); setError(null) }}
                disabled={loading}
              >
                Back
              </button>
            )}
            <button
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
              onClick={step === 1 ? handleNext : handleSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : step === 1 ? 'Continue' : 'Submit Request'}
            </button>
          </div>
        </div>

        <p style={styles.loginRow}>
          Already have an account?{' '}
          <button style={styles.loginLink} onClick={onBackToLogin} type="button">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}