import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '../ui'
import { Brand } from '../ui/Brand'
export function AppLayout() {
  const [menu, setMenu] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)
  const menuOpen = mobile && menu

  const closeMenu = () => {
    setMenu(false)
    if (mobile) menuButton.current?.focus()
  }

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)')
    const change = () => {
      setMobile(query.matches)
      setMenu(false)
    }
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebar.current?.querySelector<HTMLElement>('a')?.focus()
    const keyboard = (event: KeyboardEvent) => {
      // A notification dialog handles its own keyboard navigation above the drawer.
      if (document.querySelector('[role="dialog"]')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenu(false)
        menuButton.current?.focus()
      }
      if (event.key === 'Tab') {
        const targets = [header.current, sidebar.current].flatMap((container) =>
          Array.from(
            container?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? [],
          ),
        )
        const first = targets[0],
          last = targets.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', keyboard)
    }
  }, [menuOpen])

  return (
    <div className="app-layout">
      <header className="mobile-header" ref={header}>
        <Link to="/app/dashboard" className="brand-link" onClick={closeMenu}>
          <Brand />
        </Link>
        <button
          ref={menuButton}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenu(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>
      {menuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Fermer le menu"
          tabIndex={-1}
          onClick={closeMenu}
        />
      )}
      <div
        id="app-navigation"
        ref={sidebar}
        className={`sidebar-wrap ${menuOpen ? 'is-open' : ''}`}
        inert={mobile && !menuOpen}
      >
        <Sidebar onNavigate={closeMenu} />
      </div>
      <main className="app-main" inert={menuOpen}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
