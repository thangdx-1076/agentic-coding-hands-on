-- 0021_kudos_cards_kudos_sent.sql
--
-- Add `sender_kudos_sent` / `receiver_kudos_sent` to `kudos_cards`.
--
-- The avatar hover card on /kudos shows a Sunner's two counts side by side
-- ("Số Kudos nhận được" / "Số Kudos đã gửi"). The received half already
-- exists (0006); this is its mirror, counted on `sender_id` instead of
-- `receiver_id`, and computed exactly the same way — a correlated
-- `count(*)` subquery, not a join, so the row count of the view is
-- unchanged.
--
-- Anonymity is masked identically to `sender_kudos_received` (0009): an
-- anonymous kudo reports 0 for its sender, because publishing a real "has
-- sent 25 Kudos" figure beside a masked name is a correlation handle for
-- working out who they are. `receiver_kudos_sent` needs no such masking —
-- the receiver is never anonymous.
--
-- CREATE OR REPLACE VIEW cannot reorder or retype existing columns, so the
-- two new ones are appended after `is_own` and every prior column is
-- restated verbatim from 0016.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.

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
    (SELECT count(*)::integer FROM public.kudos WHERE receiver_id = ru.id) AS receiver_kudos_received,
    (k.sender_id = auth.uid()) AS is_own,
    CASE WHEN k.is_anonymous THEN 0 ELSE (SELECT count(*)::integer FROM public.kudos WHERE sender_id = su.id) END AS sender_kudos_sent,
    (SELECT count(*)::integer FROM public.kudos WHERE sender_id = ru.id) AS receiver_kudos_sent
FROM public.kudos k
JOIN public.users su ON su.id = k.sender_id
JOIN public.users ru ON ru.id = k.receiver_id;

COMMENT ON VIEW public.kudos_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, content, hashtags, image_urls, heart_count, created_at) from public.kudos plus (id, full_name, avatar_url, department, kudos_received, kudos_sent) for each of sender and receiver from public.users, plus is_own (0016). Runs as its owner (BYPASSRLS) so any Sunner, or an anonymous /kudos visitor, can read the sender/receiver display info that public.users''s own users_select_own policy (migration 0001) would otherwise hide. anon holds SELECT here -- unlike 0005_profile_cards_view (authenticated only) -- because /kudos is a PUBLIC page (BR-015), the same reasoning 0003_awards_table.sql already applies. Do NOT widen the SELECT list -- email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004, same boundary 0005 draws). Do NOT change this to security_invoker = true -- that flips RLS back on and every /kudos card stops showing anything but the viewer''s own row. F009_KudosCompose (0009): when k.is_anonymous is true, all sender-side columns are masked (sender_id -> NULL is the UI''s signal to hide the profile link) and sender_full_name/sender_kudos_received/sender_kudos_sent read from anonymous_name/0/0 instead of the real Sunner -- the real sender_id stays in public.kudos for RLS and audit, only this view hides it. Do NOT add a new column to signal anonymity (AD-2) -- sender_id -> NULL is the only signal the UI needs. F008_KudosHeartReaction (0016): is_own is a boolean computed from the REAL k.sender_id (the base table, not the masked sender_id output column above) compared to auth.uid() -- true when the caller sent this kudo, even when it was sent anonymously, so the UI can disable the heart button (BR-005) without the real sender identity ever leaving this view as a value. NULL for an anonymous (unauthenticated) caller, never a leak of who the real sender is. 0021: sender_kudos_sent/receiver_kudos_sent mirror the received counts for the avatar hover card; the sender side is masked to 0 on an anonymous kudo for the same de-anonymisation reason the received count is. anon/authenticated hold SELECT ONLY, never INSERT/UPDATE/DELETE: this view joins two tables and so is NOT auto-updatable in Postgres (unlike profile_cards), but the REVOKE ALL below is kept anyway -- the leak this guards against is read exposure, and a future Postgres version making a JOIN view auto-updatable is not a bet worth taking.';

REVOKE ALL ON public.kudos_cards FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_cards TO anon, authenticated;
