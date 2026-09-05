# Phase 03 — Supabase auth foundation + guard

**Status**: completed

## Files
- `lib/supabase/next-path.ts` (32) + `next-path.test.ts` (45, RED-first, 9 cases)
- `lib/supabase/client.ts` (18), `server.ts` (42), `proxy-client.ts` (31)
- `proxy.ts` (110, project root)
- `app/auth/callback/route.ts` (46)
- `app/todo/page.tsx` (44), `app/todo/actions.ts` (23)
- `app/page.tsx` (17, boilerplate removed → auth redirect)
- `package.json` (+`@supabase/ssr@0.12.5`, `+@supabase/supabase-js@2.115.0`, exact pins, no caret)

## Commands + exit codes
- `npx vitest run lib/supabase/next-path.test.ts` → RED first: "Cannot find module './next-path'" (exit 1, genuine) → after impl: 9/9 pass, exit 0
- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0 (1 pre-existing warning in `tests/e2e/login.spec.ts`, not owned)
- `npx vitest run` (full) → 2 files, 17/17 tests pass, exit 0
- `npm run build` → exit 0, no `sync-dynamic-apis` warning; routes `/`, `/auth/callback`, `/todo` + Proxy (Middleware) listed

## Dev smoke (port 3000, killed after — `lsof -i :3000` empty)
- `GET /todo` → 307, `location: /login` ✓
- `GET /` → 307, `location: /login` ✓
- `GET /auth/callback?error=access_denied&error_description=x` → 307, `location: .../login?error=x` ✓
- `GET /auth/callback` (no code) → 307, `location: .../login?error=auth_code_error` ✓
- `GET /` with `Cookie: NEXT_LOCALE=zz` → `set-cookie: NEXT_LOCALE=vi; Path=/; Max-Age=31536000; SameSite=lax` ✓
- `GET /login` → 404 (expected, phase-04 not yet built) ✓

## Acceptance criteria
- [x] 1. Unit RED→GREEN incl. safeNextPath (9 cases) + phase-02's 8 tests still pass
- [x] 2. tsc + lint clean
- [x] 3. build exit 0
- [x] 4. all dev smoke checks match contract
- [x] 5. kebab-case, ≤200 lines/file (max 110), no `data-testid`, try/catch on all Supabase/cookie calls, no secrets (only `NEXT_PUBLIC_*`, publishable key)
- [x] 6. phase file Todo boxes ticked, `status: completed`

## Deviations
- None from plan. Only file-scope touch outside the listed set is `package-lock.json` (npm's automatic side effect of the `package.json` dependency change — not hand-edited).
- Did not commit per explicit task instruction ("Do NOT commit"), overriding the agent's default commit-per-task habit.

**Status:** DONE
**Summary:** Supabase auth foundation (browser/server/proxy clients, `safeNextPath` open-redirect guard), `proxy.ts` optimistic guard with locale normalization, `/auth/callback` PKCE handler, protected `/todo` + logout, and `/` fallback redirect are implemented and verified — typecheck/lint/unit/build all exit 0, dev-server smoke matches the § E2E contract exactly. `/login` still 404 as expected (phase-04).
**Concerns/Blockers:** None.
