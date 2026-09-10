-- 0016_kudos_cards_is_own.sql
--
-- Appends `is_own` to `public.kudos_cards` (F008_KudosHeartReaction, MoMorph
-- screen MaZUn5xHXZ, BR-005) — the missing ownership signal for the sender
-- of an ANONYMOUS kudo. `0009_kudos_write_anonymity.sql` masks
-- `sender_id -> NULL` for an anonymous kudo, which is correct for hiding
-- identity from other readers, but it also means the sender's OWN browser
-- can no longer tell "this is mine" by comparing `sender_id` to the viewer
-- id — the heart button rendered enabled, then Postgres's own
-- `kudo_hearts_insert_own` policy (0007) rejected the insert. A disabled
-- button that matches the real rule beats a live one that silently fails.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Design, verified before writing this file (not assumed):
--   * `kudos_cards` stays `SECURITY DEFINER` (`security_invoker = false`,
--     0006/0009) — flipping it to `security_invoker = true` breaks every
--     card surface (0009's own `COMMENT ON VIEW` says so; anon/authenticated
--     hold no SELECT on the base `kudos`/`users` tables at all). This file
--     does not touch that setting.
--   * `auth.uid()` is safe to reference from inside a SECURITY DEFINER view
--     regardless: `pg_get_functiondef('auth.uid()'::regprocedure)` shows it
--     is itself `SECURITY INVOKER` and reads
--     `current_setting('request.jwt.claim.sub', true)` /
--     `request.jwt.claims->>'sub'` — a per-request GUC that PostgREST sets
--     from the caller's own JWT, not a role-scoped value the view owner
--     could shadow. Verified live: inside one transaction,
--     `SET LOCAL request.jwt.claim.sub`, `SET LOCAL ROLE authenticated`,
--     then `SELECT auth.uid()` returns exactly the claim just set, proving
--     the GUC — not the executing role — is what `auth.uid()` reads.
--   * `is_own` is therefore computed as `k.sender_id = auth.uid()` against
--     the REAL, unmasked `kudos.sender_id` column (the `k` alias, not the
--     `CASE`-masked `sender_id` output column below) — this is a plain
--     boolean comparison, never a value, so it cannot re-expose the real
--     sender's identity: only "yes/no was this me" leaves the view, exactly
--     like the boolean `AD-2` already settled for `sender_id -> NULL`.
--     `k.sender_id` is `NOT NULL` on every row, so this is `NULL` only when
--     `auth.uid()` itself is `NULL` (no session / anon) — an anonymous
--     visitor gets `is_own IS NULL` on every card, which the UI treats the
--     same as `false` (never signed in, never "your" kudo).
--
-- `CREATE OR REPLACE VIEW` can only ADD a column at the END of the select
-- list — reordering or removing any existing column forces Postgres to
-- reject the replace and would require `DROP VIEW ... CASCADE` (losing the
-- REVOKE/GRANT below and needing them reissued). So this file restates
-- `0009_kudos_write_anonymity.sql:49-61` byte-for-byte and appends exactly
-- one column, `is_own`, last.
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
    (k.sender_id = auth.uid()) AS is_own
FROM public.kudos k
JOIN public.users su ON su.id = k.sender_id
JOIN public.users ru ON ru.id = k.receiver_id;

COMMENT ON VIEW public.kudos_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, content, hashtags, image_urls, heart_count, created_at) from public.kudos plus (id, full_name, avatar_url, department, kudos_received) for each of sender and receiver from public.users, plus is_own (0016). Runs as its owner (BYPASSRLS) so any Sunner, or an anonymous /kudos visitor, can read the sender/receiver display info that public.users''s own users_select_own policy (migration 0001) would otherwise hide. anon holds SELECT here — unlike 0005_profile_cards_view (authenticated only) — because /kudos is a PUBLIC page (BR-015), the same reasoning 0003_awards_table.sql already applies. Do NOT widen the SELECT list — email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004, same boundary 0005 draws). Do NOT change this to security_invoker = true — that flips RLS back on and every /kudos card stops showing anything but the viewer''s own row. F009_KudosCompose (0009): when k.is_anonymous is true, all 5 sender-side columns are masked (sender_id -> NULL is the UI''s signal to hide the profile link) and sender_full_name/sender_kudos_received read from anonymous_name/0 instead of the real Sunner — the real sender_id stays in public.kudos for RLS and audit, only this view hides it. Do NOT add a new column to signal anonymity (AD-2) — sender_id -> NULL is the only signal the UI needs. F008_KudosHeartReaction (0016): is_own is a boolean computed from the REAL k.sender_id (the base table, not the masked sender_id output column above) compared to auth.uid() — true when the caller sent this kudo, even when it was sent anonymously, so the UI can disable the heart button (BR-005) without the real sender identity ever leaving this view as a value. NULL for an anonymous (unauthenticated) caller, never a leak of who the real sender is. anon/authenticated hold SELECT ONLY, never INSERT/UPDATE/DELETE: this view joins two tables and so is NOT auto-updatable in Postgres (unlike profile_cards), but the REVOKE ALL below is kept anyway — the leak this guards against is read exposure, and a future Postgres version making a JOIN view auto-updatable is not a bet worth taking.';

REVOKE ALL ON public.kudos_cards FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_cards TO anon, authenticated;
