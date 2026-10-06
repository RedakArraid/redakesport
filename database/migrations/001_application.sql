CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA app;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL, raw_user_meta_data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth.sessions(token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE auth.password_resets(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE INDEX sessions_user ON auth.sessions(user_id);
CREATE FUNCTION app.user_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id',true),'')::uuid $$;
CREATE FUNCTION app.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA public,app TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

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

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (app.user_id() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (app.user_id() = id);

-- GAMES
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are public" ON games FOR SELECT USING (true);

-- CLUBS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public clubs are viewable" ON clubs FOR SELECT USING (true);
CREATE POLICY "Captains manage their club" ON clubs FOR ALL
  USING (captain_id = app.user_id())
  WITH CHECK (captain_id = app.user_id());
CREATE POLICY "Organizers can create clubs" ON clubs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = app.user_id() AND role IN ('captain','organizer'))
  );

-- CLUB MEMBERS
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members are public" ON club_members FOR SELECT USING (true);
CREATE POLICY "Captains manage their members" ON club_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id())
  );

-- CLUB APPLICATIONS
ALTER TABLE club_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants see own applications" ON club_applications FOR SELECT
  USING (player_id = app.user_id() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id()));
CREATE POLICY "Players can apply" ON club_applications FOR INSERT
  WITH CHECK (player_id = app.user_id());
CREATE POLICY "Captains can review applications" ON club_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id()));

-- TOURNAMENTS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tournaments are viewable" ON tournaments FOR SELECT
  USING (is_public = true OR organizer_id = app.user_id());
CREATE POLICY "Organizers create tournaments" ON tournaments FOR INSERT
  WITH CHECK (
    organizer_id = app.user_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = app.user_id() AND role = 'organizer')
  );
CREATE POLICY "Organizers update their tournaments" ON tournaments FOR UPDATE
  USING (organizer_id = app.user_id());
CREATE POLICY "Organizers delete their tournaments" ON tournaments FOR DELETE
  USING (organizer_id = app.user_id());

-- TOURNAMENT REGISTRATIONS
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrations visible to organizer and participant" ON tournament_registrations FOR SELECT
  USING (
    player_id = app.user_id() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id()) OR
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id())
  );
CREATE POLICY "Players and captains can register" ON tournament_registrations FOR INSERT
  WITH CHECK (player_id = app.user_id() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id()));
CREATE POLICY "Organizers approve registrations" ON tournament_registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id()));

-- GROUPS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are public" ON groups FOR SELECT USING (true);
CREATE POLICY "Organizers manage groups" ON groups FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id()));

-- GROUP MEMBERS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members are public" ON group_members FOR SELECT USING (true);

-- MATCHES
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches from public tournaments are viewable" ON matches FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.is_public = true)
    OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = app.user_id())
  );
CREATE POLICY "Organizers manage matches" ON matches FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = app.user_id()));

-- MATCH EVENTS
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match events are public" ON match_events FOR SELECT USING (true);
CREATE POLICY "Organizers insert match events" ON match_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t JOIN matches m ON m.tournament_id = t.id
      WHERE m.id = match_id AND t.organizer_id = app.user_id()
    )
  );

-- SCORE SUBMISSIONS
ALTER TABLE score_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants and organizers see submissions" ON score_submissions FOR SELECT
  USING (
    submitted_by = app.user_id() OR
    EXISTS (
      SELECT 1 FROM tournaments t JOIN matches m ON m.tournament_id = t.id
      WHERE m.id = match_id AND t.organizer_id = app.user_id()
    )
  );
CREATE POLICY "Authenticated users can submit scores" ON score_submissions FOR INSERT
  WITH CHECK (submitted_by = app.user_id());

-- STANDINGS
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standings are public" ON standings FOR SELECT USING (true);

-- MATCHMAKING QUEUE
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players see their queue entry" ON matchmaking_queue FOR SELECT
  USING (player_id = app.user_id());
CREATE POLICY "Players join/leave queue" ON matchmaking_queue FOR ALL
  USING (player_id = app.user_id())
  WITH CHECK (player_id = app.user_id());

-- LOBBIES
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lobby participants can view" ON lobbies FOR SELECT
  USING (app.user_id() = ANY(team1_player_ids) OR app.user_id() = ANY(team2_player_ids));

-- BROADCAST SESSIONS
ALTER TABLE broadcast_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live broadcasts are public" ON broadcast_sessions FOR SELECT
  USING (status = 'live' OR organizer_id = app.user_id());
CREATE POLICY "Organizers manage broadcasts" ON broadcast_sessions FOR ALL
  USING (organizer_id = app.user_id());

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT
  USING (user_id = app.user_id());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (user_id = app.user_id());

-- DISCORD INTEGRATIONS
ALTER TABLE discord_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see their integrations" ON discord_integrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = app.user_id()) OR
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id())
  );

-- ELO HISTORY
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ELO history is public" ON elo_history FOR SELECT USING (true);

-- MEDIA UPLOADS
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media uploads are public" ON media_uploads FOR SELECT USING (true);
CREATE POLICY "Users manage own uploads" ON media_uploads FOR ALL USING (uploader_id = app.user_id());

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Recalculate standings after match completion
CREATE OR REPLACE FUNCTION update_standings_after_match()
RETURNS trigger AS $$
BEGIN
  -- Only process when match moves to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update winner standings
    IF NEW.winner_id IS NOT NULL THEN
      INSERT INTO standings (tournament_id, team_id, wins, points, updated_at)
      VALUES (NEW.tournament_id, NEW.winner_id, 1, 3, now())
      ON CONFLICT (tournament_id, team_id)
      DO UPDATE SET
        wins = standings.wins + 1,
        points = standings.points + 3,
        updated_at = now();
    END IF;

    -- Update loser standings
    IF NEW.loser_id IS NOT NULL THEN
      INSERT INTO standings (tournament_id, team_id, losses, updated_at)
      VALUES (NEW.tournament_id, NEW.loser_id, 1, now())
      ON CONFLICT (tournament_id, team_id)
      DO UPDATE SET
        losses = standings.losses + 1,
        updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER match_completed_standings
  AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_standings_after_match();

-- Send notification on club application status change
CREATE OR REPLACE FUNCTION notify_application_review()
RETURNS trigger AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.player_id,
      'application_reviewed',
      CASE WHEN NEW.status = 'accepted' THEN '🎉 Candidature acceptée !' ELSE '❌ Candidature refusée' END,
      CASE WHEN NEW.status = 'accepted'
        THEN 'Tu as été accepté dans le club. Bienvenue dans l''équipe !'
        ELSE 'Ta candidature a été refusée. Tu peux postuler dans d''autres clubs.'
      END,
      jsonb_build_object('club_id', NEW.club_id, 'application_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER application_reviewed_notification
  AFTER UPDATE ON club_applications
  FOR EACH ROW EXECUTE FUNCTION notify_application_review();

-- Notify player when they're matched in matchmaking
CREATE OR REPLACE FUNCTION notify_matchmaking_match()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'matched' AND OLD.status = 'searching' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.player_id,
      'match_found',
      '🎯 Match trouvé !',
      'Un adversaire a été trouvé. Rejoins le lobby maintenant !',
      jsonb_build_object('party_id', NEW.party_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER matchmaking_matched_notification
  AFTER UPDATE ON matchmaking_queue
  FOR EACH ROW EXECUTE FUNCTION notify_matchmaking_match();

-- ============================================================
-- Seed data — Games (from data.jsx mockup)
-- ============================================================

INSERT INTO games (name, slug, icon_url, is_active) VALUES
  ('EA FC 26', 'ea-fc-26', NULL, true),
  ('Valorant', 'valorant', NULL, true),
  ('Counter-Strike 2', 'cs2', NULL, true),
  ('Rocket League', 'rocket-league', NULL, true),
  ('Fortnite', 'fortnite', NULL, true),
  ('Call of Duty', 'call-of-duty', NULL, true),
  ('League of Legends', 'league-of-legends', NULL, true),
  ('Apex Legends', 'apex-legends', NULL, true)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game_id uuid REFERENCES games(id),
  start_date timestamptz,
  end_date timestamptz,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed')),
  settings jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons are public"
  ON seasons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage seasons"
  ON seasons FOR ALL
  USING (
    app.user_id() IN (
      SELECT id FROM profiles WHERE role = 'organizer'
    )
  );

-- =============================================
-- TABLE: tournament_analytics (cache stats par tournoi)
-- =============================================
CREATE TABLE IF NOT EXISTS tournament_analytics (
  tournament_id uuid PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
  total_matches integer DEFAULT 0,
  completed_matches integer DEFAULT 0,
  total_players integer DEFAULT 0,
  avg_match_duration_mins integer,
  peak_viewers integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tournament_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics are public"
  ON tournament_analytics FOR SELECT
  USING (true);

CREATE POLICY "Service role can upsert analytics"
  ON tournament_analytics FOR ALL
  USING (app.role() = 'service_role');

-- =============================================
-- VUE: leaderboard ELO
-- =============================================
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    id,
    username,
    display_name,
    avatar_url,
    country,
    role,
    elo_rating,
    RANK() OVER (ORDER BY elo_rating DESC) AS rank
  FROM profiles
  ORDER BY elo_rating DESC;

-- Fixes for Discord integrations & Profiles webhook

ALTER TABLE discord_integrations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

CREATE POLICY "Users manage own integrations" ON discord_integrations
  FOR ALL USING (user_id = app.user_id()) WITH CHECK (user_id = app.user_id());

GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Application invariants are enforced in Postgres, including calls outside the UI.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

ALTER TABLE profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
UPDATE profiles SET onboarding_completed = true;
ALTER TABLE profiles DROP COLUMN IF EXISTS discord_webhook;
ALTER TABLE broadcast_sessions ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE matches ADD COLUMN next_match_slot integer CHECK (next_match_slot IN (1,2));
ALTER TABLE matches ADD COLUMN loser_match_slot integer CHECK (loser_match_slot IN (1,2));
ALTER TABLE lobbies ADD COLUMN match_id uuid REFERENCES matches(id);
ALTER TABLE lobbies ADD COLUMN ready_player_ids uuid[] NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX discord_integrations_user ON discord_integrations(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX pending_application ON club_applications(club_id, player_id) WHERE status = 'pending';
CREATE UNIQUE INDEX registration_club ON tournament_registrations(tournament_id, club_id) WHERE status IN ('pending','approved');
CREATE UNIQUE INDEX registration_player ON tournament_registrations(tournament_id, player_id) WHERE status IN ('pending','approved');
CREATE UNIQUE INDEX score_team ON score_submissions(match_id, team_id) WHERE team_id IS NOT NULL;
CREATE INDEX matches_tournament ON matches(tournament_id);
CREATE INDEX matches_teams ON matches(team1_id, team2_id);
CREATE INDEX notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX members_player ON club_members(player_id);
ALTER TABLE tournament_registrations ADD CONSTRAINT one_participant CHECK ((club_id IS NULL) <> (player_id IS NULL)) NOT VALID;
ALTER TABLE tournaments ADD CONSTRAINT tournament_capacity CHECK (max_teams BETWEEN 2 AND 256 AND team_size BETWEEN 1 AND 11) NOT VALID;
ALTER TABLE tournaments ADD CONSTRAINT tournament_dates CHECK (registration_deadline IS NULL OR start_date IS NULL OR registration_deadline <= start_date) NOT VALID;
ALTER TABLE matches ADD CONSTRAINT positive_scores CHECK (score_team1 BETWEEN 0 AND 999 AND score_team2 BETWEEN 0 AND 999) NOT VALID;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uname text;
BEGIN
  uname := left(coalesce(nullif(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email,'@',1), 'joueur'), 32);
  INSERT INTO public.profiles(id, username, display_name, role, onboarding_completed)
  VALUES (NEW.id, uname, coalesce(NEW.raw_user_meta_data->>'full_name', uname), 'player', false)
  ON CONFLICT (username) DO NOTHING;
  IF NOT FOUND THEN
    INSERT INTO public.profiles(id, username, display_name, role, onboarding_completed)
    VALUES (NEW.id, uname || '_' || replace(NEW.id::text,'-',''), uname, 'player', false);
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION private.represents(p_team uuid, p_type text, p_user uuid DEFAULT app.user_id()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_user IS NOT NULL AND (CASE WHEN p_type = 'player' THEN p_team = p_user
 ELSE EXISTS(SELECT 1 FROM public.clubs WHERE id = p_team AND captain_id = p_user) END);
$$;
CREATE FUNCTION private.can_view_tournament(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.tournaments t WHERE t.id = p_id AND
 ((t.is_public AND t.status <> 'draft') OR t.organizer_id = app.user_id() OR EXISTS (
   SELECT 1 FROM public.tournament_registrations r WHERE r.tournament_id = t.id AND r.status = 'approved'
   AND (r.player_id = app.user_id() OR EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = r.club_id AND cm.player_id = app.user_id())))));
$$;
CREATE FUNCTION private.can_view_match(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.matches m WHERE m.id = p_id AND
 (private.can_view_tournament(m.tournament_id) OR private.represents(m.team1_id,m.team1_type) OR private.represents(m.team2_id,m.team2_type)));
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.represents(uuid,text,uuid), private.can_view_tournament(uuid), private.can_view_match(uuid) TO anon, authenticated, service_role;

-- Replace permissive legacy policies, retaining public discovery of profiles/clubs.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN
 ('tournaments','tournament_registrations','groups','group_members','matches','match_events','score_submissions','standings','broadcast_sessions','matchmaking_queue')
 LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); END LOOP;
END $$;
CREATE POLICY tournament_read ON tournaments FOR SELECT USING (private.can_view_tournament(id));
CREATE POLICY tournament_insert ON tournaments FOR INSERT TO authenticated WITH CHECK (organizer_id = app.user_id() AND status = 'draft' AND EXISTS(SELECT 1 FROM profiles WHERE id = app.user_id() AND role = 'organizer'));
CREATE POLICY tournament_update ON tournaments FOR UPDATE TO authenticated USING (organizer_id = app.user_id()) WITH CHECK (organizer_id = app.user_id());
CREATE POLICY registration_read ON tournament_registrations FOR SELECT USING
 ((status = 'approved' AND private.can_view_tournament(tournament_id)) OR player_id = app.user_id() OR private.represents(club_id,'club') OR EXISTS(SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id()));
CREATE POLICY groups_read ON groups FOR SELECT USING (private.can_view_tournament(tournament_id));
CREATE POLICY members_read ON group_members FOR SELECT USING (EXISTS(SELECT 1 FROM groups WHERE id = group_id));
CREATE POLICY match_read ON matches FOR SELECT USING (private.can_view_match(id));
CREATE POLICY match_schedule ON matches FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = app.user_id()));
CREATE POLICY event_read ON match_events FOR SELECT USING (private.can_view_match(match_id));
CREATE POLICY event_insert ON match_events FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = app.user_id()));
CREATE POLICY score_read ON score_submissions FOR SELECT TO authenticated USING (submitted_by = app.user_id() OR EXISTS(
 SELECT 1 FROM matches m WHERE m.id = match_id AND (private.represents(m.team1_id,m.team1_type) OR private.represents(m.team2_id,m.team2_type)
 OR EXISTS(SELECT 1 FROM tournaments t WHERE t.id = m.tournament_id AND t.organizer_id = app.user_id()))));
CREATE POLICY standings_read ON standings FOR SELECT USING (private.can_view_tournament(tournament_id));
-- Stream keys must never be public. Overlays read public match data directly.
CREATE POLICY broadcast_owner ON broadcast_sessions FOR ALL TO authenticated USING (organizer_id = app.user_id()) WITH CHECK (organizer_id = app.user_id());
CREATE POLICY queue_read ON matchmaking_queue FOR SELECT TO authenticated USING (player_id = app.user_id());
CREATE POLICY queue_leave ON matchmaking_queue FOR DELETE TO authenticated USING (player_id = app.user_id() AND status = 'searching');
DROP POLICY "Organizers can create clubs" ON clubs;
DROP POLICY "Captains manage their club" ON clubs;
CREATE POLICY club_update ON clubs FOR UPDATE TO authenticated USING (captain_id = app.user_id()) WITH CHECK (captain_id = app.user_id());
DROP POLICY "Users insert own profile" ON profiles;
DROP POLICY "Players can apply" ON club_applications;
CREATE POLICY application_insert ON club_applications FOR INSERT TO authenticated WITH CHECK (player_id = app.user_id() AND status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND NOT EXISTS(SELECT 1 FROM club_members WHERE player_id = app.user_id()));
DROP POLICY "Captains can review applications" ON club_applications;
DROP POLICY "Captains manage their members" ON club_members;
CREATE POLICY roster_remove ON club_members FOR DELETE TO authenticated USING (role <> 'captain' AND (player_id = app.user_id() OR private.represents(club_id,'club')));

-- Table-level UPDATE grants override column grants: revoke before narrowing.
REVOKE INSERT, UPDATE, DELETE ON profiles FROM anon, authenticated;
GRANT UPDATE (display_name,avatar_url,country,bio,discord_tag,twitch_url) ON profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON clubs FROM anon, authenticated;
GRANT UPDATE (name,logo_url,banner_url,region,description,game_id) ON clubs TO authenticated;
REVOKE UPDATE ON matches FROM anon, authenticated;
GRANT UPDATE (scheduled_at,vod_url,notes) ON matches TO authenticated;
REVOKE UPDATE ON tournaments FROM anon, authenticated;
GRANT UPDATE (name,rules,start_date,end_date,registration_deadline,is_public,region,streams,settings,status) ON tournaments TO authenticated;
REVOKE UPDATE ON notifications FROM anon, authenticated;
GRANT UPDATE (is_read) ON notifications TO authenticated;
ALTER VIEW leaderboard SET (security_invoker = true);

CREATE FUNCTION public.complete_onboarding(p_role text, p_country text) RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.profiles;
BEGIN
 IF app.user_id() IS NULL OR p_role NOT IN ('player','captain','organizer') THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
 SELECT * INTO result FROM public.profiles WHERE id = app.user_id() FOR UPDATE;
 IF result.onboarding_completed THEN RAISE EXCEPTION 'Profil déjà configuré'; END IF;
 UPDATE public.profiles SET role = p_role, country = nullif(trim(p_country),''), onboarding_completed = true WHERE id = app.user_id() RETURNING * INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.create_club(p_name text,p_region text,p_description text) RETURNS public.clubs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.clubs; u public.profiles;
BEGIN
 SELECT * INTO u FROM public.profiles WHERE id = app.user_id() FOR UPDATE;
 IF u.id IS NULL OR u.role NOT IN ('captain','organizer') THEN RAISE EXCEPTION 'Rôle capitaine requis'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 3 AND 80 THEN RAISE EXCEPTION 'Nom de club : 3 à 80 caractères'; END IF;
 IF EXISTS(SELECT 1 FROM public.club_members WHERE player_id = u.id) THEN RAISE EXCEPTION 'Tu appartiens déjà à un club'; END IF;
 INSERT INTO public.clubs(name,slug,captain_id,region,description) VALUES(trim(p_name),lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g')) || '-' || gen_random_uuid(),u.id,p_region,p_description) RETURNING * INTO result;
 INSERT INTO public.club_members(club_id,player_id,role) VALUES(result.id,u.id,'captain');
 RETURN result;
END $$;
CREATE FUNCTION public.review_application(p_id uuid,p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.club_applications;
BEGIN
 SELECT * INTO a FROM public.club_applications WHERE id = p_id FOR UPDATE;
 IF a.id IS NULL OR NOT private.represents(a.club_id,'club') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF a.status <> 'pending' THEN RAISE EXCEPTION 'Candidature déjà traitée'; END IF;
 PERFORM 1 FROM public.profiles WHERE id = a.player_id FOR UPDATE;
 IF p_accept THEN
  IF EXISTS(SELECT 1 FROM public.club_members WHERE player_id = a.player_id) THEN RAISE EXCEPTION 'Ce joueur appartient déjà à un club'; END IF;
  INSERT INTO public.club_members(club_id,player_id) VALUES(a.club_id,a.player_id);
 END IF;
 UPDATE public.club_applications SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END, reviewed_at = now(), reviewed_by = app.user_id() WHERE id = p_id;
END $$;
CREATE FUNCTION public.register_tournament(p_tournament_id uuid,p_club_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; result uuid;
BEGIN
 SELECT * INTO t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
 IF app.user_id() IS NULL OR NOT private.can_view_tournament(t.id) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF t.status <> 'registration' OR t.registration_deadline < now() THEN RAISE EXCEPTION 'Inscriptions fermées'; END IF;
 IF (t.team_size > 1 AND (p_club_id IS NULL OR NOT private.represents(p_club_id,'club'))) OR (t.team_size = 1 AND p_club_id IS NOT NULL) THEN RAISE EXCEPTION 'Participant invalide'; END IF;
 IF t.max_teams IS NOT NULL AND (SELECT count(*) FROM public.tournament_registrations WHERE tournament_id = t.id AND status IN ('pending','approved')) >= t.max_teams THEN RAISE EXCEPTION 'Tournoi complet'; END IF;
 INSERT INTO public.tournament_registrations(tournament_id,club_id,player_id) VALUES(t.id,p_club_id,CASE WHEN p_club_id IS NULL THEN app.user_id() END) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.review_registration(p_id uuid,p_approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.tournament_registrations; t public.tournaments;
BEGIN
 SELECT * INTO r FROM public.tournament_registrations WHERE id = p_id;
 SELECT * INTO t FROM public.tournaments WHERE id = r.tournament_id FOR UPDATE;
 SELECT * INTO r FROM public.tournament_registrations WHERE id = p_id FOR UPDATE;
 IF t.organizer_id IS DISTINCT FROM app.user_id() OR app.user_id() IS NULL THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF t.status <> 'registration' OR r.status <> 'pending' THEN RAISE EXCEPTION 'Inscription non modifiable'; END IF;
 UPDATE public.tournament_registrations SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END WHERE id = p_id;
 INSERT INTO public.notifications(user_id,type,title,data) SELECT coalesce(r.player_id,c.captain_id),'registration_reviewed',CASE WHEN p_approve THEN 'Inscription acceptée' ELSE 'Inscription refusée' END,jsonb_build_object('tournament_id',t.id) FROM (SELECT 1) x LEFT JOIN public.clubs c ON c.id = r.club_id;
END $$;
CREATE FUNCTION public.withdraw_registration(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.tournament_registrations;
BEGIN
 SELECT * INTO r FROM public.tournament_registrations WHERE id = p_id;
 PERFORM 1 FROM public.tournaments WHERE id = r.tournament_id FOR UPDATE;
 IF NOT (coalesce(r.player_id = app.user_id(),false) OR private.represents(r.club_id,'club')) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id = r.tournament_id AND status = 'registration') THEN RAISE EXCEPTION 'Tournoi déjà commencé'; END IF;
 UPDATE public.tournament_registrations SET status = 'withdrawn' WHERE id = p_id;
END $$;

-- Existing definer triggers are internal, never API endpoints.
ALTER FUNCTION public.notify_application_review() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_matchmaking_match() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.handle_new_user(),public.notify_application_review(),public.notify_matchmaking_match(),public.update_standings_after_match() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text,text),public.create_club(text,text,text),public.review_application(uuid,boolean),public.register_tournament(uuid,uuid),public.review_registration(uuid,boolean),public.withdraw_registration(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text),public.create_club(text,text,text),public.review_application(uuid,boolean),public.register_tournament(uuid,uuid),public.review_registration(uuid,boolean),public.withdraw_registration(uuid) TO authenticated;

DROP TRIGGER match_completed_standings ON matches;
DROP FUNCTION update_standings_after_match();

CREATE FUNCTION private.rebuild_standings(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 DELETE FROM public.standings WHERE tournament_id = p_tournament;
 INSERT INTO public.standings(tournament_id,team_id,team_type,group_id,wins,losses,draws,points,map_wins,map_losses)
 SELECT p_tournament, team, max(kind), (array_agg(group_id) FILTER (WHERE group_id IS NOT NULL))[1], sum(w),sum(l),sum(d),sum(w)*3+sum(d),sum(gf),sum(ga)
 FROM (
  SELECT coalesce(r.club_id,r.player_id) team, CASE WHEN r.club_id IS NULL THEN 'player' ELSE 'club' END kind,
   NULL::uuid group_id,0 w,0 l,0 d,0 gf,0 ga FROM public.tournament_registrations r WHERE r.tournament_id = p_tournament AND r.status = 'approved'
  UNION ALL
  SELECT m.team1_id,m.team1_type,m.group_id,CASE WHEN m.winner_id=m.team1_id THEN 1 ELSE 0 END,
   CASE WHEN m.loser_id=m.team1_id THEN 1 ELSE 0 END, CASE WHEN m.winner_id IS NULL AND m.team2_id IS NOT NULL THEN 1 ELSE 0 END,m.score_team1,m.score_team2
   FROM public.matches m WHERE m.tournament_id=p_tournament AND m.status='completed' AND m.team1_id IS NOT NULL AND (m.team2_id IS NOT NULL OR m.bracket_position->>'side'='swiss')
  UNION ALL
  SELECT m.team2_id,m.team2_type,m.group_id,CASE WHEN m.winner_id=m.team2_id THEN 1 ELSE 0 END,
   CASE WHEN m.loser_id=m.team2_id THEN 1 ELSE 0 END, CASE WHEN m.winner_id IS NULL AND m.team1_id IS NOT NULL THEN 1 ELSE 0 END,m.score_team2,m.score_team1
   FROM public.matches m WHERE m.tournament_id=p_tournament AND m.status='completed' AND m.team2_id IS NOT NULL AND m.team1_id IS NOT NULL
 ) results GROUP BY team;
END $$;

-- Resolve byes only after ALL incoming results are known; propagate into fixed slots.
CREATE FUNCTION private.settle_bracket(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; target uuid; slot integer; participant uuid; kind text; changed boolean; side text; f text;
BEGIN
 SELECT format INTO f FROM public.tournaments WHERE id = p_tournament;
 LOOP
  changed := false;
  FOR m IN SELECT * FROM public.matches WHERE tournament_id=p_tournament AND status='completed' LOOP
   FOR target,slot,participant,kind IN SELECT m.next_match_id,m.next_match_slot,m.winner_id,CASE WHEN m.winner_id=m.team1_id THEN m.team1_type ELSE m.team2_type END
     UNION ALL SELECT m.loser_match_id,m.loser_match_slot,m.loser_id,CASE WHEN m.loser_id=m.team1_id THEN m.team1_type ELSE m.team2_type END LOOP
    IF target IS NOT NULL AND participant IS NOT NULL THEN
     IF slot=1 THEN UPDATE public.matches SET team1_id=participant,team1_type=kind WHERE id=target AND team1_id IS NULL;
     ELSE UPDATE public.matches SET team2_id=participant,team2_type=kind WHERE id=target AND team2_id IS NULL; END IF;
     changed := changed OR FOUND;
    END IF;
   END LOOP;
  END LOOP;
  FOR m IN SELECT * FROM public.matches WHERE tournament_id=p_tournament AND status='pending' AND (team1_id IS NULL OR team2_id IS NULL) LOOP
   side := m.bracket_position->>'side';
   IF side IN ('group','reset') OR (f='hybrid' AND side='winners' AND m.notes IS DISTINCT FROM 'Qualifiés des poules') THEN CONTINUE; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.matches WHERE (next_match_id=m.id OR loser_match_id=m.id) AND status <> 'completed') THEN
    UPDATE public.matches SET status='completed',winner_id=coalesce(team1_id,team2_id),completed_at=now() WHERE id=m.id;
    changed := true;
   END IF;
  END LOOP;
  EXIT WHEN NOT changed;
 END LOOP;
END $$;

CREATE FUNCTION private.progress_tournament(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; current_round integer; n integer; rounds integer; ids uuid[]; a uuid; b uuid; g uuid; group_a uuid[]; group_b uuid[]; pos integer := 0; kind text; mf public.matches;
BEGIN
 IF p_tournament IS NULL THEN RETURN; END IF;
 SELECT * INTO t FROM public.tournaments WHERE id=p_tournament FOR UPDATE;
 PERFORM private.settle_bracket(t.id);
 PERFORM private.rebuild_standings(t.id);
 IF t.format='hybrid' AND NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND group_id IS NOT NULL AND status<>'completed') THEN
  IF NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND notes='Qualifiés des poules') THEN
   SELECT id INTO g FROM public.groups WHERE tournament_id=t.id AND name='Groupe A';
   SELECT array_agg(team_id ORDER BY points DESC,map_wins-map_losses DESC,team_id) INTO group_a FROM public.standings WHERE tournament_id=t.id AND group_id=g;
   SELECT id INTO g FROM public.groups WHERE tournament_id=t.id AND name='Groupe B';
   SELECT array_agg(team_id ORDER BY points DESC,map_wins-map_losses DESC,team_id) INTO group_b FROM public.standings WHERE tournament_id=t.id AND group_id=g;
   UPDATE public.matches SET team1_id=group_a[1],team2_id=group_b[2],notes='Qualifiés des poules' WHERE tournament_id=t.id AND bracket_position->>'side'='winners' AND round=1 AND bracket_position->>'position'='0';
   UPDATE public.matches SET team1_id=group_b[1],team2_id=group_a[2],notes='Qualifiés des poules' WHERE tournament_id=t.id AND bracket_position->>'side'='winners' AND round=1 AND bracket_position->>'position'='1';
   UPDATE public.matches SET notes='Qualifiés des poules' WHERE tournament_id=t.id AND bracket_position->>'side'='winners';
  END IF;
 END IF;
 IF t.format='double_elimination' THEN
  SELECT * INTO mf FROM public.matches WHERE tournament_id=t.id AND bracket_position->>'side'='grand_final' AND status='completed';
  IF FOUND THEN
   IF mf.winner_id=mf.team2_id THEN
    UPDATE public.matches SET team1_id=mf.team1_id,team2_id=mf.team2_id,notes='Finale décisive' WHERE tournament_id=t.id AND bracket_position->>'side'='reset' AND team1_id IS NULL;
   ELSE
    UPDATE public.matches SET status='completed',completed_at=now(),notes='Finale décisive non nécessaire' WHERE tournament_id=t.id AND bracket_position->>'side'='reset' AND status='pending';
   END IF;
  END IF;
 END IF;
 IF t.format='swiss' AND NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND status<>'completed') THEN
  SELECT max(round) INTO current_round FROM public.matches WHERE tournament_id=t.id;
  SELECT count(*) INTO n FROM public.tournament_registrations WHERE tournament_id=t.id AND status='approved';
  rounds := ceil(log(2,n))::integer;
  IF current_round < rounds THEN
   SELECT array_agg(team_id ORDER BY points DESC,map_wins-map_losses DESC,team_id) INTO ids FROM public.standings WHERE tournament_id=t.id;
   kind := CASE WHEN t.team_size=1 THEN 'player' ELSE 'club' END;
   -- Award odd-player bye to the lowest-ranked entrant without a prior bye.
   IF n % 2 = 1 THEN
    SELECT x INTO a FROM unnest(ids) WITH ORDINALITY AS q(x,i) WHERE NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND team1_id=x AND team2_id IS NULL AND status='completed') ORDER BY i DESC LIMIT 1;
    IF a IS NULL THEN a := ids[array_length(ids,1)]; END IF;
    INSERT INTO public.matches(tournament_id,round,match_number,team1_id,team1_type,team2_type,status,winner_id,completed_at,bracket_position)
    VALUES(t.id,current_round+1,1,a,kind,kind,'completed',a,now(),jsonb_build_object('side','swiss','round',current_round+1,'position',0));
    ids := array_remove(ids,a); pos := 1;
   END IF;
   WHILE array_length(ids,1)>0 LOOP
    a := ids[1]; ids := array_remove(ids,a);
    SELECT x INTO b FROM unnest(ids) WITH ORDINALITY AS q(x,i) WHERE NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND ((team1_id=a AND team2_id=x) OR (team1_id=x AND team2_id=a))) ORDER BY i LIMIT 1;
    b := coalesce(b,ids[1]); ids := array_remove(ids,b);
    INSERT INTO public.matches(tournament_id,round,match_number,team1_id,team2_id,team1_type,team2_type,bracket_position)
    VALUES(t.id,current_round+1,pos+1,a,b,kind,kind,jsonb_build_object('side','swiss','round',current_round+1,'position',pos));
    pos := pos+1;
   END LOOP;
   PERFORM private.rebuild_standings(t.id);
  END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND status<>'completed') THEN
  UPDATE public.tournaments SET status='completed' WHERE id=t.id;
 END IF;
END $$;

CREATE FUNCTION public.install_bracket(p_user uuid,p_tournament uuid,p_plan jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments;
BEGIN
 SELECT * INTO t FROM public.tournaments WHERE id=p_tournament FOR UPDATE;
 IF t.organizer_id IS DISTINCT FROM p_user OR t.status<>'registration' THEN RAISE EXCEPTION 'Tournoi non disponible'; END IF;
 IF EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id) THEN RAISE EXCEPTION 'Bracket déjà généré'; END IF;
 IF (SELECT count(*) FROM public.tournament_registrations WHERE tournament_id=t.id AND status='approved')<2 THEN RAISE EXCEPTION 'Deux participants validés requis'; END IF;
 -- Re-check that the plan uses exactly the currently approved entrants, after acquiring the lock.
 IF EXISTS (
  (SELECT coalesce(club_id,player_id) FROM public.tournament_registrations WHERE tournament_id=t.id AND status='approved'
   EXCEPT SELECT (value->>'team1_id')::uuid FROM jsonb_array_elements(p_plan->'matches') UNION SELECT NULL::uuid WHERE false)
  EXCEPT SELECT (value->>'team2_id')::uuid FROM jsonb_array_elements(p_plan->'matches')
 ) THEN RAISE EXCEPTION 'Les inscriptions ont changé, relance la génération'; END IF;
 INSERT INTO public.groups(id,tournament_id,name,stage) SELECT id,tournament_id,name,stage FROM jsonb_populate_recordset(NULL::public.groups,p_plan->'groups');
 INSERT INTO public.group_members(group_id,club_id,player_id) SELECT group_id,club_id,player_id FROM jsonb_populate_recordset(NULL::public.group_members,p_plan->'members');
 INSERT INTO public.matches(id,tournament_id,group_id,round,match_number,bracket_position,team1_id,team2_id,team1_type,team2_type,status,best_of,next_match_id,next_match_slot,loser_match_id,loser_match_slot)
 SELECT id,tournament_id,group_id,round,match_number,bracket_position,team1_id,team2_id,team1_type,team2_type,'pending',best_of,next_match_id,next_match_slot,loser_match_id,loser_match_slot FROM jsonb_populate_recordset(NULL::public.matches,p_plan->'matches');
 UPDATE public.tournaments SET status='ongoing' WHERE id=t.id;
 PERFORM private.progress_tournament(t.id);
END $$;

CREATE FUNCTION private.finish_match(p_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; winner uuid; loser uuid; ra integer; rb integer; delta integer; outcome numeric; u uuid; rating_table text;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_id FOR UPDATE;
 IF m.status='completed' THEN RAISE EXCEPTION 'Match déjà terminé'; END IF;
 IF m.team1_id IS NULL OR m.team2_id IS NULL OR p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 999 OR p_score2 NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Score ou adversaire invalide'; END IF;
 IF p_score1=p_score2 AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND (format IN ('round_robin','swiss') OR (format='hybrid' AND m.group_id IS NOT NULL))) THEN RAISE EXCEPTION 'Une égalité est impossible pour ce match'; END IF;
 winner := CASE WHEN p_score1>p_score2 THEN m.team1_id WHEN p_score2>p_score1 THEN m.team2_id END;
 loser := CASE WHEN p_score1>p_score2 THEN m.team2_id WHEN p_score2>p_score1 THEN m.team1_id END;
 UPDATE public.matches SET score_team1=p_score1,score_team2=p_score2,winner_id=winner,loser_id=loser,status='completed',completed_at=now() WHERE id=m.id;
 UPDATE public.score_submissions SET status=CASE WHEN score_team1=p_score1 AND score_team2=p_score2 THEN 'confirmed' ELSE 'disputed' END WHERE match_id=m.id;
 -- Lock ratings in stable order to serialize results across tournaments.
 IF m.team1_type='club' THEN
  PERFORM id FROM public.clubs WHERE id IN (m.team1_id,m.team2_id) ORDER BY id FOR UPDATE;
  SELECT elo_rating INTO ra FROM public.clubs WHERE id=m.team1_id;
  SELECT elo_rating INTO rb FROM public.clubs WHERE id=m.team2_id;
 ELSE
  PERFORM id FROM public.profiles WHERE id IN (m.team1_id,m.team2_id) ORDER BY id FOR UPDATE;
  SELECT elo_rating INTO ra FROM public.profiles WHERE id=m.team1_id;
  SELECT elo_rating INTO rb FROM public.profiles WHERE id=m.team2_id;
 END IF;
 outcome := CASE WHEN winner=m.team1_id THEN 1 WHEN winner IS NULL THEN 0.5 ELSE 0 END;
 delta := round(32 * (outcome - 1/(1+power(10::numeric,(rb-ra)/400.0))));
 IF m.team1_type='club' THEN
  UPDATE public.clubs SET elo_rating=CASE WHEN id=m.team1_id THEN ra+delta ELSE rb-delta END WHERE id IN(m.team1_id,m.team2_id);
  INSERT INTO public.elo_history(club_id,match_id,old_rating,new_rating,delta) VALUES(m.team1_id,m.id,ra,ra+delta,delta),(m.team2_id,m.id,rb,rb-delta,-delta);
 ELSE
  UPDATE public.profiles SET elo_rating=CASE WHEN id=m.team1_id THEN ra+delta ELSE rb-delta END WHERE id IN(m.team1_id,m.team2_id);
  INSERT INTO public.elo_history(player_id,match_id,old_rating,new_rating,delta) VALUES(m.team1_id,m.id,ra,ra+delta,delta),(m.team2_id,m.id,rb,rb-delta,-delta);
 END IF;
 FOR u IN SELECT id FROM public.profiles WHERE id IN(m.team1_id,m.team2_id) AND m.team1_type='player'
 UNION SELECT player_id FROM public.club_members WHERE club_id IN(m.team1_id,m.team2_id) AND m.team1_type='club' LOOP
  INSERT INTO public.notifications(user_id,type,title,body,data) VALUES(u,'match_completed','Résultat confirmé',p_score1 || ' — ' || p_score2,jsonb_build_object('match_id',m.id));
 END LOOP;
 PERFORM private.progress_tournament(m.tournament_id);
END $$;

CREATE FUNCTION public.submit_score(p_match_id uuid,p_score1 integer,p_score2 integer,p_screenshots text[] DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; team uuid; other public.score_submissions; org uuid;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_match_id;
 PERFORM 1 FROM public.tournaments WHERE id=m.tournament_id FOR UPDATE;
 SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
 IF app.user_id() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
 IF private.represents(m.team1_id,m.team1_type) THEN team:=m.team1_id;
 ELSIF private.represents(m.team2_id,m.team2_type) THEN team:=m.team2_id;
 ELSE RAISE EXCEPTION 'Seuls les participants ou capitaines peuvent soumettre'; END IF;
 IF m.status NOT IN ('pending','live') OR m.team1_id IS NULL OR m.team2_id IS NULL THEN RAISE EXCEPTION 'Match non disponible'; END IF;
 IF p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 999 OR p_score2 NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Scores invalides'; END IF;
 IF p_score1=p_score2 AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND (format IN ('round_robin','swiss') OR (format='hybrid' AND m.group_id IS NOT NULL))) THEN RAISE EXCEPTION 'Une égalité est impossible pour ce match'; END IF;
 IF cardinality(p_screenshots)>4 OR EXISTS(SELECT 1 FROM unnest(p_screenshots) s WHERE length(s)>2048 OR s ~ '[\r\n]') THEN RAISE EXCEPTION 'Pièces jointes invalides'; END IF;
 INSERT INTO public.score_submissions(match_id,submitted_by,team_id,score_team1,score_team2,screenshot_urls)
 VALUES(m.id,app.user_id(),team,p_score1,p_score2,coalesce(p_screenshots,'{}'))
 ON CONFLICT (match_id,team_id) WHERE team_id IS NOT NULL DO UPDATE SET score_team1=EXCLUDED.score_team1,score_team2=EXCLUDED.score_team2,screenshot_urls=EXCLUDED.screenshot_urls,submitted_at=now();
 SELECT * INTO other FROM public.score_submissions WHERE match_id=m.id AND team_id<>team AND status='pending' LIMIT 1;
 IF other.id IS NULL THEN RETURN jsonb_build_object('status','pending'); END IF;
 IF other.score_team1=p_score1 AND other.score_team2=p_score2 THEN
  PERFORM private.finish_match(m.id,p_score1,p_score2); RETURN jsonb_build_object('status','confirmed');
 END IF;
 UPDATE public.matches SET status='disputed' WHERE id=m.id;
 UPDATE public.score_submissions SET status='disputed' WHERE match_id=m.id;
 SELECT organizer_id INTO org FROM public.tournaments WHERE id=m.tournament_id;
 IF org IS NOT NULL THEN INSERT INTO public.notifications(user_id,type,title,data) VALUES(org,'score_dispute','Litige de score',jsonb_build_object('match_id',m.id)); END IF;
 RETURN jsonb_build_object('status','disputed');
END $$;
CREATE FUNCTION public.resolve_score(p_match_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; t public.tournaments;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_match_id;
 SELECT * INTO t FROM public.tournaments WHERE id=m.tournament_id FOR UPDATE;
 IF app.user_id() IS NULL OR t.organizer_id IS DISTINCT FROM app.user_id() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF m.status<>'disputed' THEN RAISE EXCEPTION 'Aucun litige à résoudre'; END IF;
 PERFORM private.finish_match(m.id,p_score1,p_score2);
END $$;
REVOKE ALL ON FUNCTION public.install_bracket(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.install_bracket(uuid,uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION private.rebuild_standings(uuid),private.settle_bracket(uuid),private.progress_tournament(uuid),private.finish_match(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.submit_score(uuid,integer,integer,text[]),public.resolve_score(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_score(uuid,integer,integer,text[]),public.resolve_score(uuid,integer,integer) TO authenticated;

CREATE FUNCTION public.join_queue(p_game_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.profiles;
BEGIN
 SELECT * INTO p FROM public.profiles WHERE id=app.user_id() FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.games WHERE id=p_game_id AND is_active) THEN RAISE EXCEPTION 'Jeu invalide'; END IF;
 IF EXISTS(SELECT 1 FROM public.lobbies WHERE (p.id=ANY(team1_player_ids) OR p.id=ANY(team2_player_ids)) AND status IN ('forming','ready') AND (match_id IS NULL OR EXISTS(SELECT 1 FROM public.matches WHERE id=match_id AND status<>'completed'))) THEN RAISE EXCEPTION 'Un lobby est déjà actif'; END IF;
 INSERT INTO public.matchmaking_queue(player_id,game_id,elo_rating,region,queue_type,status) VALUES(p.id,p_game_id,p.elo_rating,p.country,'solo','searching')
 ON CONFLICT(player_id) DO UPDATE SET game_id=EXCLUDED.game_id,elo_rating=EXCLUDED.elo_rating,region=EXCLUDED.region,status='searching',party_id=NULL,joined_at=now();
END $$;
CREATE FUNCTION public.matchmaking_tick() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.matchmaking_queue; b public.matchmaking_queue; lid uuid; count_matched integer := 0;
BEGIN
 IF app.user_id() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
 -- A single transaction claims pairs; concurrent browser ticks cannot create duplicate lobbies.
 IF NOT pg_try_advisory_xact_lock(725831) THEN RETURN 0; END IF;
 FOR a IN SELECT * FROM public.matchmaking_queue WHERE status='searching' ORDER BY joined_at FOR UPDATE LOOP
  IF NOT EXISTS(SELECT 1 FROM public.matchmaking_queue WHERE id=a.id AND status='searching') THEN CONTINUE; END IF;
  SELECT * INTO b FROM public.matchmaking_queue WHERE status='searching' AND player_id<>a.player_id AND game_id=a.game_id AND region IS NOT DISTINCT FROM a.region AND abs(elo_rating-a.elo_rating)<=200 ORDER BY abs(elo_rating-a.elo_rating),joined_at LIMIT 1 FOR UPDATE;
  IF b.id IS NULL THEN CONTINUE; END IF;
  INSERT INTO public.lobbies(game_id,team1_player_ids,team2_player_ids) VALUES(a.game_id,ARRAY[a.player_id],ARRAY[b.player_id]) RETURNING id INTO lid;
  UPDATE public.matchmaking_queue SET status='matched',party_id=lid WHERE id IN(a.id,b.id);
  count_matched:=count_matched+2;
 END LOOP;
 RETURN count_matched;
END $$;
CREATE FUNCTION public.lobby_ready(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE l public.lobbies; mid uuid;
BEGIN
 SELECT * INTO l FROM public.lobbies WHERE id=p_id FOR UPDATE;
 IF app.user_id() IS NULL OR NOT (app.user_id()=ANY(l.team1_player_ids || l.team2_player_ids)) OR l.id IS NULL THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF l.status='cancelled' THEN RAISE EXCEPTION 'Lobby annulé'; END IF;
 IF l.match_id IS NOT NULL THEN RETURN l.match_id; END IF;
 IF NOT app.user_id()=ANY(l.ready_player_ids) THEN l.ready_player_ids:=array_append(l.ready_player_ids,app.user_id()); END IF;
 UPDATE public.lobbies SET ready_player_ids=l.ready_player_ids WHERE id=l.id;
 IF l.ready_player_ids @> (l.team1_player_ids || l.team2_player_ids) THEN
  INSERT INTO public.matches(team1_id,team2_id,team1_type,team2_type,status,started_at,notes) VALUES(l.team1_player_ids[1],l.team2_player_ids[1],'player','player','live',now(),'Matchmaking solo') RETURNING id INTO mid;
  UPDATE public.lobbies SET status='ready',match_id=mid WHERE id=l.id;
  RETURN mid;
 END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION public.cancel_lobby(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE l public.lobbies;
BEGIN
 SELECT * INTO l FROM public.lobbies WHERE id=p_id FOR UPDATE;
 IF app.user_id() IS NULL OR l.id IS NULL OR NOT (app.user_id()=ANY(l.team1_player_ids || l.team2_player_ids)) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF l.status<>'forming' THEN RAISE EXCEPTION 'Le match a déjà commencé'; END IF;
 UPDATE public.lobbies SET status='cancelled' WHERE id=l.id;
 DELETE FROM public.matchmaking_queue WHERE party_id=l.id;
END $$;
REVOKE ALL ON FUNCTION public.join_queue(uuid),public.matchmaking_tick(),public.lobby_ready(uuid),public.cancel_lobby(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_queue(uuid),public.matchmaking_tick(),public.lobby_ready(uuid),public.cancel_lobby(uuid) TO authenticated;


REVOKE ALL ON SCHEMA auth FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE app.files(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket text NOT NULL,storage_path text NOT NULL UNIQUE,uploader_id uuid NOT NULL REFERENCES public.profiles(id),match_id uuid REFERENCES public.matches(id),content_type text NOT NULL,size_bytes integer NOT NULL,created_at timestamptz DEFAULT now());
REVOKE ALL ON app.files FROM PUBLIC,anon,authenticated;
