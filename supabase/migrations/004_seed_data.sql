-- ============================================================
-- Seed data — Games (from data.jsx mockup)
-- ============================================================

INSERT INTO games (name, slug, icon_url, is_active) VALUES
  ('EA FC 26', 'ea-fc-26', NULL, true),
  ('Valorant', 'valorant', NULL, true),
  ('Counter-Strike 2', 'cs2', NULL, true),
  ('Rocket League', 'rocket-league', NULL, true),
  ('Fortnite', 'fortnite', NULL, true),
  ('Call of Duty', 'call-of-duty', NULL, true),
  ('League of Legends', 'league-of-legends', NULL, true),
  ('Apex Legends', 'apex-legends', NULL, true)
ON CONFLICT (slug) DO NOTHING;
