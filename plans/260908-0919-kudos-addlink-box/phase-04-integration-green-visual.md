---
phase: 04
feature: F009
track: integration
status: completed
priority: P2
test_policy: e2e-red-first
effort: 1.25h
owner: implementer, tester
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-compose-form.tsx",
    "tests/e2e/kudos-link-dialog.spec.ts",
    "plans/260908-0919-kudos-addlink-box/evidence/visual",
    "plans/260908-0919-kudos-addlink-box/evidence/temper-results.json",
    "plans/260908-0919-kudos-addlink-box/evidence/green-evidence.md",
  ]
---

# Phase 04 — Lắp `kudos-compose-form.tsx` + GREEN + bằng chứng thị giác

Ref: Addlink Box https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa · `clarifications.md` · `e2e-red-first`. Depends: 02, 03.

1. `kudos-compose-form.tsx:110-129` (`handleFormat`): nhánh `kind==="link"` đổi `window.prompt` → `linkDialog.open(textarea)` (hook phase 02, giữ local trong file này như `textareaRef`), return sớm, không gọi `applyFormat` ngay.
2. `onSave`: `save()` trả `{text,url,selection}` hợp lệ → `textarea.setSelectionRange(selection.start, selection.end)` (khôi phục vùng chọn mất do focus rời) rồi `applyFormat("link", textarea, url, text)`. Cập nhật type `KudosComposeFormProps.applyFormat` (dòng 45-49) thêm tham số 4 `linkText?` khớp phase 02.
3. Render `<KudosLinkDialog registerDialog={...} onCancel={...} text url errors onTextChange onUrlChange onUrlBlur onCancelClick={cancel} onSave={handleLinkSave} copy={copy.linkDialog} />` là con trong `<form>`, sau `KudosComposeBody`.
4. Xoá hoàn toàn `window.prompt` — `grep -rn "window.prompt" src/` phải rỗng.
5. Tester: rerun `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts` → GREEN 11/11 exit 0. Rerun `tests/e2e/kudos-compose.spec.ts` (F009, không sửa) → vẫn 27/27.
6. Visual: Playwright MCP mở dialog Viết Kudo → Link → screenshot `evidence/visual/01-link-dialog-empty.png`; Lưu rỗng → `02-link-dialog-errors.png`. Đối chiếu clarifications § "Giá trị visual" — lệch thì trả về phase 03 với diff cụ thể.
7. Ghi `evidence/temper-results.json` (exit code thật 2 lệnh e2e + coverage) + `evidence/green-evidence.md`.

Không chạy `pnpm build` (orchestrator chạy). `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm format:check` sạch. `E2E_PORT=3100` mọi lệnh, không đụng port 3000.

**Rủi ro chính**: selection mất khi dialog con mở (focus rời textarea) → verify riêng L09 trước khi chạy cả suite; dialog con re-render làm mất `open` của compose dialog cha → rerun C01-C27 xác nhận không hồi quy.

## Delivered

✓ Integration complete. `kudos-compose-form.tsx` remains exactly 200 lines by extracting dialog wrapper to separate `kudos-compose-link-dialog.tsx` component (not in original plan — design improvement). React event bubbling fix: both Save/Cancel use `stopPropagation()` to isolate child dialog clicks from parent listeners (found during integration). **Proof:** `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts` exit 0 (11/11 GREEN from RED); `kudos-compose.spec.ts` exit 0 (27/27 no regression); `kudos.spec.ts` exit 0 (28 passed, 1 skipped after orchestrator DB cleanup); `pnpm test:unit:coverage` exit 0 (534/534 green, 100% coverage); `typecheck && lint --max-warnings 0 && format:check` all exit 0; visual captures 01-04 all MATCH spec; `grep -rn "window.prompt" src/` empty. Build delegated to orchestrator: `pnpm build` exit 0.
