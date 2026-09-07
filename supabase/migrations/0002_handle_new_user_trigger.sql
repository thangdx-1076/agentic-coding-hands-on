-- =============================================================================
-- Migration 0002 — handle_new_user trigger
-- Mirrors auth.users → public.users on every successful auth signup.
-- Source: .momorph/contexts/database-schema.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, locale, role)
    VALUES (
        new.id,
        new.email,
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
        'vi',     -- Q1 default
        'member'  -- Q6 default
    )
    ON CONFLICT (id) DO NOTHING;  -- idempotent — defends against retried OAuth callbacks
    RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
    'Mirrors auth.users → public.users on INSERT. Idempotent. SECURITY DEFINER bypasses RLS.';

-- Drop-and-recreate the trigger so this migration is re-runnable.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
