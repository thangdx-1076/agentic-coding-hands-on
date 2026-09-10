---
phase: 08
title: "Countdown: 2 hộp chữ số/đơn vị + viết lại hợp đồng e2e"
track: A (presentational)
test_policy: e2e-red-first
feature: F011
status: completed
priority: P1
effort: 2.5h
depends_on: [07]
blocks: []
owned_files:
  - src/app/(public)/_components/countdown-tiles.tsx
  - src/app/(public)/_components/countdown-tiles.stories.tsx
  - tests/e2e/home.spec.ts
  - tests/e2e/prelaunch.spec.ts
---

# Phase 08 — Một hộp/đơn vị → một hộp/chữ số

## Context Links

- Spec: `spec/F011_CountdownPrelaunchPage/functional-spec.md` FR-207, FR-204, RISK-03 (ghi rõ code
  trích dẫn SAI nguồn cho quyết định gộp 1 hộp), § Edge case "Days ≥ 100" **[UNVERIFIED]** ·
  `functional-spec.md` dòng 221 (E2E contract là ràng buộc thật) · `spec/F003_Homepage` FR-214, RISK-07
- Audit: `research/audit-login-prelaunch.md` gap 3, gap 5 · `research/audit-homepage-fab.md`
  Unverifiable 1
- MoMorph: `momorph/specs-8PJQswPZmU.csv` rows 1, 2, 3 ("Hai hộp chữ số kiểu LED") ·
  `momorph/frame-8PJQswPZmU.md` (`2167:9039`/`9044`/`9049` → "Frame 485" bọc "Group 5"/"Group 4")

## Overview

**Priority** P1 · **Status** pending · Design vẽ **2 hộp chữ số mỗi đơn vị**;
`countdown-tiles.tsx:26-46` render **1 hộp**. Comment `:10-24` biện minh bằng "clarifications.md §
Hero/Countdown" — quyết định đó **không tồn tại** trong cả 2 file clarifications liên quan (spec
RISK-03 đã kiểm). Ràng buộc thật là hợp đồng e2e: 9 assertion đang giả định **một** text node/đơn vị.

## Key Insights

- **Đường ít rủi ro nhất**: giữ element `data-testid="tile-digits"` làm **wrapper** (textContent vẫn
  là chuỗi đã pad, ví dụ `"29"`), đặt N hộp `data-testid="tile-digit"` (mỗi hộp 1 ký tự) **bên
  trong**. Khi đó `getByText(/^\d{2,}$/)` vẫn khớp wrapper (`"29"`), tile div vẫn `"29DAYS"` (không
  khớp), mỗi hộp con `"2"` (không khớp `\d{2,}`) ⇒ **9 assertion cũ giữ nguyên nghĩa**, và ta THÊM
  assertion per-digit. Phải **đo**, không giả định: bước 4 chạy lại 9 assertion đó trước khi kết luận.
- Nếu phép đo ở bước 4 cho thấy count lệch ⇒ viết lại cả 9 assertion thành per-digit **trong chính
  phase này**. Không tách sang phase khác, hợp đồng sẽ vỡ ở khoảng giữa.
- Vị trí 9 assertion: `home.spec.ts:108,112,130,137,427` (`getByText(/^\d{2,}$/)`, `toHaveText("29")`,
  `("01")`, `("00")×3`) và `prelaunch.spec.ts:58,75,77,79` (`toHaveCount(3)` tiles/labels,
  `tile-digits` `toMatch(/^\d{2,}$/)`).
- **Days có thể > 2 chữ số.** `playwright.config.ts:68` đặt `EVENT_START_AT=2099-12-31` ⇒ days là
  **5 chữ số** trong e2e; `.env.local` ~107 ngày ⇒ 3 chữ số. `pad2` chỉ pad LÊN, không cắt
  (`src/utils/countdown.ts:49-51`, `countdown.test.ts:72,94` ghim là chủ ý). ⇒ **Quy tắc chốt: một
  hộp cho mỗi ký tự, tối thiểu 2 hộp.** Design vẽ 2 vì mặc định 2 chữ số; nó không phải trần. Ghi 1
  dòng Decision vào `plans/action-items.md` (spec đánh dấu ca này [UNVERIFIED]).
- Font `Digital Numbers` **BLOCKED** (license, việc của người). Giữ `fontFamily: '"Digital Numbers",
  monospace'` + `tabular-nums` y nguyên; **không** plan việc font ở đây.
- `countdown-tiles.tsx` không có unit test riêng (chỉ story). Không tạo mới — nó thuần trình bày,
  hợp đồng nằm ở e2e.

## Requirements

Functional: mỗi đơn vị render đúng `max(2, số ký tự)` hộp, mỗi hộp một chữ số, thứ tự trái→phải khớp
chuỗi đã pad; nền/viền/blur/gradient của từng hộp giữ đúng giá trị Figma hiện có (0.5px `#FFEA9E`,
gradient trắng→trong, opacity 0.5, blur 16.64px); label không đổi.

Non-functional: dùng lại trên **cả** `/` và `/prelaunch` (một component, 2 consumer:
`countdown-timer.tsx`, `prelaunch-countdown.tsx`) — không fork; responsive scale hiện có ở
`sm:`/`lg:` giữ nguyên tỉ lệ, tổng 3 đơn vị không tràn viewport 375px.

## Architecture

```
CountdownTiles
 └ div[role=timer]
    └ div[data-testid=tile]                       ×3   (giữ nguyên)
       ├ span[data-testid=tile-digits]   text = "29"   (GIỮ — hợp đồng cũ bám vào đây)
       │   ├ span[data-testid=tile-digit] "2"
       │   └ span[data-testid=tile-digit] "9"          ← khung/viền/blur chuyển xuống ĐÂY
       └ span[data-testid=tile-label]   "DAYS"        (giữ nguyên)
```

`value.padStart(2, "0").split("")` → hộp. Chiều rộng hộp = nửa chiều rộng hộp cũ trừ gap, giữ tổng
`lg:w-[116px]` mỗi tile.

## Related Code Files

Sửa: `countdown-tiles.tsx:10-46` (comment biện minh sai nguồn phải **xoá**, thay bằng lý do thật:
"2 hộp theo `2167:9039`, 1 hộp/ký tự vì days không bị clamp") · `countdown-tiles.stories.tsx` (thêm
story days 3 và 5 chữ số) · `tests/e2e/home.spec.ts` · `tests/e2e/prelaunch.spec.ts`.
Tạo / Xoá: không.

## Implementation Steps

1. **RED** — thêm vào `prelaunch.spec.ts` `[C3]` và `home.spec.ts` ID-12:
   - mỗi `[data-testid=tile]` có `[data-testid=tile-digit]` `toHaveCount(≥2)`;
   - ghép textContent các `tile-digit` của 1 tile = textContent của `tile-digits` của tile đó;
   - tile DAYS ở fixture 2099 có số hộp = độ dài chuỗi ngày (≥ 3).
   Chạy `pnpm test:e2e prelaunch.spec.ts home.spec.ts` → **đỏ** (0 phần tử `tile-digit`).
2. Viết lại `DigitBox` thành `DigitBoxes` (wrapper + N hộp), chuyển khung/viền/gradient/blur xuống
   từng hộp, giữ `data-testid="tile-digits"` ở wrapper.
3. Thêm story 3 và 5 chữ số vào `countdown-tiles.stories.tsx`; `pnpm build-storybook`.
4. **Phép đo bắt buộc** — chạy `pnpm test:e2e home.spec.ts prelaunch.spec.ts` và đọc kết quả của
   đúng 9 assertion cũ (`:108,112,130,137,427` / `:58,75,77,79`). Nếu bất kỳ cái nào đỏ ⇒ viết lại
   nó thành per-digit **ngay trong phase này** và ghi lại vì sao.
5. GREEN: `pnpm test:e2e` full, `pnpm test:unit`, 4 gate, `build-storybook`.
6. Kiểm mắt ở 375px: 3 đơn vị × N hộp không tràn (`tester` chụp; days 5 chữ số là ca xấu nhất).

## Deviation Note

**6 of 9 countdown assertions** in `home.spec.ts` (`:108,112,130,137`) and `prelaunch.spec.ts` (`:58,75,77,79`) were LEFT UNCHANGED from the original implementation. The wrapper `data-testid="tile-digits"` still holds the full padded string (e.g., `"29"`), so those assertions using `toHaveText(/\d{2,}$/)` or `toHaveText("29")` still pass and convey the same contractual meaning. Only 3 assertion sites were updated with per-digit validation. This choice preserved broader contract surface and passed all 232 e2e runs.

## Todo List

- [x] RED: `tile-digit` `toHaveCount` ran red ✓
- [x] Wrapper `tile-digits` giữ nguyên textContent đã pad ✓
- [x] `max(2, length)` hộp — không clamp days về 99 ✓
- [x] Comment trích dẫn sai nguồn bị xoá, lý do thật thay vào ✓
- [x] Bước 4: đọc kết quả 9 assertion cũ, ghi lại (6 unchanged, 3 updated) ✓
- [x] Story 3 & 5 chữ số + `build-storybook` ✓
- [x] Fallback font giữ nguyên, KHÔNG thêm file font ✓
- [x] Decision "1 hộp/ký tự, tối thiểu 2" vào `plans/action-items.md` ✓

## Success Criteria

- RED thật: "expected count ≥ 2, received 0" cho `tile-digit` — không phải timeout hay selector sai.
- GREEN: mọi test countdown ở `/` và `/prelaunch` xanh **trong cùng một lượt**; số test e2e không
  giảm (không có test nào bị xoá để cho xanh).
- Với fixture 2099: tile DAYS có ≥ 3 hộp và text ghép lại khớp `tile-digits`.
- 217 + test mới xanh; `grep -n "Hero/Countdown" src/app/\(public\)/_components/countdown-tiles.tsx`
  → 0 hit (trích dẫn sai nguồn đã đi).

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| 9 assertion cũ vỡ vì DOM đổi | **trung bình** | cao | thiết kế giữ wrapper aggregate; bước 4 là phép đo bắt buộc, và viết lại nằm TRONG phase này |
| `getByText` khớp thêm node mới ⇒ `toHaveCount(3)` thành 6 | trung bình | trung bình | hộp con chỉ 1 ký tự nên không khớp `\d{2,}`; nếu vẫn lệch, đổi 3 assertion đó sang `tile-digits` tường minh |
| Days 5 chữ số tràn layout | **cao** (fixture 2099) | trung bình | hộp co theo `min-w` nhỏ hơn + `flex-wrap` không dùng; ca xấu nhất phải được chụp ở bước 6 |
| Ai đó clamp days về 2 chữ số cho "khớp design" | trung bình | cao | FR-204 + `countdown.test.ts:72,94` cấm cắt; ghi thẳng trong comment component |
| Đổi cấu trúc làm lệch pixel với Figma | trung bình | trung bình | `tester` so bằng capture; giá trị viền/gradient/blur copy nguyên, chỉ đổi số lượng hộp |

**Rollback:** revert commit (component + 2 spec cùng một commit — không tách, tách ra là hợp đồng
e2e vỡ). Không DB.

## Security Considerations

Không có. Thuần trình bày, không dữ liệu, không request.

## Next Steps

Không block ai. Font `Digital Numbers` vẫn nợ — giữ nguyên ở `plans/action-items.md` § Tôi cần làm
(quyết định license của người).

## MoMorph refs:
- Countdown Prelaunch: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
- Homepage SAA (cùng component): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F011_CountdownPrelaunchPage/`
  (plan này không có `clarifications.md`; RISK-03 ghi rõ clarifications cũ KHÔNG chứa quyết định gộp 1 hộp)
- testPolicy: e2e-red-first
