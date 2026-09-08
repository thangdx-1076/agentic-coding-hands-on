# Homepage Widget Button FAB — expanded panel (phases 01 + 02)

## MoMorph refs
- FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h (`313:9139`)
- FAB thu gọn: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2 (`313:9137`)
- Instance thật: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM (`5022:15169`)
- testPolicy: e2e-red-first

## Phase 01 — promote/trích 2 icon dùng chung

Files created:
- `src/app/_components/icons/icon-close.tsx` — `IconClose`, byte-identical path data moved from `kudos-compose-icons.tsx`.
- `src/app/_components/icons/icon-close.stories.tsx`
- `src/app/_components/icons/icon-sun-logo.tsx` — `IconSunLogo`, byte-identical path/gradient data extracted from the inline SVG previously in `widget-button.tsx:69-140` (default `width="20" height="19" viewBox="0 0 20 19"`, gradients kept static-id per clarifications since pill and "Thể lệ" option never render simultaneously).
- `src/app/_components/icons/icon-sun-logo.stories.tsx`

Files edited:
- `src/app/(public)/kudos/_components/kudos-compose-icons.tsx` — `IconClose` body removed, replaced with `export { IconClose } from "../../../_components/icons/icon-close";`. `kudos-link-dialog.tsx` and `kudos-compose-footer.tsx` diff: empty (confirmed via `git diff --stat`).

Verification:
- `grep -rn "export function IconClose" src` → exactly 1 hit (`icon-close.tsx`).
- `wc -l` all 5 touched/created files: 36 / 34 / 95 / 34 / 48 — all < 200.
- `npx eslint` scoped to the 5 files → clean.
- `pnpm test:unit` → 536/536 (unchanged baseline, no new unit tests added by design — phase carries no `.tsx` in the coverage allowlist).

## Phase 02 — expanded panel + copy i18n

Files edited:
- `messages/vi.json`, `messages/en.json` — `home.widget`: removed `kudosItem`/`awardsItem`, added `standardsItem` ("Thể lệ"/"Rules"), `writeKudosItem` ("Viết KUDOS" both locales), `cancelLabel` ("Hủy"/"Cancel"); `label` unchanged.
- `src/app/(public)/(home)/_shared/home-copy.ts` — `HomeCopy.widget` type + `defaultHomeCopy.widget` default updated to the 4 new keys; removed the stale "INFERRED / user override pending" docstring note.
- `src/app/(public)/(home)/page.tsx` — `t("widget.standardsItem")`, `t("widget.writeKudosItem")`, `t("widget.cancelLabel")`.
- `src/app/(public)/(home)/_components/widget-button.tsx` — full rewrite (151 lines):
  - `WidgetButtonProps`: `{ standardsLabel, writeKudosLabel, buttonLabel, cancelLabel }`.
  - Single `<button>` morphs pill (`TRIGGER_PILL_CLASS`, `h-16 w-[106px] ... rounded-full bg-login-button ...`, unchanged rest-state pixels) ↔ "×" (`TRIGGER_CANCEL_CLASS`, `h-14 w-14 rounded-full bg-[#D4271D] text-white ...`). `aria-label={buttonLabel}` constant in both states; `aria-expanded={open}`; `title={open ? cancelLabel : undefined}` (never `aria-label`).
  - Trap 3: dropped `hover:scale-105`/`transition-transform`; hover now only `hover:shadow-[0_6px_10px_0_rgba(0,0,0,0.3)]` with `transition-[background-color,box-shadow]` — no geometry transition anywhere on trigger or option.
  - Trap 2: wrapper `<div data-testid="home-widget-fab" className="fixed right-6 bottom-6 z-30">` — only that one attribute added; no restructuring of `home-screen.tsx`.
  - Trap 1: root `<div ref={registerRoot} className="flex flex-col items-end gap-5">` renders `{open && menu}` then the trigger `<button>` as the fixed second element of one children array — trigger never remounts across open/close.
  - Panel: `role="menu"` with `animate-login-menu-in flex flex-col items-end gap-5`; 2 `<Link role="menuitem">` (`OPTION_CLASS = "flex h-16 items-center gap-2 rounded bg-login-button p-4 font-montserrat text-2xl leading-8 font-bold text-login-button-text ... hover:shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] ..."`), `registerItem(0)` → `ROUTES.STANDARDS` + `IconSunLogo` + `standardsLabel`; `registerItem(1)` → `ROUTES.KUDOS` + `IconPencil` + `writeKudosLabel`.
  - Removed inline SVG logo (was `widget-button.tsx:69-140`), pill's logo slot now `<IconSunLogo />` inside the same `h-6 w-6` wrapper span — no pixel change (component default matches the old inline size exactly).
- `src/app/(public)/(home)/_components/home-screen.tsx` — only the 3 `<WidgetButton>` prop names changed (`standardsLabel`, `writeKudosLabel`, `cancelLabel`); no structural change, no fragment, div root/font vars untouched.
- `src/app/(public)/(home)/_components/widget-button.stories.tsx` — `args` updated to the new prop names.

## Verification — real command outputs

- `npx eslint` (all touched src files, scoped): clean, no errors/warnings.
- `pnpm lint`: 2 errors / 4 warnings, **all inside `tests/e2e/home-widget-fab.spec.ts`** (pre-existing, out of ownership — read-only test contract). No errors in any file I touched.
- `pnpm typecheck`: exit 2, **single error** `tests/e2e/home-widget-fab.spec.ts(109,23): error TS2339: Property 'right' does not exist on type '{ x, y, width, height }'` — pre-existing bug in the read-only test (Playwright's `boundingBox()` has no `.right`), not introduced by this work. Zero errors in `src/`.
- `pnpm test:unit`: **536/536 passed** (63 files), including `messages-parity.test.ts` (2/2).
- `pnpm format:check`: after `prettier --write` on the one file I own that it flagged (`widget-button.tsx`), re-check is clean for that file. The other flagged file (`tests/e2e/home-widget-fab.spec.ts`) is untouched per the read-only contract.
- `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts`: **exit 1 — 4 passed / 1 failed**. The 1 failure (TC ID-36) is the pre-existing `menuBox!.right` bug above — it throws `Matcher error: received value must be a number or bigint` before the visual-contract assertion it guards even runs. Every other assertion in that same test (menu visible, "Thể lệ" link visible + href + 64px height, "Viết KUDOS" link visible + href + 64px height, no `/awards` link/text) **passed**. TC ID-37/38/39/40 all passed, including the exact-1-button assertion via `data-testid="home-widget-fab"` and the morph 106×64 ↔ 56×56 measurements.
- `E2E_PORT=3100 npx playwright test tests/e2e/home.spec.ts`: **27/27 passed**, including [TC ID-30..35] (menu keyboard/click behavior, second-click-to-close, Escape returns focus to trigger).
- Grep gates: `IconSunLogo` path data in exactly 1 file; `kudosItem|awardsItem` empty across `src`+`messages`; no `aria-label="Hủy"` / `aria-label={cancelLabel}` anywhere in `(home)`; `wc -l widget-button.tsx` = 151 (< 200).
- `pnpm build`: **not run** — blocked for subagents per repo hook; orchestrator owns it. No build-only risk identified (no new `next/font` imports, no new route/dynamic import).
- `.playwright-mcp/` removed before `format:check` per environment rule.
- No orphaned dev server on :3100 or :3000 before running Playwright (`lsof` checked, empty both).

## Deviations from phase files

- None on my part. The only gap is the pre-existing `tests/e2e/home-widget-fab.spec.ts:109` TypeScript/runtime bug (`boundingBox().right`), which sits inside the read-only test contract — I did not touch it. It caused 1 of 5 `home-widget-fab.spec.ts` tests to fail on a matcher/assertion error unrelated to the FAB implementation; all underlying visual-contract assertions in that same test passed. This blocks a clean `pnpm typecheck` (exit 2) and full 5/5 Playwright green — needs the test file fixed by whoever owns it (tester/phase 03), not a UI-implementer fix.

## Files touched (absolute paths)

Created:
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/_components/icons/icon-close.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/_components/icons/icon-close.stories.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/_components/icons/icon-sun-logo.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/_components/icons/icon-sun-logo.stories.tsx`

Edited:
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/kudos/_components/kudos-compose-icons.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/messages/vi.json`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/messages/en.json`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/(home)/_shared/home-copy.ts`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/(home)/page.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/(home)/_components/widget-button.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/(home)/_components/home-screen.tsx`
- `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/src/app/(public)/(home)/_components/widget-button.stories.tsx`

Untouched (read-only, verified via `git diff --stat tests/` = empty for tracked files):
- `tests/e2e/home-widget-fab.spec.ts`, `tests/e2e/home.spec.ts`

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Phases 01 and 02 implemented exactly per the phase files: 2 icons promoted/extracted (phase 01), expanded FAB panel + copy i18n built with all 3 traps handled (phase 02). `home.spec.ts` 27/27, unit 536/536, lint/typecheck clean in every file I own, `home-widget-fab.spec.ts` 4/5 (only failure is a pre-existing `.right`-on-`boundingBox()` bug inside the read-only test file, not my implementation).
**Concerns/Blockers:** `tests/e2e/home-widget-fab.spec.ts:109` has a real TS/runtime bug (`menuBox!.right` — `boundingBox()` has no `right` property) that (a) makes `pnpm typecheck` exit 2 and (b) fails TC ID-36 at that exact line before its visual-contract check runs. This is outside my file ownership (test files are read-only) and needs to be fixed by whoever owns `tests/e2e/`, likely by replacing `.right` with `.x + .width`, before phase 03's success criteria ("typecheck 0 lỗi", "5/5 passed") can be met. `pnpm build` was intentionally not run (blocked for subagents) — no build-only risk identified.
