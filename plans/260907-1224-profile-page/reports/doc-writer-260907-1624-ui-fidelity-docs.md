# Docs reconciliation — 3 UI-fidelity fixes (fix/momorph-ui-fidelity)

Verified each fix against the actual diff (`git diff` on the 8 changed source files) before
touching any doc. 10 docs files updated, 2 generated + 4 feature specs + 2 screen specs untouched
files checked and confirmed already correct (listed below).

## Fix 1 — hero-badge-tier-row layout (flex-col → flex-row)

**`docs/vi/features/F005_StandardsRulesPage/technical-spec.md`** — § 4.5 DOM/a11y Contract,
Section 1 bullet. Previously only listed DOM *order* (img + condition + description), never
asserted stacked-vs-row layout, so it was not technically wrong — but it also didn't lock the
correct geometry down, so a future regression back to `flex-col` would go unnoticed by this doc.
Added: badge+condition share one row (design frame `3204:6161`, 400×72px), plus a "*(Sửa
2026-09-07: ...)*" note explaining the old `flex-col` bug, the 102px-vs-72px consequence, and
**why the test suite didn't catch it** (TC GUI_001/SC-002 only assert the 4 condition strings
exist, not their layout — geometry checking is what caught this, not the string-match test).

**`docs/vi/features/F005_StandardsRulesPage/functional-spec.md`** — D003 row (Open Decisions).
This row already stated the correct general principle before the fix landed: a MoMorph node's
*name* ("Awards Information Navigation Links") is a component default, not real translated
content. That's the exact same confusion Fix 3 corrected elsewhere. Added a "*vindicated
2026-09-07*" pointer from D003 to the F003/F004 nav-label fix, so a future reader sees this
foresight was validated rather than treating it as an isolated footnote.

Checked and found already correct: `functional-spec.md` §§ prose (lines 78-97), `README.md`,
`docs/vi/screens/SCR005_Standards/spec.md` — none describe stacked-vs-row layout or a pixel
height, so none were wrong to begin with.

## Fix 2 — `/awards` caption capitalization

Corrected "Sun* annual awards 2025" → "Sun* Annual Awards 2025" in:
- `docs/vi/features/F004_AwardSystemPage/functional-spec.md` (FR-201)
- `docs/vi/features/F004_AwardSystemPage/technical-spec.md` (§ 4.6 DOM/a11y Contract)
- `docs/vi/screens/SCR004_Awards/spec.md` (E03 row)

Each edit adds a short parenthetical citing the real design nodes (`313:8454` for `/awards`,
`2167:9070` for Home) and a "*(Sửa 2026-09-07: ...)*" note stating the old lower-case value came
from a wrong "unify with Home" assumption — the two screens genuinely use different nodes, so
each keeps its own case; don't re-unify.

Checked and found already correct: `docs/vi/features/F003_Homepage/*` and
`docs/vi/screens/SCR003_Home/spec.md` — neither documents the Home caption at all (Home's
`awards.caption` isn't a homepage screen element in these specs), and Home's own value
("Sun* annual awards 2025", `home-copy.ts:95`) was correctly NOT touched by this fix, so there was
nothing to reconcile there. `docs/vi/features/F006_ProfilePage/*` already correctly states
"Sun* Annual Awards 2025" (capitalized) — no change needed.

## Fix 3 — "Awards Information" → "Award Information" (nav/footer/widget, both locales)

Corrected in:
- `docs/vi/generated/screen-list.md` (WidgetButton row)
- `docs/vi/generated/feature-list.md` (F003 description)
- `docs/vi/features/F003_Homepage/functional-spec.md` (Scope line; D001 row; US004_UseQuickActionWidget goal)
- `docs/vi/features/F003_Homepage/technical-spec.md` (§ A6 widget action; § 5.3 Unresolved Question #3)
- `docs/vi/screens/SCR003_Home/spec.md` (E03 row; Exit Conditions; Exits table)

Every D001/A6/§5.3 edit preserves the `[INFERRED]`/pending-product-confirmation status verbatim —
only the string changed, not the open-question status. Added a one-line "*(Sửa 2026-09-07: ...)*"
note on D001 and § 5.3 so a reader knows this was a spelling fix, not a new confirmation.

## Outside surgical remit (flagged, not fixed)

`docs/vi/screens/SCR003_Home/spec.md` Exits table cites `components/home/home-header.tsx` for the
Award Information / Sun* Kudos nav clicks — that path doesn't exist; the real component is
`src/app/_components/site-header.tsx`. This predates the 3 fixes and likely recurs across several
rows in that table (I only confirmed the one path, didn't audit the whole Exits table). Left
untouched — out of scope for this reconciliation and needs its own pass to check all cross-ref
paths in that file, not a spot-fix.

## Verification

`pnpm format:check` → exit 0, all matched files clean (docs/** is prettier-ignored as expected;
confirms no formatting drift introduced).

## Unresolved questions

None blocking. The Exits-table stale-path issue above is worth a follow-up docs pass but doesn't
block this reconciliation.

**Status:** DONE
**Summary:** Verified all 3 fixes against source diffs, corrected 10 docs files (2 generated + 6
feature specs + 2 screen specs) to match; `pnpm format:check` exit 0.
**Verdict:** updated 10 files.
