-- Keep earlier editions for existing clubs and competitions.
INSERT INTO public.games(name, slug, icon_url, is_active)
VALUES ('EA SPORTS FC 27', 'ea-fc-27', NULL, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = true;
