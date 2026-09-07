---
phase: 14
feature: F007, F008
track: —
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership:
  ["tests/e2e/kudos.spec.ts", "tests/e2e/standards.spec.ts"]
---

# Phase 14 — Temper: GREEN e2e, bằng chứng thị giác, soát hồi quy

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `phase-01-red-e2e-kudos-contract.md` — bảng C01–C29 và `evidence/red-evidence.md`
- `evidence/study-context.json` § acceptanceCriteria — 15 tiêu chí phải soát đủ
- `tests/e2e/standards.spec.ts:22` — comment `trang đích 404` giờ đã lỗi thời
- `.github/workflows/ci.yml:205,212` — hai chỗ `--grep-invert`, **không sửa**

## Overview

**Priority**: P0 · **Status**: pending · **Owner**: `tester`
**Goal (1 dòng)**: Chạy chính lệnh đã đỏ ở phase 01 cho tới khi xanh thật, chụp bằng chứng thị giác đối chiếu frame, và chứng minh 5 màn cũ không bị gì.

## Out of scope

- **Không** sửa file implementation nào. Test đỏ → trả bounded fix về đúng phase chủ sở hữu, **không** tự vá.
- **Không** làm yếu assertion để lấy màu xanh: không `test.skip`, không nới `toContainText` thành `toBeVisible`, không thêm `waitForTimeout` che flaky.
- **Không** sửa `ci.yml`.

## Key Insights

- **GREEN phải đến từ đúng `redCommand`.** `pnpm test:e2e` — cùng lệnh, cùng file, khác kết quả. Đổi lệnh là mất luôn ý nghĩa của vòng RED→GREEN.
- **Ba tầng, ba lần chạy riêng.** Chạy `--grep-invert "@auth|@local-db"` trước (đây là thứ CI thật sự thấy), rồi `--grep "@local-db"`, rồi `--grep "@auth"`. Gộp một lần rồi báo "xanh" giấu mất việc CI chỉ chạy 10/29.
- **Dọn `.playwright-mcp/` trước `pnpm format:check`** — ảnh chụp rơi vào đó sẽ làm prettier đỏ.
- **Cuộn trước khi chụp.** Board này dài và có ảnh lazy-load; chụp ngay khi vừa mở sẽ ra một trang toàn khung xám và trông như lỗi render.
- **`/kudos` giờ trả 200 — hai spec cũ có liên quan.** `awards.spec.ts` TC ID-8/ID-3 chỉ assert `href`, vẫn xanh. `standards.spec.ts` C12 `waitForURL("/kudos")` cũng vẫn xanh, nhưng comment dòng 22 ghi *"trang đích 404"* đã sai sự thật — sửa đúng một comment, **không** đụng assertion.
- **`@local-db` cần seed của phase 05 đã apply.** Không có seed thì đỏ vì thiếu dữ liệu chứ không phải vì code — phân biệt rõ trước khi báo lỗi cho ai.

## Implementation Steps

1. Preflight: `lsof -ti:3000 | xargs -r kill -9`; `curl -s http://127.0.0.1:54321/auth/v1/health`; xác nhận `0006`/`0007`/`0008` đã apply (`supabase migration list`).
2. `pnpm exec playwright test kudos --grep-invert "@auth|@local-db"` → phải 10/10.
3. `pnpm exec playwright test kudos --grep "@local-db"` → 11 test.
4. `pnpm exec playwright test kudos --grep "@auth"` → 5 test.
5. `pnpm test:e2e` toàn bộ (cả 6 spec) — chứng minh không hồi quy.
6. Bằng chứng thị giác qua Playwright MCP: chụp `/kudos` ở 1440px (ẩn danh và đã đăng nhập), sau khi đã cuộn hết trang. Đối chiếu từng vùng A/B/B.7/C/D với `momorph/frame-image.png`. Lưu vào `plans/260907-1725-kudos-live-board/evidence/visual/`.
7. Soát đủ 15 acceptance criteria trong `evidence/study-context.json`, mỗi cái ghi PASS/FAIL kèm test hoặc ảnh làm bằng chứng.
8. Sửa comment lỗi thời ở `tests/e2e/standards.spec.ts:22`.
9. `rm -r .playwright-mcp` rồi `pnpm format:check`; cộng `pnpm lint --max-warnings 0`, `pnpm test:unit:coverage`, `pnpm build`, `pnpm typecheck`, `pnpm build-storybook`.
10. Ghi `plans/reports/tester-260907-<hhmm>-kudos-live-board.md`: 3 con số chạy được, danh sách 8 TC không thoả được (đã ghi nợ ở `plan.md` § Out of scope), và mọi lệch thị giác còn lại.

## Todo List

- [ ] Preflight: port 3000, Supabase health, 3 migration đã apply
- [ ] Nhánh CI-safe 10/10 xanh
- [ ] Nhánh `@local-db` xanh
- [ ] Nhánh `@auth` xanh
- [ ] `pnpm test:e2e` toàn bộ 6 spec xanh
- [ ] Ảnh chụp sau khi cuộn, 2 trạng thái viewer, lưu `evidence/visual/`
- [ ] Soát 15 acceptance criteria, mỗi cái có bằng chứng
- [ ] Sửa comment `standards.spec.ts:22`
- [ ] `rm -r .playwright-mcp` trước `format:check`
- [ ] lint / coverage / build / typecheck / build-storybook xanh
- [ ] Báo cáo vào `plans/reports/`

## Success Criteria

- `pnpm test:e2e` thoát **0**, cùng lệnh đã thoát khác 0 ở phase 01.
- Số test chạy trong nhánh CI-safe đúng **10** — không ai vô tình bỏ tag `@local-db`/`@auth` để "cho CI xanh hơn".
- Không có `test.skip`, `test.fixme` hay `waitForTimeout` mới nào trong `kudos.spec.ts`: `grep -n "test.skip\|test.fixme\|waitForTimeout" tests/e2e/kudos.spec.ts` phải rỗng.
- 15/15 acceptance criteria có bằng chứng; cái nào FAIL thì phải nêu đích danh phase phải sửa.
- 5 spec cũ vẫn xanh, đặc biệt `awards` ID-3/ID-8 và `standards` C7/C12.
- `heart_count` khớp `count(*)` trên `kudo_hearts` **sau khi** bộ e2e `@auth` đã bấm tim qua lại — trigger phase 04 sống sót dưới tải thật.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Làm yếu assertion để lấy màu xanh | Trung bình | **Nghiêm trọng** — cả vòng RED→GREEN thành vô nghĩa | `grep` trong Success Criteria; Out of scope cấm thẳng |
| Báo "xanh" nhưng thật ra chỉ chạy nhánh CI-safe | Trung bình | Cao — 19/29 test không ai chạy | 3 lần chạy riêng, báo cáo ghi 3 con số |
| `@local-db` đỏ vì quên apply seed, bị quy oan cho UI | Cao | Trung bình | Preflight bước 1 kiểm `supabase migration list` |
| Chụp ảnh trước khi cuộn → tưởng lỗi render | Cao | Thấp | Key Insights + Todo ghi rõ cuộn trước |
| `.playwright-mcp/` làm `format:check` đỏ | Cao | Thấp | `rm -r` ở bước 9 (dùng `rm -r`, không `rm -rf`) |
| Trigger heart trôi số sau nhiều lượt toggle | Thấp | Cao — carousel xếp sai về sau | Phép so hai cột nằm trong Success Criteria |

## Security Considerations

Nhánh `@auth` tạo `auth.users` thật; dùng email dùng một lần, khác domain `@kudos-demo.saa` của phase 05 để rollback hai bên không giẫm nhau. Trong lúc soát, thử một lần gọi thẳng `toggleKudoHeart` trên kudo do chính mình gửi và một lần khi chưa đăng nhập — cả hai phải bị RLS chặn, không chỉ bị nút disabled chặn.

## Next Steps

Đóng plan. Phần còn lại thuộc bước promote: cấp mã F###/SCR###/US###/PERM### chính thức và đưa spec từ `plans/.../spec/` sang `docs/vi/`.
