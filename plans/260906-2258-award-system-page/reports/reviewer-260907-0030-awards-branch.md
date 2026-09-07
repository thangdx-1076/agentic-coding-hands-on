# Review — `feat/award-system-page` vs `origin/main` (7 commits)

## Scope
- Files reviewed: all 56 changed files (`git diff origin/main...HEAD --stat`), full read of `src/dal/awards.ts`, `src/dal/awards-client.ts`, `src/proxy.ts`, `use-award-category-nav.ts` + test, `scroll-spy.ts` + test, `award-category-nav.tsx`, `award-section.tsx`, `awards-screen.tsx`, `awards-client.tsx`, `page.tsx`, `awards-empty-state.tsx`, `get-viewer.ts`, `site-chrome.ts`, `messages/{vi,en}.json`, `.github/workflows/ci.yml`, `tests/e2e/awards.spec.ts`; diffed the chrome-promotion commit (`422d0b2`) file-by-file against its pre-image.
- Lines: 2425 insertions / 177 deletions across 56 files.
- Depth: full (all 7 commits), plus targeted diffs against `origin/main` pre-images for the rename commit.

## Assessment
Solid, disciplined delivery — matches its own plan and clarifications closely, and the risky spots called out in the task brief (auth boundary, DAL fail-open, scroll-spy race, refactor-purity, CI tagging) all hold up under inspection. One real gap: the DAL's fail-open contract has a hole for malformed `prize_values` JSONB that can crash the page it promises never to crash. Everything else is clean.

## Critical
None.

## High
1. **DAL fail-open does not cover malformed `prize_values` shape — can turn into a real 500, contradicting BR-002/SC-005.** `src/dal/awards.ts:96-103` maps `row.prize_values` straight through with no shape check; the type `AwardPrizeValue[]` is asserted, not verified, against what PostgREST actually returns for a `jsonb` column with no `CHECK` constraint in this repo (the migration lives in the external `saa-app` repo per `plan.md`, out of this review's blast radius, but its schema isn't visible from here either). `award-section.tsx:133` then calls `award.prizeValues.map(...)` unconditionally. If a single row ever has `prize_values` as `null`, a bare object, or a malformed JSON string instead of an array, that `.map` throws inside a Server Component render, and the whole page 500s — exactly the class of failure the plan explicitly promises `getAwards` prevents ("never a 500 on Supabase fail" — clarifications.md § "Supabase fail thì trang hiển thị gì"). The current try/catch in `getAwards` only guards the query call itself, not the shape of a successful response.
   Fix: validate each row before mapping, e.g. `Array.isArray(row.prize_values) ? row.prize_values : []`, and drop (or empty-array) any row whose `prize_values` isn't array-shaped, inside the existing `try` block so it still fails open to `[]`/safe defaults rather than propagating a malformed row through to render.

## Medium
1. **`document.getElementById` cross-boundary section lookup is sound today but fragile to future streaming.** `award-category-nav.tsx:46-55` resolves DOM nodes by id in a `useEffect` because `AwardCategoryNav` and `AwardSection` are Server/Client siblings. This works correctly now because `page.tsx` is one fully-synchronous Server Component render with no Suspense boundary — all 6 `<section>` nodes are present in the initial HTML before hydration runs. It would silently break (nav renders with zero registered sections, scroll-spy inert) if a later change wraps the sections list in `<Suspense>` for streaming. Not a defect today; worth a one-line comment noting the invariant it depends on, or a lint/test tripwire if that's cheap.
2. **`useAwardCategoryNav`'s `IntersectionObserver` is created once per `slugs` identity and never re-observes sections registered afterward.** The effect at `use-award-category-nav.ts:82-103` calls `observer.observe(element)` only for whatever is in `sectionsRef.current` at the moment the effect runs, and only re-runs when `slugs` (a memoized, stable array per `award-category-nav.tsx:42`) changes identity. In the current wiring this is fine (`registerSection` calls happen in the same commit, before the effect, since both nav and sections come from one synchronous render), but the hook has no defense if a caller ever registers a section after the effect already ran without changing `slugs` — that section would just never be observed. Same root cause as finding 1, noted separately because it's the hook's contract, not the caller's usage.

## Low
1. **`AwardSection`'s decorative name graphic renders nothing if a slug is missing from `AWARD_NAME_GRAPHIC`** (`award-section.tsx:37,59-75` — `nameGraphic` can be `undefined`, silently skipped). Correct defensive behavior, but there's no dev-time signal (log, comment) if `getAwards()` ever returns a slug this map doesn't know about (e.g., a 7th award added to the DB without a matching PNG). Not a review blocker — the seed content is the sole source of slugs today and is fully enumerated — just a latent trap for the next screen extension.

## Edge Cases Turned Up
- **Malformed jsonb** (see High #1) — the one edge case in the brief's "where to look hardest" list that isn't actually covered.
- **Empty `slugs` array**: `useAwardCategoryNav([])` is explicitly tested (`use-award-category-nav.test.ts:118-121`) and initializes `activeSlug` to `""` without throwing — correctly matches the empty-state path where `AwardCategoryNav` never mounts at all (`awards-screen.tsx:102-119` — `hasAwards` gate).
- **`scrollend` unsupported browsers**: `SCROLL_LOCK_FALLBACK_MS` fallback + `clearScrollLockTimers()` cleanup on both unlock and unmount looks correct — timers and the `scrollend` listener are always torn down (`use-award-category-nav.ts:55-64,99-102`), no leak found.
- **Reduced motion**: correctly switches `scrollIntoView` behavior to `"auto"`, per clarifications.md (`use-award-category-nav.ts:117-119`).

## Done Well
- **Authorization boundary is exactly right.** `src/proxy.ts` adds `/awards` only to `config.matcher` (locale/session-cookie refresh) and never to the protected branch — confirmed by reading the full matcher/guard split; the comment added at `proxy.ts:106-118` correctly explains why. No leak: the page reads a public content table plus `getViewer()` for optional personalization only, matching the pattern already established and accepted for `/` in `docs/vi/system/permissions.md`.
- **Chrome-promotion refactor genuinely is DOM-neutral.** Diffed `422d0b2` against its parent file-by-file (`header.tsx`→`site-header.tsx`, `home-footer.tsx`→`site-footer.tsx`, `kudos-section.tsx`, `home-copy.ts` split into `SiteChromeCopy`/`HomeCopy`): every changed line is an import path, a type rename, or a doc comment — no JSX, className, or string-literal copy value changed. The `defaultHomeCopy` recomposition (`...defaultSiteChromeCopy`) is byte-identical to the values it replaces.
- **DAL shape and typing discipline mirrors `src/dal/users.ts` precisely**: `server-only`, no self-constructed client, injected narrow `AwardsClient` type, and the `toAwardsClient` shim's rationale for the TS2589 workaround is documented and verifiable (I did not need to reproduce the compiler error to trust it — the narrowing pattern is sound on its face).
- **CI tagging change tells the truth.** The new `@local-db` tag, its exclusion in `ci.yml`, and the expanded `$GITHUB_STEP_SUMMARY` disclosure now correctly say that award content (the 6 categories, quantities, prize values) is unverified in CI — this is an honest, not overstated, disclosure. The outage test's `supabaseReachable` skip-inversion is a faithful mirror of `tests/e2e/login.spec.ts:576-594`, same rationale, same `!process.env.CI && isReachable` skip condition.
- **Repo conventions held**: no file over 200 lines, kebab-case throughout, no barrel `index.ts`, no cross-segment `_components`/`_shared` imports (only referenced in comments, never actual `import` statements), `messages/vi.json` and `messages/en.json` both got the new `awards.*` keys with matching leaf shapes.
- **i18n content authority respected**: spot-checked several award seed values against `spec/award-seed-content.md` (quantities, prize amounts, the two-element Signature prize list) — the test fixtures (`awards.test.ts` `HAPPY_ROWS`) and e2e assertions match the seed file, not a re-derived guess.

## Actions In Order
1. Add a runtime shape guard for `row.prize_values` (and, defensively, the other row fields) in `src/dal/awards.ts` before mapping, so a malformed jsonb row degrades to an empty/safe value instead of reaching `AwardSection`'s unconditional `.map()` — this is the one path that can still turn a Supabase-side data issue into a real 500, undermining the fail-open guarantee the rest of the stack is built around.
2. Optional: leave a one-line comment on `use-award-category-nav.ts`'s observer effect stating the invariant it currently relies on (all sections registered before the effect runs) so a future Suspense/streaming change doesn't silently break scroll-spy.

## Numbers
- Type coverage: not separately measured (tsc --noEmit reported 0 errors per orchestrator gate).
- Test coverage: 100% on the coverage-gated allowlist (`vitest.config.ts` thresholds), 150 unit tests passing, 66 e2e passing / 3 skipped (per orchestrator-verified gates — not re-run here).
- Lint findings: 0 (per orchestrator gate, not re-run here).

## Still Unresolved
- None from this review beyond the malformed-`prize_values` gap above. The three items flagged in the task brief as "known and accepted" (TC ID-1, TC ID-12/14, EN-only seed) were not re-reported as findings, per instruction.
