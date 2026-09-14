-- 0023_secret_box_demo_seed.sql
--
-- Demo data for F000_SecretBoxModal. The Secret Box code path was already
-- complete and correct — the RPC, the DAL, the dialog and the launcher all
-- work. What was missing was any DATA that could reach a real session, so
-- the feature was unreachable from the browser and read as unbuilt.
--
-- Two gaps made it unreachable. This file closes the second; the first is
-- closed per-account by `scripts/grant-secret-boxes.mjs` (see the note below).
--
--   (1) NOBODY WHO CAN SIGN IN HAS ENTITLEMENT.
--       Entitlement is floor(SUM(kudos.heart_count WHERE sender_id = me)/5)
--       — hearts credit the kudo's SENDER (0007, restated in 0011). Every
--       account holding hearts is one of the 8 `@kudos-demo.saa` Sunner
--       from 0008, and those carry no `encrypted_password` and no
--       `auth.identities` row BY DESIGN, so they can never sign in. Every
--       account that CAN sign in had sent kudos that nobody had hearted, so
--       `secretBoxUnopened` was 0 for all of them and `kudos-open-gift`
--       was permanently disabled. Measured before this file, on a local DB
--       carrying 35 users / 15 kudos / 35 hearts: max entitlement among
--       signable accounts was 0.
--
--   (2) `secret_box_openings` WAS EMPTY.
--       `recent_gift_recipients` (0015) reads only that table, so the
--       public "10 SUNNER NHẬN QUÀ MỚI NHẤT" panel rendered its empty state
--       on every environment, including a fully seeded one.
--
-- DO NOT run `supabase db reset` on this project (0008 says the same, for
-- the same reason): `auth.users` holds real sign-ins. Apply with
-- `supabase migration up` / `supabase db push`.
--
-- Rollback (removes exactly what this file adds, nothing else):
--   DELETE FROM public.secret_box_openings
--    WHERE user_id IN (SELECT id FROM public.users
--                       WHERE email LIKE '%@kudos-demo.saa');
--
-- WHAT THIS FILE DELIBERATELY DOES **NOT** DO: grant hearts.
--
-- An earlier draft closed gap (1) here too, by having demo Sunner heart every
-- kudo whose sender was not a demo account. That was wrong, and the test
-- suite caught it. `/kudos`'s Highlight carousel ranks by `heart_count`, and
-- the e2e suite creates throwaway kudos with no hashtags; hearting "every
-- non-demo kudo" swept those into the top 5 and broke C13/C16/C35, which
-- assert against the seeded cards. A migration cannot tell a real Sunner's
-- kudo from a test fixture, so it has no business fabricating engagement on
-- rows it did not create.
--
-- Entitlement for a specific account is granted on demand instead, by a
-- script that takes the account as an argument and touches nothing else:
--
--     node scripts/grant-secret-boxes.mjs <email> [boxes]
--
-- That is also the repeatable half: a migration runs once, so it could never
-- top the boxes back up after you opened them. See
-- `scripts/grant-secret-boxes.mjs`.

-- =============================================================================
-- Opened boxes, so the gift leaderboard has rows to show
-- =============================================================================
-- The three demo Sunner below are the only ones 0008 already leaves with
-- entitlement >= 1 (9, 8 and 5 hearts on kudos they sent -> 1 box each), so
-- giving each exactly ONE opening lands them at opened = entitlement = 1.
-- That is a state the RPC itself could have produced; seeding more openings
-- than entitlement would not be, and `open_secret_box` would then disagree
-- with the table it reads.
--
-- Badge keys are three different values from 0011's CHECK constraint so the
-- panel shows distinct artwork rather than the same badge three times.
-- `opened_at` is staggered because `recent_gift_recipients` orders by it
-- DESC — identical timestamps would make the panel's order undefined.
--
-- Guarded on `NOT EXISTS` per user rather than `ON CONFLICT`: openings are
-- an append-only log with no unique key on `user_id` (a Sunner may open
-- many boxes), so there is no constraint for `ON CONFLICT` to target.
INSERT INTO public.secret_box_openings (user_id, badge_key, opened_at)
SELECT v.user_id, v.badge_key, v.opened_at
FROM (
    VALUES
        ('a0000000-0000-4000-8000-000000000001'::uuid, 'stay-gold',       now() - interval '3 hours'),
        ('a0000000-0000-4000-8000-000000000002'::uuid, 'flow-to-horizon', now() - interval '2 hours'),
        ('a0000000-0000-4000-8000-000000000003'::uuid, 'touch-of-light',  now() - interval '1 hour')
) AS v(user_id, badge_key, opened_at)
WHERE EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = v.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM public.secret_box_openings s WHERE s.user_id = v.user_id
);
