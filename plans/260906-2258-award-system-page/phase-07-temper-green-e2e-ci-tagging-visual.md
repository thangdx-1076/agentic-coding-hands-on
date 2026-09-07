---
phase: 07
feature: F004
track: —
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership: ["tests/e2e/awards.spec.ts", ".github/workflows/ci.yml"]
---

# Phase 07 — Temper: GREEN e2e, gắn tag CI, visual validation

## Context Links

- `tests/e2e/awards.spec.ts` (RED hiện tại, 10 test) — **file này chỉ tester được sửa**
- `.github/workflows/ci.yml` header comment (§ "Known coverage limit") + job `e2e` (`--grep-invert @auth`)
- `tests/e2e/home.spec.ts:638` — cách gắn tag hiện có: `test.describe("Authenticated", { tag: "@auth" }, …)`
- `plans/reports/researcher-260906-2258-repo-conventions.md` § 4 (cơ chế loại trừ `@auth`)
- `evidence/red-evidence.md`

## Overview

**Priority**: P1 · **Status**: pending · **Owner: `tester`**
Chạy `awards.spec.ts` xanh trên máy dev có `saa-app` chạy, sửa 2 defect có sẵn trong RED, tách nhóm test phụ thuộc DB ra khỏi CI, rồi visual validation qua Playwright MCP.

## Key Insights

### Căng thẳng CI ↔ dữ liệu — phương án đã chốt

CI chạy `pnpm exec playwright test --grep-invert @auth` với `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` — một địa chỉ runner không bao giờ tới được. `getAwards` fail-open `[]` → trang render empty-state → mọi assertion về 6 section, 6 nav link, tiêu đề/số lượng/giá trị, ảnh, click-scroll đều đỏ. `awards.spec.ts` hiện **không gắn tag nào** nên nó sẽ chạy nguyên vẹn trong CI.

**Chốt: tách `awards.spec.ts` thành 2 describe, nhóm phụ thuộc DB gắn tag MỚI `@local-db`, và CI đổi sang `--grep-invert "@auth|@local-db"`.**

| Nhóm | Tag | Test | Chạy ở CI? |
|---|---|---|---|
| `Awards page chrome` | *(không tag)* | ID-0, ID-4, ID-8, ID-13, + 1 test empty-state mới | ✅ |
| `Awards content` | `@local-db` | ID-3, ID-5, ID-6, ID-7, ID-9, ID-11 | ❌ (chỉ máy dev) |

Vì sao **không** dùng lại tag `@auth`: trang này công khai, không có gì thuộc "authenticated path". Dán `@auth` lên nó sẽ làm bản disclosure trong `ci.yml` ("the excluded tests require a live Supabase instance… the authenticated flow is not tested") nói sai về thứ bị loại. Cái header comment dài trong `ci.yml` là một artifact về sự trung thực của repo này — làm nó nói dối để tiết kiệm 4 dòng sửa là lỗ vốn.

Vì sao **không** làm nội dung tới được CI: (a) chép 6 giải vào `messages/*.json` hoặc một hằng fallback trong repo là nhân bản nội dung, trái thẳng `clarifications.md` ("nguồn sự thật của nội dung giải là DB, không nhân bản sang JSON") và sẽ âm thầm lệch khi ai đó sửa DB; (b) chạy `supabase start` trong CI đã bị bác một lần rồi (`ci.yml` header). Không mở lại.

Hệ quả phải nói thẳng: CI sau phase này chỉ chứng minh `/awards` **render được và không vỡ khi Supabase chết**. Nó không chứng minh nội dung 6 giải đúng — điều đó chỉ được chứng minh trên máy dev. Ghi vào phần disclosure của `ci.yml`, đừng để nó ngầm.

### 2 defect có sẵn trong RED (tester sửa, KHÔNG phải UI implementer)

1. **`awards.spec.ts:197`** — `page.locator('a[href="/kudos"]')` sẽ khớp **3** element khi header/footer thật render (nav header `site-header.tsx:75`, CTA trong `kudos-section.tsx:58`, link footer `site-footer.tsx:62`) → strict-mode violation, không phải fail assertion. Sửa: nhắm đúng CTA của khối Kudos qua `aria-label` đã có sẵn — `page.getByLabel("Chi tiết Sun* Kudos")` (nhãn dựng từ `Chi tiết ${kudos.heading}`). Đừng "sửa" bằng `.first()`: nó che mất việc test đang nhắm nhầm thứ.
2. **`awards.spec.ts:181-184`** — `section.locator("img")` rồi `toBeVisible()` + `toHaveCount(1)`. Ảnh giải theo thiết kế là **2 lớp** (`/home/Award_BG.png` + PNG tên giải, `award-seed-content.md` § "Ảnh giải") → 2 `<img>`, strict-mode violation ở `toBeVisible()` và count sai. Sửa: `await expect(section.locator("img")).toHaveCount(2)` + `await expect(section.locator("img").first()).toBeVisible()`, kèm comment trỏ về `award-seed-content.md`. Đây là **sửa test cho khớp thiết kế**, không phải nới lỏng test.

### Rủi ro locator còn lại cần soi khi chạy thật

- `text=` không dấu nháy khớp **substring** → `section.locator('text=10')`, `text=01`, `text=02` có thể khớp nhiều node (giá trị giải `10.000.000 VNĐ`, phần tử cha lồng nhau). Nếu strict-mode nổ, siết thành locator có `exact` hoặc scope vào đúng phần tử số lượng — **không** dùng `.first()` để giấu.
- `toBeInViewport({ ratio: 0.5 })` với section cao (mô tả 2 đoạn của `signature-2025-creator`, `mvp`) có thể không bao giờ đạt. Nếu vậy: báo lại phase 05 siết chiều cao trước; chỉ hạ ratio khi layout đã đúng design mà vẫn không đạt, và ghi lý do vào file test.

## Requirements

- Chạy đúng lệnh dự án: `pnpm exec playwright test tests/e2e/awards.spec.ts --reporter=list` (máy dev, `saa-app` đang chạy) → exit 0.
- Chạy lệnh CI thật trên máy: `pnpm exec playwright test --grep-invert "@auth|@local-db"` → exit 0 **với Supabase tắt**, chứng minh nhóm CI-safe không phụ thuộc DB.
- `tests/e2e/home.spec.ts` vẫn xanh (phase 02 đã đổi tên component; DOM không đổi).
- Không làm yếu bất kỳ assertion nào; mọi thay đổi test phải kèm comment nêu lý do.
- Visual validation `/awards` bằng Playwright MCP: desktop 1440, tablet 768, mobile 375; cuộn trước khi chụp (ảnh lazy).

## Architecture

```text
tests/e2e/awards.spec.ts
 ├─ describe "Awards page chrome (CI-safe)"                 → chạy mọi nơi
 │    ID-0 public load · ID-4 title/caption · ID-8 kudos CTA · ID-13 no pageerror
 │    + NEW: Supabase unreachable → 200 + empty-state, không <nav>, không section
 └─ describe "Awards content", { tag: "@local-db" }         → chỉ máy dev có saa-app
      ID-3 · ID-5 · ID-6 · ID-7 · ID-9 · ID-11

.github/workflows/ci.yml
 ├─ step "Count e2e coverage split"  → 2 chỗ `--grep-invert` đổi thành "@auth|@local-db"
 ├─ step "Run CI-safe e2e tests"     → đổi theo
 └─ step "Coverage limitation notice" + header comment → thêm 1 gạch đầu dòng về `@local-db`
```

## Related Code Files

**Modify**: `tests/e2e/awards.spec.ts`, `.github/workflows/ci.yml`
**Create**: — · **Delete**: —
**Chỉ đọc**: `src/app/(public)/awards/**` — tester không sửa file implementation; lỗi UI thì trả bounded fix về `momorph-ui-implementer`.

## Implementation Steps

1. Bật `saa-app` (Docker Desktop + `supabase start`), xác nhận 6 dòng `awards` (phase 01 đã áp).
2. Chạy `pnpm exec playwright test tests/e2e/awards.spec.ts` để chụp trạng thái đỏ đầu tiên sau khi có code — ghi lại exit code + danh sách fail.
3. Sửa defect 1 (`:197` → `getByLabel("Chi tiết Sun* Kudos")`).
4. Sửa defect 2 (`:181-184` → `toHaveCount(2)` + `.first()` visible, kèm comment).
5. Tách 2 describe, gắn `{ tag: "@local-db" }` cho nhóm nội dung; thêm test empty-state vào nhóm CI-safe.
6. Chạy lại tới xanh; xử lý các va chạm strict-mode `text=` theo hướng siết chứ không nới.
7. Sửa `ci.yml`: 2 dòng `--grep-invert` trong step count, 1 dòng trong step run, thêm dòng disclosure về `@local-db` vào "Coverage limitation notice" và vào header comment.
8. Tắt Supabase → chạy `pnpm exec playwright test --grep-invert "@auth|@local-db"` → phải exit 0.
9. Visual validation qua Playwright MCP ở 3 viewport; cuộn hết trang trước mỗi lần chụp; **xoá `.playwright-mcp/` trước khi chạy `pnpm format:check`**.
10. Đối chiếu ảnh chụp với frame `313:8436`; mismatch vật chất → trả bounded fix về `momorph-ui-implementer`, không tự sửa UI.

## Todo List

- [x] Ghi lại lượt chạy đỏ đầu tiên (exit code + fail list)
- [x] Sửa defect `:197` bằng `getByLabel`, không `.first()`
- [x] Sửa defect `:181-184` thành `toHaveCount(2)` + comment
- [x] Tách 2 describe + tag `@local-db` + test empty-state mới
- [x] `awards.spec.ts` xanh với Supabase bật
- [x] `ci.yml` đổi grep-invert + cập nhật disclosure
- [x] Nhóm CI-safe xanh với Supabase TẮT
- [x] Visual 3 viewport, dọn `.playwright-mcp/`
- [x] `home.spec.ts` vẫn xanh

**Post-delivery corrections** (orchestrator after tester's pass):
- (a) CI-safe group reported as DB-independent, went RED — restored outage test using `supabaseReachable` skip-inversion (per `tests/e2e/login.spec.ts:583-594` precedent); 6/6 green under `CI=1`.
- (b) Tester reported `home.spec.ts` as "26/27, 1 pre-existing flaky" — not flaky; stale `pnpm dev` on :3000 serving wrong `EVENT_START_AT`. Clean server → 27/27 green.

## Success Criteria

- `pnpm exec playwright test tests/e2e/awards.spec.ts` exit 0, 11 test (10 cũ + 1 empty-state).
- `pnpm exec playwright test --grep-invert "@auth|@local-db"` exit 0 **khi Supabase tắt**.
- `ci.yml` step count/run dùng cùng một chuỗi grep-invert (không lệch nhau → số "excluded" mới đúng).
- Disclosure trong `ci.yml` nói rõ: nội dung 6 giải KHÔNG được CI chứng minh.
- Không assertion nào bị xoá hay hạ chuẩn mà không có comment lý do.
- Ảnh visual 3 viewport khớp frame MoMorph; sai lệch (nếu có) đã được ghi và giao lại.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Sửa test bằng `.first()` cho nhanh → giấu bug thật | Trung bình | Cao — mất giá trị của cả bộ RED | Cấm rõ ở đây; mọi thay đổi assertion phải có comment lý do |
| Đổi grep-invert ở step run mà quên step count → số disclosure sai | Trung bình | Thấp–Trung bình | Success Criteria yêu cầu 2 chỗ khớp chuỗi |
| Regex `"@auth\|@local-db"` bị shell/YAML nuốt ký tự `\|` | Trung bình | Trung bình — CI đỏ hoặc lọc sai | Bọc trong nháy kép, verify bằng `--list` ở bước 8 trước khi push |
| `toBeInViewport(0.5)` chập chờn vì section cao | Trung bình | Trung bình — test flaky | Ưu tiên siết layout ở phase 05; hạ ratio là phương án cuối, phải ghi lý do |
| Quên xoá `.playwright-mcp/` → `format:check` đỏ | Trung bình | Thấp | Bước 9 ghi sẵn |
| `retries: 2` ở CI che một test thật sự flaky | Thấp | Trung bình | Chạy local `--repeat-each=3` cho ID-9/ID-11 trước khi đóng phase |

## Security Considerations

- Không đưa `ANON_KEY`/`SERVICE_ROLE_KEY` thật vào `ci.yml` hay vào file test — giữ nguyên cặp placeholder hiện có; nhóm `@local-db` chưa bao giờ chạy ở runner nên không cần credential.
- Ảnh chụp visual không chứa dữ liệu người dùng (trang công khai, viewer ẩn danh) — vẫn không commit `.playwright-mcp/`.
- Không nới `forbidOnly`/`retries`; không thêm `--grep` bỏ qua test nào khác.

## Next Steps

- Ghi vào `plans/action-items.md`: (1) chủ spec xác nhận `/awards` công khai (TC ID-1 bị superseded); (2) `/kudos` chưa tồn tại → TC ID-12/ID-14 không thoả; (3) bản dịch EN cho nội dung 6 giải; (4) nợ đổi tên khoá chrome `home.*` → `chrome.*`; (5) nội dung 6 giải không được CI chứng minh.
- Sau khi xanh: `reviewer` đọc toàn bộ diff, rồi `doc-writer` cập nhật `docs/` nếu spec F004 được promote khỏi trạng thái draft.
