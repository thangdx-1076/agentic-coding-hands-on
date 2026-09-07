-- =============================================================================
-- Migration 0001 — public.users table + RLS + policies
-- Source of truth: .momorph/contexts/database-schema.sql
-- See .momorph/contexts/DATABASE_ANALYSIS.md for design rationale.
-- =============================================================================

-- public.users — profile mirror of auth.users (1:1, cascade delete).
CREATE TABLE IF NOT EXISTS public.users (
    id          uuid         PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email       text         NOT NULL UNIQUE,
    full_name   text,
    avatar_url  text,
    locale      text         NOT NULL DEFAULT 'vi'
                              CHECK (locale IN ('vi', 'en')),
    role        text         NOT NULL DEFAULT 'member'
                              CHECK (role IN ('member', 'admin')),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.users           IS 'Profile mirror of auth.users (1:1, cascade delete). Editable display + preferences.';
COMMENT ON COLUMN public.users.id        IS 'Same UUID as auth.users.id; primary key + foreign key.';
COMMENT ON COLUMN public.users.email     IS 'Mirrored from auth.users.email by handle_new_user trigger.';
COMMENT ON COLUMN public.users.full_name IS 'Display name from Google profile (raw_user_meta_data->>full_name).';
COMMENT ON COLUMN public.users.locale    IS 'UI locale preference. Q1: vi or en for MVP.';
COMMENT ON COLUMN public.users.role      IS 'Application role for authorization. Q6: defaults to member.';

-- Partial index — admin rows are rare; keeps the index small and selective.
CREATE INDEX IF NOT EXISTS idx_users_role_admin
    ON public.users (role)
    WHERE role = 'admin';

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE  ROW LEVEL SECURITY;

-- Own-row read.
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Own-row update. WITH CHECK prevents rebinding id.
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Column-level grants: defense in depth. RLS allows the row update; column
-- grants gate which fields can be written by authenticated users. id, email,
-- role, created_at are locked at insert time and not user-mutable.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT  UPDATE (full_name, avatar_url, locale, updated_at) ON public.users TO authenticated;
