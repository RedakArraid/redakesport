import React from 'react'

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Btn({ variant = 'primary', size = 'md', loading, children, disabled, style, ...props }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 999, border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.01em',
    transition: 'opacity 0.15s, background 0.15s',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
  }
  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '6px 14px' },
    md: { fontSize: 13, padding: '9px 20px' },
    lg: { fontSize: 15, padding: '12px 28px' },
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--ink)', color: '#fff' },
    secondary: { background: 'var(--mute-bg)', color: 'var(--ink)' },
    ghost: { background: 'transparent', color: 'var(--ink)' },
    danger: { background: 'var(--accent)', color: '#fff' },
  }

  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={disabled || loading} {...props}>
      {loading ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : null}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { label: string; color?: string; bg?: string }

export function Badge({ label, color = 'var(--muted)', bg = 'var(--mute-bg)' }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
      letterSpacing: 0.5, textTransform: 'uppercase',
      background: bg, color,
    }}>
      {label}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; style?: React.CSSProperties; className?: string }

export function Card({ children, style, className }: CardProps) {
  return (
    <div className={className} style={{
      background: 'var(--card)', borderRadius: 16,
      border: '1px solid var(--border)', padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)', fontWeight: 800,
      fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
      color: 'var(--muted)', marginBottom: 12, ...style,
    }}>
      {children}
    </div>
  )
}

// ── StatTile ──────────────────────────────────────────────────────────────────
export function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--ink)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// ── Toast container ───────────────────────────────────────────────────────────
import { useUIStore } from '../../stores/uiStore'

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {toasts.map((t) => (
        <div key={t.id} onClick={() => removeToast(t.id)} style={{
          padding: '12px 18px', borderRadius: 12,
          background: t.type === 'error' ? 'var(--accent)' : t.type === 'success' ? '#1a7a4a' : 'var(--ink)',
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
          maxWidth: 320,
        }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
