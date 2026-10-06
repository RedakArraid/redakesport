import { roleLabels } from '../../lib/labels'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import { NotificationBell } from '../ui/NotificationBell'
import { Brand } from '../ui/Brand'

interface NavItem {
  label: string
  path: string
  icon: string
  exact?: boolean
}

const NAV: NavItem[] = [
  { label: 'Tableau de bord', path: '/app/dashboard', icon: '⬡' },
  { label: 'Tournois', path: '/app/tournaments', icon: '🏆' },
  { label: 'Mon Club', path: '/app/club', icon: '🛡' },
  { label: 'Scores', path: '/app/scores', icon: '✔' },
  { label: 'Matchmaking', path: '/app/matchmaking', icon: '⚔' },
  { label: 'Calendrier', path: '/app/calendar', icon: '📅' },
  { label: 'Classement', path: '/app/leaderboard', icon: '🏅' },
  { label: 'Diffusions', path: '/app/broadcast', icon: '📡' },
  { label: 'Intégrations', path: '/app/integrations', icon: '🔗' },
  { label: 'Organisation', path: '/app/admin', icon: '⚙' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className="sidebar"
      style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '4px 8px 16px', marginBottom: 8 }}>
        <Link to="/app/dashboard" className="brand-link" onClick={onNavigate}>
          <Brand />
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.filter((item) => item.path !== '/app/admin' || profile?.role === 'organizer').map(
          (item) => (
            <NavLink
              key={item.path}
              onClick={onNavigate}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.path === '/app/club' && profile?.role === 'organizer' ? 'Clubs' : item.label}
            </NavLink>
          ),
        )}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar → link to profile */}
          <button
            aria-label="Mon profil"
            onClick={() => {
              onNavigate?.()
              navigate('/app/profile')
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--mute-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {profile?.username?.[0]?.toUpperCase() ?? '?'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile?.display_name ?? profile?.username ?? 'Joueur'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {profile ? roleLabels[profile.role] : ''}
            </div>
          </div>

          <NotificationBell onNavigate={onNavigate} />

          <button
            onClick={handleSignOut}
            title="Déconnexion"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 16,
              padding: 4,
              borderRadius: 6,
            }}
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
