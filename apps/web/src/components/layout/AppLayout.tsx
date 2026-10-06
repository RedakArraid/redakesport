import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '../ui'
import { Brand } from '../ui/Brand'
export function AppLayout() {
  const [menu, setMenu] = useState(false)
  return (
    <div className="app-layout">
      <header className="mobile-header">
        <Link to="/app/dashboard" className="brand-link" onClick={() => setMenu(false)}>
          <Brand />
        </Link>
        <button
          aria-label={menu ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
      </header>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className={`sidebar-wrap ${menu ? 'is-open' : ''}`}>
        <Sidebar onNavigate={() => setMenu(false)} />
      </div>
      <main className="app-main">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
