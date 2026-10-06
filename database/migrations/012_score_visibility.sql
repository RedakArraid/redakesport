-- Resolve the caller's match scope once per query, instead of rechecking match and
-- tournament RLS for every historical score submission.
CREATE INDEX matches_team2 ON public.matches(team2_id);
CREATE INDEX clubs_captain ON public.clubs(captain_id);
CREATE INDEX tournaments_organizer ON public.tournaments(organizer_id);

CREATE FUNCTION private.score_visible_match_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT m.id FROM public.matches m
 WHERE m.team1_id = app.user_id() AND m.team1_type = 'player'
 UNION
 SELECT m.id FROM public.matches m
 WHERE m.team2_id = app.user_id() AND m.team2_type = 'player'
 UNION
 SELECT m.id FROM public.clubs c JOIN public.matches m ON m.team1_id = c.id
 WHERE c.captain_id = app.user_id() AND m.team1_type IS DISTINCT FROM 'player'
 UNION
 SELECT m.id FROM public.clubs c JOIN public.matches m ON m.team2_id = c.id
 WHERE c.captain_id = app.user_id() AND m.team2_type IS DISTINCT FROM 'player'
 UNION
 SELECT m.id FROM public.tournaments t JOIN public.matches m ON m.tournament_id = t.id
 WHERE t.organizer_id = app.user_id();
$$;
REVOKE ALL ON FUNCTION private.score_visible_match_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.score_visible_match_ids() TO authenticated, service_role;

-- Each branch grants exactly the former score_read scope: representing either
-- participant or owning the tournament already implies can_view_match. Ordinary
-- club members and public spectators gain no access. Former participants retain
-- access only to their own submissions, as before.
DROP POLICY score_read ON public.score_submissions;
CREATE POLICY score_read ON public.score_submissions FOR SELECT TO authenticated USING (
 submitted_by = (SELECT app.user_id())
 OR match_id IN (SELECT private.score_visible_match_ids())
);
