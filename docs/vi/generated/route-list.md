# Route List

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05

<!-- Tier 2 static parse — no CLI probe manifest available (Wave 0.4 probe skipped,
     no bootable lockfile). Routes inferred directly from Next.js 16 App Router
     file conventions (`app/**/page.tsx` = frontend route, `app/**/route.ts` =
     backend route handler) and verified by reading every source file below. -->

## Backend Routes

> **Completeness Contract:** emit exactly ONE row per leaf route (HTTP method + concrete path). Expand framework resource macros (Rails `resources :x` → 7 RESTful rows). FORBIDDEN: resource-summary tables (`| Resource | Actions |`), approximation markers (`~N`, `(+nhiều)`, `see routes.rb`, `etc.`), wildcard paths (`/x/*`). Scout counts are estimates, not authority.

> **Code Column Contract:** `Code` is mandatory going forward — `ROUTE###`, contiguous and global across this one file (same shape as `SCR###`/`F###`). `Owner F###` carries the bare feature code that claims the route, or `—` when the route cannot be attributed to a single feature (shared/infra routes). Rare shared routes may list comma-separated multi-owners, e.g. `F001, F003`.

Chỉ có đúng một backend route trong toàn bộ codebase: `app/auth/callback/route.ts`, xử lý bước redirect PKCE callback của Supabase OAuth. `Owner F###` = `F001` (F001_GoogleOAuthLogin claims route này — xem `feature-list.md` § F001 Related APIs/Routes).

### File: app/auth/callback/route.ts

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /auth/callback | ROUTE001 | F001 | `GET(request)` — nhận redirect PKCE từ Supabase, đọc `?code`/`?error`/`?error_description`/`?next`; có `code` thì gọi `exchangeCodeForSession(code)` rồi redirect tới `safeNextPath(next)` (mặc định `/`, đổi từ `/todo` — F003_Homepage); có `error` thì redirect `/login?error=...`; không có gì hợp lệ thì redirect `/login?error=auth_code_error` | none — loại trừ tường minh khỏi matcher của `proxy.ts` (route tự xử lý redirect riêng, xem `proxy.ts` dòng 112-114) |

## Frontend Routes/Pages

Bảy route frontend: sáu route dựng từ `page.tsx` theo quy ước App Router, cộng route `/_not-found` do framework Next.js tự cấp phát mặc định (không có file `not-found.tsx` tùy biến nào trong `app/`).

### File: app/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| / | HomePage | home (F003_Homepage) |

Route `/` render SCR003_HomeScreen — trang chủ công khai (hero + đếm ngược, thông tin sự kiện, 6 thẻ giải thưởng, Sun* Kudos, header/footer). **Đổi từ 2026-09-06**: trước đây route này chỉ là fallback redirect thuần (`redirect(user ? "/todo" : "/login")`); nay `app/page.tsx` tự đọc session + role (`getUserRole`, fail-open `member`) và ủy quyền tương tác cho `app/home-client.tsx` (client boundary), KHÔNG redirect ai — anonymous và authenticated đều nhận `200` với cùng bố cục, chỉ khác phần cá nhân hoá header (xem `docs/vi/generated/permissions-matrix.md § PERM001_RootRouteGuard`, nay superseded).

### File: src/app/(public)/awards/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /awards | AwardsPage | awards (F004_AwardSystemPage) |

Route `/awards` render SCR004_Awards — trang chi tiết công khai 6 hạng mục giải thưởng SAA 2025 (nav trái + 6 section ảnh/mô tả/số lượng/giá trị + khối Sun* Kudos + header/footer dùng chung với `/`). PUBLIC by design, không qua guard nào (giống `/`, khác `/todo`) — anonymous và authenticated đều nhận `200` với cùng nội dung, trang không cá nhân hoá theo vai trò (chỉ header dùng chung đổi theo trạng thái đăng nhập, xem `docs/vi/generated/permissions-matrix.md`). Mới từ 2026-09-06 (F004_AwardSystemPage) — trước đó 6 link `/awards#<slug>` trên `/` trỏ tới route chưa tồn tại (404).

### File: src/app/(public)/standards/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /standards | StandardsPage | standards (F005_StandardsRulesPage) |

Route `/standards` render SCR005_Standards — panel công khai thể lệ SAA 2025 (huy hiệu Hero 4 hạng, Secret Box 6-icon, Kudos Quốc dân, footer 2 nút "Đóng"/"Viết KUDOS"). PUBLIC by design, không qua guard nào (giống `/`, `/awards`; khác `/todo`). **Khác `/awards`**: nội dung 100% tĩnh i18n (`getTranslations("standards")`), không đọc Supabase/DAL nào, và KHÔNG dùng lại `SiteHeader`/`SiteFooter` — trang chỉ render đúng 1 panel, không có chrome nào (xác nhận bởi E2E `tests/e2e/standards.spec.ts` C2: `header`/`footer` count 0). Mới từ 2026-09-07 (F005_StandardsRulesPage) — trước đó link "Tiêu chuẩn chung" ở `site-footer.tsx:74` trỏ tới route chưa tồn tại (404).

### File: src/app/(protected)/profile/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /profile | ProfilePage | profile (F006_ProfilePage) |

Route `/profile` render SCR006_Profile — hồ sơ Sunner có gác đăng nhập (nhóm `(protected)`, cùng
gate với `/todo` qua `src/app/(protected)/layout.tsx`). Đọc `?id=` qua `parseProfileId()`
(`_utils/parse-profile-id.ts`): rỗng → self; sai định dạng UUID hoặc lặp key → `notFound()` (404);
trùng chính người xem → `redirect("/profile")` (canonicalize); hợp lệ, khác self, không có hàng →
`notFound()`. Đọc hồ sơ (self VÀ other) qua DAL mới `src/dal/profile-cards.ts` (`getProfileCard`),
nguồn là view mới `public.profile_cards` (migration `0005`) — KHÔNG đọc `public.users` trực tiếp.
Dùng lại nguyên vẹn `SiteHeader`/`SiteFooter` (khác `/standards`, giống `/`/`/awards`). Mới từ
2026-09-07 (F006_ProfilePage) — trước đó mục "Hồ sơ" ở menu tài khoản trỏ tới route chưa tồn tại
(404).

### File: app/login/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /login | LoginPage | login |

Guard AUTHORITATIVE ở đây bọc try/catch và fail OPEN (lỗi Supabase không chặn người dùng vào trang login) — khác với `/todo` fail CLOSED. Render ủy quyền phần tương tác (OAuth kickoff, đổi ngôn ngữ) cho boundary client `app/login/login-client.tsx` (đã gắn nhãn `screen-embedded` trong scout-report, không phải route riêng).

### File: app/todo/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /todo | TodoPage | todo |

Guard AUTHORITATIVE gọi `getUser()` mỗi request, fail CLOSED — không có user thì redirect `/login`. Đây là trang todo placeholder (chưa có tính năng todo thật), tồn tại để chứng minh auth guard end-to-end.

### File: (none — Next.js App Router framework default, no app-authored source)

| Path | Component | Route Name |
|------|-----------|------------|
| /_not-found | (built-in Next.js default boundary — không có `not-found.tsx` tùy biến trong `app/`) | not-found |

## Middleware / Proxy Guard Layer

`proxy.ts` (root) là lớp `proxy` của Next 16 (tên cũ: `middleware`) — guard optimistic, KHÔNG phải authoritative. Matcher whitelist tường minh:

```
matcher: ["/", "/login", "/todo/:path*", "/awards", "/standards", "/profile"]
```

**Cập nhật 2026-09-07 (F005_StandardsRulesPage)**: `/awards` (F004, đã thêm trước đó) và `/standards`
(F005) khớp matcher vì CÙNG lý do `/` khớp — chỉ để refresh session cookie + chuẩn hoá
`NEXT_LOCALE` cho một trang public, KHÔNG vì có nhánh guard nào rẽ theo hai path này.

**Cập nhật 2026-09-07 (đợt 2 — F006_ProfilePage)**: `/profile` thêm vào matcher VÀ vào danh sách
predicate `isProtectedPage` — khác `/awards`/`/standards` (chỉ refresh cookie), `/profile` LÀ một
route thực sự bị chặn khi chưa đăng nhập. Predicate đổi từ so khớp 1 route đơn (`startsWith(ROUTES.TODO)`)
sang so khớp theo mảng `PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE]` — vẫn optimistic
pre-check, `(protected)/layout.tsx` vẫn là gate authoritative duy nhất.

Ma trận redirect (đọc `request.nextUrl.pathname`, gọi `getUserOrNull` qua `createProxyClient`) — **đổi từ 2026-09-06 (F003_Homepage)**: hai predicate bên trong đã thu hẹp còn đúng `/login` và các path trong `PROTECTED_ROUTES`; `path === "/"` không còn khớp nhánh redirect nào, dù vẫn nằm trong `matcher` để refresh session cookie mỗi lượt ghé:

| Điều kiện | Redirect tới |
|-----------|--------------|
| đã login & path === /login | / (đổi từ /todo) |
| chưa login & path bắt đầu bằng /todo HOẶC /profile | /login |
| path === / | pass-through LUÔN — không redirect (public, F003_Homepage; trước đây redirect theo trạng thái đăng nhập) |
| path === /awards | pass-through LUÔN — không redirect (public, F004_AwardSystemPage) |
| path === /standards | pass-through LUÔN — không redirect (public, F005_StandardsRulesPage) |
| còn lại | pass-through (giữ cookie đã refresh) |

`/auth/callback` bị loại khỏi matcher một cách tường minh — route đó tự xử lý redirect riêng (xem Backend Routes). `proxy.ts` cũng chuẩn hoá cookie `NEXT_LOCALE` (ghi đè cả trên `request` lẫn `response` nếu giá trị không hợp lệ) trước khi chạy auth guard.

## Summary

| Category | Count |
|----------|-------|
| Backend Routes | 1 |
| Frontend Pages | 7 |
| Total | 8 |
