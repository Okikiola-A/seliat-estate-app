import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import { usePwaInstall } from '../hooks/usePwaInstall'

// A standalone page for installing the app, reached via a small link on
// Login (and reachable from any logged-in role too, since installability
// is a device thing, not an account thing) — rather than a banner squeezed
// onto Login itself. The banner approach caused layout bugs on Login (the
// card width fought with the banner's own sizing); giving this its own
// page with nothing else on it sidesteps that entirely.
export default function InstallApp() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { installed, canPromptInstall, isIos, promptInstall } = usePwaInstall()

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
      textAlign: 'left',
      alignSelf: 'flex-start',
    },
    iconCircle: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: theme.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: '800',
      color: theme.textPrimary,
      margin: '0 0 0.25rem 0',
      letterSpacing: '-0.3px',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: '0.9rem',
      color: theme.textSecondary,
      margin: 0,
      lineHeight: '1.6',
      fontWeight: '500',
      textAlign: 'center',
    },
    stepList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
    },
    step: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.6rem',
    },
    stepNum: {
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      backgroundColor: theme.primaryLight,
      color: theme.primary,
      fontSize: '0.75rem',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: '1px',
    },
    stepText: {
      fontSize: '0.85rem',
      color: theme.textPrimary,
      margin: 0,
      fontWeight: '500',
      lineHeight: '1.5',
    },
    installBtn: {
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
    },
    doneText: {
      fontSize: '0.9rem',
      color: theme.success,
      margin: 0,
      fontWeight: '700',
      textAlign: 'center',
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div style={styles.iconCircle}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12"/>
            <path d="M7 10l5 5 5-5"/>
            <path d="M4 19h16"/>
          </svg>
        </div>

        <div>
          <h2 style={styles.title}>Install the App</h2>
          <p style={styles.subtitle}>
            Add Seliat Estate CDA to your home screen for quicker access and offline support.
          </p>
        </div>

        {installed ? (
          <p style={styles.doneText}>✓ Already installed on this device</p>
        ) : canPromptInstall ? (
          <button style={styles.installBtn} onClick={promptInstall}>
            Install Now
          </button>
        ) : isIos ? (
          <div style={styles.stepList}>
            <div style={styles.step}>
              <span style={styles.stepNum}>1</span>
              <p style={styles.stepText}>Tap the Share icon in Safari's toolbar.</p>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>2</span>
              <p style={styles.stepText}>Scroll down and tap "Add to Home Screen".</p>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>3</span>
              <p style={styles.stepText}>Tap "Add" to confirm.</p>
            </div>
          </div>
        ) : (
          <p style={styles.subtitle}>
            Your browser doesn't support installing this app directly. Try opening this page in Chrome or Safari on your phone.
          </p>
        )}
      </div>
    </div>
  )
}