---
title: "Phase 1 — Move the tree into src/ verbatim + config cutover"
feature: F001,F002,F003
status: completed
priority: P1
effort: 3h
---

# Phase 1 — Move the tree into `src/` verbatim

## Context Links

- Map (file→target rows + the exact config blocks; do not re-derive them):
  `.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md` § Config changes
- [reports/scout-260906-1150-current-layout-inventory.md](reports/scout-260906-1150-current-layout-inventory.md) § Config touchpoints
- [reports/researcher-260906-1150-next16-src-layout-facts.md](reports/researcher-260906-1150-next16-src-layout-facts.md) facts 1, 2, 7, 8
- [plan.md](plan.md) · [evidence/study-context.json](evidence/study-context.json)

## Overview

**Priority** P1 · **Status** pending · Blocks phases 2 and 3.

Move the whole source tree under `src/` with folder names unchanged — no route groups, no private
folders, no `lib/` split — and cut the four configs over to `src/` in the same commit. Nothing is
reorganized here; this phase exists only because the move cannot be partial.

## Key Insights

1. **`app/` moves whole or not at all.** Next ignores `src/app` while a root `app/` exists
   (researcher fact 1). Moving the shell first and the routes later leaves a root `app/` with no
   root layout — a broken build, not a green one. This is why the map's PR-1/PR-2 split is wrong and
   Phase 1 takes the entire tree.
2. **The alias absorbs almost every import.** `@/*` goes from `./*` to `./src/*`, and every aliased
   folder keeps its name inside `src/`, so `@/lib/**`, `@/components/**`, `@/hooks/**`, `@/mocks/**`
   all keep resolving untouched. Only six files need an edit — the ones that reach a folder that
   *stayed* at the root (`messages/`) or a file that *changed folder* (`globals.css`, `fonts.ts`).
3. **Two of those six break silently.** `i18n/request.ts`'s dynamic `../messages/${locale}.json` and
   `messages-parity.test.ts`'s `path.resolve(__dirname, "../../messages/...")` are invisible to
   `tsc`. The parity test fails loudly; the i18n one only shows up at request time — E2E is its only
   guard, which is why the E2E run is part of this phase's gate.
4. **The coverage denominator can shrink in silence.** The new allowlist covers
   `src/app/**/actions.ts` but *not* `src/app/actions/locale.ts`, which keeps its verbatim path
   until Phase 2. Add the transitional glob `src/app/actions/**/*.ts` now and delete it in Phase 2.
   The table must list **17** source files (10 `lib` + 4 `hooks` + 3 `app`) before and after.
5. **`eslint.config.mjs` has a path touchpoint the map does not list:** the vitest block scoped to
   `lib/**/*.test.ts`, `hooks/**/*.test.ts`, `app/**/*.test.ts`. Left alone it silently stops
   matching. Replace with the single phase-proof glob `src/**/*.test.ts`.
6. **`pnpm build` must run before `pnpm typecheck`** — `LayoutProps` is generated into `.next/types`
   by a build (see the comment in `.github/workflows/ci.yml`).

## Requirements

Functional: URLs, rendering, redirects, locale handling and OAuth unchanged. Exported symbols
unchanged. Non-functional: history preserved (`git mv`), no new dependency, no file over 200 lines,
`src/` never partially populated within the commit.

## Related Code Files

### Move (whole folders — script them in this order)

| From | To |
|---|---|
| `app/` | `src/app/` |
| `components/` | `src/components/` |
| `hooks/` | `src/hooks/` |
| `lib/` | `src/lib/` |
| `mocks/` | `src/mocks/` |
| `i18n/` | `src/i18n/` |
| `proxy.ts` | `src/proxy.ts` |
| `src/app/globals.css` | `src/styles/globals.css` |
| `src/app/fonts.ts` | `src/styles/fonts.ts` |

`app/favicon.ico` rides along inside `src/app/` and must stay at the top level of `src/app/`
(researcher fact 3). `messages/`, `public/`, `tests/` and all root config files do not move.

### Create

- `src/styles/` (directory only — receives `globals.css` and `fonts.ts`).

### Edit — source (6 files)

| File (post-move path) | Change |
|---|---|
| `src/app/layout.tsx` | `import "./globals.css"` → `import "../styles/globals.css"` |
| `src/components/home/home-screen.tsx` | `@/app/fonts` → `@/styles/fonts` |
| `src/components/login/login-screen.tsx` | `@/app/fonts` → `@/styles/fonts` |
| `src/components/todo/todo-screen.stories.tsx` | `@/messages/vi.json` → `../../../messages/vi.json` (`messages/` stays at the root, so the alias no longer reaches it) |
| `src/i18n/request.ts` | both dynamic imports `../messages/${…}.json` → `../../messages/${…}.json` |
| `src/lib/i18n/messages-parity.test.ts` | both `path.resolve(__dirname, "../../messages/…")` → `"../../../messages/…"` |

### Edit — config (5 files)

| File | Change |
|---|---|
| `tsconfig.json` | `"paths": { "@/*": ["./src/*"] }` |
| `vitest.config.ts` | alias `@` → `new URL("./src/", import.meta.url)`; the two `projects` includes and the `coverage.include` allowlist exactly as in migration-map.md § Config changes, **plus** the transitional entry `"src/app/actions/**/*.ts"` (removed in Phase 2). Keep `thresholds: { 100: true }` and the no-`.tsx` invariant. |
| `.storybook/main.ts` | `stories: ["../src/**/*.stories.@(ts|tsx)"]` (one glob replaces two) |
| `.storybook/preview.tsx` | `../mocks/handlers` → `../src/mocks/handlers`; `../app/globals.css` → `../src/styles/globals.css`; `../messages/vi.json` unchanged |
| `eslint.config.mjs` | vitest block `files:` → `["src/**/*.test.ts"]`. No boundary rules yet (Phase 3). |

## Implementation Steps

1. Record the baseline: run `pnpm test:unit` and note the test-file count, and `pnpm test:unit:coverage`
   and note the source-file count in the table (expected 17).
2. `mkdir -p src` then `git mv` each row of the move table in order; `mkdir -p src/styles` before the
   last two rows.
3. Apply the six source edits.
4. Apply the five config edits.
5. Verify no orphan references remain: `grep -rn "@/app/fonts\|@/messages" src` returns nothing, and
   `grep -rn "\.\./messages" src` shows only the corrected `../../messages` / `../../../messages` forms.
6. Run the gate, in order:
   ```bash
   pnpm lint --max-warnings 0
   pnpm format:check
   pnpm test:unit:coverage
   pnpm build
   pnpm typecheck
   pnpm build-storybook
   pnpm exec playwright test --grep-invert @auth
   ```
7. Confirm from the run output: coverage table lists 17 source files and the same test-file count as
   step 1; `pnpm build` prints routes `/`, `/login`, `/todo`, `/auth/callback`; Storybook reports 22
   stories; E2E green.
8. Eyeball `pnpm dev` on `/` once — Tailwind v4 detects sources from the repo root, not from the CSS
   file's folder, but this is the only cheap check that the moved `globals.css` still styles the app.
9. Commit as one commit: `refactor(structure): move the source tree under src/ and cut configs over`.

## Todo List

- [x] Baseline test-file and coverage-file counts recorded
- [x] Nine `git mv` moves done, `src/styles/` created
- [x] Six source edits applied
- [x] Five config edits applied (incl. the transitional coverage glob and the ESLint vitest glob)
- [x] Orphan-reference grep clean
- [x] Full gate green in order, 17 files in the coverage table, 22 stories — implementer ran lint/format/unit+coverage/build-storybook/e2e (46 passed); the subagent hook blocked `pnpm build`, so the orchestrator ran `pnpm build` (exit 0, routes `/`, `/_not-found`, `/auth/callback`, `/login`, `/todo`, Proxy) and `pnpm typecheck` (exit 0) itself
- [x] Styling smoke check on `/` (via live `pnpm dev` + curl, not a browser eyeball)
- [x] Single commit created by the orchestrator after the build-fresh typecheck (`refactor(structure): move the source tree under src/ and cut configs over`)

## Success Criteria

Owns, verbatim from `evidence/study-context.json`:

- "pnpm typecheck passes"
- "pnpm test:unit:coverage passes at the 100% threshold with the pattern-based allowlist"
- "pnpm build-storybook succeeds and all 22 stories are discovered under src/"

Phase-local, in addition: root `app/`, `components/`, `hooks/`, `lib/`, `mocks/`, `i18n/` and root
`proxy.ts` no longer exist; `src/app/favicon.ico` sits at the top level of `src/app/`; the four URLs
still resolve; no file was renamed or rewritten beyond the eleven listed edits.

## Risk Assessment

| Risk | L×I | Countermeasure |
|---|---|---|
| Root `app/` left half-moved → Next ignores `src/app`, build has no root layout | Low×High | The move is one scripted step in one commit; step 7 asserts the printed route list |
| `i18n/request.ts` dynamic path missed → locale render 500 at runtime, invisible to `tsc` | Med×High | Explicit edit row + grep in step 5 + E2E in the gate |
| Coverage denominator silently shrinks (`app/actions/locale.ts`) | Med×Med | Transitional glob + the 17-file assertion in step 7 |
| ESLint vitest glob stops matching → test-file rules silently off | Med×Low | Explicit config edit row |
| Stale `.next/types` confuses `tsc` after the move | Low×Low | `pnpm build` precedes `pnpm typecheck`; if route types look stale, clear `.next` and rebuild |
| Storybook glob misses stories under `src/` | Low×Med | 22-story assertion in step 7 |

**Rollback:** `git revert` the single phase commit. Nothing outside the repo changes, no dependency
is added, no data migrates — the revert is complete by construction.

## Security Considerations

No auth logic is touched: `proxy.ts` keeps its matcher and redirect matrix verbatim, and
`app/todo/page.tsx` keeps its own `getUser()` guard until Phase 2. No secrets move; `.env*` files are
untouched; the Supabase placeholder values in `vitest.config.ts` stay placeholders.

## Next Steps

Phase 2 (route groups and colocation) starts from this commit. Carried debt, both closed in Phase 3:
`README.md` lines 59/77–78/104/108 still name pre-migration paths, and `docs/vi/**` still indexes
old paths (re-baselined by the orchestrator's `rebuild-spec` core pass at Stage 6, not by a phase).
