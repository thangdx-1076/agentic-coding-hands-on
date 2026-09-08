---
phase: 01
feature: F009
track: test gate
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: tester
file_ownership: ["tests/e2e/kudos-link-dialog.spec.ts"]
---

# Phase 01 — RED: `kudos-link-dialog.spec.ts` (11 test) — ĐÃ HOÀN THÀNH

## MoMorph refs
- Addlink Box: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa
- Clarifications: `plans/260908-0919-kudos-addlink-box/clarifications.md` · testPolicy: `e2e-red-first`

Không làm lại. `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts --reporter=list` → exit 1, 0/11 pass, mọi test đỏ vì `[data-testid=kudos-link-dialog]` không tồn tại (assertion thật, `typecheck`/`lint` pass). Bằng chứng: `evidence/red-evidence.md`.

Hợp đồng L01-L11 (đọc, không sửa) tóm tắt: open/title/empty inputs (L01) · Escape/Hủy chỉ đóng dialog con, textarea không đổi (L02-03) · Lưu rỗng → 2 error (L04) · whitespace-only text (L05) · biên 100/101 ký tự (L06) · URL ngắn/malformed/non-http (L07) · save hợp lệ chèn `[text](url)` (L08) · prefill từ selection + thay đúng vùng chọn (L09) · reopen rỗng (L10) · không còn `window.prompt` (L11). Chi tiết đầy đủ: header comment file test, dòng 27-64.

## Delivered

✓ Valid RED captured: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts` exit 1, 0/11 pass. All 11 tests fail on missing `[data-testid=kudos-link-dialog]` element (assertion-based, not infra). **Proof:** evidence/red-evidence.md; typecheck/lint pass.

## Next Steps
Mở khoá phase 02 ∥ 03. Phase 04 nhận lại quyền ghi để rerun GREEN.
