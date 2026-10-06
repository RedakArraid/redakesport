import { useQuery } from '@tanstack/react-query'
import { db, rowsByIds } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

export function useParticipantNames(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))].sort()
  return useQuery({
    queryKey: ['participant-names', unique],
    queryFn: async () => {
      const [clubs, players] = await Promise.all([
        rowsByIds('clubs', unique, 'id,name'),
        rowsByIds('profiles', unique, 'id,username'),
      ])
      return Object.fromEntries([
        ...clubs.map((c) => [c.id, c.name]),
        ...players.map((p) => [p.id, p.username]),
      ]) as Record<string, string>
    },
    enabled: unique.length > 0,
    staleTime: 60000,
  })
}

export function useRepresentedTeams() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['represented-teams', user?.id],
    queryFn: async () => {
      const { data, error } = await db.from('clubs').select('id').eq('captain_id', user!.id)
      if (error) throw error
      return [user!.id, ...data.map((c) => c.id)]
    },
    enabled: !!user,
  })
}
