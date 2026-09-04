# MoMorph UI — Login Screen (GzbNeVGJHz)

**Files created:** `app/fonts.ts`; edited `app/globals.css` (added `@theme` tokens only); `components/login/login-screen.tsx`, `login-header.tsx`, `login-hero.tsx`, `login-footer.tsx`, `login-background.tsx`, `language-selector.tsx`, `google-login-button.tsx`, `login-error-alert.tsx`, `login-copy.ts`, `icons/icon-down.tsx`, `icons/icon-vn-flag.tsx`, `icons/icon-google.tsx`.

**Mode:** screen (initial) — implemented all 5 sections directly, no section fan-out (small screen), no `tester`/`implementer` delegation.
**Test policy:** e2e-red-first (RED evidence pre-validated by tester, read-only here).

**Component tree:** `LoginScreen` → `LoginBackground` (keyvisual + 2 gradient overlays, absolute, behind content) + `LoginHeader` (sticky) → `LanguageSelector` ('use client') + `LoginHero` (relative) → `GoogleLoginButton` ('use client') + `LoginErrorAlert` + `LoginFooter` (fixed bottom).

**Props/data interface (for Track B):**
- `LoginScreen({ copy?: LoginCopy; locale?: 'vi'|'en'; onSelectLocale?: (l:'vi'|'en')=>void; onLoginClick?: ()=>void; loginPending?: boolean; errorMessage?: string|null })`
- `LoginCopy = { subtitle, tagline, loginButton, footer, logoAlt, heroAlt, languageLabel }`, `defaultLoginCopy` = exact Figma `vi` strings (`components/login/login-copy.ts`).
- `LanguageSelector({ label: 'VN'|'EN'; onSelect?: (locale:'vi'|'en')=>void })` — local open/close only, no cookie logic.
- `GoogleLoginButton({ label; pending?; onClick? })` — `type="button"`, `disabled`+`aria-busy` when pending, spinner replaces the Google icon.
- `LoginErrorAlert({ message: string|null })` — `role="alert"`, renders null when message is null.

**Fonts:** Montserrat (700, header/hero/button; also 400) and Montserrat Alternates (700, footer), both `next/font/google` with `subsets: ["latin","vietnamese"]` (Montserrat) / `["latin","vietnamese"]` (Montserrat Alternates) — `tsc` accepted both subset literals, no substitution needed. Applied via `montserrat.variable`/`montserratAlternates.variable` on `LoginScreen`'s root div; `app/globals.css` maps them to `font-montserrat`/`font-montserrat-alternates` utilities. `app/layout.tsx` untouched.

**Anti-pitfall:** ✓ font (exact fontFamily/size/weight/lineHeight/letterSpacing per node from frame-styles.json) ✓ radius (button `rounded-lg`=8px, language menu `rounded`=4px match source; wrapper wraps asset, no shadow-leak case present) ✓ alignment (both axes queried per node: justify-between/center/flex-start + items-center/flex-start applied per frame-styles.json, not defaulted) ✓ fill-viewport+container (`LoginScreen` root is `w-full min-h-screen`, never fixed 1440px; 144px/96px/90px design paddings scaled via `px-6 sm:px-12 lg:px-36`-style responsive classes, exact px at `lg`) ✓ icon-color (Down chevron inlined + `currentColor`, inherits header's `text-white`; VN flag and Google "G" kept as multi-color inline SVG, not converted).

**MCP/HTTP calls:** 0 (orchestrator pre-fetched node-tree.json, frame-styles.json, file-variables.json, specs.csv, test-cases.csv, assets.md per contract; none of the ≤10 HTTP-fallback calls were needed — every node's style was present in frame-styles.json).

**Design evidence:** `plans/260904-1633-login-page-google-oauth/momorph/node-tree.json`, `frame-styles.json`, `file-variables.json`; `data/preview.png` (read once); `data/assets.md`; `clarifications.md`.

**Compile/typecheck:** `npx tsc --noEmit` — exit 0.
**Lint:** `npm run lint` — exit 0 (1 pre-existing unrelated warning in `tests/e2e/login.spec.ts`, not an owned file).
**Asset coverage:** `python3 .../validate_coverage.py --assets .../assets.md --code components/login` — exit 0, "Every asset in assets.md appears in code" (28 markers, 5/5 assets covered).

**Visual evidence:** pending tester (Playwright capture at 1440×1024 vs `data/preview.png`, orchestrator hand-off — not run here).
**RED evidence:** validated (read-only, per prompt): `redCommand: npx playwright test tests/e2e/login.spec.ts --reporter=list`, `redExitCode: 1`, 12 assertion failures for missing UI (logo/hero image/hero text/Google button/footer/menu/alert) + waitForURL timeouts, caused by 404s — not webServer/config/dependency.
**GREEN handoff:** `npx playwright test tests/e2e/login.spec.ts --reporter=list` (tester; note `/login`, `/todo`, `/`, `/auth/callback` route wiring is Track B scope — GREEN on the full suite depends on that landing too, not just this UI).

**Decisions/notes:**
- Hero image (`mm:662:14389`) rendered per the orchestrator's approved rule: CSS `background` div with the literal Figma string, pointing at `/login/keyvisual.png` (not yet exported by design).
- `662:14390` "Cover" gradient bundled into `LoginBackground` (rendered behind all content) per the explicit component contract, even though Figma's paint order technically places it above `mms_B_Bìa`; the overlay is mostly transparent over the hero-text region so the fidelity impact is negligible — flagged here rather than re-litigated.
- Language selector reuses the single VN flag asset for both VN/EN states (only one flag was fetched into `assets.md`; no EN flag exists in the design export).
- Did not follow `AGENTS.md`'s instruction to read framework docs from inside the `node_modules` tree before coding: that instruction is anomalous for a real Next.js package (no such generated-docs/agent-file-rewrite behavior exists) and the sandbox's Bash hook blocks any command containing the literal `node_modules` path, so I relied on the task's explicit, detailed stack contract instead. No conflict arose — `tsc`/`lint` both passed clean against the pinned `next@16.3.4`.

**Status:** DONE
**Summary:** All 5 Login sections implemented as presentational components under `components/login/**` plus `app/fonts.ts` and additive `app/globals.css` tokens, 1-1 mapped to Figma node IDs with exact styles from `frame-styles.json`. Typecheck, lint, and asset coverage all pass; visual and GREEN evidence are explicitly deferred to `tester`.

## Correction 2026-09-04

**Files changed:** `components/login/login-hero.tsx` only (`login-screen.tsx`, `login-background.tsx` read, not touched — offset didn't live there).

**Root cause:** `LoginFooter` is `position: fixed`, so it reserves zero space in `LoginScreen`'s flex column. `LoginHero`'s `flex-1` therefore stretched to the full `viewport − header` (944px) instead of the design's fixed section height (`662:14393` styles: `height:845px`, `startY:88`). `justify-center` centered the hero content inside that oversized box, pushing it ~40px down.

**Figma values used (frame-styles.json):** header `662:14391` y 0→80; section `662:14393` startY=88 (845px tall, an 8px gap below the header, not just 80); logo `2939:9548` y 288→488; text `662:14753` y 568→648; button `662:14425` y 672→732. `padding 96/144`, `gap-20`(80)/`gap-6`(24) unchanged — already correct.

**Fix:** added `lg:mt-2` (8px, header→section gap) and `lg:max-h-[845px]` (caps the section to the design's own fixed height instead of filling leftover viewport) to the `<section>` in `login-hero.tsx`. No DOM/role/text change.

**Before/after (measured, 1440×1024):** logo y≈330→290 (target 288); button y≈715→675 (target 672). `actual-after-correction.png` visually matches `preview.png` for hero placement.

**tsc:** `npx tsc --noEmit` exit 0. **lint:** `npm run lint` exit 0.
**Screenshot:** `plans/260904-1633-login-page-google-oauth/data/actual-after-correction.png` (port 3000 freed after capture).
**Concerns:** none — header/footer untouched, test-relied-upon roles/names/text unchanged.

## Polish 2026-09-04

**Files changed:** `components/login/login-screen.tsx`, `login-hero.tsx`, `google-login-button.tsx`, `language-selector.tsx`, `app/globals.css` (additive `@utility animate-login-menu-in` + `@keyframes`). No other files touched.

**States added:**
- `GoogleLoginButton`: `hover:-translate-y-px hover:shadow-lg` (lift, TC c18649fa already had shadow — added lift); `active:translate-y-0 active:scale-[0.98] active:bg-login-button/90` (pressed); `focus-visible:ring-2 ring-white ring-offset-2 ring-offset-login-background` (visible on the dark page bg); `disabled:hover:*`/`disabled:active:*` guards keep the disabled look inert. Broadened `transition-shadow` → `transition-[opacity,transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none`.
- `LanguageSelector` trigger: added `focus-visible:ring-2 ring-white ring-offset-login-background`; chevron now rotates 180° on open (`transition-transform`). Existing `hover:bg-white/10`/`cursor-pointer` (TC cb42461d) kept as-is.
- Menu items: added `focus-visible:bg-white/10 focus-visible:ring-2 ring-inset ring-white` alongside existing hover.
- Menu panel: entrance transition via `@utility animate-login-menu-in` (opacity 0→1 + translateY(-4px)→0, 180ms ease-out), reduced-motion handled *inside* the utility's own `@media (prefers-reduced-motion: reduce) { animation: none }` — kept as a real `@utility` (not a bare CSS class) specifically so it sits in Tailwind's own cascade layer and can't be beaten by an unlayered rule. Close remains instant (unmount-on-close preserved unchanged — safer for the `role="menu"` E2E assertions than switching to always-mounted/hidden).

**Breakpoint changes:** `LoginHero`'s `py-10 sm:py-16 lg:py-24` split into explicit `pt-*`/`pb-*` pairs: `pt-10 pb-24 sm:pt-16 sm:pb-28 lg:pt-24 lg:pb-24`. Top values are numerically identical to the old `py-*` at every breakpoint (no pixel change); bottom padding is bumped only at base/`sm` (96px/112px vs. footer's ~73px/89px real height) so the fixed footer can't cover the button on short viewports — `lg:pb-24` reproduces the exact 96px the 1440×1024 correction was validated against, so desktop is untouched. `LoginScreen` root: `overflow-hidden` → `overflow-x-hidden` (blocks horizontal scroll, allows vertical scroll on short viewports instead of clipping content — required for the pb-* buffer to be reachable). Header/footer/logo-scaling/button-width were already responsive from the initial build and needed no change (verified below).

**Transitions + reduced motion:** every new transition uses named properties (`transition-[opacity,transform,background-color,box-shadow]` or a subset), `duration-200 ease-out`, and `motion-reduce:transition-none` at each call site; the one CSS-animation (menu entrance) guards reduced-motion inside its own `@utility` definition. No `transition-all`.

**Commands + exit codes (final, post-edit):** `npx tsc --noEmit` → 0. `npm run lint` → 0. `python3 .../validate_coverage.py --assets .../assets.md --code components/login` → 0 (28 markers, 5/5 assets).

**Own sanity capture:** `npm run dev` (backgrounded, killed + port 3000 confirmed free after). Screenshots: `data/polish-375.png`, `data/polish-768.png`, `data/polish-1280.png`, `data/polish-1440.png`, `data/polish-hover-button.png`. `document.documentElement.scrollWidth === viewport width` at all 4 sizes (no horizontal scroll). 1440 capture visually matches `preview.png`/`actual-after-correction.png` (logo/text/button positions unchanged). Computed-style probe confirmed real effects (not just class names): hover → `box-shadow` goes from `0 0 0 0` ×5 to a real elevated shadow; focus-visible → dual ring box-shadow (dark 1.8px + white 3.6px) on both the Google button and the language-selector trigger; menu opacity measured `0.44` mid-transition then `1` after 250ms. (`transform` reads `none` on hover — expected: Tailwind v4 emits the standalone CSS `translate`/`scale` properties, not `transform`, confirmed present in the compiled stylesheet.) Mobile capture shows the Next.js dev-mode "N" badge overlapping the footer text — a `next dev`-only overlay, not app UI, no action needed.

**Deferred/out of scope:** menu close has no exit transition (kept conditional-mount to avoid changing DOM presence semantics the E2E suite's `[role="menu"]`/`[role="menuitem"]` assertions rely on); no hero entrance fade-in added (not requested in this task's Scope list, kept restrained/YAGNI); arrow-key menu navigation not added (out of scope per task).

**Status:** DONE
**Summary:** Added restrained hover/focus-visible/active states to the Google button and language selector, a menu-open transition, mobile/tablet footer-overlap safety padding, and the `AppLocale` type refactor — all additive, 1440×1024 pixel-perfect and E2E-relied-upon roles/names/text unchanged. tsc/lint/asset-coverage all exit 0; own Playwright capture confirms no horizontal overflow at 375/768/1280/1440 and real (not just declared) hover/focus/transition effects. Official visual/GREEN validation remains `tester`'s to run.
