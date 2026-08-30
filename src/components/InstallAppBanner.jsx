import { useTheme } from '../context/useTheme'
import { usePwaInstall } from '../hooks/usePwaInstall'

// Chrome only offers its own native "Install app" prompt once per page
// load, then suppresses it — there's no way to make the browser show it
// again on its own. This banner is the workaround: a persistent, low-key
// install nudge that reuses the captured install event for as long as
// this page stays open, and automatically disappears the moment the app
// is actually installed (checked via display-mode, not a dismiss flag it
// has to remember), so it can never awkwardly linger inside the installed
// app itself.
export default function InstallAppBanner() {
  const { theme } = useTheme()
  const { installed, canPromptInstall, isIos, promptInstall } = usePwaInstall()

  // Nothing to offer: already installed, or a browser that neither
  // supports the native prompt nor is iOS Safari (e.g. a desktop browser
  // without PWA install support at all — showing instructions there would
  // just be confusing noise).
  if (installed || (!canPromptInstall && !isIos)) return null

  const styles = {
    banner: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: theme.primaryLight,
      border: `1px solid ${theme.primary}`,
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      width: '100%',
      maxWidth: '400px',
      boxSizing: 'border-box',
      marginBottom: '1.25rem',
    },
    iconWrap: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      backgroundColor: theme.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: '0.85rem',
      fontWeight: '700',
      color: theme.textPrimary,
      margin: 0,
    },
    subtitle: {
      fontSize: '0.75rem',
      color: theme.textSecondary,
      margin: '2px 0 0 0',
      fontWeight: '500',
    },
    installBtn: {
      flexShrink: 0,
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.5rem 0.85rem',
      fontSize: '0.8rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    },
  }

  return (
    <div style={styles.banner}>
      <div style={styles.iconWrap}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12"/>
          <path d="M7 10l5 5 5-5"/>
          <path d="M4 19h16"/>
        </svg>
      </div>
      <div style={styles.textWrap}>
        <p style={styles.title}>Install the app</p>
        <p style={styles.subtitle}>
          {canPromptInstall ? 'Quicker access, works offline' : 'Tap Share, then "Add to Home Screen"'}
        </p>
      </div>
      {canPromptInstall && (
        <button type="button" style={styles.installBtn} onClick={promptInstall}>
          Install
        </button>
      )}
    </div>
  )
}