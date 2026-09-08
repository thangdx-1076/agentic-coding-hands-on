-- 0009_kudos_write_anonymity.sql
--
-- First WRITE path into `public.kudos` (F009_KudosCompose, MoMorph screen
-- ihQ26W78P2) plus the anonymity columns that path needs, and the
-- `kudos_cards` view patch that keeps anonymity real instead of cosmetic.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md AD-2/AD-3, clarifications.md § "Quyết định"):
--   * Columns and the view patch MUST ship in the same file. Splitting them
--     would open a window where `is_anonymous` exists but `kudos_cards`
--     still leaks the real sender name to anyone querying the view.
--   * The bucket/storage policies for F009 live in 0010, not here — a
--     different data store (Supabase Storage vs. this table), a different
--     rollback shape, and a hosted-only ownership trap (see 0010's own
--     comment) that must not block this write path if it needs reverting.
--   * No UPDATE/DELETE policy on `kudos`: no spec, test case, or design
--     node for "Viết Kudo" asks for editing/deleting a sent kudo. Adding
--     either would be fabricating a permission nobody requested.

-- Anonymity columns. `is_anonymous` defaults false so every existing row
-- (F007's seed data, migration 0008) keeps behaving exactly as it does
-- today — the `kudos_cards` CASE below only changes output for NEW rows
-- that explicitly opt in. `anonymous_name` is nullable free text, filled
-- only when `is_anonymous = true` (validated in the compose Server Action,
-- not here — no CHECK constraint, matching 0006's `image_urls` comment on
-- why UI-level limits don't become DB constraints).
ALTER TABLE public.kudos
    ADD COLUMN IF NOT EXISTS is_anonymous   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS anonymous_name text;

COMMENT ON COLUMN public.kudos.is_anonymous   IS 'Sender opted to hide their identity on this kudo (F009_KudosCompose). Real sender_id is kept in this table for RLS (kudos_insert_own below) and audit — only the kudos_cards view (this file) hides it from readers.';
COMMENT ON COLUMN public.kudos.anonymous_name IS 'Display name shown instead of the real sender when is_anonymous = true (e.g. "Một Sunner"). NULL when is_anonymous = false.';

-- `kudos_cards` — re-created with the EXACT column list from
-- 0006_kudos.sql:82-101 (F007's DAL, `kudos-cards-query.ts`'s CARD_COLUMNS
-- literal type, selects by these names in this order) — only the 5
-- sender-side columns gain a `CASE WHEN k.is_anonymous` branch. No column
-- added, removed, or reordered (AD-2): `sender_id` is deliberately part of
-- the masked set — hiding the name while leaving the id would let any
-- `authenticated` reader recover the real name via `profile_cards`
-- (SECURITY DEFINER, GRANT SELECT TO authenticated), making "anonymous"
-- cosmetic rather than real.
CREATE OR REPLACE VIEW public.kudos_cards
    WITH (security_invoker = false)
AS
SELECT
    k.id, k.content, k.hashtags, k.image_urls, k.heart_count, k.created_at,
    CASE WHEN k.is_anonymous THEN NULL ELSE su.id END AS sender_id,
    CASE WHEN k.is_anonymous THEN k.anonymous_name ELSE su.full_name END AS sender_full_name,
    CASE WHEN k.is_anonymous THEN NULL ELSE su.avatar_url END AS sender_avatar_url,
    CASE WHEN k.is_anonymous THEN NULL ELSE su.department END AS sender_department,
    CASE WHEN k.is_anonymous THEN 0 ELSE (SELECT count(*)::integer FROM public.kudos WHERE receiver_id = su.id) END AS sender_kudos_received,
    ru.id AS receiver_id, ru.full_name AS receiver_full_name,
    ru.avatar_url AS receiver_avatar_url, ru.department AS receiver_department,
    (SELECT count(*)::integer FROM public.kudos WHERE receiver_id = ru.id) AS receiver_kudos_received
FROM public.kudos k
JOIN public.users su ON su.id = k.sender_id
JOIN public.users ru ON ru.id = k.receiver_id;

COMMENT ON VIEW public.kudos_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, content, hashtags, image_urls, heart_count, created_at) from public.kudos plus (id, full_name, avatar_url, department, kudos_received) for each of sender and receiver from public.users. Runs as its owner (BYPASSRLS) so any Sunner, or an anonymous /kudos visitor, can read the sender/receiver display info that public.users''s own users_select_own policy (migration 0001) would otherwise hide. anon holds SELECT here — unlike 0005_profile_cards_view (authenticated only) — because /kudos is a PUBLIC page (BR-015), the same reasoning 0003_awards_table.sql already applies. Do NOT widen the SELECT list — email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004, same boundary 0005 draws). Do NOT change this to security_invoker = true — that flips RLS back on and every /kudos card stops showing anything but the viewer''s own row. F009_KudosCompose (0009): when k.is_anonymous is true, all 5 sender-side columns are masked (sender_id -> NULL is the UI''s signal to hide the profile link) and sender_full_name/sender_kudos_received read from anonymous_name/0 instead of the real Sunner — the real sender_id stays in public.kudos for RLS and audit, only this view hides it. Do NOT add a new column to signal anonymity (AD-2) — sender_id -> NULL is the only signal the UI needs. anon/authenticated hold SELECT ONLY, never INSERT/UPDATE/DELETE: this view joins two tables and so is NOT auto-updatable in Postgres (unlike profile_cards), but the REVOKE ALL below is kept anyway — the leak this guards against is read exposure, and a future Postgres version making a JOIN view auto-updatable is not a bet worth taking.';

REVOKE ALL ON public.kudos_cards FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_cards TO anon, authenticated;

-- `kudos_insert_own` — the first INSERT policy on `public.kudos`,
-- mirroring the shape of `kudo_hearts_insert_own` (0007_kudo_hearts.sql:
-- 78-84: `FOR INSERT TO authenticated WITH CHECK (...)`) rather than
-- inventing a new one. Unlike kudo_hearts, no self-target guard: sending a
-- kudo to yourself (sender_id = receiver_id) is not a security hole this
-- policy needs to close (odd UX at most), and no test case among this
-- screen's 57 asks for it — not adding a condition nobody requires.
DROP POLICY IF EXISTS kudos_insert_own ON public.kudos;
CREATE POLICY kudos_insert_own ON public.kudos
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());
GRANT INSERT ON public.kudos TO authenticated;
