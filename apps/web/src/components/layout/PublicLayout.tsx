import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Btn, ToastContainer } from '../ui'
import { Brand } from '../ui/Brand'

export function PublicLayout() {
  const { user } = useAuthStore()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      {/* Header / Nav */}
      <nav
        className="public-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 100,
        }}
      >
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
          <Link className="public-tournaments-link" to="/tournaments">
            Tournois
          </Link>
          {user ? (
            <Link to="/app/dashboard">
              <Btn size="sm">Tableau de bord</Btn>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Btn variant="ghost" size="sm">
                  Connexion
                </Btn>
              </Link>
              <Link to="/register">
                <Btn size="sm">S'inscrire</Btn>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="public-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      <ToastContainer />
      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Link to="/" className="brand-link">
          <Brand size="sm" />
        </Link>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Redak eSport · Tous droits réservés
        </span>
      </footer>
    </div>
  )
}
