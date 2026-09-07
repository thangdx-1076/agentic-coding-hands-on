# Permissions Matrix

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-06
**Analysis Scope**: 2 active frontend page guards (`/login`, `/todo`) + 1 superseded guard (`/`, xem PERM001) + 1 backend redirect-target guard (`/auth/callback`) + 2 route xác nhận PUBLIC không guard (`/awards` F004_AwardSystemPage, `/standards` F005_StandardsRulesPage — xem mục cuối) — no RBAC in scope, see note below

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

**Cập nhật 2026-09-06 (F003_Homepage)**: `public.users` nay có cột `role` (`member`|`admin`), đọc qua `lib/auth/get-user-role.ts` để quyết định một mục HIỂN THỊ trong menu tài khoản của SCR003_HomeScreen ("Trang quản trị") — đây KHÔNG phải một route-guard mới (không route nào bị chặn theo `role`), nên KHÔNG được cấp mã `PERM###` mới ở đây; xem "Role-based screen-permission" ở cuối mục này.

## Permissions Index

| Code | Name | Type | Enforced At |
|------|------|------|-------------|
| PERM001_RootRouteGuard | Root Route Guard — **SUPERSEDED (không còn hoạt động)** | route-guard | ~~`proxy.ts` (optimistic) + `app/page.tsx` (authoritative fallback)~~ — `/` nay public, không guard |
| PERM002_LoginRouteGuard | Login Route Guard (fail-open) | route-guard | `proxy.ts` (optimistic) + `app/login/page.tsx` (authoritative) |
| PERM003_TodoRouteGuard | Todo Route Guard (fail-closed) | route-guard | `proxy.ts` (optimistic) + `app/todo/page.tsx` (authoritative) |
| PERM004_CallbackNextPathGuard | Callback Next-Path Open-Redirect Guard | route-guard | `app/auth/callback/route.ts` via `lib/supabase/next-path.ts:88` (`safeNextPath`) |

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

- proxy.ts (predicate cũ đã gỡ, xem PERM002/PERM003)
- app/page.tsx (viết lại hoàn toàn — nay thuộc F003_Homepage, không còn thuộc phạm vi guard)

---

## PERM002_LoginRouteGuard: Login Route Guard (fail-open)

**Type**: route-guard
**Enforced At**: `proxy.ts` (optimistic) + `app/login/page.tsx` (authoritative, fail-open)

### Description

Gate trên `/login`: anonymous được render form đăng nhập (`LoginClient`); authenticated bị redirect sang `/` (đổi từ `/todo`, F003_Homepage) trước khi form kịp render — thực thi ở cả `proxy.ts` (optimistic) lẫn `getAuthenticatedUser()` AUTHORITATIVE trong `app/login/page.tsx`. Đây là gate duy nhất fail **OPEN**: `getAuthenticatedUser()` bọc `supabase.auth.getUser()` trong try/catch và trả về `null` cho BẤT KỲ lỗi Supabase nào — nghĩa là khi Supabase gián đoạn, trang vẫn render form login (coi như anonymous) thay vì chặn truy cập. Đây là chủ đích: `/login` là cổng vào duy nhất của app, chặn nó khi outage sẽ khoá toàn bộ người dùng ở ngoài vĩnh viễn.

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
- app/login/page.tsx

---

## PERM003_TodoRouteGuard: Todo Route Guard (fail-closed)

**Type**: route-guard
**Enforced At**: `proxy.ts` (optimistic) + `app/todo/page.tsx` (authoritative, fail-closed)

### Description

Gate trên `/todo` — route duy nhất thực sự bảo vệ nội dung có thật (placeholder). `app/todo/page.tsx` gọi `supabase.auth.getUser()` KHÔNG bọc try/catch: nếu lỗi, exception văng ra thẳng thay vì bị nuốt thành "coi như đã login"; nếu resolve mà không có `user`, `redirect("/login")` chạy trước khi bất cứ nội dung nào render. Đây là fail **CLOSED**, cố ý bất đối xứng với fail-open của `/login` — thà lỗi/chặn truy cập nội dung được bảo vệ còn hơn để lộ nó khi không xác thực được.

### Related Routes

- (GET) /todo

### Related Screens

- SCR002_TodoScreen - Todo (placeholder)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| Anonymous | ✗ | Redirect `/login` |
| Authenticated | ✓ | Render lời chào theo email + form đăng xuất (`logoutAction`) |
| (Supabase lỗi khi check) | ✗ | Exception văng thẳng (không có try/catch) — không có đường nào lộ nội dung bảo vệ khi check thất bại, hiệu quả tương đương fail-closed dù không tường minh trả `null` |

### Related Modules

- proxy.ts
- app/todo/page.tsx
- app/todo/actions.ts (`logoutAction` — chỉ tới được sau khi `/todo` đã render, tức đã ở trạng thái Authenticated)

---

## PERM004_CallbackNextPathGuard: Callback Next-Path Open-Redirect Guard

**Type**: route-guard
**Enforced At**: `app/auth/callback/route.ts` via `lib/supabase/next-path.ts:88` (`safeNextPath`)

### Description

`/auth/callback` bị loại tường minh khỏi matcher của `proxy.ts` — route này tự xử lý redirect riêng, không có tiền điều kiện session (đây chính là đích PKCE code-exchange). Kiểm soát duy nhất liên quan bảo mật/điều hướng ở đây là một choke point chống open-redirect: query param `?next=` là input không tin cậy, được `safeNextPath()` xác thực trước khi dùng làm đích `Location` header — chỉ chấp nhận path same-origin, root-relative (loại `//`, `/\`, bất kỳ `://` scheme separator nào, và mọi control character/line separator thô hoặc percent-encoded có thể mở đường HTTP header/response splitting). Giá trị nào không hợp lệ đều fallback về `/todo`, im lặng.

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

- app/auth/callback/route.ts
- lib/supabase/next-path.ts

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

## Role-based screen-permission (chưa cấp mã PERM###)

Mục menu "Trang quản trị" trên header của SCR003_HomeScreen chỉ hiện khi `public.users.role === "admin"`
(đọc qua `lib/auth/get-user-role.ts`, fail-open về `"member"` khi lỗi/không có row). Đây là một
`screen-permission` cấp UI (ẩn/hiện một link, không chặn route nào — `/admin` bản thân chưa tồn
tại) chứ KHÔNG phải một `role-based` route-guard mới, nên KHÔNG được liệt vào Permissions Index ở
trên với một mã `PERM###` tự đặt. Mã chính thức cho mục này sẽ được cấp bởi lượt `rebuild-spec` Core
pass kế tiếp, sau khi `/admin` tồn tại và người review xác nhận phân loại. Xem thêm
`docs/vi/system/permissions.md § Identified Roles`.

---

## Summary

- **Total Permission Items**: 4 (PERM001 nay superseded — không tính vào surface đang hoạt động, nhưng vẫn giữ trong tổng số vì mã chưa bị xoá)
- **By Type**: route-guard: 4 (1 superseded), screen-permission: 0 (1 chưa cấp mã — xem mục trên), action-permission: 0, data-permission: 0, role-based: 0, resource-ownership: 0, field-permission: 0, api-scope: 0, feature-flag: 0, experiment: 0, env-gate: 0, locale-gate: 0

---

## Cross-Reference Validation

- [x] All PERM### codes are unique
- [x] All PERM### codes are referenced in FeatureList.md (PERM001-004 → F001; xem `feature-list.md` § F001, F003; F004, F005 không tạo PERM### mới)
- [x] All related route references are valid (ROUTE001 tồn tại trong route-list.md; `/`, `/awards`, `/login`, `/standards`, `/todo` khớp bảng Frontend Routes/Pages)
- [x] All related screen references are valid (SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen, SCR004_Awards, SCR005_Standards tồn tại trong screen-flow.md/screen-list.md; PERM004 không target screen nào — lý do nêu ở mục đó)
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

**Codebase check note (this project)**: `proxy.ts` normalize hoá cookie `NEXT_LOCALE` (raw != normalized → set lại `vi`/`en`) — đây là input-validation/fallback thuần (untrusted cookie → giá trị hợp lệ), KHÔNG phải locale-gate (không có nhánh UI/quyền nào rẽ theo giá trị locale đã chọn). `lib/supabase/client.ts`/`server.ts` dùng `!` non-null assertion trên biến môi trường (fail loud khi thiếu) — không phải env-gate (không có so sánh `===` rẽ nhánh theo `NODE_ENV`/`APP_ENV`). Không tìm thấy `useFlag`/`useExperiment`/tương đương nào trong codebase.
