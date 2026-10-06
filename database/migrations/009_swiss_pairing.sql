-- Maximum cardinality matching by augmenting paths with odd-cycle contraction.
-- Input neighbours are ordered by score proximity; pairing is deterministic.
CREATE FUNCTION private.maximum_matching(adjacency jsonb) RETURNS integer[]
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE n integer := jsonb_array_length(adjacency); mate integer[]; parent integer[]; base integer[];
 used boolean[]; blossom boolean[]; ancestors boolean[]; queue integer[];
 root integer; v integer; u integer; a integer; b integer; common integer; child integer; i integer; head integer; endpoint integer; prev integer; next_v integer; branch integer;
BEGIN
 IF n=0 THEN RETURN '{}'::integer[]; END IF;
 mate := array_fill(0,ARRAY[n]);
 -- Start with close-score pairs, then repair any stranded vertices globally.
 FOR root IN 1..n LOOP
  IF mate[root]<>0 THEN CONTINUE; END IF;
  FOR u IN SELECT value::integer FROM jsonb_array_elements_text(adjacency->(root-1)) LOOP
   IF u<>root AND mate[u]=0 THEN mate[root]:=u; mate[u]:=root; EXIT; END IF;
  END LOOP;
 END LOOP;
 FOR root IN 1..n LOOP
  IF mate[root]<>0 THEN CONTINUE; END IF;
  parent:=array_fill(0,ARRAY[n]); used:=array_fill(false,ARRAY[n]);
  SELECT array_agg(x) INTO base FROM generate_series(1,n) x;
  queue:=ARRAY[root]; used[root]:=true; head:=1; endpoint:=0;
  WHILE head<=cardinality(queue) AND endpoint=0 LOOP
   v:=queue[head]; head:=head+1;
   FOR u IN SELECT value::integer FROM jsonb_array_elements_text(adjacency->(v-1)) LOOP
    IF u<1 OR u>n THEN RAISE EXCEPTION 'Invalid matching graph'; END IF;
    IF base[v]=base[u] OR mate[v]=u THEN CONTINUE; END IF;
    IF u=root OR (mate[u]<>0 AND parent[mate[u]]<>0) THEN
     -- Find the base shared by the two alternating paths.
     ancestors:=array_fill(false,ARRAY[n]); a:=v;
     LOOP
      a:=base[a]; ancestors[a]:=true;
      EXIT WHEN mate[a]=0;
      a:=parent[mate[a]];
     END LOOP;
     b:=u;
     LOOP
      b:=base[b]; EXIT WHEN ancestors[b]; b:=parent[mate[b]];
     END LOOP;
     common:=b; blossom:=array_fill(false,ARRAY[n]);
     FOR branch IN 1..2 LOOP
      a:=CASE WHEN branch=1 THEN v ELSE u END;
      child:=CASE WHEN branch=1 THEN u ELSE v END;
      WHILE base[a]<>common LOOP
       blossom[base[a]]:=true; blossom[base[mate[a]]]:=true;
       parent[a]:=child; child:=mate[a]; a:=parent[mate[a]];
      END LOOP;
     END LOOP;
     FOR i IN 1..n LOOP
      IF blossom[base[i]] THEN
       base[i]:=common;
       IF NOT used[i] THEN used[i]:=true; queue:=array_append(queue,i); END IF;
      END IF;
     END LOOP;
    ELSIF parent[u]=0 THEN
     parent[u]:=v;
     IF mate[u]=0 THEN endpoint:=u; EXIT; END IF;
     used[mate[u]]:=true; queue:=array_append(queue,mate[u]);
    END IF;
   END LOOP;
  END LOOP;
  v:=endpoint;
  WHILE v<>0 LOOP
   prev:=parent[v]; next_v:=mate[prev]; mate[v]:=prev; mate[prev]:=v; v:=next_v;
  END LOOP;
 END LOOP;
 RETURN mate;
END $$;

CREATE FUNCTION private.swiss_pairing(p_tournament uuid,p_ids uuid[]) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE adjacency jsonb; played jsonb; paired integer[]; result uuid[] := '{}'; i integer;
BEGIN
 IF cardinality(p_ids)=0 THEN RETURN result; END IF;
 -- Materialize previous pairs once: no correlated scans of match history per candidate edge.
 SELECT coalesce(jsonb_object_agg(least(team1_id,team2_id)::text||'/'||greatest(team1_id,team2_id)::text,true),'{}'::jsonb) INTO played
 FROM public.matches WHERE tournament_id=p_tournament AND team1_id IS NOT NULL AND team2_id IS NOT NULL;
 WITH entrants AS (SELECT team_id,points,ord::integer idx FROM unnest(p_ids) WITH ORDINALITY q(team_id,ord)
   JOIN public.standings s USING(team_id) WHERE s.tournament_id=p_tournament ORDER BY ord),
 neighbours AS (
  SELECT a.idx,coalesce((SELECT jsonb_agg(b.idx ORDER BY abs(a.points-b.points),b.idx)
   FROM entrants b WHERE a.idx<>b.idx AND NOT (played ? (least(a.team_id,b.team_id)::text||'/'||greatest(a.team_id,b.team_id)::text))), '[]'::jsonb) adjacent
  FROM entrants a)
 SELECT jsonb_agg(adjacent ORDER BY idx) INTO adjacency FROM neighbours;
 paired:=private.maximum_matching(adjacency);
 IF array_position(paired,0) IS NOT NULL THEN RETURN NULL; END IF;
 FOR i IN 1..cardinality(p_ids) LOOP
  IF i<paired[i] THEN result:=result||ARRAY[p_ids[i],p_ids[paired[i]]]; END IF;
 END LOOP;
 RETURN result;
END $$;

ALTER TABLE public.standings ADD COLUMN buchholz integer NOT NULL DEFAULT 0;
ALTER TABLE public.standings ADD COLUMN sonneborn_berger numeric NOT NULL DEFAULT 0;
REVOKE ALL ON FUNCTION private.maximum_matching(jsonb),private.swiss_pairing(uuid,uuid[]) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.rebuild_standings(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 DELETE FROM public.standings WHERE tournament_id = p_tournament;
 INSERT INTO public.standings(tournament_id,team_id,team_type,group_id,wins,losses,draws,points,map_wins,map_losses)
 SELECT p_tournament, team, max(kind), (array_agg(group_id) FILTER (WHERE group_id IS NOT NULL))[1], sum(w),sum(l),sum(d),sum(w)*3+sum(d),sum(gf),sum(ga)
 FROM (
  SELECT coalesce(r.club_id,r.player_id) team, CASE WHEN r.club_id IS NULL THEN 'player' ELSE 'club' END kind,
   NULL::uuid group_id,0 w,0 l,0 d,0 gf,0 ga FROM public.tournament_registrations r WHERE r.tournament_id = p_tournament AND r.status = 'approved'
  UNION ALL
  SELECT m.team1_id,m.team1_type,m.group_id,CASE WHEN m.winner_id=m.team1_id THEN 1 ELSE 0 END,
   CASE WHEN m.loser_id=m.team1_id THEN 1 ELSE 0 END, CASE WHEN m.winner_id IS NULL AND m.team2_id IS NOT NULL THEN 1 ELSE 0 END,m.score_team1,m.score_team2
   FROM public.matches m WHERE m.tournament_id=p_tournament AND m.status='completed' AND m.team1_id IS NOT NULL AND (m.team2_id IS NOT NULL OR m.bracket_position->>'side'='swiss')
  UNION ALL
  SELECT m.team2_id,m.team2_type,m.group_id,CASE WHEN m.winner_id=m.team2_id THEN 1 ELSE 0 END,
   CASE WHEN m.loser_id=m.team2_id THEN 1 ELSE 0 END, CASE WHEN m.winner_id IS NULL AND m.team1_id IS NOT NULL THEN 1 ELSE 0 END,m.score_team2,m.score_team1
   FROM public.matches m WHERE m.tournament_id=p_tournament AND m.status='completed' AND m.team2_id IS NOT NULL AND m.team1_id IS NOT NULL
 ) results GROUP BY team;
 IF EXISTS(SELECT 1 FROM public.tournaments WHERE id=p_tournament AND format='swiss') THEN
  WITH scores AS MATERIALIZED (
   SELECT team_id,points FROM public.standings WHERE tournament_id=p_tournament
  ), results AS MATERIALIZED (
   SELECT team1_id,team2_id,winner_id FROM public.matches WHERE tournament_id=p_tournament
    AND status='completed' AND team1_id IS NOT NULL AND team2_id IS NOT NULL
  ), opponents AS (
   SELECT team1_id team_id,team2_id opponent,CASE WHEN winner_id=team1_id THEN 1 WHEN winner_id IS NULL THEN 0.5 ELSE 0 END factor FROM results
   UNION ALL
   SELECT team2_id,team1_id,CASE WHEN winner_id=team2_id THEN 1 WHEN winner_id IS NULL THEN 0.5 ELSE 0 END FROM results
  ), totals AS (
   SELECT o.team_id,sum(s.points)::integer bh,sum(s.points*o.factor) sb FROM opponents o JOIN scores s ON s.team_id=o.opponent GROUP BY o.team_id
  )
  UPDATE public.standings s SET buchholz=r.bh,sonneborn_berger=r.sb FROM totals r
  WHERE s.tournament_id=p_tournament AND s.team_id=r.team_id;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION private.progress_tournament(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; current_round integer; n integer; rounds integer; ids uuid[]; a uuid; b uuid; g uuid; group_a uuid[]; group_b uuid[]; pos integer := 0; kind text; mf public.matches; paired uuid[]; bye uuid; next_number integer; i integer;
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
  SELECT max(round),max(match_number)+1 INTO current_round,next_number FROM public.matches WHERE tournament_id=t.id;
  SELECT count(*) INTO n FROM public.tournament_registrations WHERE tournament_id=t.id AND status='approved';
  rounds:=ceil(log(2,n))::integer;
  IF current_round<rounds THEN
   SELECT array_agg(team_id ORDER BY points DESC,buchholz DESC,sonneborn_berger DESC,map_wins-map_losses DESC,team_id) INTO ids FROM public.standings WHERE tournament_id=t.id;
   kind:=CASE WHEN t.team_size=1 THEN 'player' ELSE 'club' END;
   IF n%2=1 THEN
    -- Try the lowest-ranked eligible bye, but only if the remaining whole round can be paired.
    FOR a IN SELECT x FROM unnest(ids) WITH ORDINALITY q(x,i)
     WHERE NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND team1_id=x AND team2_id IS NULL AND status='completed') ORDER BY q.i DESC LOOP
     paired:=private.swiss_pairing(t.id,array_remove(ids,a));
     IF paired IS NOT NULL THEN bye:=a; EXIT; END IF;
    END LOOP;
   ELSE paired:=private.swiss_pairing(t.id,ids);
   END IF;
   IF paired IS NULL THEN RAISE EXCEPTION 'Aucun appariement sans rematch possible'; END IF;
   pos:=0;
   IF bye IS NOT NULL THEN
    INSERT INTO public.matches(tournament_id,round,match_number,team1_id,team1_type,team2_type,status,winner_id,completed_at,bracket_position)
    VALUES(t.id,current_round+1,next_number,bye,kind,kind,'completed',bye,now(),jsonb_build_object('side','swiss','round',current_round+1,'position',pos));
    pos:=pos+1;
   END IF;
   FOR i IN 1..cardinality(paired) BY 2 LOOP
    INSERT INTO public.matches(tournament_id,round,match_number,team1_id,team2_id,team1_type,team2_type,bracket_position)
    VALUES(t.id,current_round+1,next_number+pos,paired[i],paired[i+1],kind,kind,jsonb_build_object('side','swiss','round',current_round+1,'position',pos));
    pos:=pos+1;
   END LOOP;
   PERFORM private.rebuild_standings(t.id);
  END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.matches WHERE tournament_id=t.id AND status<>'completed') THEN
  UPDATE public.tournaments SET status='completed' WHERE id=t.id;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION private.assign_final_positions(p_tournament uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tournaments; final public.matches;
BEGIN
 SELECT * INTO t FROM public.tournaments WHERE id=p_tournament;
 IF t.status IS DISTINCT FROM 'completed' THEN RETURN; END IF;
 IF t.format IN ('round_robin','swiss') THEN
  UPDATE public.standings s SET position=r.rank FROM (
   SELECT team_id,row_number() OVER (ORDER BY points DESC,buchholz DESC,sonneborn_berger DESC,map_wins-map_losses DESC,team_id)::integer rank
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
CREATE INDEX matches_pairing_history ON public.matches(tournament_id,team1_id,team2_id) WHERE team1_id IS NOT NULL AND team2_id IS NOT NULL;

-- Refresh tie-breaks and final positions for existing Swiss competitions.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT id,status FROM public.tournaments WHERE format='swiss' AND status IN ('ongoing','completed') LOOP
  PERFORM private.rebuild_standings(t.id);
  IF t.status='completed' THEN PERFORM private.assign_final_positions(t.id); END IF;
 END LOOP;
END $$;
