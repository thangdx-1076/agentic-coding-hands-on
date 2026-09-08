# Phase 02 — RED evidence (tester sở hữu)

## Context Links

- [plan.md](./plan.md) § Integration contract, § Sửa mâu thuẫn spec
- [spec/screens/SCR009_CountdownPrelaunch/spec.md](./spec/screens/SCR009_CountdownPrelaunch/spec.md) § 3 UI Elements
- [spec/countdown-prelaunch-page/technical-spec.md](./spec/countdown-prelaunch-page/technical-spec.md) § 5.1 SC-001..SC-004
- [reports/study-260908-1653-countdown-prelaunch.md](./reports/study-260908-1653-countdown-prelaunch.md) § Hazard found
- `playwright.config.ts` (webServer env ghim cứng) · `.github/workflows/ci.yml` § job `e2e`

## Overview

**Priority:** P1 · **Status:** ✅ completed · **Effort:** 1.5h · **Deps:** 01

Commit: `175432c` (test(prelaunch): add red screen-level e2e and prelaunch-lock unit spec)

testPolicy là `e2e-red-first`, nên phải có một test e2e cấp màn, chạy được, **đỏ vì assertion thật**
trước khi ai viết dòng implementation nào. Phase này chỉ viết test. Runner đã có sẵn
(`@playwright/test` 1.62.1, `pnpm test:e2e`, `tests/e2e/*.spec.ts`) — không cài, không scaffold gì thêm.

## Key Insights

1. **Env web server cố định cho cả lượt chạy.** `playwright.config.ts` ghim
   `EVENT_START_AT: "2099-12-31T18:30:00+07:00"` và không set `PRELAUNCH_LOCK_ENABLED`. Không test nào
   lật được cờ khoá giữa chừng. Đây không phải thiếu sót cần vá — đây là ràng buộc phải thiết kế quanh nó.
2. **`toHaveURL` một mình KHÔNG tạo RED hợp lệ.** Trang 404 vẫn giữ nguyên URL `/prelaunch`, nên
   `expect(page).toHaveURL(/\/prelaunch$/)` sẽ XANH trước khi có route. RED thật phải đến từ
   `expect(response.status()).toBe(200)` và từ các assertion DOM.
3. Test này không mang tag `@auth` cũng không `@local-db` → **chạy trong CI**
   (`playwright test --grep-invert "@auth|@local-db"`). Không cần Supabase, không cần DB local.
4. RED của unit test là lỗi *không resolve được module* (`src/domain/prelaunch-lock` chưa tồn tại).
   Đó là RED phụ, không phải RED cấp màn — chính sách chỉ được thoả bằng RED e2e ở mục 2.
5. Commit của phase này để lại cây **đỏ có chủ đích**. Không mở PR, không push một mình lên CI; chờ
   phase 05 xanh rồi mới đẩy cả nhánh.

## Requirements

- Một file e2e cấp màn, durable (không phải script tạm), đặt tại `tests/e2e/prelaunch.spec.ts`.
- Một file unit vét cạn cho `planProxy`, đặt tại `src/domain/prelaunch-lock.test.ts`.
- Ghi lại `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` vào một report trong `reports/`.
- Test viết đúng theo Integration contract ở `plan.md`; phase 03/04 hiện thực theo test, không sửa test.

## Architecture

Hai tầng bằng chứng, chia theo cái mà runtime cho phép chứng minh:

```
e2e (env cố định, cờ TẮT)          unit (thuần, vét cạn)
─────────────────────────          ──────────────────────
/prelaunch render 200 + DOM        planProxy: cờ × reached × pathname
6 route cũ + /kudos không bị khoá  isPrelaunchLockEnabled: parse env
matcher mở rộng không gây regress  clamp/pad2 (đã có, không viết lại)
```

### Test matrix — cái gì phủ bởi cái gì

| Yêu cầu | e2e | unit | Ghi chú |
|---|---|---|---|
| FR-101 `/prelaunch` công khai, 200 | ✅ C1 | — | |
| FR-201 nền + lớp phủ | ✅ C4 | — | ảnh nền `aria-hidden`, không header/footer |
| FR-202 tiêu đề i18n | ✅ C2 | — | locale mặc định `vi` |
| FR-203/204 3 ô, 2 chữ số, nhãn | ✅ C3 | ✅ `countdown.test.ts` (đã có) | |
| FR-205 tick mỗi giây | ❌ | ✅ `use-countdown.test.ts` (đã có, fake timers) | màn hiển thị tới PHÚT; tick 1s không quan sát được trong một lượt e2e vài giây |
| FR-206 về 0 cả 3 ô `00` | ❌ | ✅ `countdown.test.ts` + `use-countdown.test.ts` | env e2e ghim 2099 |
| FR-002 `EVENT_START_AT` thiếu/hỏng | ❌ | ✅ `countdown.test.ts` (`parseTargetDate`) | env e2e luôn hợp lệ |
| BR-001 cờ TẮT → không route nào bị khoá (SC-003) | ✅ C6 | ✅ `planProxy` | |
| FR-102 cờ BẬT + chưa tới giờ → redirect (SC-004) | ❌ | ✅ `planProxy` vét cạn | **không lật được cờ trong e2e** |
| FR-103/BR-003 tới giờ → gỡ khoá, `/prelaunch` → `/` | ❌ | ✅ `planProxy` vét cạn | như trên |
| BR-002 danh sách miễn khoá | ❌ | ✅ `planProxy` vét cạn | |
| BR-005 route ngoài whitelist cũ trả `pass`, không gọi Supabase | ⚠️ gián tiếp C6 | ✅ `planProxy` trả `{kind:"pass"}` | e2e chỉ chứng minh "không hỏng", không chứng minh "không gọi `getUser`" |

**Nói thẳng phần e2e không với tới:** trạng thái KHOÁ và trạng thái ĐÃ-TỚI-GIỜ. Ba hướng đã cân nhắc
và loại: (a) `webServer` thứ hai với env khác — phải boot thêm một Next dev server mỗi lượt CI, và
`projects` không chọn được `webServer` riêng; (b) runner thứ hai — bị cấm rõ ràng; (c) route handler
test-only để bơm cờ — mở một cửa hậu vào production để phục vụ test. Cả ba đắt hơn giá trị. Thay vào
đó: `planProxy` là hàm thuần, nằm trong allowlist coverage 100% nên **không thể merge mà thiếu test**,
cộng recipe kiểm tay ở phase 05.

## Related Code Files

**Create:**

- `tests/e2e/prelaunch.spec.ts`
- `src/domain/prelaunch-lock.test.ts`
- `plans/260908-1653-countdown-prelaunch-page/reports/red-evidence-260908-prelaunch.md`

**Modify:** không file nào. **Delete:** không file nào.

Phase này **không được** chạm `src/proxy.ts`, `src/domain/prelaunch-lock.ts`, `messages/*.json`, hay bất
cứ file nào dưới `src/app/(public)/prelaunch/`.

## Implementation Steps

1. Viết `tests/e2e/prelaunch.spec.ts`, header comment mang bảng C1..C6 (theo đúng kiểu
   `tests/e2e/profile.spec.ts` đang dùng), `test.use({ storageState: { cookies: [], origins: [] } })`
   cho nhóm anonymous. Không tag `@auth`/`@local-db`.
   - **C1** (FR-101, SC-003): `const res = await page.goto("/prelaunch"); expect(res?.status()).toBe(200);`
     và `await expect(page).toHaveURL(/\/prelaunch$/)`.
   - **C2** (FR-202): `await expect(page.getByText("Sự kiện sẽ bắt đầu sau")).toBeVisible();`
   - **C3** (FR-203/204): `const timer = page.getByRole("timer"); await expect(timer).toHaveCount(1);`
     3 nhãn `DAYS`/`HOURS`/`MINUTES` theo thứ tự DOM; mỗi ô số khớp `/^\d{2,}$/`.
   - **C4** (FR-201): `await expect(page.locator("header")).toHaveCount(0);`
     `await expect(page.locator("footer")).toHaveCount(0);` và đúng 1 ảnh nền `[aria-hidden="true"] img`.
   - **C5** (FR-401): sau khi load xong, không có request nào tới server để giữ đếm ngược chạy — assert
     bằng `page.waitForLoadState("networkidle")` rồi đếm request trong 2s qua `page.on("request")` = 0
     (bỏ qua nếu giòn; đây là assertion "nice to have", không phải cột trụ RED).
   - **C6** (BR-001 mặc định TẮT + regression matcher): với mỗi path trong
     `["/", "/awards", "/standards", "/login", "/kudos"]` → `expect(page).toHaveURL` chính nó, không
     phải `/prelaunch`. `/kudos` có mặt vì đó là route **mới bị matcher mở rộng quét tới** ở phase 04.
2. Chạy `pnpm exec playwright test tests/e2e/prelaunch.spec.ts`. Kỳ vọng exit ≠ 0, thất bại đầu tiên là
   `expect(received).toBe(expected) // 404 vs 200` tại C1. Nếu thất bại vì dev server không lên, cài
   browser, hay lỗi TypeScript → **KHÔNG phải RED hợp lệ**, sửa rồi chạy lại.
3. Viết `src/domain/prelaunch-lock.test.ts` theo chữ ký ở `plan.md § Integration contract`. Bảng chân
   trị vét cạn: `lockEnabled ∈ {true,false}` × `reached ∈ {true,false}` × `pathname ∈ {"/", "/login",
   "/todo", "/todo/abc", "/awards", "/standards", "/profile", "/prelaunch", "/auth/callback",
   "/api/x", "/favicon.ico", "/logo.png", "/kudos", "/khong-ton-tai"}`. Cộng `isPrelaunchLockEnabled`
   với `"true"`, `"false"`, `"TRUE"`, `"1"`, `""`, `undefined` → chỉ `"true"` cho `true`.
   Luật `/prelaunch` lấy theo `plan.md § Sửa mâu thuẫn spec`: redirect `/` **chỉ khi** `lockEnabled && reached`.
4. Chạy `pnpm test:unit`. Kỳ vọng exit ≠ 0 vì không resolve được `src/domain/prelaunch-lock`.
5. Ghi report RED: đường dẫn file, lệnh đúng nguyên văn, exit code thật, và trích dòng thất bại đầu tiên.
6. Commit `test(prelaunch): add red screen-level e2e and prelaunch-lock unit spec`. **Không push riêng.**

## Todo List

- [x] `tests/e2e/prelaunch.spec.ts` với C1..C6, không tag `@auth`/`@local-db`
- [x] `pnpm exec playwright test tests/e2e/prelaunch.spec.ts` exit ≠ 0, lý do là assertion `status() 404 ≠ 200`
- [x] `src/domain/prelaunch-lock.test.ts` vét cạn bảng chân trị
- [x] `pnpm test:unit` exit ≠ 0
- [x] `reports/red-evidence-260908-prelaunch.md` có đủ 4 trường red*
- [x] commit riêng, KHÔNG mở PR ở trạng thái này

## Success Criteria

```bash
pnpm exec playwright test tests/e2e/prelaunch.spec.ts   # exit ≠ 0, C1 fail: 404 ≠ 200
pnpm test:unit                                          # exit ≠ 0, không resolve được src/domain/prelaunch-lock
```

RED hợp lệ = exit khác 0 **do assertion của màn**, không do dependency/config/browser/dev-server.
Report phải ghi đủ: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` (trích nguyên văn).

## Risk Assessment

| Risk | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| RED giả: test đỏ vì dev server cũ đang giữ cổng 3000 của project khác | Trung bình | Cao (bằng chứng vô nghĩa) | Kiểm chủ sở hữu cổng 3000 trước khi chạy; nếu bận, `E2E_PORT=3100 pnpm test:e2e` — nhưng cùng repo thì dev server vẫn thắng, phải tắt nó |
| RED giả: chỉ có `toHaveURL`, 404 vẫn xanh | Cao nếu quên | Cao | C1 bắt buộc assert `res.status()` — ghi thẳng vào bước 1 |
| Test hướng sai: seed theo bảng DEC sai của technical-spec (`/prelaunch` → `/` khi cờ tắt) | Trung bình | Cao (test không thể xanh) | `plan.md § Sửa mâu thuẫn spec` là nguồn duy nhất cho luật này; bước 3 trỏ thẳng vào đó |
| C5 (networkidle + đếm request) giòn trên CI | Trung bình | Thấp | Đánh dấu là tuỳ chọn; bỏ nếu flaky, không hạ chuẩn C1..C4 |
| Cây đỏ bị push lên CI ở trạng thái này | Trung bình | Trung bình | Bước 6 cấm push riêng; nhánh chỉ đẩy khi phase 05 xanh |
| Nhầm coverage: thêm `src/domain/*.test.ts` mà chưa có `.ts` → coverage report lỗi thay vì fail sạch | Thấp | Thấp | Đây là hành vi đúng của gate; report RED ghi rõ là RED phụ |

## Security Considerations

Test chạy anonymous, không dùng credential, không tạo session. Không thêm cửa hậu env hay route
test-only nào vào production (đã loại tường minh ở § Architecture). Không ghi giá trị `.env.local` vào
report RED.

## Rollback

Xoá 2 file test + report, hoặc `git revert` commit của phase. Không có gì trong phase này chạm code
sản phẩm nên rollback không có tác dụng phụ.

## Next Steps

Phase 03 dùng chính C1..C4 làm định nghĩa "done". Phase 04 dùng `src/domain/prelaunch-lock.test.ts`
làm định nghĩa "done" — và **không được sửa file test đó** để làm nó xanh.
