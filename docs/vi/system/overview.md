**Project**: SAA 2025 — Login (README.md:1)
**Generated**: 2026-09-09
**Architecture Type**: Monolithic server-rendered web app (Next.js 16 App Router, single deployable, BaaS auth + business-data backend qua Supabase)

## Executive Summary

Next.js 16 app (App Router) cho sự kiện Sun\* Annual Awards 2025 (`package.json:1-3`, `README.md:1-3`). App có **8 route trang** dưới `src/app` cộng **1 route handler** — không phải 2 màn hình như tài liệu cũ từng ghi:

- **Public** (không qua guard nào): `/` — trang chủ (`src/app/(public)/(home)/page.tsx`), `/awards`, `/standards`, `/kudos`, `/login`, `/prelaunch` (mới, F011).
- **Protected** (yêu cầu đăng nhập, gác bởi `src/app/(protected)/layout.tsx:19-29`): `/profile`, `/todo` — `/todo` vẫn là placeholder không có tính năng thật, chỉ tồn tại để chứng minh auth guard chạy đúng (`src/app/(protected)/todo/page.tsx:9-19`).
- **Route handler**: `GET /auth/callback` (`src/app/auth/callback/route.ts:17-47`) — đổi PKCE `code` lấy session.

`/` **không còn redirect** theo trạng thái auth — trước đây route này chỉ `redirect(user ? "/todo" : "/login")`, nay tự render trang chủ công khai cho cả anonymous lẫn authenticated, chỉ khác phần cá nhân hoá header (`src/app/(public)/(home)/page.tsx:28-141`, `docs/vi/generated/route-list.md` dòng 35). Đích sau khi đăng nhập cũng đổi từ `/todo` sang `/` (`src/app/(public)/login/_components/login-client.tsx:25`, `src/app/auth/callback/route.ts:38` mặc định `safeNextPath` về `/`).

Auth backend là Supabase (`@supabase/ssr` 0.12.5 + `@supabase/supabase-js` 2.115.0, `package.json:30-31`), chạy local qua instance `saa-app` (`http://127.0.0.1:55321`, `README.md:56`). **Khác với trước**: project này giờ có database nghiệp vụ thật của riêng nó, không chỉ session Supabase — 6 migration đã áp dụng tạo bảng/view thật (`supabase/migrations/0001-0011`):

| Migration | Đối tượng |
|---|---|
| `0001_users_table.sql:8` | `public.users` (cột `role`: `member`\|`admin`) |
| `0003_awards_table.sql:18` | `public.awards` |
| `0005_profile_cards_view.sql:50` | view `public.profile_cards` |
| `0006_kudos.sql:20,82` | `public.kudos` + view `public.kudos_cards` |
| `0007_kudo_hearts.sql:39` | `public.kudo_hearts` |
| `0010_kudo_images_bucket.sql:22` | Storage bucket `kudo-images` |
| `0011_secret_box.sql:68` | `public.secret_box_openings` |

Cột `public.users.role` chỉ là **nhãn hiển thị** cho menu tài khoản ở trang chủ, không phải authorization gate — đọc fail-open về `"member"` khi lỗi/thiếu hàng (`src/dal/users.ts:4-8,48-69`). Không có route `/admin` nào tồn tại.

Giao diện song ngữ vi/en qua `next-intl` 4.14.2, chọn locale bằng cookie `NEXT_LOCALE` (không dùng URL prefix) — mặc định `vi` (`src/lib/i18n/locale.ts:9-14`, `src/i18n/request.ts:22-24`). Locale set qua Server Action `setLocale` (đường dẫn đổi từ `app/actions/locale.ts` cũ sang `src/app/_actions/set-locale.ts:25-44`) và luôn chuẩn hoá qua `normalizeLocale` trước khi ghi cookie hoặc dùng trong dynamic `import(messages/${locale}.json)` (`src/lib/i18n/locale.ts:49-51`, `src/i18n/request.ts:24-31`).

Stack: Next.js 16.3.4, React 19.2.8, TypeScript ^5, Tailwind CSS 4, Vitest ^3.2.7 (coverage 100% trên allowlist tường minh), `@playwright/test` 1.62.1, Storybook 10.6.0 + `msw` 2.15.0 (`package.json:29-64`, `README.md:9-22`).

Đầu vào chi tiết theo feature (F001-F011) nằm ở `docs/vi/features/`, bắt đầu từ `docs/vi/generated/feature-list.md`.

For architecture diagrams and tech stack details, see [architecture.md](architecture.md).

## Key Design Decisions

### Decision 1: Auth guard hai lớp — proxy optimistic phủ rộng + layout authoritative tập trung

**Context**: `/todo` và `/profile` cần chặn theo trạng thái auth; Next.js khuyến cáo không dựa hoàn toàn vào proxy/middleware cho auth (`src/proxy.ts:29-30`).

**Decision**: Lớp 1 — `src/proxy.ts` (Next 16 đổi `middleware.ts` → `proxy.ts`) chặn optimistic. `config.matcher` **đã đổi từ whitelist 6-route literal sang negative lookahead** phủ gần như mọi route, loại trừ `api`, `auth`, `_next/static`, `_next/image`, `favicon.ico`, và mọi path có phần mở rộng file (`src/proxy.ts:187-189`). Danh sách route được kiểm tra login là `PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE]` (`src/proxy.ts:22`), dựa trên `getUserOrNull` gọi qua `createProxyClient` (`src/proxy.ts:135-145`, `src/lib/supabase/proxy-client.ts:13-34`). Lớp 2 — **tập trung** ở `src/app/(protected)/layout.tsx:19-29`: gọi `getCurrentUser()` (`src/dal/auth.ts:16-27`, fail-open về `null` khi lỗi) và `redirect(ROUTES.LOGIN)` nếu chưa đăng nhập — áp dụng chung cho mọi route con của `(protected)` (`/todo`, `/profile`), không còn mỗi page tự gọi lại như bản cũ. `/login` cũng tự kiểm tra và redirect `/` nếu đã đăng nhập (`src/app/(public)/login/page.tsx:34-37`), fail-open tự nhiên vì `getCurrentUser()` đã nuốt lỗi.

**Rationale**: Middleware/proxy chỉ nên là tuyến phòng thủ đầu (`src/proxy.ts:29-30`); gom authoritative check vào một layout dùng chung tránh lặp logic khi thêm route protected mới (`/profile` join `/todo` không cần sửa page riêng).

### Decision 2: Cookie-based i18n, không dùng URL routing, default vi

**Decision**: `next-intl` chạy no-routing — locale đọc từ cookie `NEXT_LOCALE`, danh sách hợp lệ cố định `["vi", "en"]`, mặc định `vi` khi thiếu/sai (`src/lib/i18n/locale.ts:9-14`). `src/proxy.ts:115-127` (`normalizeLocaleCookie`) tự chuẩn hoá lại cookie sai ngay từ request đầu, ghi cả trên `request` lẫn `response`.

**Rationale**: `NEXT_LOCALE` là input không tin cậy từ client — phòng thủ hai lớp (proxy + `src/i18n/request.ts:26-40`) chặn việc nó bị dùng để tấn công dynamic import.

### Decision 3: Khoá điều hướng tiền sự kiện (prelaunch lock) chạy TRƯỚC mọi predicate auth

**Context**: F011 cần một cách khoá toàn bộ site về `/prelaunch` trước giờ sự kiện, bật/tắt qua cấu hình, áp dụng bất kể actor đã đăng nhập hay chưa — một trục khác hẳn "đăng nhập chưa" của Decision 1 (`src/domain/prelaunch-lock.ts:94-118`).

**Decision**: `planProxy()` (`src/domain/prelaunch-lock.ts:120-146`) là hàm quyết định thuần, zero I/O, chạy ngay đầu `proxy()` (`src/proxy.ts:62`) — trước khi `getUserOrNull` từng được gọi. Cờ `PRELAUNCH_LOCK_ENABLED` fail-safe: chỉ đúng chuỗi `"true"` (không phân biệt hoa/thường) mới bật, mọi giá trị khác kể cả rỗng/thiếu đều TẮT (`src/domain/prelaunch-lock.ts:25-27`). Khi bật và `EVENT_START_AT` chưa tới, mọi route trừ 4 ngoại lệ kỹ thuật (`/prelaunch` chính nó, `/auth/*`, `/api/*`, `/_next/*`/file tĩnh) bị redirect về `/prelaunch` (`src/domain/prelaunch-lock.ts:63-70,127-145`). Redirect dùng **303** cho method không phải GET/HEAD để tránh 307 mặc định re-POST một Server Action sang `/prelaunch` rồi 404 (`src/domain/prelaunch-lock.ts:93-96`, `src/proxy.ts:64-71`).

**Rationale**: Mặc định TẮT nên không route nào bị khoá ngoài ý muốn khi biến môi trường thiếu/sai; đặt nhánh khoá trước predicate auth nghĩa là route nào mới lộ ra do matcher rộng hơn (vd. `/kudos`) cũng bị khoá đúng, không cần whitelist riêng.

## Security Overview

- **Authentication**: Google OAuth qua Supabase Auth, flow PKCE. `useLoginActions` (`src/app/(public)/login/_hooks/use-login-actions.ts:43-58`) gọi `signInWithGoogle` (`src/api/auth.ts:40-56`) với `redirectTo: ${origin}/auth/callback?next=${safeNextPath(next)}`; `src/app/auth/callback/route.ts:31-44` đổi `code` lấy session bằng `exchangeCodeForSession`. Không có mật khẩu tự quản lý.
- **Authorization**: Vẫn chỉ một trục "đã đăng nhập hay chưa" (route-guard, PERM001-004 theo `docs/vi/generated/permissions-matrix.md`) — không có RBAC thật. `public.users.role` chỉ là nhãn hiển thị fail-open (`src/dal/users.ts:4-8`), chưa có route/action nào enforce theo `role`.
- **Data Encryption**: Không có xử lý mã hoá riêng trong repo này; phụ thuộc TLS/hạ tầng Supabase.
- **API Security**:
  - Open-redirect guard: `safeNextPath` là điểm chặn duy nhất cho `?next=` — chỉ chấp nhận path same-origin bắt đầu bằng đúng 1 `/`, chặn `//`, `/\`, scheme `://`, control-char/line-separator (`src/utils/url/next-path.ts:88-106`).
  - Lỗi OAuth (`?error`, `error_description`) không bao giờ được log; lỗi exchange không lộ ra client, fallback `/login?error=auth_code_error` (`src/app/auth/callback/route.ts:24-46`).
  - `src/proxy.ts:135-145` bọc try/catch quanh `getUserOrNull`: lỗi mạng khi gọi Supabase coi như "chưa đăng nhập", không sập site.
  - Redirect giữ cookie: `redirectPreservingCookies` copy cookie đã stage sang response redirect mới, tránh bug rớt cookie kinh điển của `@supabase/ssr` proxy pattern (`src/proxy.ts:154-164`).
  - Prelaunch lock fail-safe mặc định TẮT — misconfiguration không thể vô tình khoá site (`src/domain/prelaunch-lock.ts:20-27`, xem Decision 3).
  - Bucket Storage `kudo-images`: policy `authenticated` mới được INSERT, `public` chỉ SELECT (`supabase/migrations/0010_kudo_images_bucket.sql:22,48,53`).

## Scalability

- **Current Capacity**: N/A — app demo/nội bộ cho 1 sự kiện (SAA 2025), không có evidence về load testing trong source đã đọc.
- **Scaling Strategy**: No data — không có caching layer/queue/background job tự viết ngoài `next.config.ts` (chỉ bọc plugin `next-intl` + cấu hình `images.remotePatterns`/`serverActions.bodySizeLimit`, không có tuỳ chỉnh runtime nào khác, `next.config.ts:137-151`). Trigger Postgres (`sync_kudo_heart_count`, `handle_new_user`) và RPC `open_secret_box()` chạy trong DB, không phải background job ứng dụng.
- **Performance Targets**: No data — không tìm thấy SLA/perf budget nào trong repo.
