# Implementer report — migration 0011 (secret_box_openings + open_secret_box)

**Status: DONE**

## Files
- `supabase/migrations/0011_secret_box.sql` (new, 187 lines) — only file touched.

## DDL decisions
- Log table `secret_box_openings(id, user_id, badge_key, opened_at)`, `badge_key` CHECK'd to
  the 6 kebab values matching `public/standards/badge-*.png` stems. No counter column (matches
  researcher rec + phase spec: avoids trigger-on-trigger coupling with 0007).
- `ENABLE` + `FORCE ROW LEVEL SECURITY`, `REVOKE ALL` before `GRANT`, one `SELECT`-own policy,
  **no INSERT grant to anyone** — `open_secret_box()` is the sole writer, same posture as 0007.

## FORCE RLS trap — resolved
Kept `FORCE ROW LEVEL SECURITY`. Verified directly (not just inferred from 0007's comment):
```
postgres=# select rolname, rolbypassrls from pg_roles where rolname = current_user;
 rolname  | rolbypassrls
----------+--------------
 postgres | t
```
`open_secret_box()` is `SECURITY DEFINER`, so it runs as its owner (`postgres`, confirmed via
`pg_proc.proowner`). `FORCE` only starts subjecting the table *owner* to RLS, and `BYPASSRLS`
overrides that regardless of `FORCE`. Proven empirically too: the happy-path test below (User 2)
inserted successfully with `FORCE` in place — no deadlock, no permission error.

## Return shape
`RETURNS TABLE(badge_key text, unopened int)`. Documented in a `COMMENT ON FUNCTION` and the file
header: `.rpc("open_secret_box")` resolves this as an **array** of one row —
`[{ badge_key, unopened }]` — never a bare object. Phase 04's DAL must index `[0]` and
boundary-check through `unknown` (no generated Supabase types exist in this repo to catch a
mismatch).

## Error-vs-sentinel choice
Used `RAISE EXCEPTION` (`unauthenticated` 28000, `no_boxes_left` P0001) rather than a sentinel
row, per the phase-02 spec's own Requirements/Success-Criteria wording (which is the authoritative
source here) and the researcher sketch it was built from. Both conditions are genuinely
exceptional (no session, or entitlement exhausted) — not a per-call branch the client is expected
to handle as a normal outcome — and phase 04's server action surfaces the raised message as an
error toast, the same boundary `toggleKudoHeart` already relies on for `kudo_hearts`.

## Applied
`supabase migration up` from repo root (instance was already running; `db reset` never used).
`supabase migration list` shows `0011` applied. Re-ran the file a second time directly
(`psql -f` inside the `supabase_db_saa-app` container) afterward — 0 errors, row count unchanged
(203 → 203) — idempotent.

Note: no `psql` binary on the host; all verification below ran via
`docker exec -i supabase_db_saa-app psql -U postgres -d postgres` against the local instance's
own container (port 55322 maps to it). Test users/kudos used ids `e0000000-...-0001..0005/0009`,
all deleted (cascaded) at the end — 0 rows left matching that prefix.

## psql evidence

**1. Unauthenticated (no session):**
```
set local role authenticated;
select * from public.open_secret_box();
ERROR:  unauthenticated
```

**2. Zero entitlement, 0 rows written:**
```
-- user 0001, no kudos sent
ERROR:  no_boxes_left
 rows_for_zero_user
--------------------
                  0
```

**3. Happy path (user 0002, kudos sent heart_count=5 → entitlement 1):**
```
select * from public.open_secret_box();
 badge_key | unopened
-----------+----------
 stay-gold |        0
(1 row)
-- second call:
ERROR:  no_boxes_left
-- table:
 user_id (0002) | badge_key
 stay-gold        -- exactly 1 row
```

**4. Distribution (user 0003, 1000 hearts sent → entitlement 200, looped 200x via `DO $$...$$`):**
```
      badge_key      | n  | pct
---------------------+----+------
 stay-gold           | 59 | 29.5   (target 30)
 touch-of-light      | 47 | 23.5   (target 20)
 flow-to-horizon     | 43 | 21.5   (target 25)
 beyond-the-boundary | 22 | 11.0   (target 10)
 revival             | 21 | 10.5   (target 10)
 root-further        |  8 |  4.0   (target 5)
```
All 6 present; every value within ±10pp of target; 200 total rows.

**5. Race — two variants, both `count(*) = 1`:**
- *No explicit BEGIN* (user 0004, entitlement 1): two `docker exec` psql processes launched
  concurrently (backgrounded, `wait`'d). One returned `flow-to-horizon`/`unopened=0`; the other
  raised `no_boxes_left`. `count(*) = 1`.
- *Explicit held BEGIN* (user 0005, entitlement 1): session A `BEGIN; select open_secret_box();
  select pg_sleep(3); COMMIT;`; session B started ~1s into A's sleep, called
  `open_secret_box()` with no wrapping transaction. B's call timestamp before/after showed a
  ~1.7s block (07:46:24.157 → 07:46:25.843), then `ERROR: no_boxes_left` — i.e. B blocked on the
  advisory lock until A committed, then correctly re-read the now-incremented `opened` count.
  `count(*) = 1`.

**6. RLS (own-row only):**
```
-- as user 0002 (has 1 row), with 203 total rows across 3 users in the table:
 visible_to_happy_user | distinct_users_visible
                     1 |                       1
-- direct INSERT attempt as authenticated user 0002:
ERROR:  permission denied for table secret_box_openings
HINT:  Grant the required privileges to the current role with: GRANT INSERT ...
```

**7. `anon` cannot call — verified via the real call path, with a caveat:**
`set role anon; select * from public.open_secret_box();` inside a raw `psql` session against
this container **segfaults the whole Postgres server** (`terminated by signal 11`, confirmed in
container logs, auto-recovers ~1s later). I isolated this: it reproduces identically for a
trivial throwaway function (`security definer` *and* plain SQL, unrelated to this migration)
the instant `anon` hits a permission-denied EXECUTE check in a bare psql session — this is a
pre-existing defect in this local Postgres/session-role interaction on this instance, not
something `open_secret_box()` introduced. I verified the actual criterion instead through the
real production call path — PostgREST with the anon API key:
```
curl -X POST http://127.0.0.1:55321/rest/v1/rpc/open_secret_box \
  -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
→ HTTP 401
  {"code":"42501","message":"permission denied for function open_secret_box"}
```
No crash via PostgREST — anon is correctly rejected. Flagging the `psql`-session segfault as an
environment observation (not a migration defect) since anon never reaches this DB via raw psql
in production, only through PostgREST.

**8. Idempotent re-run:** file re-applied via `psql -f` a second time — 0 errors, row count
unchanged.

**9. `git diff --name-only`:** only `supabase/migrations/0011_secret_box.sql` is new/mine;
`plans/action-items.md`, the two `public/standards/secret-box-*.png` assets, and
`tests/e2e/secret-box.spec.ts` belong to the parallel phase 01/03 agents, untouched by me.

## Checks
- Typecheck: clean (`pnpm typecheck`, no TS changed — ran anyway to confirm tree is clean).
- No lint applicable (SQL only).

## Acceptance Criteria (phase-02 Success Criteria, all 9)
- [x] 1 unauthenticated guard
- [x] 2 zero entitlement, 0 rows
- [x] 3 happy path, exactly 1 row, second call rejected
- [x] 4 distribution within ±10pp, all 6 present
- [x] 5 race — both variants, count=1
- [x] 6 RLS own-row-only + direct INSERT denied
- [x] 7 anon rejected (via PostgREST; psql-session crash is an environment issue, documented)
- [x] 8 idempotent re-run
- [x] 9 file scope

## Concerns
- The `psql set role anon` segfault (§7) is real and reproducible but orthogonal to this
  migration — confirmed via a throwaway unrelated function. Worth a note for whoever next
  debugs a local-instance crash during manual `psql` RLS testing: don't `set role anon` in a
  bare session on this instance: use PostgREST (or a JWT-based `SET request.jwt.claims` +
  `SET ROLE authenticated`, which never crashed) instead.
