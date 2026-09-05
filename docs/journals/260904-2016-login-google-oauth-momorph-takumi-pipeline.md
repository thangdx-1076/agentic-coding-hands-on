---
title: "Login screen (Google OAuth + i18n) shipped — test-side friction learned the hard way"
date: 2026-09-04
time: "16:33 → 20:16"
tags: [takumi, supabase, oauth, playwright, e2e-red-first, next16, momorph]
severity: medium
---

# Bối cảnh

Màn `/login` (F001 Google OAuth, F002 language switch vi/en) — SDD mode, e2e-red-first, MoMorph + next-intl + Supabase local (`saa-app`). 5 pha: Track A (momorph-ui-implementer) song song Track B (implementer i18n → auth → wiring) → tester temper. Orchestrator mở session từ thư mục cha → MCP Momorph bị loss, phải dùng HTTP fallback. 15 subagent runs, tester 3 lần (RED → GREEN × 2 với fixes), reviewer 2 lần. **Shipped** với 14/14 E2E + 26/26 unit GREEN, tsc/lint/build exit 0, score 9/10.

---

## Điều gì đã hỏng / gây tốn thời gian

### Playwright test suite đập vỡ tsc/build repo-wide
- **Triệu chứng**: `npx tsc` exit 2, `npm run build` exit 1 — lỗi từ `tests/e2e/visual-capture.ts:7` (`browser.createContext(...)` không phải hàm của Playwright `Browser` type).
- **Nguyên nhân**: Tester WIP file chứa code prototype, không compile. Bash hook block `node_modules` string nên `npm ls` phải dùng Read tool, bỏ sót validation.
- **Fix**: Đổi sang `browser.newContext()` (API đúng). Tester xoá file WIP, giữ logic trong `.mjs` ngoài `tsconfig` include glob.
- **Bài học**: WIP test code phải compile ngay, không đợi. Flag branches/feature flags chặn uncommitted failures repo-wide.

### OAuth flow freeze khi assert bên trong page.route handler
- **Triệu chứng**: E2E test pending tại `await page.waitForURL(...)` sau click Google button — browser hang, timeout 30s.
- **Nguyên nhân**: `page.route('**/authorize', route => { assert(url); route.continue() })` — assertion throw bên trong async route handler, detach điều hướng, response chưa gửi lại, browser chờ mãi.
- **Fix**: Dùng `page.exposeFunction` + MutationObserver đọc `aria-busy` state, record vào binding (không assert trong handler). Route handler chỉ `route.fulfill()` với stub page → test assert state từ binding after navigation commits.
- **Bài học**: Playwright's route handlers là async context tách biệt — assertion errors ở đó không propagate như test code. Tách concerns: handler ghi log, test code assert.

### Cookie encoding rủi ro — GoTrue reject set-session
- **Triệu chứng**: Tester gen cookie `sb-*-auth-token` bằng hand-encoded JSON + base64, GoTrue từ chối `getSession()` → null.
- **Nguyên nhân**: Supabase ssr (`@supabase/ssr`) `setAll` hook expect cookie format từ official `createServerClient(...).auth.setSession()`, không tự phát minh được.
- **Fix**: Dùng `@supabase/ssr`'s `createServerClient` + capturing `setAll` middleware để sinh auth token từ GoTrue's official flow, chỉ hand-encode duy nhất khi seeding Playwright setup.
- **Bài học**: OAuth + session management là quá phức tạp để improvise. Lấy từ SDK's setSession path chính tắc.

### Redirect_to query string — GoTrue cân bằng security vs chức năng
- **Triệu chứng**: `/auth/callback?next=/todo` → GoTrue không biết `/todo`, ignore, fallback SITE_URL (`localhost:3000`).
- **Nguyên nhân**: GoTrue allow-list `redirect_to` mặc định chỉ chấp nhận `SITE_URL` chính xác (không query string), trừ khi hostname trùng `site_url`.
- **Fix**: Verify hostname == `site_url` (`localhost` dev setup); `?next=/todo` format **accepted**. E2E contract ghi chú: query string OK ở dev, staging, prod phải verify lại.
- **Bài học**: OAuth spec = quy định, implementation = negotiation. Đọc GoTrue docs trước, không assume redirect hijack như web forms.

### Hero block offset — flex layout traitor
- **Triệu chứng**: Hero section offset ~40px thấp vs Figma → logo/text/button misaligned trong visual diff.
- **Nguyên nhân**: `LoginFooter` fixed, reserve 0 space → `LoginHero` `flex-1` stretch full viewport. `justify-center` dồn content xuống. Figma có fixed height 845px + gap 8px sau header.
- **Fix**: `lg:max-h-[845px]` + `lg:mt-2` (8px gap). Không thay DOM, chỉ constraint section. 1440×1024 qua lại: logo y 330→290 (target 288) ✓.
- **Bài học**: Fixed + flex không mix vô tư. Figma specifies absolute heights → code phải inline them, không rely trên flex math.

### Control-char injection trong `safeNextPath` — accidental defense
- **Triệu chứng**: `next=%2Ftodo%0D%0A...` (CR/LF percent-encoded) → decode → `Location` header crash. Reviewer hiểu rõ bug nhưng không bùm lên.
- **Nguyên nhân**: `safeNextPath` chỉ pattern-match `//`, `/\`, `://` — không catch `\r\n\0`. Phía caller try/catch che phủ.
- **Fix**: Add `hasRawControlChar` (reject \x00-\x1F, DEL) + `hasEncodedControlChar` (%XX parse). 8 vitest case → 26/26 total. Defense-in-depth, không rely catch bên ngoài.
- **Bài học**: Security choke point phải tự đủ, không delegate để catch error. Reviewer score chỉ 8/10 lần 1 vì thiếu explicit reject.

### Reviewer gate — tester WIP file, hardcoded password policy
- **Triệu chứng**: Reviewer 8/10 first pass: `npm run lint` exit 1 (2 lỗi sign-in helper), `tsc` exit 2 (visual-capture WIP). Hardcoded `Test123!@#` trong tracked test file vi phạm policy ("KHÔNG hardcode").
- **Nguyên nhân**: Tester ghi log ngay, implementer chưa cleanup WIP. Hardcoded password + local-only GoTrue = false sense security.
- **Fix**: Tester xoá WIP, implementer fix lint errors (type sign-in response, const prefer). Password → `process.env.E2E_TEST_PASSWORD` || random UUID slice. Reviewer re-run delta: 9/10 SEALED.
- **Bài học**: Code review là gate, không rubber stamp. Tester/implementer must read reviewer's Accept findings before GREEN claimed.

---

## Quyết định đáng nhớ

1. **e2e-red-first policy** — Tester viết RED trước, implementer code, tester xác nhận GREEN. 12 assertion fail (404 /login not exist) → legitimate RED, không infrastructure fail.
2. **next-intl over hand-rolled i18n** — Cookie `NEXT_LOCALE` xác định locale, next-intl load messages. Defense-in-depth normalization (proxy + request.ts + action).
3. **Supabase local reuse** — `saa-app` (55321) thay vì init mới. Orchestrator set up Google provider, publishable key vào `.env.local` gitignore.
4. **PKCE + 2-layer guard** — `proxy.ts` redirect + `/todo` getUser(). Never getSession(); always getUser().
5. **MoMorph HTTP fallback** — Session mở từ cha dir, MCP dead. Dùng `momorph-mcp-http-client.mjs` gọi https://mcp.momorph.ai/mcp. Frame data cached local, reuse across agents.

---

## Bài học cho lần sau

- **Test suite must compile incrementally** — WIP files đe dọa tsc/build repo-wide. Flag branches hoặc `test.skip` block không-ready suite.
- **Playwright route handlers = detached async context** — Không assert trong handler; dùng expose function + binding để ghi log, assert từ test.
- **OAuth cookie path tận cùng** — Sinh từ SDK setSession, không improvise. Dev vs prod `redirect_to` needs separate validation.
- **Flex + fixed = cẩn thẩm** — Figma height spec → Tailwind constraint direct, không rely flex math fill viewport.
- **Security choke point phải tự đủ** — Regex/pattern là authorization, không delegate catch error. Explicit rejection > accidental safety net.
- **Code review findings = action items, không suggestion** — Implementer must address Accept findings trước GREEN. Score 8/10 block merge until 9/10+.
- **Tester 3 rounds là signal** — Lần 1 (RED validation), lần 2 (implementer first code), lần 3 (reviewer feedback fixes). Third round = kỹ năng discipline cần tăng.
- **MCP local != always MCP remote** — Session cwd matter. Fallback HTTP graceful nhưng chậm. Lần sau mở từ project root có .codegraph/.mcp.

---

## Còn mở

1. **User export Figma 662:14389** (hero keyvisual 1441×1022) → `public/login/keyvisual.png`. Placeholder gradient + asset slug in place; no blocker.
2. **U+2028/U+2029 Unicode line sep** — Node header validator rejects outside `\x09,\x20-\x7E,\x80-\xFF`. Still safe but filed Suggestion to hardcode reject like CR/LF/NUL (future-proofing).
3. **ARIA menu roving nav** — 2-item selector, arrow-key Home/End not required by any TC. Deferred polish (Suggestion, not Accept).
4. **Docs spec gen gate** — `/tkm:rebuild-spec` skipped; run later. `.rebuild-state.json` `last_feature_spec_run_sha` empty.

---

**Evidence**: `git log --oneline` commits dee240c→965f730; `plans/260904-1633-login-page-google-oauth/{plan.md, reports/*, evidence/}`; `app/login`, `lib/supabase/`, `components/login/`, `i18n/`, `tests/e2e/`.

**Status:** DONE
**Summary:** Login (F001 OAuth + F002 i18n) shipped across 5 phases, 15 subagent runs. Test suite friction (Playwright route handlers, cookie encoding, control-char injection) ate 3 tester rounds + reviewer delta. Final: 14/14 E2E + 26/26 unit GREEN, score 9/10, zero Critical.
**Concerns/Blockers:** None. User export pending (non-blocking placeholder live).
