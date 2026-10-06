import { useQuery } from '@tanstack/react-query'
import { request } from '../lib/api'

interface AuthConfig {
  discordEnabled: boolean
  passwordResetEnabled: boolean
}

export function useAuthConfig(enabled = true) {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: async () => {
      const result = await request<AuthConfig>('/config')
      if (result.error) throw result.error
      return result.data
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}
