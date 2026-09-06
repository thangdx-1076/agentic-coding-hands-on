# Research: Local Supabase for homepage `/` (auth header + role menu + E2E provisioning)

Supabase confirmed UP this session (`supabase status` running, `/auth/v1/health` → 200).
Keys observed but redacted per instruction (var names only).

## 1. Server-side role read

**Finding:** `public.users` RLS `users_select_own` (`auth.uid()=id`) + `authenticated` HAS
table-level SELECT — confirmed empirically via `supabase db query` against the live DB
(`information_schema.role_table_grants` for `users`: `authenticated` row lists SELECT).
Migration 0001 never issues `GRANT SELECT` (only `REVOKE`/re-`GRANT`s column UPDATE), so
SELECT comes from Supabase's schema-level default privileges seeded at project init (same
behavior the Supabase changelog documents for pre-opt-out projects). Own-row select works
with the caller's JWT, no extra grant needed.

**Code shape** (new, mirrors `lib/auth/sign-in-with-google.ts`: pure helper + `.test.ts`):
```ts
// lib/auth/get-user-role.ts
export type UserRole = "member" | "admin";
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = await createClient(); // lib/supabase/server
    const { data, error } = await supabase
      .from("users").select("role").eq("id", userId).maybeSingle();
    if (error || !data) return "member"; // fail OPEN — label, not a gate
    return data.role as UserRole;
  } catch { return "member"; }
}
```
Fail-open matches `app/login/page.tsx`'s open failure (transient outage), not
`app/todo/page.tsx`'s closed one — a header label isn't a security boundary. Source:
`saa-app/supabase/migrations/0001_users_table.sql:37-59`; live query this session;
`lib/auth/sign-in-with-google.ts` (layering precedent); `lib/supabase/server.ts`.

## 2. MSW handler URL shape

**Finding:** `.select('role').eq('id', uuid).maybeSingle()` on GET → `GET
{SUPABASE_URL}/rest/v1/users?select=role&id=eq.<uuid>`. Confirmed reading `postgrest-js`
source directly (official repo, `PostgrestTransformBuilder.ts` + `PostgrestBuilder.ts`):
**`maybeSingle()` on GET sets `Accept: application/json`**, not `vnd.pgrst.object+json`
(only `.single()`, or `maybeSingle()` on non-GET, use that). Server returns a plain array;
client unwraps (`len>1`→`PGRST116` error, `len===1`→object, `len===0`→null). Handler must
return an **array**.

**Code shape** (add to `mocks/handlers.ts`, reuse existing `SUPABASE_URL`/`MOCK_USER`):
```ts
http.get(`${SUPABASE_URL}/rest/v1/users`, ({ request }) => {
  const id = new URL(request.url).searchParams.get("id");
  return HttpResponse.json(id === `eq.${MOCK_USER.id}` ? [{ role: "member" }] : []);
}),
```
Admin-variant stories override this one handler via `parameters.msw.handlers` — no new
shared handler needed. Source: `github.com/supabase/postgrest-js` source read directly;
`mocks/handlers.ts:17-58`.

## 3. E2E admin-user provisioning

**Finding:** local `psql` NOT installed (`which psql` empty). Two options verified live:
`supabase db query "<sql>"` (CLI 2.98.2) and `docker exec supabase_db_saa-app psql -U
postgres -d postgres -c "<sql>"` — both work as superuser (bypass RLS), no service-role
key in repo. saa-app seed.sql is out of scope + unnecessary (YAGNI).

**Code shape** (Playwright helper, `@auth`-tagged like existing sign-in specs):
```ts
// tests/e2e/helpers/promote-to-admin.ts
export async function promoteToAdmin(email: string) {
  await execFileAsync("supabase", ["db", "query",
    `update public.users set role='admin' where email='${email}';`],
    { cwd: process.env.SAA_APP_DIR ?? "~/Desktop/Claude-and-mormoph/saa-app" });
}
```
**Ranking:** (1) `supabase db query` — no local psql dep, CLI already required.
(2) `docker exec psql` — works, couples to container name `supabase_db_saa-app`.
(3) service-role REST — rejected, pulls a secret into repo env. (4) saa-app seed.sql —
rejected, edits a project this repo must not touch. Source: live shell run this session
(`supabase db query`, `docker exec`, `which psql`); `tests/e2e/helpers/sign-in.ts`
(pattern to extend); `login.spec.ts` `@auth` tag.

## 4. Proxy/middleware on `/`

**Finding:** yes, `/` must stay matched even with no redirect either way. Supabase's own
guidance: middleware's job is refreshing expired sessions, not just routing (Supabase
Next.js SSR guide + GitHub discussions #26757/#21656, cross-checked). Dropping `/` means a
homepage visitor never gets a near-expired session refreshed until they hit `/todo`.

**Code shape** (`proxy.ts` — narrows predicates + target; matcher unchanged):
```ts
const isAuthPage = pathname === "/login";            // was "/" || "/login"
const isProtectedPage = pathname.startsWith("/todo"); // was "/" || "/todo..."
if (user && isAuthPage) return redirectPreservingCookies(request, response, "/");
if (!user && isProtectedPage) return redirectPreservingCookies(request, response, "/login");
return response; // "/" falls through here now; cookie refresh above still ran
```
`config.matcher` stays `["/", "/login", "/todo/:path*"]`. Source: `proxy.ts:22-41,109-111`;
Supabase Next.js SSR guide + discussions #26757/#21656.

## 5. Notifications bell

**Finding:** `grep -rniI notification` across saa-app and this repo (`app/`, `lib/`,
`components/`) → zero hits either side. No table, no prior UI. Recommend the least
invention: bell icon + empty dropdown, badge hidden at count 0, no fetch/polling. A future
table needs at minimum `id, user_id, title, body, read_at, created_at` + RLS scoped to
`user_id = auth.uid()` — note in a code comment only. Do NOT touch saa-app migrations.
Source: live grep, this session, both repos.

## 6. Post-login landing default → `/`

**Finding — every `/todo` site that must move:**
- `app/login/login-client.tsx:22` `NEXT_PATH = "/todo"` → `"/"` (used at `:36`).
- `lib/supabase/next-path.ts:88` `safeNextPath(raw, fallback = "/todo")` → default `"/"`.
- `app/auth/callback/route.ts:38` needs no edit — inherits the new default.
- `tests/e2e/login.spec.ts:170-176` "Unauthenticated GET / redirects to /login" — now
  FALSE, rewrite as a public-homepage-renders assertion.
- `tests/e2e/login.spec.ts:666-672` "Authenticated user redirects /login to /todo" —
  `waitForURL("/todo")`→`waitForURL("/")`, `toContain("/todo")`→`toContain("/")`.
- Untouched: `:162-168`, `:608-632`, `:687-708` — all guard `/todo` itself, unaffected.

Source: `grep -n "todo\|NEXT_PATH"` / `grep -n "todo\|waitForURL"` this session, line
numbers re-verified by `Read`.

## Ranked recommendations

1. `lib/auth/get-user-role.ts` fail-open helper (§1) — verified live, no new grants.
2. MSW array-returning handler in `mocks/handlers.ts` (§2) — add before the header so
   Storybook/vitest have a fixture from day one.
3. E2E admin provisioning via `supabase db query` (§3) — least coupling, no repo secret,
   tag `@auth`, exclude from CI like today.
4. `proxy.ts` predicate narrowing (§4) — smallest diff, keeps cookie-refresh contract.
5. Notifications empty-panel placeholder (§5) — ship now, no saa-app edits.
6. Flip landing default + fix both `login.spec.ts` assertions together (§6) — real break.

## Files that must change

`lib/auth/get-user-role.ts` (new) + `.test.ts` · `mocks/handlers.ts` · `proxy.ts` ·
`lib/supabase/next-path.ts:88` · `app/login/login-client.tsx:22` ·
`tests/e2e/login.spec.ts:170-176,666-672` · new homepage header/menu component(s)
consuming `getUserRole` (path TBD by implementer).

## Unresolved

Exact homepage header component location (UI track owns it); `SAA_APP_DIR` env
convention vs local-to-helper (leave to implementer, log to `plans/action-items.md`).

**Status:** DONE
**Summary:** `authenticated` already has SELECT on `public.users` (no new grant); MSW
handler must return a JSON array; `supabase db query` is least-coupled for E2E admin
provisioning; `proxy.ts` needs only its two predicates narrowed; no notifications table
exists; 6 exact call sites must flip `/todo`→`/` as landing default.
**Concerns/Blockers:** none — every claim checked live this session, not doc-inferred.
