# Delivery Tracker — Login Feature Sync-back (2026-09-04)

**Plan**: 260904-1633-login-page-google-oauth  
**Status**: COMPLETED (all 5 phases closed, scope reconciled)

## Reconciliation Summary

### Plan vs Evidence
- **Phase 01 (Track A)**: `status: in progress` → `completed` ✓
  - Delivered: 13 components (login-screen, header, hero, footer, language-selector, google-login-button, error-alert, icons), app/fonts.ts, globals.css additive tokens
  - Evidence: Initial build + Correction (hero offset 1440×1024) + Polish (hover/focus/active states, menu animation, responsive padding) all verified
  - Tests: tsc/lint/asset-coverage exit 0, 14/14 E2E passing, visual validation at 375/768/1280/1440

- **Phases 02–05**: Already marked `completed` in their files
  - Phase 02 (i18n): 8/8 vitest, tsc/lint/build exit 0, cookie normalization + message imports
  - Phase 03 (Auth): 17/17 unit tests (9 safeNextPath, 8 normalizeLocale), proxy guard + PKCE callback + /todo protection
  - Phase 04 (Wiring): /login server+client, useTransition OAuth flow, setLocale integration, tsc/lint/build exit 0
  - Phase 05 (Temper): 14/14 E2E GREEN, 26/26 unit total, visual diff (1440 matches design), 4 responsive breakpoints captured

### Scope Drift (logged)
- Track A added Correction phase: hero layout offset fix to match 1440×1024 design targets (tracked risk, not a regression)
- Track A added Polish phase: hover/focus/active states, menu entrance transition, responsive footer padding (within phase-05 scope, not Plan change)
- Tester tooling added: `visual-capture.mjs` + `visual-validation.mjs` (out-of-scope creep, documented in phase-05 report)
- vitest added as default unit runner (scope extension, not in original plan)

### Test Evidence Lineage
- RED baseline: `reports/tester-red-login-e2e.md` (12 assertions, 12 assertion failures as expected)
- GREEN run: `reports/tester-green-visual-login.md` + `evidence/green-run.log` (14/14 passing, unchanged TC-ID titles, zero assertions loosened)
- Unit: vitest 26/26 (next-path.test.ts 9 + locale.test.ts 8 + remaining 9 from phase-02 handover)
- Build: `npm run build` exit 0 (Turbopack, all 4 routes + Middleware listed)

### Reviewer Verdict
- Score: 9/10  
- Decision: SEALED  
- Critical findings: 0  
- High/Medium findings resolved in delta pass (tsc/lint/vitest/build all exit 0 post-fix)  
- Remaining Defers: U+2028/U+2029 control-char edge case (safe but noted), ARIA menu roving (not required, polish scope)

## Open Items (non-blocking)

1. **User action**: Export Figma node 662:14389 to `public/login/keyvisual.png` (hero background)
2. **Deferred polish**: Arrow-key navigation in language selector menu (ARIA APG roving), Unicode line-separator hardening
3. **Docs**: Run `/tkm:rebuild-spec` to regenerate Core/Flow from updated specs (gate skipped in plan)
4. **Rebuild state**: `docs/vi/.rebuild-state.json` `last_feature_spec_run_sha` still empty (no git commit post-gen)

## Files Modified (Phase Sync Only)
- `phase-01-track-a-presentational-login-ui.md` → `status: completed`
- `plan.md` → frontmatter `status: completed`, phases table all 5 → completed, added delivery summary
