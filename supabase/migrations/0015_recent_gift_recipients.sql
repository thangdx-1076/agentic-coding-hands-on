-- 0015_recent_gift_recipients.sql
--
-- `recent_gift_recipients` — public read view over `secret_box_openings` for
-- "10 SUNNER NHẬN QUÀ MỚI NHẤT" (F007_KudosLiveBoard, MoMorph screen
-- MaZUn5xHXZ rows D.3/D.3.2/D.3.4, FR-219/BR-020). SQL body copied verbatim
-- from `spec/F007_KudosLiveBoard/technical-spec.md` § 4.2.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- This REVERSES the conclusion recorded at
-- `docs/vi/system/permissions.md:408-414` ("không cần view SECURITY DEFINER
-- nào cho đường đọc" cho `secret_box_openings`) — see
-- `plans/260910-1951-screen-audit-spec-test-gaps/spec/system/permissions.md`
-- for the delta and the reasoning. `/kudos` is a PUBLIC page (BR-015) that
-- must show who opened a Secret Box recently — that is exactly "exposing
-- another Sunner's data", the same shape `kudos_cards` (0006) and
-- `profile_cards` (0005) already exist for; it was never true that no
-- SECURITY DEFINER view would ever be needed for this table.
--
-- `secret_box_openings`'s own RLS (`secret_box_openings_select_own`, 0011)
-- is left completely untouched below — this view is a second, narrower read
-- path alongside it, not a relaxation of the base table's policy.
CREATE OR REPLACE VIEW public.recent_gift_recipients
    WITH (security_invoker = false)
AS
SELECT
    u.id, u.full_name, u.avatar_url, s.badge_key, s.opened_at
FROM public.secret_box_openings s
JOIN public.users u ON u.id = s.user_id
ORDER BY s.opened_at DESC
LIMIT 10;

COMMENT ON VIEW public.recent_gift_recipients IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, full_name, avatar_url, badge_key, opened_at) — id/full_name/avatar_url from public.users, badge_key/opened_at from public.secret_box_openings. (a) Why definer: runs as its owner (BYPASSRLS) so /kudos, a PUBLIC page (BR-015), can render "10 SUNNER NHAN QUA MOI NHAT" for anon and authenticated alike — secret_box_openings itself is own-row RLS only (0011), so a direct SELECT against it can never show one Sunner another Sunner''s opening; this view is the one deliberate, narrow exception, matching kudos_cards (0006) and profile_cards (0005)''s existing posture on this same screen. Do NOT widen the SELECT list — email/role/locale/created_at/updated_at of public.users must never be reachable through this view (SEC_004, same boundary 0005/0006 draw). (b) LIMIT 10 above is a DISPLAY constraint only, NOT a security boundary: anyone querying this view directly still sees the 10 most recent openings across ALL Sunners, not a per-viewer slice — if a future screen needs a different top-N, add a parameterized RPC/function instead of editing this hardcoded LIMIT. (c) Forbidden columns: email, role, locale, created_at, updated_at of public.users — never add them here. Do NOT change security_invoker to true — that re-enables secret_box_openings'' own own-row RLS underneath this view and every /kudos visitor would see an empty result regardless of who actually opened a box. secret_box_openings keeps its existing own-row-only SELECT policy (0011) unchanged; nothing here loosens it.';

REVOKE ALL ON public.recent_gift_recipients FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.recent_gift_recipients TO anon, authenticated;
