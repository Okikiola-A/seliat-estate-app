import { useState, useEffect } from 'react'
import { supabase, createIsolatedClient } from '../supabase'
import { useTheme } from '../context/useTheme'
import { capitalizeName, formatDate, getCodeStatus, generateCode, generateTempPassword, formatNigerianPhone, validateEmail, validatePhone } from '../utils/helpers'
import { responsiveTableCSS } from '../utils/responsiveTableStyles'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'
import TruncatedText from '../components/TruncatedText'
import { paginate } from '../utils/pagination'
import Badge from '../components/Badge'
import AvatarMenu from '../components/AvatarMenu'
import NotificationBell from '../components/NotificationBell'
import PasswordReminderBanner from '../components/PasswordReminderBanner'
import Settings from './Settings'

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export default function AdminDashboard({ profile, openSettingsSignal, onPasswordChanged, showPasswordReminder, onChangePasswordReminder, onSnoozeReminder }) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [codes, setCodes] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [focusPasswordSection, setFocusPasswordSection] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('joined')
  const [confirmModal, setConfirmModal] = useState(null)

  useEffect(() => {
    if (openSettingsSignal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSettings(true)
      setFocusPasswordSection(true)
    }
  }, [openSettingsSignal])
  const [page, setPage] = useState(1)
  const [selectedResident, setSelectedResident] = useState(null)
  const [residentCodes, setResidentCodes] = useState([])
  const [analytics, setAnalytics] = useState({
    today: 0, thisWeek: 0, total: 0, used: 0, active: 0, expired: 0, revoked: 0
  })

  const [myActiveCode, setMyActiveCode] = useState(null)
  const [myHistory, setMyHistory] = useState([])
  const [myGenerating, setMyGenerating] = useState(false)
  const [myError, setMyError] = useState(null)
  const [myCopied, setMyCopied] = useState(false)
  const [myHistoryPage, setMyHistoryPage] = useState(1)
  const [residentCodesPage, setResidentCodesPage] = useState(1)
  const [myRevoking, setMyRevoking] = useState(false)

  const [createForm, setCreateForm] = useState({
    full_name: '', email: '', phone: '', role: 'resident', block_number: '', house_number: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createdCreds, setCreatedCreds] = useState(null)
  const [createCopied, setCreateCopied] = useState(false)

  const exportHistoryCSV = () => {
    // Neutralize CSV/formula injection: a value starting with =, +, -, @, or a
    // tab/CR can be interpreted as a formula by Excel/Sheets when opened. Since
    // target_name/target_detail originate from user-submitted profile data
    // (full name, street, etc.), prefix those with a single quote so they're
    // always read back as plain text.
    const sanitizeCell = (val) => {
      const str = String(val ?? '')
      return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
    }
    const escape = (val) => `"${sanitizeCell(val).replace(/"/g, '""')}"`
    const rows = [
      ['Action', 'Target', 'Detail', 'Date'],
      ...history.map(entry => [
        entry.action,
        entry.target_name,
        entry.target_detail,
        new Date(entry.created_at).toISOString(),
      ]),
    ]
    const csv = rows.map(row => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `seliat-estate-activity-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const logActivity = async (action, targetName, targetDetail) => {
    await supabase.from('activity_log').insert({
      action, target_name: targetName, target_detail: targetDetail, performed_by: profile.id,
    })
  }

  const fetchPendingUsers = async () => {
    // Only surface accounts that have actually confirmed their email —
    // otherwise a fake/mistyped address (or a real signup who simply
    // hasn't checked their inbox yet) shows up in the approval queue
    // looking identical to a legitimate request, and could get approved
    // despite the account being functionally unusable until confirmed.
    const { data } = await supabase
      .from('users').select('*').eq('status', 'pending').eq('email_confirmed', true)
      .order('created_at', { ascending: false })
    setPendingUsers(data || [])
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('users').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false })
    setAllUsers(data || [])
  }

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('delivery_codes')
      .select(`*, resident:resident_id (full_name, block_number, house_number)`)
      .order('created_at', { ascending: false })
      .limit(100)
    setCodes(data || [])
  }

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setHistory(data || [])
  }

  const fetchMyCode = async () => {
    const { data } = await supabase
      .from('delivery_codes')
      .select('*')
      .eq('resident_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      const now = new Date()
      const active = data.find(c => !c.used && !c.revoked && new Date(c.expires_at) > now)
      setMyActiveCode(active || null)
      setMyHistory(data)
    }
  }

  const generateMyCode = async () => {
    setMyGenerating(true)
    setMyError(null)

    const { data: existing } = await supabase
      .from('delivery_codes')
      .select('id')
      .eq('resident_id', profile.id)
      .eq('used', false)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      setMyError('You already have an active code. Use or wait for it to expire first.')
      setMyGenerating(false)
      await fetchMyCode()
      return
    }

    const newCode = generateCode()
    const expiry = new Date(Date.now() + 12 * 60 * 60 * 1000)

    const { error } = await supabase
      .from('delivery_codes')
      .insert({ code: newCode, resident_id: profile.id, expires_at: expiry.toISOString() })

    if (error) {
      setMyError('Something went wrong. Please try again.')
      setMyGenerating(false)
      return
    }
    await fetchMyCode()
    setMyGenerating(false)
  }

  const getMyWhatsAppMessage = (code, expiresAt) => {
    const expiry = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const message = `Hello, here is your access code for Seliat Estate:\n\nCode: *${code}*\n\nShow this code to the gate guard on arrival.\nValid until: ${expiry}\n\nDo not share this code with anyone else.`
    return `https://wa.me/?text=${encodeURIComponent(message)}`
  }

  const copyMyCode = (code) => {
    navigator.clipboard.writeText(code)
    setMyCopied(true)
    setTimeout(() => setMyCopied(false), 2000)
  }

  const revokeMyCode = async (code) => {
    setConfirmModal(null)
    setMyRevoking(true)

    const { error } = await supabase.rpc('revoke_own_code', { target_code_id: code.id })

    if (error) {
      console.error('Failed to revoke code:', error)
      alert('Could not revoke this code. Please try again.')
      setMyRevoking(false)
      return
    }

    await fetchMyCode()
    setMyRevoking(false)
  }

  const fetchAnalytics = async () => {
    const { data } = await supabase.from('delivery_codes').select('*')
    if (!data) return
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    setAnalytics({
      today: data.filter(c => new Date(c.created_at) >= startOfDay).length,
      thisWeek: data.filter(c => new Date(c.created_at) >= startOfWeek).length,
      total: data.length,
      used: data.filter(c => c.used).length,
      active: data.filter(c => !c.used && !c.revoked && new Date(c.expires_at) > now).length,
      expired: data.filter(c => !c.used && !c.revoked && new Date(c.expires_at) < now).length,
      revoked: data.filter(c => c.revoked).length,
    })
  }

  const fetchData = async () => {
    setLoading(true)
    if (activeTab === 'overview') await Promise.all([fetchPendingUsers(), fetchAnalytics()])
    if (activeTab === 'approvals') await fetchPendingUsers()
    if (activeTab === 'users') await fetchAllUsers()
    if (activeTab === 'codes') await fetchCodes()
    if (activeTab === 'history') await fetchHistory()
    if (activeTab === 'mycode') await fetchMyCode()
    setLoading(false)
  }

  useEffect(() => {
    // Standard fetch-on-mount/on-tab-change pattern; fetchData is redefined
    // every render (it closes over activeTab and the various fetchX
    // helpers), so it's intentionally left out of the dependency array —
    // including it would refetch on every render instead of only on tab change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchResidentCodes = async (resident) => {
    setSelectedResident(resident)
    setResidentCodesPage(1)
    const { data } = await supabase
      .from('delivery_codes')
      .select('*')
      .eq('resident_id', resident.id)
      .order('created_at', { ascending: false })
    setResidentCodes(data || [])
  }

  const approveUser = async (user) => {
    await supabase.from('users').update({ status: 'approved' }).eq('id', user.id)
    await logActivity('approved', capitalizeName(user.full_name), `${user.block_number}, House ${user.house_number}`)
    fetchPendingUsers()
    fetchAnalytics()
  }

  const rejectUser = async (user) => {
    await logActivity('rejected', capitalizeName(user.full_name), `${user.block_number}, House ${user.house_number}`)
    const { error } = await supabase.functions.invoke('delete-user', { body: { target_user_id: user.id } })
    if (error) {
      // Fall back to removing at least the profile row so the app stays consistent
      await supabase.from('users').delete().eq('id', user.id)
    }
    fetchPendingUsers()
  }

  const deleteUser = async (user) => {
    const { error } = await supabase.functions.invoke('delete-user', { body: { target_user_id: user.id } })
    let succeeded = !error

    if (error) {
      const { error: fallbackError } = await supabase.from('users').delete().eq('id', user.id)
      succeeded = !fallbackError
    }

    // Only record this in the audit trail once we know it actually
    // happened — logging it unconditionally beforehand meant a failed
    // delete (e.g. blocked by a foreign key, as happened with the
    // verified_by constraint before it was fixed) still showed up in
    // History as "deleted", which is misleading.
    if (succeeded) {
      await logActivity('deleted', capitalizeName(user.full_name), `${user.role} — ${user.block_number}, House ${user.house_number}`)
    } else {
      console.error('Failed to delete user:', user.id)
    }

    setConfirmModal(null)
    fetchAllUsers()
  }

  const revokeCode = async (code) => {
    await supabase.from('delivery_codes').update({ revoked: true }).eq('id', code.id)
    await logActivity('revoked', code.code, capitalizeName(code.resident?.full_name) || 'Unknown resident')
    setConfirmModal(null)
    fetchCodes()
  }

  const clearCodeLog = async () => {
    const count = codes.length
    await supabase.from('delivery_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await logActivity('deleted', 'Code Log', `Cleared ${count} code${count === 1 ? '' : 's'}`)
    setConfirmModal(null)
    fetchCodes()
    fetchAnalytics()
  }

  const clearHistory = async () => {
    const { error } = await supabase
      .from('activity_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    setConfirmModal(null)

    if (error) {
      console.error('Failed to clear history:', error)
      alert('Could not clear history. Please try again.')
      return
    }

    fetchHistory()
  }

  const updateCreateForm = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
    setCreateError(null)
  }

  const validateCreateForm = () => {
    if (!createForm.full_name.trim()) return 'Please enter a full name'
    if (!createForm.email.trim() || !validateEmail(createForm.email)) return 'Please enter a valid email address'
    if (!createForm.phone.trim() || !validatePhone(createForm.phone)) return 'Please enter a valid 11-digit phone number'
    if (createForm.role === 'resident') {
      if (!createForm.block_number.trim()) return 'Please enter a street/block'
      if (!createForm.house_number.trim()) return 'Please enter a house number'
    }
    return null
  }

  const submitCreateUser = async () => {
    const err = validateCreateForm()
    if (err) { setCreateError(err); return }

    setCreating(true)
    setCreateError(null)

    const tempPassword = generateTempPassword()
    const tempClient = createIsolatedClient()

    // The public.users row is now created automatically by the
    // handle_new_user trigger the instant this signUp() call succeeds (same
    // trigger the self-registration flow relies on) — it reads full_name /
    // phone / block_number / house_number out of this metadata and inserts
    // a row with role: 'resident', status: 'pending' by default, in the
    // same DB transaction as the auth.users insert itself.
    const { data, error: signUpError } = await tempClient.auth.signUp({
      email: createForm.email.trim(),
      password: tempPassword,
      options: {
        data: {
          full_name: createForm.full_name.trim(),
          phone: createForm.phone,
          block_number: createForm.role === 'resident' ? createForm.block_number.trim().toUpperCase() : null,
          house_number: createForm.role === 'resident' ? createForm.house_number.replace(/\D/g, '') : null,
        },
      },
    })

    if (signUpError) {
      setCreateError(signUpError.message)
      setCreating(false)
      return
    }

    // Supabase deliberately does NOT return an error when signUp() is
    // called with an email that already exists but hasn't been confirmed
    // yet — it silently returns the existing (unconfirmed) user instead,
    // to avoid letting an attacker probe which emails are already
    // registered. The documented way to detect this here is an empty
    // identities array on the returned user. Without this check, creating
    // an account with an email already in use (e.g. a previous unconfirmed
    // signup, or one from a account that was deleted while still pending)
    // silently reuses that existing row instead of erroring — no new
    // account is created, no new confirmation email is sent, and the
    // admin has no way to tell the difference from a genuine success.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setCreateError('An account with this email already exists. Ask the user to check their inbox for a confirmation link, or use a different email address.')
      setCreating(false)
      return
    }

    // Admin-created accounts need to end up with a different role/status/
    // force_password_change than the trigger's default — finish the job
    // with an UPDATE instead of a second INSERT (a second insert on the
    // same id would now collide with the row the trigger already created).
    //
    // This runs on the *admin's own* session (the main `supabase` client,
    // not the isolated tempClient used for signUp above), so the
    // enforce_safe_user_fields trigger sees is_admin() = true and allows
    // role/status to be changed here — unlike the self-registration path,
    // where that same trigger locks those fields to their defaults.
    const { error: profileError } = await supabase
      .from('users')
      .update({
        role: createForm.role,
        status: 'approved',
        force_password_change: true,
      })
      .eq('id', data.user.id)

    if (profileError) {
      // Same orphaned-account risk as before, just triggered at the UPDATE
      // step now instead of a second INSERT: the auth account (and its
      // trigger-created profile row) already exist at this point. Roll
      // both back using the admin's own session (admin is permitted to
      // delete other users' accounts) so this email isn't left
      // permanently stuck the way self-registration used to get stuck
      // before the delete-user function existed.
      const { error: rollbackError } = await supabase.functions.invoke('delete-user', {
        body: { target_user_id: data.user.id },
      })
      if (rollbackError) {
        console.error('Failed to roll back orphaned auth account after profile insert failure:', rollbackError)
      }
      setCreateError(profileError.message)
      setCreating(false)
      return
    }

    await logActivity('created', capitalizeName(createForm.full_name), `${cap(createForm.role)} account created by admin`)

    setCreatedCreds({ email: createForm.email.trim(), password: tempPassword })
    setCreateForm({ full_name: '', email: '', phone: '', role: 'resident', block_number: '', house_number: '' })
    setCreating(false)
  }

  const copyCreateCreds = () => {
    navigator.clipboard.writeText(
      `Email: ${createdCreds.email}\n` +
      `Temporary password: ${createdCreds.password}\n\n` +
      `Before you can log in, check your email for a confirmation link and click it.\n` +
      `Once confirmed, log in with the details above, then change your password from the temporary one.`
    )
    setCreateCopied(true)
    setTimeout(() => setCreateCopied(false), 2000)
  }

  const getFilteredSortedUsers = () => {
    let result = allUsers.filter(u =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.phone?.includes(searchQuery) ||
       u.block_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       u.house_number?.includes(searchQuery))
    )
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.full_name.localeCompare(b.full_name))
    } else if (sortBy === 'address') {
      result = [...result].sort((a, b) => {
        const aAddr = `${a.block_number}${a.house_number}`
        const bAddr = `${b.block_number}${b.house_number}`
        return aAddr.localeCompare(bAddr)
      })
    }
    return result
  }

  const filteredCodes = codes.filter(c =>
    c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.resident?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.resident?.block_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'Approvals', badge: pendingUsers.length },
    { id: 'mycode', label: 'My Code' },
    { id: 'users', label: 'Users' },
    { id: 'createUser', label: 'Create User' },
    { id: 'codes', label: 'Code Log' },
    { id: 'history', label: 'History' },
  ]

  const styles = {
    container: { minHeight: '100vh', backgroundColor: theme.bg, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" },
    header: { backgroundColor: theme.primary, padding: '0 1.25rem', height: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 150, boxSizing: 'border-box' },
    headerTitleCenter: { fontSize: '1rem', fontWeight: '700', color: theme.primaryText, margin: 0, minWidth: 0, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    hamburger: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: '4px', width: '36px' },
    hamburgerLine: { width: '22px', height: '2px', backgroundColor: theme.primaryText, borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s' },
    backBtn: { background: 'none', border: 'none', color: theme.primaryText, fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0, width: '60px' },
    sidebarOverlay: { position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 90 },
    sidebar: { position: 'fixed', top: '64px', left: 0, bottom: 0, width: '280px', backgroundColor: theme.surface, zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.12)', transition: 'transform 0.25s ease' },
    sidebarTitle: { padding: '1.25rem 1.25rem 1rem' },
    sidebarTitleText: { fontSize: '1rem', fontWeight: '800', color: theme.textPrimary, margin: 0 },
    sidebarTitleSub: { fontSize: '0.78rem', color: theme.textMuted, margin: '2px 0 0 0', fontWeight: '500' },
    sidebarDivider: { height: '1px', backgroundColor: theme.border },
    sidebarNav: { padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' },
    sidebarItem: { padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background-color 0.15s' },
    sidebarBadge: { backgroundColor: theme.primary, color: theme.primaryText, fontSize: '0.72rem', fontWeight: '800', padding: '0.1rem 0.45rem', borderRadius: '20px', minWidth: '20px', textAlign: 'center' },
    body: { flex: 1, padding: '1rem 1.25rem', maxWidth: '800px', width: '100%', alignSelf: 'center', boxSizing: 'border-box' },
    section: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    sectionLabel: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    sectionBadge: { backgroundColor: theme.primary, color: theme.primaryText, fontSize: '0.7rem', fontWeight: '800', padding: '0.1rem 0.45rem', borderRadius: '20px' },
    sectionCount: { color: theme.textMuted, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },
    sectionTopRow: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    sectionActions: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
    filterRow: { display: 'flex', gap: '0.5rem' },
    filterPill: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', borderRadius: '20px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, flex: 1 },
    filterSelect: { border: 'none', backgroundColor: 'transparent', fontSize: '0.8rem', color: theme.textSecondary, fontFamily: "'DM Sans', sans-serif", fontWeight: '600', cursor: 'pointer', width: '100%' },
    banner: { backgroundColor: theme.primaryLight, border: `1.5px solid ${theme.primaryLight}`, borderRadius: '10px', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.primary, fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
    analyticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.75rem' },
    analyticsCard: { backgroundColor: theme.surface, borderRadius: '10px', padding: '1rem 0.75rem', textAlign: 'center', border: `1px solid ${theme.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    analyticsValue: { fontSize: '1.75rem', fontWeight: '800', color: theme.primary, margin: '0 0 2px 0', letterSpacing: '-0.5px' },
    analyticsLabel: { fontSize: '0.72rem', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
    card: { backgroundColor: theme.surface, borderRadius: '10px', padding: '1rem', border: `1px solid ${theme.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardLabelBlue: { fontSize: '0.85rem', fontWeight: '700', color: theme.primary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardRow: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: theme.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarText: { color: theme.primary, fontWeight: '800', fontSize: '1rem' },
    cardInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' },
    cardName: { fontSize: '0.95rem', fontWeight: '700', color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    cardSub: { fontSize: '0.82rem', color: theme.textSecondary, margin: 0, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    cardDate: { fontSize: '0.75rem', color: theme.textMuted, margin: '2px 0 0 0', fontWeight: '500' },
    cardActions: { display: 'flex', gap: '0.6rem' },
    approveBtn: { flex: 1, padding: '0.65rem', borderRadius: '6px', border: 'none', backgroundColor: theme.primary, color: theme.primaryText, fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
    rejectBtn: { flex: 1, padding: '0.65rem', borderRadius: '6px', border: `1.5px solid ${theme.dangerBorder}`, backgroundColor: theme.dangerBg, color: theme.danger, fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
    codeDisplay: { backgroundColor: theme.surfaceAlt, border: `2px dashed ${theme.border}`, borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    codeText: { fontSize: '2.25rem', fontWeight: '800', letterSpacing: '0.4rem', color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif" },
    expiryText: { fontSize: '0.82rem', fontWeight: '600', color: theme.danger, margin: 0, textAlign: 'center' },
    actionRow: { display: 'flex', gap: '0.75rem' },
    copyBtn: { flex: 1, padding: '0.75rem', borderRadius: '6px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, color: theme.textPrimary, fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' },
    whatsappBtn: { flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none', backgroundColor: '#25D366', color: 'white', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' },
    codeRevokeIconBtn: { position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    generateBtn: { backgroundColor: theme.primary, color: theme.primaryText, border: 'none', borderRadius: '6px', padding: '0.85rem', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", width: '100%' },
    searchWrap: { position: 'relative', flex: 1, display: 'flex', alignItems: 'center' },
    searchIcon: { position: 'absolute', left: '0.75rem', pointerEvents: 'none' },
    searchInput: { width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '6px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, fontSize: '0.875rem', color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: '500', boxSizing: 'border-box' },
    clearLogBtn: { padding: '0.65rem 1rem', borderRadius: '6px', border: `1.5px solid ${theme.dangerBorder}`, backgroundColor: theme.dangerBg, color: theme.danger, fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 },
    tableCard: { backgroundColor: theme.surface, borderRadius: '10px', border: `1px solid ${theme.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
    gridHeaderCell: { color: theme.textSecondary, backgroundColor: theme.surfaceAlt, borderBottom: `1px solid ${theme.border}` },
    gridCell: { color: theme.textPrimary, fontWeight: '500', borderBottom: `1px solid ${theme.border}` },
    tdSub: { fontSize: '0.75rem', color: theme.textMuted, margin: '2px 0 0 0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' },
    addressCell: { display: 'flex', alignItems: 'baseline', gap: '0.3rem', minWidth: 0 },
    addressNumber: { flexShrink: 0, fontWeight: '600' },
    addressStreet: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
    nameLink: { background: 'none', border: 'none', color: theme.primary, fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', padding: 0, textAlign: 'left' },
    deleteIconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' },
    revokePill: { padding: '0.15rem 0.5rem', borderRadius: '5px', border: `1.2px solid ${theme.dangerBorder}`, backgroundColor: theme.dangerBg, color: theme.danger, fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.4', whiteSpace: 'nowrap' },
    emptyState: { textAlign: 'center', paddingTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    emptyTitle: { fontSize: '1rem', fontWeight: '700', color: theme.textPrimary, margin: 0 },
    emptyText: { fontSize: '0.875rem', color: theme.textMuted, margin: 0, fontWeight: '500' },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    fieldLabel: { fontSize: '0.82rem', fontWeight: '600', color: theme.textSecondary },
    fieldInput: { width: '100%', padding: '0.8rem 1rem', borderRadius: '6px', border: `1.5px solid ${theme.border}`, fontSize: '0.9rem', color: theme.textPrimary, backgroundColor: theme.surface, fontFamily: "'DM Sans', sans-serif", fontWeight: '500', boxSizing: 'border-box' },
    fieldSelect: { width: '100%', padding: '0.8rem 1rem', borderRadius: '6px', border: `1.5px solid ${theme.border}`, fontSize: '0.9rem', color: theme.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: '500', boxSizing: 'border-box', backgroundColor: theme.surface, cursor: 'pointer' },
    errorBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: theme.dangerBg, border: `1px solid ${theme.dangerBorder}` },
    errorText: { color: theme.danger, fontSize: '0.82rem', margin: 0, fontWeight: '500' },
    credsBox: { backgroundColor: theme.surfaceAlt, border: `1.5px dashed ${theme.border}`, borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
    credsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' },
    credsKey: { fontSize: '0.75rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' },
    credsValue: { fontSize: '0.9rem', fontWeight: '700', color: theme.textPrimary, wordBreak: 'break-all', textAlign: 'right' },
    confirmNotice: { fontSize: '0.82rem', color: theme.textSecondary, margin: 0, fontWeight: '500', lineHeight: '1.5' },
  }

  const navigateTo = (tabId) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
    setSearchQuery('')
    setRoleFilter('all')
    setSortBy('joined')
    setSelectedResident(null)
    setCreatedCreds(null)
    setCreateError(null)
    setPage(1)
    setMyHistoryPage(1)
  }

  if (showSettings) {
    return <Settings profile={profile} onBack={() => { setShowSettings(false); setFocusPasswordSection(false) }} onPasswordChanged={onPasswordChanged} focusPasswordSection={focusPasswordSection} />
  }

  if (selectedResident) {
    return (
      <div style={styles.container}>
        <style>{responsiveTableCSS}</style>
        <div style={{ ...styles.header, zIndex: 150 }}>
          <button style={styles.backBtn} onClick={() => setSelectedResident(null)}>← Back</button>
          <p style={styles.headerTitleCenter} title={capitalizeName(selectedResident.full_name)}>{capitalizeName(selectedResident.full_name)}</p>
          <div style={{ width: '60px' }} />
        </div>

        {showPasswordReminder && (
          <PasswordReminderBanner onChangePassword={onChangePasswordReminder} onSnooze={onSnoozeReminder} />
        )}

        <div style={styles.body}>
          {residentCodes.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No codes yet</p>
              <p style={styles.emptyText}>This user hasn't generated any codes.</p>
            </div>
          ) : (
            <div className="grid-table-card" style={styles.tableCard}>
              <div className="grid-table" style={{ gridTemplateColumns: 'auto auto auto' }}>
                <div className="grid-header-cell" style={styles.gridHeaderCell}>Code</div>
                <div className="grid-header-cell" style={styles.gridHeaderCell}>Date</div>
                <div className="grid-header-cell" style={styles.gridHeaderCell}>Status</div>
                {paginate(residentCodes, residentCodesPage).map(code => {
                  const status = getCodeStatus(code)
                  return (
                    <div className="grid-row" key={code.id}>
                      <div className="grid-cell" style={{ ...styles.gridCell, fontWeight: '700', letterSpacing: '0.1em' }}>
                        {code.code}
                      </div>
                      <div className="grid-cell" style={styles.gridCell}>
                        {formatDate(code.created_at)}
                      </div>
                      <div className="grid-cell" style={styles.gridCell}>
                        <Badge label={status.label} variant={status.label.toLowerCase()} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <Pagination page={residentCodesPage} itemCount={residentCodes.length} onPageChange={setResidentCodesPage} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; }
        input::placeholder { color: ${theme.textMuted}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ${responsiveTableCSS}
      `}</style>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {sidebarOpen && (
        <div style={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      <div style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={styles.sidebarTitle}>
          <p style={styles.sidebarTitleText}>Seliat Estate CDA</p>
          <p style={styles.sidebarTitleSub}>Admin Menu</p>
        </div>

        <div style={styles.sidebarDivider} />

        <nav style={styles.sidebarNav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.sidebarItem,
                backgroundColor: activeTab === tab.id ? theme.primaryLight : 'transparent',
                color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                fontWeight: activeTab === tab.id ? '700' : '500',
              }}
              onClick={() => navigateTo(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && <span style={styles.sidebarBadge}>{tab.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div style={styles.header}>
        <button style={styles.hamburger} onClick={() => setSidebarOpen(p => !p)} aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}>
          <div style={{
            ...styles.hamburgerLine,
            transform: sidebarOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
          }} />
          <div style={{ ...styles.hamburgerLine, opacity: sidebarOpen ? 0 : 1 }} />
          <div style={{
            ...styles.hamburgerLine,
            transform: sidebarOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
          }} />
        </button>

        <p style={styles.headerTitleCenter}>{tabs.find(t => t.id === activeTab)?.label}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <NotificationBell userId={profile.id} />
          <AvatarMenu
            name={capitalizeName(profile.full_name)}
            onSettingsClick={() => setShowSettings(true)}
          />
        </div>
      </div>

      {showPasswordReminder && (
        <PasswordReminderBanner onChangePassword={onChangePasswordReminder} onSnooze={onSnoozeReminder} />
      )}

      <div style={styles.body}>
        {loading ? (
          <p style={{ color: theme.textMuted, textAlign: 'center', paddingTop: '3rem' }}>Loading...</p>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div style={styles.section}>
                <p style={styles.sectionLabel}>Code Activity Summary</p>
                <div style={styles.analyticsGrid}>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.today}</p>
                    <p style={styles.analyticsLabel}>Today</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.thisWeek}</p>
                    <p style={styles.analyticsLabel}>This Week</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.total}</p>
                    <p style={styles.analyticsLabel}>All Time</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.active}</p>
                    <p style={styles.analyticsLabel}>Active Now</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.used}</p>
                    <p style={styles.analyticsLabel}>Used</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.expired}</p>
                    <p style={styles.analyticsLabel}>Expired</p>
                  </div>
                  <div style={styles.analyticsCard}>
                    <p style={styles.analyticsValue}>{analytics.revoked}</p>
                    <p style={styles.analyticsLabel}>Revoked</p>
                  </div>
                </div>

                {pendingUsers.length > 0 && (
                  <button style={styles.banner} onClick={() => navigateTo('approvals')}>
                    <span>{pendingUsers.length} pending approval{pendingUsers.length === 1 ? '' : 's'} waiting for review</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            )}

            {activeTab === 'approvals' && (
              <div style={styles.section}>
                <p style={styles.sectionLabel}>
                  Pending Requests
                  {pendingUsers.length > 0 && <span style={styles.sectionBadge}>{pendingUsers.length}</span>}
                </p>
                {pendingUsers.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyTitle}>All caught up</p>
                    <p style={styles.emptyText}>No pending account requests right now.</p>
                  </div>
                ) : (
                  pendingUsers.map(user => (
                    <div key={user.id} style={styles.card}>
                      <div style={styles.cardRow}>
                        <div style={styles.avatar}>
                          <span style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={styles.cardInfo}>
                          <p style={styles.cardName} title={capitalizeName(user.full_name)}>{capitalizeName(user.full_name)}</p>
                          <p style={styles.cardSub}>{user.phone}</p>
                          <p style={styles.cardSub} title={`${user.block_number}, House ${user.house_number}`}>{user.block_number}, House {user.house_number}</p>
                          <p style={styles.cardDate}>Requested {formatDate(user.created_at)}</p>
                        </div>
                      </div>
                      <div style={styles.cardActions}>
                        <button style={styles.approveBtn} onClick={() => approveUser(user)}>Approve</button>
                        <button style={styles.rejectBtn} onClick={() => rejectUser(user)}>Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'mycode' && (
              <div style={styles.section}>
                <p style={styles.sectionLabel}>My Access Code</p>
                {myActiveCode ? (
                  <div style={styles.card}>
                    <div style={styles.cardTopRow}>
                      <p style={styles.cardLabelBlue}>Active Code</p>
                      <Badge label="Active" variant="active" />
                    </div>
                    <div style={styles.codeDisplay}>
                      <span style={styles.codeText}>{myActiveCode.code}</span>
                      <button
                        type="button"
                        style={{ ...styles.codeRevokeIconBtn, opacity: myRevoking ? 0.5 : 1 }}
                        disabled={myRevoking}
                        aria-label="Revoke this code"
                        title="Revoke this code"
                        onClick={() => setConfirmModal({
                          title: 'Revoke This Code',
                          message: 'This code will stop working immediately. You can generate a new one right after.',
                          onConfirm: () => revokeMyCode(myActiveCode),
                        })}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                    <p style={styles.expiryText}>
                      Expires at {new Date(myActiveCode.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div style={styles.actionRow}>
                      <button style={styles.copyBtn} onClick={() => copyMyCode(myActiveCode.code)}>
                        {myCopied ? 'Copied!' : 'Copy Code'}
                      </button>
                      <a
                        href={getMyWhatsAppMessage(myActiveCode.code, myActiveCode.expires_at)}
                        target="_blank" rel="noopener noreferrer"
                        style={styles.whatsappBtn}
                      >
                        Share on WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={styles.card}>
                    <p style={styles.cardLabelBlue}>No Active Code</p>
                    <p style={styles.cardSub}>Generate a one-time code for your courier. Valid for 12 hours.</p>
                    {myError && <p style={{ color: theme.danger, fontSize: '0.85rem' }}>{myError}</p>}
                    <button
                      style={{ ...styles.generateBtn, opacity: myGenerating ? 0.7 : 1 }}
                      onClick={generateMyCode}
                      disabled={myGenerating}
                    >
                      {myGenerating ? 'Generating...' : 'Generate Access Code'}
                    </button>
                  </div>
                )}

                {myHistory.length > 0 && (
                  <div className="grid-table-card" style={styles.tableCard}>
                    <div className="grid-table" style={{ gridTemplateColumns: 'auto auto auto' }}>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Code</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Date</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Status</div>
                      {paginate(myHistory, myHistoryPage).map(code => {
                        const status = getCodeStatus(code)
                        return (
                          <div className="grid-row" key={code.id}>
                            <div className="grid-cell" style={{ ...styles.gridCell, fontWeight: '700', letterSpacing: '0.1em' }}>
                              {code.code}
                            </div>
                            <div className="grid-cell" style={styles.gridCell}>
                              {formatDate(code.created_at)}
                            </div>
                            <div className="grid-cell" style={styles.gridCell}>
                              <Badge label={status.label} variant={status.label.toLowerCase()} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Pagination page={myHistoryPage} itemCount={myHistory.length} onPageChange={setMyHistoryPage} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div style={styles.section}>
                <div style={styles.sectionTopRow}>
                  <p style={styles.sectionLabel}>
                    All Members<span style={styles.sectionCount}> ({getFilteredSortedUsers().length})</span>
                  </p>
                  <div style={styles.searchWrap}>
                    <svg style={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      style={styles.searchInput}
                      type="text"
                      placeholder="Search name, phone, address..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                    />
                  </div>
                  <div style={styles.filterRow}>
                    <div style={styles.filterPill}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                      </svg>
                      <select style={styles.filterSelect} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
                        <option value="all">All</option>
                        <option value="admin">Admin</option>
                        <option value="guard">Guard</option>
                        <option value="resident">Resident</option>
                      </select>
                    </div>
                    <div style={styles.filterPill}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M7 12h10M11 18h2"/>
                      </svg>
                      <select style={styles.filterSelect} value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}>
                        <option value="joined">Date Joined</option>
                        <option value="name">Name</option>
                        <option value="address">Address</option>
                      </select>
                    </div>
                  </div>
                </div>

                {getFilteredSortedUsers().length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyTitle}>No results</p>
                    <p style={styles.emptyText}>Try a different search or filter.</p>
                  </div>
                ) : (
                  <div className="grid-table-card" style={styles.tableCard}>
                    <div className="grid-table" style={{ gridTemplateColumns: 'fit-content(170px) fit-content(170px) auto auto' }}>
                      <div className="grid-header-cell" style={{ ...styles.gridHeaderCell, padding: '0.55rem 0.85rem' }}>Name</div>
                      <div className="grid-header-cell" style={{ ...styles.gridHeaderCell, padding: '0.55rem 0.85rem' }}>Address</div>
                      <div className="grid-header-cell" style={{ ...styles.gridHeaderCell, padding: '0.55rem 0.85rem' }}>Role</div>
                      <div className="grid-header-cell" style={{ ...styles.gridHeaderCell, padding: '0.55rem 0.85rem' }}></div>
                      {paginate(getFilteredSortedUsers(), page).map((user, index) => {
                        const rowStyle = { ...styles.gridCell, backgroundColor: index % 2 === 0 ? theme.surface : theme.surfaceAlt, padding: '0.65rem 0.85rem' }
                        return (
                          <div className="grid-row" key={user.id}>
                            <div className="grid-cell" style={rowStyle}>
                              <div style={{ minWidth: 0 }}>
                                <button
                                  style={{ ...styles.nameLink, ...styles.truncate, maxWidth: '100%' }}
                                  onClick={() => fetchResidentCodes(user)}
                                  title={capitalizeName(user.full_name)}
                                >
                                  {capitalizeName(user.full_name)}
                                </button>
                                <p style={styles.tdSub} title={user.phone}>{user.phone}</p>
                              </div>
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              <div style={styles.addressCell}>
                                <span style={styles.addressNumber}>#{user.house_number},</span>
                                <TruncatedText text={user.block_number} style={styles.addressStreet} />
                              </div>
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              <Badge label={cap(user.role)} variant={user.role} />
                            </div>
                            <div className="grid-cell" style={{ ...rowStyle, justifyContent: 'center' }}>
                              {user.id !== profile.id && (
                                <button
                                  style={styles.deleteIconBtn}
                                  aria-label={`Remove ${capitalizeName(user.full_name)}`}
                                  onClick={() => setConfirmModal({
                                    title: 'Remove Member',
                                    message: `Are you sure you want to remove ${capitalizeName(user.full_name)} from the estate app? This cannot be undone.`,
                                    onConfirm: () => deleteUser(user),
                                  })}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4h6v2"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Pagination page={page} itemCount={getFilteredSortedUsers().length} onPageChange={setPage} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'createUser' && (
              <div style={styles.section}>
                <p style={styles.sectionLabel}>Create New User</p>

                {createdCreds ? (
                  <div style={styles.card}>
                    <p style={styles.cardLabelBlue}>Account Created</p>
                    <p style={styles.confirmNotice}>
                      The button below copies the email, temporary password, and instructions
                      (confirming their email, then changing their password) all together, ready to share with the user.
                    </p>

                    <div style={styles.credsBox}>
                      <div style={styles.credsRow}>
                        <span style={styles.credsKey}>Email</span>
                        <span style={styles.credsValue}>{createdCreds.email}</span>
                      </div>
                      <div style={styles.credsRow}>
                        <span style={styles.credsKey}>Temp Password</span>
                        <span style={styles.credsValue}>{createdCreds.password}</span>
                      </div>
                    </div>

                    <div style={styles.actionRow}>
                      <button style={styles.copyBtn} onClick={copyCreateCreds}>
                        {createCopied ? 'Copied!' : 'Copy Credentials'}
                      </button>
                      <button style={styles.generateBtn} onClick={() => setCreatedCreds(null)}>
                        Create Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.card}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Full name</label>
                      <input
                        style={styles.fieldInput}
                        type="text"
                        placeholder="John Doe"
                        value={createForm.full_name}
                        onChange={e => updateCreateForm('full_name', e.target.value)}
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Email address</label>
                      <input
                        style={styles.fieldInput}
                        type="email"
                        placeholder="you@example.com"
                        value={createForm.email}
                        onChange={e => updateCreateForm('email', e.target.value)}
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Phone number</label>
                      <input
                        style={styles.fieldInput}
                        type="tel"
                        placeholder="e.g. 0801 234 5678"
                        value={createForm.phone}
                        onChange={e => updateCreateForm('phone', formatNigerianPhone(e.target.value))}
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Role</label>
                      <select
                        style={styles.fieldSelect}
                        value={createForm.role}
                        onChange={e => updateCreateForm('role', e.target.value)}
                      >
                        <option value="resident">Resident</option>
                        <option value="guard">Guard</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {createForm.role === 'resident' && (
                      <>
                        <div style={styles.fieldGroup}>
                          <label style={styles.fieldLabel}>Street</label>
                          <input
                            style={styles.fieldInput}
                            type="text"
                            placeholder="e.g. Joy Street"
                            value={createForm.block_number}
                            onChange={e => updateCreateForm('block_number', e.target.value)}
                          />
                        </div>

                        <div style={styles.fieldGroup}>
                          <label style={styles.fieldLabel}>House number</label>
                          <input
                            style={styles.fieldInput}
                            type="text"
                            placeholder="e.g. 1, 2, 3"
                            value={createForm.house_number}
                            onChange={e => updateCreateForm('house_number', e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                      </>
                    )}

                    {createError && (
                      <div style={styles.errorBox}>
                        <p style={styles.errorText}>{createError}</p>
                      </div>
                    )}

                    <button
                      style={{ ...styles.generateBtn, opacity: creating ? 0.7 : 1 }}
                      onClick={submitCreateUser}
                      disabled={creating}
                    >
                      {creating ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'codes' && (
              <div style={styles.section}>
                <div style={styles.sectionTopRow}>
                  <p style={styles.sectionLabel}>Code Log</p>
                  <div style={styles.sectionActions}>
                    <div style={styles.searchWrap}>
                      <svg style={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        style={styles.searchInput}
                        type="text"
                        placeholder="Search code, name..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                      />
                    </div>
                    <button
                      style={styles.clearLogBtn}
                      onClick={() => setConfirmModal({
                        title: 'Clear Code Log',
                        message: 'This will permanently delete all access codes. This cannot be undone.',
                        onConfirm: clearCodeLog,
                      })}
                    >
                      Clear Log
                    </button>
                  </div>
                </div>

                {filteredCodes.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyTitle}>No codes yet</p>
                    <p style={styles.emptyText}>Generated codes will appear here.</p>
                  </div>
                ) : (
                  <div className="grid-table-card" style={styles.tableCard}>
                    <div className="grid-table" style={{ gridTemplateColumns: 'auto fit-content(190px) auto auto' }}>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Code</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Resident</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Date</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Status</div>
                      {paginate(filteredCodes, page).map((code, index) => {
                        const status = getCodeStatus(code)
                        const isActive = !code.used && !code.revoked && new Date(code.expires_at) > new Date()
                        const residentName = capitalizeName(code.resident?.full_name)
                        const rowStyle = { ...styles.gridCell, backgroundColor: index % 2 === 0 ? theme.surface : theme.surfaceAlt }
                        return (
                          <div className="grid-row" key={code.id}>
                            <div className="grid-cell" style={{ ...rowStyle, fontWeight: '700', letterSpacing: '0.1em' }}>
                              {code.code}
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              <div style={{ minWidth: 0 }}>
                                <TruncatedText text={residentName} style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem' }} />
                                <div style={styles.addressCell}>
                                  <span style={{ ...styles.tdSub, ...styles.addressNumber, overflow: 'visible', textOverflow: 'clip' }}>#{code.resident?.house_number},</span>
                                  <TruncatedText text={code.resident?.block_number} style={styles.tdSub} />
                                </div>
                              </div>
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              {formatDate(code.created_at)}
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
                                <Badge label={status.label} variant={status.label.toLowerCase()} />
                                {isActive && (
                                  <button
                                    type="button"
                                    style={styles.revokePill}
                                    onClick={() => setConfirmModal({
                                      title: 'Revoke Code',
                                      message: `Revoke code ${code.code}? The courier will no longer be able to use it.`,
                                      onConfirm: () => revokeCode(code),
                                    })}
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Pagination page={page} itemCount={filteredCodes.length} onPageChange={setPage} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div style={styles.section}>
                <div style={styles.sectionTopRow}>
                  <p style={styles.sectionLabel}>Activity History</p>
                  {history.length > 0 && (
                    <div style={styles.sectionActions}>
                      <button style={styles.copyBtn} onClick={exportHistoryCSV}>
                        Export CSV
                      </button>
                      <button
                        style={styles.clearLogBtn}
                        onClick={() => setConfirmModal({
                          title: 'Clear History',
                          message: 'This will permanently delete all activity history. This cannot be undone.',
                          onConfirm: clearHistory,
                        })}
                      >
                        Clear History
                      </button>
                    </div>
                  )}
                </div>
                {history.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyTitle}>No activity yet</p>
                    <p style={styles.emptyText}>Approvals, rejections, and other actions will appear here.</p>
                  </div>
                ) : (
                  <div className="grid-table-card" style={styles.tableCard}>
                    <div className="grid-table" style={{ gridTemplateColumns: 'fit-content(240px) auto auto' }}>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Detail</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Date</div>
                      <div className="grid-header-cell" style={styles.gridHeaderCell}>Action</div>
                      {paginate(history, page).map((entry, index) => {
                        const rowStyle = { ...styles.gridCell, backgroundColor: index % 2 === 0 ? theme.surface : theme.surfaceAlt }
                        return (
                          <div className="grid-row" key={entry.id}>
                            <div className="grid-cell" style={rowStyle}>
                              <div style={{ minWidth: 0 }}>
                                <TruncatedText text={entry.target_name} style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem' }} />
                                <p style={{ ...styles.tdSub, whiteSpace: 'normal', wordBreak: 'break-word' }}>{entry.target_detail}</p>
                              </div>
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              {formatDate(entry.created_at)}
                            </div>
                            <div className="grid-cell" style={rowStyle}>
                              <Badge label={cap(entry.action)} variant={entry.action} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Pagination page={page} itemCount={history.length} onPageChange={setPage} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}