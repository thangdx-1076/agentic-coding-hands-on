-- 0007_kudo_hearts.sql
--
-- `kudo_hearts` table + trigger that keeps `kudos.heart_count` in sync
-- (F008_KudosHeartReaction, MoMorph screen MaZUn5xHXZ, item C.4.1).
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md AD-1, clarifications.md § "Lượt tim cộng vào
-- tài khoản NGƯỜI GỬI"):
--   * One heart per (kudo, user) is enforced by a UNIQUE constraint, never
--     by a read-then-write check in application code — that race is
--     exactly what UNIQUE exists to close (BR-001).
--   * A sender can never heart their own kudo — enforced in the INSERT
--     policy's WITH CHECK below, not by a disabled button. A direct REST
--     call bypassing the UI is still rejected by Postgres (BR-002).
--   * `kudos.heart_count` (0006) stays a plain denormalized column; this
--     file's trigger is its ONLY writer. `authenticated` is never granted
--     UPDATE on `kudos` (see 0006's REVOKE), so the trigger runs
--     SECURITY DEFINER, which works because `postgres` carries
--     rolbypassrls = true (verified on `supabase_db_saa-app`:
--     `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user` → t).
--   * The `special` column is written now, defaulted `false`, and read by
--     the trigger's CASE expression below — but nothing ever sets it true
--     yet. The "+2 hearts on an admin-configured special day" rule is
--     deferred (clarifications.md: no admin screen, no config table exists
--     to drive it) — this column exists so that rule never needs a second
--     migration to land, only a value.
--   * Hearts credit the SENDER's account (kudos.sender_id), not the
--     receiver's. Item C.4.1's own wording is self-contradictory (crediting
--     text says "sender", revocation text says "receiver"); the test case
--     "Like on special day" is the tiebreaker per this repo's inherited
--     rule that TC content wins conflicts, and it says the sender's
--     account is credited. Revocation therefore also targets the sender —
--     it must reverse whatever crediting did. Flagged in
--     plans/action-items.md for product confirmation.

CREATE TABLE IF NOT EXISTS public.kudo_hearts (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    kudo_id    uuid        NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    special    boolean     NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (kudo_id, user_id)
);

COMMENT ON TABLE  public.kudo_hearts         IS 'One Sunner''s heart on one kudo (F008_KudosHeartReaction). UNIQUE(kudo_id, user_id) is the sole enforcement of "one heart per person per kudo" (BR-001) — never re-check this in application code. A row here is the only thing on_kudo_heart_change (below) reacts to; kudos.heart_count has no other writer.';
COMMENT ON COLUMN public.kudo_hearts.special IS 'Always false today — no admin surface sets it. Reserved for the deferred "+2 hearts on an admin-configured special day" rule (clarifications.md) so that rule needs only a value change, not a new migration.';

-- src/dal/kudo-hearts.ts's getViewerHeartedKudoIds filters by user_id across
-- many kudo_ids on every /kudos render — this is that read's hot index.
CREATE INDEX IF NOT EXISTS idx_kudo_hearts_user_id
    ON public.kudo_hearts (user_id);

ALTER TABLE public.kudo_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudo_hearts FORCE  ROW LEVEL SECURITY;

-- Revoked first, from ALL THREE grantees including `authenticated` — same
-- reasoning as 0006's REVOKE: default privileges on this Supabase instance
-- grant broad access to new `public` schema objects, and reversing this
-- order would briefly re-open an anon write path.
REVOKE ALL ON public.kudo_hearts FROM anon, PUBLIC, authenticated;

-- Anyone — including an anonymous /kudos visitor — can see heart counts;
-- the board itself is public (BR-015, same reasoning kudos_cards applies).
DROP POLICY IF EXISTS kudo_hearts_select_all ON public.kudo_hearts;
CREATE POLICY kudo_hearts_select_all ON public.kudo_hearts
    FOR SELECT TO anon, authenticated
    USING (true);
GRANT SELECT ON public.kudo_hearts TO anon, authenticated;

-- BR-002 lives HERE, not in a disabled button: a signed-in Sunner may only
-- insert a heart under their own user_id, and never on a kudo they sent
-- themselves. This is checked even when toggleKudoHeart's Server Action is
-- bypassed entirely (e.g. a direct authenticated REST call).
DROP POLICY IF EXISTS kudo_hearts_insert_own ON public.kudo_hearts;
CREATE POLICY kudo_hearts_insert_own ON public.kudo_hearts
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND user_id <> (SELECT sender_id FROM public.kudos WHERE id = kudo_id)
    );
GRANT INSERT ON public.kudo_hearts TO authenticated;

-- A Sunner may only remove their own heart.
DROP POLICY IF EXISTS kudo_hearts_delete_own ON public.kudo_hearts;
CREATE POLICY kudo_hearts_delete_own ON public.kudo_hearts
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());
GRANT DELETE ON public.kudo_hearts TO authenticated;

-- SECURITY DEFINER: the only way kudos.heart_count is ever written, given
-- `authenticated` holds no UPDATE grant on `kudos` at all (0006). Runs as
-- its owner (postgres, rolbypassrls = true) so it can update kudos
-- regardless of who triggered the INSERT/DELETE on kudo_hearts.
-- SET search_path pins name resolution against privilege escalation via a
-- hijacked search_path (same guard as 0002's handle_new_user).
CREATE OR REPLACE FUNCTION public.sync_kudo_heart_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.kudos
        SET heart_count = heart_count + (CASE WHEN NEW.special THEN 2 ELSE 1 END)
        WHERE id = NEW.kudo_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.kudos
        SET heart_count = heart_count - (CASE WHEN OLD.special THEN 2 ELSE 1 END)
        WHERE id = OLD.kudo_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.sync_kudo_heart_count IS
  'AFTER INSERT/DELETE trigger on kudo_hearts. SECURITY DEFINER (bypasses RLS as postgres) because authenticated holds no UPDATE on kudos. Adds/subtracts exactly what the affected row''s own special column says it was worth (CASE WHEN special THEN 2 ELSE 1 END) — a deleted row''s OLD.special is read, not NEW, so revoking a heart always reverses exactly the amount that crediting it added, even for a future special-day heart.';

DROP TRIGGER IF EXISTS on_kudo_heart_change ON public.kudo_hearts;
CREATE TRIGGER on_kudo_heart_change
    AFTER INSERT OR DELETE ON public.kudo_hearts
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_kudo_heart_count();
