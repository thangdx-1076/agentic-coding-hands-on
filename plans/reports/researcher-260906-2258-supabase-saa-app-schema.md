# Local Supabase `saa-app` — current state + how to add a read-only content table

Project dir: `~/Desktop/Claude-and-mormoph/saa-app` (outside this repo). CLI 2.98.2 (update to 2.116.0 available, not applied — read-only task).

## 1. Migrations

`supabase/migrations/`:
- `0001_users_table.sql` — 59 lines
- `0002_handle_new_user_trigger.sql` — 36 lines

Only 2 migrations total, both concerning `public.users`. Full SQL of 0001 (creates `public.users`):

```sql
CREATE TABLE IF NOT EXISTS public.users (
    id          uuid         PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email       text         NOT NULL UNIQUE,
    full_name   text,
    avatar_url  text,
    locale      text         NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
    role        text         NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);
-- + COMMENT ON TABLE/COLUMN, partial index idx_users_role_admin WHERE role='admin'

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE  ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON public.users FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON public.users FROM authenticated;
GRANT  UPDATE (full_name, avatar_url, locale, updated_at) ON public.users TO authenticated;
```

**RLS policy style** (the pattern to replicate for a new table):
- Naming: `{table}_select_own`, `{table}_update_own` — snake_case, verb-suffixed.
- No policy targets `anon` or is written with an explicit `TO authenticated` clause — role scoping is implicit via `auth.uid()` (returns NULL for anon → row excluded). Confirm this convention before assuming `TO authenticated` is required for new policies; current code omits it.
- `FORCE ROW LEVEL SECURITY` is always set alongside `ENABLE ROW LEVEL SECURITY` (defense against table owner bypass).
- USING-clause shape: `auth.uid() = id` (own-row ownership check) — not applicable verbatim to a content table with no owner column; a read-only content table open to all authenticated users would instead use `USING (true)` under a `FOR SELECT TO authenticated` policy (no per-row ownership predicate needed).
- Column-level GRANT/REVOKE used as defense-in-depth on top of RLS for mutable tables — not needed for a read-only table (no UPDATE/INSERT policy at all is sufficient).
- 0002 adds `handle_new_user()` trigger (SECURITY DEFINER) mirroring `auth.users` → `public.users` on signup — unrelated to content tables, no analog needed.

## 2. Current public schema

Query: `information_schema.columns where table_schema='public'`. Result — **exactly one table**, `public.users`:

| column | type | nullable |
|---|---|---|
| id | uuid | NO |
| email | text | NO |
| full_name | text | YES |
| avatar_url | text | YES |
| locale | text | NO |
| role | text | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

No content tables exist yet — this will be the first.

## 3. `supabase db query` — confirmed working

```bash
cd ~/Desktop/Claude-and-mormoph/saa-app && supabase db query "<sql>"
```
Must run with cwd = saa-app dir (config.toml resolution). Returns JSON with `rows` + an untrusted-data `boundary` warning wrapper. No docker-exec/psql fallback was needed — this form worked on the first try for both schema introspection and `auth.users` count queries.

## 4. `supabase status -o env`

Env vars emitted: `ANON_KEY, API_URL, DB_URL, GRAPHQL_URL, INBUCKET_URL, JWT_SECRET, MAILPIT_URL, MCP_URL, PUBLISHABLE_KEY, REST_URL, S3_PROTOCOL_ACCESS_KEY_ID, S3_PROTOCOL_ACCESS_KEY_SECRET, S3_PROTOCOL_REGION, SECRET_KEY, SERVICE_ROLE_KEY, STORAGE_S3_URL, STUDIO_URL`.

- `API_URL="http://127.0.0.1:55321"` — confirmed matches the task's stated API port.
- **Side effect observed**: this specific invocation printed `Stopped services: [supabase_imgproxy_saa-app supabase_edge_runtime_saa-app supabase_pooler_saa-app]` before the env dump — the CLI itself stopped 3 non-core optional services (imgproxy, edge runtime, pooler) as part of a status/consistency check. This was not a flag I passed; it's default `supabase status` behavior on this CLI version. Core services (`db`, `auth`, `rest`, `studio`, `kong`, `realtime`, `storage`, `pg_meta`, `inbucket`, `analytics`, `vector`) remained up (`docker ps` confirmed all healthy, ~1hr uptime). No data or schema was touched. Flagging so the user isn't surprised if those 3 optional containers are down next time they check.

## 5. Adding a new migration — non-destructive procedure

```bash
cd ~/Desktop/Claude-and-mormoph/saa-app
supabase migration new add_content_table   # creates supabase/migrations/<timestamp>_add_content_table.sql
# edit the generated file with CREATE TABLE + RLS
supabase migration up                       # applies ONLY pending migrations, no reset
```

`supabase migration new` names files `<YYYYMMDDHHMMSS>_<name>.sql` (timestamp-prefixed) — note this differs from the existing `0001_`/`0002_` sequential-integer style already in the repo; the CLI's own generator will not continue that numbering, it will stamp a timestamp. Decide whether to keep the CLI default or manually rename to continue `0003_...` for consistency with existing files.

`supabase migration up` (confirmed via `--help`): "Apply pending migrations to local database", defaults `--local true`. This is the safe apply path — it does NOT reset/recreate the database, only runs new migration files forward.

**`supabase db reset` would destroy existing users** — confirmed. Its help text: "Resets the local database to current migrations" (recreates DB from scratch and re-runs all migrations, then reseeds if `db.seed.enabled`). Live-checked: `auth.users` currently has **142 rows**. A `db reset` drops and rebuilds the DB, so all 142 auth users (and derived `public.users` rows) would be lost. Do not run it. Use `supabase migration up` instead for this task.

## 6. Seeding

- No `supabase/seed.sql` file exists in the project (`ls supabase/*.sql` found nothing at that level; only `migrations/`, `config.toml`, `snippets/`).
- `config.toml` DOES wire seeding: `[db.seed] enabled = true`, `sql_paths = ["./seed.sql"]` — so seeding is configured but the target file is missing. Running `supabase db reset` today would either no-op the seed step or error looking for the absent file (not tested — reset is destructive and excluded by task constraints). If a new content table needs seed rows, either add `supabase/seed.sql` now or rely solely on `migration up` (which never touches seed files).

## Recommendation for the content table

1. `supabase migration new add_<content_name>_table` (accept CLI's timestamp naming, or rename to `0003_` manually to match existing sequential style — pick one, don't mix).
2. Table DDL + `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
3. One policy: `CREATE POLICY {table}_select_all ON public.{table} FOR SELECT TO authenticated USING (true);` — read-only, open to any authenticated user, no owner column needed. Omit UPDATE/INSERT/DELETE policies entirely (default-deny) rather than granting-then-revoking columns as 0001 did for a mutable table.
4. Apply with `supabase migration up` — never `supabase db reset`.

## Unresolved

- Whether the project wants timestamp-style or sequential-integer migration filenames going forward — repo currently has only the two sequential examples, no stated convention doc found.
- Whether `seed.sql` should be created now or deferred — content depends on what data the new table needs, out of scope for a read-only report.
