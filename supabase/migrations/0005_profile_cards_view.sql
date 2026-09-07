-- 0005_profile_cards_view.sql
--
-- SECURITY DEFINER view for `/profile` (F006_ProfilePage). Lets a logged-in
-- Sunner read ANOTHER Sunner's display row (`?id=`) even though
-- `public.users` carries `FORCE ROW LEVEL SECURITY` with an own-row-only
-- policy (`users_select_own`, migration 0001) that would otherwise hide it.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Three requirements, each closing one real leak path (see clarifications.md
-- § D002 and phase-03's Key Insights for the full reasoning):
--
--   1. Explicit 3-column SELECT list, never a wildcard (`*`) select. `public.users` also
--      carries `email`, `role`, `locale`, `created_at`, `updated_at` — a
--      column list keeps this view from silently re-exposing a sensitive
--      column some future migration adds to `users`.
--   2. `WITH (security_invoker = false)` written out explicitly. This is
--      Postgres's own default, but writing it makes the intent auditable:
--      the view runs as its OWNER (the migration role, which holds
--      BYPASSRLS), not as the calling `authenticated` user. That is the
--      entire mechanism that lets this view see rows RLS would hide from
--      the caller. Supabase's database linter flags this pattern as
--      `security_definer_view` — that warning is right in general and WRONG
--      here; it is the mechanism chosen on purpose. Do not "fix" it to
--      `security_invoker = true`, or `?id=` on another Sunner's profile goes
--      back to being blocked by `users_select_own` and silently 404s.
--   3. `REVOKE ALL ... FROM anon, PUBLIC, authenticated` BEFORE the
--      `GRANT SELECT ... TO authenticated`. Supabase's local/hosted presets
--      apply `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` (not just
--      SELECT) to `anon`, `authenticated` AND `service_role` for every new
--      object created in schema `public` — confirmed empirically via
--      `pg_default_acl` while building this migration. Two separate leaks
--      follow from that default if left unrevoked:
--        a. `anon` gets `SELECT`, readable with no session at all — every
--           Sunner's name and avatar exposed to the browser-side anon key.
--        b. `authenticated` gets `INSERT`/`UPDATE`/`DELETE` too, not just
--           `SELECT`. Because this view is a simple single-table view over
--           `public.users`, Postgres treats it as auto-updatable, and
--           because the view runs as its BYPASSRLS owner, an `UPDATE` or
--           `DELETE` issued through the view against ANY row would bypass
--           `public.users`'s own-row-only `users_update_own` policy
--           entirely — any authenticated Sunner could overwrite (or null
--           out, via DELETE cascading through the view) any OTHER Sunner's
--           `full_name`/`avatar_url`. This view exists to add a read path,
--           not a privilege-escalated write path, so REVOKE ALL first and
--           GRANT back only `SELECT`.

CREATE OR REPLACE VIEW public.profile_cards
    WITH (security_invoker = false)
AS
SELECT
    id,
    full_name,
    avatar_url
FROM public.users;

COMMENT ON VIEW public.profile_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, full_name, avatar_url) from public.users, which is FORCE ROW LEVEL SECURITY with an own-row-only SELECT policy (users_select_own, migration 0001). This view intentionally runs as its owner (BYPASSRLS) so /profile?id={other} can read another Sunner''s display row. Do NOT change this to security_invoker = true to silence the Supabase linter''s security_definer_view warning — that flips RLS back on for this read path and /profile?id= starts 404ing for every profile but the viewer''s own. Do NOT widen the SELECT list — email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004). authenticated holds SELECT ONLY on this view, never INSERT/UPDATE/DELETE — this view is auto-updatable (single base table) and runs as its BYPASSRLS owner, so any write grant here would let an authenticated caller overwrite another Sunner''s row through users_update_own RLS. Do NOT add a write grant.';

-- Revoked first, from ALL THREE grantees including `authenticated`: default
-- privileges on this Supabase instance grant `anon`/`PUBLIC`/`authenticated`
-- full `INSERT`/`SELECT`/`UPDATE`/`DELETE` on new `public` schema objects.
-- Revoke BEFORE the grant below, not after — reversing this order re-opens
-- both the anon read leak and the authenticated write-escalation path this
-- migration exists to close.
REVOKE ALL ON public.profile_cards FROM anon, PUBLIC, authenticated;

GRANT SELECT ON public.profile_cards TO authenticated;
