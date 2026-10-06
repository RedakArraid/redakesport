-- Series rules are immutable once chosen; all match creation inherits them in PostgreSQL.
ALTER TABLE public.tournaments ADD COLUMN best_of integer NOT NULL DEFAULT 1 CHECK (best_of IN (1,3,5));
ALTER TABLE public.matches ADD CONSTRAINT supported_series CHECK (best_of IN (1,3,5));
ALTER TABLE public.matches ADD COLUMN result_kind text NOT NULL DEFAULT 'played' CHECK (result_kind IN ('played','forfeit'));
ALTER TABLE public.matches ADD COLUMN forfeit_reason text;
CREATE FUNCTION private.inherit_match_rules() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.tournament_id IS NOT NULL THEN SELECT best_of INTO NEW.best_of FROM public.tournaments WHERE id=NEW.tournament_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inherit_match_rules BEFORE INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION private.inherit_match_rules();

CREATE FUNCTION private.validate_match_score(p_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.matches; needed integer;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_id;
 IF m.id IS NULL OR p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 999 OR p_score2 NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Scores invalides'; END IF;
 IF m.best_of>1 THEN
  needed := m.best_of/2+1;
  IF greatest(p_score1,p_score2)<>needed OR least(p_score1,p_score2)>=needed THEN
   RAISE EXCEPTION 'BO% : le vainqueur doit avoir % manches gagnées et son adversaire moins de %',m.best_of,needed,needed;
  END IF;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION private.guard_result_submission() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.matches m JOIN public.tournaments t ON t.id=m.tournament_id WHERE m.id=NEW.match_id AND t.status<>'ongoing') THEN RAISE EXCEPTION 'Le tournoi n’est pas en cours'; END IF;
 PERFORM private.validate_match_score(NEW.match_id,NEW.score_team1,NEW.score_team2);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION private.finish_match(p_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; winner uuid; loser uuid; ra integer; rb integer; delta integer; outcome numeric; u uuid; rating_table text;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_id FOR UPDATE;
 IF m.tournament_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND status='ongoing') THEN RAISE EXCEPTION 'Tournoi non disponible'; END IF;
 PERFORM private.validate_match_score(m.id,p_score1,p_score2);
 IF m.status='completed' THEN RAISE EXCEPTION 'Match déjà terminé'; END IF;
 IF m.team1_id IS NULL OR m.team2_id IS NULL OR p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 999 OR p_score2 NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Score ou adversaire invalide'; END IF;
 IF p_score1=p_score2 AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND (format IN ('round_robin','swiss') OR (format='hybrid' AND m.group_id IS NOT NULL))) THEN RAISE EXCEPTION 'Une égalité est impossible pour ce match'; END IF;
 winner := CASE WHEN p_score1>p_score2 THEN m.team1_id WHEN p_score2>p_score1 THEN m.team2_id END;
 loser := CASE WHEN p_score1>p_score2 THEN m.team2_id WHEN p_score2>p_score1 THEN m.team1_id END;
 UPDATE public.matches SET score_team1=p_score1,score_team2=p_score2,winner_id=winner,loser_id=loser,status='completed',completed_at=now() WHERE id=m.id;
 UPDATE public.score_submissions SET status=CASE WHEN score_team1=p_score1 AND score_team2=p_score2 THEN 'confirmed' ELSE 'disputed' END WHERE match_id=m.id;
 IF m.result_kind='played' THEN
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
 END IF;
 FOR u IN SELECT id FROM public.profiles WHERE id IN(m.team1_id,m.team2_id) AND m.team1_type='player'
 UNION SELECT player_id FROM public.club_members WHERE club_id IN(m.team1_id,m.team2_id) AND m.team1_type='club' LOOP
  INSERT INTO public.notifications(user_id,type,title,body,data) VALUES(u,'match_completed',CASE WHEN m.result_kind='forfeit' THEN 'Match terminé par forfait' ELSE 'Résultat confirmé' END,CASE WHEN m.result_kind='forfeit' THEN 'Forfait : '||m.forfeit_reason ELSE p_score1 || ' — ' || p_score2 END,jsonb_build_object('match_id',m.id));
 END LOOP;
 PERFORM private.progress_tournament(m.tournament_id);
END $$;

-- The owner adjudicates a forfeiture, or a participant concedes their own match.
-- The same tournament/match locks as score confirmation serialize simultaneous decisions.
CREATE FUNCTION public.forfeit_match(p_match_id uuid,p_loser_id uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.matches; t public.tournaments; needed integer;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_match_id;
 SELECT * INTO t FROM public.tournaments WHERE id=m.tournament_id FOR UPDATE;
 SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
 IF app.user_id() IS NULL OR m.id IS NULL OR (m.tournament_id IS NOT NULL AND t.status IS DISTINCT FROM 'ongoing') OR m.status NOT IN ('pending','live','disputed') OR m.team1_id IS NULL OR m.team2_id IS NULL THEN RAISE EXCEPTION 'Match non disponible'; END IF;
 IF p_loser_id IS NULL OR p_loser_id NOT IN (m.team1_id,m.team2_id) THEN RAISE EXCEPTION 'Participant invalide'; END IF;
 IF t.organizer_id IS DISTINCT FROM app.user_id() AND NOT private.represents(p_loser_id,CASE WHEN p_loser_id=m.team1_id THEN m.team1_type ELSE m.team2_type END) THEN RAISE EXCEPTION 'Seul l’organisateur ou le participant qui abandonne peut déclarer ce forfait'; END IF;
 IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Un motif de 5 à 1000 caractères est requis'; END IF;
 UPDATE public.matches SET result_kind='forfeit',forfeit_reason=trim(p_reason) WHERE id=m.id;
 needed := m.best_of/2+1;
 INSERT INTO public.match_events(match_id,event_type,team_id,player_id,data)
 VALUES(m.id,'forfeit',p_loser_id,app.user_id(),jsonb_build_object('description',trim(p_reason),'decided_by',app.user_id()));
 PERFORM private.finish_match(m.id,CASE WHEN p_loser_id=m.team1_id THEN 0 ELSE needed END,CASE WHEN p_loser_id=m.team2_id THEN 0 ELSE needed END);
END $$;
REVOKE ALL ON FUNCTION private.inherit_match_rules(),private.validate_match_score(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
-- Called by the invoker trigger when participants insert their declarations.
GRANT EXECUTE ON FUNCTION private.validate_match_score(uuid,integer,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.forfeit_match(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.forfeit_match(uuid,uuid,text) TO authenticated;
