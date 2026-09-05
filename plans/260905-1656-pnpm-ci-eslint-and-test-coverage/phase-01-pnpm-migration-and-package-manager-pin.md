---
phase: 01
status: pending
priority: P1
effort: 2h
owner: implementer
depends_on: []
file_ownership: ["package.json", "pnpm-lock.yaml", "package-lock.json", "playwright.config.ts", "README.md"]
---

# Phase 01 — pnpm migration + package-manager pin

## Context Links

- `clarifications.md` § Stage 1 (commit dọn trước khi đổi pnpm — đã xong, 7 commit tới `9c1fa00`)
- `plans/reports/researcher-260905-1624-pnpm-and-ci.md` § A.1–A.4 (verify live: install + lint + typecheck + unit + build trên bản copy cô lập của chính repo này)
- `spec/system/architecture.md` § Tech Stack (dòng "Quản lý gói" + "Ràng buộc Node.js")

## Overview

**Priority**: P1 · **Status**: pending
Đổi package manager npm → pnpm 10.33.2 và CHỈ đổi package manager. Không thêm dep, không bump version, không đụng ESLint/Prettier. Phase này là nền: mọi tiêu chí done của 5 phase sau đều viết bằng `pnpm ...`.

## Key Insights

- `pnpm import` đọc `package-lock.json` và ghi `pnpm-lock.yaml` giữ NGUYÊN version đã resolve. Researcher đã kiểm chứng: `vitest ^3.2.7` → 3.2.7, `typescript ^5` → 5.9.3, `eslint ^9` → 9.39.5, khớp hệt bản `pnpm install` tươi. Đừng xoá cả hai lockfile rồi install lại — làm thế là trộn "đổi package manager" với "bump transitive dep", hai thay đổi không bao giờ được đi chung một commit.
- **Không dùng corepack.** Node TSC đã bỏ phiếu ngừng bundle corepack từ Node 25; repo này đang chạy Node 24. pnpm ≥10 tự đọc `packageManager` và re-exec đúng version (`manage-package-manager-versions` bật mặc định) — corepack thừa.
- **Không thêm `.npmrc`.** Layout non-flat của pnpm không phá `eslint-config-next` ở repo này vì `eslint.config.mjs` là flat config import plugin trực tiếp qua ESM, không phải name-based resolution kiểu `.eslintrc`. Đã verify `lint` exit 0. Thêm `shamefully-hoist` lúc này là fix mù cho triệu chứng không tồn tại.
- `pnpm install` sẽ chặn postinstall của 4 package **transitive** (`@parcel/watcher`, `@swc/core`, `esbuild`, `unrs-resolver`). Đã verify: không cái nào cần thiết để lint/typecheck/unit/build xanh. Bỏ qua cảnh báo, đừng approve trước.
- `tsc --noEmit` trên cây chưa build luôn báo 1 lỗi `LayoutProps` — đây là **lỗi có sẵn**, do Next 16 sinh ambient type vào `.next/types` chỉ sau khi build/dev. Không phải hệ quả của pnpm. Verify typecheck SAU khi `pnpm build`.
- pnpm 11.25.0 đã ra nhưng **chưa được thử** trên repo này. Không nhảy major trong đợt migrate.

## Requirements

- `package.json` có `"packageManager": "pnpm@10.33.2"` và `"engines": { "node": ">=22 <25" }`.
- `pnpm-lock.yaml` tồn tại và được commit; `package-lock.json` bị xoá.
- Hai chỗ hardcode npm còn sống được sửa: `playwright.config.ts:40` và `README.md`.
- ~90 hit `npm` khác nằm trong `plans/260904-1633-*/**` và `docs/journals/**` — **KHÔNG động vào**. Đó là log thực thi có mốc thời gian của một feature đã đóng; sửa chúng là làm sai lệch lịch sử.
- Không đổi bất kỳ version dependency nào (kể cả patch).

## Architecture

```
package-lock.json ──(pnpm import)──> pnpm-lock.yaml   [version parity, không re-resolve]
                                            │
package.json + packageManager/engines ──────┤
                                            ▼
                                   pnpm install ──> lint / build / typecheck / unit / e2e
playwright.config.ts webServer: 'npm run dev' ──> 'pnpm dev'
README.md setup + scripts table            ──> pnpm
```

## Related Code Files

**Modify**: `package.json` (thêm `packageManager`, `engines`, thêm script `typecheck`), `playwright.config.ts` (dòng 40), `README.md` (dòng 44-45 setup, 51-56 bảng scripts, + mục prerequisites)
**Create**: `pnpm-lock.yaml`
**Delete**: `package-lock.json`

## Implementation Steps

1. **Baseline** — chạy và lưu log vào `plans/260905-1656-pnpm-ci-eslint-and-test-coverage/evidence/baseline-npm.log`: `npm run lint`, `npm run test:unit`, `npm run build`, rồi `npx tsc --noEmit`. Ghi lại exit code của từng lệnh. Không có baseline thì không rollback nào kiểm chứng được.
2. Xác nhận `pnpm --version` = `10.33.2`. Nếu PATH không có pnpm (ví dụ vừa đổi Node bằng nvm): `npm i -g pnpm@10.33.2` rồi kiểm tra lại. KHÔNG bật corepack.
3. Xoá `package-lock.json`.
4. `pnpm import` → sinh `pnpm-lock.yaml`.
5. Thêm vào `package.json`: `"packageManager": "pnpm@10.33.2"`, `"engines": { "node": ">=22 <25" }`, và script `"typecheck": "tsc --noEmit"`.
6. `pnpm install` (đọc lockfile vừa import).
7. **Parity check** — so version thực tế đã cài với baseline: `pnpm list --depth 0` đối chiếu `npm ls --depth 0` trong log bước 1. Lệch bất kỳ dòng nào → dừng, điều tra, không commit.
8. `playwright.config.ts:40` → `command: 'pnpm dev'`.
9. `README.md`: bước setup `npm install`/`npm run dev` → `pnpm`; bảng scripts đổi hết sang `pnpm ...`; thêm dòng prerequisite: cần pnpm 10.33.2 trên PATH (`npm i -g pnpm@10.33.2`), repo pin qua `packageManager`.
10. Verify theo đúng thứ tự: `pnpm lint` → `pnpm test:unit` → `pnpm build` → `pnpm typecheck`. (build trước typecheck, xem Key Insights.)
11. E2E sanity (cần `saa-app` chạy): `pnpm test:e2e` — chứng minh `webServer.command` mới khởi động được dev server.
12. Commit một commit duy nhất, scope `chore(deps)`: chỉ lockfile + 3 file trên.

## Todo List

- [ ] Lưu baseline log + exit code của 4 lệnh npm
- [ ] Xác nhận pnpm 10.33.2 trên PATH (không corepack)
- [ ] Xoá `package-lock.json`, chạy `pnpm import`
- [ ] `packageManager` + `engines` + script `typecheck` vào `package.json`
- [ ] `pnpm install` + parity check version với baseline
- [ ] `playwright.config.ts:40` → `pnpm dev`
- [ ] README: setup + bảng scripts + prerequisite pnpm
- [ ] lint / test:unit / build / typecheck xanh; e2e sanity với saa-app
- [ ] Commit `chore(deps): migrate npm to pnpm`

## Success Criteria

| Command | Expected |
|---|---|
| `pnpm lint` | exit 0 |
| `pnpm test:unit` | exit 0, 32/32 pass |
| `pnpm build` | exit 0, liệt kê đủ 5 route + Middleware |
| `pnpm typecheck` (sau build) | exit 0 |
| `pnpm test:e2e` (saa-app đang chạy) | exit 0, 23/23 pass |
| `grep -rn "npm run\|npm install" playwright.config.ts README.md` | 0 hit |
| `ls package-lock.json` | không tồn tại |

Thêm: `pnpm list --depth 0` khớp từng dòng với baseline `npm ls --depth 0`.

## Rollback

`git checkout -- package.json playwright.config.ts README.md`, xoá `pnpm-lock.yaml`, khôi phục `package-lock.json` từ HEAD, `npm ci`. Toàn bộ thay đổi nằm trong 1 commit nên `git revert` một phát là đủ; `node_modules` dựng lại từ lockfile, không có state nào ngoài repo cần hoàn tác.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| `pnpm import` âm thầm bump transitive dep | L×H | Parity check bước 7; lệch là dừng, không commit |
| 4 postinstall bị chặn làm hỏng build | L×M | Đã verify không cần; nếu có triệu chứng có tên thì `pnpm approve-builds <pkg>` đúng package đó, không blanket |
| `tsc --noEmit` đỏ vì `LayoutProps` bị hiểu nhầm là pnpm gây ra | H×M | Chạy typecheck SAU build; đã ghi vào Key Insights và Success Criteria |
| pnpm biến mất khỏi PATH khi đổi Node qua nvm | M×M | `packageManager` pin + prerequisite trong README (bước 9) |
| Sửa nhầm ~90 hit npm trong plans/docs journals | M×M | Ownership của phase giới hạn đúng 3 file; review diff đếm file trước khi commit |
| E2E không verify được vì saa-app không chạy | M×L | Bước 11 là sanity, không phải cổng chặn — nếu saa-app tắt, ghi rõ "chưa verify e2e" vào commit note thay vì bỏ qua im lặng |

## Security Considerations

- `pnpm-lock.yaml` được commit → cài đặt tất định, `--frozen-lockfile` trong CI ở phase 05 sẽ từ chối lockfile lệch manifest.
- Không thêm `.npmrc` → không có registry/auth token nào lọt vào repo.
- Không blanket-approve build script: giữ nguyên sandbox mặc định của pnpm 10, giảm bề mặt thực thi code tuỳ ý lúc install.
- `.env*` đã gitignored, phase này không đụng tới env.

## Next Steps

Phase 02 cài 4 devDep mới bằng `pnpm add -D` — chúng vào `pnpm-lock.yaml` một cách tự nhiên, không cần import lại.
