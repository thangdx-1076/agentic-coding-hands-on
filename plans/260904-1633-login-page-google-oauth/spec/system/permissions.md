---
status: draft
authored_by: takumi
created: 2026-09-04
lang: vi
---

# Permissions

**Phạm vi**: F001_GoogleOAuthLogin (route-guard) — forward-draft, chưa có code. Không có RBAC trong phạm vi này.

## Overview

Hệ thống KHÔNG có vai trò/quyền phân biệt (no RBAC) — mọi tài khoản Google hợp lệ đăng nhập thành công đều có cùng quyền truy cập `/todo`. Cơ chế phân quyền duy nhất là **route-guard theo trạng thái đăng nhập** (đã auth / chưa auth), không theo role hay ownership.

## Actors/Roles

| Actor | Mô tả | Quyền |
|---|---|---|
| Anonymous visitor | Chưa đăng nhập | Xem `/login`; không vào được `/todo` |
| Authenticated user | Đã đăng nhập Google (bất kỳ tài khoản nào) | Vào `/todo`; không quay lại `/login` hoặc `/` |

Không có role admin/manager/owner nào trong phạm vi F001/F002 — TBD (draft) nếu tương lai cần RBAC.

## Route Access Matrix

| Route | Anonymous | Authenticated | Redirect khi vi phạm |
|---|---|---|---|
| `/` | Redirect → `/login` | Redirect → `/todo` | luôn redirect, không render |
| `/login` | Render form | Redirect → `/todo` | authenticated → `/todo` |
| `/auth/callback` | Cho phép (xử lý PKCE code) | Cho phép | lỗi → `/login?error=...` |
| `/todo` | Redirect → `/login` | Render placeholder | anonymous → `/login` |

`PERM###` cho từng gate: TBD (draft) — cấp khi promote (`docs/generated/permissions-matrix.md`).

## Guard Mechanisms

Hai lớp, theo pattern chính thức Next.js (optimistic proxy + authoritative check tại nguồn dữ liệu):

1. **Optimistic — `proxy.ts`** (Next 16, đổi tên từ `middleware.ts`): đọc session cookie qua `getUser()` nhẹ, redirect sớm cho `/login` và `/todo`. KHÔNG phải lớp phòng vệ duy nhất.
2. **Authoritative — `/todo` (Server Component)**: gọi lại `createClient().auth.getUser()` server-side trước khi render — không tin riêng kết quả của proxy.

Không có guard nào khác trong phạm vi này (`/auth/callback` tự xử lý code/error qua query param, không cần session sẵn có).

## Session Lifecycle

- **Tạo session**: `signInWithOAuth` (PKCE) → redirect Google → `/auth/callback?code=...` → `exchangeCodeForSession(code)` → session cookie set bởi `@supabase/ssr`.
- **Đọc session**: `getUser()` (không dùng `getSession()` phía server — `getUser()` xác thực lại với Supabase, tránh tin cookie có thể bị giả mạo).
- **Kết thúc session**: nút "Đăng xuất" trên `/todo` → Server Action `signOut()` → xoá session cookie → redirect `/login`.
- **Thất bại/hủy OAuth**: GoTrue redirect `/auth/callback?error=...` → app redirect `/login?error=...` → thông báo lỗi inline, không tạo session.
- Thời hạn session/refresh-token: theo cấu hình mặc định của `saa-app` — TBD (draft), chưa xác nhận riêng cho project.

## Open Points

- RBAC/role tương lai (nếu SAA 2025 cần phân quyền admin/BTC): ngoài phạm vi hiện tại, TBD (draft).
- `PERM###` codes cho từng gate (`/login`, `/todo`, `/auth/callback`): TBD (draft), cấp khi promote.
- Rate-limit/brute-force protection cho `/auth/callback`: chưa quyết định, TBD (draft) — không có trong `clarifications.md`.
