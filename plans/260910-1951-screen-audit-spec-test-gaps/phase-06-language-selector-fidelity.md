---
phase: 06
title: "Bộ chọn ngôn ngữ: cờ theo locale, item active, persistence e2e"
track: A (presentational)
test_policy: e2e-red-first
feature: F002
status: completed
priority: P1
effort: 2.5h
depends_on: [05]
blocks: []
owned_files:
  - src/app/_components/language-selector/icon-en-flag.tsx
  - src/app/_components/language-selector/icon-en-flag.stories.tsx
  - src/app/_components/language-selector/language-selector.tsx
  - src/app/_components/language-selector/language-selector.stories.tsx
  - tests/e2e/language-switch.spec.ts
  - tests/e2e/login.spec.ts
---

# Phase 06 — Menu ngôn ngữ khớp `hUyaaugye2` + persistence có chứng cứ

## Context Links

- Spec: `spec/F002_LanguageSwitch/functional-spec.md` FR-201, FR-203, RISK-04, RISK-05, CAP-01 ·
  `technical-spec.md` § 3.1 "Known Gap", § 4.1 (`IconEnFlag` → `icon-en-flag.tsx`), § 5.1 SC-005
- Audit: `research/audit-awards-language.md` gap 1, 2, 3, 5, 11, 12 ·
  `research/audit-login-prelaunch.md` gap 2, gap 9, gap 10
- **verified R1**: "EN state undesigned" là SAI — `hUyaaugye2` row A.2 tả rõ cờ Anh + label EN,
  110×56px, nền tối. Có design, code không làm.
- Render đã xem thật (ghi trong brief): panel tối bo góc, dòng VN nền sáng hơn (đang chọn) + cờ Việt
  Nam, dòng EN gần đen + cờ Union Jack.

## Overview

**Priority** P1 · **Status** pending · `language-selector.tsx:62` hardcode `IconVnFlag` ⇒ bật EN vẫn
thấy cờ Việt Nam; `:95` render chỉ chữ, không cờ; `:93` mọi option cùng class ⇒ không phân biệt được
lựa chọn đang active. Repo **không có** icon cờ Anh nào. Và không có
`tests/e2e/language-switch.spec.ts` — persistence qua reload chưa từng được assert ở browser.

## Key Insights

- **Đừng đổi `role="menuitem"`.** Audit gap 3 đề xuất `menuitemradio` + `aria-checked`; làm vậy là
  phá ~15 selector `[role="menuitem"]` đang chạy ở `login.spec.ts:145,146,373,398,414,421,437,444,
  460,467,483,490,551,552` và `home.spec.ts:379,396`. Spec F002 FR-203 **không** yêu cầu role mới —
  chỉ yêu cầu "nền phân biệt". Dùng `aria-current="true"` (hợp lệ trên mọi element, không đổi role)
  + nền của design. Đây là quyết định, ghi vào `plans/action-items.md` § Decisions.
- `login.spec.ts:145-146` chọn item bằng `:has-text("VN")` ⇒ thêm icon vào trong button **không**
  làm vỡ; vẫn phải chạy full để chứng minh.
- Trigger đang `w-[108px]` (`:47`) và menu `min-w-[108px]` (`:83`). Option 110px rộng hơn menu ⇒
  phải nới menu, nếu không option bị tràn/co. Row A.2 nói 110×56; audit gap 11 xếp 108-vs-110 là
  minor ⇒ **giữ trigger 108**, chỉ đặt option đúng 110×56 và nới `min-w` của menu cho khớp.
- Cookie: `maxAge` 31536000, `sameSite` lax, path `/` — đọc từ `src/app/_actions/set-locale.ts:25-43`,
  không đoán.
- Persistence tự nó **đã đúng** hôm nay ⇒ nếu viết mỗi test persistence thì nó xanh ngay, không có
  RED. RED của phase là assertion **cờ theo locale** + **item active có nền khác**; test persistence
  đi cùng file như phần phủ bổ sung, không được kê thành bằng chứng RED.

## Requirements

Functional: (a) trigger hiện cờ đúng locale đang chạy; (b) mỗi option hiện cờ riêng + nhãn; (c)
option đang chọn có nền phân biệt + `aria-current="true"`; (d) mỗi ô option 110×56px, nền tối; (e)
chọn EN → reload → nội dung vẫn EN và cookie `NEXT_LOCALE=en` với `maxAge`/`sameSite` đúng.

Non-functional: `icon-en-flag.tsx` là inline SVG (không thêm file ảnh), cùng API `className` như
`icon-vn-flag.tsx`; điều hướng bàn phím của `useMenuKeyboardNav` không đổi hành vi.

## Architecture

```
icon-en-flag.tsx   (MỚI — Union Jack, inline SVG, viewBox + className như icon-vn-flag)
        ↓
language-selector.tsx
   FLAG: Record<"VN"|"EN", ComponentType<{className?}>>   ← thay hardcode :62
   trigger  → FLAG[label]
   option   → FLAG[option.label] + nhãn; aria-current={option.label === label}
              class: nền phân biệt khi active; h-14 w-[110px] (56px cao)
   menu     → min-w khớp 110px
```

Không đổi `role`, không đổi `onSelect`, không chạm `use-select-locale.ts` /
`_actions/set-locale.ts` (khác chủ).

## Related Code Files

Tạo: `icon-en-flag.tsx` + `.stories.tsx` · `tests/e2e/language-switch.spec.ts`.
Sửa: `language-selector.tsx:47,62,83,85-97,93` · `language-selector.stories.tsx:43-47` (story
`English` đang ghim đúng cái visual sai) · `tests/e2e/login.spec.ts` (4 TC trống: `98e20775` cờ +
chevron, `c18649fa` shadow hover nút, `cb42461d` hover/cursor selector, `5f1cbabd` mặc định "VN";
và 2 assertion tautology `:175`, `:687` → `new URL(page.url()).pathname`).
Xoá: `<IconVnFlag />` hardcode ở `:62`.

**Note:** `icon-en-flag.stories.tsx` was written by orchestrator (not in phase dispatch); 4 Login TCs remain unbuilt (not in phase dispatch). These are logged as debt in `plans/action-items.md`.

## Implementation Steps

1. **RED** — `tests/e2e/language-switch.spec.ts` (không tag ⇒ chạy được trên CI):
   - `[LS1]` locale mặc định: trigger có đúng 1 `svg` cờ VN (`data-testid="flag-vn"`).
   - `[LS2]` mở menu: mỗi `[role="menuitem"]` có đúng 1 svg cờ (`toHaveCount(1)` mỗi item) — hôm nay
     0 ⇒ **đỏ**.
   - `[LS3]` item ứng với locale hiện tại có `aria-current="true"` và `background-color` khác item
     còn lại (`toHaveCSS`) — hôm nay cùng class ⇒ **đỏ**.
   - `[LS4]` chọn EN → trigger có cờ EN (`data-testid="flag-en"`) — hôm nay vẫn cờ VN ⇒ **đỏ**.
   - `[LS5]` chọn EN → `page.reload()` → nội dung vẫn EN **và** cookie `NEXT_LOCALE` từ
     `context.cookies()` có `value === "en"`, `sameSite === "Lax"`, `expires` ≈ now + 31536000s
     (sai số ±120s). *(Phần phủ bổ sung — dự kiến xanh ngay, KHÔNG kê làm bằng chứng RED.)*
   Chạy `pnpm test:e2e language-switch.spec.ts` → ghi exit code + tên 3 assertion đỏ (LS2/LS3/LS4).
2. Viết `icon-en-flag.tsx`: Union Jack inline SVG, cùng API `className` như `icon-vn-flag.tsx`.
   `icon-vn-flag.tsx` **không** thuộc phase này ⇒ đặt `data-testid="flag-vn"`/`"flag-en"` trên
   `<span>` bọc icon trong `language-selector.tsx`, đừng sửa file icon VN.
3. Map `FLAG[label]`, render cờ trong option, `aria-current`, nền active, ô 110×56, nới `min-w` menu.
4. Sửa story `English` cho đúng; thêm story `icon-en-flag`.
5. Sửa `login.spec.ts`: 4 TC trống + 2 tautology. `98e20775` = 1 svg cờ + 1 svg chevron trong header;
   `c18649fa`/`cb42461d` = `toHaveCSS("box-shadow"|"cursor")` sau `hover()`; `5f1cbabd` = trigger
   `toHaveText(/VN/)` khi không có cookie.
6. GREEN: `pnpm test:e2e` full (217 + mới), `pnpm test:unit`, 4 gate, `pnpm build-storybook`.

## Todo List

- [ ] RED: LS2/LS3/LS4 đỏ với lý do đúng (không có svg / cùng background / cờ sai)
- [ ] `icon-en-flag.tsx` inline SVG, cùng API `className`
- [ ] `role="menuitem"` KHÔNG đổi (grep xác nhận), dùng `aria-current`
- [ ] Option 110×56, menu `min-w` khớp
- [ ] Story `English` không còn ghim visual sai
- [ ] 4 TC login trống có assertion thật; 2 tautology thành `pathname`
- [ ] GREEN + 4 gate + `build-storybook` + e2e full
- [ ] 1 dòng Decision trong `plans/action-items.md` về `aria-current` thay `menuitemradio`

## Success Criteria

- RED thật ×3: LS2 "expected 1 svg, received 0"; LS3 hai background-color bằng nhau; LS4 cờ VN khi
  locale EN. Không assertion nào đỏ vì selector/timeout.
- GREEN: `grep -c 'role="menuitem"' src/app/_components/language-selector/language-selector.tsx` = 1
  (không thành `menuitemradio`).
- `login.spec.ts`: `grep -n 'toContain("/")' tests/e2e/login.spec.ts` → 0 hit.
- 217 e2e cũ + test mới xanh; `build-storybook` không lỗi.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Đổi role phá ~15 assertion | **cao nếu làm theo audit** | cao | quyết định: giữ `menuitem` + `aria-current`; grep ở Success Criteria chốt lại |
| Thêm svg vào option phá `:has-text("VN")` | thấp | trung bình | text vẫn nằm trong button; bước 6 chạy full để chứng minh, không suy luận |
| `toHaveCSS("box-shadow")` flaky vì transition | trung bình | thấp | `hover()` rồi dùng auto-retry của `toHaveCSS`; nếu vẫn flaky, assert `cursor` (không có transition) |
| SVG Union Jack sai tỉ lệ/màu so với design | trung bình | trung bình | dựng theo tỉ lệ 24×24 như `icon-vn-flag`; `tester` chốt bằng capture ở bước visual validation |
| `expires` cookie lệch do thời gian chạy | trung bình | thấp | so sánh có sai số ±120s, không so tuyệt đối |

**Rollback:** revert commit; xoá `icon-en-flag.tsx`. Không DB.

## Security Considerations

Không đổi đường ghi cookie (`set-locale.ts` ngoài phạm vi) ⇒ `httpOnly`/`sameSite`/normalize
path-traversal giữ nguyên. Test chỉ **đọc** cookie, không set trực tiếp để giả trạng thái.

## Next Steps

Không block ai. Nếu `tester` thấy Union Jack lệch design, trả bounded fix về đúng phase này, không
nới lỏng assertion.

## MoMorph refs:
- Dropdown chọn ngôn ngữ: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/hUyaaugye2
- Login (nơi selector sống trong header): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F002_LanguageSwitch/`
  (plan này không có `clarifications.md`)
- testPolicy: e2e-red-first
