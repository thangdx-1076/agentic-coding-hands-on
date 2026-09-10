-- 0014_kudos_filter_options.sql
--
-- Distinct-value view backing the Hashtag/Phòng ban filter dropdowns on
-- /kudos (F007_KudosLiveBoard, BR-017/FR-215). PostgREST has no DISTINCT
-- operator, and the prior code derived both option lists AND the
-- Spotlight total from the SAME unbounded, unordered `kudos_cards` read —
-- capped silently at `max_rows = 1000` (supabase/config.toml:18). This
-- view fixes the option-list half; `getKudosTotal`
-- (src/dal/kudos-board-aggregates.ts) fixes the count half with a
-- `count: "exact", head: true` read against `kudos` directly — no view
-- needed for that part.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose:
--   * Only `kind`/`value` are exposed — no email/role/locale (SEC_004,
--     same boundary 0005/0006 draw). `department` here is the SAME column
--     `kudos_cards` already exposes per receiver card (0006:56-57), so
--     this view opens no new read surface, only a distinct-value shape of
--     data /kudos (a public page, BR-015) already shows.
--   * `UNION ALL` (not `UNION`) — each branch already carries its own
--     `DISTINCT`, and the two `kind` literals can never collide, so a
--     second, more expensive dedup pass across the whole result buys
--     nothing.
--   * `WHERE hashtags IS NOT NULL` is defensive, not load-bearing:
--     `kudos.hashtags` is `text[] NOT NULL DEFAULT '{}'` (0006) — kept
--     anyway so `unnest` never has to reason about a NULL array.

CREATE OR REPLACE VIEW public.kudos_filter_options
    WITH (security_invoker = false)
AS
SELECT DISTINCT 'hashtag'::text AS kind, h.value AS value
FROM public.kudos k, unnest(k.hashtags) AS h(value)
WHERE k.hashtags IS NOT NULL
UNION ALL
SELECT DISTINCT 'department'::text AS kind, u.department AS value
FROM public.kudos k
JOIN public.users u ON u.id = k.receiver_id
WHERE u.department IS NOT NULL;

COMMENT ON VIEW public.kudos_filter_options IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (kind, value) -- every distinct hashtag and every distinct receiver department present in public.kudos, independent of PostgREST''s max_rows=1000 cap (BR-017/FR-215/FR-217). Backs the Hashtag/Phong ban filter dropdowns on the public /kudos board (src/dal/kudos-board-aggregates.ts''s getKudosFilterOptions). Do NOT widen the SELECT list -- no email/role/locale, ever (SEC_004). Do NOT change this to security_invoker = true -- anon/authenticated would then see nothing (RLS on kudos/users only allows reading one''s own row). anon/authenticated hold SELECT ONLY: this view is a UNION over two tables and so is not auto-updatable, but REVOKE ALL below is kept anyway, matching kudos_cards (0006).';

REVOKE ALL ON public.kudos_filter_options FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_filter_options TO anon, authenticated;
