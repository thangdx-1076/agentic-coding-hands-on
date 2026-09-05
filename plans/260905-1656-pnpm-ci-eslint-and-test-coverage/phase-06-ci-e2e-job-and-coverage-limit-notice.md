---
phase: 06
status: pending
priority: P1
effort: 1h
owner: implementer
depends_on: [04, 05]
file_ownership: [".github/workflows/ci.yml"]
---

# Phase 06 — CI job `e2e` + coverage-limit notice

## Context Links

- `clarifications.md` § Step 2b (tag `@auth` + `--grep-invert @auth`; env placeholder ở cả hai job) · **§ Known trade-off** (CI không phủ authenticated path — giới hạn phải được ghi rõ)
- `plans/reports/researcher-260905-1624-pnpm-and-ci.md` § B.2 (đọc code test: không test nào chạm Google thật), § B.3 (cache browser Playwright)
- `spec/system/architecture.md` § Data Flow → "Test topology" · § Deployment View

## Overview

**Priority**: P1 · **Status**: pending
Thêm job `e2e` vào `.github/workflows/ci.yml`: chạy **chỉ tập CI-safe** (`--grep-invert @auth`), và **nói thẳng ngay trong file lẫn trong log** rằng authenticated path không được CI phủ. Phase cuối, vì `--grep-invert @auth` chỉ có nghĩa sau khi phase 04 gắn tag.

## Key Insights

- **Yêu cầu cứng của đợt việc này**: một CI âm thầm bỏ qua test auth rồi báo xanh là bị cấm. "Ghi trong file" là mức tối thiểu — file YAML thì hiếm ai mở. Nên notice đi hai đường: (1) header comment trong `ci.yml`, (2) một step tường minh ghi giới hạn vào `$GITHUB_STEP_SUMMARY`, hiển thị ngay trang checks của PR mà không cần mở file nào.
- Không test nào chạm Google thật — mọi assertion OAuth đều `page.route(...).abort()` hoặc `.fulfill()` phía client. **CI không cần bất kỳ credential Google nào**, và điều đó cũng nên được ghi lại, vì nó lý giải vì sao job này chạy được mà không có secret.
- Job `e2e` **không** `needs: quality`. Chạy độc lập để một lỗi lint không bắt phải chờ, và một e2e chậm không chặn tín hiệu nhanh.
- Cache browser Playwright: khoá theo `runner.os` + **version chính xác** của `@playwright/test`, **không đặt `restore-keys`** — cache khớp một phần có thể trả về revision browser mà binary hiện tại từ chối, tệ hơn là không cache. Kể cả khi cache hit vẫn phải chạy `playwright install --with-deps chromium`: binary có sẵn nhưng system library thì không, đó là chế độ hỏng đã được ghi nhận.
- Chỉ cài `chromium` — `playwright.config.ts` chỉ khai đúng project đó.
- `webServer` trong `playwright.config.ts` tự khởi `pnpm dev` (phase 01 đã sửa), `reuseExistingServer: !process.env.CI` nên trên runner nó luôn khởi server mới. Không cần bước start server thủ công.
- `retries: 2` và `workers: 1` đã bật sẵn khi `process.env.CI` — không cần chỉnh thêm.
- Trong CI, Supabase không tới được là **trạng thái mặc định** (env placeholder). Đó chính là điều kiện mà test outage của phase 04 cần → chúng chạy thật, không skip. Success Criteria phải khẳng định **0 test skip**.

## Requirements

- Job `e2e` trên `ubuntu-latest`, Node pin 24, cùng bộ env placeholder như `quality`.
- Lệnh test: `pnpm exec playwright test --grep-invert @auth`.
- Header comment ở đầu `ci.yml` nêu rõ: job `e2e` KHÔNG phủ authenticated path; test cần Supabase sống mang tag `@auth` và chỉ chạy ở máy dev với `saa-app`; ai đọc "CI xanh" không được suy ra luồng đăng nhập đã được kiểm.
- Một step tên `Coverage limitation notice` ghi cùng nội dung đó vào `$GITHUB_STEP_SUMMARY`, chạy **kể cả khi test fail** (`if: always()`).
- Cache browser Playwright khoá theo version chính xác, không `restore-keys`.
- Upload `playwright-report/` làm artifact khi fail (`if: failure()`), retention ngắn.
- Nếu phase 04 không mint được code PKCE hợp lệ, notice phải nêu thêm dòng đó: nhánh callback thành công (US002-C2) chưa được phủ ở bất kỳ đâu.

## Architecture

```
.github/workflows/ci.yml   (nối tiếp phase 05, cùng file)
  header comment  ────────────────────────────────────┐
  jobs:                                               │ giới hạn nói 2 nơi
    quality  (phase 05)                               │
    e2e (ubuntu-latest, Node 24, KHÔNG needs quality) │
      env: NEXT_PUBLIC_* placeholder  → Supabase không tới được = điều kiện mong muốn
      checkout → pnpm/action-setup → setup-node(24, cache pnpm)
              → pnpm install --frozen-lockfile
              → đọc version @playwright/test → cache ~/.cache/ms-playwright (khoá chính xác, không restore-keys)
              → playwright install --with-deps chromium     (chạy cả khi cache hit)
              → pnpm exec playwright test --grep-invert @auth
              → Coverage limitation notice → $GITHUB_STEP_SUMMARY  ← if: always()
              → upload playwright-report/                          ← if: failure()
```

## Related Code Files

**Modify**: `.github/workflows/ci.yml`
**Create**: — · **Delete**: —

## Implementation Steps

1. Xác nhận tag đã tồn tại trước khi viết grep: `pnpm exec playwright test --grep @auth --list` phải liệt kê đúng tập local-only của phase 04. Không có tag → BLOCKED, không đoán.
2. Thêm job `e2e` vào `ci.yml` theo § Architecture, đặt sau `quality`, **không** `needs`.
3. Bước đọc version Playwright: lấy từ `package.json` (đang pin cứng `1.62.1`) và đưa vào key cache — pin cứng nghĩa là key ổn định cho tới khi ai đó bump có chủ đích.
4. Viết header comment ở đầu file. Câu chữ phải là khẳng định, không phải cảnh báo mơ hồ: nói rõ *cái gì* không được phủ, *vì sao* (Supabase là instance local `127.0.0.1`, runner không với tới), và *ở đâu* nó được phủ (máy dev với `saa-app`).
5. Step `Coverage limitation notice` (`if: always()`) ghi cùng nội dung vào `$GITHUB_STEP_SUMMARY`, kèm số test đã chạy và số test bị loại bởi `--grep-invert @auth`. Con số bị-loại là phần quan trọng nhất — nó biến "im lặng" thành "có ghi sổ".
6. Bước upload report khi fail, `retention-days: 7`.
7. Diễn tập cục bộ: tắt `saa-app`, đặt env placeholder, `pnpm exec playwright test --grep-invert @auth` → exit 0, **0 skip**.
8. `gh workflow run ci.yml --ref feat/login-google-oauth`, `gh run watch`. Xác nhận cả `quality` lẫn `e2e` xanh và chạy song song (thời gian bắt đầu chồng nhau, không nối đuôi).
9. Mở trang run trên GitHub, **mắt nhìn** vào phần summary — notice phải hiện ra, không phải chỉ nằm trong log.
10. Ghi số run + số test chạy / số test bị loại vào `evidence/ci-e2e-first-run.txt`.
11. Cập nhật `README.md`? **Không** — README thuộc phase 01. Nếu thấy cần ghi giới hạn CI vào README thì báo orchestrator mở việc riêng, đừng lấn ownership.

## Todo List

- [ ] Xác nhận tag `@auth` tồn tại (`--grep @auth --list`)
- [ ] Job `e2e` (không `needs: quality`), env placeholder
- [ ] Cache browser khoá theo version chính xác, không `restore-keys`
- [ ] `playwright install --with-deps chromium` chạy cả khi cache hit
- [ ] Header comment nêu giới hạn authenticated path
- [ ] Step notice → `$GITHUB_STEP_SUMMARY`, `if: always()`, có số test bị loại
- [ ] Upload `playwright-report/` khi fail
- [ ] Diễn tập cục bộ không Supabase: exit 0, 0 skip
- [ ] Dispatch chạy thật, xác nhận 2 job song song
- [ ] Nhìn tận mắt notice trên trang run
- [ ] Ghi evidence

## Success Criteria

| Command | Expected |
|---|---|
| `pnpm exec playwright test --grep-invert @auth` (không Supabase, env placeholder) | exit 0, **0 skipped** |
| `gh run watch` sau dispatch | cả `quality` và `e2e` conclusion `success` |
| `gh run view --json jobs` | `e2e` khởi động không chờ `quality` xong |
| `grep -c "authenticated" .github/workflows/ci.yml` | ≥ 2 hit (header comment + step notice) |
| Trang run trên GitHub | phần Summary hiện notice kèm số test bị loại bởi `--grep-invert @auth` |
| Dispatch lần hai | job `e2e` nhanh hơn rõ — cache browser hoạt động |

## Rollback

Gỡ job `e2e` khỏi `ci.yml` (revert một commit) — job `quality` của phase 05 vẫn nguyên vẹn. Không có state ngoài repo. **Thứ tự rollback bắt buộc**: nếu định revert phase 04, phải revert phase 06 TRƯỚC — bỏ tag `@auth` mà giữ `--grep-invert @auth` sẽ khiến CI chạy cả 2 test `Authenticated` và đỏ vì không có Supabase.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| CI xanh bị đọc thành "luồng đăng nhập đã được kiểm" | M×H | Notice hai đường (file + step summary), kèm **số test bị loại** — che giấu trở thành bất khả thi |
| Test bị skip im lặng làm job xanh giả | M×H | Success Criteria đòi 0 skip; điều kiện skip của phase 04 đã có `!process.env.CI` |
| Cache browser trả revision cũ không tương thích | M×M | Khoá theo version chính xác, không `restore-keys`; luôn chạy `playwright install --with-deps` |
| E2E flaky trên runner (dev server khởi chậm) | M×M | `webServer.timeout` đã 120s; `retries: 2` + `workers: 1` bật sẵn khi CI; đỏ vì flaky thì nới timeout, KHÔNG nới assertion |
| Tag `@auth` gắn sót ở một test cần Supabase → CI đỏ ngẫu nhiên | M×M | Bước 1 đối chiếu `--grep @auth --list` với bảng ở phase 04; bước 7 diễn tập không Supabase là cổng thật |
| Ai đó về sau viết test cần Supabase mà quên tag | M×M | Tag hiện ngay tại chỗ khai test (đây chính là lý do chọn tag thay vì tách file); job `e2e` đỏ ngay lần chạy đầu |

## Security Considerations

- Không secret, không credential Google — đã đọc code test và xác nhận mọi request `authorize` đều bị chặn ở client, không lần nào rời browser context. Ghi lại điều này trong comment để người sau không "bổ sung secret cho đủ".
- Artifact `playwright-report/` chỉ upload khi fail, retention 7 ngày; report có thể chứa trace URL — không có session thật vì tập CI-safe không đăng nhập bao giờ.
- `permissions` mặc định chỉ đọc; job không ghi ngược vào repo.
- Giới hạn được công bố công khai chính là biện pháp bảo mật: một cổng merge tự nhận phủ nhiều hơn thực tế là thứ nguy hiểm hơn cả không có cổng.

## Next Steps

Kết thúc đợt việc. Hai việc mở, thuộc phạm vi khác, cần orchestrator quyết riêng: (1) promote `spec/system/architecture.md` từ `draft` vào `docs/vi/` lúc implement-start theo quy trình SDD; (2) nếu muốn CI phủ nốt authenticated path thì phải mở lại quyết định "không `supabase init` trong app" — đó là quyết định của người dùng, không phải việc phase này tự thay đổi.
