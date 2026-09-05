---
status: draft
authored_by: takumi
created: 2026-09-04
---

# Feature List

**Project**: SAA 2025 (Sun* Annual Awards) — Login (Google OAuth)
**Generated**: 2026-09-04
**Analysis Scope**: Màn Đăng nhập (`/login`, MoMorph screen `GzbNeVGJHz`) — SYSTEM decomposition, 2 ý định người dùng (`spec/.intent-enum.json`)

**Code Format**: Mọi mã Feature PHẢI theo dạng `F###_NameSlug` (vd: F001_Auth, F002_UserProfile) — mã DRAFT tạm thời, cấp thật khi promote.
**Screen/US/BL/Permission Code Format**: `SCR###_NameSlug` / `US###_NameSlug` / `BL###_NameSlug` / `PERM###_NameSlug`.
Draft này CHƯA có SCR###/US###/ROUTE###/MODEL###/BL###/PERM### thật — mọi tham chiếu ghi bằng lời + `TBD (draft)`, không bịa mã.

**Feature Types**: `ui` — có màn hình UI (SCR###) · `background` — chỉ có logic nền (BL###, không SCR###) · `mixed` — cả hai.

**Related Screens column format**: chấp nhận `SCR###`, `SCR###/REG###`, hoặc nhiều mã cách nhau dấu phẩy.
**Partial-screen ownership note**: Feature chỉ tham chiếu `SCR###/REG###` là sở hữu vùng (region) đó, KHÔNG sở hữu khung màn `SCR###` — khung màn phải do một F### khác (thường layout) sở hữu qua tham chiếu `SCR###` trần.

## Feature Hierarchy

**Ghi chú**: Sắp theo priority cao→thấp (P0 → P1). P0 = lõi chặn release; P1 = quan trọng cao.

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F001_GoogleOAuthLogin | Đăng nhập Google OAuth & Bảo vệ truy cập | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F002_LanguageSwitch | Chuyển đổi ngôn ngữ giao diện (VN/EN) | ui | TypeScript | agentic-coding-hands-on | P1 |

## Feature Details

### F001_GoogleOAuthLogin: Đăng nhập Google OAuth & Bảo vệ truy cập

**Type**: mixed
**Description**: Khách truy cập đăng nhập SAA 2025 bằng tài khoản Google qua Supabase Auth (PKCE); thành công → `/todo` (placeholder được bảo vệ, có nút đăng xuất). Guard optimistic (`proxy.ts`) + xác thực authoritative (`getUser()` trên `/todo`) đảm bảo: đã đăng nhập không vào lại `/login`/`/`, chưa đăng nhập không vào được `/todo`. Đăng nhập thất bại/hủy → thông báo lỗi inline dưới nút Google.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 7 design items (Header shell, Logo, Hero section, Hero Visual, Content block, nút Google Login, Footer — `momorph/specs.csv`) + màn `/todo` placeholder (chưa có spec MoMorph, tạo mới theo `clarifications.md`)

**Related Screens**:
- TBD (draft): Màn Đăng nhập (`/login`) — sở hữu khung màn hình đầy đủ (header + hero + footer); vùng Language Selector trong header do F002 sở hữu riêng (partial-screen ownership)
- TBD (draft): Màn Todo placeholder được bảo vệ (`/todo`) — chào email người dùng + nút Đăng xuất

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

**Related Background Logic**: TBD (draft) — `/auth/callback` là Route Handler xử lý đồng bộ theo request, không khớp rõ 10 loại BL### chuẩn (không phải cron/queue/webhook/mail/observer). Guard `proxy.ts` KHÔNG tính vào đây — auth middleware thuộc Permissions artifact (`code-formats.md`)

**Related Permissions**:
- TBD (draft): route-guard — `proxy.ts` (Next 16, đổi tên từ `middleware.ts`) optimistic: đã auth vào `/login`/`/` → redirect `/todo`; chưa auth vào `/todo` → redirect `/login`. `/todo` xác thực lại authoritative bằng `getUser()` server-side

---

### F002_LanguageSwitch: Chuyển đổi ngôn ngữ giao diện (VN/EN)

**Type**: ui
**Description**: Khách chuyển ngôn ngữ giao diện VN/EN qua bộ chọn trên header màn `/login`. Lựa chọn lưu vào cookie `NEXT_LOCALE` (next-intl, no-routing mode — không dùng URL prefix), áp dụng lại toàn bộ nội dung UI ngay sau khi chọn. Mặc định `vi` khi chưa có cookie.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 1 design item (Language Selector — `momorph/specs.csv` item 1.2)

**Related Screens**:
- TBD (draft): Language Selector — vùng con (region) trong header của màn `/login`; khung màn `/login` do F001 sở hữu (partial-screen ownership — xem ghi chú format ở trên)

**Related User Stories** (intent-derived, chưa cấp US###):
- Khách chuyển đổi ngôn ngữ VN ⇄ EN từ bộ chọn ở header
- Lựa chọn ngôn ngữ được lưu (cookie `NEXT_LOCALE`) và áp dụng lại ở lần tải trang sau

**Related APIs/Routes**:
- Server Action `setLocale` (không phải REST route) — set cookie `NEXT_LOCALE`, path=`/`, 1 năm

**Related Data Models**: N/A — không có data model; lựa chọn ngôn ngữ lưu trong cookie `NEXT_LOCALE`, không có DB model

**Related Background Logic**: N/A — không có logic nền; Server Action set cookie chạy đồng bộ theo tương tác UI (click)

**Related Permissions**: N/A — không có permission gating cho việc đổi ngôn ngữ

---

## Summary

- **Total Features**: 2
- **Total Screens**: 2 màn (draft, chưa cấp SCR###): `/login`, `/todo`
- **Total User Stories**: ~7 (draft, chưa cấp US### — 5 ở F001, 2 ở F002)
- **Total Routes**: 1 route nội bộ (`/auth/callback`) + 1 external (GoTrue authorize) + 1 Server Action
- **Total Data Models**: 0 — không có model do app sở hữu
- **Total Background Logic**: 0 xác nhận được (xem ghi chú TBD ở F001)
- **Total Permissions**: 1 (route-guard, draft)
- **Languages Detected**: TypeScript

## Cross-Reference Validation

- [x] All F### codes are unique

## Decomposition rationale (clustering)

Không split thêm theo Guard/Logout/Callback vì cùng MỘT outcome nghiệp vụ ("xác thực & bảo vệ truy cập bằng Google") — test bằng đúng MỘT E2E spec (`tests/e2e/login.spec.ts`, theo `clarifications.md § E2E contract`), thoả tiêu chí Independently Testable + Clear Flow mà không vỡ Agent Implementable. Language switch tách riêng vì phục vụ outcome khác hẳn (tuỳ biến ngôn ngữ, không phụ thuộc auth), khớp § Feature Clustering Rule.
