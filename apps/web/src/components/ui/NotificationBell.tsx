import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useRealtimeChannel } from '../../hooks/useRealtime'
import { useUIStore } from '../../stores/uiStore'
import type { Notification } from '../../types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function NotificationBell() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
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
  useRealtimeChannel(
    `notifications:${user?.id}`,
    {
      table: 'notifications',
      filter: `user_id=eq.${user?.id}`,
      onInsert: (payload) => {
        const n = payload.new as Notification
        addToast('info', n.title ?? n.body ?? 'Nouvelle notification')
        qc.invalidateQueries({ queryKey: ['notifications', user?.id] })
      },
    },
    [user?.id],
  )

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })

  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unread > 0) markAllRead.mutate() }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, transition: 'background 0.15s',
        }}
        title="Notifications"
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--accent)', color: '#fff',
            width: 16, height: 16, borderRadius: '50%',
            fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          {/* Panel */}
          <div style={{
            position: 'absolute', bottom: '110%', left: 0,
            width: 320, maxHeight: 420, overflowY: 'auto',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 100,
          }}>
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              Notifications
              {unread > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }}
                  onClick={() => markAllRead.mutate()}>
                  Tout marquer lu
                </span>
              )}
            </div>
            {!notifications || notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Aucune notification
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'transparent' : 'rgba(37,71,255,0.03)',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                    {n.title}
                  </div>
                  {n.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(n.created_at), 'd MMM HH:mm', { locale: fr })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
