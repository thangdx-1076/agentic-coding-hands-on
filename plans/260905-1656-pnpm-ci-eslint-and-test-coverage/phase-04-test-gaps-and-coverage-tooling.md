---
phase: 04
status: pending
priority: P1
effort: 3.5h
owner: tester
depends_on: [03]
file_ownership: ["tests/e2e/**", "lib/i18n/messages-parity.test.ts", "vitest.config.ts", "package.json"]
---

# Phase 04 — Bù khoảng trống test + bật coverage tooling

## Context Links

- `clarifications.md` § Stage 1 ("Viết bù top 3" + parity + coverage) · § Step 2b (tag `@auth` + `--grep-invert`, giữ 1 file `login.spec.ts`) · § Known trade-off
- `plans/reports/researcher-260905-1624-test-coverage-audit.md` § 3 (khoảng trống có tên), § 5 (xếp hạng)
- `spec/system/architecture.md` § Data Flow → "Test topology"
- Code liên quan: `app/auth/callback/route.ts`, `app/login/page.tsx:73-83`, `app/todo/page.tsx:17-25`, `app/todo/actions.ts`, `tests/e2e/helpers/sign-in.ts`

## Overview

**Priority**: P1 · **Status**: pending
Phủ 5 hạng mục đã chốt: E2E `/auth/callback`, E2E click logout thật, E2E mô phỏng Supabase chết (fail-open vs fail-closed), unit test parity key `messages/{vi,en}.json`, và bật coverage tooling. Đồng thời gắn tag `@auth` cho mọi test cần Supabase sống — đây là điều kiện tiên quyết của phase 06.

Phase này giữ **toàn quyền** `tests/e2e/**`. Phase 02 và 03 đã sửa và reformat `login.spec.ts` xong xuôi trước đó, nên không có tranh chấp file.

## Key Insights

- **Playwright `page.route()` KHÔNG chặn được request phía server.** `getUser()` ở `/login` và `/todo` chạy trong tiến trình Next.js, đi thẳng tới `127.0.0.1:55321`; interception chỉ áp cho request của trình duyệt. Không có mẹo nào trong test body làm Supabase "chết" đối với server. Cách duy nhất khả thi là **chạy dev server với `NEXT_PUBLIC_SUPABASE_URL` không tới được** — mà đó chính xác là trạng thái mặc định trong CI (placeholder). Vậy nên: test outage **chạy được trong CI mà không cần làm gì**, và ở máy dev đang bật `saa-app` thì nó phải tự skip.
- Guard skip phải KHÔNG BAO GIỜ skip trong CI: `test.skip(!process.env.CI && supabaseReachable, ...)`. Ở máy dev có `saa-app` → skip; trong CI → luôn chạy. "CI xanh nhờ skip im lặng" là thứ bị cấm thẳng ở brief này.
- **Nghi vấn phải đo trước khi assert**: audit gọi `/todo` là "fail-CLOSED do throw không bắt". Nhưng `supabase-js` khi lỗi mạng thường **trả `{ user: null, error }` chứ không throw** — và bằng chứng ủng hộ điều đó: researcher thấy 21/23 test qua được khi không có Supabase, trong đó có test `GET /todo → /login`. Nếu `getUser()` throw thật thì test đó đã 500. Do vậy step đầu của hạng mục outage là **đo hành vi thật**, rồi mới viết assertion. Nếu hoá ra `/todo` redirect chứ không 500, thì phát hiện đó bác bỏ chính giả định của audit — ghi nhận nó, đừng bẻ test cho khớp câu chuyện cũ.
- Assertion nên nhắm **hợp đồng quan sát được**, không nhắm cơ chế: khi Supabase không tới được, `/login` vẫn render form (fail-OPEN), còn `/todo` **không bao giờ render nội dung todo** (redirect hay 5xx đều đạt). Cách viết này đúng với cả hai cơ chế và vẫn là guard hồi quy thật.
- **`/auth/callback` không đồng nhất về nhu cầu Supabase.** Đọc `route.ts`: nhánh `?error=` và nhánh thiếu code đều return redirect **trước khi** chạm `createClient()` → không cần Supabase → thuộc tập CI-safe. Chỉ nhánh có `?code=` mới gọi tới GoTrue. Đưa 2 nhánh đầu vào tập CI-safe là **áp dụng đúng luật đã chốt** ("CI chạy tập không cần Supabase"), không phải mở lại quyết định.
- **Nhánh `?code=` thành công có thể không dựng nổi.** `exchangeCodeForSession` cần một code PKCE thật khớp code-verifier trong cookie của cùng browser client — thứ chỉ sinh ra sau một vòng Google thật. Timebox 45 phút cho hướng magic-link/OTP PKCE trên GoTrue local; không được thì ghi gap công khai vào plan. **Tuyệt đối không chế token giả để test "xanh"** — một test xanh sai còn tệ hơn một khoảng trống được ghi nhận.
- Test logout **bắt buộc** cần session thật (phải vào được `/todo` mới có nút để bấm) → `@auth`, local-only.
- Coverage: dùng script **riêng** `test:unit:coverage`, giữ nguyên `test:unit`. Job `quality` của phase 05 gọi `test:unit`; tách script ra là xoá sạch tương tác giữa hai phase đang chạy song song.
- **Không đặt ngưỡng coverage.** Vitest chỉ chạy `lib/**/*.test.ts` (2 file logic thuần, environment `node`); phần lớn app là JSX/guard mà runner này không chạy được. Một con số % ở đây là hình thức, không phải tín hiệu. Bật công cụ, báo cáo con số, không gate.

## Requirements

- Mọi test cần Supabase sống mang tag `@auth`; `pnpm exec playwright test --grep-invert @auth` phải xanh khi **không** có Supabase nào chạy.
- Giữ đúng một file `tests/e2e/login.spec.ts`, không thêm Playwright project, không tách file.
- Test mới bám đúng ID spec: ROUTE001, US002-C2/C3, US003, PERM002 (fail-open), PERM003 (fail-closed), PERM004 (integration).
- `lib/i18n/messages-parity.test.ts` khẳng định tập key của `messages/vi.json` và `messages/en.json` bằng nhau **theo cả hai chiều**, đệ quy qua key lồng.
- `@vitest/coverage-v8` được cài, `vitest.config.ts` có block `coverage`, không có `thresholds`.
- Mọi test mới phải qua bộ lint của phase 02 (`missing-playwright-await` đang bật) trước khi coi là xong.

## Architecture

```
tests/e2e/login.spec.ts   (một file, chia bằng TAG)
├── describe 'Unauthenticated'                      ─ CI-safe
│    ├── (14 test hiện có)
│    ├── NEW  /auth/callback?error=access_denied   → /login?error=access_denied     [ROUTE001, US002-C3]
│    ├── NEW  /auth/callback (không code, không error) → /login?error=auth_code_error [ROUTE001]
│    └── NEW  /auth/callback?code=x&next=https://evil.com → không rời origin        [PERM004 integration]
├── describe 'Supabase unavailable'                 ─ CI-safe, skip khi local có saa-app
│    ├── NEW  /login vẫn render form                                                [PERM002 fail-open]
│    └── NEW  /todo không bao giờ render nội dung todo                              [PERM003 fail-closed]
└── describe 'Authenticated', { tag: '@auth' }      ─ local-only
     ├── (2 test hiện có)
     ├── NEW  click logout → /login, rồi vào lại /todo → /login lần nữa             [US003, BL002 signOut]
     └── NEW  /auth/callback?code=<invalid> → /login?error=auth_code_error          [ROUTE001 nhánh exchange]
          └── (timebox) nhánh code hợp lệ → safeNextPath redirect                   [US002-C2]

lib/i18n/messages-parity.test.ts   vi.json ⇄ en.json, so key đệ quy hai chiều       [MODEL003]
vitest.config.ts  coverage: provider v8, reporter text+html, KHÔNG thresholds
```

## Related Code Files

**Create**: `lib/i18n/messages-parity.test.ts`
**Modify**: `tests/e2e/login.spec.ts` (tag + 7 test mới), `tests/e2e/helpers/sign-in.ts` (nếu cần helper probe Supabase — hoặc thêm `tests/e2e/helpers/supabase-reachable.ts`), `vitest.config.ts`, `package.json`
**Delete**: —

## Implementation Steps

1. `pnpm add -D @vitest/coverage-v8`; thêm block `coverage` vào `vitest.config.ts` (provider `v8`, reporter `["text","html"]`, `reportsDirectory: "coverage"` — đã nằm trong `.gitignore`), và script `"test:unit:coverage": "vitest run --coverage"`. **Không** đổi `test:unit`.
2. `pnpm test:unit:coverage` — ghi con số thu được vào `evidence/coverage-baseline.txt`. Đây là lần đầu repo có một con số coverage; giá trị của nó là điểm mốc, không phải cổng.
3. `lib/i18n/messages-parity.test.ts`: đọc cả hai JSON, làm phẳng key đệ quy thành mảng path (`login.subtitle`, `todo.logout`, ...), assert hai tập bằng nhau hai chiều với thông báo lỗi nêu đích danh key thiếu. Chạy đỏ trước bằng cách thêm tạm một key vào `vi.json`, xác nhận nó bắt được, rồi gỡ ra.
4. Gắn `test.describe('Authenticated', { tag: '@auth' }, ...)` cho block hiện có.
5. **Cổng CI-safe (làm ngay tại đây, không để cuối)**: tắt `saa-app`, đặt `NEXT_PUBLIC_SUPABASE_URL` về một host chết (ví dụ `http://127.0.0.1:1`) trong `.env.local` cục bộ, chạy `pnpm exec playwright test --grep-invert @auth`. Phải xanh. Đây là mô phỏng chính xác điều kiện CI — chứng minh trước, đừng để phase 06 mới phát hiện.
6. Ba test `/auth/callback` CI-safe (nhánh `?error=`, thiếu code, `next=` độc hại): dùng `page.goto()` và assert URL đích + `?error=` code. Nhánh `next=https://evil.com` assert URL cuối vẫn nằm trong origin — chứng minh `safeNextPath` được nối dây thật, chứ không chỉ đúng ở mức unit.
7. **Đo trước, assert sau** cho outage: với Supabase không tới được, ghi lại status + URL cuối của `GET /login` và `GET /todo` vào `evidence/outage-probe.txt`. Rồi viết 2 test assert đúng hành vi đo được, theo dạng hợp đồng ở § Key Insights. Nếu `/todo` redirect thay vì 500, ghi thẳng phát hiện đó vào `evidence/` và vào § Next Steps — nó bác bỏ giả định "uncaught throw" của audit.
8. Helper `supabaseReachable()`: fetch `${url}/auth/v1/health` với timeout ngắn. Trong describe outage: `test.skip(!process.env.CI && await supabaseReachable(), 'local Supabase is up — outage path not exercisable here')`. Trong CI không bao giờ skip.
9. Test logout (`@auth`): tái dùng `createTestSession` + `injectSupabaseSession`, vào `/todo`, bấm nút logout thật, chờ `/login`, rồi `page.goto('/todo')` lần nữa và assert lại bị đẩy về `/login`. Đây là điểm duy nhất trong toàn bộ suite mà `logoutAction`/`signOut()` được gọi.
10. Test callback `?code=<invalid>` (`@auth`) → `/login?error=auth_code_error`.
11. **Timebox 45 phút** cho nhánh code hợp lệ (US002-C2): thử mint code PKCE thật qua magic-link/OTP trên GoTrue local. Được thì thêm test; không được thì DỪNG, ghi gap vào § Next Steps của phase này và báo orchestrator. Không fake.
12. `pnpm lint --max-warnings 0` + `pnpm format:check` — code test mới phải qua chuẩn của phase 02/03.
13. Verify đủ hai chế độ: (a) không Supabase → `pnpm exec playwright test --grep-invert @auth` exit 0; (b) `saa-app` chạy + `.env.local` thật → `pnpm test:e2e` exit 0 với toàn bộ test.
14. Commit theo hạng mục: `test(i18n)`, `test(e2e): auth callback`, `test(e2e): logout`, `test(e2e): supabase outage`, `chore(test): enable vitest coverage`.

## Todo List

- [ ] `@vitest/coverage-v8` + block coverage + script `test:unit:coverage` (không đụng `test:unit`)
- [ ] Ghi coverage baseline vào `evidence/`
- [ ] `messages-parity.test.ts` — verify đỏ trước rồi mới xanh
- [ ] Tag `@auth` cho block `Authenticated`
- [ ] Cổng CI-safe: `--grep-invert @auth` xanh khi không có Supabase
- [ ] 3 test `/auth/callback` CI-safe (error / thiếu code / next độc hại)
- [ ] Đo hành vi outage thật, ghi `evidence/outage-probe.txt`
- [ ] Helper `supabaseReachable()` + skip có điều kiện không bao giờ skip trong CI
- [ ] 2 test outage (fail-open `/login` vs fail-closed `/todo`)
- [ ] Test logout thật (`@auth`)
- [ ] Test callback `?code=<invalid>` (`@auth`)
- [ ] Timebox 45' nhánh code hợp lệ — được thì thêm, không thì ghi gap
- [ ] lint 0 warning + `format:check` xanh
- [ ] Verify cả hai chế độ (không Supabase / có saa-app)

## Success Criteria

| Command | Expected |
|---|---|
| `pnpm test:unit` | exit 0, ≥33 test (32 cũ + parity) |
| `pnpm test:unit:coverage` | exit 0, in ra bảng coverage (không có ngưỡng) |
| `pnpm exec playwright test --grep-invert @auth` **khi không có Supabase** | exit 0, ≥19 test chạy, **0 test skip** |
| `pnpm test:e2e` (saa-app chạy) | exit 0, toàn bộ test pass |
| `pnpm exec playwright test --grep @auth --list` | liệt kê đúng 4 test (2 cũ + logout + callback invalid-code) |
| `pnpm lint --max-warnings 0` | exit 0 |
| `pnpm format:check` | exit 0 |

## Rollback

Mỗi hạng mục một commit → revert được từng phần. Chỉ có `package.json` + `vitest.config.ts` là thay đổi ngoài thư mục test; revert chúng không chạm code chạy thật. **Không phase nào ở đây sửa source của app** — rollback trọn phase 04 đưa repo về đúng trạng thái cuối phase 03. Cảnh báo duy nhất: phase 06 phụ thuộc tag `@auth`; revert phase 04 mà giữ phase 06 sẽ khiến CI chạy cả test authenticated và đỏ. Revert theo thứ tự ngược: 06 trước, rồi 04.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Nhánh `?code=` hợp lệ không dựng nổi cặp PKCE | M×M | Timebox 45'; ghi gap công khai; KHÔNG chế token giả |
| `/todo` khi Supabase chết lại redirect chứ không 500 → assertion sai ngay từ đầu | H×M | Bước 7 đo trước khi assert; assertion viết theo hợp đồng quan sát được, không theo cơ chế |
| Test outage skip im lặng trong CI → xanh giả | M×H | Điều kiện skip có `!process.env.CI`; Success Criteria đòi **0 test skip** khi chạy không Supabase |
| Test mới lại dính lỗi floating promise trong `page.route` | M×M | `missing-playwright-await` của phase 02 đang bật; bước 12 là cổng bắt buộc |
| Test logout flaky vì Server Action redirect đua với `waitForURL` | M×M | `waitForURL('/login')` có timeout tường minh; assert lần thứ hai (`/todo` → `/login`) mới là khẳng định thật, không phụ thuộc timing của lần đầu |
| Session test dồn lại trên `saa-app` sau nhiều lần chạy | M×L | `createTestSession` đã dùng email `randomUUID`; không đổi hành vi này |
| Đặt ngưỡng coverage rồi CI đỏ vì lý do vô nghĩa | L×M | Chốt: không `thresholds` (§ Key Insights) |

## Security Considerations

- Test `next=https://evil.com` đi xuyên route thật là guard open-redirect ở mức **integration** — trước phase này chỉ có `safeNextPath` được test ở mức hàm thuần, chưa từng có gì chứng minh route thực sự gọi nó.
- Test outage khoá cứng bất đối xứng có chủ đích: `/login` fail-OPEN (sự cố tạm thời không được nhốt người dùng ngoài cửa), `/todo` fail-CLOSED (không bao giờ render nội dung khi chưa xác thực được). Trượt về bất kỳ chiều nào cũng là lỗi bảo mật hoặc lỗi khả dụng — giờ đã có test chặn.
- Test không được log `code`, `access_token` hay `error_description` ra reporter.
- Không đưa credential thật vào file test; mọi giá trị lấy từ env như helper hiện có.

## Next Steps

Phase 06 dùng tag `@auth` vừa gắn để dựng `--grep-invert @auth` trong CI. Nếu bước 11 không mint được code PKCE, ghi vào đây trước khi đóng phase: **US002-C2 (nhánh callback thành công) vẫn chưa được phủ ở bất kỳ đâu** — và giới hạn đó phải xuất hiện trong notice của `ci.yml`, không được chỉ nằm trong plan.
