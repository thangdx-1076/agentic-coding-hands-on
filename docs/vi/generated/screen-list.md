# Screen List

## SCR001_Login

**Feature:** F001 — Đăng nhập Google OAuth & Bảo vệ truy cập
**Route:** /login
**Description:** Màn đăng nhập SAA 2025 — header (logo + vùng bộ chọn ngôn ngữ do F002 sở hữu), hero "ROOT FURTHER" với nút "LOGIN With Google", footer bản quyền; hiện thông báo lỗi inline khi URL có `?error=`.
**States:** loading, error, redirect

## SCR002_Todo

**Feature:** F001 — Đăng nhập Google OAuth & Bảo vệ truy cập
**Route:** /todo
**Description:** Placeholder được bảo vệ sau đăng nhập — `<h1>` chào kèm email người dùng và nút "Đăng xuất"; xác thực lại authoritative bằng `getUser()` trước khi hiển thị.
**States:** submitting, redirect
