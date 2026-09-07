---
phase: 01
feature: F005
track: test gate
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 1h
owner: tester
file_ownership: ["tests/e2e/standards.spec.ts"]
---

# Phase 01 — RED: `standards.spec.ts` + hợp đồng DOM

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (frame `3204:6051`, 1440×1796, bg `#00101A`)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `momorph/test-cases.csv` — 9 TC (`TC_THELE_GUI_001…004`, `TC_THELE_FUN_001…005`); **GUI_003 + FUN_005 KHÔNG implement** (out of scope, clarifications.md § disabled)
- `spec/F005_StandardsRulesPage/technical-spec.md` § 4.5 (DOM/a11y contract), § 5.1 (SC-001…SC-006)
- `spec/SCR005_Standards/spec.md` § 3 (E01-E09), § 10 (Entry/Exit)
- `tests/e2e/awards.spec.ts` — khuôn spec hiện có (`test.use({ storageState: … })`, describe block, comment nêu lý do)
- `data/preview.png` — nội dung verbatim vi

## Overview

**Priority**: P2 · **Status**: pending · **Owner: `tester`**
**Goal (1 dòng)**: Viết `tests/e2e/standards.spec.ts` phủ 7 TC thoả được, chạy nó và **thu được RED thật** (exit ≠ 0 do assertion màn hình) trước khi bất kỳ code UI nào tồn tại.

## Out of scope

- TC_THELE_GUI_003, TC_THELE_FUN_005 (`disabled` state) — **không viết test**, ghi 1 comment trong file spec nói rõ vì sao (BR-005 + clarifications D001).
- TC_THELE_GUI_004 (hover đổi màu) — hover không assert được đáng tin bằng Playwright assertion; giao cho visual validation phase 06. Ghi comment.
- Không sửa `ci.yml`, không sửa file nào trong `src/`, không tạo helper mới.

## Key Insights

- **RED hợp lệ là RED do assertion.** `/standards` chưa có `page.tsx` → Next trả 404 page → `expect(page.locator("h1")).toContainText("Thể lệ")` fail. Đó là RED thật. RED do `webServer` không dựng được, do thiếu browser, do lỗi import — **không tính**, phải sửa hạ tầng rồi chạy lại.
- **Giết dev server cũ trước khi chạy.** `playwright.config.ts:reuseExistingServer: !process.env.CI` — một `pnpm dev` cũ còn sống ở `:3000` sẽ được tái dùng và phục vụ build cũ. Ghi nhận từ phiên trước: đúng cơ chế này đã làm `home.spec.ts` trông flaky trong khi code không sai. Luôn: `lsof -ti:3000 | xargs -r kill -9` trước mỗi lượt.
- **Không tag `@local-db`/`@auth`.** Trang không chạm Supabase, không chrome đọc session → chạy được nguyên vẹn trong CI. Đây là điểm khác `/awards` và là lợi thế: đừng vô tình dán tag rồi mất luôn phủ CI.
- **Không chrome → locator sạch.** Trang có 0 `<header>`, 0 `<footer>`, đúng 1 `a[href="/kudos"]`. Chính vì thế `page.locator('a[href="/kudos"]')` ở đây an toàn, trong khi ở `awards.spec.ts` nó nổ strict-mode (3 element). Assert luôn `toHaveCount(0)` cho header/footer — đó là cách kiểm chứng được quyết định "không bọc chrome", đừng để nó ngầm.
- **Nội dung là `character`, không phải `itemName`.** Tên layer của TEXT node không nhất thiết bằng nội dung hiển thị. Badge thứ 6 tên layer là `ROOT FUTHER` (thiếu R) nhưng `get_node("I3204:6088;737:20392").character` trả `ROOT FURTHER` → **assert `ROOT FURTHER`**. Tương tự `Đóng` (`I3204:6093;186:2760`) và `Viết KUDOS` (`I3204:6094;186:1568`) mang tên component mặc định "Awards Information Navigation Links". Mọi string còn lại name == character (đã đối chiếu, `clarifications.md` § Caption badge).
- **`<main>` là scroll container**, không phải window. FR-301/302 phải đọc `scrollTop`/`scrollHeight`/`clientHeight` của `main` qua `evaluate`, không dùng `page.mouse.wheel` rồi assert `window.scrollY`.
- **FUN_002 (nội dung vừa khung → không cuộn) chỉ đúng ở viewport rất cao.** Nội dung thật dài ~1400px. Assert ở `1440×2400`: `scrollHeight - clientHeight <= 1`. Đừng bịa một trang nội dung ngắn để chiều test.
- **Nhánh fallback của "Đóng" là điểm mong manh nhất.** `window.history.length > 1` là heuristic. Trong Chromium do Playwright lái, `page.goto()` đầu tiên trên context mới **thường** cho `history.length === 1` (about:blank bị replace). Bước 5 dưới đây bắt buộc **đo thật** giá trị đó trước khi khoá assertion — nếu là 2, báo lại chứ đừng viết test theo giả định.

## Requirements — hợp đồng DOM (authoritative)

Phase 04 đọc thẳng file spec này, không suy diễn lại. Nội dung verbatim vi lấy từ `data/preview.png` + clarifications.md § "Nội dung panel".

| # | Contract | TC |
|---|---|---|
| C1 | Đúng 1 `<main>`, `overflow-y:auto`, cao bằng viewport; `<h1>` = `Thể lệ` | GUI_001 |
| C2 | `page.locator("header")` count 0 · `page.locator("footer")` count 0 — không chrome, có chủ đích | GUI_001 |
| C3 | Đúng 3 `<section>`, mỗi cái 1 `<h2>`, đúng thứ tự: `NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC` → `NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN` → `KUDOS QUỐC DÂN` | GUI_001 |
| C4 | Section 1: đúng 4 `<img>` với `alt` lần lượt `New Hero`, `Rising Hero`, `Super Hero`, `Legend Hero`; 4 dòng điều kiện hiển thị: `Có 1-4 người gửi Kudos cho bạn`, `Có 5-9 người gửi Kudos cho bạn`, `Có 10–20 người gửi Kudos cho bạn` *(en-dash)*, `Có hơn 20 người gửi Kudos cho bạn` | GUI_001 |
| C5 | Section 2: đúng 6 `<img>`; 6 caption là **DOM text thật** (không phải `alt`), đúng thứ tự `REVIVAL`, `TOUCH OF LIGHT`, `STAY GOLD`, `FLOW TO HORIZON`, `BEYOND THE BOUNDARY`, `ROOT FURTHER` | GUI_001 |
| C6 | Section 2 intro và section 3 body mỗi cái chứa ký tự `❤️` | FR-003 |
| C7 | Footer: đúng 1 `<button>` chứa text `Đóng`, đúng 1 `<a href="/kudos">` chứa text `Viết KUDOS`; **không** element nào có thuộc tính `disabled` | GUI_002 |
| C8 | `main.scrollHeight > main.clientHeight` ở viewport 1280×720; cuộn xuống → `scrollTop > 0` và chạm đáy (`scrollTop + clientHeight >= scrollHeight - 2`); cuộn lên → về `0` | FUN_001 |
| C9 | Viewport 1440×2400: `main.scrollHeight - main.clientHeight <= 1` | FUN_002 |
| C10 | Vào `/` → click link `Tiêu chuẩn chung` ở footer → ở `/standards` → click `Đóng` → URL về `/` | FUN_003 (nhánh có history) |
| C11 | `page.goto("/standards")` trực tiếp (context mới) → click `Đóng` → URL là `/` | FUN_003 (nhánh fallback) |
| C12 | Click `Viết KUDOS` → URL chứa `/kudos` (trang đích 404, **không** assert nội dung đích) | FUN_004 |
| C13 | Cookie `NEXT_LOCALE=en` → `<h1>` là `Rules`, nút là `Close` / `Write KUDOS` — bản EN không rỗng | RISK EN |
| C14 | Không `pageerror` nào khi load | SC-003 |

## Architecture

```text
tests/e2e/standards.spec.ts
 └─ describe "Standards rules page (public, no DB)"     ← KHÔNG tag, chạy cả ở CI
      test.use({ storageState: { cookies: [], origins: [] } })   ← khách ẩn danh
      C1-C7   layout + nội dung + footer          (GUI_001, GUI_002)
      C8-C9   scroll                              (FUN_001, FUN_002)
      C10-C12 điều hướng Đóng ×2 nhánh, Viết KUDOS (FUN_003, FUN_004)
      C13     locale EN
      C14     no pageerror
```

## Related Code Files

**Create**: `tests/e2e/standards.spec.ts`
**Modify**: — · **Delete**: —
**Chỉ đọc**: `tests/e2e/awards.spec.ts` (khuôn), `playwright.config.ts`, `src/app/(public)/_components/site-footer.tsx:74` (link vào trang)

## Implementation Steps

1. `lsof -ti:3000 | xargs -r kill -9` — dọn dev server cũ.
2. Đọc `momorph/test-cases.csv` + technical-spec § 4.5, chép hợp đồng C1-C14 ở trên vào file spec dưới dạng comment đầu file.
3. Viết `tests/e2e/standards.spec.ts` theo khuôn `awards.spec.ts`: 1 `describe`, không tag, `test.use({ storageState: { cookies: [], origins: [] } })`.
4. Với C10: điều hướng thật từ `/` qua footer link (`getByRole("link", { name: "Tiêu chuẩn chung" })`) — chứng minh luôn link chết đã được lấp.
5. **Đo `window.history.length` thật** ở nhánh C11 bằng một `page.evaluate` tạm, in ra, xác nhận `=== 1`. Nếu ra `2` → dừng, báo lại: heuristic của clarifications sẽ sai trong môi trường test, cần chốt lại cách nhận biết "không có history" trước khi khoá assertion.
6. Chạy `pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list`. Ghi lại **exit code + danh sách test fail + 1 dòng thông báo lỗi đại diện**.
7. Xác nhận RED là RED assertion: lỗi phải là `expect(locator).toContainText` / `toHaveCount` timeout, **không** phải `webServer` timeout, `browserType.launch`, hay `Cannot find module`.
8. Ghi bằng chứng vào `evidence/red-evidence.md`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure` (trích nguyên văn).
9. Bàn giao: phase 02/03 mở khoá; phase 04 nhận file spec làm hợp đồng DOM read-only.

## Todo List

- [ ] Dọn `:3000`
- [ ] Chép C1-C14 vào comment đầu file spec
- [ ] `standards.spec.ts` — 1 describe, không tag, ẩn danh
- [ ] Comment nêu lý do bỏ GUI_003 / FUN_005 / GUI_004
- [ ] Đo thật `window.history.length` cho nhánh C11
- [ ] Chạy → RED, ghi exit code + fail list
- [ ] Xác nhận RED là assertion, không phải hạ tầng
- [ ] `evidence/red-evidence.md` đủ 4 trường

## Success Criteria

- `pnpm test:e2e tests/e2e/standards.spec.ts` **exit ≠ 0**, và mọi fail đều là assertion về `h1`/`section`/`button` — không có fail hạ tầng.
- Spec có **≥ 10 test**, không test nào bị `.skip`, không test nào gắn tag.
- `evidence/red-evidence.md` chứa `redCommand`, `redExitCode`, và trích nguyên văn `redFailure`.
- `pnpm exec playwright test --list` chạy sạch (file spec compile được) — chứng minh RED không phải lỗi cú pháp.
- Không file nào ngoài `tests/e2e/standards.spec.ts` bị chạm.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| RED giả vì dev server cũ ở `:3000` | **Cao** | Cao — RED vô giá trị, mất cả test gate | Bước 1 bắt buộc; xác nhận lại ở bước 7 |
| `history.length === 2` → C11 sai từ gốc | Trung bình | Cao — test đỏ vĩnh viễn dù code đúng | Bước 5 đo thật trước khi khoá assertion; sai thì báo, không đoán |
| Viết assertion cho hover (GUI_004) rồi flaky | Trung bình | Trung bình | Đã loại khỏi scope, giao visual phase 06, ghi comment |
| Gõ nhầm `ROOT FUTHER` (tên layer) / `10-20` (hyphen) | **Cao** | Cao — phase 04 sẽ code theo test sai | Copy-paste từ bảng C4/C5, không gõ tay; sau khi viết: `grep "ROOT FUTHER" tests/e2e/standards.spec.ts` phải **rỗng**, `grep "10–20"` phải ra en-dash |
| Dán tag `@local-db` theo quán tính từ `awards.spec.ts` | Trung bình | Trung bình — mất phủ CI vô cớ | Ghi rõ ở Key Insights + Success Criteria |
| C8 chạm đáy sai vì sticky footer nằm ngoài `main` | Thấp | Trung bình | Dùng ngưỡng `>= scrollHeight - 2`, không đòi bằng tuyệt đối |

## Security Considerations

- Không credential nào trong spec: trang công khai, không đăng nhập, không Supabase.
- `storageState` rỗng — không mượn cookie phiên của test khác.
- Không commit `test-results/`, `playwright-report/`, `.playwright-mcp/`.

## Next Steps

Mở khoá phase 02 và phase 03 (chạy song song được). Phase 04 chỉ bắt đầu sau khi RED có bằng chứng ghi trong `evidence/red-evidence.md`.
