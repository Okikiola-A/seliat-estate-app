import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import { usePwaInstall } from '../hooks/usePwaInstall'

// A standalone page for installing the app, reached via a button on Login
// (and reachable from any logged-in role too, since installability is a
// device thing, not an account thing) — rather than a banner squeezed onto
// Login itself, which caused layout bugs there.
export default function InstallApp() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { installed, justInstalled, canPromptInstall, isIos, promptInstall } = usePwaInstall()

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
    // Shown after a successful install (or if it was already installed):
    // the whole point is to make the app's own icon instantly recognizable
    // so a non-technical person actually knows what to tap on their home
    // screen or app drawer next, instead of being left with just a text
    // confirmation and no idea where to look.
    foundItBox: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: theme.successBg,
      border: `1.5px solid ${theme.successBorder}`,
      borderRadius: '10px',
      padding: '1.25rem',
    },
    appIconImg: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    },
    foundItTitle: {
      fontSize: '1rem',
      fontWeight: '800',
      color: theme.successText,
      margin: 0,
      textAlign: 'center',
    },
    foundItText: {
      fontSize: '0.85rem',
      color: theme.successText,
      margin: 0,
      textAlign: 'center',
      lineHeight: '1.6',
      fontWeight: '500',
    },
    doneBtn: {
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.85rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
    },
  }

  // Either just installed this visit, or was already installed before the
  // user ever opened this page — both cases need the same "here's the icon
  // to look for" treatment, just with slightly different framing.
  if (installed) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.foundItBox}>
            <img src="/pwa-192.png" alt="Seliat Estate CDA app icon" style={styles.appIconImg} />
            <p style={styles.foundItTitle}>
              {justInstalled ? "You're All Set!" : 'Already Installed'}
            </p>
            <p style={styles.foundItText}>
              {justInstalled
                ? 'Seliat Estate CDA has been added to your device.'
                : 'Seliat Estate CDA is already on your device.'}
              {' '}Look for this icon on your home screen or in your app drawer, and tap it to open the app from now on — no need to use the browser.
            </p>
          </div>
          <button style={styles.doneBtn} onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    )
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

        {canPromptInstall ? (
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
            Your browser doesn't support installing this app directly. Try opening this page in Chrome on your phone or computer.
          </p>
        )}
      </div>
    </div>
  )
}