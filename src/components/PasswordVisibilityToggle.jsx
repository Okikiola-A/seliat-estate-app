import { useTheme } from '../context/useTheme'

// The show/hide eye-icon button that sits inside a password field, paired
// with PeekPasswordInput. Kept as a separate component (rather than baked
// into PeekPasswordInput itself) because several screens intentionally
// share one `visible` state across two fields at once — e.g. Register's
// password + confirm-password toggle together from a single click, as does
// Settings' new-password + confirm-password pair. Baking the state into
// PeekPasswordInput would make each field toggle independently and break
// that paired behavior.
export default function PasswordVisibilityToggle({ visible, onToggle }) {
  const { theme } = useTheme()

  return (
    <button
      type="button"
      style={styles.eyeBtn}
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  )
}

const styles = {
  eyeBtn: {
    position: 'absolute',
    right: '0.9rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem',
    zIndex: 3,
  },
}