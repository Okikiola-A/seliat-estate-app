import { useTheme } from '../context/useTheme'

const content = {
  pending: {
    color: (theme) => theme.warning,
    bg: (theme) => theme.warningBg,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Awaiting Approval',
    message: "Your account has been created and is pending approval by the estate admin. You'll be able to sign in once it's approved.",
  },
  not_found: {
    color: (theme) => theme.textMuted,
    bg: (theme) => theme.surfaceAlt,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    title: 'Profile Not Found',
    message: "We couldn't find a profile for this account. Please contact your administrator.",
  },
}

export default function AccountStatus({ status, onBackToLogin }) {
  const { theme } = useTheme()
  const info = content[status] || content.not_found
  const color = info.color(theme)
  const bg = info.bg(theme)

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
      gap: '1.25rem',
      alignItems: 'center',
      textAlign: 'center',
    },
    iconCircle: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color,
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: 0,
      letterSpacing: '-0.3px',
    },
    message: {
      fontSize: '0.9rem',
      color: theme.textSecondary,
      margin: 0,
      lineHeight: '1.6',
      fontWeight: '500',
    },
    button: {
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.9rem 1.5rem',
      fontSize: '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          {info.icon}
        </div>
        <div>
          <h2 style={styles.title}>{info.title}</h2>
          <p style={styles.message}>{info.message}</p>
        </div>
        <button style={styles.button} onClick={onBackToLogin}>
          Back to Login
        </button>
      </div>
    </div>
  )
}