import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import NotificationBell from '../components/NotificationBell'
import AvatarMenu from '../components/AvatarMenu'
import Badge from '../components/Badge'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import { paginate } from '../utils/pagination'
import Settings from './Settings'

import { generateCode, formatDate, getCodeStatus, capitalizeName } from '../utils/helpers'

export default function ResidentScreen({ profile, openSettingsSignal, onPasswordChanged }) {
  const { theme } = useTheme()
  const [activeCode, setActiveCode] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openSettingsSignal) setShowSettings(true)
  }, [openSettingsSignal])
  const [revoking, setRevoking] = useState(false)

  const fetchCodes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('delivery_codes')
      .select('*')
      .eq('resident_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      const now = new Date()
      const active = data.find(c => !c.used && !c.revoked && new Date(c.expires_at) > now)
      setActiveCode(active || null)
      setHistory(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern; fetchCodes is redefined every render
    // (it closes over profile.id), so it's intentionally left out of the
    // dependency array to avoid refetching on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestCode = async () => {
    setGenerating(true)
    setError(null)

    const { data: existing } = await supabase
      .from('delivery_codes')
      .select('id')
      .eq('resident_id', profile.id)
      .eq('used', false)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      setError('You already have an active code. Use or wait for it to expire first.')
      setGenerating(false)
      await fetchCodes()
      return
    }

    const newCode = generateCode()
    const expiry = new Date(Date.now() + 3 * 60 * 60 * 1000)

    const { error } = await supabase
      .from('delivery_codes')
      .insert({ code: newCode, resident_id: profile.id, expires_at: expiry.toISOString() })

    if (error) {
      setError('Something went wrong. Please try again.')
      setGenerating(false)
      return
    }

    await fetchCodes()
    setPage(1)
    setGenerating(false)
  }

  const clearHistory = async () => {
    const { error } = await supabase
      .from('delivery_codes')
      .delete()
      .eq('resident_id', profile.id)

    setConfirmModal(null)

    if (error) {
      console.error('Failed to clear history:', error)
      alert('Could not clear history. Please try again.')
      return
    }

    setPage(1)
    fetchCodes()
  }

  const revokeOwnCode = async (code) => {
    setConfirmModal(null)
    setRevoking(true)

    const { error } = await supabase.rpc('revoke_own_code', { target_code_id: code.id })

    if (error) {
      console.error('Failed to revoke code:', error)
      alert('Could not revoke this code. Please try again.')
      setRevoking(false)
      return
    }

    await fetchCodes()
    setRevoking(false)
  }

  const getWhatsAppMessage = (code, expiresAt) => {
    const expiry = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const message = `Hello, here is your access code for Seliat Estate:\n\nCode: ${code}\n\nShow this code to the gate guard on arrival.\nValid until: ${expiry}\n\nDo not share this code with anyone else.`
    return `https://wa.me/?text=${encodeURIComponent(message)}`
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      flexShrink: 0,
    },
    body: {
      flex: 1,
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      maxWidth: '480px',
      width: '100%',
      alignSelf: 'center',
      boxSizing: 'border-box',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: `1px solid ${theme.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    cardTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardLabel: {
      fontSize: '0.85rem',
      fontWeight: '700',
      color: theme.primary,
      margin: '0 0 2px 0',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    cardSub: {
      fontSize: '0.82rem',
      color: theme.textSecondary,
      margin: 0,
      fontWeight: '500',
      lineHeight: '1.5',
    },
    codeDisplay: {
      backgroundColor: theme.surfaceAlt,
      border: `2px dashed ${theme.border}`,
      borderRadius: '10px',
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    codeText: {
      fontSize: '2.5rem',
      fontWeight: '800',
      letterSpacing: '0.5rem',
      color: theme.textPrimary,
      fontFamily: "'DM Sans', sans-serif",
    },
    expiryText: {
      fontSize: '0.82rem',
      fontWeight: '600',
      color: theme.danger,
      margin: 0,
      textAlign: 'center',
    },
    actionRow: {
      display: 'flex',
      gap: '0.75rem',
    },
    copyBtn: {
      flex: 1,
      padding: '0.8rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: theme.surface,
      color: theme.textPrimary,
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'center',
    },
    whatsappBtn: {
      flex: 1,
      padding: '0.8rem',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#25D366',
      color: 'white',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      textDecoration: 'none',
      textAlign: 'center',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeRevokeIconBtn: {
      position: 'absolute',
      right: '0.6rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      padding: '0.4rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCodeTop: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.85rem',
    },
    emptyIconWrap: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      backgroundColor: theme.primaryLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    generateBtn: {
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
    historySection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    historyTopRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: '0.25rem',
      paddingRight: '0.25rem',
    },
    clearHistoryBtn: {
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.dangerBorder}`,
      backgroundColor: theme.dangerBg,
      color: theme.danger,
      fontSize: '0.75rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    },
    historyTitle: {
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: theme.textMuted,
      margin: '0 0 0.25rem 0',
      paddingLeft: '0.25rem',
    },
    historyCard: {
      backgroundColor: theme.surface,
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
    },
    historyItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.85rem 1rem',
    },
    historyCode: {
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: '700',
      fontSize: '1rem',
      letterSpacing: '0.1rem',
      color: theme.textPrimary,
    },
    historyDate: {
      fontSize: '0.75rem',
      color: theme.textMuted,
      margin: '3px 0 0 0',
      fontWeight: '500',
    },
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div style={styles.header}>
        <p style={styles.headerName} title={capitalizeName(profile.full_name)}>{capitalizeName(profile.full_name)}</p>
        <div style={styles.headerActions}>
          <NotificationBell userId={profile.id} />
          <AvatarMenu
            name={capitalizeName(profile.full_name)}
            subtitle={`${profile.block_number}, House ${profile.house_number}`}
            onSettingsClick={() => setShowSettings(true)}
          />
        </div>
      </div>

      <div style={styles.body}>

        {activeCode ? (
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div>
                <p style={styles.cardLabel}>Active Access Code</p>
                <p style={styles.cardSub}>Share this code with your courier</p>
              </div>
              <Badge label="Active" variant="active" />
            </div>

            <div style={styles.codeDisplay}>
              <span style={styles.codeText}>{activeCode.code}</span>
              <button
                type="button"
                style={{ ...styles.codeRevokeIconBtn, opacity: revoking ? 0.5 : 1 }}
                disabled={revoking}
                aria-label="Revoke this code"
                title="Revoke this code"
                onClick={() => setConfirmModal({
                  title: 'Revoke This Code',
                  message: 'This code will stop working immediately and your courier will no longer be able to use it. You can generate a new one right after.',
                  onConfirm: () => revokeOwnCode(activeCode),
                })}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>

            <p style={styles.expiryText}>
              Expires at {new Date(activeCode.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>

            <div style={styles.actionRow}>
              <button
                style={styles.copyBtn}
                onClick={() => copyCode(activeCode.code)}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <a
                href={getWhatsAppMessage(activeCode.code, activeCode.expires_at)}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.whatsappBtn}
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={styles.emptyCodeTop}>
              <div style={styles.emptyIconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <p style={styles.cardLabel}>No Active Code</p>
                <p style={styles.cardSub}>Generate a one-time code for your courier. Valid for 3 hours.</p>
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
              style={{ ...styles.generateBtn, opacity: generating ? 0.7 : 1 }}
              onClick={requestCode}
              disabled={generating}
            >
              {generating ? (
                <span style={styles.spinnerWrap}>
                  <span style={styles.spinner} />
                  Generating...
                </span>
              ) : 'Generate Access Code'}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div style={styles.historySection}>
            <div style={styles.historyTopRow}>
              <p style={styles.historyTitle}>Code History</p>
              <button
                style={styles.clearHistoryBtn}
                onClick={() => setConfirmModal({
                  title: 'Clear History',
                  message: 'This will permanently delete all your access codes, including any active code. This cannot be undone.',
                  onConfirm: clearHistory,
                })}
              >
                Clear History
              </button>
            </div>
            <div style={styles.historyCard}>
              {paginate(history, page).map((code, index, arr) => {
                const status = getCodeStatus(code)
                return (
                  <div
                    key={code.id}
                    style={{
                      ...styles.historyItem,
                      borderBottom: index < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
                    }}
                  >
                    <div>
                      <span style={styles.historyCode}>{code.code}</span>
                      <p style={styles.historyDate}>{formatDate(code.created_at)}</p>
                      {code.used_at && (
                        <p style={styles.historyDate}>Used {formatDate(code.used_at)}</p>
                      )}
                    </div>
                    <Badge label={status.label} variant={status.label.toLowerCase()} />
                  </div>
                )
              })}
            </div>
            <Pagination page={page} itemCount={history.length} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}