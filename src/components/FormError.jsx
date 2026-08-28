import { useTheme } from '../context/useTheme'

// The red error-circle icon + message box used under form fields. Renders
// nothing when there's no message, so call sites can do
// `<FormError message={error} />` unconditionally instead of
// `{error && <div>...}`.
export default function FormError({ message }) {
  const { theme } = useTheme()
  if (!message) return null

  const styles = {
    box: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 0.75rem',
      borderRadius: '6px',
      backgroundColor: theme.dangerBg,
      border: `1px solid ${theme.dangerBorder}`,
    },
    text: {
      color: theme.danger,
      fontSize: '0.82rem',
      margin: 0,
      fontWeight: '500',
      lineHeight: '1.4',
    },
  }

  return (
    <div style={styles.box}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={theme.danger}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <p style={styles.text}>{message}</p>
    </div>
  )
}