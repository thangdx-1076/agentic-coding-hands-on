---
title: "Phase 8 — panel UI, badge số 9+, role=dialog"
feature: F012
status: completed
priority: P1
effort: 3h
owner: momorph-ui-implementer
testPolicy: e2e-red-first
result: notification-bell.tsx + notifications/ (panel + item + icons); badge số/9+; role=dialog; story + play xanh
---

# Phase 8 — panel UI + badge

## Context Links

- MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/6-1LRz3vqr (frame `589:9132`)
- [clarifications.md](clarifications.md) § Badge
- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 5 (**Rủi ro đã biết:
  `useMenuKeyboardNav`**)
- `src/app/_components/notification-bell.tsx` (docblock giải thích lựa chọn `role="dialog"` hiện tại)
- `src/hooks/use-menu-keyboard-nav.ts:36-64` (docblock: `itemCount` cố định trong một vòng đời)
- Skill `separate-hook-logic-from-components`, `write-unit-tests-and-storybook-stories`

## Overview

**Priority** P1 · **Status** pending · Depends on: 05 (hook), 07 (prop contract). Chặn 09.

Sửa chuông tại chỗ (badge chấm → badge số) và gắn panel thật. Không tạo bản "enhanced" song song.

## Key Insights — quyết định #1, đã chốt

1. **Panel giữ `role="dialog"`. KHÔNG mở rộng `useMenuKeyboardNav`.**

   | | Mở rộng hook thành `role="menu"` | **Giữ `role="dialog"`** (chọn) |
   |---|---|---|
   | ARIA | `menu` đòi con **đồng nhất** `menuitem`. Panel có heading + nút "Đánh dấu đọc tất cả" + danh sách + nút "Xem thêm" ⇒ dùng `menu` là **sai pattern**, không phải chỉ bất tiện | Nội dung hỗn hợp neo vào nút = đúng `dialog` (APG) |
   | Hook dùng chung | `itemCount` cố định một vòng đời; danh sách đổi độ dài khi "Xem thêm" ⇒ phải thêm cắt slot thừa trong `itemRefs` + kẹp `activeIndex`. Hook có **3 consumer** (`account-menu`, `language-selector`, `kudos-filter-menu`) ⇒ phải là **phase prereq riêng** trước cả Track A, kèm rủi ro hồi quy 3 màn | Không chạm hook, 0 hồi quy |
   | Bằng chứng có sẵn | phải viết lại | `notification-bell.stories.tsx:59-68` đã assert `role="dialog"`; e2e phase 01 cũng vậy |
   | Mất gì | — | Không có Arrow/Home/End chạy vòng qua từng thông báo |

   **Chốt**: giữ `dialog`. Spec không đòi điều hướng mũi tên; Tab tự nhiên theo DOM là đủ và đúng
   cho nội dung hỗn hợp. YAGNI + không chạm hook chung.
2. **Escape đóng + trả focus về nút, click ra ngoài đóng** — hành vi này `notification-bell.tsx:35-58`
   **đã có**; giữ nguyên, chỉ chuyển phần state sang `useNotifications` để component thôi giữ logic.
3. **Badge cap `9+`** là quy tắc thuần ⇒ `formatBadgeCount(n)` trong `src/domain/notifications/`
   … **không**: đó là file phase 04 sở hữu. Đặt trong `notification-bell.tsx` là logic một dòng
   (`n > 9 ? "9+" : String(n)`) — giữ tại chỗ, `.tsx` không vào coverage nên e2e TC-004/005 là bằng
   chứng. Không tạo file mới chỉ để lách coverage.
4. **`.tsx` không nằm trong coverage allowlist** (`vitest.config.ts`) — bằng chứng của phase này là
   **e2e + Storybook play**, không phải unit coverage. Đừng cố đẩy logic vào `.tsx` rồi tưởng đã test.
5. **Bấm thân mục = mark-read, KHÔNG điều hướng** (FR-201). Không có deep-link ở v1 ⇒ item là
   `<button>`, không phải `<a>`.
6. **File < 200 dòng**: `notification-bell.tsx` hiện ~103 dòng; thêm panel vào là vượt ⇒ tách
   `_components/notifications/`.

## Requirements

FR-002 (badge số/ẩn/cap), FR-003 (mở/đóng, ngoài + Escape), FR-004 (tiêu đề + nút mark-all),
FR-005 (icon + message đậm + thời gian tương đối + chấm đỏ), FR-006 (trống, không "Xem thêm"),
FR-007, FR-101..103, FR-201/202, FR-502. TC-003..009, 015..018.

## Architecture

```
site-header.tsx ──▶ NotificationBell({ label, viewer.unreadCount, copy.notifications, locale })
  └── useNotifications(...)          ← phase 05
  └── <button aria-haspopup="dialog" aria-expanded> + badge span (số | "9+")
  └── open && <NotificationPanel role="dialog">
        ├── header: h2 copy.title · button copy.markAllRead
        ├── items.map ──▶ <NotificationItem>
        │      icon theo type · formatNotificationMessage(templates,row) · formatRelativeTime · chấm đỏ
        │      kudos_hidden ──▶ splitLinkTemplate ──▶ <Link href={ROUTES.STANDARDS}>
        ├── empty: copy.empty, KHÔNG có nút loadMore
        └── nextCursor && <button copy.loadMore>
```

## Related Code Files

**Sửa**: `src/app/_components/notification-bell.tsx`, `notification-bell.stories.tsx`
**Tạo**: `src/app/_components/notifications/notification-panel.tsx`,
`notification-item.tsx`, `icons/{icon-kudos,icon-heart,icon-box,icon-eye-off}.tsx`,
`notification-panel.stories.tsx`
**KHÔNG chạm**: `src/hooks/use-menu-keyboard-nav.ts` (**tuyệt đối**), `src/app/_hooks/**`,
`src/api/**`, `src/dal/**`, `messages/**`, `src/app/**/page.tsx`

## File ownership

```
src/app/_components/notification-bell.tsx (+ .stories.tsx)
src/app/_components/notifications/**
```

## Implementation Steps

1. Lấy dữ liệu hình từ MoMorph frame `589:9132`; **không đoán giá trị màu/khoảng cách**.
2. Badge: `unreadCount > 0 &&` span số, `> 9` → `"9+"`; giữ vị trí/màu `#D4271D` hiện có, đổi
   hình dạng theo design.
3. Tách `NotificationPanel` + `NotificationItem`; `"use client"` chỉ ở lá tương tác.
4. Nối `useNotifications`: mở panel → nạp; item click → `markRead`; nút → `markAllRead`;
   "Xem thêm" → `loadMore`, ẩn khi `nextCursor` null.
5. Icon: 4 file trong `_components/notifications/icons/` (theo skill: icon thuộc segment dùng nó).
6. Story: trạng thái trống · 3 mục có 1 chưa đọc · 10 mục + "Xem thêm" · `kudos_hidden` có link.
   Giữ `play` assert `role="dialog"` như story hiện có.
7. `pnpm lint --max-warnings 0 && pnpm format:check && pnpm build-storybook`.

## Todo List

- [x] badge số + cap `9+` (0 → no badge; 3 → "3"; 12 → "9+")
- [x] panel tách file, mỗi file < 200 dòng (panel + item + 4 icon)
- [x] 4 icon theo loại (kudos, heart, box, eye-off)
- [x] item = button, không điều hướng (mark-read on click)
- [x] link `/standards` render từ marker `splitLinkTemplate` (không `/community-standards`)
- [x] empty không có "Xem thêm"
- [x] 4 story + play giữ `role="dialog"` (assert role=dialog vẫn có)
- [x] `use-menu-keyboard-nav.ts` không nằm trong diff (drift gate passed)

## Success Criteria

- `git diff --name-only` **không** chứa `src/hooks/use-menu-keyboard-nav.ts`.
- `[role="dialog"]` chứa đúng 1 `h2` = copy.title và 1 nút = copy.markAllRead (TC-006).
- Badge: 0 → không có node badge; 3 → text "3"; 12 → text "9+" (TC-003/004/005).
- Item `kudos_hidden` chứa `a[href="/standards"]`, **không** `/community-standards` (TC-015).
- Trạng thái trống: không có nút "Xem thêm" (TC-008).
- Mọi file mới < 200 dòng; `pnpm build-storybook` xanh; `pnpm lint --max-warnings 0` xanh.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Ai đó "tiện tay" mở rộng hook chung | Trung | Cao (3 màn hồi quy) | criteria diff-gate ở trên |
| `notification-bell.tsx` phình > 200 dòng | Cao | Thấp | tách panel/item ngay từ bước 3 |
| Đoán giá trị visual thay vì đọc MoMorph | Trung | Trung | quy tắc MoMorph: dữ liệu design là nguồn đúng |
| Logic lọt vào `.tsx` rồi tưởng đã có coverage | Trung | Trung | Insight 4; logic thuần thuộc phase 04 |
| Playwright MCP để lại `.playwright-mcp/` làm đỏ `format:check` | Trung | Thấp | dọn trước khi chạy gate |

## Security Considerations

Panel chỉ render dữ liệu đã qua RLS. Với kudos ẩn danh, hiển thị đúng `payload.senderName` — không
gọi thêm API nào để "tra tên thật".

## Next Steps

Phase 09: GREEN + visual.
