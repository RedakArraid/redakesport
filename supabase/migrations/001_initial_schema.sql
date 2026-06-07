-- ============================================================
-- Redak Esport — Initial Schema
-- ============================================================

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text UNIQUE NOT NULL,
  display_name  text,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'player' CHECK (role IN ('player','captain','organizer')),
  elo_rating    integer NOT NULL DEFAULT 1000,
  country       text,
  bio           text,
  discord_tag   text,
  twitch_url    text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- GAMES
CREATE TABLE IF NOT EXISTS games (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  icon_url    text,
  is_active   boolean DEFAULT true
);

-- CLUBS
CREATE TABLE IF NOT EXISTS clubs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  logo_url     text,
  banner_url   text,
  captain_id   uuid REFERENCES profiles(id),
  game_id      uuid REFERENCES games(id),
  elo_rating   integer DEFAULT 1000,
  region       text,
  description  text,
  is_verified  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- CLUB MEMBERS
CREATE TABLE IF NOT EXISTS club_members (
  club_id       uuid REFERENCES clubs(id) ON DELETE CASCADE,
  player_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role          text DEFAULT 'player' CHECK (role IN ('captain','coach','player','substitute')),
  jersey_number integer,
  joined_at     timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, player_id)
);

-- CLUB APPLICATIONS
CREATE TABLE IF NOT EXISTS club_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,
  player_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  message     text,
  applied_at  timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  slug                   text UNIQUE NOT NULL,
  organizer_id           uuid REFERENCES profiles(id),
  game_id                uuid REFERENCES games(id),
  format                 text NOT NULL CHECK (format IN ('single_elimination','double_elimination','round_robin','swiss','hybrid')),
  status                 text DEFAULT 'draft' CHECK (status IN ('draft','registration','ongoing','completed','cancelled')),
  max_teams              integer,
  team_size              integer DEFAULT 5,
  prize_pool             jsonb,
  rules                  text,
  start_date             timestamptz,
  end_date               timestamptz,
  registration_deadline  timestamptz,
  is_public              boolean DEFAULT true,
  region                 text,
  streams                jsonb,
  settings               jsonb,
  created_at             timestamptz DEFAULT now()
);

-- TOURNAMENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  club_id        uuid REFERENCES clubs(id),
  player_id      uuid REFERENCES profiles(id),
  status         text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  seed           integer,
  registered_at  timestamptz DEFAULT now()
);

-- GROUPS
CREATE TABLE IF NOT EXISTS groups (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  name           text NOT NULL,
  stage          integer DEFAULT 1
);

-- GROUP MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
  group_id   uuid REFERENCES groups(id) ON DELETE CASCADE,
  club_id    uuid REFERENCES clubs(id),
  player_id  uuid REFERENCES profiles(id)
);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  group_id          uuid REFERENCES groups(id),
  round             integer,
  match_number      integer,
  bracket_position  jsonb,
  team1_id          uuid,
  team2_id          uuid,
  team1_type        text DEFAULT 'club' CHECK (team1_type IN ('club','player')),
  team2_type        text DEFAULT 'club',
  winner_id         uuid,
  loser_id          uuid,
  score_team1       integer DEFAULT 0,
  score_team2       integer DEFAULT 0,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','live','completed','disputed','forfeit')),
  scheduled_at      timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  best_of           integer DEFAULT 1,
  next_match_id     uuid REFERENCES matches(id),
  loser_match_id    uuid REFERENCES matches(id),
  map_pool          jsonb,
  vod_url           text,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

-- MATCH EVENTS (live timeline)
CREATE TABLE IF NOT EXISTS match_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid REFERENCES matches(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  team_id      uuid,
  player_id    uuid REFERENCES profiles(id),
  data         jsonb,
  occurred_at  timestamptz DEFAULT now()
);

-- SCORE SUBMISSIONS
CREATE TABLE IF NOT EXISTS score_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         uuid REFERENCES matches(id) ON DELETE CASCADE,
  submitted_by     uuid REFERENCES profiles(id),
  team_id          uuid,
  score_team1      integer,
  score_team2      integer,
  screenshot_urls  text[],
  status           text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','disputed')),
  submitted_at     timestamptz DEFAULT now()
);

-- STANDINGS
CREATE TABLE IF NOT EXISTS standings (
  tournament_id  uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  group_id       uuid REFERENCES groups(id),
  team_id        uuid NOT NULL,
  team_type      text DEFAULT 'club',
  position       integer,
  wins           integer DEFAULT 0,
  losses         integer DEFAULT 0,
  draws          integer DEFAULT 0,
  points         integer DEFAULT 0,
  map_wins       integer DEFAULT 0,
  map_losses     integer DEFAULT 0,
  updated_at     timestamptz DEFAULT now(),
  PRIMARY KEY (tournament_id, team_id)
);

-- MATCHMAKING QUEUE
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  game_id     uuid REFERENCES games(id),
  elo_rating  integer,
  region      text,
  queue_type  text DEFAULT 'solo' CHECK (queue_type IN ('solo','team')),
  party_id    uuid,
  status      text DEFAULT 'searching' CHECK (status IN ('searching','found','matched')),
  joined_at   timestamptz DEFAULT now()
);

-- LOBBIES
CREATE TABLE IF NOT EXISTS lobbies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           uuid REFERENCES games(id),
  status            text DEFAULT 'forming' CHECK (status IN ('forming','ready','cancelled')),
  team1_player_ids  uuid[],
  team2_player_ids  uuid[],
  server_info       jsonb,
  created_at        timestamptz DEFAULT now()
);

-- BROADCAST SESSIONS
CREATE TABLE IF NOT EXISTS broadcast_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid REFERENCES matches(id),
  tournament_id   uuid REFERENCES tournaments(id),
  organizer_id    uuid REFERENCES profiles(id),
  title           text,
  platform        text CHECK (platform IN ('twitch','youtube','kick','custom')),
  stream_key      text,
  rtmp_url        text,
  overlay_config  jsonb,
  status          text DEFAULT 'offline' CHECK (status IN ('offline','live','ended')),
  started_at      timestamptz,
  ended_at        timestamptz,
  vod_url         text,
  viewer_count    integer DEFAULT 0
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text,
  body        text,
  data        jsonb,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- DISCORD INTEGRATIONS
CREATE TABLE IF NOT EXISTS discord_integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid REFERENCES clubs(id),
  tournament_id   uuid REFERENCES tournaments(id),
  guild_id        text NOT NULL,
  channel_id      text,
  webhook_url     text,
  settings        jsonb,
  created_at      timestamptz DEFAULT now()
);

-- ELO HISTORY
CREATE TABLE IF NOT EXISTS elo_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    uuid REFERENCES profiles(id),
  club_id      uuid REFERENCES clubs(id),
  match_id     uuid REFERENCES matches(id),
  old_rating   integer,
  new_rating   integer,
  delta        integer,
  recorded_at  timestamptz DEFAULT now()
);

-- MEDIA UPLOADS
CREATE TABLE IF NOT EXISTS media_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id   uuid REFERENCES profiles(id),
  match_id      uuid REFERENCES matches(id),
  type          text CHECK (type IN ('screenshot','clip','avatar','logo','banner')),
  storage_path  text NOT NULL,
  public_url    text,
  metadata      jsonb,
  created_at    timestamptz DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
