# Tính năng F010_SecretBoxModal — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` — đã merge vào code thật, xác nhận theo `src/app/(public)/kudos/
_components/{secret-box-launcher,secret-box-dialog}.tsx`, `src/dal/secret-box.ts`, migration
`0011_secret_box.sql`.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | [`docs/vi/screens/SCR007_KudosLiveBoard/spec.md`](../../screens/SCR007_KudosLiveBoard/spec.md) |

F010 KHÔNG có route hay screen riêng — modal Secret Box phủ trên SCR007_KudosLiveBoard mà
F007_KudosLiveBoard sở hữu và render. Ranh giới: F007/F008 sở hữu board và lượt tim; F010 sở hữu
bảng `secret_box_openings` và hàm RPC `open_secret_box()`.

## Mã đã cấp (allocation log)

| Registry | Max trước lượt này | F010 dùng gì |
|---|---|---|
| F### | F009_KudosCompose | **F010_SecretBoxModal** (next free) — đã đăng ký vào `feature-list.md` và `_canonical-fcodes.json` |
| SCR### | SCR008_KudosCompose | **Không cấp mới** — dùng chung SCR007_KudosLiveBoard do F007 tạo |
| US### (registry chính thức `user-stories.md`) | US003 (chỉ F001/F002 đăng ký) | **Không đăng ký mới** — dùng US001-US003 local/draft (functional-spec.md § 7), cùng tiền lệ F003-F009 |
| ROUTE### | ROUTE001 | **Không cấp mới** — `openSecretBoxAction` là Next.js Server Action gọi `.rpc("open_secret_box")`, không phải HTTP endpoint có path |
| BL### | BL003 | **Không cấp mới** — RPC `open_secret_box()` là hàm Postgres `SECURITY DEFINER`, logic trong DB, không phải BL### client |
| PERM### | PERM004 | **Chưa cấp — TBD (draft)** — `REVOKE ALL ... FROM anon, PUBLIC` rồi `GRANT EXECUTE ... TO authenticated` trên RPC, không phải route-guard nên không gia nhập PERM001-004; mã chính thức chờ `rebuild-spec` Core pass kế tiếp. Xem `docs/vi/system/permissions.md`. |
| MODEL### | *(xem `entities.md`)* | **Không cấp mới** — `SecretBoxOpening` (bảng `public.secret_box_openings`, migration `0011`) chờ core pass kế tiếp |

Không có xung đột mã nào với F001-F009 / SCR001-SCR008.

## Giới hạn của spec này

- Entitlement tính theo lượt tim chính người dùng đã **GỬI** (không phải nhận) — cứ 5 lượt tim thì
  được thêm 1 hộp; toàn bộ tính entitlement, rút ngẫu nhiên có trọng số, và chống double-click/đa
  tab chạy trong `open_secret_box()` (migration `0011`), `.rpc()` đầu tiên của repo.
- 6 badge Secret Box khai báo lại cục bộ tại `src/app/(public)/kudos/_utils/secret-box-badge-asset.ts`
  — KHÔNG dời từ `standards/_shared/standards-copy.ts` như bản draft ban đầu từng giả định.
- Ngoài phạm vi: nút "Mở Secret Box" trên `/profile` giữ `disabled` (chưa có đường ống stats thật,
  xem `functional-spec.md § 3` D002); phản chiếu huy hiệu vừa nhận vào `BadgeCollection` của
  `/profile` (D003) — bảng `secret_box_openings` đã đủ dữ liệu để làm sau, ngoài scope PR này.
