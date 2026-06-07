import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import type { Role } from '../types/database'

interface RoleRouteProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const role = useAuthStore((s) => s.profile?.role)
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
