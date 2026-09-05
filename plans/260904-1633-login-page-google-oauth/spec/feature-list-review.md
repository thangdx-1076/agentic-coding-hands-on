---
passed: true
issues: 0
warnings: 0
---

# FeatureList Review (GREENFIELD subset) — Login / Google OAuth

**Scope**: Group A Check 4 only · Group B Checks 6-8 · Group C Check 9. Checks 1-3 skipped (no US/Screen artifacts exist yet). Check 5 not evaluated (pointer slot).

## Findings

| Check | Severity | Feature | Finding | Fix |
|---|---|---|---|---|
| 4 F-code uniqueness | pass | F001, F002 | Two distinct codes, no duplicates | none |
| 6 Clear Flow | pass | F001 | input (Google click) → process (PKCE/Supabase/guard) → output (`/todo` or inline error) — all stated | none |
| 6 Clear Flow | pass | F002 | input (selector click) → process (set cookie/next-intl) → output (re-rendered UI) — all stated | none |
| 7 Vague naming | pass | F001, F002 | Specific slugs (`GoogleOAuthLogin`, `LanguageSwitch`), not generic nouns | none |
| 8 Scope overlap | pass | F001 vs F002 | Distinct keyword sets (OAuth/session/guard vs locale/cookie/i18n); explicit partial-screen-ownership note prevents header-region conflict | none |
| 9 Grouping coherence | pass | F001 | 5 US + 2 screens all serve one outcome (auth + access protection); matches `.intent-enum.json` intent #1 exactly | none |
| 9 Grouping coherence | pass | F002 | 2 US + 1 region all serve one outcome (localization); matches intent #2 exactly | none |
| Fabricated-code check | pass | both | No SCR###/US###/ROUTE###/MODEL###/BL###/PERM### fabricated — all draft refs correctly carry `TBD (draft)` | none |
| Hyphenation check | pass | both | No hyphenated codes (`F-001` etc.); all codes use no-hyphen `F001` form | none |

## Notes

- F001's name joins two clauses ("Đăng nhập Google OAuth & Bảo vệ truy cập"). Per `code-formats.md` § Feature Clustering Rule this is only a prompt to look, never a verdict. The draft's own "Decomposition rationale" section already justifies it: guard/logout/callback share the SAME business outcome as login, matching the single bundled intent in `.intent-enum.json`. No split warranted.
- Internal cross-check holds: 7 + 1 = 8 design items = `specs.csv` item count (clarifications.md line 4).
- `/todo` placeholder correctly folded into F001 (its only role is auth-gated display + logout) instead of spun out as its own feature.

## Edge Cases Scouted

- Considered splitting the `proxy.ts` guard into its own F003 (different technical layer). Rejected per Clustering Rule — never group/split by implementation mechanism; guard protects the same outcome as login, correctly kept in F001.
- Considered whether `/auth/callback` (GET route handler) needed a fabricated `ROUTE###` code — correctly left as prose + `TBD (draft)`, no fabrication.
- Considered whether Language Selector region needed its own screen entry distinct from `/login` — correctly modeled as partial-screen ownership (`SCR###/REG###` pattern, draft), not a duplicate/competing screen claim.

## Done Well

- Explicit partial-screen-ownership annotations prevent a header-region ownership conflict between F001 and F002.
- Decomposition rationale section proactively addresses the multi-clause feature name instead of leaving it for the reviewer to flag.
- Consistent, disciplined use of `TBD (draft)` — zero fabricated downstream codes anywhere in the document.

**Status:** DONE
**Summary:** GREENFIELD subset clean — 0 critical, 0 warnings across Checks 4/6/7/8/9; no fabricated codes, no hyphenation defects.
**Concerns/Blockers:** None.
