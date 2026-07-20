import { useTheme } from '../context/useTheme'

export default function PasswordReminderBanner({ onChangePassword, onSnooze }) {
  const { theme } = useTheme()

  const styles = {
    banner: {
      position: 'sticky',
      top: 0,
      // Deliberately lower than each screen's header (zIndex 150) — the
      // header uses position:sticky with its own z-index, which creates a
      // stacking context that traps its children (the avatar/notification
      // dropdowns) inside it. If this banner's z-index were higher than
      // the header's, no z-index set on those dropdowns could ever escape
      // above it, since a descendant can't out-rank a sibling of its own
      // stacking-context-creating ancestor. Staying below the header is
      // what lets the dropdowns render on top correctly.
      zIndex: 100,
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