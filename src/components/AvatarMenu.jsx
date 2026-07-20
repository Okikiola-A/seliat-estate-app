import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'

export default function AvatarMenu({ name, subtitle, onSettingsClick }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // drives the enter/exit animation
  const menuRef = useRef(null)
  const closeTimerRef = useRef(null)

  const styles = {
    wrap: {
      position: 'relative',
    },
    avatarBtn: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.22)',
      border: '1.5px solid rgba(255,255,255,0.5)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 0.5rem)',
      right: 0,
      backgroundColor: theme.surface,
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      minWidth: '180px',
      maxWidth: '240px',
      overflow: 'hidden',
      zIndex: 500,
      transformOrigin: 'top right',
      transition: 'opacity 0.16s ease, transform 0.16s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(-4px)',
    },
    dropdownHeader: {
      padding: '0.75rem 1rem',
      minWidth: 0,
    },
    dropdownName: {
      fontSize: '0.85rem',
      fontWeight: '700',
      color: theme.textPrimary,
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    dropdownSubtitle: {
      fontSize: '0.75rem',
      fontWeight: '500',
      color: theme.textMuted,
      margin: '2px 0 0 0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    divider: {
      height: '1px',
      backgroundColor: theme.border,
    },
    dropdownItem: {
      width: '100%',
      padding: '0.75rem 1rem',
      background: 'none',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      fontSize: '0.85rem',
      fontWeight: '600',
      color: theme.textSecondary,
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      textAlign: 'left',
      transition: 'background-color 0.15s',
    },
  }

  // Mount the dropdown, then flip `visible` on the next frame so the
  // transition actually animates in from its initial (hidden) state instead
  // of snapping straight to open.
  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpen(true)
    requestAnimationFrame(() => setVisible(true))
  }

  // Reverse of the above: animate out first, then unmount after the
  // transition finishes so it doesn't just vanish.
  const closeMenu = () => {
    setVisible(false)
    closeTimerRef.current = setTimeout(() => setOpen(false), 160)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMenu = () => {
    if (open) closeMenu()
    else openMenu()
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
    <div style={styles.wrap} ref={menuRef}>
      <button style={styles.avatarBtn} onClick={toggleMenu} aria-label="Account menu">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
        </svg>
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <p style={styles.dropdownName} title={name}>{name}</p>
            {subtitle && <p style={styles.dropdownSubtitle} title={subtitle}>{subtitle}</p>}
          </div>
          <div style={styles.divider} />
          <button
            className="dropdown-menu-item"
            style={styles.dropdownItem}
            onClick={() => { closeMenu(); onSettingsClick() }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2h-.18a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2v-.18a2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2h.18a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2v.18a2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button
            className="dropdown-menu-item"
            style={{ ...styles.dropdownItem, color: theme.danger }}
            onClick={() => supabase.auth.signOut()}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}