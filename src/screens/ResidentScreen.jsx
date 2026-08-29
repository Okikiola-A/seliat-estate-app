import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import NotificationBell from '../components/NotificationBell'
import AvatarMenu from '../components/AvatarMenu'
import PasswordReminderBanner from '../components/PasswordReminderBanner'
import OwnCodeCard from '../components/OwnCodeCard'
import { capitalizeName } from '../utils/helpers'

export default function ResidentScreen({ profile, showPasswordReminder, onSnoozeReminder }) {
  const { theme } = useTheme()
  const navigate = useNavigate()

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
      padding: '0 1.25rem',
      height: '64px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 150,
      boxSizing: 'border-box',
    },
    headerName: {
      fontSize: '1rem',
      fontWeight: '700',
      color: theme.primaryText,
      margin: 0,
      minWidth: 0,
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      flexShrink: 0,
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
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <p style={styles.headerName} title={capitalizeName(profile.full_name)}>{capitalizeName(profile.full_name)}</p>
        <div style={styles.headerActions}>
          <NotificationBell userId={profile.id} />
          <AvatarMenu
            name={capitalizeName(profile.full_name)}
            subtitle={`${profile.block_number}, House ${profile.house_number}`}
            onSettingsClick={() => navigate('/resident/settings')}
          />
        </div>
      </div>

      {showPasswordReminder && (
        <PasswordReminderBanner onChangePassword={() => navigate('/resident/settings?focus=password')} onSnooze={onSnoozeReminder} />
      )}

      <div style={styles.body}>
        <OwnCodeCard profile={profile} />
      </div>
    </div>
  )
}