ALTER TABLE auth.users ADD COLUMN discord_id text UNIQUE;
-- Manual tournament transitions cannot skip the competition engine.
CREATE FUNCTION private.guard_tournament_status() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF NOT ((OLD.status='draft' AND NEW.status='registration') OR (OLD.status IN ('draft','registration','ongoing') AND NEW.status='cancelled')) THEN RAISE EXCEPTION 'Transition de tournoi non autorisée'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_tournament_status BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION private.guard_tournament_status();
