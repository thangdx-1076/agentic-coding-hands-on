-- 0022_kudos_cards_distinct_senders.sql
--
-- Add `sender_distinct_senders` / `receiver_distinct_senders` to
-- `kudos_cards`: how many DIFFERENT Sunners have sent that person a kudo.
--
-- This is the number the Hero badge is actually meant to rank on. The
-- design's own tier copy says so in words -- "Có 1-4 người gửi Kudos cho
-- bạn", "Có 5-9 người gửi...", read verbatim off the /standards frames and
-- now shown in the badge's hover card -- while `starTier()` had been ranking
-- on the TOTAL kudos received against 10/20/50 thresholds taken from an
-- early spec draft. Two different measures wearing one badge: a Sunner with
-- zero kudos still displayed "New Hero", captioned "1-4 people sent you
-- Kudos". The caption is the requirement, so the count moves to match it.
--
-- `count(DISTINCT sender_id)`, not `count(*)`: ten kudos from one very
-- enthusiastic colleague is one person, and the tiers are explicitly about
-- how many people reached out. Anonymous kudos still count -- `k.sender_id`
-- on the BASE table is always the real sender (0009 masks it in this view's
-- OUTPUT columns only), so an anonymous thank-you advances the receiver's
-- badge without revealing who sent it.
--
-- `sender_distinct_senders` is masked to 0 on an anonymous kudo, exactly as
-- `sender_kudos_received`/`sender_kudos_sent` are and for the same reason: a
-- real count printed beside a masked name narrows down who they are.
--
-- CREATE OR REPLACE VIEW cannot reorder or retype existing columns, so the
-- two new ones are appended last and every prior column is restated verbatim
-- from 0021.
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
    (SELECT count(*)::integer FROM public.kudos WHERE sender_id = ru.id) AS receiver_kudos_sent,
    CASE WHEN k.is_anonymous THEN 0 ELSE (SELECT count(DISTINCT sender_id)::integer FROM public.kudos WHERE receiver_id = su.id) END AS sender_distinct_senders,
    (SELECT count(DISTINCT sender_id)::integer FROM public.kudos WHERE receiver_id = ru.id) AS receiver_distinct_senders
FROM public.kudos k
JOIN public.users su ON su.id = k.sender_id
JOIN public.users ru ON ru.id = k.receiver_id;

COMMENT ON VIEW public.kudos_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, content, hashtags, image_urls, heart_count, created_at) from public.kudos plus (id, full_name, avatar_url, department, kudos_received, kudos_sent, distinct_senders) for each of sender and receiver from public.users, plus is_own (0016). Runs as its owner (BYPASSRLS) so any Sunner, or an anonymous /kudos visitor, can read the sender/receiver display info that public.users''s own users_select_own policy (migration 0001) would otherwise hide. anon holds SELECT here -- unlike 0005_profile_cards_view (authenticated only) -- because /kudos is a PUBLIC page (BR-015), the same reasoning 0003_awards_table.sql already applies. Do NOT widen the SELECT list -- email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004, same boundary 0005 draws). Do NOT change this to security_invoker = true -- that flips RLS back on and every /kudos card stops showing anything but the viewer''s own row. F009_KudosCompose (0009): when k.is_anonymous is true, all sender-side columns are masked (sender_id -> NULL is the UI''s signal to hide the profile link) and sender_full_name/sender_kudos_received/sender_kudos_sent/sender_distinct_senders read from anonymous_name/0/0/0 instead of the real Sunner -- the real sender_id stays in public.kudos for RLS and audit, only this view hides it. Do NOT add a new column to signal anonymity (AD-2) -- sender_id -> NULL is the only signal the UI needs. F008_KudosHeartReaction (0016): is_own is a boolean computed from the REAL k.sender_id (the base table, not the masked sender_id output column above) compared to auth.uid() -- true when the caller sent this kudo, even when it was sent anonymously, so the UI can disable the heart button (BR-005) without the real sender identity ever leaving this view as a value. NULL for an anonymous (unauthenticated) caller, never a leak of who the real sender is. 0021: sender_kudos_sent/receiver_kudos_sent mirror the received counts for the avatar hover card. 0022: *_distinct_senders counts DIFFERENT senders (count(DISTINCT sender_id)) and is what the Hero badge tiers rank on -- the tier copy is worded "Có N người gửi Kudos cho bạn", i.e. people, not kudos. It counts anonymous kudos too, since it reads the base table''s real sender_id and only ever emits an aggregate. anon/authenticated hold SELECT ONLY, never INSERT/UPDATE/DELETE: this view joins two tables and so is NOT auto-updatable in Postgres (unlike profile_cards), but the REVOKE ALL below is kept anyway -- the leak this guards against is read exposure, and a future Postgres version making a JOIN view auto-updatable is not a bet worth taking.';

REVOKE ALL ON public.kudos_cards FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_cards TO anon, authenticated;
