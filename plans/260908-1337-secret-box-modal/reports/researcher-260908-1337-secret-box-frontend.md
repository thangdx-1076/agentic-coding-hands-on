# Secret Box modal — frontend/test research

Preflight: no `.codegraph/`. Task is codebase-pattern archaeology (file:line citations),
not a tech comparison — `tkm:research` not applicable; fell back to Grep/Read/Bash directly.

## Q1 — Canonical modal pattern [EXTRACTED]

Native `<dialog>`, never Radix, never `useState`-driven `open` boolean prop. Two live examples,
identical contract:
- `src/app/(public)/kudos/_components/kudos-compose-dialog.tsx:79-108` (outer "Viết Kudo")
- `src/app/(public)/kudos/_components/kudos-link-dialog.tsx:70-197` (nested "Thêm đường dẫn")

Rules baked into every instance (comments are load-bearing, quote them in the plan):
- Component NEVER renders the `open` attribute or owns `useState`/`useEffect`. `kudos-compose-dialog.tsx:29-42` explains why: React commits `open` at render time, beating the hook's `if (!node.open) showModal()` guard → dialog ends up merely `open`, not `show-modal`-ed (no backdrop/focus-trap/Escape).
- `ref={registerDialog}` (a ref **callback**, never `RefObject` — hook-separation rule) hands the node to a hook; only that hook calls `.showModal()` / `.close()`.
- `onCancel={onCancel}` wired to the native `cancel` event (Escape) → same exit path as the Cancel button (`use-kudos-compose-dialog.ts:66-77`).
- Classes: `m-auto ... open:flex backdrop:bg-login-background/80` — `open:flex` (not bare `flex`) so the UA's `display:none` stays intact when closed; `m-auto` counters Tailwind Preflight's `margin:0` reset so the UA's native centering (`dialog:modal{margin:auto}`) wins (`kudos-compose-dialog.tsx:50-68`).
- a11y: `aria-labelledby` on the `<dialog>` pointing at the `<h2 id="...">` title; `data-testid` on the dialog root and title (`kudos-compose-dialog.tsx:90-98`, `kudos-link-dialog.tsx:87-99`).
- Scroll lock lives in the OUTER dialog's hook only (`use-kudos-compose-dialog.ts:79-89`, toggles `document.body.style.overflow`), restored on cleanup with the previous value. A nested dialog (link dialog) explicitly has **no scroll lock of its own** — it inherits the outer one (`use-kudos-link-dialog.ts:61-68`). Secret Box modal is a single, non-nested dialog → give it its own lock, copy the `use-kudos-compose-dialog.ts` effect verbatim.
- Closing: X/Cancel button click, Escape (native `cancel` event), and — reveal-specific in link dialog — Save/action button. No backdrop-click-to-close is implemented anywhere (native `<dialog>` backdrop click does not close by default here; no `onClick` handler on the backdrop pseudo-element is present or possible).
- `data-testid` convention: kebab-case, prefixed by feature (`kudos-link-dialog`, `kudos-link-title`, `kudos-link-cancel`, `kudos-link-save`); one per interactive/asserted node.
- The launcher (`kudos-compose-launcher.tsx:56-175`) is the composition-root pattern: owns both the dialog-lifecycle hook and the trigger; trigger button lives in a separate presentational component (`KudosComposePill`). Secret Box's launcher should mirror this: a `SecretBoxLauncher`/similar owning `useSecretBoxDialog` + wiring the (already-existing, currently `disabled`) trigger buttons.

## Q2 — Target paths [EXTRACTED + INFERRED]

Trigger buttons live in two different route groups:
- `src/app/(public)/kudos/_components/kudos-stat-list.tsx:105-120` (button `kudos-open-gift`, disabled, `title=...`)
- `src/app/(protected)/profile/_components/profile-statistics-card.tsx:59-65` (button, disabled, no testid yet)

Per `nextjs-route-colocation-architecture` SKILL.md's scope ladder (`<screen>→<feature>→(group)→src/app→src/<layer>`, climb one rung only when a consumer outside current scope appears): a component consumed by both `(public)` and `(protected)` groups has its common ancestor at `src/app` itself, NOT inside either route group. Confirmed precedent already exists: `src/app/_components/` and `src/app/_hooks/` (shell-level, shared by multiple groups — `account-menu.tsx`, `notification-bell.tsx`, etc.) and `src/app/_shared/site-chrome.ts`.

Proposed paths (INFERRED from the ladder + precedent, not yet built):
- Component: `src/app/_components/secret-box-modal.tsx` (+ `secret-box-modal.stories.tsx` — required, see Q2b)
- Hook: `src/app/_hooks/use-secret-box-dialog.ts` (+ mandatory `use-secret-box-dialog.test.ts`, vitest jsdom project)
- Copy/shared: `src/app/_shared/secret-box-copy.ts` (mirrors `src/app/_shared/site-chrome.ts` placement; `_shared/` files are copy/constants, exempt from unit-test mandate per `write-unit-tests-and-storybook-stories` SKILL.md "Does not apply when… `_shared/` types and constants")
- Badge assets: reuse `SECRET_BOX_BADGES` / `SECRET_BOX_BADGE_SIZE` already exported from `src/app/(public)/standards/_shared/standards-copy.ts:63-110` (6 slugs: revival, touchOfLight, stayGold, flowToHorizon, beyondTheBoundary, rootFurther; each `{slug, asset: "/standards/badge-*.png", width:64, height:64}`). DRY: do not re-declare a second badge table under `_app/_shared` — import from standards, OR promote the table itself up to `src/app/_shared` if the modal must not import across route-group boundaries (`(public)/standards` → `src/app` is an upward/sideways import the route-colocation skill's direction rule forbids: "Zone A never imports `src/app`" is about Zone A→app, but app-shell code importing FROM `(public)/standards` is a sideways segment-to-segment import, also forbidden by rule 3 "never a sibling"). **Recommendation: move `SECRET_BOX_BADGES`/`SECRET_BOX_BADGE_SIZE`/`SecretBoxBadge` type out of `(public)/standards/_shared/standards-copy.ts` up into the new `src/app/_shared/secret-box-copy.ts`, then have `standards-copy.ts` re-import them** — this is a real architectural decision the plan must call out, not silently violate the boundary rule.

Q2b — mandatory companion files (`write-unit-tests-and-storybook-stories` SKILL.md):
- Story: **required** if the modal passes the "common component" 3-question test (props-only data, no feature copy imported, composes <2 named components). A `SecretBoxModal` that receives `badges`/`copy`/`unopenedCount` as props and only composes `<Image>` + native elements → **common**, story required. If it directly imports `secret-box-copy.ts` itself (feature copy) rather than receiving copy as props, it fails Q2 ("no feature copy") → composition, story not required. Decide copy-as-props vs copy-import before scaffolding; existing pattern (`KudosLinkDialog`) takes copy as a prop object (`KudosLinkDialogCopy`) — follow that, keep it common + story-required.
- Unit test: mandatory for the hook (`_hooks/use-*.ts` → `use-*.test.ts`, jsdom project) and for any pure "pick random badge" logic — put that in `src/app/_utils/` (or a segment `_utils/` if it stays feature-scoped) as `pick-random-secret-box-badge.ts` + `.test.ts` (pure logic, no React, 100%-coverage allowlisted path).
- `.tsx` files themselves are NOT in the coverage allowlist (only `_hooks/_utils/_actions/route.ts/actions.ts` .ts files are) — the modal component itself has no unit-test requirement beyond the story + Playwright.

## Q3 — Auth in Playwright + protected-route coverage [EXTRACTED]

`tests/e2e/helpers/sign-in.ts` — three exported functions used together in every `@auth` spec's `beforeEach`:
1. `createTestSession(supabaseUrl, publishableKey, email, password, metadata)` (`sign-in.ts:9-81`) — signs up via GoTrue REST `/auth/v1/signup`, falls back to password grant on 422 (user exists).
2. `generateSupabaseCookies(...)` (`sign-in.ts:87-118`) — uses `@supabase/ssr`'s `createServerClient(...).auth.setSession(...)` to produce cookies in the exact SSR cookie format.
3. `injectSupabaseSession(context, cookies)` (`sign-in.ts:124-140`) — `context.addCookies(...)` onto `localhost`.

Call shape from `tests/e2e/kudos-link-dialog.spec.ts:70-90`: generate a unique `test-${Date.now()}-...@kudos-test.dev` email per test, `createTestSession` → `generateSupabaseCookies` → `injectSupabaseSession`, inside `test.beforeEach(async ({ context }) => {...})`.

Protected-route coverage confirmed: `tests/e2e/profile.spec.ts` (`/profile`, `(protected)` group) uses this exact same helper trio and is tagged `@auth` throughout its docstring contract table (`profile.spec.ts:27-53`). It ALSO already documents the Secret Box button as out of scope: `profile.spec.ts` C7 — "Self: nút `Mở Secret Box` có thuộc tính `disabled` trong MỌI trường hợp" (GUI_005) — **this existing assertion will need to flip** once the button is no longer permanently disabled; and the "OUT OF SCOPE" block (`profile.spec.ts:55-60`) defers Kudos-modal-adjacent behaviors similarly — check for an equivalent Secret Box deferral line before writing new specs.

## Q4 — Commands [EXTRACTED, empirically verified]

- Single spec file: `pnpm run test:e2e tests/e2e/<file>.spec.ts` — confirmed working via direct run (`pnpm run test:e2e tests/e2e/home.spec.ts --list` → "Total: 27 tests in 1 file", correctly scoped, no `--` needed). Equivalent: `pnpm exec playwright test tests/e2e/<file>.spec.ts`.
  **Correction to a stale prior-session memory** ("pnpm test:e2e does not filter by file") — re-verified today, the file filter DOES work as of the current `package.json` (`"test:e2e": "playwright test"`) + pnpm version in this repo. Trust this empirical result over the old memory note; memory updated below.
- Typecheck: `pnpm typecheck` (`tsc --noEmit`).
- Lint: `pnpm lint` (`eslint`), autofix `pnpm lint:fix`.
- Unit tests: `pnpm test:unit` / coverage-gated `pnpm test:unit:coverage`.
- `playwright.config.ts:22-65`: `baseURL` from `E2E_PORT` (default 3000), `webServer.command: pnpm dev --port ${PORT}`, `reuseExistingServer: !CI` (blind port-reuse risk — see memory `stale-dev-server-fakes-e2e-flakiness`), single `chromium` project.

## Q5 — Animation / reduced-motion convention [EXTRACTED]

Two layers, both already in use, both must be honored for a sparkle/reveal effect:
1. **Tailwind utility layer** — `motion-reduce:transition-none` appended to every `transition-*` class repo-wide (e.g. `src/app/(public)/(home)/_components/widget-button.tsx:22-28`, `award-card.tsx:46`, `language-selector.tsx:57`). Simple hover/press transitions use this and nothing else.
2. **Keyframe layer with explicit media-query override** — `src/styles/globals.css:41-56`: a named `@keyframes` + Tailwind `@utility` block, with `@media (prefers-reduced-motion: reduce) { animation: none; }` nested inside the `@utility` (not a separate global rule) "so the reduced-motion override is never beaten by an unlayered rule." This is the pattern to copy for a sparkle/reveal keyframe animation, not a bare CSS `@keyframes` + separate media query.
3. **JS-level `matchMedia` read** — `src/app/(public)/awards/_hooks/use-award-category-nav.ts:26-28`, `prefersReducedMotion()` = `window.matchMedia("(prefers-reduced-motion: reduce)").matches`, called once in a hook to gate `scrollIntoView({behavior})`. Same technique applies if the reveal needs a JS-driven sequence (e.g. skip a sparkle delay before showing the badge) rather than a pure CSS transition.

No existing "confetti"/"sparkle" asset or component found in `src/` (`find -iname "*sparkle*" -o -iname "*confetti*"` empty) — this asset and its animation are net-new for this feature.

## Unresolved / needs a decision before Track A starts

1. **Badge-table ownership** (Q2): move `SECRET_BOX_BADGES` from `standards/_shared` to `app/_shared`, or does the modal live under `(public)/kudos` only (not shared with `(protected)/profile`) — re-check whether profile's "Mở Secret Box" is actually in scope for this PR or still deferred (its own comment says "no click handler... FUN_006/007 deferred to F007+", `profile-statistics-card.tsx:16-22`). If profile stays deferred, the modal only needs `(public)/kudos` colocation, not the `src/app/_*` shell tier — simpler, but confirm with the plan author which button(s) this feature actually wires up.
2. **`kudos-stat-list.tsx`'s existing counts are always 0** (`kudos-stat-list.tsx` header comment: "no gift system exists yet, so `0` is the true count") — a real unopened-count and badge-collection data model does not exist yet; this report is frontend-only per the task scope, but Track B will need a DAL/API answer before the counter can show a real number.
3. Whether Secret Box open/reveal is `visual-contract` or `e2e-red-first` per MoMorph test-policy rules — this is a state-transition (click → reveal random badge) so `e2e-red-first` looks required per `momorph-development.md` rule 3's auto-select criteria; not resolved here, no MoMorph screenId/fileKey was supplied in this task.
