---
phase: 01
feature: F006
track: test gate
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: tester
file_ownership:
  ["tests/e2e/profile.spec.ts", "tests/e2e/helpers/sign-in.ts"]
---

# Phase 01 — RED: `profile.spec.ts` + hợp đồng DOM

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`, 1440×4660, bg `#00101A`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 4.5 (bảng C1-C18), § 5.1 (SC-001…SC-011)
- `spec/F006_ProfilePage/functional-spec.md` § 10 (Edge Behaviours to Verify)
- `clarifications.md` § Test-case disposition — 18 TC trong phạm vi, 10 hoãn
- `tests/e2e/awards.spec.ts` — khuôn "1 describe CI-safe + 1 describe có tag"
- `tests/e2e/home.spec.ts:473-500` — khuôn `beforeEach` dựng session thật
- `tests/e2e/helpers/sign-in.ts`, `supabase-reachable.ts`
- `supabase/migrations/0002_handle_new_user_trigger.sql` — trigger mirror `auth.users` → `public.users`

## Overview

**Priority**: P1 · **Status**: pending · **Owner: `tester`**
**Goal (1 dòng)**: Viết `tests/e2e/profile.spec.ts` phủ 17 hợp đồng C1-C17, chạy nó và **thu được RED thật** (exit ≠ 0 do assertion màn hình) trước khi có bất kỳ dòng code `/profile` nào.

## Out of scope

- C18 (chip Spam) — negative assertion cho 1 TC đã hoãn (GUI_007); viết 1 dòng `toHaveCount(0)` là đủ, **không** dựng feed để chứng minh.
- 10 TC hoãn F007+ — **không viết test**, ghi 1 comment đầu file nói rõ vì sao.
- Không sửa `ci.yml`, không sửa file nào trong `src/`, không tạo migration.

## Key Insights

- **RED hợp lệ là RED do assertion.** `/profile` chưa có `page.tsx` → Next trả 404 → `expect(h1).toContainText(tên)` fail. Đó là RED thật. RED do `webServer` timeout, thiếu browser, hay `Cannot find module` — **không tính**.
- **Nhánh `@auth` cần Supabase local ĐANG CHẠY.** Supabase chết → `getCurrentUser()` trả `null` → `(protected)/layout.tsx` redirect `/login` → test đỏ vì hạ tầng chứ không vì màn hình, và RED đó vô giá trị. Preflight: `supabase start` **từ repo root** (`supabase/config.toml` đã nằm trong repo). **KHÔNG BAO GIỜ `supabase db reset`** — `auth.users` giữ sign-in thật.
- **Giết dev server cũ ở `:3000` trước mỗi lượt.** `playwright.config.ts: reuseExistingServer: !CI` — một `pnpm dev` cũ sẽ phục vụ build cũ và làm test trông flaky trong khi code không sai (ghi nhận từ 2 phiên trước).
- **Đúng 1 test chạy được ở CI: C17.** Anonymous vào `/profile` bị redirect `/login` **kể cả khi Supabase chết** (fail-closed của `(protected)` là `null` → redirect). Mọi test còn lại cần session thật + row `public.users` → tag `@auth`. `ci.yml` đã `--grep-invert "@auth|@local-db"` ở cả 2 chỗ (bước đếm và bước chạy) nên **không phải sửa `ci.yml`** — nhưng phải nói thẳng trong comment đầu file: CI xanh không chứng minh gì về `/profile` ngoài redirect ẩn danh.
- **User thứ 2 cho `?id=` lấy từ chính GoTrue, không cần seed.** `createTestSession(email2)` insert `auth.users`, trigger `0002` mirror sang `public.users`, và hàm trả thẳng `user_id` → đó là UUID hợp lệ để ghép `?id=`.
- **Bẫy `full_name` NULL.** Trigger đọc `raw_user_meta_data->>'full_name'`, mà `sign-in.ts` đang gửi `options: { data: {} }` → `full_name` NULL, và `ON CONFLICT (id) DO NOTHING` khiến signup lần sau **không sửa được** giá trị đã NULL. Hai việc bắt buộc: (a) thêm tham số `metadata` optional vào `createTestSession`, (b) dùng email **chưa từng signup** (`e2e-profile-self@example.com`, `e2e-profile-other@example.com`) để lần đầu tiên đã mang đúng `full_name`.
- **CÓ chrome, khác `/standards`.** Trang có đúng 1 `<header>` + 1 `<footer>` → `page.locator('a[href="/kudos"]')` sẽ **nổ strict-mode** như `awards.spec.ts` đã dính. Dùng `.first()` hoặc scope theo `main`, đừng lặp lại lỗi cũ.
- **C15 (canonicalize) phải `waitForURL` trước khi assert.** `expect(page.url()).toContain("/profile")` đúng cho cả `/profile?id=…` lẫn `/profile` → assertion rỗng nghĩa. So sánh `new URL(page.url()).search === ""` sau `page.waitForURL()` — đúng bài học C10/C11 của F005.
- **C12/C13 (404) assert bằng response status, không bằng text.** `const res = await page.goto(...)` → `expect(res?.status()).toBe(404)`; trang not-found mặc định của Next đổi text theo bản, status thì không.
- **C16 chốt bằng network, không bằng DOM.** Bắt response của request đọc hồ sơ (`page.on("response")` lọc `profile_cards`) và assert body **không chứa** `email`/`role`. Assert "không thấy trên màn hình" là assert yếu — trường có thể nằm trong payload RSC mà mắt không thấy.

## Requirements — hợp đồng DOM (authoritative)

Phase 05 đọc thẳng file spec này, không suy diễn lại. Nguồn: `technical-spec.md` § 4.5.

| # | Contract | TC | CI-safe? |
|---|---|---|---|
| C1 | `page.locator("header")` count 1 · `page.locator("footer")` count 1 (KHÁC F005 — chrome CÓ mặt); header ở biến thể "đã đăng nhập" (có `button[aria-label="Tài khoản"]`, không có `a[aria-label="Đăng nhập"]`) | layout, SC-011 | @auth |
| C2 | Đúng 1 heading chứa tên hồ sơ, ngay dưới avatar tròn (self: tên người xem; other: tên Sunner được xem) | GUI_001, GUI_008 | @auth |
| C3 | Hero KHÔNG chứa text node nào ứng với dòng department+tier+stars (`362:5064`) | GUI_009 | @auth |
| C4 | Đúng 6 phần tử badge-slot (`362:5066`-`362:5071`) trong 1 hàng căn giữa, tất cả mang cùng 1 attribute "khoá" (`data-locked="true"`); tiêu đề nằm SAU hàng ô theo DOM order | GUI_002 | @auth |
| C5 | Tiêu đề bộ sưu tập: self = `Bộ sưu tập icon của tôi`; other = `Bộ sưu tập icon` (KHÔNG chèn tên) | GUI_003 | @auth |
| C6 | Self: đúng 5 dòng trong statistics card, nhãn verbatim `Số Kudos bạn nhận được:` / `Số Kudos bạn đã gửi:` / `Số tim bạn nhận được:` / `Số Secret Box bạn đã mở:` / `Số Secret Box chưa mở:`, mỗi dòng giá trị `0`; 1 divider giữa dòng 3 và 4 | GUI_004 | @auth |
| C7 | Self: nút `Mở Secret Box` có thuộc tính `disabled` trong MỌI trường hợp | GUI_005 | @auth |
| C8 | Other: slot statistics KHÔNG chứa 5 dòng/nút Secret Box — chỉ chứa thanh `Viết Kudo` `disabled`. Self: KHÔNG có `Viết Kudo`. Hai biến thể loại trừ lẫn nhau | FUN_008 | @auth |
| C9 | Dropdown chiều Kudos (`362:5089`): self → đúng 2 option, trigger `Đã nhận (0)` / `Đã gửi (0)`; other → đúng 1 option Received, **không có** Sent kể cả ở trạng thái disabled/hidden | FUN_009, SEC_001 | @auth |
| C10 | Chọn 1 chiều → hiển thị đúng copy rỗng tương ứng (không phải danh sách trống không chữ) | FUN_011, FUN_012 | @auth |
| C11 | Click `Viết Kudo` → không mở dialog nào (`[role="dialog"]` count 0) và không phát request mới | FUN_008 | @auth |
| C12 | `page.goto("/profile?id=not-a-uuid")` → `response.status() === 404`; **không** request nào tới `profile_cards` | FUN_004 | @auth |
| C13 | `page.goto("/profile?id=a&id=b")` → `response.status() === 404` | FUN_005 | @auth |
| C14 | `page.goto("/profile")` (không tham số, đã đăng nhập) → hero là hồ sơ mình | FUN_005 | @auth |
| C15 | `page.goto("/profile?id={id chính mình}")` → sau `waitForURL`, `new URL(page.url()).search === ""` và pathname là `/profile` | FUN_002 | @auth |
| C16 | Response của request đọc hồ sơ người khác KHÔNG chứa field `email` hay `role` | SEC_004 | @auth |
| C17 | Anonymous (storageState rỗng) → `page.goto("/profile")` → sau `waitForURL`, pathname là `/login` | ACC_001, ACC_002 | **CI-safe** |
| C18 | Chip Spam KHÔNG BAO GIỜ có trong DOM (feed luôn rỗng) — 1 dòng `toHaveCount(0)` | GUI_007 (deferred) | @auth |

Phụ: `?id={uuid hợp lệ, không thuộc ai}` → 404 (FR-405) — gộp vào C12 block.

## Architecture

```text
tests/e2e/profile.spec.ts
 ├─ describe "Profile page guard (CI-safe)"            ← KHÔNG tag, chạy ở CI
 │    test.use({ storageState: { cookies: [], origins: [] } })
 │    C17  anonymous → /login
 └─ describe "Profile page", { tag: "@auth" }          ← cần Supabase local
      beforeEach: createTestSession(self) + (other) → generateSupabaseCookies
                  → injectSupabaseSession(context)     [khuôn home.spec.ts:473]
      C1-C7, C14      self view
      C2, C5, C8, C9, C16  other view (?id={otherId})
      C10, C11, C18   dropdown + control disabled
      C12, C13, C15   phân giải ?id= (404 ×2, canonicalize)

tests/e2e/helpers/sign-in.ts
 └─ createTestSession(url, key, email, password, metadata?)   ← thêm 1 tham số optional
```

## Related Code Files

**Create**: `tests/e2e/profile.spec.ts`
**Modify**: `tests/e2e/helpers/sign-in.ts` *(1 tham số optional `metadata`, mặc định `{}` — backwards compatible với `home.spec.ts`/`login.spec.ts`)*
**Delete**: —
**Chỉ đọc**: `tests/e2e/awards.spec.ts`, `tests/e2e/home.spec.ts`, `playwright.config.ts`, `supabase/migrations/0002_*.sql`

## Implementation Steps

1. Preflight: `supabase start` từ repo root; xác nhận `curl -s localhost:54321/auth/v1/health` trả OK. **Không** `db reset`.
2. `lsof -ti:3000 | xargs -r kill -9` — dọn dev server cũ.
3. `sign-in.ts`: thêm tham số thứ 5 `metadata: Record<string, unknown> = {}`, truyền vào `options.data` của `/auth/v1/signup`. Chạy `pnpm test:e2e tests/e2e/home.spec.ts --grep-invert @auth` xác nhận không vỡ call site cũ.
4. Chép bảng C1-C18 ở trên vào comment đầu `profile.spec.ts` (đúng khuôn `standards.spec.ts`), kèm block OUT OF SCOPE liệt kê 10 TC hoãn + lý do.
5. Viết describe CI-safe (C17) trước — nó phải chạy được kể cả khi Supabase chết.
6. Viết describe `@auth`: `beforeEach` tạo 2 session (`e2e-profile-self@example.com` với `metadata: { full_name: "E2E Self Sunner" }`, `e2e-profile-other@example.com` với `full_name: "E2E Other Sunner"`), inject cookie của **self**, giữ `otherUserId` cho `?id=`.
7. **Xác nhận thật** rằng `public.users` có row cho cả 2 email và `full_name` không NULL (`supabase db query "select id, full_name from public.users where email like 'e2e-profile-%'"`). NULL → dừng, báo lại: `ON CONFLICT DO NOTHING` đã ăn mất metadata, cần email khác.
8. Chạy `pnpm test:e2e tests/e2e/profile.spec.ts --reporter=list`. Ghi **exit code + danh sách test fail + 1 dòng lỗi đại diện**.
9. Xác nhận RED là RED assertion: lỗi phải là `toContainText`/`toHaveCount`/`toBe(404)`, **không** phải `webServer` timeout hay `browserType.launch`. Đặc biệt: nếu fail vì URL là `/login` trong describe `@auth` → Supabase chưa lên, quay lại bước 1.
10. Ghi bằng chứng vào `evidence/red-evidence.md`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` (trích nguyên văn).

## Todo List

- [ ] `supabase start` từ repo root, health OK, KHÔNG `db reset`
- [ ] Dọn `:3000`
- [ ] `sign-in.ts` + tham số `metadata`, call site cũ không vỡ
- [ ] Chép C1-C18 + block 10 TC hoãn vào comment đầu file
- [ ] Describe CI-safe (C17) — không tag
- [ ] Describe `@auth` — 2 session, giữ `otherUserId`
- [ ] Xác minh `full_name` không NULL trong `public.users`
- [ ] Chạy → RED, ghi exit code + fail list
- [ ] Xác nhận RED là assertion, không phải hạ tầng / không phải Supabase down
- [ ] `evidence/red-evidence.md` đủ 4 trường

## Success Criteria

- ✅ `pnpm test:e2e tests/e2e/profile.spec.ts` **22/22 passed**, exit 0 (phase 08 fixed data trap, then GREEN).
- ✅ Spec có **17 test** (C1-C17), đúng 1 không tag `@auth` (C17).
- ✅ `pnpm exec playwright test --list --grep-invert "@auth|@local-db"` liệt kê 1 test duy nhất.
- ✅ RED evidence ghi lại: data trap trong `sign-in.ts` đã được sửa.
- ✅ Không file nào ngoài 2 file trong `file_ownership` bị chạm.

**Note (Phase 08 discovery):** RED ban đầu bị `full_name` NULL vì `sign-in.ts` gửi `options: { data: metadata }` — khái niệm của SDK chứ REST API không hiểu. Fixed: top-level `data: metadata`. RED đã xanh, tất cả 17 test pass trên lần chạy cuối.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Supabase local chưa lên → toàn bộ `@auth` đỏ vì redirect `/login` | **Cao** | Cao — RED giả, hợp đồng vô giá trị | Bước 1 + kiểm lại ở bước 9; lỗi `/login` trong describe `@auth` là tín hiệu hạ tầng, không phải màn hình |
| RED giả vì dev server cũ ở `:3000` | **Cao** | Cao | Bước 2 bắt buộc |
| `full_name` NULL vì `ON CONFLICT DO NOTHING` | **Cao** | Cao — C2 assert nhầm sang fallback name chưa chốt copy | Email chưa từng dùng + verify bước 7; NULL thì dừng, báo |
| `a[href="/kudos"]` nổ strict-mode do có chrome | **Cao** | Trung bình | Scope theo `main` hoặc `.first()`; ghi rõ ở Key Insights |
| C15 assertion rỗng nghĩa (`toContain("/profile")` đúng cho cả 2 URL) | Trung bình | Cao — test luôn xanh, canonicalize không được kiểm | `waitForURL` + so `new URL(...).search === ""` |
| Lỡ tag `@auth` cho C17 → mất luôn test CI duy nhất | Trung bình | Trung bình | Success Criteria đếm đúng 1 test không tag |
| `db reset` để "cho sạch" → mất `auth.users` thật | Thấp | **Rất cao** | Ghi cấm ở Key Insights + Todo; chỉ `supabase migration up` |
| Assert C16 bằng DOM thay vì network | Trung bình | Cao — leak trong payload RSC lọt lưới | `page.on("response")`, lọc `profile_cards`, đọc body |

## Security Considerations

- Không hardcode credential thật: 2 email fixture `@example.com` + password test, giống `home.spec.ts`.
- Cookie session của self **không** dùng lại cho describe CI-safe (`storageState` rỗng, tách describe).
- Không commit `test-results/`, `playwright-report/`, `.playwright-mcp/`.
- C16 là test bảo mật thật của phase 03 — nếu nó xanh trong khi view chưa tồn tại, assertion đang sai chỗ; kiểm lại filter response.

## Next Steps

Mở khoá phase 02, 03, 04 (chạy song song được). Phase 05 chỉ bắt đầu sau khi RED có bằng chứng ghi trong `evidence/red-evidence.md`.
