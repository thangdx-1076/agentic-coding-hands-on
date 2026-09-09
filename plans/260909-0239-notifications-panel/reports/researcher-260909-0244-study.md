# Nghiên cứu codebase — Màn "Tất cả thông báo" (F012_NotificationsPanel)

Không viết code. Mọi khẳng định kèm `path:line`. Không dùng skill research/search-docs
(đây là đọc code nội bộ, không phải chọn công nghệ/thư viện — theo help skill, không
có skill nào khớp; đã fallback Read/Grep/Bash).

## 1. Đường ghi kudos

`createKudo` — `src/app/(public)/kudos/_actions/create-kudo.ts:95-165`.
- Client: `createClient()` từ `@/lib/supabase/server` (anon key + cookie session,
  `create-kudo.ts:99`) — KHÔNG service role.
- Không transaction. 1 lệnh `.insert()` duy nhất (`create-kudo.ts:144-153`), `sender_id`
  luôn lấy từ `user.id` server-side, không tin client (`create-kudo.ts:104-106,146`).
- Ảnh upload TRƯỚC insert (AD-5); insert lỗi → best-effort xoá ảnh đã upload
  (`create-kudo.ts:155-157`), không rollback DB thật (chỉ 1 bảng ghi nên không cần).
- Đọc board: `getKudosBoard` (`src/dal/kudos.ts:95-144`) fail-open về `EMPTY_BOARD`
  khi lỗi bất kỳ trong 3 read (`kudos.ts:141-143`) — pattern fail-open cho mọi read
  không có auth guard.

## 2. Đường thả tim

`toggleKudoHeart` — `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61`.
- KHÔNG upsert. Đọc row có sẵn (`selectHeartId`) rồi delete hoặc insert
  (`toggle-kudo-heart.ts:76-100`). Race 2 click cùng lúc: loser insert dính unique
  violation `23505` → re-select thay vì lỗi (`toggle-kudo-heart.ts:96-98`).
- Fail CLOSED (khác board): mọi lỗi ném exception, action trả `{ok:false}`
  (`toggle-kudo-heart.ts:58-60`) — vì ghi sai sẽ làm lệch `heart_count`.
- Trigger SQL: CÓ. `sync_kudo_heart_count()` SECURITY DEFINER, AFTER INSERT/DELETE trên
  `kudo_hearts`, cộng/trừ `kudos.heart_count` (`0007_kudo_hearts.sql:99-129`). Đây là
  WRITER DUY NHẤT của `heart_count` — `authenticated` không có UPDATE trên `kudos`
  (comment `0007_kudo_hearts.sql:19-21`).
- `UNIQUE(kudo_id, user_id)` chặn race, không check ở app code (`0007:39-46`).
  Policy INSERT chặn tự tim kudo của mình bằng `WITH CHECK` (`0007:78-84`), không phải
  disable nút.

## 3. Pattern DAL

Đối chiếu `kudos.ts`+`kudos-client.ts`, `secret-box.ts`+`secret-box-client.ts`,
`kudo-hearts.ts` (không client-split vì chỉ 1 method đơn giản).
- Tách 2 file: file KHÔNG hậu tố `-client` chứa type + logic thuần (nhận
  `client: XxxClient` injected, KHÔNG tự `createClient()`), luôn có `import "server-only"`
  đầu file (`kudos.ts:1`, `secret-box.ts:1`, `kudo-hearts.ts:1`). File `-client.ts`
  export 1 hàm `toXxxClient(supabase)` bọc SDK thật thành interface hẹp đó
  (`kudos-client.ts:57-74`, `secret-box-client.ts:19-25`).
- Interface injection: type `XxxClient` định nghĩa CHỈ đúng method chain DAL cần dùng
  (không dùng `SupabaseClient` đầy đủ) — để test stub dễ và né lỗi TS2589 "type
  instantiation quá sâu" khi generic Supabase quá phức tạp (`kudos-client.ts:24-30`,
  giải thích lý do ở `41-43`).
- Return shape: 2 kiểu tuỳ rủi ro dữ liệu — đọc KHÔNG auth-guard (board, hearted-ids)
  fail OPEN về giá trị rỗng an toàn (`kudos.ts:141-143`, `kudo-hearts.ts:62-69`); RPC/ghi
  nhạy dữ liệu (secret-box) THROW khi shape lạ, không đoán bừa (`secret-box.ts:14-16`).
- `secret-box.ts` là `.rpc()` đầu tiên trong repo (comment `secret-box.ts:5-6`,
  `0011_secret_box.sql:6`) — dùng làm mẫu nếu unread-count cần 1 RPC tổng hợp.

## 4. Pattern server action

Đối chiếu `create-kudo.ts`, `toggle-kudo-heart.ts`, `open-secret-box.ts`, `logout.ts`.
- `"use server"` dòng đầu file (mọi file, vd `create-kudo.ts:1`).
- Validate: KHÔNG tin input client. Re-derive `user` từ session
  (`supabase.auth.getUser()`) trong MỌI action (`create-kudo.ts:100-106`,
  `toggle-kudo-heart.ts:44-51`), không nhận `userId` tham số. Validate field bằng
  module dùng chung với client (`validateKudoDraft`, `create-kudo.ts:6-8,116`).
- Trả về: union `{ok:true,...} | {ok:false, reason: "..."}`, KHÔNG throw ra ngoài —
  toàn bộ thân hàm bọc try/catch, catch-all trả `{ok:false, reason:"error"|"unknown"}`
  (`create-kudo.ts:162-164`, `open-secret-box.ts:35-37`).
- Revalidate: `revalidatePath(ROUTES.KUDOS)` sau ghi thành công
  (`create-kudo.ts:160`, `toggle-kudo-heart.ts:56`) — NHƯNG `open-secret-box.ts` CỐ Ý
  KHÔNG revalidate (comment `open-secret-box.ts:25-29`: revalidate giữa lúc dialog đang
  mở sẽ unmount dialog dưới chân user). Cân nhắc tương tự cho panel thông báo nếu
  mark-read xảy ra trong lúc popup đang mở.

## 5. Layout truyền viewer

KHÔNG có layout chung bọc `SiteHeader`. `(public)` không có `layout.tsx` riêng (chỉ có
`src/app/layout.tsx` gốc và `src/app/(protected)/layout.tsx` — layout đó chỉ là auth
gate, không render chrome: `(protected)/layout.tsx:19-28`).

4 nơi render `SiteHeader` thật (không tính comment/type-only):
- `src/app/(public)/(home)/_components/home-screen.tsx` ← `(home)/page.tsx:29`
  gọi `getViewer()`.
- `src/app/(public)/awards/_components/awards-screen.tsx` ← `awards/page.tsx:40`
  gọi `getViewer()`.
- `src/app/(public)/kudos/_components/kudos-screen.tsx` ← `kudos/page.tsx:62`
  gọi `getViewer()`.
- `src/app/(protected)/profile/_components/profile-screen.tsx` ← `profile/page.tsx:62,106`
  KHÔNG gọi `getViewer()` — tự gọi `getCurrentUser()` + `getUserRole()` riêng, build
  `viewer` object tay (`profile/page.tsx:62,98-101,116`). Trùng logic với
  `get-viewer.ts:21-34` nhưng không tái dùng.
- `/standards` KHÔNG có header (`standards-screen.tsx:31-33` nói rõ cố ý không bọc
  `SiteHeader`) — loại khỏi phạm vi.

`unreadCount` hiện mặc định `0`, không ai truyền (`site-header.tsx:41`,
`SiteHeaderProps.unreadCount?: number` — `site-header.tsx:18`).

**Chỗ ít sửa nhất**: không có 1 điểm chèn duy nhất vì thiếu layout dùng chung. Ít file
nhất = mở rộng `getViewer()` (`src/app/_utils/get-viewer.ts:21`) trả thêm `unreadCount`
(gộp vào `SiteViewer` hoặc trả tuple), rồi sửa 3 page.tsx đã gọi `getViewer()`
(home/awards/kudos) + sửa riêng `profile/page.tsx` (đường viewer khác, phải patch tay).
Tổng 4 page.tsx + 1 util + `site-header.tsx` (đổi UI badge số) + `notification-bell.tsx`
(đổi UI panel) = 7 file, không tránh được vì kiến trúc route-colocated cố tình không
cho 1 route import helper của route khác.

## 6. RLS + migration pattern

Đối chiếu `0007_kudo_hearts.sql` + `0011_secret_box.sql`. Migration mới sẽ là
**`0012_*.sql`** (0001-0011 đã dùng, `ls supabase/migrations`).

- Đặt tên policy: `<table>_<action>_<scope>` — vd `kudo_hearts_select_all`,
  `kudo_hearts_insert_own`, `secret_box_openings_select_own` (`0007:67-90`,
  `0011:100-104`). Luôn `DROP POLICY IF EXISTS` trước `CREATE POLICY` (idempotent).
- Bật RLS: LUÔN cả 2 dòng `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
  (`0007:56-57`, `0011:88-89`).
- REVOKE ALL trước, từ CẢ 3 role (`anon, PUBLIC, authenticated`) NGAY sau khi tạo bảng,
  trước khi GRANT lại có chọn lọc — lý do: default privilege của instance này cấp quyền
  rộng cho object mới trong schema `public` (comment lặp lại y hệt ở cả 2 file:
  `0007:59-62`, `0011:91-95`).
- Comment: MỌI `TABLE`/`COLUMN`/`FUNCTION` đều có `COMMENT ON` giải thích lý do thiết
  kế, không chỉ mô tả suông (`0007:48-49,121-122`, `0011:78-81,182-183`).
- `SECURITY DEFINER`: CÓ dùng, cho hàm là writer duy nhất khi `authenticated` không có
  quyền ghi trực tiếp — luôn kèm `SET search_path = public, pg_temp` để chặn privilege
  escalation qua search_path (`0007:99-104`, `0011:116-121`). Áp dụng nếu server ghi
  `notifications` cần một cột tổng hợp (kiểu `read_at`) mà client không được tự sửa
  trực tiếp, hoặc cần đếm tổng hợp qua RPC.
- Index: luôn thêm index đúng cột mà DAL sẽ filter (`idx_kudo_hearts_user_id`,
  `idx_secret_box_openings_user_id` — `0007:53-54`, `0011:85-86`).

## 7. E2E pattern

`playwright.config.ts:29` → `testDir: "./tests/e2e"`. `pnpm test:e2e` = `playwright test`
(`package.json:18`) — theo memory đã xác nhận trước đó, chạy bare `pnpm test:e2e <file>`
LỌC theo file; chỉ token `--` literal mới chạy tất cả 135 test.

- Tag: `{ tag: "@auth @local-db" }` trên `test.describe` block
  (`tests/e2e/secret-box.spec.ts:172,476`) — không tag ở từng `test()` riêng lẻ.
- RED-first: file có header comment tự khai "Policy: e2e-red-first... Tests FAIL now"
  (`secret-box.spec.ts:32-33`) và liệt kê rõ TC ID map sang từng `test()`
  (`secret-box.spec.ts:41-51`).
- Seed user: `createTestSession` + `generateSupabaseCookies` + `injectSupabaseSession`
  từ `tests/e2e/helpers/sign-in.ts` (`secret-box.spec.ts:6-10`) — gọi GoTrue REST trực
  tiếp (signup, fallback password grant nếu đã tồn tại), KHÔNG qua UI login.
- Cleanup: `deleteTestUser` từ `tests/e2e/helpers/service-role.ts` (`secret-box.spec.ts:10`).
  Key service-role tự derive: env trước, fallback `npx supabase status -o env`
  (`service-role.ts:24-40`) — chỉ cache khi THÀNH CÔNG, không cache thất bại
  (comment giải thích lý do ở `service-role.ts:1-21`).
- Helper khác có sẵn: `promote-to-admin.ts`, `supabase-reachable.ts`
  (`ls tests/e2e/helpers`).
- `webServer` tự chạy `pnpm dev --port $E2E_PORT` nếu chưa có server, mặc định port
  3000, `reuseExistingServer` chỉ áp dụng off-CI (`playwright.config.ts:22-65`) — nhắc
  lại rủi ro dev-server-lạ đã ghi trong memory trước.

## 8. i18n

`messages/{vi,en}.json` — namespace PHẲNG theo tên page:
`login, todo, home, awards, standards, profile, kudos, prelaunch`
(`python3 -c "print(list(json.load(open('messages/vi.json')).keys()))"`).

**Phát hiện quan trọng, khác với `clarifications.md`**: KHÔNG có namespace
`notifications.*` cấp cao nhất. Chuông + panel copy sống LỒNG trong namespace
`home`: `home.header.*` (`messages/vi.json:21-26`) và `home.notifications.empty`
(`messages/vi.json:97-99`). Mọi page khác (awards, kudos, profile) đều mượn lại namespace
này qua một biến `tHome = getTranslations("home")` riêng, KHÔNG có namespace `notifications`
của riêng chúng:
- `awards/page.tsx:45,98,121` — `tHome("header.notificationsLabel")`, `tHome("notifications.empty")`.
- `kudos/page.tsx:68` — khai `tHome` (dùng tương tự).
- `profile/page.tsx:105` — khai `tHome` (dùng tương tự).

Đây là pattern DRY đã có sẵn trong repo — mở rộng message thông báo (kudos_received,
heart_received, kudos_hidden, secret_box_available) nên đi vào `home.notifications.*`
cho khớp pattern, KHÔNG tạo namespace `notifications` cấp cao mới như clarifications.md
đang giả định. Đây là điểm lệch cần chốt lại (xem "Câu hỏi còn treo").

- Đọc: 100% server-side qua `getTranslations(ns)` từ `next-intl/server`, gọi trong
  `page.tsx` rồi build 1 object `copy` truyền xuống Client Component bằng props
  (`home/page.tsx:35,50-129`). **KHÔNG có `useTranslations` (client) ở đâu trong
  `src` cả** (`grep -rln "useTranslations" src` → rỗng) — `notification-bell.tsx` nhận
  `emptyStateText` string sẵn qua prop, không tự gọi i18n.
- `t.rich` — **CHƯA dùng ở đâu trong repo** (`grep -rln "t.rich\|\.rich("` → rỗng).
  Cần cho message có link "Tiêu chuẩn cộng đồng" (`kudos_hidden`) sẽ là lần đầu tiên
  dùng `t.rich`, không có mẫu nội bộ để soi — phải tra doc `next-intl` khi implement.
- Mảng/object leaf dùng `t.raw` + ép kiểu, có test `messages-parity.test.ts` giữ 2 file
  vi/en đồng bộ số lượng/thứ tự (`home/page.tsx:44-48,89`).

## 9. Unit test + Storybook

- Test file: `*.test.ts` NẰM CẠNH source, cùng thư mục (`src/dal/kudos.test.ts` cạnh
  `kudos.ts`, `secret-box-client.test.ts` cạnh `secret-box-client.ts` — `ls src/dal`).
- `vitest.config.ts:26-70`: 2 project trong 1 config qua `projects` (vitest ≥3.2,
  KHÔNG dùng `workspace` đã deprecated — comment `vitest.config.ts:6-8`):
  - `node`: `src/**/*.test.ts` trừ `src/hooks/**` và `src/app/**/_hooks/**`
    (`vitest.config.ts:66-68` khoảng dòng include/exclude).
  - `jsdom`: chỉ `src/hooks/**/*.test.ts` và `src/app/**/_hooks/**/*.test.ts`.
  Alias `@/` map `./src/` (`vitest.config.ts:29-32`); `server-only` bị stub thành file
  giả (`vitest.config.ts:33-37`) vì package đó throw ngoài `react-server` condition.
  `coverage.include` là ALLOWLIST tường minh, CỐ Ý không có glob `.tsx` nào (comment dài
  `vitest.config.ts` ~70-90) — component `.tsx` KHÔNG vào coverage number, do đó
  `notification-bell.tsx` (client component) sẽ không tính coverage, chỉ DAL/action
  `.ts` mới tính.
  Script: `pnpm test:unit` = `vitest run` (`package.json:19`).
- Storybook: `notification-bell.stories.tsx` — CSF3, `Meta<typeof Comp>` +
  `satisfies`, `decorators` bọc nền tối để nhìn rõ nút trắng
  (`notification-bell.stories.tsx:12-24`). Có `play` function dùng
  `storybook/test` (`userEvent`, `within`, `expect`) để click mở panel và assert
  `role="dialog"` (`notification-bell.stories.tsx:59-68`) — mẫu này dùng lại được
  cho story "panel có danh sách thông báo, mark-read".
  Import từ `@storybook/nextjs-vite` (`notification-bell.stories.tsx:1`) — xác nhận
  builder Storybook của repo là Vite, không phải webpack.

## Câu hỏi còn treo

- `clarifications.md` giả định namespace i18n mới `notifications.*` cấp cao nhất,
  nhưng pattern thật của repo là lồng trong `home.notifications.*` và mọi page mượn
  qua `tHome`. Nên sửa lại quyết định cho khớp DRY, hoặc nếu cố ý tách namespace riêng
  thì cần nói rõ lý do lệch pattern (huỷ giả định cũ trong clarifications.md).
- `profile/page.tsx` không dùng `getViewer()` mà tự lặp logic — khi thêm `unreadCount`
  cần quyết định: patch riêng đường profile (giữ nguyên độ trùng lặp hiện có), hay
  nhân dịp này refactor profile để gọi `getViewer()` (đổi phạm vi ngoài yêu cầu ban đầu,
  rủi ro phình PR). Không tự chốt vì đụng file ngoài phạm vi màn thông báo.
- Chưa có RPC/bảng `notifications` thật trong migrations (0001-0011) — việc thiết kế
  bảng `notifications` (cột nào, có cần bảng riêng "đã đọc" hay 1 cột `read_at`) không
  nằm trong phạm vi nghiên cứu này, cần quyết định ở bước plan.
