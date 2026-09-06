# Sổ việc — agentic-coding-hands-on

## 260905-2131 — takumi-flow-git-automation

### Tôi cần làm
- [ ] Tree đang bẩn 24 mục (`hooks/`, `lib/auth/`, `lib/ui/`, 6 file modified). Lần chạy `--flow` tới sẽ bị cửa chặn dirty-tree hỏi commit/stash/carry — dọn trước cho khỏi vướng.
- [ ] Quyết định: có cần authorize SSH key cho org `sun-asterisk-internal` (SAML SSO) không. Chưa có thì mọi thao tác với `upstream` đều fail, `--flow` chỉ chạy được trên fork `origin`.

### Decisions
- Sync + PR về `origin` (fork `thangdx-1076`), không phải `upstream` — vì `git fetch upstream` fail SAML SSO; PR #1 trước đó cũng nằm ở origin.
- Đã chạy `gh repo set-default thangdx-1076/agentic-coding-hands-on` — trước đó chưa set, `gh` tự đoán ra repo tổ chức và sẽ mở PR sai chỗ.
- Một cờ `--flow` thay vì tách `--branch` + `--ship` — nửa branch tự bỏ qua khi đã đứng trên branch đúng tên, nên cờ thứ hai không cần (YAGNI).
- Nửa sau uỷ cho `/tkm:ship official --skip-journal --skip-docs`, không viết lại logic commit/push/PR. Skip đúng 2 thứ takumi Delivery đã làm; giữ test + review vì ship merge `origin/main` trước khi test.
- `plan.validation.mode: "off"` trong `~/.claude/.tkm.json` — tắt interview validate plan (3-8 câu hỏi sau mỗi plan).

### Nợ lại
- `.claude/skills/takumi-flow/SKILL.md` hardcode tên repo `thangdx-1076/agentic-coding-hands-on`. Fork sang repo khác là phải sửa tay.
- Chưa chạy `--flow` thật lần nào — đường đi mới xác minh từng lệnh git rời, chưa có PR nào do nó tạo ra.

## 260905-2207 — ship refactor/login-extract-hooks

### Tôi cần làm
- [ ] Quyết định pháp lý: 14 cảnh báo `LGPL-3.0-or-later` từ `@img/sharp-libvips-*` (transitive dưới `next`) trong project khai báo `Proprietary`. 0 violation nên không chặn ship, nhưng `licenseal check --strict` exit 1 vì chúng — CI bật strict sẽ đỏ. Xem `plans/reports/licenseal-260905-2207-ship.md`.
- [ ] Review + merge PR #2 → https://github.com/thangdx-1076/agentic-coding-hands-on/pull/2
- [ ] `CLAUDE.md` đang fail `pnpm format:check` (file của session takumi-flow, tôi không đụng).

### Decisions
- Ship mode `official` dù nhánh `refactor/*` không khớp bảng detect — theo tiền lệ repo: `feat/login-google-oauth` → PR #1 vào `main`, và `main` là default branch.
- Không tạo GitHub issue để link (Step 2). Không có issue mở nào, PR #1 cũng không link issue; tạo issue chỉ để có cái mà link là thao tác ra ngoài không cần thiết.
- Sửa W1 của reviewer bằng `safeNextPath` thay vì `encodeURIComponent`. `encodeURIComponent` sẽ đổi `/todo` thành `%2Ftodo` — đổi hành vi; `safeNextPath("/todo")` trả nguyên `/todo` và dùng lại đúng choke point sẵn có của repo (DRY).
- Không gộp `CLAUDE.md` và `plans/action-items.md` vào commit nào — chúng thuộc session takumi-flow đang chạy song song.
- Bump patch 0.1.0 → 0.1.1: refactor + docs, không có API mới.
- Bỏ Step 10 (journal) và Step 11 (docs) của ship: cả hai đã chạy trong cùng session cho đúng change set này (journal commit `690a5f8`, doc-writer sửa 7 file). Chạy lại chỉ tạo entry trùng.

### Nợ lại
- `useTransition` dùng chung giữa login và đổi ngôn ngữ — đổi ngôn ngữ vẫn làm nút login pending. Có sẵn từ trước, giữ nguyên để refactor không đổi hành vi. Tách ra là quyết định thiết kế riêng.
- `MODEL003_LoginCopy.languageLabel` tính ở server nhưng không ai đọc.
- Comment trong `app/todo/page.tsx` và `actions.ts` trích `US004` — mã không tồn tại.
- Không e2e nào kiểm chứng cookie-write + re-render sau khi đổi ngôn ngữ.
- F001 `FR-001`/`FR-401` đánh `[UNVERIFIED]` trung thực nhưng thiếu tag `(covers …)` — warning về hình thức, cố ý không sửa.
- SunLint 8 warning ở code cũ: empty catch block (`app/auth/callback/route.ts:40`, `app/todo/actions.ts:18`, `lib/supabase/server.ts:32`), thiếu anti-cache header và Content-Type validation ở `/auth/callback`.

## 260906-0002 — testing-storybook-standards

### Tôi cần làm

- [ ] Review + merge PR cho `feat/test-storybook-standards`.
- [ ] Quyết định: bật branch protection cho `main` và đặt `quality` + `e2e` làm required status check. Chưa bật thì ngưỡng 100% và bước build Storybook chỉ *báo cáo*, không *chặn* merge (`gh api .../branches/main/protection` vẫn trả 404).
- [ ] Vẫn còn 14 cảnh báo `LGPL-3.0-or-later` từ `@img/sharp-libvips-*` (nợ từ session trước, chưa xử lý).
- [ ] Chạy lại `derive_confidence_report.py` (hoặc `/tkm:rebuild-spec --artifact F001_GoogleOAuthLogin`) cho `docs/vi/features/F001_GoogleOAuthLogin/confidence-report_technical-spec.md`: nó parse citation của `technical-spec.md`, mà file đó vừa được sửa citation sau khi tách `TodoScreen` — nên report đã cũ theo đúng thiết kế. **Đừng sửa tay**, nó là output của script.

### Decisions

- Tên skill: `write-unit-tests-and-storybook-stories`. Kebab-case, tự mô tả, cùng giọng với skill `separate-hook-logic-from-components` đã có.
- Ranh giới "common component" quyết bằng **nội dung file**, không bằng thư mục — không tạo `components/common/` và không di chuyển file nào. Test 3 câu hỏi kiểm được bằng cách đọc import, nên thư mục là thừa (YAGNI).
- CI chỉ thêm `build-storybook` (bắt story hỏng), **không** thêm script kiểm tra story có *tồn tại* đủ hay không — việc đó để review người làm. Đây là option `(Recommended)` của critic.
- `Build Storybook` đặt **sau** `Typecheck`, không phải sau `Build` như plan viết: giữ cặp build→typecheck liền nhau (Next chỉ sinh `.next/types` sau khi build), đỡ vỡ khi ai đó sửa sau này.
- MSW `setupFiles` đặt ở ROOT `vitest.config.ts` — dùng chung cho cả 2 project. MSW patch tầng `http`/`fetch` của Node, không đụng jsdom.
- Coverage allowlist **không có glob `.tsx`**. Đó là cơ chế loại `components/**` và `app/**/page.tsx` khỏi mẫu số — sai khác phần mở rộng, không phải exclude list phải bảo trì.
- Ngưỡng 100% bật ở phase cuối, sau khi test đã đủ. Bật sớm là chặn cả nhánh cho tới khi có người trả nợ.
- `tsconfig.json` thêm glob `.storybook/**` (ngoài plan): glob `**/*` của TypeScript bỏ qua thư mục bắt đầu bằng dấu chấm, nên 2 file đó nằm ngoài project và lint type-aware không parse được.
- PR: https://github.com/thangdx-1076/agentic-coding-hands-on/pull/3 — branch `feat/test-storybook-standards` → `main`, 13 commit.
- Bump **minor** `0.1.1 → 0.2.0` chứ không phải patch: có 2 commit `feat:` (Storybook + script mới), tức thêm capability chưa từng có. Ship bảo minor phải hỏi, nhưng CLAUDE.md bảo chỉ dừng khi mất dữ liệu/tốn tiền/lộ secret — số version không thuộc nhóm đó nên tự chốt.

### Nợ lại

- `msw-storybook-addon@3.0.0`: tài liệu đang lưu hành **sai** với bản này — không có `initialize()`, và `mswLoader` là factory `(setup?) => LoaderFunction` phải gọi mới dùng được. Đã ghi lại trong doc comment `.storybook/preview.tsx`. Nếu nâng version, kiểm lại export map trước.
- Storybook chỉ mock đăng nhập qua prop `onLoginClick`. `signInWithOAuth` là redirect top-level nên MSW không chặn được — không có cách nào diễn lại luồng OAuth thật trong Storybook.
- Con số 100% chỉ phủ lớp logic. Không nói gì về việc Server Component render đúng hay UI trông đúng; hai thứ đó vẫn thuộc Playwright và mắt người.
- Nhánh PKCE exchange **thành công thật** (Google thật) vẫn không có test tự động nào — unit test dùng MSW chỉ chứng minh handler chạy, không chứng minh Google trả gì.
- Sự cố trong lúc chạy: một lệnh có `cd` không nối bằng `&&` khiến `git checkout b7254e5` + `pnpm install --frozen-lockfile` chạy nhầm vào repo chính, detach HEAD và gỡ dependency mới. Đã khôi phục đủ (branch + file chưa commit còn nguyên). Tác dụng phụ: lần cài lại sạch đó sửa luôn lỗi Playwright không collect được test do `pnpm add` tăng dần để lại — CI luôn chạy `--frozen-lockfile` nên chưa bao giờ dính.

## 260906-0042 — homepage-saa-page

### Tôi cần làm

- [ ] Review + merge PR #4 → https://github.com/thangdx-1076/agentic-coding-hands-on/pull/4
- [ ] Chốt nội dung thật cho **menu widget hành động nhanh** (spec MoMorph item 6 không liệt kê option; đang suy diễn từ 2 icon: bút chì → Sun* Kudos `/kudos`, icon SAA → Awards Information `/awards`) — `components/home/widget-button.tsx`.
- [ ] Chốt **thông tin sự kiện**: design Figma ghi `26/12/2025 · Âu Cơ Art Center · Livestream`, spec/TC ghi `18h30 · Nhà hát nghệ thuật quân đội · Group Facebook Sun* Family` (đã dùng spec/TC) — `messages/{vi,en}.json` `home.event.*`.
- [ ] Cung cấp file font **"Digital Numbers"** (Figma dùng cho 3 ô đếm ngược; không có trên Google Fonts) — hiện fallback `monospace` trong `components/home/countdown-tiles.tsx`.
- [ ] Content owner sửa **3 mô tả card trùng nhau** trong Figma (Best Manager / Signature 2025 - Creator / MVP cùng một câu placeholder) — `messages/*.json` `home.awards.items[3..5].description`.
- [ ] 5 route đích chưa tồn tại (`/awards`, `/kudos`, `/standards`, `/profile`, `/admin`) → TC ID-59 (broken links) fail cho tới khi các MoMorph screen đó được implement.
- [ ] Bell thông báo: chưa có bảng `notifications` trong Supabase project `saa-app` → panel rỗng vĩnh viễn, badge không bao giờ hiện (TC ID-28 không kiểm được). Quyết định schema thuộc saa-app, ngoài repo này.
- [ ] Vẫn còn 14 cảnh báo `LGPL-3.0-or-later` từ `@img/sharp-libvips-*` (nợ từ session trước).

### Decisions

- PR: https://github.com/thangdx-1076/agentic-coding-hands-on/pull/4 — branch `feat/homepage-saa-page` → `main`, 8 commit (3 forge + 5 ship: feat/test/docs/chore(plan)/chore(release)).
- Bump **minor** `0.2.0 → 0.3.0`: tính năng người dùng thấy được mới (homepage public) — theo tiền lệ 0.2.0; ship bảo hỏi khi minor nhưng CLAUDE.md chỉ dừng khi mất dữ liệu/tốn tiền/lộ secret.
- Không tạo GitHub issue để link PR (không có issue mở; 3 PR trước cũng không link) — tạo issue chỉ để có cái mà link là thao tác ra ngoài không cần thiết.
- Ship gates: SunLint 81.3 (B) 0 error/12 warning (advisory); licenseal 171 dep, 0 violation, 0 gap, 14 warning LGPL đã biết; thêm `.takumi/` vào `.gitignore` để `git add -A` không kéo report công cụ vào commit.
- `/` = Homepage **public** (TC ID-0): `proxy.ts` thu hẹp 2 predicate, GIỮ `/` trong matcher để refresh session; `app/page.tsx` render thật. PERM001 (Root Route Guard) hết hiệu lực — đã ghi vào `docs/vi/system/permissions.md`.
- Đích sau đăng nhập đổi `/todo` → `/` (3 chỗ: `login-client.tsx` `NEXT_PATH`, `safeNextPath` fallback, `/login` redirect); `/todo` giữ nguyên là placeholder được bảo vệ. 2 assertion cũ trong `login.spec.ts` + 4 trong `sign-in-with-google.test.ts` đổi theo — thay đổi spec có chủ đích, không phải nới test.
- Scope spec: **SINGLE** feature `F003_Homepage` (một actor/một action-domain/một outcome; header widgets là vùng con của cùng screen, không có API riêng) → không kích Rest Point 1.5a (gate duy nhất không nhường `--auto`).
- Test policy **e2e-red-first** (navigation + menu open/close + đổi ngôn ngữ + countdown state). RED: `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` exit 1 (24/27 fail do assertion) → GREEN 27/27 cùng lệnh.
- Role: đọc `public.users.role` server-side bằng client được inject (`lib/auth/get-user-role.ts`), **fail-open `member`** — là nhãn hiển thị, không phải cổng authz (`/admin` tự guard ở feature sau). Shim `lib/supabase/users-role-client.ts` vì so sánh cấu trúc client Supabase với interface hẹp nổ TS2589.
- Admin provisioning cho e2e `@auth`: `supabase db query` với cwd saa-app (không cài psql, không kéo service-role key vào repo, không sửa saa-app).
- Countdown: env server-only `EVENT_START_AT` (ISO-8601); seed `initialNowMs` từ server, tick 1s, KHÔNG `suppressHydrationWarning`; invalid/thiếu → `00/00/00` + vẫn "Coming soon"; qua mốc → `00/00/00` + ẩn "Coming soon". `.env.local` thêm `EVENT_START_AT=2026-12-26T18:30:00+07:00` (demo).
- Copy: "Awards Information" và "Coming soon" theo spec/TC (design gõ "Award Information", "Comming soon"); tiêu đề giải, nav, DAYS/HOURS/MINUTES giữ tiếng Anh cả 2 locale; `messages.home.*` mirror leaf `HomeCopy`, trừ `awards.items[].slug/image` (metadata tĩnh), `footer.copyright` (dùng lại `login.footer`), `header.languageLabel` (từ `LOCALE_LABEL`).
- Anonymous: bell ẩn, nút icon tài khoản là link `/login` (`aria-label` "Đăng nhập") — giữ hình design, có đường vào đăng nhập.
- `LanguageSelector` import từ `components/login/` (không move file — giữ path trong docs F002); hook mới `use-select-locale.ts`, không đụng `useLoginActions`.
- Hero `<h1>` = ảnh logo + `sr-only` "ROOT FURTHER" để `toContainText` đọc được; `useMenuKeyboardNav.registerItem` nới sang `HTMLElement` (type-only) cho `<a role="menuitem">`.
- Grid card: 2 cột <1024, 3 cột ≥1024 (TC ID-15/16 thắng instance mms_C2 ghi 1 cột mobile). Header không hamburger (không có trong design).
- Visual: 3 finding "blocking ảnh không tải" của tester là artefact lazy-load `next/image` (đã verify 20/20 ảnh `complete` sau khi cuộn); lỗi thật là keyvisual bị vẽ dưới nền vì `-z-10` trong root không có stacking context → thêm `isolate` + dải `aspect-[1512/1392]`. Name graphic card chuyển sang wrapper `aspectRatio` + `fill` để tắt warning dev "width or height modified".
- Promote F003/SCR003 bằng script `plans/260906-0042-homepage-saa-page/scripts/promote-homepage-spec.py` (P0–P5 + Step 0–9 + SYSTEM-DOC), docs root `docs/vi/`; `screen_spec_shas` tính lại cho cả 3 màn theo đúng thuật toán `incremental_planner` (sha SCR001 cũ vốn đã lệch).
- Gen gate 6.a-pre: Core + Flow đã có baseline → chỉ advisory re-baseline (205 file đổi từ `9c1fa00`), không regenerate ở `--auto`.

### Nợ lại

- Font "Digital Numbers" chưa nạp (fallback monospace) — xem "Tôi cần làm".
- `public/home/Down.svg`, `FLAG_VN.svg` tải về theo media map nhưng không dùng (LanguageSelector tái dùng icon của login) — xoá hoặc giữ tuỳ ý.
- `validate_coverage.py` báo 18 nodeId "missing" là false-positive: 6 card dùng 1 component data-driven và 2 icon nằm trong `LanguageSelector` tái dùng (mang nodeId của màn Login).
- Spec F003 promote sớm hơn code nên một số câu (`lib/event/`, `getCurrentAccount`, tick 60s, `suppressHydrationWarning`) đã được sửa tay theo as-built; core pass `/tkm:rebuild-spec` lần tới sẽ reconcile hẳn (US### của F003 hiện là mã local US001–US004 trong functional-spec, chưa cấp mã toàn cục).
- `.playwright-mcp/` (Playwright MCP) và script capture `.mjs` của tester ở root repo làm `format:check` đỏ — đã xoá; cân nhắc thêm `.playwright-mcp/` vào `.gitignore`/`.prettierignore`.
- `app/page.tsx` 199 dòng — sát ngưỡng 200; lần sau thêm copy nên tách builder.
- CI không chạy được 16/27 test `@auth` (cần Supabase local) — GREEN đầy đủ chỉ hợp lệ trên máy dev có `saa-app`.

## 260906-1102 — track-project-skills

### Tôi cần làm

- (không có)

### Decisions

- Opt-in thêm `nextjs-route-colocation-architecture` và `takumi-flow` vào `.gitignore` (2 dòng `!.claude/skills/<tên>/`), giữ nguyên cơ chế "chặn cả cây, mở từng skill theo tên" vì kit vẫn đổ `node_modules`/`.venv` vào `.claude/skills/`. `devops`, `search-docs`, `think-sequential` là kit cài → tiếp tục ignore.
- `.claude/hooks/notifications/.env.example` không đẩy lên: thư mục `hooks/` là kit cài, và pattern `.env*` cũng đang chặn.

### Nợ lại

- Skill viết tay mới sau này phải nhớ thêm dòng opt-in, nếu không sẽ lặp lại lỗi này.

## 260906-1125 — skills-route-colocation-src

### Tôi cần làm

- [ ] Review và merge PR #6 (3 skill viết lại bằng tiếng Anh): https://github.com/thangdx-1076/agentic-coding-hands-on/pull/6

### Decisions

- Chốt dùng `src/` (user quyết). Skill mô tả đích, code chưa move → thêm mục "Status" đầu skill colocation và một dòng ở 2 skill kia để agent không tạo `src/` nửa vời (Next bỏ qua `src/app` khi root `app/` còn).
- Route `/` đặt trong `(public)/(home)/` để có segment riêng; nếu để `page.tsx` ngay dưới `(public)/` thì component home rò sang `login/` qua `(public)/_components/`.
- `logoutAction` → `src/app/_actions/logout.ts` (dùng bởi `/` và `/todo`); `setLocale` → `src/app/_actions/set-locale.ts` (concern của root shell, `layout.tsx` set `lang`).
- `LanguageSelector` + `icon-down` + `icon-vn-flag` → `(public)/_components/language-selector/` (ancestor chung của home và login, gỡ import ngang trong `header.tsx`).
- `lib/` tách theo kind: `supabase/*` → `src/lib/supabase`; `get-user-role` + `users-role-client` → `src/dal/` (server-only); `sign-in-with-google` → `src/api/auth.ts`; `countdown` → `(home)/_utils`; `roving-index` → `src/utils/a11y`; `next-path` → `src/utils/url`; `i18n/locale` → `src/lib/i18n`.
- MSW `mocks/` → `src/mocks/` (giữ alias `@/mocks`); `globals.css` + `fonts.ts` → `src/styles/`; `messages/`, `public/`, `tests/` ở root.
- ESLint boundaries: dùng core `no-restricted-imports` (không thêm dependency), chặn thêm pattern `@/app/**/_*` vì private folder luôn với được bằng relative path; nâng lên `eslint-plugin-boundaries` khi có vi phạm lọt qua.
- Coverage allowlist đổi sang pattern (`_hooks/_utils/_actions/actions.ts/route.ts` + `src/{api,dal,lib,utils,hooks,domain,configs}`), vẫn không có glob `.tsx`. `_shared/`, `constants/`, `mocks/`, `i18n/request.ts`, `proxy.ts` ngoài mẫu số có chủ ý.
- Phân công 3 skill, mỗi skill một câu: colocation = WHERE, separate-hook = WHICH LAYER, testing = WHAT SHIPS BESIDE. Mỗi skill có bảng 3 câu trỏ sang 2 skill kia, không lặp nội dung.
- Skill colocation rút từ ~300 xuống 110 dòng; phần dài đẩy sang `references/migration-map.md` (checklist refactor + config diff) và `references/rationale-and-anti-patterns.md`. Version 6.0.0 → 7.0.0.
- Sửa lỗi cũ trong skill test: route `/` giờ có story `HomeScreen` (bản cũ ghi "miễn, chỉ redirect").

### Nợ lại

- Code chưa move. Làm theo `references/migration-map.md`, 3 PR. PR 1 xong thì xoá các dòng "until the migration lands" ở 3 skill.
- Sau khi move phải chạy rebuild-spec core pass: 19 file trong `docs/vi` tham chiếu path cũ, `_source-to-fcode.json` lệch.
- Cần cài package `server-only` khi tạo `src/dal/`.
- Trong lúc chờ PR 1, file mới vẫn phải đặt theo cột "Current" của migration map; agent đọc skill có thể lẫn nếu bỏ qua mục Status.

## 260906-1150 — src-route-colocation-refactor

### Tôi cần làm

- [ ] Ký riskGate rồi ship. Reviewer đánh `touchesSensitiveArea: true` vì gate auth chuyển sang `src/app/(protected)/layout.tsx` + `src/dal/auth.ts`. Review branch `refactor/src-route-colocation` (4 commit trên `aca6e8e`), rồi đặt `humanSignedOff: true` trong `plans/260906-1150-src-route-colocation-refactor/evidence/inspection-verdict.json` và chạy `/tkm:ship official --skip-journal --skip-docs` (hoặc bảo tôi chạy). Evidence gate hard hiện chặn đúng một dòng này.
- [ ] Quyết có chạy `/tkm:rebuild-spec` không. Planner dry-run: `mode=full`, fallback `threshold_exceeded (359/37 > 0.3)` kể từ `9c1fa00`. Full core pass = 11 artifact, W0–W9, nhiều agent, ước cả triệu token. Chưa chạy thì `docs/vi/generated/**`, 3 `technical-spec.md`, `_source-to-fcode.json` và confidence-report còn trỏ path trước khi move.
- [ ] `docs/vi/system/overview.md` stale từ trước refactor (còn mô tả app 2 màn, chưa có F003). Chạy `/tkm:rebuild-spec --artifact overview` hoặc gộp vào lần full ở trên.

### Decisions

- Branch `refactor/src-route-colocation` tách từ `origin/main` `aca6e8e` (PR #6 đã merge lúc bắt đầu). Một PR, ba commit phase + một commit sửa review: `f9e6e33` move vào `src/`, `1f83396` route group + colocation, `580e45f` tách lib + `dal/auth` + lint boundaries + docs, `fd445a5` docblock `proxy.ts`. Plan dir và docs commit riêng.
- Work-type `feature` (refactor code đã commit là feature-class), SDD on, `spec_lang: vi` kế thừa. 0 intent user-facing mới → không draft feature spec, không cấp F###. `plan.md` ghi `spec_waived` + `system_doc_drafts` thay cho `spec_draft` để Promote Gate và Step 6.b bỏ qua đúng điều kiện (invariant MED-3: `system_docs` phải gắn vào một feature sentinel, ở đây không có).
- Phase 1 chuyển nguyên cây `app/` cùng lúc với config: researcher xác nhận Next bỏ qua `src/app` khi root `app/` còn tồn tại, nên PR column cũ của migration map (tách `layout.tsx` sang PR 1) là sai và đã sửa.
- Thêm `src/dal/auth.ts` `getCurrentUser()` cho bốn chỗ đọc session (layout protected, home, login, todo) theo rule 4 của skill colocation, thay quyết định YAGNI của planner (planner đếm một consumer, thực tế bốn).
- ESLint boundaries dùng option `regex` của `no-restricted-imports` vì `group` (gitignore-glob) không hỗ trợ extglob để loại ancestor; implementer chứng minh hai rule cắn bằng hai probe rồi revert. Đã ghi lại vào migration map.
- Subagent bị hook `.skignore` chặn token `build` và đường dẫn `.next`, nên orchestrator tự chạy `pnpm build` + `pnpm typecheck` sau mỗi phase rồi commit; implementer không commit.
- Rest point 2, 3, 4 tự duyệt theo CLAUDE.md. Rebuild-spec full KHÔNG tự chạy vì là quyết định tốn tiền (ngoại lệ được phép hỏi).
- doc-writer đối soát `docs/vi/system/architecture.md` + `permissions.md` từ hai forward draft đã được reviewer xác minh khớp code; generated/features SKIP chờ rebuild-spec.
- AC9 tách đôi: phần README do reviewer kiểm; phần `docs/vi` ghi vào blast radius, evidence là cursor `last_rebuild_sha` khi rebuild-spec chạy.

### Nợ lại

- 5 file quá 200 dòng có sẵn từ base, PR không làm dài thêm: `home-copy.ts` 202, `route.test.ts` 221, `use-menu-keyboard-nav.test.ts` 382, e2e `home.spec.ts` 700, `login.spec.ts` 713.
- Lớp generated, technical-spec F001–F003, `_source-to-fcode.json`, confidence-report trỏ path cũ cho tới khi rebuild-spec chạy.
- `docs/vi/system/overview.md` stale từ trước refactor.
- Ba mục "Tôi cần làm" ở trên chặn ship; mọi thứ khác đã xong và commit local.

## 260906-2220 — ship-src-route-colocation

### Tôi cần làm

- [ ] Review và merge PR của branch `refactor/src-route-colocation` vào `main`.
- [ ] Quyết có chạy `/tkm:rebuild-spec` không (dry-run: `mode=full`, fallback `threshold_exceeded 359/37 > 0.3`). Chưa chạy thì `docs/vi/generated/**`, 3 `technical-spec.md`, `_source-to-fcode.json` và confidence-report còn trỏ path trước khi move. Ước cả triệu token nên không tự chạy.
- [ ] `docs/vi/system/overview.md` stale từ trước refactor (mô tả app 2 màn, chưa có F003) — gộp vào lần rebuild-spec ở trên.

### Decisions

- riskGate ký duyệt bởi dang.xuan.thang lúc 260906-2225, sau khi soi ba file nhạy cảm: `(protected)/layout.tsx` (gate duy nhất, `getUser()` thật, `null` → redirect), `src/dal/auth.ts` (`server-only`, fail-open `null`), `src/proxy.ts` (hạ xuống pre-check lạc quan). Fail-open ở DAL nhưng fail-closed ở cổng → đúng khuyến nghị Next.
- `riskGate` có schema đóng: thêm `signoffBy`/`signoffAt` làm gate exit 2 (`unknown/extra key`). Provenance chữ ký ghi ở đây, không nhét vào verdict JSON.
- Ship mode `official` (base `main`) dù branch là `refactor/*` — bảng suy luận của skill không liệt kê prefix này; chọn theo pattern repo (mọi PR trước đều vào `main`).
- Bump patch `0.3.0` → `0.3.1`: refactor cấu trúc, zero behavior change. Không có CHANGELOG nên Step 9 bỏ qua.
- Step 10 (journal) và Step 11 (docs) bỏ qua: `docs/journals/260906-1150-src-route-colocation-refactor.md` và commit `6248003` đã làm xong từ phiên trước.
- Licenseal 14 warning LGPL đều nằm ở `@img/sharp-*` (binary theo nền tảng, transitive từ Next image), có sẵn ở base, PR không đụng → không chặn.
- SunLint 19 warning: 5 cái S055 trên `src/proxy.ts` là dương tính giả (proxy Next không phải REST endpoint). 0 error nên không chặn.

### Nợ lại

- 5 file quá 200 dòng vẫn còn, base-identical: `home-copy.ts` 202, `route.test.ts` 221, `use-menu-keyboard-nav.test.ts` 382, e2e `home.spec.ts` 700, `login.spec.ts` 713.
- Lớp generated + technical-spec F001–F003 + `_source-to-fcode.json` trỏ path cũ tới khi rebuild-spec chạy.
- 5 link chết trên nav home: `/awards`, `/kudos`, `/standards`, `/profile`, `/admin`. Màn tiếp theo nên làm là `/awards` (MoMorph `zFYDgyj_pD`, design+spec done).
