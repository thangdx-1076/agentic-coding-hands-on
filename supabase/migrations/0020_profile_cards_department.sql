-- 0020_profile_cards_department.sql
--
-- Add `department` to the profile_cards display card.
--
-- The recipient dropdown in the "Viết Kudo" modal draws each Sunner as
-- avatar + name + department (the design's "Dropdown list người nhận muốn
-- gửi lời chúc"), and `searchSunners` (src/dal/sunner-search.ts) reads this
-- view. Without the column there is nothing to render that third line from.
--
-- Why this is NOT the widening 0005 forbids. That prohibition names its
-- targets explicitly -- `email`, `role`, `locale`, `created_at`,
-- `updated_at` (SEC_004) -- and its stated purpose is to keep a SENSITIVE
-- column from being re-exposed by accident. `department` is in neither
-- category: it is ALREADY public, on a more permissive surface than this
-- one. `kudos_cards` (0006) exposes the receiver's department to `anon` on
-- /kudos, a public page, where every card prints it under the Sunner's
-- name, and `kudos_filter_options` (0014) publishes the distinct list of
-- them to the Phòng ban filter. This view is `authenticated`-only, so the
-- column reaches a STRICTLY SMALLER audience here than where it already
-- ships. The four-column list stays explicit -- never a wildcard -- so the
-- guarantee 0005 actually cares about is untouched.
--
-- `security_invoker = false`, the REVOKE-before-GRANT order, and the
-- SELECT-only grant are all restated verbatim from 0005: CREATE OR REPLACE
-- VIEW keeps neither the ACL reasoning nor the comment, and every argument
-- in 0005's header for those three still applies unchanged.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.

CREATE OR REPLACE VIEW public.profile_cards
    WITH (security_invoker = false)
AS
SELECT
    id,
    full_name,
    avatar_url,
    department
FROM public.users;

COMMENT ON VIEW public.profile_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, full_name, avatar_url, department) from public.users, which is FORCE ROW LEVEL SECURITY with an own-row-only SELECT policy (users_select_own, migration 0001). This view intentionally runs as its owner (BYPASSRLS) so /profile?id={other} can read another Sunner''s display row. Do NOT change this to security_invoker = true to silence the Supabase linter''s security_definer_view warning -- that flips RLS back on for this read path and /profile?id= starts 404ing for every profile but the viewer''s own. Do NOT widen the SELECT list further -- email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004). department was added in 0020 and is NOT an exception to that rule: it is already public to anon through kudos_cards (0006) and kudos_filter_options (0014) on the public /kudos board, whereas this view is authenticated-only, so it reaches a strictly smaller audience here. authenticated holds SELECT ONLY on this view, never INSERT/UPDATE/DELETE -- this view is auto-updatable (single base table) and runs as its BYPASSRLS owner, so any write grant here would let an authenticated caller overwrite another Sunner''s row through users_update_own RLS. Do NOT add a write grant.';

REVOKE ALL ON public.profile_cards FROM anon, PUBLIC, authenticated;

GRANT SELECT ON public.profile_cards TO authenticated;
