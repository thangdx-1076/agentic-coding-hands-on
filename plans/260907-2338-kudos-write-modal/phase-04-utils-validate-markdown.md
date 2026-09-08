---
phase: 04
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/_utils/validate-kudo-draft.ts",
    "src/app/(public)/kudos/_utils/validate-kudo-draft.test.ts",
    "src/app/(public)/kudos/_utils/validate-kudo-images.ts",
    "src/app/(public)/kudos/_utils/validate-kudo-images.test.ts",
    "src/app/(public)/kudos/_utils/insert-markdown-marker.ts",
    "src/app/(public)/kudos/_utils/insert-markdown-marker.test.ts",
    "src/app/(public)/kudos/_utils/parse-kudo-markdown.ts",
    "src/app/(public)/kudos/_utils/parse-kudo-markdown.test.ts",
  ]
---

# Phase 04 — Logic thuần `_utils`: validate, chèn marker, parse markdown

## Context Links

- `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:39` — khuôn validate tay (`typeof` / `.trim()`), **không** zod
- `.claude/skills/separate-hook-logic-from-components/SKILL.md` § "Boundary test" — chạy được không cần React ⇒ tầng pure logic
- `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` § 100% coverage — `_utils/**/*.ts` nằm trong allowlist, thiếu test là CI đỏ ngay
- `spec/kudos-compose/technical-spec.md` § 4.4 (pseudocode BR-002/BR-003/BR-004) · `functional-spec.md` § 9
- `clarifications.md` § toolbar (bộ marker) · plan.md AD-8, AD-9

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: bốn module thuần, không React, không I/O — chỗ duy nhất định nghĩa luật hợp lệ và cú pháp marker, để client và server dùng **cùng một hàm**.

## Requirements

FR-208, FR-402, FR-403, FR-404, FR-601(một phần) · BR-002, BR-003, BR-004, BR-005, DEC-002, D001 · spec item C.1-6, E.2, F, G · TC ID-7, ID-11, ID-14, ID-16, ID-17, ID-20, ID-27..32, ID-48, ID-49, ID-50..56.

## Architecture notes

- `validate-kudo-draft.ts` — `validateKudoDraft(draft): KudoDraftErrors` với `KudoDraftErrors = Partial<Record<"recipientId"|"title"|"content"|"hashtags"|"anonymousName", "required"|"tooMany">>`. Trả **mã lỗi**, không trả chuỗi tiếng Việt: chuỗi thuộc i18n (phase 03) và hàm này chạy cả ở server. Thêm `isKudoDraftValid(draft)` cho nút `Gửi` (AD-1). Luật: 4 trường bắt buộc `.trim() !== ""`, `hashtags.length` 1..5, `anonymousName` bắt buộc khi `isAnonymous` (D001).
- `validate-kudo-images.ts` — `validateKudoImages(files): { accepted, rejected }` theo mime `image/jpeg`/`image/png`, tối đa 5 file, mỗi file ≤ `MAX_KUDO_IMAGE_BYTES = 5 * 1024 * 1024` (AD-4). Export hằng số đó để phase 06 và phase 12 cùng đọc **một** con số.
- `insert-markdown-marker.ts` — `insertMarkdownMarker(value, selectionStart, selectionEnd, kind)` → `{ value, selectionStart, selectionEnd }`. `kind`: `bold` `**x**` · `italic` `*x*` · `strike` `~~x~~` · `number` `1. ` (đầu dòng) · `link` `[x](url)` · `quote` `> ` (đầu dòng). Không chạm DOM — chỉ tính chuỗi và vị trí con trỏ mới; hook (phase 07) mới gọi `setSelectionRange`.
- `parse-kudo-markdown.ts` — `parseKudoMarkdown(text): KudoMarkdownNode[]` (cây token thuần: `text` | `bold` | `italic` | `strike` | `link` | `listItem` | `quote` | `lineBreak`). **Không** sinh HTML, **không** `dangerouslySetInnerHTML`, **không** dependency markdown; render là việc của `kudo-markdown-text.tsx` (phase 14). Marker không khớp cặp → giữ nguyên dạng text thô (không throw).

## Related Code Files

**Tạo**: 4 `.ts` + 4 `.test.ts` (xem `file_ownership`). **Không sửa** file nào đang có.

## Implementation Steps

1. Viết test trước cho từng module (RED-first theo contract của `implementer`): mỗi luật một case, kèm case biên.
2. `validate-kudo-draft.ts` + test: 4 trường rỗng → 4 mã `required` (ID-56); 6 hashtag → `tooMany` (ID-17); `isAnonymous` + tên rỗng → `required` tại `anonymousName` (D001); khoảng trắng thuần cũng là rỗng.
3. `validate-kudo-images.ts` + test: `.txt`/`.pdf` bị loại (ID-55); file thứ 6 bị loại nhưng 5 file đầu vẫn `accepted` (ID-20); file > 5 MiB bị loại; danh sách rỗng là **hợp lệ** (ảnh không bắt buộc).
4. `insert-markdown-marker.ts` + test: có bôi đen → bọc quanh vùng chọn; không bôi đen → chèn cặp marker và đặt con trỏ giữa; `number`/`quote` chèn ở đầu dòng chứa con trỏ, chèn hai lần không nhân đôi prefix.
5. `parse-kudo-markdown.ts` + test: `**a**` → node `bold`; lồng `**a *b* c**`; marker lẻ `**a` → text thô; `[x](https://…)` → node `link` (URL không phải `http(s)`/đường dẫn nội bộ thì hạ về text — không tạo link `javascript:`); `\n` → `lineBreak`; chuỗi rỗng → `[]`.
6. `pnpm exec vitest run "src/app/(public)/kudos/_utils"` rồi `pnpm test:unit:coverage` → 100% trên 4 file mới.

## Todo List

- [ ] Test viết trước code, mỗi luật một case
- [ ] `validate-kudo-draft` trả **mã lỗi**, không trả chuỗi tiếng Việt
- [ ] `MAX_KUDO_IMAGE_BYTES` export từ đúng một chỗ
- [ ] `insertMarkdownMarker` trả cả vị trí con trỏ mới, không chạm DOM
- [ ] `parseKudoMarkdown` chặn URL không phải http(s)/nội bộ
- [ ] `pnpm test:unit:coverage` 100% trên 4 file · lint · format

## Success Criteria

- `pnpm test:unit:coverage` xanh, 4 file mới đạt 100% (nhánh + dòng).
- `grep -rn "react\|useState\|document\." "src/app/(public)/kudos/_utils/validate-kudo-draft.ts" …` rỗng cho cả 4 file — không file nào import React hoặc chạm DOM.
- Không có chuỗi tiếng Việt nào trong 4 file (chuỗi ở `messages/*.json`).
- `grep -rn "dangerouslySetInnerHTML" src/` vẫn rỗng.
- Mỗi file ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Nhét chuỗi lỗi tiếng Việt vào util → trùng lặp với i18n | Cao | TB — hai nguồn sự thật cho một câu | Trả mã lỗi; Success Criteria có grep |
| Viết parser markdown "đủ dùng" bằng regex rồi rò XSS qua `[x](javascript:…)` | TB | **Cao** | Bước 5 bắt whitelist scheme; phase 14 render bằng React element, không HTML |
| Client và server tự validate riêng, lệch luật | TB | Cao — bypass ở một phía | AD-9: cùng một hàm, phase 06 và 07 đều import từ đây |
| Thêm zod cho tiện | TB | TB — dependency mới cho một form | `clarifications.md` đã chốt validate tay |
| Quên test một nhánh → coverage gate đỏ, bị quy oan cho phase khác | TB | TB | Bước 1 + bước 6 chạy trước khi báo xong |

## Security Considerations

Đây là lớp phòng thủ **thứ nhất**, không phải lớp duy nhất — phase 06 gọi lại đúng hàm này ở server vì client có thể bị qua mặt (FR-601). Bề mặt nguy hiểm nhất là parser: nó nhận nội dung do người dùng nhập và sản phẩm của nó đi ra feed công khai. Ba giới hạn cứng: chỉ sinh cây token (không HTML), whitelist scheme cho `link`, và không thêm dependency markdown nào — giữ nguyên bề mặt bảo mật hiện tại của repo.

## Next Steps

Mở khoá phase 06 (server dùng lại validate), phase 07 (hook dùng marker + validate), phase 14 (renderer dùng parser).
