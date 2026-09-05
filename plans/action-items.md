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

### Decisions

- Tên skill: `write-unit-tests-and-storybook-stories`. Kebab-case, tự mô tả, cùng giọng với skill `separate-hook-logic-from-components` đã có.
- Ranh giới "common component" quyết bằng **nội dung file**, không bằng thư mục — không tạo `components/common/` và không di chuyển file nào. Test 3 câu hỏi kiểm được bằng cách đọc import, nên thư mục là thừa (YAGNI).
- CI chỉ thêm `build-storybook` (bắt story hỏng), **không** thêm script kiểm tra story có *tồn tại* đủ hay không — việc đó để review người làm. Đây là option `(Recommended)` của critic.
- `Build Storybook` đặt **sau** `Typecheck`, không phải sau `Build` như plan viết: giữ cặp build→typecheck liền nhau (Next chỉ sinh `.next/types` sau khi build), đỡ vỡ khi ai đó sửa sau này.
- MSW `setupFiles` đặt ở ROOT `vitest.config.ts` — dùng chung cho cả 2 project. MSW patch tầng `http`/`fetch` của Node, không đụng jsdom.
- Coverage allowlist **không có glob `.tsx`**. Đó là cơ chế loại `components/**` và `app/**/page.tsx` khỏi mẫu số — sai khác phần mở rộng, không phải exclude list phải bảo trì.
- Ngưỡng 100% bật ở phase cuối, sau khi test đã đủ. Bật sớm là chặn cả nhánh cho tới khi có người trả nợ.
- `tsconfig.json` thêm glob `.storybook/**` (ngoài plan): glob `**/*` của TypeScript bỏ qua thư mục bắt đầu bằng dấu chấm, nên 2 file đó nằm ngoài project và lint type-aware không parse được.

### Nợ lại

- `msw-storybook-addon@3.0.0`: tài liệu đang lưu hành **sai** với bản này — không có `initialize()`, và `mswLoader` là factory `(setup?) => LoaderFunction` phải gọi mới dùng được. Đã ghi lại trong doc comment `.storybook/preview.tsx`. Nếu nâng version, kiểm lại export map trước.
- Storybook chỉ mock đăng nhập qua prop `onLoginClick`. `signInWithOAuth` là redirect top-level nên MSW không chặn được — không có cách nào diễn lại luồng OAuth thật trong Storybook.
- Con số 100% chỉ phủ lớp logic. Không nói gì về việc Server Component render đúng hay UI trông đúng; hai thứ đó vẫn thuộc Playwright và mắt người.
- Nhánh PKCE exchange **thành công thật** (Google thật) vẫn không có test tự động nào — unit test dùng MSW chỉ chứng minh handler chạy, không chứng minh Google trả gì.
- Sự cố trong lúc chạy: một lệnh có `cd` không nối bằng `&&` khiến `git checkout b7254e5` + `pnpm install --frozen-lockfile` chạy nhầm vào repo chính, detach HEAD và gỡ dependency mới. Đã khôi phục đủ (branch + file chưa commit còn nguyên). Tác dụng phụ: lần cài lại sạch đó sửa luôn lỗi Playwright không collect được test do `pnpm add` tăng dần để lại — CI luôn chạy `--frozen-lockfile` nên chưa bao giờ dính.
