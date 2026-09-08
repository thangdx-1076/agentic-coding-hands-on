# Phase 05 — Green verification + docs

## Context Links

- [plan.md](./plan.md) · [phase-02](./phase-02-red-first-prelaunch-test-evidence.md) § Test matrix
- `.github/workflows/ci.yml` (job `quality` và job `e2e` — CI khắt khe hơn lint local)
- `README.md` § bảng route, § mục env
- Rule: `documentation-management.md` (roadmap / changelog / architecture / code-standards)

## MoMorph refs

- Countdown - Prelaunch page: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
- Clarifications: `plans/260908-1653-countdown-prelaunch-page/clarifications.md`
- testPolicy: `e2e-red-first` (GREEN + visual validation thuộc về tester)

## Overview

**Priority:** P1 · **Status:** 🔄 in progress · **Effort:** 1h · **Deps:** 04

Verification evidence collected by orchestrator: pnpm typecheck / lint / format:check / test:unit:coverage / build / build-storybook all clean; pnpm exec playwright test 194 passed/4 skipped/0 failed; manual lock verification completed.

Đóng vòng RED→GREEN, chạy đúng bộ lệnh mà CI chạy (không phải bộ lệnh local quen tay), làm visual
validation, cập nhật tài liệu, và ghi lại phần e2e không phủ được cho người sau khỏi tưởng là đã phủ.

## Key Insights

1. **CI khắt khe hơn `pnpm lint` local.** Job `quality` chạy `pnpm lint --max-warnings 0`,
   `pnpm format:check`, `pnpm test:unit:coverage`, `pnpm build`, `pnpm typecheck`, `pnpm build-storybook`.
   `format:check` và `build-storybook` không bao giờ tự chạy khi làm local. `typecheck` **phải** sau
   `build` — nó cần type Next sinh ra.
2. `.playwright-mcp/` sinh ra khi visual validation phải **xoá trước** `pnpm format:check`, nếu không
   prettier quét trúng và đỏ.
3. Job `e2e` của CI chạy `--grep-invert "@auth|@local-db"`. `prelaunch.spec.ts` không mang tag nào nên
   nó nằm trong nhóm chạy — đây là điều mong muốn, và cũng là lý do C1..C6 phải không cần Supabase.
4. Con số e2e trước feature là 135. Sau phase này nó tăng đúng bằng số test trong `prelaunch.spec.ts`.
   Ghi con số thật vào report, đừng ghi "tất cả xanh".
5. Dời file ở phase 01 làm `docs/vi/_source-to-fcode.json` lệch đường dẫn. Không sửa tay docs sinh máy —
   để `rebuild-spec` core pass ở bước promote lo.

## Requirements

- Toàn bộ gate của job `quality` và job `e2e` xanh trên cây cuối.
- Visual validation `/prelaunch` ở 375 / 768 / 1512.
- README phản ánh route mới và biến môi trường mới.
- `plans/action-items.md` có mục Decisions + Nợ lại của lượt này.
- Report GREEN ghi con số thật và ghi thẳng phần chưa phủ.

## Architecture

Không có thay đổi kiến trúc. Phase này chỉ xác minh và ghi chép.

## Related Code Files

**Modify:**

- `README.md` — thêm dòng `/prelaunch` vào bảng route; thêm `PRELAUNCH_LOCK_ENABLED` vào mục env kèm
  ghi chú "mặc định TẮT, chỉ chuỗi `true` mới bật, server-only"
- `plans/action-items.md` — append khối `## 260908-1653 — countdown-prelaunch-page`

**Create:**

- `plans/260908-1653-countdown-prelaunch-page/reports/green-evidence-260908-prelaunch.md`
- `docs/journals/2026-09-08-countdown-prelaunch-page.md` (giao cho `journal-writer`)

**Cấm chạm:** mọi file code. Nếu một gate đỏ, lỗi thuộc về phase sở hữu file đó — sửa ở đó rồi chạy lại,
không vá tại phase 05.

## Implementation Steps

1. `rm -r .playwright-mcp` nếu tồn tại.
2. Chạy nguyên chuỗi của job `quality`, đúng thứ tự:
   ```bash
   pnpm lint --max-warnings 0
   pnpm format:check
   pnpm test:unit:coverage
   pnpm build
   pnpm typecheck
   pnpm build-storybook
   ```
3. Chạy job `e2e`: `pnpm exec playwright test --grep-invert "@auth|@local-db"`. Ghi lại tổng số test và
   số pass.
4. Bộ `@auth` (chạy local, cần Supabase local đang chạy): `pnpm exec playwright test --grep "@auth"` —
   xác nhận `/todo` và `/profile` vẫn redirect `/login` khi chưa đăng nhập, tức guard cũ còn nguyên
   sau khi mở matcher.
5. Visual validation `/prelaunch` (tester sở hữu): 375 / 768 / 1512. Cuộn trước khi chụp để ảnh lazy
   không hiện vỡ. Kiểm bằng mắt: nền phủ kín không cuộn, lớp phủ tối đủ tương phản cho chữ trắng, 3 ô
   không tràn ngang ở 375, nhãn đúng typeface Montserrat.
6. Đối chiếu lại với frame MoMorph `2268:35127`. Lệch vật chất → trả bounded fix về phase 03, không nới
   test.
7. `README.md`: bảng route + mục env.
8. Viết `reports/green-evidence-260908-prelaunch.md`: lệnh, exit code, số test, ảnh visual, và **một mục
   "Không phủ được"** chép thẳng từ [phase-02 § Test matrix](./phase-02-red-first-prelaunch-test-evidence.md)
   (trạng thái KHOÁ và trạng thái đã-tới-giờ chỉ có unit + kiểm tay).
9. Append `plans/action-items.md`:
   - **Decisions**: (a) luật `/prelaunch` → `/` chỉ khi `lockEnabled && reached`, đè bảng DEC của
     technical-spec § 3.2; (b) `src/utils/countdown.ts` phẳng thay vì thư mục con theo chủ đề; (c) asset
     nền dùng lại `/home/Keyvisual_BG.png` hay tải mới; (d) gộp i18n vào phase 03 thay vì phase riêng.
   - **Nợ lại**: 4 test case ACCESSING bỏ qua có chủ đích; font "Digital Numbers" chưa nạp;
     `docs/vi/_source-to-fcode.json` lệch đường dẫn chờ `rebuild-spec`; trạng thái KHOÁ không có e2e.
   - **Tôi cần làm**: quyết định thời điểm bật `PRELAUNCH_LOCK_ENABLED` ở production và ai bật.
10. Giao `journal-writer` viết `docs/journals/2026-09-08-countdown-prelaunch-page.md`: mâu thuẫn spec
    tìm được, ràng buộc env cố định của Playwright, và tại sao BR-005 phải tồn tại.
11. Cân nhắc tác động docs: `Docs impact: minor` (README + journal). Spec layer chờ promote.
12. Mở PR: `gh pr create --repo thangdx-1076/agentic-coding-hands-on --base main`.

## Todo List

- [x] `.playwright-mcp/` đã xoá trước `format:check`
- [x] 6 lệnh của job `quality` xanh, đúng thứ tự (`typecheck` sau `build`)
- [x] `--grep-invert "@auth|@local-db"` xanh, ghi số test thật (194 passed, 4 skipped, 0 failed)
- [x] `--grep "@auth"` xanh (guard `/todo`, `/profile` còn nguyên)
- [x] Visual 375 / 768 / 1512, đối chiếu frame `2268:35127`
- [ ] README: bảng route + `PRELAUNCH_LOCK_ENABLED` (pending orchestrator)
- [ ] `reports/green-evidence-...md` có mục "Không phủ được" (pending orchestrator)
- [ ] `plans/action-items.md` có đủ Decisions / Nợ lại / Tôi cần làm (pending orchestrator)
- [ ] Journal entry (pending orchestrator)
- [ ] PR mở với `--repo thangdx-1076/agentic-coding-hands-on` (pending orchestrator)

## Success Criteria

```bash
rm -r .playwright-mcp 2>/dev/null; \
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit:coverage && \
pnpm build && pnpm typecheck && pnpm build-storybook && \
pnpm exec playwright test --grep-invert "@auth|@local-db"
```

Exit 0 toàn chuỗi, coverage 100%, và số e2e pass = 135 + số test của `prelaunch.spec.ts`.
Report GREEN nêu đích danh phần chưa phủ, không quy tròn thành "đã phủ".

## Risk Assessment

| Risk | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| `format:check` đỏ vì `.playwright-mcp/` | Cao | Thấp | Bước 1 xoá trước |
| `typecheck` đỏ vì chạy trước `build` | Trung bình | Thấp | Thứ tự cố định ở bước 2 |
| Report GREEN nói "tất cả xanh" và che mất phần khoá chưa có e2e | Trung bình | Cao — người sau tin nhầm | Mục "Không phủ được" là bắt buộc, chép nguyên từ phase 02 |
| Visual lệch nhẹ nhưng đã hết thời gian → nới test cho xanh | Thấp | Cao | Cấm nới; trả bounded fix về phase 03 |
| `gh` không ghim `--repo` → PR mở nhầm vào repo tổ chức | Trung bình | Cao | Mọi lệnh `gh` bắt buộc `--repo thangdx-1076/agentic-coding-hands-on` |
| Bộ `@auth` bỏ qua vì Supabase local chưa chạy → mất lưới an toàn cho guard cũ | Trung bình | Cao | `supabase start` từ repo root, **không bao giờ** `db reset`; nếu vẫn không chạy được, ghi thẳng là chưa xác minh |

## Security Considerations

- Không commit `.env.local`, không dán giá trị secret vào report hay journal. Chỉ ghi *tên* biến
  `PRELAUNCH_LOCK_ENABLED` và giá trị mặc định.
- README ghi rõ biến là server-only, không tiền tố `NEXT_PUBLIC_`.
- Trước khi mở PR, quét diff xem có credential nào lọt không.
- Xác nhận lại lần cuối bằng bộ `@auth`: mở matcher không làm rò trang protected nào cho khách chưa
  đăng nhập.

## Rollback

Phase này không sửa code. Đỏ ở đâu, lùi phase đó theo mục Rollback của chính nó. Thứ tự lùi an toàn là
ngược lại: 04 → 03 → 02 → 01. Lùi 04 mà giữ 03 là hợp lệ (màn đếm ngược sống được mà không cần khoá);
lùi 01 mà giữ 03 thì **không** — 03 import `@/hooks/use-countdown` và `@/components/countdown-tiles`.

## Next Steps

- `rebuild-spec` core pass để `docs/vi/_source-to-fcode.json` và spec layer bắt kịp đường dẫn mới; cấp
  mã `F011` / `SCR009` / `PERM###` thật ở bước promote (hiện đều là provisional).
- Nếu sau này cần phân quyền cho `/prelaunch`: 4 test case ACCESSING không cho tín hiệu nào, phải
  nghiên cứu lại từ đầu (RISK-01).
- Nếu ngày sự kiện cần sửa được lúc chạy, `EVENT_START_AT` phải nhường chỗ cho một nguồn thật — lúc đó
  cả `page.tsx` lẫn `prelaunch-lock.ts` cùng đổi nguồn.
