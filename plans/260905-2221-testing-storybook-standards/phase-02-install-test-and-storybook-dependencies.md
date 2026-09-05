# Phase 02 — Cài dependency test + Storybook

## Context Links

- [`plan.md`](./plan.md)
- Research versions: [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) § Install ·
  [`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md) § Install command
- Giải câu chưa chốt § 5.3 **#1** (framework auto-pick) và **#3** (Vite major)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 0.5h · **Depends on**: —

Một phase riêng chỉ để cài, vì `package.json` + `pnpm-lock.yaml` là điểm va chạm duy nhất
giữa hai nhánh việc (vitest ở phase 03, Storybook ở phase 07). Tách ra thì hai nhánh đó chạy
song song được.

## Key Insights

- **Version đã chốt, không tự nâng/hạ.** Toàn bộ stack này là bản mới gần như đồng thời
  (RISK-01 của functional-spec). Pin đúng số đã research là cách duy nhất tái lập được lỗi
  nếu có sự cố.
- **Không chạy `storybook init` trần.** Đó chính là câu chưa chốt #1 — auto-detect có thể
  chọn `@storybook/nextjs` (webpack). Pin tay `--framework=@storybook/nextjs-vite` hoặc cài
  thẳng bằng `pnpm add -D`.
- **pnpm 10 chặn build script mặc định.** Cây phụ thuộc Storybook kéo theo esbuild/vite có
  lifecycle script; pnpm 10 bỏ qua im lặng kèm warning "Ignored build scripts".
- `vite` để KHÔNG pin (peer range `^5||^6||^7||^8`) — ghi lại major pnpm thật sự chọn.

## Requirements

- Cài đủ 8 package, đúng version.
- Thêm 2 script: `storybook`, `build-storybook`.
- Non-functional: `pnpm install --frozen-lockfile` phải exit 0 sau khi commit lockfile.

## Architecture

Không có kiến trúc runtime. Chỉ là một thay đổi contract `package.json` ↔ `pnpm-lock.yaml`.
Không package nào rơi vào `dependencies` — tất cả `devDependencies`, nên bundle production
không đổi một byte.

## Related Code Files

**Sửa**
- `package.json` (devDependencies, scripts, có thể cả `pnpm.onlyBuiltDependencies`)
- `pnpm-lock.yaml`

**Tạo / Xoá**: không có.

## Implementation Steps

1. ```bash
   pnpm add -D @testing-library/react@^16.3.3 @testing-library/dom@^10.4.1 jsdom@^30.0.1
   pnpm add -D storybook@10.6.0 @storybook/nextjs-vite@10.6.0 vite
   pnpm add -D msw@2.15.0 msw-storybook-addon@3.0.0
   ```
   `@testing-library/dom` phải cài tường minh — RTL v16.0.0 chuyển nó thành peer thật, không
   còn kéo theo transitively.
2. Nếu install in ra "Ignored build scripts": chạy `pnpm approve-builds`, chọn các package
   cần build, commit thay đổi `package.json` (`pnpm.onlyBuiltDependencies`) + lockfile.
3. Thêm script vào `package.json`:
   ```json
   "storybook": "storybook dev -p 6006",
   "build-storybook": "storybook build"
   ```
4. Ghi lại 2 câu trả lời (vào commit message hoặc `plans/action-items.md` ở Delivery):
   ```bash
   pnpm ls @storybook/nextjs-vite storybook msw msw-storybook-addon   # #1: xác nhận framework
   pnpm ls vite                                                        # #3: Vite major thật
   node -v                                                             # phải ≥ 22.12
   ```
5. Cửa xanh. `pnpm test:unit` vẫn chạy đúng 5 file `lib/**` như trước — thêm devDep không đổi gì.

## Todo List

- [x] Cài 3 package testing-library/jsdom
- [x] Cài 3 package storybook + vite
- [x] Cài 2 package msw
- [x] `pnpm approve-builds` nếu có warning, commit kết quả
- [x] Thêm script `storybook` + `build-storybook`
- [x] Ghi lại output `pnpm ls vite` và `pnpm ls @storybook/nextjs-vite`
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm ls @storybook/nextjs-vite | grep -q "10.6.0"          # exit 0
pnpm ls msw | grep -q "2.15.0"                              # exit 0
node -e "const p=require('./package.json');process.exit(p.scripts['build-storybook']?0:1)"  # exit 0
rm -rf node_modules && pnpm install --frozen-lockfile       # exit 0 (lockfile là contract thật)
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck  # exit 0
```

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| pnpm bỏ qua build script → vite/esbuild không chạy được ở phase 07 | **Cao** (pnpm 10 mặc định như vậy) | Cao | `pnpm approve-builds` ngay trong phase này, không để phase 07 mới phát hiện |
| Peer conflict giữa `@storybook/nextjs-vite` và `vite` major pnpm chọn | Trung bình | Cao | Peer range trải 4 major nên khó vỡ; nếu vỡ thì pin `vite` xuống major thấp hơn một nấc và ghi lại lý do |
| Node local < 22.12 → Storybook 10 lỗi resolve module | Thấp (máy dev Node 24.14.1) | Cao | `node -v` là success criteria; CI pin Node 24 nên chỉ ảnh hưởng máy dev |
| Storybook 10 ESM-only xung đột với `@types/node@^20` | Thấp | Trung bình | Chỉ nâng `@types/node` nếu typecheck thật sự đỏ — không nâng phòng xa (YAGNI) |
| Cây devDep phình, CI install chậm hơn | Cao | Thấp | Chấp nhận. Cache `setup-node` đã key theo lockfile, chỉ chậm ở lần đầu |

## Security Considerations

- 8 package mới đều là devDependency — không vào bundle client, không chạy ở production.
- KHÔNG commit `.env*`. `mocks/handlers.ts` (phase 03) đọc URL từ biến môi trường, không
  hardcode key thật.
- Sau install, đọc lướt diff `pnpm-lock.yaml` xem có registry lạ nào không (chỉ được thấy
  `registry.npmjs.org`).

## Next Steps

Mở khoá phase 03 (vitest + MSW) và phase 07 (Storybook) — hai phase này chạy song song được.
