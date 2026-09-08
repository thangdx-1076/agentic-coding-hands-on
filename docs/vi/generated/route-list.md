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

Chín route frontend: tám route dựng từ `page.tsx` theo quy ước App Router, cộng route `/_not-found` do framework Next.js tự cấp phát mặc định (không có file `not-found.tsx` tùy biến nào trong `app/`).

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

### File: src/app/(public)/kudos/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /kudos | KudosPage | kudos (F007_KudosLiveBoard / F008_KudosHeartReaction / F009_KudosCompose) |

Route `/kudos` render SCR007_KudosLiveBoard — bảng Kudos trực tiếp công khai (banner, ô soạn Kudo, bộ lọc hashtag/phòng ban, carousel Highlight, feed ALL KUDOS phân trang keyset, Spotlight, sidebar thống kê cá nhân), dùng lại `SiteHeader`/`SiteFooter` chung với `/`, `/awards`, `/profile`. PUBLIC by design (clarifications.md § Route & điều hướng, BR-015) — anonymous và authenticated đều nhận `200` với cùng bố cục, chỉ khác `viewerId`/sidebar cá nhân (ẩn hoàn toàn khi ẩn danh) và trạng thái nút tim (xem `permissions-matrix.md`). Đọc `?hashtag=`/`?department=` để lọc Highlight+Feed (Spotlight và danh sách bộ lọc luôn tính trên toàn bộ dữ liệu, không theo filter đang chọn). Bốn Server Action riêng, không phải route: `toggleKudoHeart` (F008, fail-closed, có `revalidatePath`), `loadMoreKudos` (F007, fail-open, CỐ Ý không `revalidatePath`), `createKudo` (F009, fail-closed, có `revalidatePath` khi ghi thành công), `searchSunners` (F009, đọc, fail-open `[]`) — xem `api-map.md`. Mới từ 2026-09-07 (F007_KudosLiveBoard + F008_KudosHeartReaction) — trước đó 5 điểm vào hardcode `href="/kudos"` (`SiteHeader` nav, `SiteFooter`, `KudosSection` nút "Chi tiết", `WidgetButton` trên `/`, nút "Viết KUDOS" trên `/standards`) đều trỏ route chưa tồn tại (404); không cái nào trong 5 điểm này cần sửa code để hết 404. Từ 2026-09-08 (F009_KudosCompose): trang có thêm dialog SCR008_KudosCompose, mở từ pill "Viết Kudo" (đã có sẵn UI từ F007 nhưng cố tình vô hiệu tới lượt này) — vẫn CÙNG route `/kudos`, không route/URL mới; đây là đường INSERT đầu tiên vào `public.kudos` và lần đầu repo dùng Supabase Storage (bucket `kudo-images`, migration `0010_kudo_images_bucket.sql`).

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

### File: src/app/(public)/prelaunch/page.tsx

| Path | Component | Route Name |
|------|-----------|------------|
| /prelaunch | PrelaunchPage | prelaunch (F011_CountdownPrelaunchPage) |

Route `/prelaunch` render SCR009_CountdownPrelaunch — màn đếm ngược toàn màn hình tới
`EVENT_START_AT`, tái dùng nguyên logic đếm ngược của `/` (nay shared: `src/utils/countdown.ts`,
`src/app/(public)/_hooks/use-countdown.ts`, `src/app/(public)/_components/countdown-tiles.tsx`). PUBLIC by design, bản thân
route không qua guard nào (giống `/`, `/awards`, `/standards`). Không đọc Supabase — toàn bộ trạng
thái từ 2 biến môi trường (`EVENT_START_AT`, `PRELAUNCH_LOCK_ENABLED`). Mới từ 2026-09-08
(F011_CountdownPrelaunchPage, nhánh `feat/countdown-prelaunch-page`, chưa merge `main`). Xem mục
"Middleware / Proxy Guard Layer" dưới đây cho vai trò route này đóng trong nhánh khoá điều hướng
site-wide.

### File: (none — Next.js App Router framework default, no app-authored source)

| Path | Component | Route Name |
|------|-----------|------------|
| /_not-found | (built-in Next.js default boundary — không có `not-found.tsx` tùy biến trong `app/`) | not-found |

## Middleware / Proxy Guard Layer

`proxy.ts` (root) là lớp `proxy` của Next 16 (tên cũ: `middleware`) — guard optimistic, KHÔNG phải authoritative.

**Cập nhật 2026-09-08 (F011_CountdownPrelaunchPage, nhánh `feat/countdown-prelaunch-page`, chưa
merge `main`) — matcher đổi từ whitelist literal sang negative lookahead:**

```
matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
```

Pattern do `node_modules/next/dist/docs/.../proxy.md` § Matcher khuyến nghị cho "khớp mọi thứ trừ
một danh sách loại trừ ngắn" — thay whitelist 6-route cũ (giữ lại làm ghi chú lịch sử ngay dưới)
vì nhánh khoá prelaunch (xem cuối mục này) phải thấy MỌI route mới redirect được nó về
`/prelaunch`. Route nào mới lộ ra do matcher rộng hơn (vd. `/kudos`) mà không nằm trong 6 route cũ
chỉ nhận `{ kind: "pass" }` với ZERO I/O từ nhánh khoá TRƯỚC khi `getUserOrNull` từng chạy — không
hồi quy chi phí Supabase cho route chưa từng có (`src/domain/prelaunch-lock.ts`, hàm
`isLegacyProxyRoute` tái tạo đúng whitelist 6-route cũ cho mục đích khác: chỉ 6 route đó chạy
`auth`/session-lookup khi không bị nhánh khoá redirect, còn lại luôn `pass`).

Whitelist 6-route cũ (nay chỉ còn ý nghĩa lịch sử — vẫn là nội dung của `isLegacyProxyRoute`):

```
whitelist cũ: "/", "/login", "/todo/:path*", "/awards", "/standards", "/profile"
```

**Cập nhật 2026-09-07 (F005_StandardsRulesPage)**: `/awards` (F004, đã thêm trước đó) và `/standards`
(F005) khớp matcher vì CÙNG lý do `/` khớp — chỉ để refresh session cookie + chuẩn hoá
`NEXT_LOCALE` cho một trang public, KHÔNG vì có nhánh guard nào rẽ theo hai path này.

**Cập nhật 2026-09-07 (đợt 2 — F006_ProfilePage)**: `/profile` thêm vào matcher VÀ vào danh sách
predicate `isProtectedPage` — khác `/awards`/`/standards` (chỉ refresh cookie), `/profile` LÀ một
route thực sự bị chặn khi chưa đăng nhập. Predicate đổi từ so khớp 1 route đơn (`startsWith(ROUTES.TODO)`)
sang so khớp theo mảng `PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE]` — vẫn optimistic
pre-check, `(protected)/layout.tsx` vẫn là gate authoritative duy nhất.

**Cập nhật 2026-09-07 (đợt 3 — F007_KudosLiveBoard + F008_KudosHeartReaction)**: `/kudos` không nằm
trong whitelist 6-route cũ — khác hẳn `/awards`/`/standards`/`/profile`, route này không chạy qua
`auth`/refresh-cookie của proxy. Kể từ F011 (matcher đổi sang negative lookahead), `/kudos` CÓ khớp
matcher mới nhưng vẫn chỉ nhận `pass` (không phải `auth`) vì không nằm trong `isLegacyProxyRoute` —
hệ quả quan sát được không đổi khi khoá TẮT: không refresh session cookie/chuẩn hoá `NEXT_LOCALE`
nào chạy khi truy cập `/kudos` trực tiếp, route tự đọc session qua `getCurrentUser()`/`getViewer()`
ngay trong `page.tsx`. Khi khoá BẬT, `/kudos` redirect về `/prelaunch` như mọi route khác (xem
"Nhánh khoá điều hướng" cuối mục này).

**Mới 2026-09-08 (F011_CountdownPrelaunchPage) — nhánh khoá điều hướng, chạy TRƯỚC mọi predicate
auth khác:** cờ `PRELAUNCH_LOCK_ENABLED` (mặc định TẮT, fail-safe — chỉ đúng chuỗi `"true"` mới
bật) VÀ `EVENT_START_AT` chưa về mốc (tính bằng `parseTargetDate`/`remaining`, đúng cặp hàm
`/prelaunch` dùng) → redirect MỌI route trang về `/prelaunch`, **kể cả 6 route thuộc whitelist cũ**
(`/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile`) — chỉ 4 ngoại lệ kỹ thuật thoát được:
`/prelaunch` (chính nó, luật riêng), `/auth/*`, `/api/*`, `/_next/*`/file tĩnh. Xem
`docs/vi/system/architecture.md` và `docs/vi/system/permissions.md` § "Bổ sung dự kiến —
CountdownPrelaunchPage" cho chi tiết + lý do thứ tự (`src/domain/prelaunch-lock.ts`, hàm
`planProxy`). Redirect của nhánh khoá dùng **303** cho request không phải GET/HEAD (tránh 307 mặc
định re-POST một Server Action sang `/prelaunch` rồi 404); GET/HEAD nhận redirect mặc định.

**Cập nhật 2026-09-08 (F009_KudosCompose)**: `/kudos` VẪN KHÔNG thêm vào `matcher` dù đã có đường
ghi thật (INSERT `public.kudos` + upload Storage) — quyết định có chủ đích, không phải bỏ sót
(`docs/vi/system/permissions.md § Vì sao /kudos KHÔNG vào src/proxy.ts`). Gate duy nhất có giá trị
bảo mật cho hành động ghi nằm BÊN TRONG Server Action `createKudo` (tự `auth.getUser()`, fail
closed) — route-level guard chỉ trả lời "xem được trang hay không", còn F009 tách hành động ghi
khỏi hành động xem trên CÙNG một route công khai.

Ma trận redirect (đọc `request.nextUrl.pathname`, gọi `getUserOrNull` qua `createProxyClient`) — **thứ tự as-built (`src/domain/prelaunch-lock.ts`, hàm `planProxy`), nhánh khoá chạy TRƯỚC mọi predicate auth dưới đây**:

| Điều kiện | Redirect tới |
|-----------|--------------|
| path === /prelaunch & khoá bật & countdown đã về 0 | / (BR-003) |
| path ∈ {/auth/*, /api/*, /_next/*, file tĩnh} | pass-through LUÔN (miễn khoá kỹ thuật) |
| khoá bật (`PRELAUNCH_LOCK_ENABLED=true`) & countdown CHƯA về 0 | /prelaunch — áp dụng cho MỌI path còn lại, kể cả `/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile` |
| đã login & path === /login (chỉ tới đây khi khoá tắt hoặc đã về 0) | / (đổi từ /todo) |
| chưa login & path bắt đầu bằng /todo HOẶC /profile (chỉ tới đây khi khoá tắt hoặc đã về 0) | /login |
| path === / , /awards, /standards (chỉ tới đây khi khoá tắt hoặc đã về 0) | pass-through — không redirect (public) |
| còn lại | pass-through (giữ cookie đã refresh nếu path ∈ whitelist 6-route cũ) |

`/auth/callback` bị loại khỏi matcher một cách tường minh — route đó tự xử lý redirect riêng (xem Backend Routes). `proxy.ts` cũng chuẩn hoá cookie `NEXT_LOCALE` (ghi đè cả trên `request` lẫn `response` nếu giá trị không hợp lệ) trước khi chạy auth guard.

## Summary

| Category | Count |
|----------|-------|
| Backend Routes | 1 |
| Frontend Pages | 9 |
| Total | 10 |
