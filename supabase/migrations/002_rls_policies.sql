-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- GAMES
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are public" ON games FOR SELECT USING (true);

-- CLUBS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public clubs are viewable" ON clubs FOR SELECT USING (true);
CREATE POLICY "Captains manage their club" ON clubs FOR ALL
  USING (captain_id = auth.uid())
  WITH CHECK (captain_id = auth.uid());
CREATE POLICY "Organizers can create clubs" ON clubs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('captain','organizer'))
  );

-- CLUB MEMBERS
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members are public" ON club_members FOR SELECT USING (true);
CREATE POLICY "Captains manage their members" ON club_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid())
  );

-- CLUB APPLICATIONS
ALTER TABLE club_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants see own applications" ON club_applications FOR SELECT
  USING (player_id = auth.uid() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid()));
CREATE POLICY "Players can apply" ON club_applications FOR INSERT
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "Captains can review applications" ON club_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid()));

-- TOURNAMENTS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tournaments are viewable" ON tournaments FOR SELECT
  USING (is_public = true OR organizer_id = auth.uid());
CREATE POLICY "Organizers create tournaments" ON tournaments FOR INSERT
  WITH CHECK (
    organizer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organizer')
  );
CREATE POLICY "Organizers update their tournaments" ON tournaments FOR UPDATE
  USING (organizer_id = auth.uid());
CREATE POLICY "Organizers delete their tournaments" ON tournaments FOR DELETE
  USING (organizer_id = auth.uid());

-- TOURNAMENT REGISTRATIONS
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrations visible to organizer and participant" ON tournament_registrations FOR SELECT
  USING (
    player_id = auth.uid() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
  );
CREATE POLICY "Players and captains can register" ON tournament_registrations FOR INSERT
  WITH CHECK (player_id = auth.uid() OR
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid()));
CREATE POLICY "Organizers approve registrations" ON tournament_registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()));

-- GROUPS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are public" ON groups FOR SELECT USING (true);
CREATE POLICY "Organizers manage groups" ON groups FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid()));

-- GROUP MEMBERS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members are public" ON group_members FOR SELECT USING (true);

-- MATCHES
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches from public tournaments are viewable" ON matches FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.is_public = true)
    OR EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
  );
CREATE POLICY "Organizers manage matches" ON matches FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid()));

-- MATCH EVENTS
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match events are public" ON match_events FOR SELECT USING (true);
CREATE POLICY "Organizers insert match events" ON match_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t JOIN matches m ON m.tournament_id = t.id
      WHERE m.id = match_id AND t.organizer_id = auth.uid()
    )
  );

-- SCORE SUBMISSIONS
ALTER TABLE score_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants and organizers see submissions" ON score_submissions FOR SELECT
  USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tournaments t JOIN matches m ON m.tournament_id = t.id
      WHERE m.id = match_id AND t.organizer_id = auth.uid()
    )
  );
CREATE POLICY "Authenticated users can submit scores" ON score_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- STANDINGS
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standings are public" ON standings FOR SELECT USING (true);

-- MATCHMAKING QUEUE
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players see their queue entry" ON matchmaking_queue FOR SELECT
  USING (player_id = auth.uid());
CREATE POLICY "Players join/leave queue" ON matchmaking_queue FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- LOBBIES
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lobby participants can view" ON lobbies FOR SELECT
  USING (auth.uid() = ANY(team1_player_ids) OR auth.uid() = ANY(team2_player_ids));

-- BROADCAST SESSIONS
ALTER TABLE broadcast_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live broadcasts are public" ON broadcast_sessions FOR SELECT
  USING (status = 'live' OR organizer_id = auth.uid());
CREATE POLICY "Organizers manage broadcasts" ON broadcast_sessions FOR ALL
  USING (organizer_id = auth.uid());

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- DISCORD INTEGRATIONS
ALTER TABLE discord_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see their integrations" ON discord_integrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clubs WHERE id = club_id AND captain_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND organizer_id = auth.uid())
  );

-- ELO HISTORY
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ELO history is public" ON elo_history FOR SELECT USING (true);

-- MEDIA UPLOADS
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media uploads are public" ON media_uploads FOR SELECT USING (true);
CREATE POLICY "Users manage own uploads" ON media_uploads FOR ALL USING (uploader_id = auth.uid());
