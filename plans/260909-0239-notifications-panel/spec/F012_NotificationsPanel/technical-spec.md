---
status: draft
authored_by: takumi
fcode: F012
created: 2026-09-09
lang: vi
---

# F012_NotificationsPanel

**Priority**: P1 · **Type**: mixed

Đối chiếu FR ↔ hiện thực. Mã `EC*`/`BL*`/`US*` giữ nguyên từ 21 test case MoMorph
(`TC-F007-001..021`) để truy vết ngược được; **`TC-F007-*` là numbering của dự án khác**,
F007 trong repo này là `F007_KudosLiveBoard`.

## 1. Thực thể

### `public.notifications` (mới — migration `0012`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` NOT NULL | → `public.users(id)` `ON DELETE CASCADE` — **người NHẬN** |
| `type` | `text` NOT NULL | CHECK ∈ `kudos_received`, `heart_received`, `secret_box_available`, `kudos_hidden` |
| `payload` | `jsonb` NOT NULL DEFAULT `'{}'` | Hợp đồng theo loại, § 2 |
| `is_read` | `boolean` NOT NULL DEFAULT `false` | |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

**Index** — `(user_id, created_at DESC, id DESC)` phục vụ keyset; `(user_id) WHERE is_read = false`
phục vụ đếm chưa đọc.

**Dedupe `heart_received` (FR-404)** — unique index bộ phận:
`UNIQUE (user_id, type, (payload->>'kudosId'), (payload->>'actorId')) WHERE type = 'heart_received'`.
Không dùng `ON CONFLICT DO NOTHING` ở tầng app thay cho ràng buộc DB: bỏ tim/thả lại là hai
transaction khác nhau, chỉ ràng buộc ở DB mới đúng dưới đồng thời.

**RLS (FR-602)** — bật + FORCE. Chỉ 2 policy:
- `notifications_select_own` — `SELECT` khi `user_id = auth.uid()`
- `notifications_update_own_read` — `UPDATE` khi `user_id = auth.uid()`, chỉ cho đổi `is_read`

**Không có INSERT policy cho người dùng.** Ghi thông báo đi qua `SECURITY DEFINER` function
(§ 3), giống `sync_kudo_heart_count()` (`0007`) và `open_secret_box()` (`0011`) — người nhận
không bao giờ là người ghi, nên không được cấp quyền ghi.

**Realtime** — thêm bảng vào publication `supabase_realtime`. Realtime tôn trọng RLS, nhưng
**phải kiểm bằng test thật** (TC-F007-002), không tin suông.

## 2. Hợp đồng payload

| `type` | payload | Nguồn |
|---|---|---|
| `kudos_received` | `{kudosId, senderName}` | `senderName` = `anonymous_name` khi `is_anonymous`, ngược lại tên thật |
| `heart_received` | `{kudosId, actorId, actorName}` | `actorId` chỉ dùng để dedupe |
| `secret_box_available` | `{boxId, sourceKudosId?}` | **không có emitter v1** |
| `kudos_hidden` | `{kudosId}` | **không có emitter v1**; cố ý không có danh tính người kiểm duyệt |

**BL03/EC002** — Kudos ẩn danh: payload chỉ được chứa biệt danh. Tên thật và `sender_id` **tuyệt
đối không** vào payload. `public.kudos` vẫn giữ `sender_id` cho RLS/audit như migration `0009`;
ranh giới ẩn danh nằm ở chỗ đọc, không ở chỗ lưu.

## 3. Đường phát thông báo

Cả hai emitter chạy trong **SQL trigger `SECURITY DEFINER`**, không phải trong server action.

**Vì sao trigger chứ không phải action:**
1. `create-kudo.ts` insert 1 dòng, **không có transaction** (Study § 1). Thêm một lần ghi thứ hai
   ở tầng app tạo cửa sổ ghi-một-nửa.
2. Thả tim đã có tiền lệ: `heart_count` do trigger `sync_kudo_heart_count()` giữ, và trigger là
   **writer duy nhất** của cột đó (`0007:99-129`). Phát thông báo cùng chỗ thì cùng một
   transaction với chính sự kiện sinh ra nó.
3. FR-405 (ghi hỏng không được làm hỏng thao tác gốc) xử lý bằng `EXCEPTION WHEN OTHERS THEN
   RAISE WARNING` bên trong trigger — hỏng thì kêu, không nuốt im, và không rollback thao tác gốc.

| Trigger | Trên | Làm gì |
|---|---|---|
| `emit_kudos_received()` | `AFTER INSERT ON public.kudos` | `NEW.sender_id = NEW.receiver_id` → **RETURN, không phát** (FR-402/EC001/BL02). Ngược lại insert `kudos_received` cho `NEW.receiver_id`, `senderName` chọn theo `NEW.is_anonymous` |
| `emit_heart_received()` | `AFTER INSERT ON public.kudo_hearts` | Insert `heart_received` cho **`kudos.sender_id`** của kudo được thả tim (xem ghi chú dưới); đụng unique index bộ phận → nuốt `unique_violation`, đó là dedupe đúng ý (FR-404). **Không** có trigger trên DELETE — bỏ tim không xoá thông báo (EC004) |

**Ai nhận `heart_received`? — người GỬI kudo, không phải người nhận kudo.**
Message là "{actorName} đã thả tim Kudos **của bạn**", và "Kudos của bạn" = kudo bạn viết ra.
Căn cứ trong chính repo: `open_secret_box()` (migration `0011`) tính suất box bằng
`SUM(k.heart_count) WHERE k.sender_id = v_user_id`, kèm comment "Hearts credit the kudo's
SENDER". Nếu thông báo đi theo `receiver_id`, tim sẽ **ghi công cho một người và báo cho người
khác** — hai định nghĩa lệch nhau trong cùng một hệ thống. TC-013 kiểm đúng chiều này.

Tự thả tim cho Kudos của mình: cũng bỏ qua, cùng lý do FR-402.

## 4. Đường đọc

Theo pattern DAL của repo (Study § 3): `notifications.ts` = logic thuần + client tiêm vào +
`server-only`; `notifications-client.ts` = bọc SDK thật.

| Hàm | Trả về | Ghi chú |
|---|---|---|
| `getUnreadCount(client, userId)` | `number` | fail-open `0` — badge hỏng không được làm sập header |
| `listNotifications(client, userId, cursor?)` | `{items, nextCursor}` | 10 mục, keyset `(created_at, id)` giảm dần, cursor mã hoá base64url |
| `markRead(client, userId, id)` | `{ok}` | Không thấy dòng → **`ok: false` chung một kiểu** cho cả "của người khác" lẫn "không tồn tại" (FR-603/EC013) |
| `markAllRead(client, userId)` | `{updated: number}` | 0 chưa đọc → `{updated: 0}`, không phải lỗi (FR-202) |

Server action bọc lại theo union `{ok: true | false}` như `create-kudo.ts`. **Không
`revalidatePath`** — theo tiền lệ `open-secret-box.ts`, revalidate sẽ unmount popup đang mở.
Panel tự refetch.

## 5. Đường render

| File | Việc |
|---|---|
| `src/app/_components/notification-bell.tsx` | **Sửa**: badge chấm → badge số, cap `9+` (FR-002); panel rỗng → gắn `NotificationPanel` |
| `src/app/_components/notifications/*` | **Mới**: panel, item, icon theo loại |
| `src/app/_hooks/use-notifications.ts` | **Mới**: nạp danh sách khi mở, phân trang, mark-read, đăng ký realtime |

Đóng/mở tái dùng `useMenuKeyboardNav` (đang dùng ở `account-menu`, `language-selector`,
`kudos-filter-menu`) — **không thêm dependency**. Spec gốc nói Radix Popover; repo không có Radix.

**Rủi ro đã biết:** `useMenuKeyboardNav` nhận `itemCount` cố định cho một vòng đời render
(docblock `account-menu.tsx`). Danh sách thông báo **thay đổi độ dài** khi bấm "Xem thêm" — đây
là chỗ hook hiện tại có thể không đủ. Blueprint phải quyết: mở rộng hook, hay panel dùng
`role="dialog"` như bản hiện tại thay vì `role="menu"`. **Không im lặng bỏ qua.**

## 6. i18n

Namespace **mới cấp cao** `notifications.*`: `title`, `markAllRead`, `loadMore`, `empty`,
`types.{4 loại}`. Dời `home.notifications.empty` sang đây; giữ `home.header.notificationsLabel`
tại chỗ (aria-label của nút, thuộc copy header).

`kudos_hidden` cần `t.rich` để nhúng link `/standards` — **repo chưa dùng `t.rich` ở đâu cả**
(Study § 8). Kỹ thuật mới ⇒ phải có test riêng.

Thời gian tương đối: `Intl.RelativeTimeFormat`, không thêm dependency. Hàm thuần, đặt ở
`src/utils/` để unit test bắt được (coverage allowlist của repo loại `.tsx`).

## 7. Đối chiếu test case

| TC | FR | Ghi chú |
|---|---|---|
| 001 | FR-601 | Không session → từ chối |
| 002 | FR-602 | RLS chặn cả đọc trực tiếp lẫn realtime của người khác |
| 003, 004, 005 | FR-002 | Ẩn khi 0 · hiện "3" · cap "9+" |
| 006 | FR-004 | |
| 007 | FR-005 | Seed 1 dòng mỗi loại — **cách duy nhất kiểm 2 loại không có emitter** |
| 008 | FR-006 | |
| 009 | FR-501 | Đổi ngôn ngữ hồi tố |
| 010, 011, 012 | FR-401/402/403 | |
| 013 | FR-404 | thả/bỏ/thả → đúng 1 dòng, sống sót qua lần bỏ tim |
| 014 | — | **OUT OF SCOPE** — cần admin moderation |
| 015 | FR-502 | Link `/standards` (không phải `/community-standards`) |
| 016, 017 | FR-201/202/203 | |
| 018 | FR-101/102/103 | |
| 019 | FR-301 | |
| 020 | FR-603 | Của người khác và không tồn tại → **không phân biệt được** |
| 021 | FR-405 | Emit hỏng không làm hỏng thao tác gốc |
