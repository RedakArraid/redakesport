-- Keep tournament results closed once a competition has been cancelled.
CREATE FUNCTION private.guard_result_submission() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.matches m JOIN public.tournaments t ON t.id=m.tournament_id WHERE m.id=NEW.match_id AND t.status<>'ongoing') THEN
  RAISE EXCEPTION 'Le tournoi n’est pas en cours';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER score_tournament_guard BEFORE INSERT OR UPDATE OF score_team1,score_team2 ON score_submissions FOR EACH ROW EXECUTE FUNCTION private.guard_result_submission();
CREATE UNIQUE INDEX unique_club_membership ON club_members(player_id);
CREATE UNIQUE INDEX username_case_insensitive ON profiles(lower(username));
-- Keep opaque evidence addresses on our API; no untrusted external URL is rendered as an attachment.
ALTER TABLE score_submissions ADD CONSTRAINT score_evidence_count CHECK (cardinality(screenshot_urls)<=4);
