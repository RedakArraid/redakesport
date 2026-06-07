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
