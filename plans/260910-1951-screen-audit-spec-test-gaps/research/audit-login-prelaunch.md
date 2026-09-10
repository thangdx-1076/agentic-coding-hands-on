# Audit: Login (GzbNeVGJHz) + Countdown Prelaunch (8PJQswPZmU) vs MoMorph specs

Date: 2026-09-10 · fileKey `9ypp4enmFmdK3YAFJLIu6C` · testPolicy `e2e-red-first` · READ-ONLY audit.
Authoritative data saved verbatim under `../momorph/` (frame-*.md, specs-*.csv, test-cases-*.csv).
`pnpm test:unit` → 83 files / 808 tests, all green (run 2026-09-10 20:01).

Paths below are relative to repo root `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`.

---

## Screen 1 — Login (GzbNeVGJHz, 8 spec rows, 17 TCs)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | GAP | 7/8 rows match. Row 1 header sticky → `src/app/(public)/login/_components/login-header.tsx:22`; row 1.1 logo `login-header.tsx:27-34`; row 1.2 dropdown VN default + flag + chevron `src/app/_components/language-selector/language-selector.tsx:50-72`; row 2 section `login-hero.tsx:39`; row 2.1 hero keyvisual + 2 gradients `login-background.tsx:22-46`; row 2.2 subtitle/tagline `login-hero.tsx:57-60`; row 2.2.1 button icon+label+pending spinner `google-login-button.tsx:28-51`; row 3 footer fixed + copyright `login-footer.tsx:12-16`. GAPS: row 1.2 flag is hardcoded `IconVnFlag` for both locales (`language-selector.tsx:62`); row 2.2 "Tiêu đề lớn ROOT FURTHER" is a bitmap, not a text node (`login-hero.tsx:45-52`). |
| Logic | GAP | `required=false` + `defaultValue=VN` + `ISO 639-1` + NEXT_LOCALE cookie → `src/lib/i18n/locale.ts:9-51`, `src/app/_actions/set-locale.ts:25-43`, normalize-on-read `src/proxy.ts:110-122`. Row 1.2 `userAction=on_click` + transitionNote (dropdown, whole-page re-render) → `language-selector.tsx:55`, `login/_hooks/use-login-actions.ts:60-66`. Row 2.2.1 `on_click` → OAuth kickoff `use-login-actions.ts:43-58` → `src/api/auth.ts:40-56`; loading state `google-login-button.tsx:29-31`; validationNote error copy verbatim in `messages/vi.json login.error` / `messages/en.json`, rendered `login-error-alert.tsx:13-19`. GAP: row 2.2.1 transitionNote says redirect to `/todo`; code redirects to `/` (`login/_components/login-client.tsx:25`, `login/page.tsx:36`, `src/utils/url/next-path.ts` fallback) — deliberate product change per `docs/vi/features/F001_GoogleOAuthLogin/functional-spec.md:82,156,180,238`, so the MoMorph row is stale. |
| Test coverage | GAP | 12/17 TCs have a real e2e test in `tests/e2e/login.spec.ts` (IDs in test titles). 4 TCs have no executable test at all (98e20775, c18649fa, cb42461d, and 5f1cbabd only incidentally). Root cause for the 3 UI-state TCs: `vitest.config.ts:97-110` includes only `*.ts` globs — no `.tsx` component tests exist, and Storybook is `build-storybook` only (`package.json` has no test-runner script), so `*.stories.tsx` assert nothing. |

## Screen 2 — Countdown Prelaunch (8PJQswPZmU, 5 spec rows, 17 TCs)

`screen_overview` is `null` in MoMorph — behaviour was judged from the 5 spec rows only.

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | GAP | Row 0.1 full-viewport cover bg + dark scrim → `src/app/(public)/prelaunch/_components/prelaunch-screen.tsx:55-73` (`object-cover`, no-repeat is the default). Row 0.2 title, centered/white/i18n, defaultValue "Sự kiện sẽ bắt đầu sau" → `prelaunch-screen.tsx:77-79` + `messages/vi.json prelaunch.title` / `messages/en.json` = "Event starts in" (both match the CSV verbatim). Rows 1-3 labels DAYS/HOURS/MINUTES uppercase white → `src/app/(public)/_components/countdown-tiles.tsx:48-57` + `messages/*.json home.hero.{days,hours,minutes}`. GAPS: rows 1-3 say "Hai hộp chữ số kiểu LED" (two LED digit boxes per unit) — implementation renders ONE box per unit (`countdown-tiles.tsx:26-46`, one `DigitBox` per tile) and the LED face is not loaded, falling back to monospace (`countdown-tiles.tsx:40`, `fontFamily: '"Digital Numbers", monospace'`). |
| Logic | GAP | Auto-tick every 1s → `src/app/(public)/_hooks/use-countdown.ts:40-50`. Days=00 under 1 day, hours 00-23, minutes 00-59, clamped at 0, never negative → `src/utils/countdown.ts:34-43` (floor + `Math.max(0, …)` + modulo). Zero-pad → `src/utils/countdown.ts:49-51`. Nav lock/unlock (row 1 transitionNote) → `src/domain/prelaunch-lock.ts:94-120` wired at `src/proxy.ts:49-67`. GAPS: (a) row 1 `format` caps days at `00–99`, `pad2` never truncates so >99 days renders 3 digits — live today: `.env.local:4 EVENT_START_AT=2026-12-26T18:30:00+07:00` is ~107 days out, so the tile shows `107`; `src/utils/countdown.test.ts:72,94` pins that as intended. (b) row 1 says the lock follows the countdown alone; code additionally requires `PRELAUNCH_LOCK_ENABLED=true` (`src/domain/prelaunch-lock.ts:25-27`), so with the flag unset the site is never locked. (c) row 1 description says target datetime comes from an API (databaseNote: "TODO: thiết kế API endpoint"); code reads env only (`prelaunch/page.tsx:58`). |
| Test coverage | GAP | 0/17 prelaunch TC_IDs appear anywhere in `tests/` or `src/` (grepped all 17). Behaviour is covered indirectly: `src/utils/countdown.test.ts` (15 tests), `src/app/(public)/_hooks/use-countdown.test.ts` (6), `src/domain/prelaunch-lock.test.ts` (exhaustive planProxy truth table), `tests/e2e/prelaunch.spec.ts` C1-C6. Not covered anywhere: lock-ON end-to-end (C6 only tests lock OFF, `tests/e2e/prelaunch.spec.ts:128-141`; `playwright.config.ts:62-70` never sets `PRELAUNCH_LOCK_ENABLED`), `src/proxy.ts` itself has no unit test, hours=23 / minutes=59 boundaries, days<1-but->0, label colour, LED tile structure. |

---

## Gaps

1. **severity: major** — Prelaunch nav lock (spec row 1 `transitionNote`) has zero end-to-end proof. `tests/e2e/prelaunch.spec.ts:128` tests only lock OFF; `playwright.config.ts:62-70` never sets `PRELAUNCH_LOCK_ENABLED`, and `src/proxy.ts:49-67` (the planProxy→NextResponse.redirect wiring) has no unit test either — only the pure decision table in `src/domain/prelaunch-lock.test.ts`. Fix: add a lock-ON e2e project/fixture (`PRELAUNCH_LOCK_ENABLED=true` + a future `EVENT_START_AT`) asserting `/`, `/login`, `/kudos` → `/prelaunch` and `/prelaunch` → 200.
2. **severity: major** — 4 Login TCs have no executable test: 98e20775 (flag + chevron), c18649fa (button hover shadow), cb42461d (selector hover highlight/pointer), and 5f1cbabd (default "VN") is only incidentally touched by `tests/e2e/login.spec.ts:64-77`. Cause: `vitest.config.ts:97-110` has no `.tsx` glob and Storybook never runs as a test. Fix: add hover/flag assertions to `tests/e2e/login.spec.ts` (`toHaveCSS("box-shadow"|"cursor")` + `header svg` count) rather than opening a new test layer.
3. **severity: major** — Prelaunch spec rows 1/2/3 require two LED digit boxes per unit; `src/app/(public)/_components/countdown-tiles.tsx:26-46` renders one box per unit. Fix: split `DigitBox` into two per-digit boxes (or record the collapse as an accepted deviation in the screen's clarifications and update the MoMorph rows).
4. **severity: major** — Login spec row 2.2.1 `transitionNote` still says post-OAuth redirect to `/todo`; code goes to `/` (`login/_components/login-client.tsx:25`, `login/page.tsx:36`). The change is deliberate and documented (`docs/vi/features/F001_GoogleOAuthLogin/functional-spec.md:82,156,180,238`), so the design row is stale, not the code. Fix: `upload_specs` row 2.2.1 with `/` as the destination so the next Track A run does not regress it back to `/todo`.
5. **severity: minor** — Prelaunch row 1 `format` says `00–99`, but `pad2` (`src/utils/countdown.ts:49-51`) pads only and never caps, so today's `.env.local:4` target renders a 3-digit `107`; `src/utils/countdown.test.ts:72,94` and `tests/e2e/prelaunch.spec.ts:77-81` (`/^\d{2,}$/`) both enshrine it. Fix: widen the CSV `format` to `2+ digits, zero-padded` (code behaviour is the better one) — do not clamp days to 99 or the number becomes wrong.
6. **severity: minor** — Prelaunch lock needs `PRELAUNCH_LOCK_ENABLED=true` on top of the countdown (`src/domain/prelaunch-lock.ts:25-27`), which spec row 1 does not mention; with the flag unset (the repo default) the lock never engages. Fix: add the flag to row 1's `transitionNote`/`databaseNote` so the env-gate is part of the design contract.
7. **severity: minor** — Language selector always renders the Vietnam flag, including when the label is `EN` (`src/app/_components/language-selector/language-selector.tsx:62`). Spec row 1.2 only defines the VN state, so the EN state is undesigned. Fix: ask MoMorph for the EN flag asset, or map locale→flag icon.
8. **severity: minor** — Login TC 42b82364 expects the title "ROOT FURTHER" to be present, but `tests/e2e/login.spec.ts:106-114` asserts only the subtitle and tagline; the title is a bitmap (`login-hero.tsx:45-52`). Fix: add `expect(page.locator('img[alt="ROOT FURTHER"]')).toBeVisible()` to that test (the asset itself is already pinned by TC 5fbe2a18).
9. **severity: minor** — Weak/tautological assertion: `tests/e2e/login.spec.ts:687` `expect(page.url()).toContain("/")` passes for every URL. The preceding `waitForURL("/")` is what actually tests TC f62b0c97. Fix: replace with `expect(new URL(page.url()).pathname).toBe("/")`.
10. **severity: minor** — Three login TCs are asserted only at "element is visible", dropping their positional/step-3 clauses: 6ae76d15 (button centered below the descriptions, Google icon visible — `login.spec.ts:116-121`; note the implementation is left-aligned per spec row 2.2, so the TC's "centered" wording conflicts with the spec), 33a1dacf (footer `position: fixed`, scroll-invariant — `login.spec.ts:123-131`), b9805e65 step 4 (logo non-interactive). Fix: assert `toHaveCSS("position","fixed")` for the footer and an icon-count for the button; raise the 6ae76d15 wording conflict with the designer.
11. **severity: minor** — Prelaunch data-validation TCs f98adad8 / 724e6e17 / b373626d test the hours 23, minutes 59 and days<1 boundaries; `src/utils/countdown.test.ts` only covers 1d2h3m, exactly-at-target, past-target and ≥100 days. Fix: add three `remaining()` cases (23h59m left, 90m left, 30s left) to `src/utils/countdown.test.ts`.
12. **severity: minor** — Prelaunch row 1 says the target datetime comes from an API (`databaseNote` = TODO endpoint); the implementation reads `EVENT_START_AT` from env (`prelaunch/page.tsx:58`, `src/proxy.ts:56`). Fix: leave the code as-is and close the CSV TODO by recording "env-configured, no endpoint" — or file the endpoint as a real backlog item.
13. **severity: minor** — `tests/e2e/login.spec.ts:151` is titled `[TC 45278c06]` but tests the `?error=` alert, which belongs to spec row 2.2.1's `validationNote`, not to that access-control TC. Fix: retitle it to the spec row it actually covers so the TC→test map stays honest.

---

## TC coverage matrix

### Login — GzbNeVGJHz

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| 45278c06 | Login visible unauth / after logout / authed redirected | `tests/e2e/login.spec.ts:151,163,171` + `:702` (logout) + `:681` | covered |
| b9805e65 | Logo top-left, all sizes, non-interactive | `login.spec.ts:50-62` | partial (no resize, no non-interactive check) |
| 8415b629 | Language selector top-right, all sizes | `login.spec.ts:64-77` | partial (no resize/position assert) |
| 33a1dacf | Footer visible + fixed + non-interactive | `login.spec.ts:123-131` | partial (visibility only) |
| 5fbe2a18 | Hero background artwork present | `login.spec.ts:79-104` | covered |
| 42b82364 | Title "ROOT FURTHER" + 2 descriptions | `login.spec.ts:106-114` | partial (title not asserted) |
| 6ae76d15 | Login button position, label, icon | `login.spec.ts:116-121` | partial (visibility only) |
| 20d87e28 | Dropdown opens on click + hover state | `login.spec.ts:133-149` | partial (hover not asserted) |
| 5f1cbabd | Default language code "VN" | `login.spec.ts:64-77` (incidental) | partial |
| 98e20775 | VN flag left of "VN", chevron right | — | **gap** |
| f62b0c97 | Authed user redirected off /login | `login.spec.ts:681-688` | covered (weak 2nd assert) |
| 60bc5bbb | Click → Google auth flow starts | `login.spec.ts:181-201` | covered (same-tab redirect, not "new tab/popup") |
| c18649fa | Button shadow on hover | — (stories only) | **gap** |
| 37eae882 | Button disabled + loader while authenticating | `login.spec.ts:203-278` | covered |
| 4426635b | Language dropdown opens on click | `login.spec.ts:133-149` | covered (dup of 20d87e28) |
| cb42461d | Selector hover highlight + pointer cursor | — (stories only) | **gap** |
| e76aa170 | User info returned, redirected to main page | `login.spec.ts:690-700` | partial (asserts /todo content, not the post-OAuth hop) |

### Prelaunch — 8PJQswPZmU

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| 68d82c58 | Authed any-privilege access via nav/URL; bad URL handled | `tests/e2e/prelaunch.spec.ts:27-35` (anon 200) | partial (no authed run, no bad-URL case) |
| e6a59553 | Unauthenticated access allowed or redirected | `prelaunch.spec.ts:24-35` (anon storageState, 200) | covered |
| 1c266552 | Low-privilege user denied/redirected | — | **UNVERIFIABLE** (no role model on this route) |
| 17aa9e0d | Expired session → login or timeout msg | — | **gap** (route is public, so arguably N/A) |
| 400e248f | DAYS unit: LED digits + uppercase white label | `prelaunch.spec.ts:47-81` | partial (no LED/2-box/colour assert) |
| 25d9ddaa | HOURS unit: LED digits + label | `prelaunch.spec.ts:47-81` | partial |
| 68cf8e17 | MINUTES unit: LED digits + label | `prelaunch.spec.ts:47-81` | partial |
| 37fd89d1 | All 3 labels uppercase + white | `prelaunch.spec.ts:64-74` | partial (case only, colour not asserted) |
| 33fe648b | DAYS renders 00/09/10/31 | `src/utils/countdown.test.ts:86-95` (pad2) | partial (pad2 only, not per-unit) |
| 1bd69f78 | HOURS renders 00/09/10/23 | `src/utils/countdown.test.ts:86-95` | partial (23 boundary missing) |
| 8dc4bba6 | MINUTES renders 00/09/10/59 | `src/utils/countdown.test.ts:86-95` | partial (59 boundary missing) |
| 840dd6be | Values auto-update in real time | `src/app/(public)/_hooks/use-countdown.test.ts:41-66` | covered |
| b373626d | DAYS shows 00 when <1 day left | — | **gap** (only the reached case is tested) |
| f98adad8 | HOURS clamped to 00-23 | `src/utils/countdown.test.ts:35-84` (modulo) | partial (no -1/25/23 cases) |
| 724e6e17 | MINUTES clamped to 00-59 | `src/utils/countdown.test.ts:35-84` | partial (no -1/60/59 cases) |
| 50fc4021 | All units 00 on completion | `countdown.test.ts:48-71` + `use-countdown.test.ts:82-99` | covered |
| c715cb38 | Two digits with leading zero | `countdown.test.ts:85-96` + `prelaunch.spec.ts:77-81` | covered |
| (row 1 transitionNote) | Nav locked until countdown 0, unlocked after | `src/domain/prelaunch-lock.test.ts` (pure) + `prelaunch.spec.ts:128` (lock OFF only) | partial — see Gap 1 |

---

## Not verifiable, and why

- **Colours, typography, spacing, responsive breakpoints.** The specs CSV for both screens carries no colour/font/size/spacing columns (only `description` prose). Every hex, font size and breakpoint in the code (e.g. `#FFEA9E`, `text-[49.152px]`, `lg:px-36`) is therefore unverifiable against MoMorph from this data — it would need `list_frame_styles` / `get_design_item_image`, which was out of scope here. No value was invented.
- **Prelaunch `screen_overview` is `null`** — no narrative behaviour to audit beyond the 5 rows.
- **Rendered pixels.** No browser was driven (visual validation belongs to `tester`), so "centered", "top-left", "fixed at bottom" were judged from CSS classes plus the existing e2e boundingBox assertions, not from a screenshot.
- **TC 1c266552 / 17aa9e0d** (low-privilege denial, session expiry on `/prelaunch`) — the app has no role model (`docs/vi/features/F001_GoogleOAuthLogin/functional-spec.md:30`) and `/prelaunch` is public by design, so these two TC rows have no implementable target. They need a designer/BA decision, not a test.
- **`pnpm build` / `pnpm test:e2e` were not run** (hook-blocked / orchestrator-owned dev server), so every e2e claim above is a static read of the spec files, not an observed pass. `pnpm test:unit` was run: 808/808 green.
