# Clarifications — Homepage SAA (`/`) — MoMorph screen i87tDx10uM

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM (file "SAA 2025 - Internal Live Coding", frame "Homepage SAA", node 2167:9026)
- Specs CSV: plans/260906-0042-homepage-saa-page/momorph/specs.csv (46 items)
- Test cases CSV: plans/260906-0042-homepage-saa-page/momorph/test-cases.csv (62 TCs, ID-0…ID-62, thiếu ID-61)
- Node tree: plans/260906-0042-homepage-saa-page/momorph/node-tree.json · Text nodes (nguồn copy vi DUY NHẤT cho cả 2 track): plans/260906-0042-homepage-saa-page/momorph/texts.json · Preview: plans/260906-0042-homepage-saa-page/data/preview.png (1512×4480)
- MCP momorph + playwright load được trong session này. Fallback HTTP: `node plans/260906-0042-homepage-saa-page/momorph/momorph-mcp-http-client.mjs <tool> '<json>'`.
- Supabase local: instance `saa-app` (API `http://127.0.0.1:55321`, DB 55322, Studio 55323) — đã `supabase start` trong session này (Docker Desktop được bật lại). `.env.local` có sẵn URL + publishable key (khớp `supabase status`).
- testPolicy: **e2e-red-first** — auto-select vì màn có navigation, menu mở/đóng (click ngoài, Esc, Enter/Space), đổi ngôn ngữ, countdown đổi trạng thái (TC ID-24…35, 41…43). Runner có sẵn: `@playwright/test` 1.62.1, `pnpm test:e2e`.

## Session 2026-09-06 — user uỷ quyền toàn bộ ("tự đưa ra mọi quyết định, không hỏi")

Mọi mục dưới đây là quyết định của Claude theo thứ tự ưu tiên CLAUDE.md: (a) Recommended → (b) khớp pattern có sẵn trong repo → (c) ít file thay đổi nhất. User có thể override bất kỳ mục nào ở lần chạy sau.

### Route & điều hướng
- Q: Homepage đặt ở route nào? Hiện `/` chỉ redirect theo auth. → A: **`/` = Homepage SAA, PUBLIC** (TC ID-0: chưa đăng nhập vẫn xem đủ nội dung). `proxy.ts` **không redirect `/` nữa** (vẫn giữ `/` trong matcher để refresh session cookie); `app/page.tsx` render homepage thay cho `redirect()`. PERM001 (Root Route Guard) vì thế **hết hiệu lực** — ghi vào doc F001/permissions-matrix ở Delivery.
- Q: Đích sau đăng nhập? → A: **`/`** (homepage là hub; TC ID-1 mô tả user đã đăng nhập ở homepage). Đổi 3 chỗ: `app/login/login-client.tsx` `NEXT_PATH`, default của `safeNextPath` (`lib/supabase/next-path.ts:88` fallback `/todo` → `/`; callback route kế thừa), redirect trong `app/login/page.tsx` + `proxy.ts` (`/login` khi đã auth → `/`). `proxy.ts`: giữ `/` trong matcher (refresh session), chỉ thu hẹp 2 predicate `isAuthPage = pathname === '/login'`, `isProtectedPage = pathname.startsWith('/todo')` (research 02 §4). `/todo` **giữ nguyên** là placeholder được bảo vệ (không xoá, không đụng UI). E2E cũ assert `/`→`/login` và `/login`→`/todo` do tester cập nhật theo contract mới (đây là thay đổi spec có chủ đích, không phải nới assertion).
- Q: Đăng xuất từ menu tài khoản đi đâu? → A: **Dùng lại `logoutAction`** (`app/todo/actions.ts`) nguyên trạng → `/login`. Không thêm action mới (DRY, 0 file F001 đổi).
- Q: Các trang đích chưa tồn tại (Awards Information, Sun* Kudos, Tiêu chuẩn chung, Profile, Admin Dashboard)? → A: **Link tới route thật**, không tạo placeholder page (YAGNI; mỗi trang là một MoMorph screen riêng, làm ở session sau). Contract route: `/awards`, `/kudos`, `/standards`, `/profile`, `/admin`. Chúng 404 cho tới khi được implement → TC ID-59 (broken links) **ghi nợ**, E2E chỉ assert `href`.
- Q: Card giải thưởng link đi đâu? → A: `/awards#<slug>` với slug cố định: `top-talent`, `top-project`, `top-project-leader`, `best-manager`, `signature-2025-creator`, `mvp`. Ảnh + tiêu đề nằm trong MỘT `<a>`; "Chi tiết" là `<a>` thứ hai cùng href, `aria-label` = "Chi tiết <tên giải>" (6 link "Chi tiết" trùng tên là lỗi a11y).
- Q: "About SAA 2025" trỏ đâu, active thế nào? → A: `href="/"`; **active** khi `usePathname()` === pathname của href (client leaf `NavLink`, pattern chính thức của Next `link.md` "Checking active links"; vàng + underline theo design). Đang active mà click → `onClick` `window.scrollTo({top:0})` vì Link cùng route không navigate thật (TC ID-2/18/20). Logo header + footer: link `/`, cùng hành vi scroll-top.
- Q: Nút CTA hero? → A: "ABOUT AWARDS" → `/awards`; "ABOUT KUDOS" → `/kudos`. Nút Kudos "Chi tiết" → `/kudos`.

### Header
- Q: Design gõ "Award Information" (số ít) ở header/footer, spec + TC gõ "Awards Information"? → A: **"Awards Information"** theo spec A1.3/7.3 + TC ID-21/23 (content acceptance); design chỉ là authority cho visual. Cùng luật cho "Comming soon" → "Coming soon".
- Q: Mô tả card "Top Talent" — node text instance đầu (I2167:9075;214:1022) không trả characters? → A: Dùng chuỗi trong spec C2.1.3: "Vinh danh top cá nhân xuất sắc trên mọi phương diện". Ba card Best Manager / Signature 2025 - Creator / MVP trong design dùng CÙNG một mô tả placeholder ("Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm") → giữ nguyên văn design (không bịa mô tả mới), ghi Unresolved để content owner sửa.
- Q: Khách chưa đăng nhập thấy gì ở góc phải header? → A: Language selector luôn hiện. **Bell ẩn**. Nút icon tài khoản vẫn hiện nhưng là **link `/login`** (`aria-label` "Đăng nhập"/"Log in") — giữ đúng hình design, không bịa nút mới, và khách có đường vào đăng nhập.
- Q: Đã đăng nhập → A: Bell + nút tài khoản `button[aria-haspopup="menu"]` (aria-label "Tài khoản"/"Account"). Menu (`role="menu"`, `role="menuitem"`) theo thứ tự: **Hồ sơ** (→ `/profile`), **Trang quản trị** (→ `/admin`, CHỈ khi `role='admin'`), **Đăng xuất** (form `action={logoutAction}`). EN: Profile / Admin Dashboard / Sign out (đúng tên trong spec A1.8).
- Q: Nguồn role? → A: Bảng `public.users.role` ('member'|'admin', RLS own-row) của `saa-app` — đọc server-side trong `app/page.tsx` bằng `@supabase/ssr` server client sau `getUser()`. **Fail-open thành `member`** khi lỗi/không có row. Helper `lib/auth/get-user-role.ts` `getUserRole(supabase, userId): Promise<'member'|'admin'>` (client được inject để test; `.maybeSingle()`; lỗi/không row → `member`) kèm unit test. MSW handler `GET {SUPABASE_URL}/rest/v1/users?select=role&id=eq.<uuid>` trong `mocks/handlers.ts` phải trả **JSON array** (`maybeSingle` trên GET dùng `Accept: application/json`, research 02 §2); story admin override handler này qua `parameters.msw.handlers`. `authenticated` đã có SELECT trên `public.users` (default privileges — verify live, không cần grant mới).
- Q: Bell (A1.6) — chưa có bảng notifications trong Supabase project. → A: Render `button[aria-haspopup="dialog"]` (aria-label "Thông báo"/"Notifications") mở panel **empty state** "Bạn chưa có thông báo" / "No notifications yet". Badge đỏ chỉ render khi `unreadCount > 0`; hiện truyền `0` (không bịa data). Nguồn dữ liệu ghi nợ. TC ID-28 (badge hiện) không kiểm được — ghi nợ; TC ID-29 (không badge) pass.
- Q: Language selector dùng lại? → A: **Import `LanguageSelector` từ `components/login/`** (design homepage cũng là cờ VN + "VN" + chevron, cùng hành vi). Không move file (giữ path F002 trong docs); ghi nợ "cân nhắc chuyển sang `components/shared/`". Hook ghi cookie: **hook mới `hooks/use-select-locale.ts`** (`useTransition` + `setLocale`) kèm test — không đụng `useLoginActions` (transition dùng chung ở đó là chủ ý đã ghi).
- Q: Keyboard cho các dropdown (TC ID-30…35)? → A: Mọi menu (tài khoản, widget) **dùng `useMenuKeyboardNav`** sẵn có (Enter/Space/ArrowDown mở, Esc đóng + trả focus, click ngoài đóng, roving tabindex). `itemCount` của menu tài khoản cố định trong một lần render (role không đổi giữa phiên) → thoả giới hạn hook.
- Q: Mobile? → A: Không có hamburger trong design → không bịa. <768px: nav link xuống hàng dưới logo, controls giữ bên phải. Header sticky top, nền tối bán trong suốt như design.

### Hero / Countdown (B1)
- Q: Biến môi trường mốc sự kiện? → A: **`EVENT_START_AT`** (server-only, ISO-8601, vd `2025-12-31T18:30:00+07:00` theo TC ID-57). Đọc trong Server Component, parse/validate ở `lib/countdown/countdown.ts` (hàm thuần + test), truyền `targetIso: string | null` + `initialNowMs` xuống client component. Không dùng `NEXT_PUBLIC_*` (không cần inline vào bundle). Ghi vào `.env.local` (gitignored) giá trị demo `2026-12-26T18:30:00+07:00` để dev thấy đồng hồ chạy; tài liệu hoá ở docs.
- Q: Invalid/thiếu env (TC ID-60)? → A: `parseEventStart` trả `null` + `console.warn` một lần phía server; countdown hiển thị **00 / 00 / 00, "Coming soon" VẪN hiện** (chưa biết ngày → vẫn "sắp diễn ra"). Không crash.
- Q: Đến/qua mốc (TC ID-41/42)? → A: `00 / 00 / 00`, **ẩn "Coming soon"**, không âm.
- Q: Tick & hydration? → A: (theo research 01) Server Component truyền `targetIso` (đã validate) + `initialNowMs = Date.now()` xuống client; hook `hooks/use-countdown.ts` seed `useState(initialNowMs)` (render client đầu tiên trùng byte với SSR → KHÔNG cần `suppressHydrationWarning`), rồi `setInterval(1000)` cập nhật `nowMs`. Phần tính `parseTargetDate(iso)` + `remaining(target, nowMs)` + `pad2` ở `lib/countdown/countdown.ts` (thuần, test 100%). Days không giới hạn 2 chữ số (≥100 hiện 3), hours 00–23, minutes 00–59, luôn pad 2.
- Q: Nhãn/copy hero? → A: `h1` "ROOT FURTHER" (nếu dựng bằng ảnh thì `alt="ROOT FURTHER"`), "Coming soon" (sửa typo "Comming" của design), nhãn DAYS/HOURS/MINUTES giữ tiếng Anh ở cả 2 locale (đúng design).
- Q: Thông tin sự kiện (B2) — design ghi "26/12/2025 · Âu Cơ Art Center · Livestream", spec/TC ghi "18h30 · Nhà hát nghệ thuật quân đội · Group Facebook Sun* Family"? → A: **Theo spec + TC ID-14** (content acceptance), design chỉ là authority cho visual. Copy tĩnh qua next-intl `home.*`; EN do Claude dịch: "Time: 18:30", "Venue: Army Art Theatre", "Live on the Sun* Family Facebook Group".

### Nội dung tĩnh (B4, C1, C2, D1)
- Q: Nguồn text vi? → A: `momorph/texts.json` (characters Figma, nguyên văn). Track A đặt `defaultHomeCopy` trong `components/home/home-copy.ts`; Track B chép cùng chuỗi vào `messages/vi.json` `home.*` và dịch `messages/en.json` (test parity có sẵn bắt lệch key). Đoạn Root Further nhiều paragraph → mảng `home.rootFurther.paragraphs: string[]` đọc bằng `t.raw` (parity test flatten index mảng nên vẫn kiểm được).
- Q: Tiêu đề giải thưởng dịch không? → A: **Không** — "Top Talent", "Top Project", …, "Sun* Kudos", "About SAA 2025", "Awards Information" giữ tiếng Anh ở cả 2 locale (đúng design). Mô tả card, caption "Sun* annual awards 2025", "Hệ thống giải thưởng", mô tả C1, "Phong trào ghi nhận", "ĐIỂM MỚI CỦA SAA 2025", đoạn Root Further, "Chi tiết", "Tiêu chuẩn chung" → có bản EN.
- Q: Mô tả card tối đa 2 dòng (C2.1.3)? → A: `line-clamp-2`.
- Q: Grid card? → A: **Desktop ≥1024: 3 cột; <1024 (tablet + mobile): 2 cột** — theo spec C2 + TC ID-15/16 (instance mms_C2 ghi "1-column mobile" mâu thuẫn → TC thắng).
- Q: Footer copyright design gõ "vè"? → A: Dùng chuỗi đúng đã có `login.footer` "Bản quyền thuộc về Sun* © 2025" / "Copyright © Sun* 2025" (tái dùng key, không tạo key trùng).

### Widget button (6)
- Q: Menu hành động nhanh — spec không liệt kê option. → A: `button[aria-haspopup="menu"]` (aria-label "Hành động nhanh"/"Quick actions"), menu 2 item **suy ra từ 2 icon** (INFERRED, user override được): bút chì → "Sun* Kudos" (`/kudos`), icon SAA → "Awards Information" (`/awards`). Không tạo đích mới ngoài các route đã có ở nav.

### Assets
- Q: Ảnh/icon? → A: Tải mọi `MM_MEDIA_*` (keyvisual BG, logo, thumbnail 6 card, KUDOS logo, icon bell/user/pencil/arrow) về `public/home/` theo convention `momorph-implement-design`; dùng `next/image` cho bitmap (hero `fill` + `preload` — Next 16 deprecate `priority`), SVG inline cho icon. Không dùng `quality` ngoài mặc định `[75]` của Next 16.

### Layering & test (bắt buộc theo 2 skill của repo)
- Logic thuần → `lib/countdown/*.ts`, `lib/auth/*.ts` (+ `*.test.ts`, 100% allowlist). State/effect → `hooks/use-countdown.ts`, `hooks/use-select-locale.ts` (+ test jsdom). Component `components/home/**` chỉ render; common component (Countdown, AwardCard, HeroCta, HomeFooter, NotificationBell, AccountMenu, WidgetButton, icons) có `*.stories.tsx`; route story `HomeScreen` dựng từ component trình bày.
- Track A KHÔNG sửa `package.json`, `proxy.ts`, `lib/**`, `hooks/**`, `messages/**`, `app/**` (trừ `app/globals.css` additive + `app/fonts.ts` nếu cần weight mới).

## E2E contract (tester + implementer dùng chung — Claude decision 2026-09-06)
- Runner: `@playwright/test` 1.62.1. File mới `tests/e2e/home.spec.ts`; cập nhật `tests/e2e/login.spec.ts` cho đích `/` (TC 45278c06 "GET / redirects to /login" → BỎ vì `/` public; TC f62b0c97 "/login → /todo" → "/login → /"). Selector role/name/text, KHÔNG `data-testid`. Test cần Supabase sống tag `@auth` (CI loại bằng `--grep-invert @auth`, xem `.github/workflows/ci.yml`).
- Countdown deterministic: `playwright.config.ts` `webServer.env.EVENT_START_AT` = mốc cố định trong tương lai xa (vd `2099-12-31T18:30:00+07:00`); test zero-state dùng `page.clock` (install trước goto, jump qua mốc) hoặc bộ test riêng với env quá khứ — tester chọn, ghi vào § RED evidence.
- `/` (Server Component, public):
  - `<header>` sticky: `a[aria-label="Sun* Annual Awards 2025"]`/`img[alt="Sun* Annual Awards 2025"]` href `/`; nav `a` "About SAA 2025" (href `/`, `aria-current="page"`), "Awards Information" (href `/awards`), "Sun* Kudos" (href `/kudos`); `header button[aria-haspopup="menu"]` tên chứa "VN" (LanguageSelector); anon: `a[aria-label="Đăng nhập"]` href `/login`, KHÔNG có nút bell; authed: `button[aria-label="Thông báo"]` + `button[aria-label="Tài khoản"][aria-haspopup="menu"]`.
  - Menu tài khoản: mở → `[role="menu"]` với `menuitem` "Hồ sơ" (href `/profile`), "Đăng xuất" (submit → `logoutAction` → URL `/login`); admin thêm "Trang quản trị" (href `/admin`); member KHÔNG có. Toggle click lần 2 đóng; click ngoài đóng; Enter/Space mở; Esc đóng (TC ID-30…38).
  - Bell: click → `[role="dialog"]` chứa "Bạn chưa có thông báo"; không có badge (`[data-unread]`/text badge không tồn tại) khi count 0.
  - Hero: `h1` chứa "ROOT FURTHER"; text "Coming soon" hiện khi chưa tới mốc, ẩn khi đã qua; 3 ô countdown có nhãn "DAYS"/"HOURS"/"MINUTES", mỗi ô text khớp `/^\d{2,}$/`; sau 1 phút (clock) minutes giảm 1; zero-state `00 00 00`.
  - Event info text: "Thời gian: 18h30", "Địa điểm: Nhà hát nghệ thuật quân đội", "Tường thuật trực tiếp tại Group Facebook Sun* Family".
  - CTA: `a` "ABOUT AWARDS" href `/awards`; `a` "ABOUT KUDOS" href `/kudos`.
  - Awards: heading "Hệ thống giải thưởng"; 6 card, mỗi card `a` tên chứa tiêu đề + `a[aria-label="Chi tiết <tiêu đề>"]`, href `/awards#<slug>` (bảng slug ở trên).
  - Kudos: heading "Sun* Kudos"; `a` "Chi tiết" href `/kudos` (aria-label "Chi tiết Sun* Kudos" để không trùng 6 card).
  - Widget: `button[aria-label="Hành động nhanh"][aria-haspopup="menu"]` fixed bottom-right; click → `[role="menu"]` 2 `menuitem`.
  - `<footer>`: logo link `/`; `a` "About SAA 2025" (`/`), "Awards Information" (`/awards`), "Sun* Kudos" (`/kudos`), "Tiêu chuẩn chung" (`/standards`); text "Bản quyền thuộc về Sun* © 2025".
  - Đổi ngôn ngữ EN: footer "Copyright © Sun* 2025", "Chi tiết" → "Details", selector hiện "EN", cookie `NEXT_LOCALE=en`. Default `vi`.
- Guard: `/` không redirect (anon và authed đều 200). `/login` authed → `/`. `/todo` anon → `/login` (không đổi). `/auth/callback` thành công → `safeNextPath(next)` default `/`.
- Admin/member provisioning cho E2E `@auth`: user tạo qua GoTrue `createTestSession` (helper sẵn có); nâng admin bằng `supabase db query "update public.users set role='admin' where email='<email>'"` chạy với `cwd` = thư mục saa-app (`process.env.SAA_APP_DIR ?? '~/Desktop/Claude-and-mormoph/saa-app'`) — research 02 §3: không cần psql local, không kéo service-role key vào repo, không sửa saa-app. Helper mới `tests/e2e/helpers/promote-to-admin.ts`.
- Env: `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sẵn), `EVENT_START_AT` (mới).

## RED evidence (tester ghi — read-only cho UI/backend agents)
- testRunner: `@playwright/test 1.62.1` (chromium only)
- redTestFiles: `tests/e2e/home.spec.ts`
- redCommand: `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list`
- redExitCode: 1
- redFailure: Element assertions fail (h1 "ROOT FURTHER" not found) — homepage route currently redirects `/` to `/login` instead of rendering public content
- redEvidence: validated (defects fixed per orchestrator review) — `/plans/260906-0042-homepage-saa-page/evidence/red-run.log` (27 tests: 3 passed, 24 failed)
- adminProvisioning: helper `tests/e2e/helpers/promote-to-admin.ts` runs `supabase db query` with cwd=$SAA_APP_DIR (synchronous, not async)
- loginSpecChanges: Two test assertions updated per new landing contract; both marked @auth and currently RED (see tester report §Login.spec.ts Changes)
- domAssumptions: See tester report "DOM Assumptions Now Documented" section — one h1, main landmark, tile structure, header logo link, event-info text normalization

## GREEN evidence (tester ghi — FINAL re-verified after UI corrections + polish)
- greenCommand: `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list`
- greenExitCode: 0 (FINAL re-verification: exit 0)
- greenCounts: 27 passed, 0 failed, 0 skipped (all assertions green, re-verified 2026-09-06)
- fullSuiteCounts: 55 passed, 2 skipped (expected Supabase unavailable tests), 0 failed
- gatesSummary: All 8 quality gates GREEN: coverage 100%, lint 0 warnings, format OK, typecheck OK, build OK, storybook OK (re-verified 2026-09-06)
- visualReportPath: `reports/tester-green-home-e2e.md` (with "Final re-verification" addendum)
- visualCaptures: 6 screenshots captured — `actual-anon-{375,768,1280,1440}.png`, `actual-anon-en-1440.png`, `actual-widget-open-1440.png`
- visualFindings: **ZERO blocking** (prior image loading findings were capture-timing artifacts, now fixed via scroll+load confirmation); **Polish** (2 console warnings for award name graphics due to per-slug dimensions + CSS scaling — expected and non-blocking)
- keyvisualCorrection: homescreen.tsx root has `isolate` stacking context, keyvisual-background.tsx band sized 1512/1392 with aspect ratio preserved — image visible at all breakpoints
- consoleWarnings: 2 instances (Top_Project.png, Best_Manager.png aspect ratio warnings) × 23 occurrences each — non-blocking polish (CSS `w-[65%]` + `h-auto` override intrinsic dims intentionally for responsive sizing)
- nextAction: phase 06 complete; move to Delivery (write-journal, action-items, release notes)

## Unresolved
- 3 card Best Manager / Signature 2025 - Creator / MVP có mô tả trùng nhau trong Figma (placeholder) — cần content owner cung cấp mô tả thật.
- Menu widget: 2 item là suy diễn từ icon — cần user xác nhận nội dung thật của "menu hành động nhanh".
- Bell: chưa có bảng notifications → panel rỗng vĩnh viễn cho tới khi có schema (ngoài repo, thuộc saa-app).
- 5 route đích (`/awards`, `/kudos`, `/standards`, `/profile`, `/admin`) chưa tồn tại → TC ID-59 fail cho tới khi các screen đó được implement.
- Event info: design (26/12/2025, Âu Cơ Art Center) ≠ spec/TC (18h30, Nhà hát nghệ thuật quân đội) — đã chọn spec/TC; cần user chốt nội dung thật trước sự kiện.
