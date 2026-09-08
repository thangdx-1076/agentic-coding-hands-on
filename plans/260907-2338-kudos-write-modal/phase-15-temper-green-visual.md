---
phase: 15
feature: F009
track: temper
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership:
  [
    "tests/e2e/kudos-compose.spec.ts",
    "plans/260907-2338-kudos-write-modal/evidence/visual/**",
  ]
---

# Phase 15 — Temper: GREEN đúng lệnh đã đỏ + bằng chứng thị giác

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
- Dropdown list hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `phase-01-red-e2e-compose-contract.md` — bảng C01–C27 và `evidence/red-evidence.md` (`redCommand` phải trùng khớp)
- `momorph/frame-image.png` — ảnh frame để đối chiếu thị giác
- `.github/workflows/ci.yml:205,212` — hai chỗ `--grep-invert`, **không sửa**
- `plans/reports/` — nơi ghi báo cáo cuối

## Overview

**Priority**: P1 · **Owner**: `tester` · **Goal**: chạy **đúng lệnh đã đỏ ở phase 01** cho tới khi xanh thật, chụp bằng chứng thị giác đối chiếu frame, và chứng minh 6 màn cũ không bị gì.

## Out of scope

- **Không** sửa file implementation nào. Test đỏ → trả bounded fix về đúng phase chủ sở hữu (Track A → `momorph-ui-implementer`, còn lại → `implementer`), **không** tự vá.
- **Không** làm yếu assertion để lấy màu xanh: không `test.skip`, không hạ `toContainText` thành `toBeVisible`, không thêm `waitForTimeout`.
- **Không** sửa `ci.yml`, **không** sửa `tests/e2e/kudos.spec.ts` (hợp đồng F007 phải xanh nguyên vẹn — nếu nó đỏ thì đó là hồi quy phải trả về phase 13/14, không phải thứ để sửa ở đây).

## Requirements

Toàn bộ FR-001..FR-601, BR-001..BR-006, US001–US004, D001, DEC-001, DEC-002, SM-001 · 27 dòng hợp đồng C01–C27 · 57 TC ID-0..ID-56 (trừ những cái đã ghi nợ ở plan.md § Out of scope).

## Implementation Steps

1. Preflight: **KHÔNG kill port 3000** (dev server của project khác). Dùng `E2E_PORT=3100` cho mọi lệnh Playwright; `curl -s http://127.0.0.1:55321/auth/v1/health` phải 200; `supabase migration list` xác nhận `0009`/`0010` đã apply; `psql` xác nhận bucket `kudo-images` tồn tại.
2. `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts --grep-invert "@auth|@local-db"` → phải **2/2**.
3. `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts --grep "@auth"` → xanh.
4. `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts --grep "@local-db"` → xanh.
5. `pnpm test:e2e` toàn bộ (7 spec) — chứng minh không hồi quy, đặc biệt `kudos.spec.ts` C03 (pill vẫn `readonly`), C10 (thứ tự DOM), C13 (nội dung thẻ).
6. **Kiểm tra bảo mật tay, không qua UI** (những thứ e2e không chứng minh được):
   - Gọi thẳng `createKudo` khi chưa đăng nhập → `{ok:false, reason:"unauthenticated"}`, `select count(*) from kudos` không tăng.
   - `psql` với role `anon`: `SELECT sender_id, sender_full_name FROM kudos_cards WHERE …` trên kudo ẩn danh vừa gửi → **NULL** + tên ẩn danh.
   - Thử `INSERT INTO kudos (sender_id, …) VALUES ('<uuid người khác>', …)` bằng role `authenticated` → bị `kudos_insert_own` chặn.
7. Bằng chứng thị giác qua Playwright MCP: mở dialog ở 1440px, **cuộn hết thân form trước khi chụp** (form dài hơn viewport, chụp ngay sẽ ra khung xám), chụp 5 trạng thái: rỗng · đã điền đủ 4 trường · 5 hashtag + 5 ảnh · đã tick ẩn danh · state lỗi 4 trường. Đối chiếu từng vùng A/B/Danh hiệu/C/D/E/F/G/H với `momorph/frame-image.png`. Lưu `evidence/visual/`.
8. `rm -r .playwright-mcp` **trước** `pnpm format:check` (ảnh chụp rơi vào đó làm prettier đỏ).
9. `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm test:unit:coverage`, `pnpm build`, `pnpm typecheck`, `pnpm build-storybook`.
10. Ghi `plans/reports/tester-260908-<hhmm>-kudos-write-modal.md`: 3 con số chạy được, kết quả 3 kiểm tra bảo mật bước 6, mọi lệch thị giác còn lại, và danh sách TC không thoả được kèm lý do.

## Todo List

- [ ] Preflight: port 3000, Supabase health, `0009`/`0010` đã apply, bucket tồn tại
- [ ] Nhánh CI-safe **2/2** xanh
- [ ] Nhánh `@auth` xanh · nhánh `@local-db` xanh
- [ ] `pnpm test:e2e` toàn bộ 7 spec xanh, `kudos.spec.ts` không sửa một dòng
- [ ] 3 kiểm tra bảo mật bước 6 đều đúng kỳ vọng
- [ ] 5 ảnh chụp sau khi cuộn, lưu `evidence/visual/`
- [ ] `rm -r .playwright-mcp` trước `format:check`
- [ ] 6 lệnh gate cuối xanh
- [ ] Báo cáo vào `plans/reports/`

## Success Criteria

- `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` thoát **0** — **cùng lệnh** đã thoát khác 0 ở phase 01 (`evidence/red-evidence.md` là bằng chứng đối chiếu).
- Đúng **2** test của file này lọt `--grep-invert` — không ai bỏ tag để "cho CI xanh hơn".
- `grep -n "test.skip\|test.fixme\|waitForTimeout" tests/e2e/kudos-compose.spec.ts` rỗng.
- `git diff --stat tests/e2e/kudos.spec.ts` rỗng.
- Ba kiểm tra bảo mật bước 6 đều PASS — đặc biệt `sender_id IS NULL` với role `anon`; FAIL ở đây là **chặn** việc đóng plan, không phải ghi chú.
- 5 ảnh trong `evidence/visual/` khớp frame ở mức bố cục, khoảng cách, màu, và mọi lệch còn lại đã được nêu tên trong báo cáo.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Làm yếu assertion để lấy màu xanh | TB | **Nghiêm trọng** — cả vòng RED→GREEN thành vô nghĩa | `grep` ở Success Criteria; Out of scope cấm thẳng |
| Báo "xanh" nhưng chỉ chạy nhánh CI-safe (2/27) | TB | Cao | 3 lần chạy riêng, báo cáo ghi 3 con số |
| `@local-db` đỏ vì quên apply `0009`/`0010`, bị quy oan cho UI | Cao | TB | Preflight bước 1 kiểm `migration list` + bucket |
| Chụp trước khi cuộn → tưởng lỗi render | Cao | Thấp | Bước 7 ghi rõ cuộn trước |
| `.playwright-mcp/` làm `format:check` đỏ | Cao | Thấp | Bước 8 (`rm -r`, **không** `rm -rf`) |
| Ảnh test tích lại trong bucket `kudo-images` sau nhiều lần chạy | Cao | Thấp | Báo cáo ghi số object còn lại; dọn bằng `DELETE FROM storage.objects WHERE bucket_id='kudo-images'` nếu cần |
| Kudo test tích lại trong feed làm C23 đếm sai lần chạy sau | Cao | TB | Mỗi lần chạy dùng `Danh hiệu` chứa timestamp để locator không dựa vào thứ tự |

## Security Considerations

Ba kiểm tra ở bước 6 là phần **không thể bỏ** của phase này: e2e chỉ chứng minh UI ẩn tên, còn câu hỏi thật là *view có còn trả tên thật cho ai gọi thẳng REST không*. Cả ba đều phải chạy với role đúng (`anon` cho đọc view, `authenticated` cho thử INSERT giả mạo `sender_id`) — chạy bằng `postgres` là vô nghĩa vì role đó `bypassrls`. Nhánh `@auth` tạo `auth.users` thật: dùng email dùng một lần, khác domain `@kudos-demo.saa` của `0008` để rollback hai bên không giẫm nhau.

## Next Steps

Đóng plan. Còn lại thuộc bước promote: cấp mã F009/SCR008/US###/PERM### chính thức và đưa `spec/` + `spec/system/` từ plan sang `docs/vi/**`, đối chiếu với as-built.
