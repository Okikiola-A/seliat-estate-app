import { useState, useEffect } from 'react'
import { useTheme } from '../context/useTheme'

export default function ConfirmModal({ title, message, onConfirm, onCancel, countdownSeconds = 3 }) {
  const { theme } = useTheme()
  const [countdown, setCountdown] = useState(countdownSeconds)

  useEffect(() => {
    if (countdown === 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
      fontFamily: "'DM Sans', sans-serif",
    },
    modal: {
      backgroundColor: theme.surface,
      borderRadius: '12px',
      padding: '1.75rem',
      width: '100%',
      maxWidth: '360px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    },
    iconWrap: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: theme.dangerBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: '0.25rem',
    },
    title: {
      fontSize: '1.1rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: 0,
      textAlign: 'center',
      letterSpacing: '-0.3px',
    },
    message: {
      fontSize: '0.875rem',
      color: theme.textSecondary,
      margin: 0,
      textAlign: 'center',
      lineHeight: '1.6',
      fontWeight: '500',
    },
    btnRow: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '0.5rem',
    },
    cancelBtn: {
      flex: 1,
      padding: '0.8rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: theme.surface,
      color: theme.textSecondary,
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
    },
    confirmBtn: {
      flex: 1,
      padding: '0.8rem',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: theme.danger,
      color: '#FFFFFF',
      fontSize: '0.9rem',
      fontWeight: '700',
      fontFamily: "'DM Sans', sans-serif",
      transition: 'opacity 0.15s',
    },
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.iconWrap}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>

        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: countdown > 0 ? 0.5 : 1,
              cursor: countdown > 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={countdown === 0 ? onConfirm : undefined}
            disabled={countdown > 0}
          >
            {countdown > 0 ? `Confirm (${countdown})` : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}