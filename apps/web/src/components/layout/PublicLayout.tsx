import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Btn } from '../ui'

export function PublicLayout() {
  const { user } = useAuthStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header / Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100,
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>
            <span style={{ color: 'var(--accent)' }}>Redak</span> Esport
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {user ? (
            <Link to="/app/dashboard"><Btn size="sm">Tableau de bord</Btn></Link>
          ) : (
            <>
              <Link to="/login"><Btn variant="ghost" size="sm">Connexion</Btn></Link>
              <Link to="/register"><Btn size="sm">S'inscrire</Btn></Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15 }}>
            <span style={{ color: 'var(--accent)' }}>Redak</span> Esport
          </span>
        </Link>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>© 2026 Redak Esport · Tous droits réservés</span>
      </footer>
    </div>
  )
}
