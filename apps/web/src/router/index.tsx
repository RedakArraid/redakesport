import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PublicLayout } from '../components/layout/PublicLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

import { RouteError } from './RouteError'
import { PasswordPage } from '../pages/auth/PasswordPage'
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
import { LobbyPage } from '../pages/matchmaking/LobbyPage'
import { MatchmakingPage } from '../pages/matchmaking/MatchmakingPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { AnalyticsPage } from '../pages/tournaments/AnalyticsPage'
import { GroupsPage } from '../pages/tournaments/GroupsPage'
import { CalendarPage } from '../pages/calendar/CalendarPage'
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage'
import { OverlayPage } from '../pages/broadcast/OverlayPage'
import { BroadcastPage } from '../pages/broadcast/BroadcastPage'
import { IntegrationsPage } from '../pages/integrations/IntegrationsPage'
import { AdminPage } from '../pages/admin/AdminPage'

export const router = createBrowserRouter([
  { path: '/overlay/:id', element: <OverlayPage /> },
  // Public routes (with Header and Footer)
  {
    path: '/',
    errorElement: <RouteError />,
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <PasswordPage /> },
      { path: 'reset-password', element: <PasswordPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'onboarding', element: <ProtectedRoute><OnboardingPage /></ProtectedRoute> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'tournaments', element: <TournamentsListPage /> },
      { path: 'matches/:id', element: <MatchDetailPage /> },
      { path: 'tournaments/:id', element: <TournamentDetailPage /> },
      { path: 'tournaments/:id/bracket', element: <BracketPage /> },
      { path: 'tournaments/:id/standings', element: <StandingsPage /> },
      { path: 'tournaments/:id/groups', element: <GroupsPage /> },
    ],
  },

  // Protected app routes
  {
    path: '/app',
    errorElement: <RouteError />,
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
      { path: 'lobbies/:id', element: <LobbyPage /> },

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
