-- 0010_kudo_images_bucket.sql
--
-- Supabase Storage bucket `kudo-images` — the repo's first use of Storage
-- as a data store (F009_KudosCompose, MoMorph screen ihQ26W78P2). Holds
-- the compose dialog's uploaded kudo images.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md AD-3, clarifications.md § "Quyết định — Upload
-- ảnh", permissions.md § "Storage — bucket kudo-images"):
--   * Split from 0009 on purpose: different data store (Storage vs. the
--     `kudos` table), a different rollback shape, and a trap below that
--     only bites on a hosted project — keeping it separate means reverting
--     the `kudos` write path never has to touch this file or vice versa.
--   * Bucket is created via migration SQL (`INSERT INTO storage.buckets`),
--     not by uncommenting `[storage.buckets.images]` in config.toml, so
--     every environment that applies migrations ends up with the same
--     bucket instead of depending on local config.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kudo-images', 'kudo-images', true)
ON CONFLICT (id) DO NOTHING;

-- `public = true` because `/kudos` reads these images with no auth check —
-- exactly like the static asset `public/kudos/sample-image.png` it stands
-- in for today. This alone already bypasses RLS for the public-URL read
-- path (`<img src>` on the feed); the SELECT policy below is defense in
-- depth for direct access through the `storage.objects` table (PostgREST,
-- dashboard), not the primary reason images render (permissions.md note 1
-- — do not treat it as the only thing gating read access when writing
-- tests for this).
--
-- IMPORTANT — do NOT add `ALTER TABLE storage.objects ENABLE ROW LEVEL
-- SECURITY` (or FORCE) here, unlike the pattern 0006/0007 use for
-- `public.*` tables. On Supabase HOSTED, `storage.objects` already has RLS
-- enabled and the migration role does not own that table — running that
-- ALTER there fails with `must be owner of table objects` (Supabase repo
-- issues #41126, #36418; docs.supabase.com/guides/storage/security/
-- ownership). The local `supabase start` Postgres may still have
-- `postgres` as the table owner, so this failure will NOT show up when
-- testing locally — it only bites if/when this project is ever pushed to
-- a real hosted Supabase project. Two `CREATE POLICY` statements plus the
-- bucket INSERT above are the entire scope of this file.
DROP POLICY IF EXISTS "kudo_images_insert_authenticated" ON storage.objects;
CREATE POLICY "kudo_images_insert_authenticated" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'kudo-images');

DROP POLICY IF EXISTS "kudo_images_select_public" ON storage.objects;
CREATE POLICY "kudo_images_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'kudo-images');
