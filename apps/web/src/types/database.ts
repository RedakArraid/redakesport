export type Role = 'player' | 'captain' | 'organizer'
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'hybrid'
export type TournamentStatus = 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled'
export type MatchStatus = 'pending' | 'live' | 'completed' | 'disputed' | 'forfeit'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type SubmissionStatus = 'pending' | 'confirmed' | 'disputed'
export type StreamPlatform = 'twitch' | 'youtube' | 'kick' | 'custom'
export type BroadcastStatus = 'offline' | 'live' | 'ended'
export type MediaType = 'screenshot' | 'clip' | 'avatar' | 'logo' | 'banner'
export type ClubMemberRole = 'captain' | 'coach' | 'player' | 'substitute'
export type QueueType = 'solo' | 'team'
export type CasterRole = 'commentator' | 'analyst' | 'host'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: Role
  elo_rating: number
  country: string | null
  bio: string | null
  discord_tag: string | null
  twitch_url: string | null
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  name: string
  slug: string
  icon_url: string | null
  is_active: boolean
}

export interface Club {
  id: string
  name: string
  slug: string
  logo_url: string | null
  banner_url: string | null
  captain_id: string | null
  game_id: string | null
  elo_rating: number
  region: string | null
  description: string | null
  is_verified: boolean
  created_at: string
}

export interface ClubMember {
  club_id: string
  player_id: string
  role: ClubMemberRole
  jersey_number: number | null
  joined_at: string
}

export interface ClubApplication {
  id: string
  club_id: string
  player_id: string
  status: ApplicationStatus
  message: string | null
  applied_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface Tournament {
  id: string
  name: string
  slug: string
  organizer_id: string | null
  game_id: string | null
  format: TournamentFormat
  status: TournamentStatus
  max_teams: number | null
  team_size: number
  prize_pool: { total: number; currency: string; distribution: { place: number; amount: number }[] } | null
  rules: string | null
  start_date: string | null
  end_date: string | null
  registration_deadline: string | null
  is_public: boolean
  region: string | null
  streams: { platform: string; url: string; language: string }[] | null
  settings: Record<string, unknown> | null
  created_at: string
}

export interface TournamentRegistration {
  id: string
  tournament_id: string
  club_id: string | null
  player_id: string | null
  status: ApplicationStatus
  seed: number | null
  registered_at: string
}

export interface Group {
  id: string
  tournament_id: string
  name: string
  stage: number
}

export interface Match {
  id: string
  tournament_id: string
  group_id: string | null
  round: number | null
  match_number: number | null
  bracket_position: { side: 'winners' | 'losers'; round: number; position: number } | null
  team1_id: string | null
  team2_id: string | null
  team1_type: 'club' | 'player'
  team2_type: 'club' | 'player'
  winner_id: string | null
  loser_id: string | null
  score_team1: number
  score_team2: number
  status: MatchStatus
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  best_of: number
  next_match_id: string | null
  loser_match_id: string | null
  map_pool: { map: string; score1: number; score2: number }[] | null
  vod_url: string | null
  notes: string | null
  created_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  event_type: string
  team_id: string | null
  player_id: string | null
  data: Record<string, unknown> | null
  occurred_at: string
}

export interface ScoreSubmission {
  id: string
  match_id: string
  submitted_by: string
  team_id: string | null
  score_team1: number
  score_team2: number
  screenshot_urls: string[]
  status: SubmissionStatus
  submitted_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string | null
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface EloHistory {
  id: string
  player_id: string | null
  club_id: string | null
  match_id: string | null
  old_rating: number
  new_rating: number
  delta: number
  recorded_at: string
}

// Supabase Database type shape for the client
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      games: { Row: Game; Insert: Partial<Game>; Update: Partial<Game> }
      clubs: { Row: Club; Insert: Partial<Club>; Update: Partial<Club> }
      club_members: { Row: ClubMember; Insert: Partial<ClubMember>; Update: Partial<ClubMember> }
      club_applications: { Row: ClubApplication; Insert: Partial<ClubApplication>; Update: Partial<ClubApplication> }
      tournaments: { Row: Tournament; Insert: Partial<Tournament>; Update: Partial<Tournament> }
      tournament_registrations: { Row: TournamentRegistration; Insert: Partial<TournamentRegistration>; Update: Partial<TournamentRegistration> }
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> }
      matches: { Row: Match; Insert: Partial<Match>; Update: Partial<Match> }
      match_events: { Row: MatchEvent; Insert: Partial<MatchEvent>; Update: Partial<MatchEvent> }
      score_submissions: { Row: ScoreSubmission; Insert: Partial<ScoreSubmission>; Update: Partial<ScoreSubmission> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      elo_history: { Row: EloHistory; Insert: Partial<EloHistory>; Update: Partial<EloHistory> }
    }
  }
}
