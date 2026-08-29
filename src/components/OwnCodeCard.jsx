import { useState } from 'react'
import { useTheme } from '../context/useTheme'
import { useOwnAccessCode } from '../hooks/useOwnAccessCode'
import { formatDate, getCodeStatus, shareAccessCode } from '../utils/helpers'
import { paginate } from '../utils/pagination'
import Badge from './Badge'
import ConfirmModal from './ConfirmModal'
import Pagination from './Pagination'
import FormError from './FormError'

// The "manage your own delivery access code" feature — used by a resident's
// home screen and by an admin's "My Code" tab. Both previously hand-rolled
// their own near-identical copy of this JSX with small, unintentional
// differences (see below). This component is the single merged version:
// wherever the two differed, it keeps whichever side had *more* — nothing
// that either screen used to show has been dropped.
//
// Differences found and reconciled here:
//  - Section heading ("My Access Code") — admin had it, resident didn't.
//    Now shown in both places.
//  - Active-code subtitle ("Share this code with your courier") — resident
//    had it, admin didn't. Now shown in both.
//  - Empty-state icon — resident had one, admin didn't. Now shown in both.
//  - "Generating..." spinner — resident had an actual spinning indicator,
//    admin only showed static text. Now both get the spinner.
//  - History heading wording — resident said "Code History", admin said
//    "My Code History"; kept the more descriptive one for both.
//  - Minor sizing (code text size, revoke-icon size, button padding) —
//    unified to whichever was larger, never smaller.
//  - Bug fix: admin's subtitle text reused a table style with
//    text-overflow:ellipsis, which risked silently clipping the subtitle on
//    narrow screens. This component's text styles are its own, so that
//    can't happen here.
export default function OwnCodeCard({ profile }) {
  const { theme } = useTheme()
  const {
    activeCode, history, loading, generating, revoking, error,
    codeSettings, durationHours, setDurationHours,
    generate, revoke, clearHistory,
  } = useOwnAccessCode(profile.id)
  const [copied, setCopied] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)

  const handleGenerate = async () => {
    const ok = await generate()
    if (ok) setHistoryPage(1)
  }

  const handleClearHistory = async () => {
    setConfirmModal(null)
    const ok = await clearHistory()
    if (ok) setHistoryPage(1)
  }

  const handleRevoke = async (code) => {
    setConfirmModal(null)
    await revoke(code)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const styles = {
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    },
    sectionLabel: {
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: theme.textMuted,
      margin: '0 0 0.25rem 0',
    },
    loadingText: {
      color: theme.textMuted,
      fontSize: '0.85rem',
      fontWeight: '500',
      margin: 0,
      textAlign: 'center',
      padding: '2rem 0',
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
    shareBtn: {
      flex: 1,
      padding: '0.8rem',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: theme.primary,
      color: theme.primaryText,
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      textDecoration: 'none',
      textAlign: 'center',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem',
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
    durationRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      flexWrap: 'wrap',
    },
    durationLabel: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: theme.textSecondary,
    },
    durationInput: {
      width: '70px',
      padding: '0.5rem 0.6rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      fontSize: '0.9rem',
      fontWeight: '600',
      color: theme.textPrimary,
      backgroundColor: theme.surface,
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: 'border-box',
    },
    durationUnit: {
      fontSize: '0.78rem',
      color: theme.textMuted,
      fontWeight: '500',
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
    historyTitle: {
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: theme.textMuted,
      margin: '0 0 0.25rem 0',
      paddingLeft: '0.25rem',
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

  return (
    <div style={styles.section}>
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <p style={styles.sectionLabel}>My Access Code</p>

      {loading ? (
        <p style={styles.loadingText}>Loading...</p>
      ) : activeCode ? (
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
                onConfirm: () => handleRevoke(activeCode),
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
            <button
              type="button"
              style={styles.shareBtn}
              onClick={() => shareAccessCode(activeCode.code, activeCode.expires_at)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share Code
            </button>
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
              <p style={styles.cardSub}>Generate a one-time code for your courier.</p>
            </div>
          </div>

          <div style={styles.durationRow}>
            <label style={styles.durationLabel}>Valid for</label>
            <input
              type="number"
              min={1}
              max={codeSettings.max_expiry_hours}
              value={durationHours}
              onChange={e => setDurationHours(e.target.value)}
              style={styles.durationInput}
            />
            <span style={styles.durationUnit}>hours (max {codeSettings.max_expiry_hours})</span>
          </div>

          <FormError message={error} />

          <button
            style={{ ...styles.generateBtn, opacity: generating ? 0.7 : 1 }}
            onClick={handleGenerate}
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
            <p style={styles.historyTitle}>My Code History</p>
            <button
              style={styles.clearHistoryBtn}
              onClick={() => setConfirmModal({
                title: 'Clear History',
                message: 'This will permanently delete all your access codes, including any active code. This cannot be undone.',
                onConfirm: handleClearHistory,
              })}
            >
              Clear History
            </button>
          </div>
          <div style={styles.historyCard}>
            {paginate(history, historyPage).map((code, index, arr) => {
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
          <Pagination page={historyPage} itemCount={history.length} onPageChange={setHistoryPage} />
        </div>
      )}
    </div>
  )
}