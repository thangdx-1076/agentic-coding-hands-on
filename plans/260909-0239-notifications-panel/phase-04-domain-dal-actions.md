---
title: "Phase 4 — domain/notifications + DAL server-only + server action"
feature: F012
status: completed
priority: P1
effort: 3h
owner: implementer
result: domain types + cursor; DAL 2 file + client interface; server actions markRead/markAllRead; 100% coverage. LỆCH: `message.ts` KHÔNG được tạo ở pha này — nó trùng với `splitLinkTemplate` mà phase 06 vừa land, nên phần dựng câu dời sang `src/utils/notification-message.ts` do phase 08 tạo (commit 9d5abe5). Pha 04 chỉ giữ `parseNotificationPayload` trong `types.ts`.
---

# Phase 4 — domain + DAL + action

## Context Links

- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 4 (đường đọc), § 2 (payload)
- Mẫu DAL: `src/dal/kudos.ts:1,95-144` + `src/dal/kudos-client.ts:24-30,57-74`,
  `src/dal/secret-box.ts:5-16`
- Mẫu action: `src/app/(public)/kudos/_actions/create-kudo.ts:95-165`,
  `src/app/(public)/kudos/_actions/open-secret-box.ts:25-37` (**cố ý không revalidate**)
- Skill `nextjs-route-colocation-architecture` § Where does X go
- [study](reports/researcher-260909-0244-study.md) § 3, § 4, § 9

## Overview

**Priority** P1 · **Status** pending · Depends on: 02. Song song được với 03 và 06. Chặn 05, 07.

Tầng logic thuần + đọc/ghi phía server. Không có JSX trong phase này.

## Key Insights

1. **`src/domain/notifications/` được tạo ở đây, đúng lần đầu có luật dùng chung.** Cursor codec,
   type payload và hàm dựng message được **cả** `src/dal` (server) **lẫn** `src/api` (browser,
   phase 05) dùng. DAL có `import "server-only"` nên browser không import ngược được — vì vậy
   không thể để chung ở `dal`. Đây là consumer thật, không phải tạo trước.
2. **Không dùng `SupabaseClient` đầy đủ.** Định nghĩa `NotificationsClient` chỉ đúng chuỗi method
   DAL cần — để stub test dễ và né TS2589 (`kudos-client.ts:41-43`).
3. **Hai kiểu return theo rủi ro dữ liệu** (đúng tiền lệ repo): `getUnreadCount` fail **OPEN** về
   `0` (badge hỏng không được làm sập header); `markRead`/`markAllRead` fail **CLOSED** về
   `{ok:false}` (ghi sai làm lệch trạng thái đã đọc).
4. **FR-603 miễn phí nhờ RLS.** `UPDATE ... WHERE id = $1` bị RLS lọc theo `user_id = auth.uid()`;
   id lạ và id của người khác đều trả 0 dòng ⇒ cùng một `{ok:false}`. **Không** thêm nhánh phân
   biệt, **không** log khác nhau cho hai trường hợp — log khác nhau cũng là rò rỉ.
5. **Không `revalidatePath`.** Theo `open-secret-box.ts:25-29`: revalidate giữa lúc popup đang mở
   sẽ unmount popup dưới chân người dùng. Panel tự refetch.
6. **Keyset cursor `(created_at, id)`**, mã hoá base64url — không dùng `offset` (trang sau chèn
   thêm row mới sẽ làm trùng/nhảy mục, FR-102).
7. **Coverage allowlist của repo là danh sách tường minh** (`vitest.config.ts`) — thêm file mới
   dưới `src/domain/**` và `src/utils/datetime/**` phải thêm glob tương ứng, nếu không file mới
   lặng lẽ không vào mẫu số.

## Requirements

FR-101/102/103 (phân trang), FR-201/202/203/204 (mark-read), FR-501 (không lưu text), FR-601/603.

## Architecture / Data flow

```
page.tsx (server) ──▶ getViewer() ──▶ getUnreadCount(client, userId) ──▶ number | 0
panel (client) ─────▶ action markReadAction(id) ──▶ session.getUser() ──▶ markRead(dal)
                                                       │ 0 dòng ──▶ {ok:false}
                    ──▶ action markAllReadAction() ──▶ markAllRead ──▶ {updated:n}, n=0 vẫn ok
domain/notifications: encodeCursor/decodeCursor · NotificationPayload · formatNotificationMessage
utils/datetime/relative-time.ts: Intl.RelativeTimeFormat, hàm thuần
```

## Related Code Files

**Tạo**
- `src/domain/notifications/types.ts` — `NotificationType`, `NotificationRow`, payload theo loại
- `src/domain/notifications/cursor.ts` (+ `.test.ts`) — encode/decode base64url `(created_at,id)`
- `src/domain/notifications/message.ts` (+ `.test.ts`) — `formatNotificationMessage(templates, row)`
  và `splitLinkTemplate(template)` (dùng ở phase 06/08)
- `src/utils/datetime/relative-time.ts` (+ `.test.ts`) — `formatRelativeTime(date, now, locale)`
- `src/dal/notifications.ts` (+ `.test.ts`) — `import "server-only"`, logic thuần + client tiêm vào
- `src/dal/notifications-client.ts` (+ `.test.ts`) — `toNotificationsClient(supabase)`
- `src/app/_actions/notifications.ts` — `markReadAction`, `markAllReadAction`

**Sửa**: `vitest.config.ts` (thêm glob coverage cho `src/domain/**`, `src/utils/datetime/**`)

**KHÔNG chạm**: `src/api/**` (phase 05), `src/app/_components/**` (phase 08), `messages/**` (06),
`src/app/_utils/get-viewer.ts` (07).

## File ownership

```
src/domain/notifications/**
src/utils/datetime/**
src/dal/notifications.ts  src/dal/notifications-client.ts  (+ .test.ts)
src/app/_actions/notifications.ts
vitest.config.ts
```

## Implementation Steps

1. `types.ts`: union 4 `type` + payload rời cho từng loại (`kudos_received: {kudosId, senderName}`,
   `heart_received: {kudosId, actorId, actorName}`, `secret_box_available: {boxId, sourceKudosId?}`,
   `kudos_hidden: {kudosId}`). Payload đọc từ DB là dữ liệu ngoài → parse phòng thủ, thiếu khoá thì
   rơi về chuỗi rỗng chứ không throw ở tầng render.
2. `cursor.ts` + test: round-trip, cursor rác trả `null` (không throw), cursor rỗng = trang đầu.
3. `message.ts` + test: thay `{senderName}`; `splitLinkTemplate` cắt `<link>…</link>` thành
   `[{text}, {link, text}, {text}]`; template thiếu marker → 1 đoạn text, không nổ.
4. `relative-time.ts` + test: `Intl.RelativeTimeFormat`, biên giây/phút/giờ/ngày, `now` tiêm vào
   để test không phụ thuộc đồng hồ.
5. `notifications-client.ts`: interface hẹp `NotificationsClient` (select + eq + order + limit +
   update), `toNotificationsClient(supabase)`.
6. `notifications.ts`: `getUnreadCount` (fail-open 0), `listNotifications` (10 mục, keyset,
   `nextCursor` null khi hết — FR-103), `markRead` (`{ok}`), `markAllRead` (`{updated}`).
7. `src/app/_actions/notifications.ts`: `"use server"` dòng đầu; **re-derive user từ session**,
   không nhận `userId` tham số; try/catch bọc toàn thân; trả union `{ok:true|false, reason}`;
   **không** `revalidatePath`.
8. Cập nhật `vitest.config.ts` coverage allowlist. Chạy `pnpm test:unit:coverage`.

## Todo List

- [x] domain types + cursor + message (+ test)
- [x] relative-time (+ test)
- [x] DAL 2 file + test stub client
- [x] server action, không revalidate, re-derive session
- [x] coverage allowlist có file mới
- [x] lint/typecheck xanh

**Lệch so với kế hoạch:** Phase 05 không dùng `src/dal/notifications-browser*.ts` như blueprint ghi; thay vào đó là `src/api/notifications.ts` (như `src/api/auth.ts`) vì `src/dal/notifications-query.ts` có `import "server-only"` nên client bundle không import được. Chuyển đường đọc browser sang `src/api/` từ đầu là cách tiếp cận đúng (RLS xác nhận ở phase 05/09).

## Success Criteria

- `pnpm test:unit:coverage` xanh và **bảng coverage liệt kê** `cursor.ts`, `message.ts`,
  `relative-time.ts`, `notifications.ts`, `notifications-client.ts`, `_actions/notifications.ts`.
- Test chứng minh: `markRead` với id không tồn tại **và** id của người khác trả **cùng một** giá
  trị `{ok:false}` (không khác `reason`) — FR-603/TC-020.
- Test chứng minh `markAllRead` khi 0 chưa đọc trả `{updated:0}`, không throw — FR-202/TC-017.
- Test chứng minh `getUnreadCount` trả `0` khi client ném lỗi (fail-open).
- `grep -n "revalidatePath" src/app/_actions/notifications.ts` → không kết quả.
- Mọi file < 200 dòng.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Tạo `src/domain` sớm/thừa | Thấp | Thấp | có 2 consumer thật (dal + api); nếu phase 05 đổi hướng, gộp ngược vào `utils` |
| File mới lọt ngoài coverage allowlist | Cao | Trung | criteria đòi tên file xuất hiện trong bảng coverage |
| `reason` khác nhau làm rò sự tồn tại | Trung | Cao | test so sánh **toàn bộ object** hai trường hợp |
| TS2589 khi dùng `SupabaseClient` đầy đủ | Trung | Trung | interface hẹp, đúng tiền lệ `kudos-client.ts` |
| Cursor lệch múi giờ | Trung | Trung | so sánh bằng `timestamptz` ISO, không format theo locale |

## Security Considerations

Action không nhận `userId` từ client. DAL không tự `createClient()` — client tiêm vào, `server-only`
giữ nó khỏi bundle browser. Payload không được log nguyên văn (chứa tên người gửi).

## Next Steps

05 (browser api + hook) và 07 (wiring) mở khoá.
