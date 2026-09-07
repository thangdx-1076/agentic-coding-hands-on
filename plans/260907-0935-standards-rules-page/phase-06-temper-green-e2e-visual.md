---
phase: 06
feature: F005
track: —
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 1.25h
owner: tester
file_ownership: ["tests/e2e/standards.spec.ts"]
---

# Phase 06 — Temper: GREEN e2e, visual validation, regression

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (frame `3204:6051`, 1440×1796)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `tests/e2e/standards.spec.ts` (RED từ phase 01) — **chỉ `tester` được sửa file này**
- `evidence/red-evidence.md` — `redCommand`, `redExitCode`, `redFailure` để đối chiếu GREEN
- `phase-01-red-e2e-standards-contract.md` § Requirements — bảng C1-C14
- `data/preview.png` + frame `3204:6051` — chuẩn đối chiếu visual
- `.github/workflows/ci.yml` — job `e2e` chạy `--grep-invert "@auth|@local-db"`

## Overview

**Priority**: P2 · **Status**: pending · **Owner: `tester`**
**Goal (1 dòng)**: Chạy đúng `redCommand` cho ra GREEN, chứng minh spec chạy được trong điều kiện CI (Supabase tắt), rồi visual-validate 3 viewport và trả lỗi UI (nếu có) về `momorph-ui-implementer`.

## Out of scope

- **Không sửa `ci.yml`.** Spec này không phụ thuộc DB → chạy được nguyên vẹn ở CI với `--grep-invert "@auth|@local-db"` hiện tại. Không thêm tag, không đổi grep.
- Không sửa file nào trong `src/` — lỗi UI thì trả bounded fix về `momorph-ui-implementer`.
- Không implement TC_THELE_GUI_003 / FUN_005 (`disabled`) — out of scope đã chốt.

## Key Insights

- **GREEN phải là cùng một lệnh với RED.** Chạy lại đúng `redCommand` đã ghi ở `evidence/red-evidence.md`, không đổi đường dẫn, không thêm `--grep`. Đổi lệnh rồi báo xanh là làm hỏng giá trị của cả test gate.
- **Giết `:3000` trước mỗi lượt.** `reuseExistingServer: !CI` sẽ tái dùng dev server cũ đang phục vụ build cũ. Ghi nhận từ phiên trước: đúng cơ chế này đã bị báo nhầm thành "flaky test" trong khi code không sai. `lsof -ti:3000 | xargs -r kill -9`.
- **Đây là spec CI-safe đầu tiên phủ được nội dung thật.** `/awards` phải gắn `@local-db` vì nội dung nằm trong Supabase; `/standards` lấy nội dung từ `messages/*.json` trong repo → CI chứng minh được **cả** render **lẫn** nội dung. Chứng minh điều đó bằng cách chạy `CI=1 pnpm exec playwright test --grep-invert "@auth|@local-db"` với Supabase **tắt** và phải xanh.
- **Sửa test chỉ theo hướng siết, không nới.** Nếu một locator nổ strict-mode, nhắm đúng element hơn — **không** `.first()`, **không** hạ assertion. Mọi thay đổi assertion phải kèm comment nêu lý do (nếp `awards.spec.ts` đang giữ).
- **Nhánh fallback C11 là chỗ dễ vỡ nhất.** Nếu Chromium cho `history.length === 2` ở lượt `goto` đầu (about:blank không bị replace), heuristic `> 1` sẽ chọn `router.back()` và test đỏ dù logic đúng theo clarifications. Xử lý: (a) tạo context **mới tinh** cho test đó; (b) nếu vẫn 2, **không** xoá test và **không** đổi ngưỡng trong code — ghi lại số đo thật, giữ nhánh có-history (C10) là assertion chính, chuyển C11 thành `test.fixme` **kèm comment trỏ về unit test đã phủ nhánh đó ở phase 03**, và ghi vào `plans/action-items.md` cho người chốt cách nhận biết "không có history".
- **`.playwright-mcp/` phải xoá trước `pnpm format:check`** — nếu không, format gate đỏ vì file ảnh/JSON do MCP sinh ra (ghi nhận từ phiên trước).
- **Cuộn trước khi chụp visual** — ảnh lazy chưa load sẽ chụp ra khung trống và bị đọc nhầm thành "thiếu badge".
- **Regression bắt buộc**: phase 02 đã đụng `site-footer.tsx` (mọi trang) và `widget-button.tsx` (`/`). `home.spec.ts` và nhóm CI-safe của `awards.spec.ts` phải còn xanh; đỏ ở đó là regression thật, không phải nhiễu.

## Requirements

- `pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list` → **exit 0**, ≥10 test, 0 skip ngoài trường hợp C11 đã ghi lý do.
- `CI=1 pnpm exec playwright test --grep-invert "@auth|@local-db"` với Supabase **tắt** → exit 0 (chứng minh spec mới không kéo dependency nào vào CI).
- `pnpm test:e2e tests/e2e/home.spec.ts` → exit 0 (regression footer + icon promote).
- Nhóm CI-safe của `awards.spec.ts` → exit 0.
- Visual validation `/standards` qua Playwright MCP: desktop 1440, tablet 768, mobile 375; cuộn hết panel trước mỗi lần chụp; đối chiếu frame `3204:6051`.
- `rm -rf .playwright-mcp/` trước `pnpm format:check`.

## Architecture

```text
lượt 1  giết :3000 → pnpm test:e2e tests/e2e/standards.spec.ts       → phân loại đỏ còn lại
           ├─ đỏ vì DOM lệch hợp đồng   → bounded fix về momorph-ui-implementer
           ├─ đỏ vì nội dung/khoá i18n  → bounded fix về implementer (phase 02/05)
           └─ đỏ vì test viết sai       → tester sửa, SIẾT không NỚI, kèm comment
lượt 2  Supabase TẮT, CI=1 → --grep-invert "@auth|@local-db"          → phải xanh
lượt 3  home.spec.ts + awards CI-safe                                 → regression
lượt 4  Playwright MCP: 1440 / 768 / 375, cuộn rồi chụp               → đối chiếu design
lượt 5  rm -rf .playwright-mcp/ → pnpm format:check                    → gate sạch
```

## Related Code Files

**Modify**: `tests/e2e/standards.spec.ts` *(chỉ khi test sai, kèm comment lý do)*
**Create**: — · **Delete**: —
**Chỉ đọc**: `src/app/(public)/standards/**`, `messages/{vi,en}.json`, `public/standards/*`

## Implementation Steps

1. `lsof -ti:3000 | xargs -r kill -9`.
2. `pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list`; ghi exit code + fail list; **phân loại từng fail** theo 3 nhánh ở Architecture trước khi sửa bất cứ thứ gì.
3. Trả bounded fix cho đúng agent sở hữu file (UI → `momorph-ui-implementer`; i18n/route → `implementer`); chạy lại sau mỗi lượt fix.
4. Sửa phần thuộc về test (nếu có), mỗi sửa 1 comment lý do; đo lại `window.history.length` cho C11 và xử lý theo Key Insights.
5. Tắt Supabase (`supabase stop` hoặc để nguyên nếu chưa bật), chạy `CI=1 pnpm exec playwright test --grep-invert "@auth|@local-db"` → phải xanh.
6. `pnpm test:e2e tests/e2e/home.spec.ts` và nhóm CI-safe của `awards.spec.ts` → regression.
7. `--repeat-each=3` cho 2 test scroll (C8/C9) và 2 test điều hướng (C10/C11) → loại flake trước khi đóng phase.
8. Visual validation qua Playwright MCP ở 1440 / 768 / 375; cuộn hết panel trước mỗi lần chụp; kiểm riêng: 6 badge thẳng hàng 3 cột (bẫy 88 vs 104), icon pen **nhìn thấy được** trên nút vàng, icon X trắng trên nút outlined, hover đổi màu cả 2 nút (GUI_004), focus ring khi Tab.
9. Đối chiếu ảnh với frame `3204:6051`; mismatch vật chất → bounded fix về `momorph-ui-implementer`, **không tự sửa UI**.
10. `rm -rf .playwright-mcp/` → `pnpm format:check` → `pnpm lint --max-warnings 0` → `pnpm test:unit:coverage` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.
11. Điền `spec/F005_StandardsRulesPage/functional-spec.md § 14 Test Results` và `technical-spec.md § 5.1` với kết quả thật.
12. Ghi `plans/action-items.md`: (1) bản dịch EN `is_reviewed: false` cần người duyệt; (2) `/kudos` chưa tồn tại → nút "Viết KUDOS" dẫn 404; (3) `disabled` state (GUI_003/FUN_005) nợ lại; (4) intercepting route `@modal` nếu sau này muốn hành vi drawer thật; (5) kết quả đo `window.history.length` nếu C11 phải `fixme`. Mục § Decisions: promote `IconPencil` thay cho `<Image src="/home/Pen.svg">` (lý do: asset `fill="white"`, vô hình trên nút vàng) — đã được coordinator chấp nhận, ghi lại để không mở lại.

## Todo List

- [ ] Giết `:3000` trước mỗi lượt
- [ ] Lượt 1: chạy, phân loại đỏ theo 3 nhánh trước khi sửa
- [ ] Bounded fix trả về đúng agent sở hữu file
- [ ] `standards.spec.ts` xanh bằng **đúng** `redCommand`
- [ ] `CI=1 --grep-invert "@auth|@local-db"` xanh với Supabase tắt
- [ ] `home.spec.ts` + awards CI-safe xanh (regression footer/icon)
- [ ] `--repeat-each=3` cho C8-C11, không flake
- [ ] Visual 1440/768/375, cuộn trước khi chụp
- [ ] Kiểm riêng: lưới 6 badge, pen trên nền vàng, X trên nút outlined, hover, focus ring
- [ ] `rm -rf .playwright-mcp/` rồi chạy full gate
- [ ] Điền Test Results vào 2 file spec
- [ ] `action-items.md` 6 mục

## Success Criteria

- `pnpm test:e2e tests/e2e/standards.spec.ts` exit 0, cùng lệnh với RED phase 01.
- `CI=1 pnpm exec playwright test --grep-invert "@auth|@local-db"` exit 0 **với Supabase tắt** — spec mới nằm trọn trong phủ CI, không tag nào bị thêm.
- `ci.yml` **không đổi một dòng nào** (khác hẳn phase 07 của `/awards`).
- `home.spec.ts` xanh nguyên vẹn; nhóm CI-safe của `awards.spec.ts` xanh.
- Không assertion nào bị xoá hoặc hạ chuẩn mà thiếu comment lý do; không `.first()` nào được thêm để né strict-mode.
- Ảnh visual 3 viewport khớp frame `3204:6051`; sai lệch (nếu còn) đã được ghi và giao lại, không im lặng.
- `pnpm format:check` xanh sau khi dọn `.playwright-mcp/`; toàn bộ gate còn lại xanh.
- `git status` sạch với `.playwright-mcp/`, `test-results/`, `playwright-report/`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Dev server cũ ở `:3000` → báo nhầm "flaky" | **Cao** | Cao — chẩn đoán sai, sửa nhầm chỗ | Bước 1 mỗi lượt; ghi nhận tiền lệ ngay trong file |
| C11 đỏ vì `history.length === 2` | Trung bình | Trung bình | Đo thật; `fixme` + comment + action-item, **không** nới heuristic trong code |
| Sửa test bằng `.first()` cho nhanh xanh | Trung bình | Cao — giấu bug thật | Cấm rõ; Success Criteria kiểm |
| Quên xoá `.playwright-mcp/` → `format:check` đỏ | **Cao** | Thấp | Bước 10 ghi sẵn |
| Chụp visual trước khi cuộn → tưởng thiếu badge | Trung bình | Trung bình — trả fix oan | Bước 8 ghi rõ; cuộn hết panel trước mỗi lần chụp |
| Gắn tag `@local-db` theo quán tính → mất phủ CI | Trung bình | Trung bình | Out of scope + Success Criteria "ci.yml không đổi" |
| Tự sửa `src/**` cho nhanh xanh | Trung bình | Cao — phá ranh giới sở hữu file | `file_ownership` chỉ có 1 file test; bounded fix về đúng agent |
| Regression `home.spec.ts` bị bỏ qua vì "không liên quan" | Trung bình | Cao | Bước 6 bắt buộc; phase 02 có đụng file dùng chung mọi trang |
| Retry `CI: 2` che một test thật sự flaky | Thấp | Trung bình | Bước 7 `--repeat-each=3` chạy local |

## Security Considerations

- Không credential nào vào file test hay `ci.yml`; trang công khai, không đăng nhập, không Supabase.
- Ảnh visual chụp trang công khai với khách ẩn danh — không dữ liệu người dùng; vẫn **không** commit `.playwright-mcp/`.
- Không nới `forbidOnly`/`retries`, không thêm `--grep` để bỏ qua test nào khác.

## Next Steps

- `reviewer` đọc toàn bộ diff của 6 phase (chú ý: promote `IconPencil`, đổi `site-footer.tsx`, matcher `proxy.ts`).
- Cân nhắc `doc-writer` cập nhật `docs/vi/generated/*` nếu F005/SCR005 được promote khỏi `draft`.
- `/tkm:write-journal` + append `plans/action-items.md` theo CLAUDE.md.
