DROP POLICY tournament_read ON tournaments;
CREATE POLICY tournament_read ON tournaments FOR SELECT USING ((is_public AND status <> 'draft') OR organizer_id=app.user_id() OR private.can_view_tournament(id));
