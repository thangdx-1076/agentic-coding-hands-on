# Phase 10 — Bật ngưỡng 100% + cổng CI

## Context Links

- [`plan.md`](./plan.md) · Spec: FR-002, A1 (§ 3.1), SC-001, SC-003
- [`architecture.md`](./spec/system/architecture.md) § Test coverage (cổng chặn, không còn là số đo)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 0.5h · **Depends on**: 04, 05, 06, 08, 09

**Deviation note:** `Build Storybook` was placed AFTER `Typecheck` rather than after `Build` as the original plan specified. Rationale: this preserves the ordered `build → typecheck` pair adjacent to each other (see ci.yml comment explaining why typecheck must follow build), reducing the risk of a future edit separating them. The effect is identical — build-storybook exits 0 either way — and the success criteria remain the same.

Phase cuối. Biến 100% từ *con số in ra* thành *cổng chặn thật*, và đưa Storybook vào cùng
cổng đó. Nhỏ về code, nhưng đây là phase khiến toàn bộ chuẩn có hiệu lực.

## Key Insights

- **Đây là lý do 9 phase trước không bật ngưỡng.** Bật sớm thì CI đỏ giữa chừng; bật ở đây thì
  test đã có đủ để thoả nó.
- **CI hiện chạy `pnpm test:unit`, KHÔNG phải `test:unit:coverage`.** Không đổi bước này thì
  ngưỡng nằm trong config nhưng CI chẳng bao giờ chạm tới — chuẩn thành trang trí.
- **`typecheck` phải ở SAU `build`.** Next chỉ sinh `.next/types` sau khi build ít nhất một lần.
  Đây đã ghi thành comment dài trong `ci.yml` — đừng "dọn cho gọn".
- **`build-storybook` đặt sau `build`**, trước `typecheck`. Nó cần devDeps đã cài (bước install
  đã lo) và không phụ thuộc `.next/`.
- **Không có branch protection trên `main`** (verify 2026-09-05, `gh api .../protection` trả 404).
  Nghĩa là mọi thứ ở đây *kiểm tra* chứ chưa *cưỡng chế*. Phải nói thẳng điều đó, đừng để ai
  tưởng merge đã bị chặn.

## Requirements

- FR-002: CI fail (exit ≠ 0) khi bất kỳ file/nhánh nào trong allowlist dưới 100%.
- SC-003: `build-storybook` exit 0 là một bước có thật trong pipeline.
- Non-functional: không tăng thời gian CI quá mức chấp nhận (~+90s cho Storybook).

## Architecture

```
vitest.config.ts
  test.coverage.thresholds = { 100: true }     ← key DUY NHẤT phase này thêm

.github/workflows/ci.yml  job "quality"
  install → lint → format:check
          → test:unit:coverage   (đổi từ test:unit)   ← cổng coverage
          → build
          → build-storybook      (bước MỚI)           ← cổng story
          → typecheck            (giữ nguyên vị trí cuối)
```

Job `e2e` **không đổi** — nó độc lập, không `needs: quality`, và phần `@auth` vẫn nằm ngoài CI
đúng như trước.

## Related Code Files

**Sửa**
- `vitest.config.ts` — **CHỈ thêm key `coverage.thresholds`**. Không đụng `projects`,
  `coverage.include`, `coverage.exclude`, `resolve.alias` (phase 03 sở hữu chúng)
- `.github/workflows/ci.yml` — đổi 1 bước, thêm 1 bước, cập nhật comment header

**Tạo / Xoá**: không có.

## Implementation Steps

1. Chạy `pnpm test:unit:coverage` TRƯỚC khi sửa gì. Phải đã là 100/100/100/100 nhờ phase 04–06.
   **Nếu chưa đạt: dừng, quay lại phase còn thiếu.** Bật ngưỡng để "ép" viết test là làm ngược.
2. Thêm vào `vitest.config.ts` → `test.coverage`:
   ```ts
   thresholds: { 100: true },
   ```
   Kèm comment 2 dòng: ngưỡng này là cổng chặn thật; nghĩa của nó hẹp và trung thực (mọi helper
   thuần, mọi máy trạng thái quan sát được của hook, mọi logic riêng của Server Action/Route
   Handler) — nó KHÔNG chứng minh Server Component render đúng hay UI trông đúng.
3. `ci.yml`: đổi
   ```diff
   -      - name: Unit tests
   -        run: pnpm test:unit
   +      - name: Unit tests (coverage gate 100%)
   +        run: pnpm test:unit:coverage
   ```
   và thêm sau bước `Build`:
   ```yaml
   - name: Build Storybook
     run: pnpm build-storybook
   ```
4. Cập nhật comment header của `ci.yml`: xanh giờ có thêm nghĩa "logic layer đã phủ 100% và mọi
   story build được"; nhưng **giữ nguyên** toàn bộ đoạn nói về giới hạn `@auth` và nhánh PKCE —
   đoạn đó vẫn đúng. Thêm một câu: chưa bật branch protection nên các cổng này chưa thật sự
   chặn merge.
5. **Chứng minh cổng thật (SC-001).** Tạm comment một `it(...)` bất kỳ trong `hooks/`, chạy
   `pnpm test:unit:coverage` → phải exit **khác 0** vì coverage, không phải vì test fail.
   Khôi phục lại. Ghi kết quả vào commit message.
6. Push branch, xem run CI thật: job `quality` phải xanh với đủ 6 bước.

## Todo List

- [x] Xác nhận 100% TRƯỚC khi bật ngưỡng
- [x] `vitest.config.ts`: thêm đúng `thresholds: { 100: true }` + comment
- [x] `ci.yml`: `test:unit` → `test:unit:coverage`
- [x] `ci.yml`: thêm bước `Build Storybook` sau `Build`
- [x] `ci.yml`: cập nhật comment header, giữ nguyên phần giới hạn `@auth`
- [x] Thử nghiệm red→green chứng minh ngưỡng chặn thật
- [x] Run CI trên branch, job `quality` xanh

## Success Criteria

```bash
pnpm test:unit:coverage                                    # exit 0, 100/100/100/100
grep -q "test:unit:coverage" .github/workflows/ci.yml      # exit 0
grep -q "build-storybook" .github/workflows/ci.yml         # exit 0
grep -q "pnpm test:unit$" .github/workflows/ci.yml         # exit 1 (không còn bước cũ)
# thứ tự vẫn đúng: build TRƯỚC typecheck
grep -n "run: pnpm build$\|run: pnpm typecheck" .github/workflows/ci.yml
pnpm lint --max-warnings 0 && pnpm format:check && pnpm build && pnpm typecheck   # exit 0
```

**Kiểm định độc lập (SC-001)**: xoá/comment 1 test trong allowlist → `pnpm test:unit:coverage`
exit ≠ 0. Đây là bằng chứng ngưỡng là cổng chặn, không phải số in ra.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Bật ngưỡng khi chưa thật sự 100% → CI đỏ ngay | Trung bình | Cao | Bước 1 là cửa chặn cứng: chưa 100% thì không được sửa config |
| Đảo `typecheck` lên trước `build` "cho gọn" | Thấp | Cao (CI đỏ vì lý do vô can) | Comment dài trong `ci.yml` đã cảnh báo; success criteria có kiểm thứ tự |
| `build-storybook` làm CI chậm/flaky | Trung bình | Trung bình | Chấp nhận ~90s. Nếu flaky thật, tách thành job riêng (không `needs: quality`) đúng theo pattern job `e2e` |
| Đụng key khác trong `vitest.config.ts` (thuộc phase 03) | Trung bình | Trung bình | Diff phase này chỉ được có 1 key + comment. Diff dài hơn = làm sai |
| Ngưỡng 100% biến thành áp lực viết test rỗng cho đủ số | Trung bình | Cao (chất lượng giả) | Allowlist đã vẽ hẹp và trung thực; ai muốn dễ thì phải sửa allowlist — mà đó là thay đổi nhìn thấy được trong review |
| Tưởng CI đã chặn merge | **Cao** | Trung bình | Bước 4 ghi thẳng vào comment header: chưa có branch protection |

## Security Considerations

- Không thêm secret nào vào `ci.yml`. Cặp `NEXT_PUBLIC_*` giữ nguyên placeholder — **không**
  thay bằng giá trị thật của `saa-app`.
- `build-storybook` xuất ra `storybook-static/` — đã ignore ở `.gitignore` (phase 01),
  `.prettierignore` và eslint `globalIgnores` (phase 03). Không upload nó làm artifact công khai.
- Không nới `--max-warnings` để CI dễ xanh.

## Next Steps

Sau phase này, ở bước Delivery:
- promote `plans/260905-2221-testing-storybook-standards/spec/system/architecture.md` →
  `docs/vi/system/architecture.md` (phần Test topology giờ đã khớp code thật);
- ghi Decisions + Nợ lại vào `plans/action-items.md`;
- việc cần **người** làm: bật branch protection cho `main` và đặt `quality` + `e2e` làm
  required status check — không có nó thì mọi cổng ở đây vẫn chỉ là lời khuyên.
