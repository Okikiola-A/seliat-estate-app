import { useState } from 'react'
import { supabase } from '../supabase'
import { useTheme } from '../context/useTheme'
import { formatNigerianPhone, validatePhone, validatePassword } from '../utils/helpers'
import PeekPasswordInput from '../components/PeekPasswordInput'
import ConfirmModal from '../components/ConfirmModal'
import CollapsibleSection from '../components/CollapsibleSection'

const SUPPORT_EMAIL = 'seliatestatesupport@gmail.com'

const getSupportMailto = (profile) => {
  const subject = `Support request — ${profile.full_name || 'Resident'} (${profile.role})`
  const bodyLines = [
    'Hi Seliat Estate Support,',
    '',
    'Please describe your issue below:',
    '',
    '',
    '---',
    `Name: ${profile.full_name || ''}`,
    `Role: ${profile.role || ''}`,
  ]
  if (profile.block_number || profile.house_number) {
    bodyLines.push(`Address: ${profile.block_number || ''}, House ${profile.house_number || ''}`)
  }
  if (profile.phone) bodyLines.push(`Phone: ${profile.phone}`)

  const params = new URLSearchParams({ subject, body: bodyLines.join('\n') })
  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`
}

export default function Settings({ profile, onBack, onPasswordChanged, focusPasswordSection = false }) {
  const { theme, isDark, toggleTheme } = useTheme()
  const isResident = profile.role === 'resident'

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [street, setStreet] = useState(profile.block_number || '')
  const [houseNumber, setHouseNumber] = useState(profile.house_number || '')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const handlePhoneChange = (value) => {
    setPhone(formatNigerianPhone(value))
    setProfileSaved(false)
  }

  const saveProfile = async () => {
    setProfileError(null)
    if (!fullName.trim()) { setProfileError('Full name cannot be empty'); return }
    if (!validatePhone(phone)) { setProfileError('Please enter a valid 11-digit phone number'); return }
    if (isResident) {
      if (!street.trim()) { setProfileError('Please enter your street'); return }
      if (!houseNumber.trim()) { setProfileError('Please enter your house number'); return }
    }

    setProfileSaving(true)

    const updatePayload = {
      full_name: fullName.trim(),
      phone,
    }
    if (isResident) {
      updatePayload.block_number = street.trim()
      updatePayload.house_number = houseNumber.replace(/\D/g, '')
    }

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', profile.id)

    if (error) {
      setProfileError('Something went wrong. Please try again.')
      setProfileSaving(false)
      return
    }

    setProfileSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const savePassword = async () => {
    setPasswordError(null)
    if (!currentPassword) { setPasswordError('Please enter your current password'); return }
    const validationError = validatePassword(newPassword)
    if (validationError) { setPasswordError(validationError); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }

    setPasswordSaving(true)

    // Supabase's "require current password" project setting checks the
    // password passed directly as `current_password` on this same call —
    // a separate signInWithPassword reauth beforehand does NOT satisfy it.
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    })

    if (error) {
      setPasswordError(error.message)
      setPasswordSaving(false)
      return
    }

    // Clears any pending "temporary password" reminder — this is now the
    // only place a temp/forced password change can actually be completed.
    // Goes through an RPC (not a direct table update) because
    // trg_enforce_safe_user_fields_upd blocks non-admins from touching
    // this column themselves, even their own row — a plain client-side
    // update here would silently affect 0 rows.
    if (profile.force_password_change) {
      const { error: clearError } = await supabase.rpc('clear_own_force_password_change')
      if (clearError) {
        console.error('Failed to clear temporary-password flag:', clearError)
      } else {
        onPasswordChanged?.()
      }
    }

    setPasswordSaving(false)
    setPasswordSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  const deleteAccount = async () => {
    setConfirmModal(null)
    setDeleteError(null)

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm')
      return
    }

    setDeleting(true)

    // Re-authenticate before this irreversible action — otherwise anyone with
    // an open session (e.g. a device left unlocked) could permanently delete
    // the account without ever knowing the password, unlike password change
    // which already requires this.
    const { data: { user } } = await supabase.auth.getUser()
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    })

    if (reauthError) {
      setDeleteError('Incorrect password')
      setDeleting(false)
      return
    }

    const { error } = await supabase.functions.invoke('delete-user', { body: { target_user_id: profile.id } })
    if (error) {
      await supabase.from('users').delete().eq('id', profile.id)
    }
    await supabase.auth.signOut()
  }

  const handleProfileKeyDown = (e) => { if (e.key === 'Enter') saveProfile() }
  const handlePasswordKeyDown = (e) => { if (e.key === 'Enter') savePassword() }

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '6px',
    border: `1.5px solid ${theme.border}`,
    fontSize: '0.9rem',
    color: theme.textPrimary,
    backgroundColor: theme.surface,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    boxSizing: 'border-box',
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: theme.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif",
    },
    header: {
      backgroundColor: theme.primary,
      padding: '1rem 1.25rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: theme.primaryText,
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      padding: 0,
      width: '60px',
      textAlign: 'left',
    },
    headerTitle: {
      fontSize: '1rem',
      fontWeight: '700',
      color: theme.primaryText,
      margin: 0,
    },
    body: {
      flex: 1,
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      maxWidth: '480px',
      width: '100%',
      alignSelf: 'center',
      boxSizing: 'border-box',
    },
    prefRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    prefLabel: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: theme.textPrimary,
      margin: 0,
    },
    prefSub: {
      fontSize: '0.78rem',
      color: theme.textMuted,
      margin: '2px 0 0 0',
      fontWeight: '500',
    },
    switchTrack: {
      width: '44px',
      height: '24px',
      borderRadius: '20px',
      backgroundColor: isDark ? theme.primary : theme.border,
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background-color 0.2s',
      flexShrink: 0,
      padding: 0,
    },
    switchThumb: {
      position: 'absolute',
      top: '2px',
      left: isDark ? '22px' : '2px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: '#FFFFFF',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    },
    fieldWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    label: {
      fontSize: '0.82rem',
      fontWeight: '600',
      color: theme.textSecondary,
    },
    eyeBtn: {
      position: 'absolute',
      right: '0.9rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      padding: '0.25rem',
    },
    errorText: {
      color: theme.danger,
      fontSize: '0.82rem',
      margin: 0,
      fontWeight: '500',
    },
    successText: {
      color: theme.success,
      fontSize: '0.82rem',
      margin: 0,
      fontWeight: '500',
    },
    dangerText: {
      fontSize: '0.85rem',
      color: theme.textSecondary,
      margin: 0,
      lineHeight: '1.6',
      fontWeight: '500',
    },
    saveBtn: {
      backgroundColor: theme.primary,
      color: theme.primaryText,
      border: 'none',
      borderRadius: '6px',
      padding: '0.85rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
    },
    deleteBtn: {
      backgroundColor: theme.dangerBg,
      color: theme.danger,
      border: `1.5px solid ${theme.dangerBorder}`,
      borderRadius: '6px',
      padding: '0.85rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
    },
    helpBtn: {
      backgroundColor: theme.surface,
      color: theme.primary,
      border: `1.5px solid ${theme.primary}`,
      borderRadius: '6px',
      padding: '0.85rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
      width: '100%',
      textAlign: 'center',
      textDecoration: 'none',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
  }

  const eyeStroke = theme.textMuted

  return (
    <div style={styles.container}>
      <style>{`input:focus { outline: none; border-color: ${theme.primary} !important; } input::placeholder { color: ${theme.textMuted}; }`}</style>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <p style={styles.headerTitle}>Settings</p>
        <div style={{ width: '60px' }} />
      </div>

      <div style={styles.body}>

        <CollapsibleSection title="Preferences" subtitle="Appearance and display">
          <div style={styles.prefRow}>
            <div>
              <p style={styles.prefLabel}>Dark mode</p>
              <p style={styles.prefSub}>{isDark ? 'Dark theme is on' : 'Light theme is on'}</p>
            </div>
            <button
              type="button"
              style={styles.switchTrack}
              onClick={() => toggleTheme(profile.id)}
              aria-label="Toggle dark mode"
            >
              <span style={styles.switchThumb} />
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Profile Details" subtitle="Name, phone, and address">
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full name</label>
            <input
              style={inputStyle}
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setProfileSaved(false) }}
              onKeyDown={handleProfileKeyDown}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Phone number</label>
            <input
              style={inputStyle}
              type="tel"
              placeholder="e.g. 0801 234 5678"
              value={phone}
              onChange={e => handlePhoneChange(e.target.value)}
              onKeyDown={handleProfileKeyDown}
            />
          </div>

          {isResident && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Street</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. Admiralty Street"
                  value={street}
                  onChange={e => { setStreet(e.target.value); setProfileSaved(false) }}
                  onKeyDown={handleProfileKeyDown}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>House number</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. 1, 2, 3"
                  value={houseNumber}
                  onChange={e => { setHouseNumber(e.target.value.replace(/\D/g, '')); setProfileSaved(false) }}
                  onKeyDown={handleProfileKeyDown}
                />
              </div>
            </>
          )}

          {profileError && <p style={styles.errorText}>{profileError}</p>}
          {profileSaved && <p style={styles.successText}>Profile updated. Some changes may need a refresh to appear elsewhere in the app.</p>}

          <button
            style={{ ...styles.saveBtn, opacity: profileSaving ? 0.7 : 1 }}
            onClick={saveProfile}
            disabled={profileSaving}
          >
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </CollapsibleSection>

        <CollapsibleSection title="Change Password" subtitle="Update your account password" defaultOpen={focusPasswordSection}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Current password</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={{ ...inputStyle, paddingRight: '3rem' }}
                placeholder="Enter your current password"
                value={currentPassword}
                showPassword={showCurrentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPasswordError(null) }}
                onKeyDown={handlePasswordKeyDown}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowCurrentPassword(p => !p)} tabIndex={-1} aria-label={showCurrentPassword ? "Hide password" : "Show password"}>
                {showCurrentPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>New password</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={{ ...inputStyle, paddingRight: '3rem' }}
                placeholder="Min. 6 characters"
                value={newPassword}
                showPassword={showPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(null) }}
                onKeyDown={handlePasswordKeyDown}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm new password</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={{ ...inputStyle, paddingRight: '3rem' }}
                placeholder="Repeat new password"
                value={confirmPassword}
                showPassword={showPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null) }}
                onKeyDown={handlePasswordKeyDown}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {passwordError && <p style={styles.errorText}>{passwordError}</p>}
          {passwordSaved && <p style={styles.successText}>Password updated successfully.</p>}

          <button
            style={{ ...styles.saveBtn, opacity: passwordSaving ? 0.7 : 1 }}
            onClick={savePassword}
            disabled={passwordSaving}
          >
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </CollapsibleSection>

        <CollapsibleSection title="Support" subtitle="Get help from our team">
          <p style={styles.dangerText}>
            Having trouble with your account or the app? Reach out and we'll get back to you.
          </p>
          <a style={styles.helpBtn} href={getSupportMailto(profile)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Need Help?
          </a>
        </CollapsibleSection>

        <CollapsibleSection title="Delete Account" subtitle="Permanently remove your account" danger>
          <p style={styles.dangerText}>
            This removes your profile from the estate app and signs you out. This cannot be undone, and you'll need to register again to regain access.
          </p>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Enter your password to confirm</label>
            <div style={styles.fieldWrap}>
              <PeekPasswordInput
                style={{ ...inputStyle, paddingRight: '3rem' }}
                placeholder="Your current password"
                value={deletePassword}
                showPassword={showDeletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(null) }}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowDeletePassword(p => !p)} tabIndex={-1} aria-label={showDeletePassword ? "Hide password" : "Show password"}>
                {showDeletePassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={eyeStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {deleteError && <p style={styles.errorText}>{deleteError}</p>}

          <button
            style={{ ...styles.deleteBtn, opacity: deletePassword ? 1 : 0.5, cursor: deletePassword ? 'pointer' : 'not-allowed' }}
            onClick={() => setConfirmModal({
              title: 'Delete Your Account',
              message: 'This will permanently remove your profile from Seliat Estate CDA. This cannot be undone.',
              onConfirm: deleteAccount,
            })}
            disabled={deleting || !deletePassword}
          >
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </button>
        </CollapsibleSection>

      </div>
    </div>
  )
}