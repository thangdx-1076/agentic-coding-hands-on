-- 0019_kudos_demo_departments.sql
--
-- Re-spread the 8 demo Sunners across the SIX departments the design's
-- "Dropdown Phòng ban" frame actually lists: CEVC1, CEVC2, CEVC3, CEVC4,
-- OPD, Infra.
--
-- 0008 gave them only `CEVC10`/`CEVC20` -- values it picked up from a single
-- spec example ("vd: CEVC10") precisely because no department list had been
-- confirmed yet, and it says so in its own header. The dropdown frame settles
-- that question, so the seed identities move onto the real values.
--
-- The Phòng ban dropdown lists the departments of kudo RECEIVERS
-- (`kudos_filter_options`, 0014), and all 8 identities receive at least one
-- seeded kudo, so every one of the six values below reaches the dropdown.
-- The dropdown renders them `value`-sorted (CEVC1..CEVC4, Infra, OPD), not in
-- the frame's own order -- that ordering is the view's documented, and
-- deliberately deterministic, behaviour.
--
-- Scoped to the 8 fixed demo UUIDs from 0008: a real signed-in user's
-- department is theirs, and this migration must never overwrite it. Re-runs
-- are idempotent (a plain UPDATE to fixed literals).
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.

UPDATE public.users AS u
SET department = v.department
FROM (VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'CEVC1'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'CEVC2'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'CEVC3'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'CEVC4'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'OPD'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'Infra'),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'CEVC1'),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'CEVC2')
) AS v(id, department)
WHERE u.id = v.id;
