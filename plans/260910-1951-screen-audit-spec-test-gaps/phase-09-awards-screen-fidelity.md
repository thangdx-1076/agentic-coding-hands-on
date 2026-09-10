---
phase: 09
title: "Awards: typography caption + indicator underline + hover item active"
track: A (presentational)
test_policy: visual-contract
feature: F004
status: completed
priority: P2
effort: 1.5h
depends_on: []
blocks: []
owned_files:
  - src/app/(public)/awards/_components/awards-screen.tsx
  - src/app/(public)/awards/_components/award-category-nav.tsx
  - src/app/(public)/awards/_components/award-category-nav.stories.tsx
  - tests/e2e/awards.spec.ts
---

# Phase 09 — `/awards` khớp lại 3 dòng CSV còn lệch

## Context Links

- **Không có spec revision cho F004** trong `spec/` — nguồn chốt là `momorph/specs-zFYDgyj_pD.csv`
  rows `A`, `C`, `C.1`–`C.6` + `momorph/test-cases-zFYDgyj_pD.csv` TC ID-2, ID-4, ID-9, ID-10, ID-12
  + `docs/vi/features/F004_AwardSystemPage/`
- Audit: `research/audit-awards-language.md` gap 6, 7, 8, 13, 14 · verdict "Hệ thống giải: UI GAP,
  Logic PASS, 4/15 TC trống"

## Overview

**Priority** P2 · **Status** pending · Ba lệch: caption "Sun* annual awards 2025" phải "nhỏ và nhạt"
(row `A`, TC ID-4) nhưng đang `text-2xl leading-8 font-bold text-white` (`awards-screen.tsx:87-89`);
indicator active ở desktop phải là **underline vàng** (rows `C`/`C.1`–`C.6`, TC ID-9) nhưng từ `lg`
code chuyển sang viền trái (`award-category-nav.tsx:19-20` `lg:border-b-0 lg:border-l-2`); item đang
active mất hẳn phản hồi hover vì `hover:bg-white/10` chỉ nằm ở `LINK_INACTIVE` (`:21-22`).

## Key Insights

- `test_policy: visual-contract` — phase này **không** đổi hành vi nào: typography, viền, hover. Không
  kê bằng chứng RED/GREEN. `tester` chốt bằng capture Playwright MCP sau khi code xong.
- TC ID-2 (click nav header → `/awards`) và ID-12 (click "Chi tiết" → `/kudos`) là **phủ lại
  coverage** cho hành vi đã chạy đúng hôm nay, không phải TDD. Ghi đúng như vậy, đừng gọi là red.
  (ID-12 từng bị hoãn vì `/kudos` chưa tồn tại — giờ đã có `src/app/(public)/kudos/page.tsx`.)
- **Đừng gộp** ID-2 vào `home.spec.ts`: nó đang do phase 07/08 sở hữu. Đặt ở `awards.spec.ts` (assert
  `/awards` `h1` sau khi click nav header) — file này chỉ phase 09 sở hữu.
- Giá trị "nhỏ và nhạt": CSV chỉ ghi prose, **không có** hex/px (verified V7, Unverifiable 2). Dùng
  token đã có trong repo (`text-sm` + `text-white/60`), ghi rõ trong comment rằng đây là token của
  repo, không phải giá trị đọc từ node. Nếu `tester` so capture với render Figma thấy lệch ⇒ sửa 1
  lần theo giá trị đo được, không đoán vòng hai.
- Chuyển `hover:bg-white/10` vào `LINK_BASE` phải kiểm cả 2 nhánh breakpoint — `LINK_ACTIVE` và
  `LINK_INACTIVE` đều đang tự khai `border-*`, dễ chồng lệnh.
- Row `D.1`/`D.1.2` "10 Đơn vị" vs seed `'10','Cá nhân'` (audit gap 9): **không sửa seed**. Đây là
  việc `upload_specs` của người.

## Requirements

Functional (trình bày): caption nhỏ + nhạt; item nav active có underline vàng ở **mọi** breakpoint
kể cả `lg`; mọi item nav (active hay không) đều phản hồi hover.

Non-functional: giữ nguyên hành vi scroll-spy + click-to-scroll (`use-award-category-nav.ts:109-126`)
— phase này không chạm hook; giữ đúng MỘT `<nav aria-label>` render (không fork theo breakpoint).

## Architecture

```
awards-screen.tsx:87-89   <p> caption  → text-sm text-white/60 (bỏ text-2xl font-bold text-white)
award-category-nav.tsx
  LINK_BASE     += hover:bg-white/10          ← để item ACTIVE cũng phản hồi
  LINK_ACTIVE   : border-b border-login-button  (BỎ lg:border-b-0 lg:border-l-2)
  LINK_INACTIVE : border-b border-transparent   (BỎ lg:border-b-0 lg:border-l-2 lg:border-transparent)
                  bỏ hover:bg-white/10 (đã lên BASE)
```

`lg:pl-[14px]` từng bù cho viền trái — bỏ viền thì bỏ luôn phần bù, nếu không chữ lệch 14px ở desktop.

## Related Code Files

Sửa: `awards-screen.tsx:87-89` · `award-category-nav.tsx:17-22` · `award-category-nav.stories.tsx`
(story active/hover ở viewport `lg`) · `tests/e2e/awards.spec.ts` (ID-4 computed style; ID-9/ID-11
thêm assert underline + đủ 6 item thay vì 4/3; ID-10 hover; ID-2 click nav header; ID-12 click
"Chi tiết").
Tạo / Xoá: không.

## Implementation Steps

1. Sửa caption ở `awards-screen.tsx:87-89`, kèm comment nêu: giá trị là token repo, CSV chỉ ghi prose.
2. Sửa 3 hằng class ở `award-category-nav.tsx`; bỏ `lg:pl-[14px]` cùng lúc với viền trái.
3. `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm format:check && pnpm build-storybook`.
4. Thêm assertion vào `awards.spec.ts` (**sau** khi code xong — visual-contract, không kê RED):
   - ID-4: `toHaveCSS("font-size", "14px")` + `toHaveCSS("font-weight", "400")` cho caption.
   - ID-9: sau khi click item, item active `toHaveCSS("border-bottom-width", "1px")` ở viewport `lg`;
     mở rộng vòng lặp lên **đủ 6** item (đang 4).
   - ID-11: mở rộng lên đủ 6 item, đúng 1 item active.
   - ID-10: `hover()` một item **đang active** ⇒ `background-color` khác lúc chưa hover.
   - ID-2: `goto("/")` → click nav header "Awards Information" → `/awards` `h1` visible.
     ⚠ Nhãn này do **phase 07** đổi. Nếu phase 07 chưa merge, dùng `href`-based locator
     (`header a[href="/awards"]`) để không phụ thuộc chuỗi.
   - ID-12: click "Chi tiết" của khối Sun* Kudos ⇒ `toHaveURL(/\/kudos/)`.
5. `pnpm test:e2e awards.spec.ts` → xanh; rồi `pnpm test:e2e` full.
6. `tester`: capture `/awards` ở 375/768/1440, so với render Figma `zFYDgyj_pD`; nhớ `rm -r
   .playwright-mcp/` trước `format:check`, và scroll trước khi chụp (ảnh lazy).

## Todo List

- [ ] Caption `text-sm text-white/60` + comment nguồn giá trị
- [ ] Underline vàng giữ ở `lg`; `lg:border-l-2` và `lg:pl-[14px]` cùng đi
- [ ] `hover:bg-white/10` lên `LINK_BASE`, xoá khỏi `LINK_INACTIVE`
- [ ] ID-9 / ID-11 phủ đủ 6 item
- [ ] ID-2 dùng locator `href` nếu phase 07 chưa merge
- [ ] `pnpm test:e2e` full + 4 gate + storybook
- [ ] Capture 3 viewport, dọn `.playwright-mcp/`

## Success Criteria

- `grep -n "lg:border-l-2" src/app/\(public\)/awards/_components/award-category-nav.tsx` → 0 hit.
- `grep -n "text-2xl" src/app/\(public\)/awards/_components/awards-screen.tsx` → không còn ở dòng
  caption.
- `awards.spec.ts`: ID-9 và ID-11 lặp qua 6 item (đếm được trong code test), ID-2/ID-10/ID-12 có
  assertion thật.
- 217 e2e + test mới xanh; 4 gate + `build-storybook` sạch.
- Không có claim RED/GREEN nào trong báo cáo của phase này (visual-contract).

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Bỏ viền trái làm sidebar `lg` mất mốc thị giác | trung bình | trung bình | underline vàng + text-shadow đã là mốc; `tester` chốt bằng capture `lg`, không bằng cảm giác |
| Quên bỏ `lg:pl-[14px]` ⇒ chữ lệch 14px | **cao** | thấp | ghi thành 1 checklist item riêng |
| `toHaveCSS("font-size")` lệch vì `rem` scale | trung bình | thấp | `text-sm` = 14px ở root 16px mặc định; nếu repo đổi root thì assert bằng giá trị đọc được, không hardcode lại |
| ID-2 vỡ vì nhãn nav đổi ở phase 07 | trung bình | thấp | locator theo `href`, không theo text |
| `.playwright-mcp/` làm `format:check` đỏ | **cao** | thấp | `rm -r .playwright-mcp/` trước gate (đã từng xảy ra) |

**Rollback:** revert commit. Không DB, không migration.

## Security Considerations

Không có. Thuần class CSS trên route công khai; không đổi `src/dal/awards.ts` (fail-open giữ nguyên).

## Next Steps

Không block ai. `upload_specs` cho row `D.1`/`D.1.2` ("Đơn vị" → "Cá nhân") và row `3` (alt text tự
mâu thuẫn) là việc của người — ghi vào `plans/action-items.md` § Tôi cần làm.

## MoMorph refs:
- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
- Clarifications: `plans/260906-2258-award-system-page/clarifications.md` (bản đã ký của màn này;
  plan hiện tại không có `clarifications.md` và **không có** spec revision F004)
- testPolicy: visual-contract
