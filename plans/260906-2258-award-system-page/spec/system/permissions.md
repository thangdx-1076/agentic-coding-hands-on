---
status: draft
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Permissions — Delta cho F004_AwardSystemPage

**Phạm vi:** chỉ những gì THAY ĐỔI trong `docs/vi/system/permissions.md` khi F004 lên code thật.

## `/awards` là PUBLIC — không route-guard

`/awards` gia nhập đúng nhóm với `/` (F003): nội dung công khai, không qua bất kỳ guard đăng
nhập nào, xem được bởi Anonymous lẫn Authenticated (member/admin) — không phân biệt.

**Lý do (trích `docs/vi/system/permissions.md:54`):** "Homepage SAA là trang giới thiệu sự
kiện (giải thưởng, đếm ngược, thông tin sự kiện) — nội dung vốn dành cho toàn bộ nhân viên kể
cả trước khi họ đăng nhập; không có lý do nghiệp vụ nào để khoá nó sau route-guard." `/awards`
là ĐÚNG loại nội dung ấy — chi tiết hoá đúng 6 hạng mục giải mà `/` đã quảng bá tóm tắt; khoá nó
lại sẽ đá khách chưa đăng nhập ra khỏi chính nội dung mà 6 link công khai trên `/` (header/
footer/CTA/thẻ giải) đang mời họ xem.

**MoMorph TC ID-1 bị supersede:** test case gốc kỳ vọng khách chưa đăng nhập bị redirect
`/login` khi vào `/he-thong-giai`. Quyết định kiến trúc 2026-09-06 (`clarifications.md`) ghi đè
kỳ vọng này — cùng cách PERM001_RootRouteGuard đã supersede cho `/`. TC ID-0 (đã đăng nhập xem
được) vẫn thoả nguyên vẹn.

## Bảng permission-item mới

`public.awards` là bảng THỨ 2 (sau `public.users`) nhưng KHÔNG tạo permission-item mới nào —
không route/resource nào bị chặn theo dữ liệu trong bảng này; RLS `awards_select_all` mở cho cả
`anon` và `authenticated`, không phân nhánh theo `role`. Hệ thống vẫn giữ nguyên phân loại
`other` (xem `permissions.md` § Authorization System Type) — F004 không đổi trục phân quyền.

## Cập nhật Access Boundaries

`/awards` tham gia đúng nhóm PUBLIC hiện có với `/` — không mở rộng khái niệm mới, chỉ thêm 1
route vào danh sách route KHÔNG qua route-guard: `/`, `/awards`. `/login`, `/todo` không đổi.

## Special Conditions bổ sung

- **Fail-open cho nội dung giải, không phải cho quyền truy cập:** DAL `getAwards` fail-open
  trả `[]` khi Supabase lỗi — đây là fail-open NỘI DUNG (empty-state), không phải fail-open
  QUYỀN (trang vẫn luôn public, không có nhánh nào biến `/awards` thành protected khi lỗi).
  Cùng triết lý `getUserRole` fail-open `"member"` ở F003: một lỗi đọc dữ liệu không được phép
  biến thành một quyết định phân quyền.
- **5 route đích liên kết chưa tồn tại** (kế thừa từ F003, permissions.md hiện có): `/kudos`
  vẫn nằm trong danh sách này — nút "Chi tiết" của khối Kudos trên `/awards` trỏ tới đó, cùng
  404 tạm thời như trên `/`. Không phải khoảng trống phân quyền mới.
