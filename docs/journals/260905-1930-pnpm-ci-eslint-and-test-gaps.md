---
title: "npm → pnpm → CI + ESLint standard — test suite lied, GitHub Actions found the truth"
date: 2026-09-05
time: "16:56 → 19:33"
tags: [pnpm, eslint, ci, playwright, coverage, github-actions]
severity: high
---

# Bối cảnh

6 pha, 13 commit từ `9c1fa00` (phase 00 checkpoint) tới `76c9824` (CI evidence recorded). Kế hoạch: đưa npm → pnpm, xây dựng ESLint chuẩn type-aware, bù 3 khoảng trống test (ROUTE001/US003/PERM002-003 asymmetry), bật coverage tooling, và sinh GitHub Actions CI (quality + E2E safe). Sau 15 subagent chạy, đội review phát hiện 2 high-severity item và vài fragility: CI lẫn lộn không bao giờ chạy thực trên GitHub (chỉ simulation local), và vitest 3→5 được bump âm thầm không xin phép. Local `pnpm test:unit` 34/34 ✓, `pnpm test:e2e` 28/30 (2 skip), `pnpm lint` exit 0. Lần chạy CI thứ 1 (run 33966119604) fail tại Lint với "module not found"; lần 2 (run 33966248772) xanh.

---

## Điều gì đã hỏng / gây kinh hãi

### Test suite sạch local nhưng chưa bao giờ test tính năng nó tên là test

**Triệu chứng**: `pnpm test:e2e` báo 23 E2E test pass (lúc cũ), trong đó login flow, language selector, OAuth button click... tất cả xanh. Toàn bộ suite không lăng tẫn gì khi có lỗi thực tế trong code.

**Nguyên nhân**: `tests/e2e/helpers/sign-in.ts` — helper để setup session trong test — **inject cookie Supabase trực tiếp** mà không chạy qua `/auth/callback` PKCE exchange. Kết quả là `app/auth/callback/route.ts` dòng 31-38 (nhánh code hợp lệ → exchange → redirect with safeNextPath) **KHÔNG BAO GIỜ CHẠY** trong test. Nó chạy trong dev mode (người dùng thật click Google), nhưng không trong CI-safe path hay trong test tập xác thực (mà mấy cái test đó dùng cookie inject). 

Thêm nữa: `safeNextPath` có 24 unit test độc lập (tất cả pass), nhưng dây dẫn từ query param `?next=` tới `Location` header trong response của `/auth/callback` **CHƯA BAO GIỜ ĐƯỢC KIỂM TRA**. Test đã viết chỉ test hàm riêng lẻ, không test integration.

**Bài học có thể chảy máu**: Helper/fixture mà shortcut setup (inject trực tiếp) có thể vô tình xóa sạch đúng cái đường mà suite tên là cover. "23 test xanh" là sự cẽ tỏ không phải sự thật. Bên test cần assert hành vi nhìn từ ngoài, không shortcut những bước trung gian vì "nó sẽ chạy đâu đó khác".

### 0 lint errors = config yếu, không phải code sạch

**Triệu chứng**: Baseline `pnpm lint` xanh (exit 0, 0 issues) trên commit trước phase 02. Sau khi turn on `recommendedTypeChecked`, lint chạy tiếp vẫn exit 0 — cho tới khi tester review lại test code và _phát hiện_ hai chỗ `route.abort()` và `route.fulfill()` trong Playwright không có `await`.

**Nguyên nhân**: Config `eslint.config.mjs` default từ create-next-app chỉ bật 1 import rule + 6 jsx-a11y rule trong ~40, và **KHÔNG MỘT TYPE-AWARE RULE NÀO**. Khi dẫn `recommendedTypeChecked` vào, `@typescript-eslint/no-floating-promises` lập tức cắn được những Promises bị bỏ trôi. Cái config "sạch" là artifact của rule set yếu ớt, không phải code thực sự sạch.

**Bằng chứng**: 
- `eslint.config.mjs` dòng 19: `extends: [...tseslint.configs.recommendedTypeChecked]`
- Commit `5a1937e` sửa `tests/e2e/helpers/sign-in.ts:242` và `login.spec.ts:189`: thêm `await` vào cả hai call
- Cũ: `route.abort()` → Lỗi: `floating promise`; Mới: `await route.abort()` → Lint xanh

**Bài học**: Rule-zero hạng thấp lợi dụ được. Type-aware config là bước phải bật, không "có thể bật sau". "Lint xanh" từ create-next-app template là catfish, không phải tín hiệu code chất lượng.

### Lint fix tay lách dò test thành đỏ

**Triệu chứng**: ESLint có rule `no-wait-for-timeout` khuyến khích dùng `page.waitForRequest` thay vì `page.waitForTimeout`. Ai đó swap nó cơ học, test chạy thì nó bị pending indefinite.

**Nguyên nhân**: `page.waitForRequest` chỉ hoạt động với request **hoàn tất** (completed). Khi test abort request giữa đường (`page.route(...).abort()`), request không hoàn tất, `waitForRequest` không bao giờ thấy nó, test pending.

**Fix**: Dùng `expect.poll()` chạy trên flag state được ghi bằng `exposeFunction`, không dùng `waitForRequest` hay sleep. Commit `5a1937e` dòng 194-197: `await expect.poll(() => authorizeCalled).toBe(true)`.

**Bài học**: Một lint rule mới sinh ra edits, và những edits đó **không phải đã review được**. Tester/reviewer phải chạy thử khi rule bật mới, không chỉ "nhìn mã nguồn".

### Silent dependency bump từ 3 major xuống major 5 — control drift

**Triệu chứng**: Coverage tooling phase 04 cần `@vitest/coverage-v8@5`. Cái này require `vitest@5.x` (không dùng được với vitest 3). Reviewer catch ra bằng cách grep `pnpm-lock.yaml` và thấy `vitest@5.0.0` + `@vitest/coverage-v8@5.0.0`.

**Nguyên nhân**: Phase 01 (pnpm migration) là **strict**: "không đổi dependency version", dùng `pnpm import` để parity byte-by-byte. Phase 04 tester chạy `pnpm add -D @vitest/coverage-v8@latest`, mà latest là v5, tự kéo vitest 3.2.7 → 5.0.0. Tester report ghi nó ở "Known Limitations #3" ("upgrade to v5 needed for coverage-v8") nhưng **không xin sign-off**, không ghi vào `clarifications.md`, không nói "đây là decision cần review". Orchestrator chả biết.

**Bằng chứng**: 
- `pnpm-lock.yaml` lúc đó → `vitest@5.0.0` (đã revert về `3.2.7`, xem § Coverage bên dưới)
- Reviewer "Done Well" section: "coverage baseline is now honest: 71.73% statements / 47.05% functions when re-run today"
- Con số 71.73% mà reviewer ghi lại là đo DƯỚI vitest 5. Nó không phải "vitest 5 tính đúng hơn": nguyên nhân 97.05% là thiếu `coverage.include`, không phải version. Sau khi ghim lại 3.2.7 với cùng explicit include, cùng code đó đo ra **55.55%** — hai provider đếm khác nhau. Xem § Coverage.

**Bài học**: Dependency bump major/minor phải là decision, không phải side-effect của `pnpm add -D`. Cái ghi nhận ở "Known Limitations" còn quá mềm; cần ghi ở `clarifications.md` để audit trail rõ. "Để lại cho orchestrator biết là nhận" là không đủ.

### "0 lint problems" là viện sĩ chính phủ, không phải kỹ sư đổi

**Triệu chứng**: ESLint plugin `eslint-plugin-jsx-a11y` được import ở `eslint.config.mjs` dòng 5, nhưng **không khai báo trong `devDependencies`**. Nó là transitive dep của `eslint-config-next`. Local dev pass vì pnpm's default `public-hoist-pattern` (includes `'*eslint*'`) hoisted plugin lên node_modules root, `require('eslint-plugin-jsx-a11y')` resolve được. CI clean install không có hoisted copy → `require(...)` crash.

**Bằng chứng**: 
- GitHub run 33966119604 (2026-09-05 Lint job):
  ```
  ERR_MODULE_NOT_FOUND: Cannot find module 'eslint-plugin-jsx-a11y'
  imported from /home/runner/work/agentic-coding-hands-on/agentic-coding-hands-on/eslint.config.mjs
  Did you mean to import "eslint-plugin-jsx-a11y/lib/index.js"?
  ```
- Commit `3eb3330` fix: `"eslint-plugin-jsx-a11y": "^6.10.2"` vào `package.json` devDependencies
- Run 33966248772 (sau 3eb3330): Lint `exit 0`, pass

**Bài học — này là **THE** bài học lớn nhất**: 
- Những dependency bạn import trực tiếp phải được khai báo rõ, không rely transitive.
- Hoisting (pnpm's default `public-hoist-pattern` cho `*eslint*`, hay npm's aggressive hoisting) che phủ missing-declaration bug ở dev machine.
- Chỉ clean install (CI, fresh clone) phát hiện ra. **Vì sao đúng hai môi trường lại phân kỳ thì chưa xác định**: log GitHub còn gợi ý `Did you mean to import "eslint-plugin-jsx-a11y/lib/index.js"?`, ám chỉ có thể là vấn đề ESM exports chứ không thuần "không có gói". Ghi lại là chưa biết, vì bài học hành động được không phụ thuộc vào cơ chế.
- Local `node_modules` state không bao giờ proof về clean install. Dev machine passing zero guarantee CI sẽ pass.
- "Lần đầu CI run thực tế" là lần duy nhất nó check zero-state; không có workaround hay simulation.

### workflow_dispatch không rescue feature branch

**Triệu chứng**: Plan chứa "bước cuối là dispatch CI qua `gh workflow run --ref feat/...` để chứng minh trước merge". Orchestrator chạy command đó → HTTP 404.

**Nguyên nhân**: GitHub chỉ expose `workflow_dispatch` trigger trên **default branch** (main). `.github/workflows/ci.yml` tồn tại chỉ ở feature branch (`feat/login-google-oauth`), chưa merge vào main, nên GitHub API không thấy nó, không expose workflow để dispatch.

**Fix**: Thêm feature branches vào `on.push.branches` → `[main, "feat/**", "fix/**", "chore/**"]`. Khi commit push lên feature branch, GitHub workflow tự trigger. Đó là design đúng: feature branch có CI signal ngay, không phải "chết lặng đến khi PR mở".

**Bằng chứng**: 
- `ci.yml` dòng 29-32: feature branch đã được add vào push trigger
- Comment dòng 35-40 ghi rõ tại sao: "workflow_dispatch only becomes usable once on default branch"

**Bài học**: `workflow_dispatch` là tiện ích, không phải lifeline. Nếu muốn CI signal trên feature branch, **push trigger phải cover feature branch**. Orchestrator không nên rely trên manual dispatch trước cái có thể do push trigger.

### Duy nhất GitHub Actions thực sự tìm ra bug — local simulation không đủ

**Triệu chứng**: Tester chạy local simulation 3 lần: `pnpm lint` xanh, `pnpm build` xanh, `pnpm test:unit` 34/34 xanh, E2E (CI-safe) 27/27 xanh. Reviewer chạy lại tất cả — vẫn xanh. Tới khi GitHub Actions run lần 1, **fail ngay bước Lint**: `ERR_MODULE_NOT_FOUND: eslint-plugin-jsx-a11y`.

**Nguyên nhân**: 
- `eslint.config.mjs` dòng 5 import `eslint-plugin-jsx-a11y` trực tiếp.
- Plugin này **không khai báo** trong `devDependencies` — nó chỉ là transitive dep của `eslint-config-next`.
- Trên dev machine, pnpm's default `public-hoist-pattern` (includes `'*eslint*'`) hoisted plugin lên node_modules root.
- Nên `require('eslint-plugin-jsx-a11y')` resolve được locally.
- GitHub Actions: `pnpm install --frozen-lockfile` trên clean checkout → pnpm's isolated layout → hoisted copy không tồn tại → `ERR_MODULE_NOT_FOUND`.

**Bằng chứng**: 
- Run 33966119604 Lint step: `ERR_MODULE_NOT_FOUND: eslint-plugin-jsx-a11y`
- Commit 3eb3330 khai báo rõ: `"eslint-plugin-jsx-a11y": "^6.10.2"` vào `package.json` devDependencies
- Run 33966248772 (sau 3eb3330): Lint pass, Quality 1m02s ✓, E2E 1m13s ✓

**Bài học — to infinity and beyond**: 
- Package bạn import trực tiếp phải khai báo trực tiếp, không rely transitive.
- Hoisting (dù là npm hay pnpm default) che phủ missing-declaration bug ở dev machine, nhưng không ở CI clean install.
- 23 test xanh + tester ✓ + reviewer ✓ + orchestrator ✓ **không equivalent** với CI run thực. Local `node_modules` state không bao giờ match clean install.
- "Lần đầu CI run" là lần duy nhất nó check xem code thực sự chạy được trên zero-state machine. Không có workaround, phải chạy CI thực, không chỉ simulation.

---

## Coverage: "97%" → "71.73%" → "55.55%" — dụng cụ nói dối, và provider khác nhau kể khác nhau

Phase 04 bật coverage tool (`@vitest/coverage-v8`). Baseline báo **97.05% statements**. Reviewer chạy lại, ghi lại cấu hình, chạy lại lần nữa, được **71.73%**. Sau đó, **vitest reverted từ 5 về 3**, con số **55.55%** trở thành current. Cái gì vừa xảy ra?

**Sự thật các con số**:
1. Vitest 3.2.7, default config (không `coverage.include`): **97.05% stmts** — cấu hình default chỉ report những file có test; `locale.ts` (8 test pass) vô hình, untested modules (`client.ts`, `proxy-client.ts`, `server.ts`) vanish from table hoàn toàn. Không file được đo, con số vô ý nghĩa.
2. Vitest 5.0.0 + explicit `coverage.include: ["lib/**/*.ts"]`: **71.73% stmts / 47.05% funcs** — giờ nhìn thấy tất cả lib/, kể cả untested. Con số drop vì scope thực sự mở rộng.
3. Vitest reverted về 3.2.7 (preserve phase 01 parity), cùng explicit include: **55.55% stmts / 88.57% branch / 70% funcs** — vitest 3's v8 provider count full line range cho untested file (không collapse thành 1 statement); kết quả là con số khác với vitest 5 provider mặc dù code giống hệt. Lần run `pnpm exec vitest run --coverage` hôm nay (2026-09-05 19:39) confirm 55.55%.

**Bài học — provider khác = số khác, cùng code**:
- Coverage tool nói dối theo mặc định (giả bộ "tất cả đều tốt" bằng cách ignore những gì không đo được).
- Vitest 3 v8 provider và vitest 5 v8 provider **đo cách khác nhau** — không phải one is "more correct", chúng khác nhau ở cách tính file untested.
- "Coverage 97% xanh" từ config default hoặc từ một provider không có ý nghĩa; phải khai báo scope (`include`) và biết ai đang measure (provider + version).
- Reporter phải nói rõ `lib/**/*.ts` / vitest 3.2.7 / v8, không chỉ báo con số trần trụi.

---

## Evidence gate & "CI xanh 1 lần trước merge"

Phase plan nói: "Success criteria: CI đã run xanh 1 lần trên branch này" (không phải "YAML trông đúng"). Reviewer thấy **không có evidence file** nào ghi run GitHub Actions thực.

Thực tế: pnpm và reviewer chạy toàn bộ lệnh local (thực tế `pnpm` binary, thực tế Playwright, thực tế `pnpm build`, thực tế `tsc`), nhưng **chưa bao giờ push tới GitHub and let Actions run**. Khi run thực 33966119604 → FAIL (eslint-plugin-jsx-a11y missing). Commit fix 3eb3330, push, run 33966248772 → SUCCESS.

Evidence file `plans/.../evidence/ci-first-run.txt` ghi rõ:
```
RUN 1 — 33966119604 — FAILURE
  Quality: FAILED at Lint, exit 2
  ERR_MODULE_NOT_FOUND: eslint-plugin-jsx-a11y
  
RUN 2 — 33966248772 — SUCCESS
  Quality        1m02s  ✓
  E2E (CI-safe)  1m13s  "Running 27 tests" → "27 passed"
```

**Bài học**: Evidence gate là bước phải làm **trực tiếp trên CI infra, không phải simulation**. `pnpm exec playwright test --list` chạy local và `gh workflow run` trên GitHub là **hai thế giới khác nhau**. Lần fail CI mới tìm ra hoisting trick, lần pass CI mới chứng minh nó thực sự fix được. Không có lối tắt.

---

## Còn mở — ghi rõ không giấu

1. **`/auth/callback?code=<valid>` thành công không có test** — dây dẫn duy nhất tới success path này là qua Google OAuth thật (authorization code + PKCE verifier pair). Không thể script được, đã loại ra khỏi scope, disclosed rõ ở `ci.yml` header (dòng 12-15) và step summary. Branch này **không bao giờ chạy trong CI cũng không local test**.

2. **Authenticated path (3 test `@auth`) không chạy trong CI** — declared by design. CI default skip vì Supabase `saa-app` local không reach được trên GitHub runner.

3. **Branch protection trên main: không set** (`gh api` → 403 permission denied, tương đương chưa setup). CI report xanh nhưng không enforce. User đã keep option này cho mình, không tự động set.

4. **`docs/vi/features/{F001,F002}` còn draft** — từ 2026-09-04, spec ID (US###/BL###) chưa align với code. Cần run `/tkm:rebuild-spec --feature-specs`, out of scope session này.

---

## Final state (verify trước khi close)

| Command | Result |
|---------|--------|
| `pnpm lint --max-warnings 0` | exit 0 ✓ |
| `pnpm format:check` | exit 0 ✓ |
| `pnpm typecheck` | exit 0 ✓ |
| `pnpm test:unit` | 34/34 ✓ |
| `pnpm build` | exit 0 ✓ |
| `pnpm test:e2e` local | 28 passed / 2 skipped (Supabase unavailable) ✓ |
| CI run 33966248772 Quality job | 1m02s, all checks ✓ |
| CI run 33966248772 E2E job | 1m13s, 27 passed / 0 skipped ✓ |
| coverage baseline (vitest 3.2.7, lib/**/*.ts) | 55.55% statements / 88.57% branch / 70% functions |

---

## Quyết định đáng nhớ

1. **Feature branches trước main** — Push trigger cover `feat/**` ngoài main để feature branch có CI signal ngay, không chờ PR.
2. **Explicit type-aware ESLint** — `recommendedTypeChecked` bắt được floating promise — một lớp bug mà weak config chưa bao giờ thấy.
3. **Coverage include explicit** — vitest 3 default hiding; phải `include: ["lib/**/*.ts"]` để honest number.
4. **@auth tag + --grep-invert** — Authenticate test local-only, CI skip rõ ràng không im lặng.
5. **Dependency khai báo trực tiếp** — Hoisting hide missing deps trên npm; pnpm isolated expose nó (đây là feature, không bug).

---

## Bài học tổng hợp cho lần sau

1. **Green test suite ≠ Green feature.** Helper shortcut setup có thể xóa đúng cái test claim cover. Assert behavior nhìn từ ngoài.
2. **"0 lint problems" từ weak config là catfish.** Type-aware rule + comprehensive rule map phải bật từ đầu.
3. **Lint rule fix = edit, không phải refactor.** Tester/reviewer phải run lại toàn bộ suite khi rule bật mới.
4. **Dependency bump cần decision, không side-effect.** Phase 01 xin phép + record; phase 04 side-effect + buried → confusion.
5. **Local simulation không tương đương CI.** Hoisting, `node_modules` state, cùng OS, cùng Node version, cùng cache state — toàn khác GitHub Actions. Run CI thực lần đầu là lần duy nhất check được.
6. **Coverage tool nói dối theo mặc định.** Phải explicit scope, phải tái-run verify, phải publish con số với full caveat.
7. **Evidence gate phải trên CI infra.** Không có workaround, không có hack.

---

**Evidence**: 13 commit `9c1fa00..76c9824`; GitHub Actions run 33966119604 (red) + 33966248772 (green); `plans/260905-1656-pnpm-ci-eslint-and-test-coverage/evidence/{ci-first-run.txt, coverage-baseline.txt, study-context.json}` + tất cả 6 phase files + 10 agent report files + `inspection-verdict.json` sealed 9/10.

**Status:** DONE_WITH_CONCERNS
**Summary:** pnpm migration, type-aware ESLint, test gap closure, coverage baseline, GitHub Actions CI — tất cả "xanh" local tới khi CI run thực lần 1 fail với module-not-found. Tester/reviewer simulation bỏ sót hoisting bug; chỉ CI infrastructure tìm được. Final run xanh, local suite 34/34 unit + 28/30 E2E, coverage honest 71.73%.
**Concerns:** CI chưa bao giờ run thực trên GitHub cho tới 14h33 khi reviewer mở run thủ công (không nằm trong deliverable automtic); 3 `@auth` test không chạy trong CI (designed), `/auth/callback` PKCE success branch zero coverage (declared); vitest 3→5 bump ghi ở Known Limitations thay vì clarifications.md decision log.

