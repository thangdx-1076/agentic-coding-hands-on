# Permissions Matrix

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-06
**Analysis Scope**: 3 active frontend page guards (`/login`, `/todo`, `/profile` — `/profile` mới từ F006_ProfilePage, gia nhập ĐÚNG cơ chế `/todo`) + 1 superseded guard (`/`, xem PERM001) + 1 backend redirect-target guard (`/auth/callback`) + 4 route xác nhận PUBLIC không route-guard cho chính nó (`/awards` F004_AwardSystemPage, `/standards` F005_StandardsRulesPage, `/kudos` F007_KudosLiveBoard, `/prelaunch` F011_CountdownPrelaunchPage — xem mục cuối) + 3 trục phân quyền GHI ở tầng RLS/RPC Postgres, cùng route `/kudos` (F008_KudosHeartReaction — thả tim; F009_KudosCompose, 2026-09-08 — gửi Kudo + upload ảnh Storage + ẩn danh; F010_SecretBoxModal — mở Secret Box qua RPC `open_secret_box()`, KHÔNG phải route-guard — xem mục `/kudos`) + 1 trục khoá điều hướng site-wide MỚI (F011_CountdownPrelaunchPage, 2026-09-08, nhánh `feat/countdown-prelaunch-page` chưa merge `main` — cờ `PRELAUNCH_LOCK_ENABLED` + thời gian, áp cho MỌI route trang kể cả 3 guard active và cả `/`, `/awards`, `/standards` khi bật, xem mục `/prelaunch`) + 1 trục ĐỌC own-row mới qua RLS + Realtime, không gắn với route nào (F012_NotificationsPanel, 2026-09-09, nhánh `feat/notifications-panel` chưa merge `main` — bảng `public.notifications`, xem mục cuối) — no RBAC in scope, see note below

> **Raw PERM### matrix.** Machine-generated inventory of every permission item with full
> per-permission detail. The plain-language curated view lives at
> [permissions.md](../system/permissions.md). Write THIS file FIRST, then derive the curated
> view from it.

**Code Format**: All codes MUST follow `PERM###_NameSlug` format (e.g., PERM001_ViewReports, PERM002_EditUsers)

**Permission Types**:
- `route-guard` - Route-level authorization middleware
- `screen-permission` - UI element visibility/enabled rules
- `action-permission` - Button/action execution rules
- `data-permission` - Field-level access control
- `role-based` - Role-based access control rules
- `resource-ownership` - Owner/resource relationship checks
- `field-permission` - Column/field visibility rules
- `api-scope` - API scope/token permission
- `feature-flag` - Runtime-evaluated flag from a feature flag service or config
- `experiment` - A/B test variant assignment gate
- `env-gate` - Hardcoded check against an environment variable (fixed at deploy time)
- `locale-gate` - UI branch conditioned on the active locale or language setting

**Note**: Feature mapping is managed in FeatureList.md. This document contains permission items without direct feature references.

**Ground-truth note (verified against source, not assumed)**: Dự án này KHÔNG có RBAC — không role, không ownership check, không policy table. Mọi tài khoản Google xác thực thành công đều nhận đúng một mức truy cập giống nhau. Cơ chế phân quyền duy nhất là **route-guard theo trạng thái đăng nhập** (đã auth / chưa auth), thực thi ở HAI lớp cho mỗi route được bảo vệ: `proxy.ts` (optimistic, tên mới của `middleware` trong Next 16) và một lần re-check `getUser()`/tương đương AUTHORITATIVE ở chính trang đó. Vì vậy cột "Role" trong bảng `Permission Rules` bên dưới giữ đúng hai giá trị **Anonymous** / **Authenticated** — đây là trạng thái đăng nhập, không phải vai trò tổ chức (admin/manager/owner không tồn tại trong code).

**Cập nhật 2026-09-06 (F003_Homepage)**: `public.users` nay có cột `role` (`member`|`admin`), đọc qua `src/dal/users.ts` (`getUserRole`) để quyết định một mục HIỂN THỊ trong menu tài khoản của SCR003_HomeScreen ("Trang quản trị") — đây KHÔNG phải một route-guard mới (không route nào bị chặn theo `role`), nên KHÔNG được cấp mã `PERM###` mới ở đây; xem "Role-based screen-permission" ở cuối mục này.

**Cập nhật 2026-09-08 (F011_CountdownPrelaunchPage, nhánh `feat/countdown-prelaunch-page` chưa
merge `main`) — PERM002/PERM003 dưới đây có thể bị PREEMPT bởi một nhánh chạy TRƯỚC chúng.** Khi
`PRELAUNCH_LOCK_ENABLED=true` VÀ countdown chưa về 0, `src/proxy.ts` redirect `/login` và `/todo`
(cùng `/`, `/awards`, `/standards`, `/profile`) sang `/prelaunch` TRƯỚC KHI predicate của PERM002/
PERM003 từng chạy — cơ chế route-guard của cả hai mã KHÔNG đổi, chỉ đơn giản không được nhường
đường tới trong lúc khoá bật. Xem mục `/prelaunch` cuối file này cho chi tiết đầy đủ.

## Permissions Index

| Code | Name | Type | Enforced At |
|------|------|------|-------------|
| PERM001_RootRouteGuard | Root Route Guard — **SUPERSEDED (không còn hoạt động)** | route-guard | ~~`proxy.ts` (optimistic) + `app/page.tsx` (authoritative fallback)~~ — `/` nay public, không guard |
| PERM002_LoginRouteGuard | Login Route Guard (fail-open) | route-guard | `proxy.ts` (optimistic) + `src/app/(public)/login/page.tsx` (authoritative) |
| PERM003_TodoRouteGuard | Todo Route Guard (fail-closed) | route-guard | `proxy.ts` (optimistic) + `src/app/(protected)/layout.tsx` (authoritative, dùng chung `/profile`) |
| PERM004_CallbackNextPathGuard | Callback Next-Path Open-Redirect Guard | route-guard | `src/app/auth/callback/route.ts` via `src/utils/url/next-path.ts:88` (`safeNextPath`) |

---

## PERM001_RootRouteGuard: Root Route Guard — SUPERSEDED

**Type**: route-guard
**Enforced At**: ~~`proxy.ts` (optimistic) + `app/page.tsx` (authoritative fallback)~~ — **không còn route-guard nào tại `/`** (kể từ F003_Homepage, 2026-09-06)

### Description

**SUPERSEDED — mã này được giữ lại, không xoá, để chỗ cho lịch sử; không mô tả hành vi hiện tại của `/`.** Trước đây route `/` không tự render UI nào — đây là gate redirect thuần theo trạng thái đăng nhập, thực thi hai lớp: `proxy.ts` (optimistic, redirect `authenticated → /todo`, `anonymous → /login`) và `app/page.tsx` (authoritative fallback, redirect y hệt logic trên). **Nay `/` là SCR003_HomeScreen — một trang PUBLIC**: `app/page.tsx` đã được viết lại hoàn toàn để RENDER trang chủ (hero, đếm ngược, giải thưởng, Sun* Kudos, ...) cho MỌI actor, không còn redirect nào. `proxy.ts` vẫn khớp `/` trong `matcher` (`proxy.ts:113`) nhưng chỉ để refresh session cookie — hai predicate `isAuthPage`/`isProtectedPage` bên trong đã thu hẹp lại còn đúng `/login` và `/todo` (`proxy.ts:33-34`), không còn nhánh nào rẽ theo `path === "/"`. Chi tiết đầy đủ (kể cả lý do nghiệp vụ): `docs/vi/system/permissions.md`.

### Related Routes

- (GET) / — nay render SCR003_HomeScreen, không redirect

### Related Screens

- SCR003_HomeScreen — Trang chủ (F003_Homepage; trước đây "none" vì `/` chỉ là fallback redirect thuần)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✓ | **(hành vi mới)** Render đầy đủ nội dung công khai của SCR003_HomeScreen — không còn redirect `/login` |
| Authenticated | ✓ | **(hành vi mới)** Render đầy đủ nội dung, thêm cá nhân hoá header (bell, menu tài khoản, role) — không còn redirect `/todo` |

### Related Modules

- `src/proxy.ts` (predicate cũ đã gỡ, xem PERM002/PERM003)
- `src/app/(public)/(home)/page.tsx` (viết lại hoàn toàn — nay thuộc F003_Homepage, không còn thuộc phạm vi guard)

---

## PERM002_LoginRouteGuard: Login Route Guard (fail-open)

**Type**: route-guard
**Enforced At**: `proxy.ts` (optimistic) + `src/app/(public)/login/page.tsx` (authoritative, fail-open)

### Description

Gate trên `/login`: anonymous được render form đăng nhập (`LoginClient`); authenticated bị redirect sang `/` (đổi từ `/todo`, F003_Homepage) trước khi form kịp render — thực thi ở cả `proxy.ts` (optimistic) lẫn `getCurrentUser()` AUTHORITATIVE trong `src/app/(public)/login/page.tsx`. Đây là gate duy nhất fail **OPEN**: `getCurrentUser()` (`src/dal/auth.ts`) bọc `supabase.auth.getUser()` trong try/catch và trả về `null` cho BẤT KỲ lỗi Supabase nào — nghĩa là khi Supabase gián đoạn, trang vẫn render form login (coi như anonymous) thay vì chặn truy cập. Đây là chủ đích: `/login` là cổng vào duy nhất của app, chặn nó khi outage sẽ khoá toàn bộ người dùng ở ngoài vĩnh viễn.

### Related Routes

- (GET) /login

### Related Screens

- SCR001_LoginScreen - Login

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✓ | Render form đăng nhập bình thường |
| Authenticated | ✗ | Redirect `/` (đổi từ `/todo`) — không render lại form login |
| (Supabase lỗi khi check) | ✓ | Coi như Anonymous, vẫn render form — fail-open chủ đích, không phải bug |

### Related Modules

- proxy.ts
- src/app/(public)/login/page.tsx

---

## PERM003_TodoRouteGuard: Todo Route Guard (fail-closed)

**Type**: route-guard
**Enforced At**: `proxy.ts` (optimistic) + `src/app/(protected)/layout.tsx` (authoritative, fail-closed — hoisted khỏi `todo/page.tsx`, dùng chung `/todo`+`/profile`)

### Description

Gate trên `/todo` — route duy nhất thực sự bảo vệ nội dung có thật (placeholder). Gate nay nằm ở `src/app/(protected)/layout.tsx:23-27`, dùng chung cho cả `/todo` lẫn `/profile`, chạy trước khi bất cứ page con nào render.

**Cơ chế hai bước** (đổi từ route-colocation refactor — trước đây `todo/page.tsx` tự gọi `supabase.auth.getUser()` trần và để exception văng thẳng ra):

1. `getCurrentUser()` (`src/dal/auth.ts:17-27`) bọc `createClient()` + `auth.getUser()` trong try/catch và fail **OPEN** về `null` cho MỌI lỗi — một Supabase outage không được phép làm sập trang, chỉ khiến nó đọc như anonymous. Hàm này tự nó không bao giờ redirect.
2. `(protected)/layout.tsx` là nơi biến `null` thành `redirect(ROUTES.LOGIN)`.

Hợp lại, outcome ở mức route vẫn là fail **CLOSED**: cả "không có session" lẫn "Supabase lỗi" đều kết thúc bằng redirect `/login`, không có nhánh nào để nội dung được bảo vệ render khi chưa xác thực được. Sự bất đối xứng với fail-open của `/login` là cố ý — thà chặn truy cập nội dung được bảo vệ còn hơn để lộ nó. Lưu ý phân biệt: fail-open ở bước 1 là fail-open của *hàm đọc user*, không phải của *gate*; gate chỉ có một kết quả khi không xác thực được, là redirect.

### Related Routes

- (GET) /todo

### Related Screens

- SCR002_TodoScreen - Todo (placeholder)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✗ | Redirect `/login` |
| Authenticated | ✓ | Render lời chào theo email + form đăng xuất (`logoutAction`) |
| (Supabase lỗi khi check) | ✗ | `getCurrentUser()` nuốt lỗi thành `null` nội bộ, rồi `layout.tsx` redirect `/login` như thể anonymous — không có đường nào lộ nội dung bảo vệ khi check thất bại, hiệu quả tương đương fail-closed |

### Related Modules

- proxy.ts
- src/app/(protected)/layout.tsx (`getCurrentUser()` — guard AUTHORITATIVE, hoisted khỏi từng `page.tsx`)
- src/app/(protected)/todo/page.tsx (chỉ còn đọc `user.email` cho lời chào, không tự guard nữa)
- src/app/_actions/logout.ts (`logoutAction` — shared, dùng chung bởi todo/profile/home/awards/kudos; chỉ tới được sau khi `/todo` đã render, tức đã ở trạng thái Authenticated)

---

## PERM004_CallbackNextPathGuard: Callback Next-Path Open-Redirect Guard

**Type**: route-guard
**Enforced At**: `src/app/auth/callback/route.ts` via `src/utils/url/next-path.ts:88` (`safeNextPath`)

### Description

`/auth/callback` bị loại tường minh khỏi matcher của `proxy.ts` — route này tự xử lý redirect riêng, không có tiền điều kiện session (đây chính là đích PKCE code-exchange). Kiểm soát duy nhất liên quan bảo mật/điều hướng ở đây là một choke point chống open-redirect: query param `?next=` là input không tin cậy, được `safeNextPath()` xác thực trước khi dùng làm đích `Location` header — chỉ chấp nhận path same-origin, root-relative (loại `//`, `/\`, bất kỳ `://` scheme separator nào, và mọi control character/line separator thô hoặc percent-encoded có thể mở đường HTTP header/response splitting). Giá trị nào không hợp lệ đều fallback về `/` (đổi từ `/todo`, F003_Homepage — xác nhận lại qua `src/utils/url/next-path.ts:88` default `fallback = "/"`, cả 2 call site `src/app/auth/callback/route.ts:38` và `src/api/auth.ts:49` đều không override), im lặng.

### Related Routes

- (GET) /auth/callback — ROUTE001

### Related Screens

- none — đây là backend route, không có UI

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| (N/A — value-validation gate, không phải actor/role decision) | ✓ | `next=` same-origin + root-relative + không control char → dùng làm đích redirect |
| (N/A — value-validation gate, không phải actor/role decision) | ✗ | `next=` off-origin, `//`/`/\` prefix, chứa `://`, hoặc control/line-separator char (thô hoặc percent-encoded) → fallback về `/` (đổi từ `/todo`, F003_Homepage) |

### Related Modules

- src/app/auth/callback/route.ts
- src/utils/url/next-path.ts

---

## `/awards` — PUBLIC, không route-guard (F004_AwardSystemPage, chưa cấp mã PERM###)

Route `/awards` gia nhập ĐÚNG nhóm PUBLIC với `/` (PERM001 superseded) — không guard nào ở
`proxy.ts` lẫn `src/app/(public)/awards/page.tsx`; Anonymous và Authenticated đều nhận `200` với
cùng nội dung. Không cấp `PERM###` mới vì đây là "không có guard nào", không phải một permission
item cần theo dõi. `proxy.ts`'s `config.matcher` KHÔNG bao gồm `/awards` (khác `/`, vốn vẫn nằm
trong matcher chỉ để refresh session cookie) — quyết định để implementer đánh giá sau, không ảnh
hưởng nội dung public. MoMorph TC ID-1 gốc (kỳ vọng redirect `/login` khi ẩn danh) bị supersede
bởi cùng quyết định kiến trúc đã supersede PERM001 cho `/` — xem `docs/vi/system/permissions.md`.

### Related Routes
- (GET) /awards — SCR004_Awards, không redirect

### Related Screens
- SCR004_Awards — Hệ thống giải thưởng SAA 2025 (F004_AwardSystemPage)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✓ | Render đầy đủ nội dung công khai của SCR004_Awards |
| Authenticated | ✓ | Render đầy đủ nội dung, giống hệt Anonymous — trang không cá nhân hoá theo vai trò (chỉ header dùng chung với `/` đổi theo trạng thái đăng nhập) |

---

## `/profile` — PROTECTED, gia nhập cơ chế PERM003 (F006_ProfilePage, chưa cấp mã PERM### riêng)

Route `/profile` nằm trong nhóm `(protected)` và được gác bởi ĐÚNG `src/app/(protected)/layout.tsx`
mà PERM003_TodoRouteGuard mô tả cho `/todo` — KHÔNG có gate riêng, KHÔNG có cơ chế mới. Điểm khác
biệt duy nhất với PERM003 là route đích: `layout.tsx` bảo vệ CẢ `/todo` lẫn `/profile` (danh sách
con của nó, không phải 2 gate riêng). Không cấp `PERM###` mới ở đây vì đây là "cùng 1 permission
item, thêm 1 route được nó bảo vệ", không phải một quyết định phân quyền độc lập — mã chính thức
(có thể là mở rộng PERM003 hoặc một mã riêng) để `rebuild-spec` Core pass kế tiếp quyết định, cùng
tiền lệ "TBD (draft)" mà `role`-based screen-permission đã dùng ở F003 (xem mục cuối trang này).
`proxy.ts`'s `config.matcher` VÀ `PROTECTED_ROUTES` (mảng, thay vì so khớp 1 route đơn) đều gồm
`/profile` — optimistic pre-check, không phải nguồn sự thật.

**Ranh giới đọc mới (khác PERM003):** self VÀ other đều đọc qua view mới `public.profile_cards`
(migration `0005`, SECURITY DEFINER-equivalent, `GRANT SELECT` chỉ cho `authenticated`) thay vì
`public.users` trực tiếp — cho phép bất kỳ Sunner đã đăng nhập nào đọc `id, full_name, avatar_url`
của BẤT KỲ Sunner khác, hẹp hơn hẳn RLS own-row của bảng gốc, và KHÔNG BAO GIỜ phơi `email`/`role`.
Đây KHÔNG phải `rbac`/`abac` mới (§ Authorization System Type không đổi) — chỉ là 1 view giới hạn
cột cho 1 nhu cầu hiển thị cụ thể. Chi tiết: `docs/vi/system/permissions.md`,
`docs/vi/features/F006_ProfilePage/technical-spec.md` § 3.1.

### Related Routes
- (GET) /profile — SCR006_Profile, redirect `/login` nếu chưa đăng nhập
- (GET) /profile?id={uuid} — SCR006_Profile (other view); redirect canonical về `/profile` nếu `id` trùng chính người xem; `notFound()` nếu sai định dạng/lặp key/không có hàng

### Related Screens
- SCR006_Profile — Hồ sơ Sunner (F006_ProfilePage)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✗ | Redirect `/login` — cùng cơ chế PERM003_TodoRouteGuard |
| Authenticated | ✓ | Render hồ sơ (self hoặc other qua `?id=` hợp lệ); `?id=` sai định dạng/lặp key/không có hàng → `notFound()` |

### Related Modules

- src/proxy.ts (`PROTECTED_ROUTES` — mảng, thêm `/profile`)
- src/app/(protected)/layout.tsx (gate dùng chung với `/todo`)
- src/app/(protected)/profile/page.tsx
- src/dal/profile-cards.ts (`getProfileCard`, đọc `public.profile_cards`)

---

## `/standards` — PUBLIC, không route-guard (F005_StandardsRulesPage, chưa cấp mã PERM###)

Route `/standards` gia nhập ĐÚNG nhóm PUBLIC với `/` (PERM001 superseded) và `/awards` (F004) —
không guard nào ở `proxy.ts` lẫn `src/app/(public)/standards/page.tsx`; Anonymous và Authenticated
đều nhận `200` với cùng nội dung. Không cấp `PERM###` mới vì đây là "không có guard nào", không
phải một permission item cần theo dõi — cùng lý do `/awards` không cấp mã ở mục trên. **Khác
`/awards`**: trang không đọc session/role nào cả (không có header dùng chung cần cá nhân hoá) —
`getUser()`/`getViewer()` không được gọi từ route này. `proxy.ts`'s `config.matcher` bao gồm
`/standards` (cùng lý do đã nêu cho `/awards` ở trên: chỉ refresh session cookie + chuẩn hoá
`NEXT_LOCALE`, không có nhánh redirect nào rẽ theo path này).

### Related Routes
- (GET) /standards — SCR005_Standards, không redirect

### Related Screens
- SCR005_Standards — Thể lệ SAA 2025 (F005_StandardsRulesPage)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✓ | Render đầy đủ nội dung công khai của SCR005_Standards |
| Authenticated | ✓ | Render đầy đủ nội dung, giống hệt Anonymous — trang không đọc session/role, không có phần nào cá nhân hoá (khác `/awards`, vốn còn cá nhân hoá header) |

---

## `/kudos` — PUBLIC (đọc) + 2 trục phân quyền GHI (F007_KudosLiveBoard + F008_KudosHeartReaction: thả tim; F009_KudosCompose, 2026-09-08: gửi Kudo + upload ảnh + ẩn danh — chưa cấp mã PERM### riêng)

Route `/kudos` gia nhập ĐÚNG nhóm PUBLIC với `/`, `/awards`, `/standards` cho phần ĐỌC — không
route-guard nào ở `proxy.ts` lẫn `src/app/(public)/kudos/page.tsx`; Anonymous và Authenticated đều
nhận `200` với cùng bố cục. Không cấp `PERM###` mới cho phần đọc vì đây vẫn là "không có guard nào",
cùng lý do `/awards`/`/standards` không cấp mã. Căn cứ: precondition test case của màn ghi nguyên văn
*"User is unauthenticated but can view Kudos UI"* — gate (nếu có) nằm ở ĐÍCH ĐẾN (click vào 1 profile
hoặc chi tiết kudo), không nằm ở `/kudos` (`docs/vi/system/permissions.md § /kudos là route CÔNG KHAI`).
`src/proxy.ts`'s `config.matcher` (`src/proxy.ts:188`) nay là negative lookahead khớp gần như MỌI
route, `/kudos` nằm trong đó — ghi chú cũ "`/kudos` nằm hoàn toàn ngoài lớp proxy" viết khi matcher
còn là whitelist 6 route và đã SAI kể từ lần widening ở F011. Điểm khác biệt thật nằm ở nhánh xử
lý, không ở matcher: `planProxy` (`src/domain/prelaunch-lock.ts`) trả `{ kind: "pass" }` cho
`/kudos` — zero I/O, `NextResponse.next()` ngay, không refresh cookie và không đọc session — trong
khi `/awards`/`/standards` đi nhánh `auth` (khớp matcher để refresh cookie) và `/profile` là
protected thật.

**Khác mọi route PUBLIC trước đó**: `/kudos` có một hành động GHI — thả tim (F008). Đây là trục phân
quyền THỨ HAI thật sự của dự án, sau "đã đăng nhập hay chưa" (PERM001-004): **quyền ghi gắn với danh
tính hàng dữ liệu**, không suy ra được chỉ từ trạng thái đăng nhập. Route-guard không đủ bảo vệ trục
này — enforcement nằm ở RLS Postgres, không phải ở `proxy.ts` hay Server Component nào:

| Chủ thể | Đọc `/kudos` | Thả tim (`toggleKudoHeart`) |
|---|---|---|
| Anonymous | ✓ | ✗ — nút render nhưng `disabled`, có `title` mời đăng nhập (C22); action tự thân cũng trả `{ok:false, reason:"unauthenticated"}` nếu bị gọi trực tiếp |
| Authenticated, KHÔNG phải người gửi kudo đó | ✓ | ✓ — tối đa 1 lượt/người/kudo |
| Authenticated, LÀ người gửi kudo đó | ✓ | ✗ — nút `disabled` trên kudo của chính mình; action bị RLS bác NGAY CẢ khi gọi trực tiếp, bỏ qua UI |

Hai điều cấm ở cột phải được enforce Ở TẦNG DỮ LIỆU, không phải UI hay application code:
- **1 lượt/người/kudo**: `UNIQUE (kudo_id, user_id)` trên `public.kudo_hearts` (`0007_kudo_hearts.sql`)
  — 2 click nhanh cùng lúc đụng constraint này, `toggleKudoHeart` bắt mã lỗi Postgres `23505` và đọc
  lại thay vì coi là lỗi.
- **Người gửi không tự thả tim**: RLS policy `kudo_hearts_insert_own` trên `kudo_hearts`, `FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() AND user_id <> (SELECT sender_id FROM kudos WHERE
  id = kudo_id))` — verify trực tiếp trên DB: `authenticated` chỉ có `SELECT` trên `kudos` (không có
  UPDATE/INSERT/DELETE), và có đúng `SELECT, INSERT, DELETE` trên `kudo_hearts`. `heart_count` trên
  `kudos` vì vậy CHỈ đổi được qua trigger `sync_kudo_heart_count` (`SECURITY DEFINER`), không đường
  nào khác ghi được cột này kể cả một client Postgres tuỳ ý cầm JWT hợp lệ.
- Đối xứng: RLS policy `kudo_hearts_delete_own`, `FOR DELETE TO authenticated USING (user_id =
  auth.uid())` — chỉ xoá được tim của chính mình.

**Fail-open cho ĐỌC, fail-CLOSED cho GHI**: `getKudosBoard`/`getViewerHeartedKudoIds`/`getKudosStats`
giữ nguyên triết lý `getAwards`/`getProfileCard` — lỗi Supabase → trả rỗng, trang vẫn public, hiện
empty-state. Nhưng `toggleKudoHeart` fail **CLOSED**: bất kỳ lỗi nào (khác `23505` unique-violation,
tức đụng race) đều trả `{ok:false, reason:"error"}` và không ghi gì — một lỗi đọc biến thành
empty-state là chấp nhận được, một lỗi ghi biến thành lượt tim ma thì không.

Không cấp `PERM###` mới ở đây (cùng tiền lệ `/awards`/`/standards`/`/profile` — mã chính thức cho cả
2 trục, ĐỌC lẫn GHI, để `rebuild-spec` Core pass kế tiếp quyết định, xem `docs/vi/system/permissions.md
§ Bề mặt cần cấp PERM### thật khi promote`). Bốn bề mặt đang chờ mã (F007/F008): đọc `/kudos` khi anonymous ·
thả tim khi đã đăng nhập · chặn tự thả tim trên kudo mình gửi · chặn thả tim lần hai trên cùng một kudo.

### F009_KudosCompose — trục phân quyền GHI thứ ba (2026-09-08, chưa cấp mã PERM### riêng)

Gửi Kudo mới (`createKudo`) là đường INSERT ĐẦU TIÊN vào `public.kudos` — trước đó bảng này chỉ có
policy SELECT (F007) và `kudo_hearts` mới là bảng ghi được (F008). Cùng route `/kudos`, cùng
KHÔNG route-guard cho phần đọc; gate ghi nằm hoàn toàn trong Server Action, không ở `proxy.ts`:

| Chủ thể | Đọc `/kudos` | Mở dialog Viết Kudo | Gửi Kudo (INSERT `kudos`) | Upload ảnh (`kudo-images`) |
|---|---|---|---|---|
| Anonymous | ✓ | ✗ — pill điều hướng `/login` thay vì mở dialog | ✗ — `createKudo` tự `auth.getUser()`, trả `{ok:false, reason:"unauthenticated"}` nếu bị gọi trực tiếp | ✗ — policy `kudo_images_insert_authenticated` chỉ cho `authenticated` |
| Authenticated | ✓ | ✓ | ✓ — RLS `kudos_insert_own` (`WITH CHECK sender_id = auth.uid()`) chỉ cho ghi hàng của CHÍNH MÌNH; giả mạo `sender_id` người khác bị Postgres bác (xác nhận trực tiếp trên DB, `migration-transcript.md § 6(b2)`) | ✓ — vào đúng bucket `kudo-images`, policy `kudo_images_insert_authenticated` |

Ba điều enforce Ở TẦNG DỮ LIỆU, không phải UI:
- **Sender phải khớp người gọi**: RLS `kudos_insert_own` trên `public.kudos`
  (`0009_kudos_write_anonymity.sql`), `FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid())`
  — không có điều kiện chặn tự-gửi-cho-chính-mình (khác `kudo_hearts_insert_own`), vì không spec/test
  case nào của màn "Viết Kudo" yêu cầu.
- **Chỉ INSERT, không UPDATE/DELETE**: `authenticated` có đúng `GRANT SELECT` (0006) + `GRANT INSERT`
  (0009) trên `kudos` — không có cách nào sửa/xoá một kudo đã gửi qua REST, kể cả của chính mình.
- **Upload ảnh giới hạn đúng 1 bucket**: 2 policy trên `storage.objects` (`0010_kudo_images_bucket.sql`)
  — `kudo_images_insert_authenticated` (INSERT, `authenticated`, `bucket_id = 'kudo-images'`) và
  `kudo_images_select_public` (SELECT, `public`, cùng điều kiện) — không `ALTER TABLE storage.objects
  ENABLE ROW LEVEL SECURITY` (bẫy hosted-only, xem `permissions.md`).

**Ẩn danh (`is_anonymous`) là một trục quan sát-được khác, không phải quyền GHI mới**: bất kỳ
`authenticated` nào cũng gửi được kudo ẩn danh — `sender_id` thật vẫn ghi vào `public.kudos` (cần cho
RLS + audit), chỉ VIEW `kudos_cards` che khi đọc lại (`CASE WHEN is_anonymous`, xác nhận trực tiếp
trên DB tại `migration-transcript.md § 6(a)`). Không có permission-item riêng cho việc "được phép gửi
ẩn danh" — mọi Sunner đã đăng nhập đều có quyền này như nhau.

**Fail-open cho ĐỌC (tìm người nhận), fail-closed cho GHI** — cùng triết lý F008: `searchSunners`
(đọc `profile_cards`) trả `[]` trên bất kỳ lỗi nào, kể cả khi chưa đăng nhập (không throw); `createKudo`
fail-closed tuyệt đối — lỗi validate/upload/insert đều trả `{ok:false, ...}` và KHÔNG bao giờ để lại
một hàng `kudos` thiếu ảnh (upload xong hết mới insert, AD-5).

Bốn bề mặt của F009 đang chờ mã (cùng "Bốn bề mặt" của F007/F008 ở trên, cấp bởi `rebuild-spec` Core
pass kế tiếp — không tự đặt số ở đây): gửi kudo khi đã đăng nhập · chặn gửi kudo khi chưa đăng nhập ·
upload ảnh vào `kudo-images` khi đã đăng nhập · đọc công khai ảnh trong `kudo-images`. Xem
`docs/vi/system/permissions.md § Bổ sung dự kiến — F009_KudosCompose` cho chi tiết đầy đủ.

### F010_SecretBoxModal — trục phân quyền GHI thứ tư (RPC, chưa cấp mã PERM### riêng)

Mở Secret Box (`openSecretBoxAction` → RPC `open_secret_box()`) là đường GHI thứ tư gắn với `/kudos`,
khác hẳn `kudos_insert_own`/`kudo_hearts_insert_own`: không có RLS policy nào trên
`public.secret_box_openings` cho phép `authenticated` tự INSERT — `authenticated` chỉ có `GRANT SELECT`
(đọc lại openings của chính mình). Writer DUY NHẤT là hàm `SECURITY DEFINER` `open_secret_box()`
(migration `0011_secret_box.sql`), tự resolve `auth.uid()`, không nhận tham số nào từ client:

| Chủ thể | Đọc `/kudos` | Mở Secret Box modal | Gọi RPC `open_secret_box()` |
|---|---|---|---|
| Anonymous | ✓ | ✗ — UI ẩn/disable launcher | ✗ — RPC raise `unauthenticated` (`28000`) khi `auth.uid()` NULL; `REVOKE EXECUTE ... FROM anon, PUBLIC` (`0011:186`) |
| Authenticated | ✓ | ✓ | ✓ nếu còn lượt (`unopened > 0`, tính lại trong transaction đã khoá `pg_advisory_xact_lock`) — hết lượt raise `no_boxes_left` (`P0001`), không insert gì |

Hai điều enforce Ở TẦNG DỮ LIỆU: **entitlement luôn tính lại trong RPC** (`floor(SUM(kudos.heart_count
WHERE sender_id = auth.uid())/5) - count(secret_box_openings WHERE user_id = auth.uid())`, không tin
giá trị client gửi lên — client không gửi gì cả); **`authenticated` không có GRANT EXECUTE** trừ khi
đã đăng nhập (`GRANT EXECUTE ON FUNCTION open_secret_box() TO authenticated`, `0011:187`).

Bề mặt của F010 đang chờ mã (cùng "Bốn bề mặt" của F007/F008/F009 ở trên, cấp bởi `rebuild-spec` Core
pass kế tiếp): mở Secret Box khi còn lượt và đã đăng nhập · chặn mở khi hết lượt · chặn gọi RPC khi
chưa đăng nhập.

### Related Routes
- (GET) /kudos — SCR007_KudosLiveBoard / SCR008_KudosCompose, không redirect
- Server Action `toggleKudoHeart(kudoId)` — không phải route HTTP có path, xem `api-map.md`
- Server Action `loadMoreKudos(input)` — đọc lại, không phải một permission surface mới (cùng
  `getKudosBoard`, cùng fail-open)
- Server Action `createKudo(formData)` (F009) — write surface mới, xem ma trận trên
- Server Action `searchSunners(query)` (F009) — đọc `profile_cards`, fail-open `[]`, chặn anonymous
  ở tầng action dù `profile_cards` vốn đã `GRANT SELECT` chỉ cho `authenticated`

### Related Screens
- SCR007_KudosLiveBoard — Bảng Kudos trực tiếp (F007_KudosLiveBoard + F008_KudosHeartReaction)
- SCR008_KudosCompose — Viết Kudo, dialog phủ trên SCR007 (F009_KudosCompose)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✓ (đọc) / ✗ (ghi) | Đọc toàn bộ nội dung công khai; nút tim `disabled`; pill "Viết Kudo" điều hướng `/login`; mọi action ghi (`toggleKudoHeart`, `createKudo`) trả `unauthenticated` nếu gọi trực tiếp |
| Authenticated, không phải người gửi | ✓ (đọc) / ✓ (ghi, tối đa 1 lượt tim/kudo) | Thả/bỏ tim bình thường qua `toggleKudoHeart`; gửi Kudo mới qua `createKudo` (RLS ràng `sender_id = auth.uid()`) |
| Authenticated, là người gửi kudo đó | ✓ (đọc) / ✗ (thả tim trên kudo mình gửi) | Nút `disabled` trên kudo của chính mình; RLS `kudo_hearts_insert_own` bác INSERT nếu action bị gọi trực tiếp; KHÔNG liên quan tới quyền gửi kudo MỚI (vẫn được, không giới hạn) |

### Related Modules

- src/app/(public)/kudos/page.tsx
- src/app/(public)/kudos/_actions/toggle-kudo-heart.ts (`toggleKudoHeart`)
- src/app/(public)/kudos/_actions/load-more-kudos.ts (`loadMoreKudos`)
- src/app/(public)/kudos/_actions/create-kudo.ts (`createKudo`, F009)
- src/app/(public)/kudos/_actions/upload-kudo-images.ts (`uploadKudoImages`, F009)
- src/app/(public)/kudos/_actions/search-sunners.ts (`searchSunners`, F009)
- src/app/(public)/kudos/_components/kudos-compose-launcher.tsx (`handleActivate` — layer 1 UX gate, F009)
- src/dal/kudos.ts, src/dal/kudo-hearts.ts, src/dal/kudos-stats.ts, src/dal/sunner-search.ts (F009)
- supabase/migrations/0006_kudos.sql, supabase/migrations/0007_kudo_hearts.sql (RLS policies + trigger)
- supabase/migrations/0009_kudos_write_anonymity.sql (F009 — `kudos_insert_own`, cột ẩn danh, view patch)
- supabase/migrations/0010_kudo_images_bucket.sql (F009 — bucket `kudo-images` + 2 policy `storage.objects`)

---

## `/prelaunch` — PUBLIC cho chính nó + 1 trục khoá điều hướng site-wide MỚI (F011_CountdownPrelaunchPage, 2026-09-08, chưa cấp mã PERM### riêng)

`/prelaunch` gia nhập nhóm PUBLIC (`/`, `/awards`, `/standards`, `/kudos`) cho chính nó — không
qua `(protected)/layout.tsx`, không route-guard riêng, không phân biệt vai trò. Màn không có gì
cần bảo vệ (đếm ngược tĩnh, không PII), không cấp `PERM###` mới cho việc XEM màn — cùng lý do
`/awards`/`/standards`/`/kudos` không cấp mã.

**Khác MỌI route PUBLIC trước đó: route này đi kèm một trục khoá áp cho TOÀN BỘ ứng dụng, không
riêng chính nó.** Cờ `PRELAUNCH_LOCK_ENABLED` (mặc định TẮT — fail-safe, chỉ đúng chuỗi `"true"`
mới bật, xác nhận tại `isPrelaunchLockEnabled`) kết hợp countdown `EVENT_START_AT` chưa về 0 →
redirect MỌI route trang về `/prelaunch`, **kể cả 3 route-guard active ở trên** (PERM002_LoginRouteGuard,
PERM003_TodoRouteGuard, và `/profile` gia nhập cơ chế PERM003) **lẫn 3 route PUBLIC khác**
(`/`, `/awards`, `/standards`). Chỉ 4 ngoại lệ kỹ thuật thoát được: `/prelaunch` (chính nó — luật
riêng, xem dưới), `/auth/*`, `/api/*`, `/_next/*`/file tĩnh.

Trục này KHÁC HẲN mọi `PERM###` đã có — không dựa trên danh tính (đã đăng nhập hay chưa), mà trên
**(a) một cờ vận hành + (b) một điều kiện thời gian**, áp dụng đồng nhất bất kể actor là ai (kể cả
`admin`). Đây gần với khái niệm maintenance-mode hơn RBAC/ownership — không có "ai được miễn" theo
danh tính, chỉ có danh sách miễn theo ĐƯỜNG DẪN (kỹ thuật, xem trên).

| Điều kiện | Hành vi |
|---|---|
| Khoá TẮT (mặc định) hoặc countdown đã về 0 | Mọi route hoạt động y hệt trước F011 — không đổi |
| Khoá BẬT & countdown CHƯA về 0, path ∈ {`/auth/*`, `/api/*`, `/_next/*`, file tĩnh} | pass-through (miễn khoá kỹ thuật) |
| Khoá BẬT & countdown CHƯA về 0, path === `/prelaunch` | render bình thường (không redirect vòng lặp) |
| Khoá BẬT & countdown CHƯA về 0, path bất kỳ khác | redirect `/prelaunch` — bao gồm `/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile` |
| path === `/prelaunch`, khoá BẬT & countdown ĐÃ về 0 | redirect `/` (BR-003 — tự gỡ khoá khi tới giờ) |

**Fail-safe, không phải fail-open/fail-closed theo nghĩa lỗi-đọc-dữ-liệu**: cờ này không có khái
niệm "lỗi khi đọc" — chỉ 2 giá trị tường minh. Mặc định khi biến môi trường KHÔNG được set là TẮT,
tránh một môi trường quên set biến này vô tình khoá toàn site. `EVENT_START_AT` thiếu/sai định dạng
parse ra `null` → đọc là "chưa về 0" (không bao giờ tự khoá lặp do lỗi parse).

**303 cho redirect không phải GET/HEAD** — sửa phát sinh khi implement: 307 (mặc định của
`NextResponse.redirect`) giữ nguyên method, nên một Server Action POST bị khoá sẽ re-POST sang
`/prelaunch` (không có action đó) và nhận 404 thay vì màn đếm ngược. GET/HEAD vẫn nhận redirect
mặc định.

Không cấp `PERM###` mới ở đây (cùng tiền lệ `/awards`/`/standards`/`/kudos` — mã chính thức chờ
`rebuild-spec` Core pass kế tiếp quyết định). Bốn bề mặt đang chờ mã: redirect toàn site khi khoá
bật · miễn khoá cho 4 ngoại lệ kỹ thuật · gỡ khoá tự động khi tới giờ · `/prelaunch` tự redirect
`/` khi truy cập lại sau khi đã tới giờ.

### Related Routes
- (GET) /prelaunch — SCR009_CountdownPrelaunch, không redirect cho chính route này (trừ điều kiện
  BR-003 ở bảng trên)

### Related Screens
- SCR009_CountdownPrelaunch — Countdown Prelaunch (F011_CountdownPrelaunchPage)

### Related Modules
- src/app/(public)/prelaunch/page.tsx
- src/domain/prelaunch-lock.ts (`planProxy`, `isPrelaunchLockEnabled`)
- src/proxy.ts (nhánh khoá mở rộng, chạy trước predicate auth cũ)

---

## `public.notifications` — trục ĐỌC own-row mới qua RLS + Realtime, không gắn route nào (F012_NotificationsPanel, 2026-09-09, chưa cấp mã PERM### riêng)

Khác mọi mục trên: đây KHÔNG phải một route-guard và không nằm trên bất kỳ route nào — chuông +
popup thông báo là một header component cross-cutting render trên 4 route ĐÃ CÓ (`/`, `/awards`,
`/profile`, `/kudos`), mỗi route trong 4 route đó giữ nguyên phân loại route-guard hiện tại của nó
(không đổi gì ở PERM001-004 hay ở mục `/kudos`/`/profile` phía trên). Ranh giới của F012 nằm hoàn
toàn trong Postgres, trên một bảng mới.

**Không phải trục phân quyền thứ hai của dự án** (đính chính so với draft gốc của feature —
`docs/vi/system/permissions.md § Bổ sung dự kiến — F012_NotificationsPanel` có bản đầy đủ): RLS
own-row cho ĐỌC đã có từ `public.users` (migration `0001`) và lặp lại ở `public.secret_box_openings`
(F010, `0011`); trục GHI gắn với danh tính hàng dữ liệu đã được chính tài liệu này gọi là "trục thứ
hai" từ F008 (mục `/kudos` phía trên). `public.notifications` là lần lặp lại thứ 5 của cùng một loại
ranh giới RLS own-row, không phải một trục mới — phân loại `other` (§ Authorization System Type
trong `permissions.md`) giữ nguyên.

**Cái thật sự mới**: (1) bảng ĐẦU TIÊN của dự án vào publication `supabase_realtime` — RLS phải lọc
đúng cho cả luồng `postgres_changes` INSERT, không chỉ SELECT qua REST; (2) quyền ghi bị bó hẹp còn
ĐÚNG MỘT CỘT bằng `GRANT UPDATE (is_read)`, không phải chỉ bằng RLS policy (Postgres row-security
không chặn được theo cột); (3) không có GRANT INSERT nào cho `authenticated` — ghi duy nhất qua
trigger `SECURITY DEFINER`, người nhận không bao giờ là người ghi kể cả gián tiếp qua RPC (khác
`open_secret_box()` của F010, nơi viewer tự gọi RPC để tạo hàng của chính mình).

| Chủ thể | Đọc thông báo của mình (SELECT + realtime) | Đánh dấu đã đọc (UPDATE `is_read`) | Ghi thông báo mới (INSERT) |
|---|---|---|---|
| Anonymous | ✗ — không có session, RLS chặn, không có chuông trên UI | ✗ | ✗ |
| Authenticated, đúng chủ hàng (`user_id = auth.uid()`) | ✓ — cả REST lẫn kênh realtime | ✓ — chỉ cột `is_read`, không sửa được `type`/`payload` | ✗ — không ai được `GRANT INSERT`, kể cả chủ hàng |
| Authenticated, KHÔNG phải chủ hàng | ✗ — RLS lọc mất hàng, "0 dòng khớp" giống hệt id không tồn tại (FR-603, chống rò rỉ sự tồn tại) | ✗ — cùng lý do | ✗ |
| *(hệ thống)* trigger `SECURITY DEFINER` khi có Kudos/tim mới | N/A | N/A | ✓ — đường ghi DUY NHẤT, chạy trong cùng transaction với sự kiện sinh ra nó |

Hai điều enforce Ở TẦNG DỮ LIỆU, không phải UI hay application code:
- **Own-row cho cả SELECT lẫn UPDATE**: `notifications_select_own`/`notifications_update_own_read`,
  `USING (user_id = auth.uid())` (`0012_notifications.sql:66-79`) — áp dụng cho cả REST và Realtime
  (Realtime đánh giá lại đúng policy này cho mỗi thay đổi, verify bằng test thật:
  `tests/e2e/notifications.spec.ts:178` TC-002, `:664` TC-019).
- **Cột được UPDATE bị giới hạn bằng GRANT, không phải policy**: `GRANT UPDATE (is_read) ON
  public.notifications TO authenticated` (`0012_notifications.sql:79`) — không có cách nào sửa
  `type`/`payload` của chính hàng mình qua REST.
- **Không GRANT INSERT/DELETE cho bất kỳ role người dùng nào** — ghi duy nhất qua 2 trigger
  `SECURITY DEFINER`, `AFTER INSERT ON public.kudos`/`public.kudo_hearts`
  (`0013_notification_emitters.sql`), cùng hình dạng `sync_kudo_heart_count` (`0007`).

**Fail-open cho ĐỌC (badge), fail-closed cho GHI (mark-read)**: `getUnreadCount` fail-open trả `0`
khi Supabase lỗi (`src/dal/notifications.ts:49-68`) — badge hỏng không được sập header. `markRead`/
`markAllRead` fail-closed — lỗi hoặc 0 dòng khớp đều trả `{ok:false}`/`{updated:0}`, không suy đoán
kết quả (`src/dal/notifications.ts:123-184`).

Không cấp `PERM###` mới ở đây (cùng tiền lệ `/kudos`/`/prelaunch` — mã chính thức chờ `rebuild-spec`
Core pass kế tiếp quyết định). Bốn bề mặt đang chờ mã: đọc own-row (kể cả realtime) · đánh dấu đã
đọc own-row (cột `is_read`) · chặn đọc/ghi thông báo của người khác (không phân biệt với id không
tồn tại) · ghi qua trigger `SECURITY DEFINER` khi có Kudos/tim mới. Xem
`docs/vi/system/permissions.md § Bổ sung dự kiến — F012_NotificationsPanel` cho chi tiết đầy đủ.

### Related Routes
- Không có — cross-cutting header component, không phải một route hay Server Action có path riêng.
  Đọc/ghi đi qua DAL (`src/dal/notifications.ts`) + Server Action `markReadAction`/`markAllReadAction`
  (`src/app/_actions/notifications.ts`), gọi từ bất kỳ trang nào đang render `SiteHeader`.

### Related Screens
- SCR003_HomeScreen, SCR004_Awards, SCR006_Profile, SCR007_KudosLiveBoard — 4 screen ĐÃ CÓ, mỗi cái
  render chuông qua `SiteHeader` (F012_NotificationsPanel không tạo SCR### mới)

### Related Modules
- supabase/migrations/0012_notifications.sql (bảng + RLS + GRANT cột + dedupe index + publication)
- supabase/migrations/0013_notification_emitters.sql (2 trigger `SECURITY DEFINER`)
- src/dal/notifications.ts, src/dal/notifications-query.ts, src/dal/notifications-client.ts
- src/app/_actions/notifications.ts (`markReadAction`, `markAllReadAction`)
- src/api/notifications.ts (đọc + `subscribeToNotifications`, browser)

---

## Role-based screen-permission (chưa cấp mã PERM###)

Mục menu "Trang quản trị" trên header của SCR003_HomeScreen chỉ hiện khi `public.users.role === "admin"`
(đọc qua `src/dal/users.ts` — `getUserRole`, fail-open về `"member"` khi lỗi/không có row). Đây là một
`screen-permission` cấp UI (ẩn/hiện một link, không chặn route nào — `/admin` bản thân chưa tồn
tại) chứ KHÔNG phải một `role-based` route-guard mới, nên KHÔNG được liệt vào Permissions Index ở
trên với một mã `PERM###` tự đặt. Mã chính thức cho mục này sẽ được cấp bởi lượt `rebuild-spec` Core
pass kế tiếp, sau khi `/admin` tồn tại và người review xác nhận phân loại. Xem thêm
`docs/vi/system/permissions.md § Identified Roles`.

---

## Summary

- **Total Permission Items**: 4 (PERM001 nay superseded — không tính vào surface đang hoạt động, nhưng vẫn giữ trong tổng số vì mã chưa bị xoá; `/profile` PROTECTED join cơ chế PERM003 — chưa cấp mã riêng, không cộng thêm vào tổng số; trục ĐỌC own-row mới của F012 (`public.notifications`) cũng chưa cấp mã riêng, không cộng thêm vào tổng số — cùng quy ước F007-F011)
- **By Type**: route-guard: 4 (1 superseded; `/profile` gia nhập PERM003, chưa có mã riêng), screen-permission: 0 (1 chưa cấp mã — xem mục cuối), action-permission: 0, data-permission: 0, role-based: 0, resource-ownership: 0, field-permission: 0, api-scope: 0, feature-flag: 0, experiment: 0, env-gate: 0, locale-gate: 0

---

## Cross-Reference Validation

- [x] All PERM### codes are unique
- [x] All PERM### codes are referenced in FeatureList.md (PERM001-004 → F001; xem `feature-list.md` § F001, F003; F004, F005, F006, F007, F008, F009, F010, F011, F012 không tạo PERM### mới — F007/F008/F009/F010 mở trục phân quyền GHI mới, F011 mở trục khoá site-wide mới, F012 mở trục ĐỌC own-row + Realtime mới, đều chờ core pass cấp mã)
- [x] All related route references are valid (ROUTE001 tồn tại trong route-list.md; `/`, `/awards`, `/kudos`, `/login`, `/prelaunch`, `/profile`, `/standards`, `/todo` khớp bảng Frontend Routes/Pages; F012 không có route riêng — cross-cutting header component trên `/`, `/awards`, `/kudos`, `/profile`)
- [x] All related screen references are valid (SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen, SCR004_Awards, SCR005_Standards, SCR006_Profile, SCR007_KudosLiveBoard, SCR008_KudosCompose, SCR009_CountdownPrelaunch tồn tại trong screen-list.md; PERM004 không target screen nào — lý do nêu ở mục đó; F012 tham chiếu SCR003/SCR004/SCR006/SCR007, không tạo SCR### mới)
- [x] All related module references are valid
- [x] No orphaned permission references

---

## Client-Side Gate Types

None detected in this codebase (`RBAC ground-truth note` trên) — mục này giữ lại nguyên schema tham chiếu bên dưới cho các wave/dự án tương lai cần loại gate này; không có `feature-flag`/`experiment`/`env-gate`/`locale-gate` nào được emit ở PERM001-004.

The four types below (`feature-flag`, `experiment`, `env-gate`, `locale-gate`) are client-side gates — they control rendering or behavior without involving server-side role/permission checks. They share the same PERM### code format but require a `source:` field for traceability.

### feature-flag

A runtime-evaluated flag looked up from a feature flag service or config at request/render time. The value can change without a deploy. Capture the flag name only; do not link to any external service dashboard.

```markdown
### PERM-042 — `enable-new-checkout`
**type:** feature-flag
**trigger:** checked when user navigates to `/checkout`
**source:** `src/routes/checkout.tsx:23` (`useFlag('enable-new-checkout')`)
**effect:** `true` → renders `<CheckoutV2/>`; `false` → renders `<CheckoutV1/>`
```

### experiment

An A/B test variant assignment gate. Capture the experiment name and variant identifiers found in code; do not query the test platform.

```markdown
### PERM-043 — `checkout-cta-copy`
**type:** experiment
**trigger:** evaluated on checkout page mount
**source:** `src/features/checkout/CheckoutPage.tsx:45` (`useExperiment('checkout-cta-copy')`)
**effect:** variant `control` → "Complete Purchase"; variant `treatment` → "Buy Now"
```

### env-gate

A hardcoded check against an environment variable (`NODE_ENV`, `APP_ENV`, `RAILS_ENV`, etc.). The value is fixed at deploy time, not runtime.

```markdown
### PERM-044 — production analytics gate
**type:** env-gate
**trigger:** app bootstrap
**source:** `src/lib/analytics.ts:12` (`if (process.env.NODE_ENV === 'production')`)
**effect:** analytics tracking enabled only in production; skipped in dev/test
```

### locale-gate

A UI branch conditioned on the active locale or language setting.

```markdown
### PERM-045 — JP-only payment methods
**type:** locale-gate
**trigger:** payment methods list render
**source:** `src/features/checkout/PaymentMethods.tsx:88` (`if (locale === 'ja-JP')`)
**effect:** shows Konbini payment option only when locale is `ja-JP`
```

---

## Extraction Signatures

Use these patterns to locate client-side gates in source code. All signatures match function/method names only — do not hard-code library names.

### feature-flag
Match function calls: `useFlag|useFeature|isEnabled|featureFlag\(|checkFlag`
Capture: first string argument (the flag name). Skip if no string literal arg present.

### experiment
Match function calls: `useExperiment|getVariant|abTest\(|experiment\.variant|useAbTest`
Capture: first string argument (experiment name) + all variant string values found nearby.

### env-gate
Match comparisons against: `process\.env\.|import\.meta\.env\.|ENV\[|os\.environ\[`
followed by `===`, `==`, `!==`, `in (...)`, or conditional block.
Capture: env var name + compared value.

### locale-gate
Match comparisons against: `i18n\.locale|currentLocale|getLocale\(\)|locale\s*===|lang\s*===`
Capture: locale/language value being compared.

**Codebase check note (this project)**: `proxy.ts` normalize hoá cookie `NEXT_LOCALE` (raw != normalized → set lại `vi`/`en`) — đây là input-validation/fallback thuần (untrusted cookie → giá trị hợp lệ), KHÔNG phải locale-gate (không có nhánh UI/quyền nào rẽ theo giá trị locale đã chọn). `src/lib/supabase/client.ts`/`server.ts` dùng `!` non-null assertion trên biến môi trường (fail loud khi thiếu) — không phải env-gate (không có so sánh `===` rẽ nhánh theo `NODE_ENV`/`APP_ENV`). Không tìm thấy `useFlag`/`useExperiment`/tương đương nào trong codebase.
