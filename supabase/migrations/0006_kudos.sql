-- 0006_kudos.sql
--
-- `kudos` table + `public.users.department` column + `kudos_cards` read
-- view for `/kudos` (F007_KudosLiveBoard, MoMorph screen MaZUn5xHXZ).
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md AD-1/AD-2, clarifications.md):
--   * `heart_count` is a plain denormalized column on THIS table, not a
--     subquery/count against a hearts table. `kudo_hearts` (the table that
--     will maintain it via trigger) is created in migration `0007`, owned
--     by a parallel phase — this file, and `kudos_cards` below, must never
--     reference it. Defaults to `0`; `0007`'s trigger keeps it in sync.
--   * No INSERT/UPDATE/DELETE policy on `kudos` at all. F007 is entirely
--     read-only; the "Viết Kudo" compose dialog and F008's heart toggle
--     each add their own write policy when THEY are built, not here.

CREATE TABLE IF NOT EXISTS public.kudos (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id  uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content      text         NOT NULL,
    hashtags     text[]       NOT NULL DEFAULT '{}',
    image_urls   text[]       NOT NULL DEFAULT '{}',
    heart_count  integer      NOT NULL DEFAULT 0,
    created_at   timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.kudos             IS 'One Sunner thanking another, for /kudos (F007_KudosLiveBoard). Read-only in this migration — F008 (0007) adds the heart-toggle write path.';
COMMENT ON COLUMN public.kudos.heart_count IS 'Denormalized total, maintained by a trigger on kudo_hearts (migration 0007) — NOT computed here. kudos_cards (this file) cannot reference kudo_hearts, which does not exist until 0007 applies.';
COMMENT ON COLUMN public.kudos.image_urls  IS 'Up to 5 elements (BR-007); enforced by the UI, not a CHECK constraint here.';

-- `users.department` — nullable. `public.users` is written by the
-- `handle_new_user` trigger (migration 0002) on every Google sign-in; a
-- NOT NULL column with no default here would fail that trigger's INSERT
-- and break sign-in for every Sunner, existing or new, the moment this
-- migration applies.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;

COMMENT ON COLUMN public.users.department IS 'Sunner''s department (e.g. "CEVC10"), source for the Phòng ban filter and card display on /kudos (FR-002). Nullable: handle_new_user (0002) inserts rows without it, and it is only ever backfilled by seed/demo data.';

-- Two hot read paths (phase-03 Key Insights): the Highlight carousel sorts
-- by heart_count then created_at; the Feed paginates by created_at alone
-- via a keyset cursor (AD-5 — no OFFSET, which double-counts/skips rows
-- when a new kudo is inserted mid-scroll).
CREATE INDEX IF NOT EXISTS idx_kudos_heart_count_created_at
    ON public.kudos (heart_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kudos_created_at
    ON public.kudos (created_at DESC);

-- GIN for the Hashtag filter's `@>` containment operator (BR-004/FR-206) —
-- an ILIKE scan has no index to use and gets slow as the feed grows.
CREATE INDEX IF NOT EXISTS idx_kudos_hashtags_gin
    ON public.kudos USING gin (hashtags);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos FORCE  ROW LEVEL SECURITY;

-- Dropped first because CREATE POLICY has no IF NOT EXISTS: without this
-- the whole file stops being re-runnable.
DROP POLICY IF EXISTS kudos_select_all ON public.kudos;
CREATE POLICY kudos_select_all ON public.kudos
    FOR SELECT TO anon, authenticated
    USING (true);

-- Revoked first, from ALL THREE grantees including `authenticated`:
-- default privileges on this Supabase instance grant `anon`/`PUBLIC`/
-- `authenticated` full INSERT/SELECT/UPDATE/DELETE on new `public` schema
-- objects (confirmed via `pg_default_acl`, see 0005's comment). Reversing
-- this order re-opens both an anon write path and an authenticated
-- privilege-escalation path this table has no policy to justify.
REVOKE ALL ON public.kudos FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos TO anon, authenticated;

-- `kudos_cards` — the one read shape /kudos's DAL (`src/dal/kudos.ts`) uses
-- for Highlight, Feed, and Spotlight/filter totals alike. Explicit column
-- list, never `SELECT *`: `public.users` also carries `email`, `role`,
-- `locale`, `created_at`, `updated_at` (0001) — a wildcard here would leak
-- every Sunner's email to `anon` the moment this view is queried.
CREATE OR REPLACE VIEW public.kudos_cards
    WITH (security_invoker = false)
AS
SELECT
    k.id, k.content, k.hashtags, k.image_urls, k.heart_count, k.created_at,
    su.id AS sender_id, su.full_name AS sender_full_name,
    su.avatar_url AS sender_avatar_url, su.department AS sender_department,
    (SELECT count(*)::integer FROM public.kudos WHERE receiver_id = su.id) AS sender_kudos_received,
    ru.id AS receiver_id, ru.full_name AS receiver_full_name,
    ru.avatar_url AS receiver_avatar_url, ru.department AS receiver_department,
    (SELECT count(*)::integer FROM public.kudos WHERE receiver_id = ru.id) AS receiver_kudos_received
FROM public.kudos k
JOIN public.users su ON su.id = k.sender_id
JOIN public.users ru ON ru.id = k.receiver_id;

COMMENT ON VIEW public.kudos_cards IS
  'SECURITY DEFINER view (security_invoker = false, the explicit default) exposing exactly (id, content, hashtags, image_urls, heart_count, created_at) from public.kudos plus (id, full_name, avatar_url, department, kudos_received) for each of sender and receiver from public.users. Runs as its owner (BYPASSRLS) so any Sunner, or an anonymous /kudos visitor, can read the sender/receiver display info that public.users''s own users_select_own policy (migration 0001) would otherwise hide. anon holds SELECT here — unlike 0005_profile_cards_view (authenticated only) — because /kudos is a PUBLIC page (BR-015), the same reasoning 0003_awards_table.sql already applies. Do NOT widen the SELECT list — email/role/locale/created_at/updated_at must never be reachable through this view (SEC_004, same boundary 0005 draws). Do NOT change this to security_invoker = true — that flips RLS back on and every /kudos card stops showing anything but the viewer''s own row. anon/authenticated hold SELECT ONLY, never INSERT/UPDATE/DELETE: this view joins two tables and so is NOT auto-updatable in Postgres (unlike profile_cards), but the REVOKE ALL below is kept anyway — the leak this guards against is read exposure, and a future Postgres version making a JOIN view auto-updatable is not a bet worth taking.';

REVOKE ALL ON public.kudos_cards FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.kudos_cards TO anon, authenticated;
