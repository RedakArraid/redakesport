import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Spinner } from '../components/ui'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, profile, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!profile) return <div role="alert" style={{ padding: 32 }}>Impossible de charger ton profil. <button onClick={() => window.location.reload()}>Réessayer</button></div>
  if (!profile.onboarding_completed && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
