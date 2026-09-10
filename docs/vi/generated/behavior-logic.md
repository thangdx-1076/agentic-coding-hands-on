---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths — all references here are output targets or internal definitions -->
# Behavior Logic

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: `_scout-bl-inventory.md` (3 entries, tất cả `integration`, tất cả `[SIGNAL_INFERRED]` — 9/10 loại còn lại là `_(none found)_`, đây là sự thật của một app demo auth 2 màn hình, không phải khoảng trống coverage)

**Code Format**: All codes MUST follow `BL###_NameSlug` format (e.g., BL001_ScheduledReport, BL002_EventListener)

**Behavior Logic Types** (canonical 10 — language-neutral):
- `scheduled-job` — Cron-like scheduled tasks
- `queue-worker` — Background job workers (async queue consumers)
- `event-listener` — Event-driven handlers
- `observer` — Model lifecycle hooks (created/updated/deleted)
- `mail` — Email sending logic
- `notification` — In-app / push notification logic
- `middleware` — Request/response processing chain (non-auth)
- `custom-command` — CLI commands
- `integration` — Third-party integrations (external API clients)
- `webhook` — Incoming/outgoing webhook handlers

**Note**: Auth/permission middleware is NOT included — see Permissions.md

**Note**: Feature and UserStory mapping is managed in FeatureList.md and UserStories.md. This document contains behavior logic items without direct feature/story references.

---

## Behavior Logic Index

### Type: integration

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL001_SupabaseBrowserClient | SupabaseBrowserClient | Client component cần Supabase Auth phía trình duyệt (hiện tại: `useLoginActions.handleLoginClick` gọi `signInWithGoogle` trước khi gọi `signInWithOAuth`) | — | N/A — not a file-exchange type |
| BL002_SupabaseServerClient | SupabaseServerClient | Server Component / Server Action / Route Handler cần Supabase Auth phía server, mỗi request — nay còn gồm `/kudos` page + 2 Server Action `toggleKudoHeart`/`loadMoreKudos` (F007/F008, 2026-09-07) | — | N/A — not a file-exchange type |
| BL003_SupabaseProxyClient | SupabaseProxyClient | `proxy.ts` trên request khớp `config.matcher` VÀ rơi vào nhánh `auth` của `planProxy` (`src/domain/prelaunch-lock.ts`) — kể từ F011_CountdownPrelaunchPage (2026-09-08, nhánh `feat/countdown-prelaunch-page`) `config.matcher` là negative lookahead khớp gần hết mọi route, nhưng client này CHỈ được tạo cho 6 route whitelist cũ (`/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`) khi KHÔNG bị nhánh khoá prelaunch redirect trước — mọi route khác (kể cả 6 route đó lúc khoá đang bật) nhận `{ kind: "pass" \| "redirect" }` với ZERO lời gọi Supabase | — | N/A — not a file-exchange type |

---

## Dev Appendix

Source citations, module/route/data-model links, and the deterministic rules `validate_behavior_logic.py`
enforces. Every `BL###` heading below carries the same code as its Index row above.

### Cardinality Contract

Rules enforced by Wave 2b researcher and Wave 7a reviewer. Violations are critical.

- **Rule C1 — 1 BL per inventory entry**: Mode A stacks (folder convention): 1 file = 1 BL. Mode B stacks (annotation/decorator): 1 decorator hit = 1 BL (multiple hits in same file → multiple BL items). Aggregation is a critical violation.
- **Rule C2 — Source fields mandatory, single-valued**: Every BL item MUST include `**Source File**` (one relative path) and `**Source Symbol**` (one symbol — class name for Mode A; `ClassName::method` or `module::function` for Mode B). Multi-symbol forms forbidden in either field.
- **Rule C3 — Unmatched BL warning**: A BL item whose Source File does not appear in the scout `## Background Logic Source Inventory` → warning; researcher must provide justification in Description (may be a legitimate `[SIGNAL_INFERRED]` case). Unmatched BL with no justification → critical.

**Cardinality check for this document**: `_scout-bl-inventory.md` liệt kê đúng 3 entry (tất cả `integration`); tài liệu này emit đúng 3 BL### — gap 0%, 1-1-1 theo Rule C1, không có aggregation.

### Inclusion/Exclusion Matrix (scout-side filter)

| Include | Exclude |
|---------|---------|
| All files/symbols in scout `## Background Logic Source Inventory` | Abstract base classes, traits, interfaces |
| `[SIGNAL_INFERRED]`-tagged inventory entries (with justification) | Vendor overrides and third-party library subclasses |
| | `*Test.php`, `*Spec.rb`, `test_*.py`, `*.test.ts` and all test files |
| | Files < 10 LOC (scaffolding/stubs) |
| | Auth/ACL/OAuth/JWT middleware (→ Permissions.md) |

### Anti-Patterns: Aggregation Forbidden

Aggregating multiple source files into a single BL item violates Rule C1 and will be flagged critical by the reviewer. (Không áp dụng vi phạm nào trong tài liệu này — mỗi BL### dưới đây map đúng 1 file.)

---

## BL001_SupabaseBrowserClient

**Type**: integration
**Trigger**: Client component cần Supabase Auth phía trình duyệt — điểm gọi duy nhất hiện có: `signInWithGoogle` (`src/api/auth.ts:45`), gọi từ `useLoginActions.handleLoginClick` (`src/app/(public)/login/_hooks/use-login-actions.ts:46-49`), ngay trước `supabase.auth.signInWithOAuth(...)`
**File Schema**: N/A — not a file-exchange type
**Source File**: src/lib/supabase/client.ts
**Source Symbol**: createClient

### Description

`[SIGNAL_INFERRED]` Factory function bọc `createBrowserClient` từ `@supabase/ssr` — client SDK Supabase Auth phía trình duyệt, đọc `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (assertion `!` cố ý: thiếu biến môi trường phải fail loud). **Intent matched**: integration — external API/service client (Supabase Auth/DB SDK). **No-row reason**: stack Next.js App Router không có dòng nào trong bảng `bl-source-patterns.md`; analog gần nhất (NestJS "external SDK injection clients") là pattern Mode B theo decorator, không khớp cấu trúc factory function thuần này. **Observed pattern**: export `createClient()` bọc `createBrowserClient`, được gọi duy nhất tại `src/api/auth.ts:45`.

### Related Modules

- src/api/auth.ts (`signInWithGoogle`)
- src/app/(public)/login/_hooks/use-login-actions.ts (`useLoginActions.handleLoginClick`, caller)

### Related Routes

_(none — luồng OAuth do lời gọi này khởi tạo kết thúc ở ROUTE001, nhưng bản thân client này không tự gọi route nào)_

### Related Data Models

_(none — instance chỉ dùng để gọi `signInWithOAuth`, không có dòng code nào đọc lại object user từ client này)_

---

## BL002_SupabaseServerClient

**Type**: integration
**Trigger**: Server Component / Server Action / Route Handler bất kỳ cần Supabase Auth phía server, mỗi request (Next 16 `cookies()` async nên factory cũng async)
**File Schema**: N/A — not a file-exchange type
**Source File**: src/lib/supabase/server.ts
**Source Symbol**: createClient

### Description

`[SIGNAL_INFERRED]` Factory async bọc `createServerClient` từ `@supabase/ssr`, cookie-store-backed; `setAll` bọc try/catch vì cookie store của Server Component là read-only (session refresh thật sự nằm ở `proxy.ts`, không phải bug bị nuốt lỗi). **Intent matched**: integration — external API/service client (Supabase Auth SDK cho Server Components/Actions/Route Handlers). **No-row reason**: giống BL001 — Next.js App Router không có dòng trong bảng, analog NestJS không khớp cấu trúc factory thuần. **Observed pattern**: export `async createClient()` được gọi độc lập tại 6 nơi (đổi từ 8 — route-colocation refactor gộp 3 lời gọi trực tiếp cũ trong `page.tsx` thành 1 qua DAL): `src/dal/auth.ts:18` bên trong `getCurrentUser` — dùng chung bởi guard fail-open AUTHORITATIVE của `/login` (`src/app/(public)/login/page.tsx:34`), đọc email tại `/todo` (`src/app/(protected)/todo/page.tsx:22`), và guard fail-closed AUTHORITATIVE của `/todo`+`/profile` tại `src/app/(protected)/layout.tsx:22` (route gốc `/` không còn fallback-redirect nào — PERM001_RootRouteGuard SUPERSEDED, xem `permissions-matrix.md`); `src/app/_actions/logout.ts:17` (`logoutAction`, shared — gọi `signOut()`), `src/app/auth/callback/route.ts:33` (`exchangeCodeForSession`), cộng (F007/F008, 2026-09-07) `src/app/(public)/kudos/page.tsx:72` (đọc board + stats, `/kudos` KHÔNG có guard nào gọi trước), `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:44` (fail-closed — tự `getUser()` bên trong, ghi/xoá `kudo_hearts`), và `src/app/(public)/kudos/_actions/load-more-kudos.ts:53` (fail-open — đọc lại `getKudosBoard`, không ghi).

### Related Modules

- src/dal/auth.ts (`getCurrentUser` — guard `/login`, đọc email `/todo`, guard `(protected)/layout.tsx`)
- src/app/_actions/logout.ts (`logoutAction`, shared — dùng chung bởi todo/profile/home/awards/kudos)
- src/app/(public)/kudos/page.tsx (đọc board + stats, F007_KudosLiveBoard, 2026-09-07)
- src/app/(public)/kudos/_actions/toggle-kudo-heart.ts (`toggleKudoHeart`, fail-closed, F008_KudosHeartReaction)
- src/app/(public)/kudos/_actions/load-more-kudos.ts (`loadMoreKudos`, fail-open, F007_KudosLiveBoard)

### Related Routes

- (GET) /auth/callback — ROUTE001

### Related Data Models

- MODEL002_SupabaseUser

---

## BL003_SupabaseProxyClient

**Type**: integration
**Trigger**: `proxy.ts` (lớp proxy/middleware Next 16), CHỈ khi request rơi vào nhánh `auth` của `planProxy` — tức 1 trong 6 route whitelist cũ (`/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`) VÀ không bị nhánh khoá prelaunch redirect trước (F011_CountdownPrelaunchPage, 2026-09-08). `config.matcher` bản thân nó (negative lookahead, khớp gần hết mọi route từ F011) không còn là điều kiện đủ — xem `docs/vi/generated/route-list.md § Middleware / Proxy Guard Layer`.
**File Schema**: N/A — not a file-exchange type
**Source File**: src/lib/supabase/proxy-client.ts
**Source Symbol**: createProxyClient

### Description

`[SIGNAL_INFERRED]` Factory bọc `createServerClient`, ghi cookie đồng thời lên cả `request` (để phần còn lại của cùng pass thấy giá trị đã refresh) lẫn `response` (để browser thực sự nhận cookie session mới/xoay vòng) — pattern proxy chuẩn của `@supabase/ssr`. **Intent matched**: integration — external API/service client (Supabase Auth SDK cho tầng proxy). **No-row reason**: giống BL001/BL002 — không có dòng Next.js App Router trong bảng. **Observed pattern**: export `createProxyClient(request, response)`, gọi duy nhất tại `src/proxy.ts:132` bên trong `getUserOrNull()` — chỉ dùng để existence-check `user` quyết định redirect optimistic trước khi trang render. Nhánh khoá prelaunch (`planProxy`, chạy trước) không bao giờ gọi hàm này — quyết định khoá là thuần string-compare + tính ngày, zero I/O.

### Related Modules

- src/proxy.ts (`getUserOrNull`)

### Related Routes

_(none — áp dụng theo path matcher của proxy, không phải 1 route cụ thể trong route-list.md)_

### Related Data Models

- MODEL002_SupabaseUser (chỉ existence-check `user`, không đọc field nào của nó)

---

## Summary

- **Total Behavior Logic Items**: 3
- **By Type**: custom-command: 0, event-listener: 0, integration: 3, mail: 0, middleware: 0, notification: 0, observer: 0, queue-worker: 0, scheduled-job: 0, webhook: 0

---

## Cross-Reference Validation

- [x] All BL### codes are unique
- [x] All BL### codes are referenced in UserStories.md (type=system) — user-stories.md tồn tại; BL001-003 không nằm trong phạm vi US001-003 (US hiện tại chỉ phủ F001/F002), không phải thiếu sót
- [x] All BL### codes are referenced in FeatureList.md — feature-list.md tồn tại (12 feature); F004-F012 không thêm BL### mới do logic RPC/trigger tương ứng chạy ở tầng Postgres (ngoài phạm vi BL### client-side của tài liệu này), xem feature-list.md dòng 354
- [x] All related route references are valid (ROUTE001 tồn tại trong route-list.md)
- [x] All related data model references are valid (MODEL002 tồn tại trong data-model.md)
- [x] No orphaned behavior logic references
- [x] All BL items have Source File + Source Symbol fields (Rule C2)
- [x] All Source File paths match scout Background Logic Source Inventory entries (Rule C2/C3) — 3/3, gap 0%

---

## Client-Side Logic

Document client-side patterns found in the codebase.

### Debounce / Throttle

**Extraction signature:** timer wrapper around a handler — `setTimeout`, `clearTimeout`, `debounce(fn, ms)`, `throttle(fn, ms)`, `useDebounce`, `useDebouncedCallback`

`N/A — no debounce or throttle patterns detected.`

### Optimistic UI

**Extraction signature:** mutation applied immediately before API response, with rollback on error — `setState` before `await`, undo on catch, `optimisticUpdate`, `useOptimistic`

`N/A — no optimistic UI patterns detected.` (`LoginClient` dùng `isPending`/`clientError` qua `useTransition` — đây là pending/loading state thuần, không có cập nhật lạc quan nào bị rollback.)

### Polling

**Extraction signature:** recurring API call — `setInterval`, recursive `setTimeout` calling an API, `usePolling`, `refetchInterval`

`N/A — no polling patterns detected.`

### Upload Progress

**Extraction signature:** file upload with progress tracking — `XHR.upload.onprogress`, `FormData` with `onUploadProgress`, `fetch` streaming, `useUpload`, `onProgress`

`N/A — no upload progress patterns detected.`

### Realtime (WebSocket / SSE / EventSource)

**Extraction signature:** persistent connection to server — `new WebSocket(...)`, `new EventSource(...)`, `useWebSocket`, `subscribe(channel)`, SSE `listen` handler, reconnect logic

Có — Supabase Realtime channel, F012_NotificationsPanel (2026-09-09). `subscribeToNotifications(userId, onInsert)`
(`src/api/notifications.ts:154-176`) mở `supabase.channel(\`notifications:${userId}\`).on("postgres_changes", {event:"INSERT", schema:"public", table:"notifications", filter:\`user_id=eq.${userId}\`}, ...).subscribe()`,
trả về hàm unsubscribe caller PHẢI gọi khi unmount (channel không tự đóng). `filter` chỉ giảm nhiễu —
KHÔNG phải biên giới bảo mật; RLS (`notifications_select_own`, `0012_notifications.sql`) mới là thứ
thật sự chặn đọc chéo user, kể cả qua Realtime. Bảng `notifications` được thêm vào publication
`supabase_realtime` ở migration `0012` (`ALTER PUBLICATION supabase_realtime ADD TABLE`) — bảng ĐẦU
TIÊN của repo nằm trong publication này.

**Related Modules**:
- src/api/notifications.ts (`subscribeToNotifications`)
- src/app/_hooks/use-notifications-realtime.ts:42 (`useNotificationsRealtime` — consumer duy nhất, subscribe 1 lần/`userId` cho vòng đời cả `NotificationBell`, độc lập với `open`)
