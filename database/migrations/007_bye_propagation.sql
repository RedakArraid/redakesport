-- Do not resolve a bye until completed incoming results have reached their slots.
CREATE OR REPLACE FUNCTION private.settle_bracket(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.matches; target uuid; slot integer; participant uuid; kind text; changed boolean; side text; f text;
BEGIN
 SELECT format INTO f FROM public.tournaments WHERE id = p_tournament;
 LOOP
  changed := false;
  FOR m IN SELECT * FROM public.matches WHERE tournament_id=p_tournament AND status='completed' LOOP
   FOR target,slot,participant,kind IN SELECT m.next_match_id,m.next_match_slot,m.winner_id,CASE WHEN m.winner_id=m.team1_id THEN m.team1_type ELSE m.team2_type END
     UNION ALL SELECT m.loser_match_id,m.loser_match_slot,m.loser_id,CASE WHEN m.loser_id=m.team1_id THEN m.team1_type ELSE m.team2_type END LOOP
    IF target IS NOT NULL AND participant IS NOT NULL THEN
     IF slot=1 THEN UPDATE public.matches SET team1_id=participant,team1_type=kind WHERE id=target AND team1_id IS NULL;
     ELSE UPDATE public.matches SET team2_id=participant,team2_type=kind WHERE id=target AND team2_id IS NULL; END IF;
     changed := changed OR FOUND;
    END IF;
   END LOOP;
  END LOOP;
  FOR m IN SELECT * FROM public.matches WHERE tournament_id=p_tournament AND status='pending' AND (team1_id IS NULL OR team2_id IS NULL) LOOP
   side := m.bracket_position->>'side';
   IF side IN ('group','reset') OR (f='hybrid' AND side='winners' AND m.notes IS DISTINCT FROM 'Qualifiés des poules') THEN CONTINUE; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.matches WHERE (next_match_id=m.id OR loser_match_id=m.id) AND (status <> 'completed'
    OR (next_match_id=m.id AND winner_id IS NOT NULL AND winner_id IS DISTINCT FROM CASE next_match_slot WHEN 1 THEN m.team1_id ELSE m.team2_id END)
    OR (loser_match_id=m.id AND loser_id IS NOT NULL AND loser_id IS DISTINCT FROM CASE loser_match_slot WHEN 1 THEN m.team1_id ELSE m.team2_id END))) THEN
    UPDATE public.matches SET status='completed',winner_id=coalesce(team1_id,team2_id),completed_at=now() WHERE id=m.id;
    changed := true;
   END IF;
  END LOOP;
  EXIT WHEN NOT changed;
 END LOOP;
END $$;
