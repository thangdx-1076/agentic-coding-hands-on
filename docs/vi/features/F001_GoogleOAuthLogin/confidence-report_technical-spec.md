---
source_artifact: docs/vi/features/F001_GoogleOAuthLogin/technical-spec.md
claims_total: 26
claims_with_evidence: 23
confidence_derived: 0.8846
generated_by: derive_confidence_report.py
---

# Confidence Report -- docs/vi/features/F001_GoogleOAuthLogin/technical-spec.md

> **Self-reported citation-coverage stat -- NOT a correctness verification.** This report is derived deterministically by parsing the artifact's own inline `**Source:** file:line` citations and `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` marker tags. It does NOT verify that citations are accurate or that claims are true. For blind truth verification, see `claude/skills/audit-doc-parity/`.

## Claims ↔ Evidence

Legend: `○` = cited (Source file:line present) · `△` = marker-tagged (uncertain, no citation).

| Claim | Section | Evidence (file:line) | Status ○/△ |
|---|---|---|---|
| (boundary validation) | 3. Actions | app/login/page.tsx:32-67 | ○ |
| (boundary validation) | 3. Actions | app/login/page.tsx:75-85 | ○ |
| (boundary validation) | 3. Actions | app/login/page.tsx:94-99 | ○ |
| (unlabeled claim) | 3. Actions | components/login/google-login-button.tsx:28-33 | ○ |
| (unlabeled claim) | 3. Actions | hooks/use-login-actions.ts:42-57 | ○ |
| (unlabeled claim) | 3. Actions | lib/auth/sign-in-with-google.ts:39-55 | ○ |
| (unlabeled claim) | 3. Actions | app/auth/callback/route.ts:17-47 | ○ |
| (unlabeled claim) | 3. Actions | lib/supabase/server.ts:16-42 | ○ |
| (unlabeled claim) | 3. Actions | lib/supabase/next-path.ts:88-106 | ○ |
| (unlabeled claim) | 3. Actions | app/todo/page.tsx:19-46 | ○ |
| (unlabeled claim) | 3. Actions | lib/supabase/server.ts:16-42 | ○ |
| (unlabeled claim) | 3. Actions | app/todo/actions.ts:14-24 | ○ |
| (unlabeled claim) | 3. Actions | lib/supabase/server.ts:16-42 | ○ |
| (unlabeled claim) | 3. Actions | app/page.tsx:11-18 | ○ |
| (unlabeled claim) | 3. Actions | lib/supabase/server.ts:16-42 | ○ |
| (Authenticated→Anonymous) | 4. Shared Foundation | app/auth/callback/route.ts:31-39 | ○ |
| (Authenticated→Anonymous) | 4. Shared Foundation | app/todo/actions.ts:14-24 | ○ |
| (unlabeled claim) | 4. Shared Foundation | proxy.ts:22-42 | ○ |
| (unlabeled claim) | 4. Shared Foundation | proxy.ts:72-82 | ○ |
| (unlabeled claim) | 4. Shared Foundation | proxy.ts:109-111 | ○ |
| (unlabeled claim) | 4. Shared Foundation | lib/supabase/client.ts:13-18 | ○ |
| (unlabeled claim) | 4. Shared Foundation | lib/supabase/server.ts:16-42 | ○ |
| (unlabeled claim) | 4. Shared Foundation | lib/supabase/proxy-client.ts:13-34 | ○ |
| chạy trọn round-trip Google thật. `` cho nhánh thành công của FR-401 bằng test thực | 5. Verification & Technical Notes | — | △ |
| to /login"). `` cho nhánh authenticated (`GET /` khi đã đăng nhập → `/todo`) và cho | 5. Verification & Technical Notes | — | △ |
| **FR-001** (2 biến môi trường Supabase bắt buộc, factory throw khi thiếu) — ``: không | 5. Verification & Technical Notes | — | △ |

## Missing Info

Candidate sections to check for `△` (marker-tagged) claims -- best-effort only, not authoritative:

- 5. Verification & Technical Notes: chạy trọn round-trip Google thật. `` cho nhánh thành công của FR-401 bằng test thực
- 5. Verification & Technical Notes: to /login"). `` cho nhánh authenticated (`GET /` khi đã đăng nhập → `/todo`) và cho
- 5. Verification & Technical Notes: **FR-001** (2 biến môi trường Supabase bắt buộc, factory throw khi thiếu) — ``: không

## Risk Flags

_(none)_
