---
phase: 04
title: "Cổng redirect prelaunch: e2e chứng minh khi lock BẬT"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F011
status: completed
note: "Used fallback approach: playwright.lock.config.ts + pnpm test:e2e:lock + separate CI step"
priority: P0
effort: 2.5h
depends_on: []
blocks: []
owned_files:
  - playwright.config.ts
  - tests/e2e/prelaunch-lock.spec.ts
  - package.json
  - .github/workflows/ci.yml
---

# Phase 04 — Yêu cầu cốt lõi của màn prelaunch có chứng cứ e2e

## Context Links

- Spec: `spec/F011_CountdownPrelaunchPage/functional-spec.md` FR-102, FR-103, CAP-02, BR-001/002/003,
  DEC-001, D001 · `technical-spec.md` § 3.2
- Audit: `research/audit-login-prelaunch.md` gap 1 (major), gap 6 · `reports/audit-verdict-260910-2015.md`
  § "3 lỗi nặng nhất" #3
- Code: `src/proxy.ts:49-67` (wiring) · `src/domain/prelaunch-lock.ts:25-27,94-120` (bảng thuần, đã
  có test đủ) · `tests/e2e/prelaunch.spec.ts:128` (chỉ test lock TẮT) · `playwright.config.ts:60-70`
- MoMorph: `momorph/specs-8PJQswPZmU.csv` row 1 `transitionNote`

## Overview

**Priority** P0 · **Status** pending · "Luôn đưa khách về `/prelaunch` trước giờ G" là yêu cầu chính
của màn này và **chưa từng được chứng minh ở bất kỳ tầng nào**: `prelaunch.spec.ts:128` chỉ test khi
lock TẮT, `playwright.config.ts` không bao giờ set `PRELAUNCH_LOCK_ENABLED`, và `src/proxy.ts:49-67`
không có unit test — chỉ có bảng quyết định thuần ở `src/domain/prelaunch-lock.test.ts`.

## Key Insights

- `webServer.env` của Playwright **cố định cho cả lượt chạy**. Một nhánh phụ thuộc env flag không thể
  test được trong cùng một server ⇒ cần server thứ hai, không phải một test khác.
- Lock cần **AND**: `PRELAUNCH_LOCK_ENABLED=true` **và** chưa tới `EVENT_START_AT`
  (`prelaunch-lock.ts:25-27`). MoMorph row 1 không nhắc cờ env — spec revision đã ghi lại đây là
  quyết định đã chốt, không phải bug.
- `src/proxy.ts` **nằm ngoài** allowlist coverage của repo ⇒ **KHÔNG** viết unit test cho nó
  (đã cố một lần, sai chỗ). Bảng thuần đã phủ; thiếu đúng một lớp là e2e thật.
- `reuseExistingServer: !CI` ⇒ ở local, thứ gì đang giữ port là thứ bị test. Port riêng cho server
  lock, và test đầu tiên phải xác nhận "đúng server" trước khi kết luận gì.
- CI chỉ `playwright install chromium` nhưng chạy **mọi project**; project mới dùng
  `devices["Desktop Chrome"]` nên không cần cài thêm browser. Comment ở `ci.yml:196-197` ("only
  declares a chromium project") phải sửa cho khỏi lệch sự thật.

## Requirements

Functional: khi lock BẬT và chưa tới giờ — `/`, `/login`, `/kudos` (và ít nhất 1 route được liệt kê
ở `constants/routes.ts` matcher) đều redirect về `/prelaunch`; `/prelaunch` trả 200, không lặp
redirect. Khi lock BẬT nhưng đã tới giờ — không redirect (đã phủ bởi bảng thuần, không lặp lại ở e2e).

Non-functional: lượt chạy `pnpm test:e2e` mặc định vẫn chỉ có 1 dev server cho phần cũ; server lock
chỉ bật cho project lock. Tổng thời gian suite tăng ≤ 60s.

## Architecture

```
playwright.config.ts
  webServer: [
    { command: pnpm dev --port ${PORT},      url: BASE_URL,      env: { EVENT_START_AT: 2099-… } },
    { command: pnpm dev --port ${LOCK_PORT}, url: LOCK_BASE_URL,
      env: { EVENT_START_AT: 2099-…, PRELAUNCH_LOCK_ENABLED: "true" } },
  ]
  projects: [
    { name: "chromium",       testIgnore: "**/prelaunch-lock.spec.ts" },
    { name: "prelaunch-lock", testMatch: "**/prelaunch-lock.spec.ts",
      use: { baseURL: LOCK_BASE_URL } },
  ]

LOCK_PORT = process.env.E2E_LOCK_PORT ?? String(Number(PORT) + 1)
```

`tests/e2e/prelaunch-lock.spec.ts` — không tag `@auth`/`@local-db` (không cần Supabase, không cần
đăng nhập) ⇒ **chạy được trên CI**, đúng chỗ giá trị nằm.

## Related Code Files

Tạo: `tests/e2e/prelaunch-lock.spec.ts`.
Sửa: `playwright.config.ts` (webServer → array, thêm project + `testIgnore`) · `package.json`
(script `test:e2e:lock` = `playwright test --project=prelaunch-lock`, cho vòng lặp dev nhanh) ·
`.github/workflows/ci.yml:196-197` (sửa comment về số project).
Xoá: không. `tests/e2e/prelaunch.spec.ts:128` (`[C6]` lock TẮT) **giữ nguyên** — nó là nửa còn lại
của bảng và phase 08 mới là chủ file đó.

## Implementation Steps

1. **RED** — viết `tests/e2e/prelaunch-lock.spec.ts` TRƯỚC khi sửa config:
   - `[PL0]` sanity: `goto("/prelaunch")` → 200 và `[role="timer"]` visible (xác nhận đang nói với
     đúng ứng dụng, không phải server lạ giữ port).
   - `[PL1]`/`[PL2]`/`[PL3]`: `goto("/")`, `goto("/login")`, `goto("/kudos")` ⇒
     `await expect(page).toHaveURL(/\/prelaunch$/)`.
   - `[PL4]`: `goto("/prelaunch")` không redirect tiếp (URL vẫn `/prelaunch` sau `waitForLoadState`).
   Chạy `pnpm test:e2e prelaunch-lock.spec.ts` → **đỏ** (chạy trên server mặc định, lock TẮT, `/`
   trả về `/`).
2. Sửa `playwright.config.ts` thành 2 `webServer` + 2 project. Giữ `PORT`/`E2E_PORT` y nguyên cho
   phần cũ.
3. Chạy lại `pnpm test:e2e:lock` → **xanh**. Rồi `pnpm test:e2e` full → 217 + 5 test mới, 0 fail.
4. Xác nhận CI đếm được: `pnpm exec playwright test --grep-invert "@auth|@local-db" --list` phải
   liệt kê 5 test mới (chúng KHÔNG bị loại).
5. Sửa comment `ci.yml:196-197`.
6. 4 gate.

**Fallback đã định trước (đừng ứng biến):** nếu bước 2 không chạy được 2 `next dev` cùng repo cùng
lúc (Next 16 có thể tranh `.next/`), chuyển sang **config riêng** `playwright.lock.config.ts`
(`webServer` đơn, `PRELAUNCH_LOCK_ENABLED=true`, `distDir` riêng qua env nếu cần) + script
`test:e2e:lock` + **một step CI riêng** chạy nó. Điều kiện kích hoạt fallback: bước 3 fail vì lỗi
build/port, KHÔNG phải vì assertion. Ghi 1 dòng vào `plans/action-items.md` § Decisions khi dùng.

## Todo List

- [ ] RED: 4 assertion redirect đỏ trên server lock-TẮT, ghi exit code
- [ ] `[PL0]` sanity chạy TRƯỚC mọi assertion redirect
- [ ] `webServer` array + 2 project + `testIgnore` cho chromium
- [ ] `test:e2e:lock` trong `package.json`
- [ ] `--list` xác nhận 5 test mới không bị `--grep-invert` loại
- [ ] Comment `ci.yml` khớp số project
- [ ] `pnpm test:e2e` full: 217 cũ + mới, 0 fail

## Success Criteria

- RED thật: `[PL1]` fail với thông báo "expected URL /prelaunch, received `/`" — không phải timeout
  chờ server, không phải `net::ERR_CONNECTION_REFUSED`.
- GREEN: 5 test lock xanh ở project `prelaunch-lock`; `[C6]` (lock TẮT) vẫn xanh ở project `chromium`
  **trong cùng một lượt** ⇒ hai nửa bảng cùng được chứng minh.
- `grep -n "PRELAUNCH_LOCK_ENABLED" playwright.config.ts` → có hit (trước phase này: 0).
- 5 test mới nằm trong tập CI chạy (không tag `@auth`/`@local-db`).

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| 2 `next dev` cùng repo tranh `.next/` | trung bình | cao | `[PL0]` sanity bắt sớm; fallback config riêng đã định sẵn ở bước 2 |
| Server cũ đang giữ `LOCK_PORT` ⇒ test nói với app sai | trung bình | **cao** (xanh giả) | `E2E_LOCK_PORT` override được; `[PL0]` phải assert một dữ kiện chỉ đúng khi lock BẬT (`/` → `/prelaunch`) trước khi tin phần còn lại |
| Suite chậm thêm đáng kể | trung bình | thấp | project lock chỉ 5 test, 1 file; đo thời gian trước/sau và ghi lại |
| CI cài thiếu browser cho project mới | thấp | trung bình | project dùng `devices["Desktop Chrome"]` ⇒ vẫn là chromium đã cài |
| Ai đó thêm unit test cho `src/proxy.ts` | trung bình | thấp | ghi rõ trong docblock của spec mới: proxy ngoài allowlist coverage, e2e này LÀ lớp phủ |

**Rollback:** revert `playwright.config.ts` + xoá file spec mới. Không có DB, không có runtime code
nào đổi ⇒ rollback là thao tác git thuần.

## Security Considerations

Không đổi code runtime nào — phase này chỉ thêm hạ tầng test. Lưu ý duy nhất: `PRELAUNCH_LOCK_ENABLED`
chỉ được set trong `webServer.env` của config test, **không** ghi vào `.env.local`/`.env.example` với
giá trị `true` (bật vô ý sẽ khoá cả site khi dev).

## Next Steps

Không block ai. Phase 08 sau đó sở hữu `tests/e2e/prelaunch.spec.ts` và sẽ viết lại assertion chữ số
— hai file khác nhau, không tranh chấp.

## MoMorph refs:
- Countdown Prelaunch: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F011_CountdownPrelaunchPage/`
  (plan này không có `clarifications.md`)
- testPolicy: e2e-red-first
