---
source_artifact: docs/vi/features/F002_LanguageSwitch/technical-spec.md
claims_total: 14
claims_with_evidence: 11
confidence_derived: 0.7857
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/vi/features/F002_LanguageSwitch/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (unlabeled claim) | 3. Actions | components/login/language-selector.tsx:26-102 | ○ |
| (unlabeled claim) | 3. Actions | hooks/use-menu-keyboard-nav.ts:58-171 | ○ |
| (unlabeled claim) | 3. Actions | lib/ui/roving-index.ts:10-24 | ○ |
| (unlabeled claim) | 3. Actions | i18n/request.ts:22-41 | ○ |
| (unlabeled claim) | 3. Actions | app/login/page.tsx:38-49 | ○ |
| (unlabeled claim) | 3. Actions | components/login/language-selector.tsx:39-42 | ○ |
| (unlabeled claim) | 3. Actions | hooks/use-login-actions.ts:59-65 | ○ |
| (unlabeled claim) | 3. Actions | app/actions/locale.ts:25-44 | ○ |
| (unlabeled claim) | 3. Actions | lib/i18n/locale.ts:49-51 | ○ |
| A1-A2 \| Bất kỳ lỗi bất đồng bộ nào trong `startTransition` (bao gồm `setLocale` ném `Error` — § 5.3… | 3. Actions | — | △ |
| (unlabeled claim) | 4. Shared Foundation | hooks/use-menu-keyboard-nav.ts:61-171 | ○ |
| (unlabeled claim) | 4. Shared Foundation | lib/ui/roving-index.ts:10-24 | ○ |
| — `` không có Playwright e2e nào thật sự click một `menuitem` rồi assert cookie | 5. Verification & Technical Notes | — | △ |
| → `normalizeLocale`) — `` không tìm thấy test nào seed sẵn cookie `NEXT_LOCALE` rác | 5. Verification & Technical Notes | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 3. Actions: A1-A2 \| Bất kỳ lỗi bất đồng bộ nào trong `startTransition` (bao gồm `setLocale` ném `Error` — § 5.3…
- 5. Verification & Technical Notes: — `` không có Playwright e2e nào thật sự click một `menuitem` rồi assert cookie
- 5. Verification & Technical Notes: → `normalizeLocale`) — `` không tìm thấy test nào seed sẵn cookie `NEXT_LOCALE` rác

## Risk Flags

_(none)_
