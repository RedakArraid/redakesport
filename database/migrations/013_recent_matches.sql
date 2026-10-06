-- Broadcast discovery requests the 100 most recent visible matches. Without an
-- index in this exact order, PostgreSQL evaluates match RLS for the entire
-- history before sorting. Read recent rows first and stop at the requested limit.
-- Keep all visibility policies unchanged, including private and draft matches.
CREATE INDEX matches_created ON public.matches(created_at DESC NULLS LAST);
