import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, Role } from '../types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, session: null, profile: null, isLoading: false }),
}))

export const useRole = (): Role | null => useAuthStore((s) => s.profile?.role ?? null)
export const useIsOrganizer = () => useAuthStore((s) => s.profile?.role === 'organizer')
export const useIsCaptain = () => useAuthStore((s) => s.profile?.role === 'captain' || s.profile?.role === 'organizer')
