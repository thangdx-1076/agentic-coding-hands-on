# Evidence — `public.profile_cards` security boundary (migration 0005)

Verified by the orchestrator on 2026-09-07, independently of phase 03's own checks.

## Why this re-verification was necessary

Phase 03 edited `0005_profile_cards_view.sql` *after* its first `supabase migration up`.
`migration up` tracks by version, not content hash, so it reported "up to date" and skipped the
changed file; the agent reconciled by applying the corrected statements straight to the running
database. That leaves one thing unproven: whether the **committed file**, applied from scratch,
reproduces the state that was hand-patched in. It does — shown below.

## Method

`DROP VIEW public.profile_cards` then re-applied the committed file verbatim via
`psql -v ON_ERROR_STOP=1 < supabase/migrations/0005_profile_cards_view.sql` inside the
`supabase_db_saa-app` container. No `supabase db reset` — `auth.users` holds real sign-ins.

Statements executed: `CREATE VIEW` → `COMMENT` → `REVOKE` → `GRANT`, no errors.

## Result — grants (`information_schema.role_table_grants`)

| grantee | privileges |
|---|---|
| `authenticated` | `SELECT` **only** |
| `anon` | **absent from the table entirely** |
| `service_role` | full DML |
| `postgres` | full DML |

`service_role` retaining full DML is expected and adds no capability: that key is server-side
only and already bypasses RLS against `public.users` directly.

## Result — columns

Exactly three, in order: `id`, `full_name`, `avatar_url`. No `email`, `role`, `locale`,
`created_at`, `updated_at` — satisfies SEC_004 by construction.

## Result — runtime probes (PostgREST, http://127.0.0.1:55321)

| actor | operation | outcome |
|---|---|---|
| `anon` key | `GET /rest/v1/profile_cards` | **401** `42501 permission denied for view profile_cards` |
| `anon` key | `PATCH ...?id=eq.<uuid>` | **401** `42501 permission denied for view profile_cards` |
| real authenticated JWT | `GET ...?select=id,full_name&limit=3` | **200**, returned rows belonging to *other* users — the definer view's RLS bypass works as designed |
| real authenticated JWT | `PATCH ...?id=eq.<another user's id>` with `{"full_name":"PWNED"}` | **403** `42501 permission denied for view profile_cards` |

The probe user was created through the real GoTrue signup endpoint and deleted afterwards.

## The escalation phase 03 closed (not in the plan)

The blueprint required `REVOKE ALL ... FROM anon, PUBLIC` to close an **anon read** leak. Phase 03
found that this instance's `pg_default_acl` grants `INSERT`/`UPDATE`/`DELETE` as well as `SELECT`
to `authenticated` on every new object in schema `public`. Because `profile_cards` is a simple
single-base-table view, Postgres treats it as **auto-updatable**, and because it runs as its
`BYPASSRLS` owner, a write issued through it would have bypassed `users_update_own` entirely —
any authenticated Sunner could have overwritten any other Sunner's `full_name`/`avatar_url`.

The revoke was widened to include `authenticated` before the `GRANT SELECT`. The 403 row above is
that hole, confirmed closed against the committed file rather than against a hand-patched database.

## Standing hazard recorded in the migration

Supabase's database linter flags this view as `security_definer_view`. That warning is correct in
general and wrong here — the definer semantics ARE the mechanism. "Fixing" it to
`security_invoker = true` re-arms own-row RLS and makes `/profile?id=` 404 for every profile but
the viewer's own. Both the file header and `COMMENT ON VIEW` say so.
