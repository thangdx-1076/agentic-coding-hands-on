-- 0018_kudos_filter_options_exclude_title.sql
--
-- Keep the "Danh hiệu" out of the Hashtag filter dropdown on /kudos.
--
-- `public.kudos.hashtags` is not a flat tag list: element 1 is the Danh hiệu
-- (the kudo's title) and elements 2..6 are the hashtag CHIPS. That split is
-- the schema's own contract -- see `create-kudo.ts:149`, which writes
-- `[title, ...chips]`, and `kudos-hashtag-list.tsx`, which renders element 1
-- as the featured title above the card body rather than as a chip.
--
-- 0014 unnested the whole array, so every title leaked into the Hashtag
-- filter as though it were a tag: the dropdown offered `IDOL GIỚI TRẺ` (a
-- title, carried by 8 of the 11 seeded kudos) alongside the two real tags.
-- The design's own filter frame lists only real hashtags.
--
-- `WITH ORDINALITY` is what makes the fix possible at all -- `unnest` alone
-- discards position, so there was no way to tell element 1 from the rest.
-- `ord > 1` drops exactly the title. A kudo whose array holds ONLY a title
-- (no chips) now contributes nothing here, which is correct: it has no
-- hashtag to filter by.
--
-- Filtering itself is unchanged and still matches the whole array
-- (`src/dal/kudos.ts`'s `selectCards`) -- this view only decides what the
-- dropdown OFFERS. The department half is untouched, and is restated
-- verbatim because CREATE OR REPLACE VIEW replaces the whole definition.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.

CREATE OR REPLACE VIEW public.kudos_filter_options
    WITH (security_invoker = false)
AS
SELECT DISTINCT 'hashtag'::text AS kind, h.value AS value
FROM public.kudos k, unnest(k.hashtags) WITH ORDINALITY AS h(value, ord)
WHERE k.hashtags IS NOT NULL AND h.ord > 1
UNION ALL
SELECT DISTINCT 'department'::text AS kind, u.department AS value
FROM public.kudos k
JOIN public.users u ON u.id = k.receiver_id
WHERE u.department IS NOT NULL;

COMMENT ON VIEW public.kudos_filter_options IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (kind, value) -- every distinct hashtag CHIP and every distinct receiver department present in public.kudos, independent of PostgREST''s max_rows=1000 cap (BR-017/FR-215/FR-217). Element 1 of kudos.hashtags is the Danh hieu (title), NOT a hashtag, and is excluded here via WITH ORDINALITY (migration 0018) -- do not drop that ord > 1 predicate. Backs the Hashtag/Phong ban filter dropdowns on the public /kudos board (src/dal/kudos-board-aggregates.ts''s getKudosFilterOptions). Do NOT widen the SELECT list -- no email/role/locale, ever (SEC_004). Do NOT change this to security_invoker = true -- anon/authenticated would then see nothing (RLS on kudos/users only allows reading one''s own row). anon/authenticated hold SELECT ONLY: this view is a UNION over two tables and so is not auto-updatable, but REVOKE ALL below is kept anyway, matching kudos_cards (0006).';

REVOKE ALL ON public.kudos_filter_options FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_filter_options TO anon, authenticated;
