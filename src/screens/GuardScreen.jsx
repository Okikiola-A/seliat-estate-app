import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import { capitalizeName } from '../utils/helpers'
import AvatarMenu from '../components/AvatarMenu'
import Settings from './Settings'

export default function GuardScreen({ profile, openSettingsSignal, onPasswordChanged }) {
  const { theme } = useTheme()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openSettingsSignal) setShowSettings(true)
  }, [openSettingsSignal])

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    setCode(val)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && code.length === 6) verifyCode()
  }

  const clearCode = () => {
    setCode('')
    setResult(null)
    inputRef.current?.focus()
  }

  const verifyCode = async () => {
    if (code.length < 6) return
    setLoading(true)
    setResult(null)

    const { data, error } = await supabase
      .from('delivery_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !data) {
      setResult({ valid: false, message: 'No matching code found.' })
      setLoading(false)
      return
    }

    if (data.used) {
      setResult({ valid: false, message: 'This code has already been used.' })
      setLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      setResult({ valid: false, message: 'This code has expired.' })
      setLoading(false)
      return
    }

    const { data: claimed, error: claimError } = await supabase
      .from('delivery_codes')
      .update({ used: true, used_at: new Date(), verified_by: profile.id })
      .eq('code', code)
      .eq('used', false)
      .select()

    if (claimError || !claimed || claimed.length === 0) {
      setResult({ valid: false, message: 'This code has already been used.' })
      setLoading(false)
      return
    }

    await supabase.from('notifications').insert({
      user_id: data.resident_id,
      code_id: data.id,
      message: `Your access code ${data.code} was used at the gate.`,
    })

    setResult({ valid: true, message: 'Access Granted' })
    setLoading(false)
  }

  const reset = () => {
    setCode('')
    setResult(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  if (showSettings) {
    return <Settings profile={profile} onBack={() => setShowSettings(false)} onPasswordChanged={onPasswordChanged} />
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: theme.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
    },
    header: {
      backgroundColor: theme.primary,
      padding: '0 1.25rem',
      height: '64px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 150,
      boxSizing: 'border-box',
    },
    headerName: {
      fontSize: '1rem',
      fontWeight: '700',
      color: theme.primaryText,
      margin: 0,
      minWidth: 0,
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    body: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      backgroundColor: theme.surface,
      borderRadius: '12px',
      padding: '1.75rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    },
    cardTop: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    },
    cardTitle: {
      fontSize: '1.2rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: '0 0 2px 0',
      letterSpacing: '-0.3px',
    },
    cardSub: {
      fontSize: '0.82rem',
      color: theme.textSecondary,
      margin: 0,
      fontWeight: '500',
    },
    inputWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    },
    codeInput: {
      width: '100%',
      padding: '1.1rem 1rem',
      borderRadius: '8px',
      fontSize: '1.75rem',
      fontWeight: '800',
      fontFamily: "'DM Sans', sans-serif",
      color: theme.textPrimary,
      backgroundColor: theme.surface,
      boxSizing: 'border-box',
      transition: 'border-color 0.15s, letter-spacing 0.1s',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    counter: {
      fontSize: '0.78rem',
      color: theme.textMuted,
      margin: 0,
      fontWeight: '500',
      textAlign: 'right',
    },
    btnRow: {
      display: 'flex',
      gap: '0.75rem',
    },
    clearBtn: {
      flex: 1,
      padding: '0.875rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: theme.surface,
      color: theme.textSecondary,
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
    },
    confirmBtn: {
      flex: 1,
      padding: '0.875rem',
      borderRadius: '6px',
      border: 'none',
      fontSize: '0.95rem',
      fontWeight: '700',
      fontFamily: "'DM Sans', sans-serif",
      transition: 'background-color 0.15s, opacity 0.15s',
      backgroundColor: theme.primary,
      color: theme.primaryText,
      cursor: 'pointer',
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
    resultCard: {
      borderRadius: '10px',
      padding: '1.75rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      textAlign: 'center',
    },
    resultIconCircle: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '0.25rem',
    },
    resultStatus: {
      fontSize: '1.3rem',
      fontWeight: '800',
      margin: 0,
      letterSpacing: '-0.3px',
    },
    resultMessage: {
      fontSize: '0.9rem',
      margin: 0,
      fontWeight: '500',
    },
  }

  return (
    <div style={styles.container}>
      <style>{`
        input:focus { outline: none; }
        input::placeholder { color: ${theme.textMuted}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={styles.header}>
        <p style={styles.headerName} title={capitalizeName(profile.full_name)}>{capitalizeName(profile.full_name)}</p>
        <AvatarMenu
          name={capitalizeName(profile.full_name)}
          onSettingsClick={() => setShowSettings(true)}
        />
      </div>

      <div style={styles.body}>
        {!result ? (
          <div style={styles.card}>
            <div style={styles.cardTop}>
              <h2 style={styles.cardTitle}>Verify Code</h2>
              <p style={styles.cardSub}>Enter the 6-character access code below</p>
            </div>

            <div style={styles.inputWrap}>
              <input
                ref={inputRef}
                style={{
                  ...styles.codeInput,
                  border: code.length > 0
                    ? `2px solid ${theme.primary}`
                    : `2px solid ${theme.border}`,
                  letterSpacing: code.length > 0 ? '0.5rem' : '0.1rem',
                }}
                type="text"
                placeholder="——————"
                value={code}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <p style={styles.counter}>{code.length} / 6</p>
            </div>

            <div style={styles.btnRow}>
              {code.length > 0 && (
                <button style={styles.clearBtn} onClick={clearCode} type="button">
                  Clear
                </button>
              )}
              <button
                style={{
                  ...styles.confirmBtn,
                  backgroundColor: code.length === 6 ? theme.primary : theme.border,
                  color: code.length === 6 ? theme.primaryText : theme.textMuted,
                  cursor: code.length === 6 ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.7 : 1,
                  flex: code.length > 0 ? 2 : 1,
                }}
                onClick={verifyCode}
                disabled={loading || code.length < 6}
                type="button"
              >
                {loading ? (
                  <span style={styles.spinnerWrap}>
                    <span style={styles.spinner} />
                    Checking...
                  </span>
                ) : 'Confirm'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...styles.card, animation: 'fadeIn 0.2s ease' }}>
            <div style={{
              ...styles.resultCard,
              backgroundColor: result.valid ? theme.successBg : theme.dangerBg,
              border: `2px solid ${result.valid ? theme.successBorder : theme.dangerBorder}`,
            }}>
              <div style={{
                ...styles.resultIconCircle,
                backgroundColor: result.valid ? theme.success : theme.danger,
              }}>
                {result.valid ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
              </div>

              <p style={{
                ...styles.resultStatus,
                color: result.valid ? theme.success : theme.danger,
              }}>
                {result.valid ? 'Access Granted' : 'Access Denied'}
              </p>

              <p style={{
                ...styles.resultMessage,
                color: result.valid ? theme.successText : theme.dangerText,
              }}>
                {result.message}
              </p>
            </div>

            <button style={styles.confirmBtn} onClick={reset}>
              Verify Another Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}