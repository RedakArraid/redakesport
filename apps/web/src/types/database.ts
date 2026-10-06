export type Role = 'player' | 'captain' | 'organizer'
export type TournamentFormat =
  'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'hybrid'
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
  onboarding_completed: boolean
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
  best_of: number
  max_teams: number | null
  team_size: number
  prize_pool: {
    total: number
    currency: string
    distribution: { place: number; amount: number }[]
  } | null
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
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
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
  bracket_position: {
    side: 'winners' | 'losers' | 'grand_final' | 'reset' | 'group' | 'swiss'
    round: number
    position: number
  } | null
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
  result_kind: 'played' | 'forfeit'
  forfeit_reason: string | null
  next_match_slot: number | null
  loser_match_slot: number | null
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

export interface GroupMember {
  group_id: string
  club_id: string | null
  player_id: string | null
}
export interface Standing {
  buchholz: number
  sonneborn_berger: number | string
  tournament_id: string
  group_id: string | null
  team_id: string
  team_type: string
  position: number | null
  wins: number
  losses: number
  draws: number
  points: number
  map_wins: number
  map_losses: number
  updated_at: string
}
export interface QueueEntry {
  id: string
  player_id: string
  game_id: string | null
  elo_rating: number
  region: string | null
  queue_type: QueueType
  party_id: string | null
  status: 'searching' | 'found' | 'matched'
  joined_at: string
}
export interface Lobby {
  id: string
  game_id: string | null
  match_id: string | null
  status: 'forming' | 'ready' | 'cancelled'
  team1_player_ids: string[]
  team2_player_ids: string[]
  ready_player_ids: string[]
  server_info: Record<string, unknown> | null
  created_at: string
}
export interface BroadcastSession {
  id: string
  match_id: string | null
  tournament_id: string | null
  organizer_id: string
  title: string
  platform: StreamPlatform
  stream_key: string | null
  rtmp_url: string | null
  overlay_config: Record<string, unknown> | null
  status: BroadcastStatus
  started_at: string | null
  ended_at: string | null
  vod_url: string | null
  viewer_count: number
  created_at: string
}
export interface DiscordIntegration {
  id: string
  user_id: string
  club_id: string | null
  tournament_id: string | null
  guild_id: string
  channel_id: string | null
  webhook_url: string | null
  settings: Record<string, unknown> | null
  created_at: string
}
export interface MediaUpload {
  id: string
  uploader_id: string
  match_id: string | null
  type: MediaType
  storage_path: string
  public_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type Relationship<N extends string, C extends string, T extends string> = {
  foreignKeyName: N
  columns: [C]
  isOneToOne: false
  referencedRelation: T
  referencedColumns: ['id']
}
type Table<
  T,
  R extends {
    foreignKeyName: string
    columns: string[]
    isOneToOne: boolean
    referencedRelation: string
    referencedColumns: string[]
  }[] = [],
> = { Row: { [K in keyof T]: T[K] }; Insert: Partial<T>; Update: Partial<T>; Relationships: R }
export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>
      games: Table<Game>
      clubs: Table<
        Club,
        [
          Relationship<'clubs_game_id_fkey', 'game_id', 'games'>,
          Relationship<'clubs_captain_id_fkey', 'captain_id', 'profiles'>,
        ]
      >
      club_members: Table<
        ClubMember,
        [
          Relationship<'club_members_club_id_fkey', 'club_id', 'clubs'>,
          Relationship<'club_members_player_id_fkey', 'player_id', 'profiles'>,
        ]
      >
      club_applications: Table<
        ClubApplication,
        [Relationship<'club_applications_player_id_fkey', 'player_id', 'profiles'>]
      >
      tournaments: Table<Tournament, [Relationship<'tournaments_game_id_fkey', 'game_id', 'games'>]>
      tournament_registrations: Table<
        TournamentRegistration,
        [
          Relationship<'tournament_registrations_club_id_fkey', 'club_id', 'clubs'>,
          Relationship<'tournament_registrations_player_id_fkey', 'player_id', 'profiles'>,
        ]
      >
      groups: Table<Group>
      group_members: Table<GroupMember>
      matches: Table<
        Match,
        [Relationship<'matches_tournament_id_fkey', 'tournament_id', 'tournaments'>]
      >
      match_events: Table<MatchEvent>
      score_submissions: Table<
        ScoreSubmission,
        [Relationship<'score_submissions_match_id_fkey', 'match_id', 'matches'>]
      >
      standings: Table<Standing>
      matchmaking_queue: Table<QueueEntry>
      lobbies: Table<Lobby>
      broadcast_sessions: Table<BroadcastSession>
      discord_integrations: Table<DiscordIntegration>
      notifications: Table<Notification>
      elo_history: Table<EloHistory>
      media_uploads: Table<MediaUpload>
    }
    Views: Record<never, never>
    Functions: {
      complete_onboarding: { Args: { p_role: Role; p_country: string | null }; Returns: Profile }
      create_club: {
        Args: { p_name: string; p_region: string | null; p_description: string | null }
        Returns: Club
      }
      review_application: { Args: { p_id: string; p_accept: boolean }; Returns: undefined }
      register_tournament: {
        Args: { p_tournament_id: string; p_club_id?: string | null }
        Returns: string
      }
      review_registration: { Args: { p_id: string; p_approve: boolean }; Returns: undefined }
      withdraw_registration: { Args: { p_id: string }; Returns: undefined }
      submit_score: {
        Args: { p_match_id: string; p_score1: number; p_score2: number; p_screenshots?: string[] }
        Returns: { status: SubmissionStatus }
      }
      forfeit_match: {
        Args: { p_match_id: string; p_loser_id: string; p_reason: string }
        Returns: undefined
      }
      resolve_score: {
        Args: { p_match_id: string; p_score1: number; p_score2: number }
        Returns: undefined
      }
      join_queue: { Args: { p_game_id: string }; Returns: undefined }
      matchmaking_tick: { Args: Record<never, never>; Returns: number }
      lobby_ready: { Args: { p_id: string }; Returns: string | null }
      cancel_lobby: { Args: { p_id: string }; Returns: undefined }
    }
  }
}
