# Phase 01 — Promote countdown modules lên Zone A

## Context Links

- [plan.md](./plan.md) · [clarifications.md](./clarifications.md) § "Tái dùng `CountdownTiles`"
- [spec/system/architecture.md](./spec/system/architecture.md) § "Route mới, PUBLIC" (luật climb scope-ladder)
- [spec/countdown-prelaunch-page/technical-spec.md](./spec/countdown-prelaunch-page/technical-spec.md) § 4.1, § 5.4
- Skill: `.claude/skills/nextjs-route-colocation-architecture/SKILL.md` (rule 2 scope ladder, rule 3 direction)
- Skill: `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` (companion đi theo file)

## Overview

**Priority:** P1 · **Status:** pending · **Effort:** 1h · **Deps:** —

Ba module đếm ngược đang nằm private trong `(home)`. Nay có route thứ 2 dùng chúng, scope ladder bắt
phải climb lên Zone A. Đây là **phép dời file thuần** — không đổi một dòng logic nào. Phase này chạm
code trang chủ đang chạy tốt, nên tiêu chí "done" của nó là chứng minh được không có gì đổi hành vi.

## Key Insights

1. `countdown-tiles.tsx` **không có import nào** → dời là rename 100%, diff rỗng.
2. Chỉ đúng **1 dòng** nội dung thay đổi trong toàn phase: `src/hooks/use-countdown.ts` đổi
   `from "../_utils/countdown"` → `from "@/utils/countdown"`. Mọi thay đổi còn lại nằm ở phía importer.
3. `src/components/` là thư mục **MỚI** trong repo — feature này là consumer đầu tiên (architecture.md).
4. Coverage không thủng: `vitest.config.ts` allowlist đã có sẵn cả `src/utils/**/*.ts`, `src/hooks/**/*.ts`
   lẫn `src/app/**/_utils|_hooks/**/*.ts`. Trước và sau khi dời, 2 file đều nằm trong mẫu số.
5. Runner không đổi: `use-countdown.test.ts` từ glob `src/app/**/_hooks/**/*.test.ts` chuyển sang
   `src/hooks/**/*.test.ts` — vẫn project `jsdom`. `countdown.test.ts` vẫn project `node`.
6. `(home)/_utils/` và `(home)/_hooks/` sau phase này **rỗng và biến mất** — mỗi thư mục chỉ chứa đúng
   cặp file đang dời.
7. `import/order` (`newlines-between: always`) sẽ bắt lỗi nếu import mới `@/...` bị để lại trong khối
   relative cũ. Đây là điểm gãy lint nhiều khả năng nhất của phase.

## Requirements

- FR: hành vi trang chủ giữ nguyên tuyệt đối (0 thay đổi render, 0 thay đổi DOM).
- NFR: mỗi file ≤ 200 dòng (đã đạt sẵn); kebab-case; companion test/story đi cùng file gốc.
- NFR: `pnpm test:unit:coverage` giữ nguyên 100% (gate cứng, dưới 100% CI đỏ).

## Architecture

```
(home)/_utils/countdown.ts        ──►  src/utils/countdown.ts          (pure, node)
(home)/_hooks/use-countdown.ts    ──►  src/hooks/use-countdown.ts      (hook, jsdom)
(home)/_components/countdown-tiles.tsx ──► src/components/countdown-tiles.tsx (common component)
```

Chiều import Zone A sau khi dời: `utils` ← `hooks` ← `components`. Đúng rule 3, không có vòng.
`src/components/countdown-tiles.tsx` không import gì cả nên không tạo cạnh mới nào.

## Related Code Files

**Move (git mv — giữ được rename detection):**

| Từ | Tới |
|---|---|
| `src/app/(public)/(home)/_utils/countdown.ts` | `src/utils/countdown.ts` |
| `src/app/(public)/(home)/_utils/countdown.test.ts` | `src/utils/countdown.test.ts` |
| `src/app/(public)/(home)/_hooks/use-countdown.ts` | `src/hooks/use-countdown.ts` |
| `src/app/(public)/(home)/_hooks/use-countdown.test.ts` | `src/hooks/use-countdown.test.ts` |
| `src/app/(public)/(home)/_components/countdown-tiles.tsx` | `src/components/countdown-tiles.tsx` |
| `src/app/(public)/(home)/_components/countdown-tiles.stories.tsx` | `src/components/countdown-tiles.stories.tsx` |

**Modify (chỉ dòng import, không đụng gì khác):**

- `src/hooks/use-countdown.ts` — `"../_utils/countdown"` → `"@/utils/countdown"`
- `src/app/(public)/(home)/page.tsx` — `"./_utils/countdown"` → `"@/utils/countdown"`, dời sang khối `@/`
- `src/app/(public)/(home)/_components/countdown-timer.tsx` — `"../_hooks/use-countdown"` → `"@/hooks/use-countdown"`; `"./countdown-tiles"` → `"@/components/countdown-tiles"` (file này hết import tương đối, sắp lại khối)
- `src/app/(public)/(home)/_components/home-screen.tsx` — `"./countdown-tiles"` → `"@/components/countdown-tiles"`
- `src/app/(public)/(home)/_components/home-screen.stories.tsx` — `"./countdown-tiles"` → `"@/components/countdown-tiles"`

**Delete:** hai thư mục rỗng `src/app/(public)/(home)/_utils/`, `src/app/(public)/(home)/_hooks/`.

**Không tạo file mới nào.** Không đụng `vitest.config.ts`, `.storybook/main.ts`, `eslint.config.mjs` —
glob của cả ba đã bao phủ đích đến.

## Implementation Steps

1. `git mv` cả 6 file theo bảng trên (dùng `git mv` để `-M` nhận ra rename, đó là bằng chứng của phase).
2. Sửa đúng 1 dòng import trong `src/hooks/use-countdown.ts`.
3. Sửa 4 importer trang chủ; với mỗi file, đưa import mới xuống khối `@/` và giữ dòng trống giữa các khối.
4. Xoá 2 thư mục rỗng.
5. `pnpm lint --max-warnings 0` → sửa lỗi `import/order` nếu có.
6. `pnpm format:check` (nếu đỏ: `pnpm format`, rồi check lại).
7. `pnpm test:unit:coverage` — phải 100%, số file trong bảng coverage không giảm.
8. `pnpm build` rồi `pnpm typecheck` (đúng thứ tự này — `typecheck` cần type Next sinh ra bởi build).
9. `pnpm build-storybook`.
10. `pnpm exec playwright test --grep-invert "@auth|@local-db"` — regression trang chủ.
11. Commit **một mình phase này**: `refactor(countdown): promote countdown modules to shared layers`.

## Todo List

- [ ] 6 `git mv`
- [ ] 1 dòng import trong `src/hooks/use-countdown.ts`
- [ ] 4 importer trang chủ, khối import đúng thứ tự
- [ ] 2 thư mục rỗng đã xoá
- [ ] `pnpm lint --max-warnings 0` xanh
- [ ] `pnpm format:check` xanh
- [ ] `pnpm test:unit:coverage` 100%
- [ ] `pnpm build && pnpm typecheck` xanh
- [ ] `pnpm build-storybook` xanh
- [ ] e2e CI-safe xanh (không có test mới nào ở phase này)
- [ ] `git show -M --stat HEAD` xác nhận 5 rename thuần + 1 dòng đổi
- [ ] commit riêng, không trộn phase khác

## Success Criteria

Lệnh xác minh "không đổi hành vi" — đây là done-criteria thật của phase, không phải test xanh chung chung:

```bash
git show -M --find-renames=90% --stat HEAD
# kỳ vọng: 6 dòng rename; 5 trong đó là R100 (0 insert / 0 delete)
git show -M -- src/hooks/use-countdown.ts
# kỳ vọng: đúng 1 dòng "-" và 1 dòng "+", cả hai là dòng import
```

Cộng thêm: `pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit:coverage && pnpm build && pnpm typecheck && pnpm build-storybook` xanh, và
`pnpm exec playwright test --grep-invert "@auth|@local-db"` giữ nguyên số test pass như trước phase.

## Risk Assessment

| Risk | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| `import/order` đỏ sau khi đổi relative → `@/` | Cao | Thấp | Bước 5 chạy lint ngay sau khi sửa, trước khi làm gì khác |
| Coverage rơi dưới 100% vì file rời khỏi allowlist | Thấp | Cao (CI đỏ) | Đã đối chiếu: cả 4 glob cũ/mới đều có trong `vitest.config.ts`; bước 7 xác nhận bằng bảng coverage |
| `use-countdown.test.ts` rơi khỏi project `jsdom` → `document` undefined | Thấp | Trung bình | Đích `src/hooks/**/*.test.ts` nằm đúng trong include của project `jsdom` |
| Reviewer bắt lỗi rule 5 "no business nouns in `src/{components,hooks,utils}`" | Trung bình | Thấp | Đã chốt ở `architecture.md` § climb + `technical-spec.md § 4.1`; ghi nhận là ngoại lệ có nguồn, không tự sửa đường dẫn |
| `src/utils/` hiện dùng thư mục con theo chủ đề (`a11y/`, `url/`) còn spec ghi `src/utils/countdown.ts` phẳng | Trung bình | Thấp | Theo spec — nó là input authoritative. Ghi một dòng vào `plans/action-items.md § Decisions` |
| Dời file làm `docs/vi/_source-to-fcode.json` lệch đường dẫn | Cao | Thấp | Không sửa tay docs sinh máy; chạy `rebuild-spec` core pass ở bước promote (phase 05 § Next Steps) |

## Security Considerations

Không có. Ba module đều thuần, không đọc env, không chạm session, không chạm Supabase.
`EVENT_START_AT` vẫn chỉ được đọc trong Server Component (`(home)/page.tsx`) — không có
`NEXT_PUBLIC_` nào bị thêm, không có giá trị nào rò sang bundle client.

## Rollback

Đây là phase duy nhất chạm code trang chủ đang chạy tốt, nên đường lùi phải rõ:

1. Phase này là **một commit duy nhất, không trộn với bất cứ phase nào khác**. Đó chính là thứ làm
   rollback thành một lệnh.
2. Chưa push: `git reset --hard HEAD~1`.
3. Đã push: `git revert <sha>` — vì commit chỉ chứa 6 rename + 5 dòng import, revert không thể làm mất
   công việc feature nào. Không có migration, không có dữ liệu, không có state ngoài repo.
4. Nếu chỉ một importer hỏng: `git checkout HEAD~1 -- <file>` rồi sửa lại riêng file đó — không cần lùi
   cả phase.
5. Điều kiện bắt buộc trước khi bắt đầu phase 03: phase 01 phải đã xanh và đã commit. Nếu 03/04 đã nằm
   trên cùng commit với 01 thì đường lùi ở trên mất hiệu lực — đó là lý do phải commit riêng.

## Next Steps

Phase 02 (RED evidence). Không có gì trong phase 02 chạm 6 file vừa dời hay 4 importer, nên hai phase
không tranh file — nhưng vẫn chạy tuần tự để bằng chứng RED được chụp trên cây đã dời xong.
