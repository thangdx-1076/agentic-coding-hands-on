-- 0011_secret_box.sql
--
-- `secret_box_openings` table + `open_secret_box()` RPC (F000_SecretBoxModal,
-- MoMorph screen J3-4YFIpMM). Every 5 hearts a Sunner earns on kudos THEY
-- SENT unlocks one Secret Box open; opening draws one of 6 badges at fixed
-- weights and is the repo's first `.rpc()` call (grep -rn "\.rpc(" src →
-- previously empty).
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up`, or directly via
-- `psql -f` against the local instance — never a reset.
--
-- Scope, on purpose (plan.md phase-02, clarifications.md § "Kỹ thuật — nơi
-- đặt tính ngẫu nhiên"):
--   * Log table, not a counter column. `unopened` is always a live
--     recomputation — `floor(sum(kudos.heart_count WHERE sender_id = me)/5)
--     - count(secret_box_openings WHERE user_id = me)` — so it can never
--     desync from `kudos.heart_count`. A stored counter would need a NEW
--     trigger cascading off 0007's `sync_kudo_heart_count`
--     (trigger-on-trigger), the exact coupling 0007 avoided by keeping
--     `heart_count` a plain denorm column with one writer. This table also
--     doubles as the future `BadgeCollection` unlock source
--     (badge-collection.tsx:9-14) — out of scope for this PR, but the data
--     already fits it.
--   * Hearts credit the kudo's SENDER, not the receiver — settled by
--     0007:30-37 and mirrored in `src/dal/kudos-stats.ts:19-25`. This
--     function reads `kudos.sender_id`, never `receiver_id`.
--   * The weighted draw and the entitlement check both live in this
--     `SECURITY DEFINER` function, never in application code: test cases
--     5cc072ad/2e7bec78 require the box count and badge to always come
--     from the backend even if a client is modified to lie. `authenticated`
--     is never granted INSERT on this table — the function is the only
--     writer, same posture as 0007's `kudo_hearts` trigger.
--   * `pg_advisory_xact_lock`, not `SELECT ... FOR UPDATE`: before a
--     Sunner's first opening there is no row to lock. The advisory xact
--     lock serializes concurrent calls for the same user and releases
--     automatically at commit/rollback; the losing call blocks, then
--     re-reads `opened` (now incremented) inside its own transaction and
--     correctly raises `no_boxes_left` if entitlement is exhausted. No
--     client-side retry is needed.
--   * `FORCE ROW LEVEL SECURITY` is set below, matching 0006/0007's shape,
--     and it does NOT block this function's own INSERT: `FORCE` only
--     starts applying RLS to a table's OWNER, and ownership bypass is
--     itself overridden by the `BYPASSRLS` role attribute regardless of
--     `FORCE`. This function is `SECURITY DEFINER`, so it executes as its
--     owner — `postgres` on this instance, which carries
--     `rolbypassrls = true` (same fact 0007's header already verifies:
--     `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user` → t
--     on `supabase_db_saa-app`). Verified directly for this migration too
--     (see the implementer report) — the function's INSERT succeeds with
--     `FORCE` in place.
--   * Errors are raised (`unauthenticated` / `no_boxes_left`), not returned
--     as a sentinel row, to match this migration's own spec (phase-02
--     Requirements + Success Criteria #1/#2) and the researcher sketch this
--     file follows — both conditions are genuinely exceptional (no
--     session, or entitlement exhausted), not part of a normal control
--     flow the caller branches on per call; the Next.js server action
--     (phase 04) surfaces the raised message as an error toast, the same
--     boundary `toggleKudoHeart` already relies on for `kudo_hearts`.
--   * `RETURNS TABLE` means `.rpc("open_secret_box")` resolves to an ARRAY
--     of one row — `[{ badge_key, unopened }]` — not a bare object. No
--     Supabase types are generated in this repo (no `database.types.ts`
--     anywhere outside `node_modules`), so nothing at compile time catches
--     a caller that assumes an object; phase 04's DAL must index `[0]` and
--     boundary-check the row through `unknown` before trusting it.

CREATE TABLE IF NOT EXISTS public.secret_box_openings (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_key  text        NOT NULL CHECK (badge_key IN (
                              'stay-gold', 'flow-to-horizon', 'touch-of-light',
                              'beyond-the-boundary', 'revival', 'root-further'
                            )),
    opened_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.secret_box_openings IS
  'One Sunner opening one Secret Box (F000_SecretBoxModal). Append-only log — "unopened" is always recomputed as entitlement minus count(*) here, never a stored counter. The only writer is open_secret_box() (SECURITY DEFINER, below); authenticated holds SELECT only, never INSERT.';
COMMENT ON COLUMN public.secret_box_openings.badge_key IS
  'One of exactly 6 values (DISC-001), kebab-case matching the asset stems already shipped at public/standards/badge-{value}.png — do not introduce a second naming scheme.';

-- open_secret_box()'s own recompute reads this by user_id on every call;
-- the SELECT policy below filters by the same column for every viewer.
CREATE INDEX IF NOT EXISTS idx_secret_box_openings_user_id
    ON public.secret_box_openings (user_id);

ALTER TABLE public.secret_box_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_box_openings FORCE  ROW LEVEL SECURITY;

-- Revoked first, from ALL THREE grantees including `authenticated` — same
-- reasoning as 0006/0007's REVOKE: default privileges on this Supabase
-- instance grant broad access to new `public` schema objects, and
-- reversing this order would briefly re-open a write path no policy here
-- ever justifies.
REVOKE ALL ON public.secret_box_openings FROM anon, PUBLIC, authenticated;

-- A Sunner may see only their own openings (feeds the future
-- BadgeCollection read, and matches this table's SELECT-only posture).
DROP POLICY IF EXISTS secret_box_openings_select_own ON public.secret_box_openings;
CREATE POLICY secret_box_openings_select_own ON public.secret_box_openings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
GRANT SELECT ON public.secret_box_openings TO authenticated;

-- No INSERT/UPDATE/DELETE grant to anyone, including `authenticated`: the
-- only write path is open_secret_box() below, running as table owner.

-- SECURITY DEFINER: the only way a row here is ever written, given
-- `authenticated` holds no INSERT grant on this table at all (above). Runs
-- as its owner (postgres, rolbypassrls = true) so FORCE ROW LEVEL SECURITY
-- above never blocks its own INSERT (see header). SET search_path pins
-- name resolution against privilege escalation via a hijacked
-- search_path — same guard as 0002's handle_new_user and 0007's
-- sync_kudo_heart_count.
CREATE OR REPLACE FUNCTION public.open_secret_box()
RETURNS TABLE (badge_key text, unopened int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_entitlement int;
  v_opened      int;
  v_badge       text;
  v_roll        numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  -- Serializes concurrent/double-clicked calls for the SAME user across
  -- sessions or tabs. There is no natural row to SELECT ... FOR UPDATE on
  -- before a user's first opening exists, so an advisory xact lock (keyed
  -- on the user, auto-released at commit/rollback) is the standard
  -- Postgres answer to this shape of race (BR-003, SC-003).
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- Recomputed INSIDE the locked transaction — never trust a value read
  -- before the lock was acquired. Hearts credit the kudo's SENDER (see
  -- header); ALG-001/BR-002.
  SELECT floor(COALESCE(SUM(k.heart_count), 0) / 5)::int INTO v_entitlement
    FROM public.kudos k
   WHERE k.sender_id = v_user_id;

  SELECT count(*)::int INTO v_opened
    FROM public.secret_box_openings
   WHERE user_id = v_user_id;

  IF v_opened >= v_entitlement THEN
    RAISE EXCEPTION 'no_boxes_left' USING ERRCODE = 'P0001';
  END IF;

  -- Weighted draw, cumulative thresholds over `random() * 100`
  -- (BR-001/ALG-001): Stay Gold 30, Flow to Horizon 25, Touch of Light 20,
  -- Beyond the Boundary 10, Revival 10, Root Further 5 — sums to 100.
  -- Not a security-sensitive random value (no crypto requirement here,
  -- only distribution correctness) — do not "harden" this to
  -- gen_random_bytes.
  v_roll := random() * 100;
  v_badge := CASE
    WHEN v_roll < 30 THEN 'stay-gold'
    WHEN v_roll < 55 THEN 'flow-to-horizon'
    WHEN v_roll < 75 THEN 'touch-of-light'
    WHEN v_roll < 85 THEN 'beyond-the-boundary'
    WHEN v_roll < 95 THEN 'revival'
    ELSE 'root-further'
  END;

  -- Duplicates across openings are ALLOWED by design (clarifications.md
  -- § "Trùng huy hiệu") — no dedupe check here.
  INSERT INTO public.secret_box_openings (user_id, badge_key)
  VALUES (v_user_id, v_badge);

  -- `.rpc("open_secret_box")` resolves this as an ARRAY of one row:
  -- `[{ badge_key: v_badge, unopened: v_entitlement - v_opened - 1 }]`.
  RETURN QUERY SELECT v_badge, (v_entitlement - v_opened - 1);
END;
$$;

COMMENT ON FUNCTION public.open_secret_box IS
  'RPC (F000_SecretBoxModal). Resolves identity from auth.uid() only — never accepts a user id parameter. Serializes per-user via pg_advisory_xact_lock, rechecks entitlement inside the transaction, then draws and inserts one badge. Raises unauthenticated (28000) with no session, or no_boxes_left (P0001) at zero entitlement — neither path inserts a row. Returns TABLE(badge_key text, unopened int), which PostgREST/.rpc() surfaces as an array of one row, not a bare object.';

-- `authenticated` may call the function; `anon`/`PUBLIC` may not (FR-601).
REVOKE EXECUTE ON FUNCTION public.open_secret_box() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_secret_box() TO authenticated;
