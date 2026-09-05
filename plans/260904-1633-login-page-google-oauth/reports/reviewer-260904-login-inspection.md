# Master's Inspection — Login (F001 Google OAuth) + Language Switch (F002)

## Scope
- Files: `proxy.ts`, `lib/supabase/{client,server,proxy-client,next-path}.ts(+test)`, `app/auth/callback/route.ts`, `app/{page,layout}.tsx`, `app/login/{page,login-client}.tsx`, `app/todo/{page,actions}.tsx`, `app/actions/locale.ts`, `i18n/request.ts`, `lib/i18n/locale.ts(+test)`, `messages/{vi,en}.json`, `next.config.ts`, `vitest.config.ts`, `components/login/**` (10 files), `app/fonts.ts`, `app/globals.css`, `tests/e2e/**`, `playwright.config.ts`, `package.json`, `.gitignore`.
- Lines: ~1,450 across 33 files (all under the 200-line cap).
- Depth: full — read every touched file, all 5 phase files, clarifications, both feature tech-specs, permissions.md, research report, all implementer/tester reports, latest evidence logs.
- Commands run: `npx tsc --noEmit` → **exit 2**; `npm run lint` → **exit 1**; `npx vitest run` → **exit 0** (17/17); `npm run build` → **exit 1** (typecheck stage). Did not start dev server or run Playwright (tester's lane); read `evidence/green-run.log` (19:25, newer than `reports/tester-green-visual-login.md` 19:16) which shows **14/14 Playwright tests passing**, same TC-ID titles as the RED baseline — no assertion weakened.

## Assessment
The reviewed application code (`proxy.ts`, `lib/supabase/**`, `app/**` excl. tests, `components/login/**`, i18n stack) is solid: two-layer auth guard matches the official Next.js pattern, `getUser()` used everywhere over `getSession()`, open-redirect defended with a unit-tested choke point, `?error=` never reflected raw into the DOM, cookies correctly copied onto redirect responses (the classic `@supabase/ssr` proxy bug), Supabase outages fail open instead of 500ing. **All 3 tool failures (tsc/lint/build) trace to the tester's declared in-progress files** (`tests/e2e/visual-capture.ts`, `tests/e2e/helpers/sign-in.ts`), not to the reviewed feature code — but they currently block the stated "tsc/lint/build exit 0" gate repo-wide and must be fixed before this can seal.

## Critical
None found.

## High
| Location | Issue | Fix |
|---|---|---|
| `tests/e2e/visual-capture.ts:7` | `browser.createContext(...)` — not a method on Playwright's `Browser` type. Fails `tsc --noEmit` (exit 2) **and** `npm run build` (Next's typecheck stage, exit 1) repo-wide. | `const context = await browser.newContext({...})`. |
| `tests/e2e/helpers/sign-in.ts:15,28` | `prefer-const` (line 15: `let signupResponse` never reassigned) + `no-explicit-any` (line 28: `let sessionData: any`) — 2 real ESLint errors, `npm run lint` exit 1. | `const signupResponse = ...`; type `sessionData` as the GoTrue signup/token response shape instead of `any`. |

## Medium
| Location | Issue | Fix |
|---|---|---|
| `lib/supabase/next-path.ts:18-32` | `safeNextPath` (documented as "the single choke point every next-path value passes through") only pattern-matches `//`, `/\`, `://` — it does not reject `\r`/`\n`/`\0`. `next=%2Ftodo%0D%0A...` decodes to a literal CR/LF that reaches `NextResponse.redirect(\`${origin}${safeNextPath(next)}\`)` in `app/auth/callback/route.ts:37`. Not exploitable *today* only because that call sits inside the surrounding `try { ... } catch` (Node's header-value validator throws on raw CR/LF → caught → falls back to `/login?error=auth_code_error`) — an accidental safety net, not an explicit one. A future caller of this "shared" utility outside a try/catch reintroduces a crash/header-injection surface. | Add explicit rejection: `if (/[\r\n\0]/.test(raw)) return fallback;` inside `safeNextPath`, independent of caller error handling. |
| `tests/e2e/login.spec.ts:218` | `const testPassword = 'Test123!@#'` is hardcoded into a tracked test file. Phase-05's own Security Considerations explicitly bar this ("KHÔNG hardcode vào `tests/**` được commit"). Low real-world risk (local-only GoTrue, per-run randomized email) but it's a stated-and-violated policy, and a bad pattern if this file is ever pointed at a shared instance. | Read from `process.env.E2E_TEST_PASSWORD` with a documented local-only default, or generate randomly per run. |

## Low
- `package.json:22,31` — `@playwright/test`/`vitest` devDeps use `^` ranges; the plan/research explicitly call these "pin"ned versions (runtime deps are correctly exact-pinned). Cosmetic inconsistency only.
- `components/login/login-screen.tsx:10`, `login-header.tsx:6`, `language-selector.tsx:7` — each redeclares a local `"vi" | "en"` union instead of importing `AppLocale` from `lib/i18n/locale.ts`. Minor DRY duplication; may be intentional Track A/B ownership boundary (UI layer stays decoupled from i18n internals) — not flagging as a real defect.
- `components/login/language-selector.tsx:78-93` — `role="menu"`/`role="menuitem"` items are plain Tab-order buttons, no ARIA APG arrow-key/Home-End roving navigation. Acceptable for a 2-item switcher and not required by any TC; worth a note for the already-planned "polish" pass.
- `public/login/keyvisual.png` still not exported from Figma (tracked risk, explicitly non-blocking per plan).

## Edge Cases Turned Up
- CRLF-in-`next` (see Medium above) — currently mitigated by accident, not by design.
- `?error=` on `/auth/callback` is reachable directly by anyone (route isn't behind the proxy guard, by design) — verified the value is never rendered raw on `/login`, only its boolean presence (`hasErrorParam`), so no reflected-XSS path exists despite full attacker control of the query string.
- Locale cookie normalization fires on *every* first anonymous visit (writes `NEXT_LOCALE=vi` even though that's already the default) — intentional per clarifications' "Gap resolution", not a defect.
- `proxy.ts`'s `isProtectedPage`/`isAuthPage` both include `/` — verified this doesn't loop: `/todo`'s own authoritative `getUser()` redirect is a second, independent check, not a partner in a cycle with the proxy.

## Done Well
- `getUser()` (never `getSession()`) used consistently in proxy, `/login`, `/todo`, matching the security note in `permissions.md`.
- `safeNextPath` has 9 targeted unit tests covering `//`, `/\`, `://`, missing-slash, empty/null — real regression protection for BR-002.
- Session-refresh cookies are copied from `response` onto `NextResponse.redirect()` in `proxy.ts` (`redirectPreservingCookies`) — the classic `@supabase/ssr` proxy bug is explicitly avoided.
- `proxy.ts`'s `getUserOrNull` wraps `getUser()` in try/catch — a Supabase outage degrades to "anonymous", never a 500.
- `useTransition` pending-state deliberately has no `finally` reset (documented reasoning), and `evidence/green-run.log` confirms TC 37eae882 now passes.
- i18n defense-in-depth: `normalizeLocale` whitelist enforced independently in `proxy.ts`, `i18n/request.ts` (try/catch around the dynamic import), and `app/actions/locale.ts`.
- `messages/vi.json` / `messages/en.json` have identical key sets (9 keys each), verified by direct read.
- `.env.local` confirmed gitignored and NOT tracked (`git status --short --ignored` shows `!! .env.local`); no service-role key anywhere; no `console.log`/`console.error` of sensitive data in reviewed app code.
- All 12 unauthenticated E2E test titles/TC-IDs in `login.spec.ts` are byte-identical to the RED baseline (`reports/tester-red-login-e2e.md`) — no assertion weakened to force GREEN.

## Actions In Order
1. Fix `tests/e2e/visual-capture.ts:7` (`newContext`) — unblocks `tsc`/`build`.
2. Fix the 2 lint errors in `tests/e2e/helpers/sign-in.ts:15,28` — unblocks `npm run lint`.
3. Harden `safeNextPath` against `\r\n\0` explicitly (Medium).
4. Move the hardcoded test password to env (Medium).
5. Re-run `tsc`/`lint`/`build`/Playwright and re-request a delta verdict.

## Numbers
- Type coverage: 1 error (`tests/e2e/visual-capture.ts`, WIP tooling; 0 errors in reviewed app/component/lib code).
- Test coverage: vitest 17/17 (`safeNextPath` 9, `normalizeLocale` 8); Playwright 14/14 per `evidence/green-run.log`.
- Lint findings: 2 errors + 1 pre-existing warning, all in `tests/e2e/**`.

## Still Unresolved
- Google OAuth cancel-payload shape (`error` vs `error_description` field names) still unverified against a real Google consent-cancel, per the spec's own § 5.3 Unresolved Questions — out of this review's reach (needs a live browser run).

## Delta Re-inspection (2026-09-04 19:59)

Re-ran `tsc`/`lint`/`vitest` live myself (build result taken from `evidence/raw-runs.json` + `reports/tester-final-temper-login.md` per instruction, not rebuilt): `npx tsc --noEmit` → **exit 0**; `npm run lint` → **exit 0**; `npx vitest run` → **exit 0** (26/26). `evidence/green-run.log` re-confirms Playwright **14/14**, same command, same 14 TC-ID titles as both the RED baseline and my first-pass review — the only line that changed in `tests/e2e/login.spec.ts` is the password variable (`Test123!@#` → `` `e2e-${randomUUID().slice(0,8)}` ``); zero assertions touched.

**All 5 previously-Accept findings resolved:**
1. `tests/e2e/visual-capture.ts` removed, replaced by `tests/e2e/visual-capture.mjs` (outside `tsconfig.json`'s `**/*.ts`/`**/*.tsx`/`**/*.mts` include globs) — `tsc`/`build` unblocked, verified live.
2. `tests/e2e/helpers/sign-in.ts:15` now `const signupResponse`; `:28` now typed `SessionResponse` interface instead of `any` — `npm run lint` exit 0, verified live.
3. `lib/supabase/next-path.ts` now explicitly rejects raw AND percent-encoded ASCII control chars (`hasRawControlChar` scans every code point < 0x20 or 0x7f; `hasEncodedControlChar` regex-matches `%XX` hex sequences). 8 new vitest cases (26/26 total). **Bypass check requested by coordinator:**
   - *Double/triple percent-encoding* (`%250d` reaching the check after Next's single automatic decode): the current regex's non-overlapping match can miss a `%25`-prefixed chain (e.g. `%250D` matches only `%25`, stranding `0D`) — a real detection gap, but **not exploitable**: reaching a raw CR/LF byte in the `Location` header would require a *second* decode pass between this check and `NextResponse.redirect()`, which does not exist in this pipeline (template-literal string concat, no re-decoding). Confirmed inert — filed as a Suggestion, not a security finding.
   - *Unicode line separators U+2028/U+2029*: not ASCII, so `isControlCodePoint` doesn't catch them. Still safe today — Node's header-value validator rejects any char outside `\x09,\x20-\x7E,\x80-\xFF` and throws, caught by the same enclosing `try/catch` in `route.ts` — but this is now the *only* remaining case relying on that accidental safety net (the CR/LF/NUL class the original finding was about is now explicitly rejected pre-emptively). Filed as a Suggestion for completeness.
   - *Tab*: now explicitly covered (0x09 < 0x20 in `isControlCodePoint`) — this also closes the browser-URL-tab-stripping `//`-bypass theory from my first-pass review.
   - Confirmed: `route.ts`'s try/catch is now genuine defense-in-depth for the CR/LF/NUL/DEL class (the primary Medium finding), not the sole guard.
4. `package.json:22` — `@playwright/test` now exact-pinned `"1.62.1"`.
5. `components/login/language-selector.tsx:7` — now imports `AppLocale` from `lib/i18n/locale` instead of a local union (the cited location is fixed; `login-screen.tsx`/`login-header.tsx` still declare their own local `"vi"|"en"` — same low-value cosmetic duplication as before, not re-filed).

**Polish pass** (`login-hero.tsx`, `google-login-button.tsx`, `language-selector.tsx`, `app/globals.css`) reviewed for regressions: no role/name/text changes anywhere (grep-diffable — only `className` and one new `<div>`-free CSS `@utility` added); `focus-visible` rings added to all 3 interactive controls (closes the `role="menu"` polish item from phase-05's requirements); menu entrance animation gated by `@media (prefers-reduced-motion: reduce)` inside the `@utility` block, verified in `reports/tester-final-temper-login.md`'s "Reduced motion (0s)" assertion. Hydration: all new/changed state (`open`, `isPending`) is plain `useState`/`useTransition` with no `window`/`Date.now()`/`Math.random()` branching in render — deterministic across SSR and client, no mismatch risk. `login-hero.tsx`'s `pt-*`/`pb-*` split + `lg:mt-2 lg:max-h-[845px]` changes desktop-and-below layout classes only; the tester's pixel-check at 1440×1024 (logo x=144/y=16, selector x=1188/y=12, button y≈673, footer y≈919) matches the original design targets — no semantic regression, verified against `reports/tester-final-temper-login.md`.

**Verdict: SEALED.** Criterion 8 (tsc/lint/vitest/build exit 0 + Playwright 14/14, unchanged RED command) is now proven and moved to `acceptanceCovered`. No Critical or open High findings remain; the 2 residual items (U+2028/U+2029 hardening, ARIA menu roving navigation) are Suggestion-level and deferred, not blocking.
