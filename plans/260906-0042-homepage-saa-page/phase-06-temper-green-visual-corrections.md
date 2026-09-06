---
phase: 06
feature: F003
status: completed
priority: P0
test_policy: e2e-red-first
effort: 2h
owner: tester + momorph-ui-implementer
depends_on: [05]
file_ownership: ["tests/e2e/**", "playwright.config.ts", "components/home/** (chỉ correction, momorph-ui-implementer)"]
---

# Phase 06 — Temper: GREEN, visual validation, correction

## Context Links

- `clarifications.md` § RED evidence (lệnh RED bất biến) · `reports/tester-red-home-e2e.md` (27 test, DOM assumptions)
- `evidence/red-run.log` (3 passed / 24 failed, exit 1) · `tests/e2e/home.spec.ts`, `tests/e2e/helpers/promote-to-admin.ts`
- `data/preview.png` (1512×4480) · `momorph/specs.csv` · `spec/homepage/screens/SCR-home/spec.md`
- `spec/homepage/technical-spec.md` § 5.1 (SC-001…SC-006)

## Overview

**Priority**: P0 · **Status**: pending
Cổng cuối: `tester` chạy lại **đúng lệnh RED** cho ra GREEN, chạy full suite + mọi cổng chất lượng, rồi visual validation qua Playwright MCP ở 4 breakpoint. Lệch UI → trả về `momorph-ui-implementer` dưới dạng correction có phạm vi hẹp. **Không bao giờ nới assertion để lấy GREEN.**

## Key Insights

- Lệnh GREEN phải **trùng từng ký tự** với lệnh RED: `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list`. Đổi lệnh là mất bằng chứng.
- Test `@auth` cần Supabase local sống (`saa-app`, `http://127.0.0.1:55321`) + `supabase db query` chạy được với `cwd = $SAA_APP_DIR`. CI loại bằng `--grep-invert @auth` — không được đổi.
- `tester` sở hữu test; `momorph-ui-implementer` sở hữu `components/home/**`. Không ai lấn sân: tester **không** sửa component, UI agent **không** sửa test.
- Fail do dependency/config/dev-server/browser-install không tính là fail hợp lệ — sửa hạ tầng rồi chạy lại, đừng ghi vào báo cáo như lỗi sản phẩm.
- Ảnh thumbnail thiếu **không chặn GREEN** (E2E assert text/href). Nhưng `img[alt="Sun* Annual Awards 2025"]` ở header/footer **là** blocking (TC ID-8) — thiếu thì UI agent tái dùng `public/login/Logo.png`.

## Requirements

- Toàn bộ SC-001…SC-006 (`technical-spec.md` § 5.1) quan sát được bằng test tự động hoặc bằng chứng visual.
- FR-206 (grid 3/2 cột), FR-208/FR-209 (header/footer), FR-210 (widget) khớp `data/preview.png`.
- Không TC nào chuyển từ pass sang fail ở `login.spec.ts` (2 assertion tester đã cập nhật phải xanh).

## Related Code Files

**Modify (tester)**: `tests/e2e/**`, `playwright.config.ts` — chỉ khi có defect thật trong test, ghi rõ lý do
**Modify (UI agent)**: `components/home/**` — chỉ đúng phạm vi correction được giao
**Create**: `evidence/green-run.log` (log chạy GREEN) · **Delete**: —

## Implementation Steps

1. **tester** — bảo đảm Supabase local đang chạy; chạy lại đúng lệnh RED: `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list`. Ghi exit code + log vào `evidence/green-run.log`.
2. **tester** — full suite: `pnpm test:e2e` (gồm `login.spec.ts` đã cập nhật 2 assertion). Xác nhận không có regression ở `/todo`, `/login`, `/auth/callback`.
3. **tester** — cổng chất lượng, ghi exit code thật từng lệnh: `pnpm test:unit:coverage` (100%), `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm build-storybook`.
4. **tester** — visual validation bằng Playwright MCP ở **375 / 768 / 1280 / 1440**, đối chiếu `data/preview.png`: header sticky nền tối bán trong suốt, hero + 3 ô đếm ngược, event info, 2 CTA, khối Root Further, grid card (3 cột ≥1024 / 2 cột <1024), khối Kudos, footer, widget nổi góc dưới phải. Chụp bằng chứng, liệt kê lệch theo mức độ.
5. **tester** — kiểm 2 trạng thái phụ bằng mắt: authed (bell + nút tài khoản, menu admin/member) và zero-state countdown.
6. **orchestrator** — mọi lệch UI đóng gói thành correction hẹp (component nào, tiêu chí đo được nào) và giao `momorph-ui-implementer`. Không giao cho generic `implementer`.
7. **momorph-ui-implementer** — sửa trong `components/home/**` (+ `public/home/**` nếu là asset), chạy lại typecheck/lint/`build-storybook`, báo lại.
8. **tester** — sau correction chạy lại **cùng** lệnh ở step 1–3; lặp tới khi xanh. Ghi kết quả cuối cùng vào `evidence/green-run.log`.
9. Ghi các mục còn nợ vào `plans/action-items.md` (5 route 404, badge thông báo chưa có nguồn, 3 mô tả card trùng, nội dung thật của menu widget, `EVENT_START_AT` giá trị thật).

## Todo List

- [x] GREEN đúng lệnh RED, exit 0, log vào `evidence/green-run.log`
- [x] `pnpm test:e2e` full suite xanh (gồm `login.spec.ts`)
- [x] `test:unit:coverage` 100% · `lint --max-warnings 0` · `format:check` · `typecheck` · `build` · `build-storybook` đều exit 0
- [x] Visual validation 375/768/1280/1440 vs `data/preview.png`
- [x] Correction (nếu có) do `momorph-ui-implementer` xử lý, chạy lại xanh
- [x] Nợ kỹ thuật ghi vào `plans/action-items.md`

## Success Criteria

- `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` **exit 0**, 27/27 pass (test `@auth` chạy với Supabase local sống).
- 7 cổng ở step 3 đều exit 0, không có lệnh nào bị bỏ qua hoặc thay bằng lệnh khác.
- Không assertion nào bị nới, xoá, hay đánh `skip` để lấy GREEN; mọi thay đổi trong `tests/**` (nếu có) đều kèm lý do defect trong báo cáo.
- Bằng chứng visual đủ 4 breakpoint, mọi lệch còn lại được phân loại (chặn / không chặn) và có chủ.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Cám dỗ nới assertion để lấy GREEN | M×H | Luật cứng: lệch → sửa code. Thay đổi test chỉ khi chứng minh được test sai, ghi rõ trong báo cáo |
| Test `@auth` đỏ vì Supabase local tắt / `SAA_APP_DIR` sai | M×M | Kiểm `supabase status` + `promote-to-admin.ts` trước khi chạy; hạ tầng đỏ không tính là fail sản phẩm |
| Widget outside-click click nhầm header sticky (`main` toạ độ 100,100) | M×M | 120px đầu của `<main>` không được có phần tử tương tác; đỏ ở đây là lỗi layout → correction Track A |
| `page.clock` lệch giờ server ↔ browser làm test countdown flaky | M×M | `webServer.env.EVENT_START_AT=2099-12-31T18:30:00+07:00` giữ nguyên; clock install **trước** `goto` |
| Story mới làm `build-storybook` gãy muộn | M×M | Đã là exit criteria của phase 02; chạy lại ở step 3 để bắt trường hợp phase 05 mới lộ |
| Correction lan sang file ngoài `components/home/**` | L×M | File ownership của UI agent giới hạn đúng thư mục đó + `public/home/**`; ngoài phạm vi → trả orchestrator |

## Security Considerations

- Helper `promote-to-admin.ts` chạy `supabase db query` với `cwd = $SAA_APP_DIR` — **không** kéo service-role key vào repo, **không** sửa project `saa-app`.
- Email test dùng riêng (`e2e-home-member@`, `e2e-home-admin@`) để không rò trạng thái sang test khác.
- Không đưa cookie/session/log Supabase vào `evidence/*.log` khi dán kết quả; chỉ giữ tên test + exit code.
- `.env.local` vẫn gitignored; không commit `EVENT_START_AT` giá trị thật vào repo.

## Next Steps

Bàn giao Delivery: `/tkm:write-journal`, cập nhật `plans/action-items.md`, promote spec draft (`spec_draft` → `spec`, cấp mã F###/SCR### thật, ghi PERM001 lỗi thời ở F001), rồi `reviewer` niêm phong.
