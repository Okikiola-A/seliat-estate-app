import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIsolatedClient } from '../supabase'
import { useTheme } from '../context/useTheme'
import PeekPasswordInput from '../components/PeekPasswordInput'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import FormError from '../components/FormError'

import { formatNigerianPhone, formatPhoneKeepingCaret, toE164Nigerian, validateEmail, validatePhone, validatePassword } from '../utils/helpers'

export default function Register() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const onBackToLogin = () => navigate('/login')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    identifier: '', // email or phone — whichever the person typed, detected below
    recovery_email: '',
    password: '',
    confirm_password: '',
    phone: '',
    block_number: '',
    house_number: '',
  })

  // One field, no explicit email/phone toggle — which one the person meant
  // is inferred from what they actually typed, same approach as Login. An
  // '@' means email; otherwise it's treated as a phone number.
  const isEmailIdentifier = form.identifier.includes('@')

  const identifierRef = useRef(null)
  const recoveryEmailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const phoneRef = useRef(null)
  const blockRef = useRef(null)
  const houseRef = useRef(null)

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  // Live-formats as a phone number only while the string still looks
  // purely numeric — the moment a letter or '@' appears (someone typing an
  // email), formatting stops touching it at all, which is what lets one
  // field serve both without a mode switch. Uses formatPhoneKeepingCaret
  // so deleting a character in the middle of an already-formatted number
  // doesn't silently jump the caret to the end (see that function's own
  // comment for why naive reformatting does this).
  const handleIdentifierChange = (e) => {
    const raw = e.target.value
    if (/^[\d\s]*$/.test(raw)) {
      const { formatted, newCaret } = formatPhoneKeepingCaret(e.target, formatNigerianPhone)
      update('identifier', formatted)
      requestAnimationFrame(() => e.target.setSelectionRange(newCaret, newCaret))
    } else {
      update('identifier', raw)
    }
  }

  const handlePhoneChange = (e) => {
    const { formatted, newCaret } = formatPhoneKeepingCaret(e.target, formatNigerianPhone)
    update('phone', formatted)
    requestAnimationFrame(() => e.target.setSelectionRange(newCaret, newCaret))
  }

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Please enter your full name'
    if (!form.identifier.trim()) return 'Please enter your email or phone number'

    if (isEmailIdentifier) {
      if (!validateEmail(form.identifier)) return 'Please enter a valid email address'
    } else {
      if (!validatePhone(form.identifier)) return 'Please enter a valid 11-digit phone number'
      if (form.recovery_email.trim() && !validateEmail(form.recovery_email)) {
        return 'Please enter a valid recovery email address, or leave it blank'
      }
    }

    if (!form.password) return 'Please enter a password'
    const passwordError = validatePassword(form.password)
    if (passwordError) return passwordError
    if (form.password !== form.confirm_password) return 'Passwords do not match'
    return null
  }

  const validateStep2 = () => {
    // If a phone number was already given as the identifier in step 1,
    // there's no need to ask for it again here — only an email-registered
    // account still needs its contact phone collected.
    if (isEmailIdentifier) {
      if (!form.phone.trim()) return 'Please enter your phone number'
      if (!validatePhone(form.phone)) return 'Please enter a valid 11-digit phone number'
    }
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
    const metadata = {
      full_name: form.full_name,
      phone: isEmailIdentifier ? form.phone : form.identifier,
      block_number: form.block_number.toUpperCase(),
      house_number: form.house_number,
      signup_method: isEmailIdentifier ? 'email' : 'phone',
    }

    const { data, error: signUpError } = await tempClient.auth.signUp(
      isEmailIdentifier
        ? { email: form.identifier, password: form.password, options: { data: metadata } }
        : { phone: toE164Nigerian(form.identifier), password: form.password, options: { data: metadata } }
    )

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
      setError(
        isEmailIdentifier
          ? 'An account with this email already exists. Check your inbox for a confirmation link, or use a different email address.'
          : 'An account with this phone number already exists.'
      )
      setLoading(false)
      return
    }

    // Phone confirmation is disabled for this project (by design — see
    // handoff notes), so a phone signUp() returns an active session
    // immediately, same as an email signUp() does when email confirmation
    // is off. That live session is what lets us attach an optional
    // recovery email right here — Supabase's own SDK refuses to accept
    // email and phone together in a single signUp() call (they're
    // mutually exclusive there), so this has to be a separate follow-up
    // call on the session signUp() just returned, not part of the same
    // request.
    if (!isEmailIdentifier && form.recovery_email.trim()) {
      const { error: emailErr } = await tempClient.auth.updateUser({ email: form.recovery_email.trim() })
      if (emailErr) {
        // Not fatal — the phone account itself is already created and
        // pending approval regardless; the recovery email is a bonus, and
        // surfacing this as a blocking error here would be confusing this
        // late in a signup that has, from the user's perspective, already
        // succeeded.
        console.error('Failed to attach recovery email:', emailErr)
      }
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
    optionalLabel: {
      fontWeight: '500',
      color: theme.textMuted,
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
          {isEmailIdentifier ? (
            <>
              <h2 style={styles.successTitle}>Check Your Email</h2>
              <p style={styles.successText}>
                We've sent a confirmation link to <strong style={{ color: theme.textPrimary }}>{form.identifier}</strong>.
                Click the link to verify your address — after that, your account will be pending admin approval,
                and you'll be able to sign in once it's approved.
              </p>
            </>
          ) : (
            <>
              <h2 style={styles.successTitle}>Request Submitted</h2>
              <p style={styles.successText}>
                Your account is pending admin approval. You'll be able to sign in with your phone number and
                password once it's approved.
                {form.recovery_email.trim() && (
                  <> We've also sent a confirmation link to your recovery email — click it so you can use it to
                  reset your password later if you ever need to.</>
                )}
              </p>
            </>
          )}
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
                  onKeyDown={e => handleKeyDown(e, identifierRef)}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email or phone number</label>
                <input
                  ref={identifierRef}
                  style={inputStyle('identifier')}
                  type="text"
                  placeholder="you@example.com or 0801 234 5678"
                  value={form.identifier}
                  onChange={handleIdentifierChange}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={e => handleKeyDown(e, !isEmailIdentifier ? recoveryEmailRef : passwordRef)}
                />
              </div>

              {!isEmailIdentifier && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Recovery email <span style={styles.optionalLabel}>(optional)</span>
                  </label>
                  <input
                    ref={recoveryEmailRef}
                    style={inputStyle('recovery_email')}
                    type="email"
                    placeholder="Used only if you forget your password"
                    value={form.recovery_email}
                    onChange={e => update('recovery_email', e.target.value)}
                    onFocus={() => setFocusedField('recovery_email')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => handleKeyDown(e, passwordRef)}
                  />
                </div>
              )}

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
                  <PasswordVisibilityToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword(p => !p)}
                  />
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
                  <PasswordVisibilityToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword(p => !p)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {isEmailIdentifier && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Phone number</label>
                  <input
                    ref={phoneRef}
                    style={inputStyle('phone')}
                    type="tel"
                    placeholder="e.g. 0801 234 5678"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => handleKeyDown(e, blockRef)}
                  />
                </div>
              )}

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

          <FormError message={error} />

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