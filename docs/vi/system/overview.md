**Project**: SAA 2025 — Login
**Generated**: 2026-09-05
**Architecture Type**: Monolithic server-rendered web app (Next.js 16 App Router, single deployable, BaaS auth backend)

## Executive Summary

Đây là app Next.js 16 (App Router) cho sự kiện Sun* Annual Awards 2025 (`package.json:1-3`, `README.md:1-3`). App chỉ có 2 màn hình thật: `/login` (đăng nhập Google qua Supabase Auth, flow PKCE) và `/todo` (placeholder được bảo vệ, không có tính năng todo thật — chỉ tồn tại để chứng minh auth guard chạy đúng, `app/todo/page.tsx:6-16`). Route `/` không tự render UI, chỉ redirect theo trạng thái auth (`app/page.tsx:5-9`).

Auth backend là Supabase (`@supabase/ssr` 0.12.5 + `@supabase/supabase-js` 2.115.0, `package.json:14-15`), chạy local qua instance `saa-app` (`http://127.0.0.1:55321`, `README.md:35-42`). Không có database nghiệp vụ riêng của app này — toàn bộ state là session Supabase (cookie) và 1 cookie locale (`NEXT_LOCALE`).

Giao diện hỗ trợ song ngữ vi/en qua `next-intl` 4.14.2, chọn locale bằng cookie `NEXT_LOCALE` (không dùng URL prefix / i18n routing) — mặc định `vi` (`lib/i18n/locale.ts:9-14`, `i18n/request.ts:16-27`). Locale được set qua Server Action `setLocale` (`app/actions/locale.ts:24-41`) và luôn được chuẩn hoá (`normalizeLocale`) trước khi ghi cookie hoặc dùng trong dynamic `import(messages/${locale}.json)`, chặn path-traversal/cookie-injection (`lib/i18n/locale.ts:42-51`, `i18n/request.ts:9`).

Stack đầy đủ: Next.js 16.3.4, React 19.2.8, TypeScript ^5, Tailwind CSS 4, Vitest ^3.2.7 (unit), `@playwright/test` 1.62.1 (E2E) — `package.json:13-32`, `README.md:9-18`.

For architecture diagrams and tech stack details, see [architecture.md](architecture.md).

## Key Design Decisions

### Decision 1: Two-layer auth guard — optimistic proxy + authoritative page check

**Context**: `/login` và `/todo` cần chặn truy cập theo trạng thái auth, nhưng Next.js khuyến cáo không nên dựa hoàn toàn vào middleware/proxy cho auth (`proxy.ts:9-14`).

**Decision**: Lớp 1 — `proxy.ts` (Next 16 đổi tên `middleware.ts` thành `proxy.ts`, `proxy.ts:11`) chặn optimistic ở 3 route (`/`, `/login`, `/todo/:path*`) dựa trên `getUser()` gọi qua `createProxyClient` (`proxy.ts:21-40,71-81`, `lib/supabase/proxy-client.ts:13-31`). Lớp 2 — `/todo` tự gọi lại `getUser()` server-side, authoritative, trước khi render (`app/todo/page.tsx:12-25`); `/login` cũng tự check lại nhưng fail-open khi Supabase lỗi để không khoá luôn trang đăng nhập (`app/login/page.tsx:67-83`).

**Rationale**: Middleware/proxy chỉ nên là tuyến phòng thủ đầu, không phải duy nhất — theo đúng khuyến cáo chính thức của Next.js được trích trong code (`proxy.ts:9-14`); một cookie giả mạo/stale không thể lọt qua vì `/todo` luôn re-validate. Quyết định gốc: clarifications "Auth guard ở đâu?" (`clarifications.md:32`).

### Decision 2: Cookie-based i18n, không dùng URL routing, default vi

**Context**: Cần UI vi/en mà không đổi cấu trúc URL.

**Decision**: `next-intl` chạy ở chế độ no-routing — locale đọc từ cookie `NEXT_LOCALE`, không có prefix `/en/...` (`i18n/request.ts:6-9`). Danh sách locale hợp lệ cố định `["vi", "en"]`, mặc định `vi` khi cookie thiếu/sai (`lib/i18n/locale.ts:9-14`). `proxy.ts` còn tự chuẩn hoá lại cookie sai ngay từ request đầu (`proxy.ts:43-63`).

**Rationale**: Quyết định của user trong clarifications (`clarifications.md:19,40`); phòng thủ hai lớp (proxy + `i18n/request.ts`) vì `NEXT_LOCALE` là input không tin cậy từ client, có thể bị dùng để tấn công dynamic import (`i18n/request.ts:9-14`, `app/actions/locale.ts:11-17`).

## Security Overview

- **Authentication**: Google OAuth qua Supabase Auth, flow PKCE (`README.md:3`). `LoginClient` (qua hook `useLoginActions` → `signInWithGoogle`) gọi `supabase.auth.signInWithOAuth({provider: "google", redirectTo: origin + "/auth/callback?next=/todo"})` (`lib/auth/sign-in-with-google.ts:45-50`); `app/auth/callback/route.ts` đổi `code` lấy session bằng `exchangeCodeForSession` (`app/auth/callback/route.ts:30-42`). Không có mật khẩu tự quản lý — toàn bộ ủy quyền cho Supabase GoTrue.
- **Authorization**: Không có role/permission — chỉ 1 kiểu gate duy nhất là "đã đăng nhập hay chưa" (route-guard), thực hiện ở 2 lớp: `proxy.ts` (optimistic) và `getUser()` tại `/todo`, `/login` (authoritative) — xem Decision 1.
- **Data Encryption**: Không có xử lý mã hoá riêng trong repo này; phụ thuộc hoàn toàn vào TLS/hạ tầng của Supabase và transport HTTPS (không có evidence mã hoá tầng ứng dụng nào khác trong source đã đọc).
- **API Security**:
  - Open-redirect guard: `safeNextPath` là điểm chặn duy nhất cho tham số `?next=` trước khi đưa vào header `Location` — chỉ chấp nhận path same-origin bắt đầu bằng đúng 1 `/`, chặn `//`, `/\`, scheme `://`, và các control-char/line-separator có thể chèn header (`lib/supabase/next-path.ts:1-106`).
  - Lỗi OAuth (`?error`, `error_description`) không bao giờ được log (`app/auth/callback/route.ts:13-14`); lỗi exchange không lộ ra client, fallback về `/login?error=auth_code_error` (`app/auth/callback/route.ts:39-45`).
  - `proxy.ts` bọc try/catch quanh `getUser()`: lỗi mạng khi gọi Supabase không làm sập cả site, coi như "chưa đăng nhập" (`proxy.ts:71-81`).
  - Redirect giữ cookie: `NextResponse.redirect` tạo response mới nên cookie đã stage (session refresh, locale) phải copy thủ công sang, tránh bug rớt cookie kinh điển của `@supabase/ssr` proxy pattern (`proxy.ts:90-100`).

## Scalability

- **Current Capacity**: N/A — app demo/nội bộ cho 1 sự kiện (SAA 2025), không có evidence về load testing hay giới hạn tải trong source đã đọc.
- **Scaling Strategy**: No data — không có cấu hình scaling (không caching layer, không queue, không background job — xác nhận bởi Background Logic Source Inventory của scout-report: tất cả 10 loại BL trừ `integration` đều `_(none found)_`). `next.config.ts` chỉ bọc plugin `next-intl`, không có tuỳ chỉnh runtime/scaling nào (`next.config.ts:1-10`).
- **Performance Targets**: No data — không tìm thấy SLA/perf budget nào trong repo (không có file `docs/performance*`, không comment nào nêu target số liệu, ngoại trừ 1 ghi chú kỹ thuật ảnh hero ~660KB WebP ở `clarifications.md:73`, không phải một target chính thức).
