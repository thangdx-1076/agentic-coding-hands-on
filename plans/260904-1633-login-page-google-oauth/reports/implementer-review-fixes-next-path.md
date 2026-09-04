# Implementer — Stage-5 Review Fixes (safeNextPath + playwright pin)

## Finding 1 — safeNextPath control-char hardening
- RED: `npx vitest run lib/supabase/next-path.test.ts` → exit 1 (9/18 new tests failed as expected).
- Implemented `hasRawControlChar` + `hasEncodedControlChar` (parses `%XX` sequences via `parseInt`, avoids `no-control-regex` by not embedding literal control chars in a regex) in `safeNextPath`.
- GREEN: `npx vitest run lib/supabase/next-path.test.ts` → exit 0 (18/18).
- File size: 74 lines (cap 200).

## Finding 2 — pin @playwright/test
- Confirmed installed version: `npm ls @playwright/test` → `1.62.1`.
- Changed `package.json` devDependency `^1.62.1` → `1.62.1`; ran `npm install` → exit 0.
- Re-verified `npm ls @playwright/test` → `1.62.1` (unchanged).

## Full acceptance run
- `npx vitest run` → exit 0 (26/26, both suites).
- `npx tsc --noEmit` → exit 0 (repo-wide clean; tester's earlier WIP e2e errors are gone).
- `npm run lint` → exit 0 (repo-wide clean).

## Scope
Touched only `lib/supabase/next-path.ts`, `lib/supabase/next-path.test.ts`, `package.json`, `package-lock.json`. No commit made.

**Status:** DONE
