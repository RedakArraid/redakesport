-- Storage buckets policies (RLS sur storage.objects)
-- Crée les policies pour les buckets: avatars (public), club-assets (public), score-screenshots (privé), match-clips (public)

-- =============================================
-- STORAGE BUCKET POLICIES
-- =============================================

-- Bucket: avatars (public read, authenticated write own)
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: club-assets (public read, club managers write)
CREATE POLICY "Club assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'club-assets');

CREATE POLICY "Club managers can upload club assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'club-assets'
    AND auth.uid() IN (
      SELECT user_id FROM club_members
      WHERE club_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Club managers can update club assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'club-assets'
    AND auth.uid() IN (
      SELECT user_id FROM club_members
      WHERE club_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Club managers can delete club assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'club-assets'
    AND auth.uid() IN (
      SELECT user_id FROM club_members
      WHERE club_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'manager')
    )
  );

-- Bucket: score-screenshots (privé — authenticated users can upload, only match participants & admins can read)
CREATE POLICY "Match participants can read score screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'score-screenshots'
    AND (
      auth.uid() IN (
        SELECT p.user_id FROM profiles p
        JOIN matches m ON (m.team1_id = p.id OR m.team2_id = p.id)
        WHERE m.id::text = (storage.foldername(name))[1]
      )
      OR auth.uid() IN (
        SELECT user_id FROM profiles WHERE role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "Authenticated users can upload score screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'score-screenshots'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Uploader can delete their score screenshot"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'score-screenshots'
    AND auth.uid() = owner
  );

-- Bucket: match-clips (public read, authenticated upload)
CREATE POLICY "Match clips are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'match-clips');

CREATE POLICY "Authenticated users can upload match clips"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'match-clips'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Uploader can delete their match clip"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'match-clips'
    AND auth.uid() = owner
  );

-- =============================================
-- TABLE: seasons (pour Pro League)
-- =============================================
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
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
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
  USING (auth.role() = 'service_role');

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
