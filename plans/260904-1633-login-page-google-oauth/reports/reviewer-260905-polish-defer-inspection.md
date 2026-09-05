# Reviewer Inspection — Polish Defer Fixes (U+2028/2029 hardening + ARIA menu keyboard nav)

## Review Summary

### Scope
- Files reviewed: `lib/supabase/next-path.ts`, `lib/supabase/next-path.test.ts`, `components/login/language-selector.tsx` (current working-tree diff against HEAD only)
- Lines: ~140 changed/added across the three files
- Depth: full read of both diffed files end to end, plus the consuming call site (`app/auth/callback/route.ts`) and the relevant E2E spec block (`tests/e2e/login.spec.ts:106-408`). Read the prior gate report (`reviewer-260904-login-inspection.md`) for the original reasoning behind both deferred items.

### Assessment
Both deferred items are genuinely closed, not just superficially patched.

- **U+2028/U+2029 hardening** is a correct, well-reasoned fix: it adds a decode-then-rescan pass specifically because these separators are 3-byte UTF-8 sequences a per-byte `%XX` scan can never see. I verified empirically (Node script, not just static reading) that the fix closes exactly the gap it targets — a single extra layer of percent-encoding beyond the pre-existing CR/LF/NUL coverage — while the realistic `URLSearchParams` → `safeNextPath` pipeline still accepts a legitimate percent-encoded non-ASCII path (`/todo/%C3%A9t%C3%A9` → `/todo/été`, confirmed by running the actual pipeline, not just the unit test in isolation).
- **ARIA APG keyboard navigation** on the language selector is implemented correctly for the documented cases (wrap-around, Home/End, Escape-returns-focus, Tab-lets-native-default-proceed) — I built a throwaway Playwright diagnostic (run against the project's real dev server, then deleted, no trace left in the tree) specifically to stress-test the one race I was asked to check (`Tab` unmounting the focused item before the browser's native default-action focus move runs). **That race did not reproduce** in Chromium — focus correctly landed on the next real control (`LOGIN With Google`). I'm reporting this as verified-safe rather than a finding, since I tested it live rather than asserting from spec-reading alone.
- I did find one real, reachable, previously-untested defect in the new keyboard code: `activeIndex` is only ever set by the two trigger-key handlers (`ArrowUp`/`ArrowDown` on the button). Every other way to open the menu — a plain mouse click, or Enter/Space on the button (native `<button>` click synthesis, routed through the same `onClick`) — leaves `activeIndex` at whatever a *previous* keyboard session left it at, and the focus-forcing effect then silently moves real DOM focus onto that stale item. I reproduced this live: ArrowUp (opens on EN, `activeIndex=1`) → Escape → mouse click to reopen → focus lands on **EN**, not the expected first item. See Warning below.
- No critical or security-blocking findings. Neither file introduces a data leak, an auth gap, or a broken exported contract.

### Critical
None.

### Warning
| Location | Issue | Fix |
|---|---|---|
| `components/login/language-selector.tsx:120` (mouse `onClick`) + `components/login/language-selector.tsx:54-57` (focus-forcing effect) | `activeIndex` is never reset except by `openMenuAt` (called only from the button's `ArrowDown`/`ArrowUp` handlers). A mouse click, or Enter/Space on the trigger (native click synthesis → same `onClick`), opens the menu via `setOpen((prev) => !prev)` without touching `activeIndex`. Combined with the effect at lines 54-57 (`itemRefs.current[activeIndex]?.focus()` on every `open` transition to `true`, unconditionally, regardless of how the menu was opened), a stale `activeIndex` from an earlier keyboard session silently steals focus onto the wrong item on the next plain mouse-driven open. **Reproduced live** (Playwright against the running dev server): ArrowUp → Escape → mouse-click reopen → `document.activeElement` is the **EN** button, not VN/first. Low blast radius (2-item switcher, item is still fully usable, no data/security impact) but it is a real, user-reachable keyboard/screen-reader UX regression that none of the 22 current E2E assertions catch (none combine a keyboard session with a later mouse reopen). | Reset `activeIndex` to `0` whenever the menu opens through any path other than the two explicit trigger-key handlers, e.g. `onClick={() => setOpen((prev) => { if (!prev) setActiveIndex(0); return !prev; })}`. Cleaner alternative: gate the focus-forcing effect behind an explicit "opened via keyboard" flag so a mouse/Enter/Space open never force-focuses an item at all (arguably more correct — forcing DOM focus onto a menu item after a plain mouse click is itself APG-borderline). |

### Suggestion
| Location | Issue | Fix |
|---|---|---|
| `lib/supabase/next-path.ts:57-82` (`hasEncodedForbiddenChar`) | The decode pass only unwraps **one** layer of percent-encoding. Given the real pipeline (`app/auth/callback/route.ts:21` reads `next` via `URLSearchParams.get`, which already auto-decodes one layer before `safeNextPath` ever sees it), this diff correctly closes the 2-total-layers case for U+2028/U+2029 (verified: `?next=%2Ftodo%25E2%2580%25A8` → `next` = `"/todo%E2%80%A8"` → correctly rejected). A **3rd** encoding layer (`?next=%2Ftodo%2525E2%252580%2525A8` → `next` = `"/todo%25E2%2580%25A8"`) still slips through undetected — I confirmed this with a runtime reproduction. This is the exact same class of gap the prior review already accepted for CR/LF at the equivalent layer boundary ("confirmed inert" — no second `decodeURIComponent`/re-decode exists between `safeNextPath` and `NextResponse.redirect()` in `route.ts:37`, so the value that reaches the `Location` header stays literal percent-encoded ASCII text, never a real control byte). Not a new regression and not exploitable today, but the docstring's "must NOT contain any forbidden code point, raw or percent-encoded" (lines 16-17) reads as a stronger guarantee than the code actually provides. | Either (a) add one sentence to the docstring making the single-decode-layer scope explicit — "closes 2 total encoding layers; a caller that itself re-decodes this value before use must re-validate" — so a future reuse of this "shared choke point" (the file's own comment already worries about exactly this) doesn't assume full recursive coverage, or (b) loop-decode with a small bounded cap (e.g. 3 passes) to close the gap outright. No test currently locks in the current (accepted) boundary either way. |

### Edge Cases Turned Up
- **Tab-unmount race, investigated and refuted**: hypothesized that React 18's synchronous discrete-event flush could unmount the focused menu item (via `closeMenu(false)` in the `Tab` case, `language-selector.tsx:106-108`, which deliberately never calls `preventDefault()`) before the browser's native Tab default-action computes its focus target, potentially landing focus somewhere arbitrary. Built a live Playwright check against the running dev server: focus correctly lands on `LOGIN With Google` (the real next control), same as expected native behavior. Not reproducible — no finding. (The existing test `tests/e2e/login.spec.ts:387-408` only asserts `not.toBeFocused()` on the trigger button, which would not have caught a real regression here either way — worth strengthening to assert the actual expected next-focus target if this area is touched again.)
- Confirmed no false-reject: ran the real `URLSearchParams` → `safeNextPath` pipeline (not just the isolated unit test) against a legitimate multibyte path (`/todo/été`) — accepted unchanged.
- Confirmed the early-return ordering in `safeNextPath` (`startsWithSingleSlash` → `hasSchemeSeparator` → `containsForbiddenChars`) is independent/order-safe; no short-circuit bypass.
- `for (const char of raw)` in `hasRawForbiddenChar` (next-path.ts:47-55) correctly iterates by Unicode code point (handles the U+2028/U+2029 BMP case correctly, and would handle astral surrogate pairs correctly too, unlike the old `charCodeAt` approach it replaced).
- Confirmed the item callback refs (`language-selector.tsx:147-149`) are always populated before the focus-forcing effect runs on an open-transition — no stale/null-ref window, despite the inline arrow-function ref identity changing every render (a minor perf-only anti-pattern, not a correctness bug).

### Done Well
- Both fixes are targeted, minimal, and match exactly the two items the prior gate deferred — no scope creep.
- The U+2028/U+2029 fix comes with a correct, specific rationale in the code comment (3-byte UTF-8, why a per-byte scan misses it) rather than a vague "also check unicode" patch.
- 6 new vitest cases target exactly the new boundary, including the tricky "malformed sequence containing a real CR" case (`%0d%zz`) and a same-class false-accept guard (`%C3%A9t%C3%A9`).
- The keyboard implementation correctly matches ARIA APG for wrap-around, Home/End, Escape-returns-focus-to-trigger, and (verified live) Tab-lets-native-default-proceed without a focus trap.
- Roving `tabIndex` (`index === activeIndex ? 0 : -1`) is implemented correctly and doesn't remove the menu from the page's tab order.
- No regression to the E2E selector contract (`header button[aria-haspopup="menu"]`, `[role="menu"]`, `[role="menuitem"]`) — confirmed by direct read, consistent with the reported 22/22 green run.

### Actions In Order
1. Fix the `activeIndex` staleness in `language-selector.tsx` (Warning above) — one-line change, closes a real reachable UX bug before it ships.
2. Optional: add a doc comment (and/or a regression test) in `next-path.ts` documenting the single-decode-layer scope (Suggestion above) so the boundary is a conscious, recorded choice rather than an implicit one.
3. Optional: strengthen `tests/e2e/login.spec.ts:387-408`'s Tab-close assertion to check the actual expected focus target instead of only `not.toBeFocused()`.

### Numbers
- Type coverage: `npx tsc --noEmit` re-run live → exit 0 (no findings).
- Test coverage: `npx vitest run lib/supabase/next-path.test.ts` re-run live → 24/24 pass. Full suite per supplied evidence: 32/32 vitest, 22/22 Playwright (`evidence/green-run-polish.log`) — not re-run in full, no reason to doubt it.
- Lint findings: 0 (per supplied evidence, not re-run).

### Still Unresolved
- The `activeIndex` fix above (Warning) is not applied — this report is read-only per the inspection contract; recommend routing it back to `implementer`/`momorph-ui-implementer` for a fast follow-up before treating the ARIA polish item as fully closed.
