---
phase: 10
title: "Dropdown lọc Kudos: panel, cuộn, item đang chọn, tiền tố #"
track: A (presentational)
test_policy: visual-contract
feature: F007
status: incomplete
priority: P2
effort: 2h
depends_on: [01, 03]
blocks: []
owned_files:
  - src/app/(public)/kudos/_components/kudos-filter-menu.tsx
  - src/app/(public)/kudos/_components/kudos-filter-menu.stories.tsx
  - src/app/(public)/kudos/_components/kudos-filter-bar.tsx
  - tests/e2e/kudos.spec.ts
---

# Phase 10 — Panel dropdown khớp node `563:8026`/`563:8027`

## Context Links

- Spec: `spec/F007_KudosLiveBoard/functional-spec.md` FR-218 · `technical-spec.md` § 3.1 A9
  (BR-019, giá trị node nguyên văn), § 3.{N+1} A9, § 5.1 SC-010, và đoạn "Vì sao `max-height` quan
  trọng hơn sau khi BR-017 đổi"
- Audit: `research/audit-kudos-board.md` gap 5, 6, 7 · Unverifiable 2 (hover **không** có giá trị
  design)
- MoMorph: `momorph/specs-JWpsISMAaM.csv` row A/A.1/A.3 · `momorph/specs-WXK5AYB_rG.csv` row A/A.1 —
  **cả 2 frame chưa từng được đọc trong lần build đầu**, và cả 2 có **0 test case** trên MoMorph

## Overview

**Priority** P2 · **Status** pending · `kudos-filter-menu.tsx:104` render `rounded bg-[#0B0F12]
shadow-lg` + `overflow-hidden`, **không** viền, **không** padding, bo góc 4px thay vì 8px, và **không
có `max-height`** ⇒ danh sách phòng ban (giờ đọc DISTINCT từ dữ liệu thật, không còn trần 1000 dòng
nhờ phase 01) sẽ tràn layout theo dữ liệu. `:117` cho mọi option cùng class ⇒ item đang chọn không
phân biệt được, và nhãn hashtag thiếu tiền tố `#` nên menu đọc `Dedicated` còn thẻ đọc `#Dedicated`.

## Key Insights

- `test_policy: visual-contract` — hành vi lọc **không** đổi. Chỉ CSS + nhãn hiển thị. Không kê RED/GREEN.
- **Tiền tố `#` an toàn**: C14/C15 chọn option bằng `data-value` (`kudos.spec.ts:411,441`), không
  bằng text ⇒ prefix chỉ ở phần hiển thị, `data-value` và giá trị gửi lên URL **giữ nguyên**. Đã
  kiểm; vẫn phải chạy full để chứng minh.
- Chỉ menu **hashtag** có `#`; menu phòng ban thì không. `KudosFilterMenu` dùng chung cho cả hai ⇒
  cần một prop (ví dụ `labelPrefix`), không hardcode trong component.
- `max-height` là yêu cầu cho **mọi** độ dài danh sách, không riêng ca ~50 mục audit từng thấy — số
  phòng ban là dữ liệu vận hành, không phải con số biết trước (spec § 3.1 A9 nói thẳng điều này).
- Giá trị đọc từ node thật (đừng suy đoán lại): panel `background #00070C`, `border 1px solid
  #998C5F`, `border-radius 8px`, `padding 6px`, chiều cao ~`348px`; option `height 56px`,
  `padding 16px`, `border-radius 4px`, Montserrat 700 `16px/24px`, `letter-spacing 0.5px`,
  `text-align center`; item đang chọn `background rgba(255,234,158,0.10)` +
  `text-shadow: 0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287`.
- **Hover giữ nguyên `hover:bg-white/10`** — CSV chỉ ghi "hiệu ứng nổi nhẹ", không có node hover.
  Đây là giá trị đoán từ trước; đừng thay bằng một giá trị đoán khác. Ghi vào phần Unresolved.

## Requirements

Functional (trình bày): panel đúng nền/viền/bo/padding; danh sách cuộn dọc khi vượt `max-height`,
không tràn; item đang chọn có nền + text-shadow phân biệt; option đúng chiều cao/padding/typography;
nhãn menu hashtag có `#`.

Non-functional: `aria-selected` hiện có giữ nguyên (a11y đã đúng, chỉ thiếu phần thị giác);
`registerItem`/roving tabindex của `useMenuKeyboardNav` không đổi; `scroll-my-1` phải còn tác dụng
sau khi thêm `overflow-y-auto` (bàn phím phải cuộn item vào tầm nhìn).

## Architecture

```
kudos-filter-menu.tsx
  props += labelPrefix?: "#"            ← chỉ menu hashtag truyền
  panel  : rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5
           max-h-[348px] overflow-y-auto     (BỎ overflow-hidden)
  option : flex h-14 items-center justify-center rounded px-4
           font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-center
           aria-selected → bg-[rgba(255,234,158,0.10)] + [text-shadow:...]
           nhãn = `${labelPrefix ?? ""}${option}`   (data-value KHÔNG đổi)
```

## Related Code Files

Sửa: `kudos-filter-menu.tsx:104,117` (+ prop mới) · `kudos-filter-bar.tsx:40,45` (2 nơi gọi
`KudosFilterMenu` — chỉ menu hashtag truyền `labelPrefix="#"`) · `kudos-filter-menu.stories.tsx`
(story 50 option để thấy cuộn + story selected) · `tests/e2e/kudos.spec.ts` (C14/C15 thêm assert
style, C04 thêm assert `#`).
Tạo / Xoá: không.

## Implementation Steps

1. `kudos-filter-bar.tsx:40,45` là 2 nơi gọi `KudosFilterMenu` — chỉ lần gọi menu **hashtag** được
   truyền `labelPrefix="#"`.
2. Sửa panel: bỏ `overflow-hidden`, thêm `max-h-[348px] overflow-y-auto`, viền/nền/bo/padding theo
   giá trị node ở § Key Insights.
3. Sửa option: chiều cao 56px, padding 16px, typography, căn giữa; nhánh `aria-selected` thêm nền +
   text-shadow. Giữ `hover:bg-white/10` và `focus-visible:bg-white/10`.
4. Thêm `labelPrefix`, truyền `"#"` cho menu hashtag. Kiểm `data-value` không đổi.
5. `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm format:check && pnpm build-storybook`.
6. Thêm assertion **sau** khi code xong (visual-contract):
   - C04: option đầu của menu hashtag `toHaveText(/^#/)`; option menu phòng ban **không** bắt đầu `#`.
   - C14/C15: sau khi chọn, mở lại menu ⇒ option đang chọn `toHaveCSS("background-color",
     "rgba(255, 234, 158, 0.1)")`; assertion `data-value` cũ giữ nguyên không sửa.
   - mới `[C32]`: panel phòng ban `toHaveCSS("max-height", "348px")` và
     `toHaveCSS("overflow-y", "auto")`.
7. `pnpm test:e2e kudos.spec.ts` → xanh; `pnpm test:e2e` full.
8. `tester`: capture menu mở (cả 2 menu, có/không item đang chọn) so với `JWpsISMAaM`/`WXK5AYB_rG`;
   dọn `.playwright-mcp/` trước gate.

## Todo List

- [ ] `labelPrefix` chỉ truyền ở lần gọi menu hashtag (`kudos-filter-bar.tsx:40` hoặc `:45`)
- [ ] `overflow-hidden` biến mất, `max-h` + `overflow-y-auto` vào
- [ ] Item `aria-selected` có nền + text-shadow
- [ ] `#` chỉ ở nhãn menu hashtag; `data-value` nguyên vẹn
- [ ] Bàn phím vẫn cuộn item vào tầm nhìn (thử Home/End với story 50 option)
- [ ] Story 50 option + story selected
- [ ] `pnpm test:e2e` full + 4 gate + storybook
- [ ] Ghi Unresolved: màu hover chưa có giá trị design

## Success Criteria

- `grep -n "overflow-hidden" src/app/\(public\)/kudos/_components/kudos-filter-menu.tsx` → 0 hit.
- Menu phòng ban với 50 option (story) cuộn được, panel không cao hơn 348px.
- C14/C15 **vẫn xanh không cần sửa dòng `data-value`** ⇒ chứng minh prefix không rò vào giá trị.
- 217 e2e + test mới xanh; 4 gate + `build-storybook` sạch.
- Không có claim RED/GREEN trong báo cáo phase (visual-contract).

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| `#` rò vào `data-value` / URL param | trung bình | **cao** (lọc sai) | prefix chỉ ở text node; Success Criteria yêu cầu C14/C15 xanh mà không sửa dòng `data-value` |
| `overflow-y-auto` phá roving tabindex | trung bình | trung bình | `scroll-my-1` đã có; thử Home/End trên story 50 option ở bước 6 |
| Đổi màu hover thành một giá trị đoán khác | trung bình | thấp | cấm đổi; ghi vào Unresolved chờ design |
| Sửa file ngoài `owned_files` (`kudos-filter-bar.tsx`) | trung bình | trung bình | bước 1 xác định chủ trước; cập nhật `owned_files` chứ không lặng lẽ sửa |
| Option căn giữa làm danh sách dài khó đọc | thấp | thấp | design ghi `text-align: center`; đây là giá trị đọc được, không phải sở thích |

**Rollback:** revert commit. Không DB.

## Security Considerations

Không có. Không đổi truy vấn, không đổi giá trị lọc gửi lên server (`?hashtag=`/`?department=` vẫn
qua đường cũ, vẫn được `page.tsx` chuẩn hoá).

## Status Note

**INCOMPLETE** — CSS/component implementation for dropdown styling (panel, item active state, `#` prefix on hashtags) is done and GREEN on visual validation. However, 4 e2e assertions (`C04`/`C14`/`C15`/`[C32]`) were NOT added to `tests/e2e/kudos.spec.ts` per orchestrator's restriction on spec.ts edits. The component logic ships but automated e2e validation of the visual changes is deferred.

## Next Steps

Phase cuối của chuỗi `tests/e2e/kudos.spec.ts` (02 → 03 → 10). Sau đây file này rảnh. **PENDING:** Add [C32]/C04/C14/C15 assertions as future E2E coverage work.

## MoMorph refs:
- Dropdown hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/JWpsISMAaM
- Dropdown phòng ban: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/WXK5AYB_rG
- Kudos Live Board (cha): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F007_KudosLiveBoard/`
  (plan này không có `clarifications.md`; `plans/260907-1725-kudos-live-board/clarifications.md`
  **không** hề nhắc 2 frame dropdown này — đó chính là gốc của gap)
- testPolicy: visual-contract
