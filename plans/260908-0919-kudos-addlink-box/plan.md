---
title: "Addlink Box — dialog \"Thêm đường dẫn\" cho toolbar Viết Kudo"
description: "Thay window.prompt của nút Link (F009) bằng <dialog> lồng: Nội dung (1-100) + URL (http/https, 5-2048), Hủy/Lưu, chèn [text](url) tại vị trí bôi đen lúc mở."
status: completed
priority: P2
effort: 5h
branch: feat/kudos-addlink-box
tags: [kudos, momorph, e2e-red-first, i18n]
created: 2026-09-08
work_type: feature
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa
clarifications: plans/260908-0919-kudos-addlink-box/clarifications.md
spec: docs/vi/features/F009_KudosCompose/
system_draft: []
---

# Addlink Box (mở rộng F009_KudosCompose) — implementation plan

`e2e-red-first`. Phase 01 (RED) **đã xong** — `tests/e2e/kudos-link-dialog.spec.ts` (11 test L01-L11) đỏ thật vì thiếu `[data-testid=kudos-link-dialog]` (`evidence/red-evidence.md`). 19 quyết định ở `clarifications.md` là cuối, không mở lại. Thứ tự chạy: `01` → `02 ∥ 03` → `04`.

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [RED — `kudos-link-dialog.spec.ts` (11 test)](phase-01-red-e2e-link-dialog-contract.md) | test gate | tester | completed | — | 1h |
| 02 | [Track B — validate/marker/copy/hook thuần](phase-02-track-b-validate-marker-hook.md) | B | implementer | completed | 01 | 1.5h |
| 03 | [Track A — `kudos-link-dialog.tsx` + icons](phase-03-track-a-link-dialog-component.md) | A | momorph-ui-implementer | completed | 01 | 1.25h |
| 04 | [Lắp form + GREEN + bằng chứng thị giác](phase-04-integration-green-visual.md) | — | implementer, tester | completed | 02, 03 | 1.25h |

## File ownership (không phase nào chung file)

| Phase | Owns |
|-------|------|
| 01 | `tests/e2e/kudos-link-dialog.spec.ts` *(đã có, read-only từ đây)* |
| 02 | `messages/vi.json`, `messages/en.json`, `_shared/kudos-compose-copy.ts`, `_utils/insert-markdown-marker.ts(+test)`, `_utils/validate-link-draft.ts(+test)`, `_hooks/use-kudos-link-dialog.ts(+test)`, `_hooks/use-kudos-compose-content.ts(+test)` |
| 03 | `_components/kudos-compose-icons.tsx`, `_components/kudos-link-dialog.tsx(+stories)`, sửa import icon trong `_components/kudos-compose-footer.tsx` + `_components/kudos-format-toolbar.tsx` |
| 04 | `_components/kudos-compose-form.tsx`, `tests/e2e/kudos-link-dialog.spec.ts` *(nhận lại — tuần tự, cùng owner)*, `evidence/visual/**`, `evidence/{temper-results.json,green-evidence.md}` |

## Quyết định chốt (đọc trước khi code — trùng lặp với clarifications.md, không mở lại)

- Nested `<dialog>` native, `showModal()` qua `use-kudos-link-dialog.ts`, **không** render `open` attribute (pattern `use-kudos-compose-dialog.ts`). Escape chỉ đóng dialog topmost (link) — spec top-layer, đã research xác nhận, không cần code riêng.
- `insertMarkdownMarker(value, start, end, 'link', url, linkText?)`: có `linkText` → thay selection bằng `[linkText](url)`, caret **sau `)`** (collapsed); không có `linkText` → giữ hành vi cũ (selection hiện tại hoặc placeholder `"text"`).
- Hook snapshot `selectionStart/End` lúc mở (focus rời textarea khi dialog mở) và `setSelectionRange` lại trước khi gọi `applyFormat` — bắt buộc theo research report (Chromium có bug timing quanh blur, xem `reports/researcher-260908-0919-nested-dialog-study.md` mục 5).
- Testid: `kudos-link-dialog`, `kudos-link-title`, `kudos-link-text-input`, `kudos-link-url-input`, `kudos-link-text-error`, `kudos-link-url-error`, `kudos-link-cancel`, `kudos-link-save`. Trigger có sẵn: `[data-testid=kudos-format-button][data-format=link]`.
- **Không** tái dùng `KudosComposeFooter`/`KudosComposeField` component (testid cố định của chúng lệch hợp đồng mới) — viết JSX riêng trong `kudos-link-dialog.tsx`, style/class chép nguyên từ 2 file đó (DRY ở icon, không ở testid).
- `IconClose` (hiện là local fn trong `kudos-compose-footer.tsx:87-103`) và `IconLink` (hiện là `icon(...)` const trong `kudos-format-toolbar.tsx:125-127`, dùng chung factory `icon()` dòng 87-102 của file đó) → cả 2 export sang `kudos-compose-icons.tsx`; factory `icon()` đi theo `IconLink`. Footer/toolbar xoá bản local, import lại.
- Validate: Nội dung `trim()` 1-100, bắt buộc. URL `trim()` 5-2048, `new URL()` parse được, `protocol ∈ {http:, https:}`. URL validate thêm khi blur; cả 2 khi bấm Lưu. Copy lỗi: `errorRequired` (dùng lại), `errorTextTooLong`, `errorUrlInvalid`, `errorUrlLength` dưới `kudos.composeModal.linkDialog.*`.
- `KudosLinkDialog` là con của compose `<dialog>` (JSX lồng trong `kudos-compose-form.tsx`), luôn mounted khi form mounted — không unmount nút Link khi B mở (giữ focus-restore hợp lệ, research report mục 2/rủi ro).

## Delivery status

| Check | Result | Evidence |
|-------|--------|----------|
| RED baseline | ✓ Valid | `tests/e2e/kudos-link-dialog.spec.ts` 0/11 pass; exit 1 (evidence/red-evidence.md) |
| Link Dialog E2E | ✓ GREEN 11/11 | `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts` exit 0 |
| F009 Regression | ✓ GREEN 27/27 | `tests/e2e/kudos-compose.spec.ts` exit 0; file unchanged |
| F007 Board | ✓ GREEN 27/27 | After orchestrator DB cleanup: `kudos.spec.ts` 28 passed, 1 skipped, exit 0 |
| Unit + Coverage | ✓ GREEN 534/534 | `pnpm test:unit:coverage` 100% all modules; exit 0 |
| TypeScript | ✓ CLEAN | `pnpm typecheck` exit 0 |
| Lint + Format | ✓ CLEAN | `pnpm lint --max-warnings 0 && pnpm format:check` exit 0 |
| Visual | ✓ PASS 4/4 | evidence/visual/01-04 all MATCH design |
| Build | ✓ CLEAN | Orchestrator `pnpm build` exit 0 |
| Inspection | pending | evidence/inspection-verdict.json (reviewer) |

## Promote gate (completed at start)

Spec files (3 docs, 8 KB) merged to `docs/vi/` by orchestrator pre-implement; docs promoted, not pending here.
