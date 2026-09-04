---
status: implemented
authored_by: takumi
created: 2026-09-04
lang: vi
fcode: F001
---

# F001_GoogleOAuthLogin

## 1. Technical Overview

Khách đăng nhập vào SAA 2025 bằng tài khoản Google bất kỳ qua Supabase Auth (luồng PKCE, `@supabase/ssr`); thành công → `/todo` (trang bảo vệ, placeholder). Guard hai lớp — optimistic trong `proxy.ts` (Next.js 16) + authoritative `getUser()` trong `/todo` — điều hướng theo trạng thái đăng nhập cho `/login`, `/`, `/todo`. Đăng nhập thất bại/huỷ → về `/login?error=...`, hiện thông báo lỗi inline dưới nút Google.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — guard truy cập `proxy.ts`* | — | FR-001, FR-101, FR-601, FR-602, BR-003, US002, US003 | — | § 4.4 |
| **A1** | `LoginPage` (planned) | `GET` `/login` | FR-201, FR-204, US005 | — *(read-only)* | § 3.1 |
| **A2** | `LoginGoogleButton#handleClick` (planned) | — *(gọi SDK Supabase phía client, không phải route nội bộ)* | FR-202, FR-203, US001 | — *(không ghi DB — điều hướng trình duyệt sang authorize URL bên ngoài)* | § 3.1 |
| **A3** | `AuthCallbackRoute#GET` (planned) | `GET` `/auth/callback` | FR-401, FR-402, BR-001, BR-002, DEC-001, DEC-002, US001, US005 | — *(ghi cookie session Supabase qua SSR — không phải bảng DB của app)* | § 3.1 |
| **A4** | `TodoPage` (planned) | `GET` `/todo` | FR-301, FR-602, FR-603, US003 | — *(read-only)* | § 3.1 |
| **A5** | `logoutAction` (planned) | `server action` | FR-302, US004 | — *(xoá cookie session Supabase — không phải bảng DB của app)* | § 3.1 |

## 3. Actions

### 3.1 CAP-01 — Googleoauthlogin

#### A1 · LoginPage — render màn `/login` (server component)
`GET` `/login` → `LoginPage` (planned)
`FR-201` `FR-204` · `SCR001_Login` · US005

<!-- Rung order per wire-format-contract.md § 3 — include only the rungs that apply, in this order: Who, FE, Request, BE, Rule, Result, Source. An absent rung is OMITTED entirely, never rendered as N/A or None. (that shape trips rung_empty_rendered, a critical). Only the RELATIVE ORDER of whichever rungs you do include is checked (rung_order); presence of every rung is never required. Every rung except Source is rendered as a bold label, a middot, then the body; Source is the one exception — colon inside the bold, a single space, then a backticked path:line citation, no middot — see the contract for the exact form. -->

**Who** · Khách (chưa đăng nhập)
**FE** · Server Component render header (logo tĩnh + vùng bộ chọn ngôn ngữ — chi tiết thuộc F002_LanguageSwitch, partial-screen ownership), hero (tiêu đề "ROOT FURTHER", 2 dòng mô tả, nút "LOGIN With Google"), footer bản quyền.
**Request** · query param `error` *(optional, string)* — có mặt khi callback chuyển hướng về sau lỗi.
**BE** · Không gọi API khi render lần đầu; đọc `searchParams.error` từ chính route.
**Rule** · FR-204 — khi `error` có trên query string, hiển thị cố định "Đăng nhập không thành công. Vui lòng thử lại." (`role="alert"`), không phân biệt loại lỗi cụ thể.
**Result** · Không ghi DB. `error` khác rỗng → hiện banner lỗi dưới nút Google; ngược lại ẩn.
**Source:** TBD (draft)

<!-- Không diagram: dưới ngưỡng — read-only, 1 request đồng bộ, không ghi bảng nào. -->

---

#### A2 · Bấm nút "LOGIN With Google"
— *(client SDK call)* → `LoginGoogleButton#handleClick` (planned)
`FR-202` `FR-203` · `SCR001_Login` · US001

**Who** · Khách (chưa đăng nhập)
**FE** · Client Component; `onClick` gọi `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback?next=/todo' } })` trong `useTransition`.
**Request** · không có request HTTP nội bộ — SDK điều hướng trình duyệt sang `.../auth/v1/authorize?provider=google&...` (GoTrue).
**BE** · *không có* — xử lý hoàn toàn phía client cho bước khởi động OAuth.
**Rule** · FR-203 — trong lúc `isPending`, nút chuyển `disabled` + `aria-busy="true"` + spinner; nút không có `type="submit"` trong form.
**Result** · Không ghi DB. Trình duyệt điều hướng ra ngoài ứng dụng tới trang xác thực Google.
**Source:** TBD (draft)

<!-- Không diagram: dưới ngưỡng — 1 hành động đơn, không ghi ≥2 bảng, không phải background/async-step. -->

---

#### A3 · Route Handler `/auth/callback`
`GET` `/auth/callback` → `AuthCallbackRoute#GET` (planned)
`FR-401` `FR-402` `BR-001` `BR-002` `DEC-001` `DEC-002` · US001, US005

**Who** · *hệ thống — GoTrue chuyển hướng trình duyệt về sau khi khách xác thực (hoặc huỷ) trên Google*
**FE** · *none*
**Request** · query `code` *(string, optional)*, `error`/`error_description` *(string, optional)*, `next` *(string, optional, mặc định `/todo`)*.
**BE** · `createClient().auth.exchangeCodeForSession(code)` (server client, `@supabase/ssr`).
**Rule**
- **BR-001 — Mọi tài khoản Google hợp lệ đều được phép, không giới hạn theo vai trò.** Không có bước kiểm tra role/permission nào sau khi đổi `code` thành công.
- **BR-002 — Tham số `next` chỉ được chấp nhận khi là đường dẫn nội bộ bắt đầu bằng `/`; nếu không, dùng mặc định `/todo`.** Chống open-redirect.

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | flow | `code` hợp lệ và `exchangeCodeForSession` thành công | Chuyển hướng tới `next` (đã qua BR-002) | TBD (draft) |
| **DEC-002** | flow | `error` có trên query, HOẶC `exchangeCodeForSession` trả lỗi | Chuyển hướng tới `/login?error=<code>` | TBD (draft) |

**Result** · Không ghi bảng DB của app; ghi cookie session Supabase (`sb-*-auth-token`) qua SSR khi DEC-001 xảy ra.
**Source:** TBD (draft)

<!-- Không diagram: dưới ngưỡng đo — 1 bảng DEC branching đã đủ rõ hơn sequenceDiagram (background/async-step không áp dụng — xử lý đồng bộ trong 1 request). -->

---

#### A4 · Hiển thị `/todo` (đã xác thực)
`GET` `/todo` → `TodoPage` (planned)
`FR-301` `FR-602` `FR-603` · `SCR002_Todo` · US003

**Who** · Người dùng đã xác thực
**FE** · Server Component render `<h1>` chứa email người dùng + nút "Đăng xuất".
**Request** · không có param — dựa vào cookie session hiện có.
**BE** · `createClient().auth.getUser()` (server client) — xác thực lại authoritative, độc lập với guard optimistic ở A0.
**Rule** · FR-603 — nếu `getUser()` không trả về người dùng hợp lệ, chuyển hướng `/login` ngay cả khi guard optimistic đã cho qua.
**Result** · Không ghi DB. Không có người dùng hợp lệ → redirect `/login`; có → render email + nút đăng xuất.
**Source:** TBD (draft)

---

#### A5 · Đăng xuất
`server action` → `logoutAction` (planned)
`FR-302` · US004

**Who** · Người dùng đã xác thực
**FE** · Nút "Đăng xuất" trên `/todo` gọi Server Action.
**Request** · không có payload — dựa vào cookie session hiện có.
**BE** · `createClient().auth.signOut()` (server client), sau đó redirect `/login`.
**Rule** · FR-302 — đăng xuất luôn thành công khi có session hợp lệ; không có điều kiện khác.
**Result** · Xoá cookie session Supabase. Redirect `/login`.
**Source:** TBD (draft)

### 3.2 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A2 | Bấm nút nhiều lần liên tiếp trong lúc đang pending | Nút đã `disabled`, không gửi thêm yêu cầu OAuth |
| A3 | `code` hợp lệ nhưng `next` bị chỉnh sửa để trỏ ra ngoài ứng dụng | BR-002 chặn — dùng mặc định `/todo`, không redirect ra ngoài |
| A3 | Google trả `error=access_denied` (khách huỷ trên màn hình consent) | DEC-002 — chuyển `/login?error=access_denied` |
| A1-A5 | Truy cập trái phép (`/todo` khi chưa đăng nhập, hoặc `/login`/`/` khi đã đăng nhập) | Chặn ở A0 § 4.4 trước khi tới action; `/todo` còn tái xác thực ở A4 |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `LoginPage` (planned) | Server Component render `/login` | A1 | `app/login/page.tsx` (planned) |
| `LoginGoogleButton` (planned) | Client Component xử lý click + trạng thái pending | A2 | `app/login/_components/login-google-button.tsx` (planned) |
| `AuthCallbackRoute` (planned) | Route Handler `GET /auth/callback` | A3 | `app/auth/callback/route.ts` (planned) |
| `TodoPage` (planned) | Server Component render `/todo`, gọi `getUser()` | A4 | `app/todo/page.tsx` (planned) |
| `logoutAction` (planned) | Server Action đăng xuất | A5 | `app/todo/actions.ts` (planned) |
| `proxy` (planned, Next.js 16 middleware) | Guard optimistic cho `/login`, `/`, `/todo` | A0 | `proxy.ts` (planned) |

### 4.2 Data Model

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|
| MODEL### (TBD draft — Supabase Auth quản lý, không phải model của project) | `auth.users` (Supabase managed) | `id`, `email` | Nguồn email hiển thị trên `/todo` (A4); app không sở hữu bảng này |

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · FR-001, FR-101, FR-601, FR-602 — guard tối ưu (optimistic) chuyển hướng theo trạng thái đăng nhập trước khi vào `/login`, `/`, `/todo`.**
`proxy.ts` (planned, Next.js 16, đổi tên từ `middleware.ts`) chạy trên mọi request khớp matcher — **áp dụng cho cả 3 route**, không riêng một action nào. Đã đăng nhập & vào `/login` hoặc `/` → redirect `/todo`. Chưa đăng nhập & vào `/todo` → redirect `/login`. Đây là kiểm tra optimistic (đọc cookie session, không gọi lại Supabase API mỗi request theo pattern chính thức của Next.js); `/todo` còn tái xác thực authoritative bằng `getUser()` ở A4 (FR-603) — không dựa hoàn toàn vào guard này.
**Source:** TBD (draft)

### 4.5 Algorithms & Integrations

None.

### 4.6 Configuration

```text
NEXT_PUBLIC_SUPABASE_URL              # endpoint Supabase Auth, instance local saa-app (A0, A2, A3)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # khoá publishable dùng cho client lẫn server (A0, A2, A3)
```

**Client behavior:** see `docs/vi/generated/behavior-logic.md` (chưa author lần này — feature không có pattern debounce/optimistic-UI/polling/upload/realtime), `docs/vi/system/permissions.md` (chưa author lần này — xem § 4.4 Bin 3 ở trên cho guard `proxy.ts`), `docs/vi/system/architecture.md` (chưa author lần này).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A2)* Bấm "LOGIN With Google" → request tới `**/auth/v1/authorize**` được gọi với `provider=google` (kiểm bằng `page.route` interception — TC `60bc5bbb`, `tests/e2e/login.spec.ts`). (covers FR-202)
- **SC-002** *(A2)* Trong lúc pending, nút `disabled` hoặc `aria-busy="true"` (TC `37eae882`). (covers FR-203)
- **SC-003** *(A1)* `/login?error=...` → `[role="alert"]` chứa "Đăng nhập không thành công. Vui lòng thử lại." (TC `45278c06`). (covers FR-204)
- **SC-004** *(A0, A4)* `/todo` không session → redirect `/login`; `/` không session → redirect `/login` (TC `45278c06`). (covers FR-602, FR-603)

- **US001_GoogleLogin** *(A2, A3)* — **Independent Test:** giả lập `signInWithPassword` (test user) rồi kiểm `/login` redirect `/todo` (per Q4(b) trong research report). **Acceptance:** Given khách chưa đăng nhập trên `/login`, When bấm "LOGIN With Google" và xác thực Google thành công, Then được chuyển tới `/todo`.
- **US003_BlockUnauthenticated** *(A0, A4)* — **Independent Test:** `page.goto('/todo')` không session → assert URL cuối là `/login` (TC `45278c06`).

### 5.2 Assumptions

- *(A2, A3)* Giả định GoTrue trả `error`/`error_description` đúng chuẩn trên URL callback khi khách huỷ trên màn hình consent Google — chưa xác nhận bằng lần chạy thủ công với tài khoản Google thật (xem research report § Unresolved).
- *(A0)* Giả định `proxy.ts` (Next.js 16) đọc cookie session Supabase đồng bộ mà không cần gọi lại Supabase API mỗi request, theo pattern optimistic chính thức của Next.js (nguồn: nextjs.org/docs/app/guides/authentication).

### 5.3 Unresolved Questions

1. **Google OAuth client credentials của `saa-app`** *(A2, A3)*: giả định đã cấu hình qua env khi `supabase start`; cần verify bằng `GET http://127.0.0.1:55321/auth/v1/authorize?provider=google` trả 302 tới `accounts.google.com` — nếu không, cần `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET` (xem `clarifications.md § Unresolved`).
2. **Payload lỗi khi khách huỷ trên Google** *(A3)*: chưa xác nhận field `error`/`error_description` thực tế Google trả về khác gì so với lỗi phía GoTrue.

### 5.4 Source References

No source code written yet — see `functional-spec.md § 7 User Stories` for planned behavior. Existing RED E2E test (behavior contract, đã có file thật): `tests/e2e/login.spec.ts` (testPolicy: e2e-red-first, xem `clarifications.md`).

#### Data Flow

```text
{request/event payload -> handler transforms -> DB read/write -> response shape}
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | docs/vi/system/system-overview.md | TBD (draft) | [ ] |
| Architecture | docs/vi/system/architecture.md | TBD (draft) | [ ] |
| Feature List | [feature-list.md](../feature-list.md) | F001 | [ ] |
| API Map | docs/vi/generated/api-map.md | TBD (draft) | [ ] |
| Entities | docs/vi/generated/entities.md | TBD (draft) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | TBD (draft) | [ ] |
| Behavior Logic | docs/vi/generated/behavior-logic.md | TBD (draft) | [ ] |
| Permissions Matrix | docs/vi/generated/permissions-matrix.md | TBD (draft) | [ ] |
| User Stories | docs/vi/generated/user-stories.md | TBD (draft) | [ ] |
