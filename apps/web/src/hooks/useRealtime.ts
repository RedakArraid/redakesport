import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type ChangeHandler<T> = (payload: RealtimePostgresChangesPayload<T>) => void

interface RealtimeOptions<T extends Record<string, unknown>> {
  table: string
  filter?: string
  onInsert?: ChangeHandler<T>
  onUpdate?: ChangeHandler<T>
  onDelete?: ChangeHandler<T>
}

export function useRealtimeChannel<T extends Record<string, unknown>>(
  channelName: string,
  { table, filter, onInsert, onUpdate, onDelete }: RealtimeOptions<T>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const channel = supabase.channel(channelName)

    if (onInsert) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        onInsert as ChangeHandler<Record<string, unknown>>,
      )
    }
    if (onUpdate) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter },
        onUpdate as ChangeHandler<Record<string, unknown>>,
      )
    }
    if (onDelete) {
      channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter },
        onDelete as ChangeHandler<Record<string, unknown>>,
      )
    }

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, deps)
}
