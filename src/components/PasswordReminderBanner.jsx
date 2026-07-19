import { useTheme } from '../context/useTheme'

export default function PasswordReminderBanner({ onChangePassword, onSnooze }) {
  const { theme } = useTheme()

  const styles = {
    banner: {
      position: 'sticky',
      top: 0,
      zIndex: 400,
      backgroundColor: theme.warningBg,
      borderBottom: `1px solid ${theme.warningBorder}`,
      color: theme.warningText,
      fontSize: '0.82rem',
      fontWeight: '600',
      fontFamily: "'DM Sans', sans-serif",
      padding: '0.6rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
      textAlign: 'center',
    },
    changeBtn: {
      background: 'none',
      border: `1.5px solid ${theme.warningText}`,
      borderRadius: '6px',
      padding: '0.25rem 0.6rem',
      color: theme.warningText,
      fontSize: '0.78rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    },
    snoozeBtn: {
      background: 'none',
      border: 'none',
      padding: '0.25rem',
      color: theme.warningText,
      fontSize: '0.78rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
      whiteSpace: 'nowrap',
    },
  }

  return (
    <div style={styles.banner} role="status">
      <span>You're using a temporary password — please change it.</span>
      <button type="button" style={styles.changeBtn} onClick={onChangePassword}>
        Change Password
      </button>
      <button type="button" style={styles.snoozeBtn} onClick={onSnooze}>
        Snooze
      </button>
    </div>
  )
}