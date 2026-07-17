import { useTheme } from '../context/useTheme'
import { totalPages, PAGE_SIZE } from '../utils/pagination'

export default function Pagination({ page, itemCount, onPageChange }) {
  const { theme } = useTheme()
  const pages = totalPages(itemCount)

  if (pages <= 1) return null

  const start = itemCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, itemCount)

  const styles = {
    wrap: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      borderTop: `1px solid ${theme.border}`,
      flexWrap: 'wrap',
      gap: '0.5rem',
    },
    rangeText: {
      fontSize: '0.78rem',
      color: theme.textMuted,
      fontWeight: '500',
      margin: 0,
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    btn: {
      padding: '0.4rem 0.75rem',
      borderRadius: '6px',
      border: `1.5px solid ${theme.border}`,
      backgroundColor: theme.surface,
      color: theme.textPrimary,
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
    },
    btnDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    pageText: {
      fontSize: '0.8rem',
      color: theme.textSecondary,
      fontWeight: '600',
      whiteSpace: 'nowrap',
    },
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.rangeText}>{start}–{end} of {itemCount}</p>
      <div style={styles.controls}>
        <button
          type="button"
          style={{ ...styles.btn, ...(page === 1 ? styles.btnDisabled : {}) }}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Prev
        </button>
        <span style={styles.pageText}>Page {page} of {pages}</span>
        <button
          type="button"
          style={{ ...styles.btn, ...(page === pages ? styles.btnDisabled : {}) }}
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
        >
          Next
        </button>
      </div>
    </div>
  )
}