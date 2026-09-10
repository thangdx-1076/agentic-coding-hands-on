# Tính năng F012_NotificationsPanel — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` — đã lên code (nhánh `feat/notifications-panel`, chưa merge `main`
tính đến 2026-09-09), xác nhận theo `supabase/migrations/0012_notifications.sql`,
`0013_notification_emitters.sql`, `src/api/notifications.ts`,
`src/app/_components/notifications/**`.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

F012 KHÔNG tạo SCR### mới — chuông + panel thông báo render qua `SiteHeader` dùng chung, xuất hiện
trên 4 màn hình đã có sẵn:

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Trang chủ (Homepage) | SCR003_HomeScreen | [`docs/vi/screens/SCR003_Home/spec.md`](../../screens/SCR003_Home/spec.md) |
| Hệ thống giải thưởng SAA 2025 | SCR004_Awards | [`docs/vi/screens/SCR004_Awards/spec.md`](../../screens/SCR004_Awards/spec.md) |
| Hồ sơ Sunner | SCR006_Profile | [`docs/vi/screens/SCR006_Profile/spec.md`](../../screens/SCR006_Profile/spec.md) |
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | [`docs/vi/screens/SCR007_KudosLiveBoard/spec.md`](../../screens/SCR007_KudosLiveBoard/spec.md) |

## Mã đã cấp (allocation log)

| Registry | Max trước lượt này | F012 dùng gì |
|---|---|---|
| F### | F011_CountdownPrelaunchPage | **F012_NotificationsPanel** (next free) — đã đăng ký vào `feature-list.md` và `_canonical-fcodes.json` |
| SCR### | SCR009_CountdownPrelaunch | **Không cấp mới** — dùng chung SCR003/SCR004/SCR006/SCR007 qua `SiteHeader` |
| US### (registry chính thức `user-stories.md`) | US003 | **Không đăng ký mới** — dùng US001-US004 local/draft (functional-spec.md § 7), cùng tiền lệ F007-F011 |
| ROUTE### | ROUTE001 | **Không cấp mới** — `markReadAction`/`markAllReadAction` là Next.js Server Action, không phải HTTP endpoint có path; đọc/realtime đi qua DAL + Supabase JS client trực tiếp từ browser |
| BL### | BL003 | **Không cấp mới** — 2 trigger `SECURITY DEFINER` là logic trong DB (cùng lý do `sync_kudo_heart_count` của F008); đọc/realtime dùng `@supabase/ssr`/`@supabase/supabase-js` trực tiếp, không qua factory client kiểu BL001-003 |
| PERM### | PERM004 | **Chưa cấp — TBD (draft)** — trục ĐỌC own-row mới qua RLS (`notifications_select_own`/`notifications_update_own_read`) + Realtime, cộng `GRANT UPDATE (is_read)` theo cột (lần đầu dự án dùng GRANT cột thay vì chỉ policy theo hàng); không phải route-guard nên không gia nhập PERM001-004. Xem `docs/vi/system/permissions.md § Bổ sung dự kiến — F012_NotificationsPanel`. |
| MODEL### | *(xem `entities.md`)* | **Không cấp mới** — `Notification` (bảng `public.notifications`, migration `0012`) chờ core pass kế tiếp |

Không có xung đột mã nào với F001-F011 / SCR001-SCR009.

## Giới hạn của spec này

- Vì sao đây là outcome RIÊNG, không gộp vào F007/F008/F009/F010: các feature đó xoay quanh MỘT
  trang (`/kudos`). F012 là một header component cross-cutting phục vụ MỌI trang có `SiteHeader` —
  ý định người dùng ("biết ai vừa ghi nhận mình") độc lập với trang đang đứng, và ranh giới dữ liệu
  (RLS own-row + realtime trên bảng mới) không thuộc về bất kỳ feature `/kudos` nào ở trên.
- Enum 4 giá trị của `notifications.type` chỉ có 2 emitter thật (`kudos_received`,
  `heart_received`); `secret_box_available` và `kudos_hidden` ship đủ giá trị + renderer nhưng
  KHÔNG có nguồn sự kiện tương ứng trong repo — nợ có tên, xem `functional-spec.md § 11` và
  `plans/action-items.md`.
- F003_Homepage's technical-spec.md vẫn mô tả chuông thông báo là dialog tĩnh "chưa có backend" —
  đó là claim đã lỗi thời kể từ khi F012 merge (xem ghi chú tại
  `docs/vi/features/F003_Homepage/technical-spec.md`).
