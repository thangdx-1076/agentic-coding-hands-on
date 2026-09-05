# Clarifications — Login (/login) — MoMorph screen GzbNeVGJHz

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz (file "SAA 2025 - Internal Live Coding")
- Specs CSV: plans/260904-1633-login-page-google-oauth/momorph/specs.csv (8 items)
- Test cases CSV: plans/260904-1633-login-page-google-oauth/momorph/test-cases.csv (17 TCs)
- Overview tree: plans/260904-1633-login-page-google-oauth/momorph/overview.json
- MoMorph MCP không load trong session này (Claude mở từ thư mục cha). Gọi cùng server qua HTTP:
  `node plans/260904-1633-login-page-google-oauth/momorph/momorph-mcp-http-client.mjs <tool> '<json-args>'` (vd `get_node '{"screenId":"GzbNeVGJHz","nodeId":"662:14425"}'`).
  Lần sau mở Claude Code từ `agentic-coding-hands-on/` để có MCP momorph + playwright native.
- testPolicy: **e2e-red-first**

## Session 2026-09-04

### Quyết định của user
- Q: SDD mode? → A: **on** (lưu `.claude/.tkm.json` của project)
- Q: Ngôn ngữ spec/docs? → A: **vi**
- Q: Supabase local nào? → A: **Dùng instance `saa-app` đang chạy** (API `http://127.0.0.1:55321`, Studio 55323, DB 55322). Google provider đã enabled; `additional_redirect_urls` đã có `http://localhost:3000/auth/callback`. KHÔNG `supabase init` trong project này. Publishable key lấy bằng `supabase status` trong `~/Desktop/Claude-and-mormoph/saa-app`, ghi vào `.env.local` (gitignored). Không commit key.
- Q: Test policy khi chưa có E2E runner? → A: **e2e-red-first**; user duyệt cài `@playwright/test` (devDependency) + `playwright.config.ts` (webServer `next dev`). Tester viết test màn Login RED trước, GREEN sau.
- Q: i18n VN/EN theo cookie NEXT_LOCALE? → A: **next-intl**, locale từ cookie `NEXT_LOCALE`, **không dùng URL prefix** (không i18n routing). Default `vi`. Locale codes `vi` | `en`; nhãn hiển thị trên selector "VN" | "EN" theo design.
- Q: EN copy thiếu (subtitle, tagline, error)? → A: Claude dịch, user review tại đây:
  - "Bắt đầu hành trình của bạn cùng SAA 2025." → "Start your journey with SAA 2025."
  - "Đăng nhập để khám phá!" → "Log in to explore!"
  - "Đăng nhập không thành công. Vui lòng thử lại." → "Login failed. Please try again."
  - Có sẵn từ MoMorph localizations: "Bản quyền thuộc về Sun* © 2025" → "Copyright © Sun* 2025"; "LOGIN With Google" → "LOGIN With Google" (giữ nguyên cả 2 locale, đúng design).
- Q: `/todo` chưa tồn tại, TC có bước logout? → A: **Tạo `/todo` placeholder được bảo vệ**: chào email user + nút Đăng xuất (signOut → `/login`). Không code tính năng todo.
- Q: Hiển thị lỗi login ở đâu (design không vẽ)? → A: **Text inline ngay dưới nút Google**, màu đỏ nhạt, `role="alert"`, hiện khi URL `/login?error=...` (callback redirect về khi thất bại/cancel).

### Quyết định của Claude (routine, user có thể override)
- Q: OAuth redirect hay popup (spec: redirect; TC: "new tab or popup")? → A: **Full-page redirect** (spec là authority; Supabase `signInWithOAuth` default; PKCE + route handler `/auth/callback` gọi `exchangeCodeForSession`, thành công → `/todo`, lỗi → `/login?error=auth`).
- Q: Logo click có điều hướng? → A: **Không tương tác** (TC nói rõ; spec để mở).
- Q: Route `/` (boilerplate create-next-app)? → A: `proxy.ts` redirect `/` → `/login` (chưa auth) hoặc `/todo` (đã auth). Xoá nội dung boilerplate `app/page.tsx`.
- Q: Auth guard ở đâu? → A: `proxy.ts` (Next 16 tên mới của middleware) refresh session + redirect: đã auth & `/login` → `/todo`; chưa auth & `/todo` → `/login`. `/todo` kiểm tra lại `getUser()` server-side.
- Q: Loading state? → A: Nút disabled + spinner khi pending (TC 37eae882).
- Q: Hover? → A: Nút Google có shadow/elevated; language selector highlight + `cursor: pointer` (TC c18649fa, cb42461d).
- Q: Layout fixed? → A: Header sticky top; footer fixed bottom (spec item 1, TC 33a1dacf).
- Q: Assets? → A: 5 `MM_MEDIA_*` nodes (Logo, VN flag, Down chevron, Root Further Logo 451×200, Google icon) tải về `public/login/` theo convention của `momorph-implement-design`.
- Q: Language dropdown? → A: Client component, click mở menu VN/EN, chọn → set cookie `NEXT_LOCALE` + `router.refresh()`.

### Gap resolution sau spec (2026-09-04)
- Q: Cookie NEXT_LOCALE giá trị không hợp lệ? → A: **Fallback về `vi` + ghi lại cookie đúng** — `proxy.ts` chuẩn hoá: nếu cookie ∉ {vi,en} thì coi là `vi` và set lại `NEXT_LOCALE=vi` trên response; `i18n/request.ts` cũng fallback `vi` (defense-in-depth).
- Q: Language selector cần chạy khi tắt JS? → A: **Không** — chỉ cần JS (client component + Server Action). Không thêm `<noscript>`.
- Q: Ảnh hero `image 1` (node 662:14389) không tải được qua API? → A: **Code trước với slot `<img src="/login/keyvisual.png">`** + nền `#00101A` + 2 gradient overlay đúng design (Rectangle 57: `linear-gradient(90deg,#00101A 0%,#00101A 25.41%,rgba(0,16,26,0) 100%)`; Cover: `linear-gradient(0deg,#00101A 22.48%,rgba(0,19,32,0) 51.74%)`). User export PNG 1441×1022 từ Figma vào `public/login/keyvisual.png` sau. Visual diff ghi chú vùng này.

## E2E contract (tester + implementers dùng chung — Claude decision 2026-09-04)
- Study report: research/researcher-01-supabase-google-oauth-nextjs16.md (pin: @supabase/ssr 0.12.5, @supabase/supabase-js 2.115.0, next-intl 4.14.2, @playwright/test 1.62.1).
- `/login` (server component) render:
  - `<header>` sticky top: logo `img[alt="Sun* Annual Awards 2025"]` (không link, không click); language selector `button[aria-haspopup="menu"]` accessible name chứa "VN" (flag VN + "VN" + chevron).
  - Hero: `img[alt="ROOT FURTHER"]`; text "Bắt đầu hành trình của bạn cùng SAA 2025."; "Đăng nhập để khám phá!".
  - `button` accessible name "LOGIN With Google" (Google icon inline SVG). Click → `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo: origin + '/auth/callback?next=/todo'}})` → browser điều hướng tới `http://127.0.0.1:55321/auth/v1/authorize?provider=google&...`. Khi pending: `disabled` + `aria-busy="true"` + spinner; nút KHÔNG có `type="submit"` trong form.
  - `/login?error=<bất kỳ>` → `[role="alert"]` text "Đăng nhập không thành công. Vui lòng thử lại." (en: "Login failed. Please try again.").
  - `<footer>` fixed bottom: "Bản quyền thuộc về Sun* © 2025" (en: "Copyright © Sun* 2025").
- Language menu: click selector → `[role="menu"]` với 2 `[role="menuitem"]` tên "VN" và "EN". Chọn EN → Server Action set cookie `NEXT_LOCALE=en` (path=/, 1 năm) → re-render: footer "Copyright © Sun* 2025", selector hiển thị "EN". Default không cookie = `vi`.
- `/todo` (protected placeholder): chưa auth → redirect `/login`. Đã auth → `<h1>` chứa email user + `button` "Đăng xuất" (en "Log out") → Server Action `signOut()` → redirect `/login`.
- `/login` khi đã auth → redirect `/todo`. `/` → `/login` (chưa auth) | `/todo` (đã auth). Guard: `proxy.ts` (optimistic) + `getUser()` trong `/todo` (authoritative).
- `/auth/callback` route handler GET: `?code` → `exchangeCodeForSession` → redirect `next` (default `/todo`, chỉ chấp nhận path nội bộ bắt đầu bằng `/`); `?error` hoặc exchange lỗi → `/login?error=<code>`.
- Env (`.env.local`, gitignored): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase status trong ~/Desktop/Claude-and-mormoph/saa-app>`.
- Test selectors: role/name/text; KHÔNG dùng `data-testid`. E2E: `tests/e2e/login.spec.ts`, config `playwright.config.ts` (webServer `npm run dev`, port 3000), script `npm run test:e2e`.

## RED evidence (tester, 2026-09-04 — read-only cho UI/backend agents)
- testRunner: @playwright/test 1.62.1 (`npx playwright test`)
- redTestFiles: tests/e2e/login.spec.ts (12 unauth tests + 2 `test.fixme` cho authenticated state), playwright.config.ts
- redCommand: `npx playwright test tests/e2e/login.spec.ts --reporter=list`
- redExitCode: 1
- redFailure: 12 assertion failures — `expect(locator).toBeVisible()` / element not found cho logo, hero image, hero text, nút "LOGIN With Google", footer, `[role=menu]`, `[role=alert]`; `waitForURL` timeout cho redirect `/todo`→`/login`, `/`→`/login`; nguyên nhân: `/login`, `/todo`, `/` trả 404 (chưa implement). Không phải lỗi webServer/config/dependency.
- redEvidence: validated — log đầy đủ: evidence/red-run.log; report: reports/tester-red-login-e2e.md
- googleProviderCheck: `GET http://127.0.0.1:55321/auth/v1/authorize?provider=google` → 302 accounts.google.com (provider live trên saa-app)
- authSetupStatus: `tests/e2e/auth.setup.ts` chưa tạo; 2 TC authenticated (f62b0c97, e76aa170) đang `test.fixme` — tester bật lại ở bước GREEN sau khi có `/todo` và cookie format xác định.
- .env.local đã tạo (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) — gitignored.

## Unresolved
- Google OAuth client credentials của instance `saa-app`: giả định đã set qua env khi `supabase start` (config `enabled = true`). Tester verify: `GET http://127.0.0.1:55321/auth/v1/authorize?provider=google` trả 302 tới `accounts.google.com`. Nếu không → user cần cung cấp `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET` và restart instance đó.
- [Resolved 2026-09-04] GoTrue `redirect_to` kèm `?next=/todo`: GoTrue `IsRedirectURLValid` chấp nhận mọi redirect_to có hostname trùng `site_url` (`localhost`) bất kể query string, ngoài glob allow-list → giữ nguyên § E2E contract (`redirectTo = origin + '/auth/callback?next=/todo'`). Curl authorize trả 302 accounts.google.com; `state` là UUID (flow-state DB) nên không decode referrer được — xác nhận cuối bằng login thật ở phase-05.
- [Resolved 2026-09-05] Ảnh hero `image 1` (node 662:14389): lấy từ `~/Desktop/Claude-and-mormoph/saa-app/public/assets/login/images/key-visual.png` (export 2× của node, 2882×2044) → `public/login/keyvisual.png`; render bằng `next/image` fill + object-cover (Figma crop đã bake trong bitmap), Next tối ưu WebP ~660KB. Không dùng `quality` ngoài `images.qualities` mặc định [75] của Next 16. Regression: TC 5fbe2a18 assert `/login/keyvisual.png` 200 + img loaded.
