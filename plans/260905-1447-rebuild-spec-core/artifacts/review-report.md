---
failed: 0
warnings: 1
missing: 0
result: PASS
---
<!--
`failed`: count of critical issues (0 = all pass).
`warnings`: count of warning issues.
`missing`: fcodes flagged MISSING due to `.pending` marker present in `artifacts/features/{slug}/` (verification-checklist-universal.md § Pending Marker Rule). Counts toward Wave 9 pre-flight gate halt conditions alongside `failed`.
`result`: PASS iff `failed === 0 && missing === 0`.
-->

# Review Report — Rebuild-Spec Artifacts

**Reviewer**: Staff Engineer (automated)
**Date**: 2026-09-05
**Scope**: 11 core artifacts (Wave 7a, full run) — FeatureSpec/ProcessFlow/ApiContracts sections out of scope (separate passes)

---

## Summary

| Metric | Value |
|--------|-------|
| Artifacts reviewed | 11 core (system-overview, architecture, data-model, behavior-logic, permissions, permissions-matrix, user-stories, feature-list, route-list, screen-list, screen-flow) |
| Critical issues | 0 |
| Warnings | 1 |
| Missing (`.pending` markers) | 0 (2 feature-spec folders carry `.pending`, but FeatureSpec review is out of scope for this pass per assignment — not counted here) |
| Result | **PASS** |

This is a genuinely small app (Google OAuth login via an external Supabase instance, a vi/en language switch, a `/todo` auth-guard placeholder) and the artifacts are honest about that scope: 0 app-owned tables, 1 backend route, 2 screens, 0 REG###, 3 BL### (all `integration`), 4 PERM### (all `route-guard`, no RBAC), 3 US###, 2 F###. Spot-checked ~15 `file:line` citations across architecture.md, permissions-matrix.md, behavior-logic.md, route-list.md, screen-list.md against the actual source (`proxy.ts`, `lib/supabase/{client,server,proxy-client,next-path}.ts`, `lib/i18n/locale.ts`, `app/page.tsx`, `app/login/page.tsx`, `app/todo/page.tsx`, `app/auth/callback/route.ts`) — every citation resolves to code that actually supports the claim; none point at unrelated lines or comments. No fabricated entities, routes, or roles found.

---

## Critical Issues

_(none)_

---

## Warnings

### W1: RouteList `Owner F###` stale — shows `—` for ROUTE001 despite FeatureList claiming it — OPEN
- **Severity**: warning
- **Location**: `plans/260905-1447-rebuild-spec-core/artifacts/route-list.md:23`
- **Description**: `route-list.md`'s Backend Routes row for ROUTE001 (`GET /auth/callback`) carries `Owner F###` = `—`, with an inline note explaining "để — vì feature-list.md chưa tồn tại ở wave này" (i.e., written before Wave 5). Wave 5 has since run: `feature-list.md` §F001 lists "**Related APIs/Routes**: (GET) /auth/callback — ROUTE001" as one of F001's owned routes. Per the v25.0.0 Code Column Contract, the forward (FeatureList → route) and reverse (`Owner F###` → FeatureList) directions must stay twin-consistent, enforced by `validate_feature_api_link.py` — but that validator is not among the ones recorded in `validation/validation-summary.json`, so this drift wasn't caught automatically. No other artifact is affected (FeatureList's own claim is correct); this is a one-column staleness gap in route-list.md only, not a fabricated or orphaned reference.
- **Fix**: Update `route-list.md:23`'s `Owner F###` cell from `—` to `F001`, and drop/update the now-stale "chưa tồn tại ở wave này" inline justification note.
- **Alternative**: If a future run re-derives route-list.md from scratch after feature-list.md exists, this class of drift disappears on its own — but until then, a manual backfill pass after Wave 5 (before promotion) would catch it without waiting for review.

---

## Passed Checks

✓ Universal.artifact_exists_nonempty @ system-overview.md..screen-flow.md (11/11)
✓ Universal.no_placeholder_text @ system-overview.md..screen-flow.md (11/11)
✓ Universal.required_sections_template_order @ system-overview.md
✓ Universal.required_sections_template_order @ architecture.md
✓ Universal.required_sections_template_order @ data-model.md
✓ Universal.required_sections_template_order @ behavior-logic.md
✓ Universal.required_sections_template_order @ permissions.md
✓ Universal.required_sections_template_order @ permissions-matrix.md
✓ Universal.required_sections_template_order @ user-stories.md
✓ Universal.required_sections_template_order @ feature-list.md
✓ Universal.required_sections_template_order @ route-list.md
✓ Universal.required_sections_template_order @ screen-list.md
✓ Universal.required_sections_template_order @ screen-flow.md
✓ Universal.content_completeness_citation_spotcheck @ proxy.ts,lib/supabase/{client,server,proxy-client,next-path}.ts,lib/i18n/locale.ts,app/page.tsx,app/login/page.tsx,app/todo/page.tsx,app/auth/callback/route.ts (~15/15 citations resolve)
✓ SystemOverview.delegates_diagrams_to_architecture_per_current_template @ system-overview.md
✓ Architecture.mermaid_diagrams_present_valid @ architecture.md
✓ Architecture.tech_stack_matches_codebase @ architecture.md
✓ Architecture.deployment_view_honesty_label_and_na_degradation @ architecture.md
✓ Architecture.replaces_stale_forward_draft_no_forward_draft_framing_survived @ architecture.md
✓ Permissions.replaces_stale_forward_draft_no_forward_draft_framing_survived @ permissions.md
✓ RouteList.route_path_format_valid @ route-list.md
✓ RouteList.handler_citations_match_code @ route-list.md
✓ RouteList.completeness_contract_one_row_per_leaf_route @ route-list.md
✓ DataModel.entity_completeness @ MODEL001..MODEL003 (3/3)
✓ DataModel.disc_scope_and_anchor @ DISC-001
✓ DataModel.model_code_uniqueness @ data-model.md
✓ DataModel.no_fabricated_entities_honest_scope_verified @ data-model.md
✓ BehaviorLogic.bl_code_uniqueness_and_format @ behavior-logic.md
✓ BehaviorLogic.source_file_symbol_single_valued_c2 @ BL001..BL003 (3/3)
✓ BehaviorLogic.signal_inferred_3part_justification @ BL001..BL003 (3/3)
✓ BehaviorLogic.cardinality_gap_0pct @ behavior-logic.md
✓ Permissions.auth_system_type_valid @ permissions.md
✓ Permissions.no_perm_codes_in_curated_view @ permissions.md
✓ PermissionsMatrix.perm_code_uniqueness_and_format @ permissions-matrix.md
✓ PermissionsMatrix.route_screen_refs_valid @ PERM001..PERM004 (4/4)
✓ UserStories.us_format_and_uniqueness @ user-stories.md
✓ UserStories.ui_us_has_scr_mapped @ US001..US003 (3/3)
✓ UserStories.interaction_inventory_present @ user-stories.md
✓ UserStories.actor_split_matches_permissions @ user-stories.md
✓ FeatureList.f_code_format_uniqueness @ feature-list.md
✓ FeatureList.type_rules_scr_bl_required @ F001..F002 (2/2)
✓ FeatureList.every_bl_and_perm_mapped_to_f @ BL001..BL003,PERM001..PERM004 (7/7)
✓ FeatureList.conjunction_name_single_outcome_justified @ F001
✓ ScreenList.scr_format_uniqueness @ screen-list.md
✓ ScreenList.composite_classification_2of3_gate_correctly_atomic @ SCR001..SCR002 (2/2)
✓ ScreenFlow.all_scr_in_screenlist_appear_in_screenflow @ screen-flow.md
✓ ScreenFlow.feature_entry_points_placeholder_expected_pre_featurespecs_pass @ screen-flow.md

---

### BehaviorLogic Cardinality
- Inventory total: 3
- Artifact BL count: 3
- Gap: 0% (PASS)
- Missing categories: none
- Orphan files: none

(Per-stack: Next.js/JS-TS is the only stack subsection in `_scout-bl-inventory.md`; Rule 5 inferred-ratio check does not fire — Next.js App Router has no row in `bl-source-patterns.md`, an explicit exemption, and the scout inventory itself already documents why. All 3/3 BL items carry the required 3-part `[SIGNAL_INFERRED]` justification: Intent matched / No-row reason / Observed pattern.)

---

## Notes on checklist/template drift (not a finding against these artifacts)

`verification-checklist-core-artifacts.md`'s prose for `SystemOverview` (expects an in-document `## System Architecture` H2 with a Mermaid graph plus a `### Technology Stack` table) and for `BehaviorLogic` (expects headings literally named `# Background Logic` / `## Background Logic Index` / `## Background Logic Details`) both describe an older shape than what `templates/system-overview-template.md` and `templates/behavior-logic-template.md` actually specify today (the current templates delegate diagrams to `architecture.md` from SystemOverview, and use `# Behavior Logic` / `## Behavior Logic Index` / `## Dev Appendix`). Both `system-overview.md` and `behavior-logic.md` match their live templates exactly, so this is not scored against them — flagging only so the checklist file itself can be refreshed to match the templates it's supposed to gate.

---

## Metrics

| Metric | Value |
|--------|-------|
| Feature Specs | 2 (`.pending`, not reviewed this wave — separate `--feature-specs` pass) |
| User Stories | 3 |
| Screens | 2 |
| Background Logic Items | 3 |
| Permissions | 4 |
| Backend Route Rows | 1 |
| Frontend Pages | 4 |
| Data Model Entities | 3 |

---

## W7-merge note (orchestrator)

Core-only run — no `feature-review-batch-*.md` exists, so this report is `core-review-report.md` verbatim plus this note. `result: PASS` holds (`failed: 0`).

**W1 resolved post-review:** the `route-list.md` ROUTE001 `Owner F###` cell was `—` with a note saying feature-list.md did not yet exist. The orchestrator set it to `F001` and rewrote the note to cite `feature-list.md § F001 Related APIs/Routes`. `validate_route_list.py` re-run after the edit: PASS, 0 critical / 0 warning. The frontmatter `warnings: 1` is left as the reviewer recorded it — the count is the review's finding, not a live defect.
