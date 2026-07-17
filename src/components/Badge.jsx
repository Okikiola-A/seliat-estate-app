import { useTheme } from '../context/useTheme'

export default function Badge({ label, variant = 'neutral' }) {
  const { theme } = useTheme()

  const variants = {
    active: theme.successText,
    success: theme.successText,
    approved: theme.successText,
    resident: theme.successText,
    inactive: theme.dangerText,
    rejected: theme.dangerText,
    deleted: theme.dangerText,
    used: theme.dangerText,
    pending: theme.warningText,
    expired: theme.warningText,
    guard: theme.warningText,
    revoked: theme.textMuted,
    neutral: theme.textMuted,
    admin: theme.primary,
  }

  const color = variants[variant] || variants.neutral

  return (
    <span
      title={label}
      style={{
        display: 'block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color,
        fontSize: '0.8rem',
        fontWeight: '700',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </span>
  )
}