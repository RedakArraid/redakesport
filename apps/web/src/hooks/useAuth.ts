import { useEffect } from 'react'
import type { Session } from '../lib/api'
import { db } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'

export async function refreshProfile() {
  const id = useAuthStore.getState().user?.id
  if (!id) return
  const { data, error } = await db.from('profiles').select('*').eq('id', id).single()
  if (!error && useAuthStore.getState().user?.id === id) useAuthStore.getState().setProfile(data)
}

export function useAuthInit() {
  useEffect(() => {
    let active = true
    let revision = 0
    let lastUser: string | null | undefined
    const sync = async (session: Session | null) => {
      const token = ++revision
      const state = useAuthStore.getState()
      if (lastUser !== session?.user.id) {
        queryClient.clear()
        state.setProfile(null)
      }
      lastUser = session?.user.id
      state.setSession(session)
      state.setLoading(true)
      try {
        if (!session) {
          state.setProfile(null)
          return
        }
        const { data, error } = await db
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (!active || token !== revision) return
        if (error) {
          state.setProfile(null)
          return
        }
        state.setProfile(data)
      } finally {
        if (active && token === revision) state.setLoading(false)
      }
    }
    // Wait for the auth event to finish before loading the profile.
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) void sync(session)
      })
    })
    const refresh = () => {
      if (!document.hidden) void refreshProfile()
    }
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      subscription.unsubscribe()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
}
export function signInWithEmail(email: string, password: string) {
  return db.auth.signInWithPassword({ email, password })
}
export function signUpWithEmail(email: string, password: string, username: string) {
  return db.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: `${window.location.origin}/auth/callback` },
  })
}
export function signInWithDiscord() {
  return db.auth.signInWithOAuth()
}
export async function signOut() {
  const result = await db.auth.signOut()
  if (!result.error) {
    queryClient.clear()
    useAuthStore.getState().reset()
  }
  return result
}
