---
phase: 03
status: pending
priority: P2
effort: 1h
owner: implementer
depends_on: [02]
file_ownership: [".prettierignore", "package.json", "eslint.config.mjs", "app/**", "components/**", "lib/**", "i18n/**", "tests/**", "messages/**"]
---

# Phase 03 — Prettier + reformat baseline

## Context Links

- `clarifications.md` § Step 2b ("Đo được, không cần warn-first" — 16 file thật, con số 126 là markdown máy sinh)
- `plans/reports/researcher-260905-1624-eslint-standard.md` § Q6 (Prettier thay vì ESLint Stylistic, lý do tách hai công cụ)
- `spec/system/architecture.md` § Tech Stack dòng "Formatter"

## Overview

**Priority**: P2 · **Status**: pending
Đặt Prettier làm formatter, khoanh phạm vi bằng `.prettierignore`, rồi land 16 file reformat thành **một commit riêng, thuần whitespace**. Phase này cố tình nhàm chán — giá trị của nó nằm ở chỗ diff dễ review, không ở chỗ nó thông minh.

## Key Insights

- Cột mốc quyết định: **reformat land TRƯỚC khi viết test mới (phase 04), không phải sau**. Nếu đảo lại, diff logic test mới sẽ bị whitespace của Prettier nhấn chìm và người review không tách nổi hai thứ. Đặt trước thì phase 04 viết trên cây đã chuẩn hoá và `prettier --check` của chính nó giữ đúng dạng.
- 126 vs 16: lần quét đầu `npx prettier --check .` đếm cả markdown máy sinh dưới `plans/`/`docs/`. Những file đó là log thực thi + artifact sinh tự động — format lại chúng vừa vô nghĩa vừa làm nhiễu lịch sử. `.prettierignore` là thứ biến 126 thành 16, không phải may mắn.
- `eslint-config-prettier` **chỉ tắt rule**, không thêm rule nào. Nó không thể làm cây vừa xanh ở phase 02 chuyển đỏ. Đặt cuối mảng flat config để thắng mọi chồng lấn.
- Rủi ro thật duy nhất: Prettier chạm blank line giữa các nhóm import, mà `import/order` của phase 02 đang bật `newlines-between: always`. Prettier giữ single blank line nên về lý thuyết không đụng — nhưng "về lý thuyết" không phải bằng chứng. Bước verify là chạy `pnpm lint` NGAY sau reformat.
- Không gate CI trên format ở phase này; job `quality` (phase 05) mới là nơi `--check` chặn merge. Reformat phải nằm trong lịch sử trước khi cổng đóng lại.

## Requirements

- `.prettierignore` loại trừ: `node_modules`, `.next`, `out`, `build`, `coverage`, `test-results`, `playwright-report`, `plans/`, `docs/`, `.claude/`, `pnpm-lock.yaml`, `next-env.d.ts`, `*.tsbuildinfo`, `public/`.
- Không tạo `.prettierrc` trừ khi có lý do cụ thể — Prettier mặc định là điểm bán hàng của nó (KISS). Nếu buộc phải có, chỉ ghi giá trị nào thật sự lệch mặc định và ghi lý do.
- `eslint-config-prettier` spread **cuối cùng** trong `eslint.config.mjs`.
- Scripts: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
- Commit reformat **không chứa một thay đổi phi-whitespace nào**.

## Architecture

```
.prettierignore ──> thu hẹp "." từ ~126 file xuống 16 file source
prettier --write .        (1 commit, thuần whitespace)
eslint.config.mjs: [ ...tất cả cấu hình phase 02, ...eslintConfigPrettier ]   ← spread cuối
package.json: format / format:check
                    │
                    └──> phase 05 gọi `pnpm format:check` trong job quality
```

## Related Code Files

**Create**: `.prettierignore`
**Modify**: `package.json` (2 devDep + 2 script), `eslint.config.mjs` (spread cuối), 16 file source trong `app/`, `components/`, `lib/`, `i18n/`, `tests/`, `messages/` và config root
**Delete**: —

## Implementation Steps

1. `pnpm add -D prettier eslint-config-prettier`.
2. Viết `.prettierignore` theo § Requirements.
3. `pnpm exec prettier --check .` → **ghi lại con số**. Kỳ vọng 16 file. Lệch nhiều (ví dụ vẫn ra >30) → `.prettierignore` còn thủng, sửa ignore rồi đo lại; đừng reformat khi con số chưa khớp kỳ vọng.
4. Thêm `eslint-config-prettier` spread cuối `eslint.config.mjs`.
5. `pnpm lint --max-warnings 0` — vẫn exit 0 (chứng minh eslint-config-prettier chỉ tắt rule, không phá gì).
6. Commit A: config + dep + scripts, **chưa reformat**. Ở commit này `format:check` vẫn đỏ — đó là chủ đích, tách bạch "dựng công cụ" khỏi "áp dụng công cụ".
7. `pnpm format` (`prettier --write .`).
8. `git diff --stat` — xác nhận đúng ~16 file. `git diff -w --stat` phải cho ra **rỗng hoặc gần rỗng**; còn thay đổi phi-whitespace nào thì dừng, điều tra.
9. `pnpm lint --max-warnings 0` — cổng chống hồi quy `import/order` (xem Key Insights).
10. `pnpm build && pnpm typecheck && pnpm test:unit` xanh.
11. E2E (cần saa-app): `pnpm test:e2e` 23/23 — reformat có chạm `tests/e2e/**` và `messages/*.json`.
12. Commit B: `style: apply prettier formatting` — chỉ 16 file, message nói rõ đây là reformat cơ học.

## Todo List

- [ ] Cài `prettier` + `eslint-config-prettier`
- [ ] `.prettierignore` (loại plans/docs/.claude/artifact máy sinh)
- [ ] Đo `--check`, xác nhận đúng 16 file
- [ ] Spread `eslint-config-prettier` cuối config, lint vẫn 0 warning
- [ ] Commit A: công cụ (chưa reformat)
- [ ] `prettier --write .`, xác nhận `git diff -w` rỗng
- [ ] lint / build / typecheck / unit xanh; e2e 23/23
- [ ] Commit B: reformat thuần whitespace

## Success Criteria

| Command | Expected |
|---|---|
| `pnpm format:check` | exit 0 |
| `pnpm lint --max-warnings 0` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test:unit` | exit 0, 32/32 |
| `pnpm test:e2e` (saa-app chạy) | exit 0, 23/23 |
| `git diff -w HEAD~1 --stat` (tại commit B) | rỗng — chứng minh reformat không đổi ngữ nghĩa |

## Rollback

`git revert` commit B lấy lại format cũ, revert commit A gỡ công cụ. Vì commit B đã được chứng minh là whitespace-only (`git diff -w` rỗng), revert nó không thể phá hành vi — đây chính là lý do tách hai commit.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Prettier phá blank line giữa import group → gãy `import/order` | M×M | Bước 9 chạy lint ngay sau reformat; gãy thì chỉnh `newlines-between` hoặc chạy `lint:fix` lần nữa rồi format lại tới điểm bất động |
| `.prettierignore` thủng → reformat cả markdown máy sinh trong `plans/` | M×M | Bước 3 đo trước, chỉ reformat khi con số khớp 16 |
| Reformat `messages/{vi,en}.json` làm lệch key | L×H | JSON format lại không đổi key; test parity của phase 04 sẽ là guard vĩnh viễn, và e2e bước 11 render text thật |
| Bị cám dỗ "sửa luôn cho gọn" trong commit reformat | M×M | Cổng `git diff -w` rỗng ở Success Criteria — không qua thì không commit |
| Cây làm việc còn `.claude/` và artifact plan untracked bị Prettier quét | M×L | Có trong `.prettierignore` từ bước 2 |

## Security Considerations

Không có bề mặt bảo mật mới — Prettier không chạy lúc runtime, cả 2 package đều devDependency. Rủi ro duy nhất đáng nêu là rủi ro review: một commit reformat lớn là chỗ trốn lý tưởng cho thay đổi lén; cổng `git diff -w` rỗng chính là biện pháp chống lại điều đó.

## Next Steps

Cây giờ đã ổn định cả về lint lẫn format. Phase 04 (test) và phase 05 (job `quality`) chạy song song từ đây — chúng không dùng chung file nào.
