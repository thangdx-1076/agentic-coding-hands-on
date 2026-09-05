---
failed: 4
warnings: 1
missing: 0
result: FAIL
---
<!--
`failed`: count of critical issues (0 = all pass).
`warnings`: count of warning issues.
`missing`: fcodes flagged MISSING due to `.pending` marker present in `artifacts/features/{slug}/`.
`result`: PASS iff `failed === 0 && missing === 0`.
-->

# Review Report — Rebuild-Spec Feature Specs, Batch 01

**Reviewer**: reviewer (automated)
**Date**: 2026-09-05
**Scope**: F001_GoogleOAuthLogin, F002_LanguageSwitch (technical-spec.md + functional-spec.md, 4 files, 1233 lines)
**Depth**: recent (both feature dirs completed FS.1 cleanly, no `.pending` marker)

---

## Summary

| Metric | Value |
|--------|-------|
| Artifacts reviewed | 0 core + 2 feature specs (4 files) |
| Critical issues | 4 |
| Warnings | 1 |
| Missing (`.pending` markers) | 0 |
| Result | **FAIL** |

Both drafts are well-executed action-thread-shape specs with unusually precise source citations (I spot-checked ~35 `file:line` citations across both features against the actual tree post-refactor; all but one resolved exactly). The self-reported findings (RISK-01/RISK-02 on both features, the `US004` comment mismatch) are honestly represented, not overstated. The blocking defect in both features is the same class of gap: `## 5.1 Technical Verification`'s `SC-###` rows don't cover most declared `FR-###` codes, and `### 5.5 Artifact References` is missing required rows. Neither is caught by the deterministic validator (both are reviewer-only per this checklist's own "Rules NOT in this table" note) — this is exactly the semantic-depth work this pass exists to do.

---

## Critical Issues

### C1: F001 — 9 of 13 declared FR-### have no `SC-###` verification back-ref — OPEN
- **Severity**: critical (`FeatureSpec` § 5 rule: "Every FR-### is covered by ≥1 SC-### via the (covers …) back-ref in ### 5.1. Uncovered FR = critical (verification missing)")
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:353-358`
- **Description**: § 5.1 has exactly 4 `SC-###` rows, covering only `FR-601` (SC-001), `FR-603` (SC-002), `FR-402` (SC-003), `FR-204` (SC-004). The other 9 FRs declared in § 4 of the functional-spec — `FR-001, FR-101, FR-201, FR-202, FR-203, FR-301, FR-302, FR-401, FR-602` — are never named in an `(covers …)` tag anywhere in § 5.1. All 9 are otherwise real, correctly-claimed-in-§2 requirements (verified via the Action Index), so this isn't a phantom-code problem — it's that verification coverage was written for only the security/guard-heavy FRs and stopped there.
- **Fix**: Add `SC-###` rows (or extend existing ones' covers-list where a single test already exercises multiple FRs — e.g. the US002 Independent Test already touches FR-202/FR-401, it just isn't tagged as an SC) for at minimum: FR-001 (env config), FR-101 (root redirect matrix), FR-201/FR-203 (login form render + pending state), FR-301/FR-302 (todo greeting + logout button presence), FR-602 (root authoritative re-check).

### C2: F002 — 3 of 7 declared FR-### have no `SC-###` verification back-ref — OPEN
- **Severity**: critical (same rule as C1)
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:268-282`
- **Description**: § 5.1 has SC-001..SC-005. Covered: `FR-201, FR-202` (SC-001/002/003/004), `FR-001, FR-401` (SC-005, the FR-401 half explicitly `[UNVERIFIED]`). Uncovered: `FR-101` (selector always visible in header), `FR-402` (silent fallback to `vi` for an already-stored bad cookie, as opposed to SC-005's client-input-normalization case), `FR-601` (security whitelist requirement, conceptually close to BR-001 but never itself tagged).
- **Fix**: Add SC rows for FR-101 (trivial — assert selector renders in header on `/login` load), FR-402 (distinct from FR-001/SC-005: needs a case that pre-seeds a bad `NEXT_LOCALE` cookie and asserts the *read* path falls back silently, not just the *write* path), FR-601 (can piggy-back an explicit covers-tag onto SC-005 since the same normalization call satisfies it).

### C3: F001 — § 5.5 Artifact References missing the required Route List and Screen Flow rows, and misattributes ROUTE001 to the wrong artifact — OPEN
- **Severity**: critical (`### 5.5 Artifact References present but missing required rows (System Overview, Feature List, Route List, Data Model, Screen List, Screen Flow, Behavior Logic, Permissions, User Stories) → critical`)
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:441-453`
- **Description**: The table has no row for `route-list.md` or `screen-flow.md`. `ROUTE001` is cited under a row labeled "API Map" linking to `api-map.md` — but `docs/vi/generated/api-map.md` and `docs/vi/generated/route-list.md` are two distinct files, and `ROUTE001` is actually the `Code` column value in `route-list.md` (confirmed: `route-list.md:23`), not something `api-map.md` defines. So the required Route List row is both absent and its content silently reassigned to a different artifact.
- **Fix**: Add a `Route List` row pointing at `../../generated/route-list.md` with `ROUTE001`, and a `Screen Flow` row pointing at `../../generated/screen-flow.md` (this feature's login→todo redirect flow is exactly what that artifact documents). Keep or drop the "API Map" row independently — it's not wrong to have both, but it doesn't substitute for either required row.

### C4: F002 — § 5.5 Artifact References missing Route List and Screen Flow rows — OPEN
- **Severity**: critical (same rule as C3)
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:346-355`
- **Description**: Same gap as C3, minus the misattribution — F002 owns 0 routes (confirmed in `feature-list.md`: "Total Routes: 1 — ROUTE001 (F001)"), so the missing Route List row is legitimately closer to `N/A`, but the row itself is absent from the table rather than present-with-`—`. Screen Flow row is also entirely absent despite F002's own navigation description (menu open/select/re-render) being exactly `screen-flow.md` territory.
- **Fix**: Add both rows; Route List can read `— (F002 owns no routes)` in Codes Used, Screen Flow should cite whatever this feature's entry in `screen-flow.md` is (or `N/A` with a one-line reason if genuinely absent there — but check first, don't assume).

---

## Warnings

### W1: F001 — `app/page.tsx` source citation is off by one line (cites the wrong line as the function's start, and stops one line short of its end) — OPEN
- **Severity**: warning
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:222` (A6 Source rung) and `:427` (§ 5.4 Source References row 9)
- **Description**: Both cite `app/page.tsx:10-17` (and `:1-17` in § 5.4). Actual file: line 10 is the closing `*/` of the file's JSDoc comment; `export default async function Home()` starts at line 11 and its closing `}` is line 18. The cited range therefore starts one line early (grabbing a comment delimiter, not code) and ends one line short (excluding the function's closing brace). Every other `file:line` citation I checked across both features (~35 spot-checked) was exact, which makes this one stand out as a real slip rather than a house convention.
- **Fix**: Change both citations to `app/page.tsx:11-18`.

---

## Edge Cases Turned Up

- **F001 `FeatureSpec.dec_lazy_na` warning (validator-deferred, human-verified — not a defect).** The validator flagged `technical-spec.md:239` for "Decision Logic is N/A but spec contains conditional patterns matching DEC signatures." I read § 3.1 A3 directly: `DEC-001` and `DEC-002` **are** present, correctly rendered as an inline 3-row table (`DEC | subtype | Condition | What the user sees | Source`) in A3's **Rule** rung, exactly per the action-thread shape's rule (DEC is a table row inline in the gating action's Rule rung, never a standalone heading, in this shape). The researcher's self-report of "2 DEC-### in the callback route's 3-way redirect branch" is accurate. The validator's `dec_lazy_na`/`dec_blocks_well_formed` checks are documented in this checklist as still grep-matching the *retired* `#### {sentence} (DEC-001)` H4-block shape (see checklist's "Known gap" callout) — they don't understand a table-row DEC at all, so line 239 (which sits under `## 4. Shared Foundation`, nowhere near the actual DEC table in § 3.1) is almost certainly the validator's grep latching onto an unrelated `N/A` elsewhere in § 4 (Polymorphic Behavior or § 4.5 Algorithms, both legitimately `N/A` for unrelated reasons). Conclusion: no spec fix needed here; this is the validator repoint gap the checklist itself names as future work, not an inconsistency in the draft.
- **F002 `lib/i18n/locale.test.ts:33-43` cited as "4/4 case rác" (4/4 garbage cases confirmed)** — the cited line range covers exactly 3 `it()` blocks (`"fr"`, case-mismatched `"EN"`, injection `"vi; en"`); the 4th garbage-adjacent case (empty string) sits at lines 29-31, just outside the cited range. Low-severity precision nit, not counted toward the critical/warning totals — the claim itself (normalizeLocale handles all of these) is true, just the line range is a touch narrow for the "4/4" count.
- **F002 CAP-01 bucket has only 2 inline Bin-1 BRs** (`BR-001`, `BR-002`) for a `ui`-type feature, under the "<3 BRs → warning (shallow extraction)" heuristic. I judge this justified rather than shallow: the feature's own Data Model (2 entities) and scope (a single Server Action + a menu) are honestly small, and the spec says so explicitly rather than padding — consistent with the "honest-scope" reasoning both specs use elsewhere. Not counted as a finding.
- Both `app/todo/page.tsx:9` and `app/todo/actions.ts:9` really do cite a nonexistent `US004` in their source comments (`user-stories.md` only defines US001-US003; logout is US003). Confirmed via direct read. The functional-spec's § 5.3 Unresolved Question #1 represents this accurately (flags it, attributes it to a pre-refactor draft, does not silently rewrite the source comment) — good discipline, not a finding.
- F002 RISK-01 (`languageLabel` computed at `app/login/page.tsx:49` but never read by `LoginScreen`) is precisely accurate: `LoginScreen` (`components/login/login-screen.tsx:32`) computes its own `languageLabel` from the `locale` prop via a ternary, and never reads `copy.languageLabel` anywhere in the component tree I traced (`LoginHeader` gets `logoAlt` and the recomputed `languageLabel`, never `copy` itself). Confirmed, not overstated.
- F001 RISK-01 (root guard `app/page.tsx` has no try/catch, asymmetric vs. `/login`'s explicit fail-open and `/todo`'s explicit fail-closed) — confirmed via direct read: `app/page.tsx`'s `getUser()` call is unguarded, same as `/todo`'s. The spec's nuance (both throw uncaught, but only `/todo`'s failure mode is *safe* because no protected content exists to leak, whereas root's failure mode surfaces a raw error page instead of the expected redirect) is a real, correctly-drawn distinction, not a contradiction.

---

## Done Well

- Citation discipline is genuinely strong — of ~35 `file:line` citations spot-checked against the live, post-refactor tree (`hooks/use-login-actions.ts`, `lib/auth/sign-in-with-google.ts`, `hooks/use-menu-keyboard-nav.ts`, `lib/ui/roving-index.ts`, `app/login/login-client.tsx`, `components/login/language-selector.tsx`, and more), only one (W1) was off, and it was off by exactly one line, not fabricated.
- The three self-reported risk/known-issue rows in each functional-spec (F001 RISK-01/02, F002 RISK-01/02/03) are honest: they describe real, confirmed code behavior rather than a promoted-to-rule fix, matching the "never self-fix an observed defect" discipline this checklist enforces at `func.risk_as_rule`.
- Cross-ref integrity is clean: every F###/US###/SCR###/MODEL###/ROUTE###/PERM###/BL### code cited across both spec pairs resolves to the matching row in `feature-list.md`, `user-stories.md`, `screen-list.md`, `entities.md`, `route-list.md`, `permissions-matrix.md` — I checked all of them directly.
- Three-bin rule (BR/DEC placement) and rung-order/rung-presence discipline are followed correctly and consistently in both features — no rung out of order, no rung stubbed as `N/A`/`None.` where it should have been omitted.

---

## Passed Checks

✓ existence.folder_missing @ F001_GoogleOAuthLogin
✓ existence.folder_missing @ F002_LanguageSwitch
✓ existence.folder_incomplete @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ Universal.no_placeholder @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.f_code_format @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.action_index_missing @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.action_unclaimed @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.rung_order @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.rung_empty_rendered @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.state_rung_missing @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.sysdesign_subsections @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.verification_subsections @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.capability_buckets_missing @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.capability_twin_skew @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.us_narrative_present @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.polymorphic_behavior_present @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.diagram_cites_file_line @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.sm_mermaid @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.pseudocode_length @ F002_LanguageSwitch
✓ FeatureSpec.pseudocode_fence @ F002_LanguageSwitch
✓ func.missing @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.missing_h2 @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.dev_token @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.secret_shape @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.open_decisions_shape @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.code_orphan @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.code_unsurfaced @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.edge_behaviour_dangling @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.capability_fr_dangling @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.risk_as_rule @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.user_story_shape @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.screens_scr_unresolved @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ func.edge_cases_few_rows @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ cap.code_unclaimed @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ cap.double_claimed @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.mapping_table_missing @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2) [deterministic-pass, superseded by action-thread checks]
✓ FeatureSpec.dec_lazy_na @ F002_LanguageSwitch [deterministic-pass — F001 is the validator-deferred WARN, see Edge Cases]
✓ citation.range_invalid @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2) [deterministic-pass; W1 is a reviewer-only off-by-one the validator's range check doesn't catch]
✓ citation.path_traversal @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)

---

## Validator Notes

- F001 `FeatureSpec.dec_lazy_na` @ technical-spec.md:239 — reviewed per instructions; see "Edge Cases Turned Up" above. Verdict: false positive against the retired H4-block DEC shape, not a real inconsistency. No fix needed on the spec side.
- F001 `func.rule_density` @ functional-spec.md (§4+§5 avg 2.2 lines/rule, budget ≤2) — cited, not re-checked.
- F002 `FeatureSpec.crosscutting_unlabelled` @ technical-spec.md:218 — cited, not re-checked. (Human aside: § 4.4's "Bin 3 ... None — F002 không có rule cross-cutting nào" reads as legible cross-cutting reasoning to a human, even if it doesn't literal-match whatever label token the validator's regex wants.)
- F002 `FeatureSpec.diagram_required_missing` @ technical-spec.md:90 (`_pre_fill`) — cited, not re-checked. (Human aside: A2 writes exactly one cookie, not "≥2 tables" — the heuristic threshold appears mis-triggered here, but this is exactly the kind of thing the checklist says is expected to go red pre-fill; not re-derived per instructions.)
- F002 `func.rule_density` @ functional-spec.md (§4+§5 avg 2.8 lines/rule, budget ≤2) — cited, not re-checked.

---

## Actions In Order

1. Add the missing `SC-###` verification rows for F001's 9 uncovered FRs and F002's 3 uncovered FRs (C1, C2) — this is the work a downstream test-generation pass needs and currently doesn't have a hook for.
2. Add the missing Route List / Screen Flow rows to both § 5.5 tables, and fix F001's ROUTE001 misattribution from "API Map" to "Route List" (C3, C4).
3. Fix the one-line-off `app/page.tsx` citation in F001 (W1).
4. Optional cleanup, non-blocking: tighten the F002 "4/4 case rác" citation range to include the empty-string case, or adjust the count to "3/4"/"3/3" for accuracy.

## Numbers

- Files reviewed: 4 (`F001_GoogleOAuthLogin/{technical-spec,functional-spec}.md`, `F002_LanguageSwitch/{technical-spec,functional-spec}.md`)
- Lines: 453 + 238 + 355 + 187 = 1233
- Source citations spot-checked: ~35 (all but one exact)
- Cross-ref artifacts checked: feature-list.md, user-stories.md, screen-list.md, entities.md, route-list.md, permissions-matrix.md (all consistent)

## Still Unresolved

- None on my side — C1-C4 and W1 are actionable fixes for FS.6, not open questions. The pre-existing F001/F002 § 5.3 Unresolved Questions (US004 comment drift, session cookie naming, root guard try/catch intent, setLocale error-boundary behavior, missing e2e for the cookie-write round-trip) are the researchers' own honestly-flagged open items, not something this review needs to add to.

**Status:** DONE_WITH_CONCERNS
**Summary:** Both F001/F002 spec pairs show strong citation discipline and honest self-reported risk/known-issue rows, but both fail on FR/SC verification-coverage completeness (9/13 and 3/7 FRs uncovered respectively) and both are missing required Route List/Screen Flow rows in § 5.5 — 4 critical, 1 warning, counted honestly in frontmatter (`failed: 4`, `warnings: 1`) so the FS.7 gate halts for an FS.6 fix cycle.
**Concerns/Blockers:** None blocking the review itself — all 4 critical findings are concrete, fixable gaps (add SC rows, add artifact-reference rows, fix one citation), not ambiguous or requiring a domain decision.
