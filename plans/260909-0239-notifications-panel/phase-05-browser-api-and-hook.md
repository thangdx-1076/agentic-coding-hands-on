---
title: "Phase 5 — src/api/notifications.ts + realtime + use-notifications hook"
feature: F012
status: pending
priority: P1
effort: 2h
owner: implementer
---

# Phase 5 — browser api + realtime + hook

## Context Links

- [clarifications.md](clarifications.md) § Realtime (badge **không** client tự tăng)
- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 5
- Mẫu: `src/api/auth.ts` (browser-side Supabase, chỉ `_hooks` gọi), `src/lib/supabase/client.ts`
- Skill `separate-hook-logic-from-components` · `nextjs-route-colocation-architecture`
- [study](reports/researcher-260909-0244-study.md) § 9 (vitest project `jsdom` phủ
  `src/app/**/_hooks/**`)

## Overview

**Priority** P1 · **Status** pending · Depends on: 04 (domain type + cursor). Chặn 08.

Đường đọc phía trình duyệt + đăng ký realtime + hook giữ toàn bộ state của panel. Không JSX.

## Key Insights

1. **Vì sao đọc từ browser chứ không qua server action:** danh sách chỉ nạp khi popup mở (FR-007)
   và realtime bắt buộc phải có Supabase client phía trình duyệt. Dùng luôn client đó cho `list`
   và `count` là một đường, không phải hai. Repo đã có tiền lệ `src/api/auth.ts`. RLS là thứ chặn,
   và TC-002 kiểm chính đường này — đúng chỗ cần kiểm.
2. **Ghi vẫn đi server action** (phase 04), theo luật `Mutations go through Server Actions` của
   skill colocation. Đọc-browser/ghi-action là có chủ ý, không phải lỡ tay.
3. **Badge không bao giờ do client tự trừ/cộng** (FR-204). Realtime INSERT chỉ **invalidate** →
   gọi lại `fetchUnreadCount()`. Sau `markRead` cũng refetch, không `setCount(c => c-1)`.
4. **`unreadCount` khởi tạo từ prop server-rendered**, sau đó do hook làm chủ. Prop đổi giữa các
   lần điều hướng — đồng bộ lại bằng key/effect có so sánh, không `useEffect(setState(prop))` vô
   điều kiện (vòng lặp render).
5. **Huỷ channel khi unmount** (`supabase.removeChannel`) — 4 trang đều render chuông, rò channel
   sẽ dồn theo mỗi lần điều hướng.
6. **`created_at` từ realtime không đáng tin để chèn thẳng vào danh sách đang mở.** Đơn giản và
   đúng: realtime → refetch trang đầu (10 mục) + refetch count. Không merge tay (FR-301 chỉ đòi
   "mục hiện ra", không đòi chèn tại chỗ).

## Requirements

FR-007 (list chỉ nạp khi mở, badge luôn nạp), FR-101/102/103, FR-204, FR-301. TC-018, TC-019, TC-002.

## Architecture / Data flow

```
NotificationBell (client, phase 08)
   └── useNotifications({ initialUnreadCount, locale })
         ├── open=false ──▶ chỉ subscribe realtime + giữ count
         ├── open=true  ──▶ listNotifications(cursor=null) ──▶ items, nextCursor
         ├── loadMore() ──▶ listNotifications(nextCursor)   ──▶ items = [...cũ, ...mới]
         ├── markRead(id) ──▶ action ──▶ refetchCount() + đánh dấu item tại chỗ
         ├── markAllRead() ─▶ action ──▶ refetchCount() + refetch trang đầu
         └── channel("notifications:<uid>") postgres_changes INSERT
                 ──▶ refetchCount() (+ refetch trang đầu nếu open)
src/api/notifications.ts: listNotifications · fetchUnreadCount · subscribeToNotifications
```

## Related Code Files

**Tạo**
- `src/api/notifications.ts` — 3 hàm trên, dùng `createClient()` của `src/lib/supabase/client.ts`,
  cursor codec import từ `src/domain/notifications/cursor.ts`
- `src/app/_hooks/use-notifications.ts` (+ `.test.ts`, chạy ở vitest project `jsdom`)

**Đọc**: `src/api/auth.ts`, `src/lib/supabase/client.ts`, `src/domain/notifications/**`
**KHÔNG chạm**: `src/dal/**`, `src/app/_actions/**` (phase 04), `src/app/_components/**` (phase 08)

## File ownership

```
src/api/notifications.ts
src/app/_hooks/use-notifications.ts (+ .test.ts)
```

## Implementation Steps

1. `listNotifications(cursor)` — select 11 dòng để biết còn trang sau, trả 10 + `nextCursor`;
   order `created_at desc, id desc`; **không** truyền `userId` (RLS tự lọc theo `auth.uid()`).
2. `fetchUnreadCount()` — `count: "exact", head: true` với `is_read = false`; lỗi → `0`.
3. `subscribeToNotifications(userId, onInsert)` — `supabase.channel(...)` +
   `postgres_changes {event:'INSERT', schema:'public', table:'notifications', filter:'user_id=eq.<id>'}`;
   trả hàm huỷ.
4. `use-notifications.ts`: state `open, items, nextCursor, unreadCount, loading, error`; hành vi
   theo sơ đồ trên; huỷ channel trong cleanup; không tự cộng/trừ count.
5. Test hook (jsdom) với `src/api/notifications.ts` bị mock: mở → nạp 1 lần; mở lại không nạp lại
   khi đã có dữ liệu; `loadMore` nối không trùng id; realtime callback → gọi `fetchUnreadCount`
   đúng 1 lần; unmount → hàm huỷ được gọi.

## Todo List

- [ ] `src/api/notifications.ts` 3 hàm
- [ ] hook + test jsdom
- [ ] cleanup channel có test
- [ ] không có phép cộng/trừ nào lên `unreadCount`
- [ ] file < 200 dòng (tách `use-notifications-realtime.ts` nếu vượt)

## Success Criteria

- Test hook chứng minh `loadMore` không sinh id trùng (FR-102) và ẩn "Xem thêm" khi `nextCursor`
  null (FR-103).
- Test chứng minh sau `markRead` hook **gọi lại** `fetchUnreadCount` thay vì tự trừ:
  `grep -nE "unreadCount\s*(-|\+)|count\s*-\s*1" src/app/_hooks/use-notifications.ts` → rỗng.
- Test chứng minh unmount huỷ channel.
- `pnpm test:unit:coverage` xanh; hook nằm trong project `jsdom`.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Realtime im lặng vì publication/RLS | Trung | Cao | phase 02 criteria đã kiểm publication; TC-019 là gate cuối |
| Rò channel qua các lần điều hướng | Trung | Trung | test cleanup |
| Prop `initialUnreadCount` chọi state hook → vòng lặp render | Trung | Trung | chỉ đồng bộ khi giá trị thực sự đổi |
| Client bị coi là nguồn đúng của badge | Trung | Cao | grep gate ở Success Criteria |
| `filter` realtime sai cú pháp → nhận cả thông báo người khác | Thấp | **Nghiêm trọng** | TC-002 kiểm bằng 2 phiên thật, không tin RLS suông |

## Security Considerations

Không truyền `userId` vào truy vấn đọc — để RLS quyết định. `subscribeToNotifications` có filter
theo `user_id` chỉ để giảm lưu lượng; **ranh giới thật vẫn là RLS**, và TC-002 chứng minh điều đó.

## Next Steps

Phase 08 dùng hook này. Phase 07 chạy song song trước đó.
