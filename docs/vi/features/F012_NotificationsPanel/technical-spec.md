---
status: implemented
authored_by: takumi
fcode: F012
created: 2026-09-09
lang: vi
---

# F012_NotificationsPanel

**Priority**: P1 · **Type**: mixed

**See also:** [`functional-spec.md`](./functional-spec.md) — overview, open decisions,
requirements/business rules, screens, user stories, scenarios, edge cases.

**How to read this file:** § 2 là index; § 4 là appendix dùng chung — chỉ nhảy vào khi § 3 trỏ tới.

## 1. Technical Overview

Bảng mới `public.notifications` (migration `0012`) + 2 trigger `SECURITY DEFINER` phát thông báo
(migration `0013`) là toàn bộ backend. Không có route/page mới — chuông + popup là một cross-cutting
header component render trên 4 screen đã có (`/`, `/awards`, `/profile`, `/kudos`) qua `SiteHeader`.
Đọc/ghi đi qua DAL (`src/dal/notifications*.ts`) ở server và một lớp mỏng tương đương ở browser
(`src/api/notifications.ts`) cho panel client — không có API route HTTP nào tự viết. Đây là lần đầu
repo dùng **Supabase Realtime** (kênh `postgres_changes`) và lần đầu một bảng RLS own-row cần
**GRANT theo cột** (không chỉ theo hàng) để đúng ngữ nghĩa "chỉ sửa được `is_read`".

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | `FR-601, FR-602` | — | § 4.4 |
| **A1** | `getUnreadCount` (DAL, đọc, dùng ở Server Component) | *(no route)* | `FR-002` | — *(read-only)* | § 3.1 |
| **A2** | `listNotifications` (DAL server + browser wrapper) | *(no route)* | `FR-101, FR-102, FR-103, FR-006` | — *(read-only)* | § 3.1 |
| **A3** | `markReadAction` (Server Action) | *(no route)* | `FR-201, FR-603` | `notifications.is_read` | § 3.2 |
| **A4** | `markAllReadAction` (Server Action) | *(no route)* | `FR-202` | `notifications.is_read` | § 3.2 |
| **A5** | `subscribeToNotifications` (browser realtime) | *(no route)* | `FR-301` | — *(read-only)* | § 3.3 |
| **A6** | `emit_kudos_received()` (trigger, `SECURITY DEFINER`) | `AFTER INSERT ON public.kudos` | `FR-401, FR-402, FR-403, FR-405` | `notifications` (INSERT) | § 3.4 |
| **A7** | `emit_heart_received()` (trigger, `SECURITY DEFINER`) | `AFTER INSERT ON public.kudo_hearts` | `FR-404, FR-405` | `notifications` (INSERT) | § 3.4 |

## 3. Actions

### 3.1 CAP-01/CAP-02 — Đọc: badge + danh sách phân trang

#### A1 · `getUnreadCount`
`FR-002` · `US001`

**Who** · Bất kỳ Sunner đã đăng nhập nào *(gate A0 — § 4.4)*.
**FE** · Server Component (trang chứa `SiteHeader`) gọi lúc render, truyền `unreadCount` xuống
`SiteViewer` (`src/app/_shared/site-chrome.ts:127`) — trường BẮT BUỘC, không optional, để một nơi
tạo `SiteViewer` mà quên bơm số thật sẽ lỗi compile thay vì âm thầm hiện `0`.
**BE** · `getUnreadCount(client, userId)` — `SELECT count(*) WHERE user_id = ? AND is_read = false`,
fail OPEN về `0` trên BẤT KỲ lỗi nào (`src/dal/notifications.ts:49-68`).
**Result** · Số nguyên; client sau đó tự refetch qua `fetchUnreadCount()` (browser wrapper,
`src/api/notifications.ts:124-140`, cùng công thức fail-open) mỗi khi mark-read/mark-all-read/
realtime bắn tín hiệu.
**Source:** `src/dal/notifications.ts:49-68`; `src/api/notifications.ts:124-140`

#### A2 · `listNotifications`
`FR-101` `FR-102` `FR-103` `FR-006` · `US001, US002`

**Who** · Sunner đã đăng nhập, popup đang mở (FR-007 — không tải khi đóng).
**FE** · `useNotifications` (`src/app/_hooks/use-notifications.ts:96-118`) gọi lần đầu khi `setOpen(true)`
và khi chưa từng tải (`loadedRef`); `loadMore()` (dòng 120-141) gọi lại với `nextCursor`.
**Request** · `cursor?: string` (base64url của `{createdAt, id}`, `src/domain/notifications/cursor.ts`).
**BE** · Server: `listNotifications(client, userId, cursor)` — `SELECT` 10 cột cố định
(`NOTIFICATION_COLUMNS`), lọc `user_id`, `OR` trên `(created_at, id)` khi có cursor, `ORDER BY
created_at DESC, id DESC LIMIT 10`, throw nếu Supabase lỗi (`src/dal/notifications.ts:83-119`).
Browser: `listNotifications(cursor)` (`src/api/notifications.ts:82-116`) DUY TRÌ RIÊNG cùng logic
(không import DAL server — `import "server-only"` sẽ throw nếu client bundle chạm tới), khác một
chi tiết: lấy `PAGE_SIZE + 1` dòng để biết còn trang sau mà không cần round-trip thứ hai, thay vì so
`items.length === PAGE_SIZE` như bản server.
**Rule** · Không dùng `offset` — một dòng chèn giữa hai lần tải sẽ làm lệch offset nhưng không lệch
keyset `(created_at, id)`.
**Result** · `{items, nextCursor}`. 0 mục hoặc `error === true` → panel hiện cùng 1 trạng thái trống
(`notification-panel.tsx:35-38,52`) — copy không có chuỗi lỗi riêng, ghi nợ ở `plans/action-items.md`.
**Source:** `src/dal/notifications.ts:83-119`; `src/dal/notifications-query.ts:18,84-107`;
`src/api/notifications.ts:59-116`; `src/domain/notifications/cursor.ts`

<!-- No diagram: 2 read paths (server/browser) cùng công thức keyset, dưới ngưỡng cần sơ đồ. -->

---

### 3.2 CAP-03 — Đánh dấu đã đọc

#### A3 · `markReadAction`
`FR-201` `FR-603` · `US003`

**Who** · Sunner đã đăng nhập, bấm thân 1 mục (`notification-item.tsx:61-63`).
**FE** · `handleActivate` gọi `onMarkRead(item.id)` → hook `markRead` (`use-notifications.ts:143-162`)
optimistic-update `isRead: true` tại chỗ, rồi LUÔN `refetchCount()` ở `finally` bất kể kết quả
(FR-204 — badge không bao giờ tự trừ bằng số học).
**Request** · `id: string` (id của hàng `notifications`).
**BE** · Server Action tự lấy `user.id` từ session (KHÔNG nhận `userId` từ client) →
`markRead(client, userId, id)` → `UPDATE ... WHERE id = ? AND user_id = ? RETURNING id`. 0 dòng khớp
(dù vì `id` sai hay vì `id` của người khác) → `{ok:false}`, cùng một hình dạng — RLS
`notifications_select_own`/`notifications_update_own_read` (`USING (user_id = auth.uid())`) đã lọc
mất hàng của người khác THÀNH "0 dòng khớp" trước khi hàm kịp phân biệt (FR-603/EC013).
**Rule** · Cột thực sự ghi được chỉ là `is_read` — `GRANT UPDATE (is_read) ON public.notifications`
(`0012_notifications.sql:79`) chặn Postgres-level mọi cố gắng sửa `type`/`payload` qua REST trực
tiếp, kể cả khi RLS policy (chỉ xét hàng, không xét cột) sẽ cho qua.
**Result** · `{ok: true}` | `{ok: false}` — không có `reason`, chủ đích (§ FR-603).
**Source:** `src/app/_actions/notifications.ts:27-54`; `src/dal/notifications.ts:123-154`;
`0012_notifications.sql:72-79`

#### A4 · `markAllReadAction`
`FR-202` · `US003`

**Who/FE** · Nút "Đánh dấu đọc tất cả" (`notification-panel.tsx:64-70`) → `markAllRead`
(`use-notifications.ts:164-178`) — thành công thì `loadedRef.current = false` rồi gọi lại
`fetchFirstPage()` (làm mới toàn bộ trạng thái đã đọc trên danh sách đang hiện), LUÔN
`refetchCount()` sau cùng.
**BE** · `markAllRead(client, userId)` → `UPDATE ... WHERE user_id = ? AND is_read = false RETURNING
id`; 0 dòng khớp (đã đọc hết từ trước) → `{updated: 0}`, KHÔNG phải lỗi (FR-202).
**Result** · `{ok: true, updated: number}` | `{ok: false}`.
**Source:** `src/app/_actions/notifications.ts:56-79`; `src/dal/notifications.ts:164-184`

---

### 3.3 CAP-04 — Realtime

#### A5 · `subscribeToNotifications`
`FR-301` · `US004`

**Who** · Sunner đã đăng nhập; kênh chỉ mở SAU KHI `userId` thật đã resolve
(`use-notifications-realtime.ts:40` — guard rỗng để tránh mở kênh với filter rỗng rồi phải huỷ/mở
lại, phát sinh khi implement, không có trong draft ban đầu).
**FE** · Subscribe MỘT LẦN cho vòng đời cả bell (không phụ thuộc `open`) — `openRef` (không phải
`open` trực tiếp) là thứ callback đọc, để không phải huỷ/mở lại kênh mỗi lần đóng/mở popup
(`use-notifications-realtime.ts:19-52`).
**BE** · Kênh `notifications:${userId}` lắng `postgres_changes` INSERT trên `public.notifications`,
filter `user_id=eq.${userId}` (`src/api/notifications.ts:154-178`). Filter chỉ để CẮT NHIỄU — biên
bảo mật thật là RLS, kênh vẫn chạy đúng dù filter rỗng vì Realtime tự áp policy `USING (user_id =
auth.uid())` cho từng thay đổi.
**Rule** · Callback KHÔNG chèn payload realtime thẳng vào state — chỉ gọi `refetchCount()` +
(nếu popup đang mở) `fetchFirstPage()`. Tránh state client lệch khỏi nguồn RLS thật.
**Result** · Read-only, không ghi gì. Verify bằng test thật, không tin tài liệu Supabase suông:
`tests/e2e/notifications.spec.ts:178` (TC-002 — B không nhận được INSERT của A) và `:664` (TC-019 —
badge tăng không cần reload).
**Source:** `src/api/notifications.ts:142-178`; `src/app/_hooks/use-notifications-realtime.ts`;
`0012_notifications.sql:121-132` (`ALTER PUBLICATION supabase_realtime ADD TABLE`)

<!-- No diagram: 1 channel, 1 filter, 2 callback effect — dưới ngưỡng cần sơ đồ. -->

---

### 3.4 CAP-05 — Phát thông báo (trigger DB)

#### A6 · `emit_kudos_received()`
`FR-401` `FR-402` `FR-403` `FR-405`

**Who** · Không có actor người dùng trực tiếp — chạy TỰ ĐỘNG trong transaction INSERT `kudos`.
**BE** · `NEW.sender_id = NEW.receiver_id` → `RETURN NEW` ngay, không insert (FR-402). Ngược lại:
`senderName` = `NEW.anonymous_name` khi `NEW.is_anonymous`, ngược lại `SELECT full_name FROM
public.users WHERE id = NEW.sender_id` (FR-403 — không bao giờ đọc tên thật khi ẩn danh). Insert
`notifications(user_id=NEW.receiver_id, type='kudos_received', payload={kudosId, senderName})`.
Toàn bộ bọc trong `BEGIN...EXCEPTION WHEN OTHERS THEN RAISE WARNING` — lỗi ghi thông báo không
rollback INSERT `kudos` gốc (FR-405).
**Rule** · Trigger, không phải Server Action — `create-kudo.ts` insert 1 dòng không transaction, nên
một write thứ hai ở app layer sẽ mở cửa sổ ghi-nửa-chừng; trigger đảm bảo CÙNG transaction.
**Source:** `supabase/migrations/0013_notification_emitters.sql:68-118`

#### A7 · `emit_heart_received()`
`FR-404` `FR-405`

**BE** · Đọc `sender_id` của kudo vừa được thả tim; `sender_id IS NULL OR sender_id = NEW.user_id` →
`RETURN NEW` (phòng thủ lớp 2 — RLS `kudo_hearts_insert_own` đã chặn tự-thả-tim ở lớp 1). Insert
`notifications(user_id=kudo.sender_id, type='heart_received', payload={kudosId, actorId, actorName})`
— **`kudo.sender_id`, KHÔNG PHẢI `NEW.user_id` (người thả) hay `kudo.receiver_id`**: `open_secret_box()`
(migration `0011`) đã tính suất Secret Box bằng `SUM(heart_count) WHERE sender_id = viewer` ("Hearts
credit the kudo's SENDER") — đi theo `receiver_id` sẽ khiến hệ thống ghi công cho một người và báo
cho người khác.
**Rule (FR-404)** · Dedupe bằng UNIQUE INDEX bộ phận `uq_notifications_heart_received_dedupe` trên
`(user_id, type, payload->>'kudosId', payload->>'actorId') WHERE type='heart_received'`
(`0012_notifications.sql:110-117`) — KHÔNG dùng `ON CONFLICT DO NOTHING` (bỏ tim/thả lại là 2
transaction riêng, không có gì để `ON CONFLICT` trong 1 statement). `WHEN unique_violation THEN
RETURN NEW` PHẢI đứng TRƯỚC `WHEN OTHERS`, nếu không `OTHERS` nuốt mất case dedupe hợp lệ và biến nó
thành một `RAISE WARNING` giả.
**Không có trigger DELETE** trên `kudo_hearts` — bỏ tim không xoá thông báo đã phát (EC004).
**Source:** `supabase/migrations/0013_notification_emitters.sql:122-184`;
`supabase/migrations/0011_secret_box.sql` (định nghĩa "Hearts credit the SENDER")

### 3.5 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A2 | 0 mục hoặc lỗi Supabase | Panel hiện cùng 1 trạng thái trống — không có copy lỗi riêng |
| A3 | `id` của người khác hoặc không tồn tại | `{ok:false}`, không phân biệt (RLS lọc trước khi hàm thấy khác biệt) |
| A6 | Tự gửi Kudos cho chính mình | Không insert notification |
| A7 | Thả/bỏ/thả lại cùng 1 kudo | Đúng 1 dòng sống sót — dedupe bằng UNIQUE INDEX, không phải app logic |
| A6/A7 | Lỗi bất kỳ khi ghi notification | `RAISE WARNING`, KHÔNG rollback INSERT `kudos`/`kudo_hearts` gốc |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `NotificationBell` | Nút chuông + badge + toggle popup, resolve `userId` client-side (chỉ để scope kênh realtime, KHÔNG phải security boundary) | A1, A5 | `src/app/_components/notification-bell.tsx` |
| `NotificationPanel` | `role="dialog"` — heading + nút mark-all + list/empty + nút load-more | A2, A4 | `src/app/_components/notifications/notification-panel.tsx` |
| `NotificationItem` | 1 dòng: icon theo loại, message (bold/link segment), thời gian tương đối, chấm chưa đọc | A3 | `src/app/_components/notifications/notification-item.tsx` |
| 4 icon (`IconNotification{Kudos,Heart,Box,EyeOff}`) | Icon theo `NotificationType` | A2 | `src/app/_components/icons/icon-notification-*.tsx` |
| `useNotifications` | State máy chính: open/items/cursor/unreadCount/loading/error + 4 action | A2, A3, A4 | `src/app/_hooks/use-notifications.ts` |
| `useNotificationsRealtime` | Tách riêng effect subscribe khỏi `useNotifications` để giữ file dưới 200 dòng | A5 | `src/app/_hooks/use-notifications-realtime.ts` |
| `formatNotificationMessage` | Parse `**bold**` + `<link>` marker trong template i18n, áp fallback `"Sunner"` | A2 | `src/utils/notification-message.ts` |
| `getNotificationsCopy` | Map namespace `notifications.*` sang `SiteChromeCopy["notifications"]` | A2 | `src/app/_utils/get-notifications-copy.ts` |

**Quyết định KHÔNG dùng `useMenuKeyboardNav`** (`account-menu.tsx`/`language-selector.tsx` đang
dùng): hook đó nhận `itemCount` cố định cho một vòng đời render, trong khi danh sách thông báo dài
ra khi bấm "Xem thêm" — panel giữ `role="dialog"` thay vì mở rộng vào `role="menu"`
(`notification-panel.tsx:24-28`).

### 4.2 Data Model

`public.notifications` — xem § "Data Model" trong `functional-spec.md`'s nguồn (migration
`0012_notifications.sql`) cho DDL đầy đủ. Tóm tắt cột: `id` (PK), `user_id` (FK → `public.users`,
NGƯỜI NHẬN), `type` (CHECK 4 giá trị), `payload` (jsonb, hợp đồng theo `type`), `is_read`,
`created_at`.

**Hợp đồng `payload` theo `type`** (`src/domain/notifications/types.ts:38-62`):

| `type` | Shape | Emitter |
|---|---|---|
| `kudos_received` | `{kudosId, senderName: string \| null}` | A6 |
| `heart_received` | `{kudosId, actorId, actorName: string \| null}` | A7 |
| `secret_box_available` | `{boxId, sourceKudosId: string \| null}` | KHÔNG có (v1) |
| `kudos_hidden` | `{kudosId}` | KHÔNG có (v1) |

`senderName`/`actorName` là `string | null` CHỦ ĐÍCH (9/21 user thật trên DB không có `full_name`) —
trigger không bịa tên; fallback `"Sunner"` chỉ ở tầng render (`notification-message.ts:47`, cùng quy
ước `kudos-card-person.tsx`).

#### Polymorphic Behavior

`type` là discriminator cho `payload` — `parseNotificationPayload<T>` (`types.ts:108-142`) là điểm
thu hẹp kiểu DUY NHẤT, `switch` cạn kiệt (exhaustive) trên 4 giá trị của `NotificationType`.

### 4.3 State Management

Không đủ ngưỡng cho `SM-###` riêng (không có state máy nhiều-trạng-thái/nhiều-transition) — `open`
là boolean đơn giản, `items`/`nextCursor`/`unreadCount`/`loading`/`error` là dữ liệu, không phải máy
trạng thái. Quy tắc đồng bộ đáng chú ý duy nhất: `initialUnreadCount` (prop, đổi mỗi navigation) chỉ
ghi đè `unreadCount` state khi nó THỰC SỰ đổi so với lần trước (so sánh với `syncedInitialCount`),
tránh một `useEffect` không điều kiện chiến đấu với các refetch optimistic-free khác
(`use-notifications.ts:70-82`).

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · `FR-601, FR-602`** — Không action nào ở trên tự kiểm tra "đã đăng nhập chưa" bằng nhánh
if/else của riêng nó; RLS (`0012_notifications.sql:66-79`) là điểm chặn DUY NHẤT cho cả REST lẫn
realtime. `authenticated` có đúng `SELECT` + `UPDATE (is_read)`; KHÔNG có `INSERT`/`DELETE` grant
cho bất kỳ role người dùng nào — ghi chỉ qua A6/A7.
**Source:** `0012_notifications.sql:57-93`

#### Bin 2 — used by ≥2 named actions

Không có — mỗi BR chỉ 1 action dùng (A2 dùng riêng BR keyset; A3/A4 dùng riêng BR fail-closed; A6/A7
dùng riêng BR trigger).

### 4.5 Algorithms & Integrations

**INT-001 — Supabase Realtime `postgres_changes`.** Tích hợp đầu tiên của repo với Realtime (khác
REST/RPC đã dùng ở mọi feature trước). Không có thuật toán riêng — chỉ đăng ký filter + callback,
xem A5.

### 4.6 Configuration

Không có biến môi trường mới.

**Client behavior:** see [`behavior-logic.md`](../../generated/behavior-logic.md),
[`permissions.md`](../../system/permissions.md) (RLS/realtime/column-level grant),
[`architecture.md`](../../system/architecture.md).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* Badge ẩn ở 0, đúng số 1-9, `"9+"` ở >9 (TC-003/004/005)
- **SC-002** *(A2)* 10 mục/trang, "Xem thêm" không trùng, hết trang thì nút biến mất (TC-018)
- **SC-003** *(A3/A4)* Mark 1 mục chỉ xoá đúng 1 chấm đỏ; mark-all xoá hết kể cả khi vốn đã 0 (TC-016/017)
- **SC-004** *(A3)* id người khác/không tồn tại → cùng `{ok:false}` (TC-020)
- **SC-005** *(A5)* B không nhận INSERT của A qua realtime; badge A tăng không cần reload (TC-002, TC-019)
- **SC-006** *(A6/A7)* Tự gửi/tự thả tim không phát; ẩn danh không lộ `sender_id`/tên thật (TC-010-012)
- **SC-007** *(A7)* Thả/bỏ/thả lại → đúng 1 dòng (TC-013)
- **SC-008** *(A6/A7)* Lỗi ghi notification không làm hỏng thao tác gốc (TC-021)

#### US001-US004 *(A1-A5)*

**Independent Test:** `tests/e2e/notifications.spec.ts` (838 dòng, 20 test case pass + 1 skip
TC-014 admin-moderation, xem `plans/260909-0239-notifications-panel/phase-09-green-visual-and-gate.md`
— 214 pass / 5 skip / 0 fail toàn bộ suite, 6 lệnh gate xanh).
**Acceptance Scenarios:** xem `functional-spec.md § 8`.

### 5.2 Assumptions

Không còn assumption treo — mọi điểm mơ hồ của spec gốc (kiến trúc khác codebase, phạm vi 4 loại
thông báo, chiều `heart_received`, `senderName` null) đã chốt ở `clarifications.md` trước khi code,
và đã verify lại bằng migration/test thật (không còn "giả định chờ Track A xác nhận" như F011).

### 5.3 Unresolved Questions

Không có câu hỏi kỹ thuật nào còn treo cho phạm vi v1. 2 nợ có tên (emitter `kudos_hidden`/
`secret_box_available`) không phải câu hỏi — là scope đã chốt không làm, ghi ở
`functional-spec.md § 11` và `plans/action-items.md`.

### 5.4 Source References

Code đã viết, 12 commit trên nhánh `feat/notifications-panel` (chưa merge `main`, chưa push).

| Vai trò | Source |
|---|---|
| DDL bảng + RLS + GRANT cột + dedupe index + publication | `supabase/migrations/0012_notifications.sql` |
| 2 trigger `SECURITY DEFINER` phát thông báo | `supabase/migrations/0013_notification_emitters.sql` |
| Types + payload contract + boundary parse | `src/domain/notifications/types.ts` |
| Cursor keyset codec | `src/domain/notifications/cursor.ts` |
| DAL server (đọc/ghi) | `src/dal/notifications.ts`, `src/dal/notifications-query.ts`, `src/dal/notifications-client.ts` |
| Server Actions mark-read/mark-all-read | `src/app/_actions/notifications.ts` |
| DAL browser (đọc + realtime) | `src/api/notifications.ts` |
| State hook + realtime hook | `src/app/_hooks/use-notifications.ts`, `src/app/_hooks/use-notifications-realtime.ts` |
| UI: chuông, panel, item, 4 icon | `src/app/_components/notification-bell.tsx`, `src/app/_components/notifications/{notification-panel,notification-item}.tsx`, `src/app/_components/icons/icon-notification-*.tsx` |
| Message renderer (bold/link parse + fallback tên) | `src/utils/notification-message.ts` |
| i18n copy builder | `src/app/_utils/get-notifications-copy.ts` |
| Copy contract + default | `src/app/_shared/site-chrome.ts:50-61,95-108,116-128` |
| Namespace i18n | `messages/vi.json:104-115`, `messages/en.json:104-115` |
| Wiring `unreadCount` vào `SiteViewer` (`/`, `/awards`, `/kudos`) | `src/app/_utils/get-viewer.ts:29-46` |
| Wiring `unreadCount` riêng cho `/profile` (không gọi `getViewer()`, nợ có sẵn) | `src/app/(protected)/profile/page.tsx:104-113,135-139` |
| E2E màn hình | `tests/e2e/notifications.spec.ts` (838 dòng, TC-001..021 trừ TC-014 skip) |

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [overview.md](../../system/overview.md) | — | [ ] |
| Feature List | [feature-list.md](../../generated/feature-list.md) | F012 | [ ] |
| Permissions Matrix | [permissions-matrix.md](../../generated/permissions-matrix.md) | TBD (draft) | [ ] |
| Screens | [SCR003_Home](../../screens/SCR003_Home/spec.md), [SCR004_Awards](../../screens/SCR004_Awards/spec.md), [SCR006_Profile](../../screens/SCR006_Profile/spec.md), [SCR007_KudosLiveBoard](../../screens/SCR007_KudosLiveBoard/spec.md) | SCR003, SCR004, SCR006, SCR007 | [ ] |
| Behavior Logic | [behavior-logic.md](../../generated/behavior-logic.md) | TBD (draft) | [ ] |
| User Stories | [user-stories.md](../../generated/user-stories.md) | N/A — local US, không đăng ký | [ ] |
