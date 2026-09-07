# Tính năng F006_ProfilePage — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `draft` (Stage 1.5 spec draft) — chưa implement, chưa promote vào `docs/`.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — được đề xuất triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Hồ sơ Sunner | SCR006_Profile | *(chưa có `SCR006_Profile/spec.md` riêng — spec draft, chưa registry hoá)* |

## Mã đã cấp (allocation log)

Đọc `docs/vi/generated/{feature-list,user-stories,screen-list,route-list,behavior-logic,
permissions-matrix}.md` trước khi cấp mã, max hiện có trước lượt này:

| Registry | Max trước lượt này | F006 dùng gì |
|---|---|---|
| F### | F005_StandardsRulesPage | **F006_ProfilePage** (mới, next free — nhưng CHƯA đăng ký vào `feature-list.md`, spec draft chỉ nằm ở `plans/`) |
| SCR### | SCR005_Standards | **SCR006_Profile** (mới, next free, cùng lý do trên) |
| US### (registry chính thức `user-stories.md`) | US003 (chỉ F001/F002 đăng ký) | **Không đăng ký mới** — theo đúng tiền lệ F003-F005 (`feature-list.md` § F003-F005: "TBD (draft)"), F006 dùng **US001-US003 local/draft** riêng của feature này (xem functional-spec.md § 7) |
| ROUTE### | ROUTE001 (chỉ `/auth/callback`, F001) | **Không cấp mới** — `/profile` là 1 frontend page (`page.tsx`), không có route BE nào tự viết, cùng lý do F004/F005 không cấp ROUTE### |
| BL### | BL003 | **Không cấp mới** — `/profile` dùng lại `SupabaseServerClient` (BL002) đã có, không thêm loại client mới nào |
| PERM### | PERM004 | **TBD (draft)** — `/profile` gia nhập nhóm route-guard hiện có của `(protected)/layout.tsx` (cùng cơ chế PERM003_TodoRouteGuard), nhưng là 1 route bảo vệ MỚI khác `/todo`; mã chính thức để `rebuild-spec` Core pass kế tiếp cấp khi feature này lên code thật — cùng tiền lệ mà `permissions.md` đã dùng cho nhãn `role` ở F003 (§ Identified Roles: "TBD (draft)") |
| MODEL### | *(xem `docs/vi/generated/entities.md`)* | **Không cấp mới cho `profile_cards`** — đây là 1 VIEW phái sinh từ `MODEL002_SupabaseUser` (`public.users`), không phải 1 entity độc lập; implementer/rebuild-spec quyết định lại khi có code thật |

Không có xung đột mã nào với F001-F005 / SCR001-SCR005.

## Giới hạn của spec draft này

MoMorph MCP tools không có sẵn cho researcher lúc viết bản đầu — bản đầu suy luận toàn bộ từ
`clarifications.md`. Coordinator sau đó tự chạy `get_frame`/`download_specs`/`download_test_cases`/
`get_frame_image` (frame `362:5037`, "Profile bản thân") và gửi lại node id + copy verbatim; bản
hiện tại của cả 2 spec đã cập nhật theo dữ liệu thật đó (node id khoá DOM contract § 4.5, copy
5 dòng statistics card + tiêu đề badge collection § 4.3 kỹ thuật spec, xác nhận `SiteHeader`/
`SiteFooter` có mặt, xác nhận thanh "Viết Kudo" thay thế toàn bộ slot statistics-card). Khoảng hở
CÒN LẠI (không nằm trong dữ liệu coordinator gửi): copy trạng thái rỗng của dropdown Kudos, tên
hiển thị fallback khi thiếu `full_name`, semantic slug của 6 badge slot, asset PNG/SVG thật (có
node id, chưa export file) — xem technical-spec.md § 5.2 cho danh sách đầy đủ.
