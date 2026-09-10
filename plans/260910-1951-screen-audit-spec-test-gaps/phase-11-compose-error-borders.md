---
phase: 11
title: "Compose: viền đỏ khi lỗi trên 4 field bắt buộc"
track: A (presentational)
test_policy: e2e-red-first
feature: F009
status: completed
priority: P1
effort: 1.5h
depends_on: []
blocks: [12]
owned_files:
  - src/app/(public)/kudos/_components/kudos-recipient-field.tsx
  - src/app/(public)/kudos/_components/kudos-title-field.tsx
  - src/app/(public)/kudos/_components/kudos-content-field.tsx
  - src/app/(public)/kudos/_components/kudos-anonymous-field.tsx
  - tests/e2e/kudos-compose.spec.ts
---

# Phase 11 — Viền đỏ mà spec, TC và cả docs đã ship đều hứa

## Context Links

- **Không có spec revision cho F009** trong `spec/`. Nguồn chốt: `momorph/specs-ihQ26W78P2.csv` row
  **B.2** ("Error: Khi rỗng hiển thị **viền đỏ** và thông báo"), TC **ID-7** và **ID-50** (cả hai
  High), `docs/vi/features/F009_KudosCompose/functional-spec.md:93` (FR-402), `:215`,
  `technical-spec.md:169` (DEC-002), `:262`, `docs/vi/screens/SCR008_KudosCompose/spec.md:132`
- Audit: `research/audit-kudos-compose.md` gap 1 (major), field-rule table dòng "Người nhận — error
  presentation (B.2)"

## Overview

**Priority** P1 · **Status** pending · Không field compose nào đổi viền khi lỗi:
`kudos-compose-field.tsx:108-118` chỉ render `<p>` đỏ, còn `kudos-recipient-field.tsx:83`,
`kudos-title-field.tsx:75`, `kudos-content-field.tsx:110`, `kudos-anonymous-field.tsx:110` hardcode
`border-[#998C5F]` không có nhánh lỗi. Mẫu cần dùng đã có sẵn ngay trong repo.

## Key Insights

- **Mẫu đã tồn tại, đừng phát minh lại**: `kudos-link-dialog.tsx:117-119` và `:154-156` làm đúng
  chuyện này — `` className={`${INPUT_BASE_CLASS} ${err ? "border-[#FF8A80]" : "border-[#998C5F]"}`} ``.
  Copy nguyên pattern, nguyên token `#FF8A80` (DRY, và giá trị đã được ký ở
  `plans/260908-0919-kudos-addlink-box/`).
- **`aria-invalid` đã có** ở cả 4 field (ví dụ `kudos-content-field.tsx:108`) ⇒ phần a11y đúng rồi,
  thiếu **đúng** phần thị giác. Đừng thêm attribute mới.
- **Không đổi viền của `kudos-format-toolbar.tsx`.** Toolbar là composite khung riêng
  (`:65`, `:76` cũng dùng `#998C5F`) nằm **trên** textarea `rounded-b-lg`. Row B.2 nói về *field*
  nhập, không nói toolbar. Đổi cả toolbar là vượt phạm vi và làm thẻ Kudos đỏ rực. Ghi rõ thành
  quyết định.
- `kudos-recipient-field.tsx:83` là một `<div>` bọc (không phải `<input>`) ⇒ nhánh lỗi phải áp lên
  chính div đó, không lên input bên trong.
- Không chạm `kudos-compose-field.tsx` (shell dùng chung, đang giữ `<p>` lỗi) — 4 field tự quyết
  viền của mình, shell không cần biết.

## Requirements

Functional: khi field bắt buộc có `error`, viền đổi sang `#FF8A80`; hết lỗi thì trở về `#998C5F`;
`<p>` thông báo giữ nguyên (không thay thế nhau, spec B.2 yêu cầu **cả hai**).

Non-functional: không thêm state mới — dùng đúng prop `error` mà 4 component đã nhận; không thêm
token màu mới vào `globals.css`.

## Architecture

```
kudos-recipient-field.tsx:83    div bọc      → error ? border-[#FF8A80] : border-[#998C5F]
kudos-title-field.tsx:75        input        → cùng nhánh
kudos-content-field.tsx:110     textarea     → cùng nhánh (toolbar phía trên KHÔNG đổi)
kudos-anonymous-field.tsx:110   input        → cùng nhánh (chỉ khi checkbox bật, field mới mount)
```

## Related Code Files

Sửa: 4 file field ở trên (mỗi file 1 dòng class) · `tests/e2e/kudos-compose.spec.ts` (`[C20]` `:730`
thêm assert viền cho ID-7/ID-50).
Tạo / Xoá: không.

## Implementation Steps

1. **RED** — trong `tests/e2e/kudos-compose.spec.ts` `[C20]` (submit rỗng ⇒ mọi lỗi hiện cùng lúc,
   ID-56): thêm cho từng field bắt buộc
   `await expect(field).toHaveCSS("border-color", "rgb(255, 138, 128)")`
   (`#FF8A80`). Thêm cả ca ẩn danh: bật checkbox, submit rỗng ⇒ field tên ẩn danh cũng viền đỏ.
   Chạy `pnpm test:e2e kudos-compose.spec.ts` → **đỏ** (nhận `rgb(153, 140, 95)` = `#998C5F`).
2. Sửa 4 file theo pattern `kudos-link-dialog.tsx:117-119`. Với `content-field`, áp lên `textarea`,
   **không** lên toolbar.
3. Kiểm nhánh hồi phục: gõ vào field ⇒ viền về `#998C5F` (thêm 1 assertion vào cùng test).
4. GREEN: `pnpm test:e2e kudos-compose.spec.ts` xanh → `pnpm test:e2e` full → `pnpm test:unit` →
   4 gate → `pnpm build-storybook`.
5. `tester`: capture dialog ở trạng thái lỗi, so với `ihQ26W78P2` row B.2.

## Todo List

- [ ] RED: 4 (+1 ẩn danh) assertion `border-color` đỏ, giá trị nhận được là `rgb(153, 140, 95)`
- [ ] Dùng đúng token `#FF8A80` của `kudos-link-dialog.tsx`, không màu mới
- [ ] `kudos-format-toolbar.tsx` KHÔNG bị chạm (grep xác nhận)
- [ ] Nhánh hồi phục có assertion
- [ ] `aria-invalid` không bị thêm/bớt
- [ ] GREEN + 4 gate + storybook + e2e full

## Success Criteria

- RED thật ×4: mỗi assertion nêu rõ `expected rgb(255, 138, 128), received rgb(153, 140, 95)` —
  không phải selector sai, không phải timeout.
- GREEN: `[C20]` xanh với cả 2 nhánh (có lỗi / hết lỗi).
- `git diff --stat` chỉ có 4 file field + 1 file test. `kudos-compose-field.tsx` và
  `kudos-format-toolbar.tsx` không xuất hiện.
- 217 e2e + assertion mới xanh; 808 unit không đổi.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| `toHaveCSS("border-color")` trả 4 giá trị (mỗi cạnh) | trung bình | thấp | dùng `border-color` (rút gọn 1 giá trị khi 4 cạnh giống nhau); nếu trả chuỗi 4 phần thì assert `border-top-color` |
| Đổi luôn viền toolbar cho "đồng bộ" | trung bình | trung bình | ghi thành quyết định + Success Criteria yêu cầu `git diff` không chứa toolbar |
| `recipient-field` áp lên input thay vì div bọc | trung bình | thấp | dòng `:83` nêu tường minh trong § Architecture |
| Field ẩn danh chưa mount khi assert | trung bình | thấp | bật checkbox trước; field chỉ mount khi checked (`kudos-anonymous-field.tsx:93-113`) |

**Rollback:** revert commit. Không DB.

## Security Considerations

Không có. Không đổi validate, không đổi payload; `validate-kudo-draft.ts` không bị chạm ⇒ luật server
giữ nguyên.

## Next Steps

Nhả `tests/e2e/kudos-compose.spec.ts` cho phase 12. Các gap minor còn lại của compose (focus ring bị
`focus:outline-none` xoá, `labelWidth` không truyền, 1 message cho 3 lý do ảnh, comment lỗi thời) là
~50 gap minor ngoài phạm vi — ghi `plans/action-items.md` § Nợ lại.

## MoMorph refs:
- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
- Addlink Box (nguồn pattern viền đỏ): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md` +
  `plans/260908-0919-kudos-addlink-box/clarifications.md` (plan hiện tại không có `clarifications.md`
  và **không có** spec revision F009)
- testPolicy: e2e-red-first
