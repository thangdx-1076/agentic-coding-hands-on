# Feature List

## Feature Hierarchy

| # | Code | Feature | Priority | Type | Status |
|---|------|---------|----------|------|--------|
| 1 | F001 | Đăng nhập Google OAuth & Bảo vệ truy cập | P0 | mixed | implemented |
| 2 | F002 | Chuyển đổi ngôn ngữ giao diện (VN/EN) | P1 | ui | implemented |

## Feature Details

### F001 — Đăng nhập Google OAuth & Bảo vệ truy cập

**Priority:** P0 | **Type:** mixed | **Status:** implemented | **Slug:** F001_GoogleOAuthLogin

Khách truy cập đăng nhập SAA 2025 bằng tài khoản Google qua Supabase Auth (PKCE); thành công → `/todo` (placeholder được bảo vệ, có nút đăng xuất). Guard optimistic (`proxy.ts`) + xác thực authoritative (`getUser()` trên `/todo`) đảm bảo: đã đăng nhập không vào lại `/login`/`/`, chưa đăng nhập không vào được `/todo`. Đăng nhập thất bại/hủy → thông báo lỗi inline dưới nút Google.

**Related:** screens: SCR001, SCR002 | routes: — | models: —

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 7 design items (Header shell, Logo, Hero section, Hero Visual, Content block, nút Google Login, Footer — `momorph/specs.csv`) + màn `/todo` placeholder (chưa có spec MoMorph, tạo mới theo `clarifications.md`)

**Related Screens**:
- SCR001_Login: Màn Đăng nhập (`/login`) — sở hữu khung màn hình đầy đủ (header + hero + footer); vùng Language Selector trong header do F002 sở hữu riêng (partial-screen ownership)
- SCR002_Todo: Màn Todo placeholder được bảo vệ (`/todo`) — chào email người dùng + nút Đăng xuất

**Related User Stories** (intent-derived, chưa cấp US###):
- Khách đăng nhập bằng Google → được đưa tới `/todo`
- Khách đã đăng nhập cố vào `/login` hoặc `/` → tự động chuyển tới `/todo`
- Khách chưa đăng nhập cố vào `/todo` → tự động chuyển tới `/login`
- Khách đã đăng nhập bấm "Đăng xuất" → quay lại `/login`
- Khách thấy thông báo lỗi inline khi đăng nhập Google thất bại/bị hủy

**Related APIs/Routes**:
- (GET) `/auth/callback` — Route Handler nội bộ, đổi PKCE code lấy session (`exchangeCodeForSession`)
- (external) Supabase GoTrue `/auth/v1/authorize?provider=google` — endpoint khởi động OAuth, không phải route của app

**Related Data Models**: N/A — không có data model do app sở hữu; user/session do Supabase Auth quản lý ngoài app (`auth.users`, ngoài phạm vi MODEL### dự án)

**Related Background Logic**: TBD (chưa cấp BL###) — `/auth/callback` là Route Handler xử lý đồng bộ theo request, không khớp rõ 10 loại BL### chuẩn. Guard `proxy.ts` thuộc Permissions artifact (`docs/vi/system/permissions.md`)

**Related Permissions**:
- TBD (chưa cấp PERM###): route-guard — `proxy.ts` (Next 16) optimistic: đã auth vào `/login`/`/` → redirect `/todo`; chưa auth vào `/todo` → redirect `/login`. `/todo` xác thực lại authoritative bằng `getUser()` server-side

---

### F002 — Chuyển đổi ngôn ngữ giao diện (VN/EN)

**Priority:** P1 | **Type:** ui | **Status:** implemented | **Slug:** F002_LanguageSwitch

Khách chuyển ngôn ngữ giao diện VN/EN qua bộ chọn trên header màn `/login`. Lựa chọn lưu vào cookie `NEXT_LOCALE` (next-intl, no-routing mode — không dùng URL prefix), áp dụng lại toàn bộ nội dung UI ngay sau khi chọn. Mặc định `vi` khi chưa có cookie.

**Related:** screens: SCR001 (region: language-selector — partial-screen ownership, không sở hữu khung màn) | routes: — | models: —

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 1 design item (Language Selector — `momorph/specs.csv` item 1.2)

**Related Screens**:
- SCR001_Login / region: language-selector — vùng con trong header của màn `/login`; khung màn do F001 sở hữu (partial-screen ownership)

**Related User Stories** (intent-derived, chưa cấp US###):
- Khách chuyển đổi ngôn ngữ VN ⇄ EN từ bộ chọn ở header
- Lựa chọn ngôn ngữ được lưu (cookie `NEXT_LOCALE`) và áp dụng lại ở lần tải trang sau

**Related APIs/Routes**:
- Server Action `setLocale` (không phải REST route) — set cookie `NEXT_LOCALE`, path=`/`, 1 năm

**Related Data Models**: N/A — không có data model; lựa chọn ngôn ngữ lưu trong cookie `NEXT_LOCALE`

**Related Background Logic**: N/A — Server Action set cookie chạy đồng bộ theo tương tác UI (click)

**Related Permissions**: N/A — không có permission gating cho việc đổi ngôn ngữ

---

## Summary

- **Total Features**: 2
- **Total Screens**: 2 — SCR001_Login (`/login`), SCR002_Todo (`/todo`)
- **Total User Stories**: ~7 (chưa cấp US### — 5 ở F001, 2 ở F002)
- **Total Routes**: 1 route nội bộ (`/auth/callback`) + 1 external (GoTrue authorize) + 1 Server Action
- **Total Data Models**: 0
- **Total Background Logic**: 0 xác nhận được
- **Total Permissions**: 1 (route-guard, chưa cấp PERM###)
- **Languages Detected**: TypeScript
