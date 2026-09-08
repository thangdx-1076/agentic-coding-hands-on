# Phase 03 — Cổng kiểm chứng & chống hồi quy

```
## MoMorph refs:
- FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
- FAB thu gọn: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2
- Clarifications: plans/260908-1103-home-widget-fab/clarifications.md
- testPolicy: e2e-red-first
```

## Context Links

- [`plan.md`](./plan.md) · [`phase-02-expanded-fab-panel-and-copy.md`](./phase-02-expanded-fab-panel-and-copy.md)
- [`reports/tester-260908-1103-red-evidence.md`](./reports/tester-260908-1103-red-evidence.md) — RED để đối chiếu
- Bằng chứng thị giác đặt vào `plans/260908-1103-home-widget-fab/evidence/`

## Overview

- **Priority:** P1 · **Status:** completed · **Effort:** 45m · **Depends on:** phase 02
- Chủ sở hữu: `tester`. Chuyển RED → GREEN trên **đúng** lệnh đã ghi, chứng minh baseline không
  vỡ, và chụp bằng chứng thị giác đối chiếu 2 frame design.
- **Evidence:** `reports/tester-260908-1200-green-evidence.md` (5/5 e2e passed after fixing
  TS bug `.right` on `boundingBox()` — introduced by the tester's own RED file this session, NOT
  pre-existing (baseline typecheck was exit 0 before that file existed); 27/27 baseline; visual
  evidence fab-closed.png
  + fab-open.png with 5-point design verification).

## Key Insights

- **Cùng một lệnh, không lệnh khác.** GREEN chỉ tính khi chạy đúng
  `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts`. `pnpm test:e2e -- <file>`
  **không** lọc theo file — nó chạy cả 135 test và làm bằng chứng sai lệch.
- **`E2E_PORT=3100`, không bao giờ 3000.** Cổng 3000 là dev server của project khác; đừng kill.
  Dev server cũ còn sống sẽ ngụy tạo "flaky".
- **Không đôn lỗi thật thành "pre-existing".** Test countdown `[TC ID-24, ID-39]` của `home.spec.ts`
  từng đỏ do clock; nếu nó đỏ, phải dán log của cả trước và sau để chứng minh **giống hệt**, không
  chỉ khai báo. `exitCode` ghi lại phải là số thật.
- **Dọn `.playwright-mcp/` trước `pnpm format:check`**, và scroll tới widget trước khi chụp — ảnh
  lazy chưa load sẽ trông như vỡ layout.
- FAB là overlay `fixed`, luôn nằm trong viewport → không cần scroll để chụp nó, nhưng phần trang
  phía sau thì cần.

## Requirements

Functional:
- 5/5 test của `home-widget-fab.spec.ts` xanh, exit code 0.
- `home.spec.ts` giữ baseline 27/27 (hoặc chứng minh đồng nhất với trước).
- Đối chiếu thị giác: trạng thái đóng khớp `_hphd32jN2`, trạng thái mở khớp `Sv7DFwBw1h`
  (thứ tự 2 option, màu vàng/đỏ, khoảng cách 20px, × 56×56 đúng vị trí pill).

Non-functional:
- `pnpm typecheck` · `pnpm lint` · `pnpm test:unit` (536/536, coverage 100% giữ ngưỡng) ·
  `pnpm format:check` · `pnpm build` · `pnpm build-storybook`.
- Không sửa bất kỳ file nào dưới `src/` để "làm cho test xanh" — đó là việc của phase 02, quay
  ngược lại cho `momorph-ui-implementer` với phạm vi hẹp.

## Architecture

Không có code. Chuỗi kiểm chứng:

```
lint → typecheck → test:unit → e2e(home-widget-fab) → e2e(home) → build → build-storybook
                                      │
                                      └→ Playwright MCP: chụp closed + open, so 2 frame
```

Ownership: `tester` sở hữu `plans/260908-1103-home-widget-fab/evidence/**` và report dưới
`plans/reports/`. **Không** sở hữu file nào trong `src/` — chỉ đọc.

## Related Code Files

Chỉ đọc: toàn bộ diff của phase 01 + 02.
Tạo: `plans/260908-1103-home-widget-fab/evidence/fab-closed.png`,
`evidence/fab-open.png`, report `plans/reports/tester-260908-<hhmm>-fab-green-evidence.md`.

## Implementation Steps

1. `pnpm lint` · `pnpm typecheck` — ghi exit code thật.
2. `pnpm test:unit` — 536/536, ngưỡng coverage 100% không tụt.
3. `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts` — kỳ vọng 5/5, exit 0.
   Ghi lại từng TC (36-40).
4. `E2E_PORT=3100 npx playwright test tests/e2e/home.spec.ts` — đối chiếu với baseline 27/27,
   đặc biệt `[TC ID-30…35]` (widget đóng/mở/Escape/focus).
5. `git diff --stat tests/` phải **rỗng** — bằng chứng test không bị nới.
6. Playwright MCP: mở `/`, scroll cho ảnh load, chụp trạng thái đóng; click trigger, chụp trạng
   thái mở. So với 2 frame MoMorph theo 5 điểm: thứ tự option, màu `#FFEA9E`/`#D4271D`, gap 20px,
   × đúng chỗ pill, không có shadow lúc nghỉ trên option.
7. `rm -r .playwright-mcp` (không `-rf`) rồi `pnpm format:check`.
8. `pnpm build` · `pnpm build-storybook`.
9. Viết report: bảng RED→GREEN theo từng TC, exit code thật, 2 ảnh, danh sách lệch thị giác (nếu có).

## Todo List

- [ ] lint · typecheck exit 0
- [ ] `pnpm test:unit` 536/536
- [ ] `home-widget-fab.spec.ts` 5/5 exit 0
- [ ] `home.spec.ts` baseline giữ
- [ ] `git diff --stat tests/` rỗng
- [ ] 2 ảnh bằng chứng + đối chiếu 5 điểm
- [ ] `.playwright-mcp/` đã dọn, `format:check` xanh
- [ ] `pnpm build` + `pnpm build-storybook` xanh
- [ ] report vào `plans/reports/`

## Success Criteria

- Report chứa **exit code thật** cho từng lệnh, không diễn giải.
- 5/5 GREEN trên đúng `redCommand`, `tests/` diff rỗng.
- Baseline `home.spec.ts` không tụt một test nào.
- Ảnh `fab-open.png` cho thấy: 2 option vàng đúng thứ tự (Thể lệ trên), × đỏ tròn dưới cùng, mép
  phải thẳng hàng nhau và thẳng với pill.
- Không có lệch thị giác nào ở mức "material" còn để mở.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Đối phó |
|---|---|---|---|
| Chạy `pnpm test:e2e -- <file>` → chạy cả 135 test, bằng chứng sai | Trung bình | Trung bình | Chỉ dùng `npx playwright test <file>` |
| Dev server cũ giữ cổng → kết luận flaky sai | Trung bình | Trung bình | `E2E_PORT=3100`; không kill cổng 3000 |
| Dán nhãn "pre-existing" cho lỗi thật | Trung bình | **Cao** | Bắt buộc log trước-sau; orchestrator tự chạy lại xác minh |
| Lệch thị giác nhỏ bị bỏ qua vì e2e đã xanh | Trung bình | Trung bình | Đối chiếu 5 điểm là bắt buộc, e2e không đo màu/gap |
| `.playwright-mcp/` làm `format:check` đỏ | Trung bình | Thấp | Dọn trước bước 7 |

## Rollback

Phase chỉ đọc code. Hoàn tác = xoá `evidence/` + report. Nếu GREEN không đạt: trả phạm vi hẹp
(đúng TC nào, đúng assertion nào) về `momorph-ui-implementer`, **không** nới test, **không** tự
sửa `src/`.

## Security Considerations

Không chạy test `@auth`/`@local-db` trong phase này (FAB hiện với khách ẩn danh, không cần DB).
Không cần `SERVICE_ROLE_KEY`. Không log secret vào report hay ảnh.

## Next Steps

Phase 04: sửa spec draft cho khớp hành vi đã chứng minh, bump version, promote spec sang `docs/`.
