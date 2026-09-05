---
title: "Core system specs rebuild and promotion (wave 9)"
description: "Full `/tkm:rebuild-spec` run: 12 core artifacts to docs/vi/, system docs reconciled, trace matrix & nav READMEs generated. Feature spec run deferred."
status: completed
priority: P0
effort: 2.5h
branch: feat/login-google-oauth
tags: [docs, specs, rebuild, promotion]
created: 2026-09-05
work_type: feature
test_policy: visual-contract
---

# Rebuild Spec — Core Wave 9

**Scope**: Full core documentation rebuild triggered by delivery of F001_GoogleOAuthLogin + F002_LanguageSwitch. Promoted 12 generated artifacts to `docs/vi/`; reconciled forward-draft system docs.

**Status**: completed. Completion flag: `plans/260905-1447-rebuild-spec-core/artifacts/wave9-complete.flag`.

**Test Policy**: `visual-contract` — specs are reference docs, no executable tests.

## Phases

| # | Phase | Status | Owner | Effort |
|---|-------|--------|-------|--------|
| 01 | [Full rebuild + promote core](phase-01-full-rebuild-promote-core.md) | completed | tkm:rebuild-spec | 2.5h |

## Delivery Summary (2026-09-05)

**Promoted to `docs/vi/`**: 12 core artifacts from rebuild run.
- System docs (`system/overview.md`, `system/architecture.md`, `system/permissions.md`) — reconciled from forward-draft stage, now match implemented code (no "forward-draft" token left).
- Generated docs (`generated/{route-list,api-map,permissions-matrix,entities,user-stories,feature-list,screen-list,screen-flow,behavior-logic}.md`) — all wire IDs (US###/BL###/PERM###) pinned per shipped code.
- Navigation READMEs and traceability matrix generated.

**Feature Codes Pinned**: F001/F002 slugs locked in, feature spec per-screen pages remain `.pending` (awaiting `--feature-specs` pass).

**Rebuild State Advanced**: `docs/vi/.rebuild-state.json` cursor set to `last_rebuild_sha: afb4891c7821fc237dd044a72d36591f0ac15297`. Note: `last_feature_spec_run_sha` remains empty — feature specs have NOT been updated with new ID codes yet.

## Next Steps (Out of Scope)

Run `/tkm:rebuild-spec --feature-specs` to update per-feature specs under `docs/vi/features/F###/` and populate `last_feature_spec_run_sha`.

**Status:** DONE
