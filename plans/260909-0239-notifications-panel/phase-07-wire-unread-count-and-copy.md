---
title: "Phase 7 — bơm unreadCount + copy notifications vào 4 điểm render header"
feature: F012
status: completed
priority: P1
effort: 1.5h
owner: implementer
result: SiteViewer.unreadCount bắt buộc; getViewer() gọi getUnreadCount; 4 page.tsx + story/test literal sửa; profile thêm unreadCount. PHẠM VI: +8 file (mỗi screen.tsx + client.tsx có prop unreadCount? mặc định 0)
---

# Phase 7 — wiring `unreadCount` + copy

## Context Links

- [clarifications.md](clarifications.md) § Nơi bơm `unreadCount` — "không có một chỗ", **không**
  gom về layout chung trong PR này
- [study](reports/researcher-260909-0244-study.md) § 5 (4 điểm render `SiteHeader`,
  `profile/page.tsx` không dùng `getViewer()`)
- `src/app/_shared/site-chrome.ts:88` (`SiteViewer`), `src/app/_utils/get-viewer.ts:21`,
  `src/app/_components/site-header.tsx:17-41`

## Overview

**Priority** P1 · **Status** pending · Depends on: 04 (`getUnreadCount`), 06 (khoá i18n). Chặn 08.

Đây là phase trả lời **quyết định #2**: làm sao mọi trang có header biết số chưa đọc mà không gom
về layout chung.

## Key Insights — quyết định #2, đã chốt

1. **`unreadCount` là field bắt buộc của `SiteViewer`, không phải prop riêng của `SiteHeader`.**
   Cả 4 màn **đã** truyền `viewer` xuống `SiteHeader` (`home-screen.tsx:85`, `awards-screen.tsx:60`,
   `kudos-screen.tsx:113`, `profile-screen.tsx:67`). Gắn số vào chính object đó ⇒ **0 file màn nào
   phải sửa**, và TypeScript trở thành thứ thay cho layout chung: quên bơm ở một trang là **lỗi
   biên dịch**, không phải badge âm thầm bằng 0 như hôm nay (`site-header.tsx:41` mặc định `0`).
2. **Chỉ có 2 nơi *sản xuất* `SiteViewer`**: `get-viewer.ts` (dùng bởi `/`, `/awards`, `/kudos`) và
   object dựng tay trong `profile/page.tsx:116`. Vậy chi phí thật là **2 chỗ**, không phải 4.
3. **Đánh đổi đã cân**: field **bắt buộc** làm gãy ~13 literal `SiteViewer` trong story/test
   (`get-viewer.test.ts`, `account-menu.stories.tsx`, `home-screen.stories.tsx`,
   `awards-screen.stories.tsx`, `profile-screen.stories.tsx`). Chọn bắt buộc chứ **không** chọn
   `unreadCount?: number`: field tuỳ chọn mua sự yên tĩnh bằng đúng cái lỗi mà feature này sinh ra
   để sửa (badge luôn 0 vì không ai truyền). Sửa 13 literal là chi phí một lần và máy chỉ ra tận nơi.
4. **Không refactor `profile/page.tsx` sang `getViewer()`.** Study nêu nó lặp logic; đây là món nợ
   có sẵn, gộp vào đây là trộn hai thay đổi vào một PR. Chỉ thêm đúng một lời gọi `getUnreadCount`.
   Ghi một dòng nợ vào `plans/action-items.md`.
5. **Copy thì không đi cùng `viewer` được** — nó là i18n, không phải dữ liệu người dùng. Gom churn
   vào **một** helper server `get-notifications-copy.ts`; 4 `page.tsx` mỗi trang gọi một dòng và
   nhét vào `copy.notifications`. Không trang nào tự viết lại cây `types.*`.
6. **Fail-open giữ nguyên tinh thần `getViewer`**: `getUnreadCount` đã fail-open `0` ở phase 04 —
   Supabase hỏng thì header vẫn render, badge chỉ mất số.

## Requirements

FR-002 (badge số, ẩn khi 0, cap `9+` — phần render ở phase 08; phần *có số thật* ở đây),
FR-501/502 (copy tới được panel). TC-003/004/005.

## Architecture / Data flow

```
(home)/page.tsx ─┐
awards/page.tsx ─┼─▶ getViewer() ──▶ { email, isAdmin, unreadCount }  ← +1 DAL call
kudos/page.tsx  ─┘        │
profile/page.tsx ─────────┴─▶ { email, isAdmin, unreadCount: await getUnreadCount(...) }
        (đường viewer riêng, vá tay — không refactor)

4 × page.tsx ──▶ getNotificationsCopy() ──▶ copy.notifications = {title, markAllRead,
                                             loadMore, empty, types{4}}
        ──▶ <XScreen viewer copy /> ──▶ <SiteHeader viewer copy /> ──▶ <NotificationBell/>
```

## Related Code Files

**Sửa**
- `src/app/_shared/site-chrome.ts` — `SiteViewer.unreadCount: number`; mở rộng
  `SiteChromeCopy.notifications` thành `{empty, title, markAllRead, loadMore, types{4}}` +
  `defaultSiteChromeCopy` tương ứng
- `src/app/_utils/get-viewer.ts` (+ `.test.ts`) — thêm `getUnreadCount`
- `src/app/(public)/(home)/page.tsx`, `(public)/awards/page.tsx`, `(public)/kudos/page.tsx`,
  `(protected)/profile/page.tsx` — đổi `tHome("notifications.empty")` sang helper mới; profile
  thêm `unreadCount`
- `src/app/_components/site-header.tsx` — **bỏ** prop `unreadCount?`, đọc `viewer.unreadCount`
- Story/test có literal `SiteViewer`: `account-menu.stories.tsx`, `home-screen.stories.tsx`,
  `awards-screen.stories.tsx`, `profile-screen.stories.tsx`

**Tạo**: `src/app/_utils/get-notifications-copy.ts` (+ `.test.ts`)

**KHÔNG chạm**: `notification-bell.tsx` (phase 08), `src/api/**`, `src/dal/**`, `messages/**`

## File ownership

```
src/app/_shared/site-chrome.ts
src/app/_utils/get-viewer.ts  src/app/_utils/get-notifications-copy.ts (+ .test.ts)
src/app/_components/site-header.tsx
src/app/(public)/(home)/page.tsx  src/app/(public)/awards/page.tsx
src/app/(public)/kudos/page.tsx   src/app/(protected)/profile/page.tsx
src/app/**/*.stories.tsx (chỉ các file có literal SiteViewer)
```

## Implementation Steps

1. `site-chrome.ts`: thêm `unreadCount: number` vào `SiteViewer`; mở rộng nhánh `notifications`
   của `SiteChromeCopy` + `defaultSiteChromeCopy` (giá trị vi mặc định, khớp `messages/vi.json`).
2. `get-viewer.ts`: sau khi có `user`, gọi `getUnreadCount(toNotificationsClient(supabase), user.id)`
   trong cùng `try` — đã fail-open `0`, không cần try lồng.
3. `get-notifications-copy.ts`: `getTranslations("notifications")` → trả object đúng shape của
   `SiteChromeCopy["notifications"]`. Một chỗ duy nhất biết tên khoá.
4. 4 `page.tsx`: thay `tHome("notifications.empty")` bằng `notifications: await getNotificationsCopy()`;
   `profile/page.tsx` thêm `unreadCount` vào literal viewer.
5. `site-header.tsx`: xoá prop `unreadCount` khỏi type + destructuring; truyền
   `viewer.unreadCount` xuống `NotificationBell` (tạm giữ prop cũ của bell cho tới phase 08).
6. Sửa 13 literal trong story/test cho biên dịch lại. Cập nhật `get-viewer.test.ts`: có case
   "đếm hỏng ⇒ `unreadCount: 0`, viewer vẫn trả về".
7. `pnpm build && pnpm typecheck` — build phải chạy **trước** typecheck (sinh `.next/types`).

## Todo List

- [x] `SiteViewer.unreadCount` bắt buộc
- [x] `getViewer` gọi `getUnreadCount`, fail-open 0
- [x] `get-notifications-copy.ts` + test
- [x] 4 page.tsx nối copy; profile thêm count
- [x] `site-header.tsx` bỏ prop rời
- [x] story/test literal sửa hết (~13 literal)
- [x] một dòng nợ "profile không dùng getViewer" ghi vào `plans/action-items.md`

**LỆCH PHẠM VI:** Blueprint đoán "0 file màn phải sửa", thực tế là phạm vi mở rộng +8 file:
- `*-screen.tsx`: 4 file (home, awards, kudos, profile) mỗi cái có prop `unreadCount?: number` mặc định 0
- `*-client.tsx`: 4 file (home, awards, kudos, profile) hardcode `unreadCount={0}` khi gọi screen

Đây chính là nguyên nhân badge luôn 0 lúc đầu. Bằng cách thêm `unreadCount` vào SiteViewer (bắt buộc), TypeScript bắt máy phải cấp số cho cả screen lẫn client, giải pháp một đá ba chim.

## Success Criteria

- `grep -n "unreadCount" src/app/_components/site-header.tsx` → chỉ còn `viewer.unreadCount`,
  không còn prop rời và không còn giá trị mặc định `0`.
- `grep -rn "home.notifications" src` → rỗng.
- `pnpm build && pnpm typecheck` xanh; xoá thử `unreadCount` khỏi literal trong `profile/page.tsx`
  ⇒ typecheck **đỏ** (chứng minh Insight 1 hoạt động; khôi phục lại sau khi kiểm).
- `get-viewer.test.ts` có case fail-open `0`.
- E2E TC-003/004/005 chuyển từ "badge luôn 0" sang đỏ ở đúng chỗ render số (badge vẫn là chấm tròn
  cho tới phase 08).

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Field bắt buộc làm gãy nhiều story/test hơn dự kiến | Trung | Thấp | typecheck liệt kê hết; 13 literal đã đếm trước |
| `getViewer` chậm thêm 1 round-trip trên mọi trang | Cao | Thấp | index `(user_id) WHERE is_read=false` + `head:true` count |
| Ai đó "sửa nhanh" thành `unreadCount?` | Trung | Trung | Insight 3 ghi rõ lý do; reviewer bắt |
| Phase 06 đã merge, 07 chưa ⇒ build đỏ | Trung | Trung | 06 và 07 không tách PR, không tách nhánh |

## Security Considerations

`getUnreadCount` chỉ đếm theo `user.id` của session hiện tại; RLS chặn lần hai. Không truyền
`unreadCount` cho khách chưa đăng nhập — `viewer` null thì không có chuông (`site-header` đã đúng).

## Next Steps

Phase 08 render badge số + panel bằng đúng bộ prop này.
