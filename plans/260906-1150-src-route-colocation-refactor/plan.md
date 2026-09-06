---
title: "Migrate to the src/ route-colocated layout"
description: "Move the Next 16 app under src/, reorganize it into (public)/(protected) route groups with private folders, and split lib/ by kind — zero URL or behavior change."
status: in_progress
priority: P2
effort: 9h
branch: refactor/src-route-colocation
tags: [refactor, architecture, nextjs, structure, colocation]
created: 2026-09-06
work_type: feature
spec_waived: "structural refactor, 0 new user-facing intents; F001-F003 behavior unchanged; system docs forward-drafted at spec/system/ and reconciled by rebuild-spec core pass at Stage 6 (see spec/.intent-enum.json)"
system_doc_drafts: [plans/260906-1150-src-route-colocation-refactor/spec/system/architecture.md, plans/260906-1150-src-route-colocation-refactor/spec/system/permissions.md]
evidence: plans/260906-1150-src-route-colocation-refactor/evidence/
---

# Migrate to the src/ route-colocated layout

Move every source folder under `src/`, then reshape `src/app/**` into route groups with private
folders, then split `lib/` by kind and lock the boundaries with lint. URLs, behavior, env vars,
`package.json` scripts and `messages/*.json` keys do not change — the E2E suite is the oracle.

One branch (`refactor/src-route-colocation`), one PR, **one commit per phase**. Phases are strictly
sequential: each starts from the previous one green. One implementer owns the whole repo per phase,
so there is no parallel file-ownership matrix.

## Phases

| # | Phase | File | Status | Commit | Owns acceptance criteria |
|---|---|---|---|---|---|
| 1 | Move the tree into `src/` verbatim + config cutover | [phase-01-move-into-src.md](phase-01-move-into-src.md) | completed | f9e6e33 | AC3 typecheck · AC4 coverage · AC5 Storybook |
| 2 | Route groups, colocation, single session gate | [phase-02-route-groups-and-colocation.md](phase-02-route-groups-and-colocation.md) | completed | 1f83396 | AC6 e2e/URLs · AC7 `(protected)/layout.tsx` |
| 3 | `lib/` split, lint boundaries, routes, docs | [phase-03-lib-split-lint-boundaries-docs.md](phase-03-lib-split-lint-boundaries-docs.md) | completed | 580e45f | AC1 target paths · AC2 lint boundaries · AC8 `server-only` · AC9 README half |

Criteria are quoted verbatim in each phase's Success Criteria section, from
`evidence/study-context.json`.

## Delivery Status

Implementation **sealed** (score 9/10, 0 critical) by inspection. Pending: `rebuild-spec` core pass re-baselines `docs/vi/_source-to-fcode.json`, `doc-writer` updates the final sections of `README.md`, human sign-off on the risk gate (auth boundary touched), and `/tkm:ship`.

**Review findings:** (1) proxy docblock naming outdated `/todo` guard as authoritative — fixed in fd445a5; (2) three files exceed 200 lines (pre-existing, logged to action-items as debt). Both accepted, zero-blocker.

## Dependencies

`Phase 1 → Phase 2 → Phase 3`. Phase 1 is atomic by force: Next ignores `src/app` while a root
`app/` exists, so `app/` can never be half-moved. Phase 2 needs the alias and glob cutover from
Phase 1. Phase 3's ESLint boundary rules would fail against Phase 2's pre-state.

**Out of phase:** AC9's `docs/vi` half (`_source-to-fcode.json`, `.rebuild-state.json`, F001–F003
`technical-spec.md` source citations) is discharged by the orchestrator's `rebuild-spec` core pass
at Stage 6 after inspection. No phase runs it, and no phase may hand-edit generated docs.

## Verification (identical for every phase, in this order)

```bash
pnpm lint --max-warnings 0
pnpm format:check
pnpm test:unit:coverage      # 100% gate; coverage table must list 17 source files
pnpm build                   # MUST precede typecheck: generates .next/types (LayoutProps)
pnpm typecheck
pnpm build-storybook         # 22 stories discovered
pnpm exec playwright test --grep-invert @auth
```

`@auth` E2E runs locally when the `saa-app` Supabase instance is up; it is never a CI gate.

## Key References

- Rules: `.claude/skills/nextjs-route-colocation-architecture/SKILL.md` (migration-map.md)
- Reports: [tester](reports/tester-260906-1318-src-migration-gate.md), [reviewer](reports/reviewer-260906-1318-src-migration-inspection.md)
- Evidence: [study-context.json](evidence/study-context.json), [inspection-verdict.json](evidence/inspection-verdict.json)
- Specs: [system/architecture.md](spec/system/architecture.md), [system/permissions.md](spec/system/permissions.md)
