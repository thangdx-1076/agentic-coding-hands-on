-- 0012_notifications.sql
--
-- `notifications` table — F012_NotificationsPanel. Recipient-owned inbox rows
-- for 4 event types (`kudos_received`, `heart_received`, `secret_box_available`,
-- `kudos_hidden`); RLS + column-level GRANT is the enforcement, not app code.
-- No trigger/emitter here — that is phase 03 of this feature's migration set.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md phase-02, spec/F012_NotificationsPanel/technical-spec.md
-- § 1, § 2, spec/system/permissions.md):
--   * REVOKE ALL runs immediately after CREATE TABLE, before RLS is even
--     enabled — same reasoning as 0007/0011's REVOKE: default privileges on
--     this Supabase instance grant broad access to a new `public` schema
--     object the instant it exists, and reversing this order would briefly
--     leave `notifications` readable by `anon`.
--   * No INSERT policy, and no INSERT grant, for `authenticated`. The
--     recipient (`user_id`) is never the writer — a notification is always a
--     side effect of *someone else's* action (a Kudos sent, a heart dropped).
--     Writing goes through a `SECURITY DEFINER` trigger in the next
--     migration (0013), the same shape as `sync_kudo_heart_count()` (0007)
--     and `open_secret_box()` (0011): data a user must not author themselves
--     is authored by a definer-rights function instead.
--   * The UPDATE policy's `USING`/`WITH CHECK` only proves row ownership —
--     Postgres row-security policies cannot restrict which *columns* an
--     UPDATE touches. "Only `is_read` is writable" is therefore enforced by
--     `GRANT UPDATE (is_read)` below, a column-level grant, not by the
--     policy. Without it, an owner could rewrite their own `type`/`payload`.
--   * The `heart_received` dedupe is a partial UNIQUE index, not an
--     `ON CONFLICT DO NOTHING` in application code: dropping a heart and
--     re-adding it are two separate transactions with no row to conflict
--     against inside a single statement, so only a DB-level constraint is
--     correct under concurrency (FR-404).
--   * `ALTER PUBLICATION ... ADD TABLE` is not idempotent (repeating it
--     errors "relation is already member of publication"), so it is wrapped
--     in `DO $$ ... IF NOT EXISTS ... $$` against `pg_publication_tables` so
--     re-running this file is a no-op the second time.
--   * Realtime is expected to honor RLS on this table (Supabase's documented
--     behavior), but that is a claim this migration does NOT get credit for
--     proving — phase 09's test (TC-F007-002) is where it is verified against
--     the running instance, not assumed here.

CREATE TABLE IF NOT EXISTS public.notifications (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type       text        NOT NULL CHECK (type IN (
                              'kudos_received', 'heart_received',
                              'secret_box_available', 'kudos_hidden'
                            )),
    payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    is_read    boolean     NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Revoked first, from ALL THREE grantees including `authenticated` — see
-- header. Selective GRANTs below re-open exactly what FR-601/FR-602 need.
REVOKE ALL ON public.notifications FROM anon, PUBLIC, authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE  ROW LEVEL SECURITY;

-- FR-602: a Sunner reads only their own notifications, including over
-- realtime (Supabase Realtime evaluates this same policy per change).
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
GRANT SELECT ON public.notifications TO authenticated;

-- Row-ownership half of "mark as read". The column-level half (only
-- `is_read` is writable) is the GRANT below, not this policy — see header.
DROP POLICY IF EXISTS notifications_update_own_read ON public.notifications;
CREATE POLICY notifications_update_own_read ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

-- No INSERT/DELETE grant to anyone, including `authenticated`: the only
-- write path is the SECURITY DEFINER trigger added in 0013.

COMMENT ON TABLE public.notifications IS
  'One recipient-owned inbox row (F012_NotificationsPanel). authenticated holds SELECT and column-scoped UPDATE(is_read) only — no INSERT/DELETE grant exists for any user-facing role, because the recipient is never the writer. Rows are authored exclusively by a SECURITY DEFINER trigger (0013), the same posture as sync_kudo_heart_count() (0007) and open_secret_box() (0011).';
COMMENT ON COLUMN public.notifications.user_id IS
  'The RECIPIENT, not the actor who caused the notification. Drives every RLS predicate on this table (user_id = auth.uid()) — never the identity of who sent the kudos or dropped the heart.';
COMMENT ON COLUMN public.notifications.type IS
  'One of exactly 4 values (technical-spec.md § 1). secret_box_available and kudos_hidden have no emitter in v1 — rows for those types only exist via manual/seed inserts until a future migration adds their trigger.';
COMMENT ON COLUMN public.notifications.payload IS
  'Per-type contract in technical-spec.md § 2. For kudos_received/heart_received on an anonymous kudos, this must carry only the sender''s anonymous_name, never sender_id or their real name — the anonymity boundary this table must not leak (spec/system/permissions.md).';
COMMENT ON COLUMN public.notifications.is_read IS
  'The only column authenticated may UPDATE on this table (see the column-scoped GRANT above) — attempting to change any other column via a direct REST/PostgREST call is rejected by Postgres privilege checks, not by application code.';

-- Keyset pagination: listNotifications reads newest-first per user, and ties
-- on created_at are broken by id — this index serves that exact ORDER BY.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_id
    ON public.notifications (user_id, created_at DESC, id DESC);

-- getUnreadCount's hot path: count/select rows for one user where unread.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id)
    WHERE is_read = false;

-- FR-404 dedupe, enforced in the database (see header): dropping a heart and
-- re-adding it must collapse to at most one live heart_received row per
-- (recipient, kudos, actor). ->> (text) is used, not -> (jsonb), because the
-- comparison and the index both need scalar text equality, not jsonb
-- containment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_heart_received_dedupe
    ON public.notifications (
        user_id,
        type,
        (payload ->> 'kudosId'),
        (payload ->> 'actorId')
    )
    WHERE type = 'heart_received';

-- Not idempotent by itself (ALTER PUBLICATION ... ADD TABLE errors on a
-- second run), so it is gated on pg_publication_tables — see header.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_publication_tables
         WHERE pubname    = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename  = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Rollback (manual — no down-migration runner in this project):
--
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
-- DROP TABLE public.notifications;  -- policies, indexes, comments go with it
--
-- No other table is touched by this migration, so nothing else is affected.
