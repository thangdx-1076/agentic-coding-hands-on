---
phase: 05
feature: F001, F002
status: completed
priority: P0
effort: 1.5h
owner: tester (+ momorph-ui-implementer polish mode)
depends_on: [04]
file_ownership: ["tests/e2e/**", "playwright.config.ts", "playwright/.auth/**", "components/login/** (chỉ momorph-ui-implementer, bước polish)"]
---

# Phase 05 — Temper: GREEN, authenticated tests, visual + polish

## Context Links

- `clarifications.md` § RED evidence (redCommand, redExitCode, authSetupStatus) · § E2E contract
- `reports/tester-red-login-e2e.md` · `evidence/red-run.log`
- `research/researcher-01-supabase-google-oauth-nextjs16.md` § Q4 (chiến lược auth cho Playwright)
- `data/preview.png` (visual baseline) · `momorph/test-cases.csv` (TC c18649fa, cb42461d, 33a1dacf, f62b0c97, e76aa170)

## Overview

**Priority**: P0 · **Status**: completed · **Owner**: `tester`, `momorph-ui-implementer` (mode `polish`), `tester` re-validate.
**Completed 2026-09-05**: redCommand exit 0 (23/23 GREEN, 14 original + 8 keyboard + 1 regression), 2 authenticated test fixme removed, visual diff confirmed vs `data/preview.png`, ARIA APG keyboard nav added + mouse focus defect fixed, responsive polish validated 375/768/1280. Log: `evidence/green-run-polish.log`.

## Key Insights

- **Không được nới assertion để lấy GREEN.** Test fail → gửi bounded fix về đúng chủ sở hữu file (UI → `momorph-ui-implementer`; behavior/backend → `implementer`).
- `playwright.config.ts` hiện có 2 project cùng chạy `login.spec.ts`: `chromium` (`dependencies: ['setup']`, KHÔNG set `storageState`) và `chromium-anon` (storageState rỗng). Bật 2 test authenticated mà không sửa cấu hình → fail ở `chromium-anon`. Đây là rủi ro số 1 của phase.
- Lọc theo file (`tests/e2e/login.spec.ts`) có thể loại luôn `auth.setup.ts` khỏi lần chạy → `playwright/.auth/user.json` không được sinh. Vì redCommand phải giữ nguyên, nên **ưu tiên phương án không phụ thuộc setup-project**.
- Cookie session của `@supabase/ssr` có tên/encoding/chunking riêng (`sb-*-auth-token`, `base64-`, `.0/.1`) — đừng tự đoán, hãy để chính lib sinh ra rồi bơm vào browser context.
- `public/login/keyvisual.png` có thể vẫn thiếu → visual diff vùng hero sẽ lệch; KHÔNG chặn GREEN (E2E chỉ assert `img[alt="ROOT FURTHER"]`).

## Requirements

- GREEN: `npx playwright test tests/e2e/login.spec.ts --reporter=list` → **exit 0**, 12 test unauth pass, 0 `fixme` còn lại.
- US001/US002 (F001) qua TC f62b0c97 + e76aa170; US001 (F002) qua TC 20d87e28.
- Visual: khớp `data/preview.png` ở 1280; polish đúng TC c18649fa (hover shadow nút), cb42461d (hover highlight + pointer selector), 33a1dacf (footer fixed khi scroll).

## Architecture (auth injection — ranked)

```
1) RECOMMENDED — helper trong test, không setup-project:
   tests/e2e/helpers/sign-in.ts
     POST {SUPABASE_URL}/auth/v1/signup  (apikey + email/password, idempotent: 422 "already registered" → bỏ qua)
     createServerClient(url, key, { cookies: { getAll: () => jar, setAll: cs => jar.push(...cs) } })
       .auth.signInWithPassword(...)            ← lib tự sinh đúng tên + chunk cookie
     → context.addCookies(jar.map(→ { domain:'localhost', path:'/' }))
   describe('Authenticated') { test.beforeEach(injectSession) }   // không cần storageState

2) FALLBACK — setup-project + storageState (chỉ khi (1) không khả thi):
   tests/e2e/auth.setup.ts → storageState 'playwright/.auth/user.json'
   + chromium project set storageState, + xác nhận filter theo file vẫn chạy setup
```

## Related Code Files

**Create**: `tests/e2e/helpers/sign-in.ts` (hoặc `tests/e2e/auth.setup.ts` nếu chọn fallback)
**Modify**: `tests/e2e/login.spec.ts` (bỏ `test.fixme` ở 2 test; thêm `test.use`/`beforeEach` theo phương án chọn), `playwright.config.ts` (gộp còn 1 project chromium, per-describe storageState)
**Delete**: — (không xoá test nào)

## Implementation Steps

1. `tester`: chạy `npx playwright test tests/e2e/login.spec.ts --reporter=list`, ghi lại exit code + danh sách fail thực tế sau phase-04.
2. Fail nào thuộc UI (thiếu element, alt, role, layout) → bounded fix cho `momorph-ui-implementer`; fail nào thuộc route/redirect/cookie/i18n → `implementer`. Lặp tới khi 12 test unauth pass.
3. Chuẩn hoá cấu hình project: gộp về 1 project `chromium`, `Unauthenticated` describe dùng `test.use({ storageState: { cookies: [], origins: [] } })`, `Authenticated` describe dùng cơ chế inject ở § Architecture. Không đổi `testDir`, `baseURL`, `webServer`, `reporter`.
4. Tạo test user: `POST /auth/v1/signup` với `apikey: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trên `http://127.0.0.1:55321`. Nếu instance bắt confirm email → xác nhận qua `psql` port 55322 (`update auth.users set email_confirmed_at = now() where email = ...`). TUYỆT ĐỐI không commit service-role key hay credential test vào repo — đọc từ env/`supabase status` lúc chạy.
5. Bơm session bằng `@supabase/ssr` (§ Architecture, phương án 1) rồi bỏ `test.fixme` ở TC f62b0c97 và e76aa170.
6. Chạy lại đúng redCommand → phải exit 0. Lưu log vào `evidence/green-run.log`, báo cáo `reports/tester-green-login-e2e.md`.
7. Visual validation (`tester`, Playwright MCP): screenshot `/login` ở 1280×1022 so với `data/preview.png`; chụp thêm 375 và 768. Ghi chú riêng vùng hero nếu `keyvisual.png` chưa có.
8. Bàn cho `momorph-ui-implementer` mode `polish` (chỉ `components/login/**`): responsive 375/768/1280, hover nút Google (shadow/elevated), hover selector (highlight + `cursor: pointer`), focus-visible cho mọi control, transition mượt, footer fixed khi scroll. Kèm block MoMorph refs + `testPolicy: e2e-red-first`.
9. `tester` re-validate: screenshot lại 3 breakpoint + chạy lại redCommand → vẫn exit 0. Mismatch vật chất → quay lại bước 8 (bounded fix), không sửa test.

## Todo List

- [x] Lần chạy đầu sau phase-04: ghi exit code + fail list
- [x] Định tuyến fix theo chủ sở hữu file tới khi 12 test unauth pass
- [x] Gộp project + per-describe storageState trong `playwright.config.ts`
- [x] Tạo/confirm test user trên `saa-app`
- [x] Inject session bằng `@supabase/ssr`, bỏ 2 `test.fixme`
- [x] redCommand exit 0 + `evidence/green-run.log` + report GREEN
- [x] Visual diff vs `data/preview.png` (1280) + chụp 375/768
- [x] Polish (momorph-ui-implementer) → tester re-validate 3 breakpoint + GREEN lần 2

## Success Criteria

- `npx playwright test tests/e2e/login.spec.ts --reporter=list` → **exit 0**, 14/14 test chạy (0 fixme, 0 skip).
- `reports/tester-green-login-e2e.md` có: command, exit code, số test pass, ảnh/ghi chú visual 3 breakpoint.
- Không có assertion nào bị nới/xoá so với `evidence/red-run.log`; 12 mô tả test unauth giữ nguyên tên + TC id.
- Visual mismatch còn lại chỉ thuộc vùng `keyvisual.png` (nếu user chưa export) và được ghi chú rõ.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| 2 project cùng chạy spec → test authenticated fail ở project anon | H×H | Bước 3: 1 project + per-describe storageState/inject |
| Filter theo file loại `auth.setup.ts` → thiếu `user.json` | M×H | Chọn phương án 1 (helper trong test), không phụ thuộc setup-project |
| Tên/chunk cookie `sb-*-auth-token` đoán sai → session không được nhận | M×H | Để `@supabase/ssr` tự sinh cookie qua `setAll` jar, chỉ map sang `addCookies` |
| Instance bắt confirm email → `signInWithPassword` fail | M×M | Confirm bằng `psql` 55322; nếu vẫn chặn → báo user, giữ 2 test `fixme` + ghi DONE_WITH_CONCERNS |
| Polish làm lệch DOM (alt/role/text) → GREEN đổ | M×H | Bước 9 luôn chạy lại redCommand sau polish; contract phase-01 cấm đổi alt/role/nhãn |
| `keyvisual.png` vẫn thiếu | M×L | Ghi chú visual, không chặn GREEN |

## Security Considerations

- Credential test user chỉ tồn tại trong env/lệnh chạy, KHÔNG hardcode vào `tests/**` được commit; `.env*` đã gitignored.
- Không dùng service-role key trong test; nếu bắt buộc phải confirm user, dùng `psql` local thay vì đưa key vào code.
- `playwright/.auth/`, `test-results/`, `playwright-report/` đã có trong `.gitignore` — kiểm lại trước khi commit.
- Test chặn `**/auth/v1/authorize**` bằng `page.route` → không bao giờ gọi ra Google thật.

## Next Steps

Sau GREEN + visual pass: promote spec draft (cấp `SCR###`/`US###`/`PERM###` thật), cân nhắc `doc-writer` cho `docs/` (repo chưa có `docs/`), và `reviewer` đọc toàn bộ diff trước khi mở PR.
