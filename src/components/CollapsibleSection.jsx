import { useState } from 'react'
import { useTheme } from '../context/useTheme'

// Card with a clickable header (title + optional subtitle + chevron) that
// toggles its body open/closed. Used to keep long settings-style pages from
// showing every field at once — collapsed by default, expand on demand.
export default function CollapsibleSection({ title, subtitle, defaultOpen = false, danger = false, children }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(defaultOpen)

  const styles = {
    card: {
      backgroundColor: theme.surface,
      borderRadius: '12px',
      border: `1px solid ${danger ? theme.dangerBorder : theme.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    },
    header: {
      width: '100%',
      background: 'none',
      border: 'none',
      padding: '1.25rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'left',
    },
    titleWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: 0,
    },
    title: {
      fontSize: '0.95rem',
      fontWeight: '800',
      color: danger ? theme.danger : theme.textPrimary,
      margin: 0,
    },
    subtitle: {
      fontSize: '0.78rem',
      color: theme.textMuted,
      margin: 0,
      fontWeight: '500',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    chevron: {
      flexShrink: 0,
      transition: 'transform 0.25s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    },
    bodyOuter: {
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      transition: 'grid-template-rows 0.25s ease',
    },
    bodyInner: {
      overflow: 'hidden',
      minHeight: 0,
    },
    body: {
      padding: '0 1.25rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      opacity: open ? 1 : 0,
      transition: 'opacity 0.2s ease',
    },
  }

  return (
    <div style={styles.card}>
      <button
        type="button"
        className="collapsible-header"
        style={styles.header}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div style={styles.titleWrap}>
          <p style={styles.title}>{title}</p>
          {subtitle && <p style={styles.subtitle} title={subtitle}>{subtitle}</p>}
        </div>
        <svg
          style={styles.chevron}
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={danger ? theme.danger : theme.textMuted}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div style={styles.bodyOuter} inert={!open}>
        <div style={styles.bodyInner}>
          <div style={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  )
}