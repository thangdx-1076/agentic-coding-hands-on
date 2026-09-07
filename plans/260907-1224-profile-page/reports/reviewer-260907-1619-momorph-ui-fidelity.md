## Review Summary

### Scope
- Files reviewed: `messages/en.json`, `messages/vi.json`,
  `src/app/(public)/(home)/_shared/home-copy.ts`,
  `src/app/(public)/awards/_shared/awards-copy.ts`,
  `src/app/(public)/standards/_components/hero-badge-tier-row.tsx`,
  `src/app/_components/nav-link.stories.tsx`, `src/app/_shared/site-chrome.ts`,
  `tests/e2e/awards.spec.ts` (diff vs `origin/main` @ `215a616`)
- Lines: +43/−29 across 8 files
- Depth: recent (full diff read; cross-referenced every consumer of the three
  changed copy keys and the changed component's parent/tests)

### Assessment
Small, well-scoped fidelity fix set — one layout direction change and two copy
corrections, each backed by a specific design node comparison. Independently
re-ran the gates rather than trusting the reported numbers: `pnpm typecheck`
(clean), `pnpm lint --max-warnings 0` (clean), `pnpm test:unit` (28 files, 175
tests, all green), and `pnpm exec playwright test tests/e2e/{awards,standards,
home}.spec.ts` (53 passed, 1 skipped, matching the reported full-suite
103/3-skipped subset for these files). All three claimed fixes hold up under
inspection; nothing in the diff falls outside the three described changes.

### Critical
None.

### High
None.

### Medium
None.

### Low

1. **Stale doc comment after the singular rename** —
   `src/app/(public)/(home)/_components/widget-button.tsx:21` still reads
   `Menu content (Sun* Kudos / Awards Information) is INFERRED` — the plural
   is now wrong; the actual copy value at `home-copy.ts:151` is singular
   `"Award Information"`. Comment-only, no runtime effect. Fix: reword to
   `Award Information`.
2. **No wrap/overflow guard on the new badge+condition row** —
   `src/app/(public)/standards/_components/hero-badge-tier-row.tsx:35`. The
   design's 72px row height assumes the condition text fits one line next to
   the badge. The longest EN string, `"More than 20 people send you Kudos"`
   (`messages/en.json:137`), has no `whitespace-nowrap`/`truncate` safeguard,
   and `standards.spec.ts` C4/C13 assert text content, never row height or
   line count. Low risk (VN strings are shorter, and 452px of content width
   likely fits the EN string too), but if a future locale or copy edit
   lengthens the string, the row will silently grow past 72px with no test
   catching it. Consider `whitespace-nowrap` and a wider read of column widths
   before adding locales.

### Edge Cases Turned Up
- Verified `next/image` intrinsic `width`/`height` in `hero-badge-tier-row.tsx`
  still flow from the `HERO_TIERS` table (`standards-copy.ts:52-58`), untouched
  by the flex-direction change — the "width or height modified" trap the
  file's own comment warns about is not reintroduced.
- Verified the description paragraph's spacing is unaffected: the tier's own
  `flex flex-col gap-2` still separates the (now-row) badge+condition block
  from the description, and the outer `flex flex-col gap-4` in
  `standards-screen.tsx:60` still spaces tiers apart — no double-gap or
  collapsed spacing introduced.
- Verified `awards.caption` is genuinely isolated to `/awards`: grepped every
  consumer of `caption` across `src/`, `messages/*.json`, `tests/e2e/` —
  `home-copy.ts:95` (`Sun* annual awards 2025`, lower-case, unchanged) and
  `/profile`'s `copy.header.logoAlt` (a *different* key, already capitalized
  pre-diff) are the only other holders of similar text; neither was touched
  and neither should have been.
- Verified no stale plural `"Awards Information"` remains as a live string
  anywhere in `src/`, `messages/`, or `tests/` — the only remaining plural
  hits are the one stale comment above and pre-existing generated docs under
  `docs/vi/**` (out of scope for a UI-fidelity fix; a docs-sync pass would
  need to touch those separately, they don't ship to users).
- Confirmed `C9` (1440×2400 no-scroll fit) still passes after the layout
  change — expected, since collapsing each tier from ~102px to the
  design-correct 72px only *reduces* total content height.

### Done Well
- Each fix cites the exact design node id and geometry (coordinates, not just
  "looks off") — makes the change auditable without re-opening MoMorph.
- Fix 2's comment explicitly documents *why* the two screens' captions
  legitimately differ instead of silently "unifying" them — the kind of
  comment that stops a future contributor from re-introducing the bug this
  fix retracted.
- The known-accepted, not-fixed item (awards keyvisual band height vs. content
  volume) is handled correctly: flagged for design confirmation rather than
  guessed at with a `height`/`object-position` patch that could ripple into
  other screens.
- The retracted "3 blank award rings" finding is a good instance of an audit
  correcting itself before shipping a false positive (HTTP 200 + correct
  dimensions + lazy-load timing, not a real defect).

### Actions In Order
1. Reword the stale `widget-button.tsx:21` comment (trivial, no code path
   affected).
2. Optional, non-blocking: add `whitespace-nowrap` or a max-width check to
   `hero-badge-tier-row.tsx`'s condition `<p>` before any new locale or copy
   change lengthens that string.

### Numbers
- Type coverage: `tsc --noEmit` exit 0 (re-run independently)
- Test coverage: 175/175 unit tests green (100% allowlist per reported gate,
  re-verified test count); 53/54 e2e in the three touched-area spec files
  green, 1 pre-existing skip
- Lint findings: 0 (`eslint --max-warnings 0` exit 0, re-run independently)

### Still Unresolved
- `docs/vi/**` generated docs and journal entries still say "Awards
  Information" (plural) in prose — not user-facing, not a test dependency,
  but a doc-writer pass would eventually want to reconcile it for internal
  consistency. Not a ship blocker.
- The `/awards` keyvisual band height vs. design (6410px vs actual 5648px) is,
  by the author's own account, still an open question for design to confirm —
  correctly left unpatched rather than guessed at.
