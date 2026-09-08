# Review — Homepage Widget Button FAB, expanded state (feat/home-widget-fab)

## Scope
- Files reviewed: `widget-button.tsx`, `home-screen.tsx`, `widget-button.stories.tsx`, `home-copy.ts`, `page.tsx`, `messages/{vi,en}.json`, `kudos-compose-icons.tsx`, `icon-close.tsx`(+stories), `icon-sun-logo.tsx`(+stories), `tests/e2e/home-widget-fab.spec.ts` (read-only), `use-menu-keyboard-nav.ts` (read-only), `home.spec.ts` (read-only, diff-empty confirmed), `plans/action-items.md`.
- Lines: `git diff origin/main --stat` → 9 files, +134/-155. `widget-button.tsx` is 151 lines (cap: 200).
- Depth: full read of every changed file plus the plan/clarifications/phase docs and both test files it must satisfy.

## Assessment
Solid revision. The three load-bearing traps (React identity across morph, `buttonCount===1` locator fix, hover-transform breaking `boundingBox()`) are each handled exactly as the plan specified, and I independently traced the JSX to confirm the identity claim: `{open && menu}` then `<button>` are two fixed slots of the same children array, so React reconciles the `<button>` at a stable index regardless of `open`, and `registerButton`'s ref never nulls out. The click-outside boundary (`rootRef` wraps both menu and trigger, unchanged from before) still works with the trigger inside the panel now. Copy/i18n change is complete and symmetric across both locales, no orphaned keys anywhere in `src`/`messages`/`tests`. Icon promotion is a clean, correctly-scoped re-export, verified against both real consumers. R1-R9 in phase-02 all hold against the code. One real documentation defect below (stale decision in `action-items.md`) and a couple of low-severity items.

## Critical
None.

## High
None.

## Medium
1. **Stale, reversed decision left uncorrected in `plans/action-items.md:879-895`.** The `## 260908-1125 — home-widget-fab (blueprint)` entry records: *"`home-screen.tsx` trả fragment, `<WidgetButton>` thành sibling của div gốc — bắt buộc... Kèm theo: `montserrat.variable` chuyển lên wrapper của widget."* This is the opposite of what shipped. `plan.md` (Decisions) and `phase-02-expanded-fab-panel-and-copy.md` (Bẫy 2) explicitly record that the orchestrator **rejected** this fragment/font-var restructuring and fixed the `buttonCount` locator instead (`page.getByTestId("home-widget-fab")` + `data-testid` on the wrapper). The actual diff of `home-screen.tsx` confirms this — it only renames 3 props, no fragment, no font-var move. Because `action-items.md` is append-only per project convention, this stale entry can't be edited away, but nothing was appended to correct it (contrast with `clarifications.md:104-110`, which *does* record the writeKudosItem correction explicitly). A future reader will act on the wrong decision. **Fix:** append a correction entry now, before this ships, e.g. under a new `## <date> — home-widget-fab (correction)` block: "Bẫy 2 fixed via `data-testid` + locator change, not fragment restructuring — the 1125 blueprint entry above is superseded."

## Low
1. **Ring color on the red cancel button.** `TRIGGER_CANCEL_CLASS` (`widget-button.tsx:25`) uses `focus-visible:ring-login-button` (the same yellowish ring as the pill) against a `#D4271D` red circle — low contrast for a focus indicator on that specific background. Pre-existing pattern reused as-is, not introduced fresh by this diff, and not asserted by any test; flagging as a polish item, not a blocker.
2. **No viewport-narrow / short-height test coverage for the 224px-tall open panel.** `plan.md` "Out of scope" correctly notes FAB is homepage-only and MoMorph has no other instances, but there is no e2e or visual check for a short mobile viewport where the panel (`64+20+64+20+56=224px`) plus `bottom-6` could sit close to a `100vh` fold or overlap prior content while open. Not a regression — the collapsed pill already existed there — just an untested edge the plan's own risk table flags only for layout-shift, not for viewport-height collision. Worth a follow-up visual check if the design gets used below ~500px tall viewports.

## Edge Cases Turned Up
- **React identity**, re-derived independently (not just trusted from the docstring): with no explicit `key`, React's array reconciliation matches children by index+type. `[open && <div role="menu">, <button>]` keeps `<button>` at index 1 in both boolean states of the first slot, so the fiber (and thus `registerButton`'s DOM node) survives toggling. The rejected alternative (`open ? <>{menu}{trigger}</> : trigger`) would move `<button>` from "the only child" to "second child of a Fragment" — a real type/position change that forces unmount+remount. Confirmed correct.
- **Click-outside boundary**: verified `registerRoot` sits on the flex-column div wrapping *both* the conditional menu and the trigger, in both old and new code — so moving the trigger from a `relative` div into the flex column changed nothing about what counts as "outside." No regression here despite the DOM reshuffle.
- **`title` vs `aria-label`**: per the accessible-name computation algorithm, `aria-label` wins over `title`; confirmed `aria-label={buttonLabel}` is present and unconditional (`widget-button.tsx:118`) while `title` is conditional and cosmetic (:121). R1 holds.
- **Tab behavior**: `handleMenuKeyDown`'s `case "Tab": close(false)` (unchanged, `use-menu-keyboard-nav.ts:160-162`) closes without forcing focus back, so Tab continues its natural document order — no focus trap introduced by the new panel shape.
- **Layout math**: 64(option)+20(gap)+64(option)+20(gap)+56(×) = 224, matching node `313:9140` exactly, and since the wrapper is `position: fixed` with `bottom-6` anchoring the bottom edge, growth on open pushes the panel *upward*, not outside the fixed anchor point — consistent with both frames' `endY: 904`.
- **Icon consumer count**: grepped `IconClose` across `src/` — exactly 3 real consumers now (`widget-button.tsx`, `kudos-link-dialog.tsx`, `kudos-compose-footer.tsx`) plus the re-export shim and its own story; no duplicate path data (`icon-sun-logo.tsx`'s path appears in exactly one file per the plan's own grep criterion).

## Done Well
- The three "bẫy chịu lực" are each fixed at the root cause the plan diagnosed (identity, locator, transform), not papered over — and the fixes are minimal, scoped diffs rather than restructuring surrounding code.
- Orchestrator caught and corrected its own `en.json` copy mistake (`writeKudosItem`) before this diff, and the correction is visible and correct in the current `messages/en.json`.
- DRY icon promotion is genuinely clean: real re-export, no duplicated SVG path data, correctly reasoned through the route-colocation scope ladder, and both pre-existing kudos call sites still compile against the shim.
- Copy/prop rename touched all 5 call sites atomically (`page.tsx`, `home-copy.ts` ×2, `home-screen.tsx`, `widget-button.stories.tsx`) with no orphan left in `src`/`messages`/`tests`.
- Security posture is appropriately minimal for the change: two static internal `ROUTES.*` links, no user input, no new network call, no `dangerouslySetInnerHTML` — correctly scoped as out of Track B entirely.

## Actions In Order
1. Append a correcting entry to `plans/action-items.md` superseding the 1125 fragment/font-var "bắt buộc" decision before this ships (Medium).
2. Optional polish: adjust the cancel button's focus ring color for contrast against `#D4271D` (Low).
3. Optional: add one visual check at a short/mobile viewport for the open panel before this design is reused elsewhere (Low, no action needed for homepage-only scope today).

## Numbers
- Type coverage: `pnpm typecheck` 0 errors (orchestrator-verified, not re-run by me).
- Test coverage: `pnpm test:unit` 536/536; `home-widget-fab.spec.ts` 5/5; `home.spec.ts` 27/27 (all orchestrator-verified with real exit codes, not re-run by me per instructions).
- Lint findings: 0 (`pnpm lint` exit 0, orchestrator-verified).

## Still Unresolved
- `plans/action-items.md` "Tôi cần làm" still lists 2 open MoMorph bookkeeping questions (write test cases back to MoMorph? mark `_hphd32jN2` design `done`?) — these are product/process decisions for a human, not blockers to this diff.
- Spec draft (`spec/F003_Homepage/**`) still contradicts the shipped behavior (× as a second button with `aria-label="Hủy"`) — plan.md already flags this for phase 04 reconciliation before promotion to `docs/`; not yet done, correctly out of scope for this diff.
- No contradiction between the diff and `clarifications.md` was found anywhere in the reviewed code.

**Status:** DONE
**Summary:** No critical or high-severity findings; the three documented risk traps are correctly fixed and independently re-verified, copy/i18n and icon promotion are complete and consistent. One medium finding: a stale, reversed decision in `plans/action-items.md` should get a corrective entry before shipping. Score: 9/10, 0 critical.
**Concerns/Blockers:** None blocking. Recommend appending the action-items.md correction before opening the PR.
