import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

import { LandingPage } from '../pages/landing/LandingPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { OnboardingPage } from '../pages/auth/OnboardingPage'
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { TournamentsListPage } from '../pages/tournaments/TournamentsListPage'
import { TournamentDetailPage } from '../pages/tournaments/TournamentDetailPage'
import { TournamentCreatePage } from '../pages/tournaments/TournamentCreatePage'
import { BracketPage } from '../pages/tournaments/BracketPage'
import { StandingsPage } from '../pages/tournaments/StandingsPage'
import { MatchDetailPage } from '../pages/matches/MatchDetailPage'
import { ClubPage } from '../pages/club/ClubPage'
import { ScoresPage } from '../pages/scores/ScoresPage'
import { MatchmakingPage } from '../pages/matchmaking/MatchmakingPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { AnalyticsPage } from '../pages/tournaments/AnalyticsPage'
import { GroupsPage } from '../pages/tournaments/GroupsPage'
import { CalendarPage } from '../pages/calendar/CalendarPage'
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage'
import { BroadcastPage } from '../pages/broadcast/BroadcastPage'
import { IntegrationsPage } from '../pages/integrations/IntegrationsPage'
import { AdminPage } from '../pages/admin/AdminPage'

export const router = createBrowserRouter([
  // Public routes (with Header and Footer)
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'tournaments', element: <TournamentsListPage /> },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      { path: 'tournaments/:id/bracket', element: <BracketPage /> },
      { path: 'tournaments/:id/standings', element: <StandingsPage /> },
      { path: 'tournaments/:id/groups', element: <GroupsPage /> },
    ],
  },

  // Protected app routes
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },

      // Tournaments — static routes BEFORE dynamic :id
      { path: 'tournaments', element: <TournamentsListPage /> },
      {
        path: 'tournaments/create',
        element: (
          <RoleRoute allowedRoles={['organizer']}>
            <TournamentCreatePage />
          </RoleRoute>
        ),
      },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      { path: 'tournaments/:id/bracket', element: <BracketPage /> },
      { path: 'tournaments/:id/standings', element: <StandingsPage /> },
      { path: 'tournaments/:id/groups', element: <GroupsPage /> },
      { path: 'tournaments/:id/analytics', element: <AnalyticsPage /> },

      // Matches
      { path: 'matches/:id', element: <MatchDetailPage /> },

      // Club
      { path: 'club', element: <ClubPage /> },

      // Scores & Matchmaking
      { path: 'scores', element: <ScoresPage /> },
      { path: 'matchmaking', element: <MatchmakingPage /> },

      // Calendar & Leaderboard
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },

      // Phase 2+3 complete pages
      { path: 'broadcast', element: <BroadcastPage /> },
      { path: 'integrations', element: <IntegrationsPage /> },
      {
        path: 'admin',
        element: (
          <RoleRoute allowedRoles={['organizer']}>
            <AdminPage />
          </RoleRoute>
        ),
      },
    ],
  },

  // Legacy redirect: /dashboard → /app/dashboard
  { path: '/dashboard', element: <Navigate to="/app/dashboard" replace /> },
  { path: '/club', element: <Navigate to="/app/club" replace /> },
  { path: '/scores', element: <Navigate to="/app/scores" replace /> },
  { path: '/matchmaking', element: <Navigate to="/app/matchmaking" replace /> },
  { path: '/profile', element: <Navigate to="/app/profile" replace /> },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
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
