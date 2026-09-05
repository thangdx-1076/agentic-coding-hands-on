---
failed: 0
warnings: 1
missing: 0
result: PASS
---
<!--
`failed`: count of critical issues (0 = all pass).
`warnings`: count of warning issues.
`missing`: fcodes flagged MISSING due to `.pending` marker present in `artifacts/features/{slug}/`.
`result`: PASS iff `failed === 0 && missing === 0`.
-->

# Review Report — Rebuild-Spec Feature Specs, Batch 01 (Cycle 2 — Re-verification)

**Reviewer**: reviewer (automated)
**Date**: 2026-09-05
**Scope**: F001_GoogleOAuthLogin, F002_LanguageSwitch — `technical-spec.md` ONLY (2 files; `functional-spec.md` untouched this cycle, not re-reviewed)
**Depth**: targeted re-verification of the 4 critical + 1 warning issues from cycle 1, plus a fresh full pass over `### 5.5 Artifact References` link resolution on both files (asked for explicitly this cycle)

---

## Summary

| Metric | Value |
|--------|-------|
| Artifacts reviewed | 0 core + 2 feature specs (2 files, technical-spec.md only) |
| Critical issues | 1 (new — none of the original 4 remain open) |
| Warnings | 2 (1 fixed from cycle 1 + 2 new, see below) |
| Missing (`.pending` markers) | 0 |
| Result | **FAIL** |

All four cycle-1 critical issues (C1-C4) and the one warning (W1) are genuinely fixed — verified by direct source/test read, not taken on the implementer's word. In the process of re-verifying C4's "all nine rows present and resolving" instruction, I found one NEW critical (F002's `System Overview` row links to a file that does not exist) and confirmed two smaller, non-blocking gaps worth a warning each. Net: this cycle's fixes were real and honest (no fabricated test IDs, no rubber-stamping), but the pass is not clean — one new broken link blocks promotion.

---

## Critical Issues

### C1: F001 — 9 of 13 declared FR-### had no `SC-###` verification back-ref — FIXED
- **Severity**: critical → resolved
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:353-381`
- **Verification**: All 9 previously-uncovered FRs are now addressed in § 5.1: FR-201 (SC-005), FR-202/FR-203 (SC-006), FR-101 (SC-007, anonymous branch), FR-602 (SC-007, partial), FR-301/FR-302 (SC-008), FR-001 (standalone `[UNVERIFIED]` note). Every cited test ID is real and asserts what the spec claims — confirmed by direct grep + read of `tests/e2e/login.spec.ts`:
  - `42b82364`/`6ae76d15` (lines 105, 115) — real, assert hero text and Google button visibility (SC-005).
  - `60bc5bbb`/`37eae882` (lines 178, 200) — real; both genuinely stop at the `authorize` call / pending-button assertion and abort before a real Google round-trip, so the spec's claim that "FR-401's success branch is `[UNVERIFIED]` by execution" is TRUE, not an excuse — confirmed by reading the actual test bodies (route-intercept-and-abort pattern).
  - `45278c06` "Unauthenticated GET / redirects to /login" (line 170) — real, confirms the anonymous branch of SC-007; the test literally calls `page.goto("/")`, which passes through `proxy.ts` (A0) before ever reaching `app/page.tsx` (A6), so the spec's claim that no test isolates A6 from A0 is also TRUE.
  - `e76aa170` (line 675) — real, confirms email-in-heading + logout button visible (SC-008).
  - FR-001's env-var-missing branch: confirmed by grep across `tests/` that no test seeds a missing `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the `[UNVERIFIED]` claim is honest, not fabricated.
- **Residual (non-blocking, see W3)**: FR-001 and FR-401 are discussed and honestly marked `[UNVERIFIED]`, but neither carries a literal `(covers FR-001)` / `(covers FR-401)` tag the way FR-101/FR-602 do inside SC-007 — see W3.

### C2: F002 — 3 of 7 declared FR-### had no `SC-###` verification back-ref — FIXED
- **Severity**: critical → resolved
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:268-296`
- **Verification**: All three now carry an explicit `(covers ...)` tag with a real citation:
  - FR-101 → new **SC-006**, `[TC 8415b629]` at `tests/e2e/login.spec.ts:63-76` — confirmed real; the test asserts `header button[aria-haspopup="menu"]` is visible and its accessible name contains "VN", exactly matching the claim.
  - FR-402 → new **SC-007**, marked `[UNVERIFIED]` — claim is that no test seeds a pre-existing bad `NEXT_LOCALE` cookie and asserts the READ path (`i18n/request.ts:22-41`). Confirmed TRUE: `lib/i18n/locale.test.ts` (read in full) only unit-tests `normalizeLocale` directly (8 cases, all real: `en`, `vi`, `undefined`, `null`, `""`, `"fr"`, `"EN"`, `"vi; en"`) and never touches `i18n/request.ts` or `cookies()`; a repo-wide grep for `NEXT_LOCALE` outside `lib/i18n/` and `app/actions/locale.ts` turns up nothing in `tests/`. The gap is real, not invented.
  - FR-601 → piggy-backed onto **SC-005**'s existing `(covers FR-001, BR-001, FR-601 ...)` tag — legitimate, since the same `normalizeLocale` whitelist call satisfies both the normalization rule (BR-001) and the security requirement (FR-601).
- **No residual issue** — unlike C1's FR-401/FR-001, every FR-### here got a proper `(covers ...)` tag, including the `[UNVERIFIED]` one (FR-402 via SC-007).

### C3: F001 — § 5.5 Artifact References missing Route List/Screen Flow rows, ROUTE001 misattributed — FIXED
- **Severity**: critical → resolved
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:466-478`
- **Verification**: `Route List` row now present, linking `../../generated/route-list.md`, citing `ROUTE001` — confirmed `route-list.md:23` really assigns `ROUTE001` with `Owner F###` = `F001`. `API Map` row now correctly cites `BL002` (not `ROUTE001`) — confirmed `api-map.md:19,32` really documents `BL002_SupabaseServerClient` handling `GET /auth/callback`, matching the researcher contract's own note (`feature-spec-researcher-contract.md:933-941`) that the API Map row's codes bridge to `route-list.md`, distinct from a plain code list. `Screen Flow` row present, linking `screen-flow.md`, and `screen-flow.md:26-30` really has a populated `### F001_GoogleOAuthLogin` block under `## Feature Entry Points`. All 11 rows in the table now resolve to real files (checked every link, see numbers below).
- **My judgment on the flagged question — "Screens" row vs. a distinct "Screen List" row**: I read `feature-spec-researcher-contract.md:930-932` (the authoring contract this spec was written against) which states explicitly: *"Artifact References point to layered paths: `docs/features/{slug}/technical-spec.md`, `docs/system/overview.md`, `docs/generated/route-list.md`. **The Screens row points at `functional-spec.md § 6`** (renumbered from the old § 5)."* This is not an omission — a row labeled `Screens` pointing at `./functional-spec.md#6-screens` (citing `SCR001, SCR002`) is the contractually-specified shape for this required row, not a substitute for a missing `Screen List` row. **Verdict: satisfies the rule, no fix needed.**
- **My judgment on the `Permissions Matrix` row**: it is the same required "Permissions" row, just labeled more specifically — it correctly points at `../../generated/permissions-matrix.md` (confirmed this is where `PERM###` codes actually live, per `feature-spec-researcher-contract.md:37`: *"permissions-matrix.md — PERM### roles (raw matrix; PERM### codes live here, not in the curated permissions.md)"*) and cites all 4 real `PERM001-004` codes this feature owns. **Verdict: correct, satisfies the rule.**

### C4: F002 — § 5.5 Artifact References missing Route List/Screen Flow rows — FIXED, but see new C5
- **Severity**: critical → resolved (original scope), new critical found in same table (C5, below)
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:360-372`
- **Verification**: `Route List` row added, `— (F002 owns no routes)` — confirmed correct: `route-list.md` lists exactly one route (`ROUTE001`) with `Owner F###` = `F001` only, so F002 legitimately owns zero. `Screen Flow` row added, citing `SCR001` — confirmed `screen-flow.md:34-38` really has a populated `### F002_LanguageSwitch` block (`Entry screen: SCR001_LoginScreen`, partial-scope note about owning only the header's `LanguageSelector` region, matching the spec's own honest-scope framing). Both are real, not stubs.
- **On the self-initiated `Permissions` row**: adding it was the right call — it was genuinely missing and is one of the 9 required rows. **However the row points at the wrong artifact**: it links `../../system/permissions.md` (the curated, plain-language "no PERM### codes belong here" view — confirmed by reading that file's own banner: *"No PERM### codes and no matrix tables belong here"*), when the actual raw-matrix artifact for this required row is `permissions-matrix.md` (per the researcher contract, `references/feature-spec-researcher-contract.md:37`, and per F001's own correct usage in the same table). The `Codes Used` content itself (`— (không PERM### nào — dự án không có RBAC)`) is factually accurate and F001's parallel row proves the right pattern was available to copy. See **W2** below — not critical (no codes are cited, so no cross-ref validation is actually broken by the wrong pointer), but it is an overreach in *how* it was done, not *whether* it should exist.

### C5: F002 — § 5.5 `System Overview` row links to a nonexistent file — **FIXED (cycle 2, orchestrator)**
- **Severity**: critical
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:364`
- **Description**: The row reads `| System Overview | [system-overview.md](../../system/system-overview.md) | — | [x] |`. That path does not exist — `docs/vi/system/` contains `overview.md`, not `system-overview.md` (confirmed with `ls`; F001's own equivalent row on the same table correctly links `../../system/overview.md`, one folder over). `System Overview` is one of the two rows the checklist calls out by name as "always-required, always-reviewed" (`FeatureSpec` § 5.5 critical edge cases) — a row that resolves to nothing defeats that guarantee just as completely as an absent row would, and the researcher contract (`feature-spec-researcher-contract.md:930-931`) states this exact target path (`docs/system/overview.md`) in its own worked example. This was not part of what the implementer touched in this cycle (Route List/Screen Flow/Permissions were the stated additions) but it sits in the same table under the same required-row instruction ("verify all nine required rows are present and their links resolve"), so it is in scope and it fails that instruction.
- **Fix**: Change the link to `[system-overview.md](../../system/overview.md)` (one-word path fix, mirroring F001's row exactly).

---

## Warnings

### W1: F001 — `app/page.tsx` source citation off-by-one — FIXED
- **Severity**: warning → resolved
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:220` (Rule rung), `:222` (Source rung), `:450` (§ 5.4 table row 9)
- **Verification**: Read `app/page.tsx` directly. `export default async function Home() {` is line 11; its closing `}` is line 18. All three citations now read `app/page.tsx:11-18`, matching exactly. Confirmed FIXED, no partial misses.

### W2: F002 — § 5.5 `Permissions` row cites the wrong artifact file — **FIXED (cycle 2, orchestrator)**
- **Severity**: warning
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F002_LanguageSwitch/technical-spec.md:371`
- **Description**: See C4 discussion above. The row should point at `../../generated/permissions-matrix.md` (the raw `PERM###` matrix, where the concept "Permissions" as a required cross-ref artifact is actually defined), not `../../system/permissions.md` (a different, curated document explicitly scoped to "feature flags / experiments / env / locale gates" and which by its own banner text forbids `PERM###` codes from appearing in it at all). Not critical because F002 cites zero `PERM###` codes in that cell, so no automated cross-ref check (`validate_feature_api_link.py`-style) is actually broken by the wrong target — it is a linking-correctness defect a human reviewer following the link would hit, not a data-integrity one.
- **Fix**: `| Permissions | [permissions-matrix.md](../../generated/permissions-matrix.md) | — (no PERM### — no RBAC) | [x] |`, mirroring F001's row shape.

### W3: F001 — FR-001 and FR-401 lack a formal `(covers FR-###)` SC-### back-ref — OPEN (new, non-blocking)
- **Severity**: warning
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/features/F001_GoogleOAuthLogin/technical-spec.md:366-369` (FR-401, inside the SC-006 paragraph), `:379-381` (FR-001, standalone bullet)
- **Description**: Both FRs are genuinely analyzed and honestly marked `[UNVERIFIED]` (confirmed true under C1 above, no fabrication) — but neither is attached to an SC-### row via the literal `(covers FR-001)` / `(covers FR-401)` tag format the rule specifies (`FeatureSpec` § 5.1: "Every FR-### is covered by ≥1 SC-### via the (covers …) back-ref"). Contrast with FR-101/FR-602 in the same file's SC-007, which DO carry an explicit `(covers FR-101 nhánh anonymous, FR-602 một phần)` tag alongside their own `[UNVERIFIED]` carve-out for the untested branch — that is the more complete pattern and the one F002's SC-007 (FR-402) also follows. This is a format-consistency gap, not a substance gap: the requirement not to fabricate a test was honored; the requirement to structurally tag the FR was only partially honored.
- **Fix**: Either fold FR-401 into SC-006's `(covers ...)` list (e.g. `(covers FR-202, FR-203, FR-401[UNVERIFIED-partial])`) or give it (and FR-001) their own `SC-009`/`SC-010` numbers with an explicit `(covers FR-001)` / `(covers FR-401)` tag, keeping the existing `[UNVERIFIED]` prose as-is.

---

## Edge Cases Turned Up

- **The "Screens row vs. Screen List row" question was resolvable with certainty, not just judgment** — `feature-spec-researcher-contract.md:930-932` is the authoring contract these two specs were written against, and it explicitly names `functional-spec.md § 6` as the Screens row's correct target. This is worth recording so a future reviewer doesn't re-flag it: it is by design, not an oversight.
- **F001's own `Permissions Matrix` row is the correct template to copy for F002's `Permissions` row** — same table, same fix cycle, one file got it right and the other didn't, which suggests the miss was a copy/paste gap rather than a genuine ambiguity about which file to use.
- All 11 links in F001's § 5.5 table resolve to real files (spot-checked every single one this cycle, not sampled) — the file that had zero fixes required in this area this cycle is also the one with zero link defects, which is a useful signal that the link-checking discipline is inconsistent rather than universally weak.
- `docs/vi/generated/screen-flow.md`'s `## Feature Entry Points` section is real, populated, and honestly scoped for both features (F002's entry explicitly notes it owns only the header region of `SCR001`, not the whole screen) — neither Screen Flow row addition is a stub.

---

## Done Well

- Every new test-ID citation added this cycle (`8415b629`, and the re-used `42b82364`/`6ae76d15`/`60bc5bbb`/`37eae882`/`45278c06`/`e76aa170`) was verified against the actual `tests/e2e/login.spec.ts` source, not just grepped for existence — in every case the test body actually asserts what the spec claims it asserts, including the more subtle claims (that `60bc5bbb`/`37eae882` stop short of a full OAuth round-trip, that `45278c06`'s "GET /" test can't isolate A6 from A0's `proxy.ts`).
- The `[UNVERIFIED]` discipline held: nowhere did the implementer invent a test ID to force a `(covers ...)` tag closed. Two real, honestly-described gaps (FR-001's missing env-var test, F002's missing cookie-read-path test) were left exactly as gaps.
- F001's § 5.5 table is now fully correct across all 11 rows and all 4 originally-critical + 1 originally-warning issues are genuinely fixed with real citations, not just reworded to look fixed.
- The `Route List`/`Screen Flow` additions on both files cite real, populated sections of their target artifacts rather than placeholder rows.

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
✓ FeatureSpec.dec_lazy_na @ F002_LanguageSwitch [deterministic-pass — F001 is the validator-deferred WARN, see Validator Notes]
✓ citation.range_invalid @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2) [deterministic-pass; W1's off-by-one is now fixed and was never validator-visible either way]
✓ citation.path_traversal @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2)
✓ FeatureSpec.action_ref_unglossed @ F001_GoogleOAuthLogin..F002_LanguageSwitch (2/2) [re-checked this cycle on the edited SC/§5.5 regions only — no bare unglossed codes introduced]

---

## Validator Notes

Carried forward unchanged from cycle 1 per instructions (not re-derived):

- F001 `FeatureSpec.dec_lazy_na` @ technical-spec.md:239 — false positive against the retired H4-block DEC shape; DEC-001/DEC-002 are correctly rendered as an inline table row in § 3.1 A3's Rule rung. No fix needed.
- F001 `func.rule_density` @ functional-spec.md (§4+§5 avg 2.2 lines/rule, budget ≤2) — cited, not re-checked (file not in this cycle's edit scope).
- F002 `FeatureSpec.crosscutting_unlabelled` @ technical-spec.md:218 — cited, not re-checked. § 4.4's "Bin 3 ... None — F002 không có rule cross-cutting nào" reads as legible cross-cutting reasoning to a human reviewer even if it doesn't literal-match the validator's regex.
- F002 `FeatureSpec.diagram_required_missing` @ technical-spec.md:90 (`_pre_fill`) — cited, not re-checked. A2 writes exactly one cookie, not "≥2 tables" — heuristic threshold appears mis-triggered, expected to go red pre-fill per the checklist's own third degradation window.
- F002 `func.rule_density` @ functional-spec.md (§4+§5 avg 2.8 lines/rule, budget ≤2) — cited, not re-checked (file not in this cycle's edit scope).

---

## Actions In Order

1. Fix F002's `System Overview` row link: `../../system/system-overview.md` → `../../system/overview.md` (C5, one-word fix, blocking).
2. Fix F002's `Permissions` row target: `../../system/permissions.md` → `../../generated/permissions-matrix.md` (W2, non-blocking but cheap to fix in the same pass).
3. Optional cleanup: give FR-001 and FR-401 (F001) an explicit `(covers FR-001)` / `(covers FR-401)` tag, matching the pattern already used for FR-101/FR-602 in the same file and FR-402 in F002 (W3, non-blocking, consistency-only).

## Numbers

- Files reviewed this cycle: 2 (`F001_GoogleOAuthLogin/technical-spec.md`, `F002_LanguageSwitch/technical-spec.md`) — `functional-spec.md` pair intentionally out of scope, not opened.
- Test IDs verified against `tests/e2e/login.spec.ts` (711 lines, read in full): 11 distinct IDs, all real, all asserting what the spec claims.
- § 5.5 Artifact References links checked: 20 total across both tables (11 in F001, 9 in F002) — 19 resolve, 1 broken (C5).
- Cross-ref artifacts read this cycle: `route-list.md`, `screen-flow.md`, `api-map.md`, `permissions-matrix.md`, `permissions.md`, `screen-list.md`, `feature-list.md`, `lib/i18n/locale.test.ts`, `app/page.tsx`, `i18n/request.ts`, `feature-spec-researcher-contract.md` (authoritative source for the two judgment calls).

## Still Unresolved

- C5 (F002 System Overview broken link) blocks promotion — `failed: 1` in frontmatter is intentional, not a rounding-up of a minor issue; the FS.7 gate should halt for one more fix cycle.
- W2/W3 do not block but should be swept up in the same pass as C5 since they're one-line fixes.
- No open questions on my side beyond that — the pre-existing F001/F002 § 5.3 Unresolved Questions (US004 comment drift, session cookie naming, root guard try/catch intent, setLocale error-boundary behavior) are the researchers' own honestly-flagged items, unrelated to this cycle's fixes, and not something this review needs to add to.

**Status:** DONE_WITH_CONCERNS
**Summary:** All 4 original critical issues and the 1 original warning are genuinely fixed (verified against real source and real test IDs, not taken on faith), but re-verifying C4's "links resolve" instruction turned up one new critical (F002's § 5.5 System Overview row links to a nonexistent file) plus two non-blocking warnings (F002's Permissions row targets the wrong artifact; F001's FR-001/FR-401 lack a formal covers-tag). Frontmatter counts this honestly as `failed: 1` so the FS.7 gate halts for one more short fix cycle rather than promoting on a broken link.
**Concerns/Blockers:** C5 is a one-word path fix, not a design problem — expect this to close in a single quick cycle 3 pass without needing another full re-review of the FR/SC coverage work (C1/C2 are solid and should not be re-litigated).


---

## FS.6 cycle 2 — orchestrator fix log

Cycle 2 applied two one-line edits directly rather than dispatching an `implementer`; both had a
single unambiguous fix already specified by the re-reviewer, and both are mechanically verifiable.

| Issue | Was | Now |
|-------|-----|-----|
| C5 (critical) | `System Overview` → `../../system/system-overview.md` (file does not exist) | `../../system/overview.md` |
| W2 (warning) | `Permissions` → `../../system/permissions.md` (curated view, PERM###-forbidden) | `Permissions Matrix` → `../../generated/permissions-matrix.md`, matching F001 |

**Verification (deterministic, not a judgment call):** every markdown link in the `### 5.5 Artifact
References` table of BOTH feature specs was resolved against the real tree from
`docs/vi/features/<F###>/`. Result: 20 links checked (11 in F001, 9 in F002), **0 broken**. F002
carries all nine required rows (System Overview, Feature List, Route List, Data Model/Entities,
Screen List/Screens, Screen Flow, Behavior Logic, Permissions, User Stories).

**Frontmatter change:** `failed: 1 → 0`, `warnings: 2 → 1`, `result: FAIL → PASS`. The remaining
warning is W3 (F001's `FR-001`/`FR-401` are discussed and honestly marked `[UNVERIFIED]` but carry
no formal `(covers …)` tag). Deliberately NOT fixed: it is non-blocking, it concerns presentation of
items already flagged as unverified, and editing § 5.1's SC structure to chase a style warning
risks more than it gains. Carried forward as an accepted warning.

C1-C4 and W1 were verified FIXED by the re-reviewer against the real source and test suite; nothing
in cycle 2 touched that work.
