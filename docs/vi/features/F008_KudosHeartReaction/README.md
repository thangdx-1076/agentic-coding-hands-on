# Tính năng F008_KudosHeartReaction — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` theo nghĩa "đã đăng ký vào `docs/`" — spec được promote ở
**implement-start** (trước phase 01 của `plans/260907-1725-kudos-live-board/`). Bằng chứng
RED/GREEN do phase 01/14 sinh ra.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | [`docs/vi/screens/SCR007_KudosLiveBoard/spec.md`](../../screens/SCR007_KudosLiveBoard/spec.md) |

F008 KHÔNG có route hay screen riêng — nút tim là 1 control nằm trong `/kudos` mà
F007_KudosLiveBoard sở hữu và render. Ranh giới: F007 render nút + số tim; F008 sở hữu bảng
`kudo_hearts`, RLS, và con đường ghi duy nhất (`toggleKudoHeart`).

## Mã đã cấp (allocation log)

| Registry | Max trước lượt này | F008 dùng gì |
|---|---|---|
| F### | F006_ProfilePage | **F008_KudosHeartReaction** — cấp trong block liền `[F007..F008]` cùng F007 (batch SYSTEM promote) |
| SCR### | SCR006_Profile | **Không cấp mới** — dùng chung SCR007_KudosLiveBoard do F007 tạo |
| US### (registry chính thức `user-stories.md`) | US003 | **Không đăng ký mới** — US001 local/draft riêng (xem functional-spec.md § 7), đúng tiền lệ F003-F007 |
| ROUTE### | ROUTE001 | **Không cấp mới** — `toggleKudoHeart` là Next.js Server Action, không phải HTTP endpoint có path (cùng lý do `setLocale` ở F002) |
| BL### | BL003 | **Không cấp mới** — dùng lại `SupabaseServerClient` (BL002) qua DAL mới `src/dal/kudo-hearts.ts` |
| PERM### | PERM004 | **TBD (draft)** — quyền ghi tim là RLS trên `public.kudo_hearts` (chỉ `authenticated`, chỉ row của chính mình), không phải route-guard; mã chính thức để core pass kế tiếp cấp, cùng tiền lệ mà F006 đã dùng |
| MODEL### | *(xem `docs/vi/generated/entities.md`)* | **Không cấp mới** — `KudoHeart` (bảng `public.kudo_hearts`, migration `0007`) chờ core pass |

Không có xung đột mã nào với F001-F007 / SCR001-SCR007.

## Giới hạn của spec này

- Quy tắc "+2 tim trong ngày đặc biệt do admin cấu hình" bị HOÃN — không có màn admin, không bảng
  config, không dựng nổi precondition của test case. Cột `special` vẫn tạo sẵn trong migration
  `0007` để lần sau không phải migrate lại.
- ⚠ Lượt tim cộng cho **người GỬI** kudo (phân xử bằng test case khi design tự mâu thuẫn — xem
  `plans/260907-1725-kudos-live-board/clarifications.md` § Bổ sung 260907-1759). **Cần product xác
  nhận lại** — đã ghi vào `plans/action-items.md`.
- `heart_count` là cột denormalized trên `kudos` do TRIGGER trên `kudo_hearts` duy trì (AD-1 trong
  `plan.md`), KHÔNG phải `COUNT` trực tiếp như § 1 của technical-spec mô tả ban đầu.
