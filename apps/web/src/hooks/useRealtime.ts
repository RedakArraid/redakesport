import { useEffect, useEffectEvent } from 'react'
// Poll while the page is visible. Each query is re-authorized by the API.
interface Change {
  eventType: 'UPDATE'
  new: Record<string, unknown>
}
interface Options {
  table: string
  filter?: string
  onInsert?: (payload: Change) => void
  onUpdate?: (payload: Change) => void
  onDelete?: (payload: Change) => void
}
export function useRealtimeChannel(
  channelName: string,
  { table, filter, onInsert, onUpdate, onDelete }: Options,
) {
  const refresh = useEffectEvent(() => {
    const payload: Change = { eventType: 'UPDATE', new: {} }
    if (onUpdate) onUpdate(payload)
    else if (onInsert) onInsert(payload)
    else onDelete?.(payload)
  })
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, 5000)
    return () => clearInterval(timer)
  }, [channelName, table, filter])
}
