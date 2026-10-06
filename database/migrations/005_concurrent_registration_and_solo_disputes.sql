-- Reject stale bracket plans and allow solo opponents to reconcile their disputed score.
CREATE OR REPLACE FUNCTION public.install_bracket(p_user uuid,p_tournament uuid,p_plan jsonb) RETURNS void
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
 IF EXISTS (
  (SELECT (value->>'team1_id')::uuid FROM jsonb_array_elements(p_plan->'matches') WHERE value->>'team1_id' IS NOT NULL
   UNION SELECT (value->>'team2_id')::uuid FROM jsonb_array_elements(p_plan->'matches') WHERE value->>'team2_id' IS NOT NULL)
  EXCEPT SELECT coalesce(club_id,player_id) FROM public.tournament_registrations WHERE tournament_id=t.id AND status='approved'
 ) THEN RAISE EXCEPTION 'Les inscriptions ont changé, relance la génération'; END IF;
 INSERT INTO public.groups(id,tournament_id,name,stage) SELECT id,tournament_id,name,stage FROM jsonb_populate_recordset(NULL::public.groups,p_plan->'groups');
 INSERT INTO public.group_members(group_id,club_id,player_id) SELECT group_id,club_id,player_id FROM jsonb_populate_recordset(NULL::public.group_members,p_plan->'members');
 INSERT INTO public.matches(id,tournament_id,group_id,round,match_number,bracket_position,team1_id,team2_id,team1_type,team2_type,status,best_of,next_match_id,next_match_slot,loser_match_id,loser_match_slot)
 SELECT id,tournament_id,group_id,round,match_number,bracket_position,team1_id,team2_id,team1_type,team2_type,'pending',best_of,next_match_id,next_match_slot,loser_match_id,loser_match_slot FROM jsonb_populate_recordset(NULL::public.matches,p_plan->'matches');
 UPDATE public.tournaments SET status='ongoing' WHERE id=t.id;
 PERFORM private.progress_tournament(t.id);
END $$;

CREATE OR REPLACE FUNCTION public.submit_score(p_match_id uuid,p_score1 integer,p_score2 integer,p_screenshots text[] DEFAULT '{}') RETURNS jsonb
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
 IF (m.status NOT IN ('pending','live') AND NOT (m.status='disputed' AND m.tournament_id IS NULL)) OR m.team1_id IS NULL OR m.team2_id IS NULL THEN RAISE EXCEPTION 'Match non disponible'; END IF;
 IF p_score1 IS NULL OR p_score2 IS NULL OR p_score1 NOT BETWEEN 0 AND 999 OR p_score2 NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Scores invalides'; END IF;
 IF p_score1=p_score2 AND NOT EXISTS(SELECT 1 FROM public.tournaments WHERE id=m.tournament_id AND (format IN ('round_robin','swiss') OR (format='hybrid' AND m.group_id IS NOT NULL))) THEN RAISE EXCEPTION 'Une égalité est impossible pour ce match'; END IF;
 IF cardinality(p_screenshots)>4 OR EXISTS(SELECT 1 FROM unnest(p_screenshots) s WHERE length(s)>2048 OR s ~ '[\r\n]') THEN RAISE EXCEPTION 'Pièces jointes invalides'; END IF;
 INSERT INTO public.score_submissions(match_id,submitted_by,team_id,score_team1,score_team2,screenshot_urls)
 VALUES(m.id,app.user_id(),team,p_score1,p_score2,coalesce(p_screenshots,'{}'))
 ON CONFLICT (match_id,team_id) WHERE team_id IS NOT NULL DO UPDATE SET score_team1=EXCLUDED.score_team1,score_team2=EXCLUDED.score_team2,screenshot_urls=EXCLUDED.screenshot_urls,submitted_at=now(),status='pending';
 SELECT * INTO other FROM public.score_submissions WHERE match_id=m.id AND team_id<>team AND status IN ('pending','disputed') LIMIT 1;
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
