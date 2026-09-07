# Tính năng F007_KudosLiveBoard — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` theo nghĩa "đã đăng ký vào `docs/`" — spec được promote ở
**implement-start** (trước phase 01 của `plans/260907-1725-kudos-live-board/`), KHÁC F003-F006 vốn
promote sau khi code xanh. Bằng chứng RED/GREEN và visual capture do phase 01/14 sinh ra.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | [`docs/vi/screens/SCR007_KudosLiveBoard/spec.md`](../../screens/SCR007_KudosLiveBoard/spec.md) |

SCR007 dùng CHUNG với F008_KudosHeartReaction — F007 sở hữu board (component, JSX, số tim hiển
thị), F008 sở hữu bảng `kudo_hearts` và đường ghi `toggleKudoHeart`.

## Mã đã cấp (allocation log)

Đọc `docs/vi/generated/{feature-list,user-stories,screen-list,route-list,behavior-logic,
permissions-matrix}.md` trước khi cấp mã, max hiện có trước lượt này:

| Registry | Max trước lượt này | F007 dùng gì |
|---|---|---|
| F### | F006_ProfilePage | **F007_KudosLiveBoard** — cấp trong block liền `[F007..F008]` cùng F008 (batch SYSTEM promote), đã đăng ký vào `feature-list.md` và `_canonical-fcodes.json` |
| SCR### | SCR006_Profile | **SCR007_KudosLiveBoard** (mới, next free) — đã đăng ký vào `screen-list.md`, có `spec.md` riêng, dùng chung với F008 |
| US### (registry chính thức `user-stories.md`) | US003 (chỉ F001/F002 đăng ký) | **Không đăng ký mới** — theo đúng tiền lệ F003-F006, F007 dùng **US001-US008 local/draft** riêng (xem functional-spec.md § 7) |
| ROUTE### | ROUTE001 (chỉ `/auth/callback`, F001) | **Không cấp mới** — `/kudos` là 1 frontend page + 2 Server Action (`loadMoreKudos`, và `toggleKudoHeart` thuộc F008), không route BE nào tự viết; cùng lý do F004-F006 |
| BL### | BL003 | **Không cấp mới** — dùng lại `SupabaseServerClient` (BL002) qua DAL mới `src/dal/kudos.ts`, cùng pattern `awards.ts`/`profile-cards.ts` |
| PERM### | PERM004 | **Không cấp mới** — `/kudos` PUBLIC, không route-guard, gia nhập đúng nhóm `/`, `/awards`, `/standards`; redirect khi bấm avatar/tên là gate CÓ SẴN của `/profile` (F006), không phải gate mới |
| MODEL### | *(xem `docs/vi/generated/entities.md`)* | **Không cấp mới** — `Kudo`/`KudoCard` (bảng `public.kudos` + view `public.kudos_cards`, migration `0006`) chờ core pass kế tiếp cấp mã, cùng cách `Award` và `ProfileCard` đang chờ; `users.department` là cột MỚI mở rộng MODEL002_SupabaseUser |

Không có xung đột mã nào với F001-F006 / SCR001-SCR006.

## Giới hạn của spec này

- Promote ở implement-start → mọi tham chiếu code trong 2 spec đều mang nhãn `(planned)` /
  `TBD (draft)`; nguồn sự thật là `clarifications.md` + 64 spec item / 41 test case MoMorph
  (`plans/260907-1725-kudos-live-board/momorph/`).
- 5 bề mặt bị hoãn vì cần một frame Figma chưa tồn tại: dialog Viết Kudo (`ihQ26W78P2`), dialog
  Secret Box (`J3-4YFIpMM`), trang chi tiết kudo (`onDIohs2bS`), hover preview profile
  (`Bf5XiTE7AO`), lightbox ảnh. Kèm theo: pan/zoom Spotlight (`B.7.2` là FRAME rỗng).
- `screen-flow.md` CHƯA có SCR007 (core pass sở hữu — sẽ đồng bộ sau khi `/kudos` lên code).
