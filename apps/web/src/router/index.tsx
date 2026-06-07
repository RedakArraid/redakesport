import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { OnboardingPage } from '../pages/auth/OnboardingPage'
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { TournamentsListPage } from '../pages/tournaments/TournamentsListPage'
import { TournamentDetailPage } from '../pages/tournaments/TournamentDetailPage'
import { TournamentCreatePage } from '../pages/tournaments/TournamentCreatePage'
import { ClubPage } from '../pages/club/ClubPage'
import { ScoresPage } from '../pages/scores/ScoresPage'
import { MatchmakingPage } from '../pages/matchmaking/MatchmakingPage'

export const router = createBrowserRouter([
  // Public auth routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  // Protected app routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Tournaments
      { path: 'tournaments', element: <TournamentsListPage /> },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      {
        path: 'tournaments/create',
        element: (
          <RoleRoute allowedRoles={['organizer']}>
            <TournamentCreatePage />
          </RoleRoute>
        ),
      },

      // Club (captain + organizer)
      {
        path: 'club',
        element: (
          <RoleRoute allowedRoles={['captain', 'organizer']}>
            <ClubPage />
          </RoleRoute>
        ),
      },

      // Scores & Matchmaking (all authenticated)
      { path: 'scores', element: <ScoresPage /> },
      { path: 'matchmaking', element: <MatchmakingPage /> },

      // Placeholder pages (Phase 2+)
      { path: 'broadcast', element: <PlaceholderPage title="Broadcast Studio" icon="📡" phase={2} /> },
      { path: 'integrations', element: <PlaceholderPage title="Intégrations" icon="🔗" phase={3} /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

function PlaceholderPage({ title, icon, phase }: { title: string; icon: string; phase: number }) {
  return (
    <div className="screen-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, marginBottom: 8 }}>{title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Disponible en Phase {phase}</div>
      </div>
    </div>
  )
}
