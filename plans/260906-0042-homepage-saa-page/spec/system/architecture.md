---
status: draft
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Architecture

**Phạm vi**: toàn bộ source hiện có trong repo (2 screen: `/login`, `/todo`; route phụ `/auth/callback`) CỘNG forward-draft cho tính năng Homepage SAA (route `/`, chưa có code — xem `plans/260906-0042-homepage-saa-page/spec/homepage/`).

Mô tả code THỰC TẾ đang chạy, dựng ngược từ source, CỘNG phần kế hoạch (planned) cho Homepage — mỗi node/file mới đánh dấu rõ `(planned)`, không trích `path:N-M` nào cho code chưa tồn tại (Spec-Authoring Contract § Forward-Authored System Docs).

## System Architecture

```mermaid
graph TB
    subgraph "Browser"
        Client["Trình duyệt người dùng"]
    end
    subgraph "Next.js App Router (repo này)"
        Proxy["proxy.ts — edge guard"]
        Root["app/page.tsx (route /) — Homepage SAA (planned; hiện là redirect thuần)"]
        HomeComponents["components/home/** (planned) — header/hero-countdown/awards/kudos/footer/widget"]
        RoleHelper["lib/auth/get-user-role.ts (planned)"]
        CountdownLib["lib/countdown/countdown.ts (planned)"]
        CountdownHook["hooks/use-countdown.ts (planned)"]
        LocaleHook["hooks/use-select-locale.ts (planned)"]
        EventEnv["env EVENT_START_AT — server-only (planned)"]
        LoginPage["app/login/page.tsx (screen)"]
        LoginClient["login-client.tsx (use client)"]
        LoginScreen["components/login/** (presentational)"]
        TodoPage["app/todo/page.tsx (screen)"]
        TodoActions["app/todo/actions.ts (logoutAction)"]
        Callback["app/auth/callback/route.ts"]
        LocaleAction["app/actions/locale.ts (setLocale)"]
        SupaServer["lib/supabase/server.ts"]
        SupaProxyClient["lib/supabase/proxy-client.ts"]
        SupaBrowserClient["lib/supabase/client.ts"]
        NextPathGuard["lib/supabase/next-path.ts (safeNextPath)"]
        I18nCfg["i18n/request.ts + lib/i18n/locale.ts"]
    end
    subgraph "External (ngoài repo)"
        Supabase["Supabase Auth + PostgREST — instance local 'saa-app' (http://127.0.0.1:55321)"]
        Google["Google OAuth"]
    end

    Client -->|"mọi request"| Proxy
    Proxy --> SupaProxyClient --> Supabase
    Proxy -->|"redirect /login hoặc /todo (không còn redirect /)"| Client
    Client --> Root --> SupaServer
    EventEnv --> Root
    Root --> HomeComponents
    Root -->|"khi đã đăng nhập, đọc role (planned)"| RoleHelper --> SupaServer
    HomeComponents --> CountdownHook --> CountdownLib
    HomeComponents --> LocaleHook --> LocaleAction
    Client --> LoginPage --> SupaServer
    LoginPage --> LoginClient --> LoginScreen
    LoginClient -->|"signInWithOAuth"| SupaBrowserClient --> Supabase --> Google
    LoginClient -->|"setLocale()"| LocaleAction --> I18nCfg
    Google -->|"redirect ?code=...&next=/ (mặc định mới)"| Callback
    Callback --> SupaServer
    Callback --> NextPathGuard
    Client --> TodoPage --> SupaServer
    TodoPage --> TodoActions --> SupaServer
```

Ba khối chính (không đổi): (1) Next.js App Router trong repo này — vừa render UI vừa là "backend" (Server Actions, Route Handler, edge guard), không có service backend riêng; (2) Supabase — nay đóng vai trò kép: Auth (GoTrue, không đổi) VÀ nguồn dữ liệu `public.users` qua PostgREST (mới, planned — chỉ để đọc `role`); (3) Google OAuth, bên thứ ba, app không gọi trực tiếp mà qua Supabase GoTrue.

Hai lớp guard tách biệt (không phải một) — **cập nhật cho `/`**:
- `proxy.ts` — guard optimistic, chỉ đọc cookie qua `getUser()` (`proxy.ts:21-40,71-81`), khớp 3 route `/`, `/login`, `/todo/:path*` (`proxy.ts:108-110`), loại trừ `/auth/callback`. Forward-draft: hai predicate `isAuthPage`/`isProtectedPage` bên trong sẽ thu hẹp còn đúng `/login` và `/todo` (planned) — `/` vẫn khớp matcher (để refresh session cookie mỗi lượt ghé) nhưng không còn nhánh redirect nào gắn với nó.
- Guard authoritative nằm ở từng Server Component: `app/login/page.tsx:73-83`, `app/todo/page.tsx:17-25` — không đổi. `app/page.tsx:10-17` (guard `/`, PERM001_RootRouteGuard — mã hiện có trong `docs/vi/generated/permissions-matrix.md`) trở thành **superseded** (planned): file này được viết lại để RENDER Homepage thay vì `redirect()`; nó vẫn tự gọi `getUser()` (và, khi có, đọc `role` qua `lib/auth/get-user-role.ts` (planned)) nhưng chỉ để cá nhân hoá giao diện — không còn chặn truy cập. Chi tiết phân quyền: `docs/vi/system/permissions.md`.

`lib/supabase/{client,server,proxy-client}.ts` là 3 factory khác nhau cho cùng một SDK `@supabase/ssr` (browser / Server Component-Action-Route / proxy) — khác nhau ở nơi đọc/ghi cookie, không phải khác nhau về logic nghiệp vụ. `lib/auth/get-user-role.ts` (planned) KHÔNG phải factory thứ 4 — nó dùng lại `lib/supabase/server.ts` để lấy client, chỉ thêm một câu query `.from("users").select("role").eq("id", userId).maybeSingle()` (fail-open `"member"` khi lỗi/không có row).

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.3.4 |
| UI | React / React DOM | 19.2.8 |
| Ngôn ngữ | TypeScript | ^5 |
| Styling | Tailwind CSS (`@tailwindcss/postcss`) | ^4 |
| i18n | next-intl (no-routing, cookie `NEXT_LOCALE`) | 4.14.2 |
| Auth SDK | `@supabase/ssr` | 0.12.5 |
| Auth SDK | `@supabase/supabase-js` | 2.115.0 |
| Auth backend | Supabase Auth (GoTrue) — instance local `saa-app`, ngoài repo | API `http://127.0.0.1:55321` |
| Backend (in-repo) | Next.js Server Actions + Route Handlers (không có service backend riêng) | — |
| Database | (planned) `public.users` — 1 bảng, cột `role` (`member`\|`admin`), đọc qua PostgREST dưới RLS own-row bằng JWT người dùng hiện tại (`lib/auth/get-user-role.ts`, planned); `auth.users` vẫn do Supabase quản lý riêng, ngoài phạm vi code này | — |
| Cache | N/A — không tìm thấy | — |
| Queue | N/A — không tìm thấy | — |
| Package manager | pnpm, khóa version qua field `packageManager` (không dùng corepack) | 10.33.2 |
| Node.js | `engines.node` trong `package.json`; CI pin cứng | `>=22 <25` (CI chạy Node `24`) |
| Testing (unit) | Vitest | ^3.2.7 |
| Testing (e2e) | `@playwright/test` (1 project: chromium) | 1.62.1 |
| Testing (DOM env) | `jsdom` — chỉ cho vitest project `jsdom` (`hooks/**`) | ^30.0.1 |
| Testing (hook API) | `@testing-library/react` + `@testing-library/dom` (`renderHook`/`act`/`waitFor`) | ^16.3.3 / ^10.4.1 |
| API mocking | `msw` — một bộ handler dùng chung cho cả vitest (`msw/node`) lẫn Storybook (service worker) | 2.15.0 |
| Component docs | Storybook + `@storybook/nextjs-vite` + `msw-storybook-addon` | 10.6.0 / 10.6.0 / 3.0.0 |
| Lint | ESLint flat config (`eslint.config.mjs`): `eslint-config-next` (`core-web-vitals` + `typescript`) + `typescript-eslint` `recommendedTypeChecked` (scope `**/*.{ts,tsx}`, tắt lại trên `**/*.mjs`) + `import/order` + `jsx-a11y` full `recommended` + `eslint-plugin-playwright` (scope `tests/e2e/**/*.spec.ts`) + `@vitest/eslint-plugin` (scope `lib/**/*.test.ts`, `hooks/**/*.test.ts`, `app/**/*.test.ts`) | ESLint ^9 |
| Formatter | Prettier + `eslint-config-prettier` (đứng cuối config, chỉ tắt rule style trùng với ESLint, không thêm rule mới) | ^3.9.6 |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) — 2 job độc lập: `quality` và `e2e` | — |

Nguồn: `package.json:1-49`, `eslint.config.mjs:1-112`, `.github/workflows/ci.yml`. Cache/Queue vẫn ghi N/A — Homepage (planned) không cần cache hay queue (đếm ngược tính client-side từ giá trị server truyền xuống, không polling). Database KHÔNG còn N/A một khi Homepage lên code (planned) — trước đây ghi N/A vì repo chưa từng đọc bảng nghiệp vụ nào ngoài `auth.users` (do Supabase quản lý); đây là lần đầu app đọc `public.users` qua PostgREST.

Chuyển từ npm sang pnpm: `package-lock.json` không còn tồn tại, `pnpm-lock.yaml` (~198KB) là lockfile hiện tại; không có `.npmrc` tùy chỉnh trong repo. Trong CI, `pnpm/action-setup@v6` không nhận `version:` — version pnpm dùng lấy trực tiếp từ field `packageManager` trong `package.json`, nên CI và máy dev luôn dùng cùng một bản pnpm.

Biến môi trường mới (planned, server-only, KHÔNG `NEXT_PUBLIC_*`): `EVENT_START_AT` (ISO-8601) — đọc trong `app/page.tsx` (planned), parse/validate bởi `lib/countdown/countdown.ts` (planned, hàm thuần, 100% coverage theo `testPolicy: e2e-red-first`). Thiếu hoặc sai định dạng → `parseTargetDate` trả `null`, đếm ngược hiện `00/00/00` nhưng KHÔNG crash trang.

**Test coverage (cổng chặn, không còn là số đo).** `vitest.config.ts` tách hai runner qua `test.projects` (ổn định từ vitest 3.2, repo pin 3.2.7 — `environmentMatchGlobs` đã deprecated từ v3 nên không dùng):
- project `node` — `lib/**/*.test.ts` và `app/**/*.test.ts`: helper thuần và Server Action/Route Handler, chỉ cần mock ranh giới Next.js/Supabase, không cần DOM.
- project `jsdom` — `hooks/**/*.test.ts`: hook chạm `document`, focus và bàn phím.

`resolve.alias` (`@/`) và `coverage` khai ở gốc, cả hai project kế thừa (`extends: true`) — một báo cáo, một ngưỡng, một exit code.

Phạm vi đo là **allowlist tường minh**, không phải "tất cả trừ X":
`lib/**/*.ts`, `hooks/**/*.ts`, `app/actions/**/*.ts`, `app/todo/actions.ts`, `app/auth/callback/route.ts`; `exclude: ["**/*.test.ts"]`; `thresholds: { 100: true }`.

**Bổ sung allowlist (planned, khi Homepage lên code):** `lib/countdown/countdown.ts`, `lib/auth/get-user-role.ts` đã khớp glob `lib/**/*.ts` sẵn có (không cần sửa `vitest.config.ts`); `hooks/use-countdown.ts`, `hooks/use-select-locale.ts` khớp `hooks/**/*.ts` sẵn có — ngưỡng 100% áp dụng nguyên trạng cho cả 4 file mới, không cần thay đổi cấu hình.

Không có glob `.tsx` nào trong `include` — đó chính là cơ chế loại `components/**` và `app/**/page.tsx` ra khỏi mẫu số: sai khác phần mở rộng, không phải một danh sách exclude phải bảo trì. Hai nhóm bị loại có lý do khác nhau và đều là lý do first-party:
- `app/**/page.tsx` là `async` Server Component — hướng dẫn vitest của chính Next.js nói thẳng là chưa hỗ trợ, khuyến nghị dùng E2E. Đây là giới hạn cấu trúc, không phải việc hoãn lại. (Áp dụng nguyên trạng cho `app/page.tsx` sau khi viết lại thành Homepage — planned.)
- `components/**` là lớp trình bày: tài liệu hoá bằng Storybook, không bằng unit test (quyết định sản phẩm). (Áp dụng cho `components/home/**`, planned.)

Con số 100% vì thế có nghĩa hẹp và trung thực: **mọi helper thuần, mọi máy trạng thái quan sát được của hook, và logic riêng của từng Server Action/Route Handler đều được test chạy qua.** Nó KHÔNG có nghĩa Server Component render đúng, Supabase/Google OAuth thật chạy được, hay giao diện trông đúng — ba thứ đó thuộc Playwright và Storybook.

Ngưỡng này thay thế quyết định "không đặt threshold" của phase-04 trước đây. Lúc đó chỉ có 2 file logic thuần chạy dưới vitest nên một tỉ lệ phần trăm là trang trí chứ không phải tín hiệu; điều thay đổi là phạm vi đo đã được vẽ lại cho trung thực. Nếu `include` về sau lại âm thầm nuốt `.tsx`/Server Component, phản biện của phase-04 lập tức đúng trở lại — allowlist chính là hàng rào chống việc đó.

Job `quality` trong CI chạy `pnpm test:unit:coverage` (không phải `test:unit`), nên ngưỡng 100% là cổng chặn thật trong pipeline chứ không phải số in ra rồi bỏ qua.

## Data Flow

```mermaid
sequenceDiagram
    participant B as "Browser"
    participant P as "proxy.ts"
    participant LC as "login-client.tsx"
    participant SB as "Supabase Auth (GoTrue)"
    participant G as "Google OAuth"
    participant CB as "/auth/callback route"
    participant H as "/ Homepage (planned)"
    participant T as "/todo page"

    Note over B,H: "/" nay PUBLIC (planned) — proxy.ts không còn redirect route này (khác bản trước)
    B->>LC: GET /login (điều hướng trực tiếp, ví dụ từ nút "Đăng nhập" trên Homepage)
    LC->>SB: signInWithOAuth(google) — PKCE
    SB-->>LC: authorize URL
    LC->>G: browser điều hướng sang trang consent Google
    G-->>CB: redirect ?code=...&next=/ (mặc định mới — trước đây /todo)
    CB->>SB: exchangeCodeForSession(code)
    SB-->>CB: session + Set-Cookie
    CB-->>B: redirect safeNextPath(next) — mặc định "/" — hoặc /login?error=auth_code_error
    B->>H: GET / (kèm session cookie)
    H->>SB: getUser() — cá nhân hoá header, KHÔNG chặn truy cập
    H->>SB: (planned) getUserRole() qua PostgREST /rest/v1/users?select=role&id=eq.<uuid>
    SB-->>H: user + role (fail-open "member" nếu lỗi/không có row)
    H-->>B: render Homepage — header theo trạng thái đăng nhập + role
    B->>T: GET /todo (không đổi, vẫn cần session)
    T->>SB: getUser() — kiểm tra authoritative, fail-closed
    SB-->>T: user
    T-->>B: render lời chào + form logout
```

Luồng OAuth lõi (PKCE, cấp bởi Supabase) KHÔNG đổi cơ chế so với trước — điểm đổi thật (khác với đợt việc trước, vốn chỉ đổi tooling): (1) `/` không còn bước redirect nào — trước đây `GET /` luôn mở đầu bằng redirect `/login` hoặc `/todo`; (2) đích mặc định sau đăng nhập đổi từ `/todo` sang `/`. Trích nguồn không đổi cho phần hành vi giữ nguyên: `hooks/use-login-actions.ts:42-57` (`handleLoginClick`), `lib/auth/sign-in-with-google.ts:39-55` (gọi `signInWithOAuth` thật), `app/auth/callback/route.ts:16-46` (exchange code, redirect matrix — giá trị mặc định của tham số sẽ đổi, số dòng có thể lệch sau khi sửa nên không trích lại ở đây), `app/todo/page.tsx:17-25` (kiểm tra authoritative, không đổi). Nhánh lỗi (`?error=` từ Google, `exchangeCodeForSession` thất bại) đều redirect về `/login?error=...`, không lộ raw error ra client (`app/auth/callback/route.ts:39-42`) — không đổi.

Luồng phụ (không vẽ ở trên để giữ diagram gọn): đổi ngôn ngữ — `LoginClient` (qua `useLoginActions`) gọi Server Action `setLocale` (`app/actions/locale.ts:24-41`), ghi cookie `NEXT_LOCALE` (`lib/i18n/locale.ts:17,20`); Homepage (planned) sẽ dùng lại `LanguageSelector` từ `components/login/` qua một hook mới `hooks/use-select-locale.ts` (planned, `useTransition` + `setLocale`) — không đụng `useLoginActions` (theo quyết định trong `clarifications.md`).

**Luồng mới (planned) — role + countdown, không phải round-trip network riêng của user:**
- Đọc role: `app/page.tsx` (planned) gọi `getUserRole(supabase, userId)` (`lib/auth/get-user-role.ts`, planned) — `try/catch` + `.maybeSingle()`; lỗi hoặc không có row → `"member"`. Đây là NHÃN cá nhân hoá menu, không phải guard (chi tiết: `docs/vi/system/permissions.md`).
- Đếm ngược: `app/page.tsx` (planned) đọc `EVENT_START_AT` (server-only), truyền `targetIso` + `initialNowMs = Date.now()` xuống client; `hooks/use-countdown.ts` (planned) seed `useState(initialNowMs)` rồi tick `setInterval(1000)` — không cần `suppressHydrationWarning` vì lần render client đầu khớp byte với SSR (research 01 § 1).

Bản thân luồng chạy (request path) của `/login`→`/auth/callback`→`/todo` không đổi so với bản trước; thay đổi trong đợt việc NÀY (khác đợt tooling trước) nằm ở HÀNH VI RUNTIME thật của `/` và đích mặc định sau đăng nhập — không phải chỉ tooling/CI.

**Test topology.** Ba lớp kiểm chứng, ranh giới không chồng lấn:

| Lớp | Công cụ | Phủ cái gì | Không phủ cái gì |
|-----|---------|------------|------------------|
| Unit | Vitest (2 project: `node`, `jsdom`) | Helper thuần `lib/**`, hook `hooks/**`, Server Action + Route Handler (`app/actions/**`, `app/todo/actions.ts`, `app/auth/callback/route.ts`) — ranh giới Next.js/Supabase được mock | Component `.tsx`, `async` Server Component, luồng thật qua mạng |
| Component docs | Storybook (`@storybook/nextjs-vite`) | Cách dùng từng common component; một story cho mỗi màn hình chính theo route | Assertion tự động — Storybook ở đây là tài liệu sống, không phải test runner |
| E2E | Playwright (chromium) | Luồng thật xuyên `next dev`: guard route, redirect, GUI `/login`; (planned) Homepage — nav, menu, countdown, đổi ngôn ngữ qua `tests/e2e/home.spec.ts` | Nhánh PKCE exchange thành công (xem dưới) |

**MSW là lớp mock dùng chung.** Một module handler duy nhất (`mocks/handlers.ts`) phục vụ hai runtime: `msw/node` (`setupServer`) cho vitest, và service worker (`public/mockServiceWorker.js`) cho Storybook. Một giới hạn thật cần nói rõ: `signInWithOAuth` của Supabase gây **điều hướng top-level của trình duyệt**, không phải `fetch`/XHR — MSW không chặn được nó. Nên trong Storybook, hành vi đăng nhập được mock bằng cách truyền thẳng prop `onLoginClick`, không phải bằng handler `/auth/v1/authorize`. Giá trị thật của MSW ở repo này nằm ở phía Node/vitest: `/auth/v1/token`, `/auth/v1/user`, `/auth/v1/logout` đều được gọi server-side, và chúng phủ đúng khoảng trống mà `ci.yml` tự thừa nhận là chưa có test. **Bổ sung (planned):** một handler mới `GET {SUPABASE_URL}/rest/v1/users` trả JSON array (`maybeSingle()` trên GET dùng `Accept: application/json` — research 02 § 2) phục vụ cả vitest lẫn story admin-override.

**Storybook chạy được cho màn hình chính theo route** vì cây component của `/login` đã thuần trình bày và nhận mọi thứ qua props (`LoginScreen` và các con) — story chỉ cần truyền `copy`/`locale`/handler, không cần cờ RSC thử nghiệm nào. `/todo` trước đây không dựng được vì JSX viết thẳng trong `async` Server Component; phần trình bày đã được tách ra `components/todo/todo-screen.tsx` (chuyển nguyên khối, chỉ đổi 3 chỗ thành props — guard `getUser()` vẫn nằm nguyên ở `app/todo/page.tsx`), nên hiện cả hai route chính đều có story xem được. Homepage (planned) đi theo đúng convention này: `components/home/**` thuần trình bày, `app/page.tsx` chỉ đọc `getUser()`/`getUserRole()`/`EVENT_START_AT` rồi truyền props xuống.

**Test topology.** Bộ Playwright (`tests/e2e/login.spec.ts`, 30 test, project `chromium` duy nhất — `playwright.config.ts:31-36`) chia làm 2 tập, theo việc có cần một Supabase Auth endpoint reachable hay không:
- **Tập CI-safe** (chạy trong job `e2e` của GitHub Actions, `--grep-invert @auth` → 27 test): không cần Supabase thật — `proxy.ts`/các Server Component tự bọc `getUser()` trong try/catch và coi mọi lỗi (host không reachable, thiếu env) là "chưa có session" (fail-open theo thiết kế sẵn có, không phải hành vi mới). Bao gồm mọi test GUI/tương tác của `/login` không xác thực, các test redirect chưa đăng nhập, 2 test chặn request `signInWithOAuth` phía client bằng `page.route(...).abort()` (không có request thật ra ngoài, không cần secret Google), và các test trong block `"Supabase unavailable"` (`tests/e2e/login.spec.ts:575-635`) chỉ chạy khi `process.env.CI` được set. **Hai assertion sẽ đổi (planned, tester thực hiện):** "Unauthenticated GET / redirects to /login" (không còn đúng — `/` public) và "Authenticated user redirects /login to /todo" → đích `/` (research 02 § 6).
- **Tập local-only** (3 test, block `"Authenticated"` gắn tag `{ tag: "@auth" }` — `tests/e2e/login.spec.ts:636`): đăng nhập thật bằng session cookie lấy qua email/password signup trên Supabase; cần một Supabase Auth instance reachable thật (ví dụ `saa-app` local). Đây là giới hạn có chủ đích, được ghi lại ngay trong `ci.yml`: **job `e2e` không phủ đường xác thực (authenticated path)**, và nhánh exchange-code-thành-công thật của `/auth/callback` (PKCE round-trip Google thật) hiện **không có test tự động nào**, CI hay local — không suy diễn ngược lại rằng CI đã bao phủ toàn bộ luồng đăng nhập. Homepage (planned) thêm nhánh `@auth` mới cho menu "Trang quản trị" (cần user role=admin, provisioning qua `supabase db query`, không cần psql/service-role key — research 02 § 3).

## Deployment View

> Derived from repository infrastructure-as-code — not verified against production.

N/A — no infrastructure-as-code found in repository.

N/A cho đích triển khai (deployment target) — repo vẫn không có infrastructure-as-code hay cấu hình host/deploy nào (không `Dockerfile`, không `*.tf`, không `vercel.json`/`fly.toml`/k8s manifest). Việc thêm `.github/workflows/ci.yml` là một lớp **CI (kiểm tra chất lượng trước khi merge)**, không phải deployment pipeline — GitHub Actions ở đây không build image, không push artifact, không gọi tới bất kỳ host thật nào. Không suy diễn thêm topology triển khai nào ngoài các sự thật sau.

CI (`.github/workflows/ci.yml`) gồm 2 job, kích hoạt trên `push`/`pull_request` nhắm vào `main`, và `workflow_dispatch` (chạy tay trên bất kỳ branch nào). Cache dependency khóa theo `pnpm-lock.yaml` (qua `actions/setup-node@v4` với `cache: pnpm`); cả 2 job đều pin Node `24` qua `actions/setup-node@v4` và cài pnpm qua `pnpm/action-setup@v6` (không truyền `version:`, đọc từ `packageManager`).


> **Không có branch protection.** Xác minh 2026-09-05: `gh api repos/.../branches/main/protection` trả **404** — `main` chưa bật rule nào, nên hiện tại KHÔNG job nào thực sự chặn được merge. Hai job dưới đây mô tả thứ CI *kiểm tra*, không phải thứ nó *cưỡng chế*. Muốn chúng thật sự gác PR thì phải bật branch protection và đặt chúng làm required status check.

- **`quality`** (không phụ thuộc job khác): `pnpm install --frozen-lockfile` → `lint` (ESLint `--max-warnings 0`) → `format:check` (Prettier) → `test:unit:coverage` (Vitest, cả hai project `node`+`jsdom`, ngưỡng 100% là cổng chặn — thay cho `test:unit` trần trước đây) → `build` (Next.js) → `typecheck` (`tsc --noEmit`, chạy **sau** `build` vì Next.js chỉ sinh type `.next/types` sau khi build ít nhất một lần). Hai biến môi trường `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` được set placeholder (không phải giá trị thật) để `build` chạy qua — Next.js inline chúng vào bundle client tại build time nhưng không có lệnh gọi Supabase thật nào trong lúc static generation. **(planned)** khi Homepage lên code, `EVENT_START_AT` (server-only) cũng cần một giá trị placeholder trong bước này — thiếu nó không làm fail build (countdown chỉ hiện `00/00/00`), nhưng nên set để giữ hành vi build nhất quán với dev/prod.
- **`e2e`** (job riêng, không `needs: quality`): cài Playwright browser `chromium` (cache theo version pin), chạy tập CI-safe (`playwright test --grep-invert @auth`, 27/30 test) chống lại `next dev` local trong runner — không khởi động Supabase thật, không cần secret Google (mọi request OAuth trong tập CI-safe bị abort phía client trước khi rời browser). Bước "Coverage limitation notice" luôn chạy (`if: always()`) và in ra `$GITHUB_STEP_SUMMARY` số test đã chạy/tổng số và lời nhắc rằng luồng authenticated + nhánh callback PKCE thành công không được job này phủ. **(planned)** `home.spec.ts` CI-safe (không tag `@auth`) sẽ chạy trong job này bằng `webServer.env.EVENT_START_AT` cố định (deterministic, research 01 § 7); nhánh `@auth` (menu admin) vẫn loại khỏi CI như các test `@auth` khác.

Không job nào trong CI triển khai ứng dụng ra một môi trường chạy thật; Supabase (`saa-app`) tiếp tục là instance local ngoài repo như hiện tại, không được CI quản lý hay khởi tạo.
