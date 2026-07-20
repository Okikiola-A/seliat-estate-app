import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import { formatDate } from '../utils/helpers'

export default function NotificationBell({ userId }) {
  const { theme } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // drives the enter/exit animation
  const menuRef = useRef(null)
  const closeTimerRef = useRef(null)

  const styles = {
    wrap: { position: 'relative' },
    bellBtn: {
      width: '36px', height: '36px', borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', flexShrink: 0,
    },
    badge: {
      position: 'absolute', top: '-3px', right: '-3px',
      backgroundColor: theme.danger, color: 'white', fontSize: '0.65rem', fontWeight: '800',
      borderRadius: '20px', minWidth: '17px', height: '17px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: `2px solid ${theme.surface}`,
    },
    dropdown: {
      position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
      backgroundColor: theme.surface, borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      minWidth: '280px', maxWidth: '320px', overflow: 'hidden', zIndex: 200,
      transformOrigin: 'top right',
      transition: 'opacity 0.16s ease, transform 0.16s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(-4px)',
    },
    dropdownHeader: { padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    dropdownTitle: { fontSize: '0.85rem', fontWeight: '700', color: theme.textPrimary, margin: 0 },
    clearAllBtn: { background: 'none', border: 'none', color: theme.primary, fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 },
    divider: { height: '1px', backgroundColor: theme.border },
    list: { maxHeight: '320px', overflowY: 'auto' },
    item: { padding: '0.75rem 1rem', borderBottom: `1px solid ${theme.border}` },
    itemMessage: { fontSize: '0.82rem', fontWeight: '600', color: theme.textPrimary, margin: 0, lineHeight: '1.4' },
    itemDate: { fontSize: '0.72rem', color: theme.textMuted, margin: '4px 0 0 0', fontWeight: '500' },
    emptyText: { fontSize: '0.82rem', color: theme.textMuted, textAlign: 'center', padding: '1.5rem 1rem', margin: 0, fontWeight: '500' },
  }

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    // Standard fetch-on-mount pattern: fetchNotifications sets state once
    // data resolves. The alternative (a data-fetching library) isn't used
    // elsewhere in this codebase, so this is left as the deliberate pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // fetchNotifications is intentionally omitted: it's redefined every
    // render (it closes over userId), so including it would resubscribe the
    // realtime channel on every render instead of only when userId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read).length

  // Mount the dropdown, then flip `visible` on the next frame so the
  // transition actually animates in from its initial (hidden) state instead
  // of snapping straight to open.
  const openMenu = async () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpen(true)
    requestAnimationFrame(() => setVisible(true))

    if (unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    }
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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleOpen = () => {
    if (open) closeMenu()
    else openMenu()
  }

  const clearAll = async (e) => {
    e.stopPropagation()
    const ids = notifications.map(n => n.id)
    if (ids.length === 0) return

    const { error } = await supabase.from('notifications').delete().in('id', ids)

    if (error) {
      console.error('Failed to clear notifications:', error)
      alert('Could not clear notifications. Please try again.')
      return
    }

    // Re-fetch rather than assume — confirms the delete actually stuck
    await fetchNotifications()
  }

  return (
    <div style={styles.wrap} ref={menuRef}>
      <button style={styles.bellBtn} onClick={handleOpen} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <p style={styles.dropdownTitle}>Notifications</p>
            {notifications.length > 0 && (
              <button style={styles.clearAllBtn} onClick={clearAll}>Clear all</button>
            )}
          </div>
          <div style={styles.divider} />
          {notifications.length === 0 ? (
            <p style={styles.emptyText}>No notifications yet.</p>
          ) : (
            <div style={styles.list}>
              {notifications.map(n => (
                <div key={n.id} style={styles.item}>
                  <p style={styles.itemMessage}>{n.message}</p>
                  <p style={styles.itemDate}>{formatDate(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}