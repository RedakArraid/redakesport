-- Freeze cancelled competitions and publish placements based on elimination, not points.


CREATE OR REPLACE FUNCTION private.progress_tournament(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; current_round integer; n integer; rounds integer; ids uuid[]; a uuid; b uuid; g uuid; group_a uuid[]; group_b uuid[]; pos integer := 0; kind text; mf public.matches;
BEGIN
 IF p_tournament IS NULL THEN RETURN; END IF;
 SELECT * INTO t FROM public.tournaments WHERE id=p_tournament FOR UPDATE;
 IF t.status IS DISTINCT FROM 'ongoing' THEN RETURN; END IF;
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

CREATE OR REPLACE FUNCTION private.finish_match(p_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; winner uuid; loser uuid; ra integer; rb integer; delta integer; outcome numeric; u uuid; rating_table text;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_id FOR UPDATE;
 IF m.tournament_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND status='ongoing') THEN RAISE EXCEPTION 'Tournoi non disponible'; END IF;
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

CREATE OR REPLACE FUNCTION public.resolve_score(p_match_id uuid,p_score1 integer,p_score2 integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; t public.tournaments;
BEGIN
 SELECT * INTO m FROM public.matches WHERE id=p_match_id;
 SELECT * INTO t FROM public.tournaments WHERE id=m.tournament_id FOR UPDATE;
 IF app.user_id() IS NULL OR t.organizer_id IS DISTINCT FROM app.user_id() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
 IF t.status IS DISTINCT FROM 'ongoing' THEN RAISE EXCEPTION 'Tournoi non disponible'; END IF;
 SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
 IF m.status<>'disputed' THEN RAISE EXCEPTION 'Aucun litige à résoudre'; END IF;
 PERFORM private.finish_match(m.id,p_score1,p_score2);
END $$;

CREATE FUNCTION private.assign_final_positions(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; final public.matches;
BEGIN
 SELECT * INTO t FROM public.tournaments WHERE id=p_tournament;
 IF t.status IS DISTINCT FROM 'completed' THEN RETURN; END IF;
 IF t.format IN ('round_robin','swiss') THEN
  UPDATE public.standings s SET position=r.rank FROM (
   SELECT team_id,row_number() OVER (ORDER BY points DESC,map_wins-map_losses DESC,team_id)::integer rank
   FROM public.standings WHERE tournament_id=t.id
  ) r WHERE s.tournament_id=t.id AND s.team_id=r.team_id;
  RETURN;
 END IF;
 SELECT * INTO final FROM public.matches WHERE tournament_id=t.id AND winner_id IS NOT NULL
 AND (bracket_position->>'side' IN ('grand_final','reset') OR (bracket_position->>'side'='winners' AND next_match_id IS NULL))
 ORDER BY CASE bracket_position->>'side' WHEN 'reset' THEN 0 WHEN 'grand_final' THEN 1 ELSE 2 END,round DESC LIMIT 1;
 IF final.id IS NULL THEN RETURN; END IF;
 IF t.format='double_elimination' THEN
  UPDATE public.standings s SET position=3+(SELECT count(*) FROM public.matches later
   WHERE later.tournament_id=t.id AND later.bracket_position->>'side'='losers' AND later.loser_id IS NOT NULL AND later.round>m.round)
  FROM public.matches m WHERE s.tournament_id=t.id AND m.tournament_id=t.id
   AND m.bracket_position->>'side'='losers' AND s.team_id=m.loser_id;
 ELSE
  -- No placement game: entrants eliminated in the same round share a position.
  UPDATE public.standings SET position=5 WHERE tournament_id=t.id AND t.format='hybrid';
  UPDATE public.standings s SET position=1+power(2,final.round-m.round)::integer
  FROM public.matches m WHERE s.tournament_id=t.id AND m.tournament_id=t.id
   AND m.bracket_position->>'side'='winners' AND s.team_id=m.loser_id;
 END IF;
 UPDATE public.standings SET position=CASE WHEN team_id=final.winner_id THEN 1 ELSE 2 END
 WHERE tournament_id=t.id AND team_id IN (final.winner_id,final.loser_id);
END $$;
CREATE FUNCTION private.on_tournament_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM private.assign_final_positions(NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER tournament_final_positions AFTER UPDATE OF status ON public.tournaments
FOR EACH ROW WHEN (NEW.status='completed' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION private.on_tournament_completed();
REVOKE ALL ON FUNCTION private.assign_final_positions(uuid),private.on_tournament_completed() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t uuid; BEGIN
 FOR t IN SELECT id FROM public.tournaments WHERE status='completed' LOOP
  PERFORM private.assign_final_positions(t);
 END LOOP;
END $$;
