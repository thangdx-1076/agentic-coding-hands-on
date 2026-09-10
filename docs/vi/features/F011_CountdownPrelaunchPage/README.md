# Tính năng F011_CountdownPrelaunchPage — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` — đã lên code (nhánh `feat/countdown-prelaunch-page`, chưa merge
`main` tính đến 2026-09-08), xác nhận theo `src/app/(public)/prelaunch/page.tsx`,
`src/domain/prelaunch-lock.ts`, `src/proxy.ts` (mở rộng).

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Countdown Prelaunch | SCR009_CountdownPrelaunch | [`docs/vi/screens/SCR009_CountdownPrelaunch/spec.md`](../../screens/SCR009_CountdownPrelaunch/spec.md) |

SCR009 là route riêng `/prelaunch`, atomic, PUBLIC, không route-guard cho chính nó.

## Mã đã cấp (allocation log)

| Registry | Max trước lượt này | F011 dùng gì |
|---|---|---|
| F### | F010_SecretBoxModal | **F011_CountdownPrelaunchPage** (next free) — đã đăng ký vào `feature-list.md` và `_canonical-fcodes.json` |
| SCR### | SCR008_KudosCompose | **SCR009_CountdownPrelaunch** (mới, next free) — đã đăng ký vào `screen-list.md`, có `spec.md` riêng |
| US### (registry chính thức `user-stories.md`) | US003 | **Không đăng ký mới** — dùng US001-US002 local/draft (functional-spec.md § 7), cùng tiền lệ F003-F010 |
| ROUTE### | ROUTE001 | **1 route frontend mới, chưa cấp mã chính thức** — (GET) `/prelaunch`, không phải backend route handler theo quy ước `route-list.md`; xem `route-list.md § File: src/app/(public)/prelaunch/page.tsx` |
| BL### | BL003 | **Không cấp mới** — `src/domain/prelaunch-lock.ts` là domain logic thuần (không I/O), không khớp 10 loại BL### đã liệt kê |
| PERM### | PERM004 | **Chưa cấp — TBD (draft)** — redirect toàn site về `/prelaunch` khi `PRELAUNCH_LOCK_ENABLED=true` và countdown chưa về 0, áp cho MỌI route kể cả whitelist cũ của `proxy.ts`; mã chính thức chờ `rebuild-spec` Core pass kế tiếp. Xem `docs/vi/system/permissions.md § Bổ sung dự kiến — CountdownPrelaunchPage`. |
| MODEL### | *(xem `entities.md`)* | **Không có model mới** — 2 biến môi trường (`EVENT_START_AT`, `PRELAUNCH_LOCK_ENABLED`) là nguồn dữ liệu duy nhất, không bảng/view Supabase nào |

Không có xung đột mã nào với F001-F010 / SCR001-SCR008.

## Giới hạn của spec này

- Vì sao đây là outcome RIÊNG, không gộp vào F001 (route-guard): F001 gác theo TRẠNG THÁI ĐĂNG
  NHẬP; F011 gác theo THỜI ĐIỂM + CỜ CẤU HÌNH, áp dụng đồng nhất bất kể actor đã đăng nhập hay
  chưa — một trục khoá hoàn toàn khác, không phải một route-guard mới theo nghĩa PERM001-004.
- 3 module logic đếm ngược trước đây thuộc riêng `/` đã climb lên Zone A dùng chung:
  `src/utils/countdown.ts`, `src/app/(public)/_hooks/use-countdown.ts`,
  `src/app/(public)/_components/countdown-tiles.tsx` — F003_Homepage's technical-spec.md chưa phản
  ánh vị trí mới này (xem ghi chú tại `docs/vi/features/F003_Homepage/technical-spec.md`).
- Nhánh khoá `proxy.ts` chạy TRƯỚC mọi predicate auth hiện có (PERM001-004) — thứ tự as-built nằm
  trong `src/domain/prelaunch-lock.ts` (hàm `planProxy`).
