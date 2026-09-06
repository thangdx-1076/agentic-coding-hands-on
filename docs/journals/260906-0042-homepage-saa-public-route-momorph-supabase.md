---
title: "Homepage SAA public route e2e-red-first MoMorph + Supabase saa-app, Docker-off trap, TS2589 client shim, visual validation false positives, six defect fixes seeded"
date: 2026-09-06
time: "01:19 → 10:07"
tags: [momorph, e2e-red-first, supabase, playwright, typescript, next16, track-a, visual-contract]
severity: high
---

# Tóm tắt

Public Homepage SAA ở route `/` — MoMorph screen i87tDx10uM. `home.spec.ts` RED (24/27 failing assertions) → GREEN 27/27 với command không thay đổi. Full e2e 55 passed / 2 skipped; vitest 119 tests @ 100% allowlist coverage; reviewer 9.5/10 SEALED round 3; evidence gate SEALED. Khoá học bắt buộc ghi nhớ: Supabase Docker đã tắt (đông tủ quá), tester seeded 6 defect + client type instantiation lúc 0h22 không dõi được (TS2589 `@supabase/ssr` — fix shim), visual validation báo cáo 3 missing image đó đơn giản là lazy-load before-scroll, hero BG che sơn chứ không phải ảnh lost, e2e minute-tick đòi hỏi fake-time FLOW không freeze. Track A section workers notify orchestrator không parent, parent phải resume. Promote script căn sync shas (P0–P5 Step 0–9).

---

## Docker Desktop tắt khiến Supabase local không tắm được

### Vấn đề

Session start, test:
```bash
psql -h 127.0.0.1 -p 55322 -d postgres -U postgres -c "select version();"
```
→ reject 127.0.0.1:55322. Tester helper `promote-to-admin.ts` chạy:
```bash
supabase db query "update public.users set role='admin' where email='<test@>';"
```
→ timeout. Thực tế saa-app container chưa start vì Docker Desktop _off_ (máy yên tĩnh quá đêm hôm qua).

### Fix & discovery

`open -a Docker` wake Docker, `supabase start` (API 55321, DB 55322 online), `supabase status` xuất:
```
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=eyJ...
```
→ match `.env.local` sẵn có. E2E chạy, `@auth` tag tests access `saa-app` thành công.

**Khác hơn CLI tool bình thường:** `supabase db query` không cần psql installed local (dùng Docker exec vào container). Ngữ cảnh: `SAA_APP_DIR` (env var hoặc default `~/Desktop/Claude-and-mormoph/saa-app/`) → resolve TOML + xác định container name → `docker exec <name> psql ...`. Việc _not_ cài psql local là feature (không rò credential).

### Bài học — phần mềm Docker suspend không loài cười thoáng qua

Container không restart từ cold: `open -a Docker` blocking, rồi `supabase start` không skip. Ghi vào action-items để dev local biết: Docker off = tests chạy fail kiểu network timeout, không error message nào gợi ý Docker tắt. Công cụ: `docker ps` trước khi chạy test.

---

## Scope = SINGLE feature, không SYSTEM — ghi chính thức vào `spec/.intent-enum.json`

Clarifications, line 2 của § Session:

> "Mọi mục dưới đây là **quyết định của Claude** theo thứ tự ưu tiên CLAUDE.md: (a) Recommended → (b) khớp pattern → (c) ít file"

Rest Point 1.5a (`.intent-enum.json`) không nhường bước nào: `"scope":"SINGLE"` (không "SYSTEM"). Homepage là một feature lẻ, khác với task "build auth system". Mục đích: takumi `--auto` không stall ở decision gate lúc 0h nữa.

---

## Tester RED suite chứa 6 defect — orchestrator bắt ra trước implement

Commit `73d74f2` (`tester-red-home-e2e.md` § Defects Fixed, 6 item):

1. **Minute-tick fake time**: Install clock _trước_ `goto()`, không sau. Reason: `setInterval(1000)` chạy trước goto nên fetch không timeout lúc faked.
2. **Zero-state (TC ID-41/42)**: `fastForward()` phải đích "00:01:00" (string format), không "9999:00:00:00" (invalid ticks).
3. **Account menu link shape**: Expect `<a role="menuitem">`, không `<div>` có `<a>` con.
4. **Strict-mode text collision**: "Sun* Kudos" ×4, "Details" ×7, `a[href="/"]` ×2 (header + footer) → scope khác.
5. **Countdown digit locator**: `[role=timer] div:has-text()` hard-coded; thay bằng `.getByText()`.
6. **Widget Escape**: Press Escape trên trigger button, không global keyboard (focus khác).

Orchestrator ran suite lúc 01:19 (tester flag "exit 1, 24/27 fail"), cross-check test code → phát hiện toàn bộ 6 (tester không viết code, chỉ spec). Ghi tường tận vào report; orchestrator tẩu căn fix trong cùng phase.

### Bài học — test spec ≠ test code

E2E spec (test cases CSV) chính xác "user click menu item → navigate to /profile". Code test phải khớp DOM của implementer (có `<a>` hay `<div>`?), selector scope, fake time semantics. Tester ký mối spec nhưng không sở hữu code test (code là tài sản của agent implement + tester sau). Defect tìm ra trước implement = urgent.

---

## TS2589 `@supabase/ssr` client không fit narrow `UsersRoleClient` interface — typed shim thay thế

Lúc 00:22, `pnpm typecheck`:
```
error TS2589: Type instantiation is excessively deep and possibly infinite.
  at lib/auth/get-user-role.ts:12
```

Nguyên nhân: `@supabase/ssr` `SupabaseClient` là generic với 4 type param (Database schema + auth + realtime). Narrow vào `{ getUserRole(): Promise<Role> }` không thể (StructuralType matching fail trên generic deep tree).

### Fix

Commit `a398273`: `lib/supabase/users-role-client.ts` — typed shim:
```typescript
export type UsersRoleClient = ReturnType<typeof createUsersRoleClient>;
export function createUsersRoleClient(sb: SupabaseClient) {
  return {
    async getRole(userId: string) { return ...; }
  };
}
```

`getRole` call không sở hữu full client type, chỉ method cụ thể. Test mới `users-role-client.test.ts` mock `SupabaseClient` qua `Partial<SupabaseClient>` — độc lập, không tải toàn bộ schema type.

### Bài học — generic type instantiation vô hạn từ lib chuyên dùng ở cây service

`@supabase/ssr` export type quá sâu để dùng làm interface boundary. Khi viết helper warp client, tránh `as SupabaseClient` (chỉ che lỗi), thay bằng lightweight method-bag type (typed shim pattern — đã thành công ở research 01 với MSW handlers).

---

## Visual validation false positive: 3 missing image = lazy-load before scroll, hero BG culprit khác

Tester lúc 09:41 ghi "BLOCKING" × 3: award card thumbnail, Kudos background, "Sun* Kudos" logo — `complete:false, naturalWidth:0` (browser eval). Orchestrator:
1. Scroll test page → 20/20 images loaded, 200 OK
2. Check hero: `<div style="position:absolute;inset:0;-z-10">` — nội dung được `inset-0` stretched full 4453px page height, phủ lên vẽ login-bg, không phải ảnh missing
3. Fix hero: `isolate` root + `aspect-[1512/1392]` band wrapper → stacking context riêng

Mojo: next/image lazy-load nó không fail, chỉ chưa tải. Playwright capture lúc chưa scroll.

---

## Flaky e2e minute-tick (TC ID-24/39) — fake time FLOW không freeze

Test đầu tiên fail "Expected 55 minutes, received 28". Lý do:

```typescript
page.clock.install({ time: 2099-12-31T17:00 });
page.goto("/");
page.clock.runFor(1000); // Sync clock qua hydration
await page.locator("[role=timer]").getByText("55").waitFor(); // ← Fail
```

Playwright fake-time **không** freeze—nó FLOW (tăng cùng real time một cách tương đối). `runFor(1000)` chạy ngay, `waitFor` lại chờ thực (fake time vẫn tăng). 30s test timeout → fake time bay thêm 30s → minutes = 55 - (30×60/60) = 25 (?), hoặc hydration late → SSR rendered 28 min.

Fix round 3 (reviewer run suite): Bỏ `waitFor`, dùng `toHaveText("55")` với auto-retry (retry 5s default, fake time pause, expect chạy synchronous).

### Bài học — Playwright fake time semantics

`clock.install()` không freeze global time. Nó scale tương đối (fake time += real time elapsed). `pauseAt(time)` mới freeze. E2E determinis tic yêu cầu hiểu kỹ semantic này.

---

## Promote script (`promote-homepage-spec.py` P0–P5, Step 0–9) + sha sync

Spec tách từ nôi (Delivery phase `docs/vi/features/F003_Homepage/`):

```bash
cd plans/260906-0042-homepage-saa-page/scripts
python3 promote-homepage-spec.py
```

Script `P0: Backup`, `P1: Scan`(markdown), ..., `P9: Compute shas` → update `docs/vi/features/.map.json`. 

Phát hiện: `screen_spec_shas` trong map _cũ_ (SCR001) không match file trên disk → stale trước session này. Recompute = consistent.

---

## Subagents để lại junk — `.playwright-mcp/`, `capture-*.mjs`, PNG

`pnpm format:check` fail vì untracked file. Xoá:
```bash
rm -rf .playwright-mcp/ capture-*.mjs *.png
```

`.gitignore` chưa list `.playwright-mcp/` (Playwright MCP generates mỗi run). Action-items: thêm.

---

## Final state

| Command | Result |
|---------|--------|
| `pnpm test:e2e tests/e2e/home.spec.ts` | 27/27 pass ✓ |
| `pnpm test:e2e` (all) | 55 pass, 2 skip ✓ |
| `pnpm test:unit:coverage` | 119 tests, 100% ✓ |
| `pnpm lint --max-warnings 0` | exit 0 ✓ |
| `pnpm typecheck` | exit 0 ✓ |
| `pnpm build` | exit 0 ✓ |
| `pnpm build-storybook` | exit 0 ✓ |
| Spec promote | consistent shas ✓ |

**Track A + B + Tester**: 3 agents, 4 rounds (RED, GREEN ×2, visual), 1 orchestrator review round (defect catch pre-code), reviewer 3 rounds (9.5 SEALED).

---

## Quyết định ghi action-items

1. **Route `/` public**: PERM001 (Root Route Guard) hết hiệu lực. Redirect tới `/` lúc login (không `/todo`). `proxy.ts` matcher giữ `/` để refresh session.
2. **Header anon**: Login link (icon tài khoản), bell ẩn, language selector hiện.
3. **Post-login landing**: Homepage `/` không `/todo` (placeholder, giữ nguyên).
4. **Widget menu**: Inferred từ 2 icon (bút chì → Kudos, SAA → Awards) — không phải spec explicit.
5. **EVENT_START_AT**: Server-only env, parse/validate `lib/countdown/countdown.ts` (pure + test 100%).
6. **Fail-open role**: `getUserRole` catch error → `member` (không crash).

---

## Còn mở

1. **Unread notifications count**: Bảng schema chưa tồn tại (ghi nợ TC ID-28). Badge không test.
2. **"Digital Numbers" font unavailable**: Fallback monospace (ghi nợ, debt token).
3. **5 target route 404**: `/awards`, `/kudos`, `/standards`, `/profile`, `/admin` chưa build (ghi nợ).
4. **Branch protection**: `gh api` return 403 (quyền hoặc chưa enable). User keep option.
5. **`.playwright-mcp/` junk**: Add vào `.gitignore`.

---

**Evidence**: 3 agent + orchestrator; `/plans/260906-0042-homepage-saa-page/` (spec + clarifications); reports/ (red/green/reviewer/delivery/doc-writer); commits a398273, 73d74f2, f4358fb + uncommitted work; `git log --oneline e7b8f17..HEAD`; `pnpm test:e2e home.spec.ts` exit 0 27/27; 119 vitest @100%; promoted spec @ consistent shas.

**Status:** DONE
**Summary:** `/` public Homepage SAA built (MoMorph screen i87tDx10uM → code). RED 24/27 → GREEN 27/27; e2e 55/55 + 2 skip; vitest 119 @100%; typecheck/lint/build/build-storybook exit 0; reviewer 9.5/10 SEALED. Defects: Docker-off Supabase trap, scope SINGLE intent, tester seeded 6 fixes, TS2589 shim, visual validation false positives (lazy-load + hero stacking), flaky fake-time semantics. Track A section workers resume issue. Promote script shas consistent.
**Concerns:** None blocking. Post-launch debt (notifications schema, Digital Numbers font, 5 routes). `.playwright-mcp/` gitignore todo.
