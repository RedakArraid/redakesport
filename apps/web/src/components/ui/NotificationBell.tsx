import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import type { Notification } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const root = document.getElementById('root')
    const wasInert = root?.inert ?? false
    if (root) root.inert = true
    const button = trigger.current
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
      if (event.key === 'Tab') {
        const targets = Array.from(
          panel.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? [],
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
      window.removeEventListener('keydown', keyboard)
      if (root) root.inert = wasInert
      if (button?.isConnected && !button.closest('[inert]')) button.focus()
    }
  }, [open])

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user,
  })

  // Realtime: pop toast + refresh on new notification
  useRealtimeChannel(`notifications:${user?.id}`, {
    table: 'notifications',
    filter: `user_id=eq.${user?.id}`,
    onInsert: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })

  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={trigger}
        onClick={() => {
          setOpen((o) => !o)
          if (!open && unread > 0) markAllRead.mutate()
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          transition: 'background 0.15s',
        }}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls="notifications-panel"
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'var(--accent)',
              color: '#fff',
              width: 16,
              height: 16,
              borderRadius: '50%',
              fontSize: 9,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#0002' }}
              onClick={() => setOpen(false)}
            />
            {/* Panel */}
            <div
              ref={panel}
              id="notifications-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              style={{
                position: 'fixed',
                bottom: 88,
                left: 16,
                width: 'min(360px, calc(100vw - 32px))',
                maxHeight: 'min(420px, calc(100dvh - 160px))',
                overflowY: 'auto',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 301,
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                Notifications
                <button
                  autoFocus
                  onClick={() => setOpen(false)}
                  aria-label="Fermer les notifications"
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 6 }}
                >
                  ✕
                </button>
                {unread > 0 && (
                  <button
                    type="button"
                    disabled={markAllRead.isPending}
                    style={{
                      border: 0,
                      background: 'transparent',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => markAllRead.mutate()}
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              {!notifications || notifications.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  Aucune notification
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={
                      typeof n.data?.match_id === 'string'
                        ? `/app/matches/${n.data.match_id}`
                        : typeof n.data?.tournament_id === 'string'
                          ? `/app/tournaments/${n.data.tournament_id}`
                          : typeof n.data?.party_id === 'string'
                            ? `/app/lobbies/${n.data.party_id}`
                            : '/app/club'
                    }
                    onClick={() => {
                      setOpen(false)
                      onNavigate?.()
                    }}
                    style={{
                      display: 'block',
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border)',
                      background: n.is_read ? 'transparent' : 'rgba(37,71,255,0.03)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 2,
                      }}
                    >
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {n.body}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        marginTop: 4,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {format(new Date(n.created_at), 'd MMM HH:mm', { locale: fr })}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
