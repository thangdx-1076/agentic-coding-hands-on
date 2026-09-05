# Phase 01 — Viết skill chuẩn test/story

## Context Links

- [`plan.md`](./plan.md)
- Spec: [`functional-spec.md`](./spec/testing-storybook-standards/functional-spec.md) FR-001..FR-005, BR-001..BR-003
- Skill có sẵn phải build-on (KHÔNG lặp lại): `.claude/skills/separate-hook-logic-from-components/SKILL.md`

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1h · **Depends on**: —

User yêu cầu skill TRƯỚC, code sau. Phase này chỉ tạo skill + mở cổng git cho nó, không
đụng một dòng code chạy thật nào.

## Key Insights

- **`.gitignore` sẽ nuốt skill mới nếu không opt-in.** Repo ignore `.claude/skills/*` rồi
  un-ignore từng skill một bằng tên. Thiếu dòng `!.claude/skills/write-unit-tests-and-storybook-stories/`
  thì skill viết xong vẫn không vào được commit — im lặng, không lỗi.
- **`pnpm format:check` ĐANG ĐỎ sẵn** trên `CLAUDE.md` (verify 2026-09-05, file chưa commit từ
  session khác). Mọi "cửa xanh" của 9 phase sau đều vô nghĩa nếu không dọn ngay ở đây.
- **Skill có sẵn chứa 2 câu sắp thành sai**: *"`vitest.config.ts` chỉ chạy `lib/**/*.test.ts`"*
  và *"Phần hook và JSX do Playwright (`tests/e2e/`) phủ"*. Sửa bằng cách **trỏ sang skill mới**,
  không chép lại cấu hình — chép là vi phạm DRY và sẽ lại lệch lần sau.
- `.claude/**` nằm trong cả `.prettierignore` lẫn eslint `globalIgnores` → markdown skill không
  bị format-check. Viết thoải mái, không lo lint.

## Requirements

- FR-001..FR-005 phải được phát biểu thành quy tắc hành động được, không phải mô tả.
- Frontmatter `description` phải mang trigger kích hoạt, đúng kiểu skill có sẵn (câu
  "Kích hoạt MỖI KHI ...").
- Non-functional: SKILL.md dưới 200 dòng, tiếng Việt, cùng giọng skill có sẵn.

## Architecture

Hai skill, hai lớp trách nhiệm, không chồng:

| Skill | Trả lời câu hỏi |
|---|---|
| `separate-hook-logic-from-components` (có sẵn) | Đoạn code này thuộc lớp nào — `lib/`, `hooks/`, hay component? |
| `write-unit-tests-and-storybook-stories` (mới) | Đã biết lớp rồi, thì phải kèm file gì bên cạnh? |

Skill mới lấy ranh giới 3 lớp từ skill cũ làm input, không định nghĩa lại (A0 của
technical-spec § 4.4).

## Related Code Files

**Tạo**
- `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md`

**Sửa**
- `.claude/skills/separate-hook-logic-from-components/SKILL.md` — thay 2 câu stale ở mục
  *"Vì sao ở repo này ranh giới `lib/` lại quan trọng"* bằng cross-reference
- `.gitignore` — thêm 2 dòng
- `CLAUDE.md` — chỉ chạy prettier, không sửa nội dung

**Xoá**: không có.

## Implementation Steps

1. `pnpm exec prettier --write CLAUDE.md` — dọn cửa đỏ có sẵn. Kiểm ngay `git diff CLAUDE.md`:
   chỉ được thấy thay đổi whitespace/wrap, không được thấy chữ nào đổi.
2. Thêm vào `.gitignore`, ngay dưới dòng `!.claude/skills/separate-hook-logic-from-components/`:
   ```
   !.claude/skills/write-unit-tests-and-storybook-stories/
   ```
   Và trong nhóm build output, thêm `/storybook-static/` (phase 07 sẽ sinh ra nó; thêm sớm là
   vô hại và tránh commit nhầm 20MB artifact).
3. Viết `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` với bố cục:
   - Frontmatter `name` + `description` mang trigger:
     `Kích hoạt MỖI KHI tạo mới hoặc sửa file trong hooks/, lib/, app/actions/, app/todo/actions.ts,
     app/auth/callback/route.ts; khi tạo component trong components/; khi chạy vitest/coverage/storybook;
     hoặc khi user nói "viết test", "unit test", "coverage", "storybook", "story", "mock API", "msw".`
   - **Bảng "sửa file này thì phải kèm file gì"** — 1 bảng, 4 hàng: logic thuần / hook / Server
     Action & Route Handler chỉ định / common component. Cột: đường dẫn, file bắt buộc kèm,
     runner nào chạy.
   - **Ranh giới "common" (BR-002)** dạng 3 câu hỏi trả lời có/không, dừng ở "không" đầu tiên:
     nhận toàn bộ dữ liệu qua props? · không import copy/dữ liệu đặc thù tính năng và không import
     từ `app/`? · không lắp ghép ≥2 component đã đặt tên (icon không tính)? — đủ 3 "có" → bắt
     buộc story. Kèm bảng phân loại thật của repo hôm nay (common: `GoogleLoginButton`,
     `LanguageSelector`, `LoginErrorAlert`, `LoginFooter`, 3 icon; composition: `LoginHeader`,
     `LoginHero`, `LoginBackground`, `LoginScreen`).
   - **Coverage 100% nghĩa là gì và KHÔNG nghĩa là gì** — allowlist tường minh, không có glob
     `.tsx` nào; nói thẳng là nó không chứng minh Server Component render đúng hay UI đúng.
   - **MSW là một module duy nhất** — `mocks/handlers.ts`, hai runtime cùng import. Kèm cảnh báo
     BR-003: `signInWithOAuth` là redirect top-level, MSW không chặn được; story mock qua prop
     `onLoginClick`.
   - **Story phải viết theo shape nào** — `const meta = {...} satisfies Meta<typeof X>;
     export default meta;`. Nói rõ vì sao: `import/no-anonymous-default-export` đang bật, default
     export ẩn danh làm `pnpm lint` đỏ ngay file story đầu tiên.
   - **Không áp dụng khi** — component composition, `app/**/page.tsx` (`async` Server Component,
     vitest không hỗ trợ), file `*-copy.ts` chỉ chứa chuỗi tĩnh.
4. Sửa skill cũ: mục *"Vì sao ở repo này ranh giới `lib/` lại quan trọng"* — bỏ câu mô tả cấu hình
   vitest cụ thể và câu "hook và JSX do Playwright phủ", thay bằng: logic để trong `.tsx` là logic
   không ai đo được; chuẩn test/coverage và ranh giới runner nằm ở skill
   `write-unit-tests-and-storybook-stories`. Giữ nguyên phần còn lại của file.
5. Chạy cửa xanh.

## Todo List

- [x] `prettier --write CLAUDE.md`, diff chỉ có whitespace
- [x] `.gitignore`: `!.claude/skills/write-unit-tests-and-storybook-stories/` + `/storybook-static/`
- [x] Viết SKILL.md mới (< 200 dòng, tiếng Việt)
- [x] Sửa 2 câu stale ở skill cũ thành cross-reference
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
git check-ignore -v .claude/skills/write-unit-tests-and-storybook-stories/SKILL.md   # exit 1 (KHÔNG bị ignore)
git status --short | grep -q "write-unit-tests-and-storybook-stories"                # exit 0
wc -l < .claude/skills/write-unit-tests-and-storybook-stories/SKILL.md               # < 200
grep -c "vitest.config.ts chỉ chạy" .claude/skills/separate-hook-logic-from-components/SKILL.md  # 0
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck  # exit 0
```

Kiểm định tính: đọc SKILL.md mới, phải trả lời được 4 câu mà không mở file nào khác —
*sửa `hooks/use-x.ts` thì phải kèm gì?* · *`LoginHeader` có cần story không?* · *coverage 100% có
nghĩa UI đúng không?* · *story viết default export kiểu gì?*

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Quên dòng `.gitignore` → skill không vào commit, im lặng | Trung bình | Cao (deliverable #1 biến mất) | `git check-ignore` là success criteria bắt buộc, không phải kiểm tra tuỳ chọn |
| Session khác đang sửa `CLAUDE.md`, prettier đè lên | Thấp | Trung bình | Chạy prettier ở bước 1, kiểm `git diff` lại ngay trước khi commit |
| Skill mới chép lại nội dung skill cũ (vi phạm DRY) | Trung bình | Trung bình | Bảng 2 skill / 2 câu hỏi ở § Architecture là ranh giới; skill mới chỉ được *trỏ* sang skill cũ cho phần phân lớp |
| SKILL.md phình > 200 dòng | Trung bình | Thấp | Cắt phần ví dụ dài; skill là quy tắc, không phải tutorial |

## Security Considerations

Không. Phase này không đụng auth, cookie, hay biến môi trường. Skill markdown không được
chứa key, URL Supabase thật, hay đường dẫn tuyệt đối tới máy dev.

## Next Steps

Mở đường cho: mọi phase sau đều dẫn chiếu skill này làm nguồn quy tắc.
Không phase nào phụ thuộc cứng vào phase 01 — chạy song song với phase 02 được.
