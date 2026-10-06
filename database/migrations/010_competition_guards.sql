-- Protect the origin of adjudication events and reject unlaunchable hybrid capacities.
ALTER POLICY event_insert ON public.match_events WITH CHECK (
 event_type <> 'forfeit' AND EXISTS(SELECT 1 FROM public.matches m JOIN public.tournaments t ON t.id=m.tournament_id WHERE m.id=match_id AND t.organizer_id=app.user_id())
);
ALTER TABLE public.tournaments ADD CONSTRAINT hybrid_capacity CHECK (format<>'hybrid' OR max_teams IS NULL OR max_teams>=4) NOT VALID;
