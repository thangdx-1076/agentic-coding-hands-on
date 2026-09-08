---
phase: 11
feature: F009
track: A
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-hashtag-field.tsx",
    "src/app/(public)/kudos/_components/kudos-hashtag-field.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-hashtag-picker.tsx",
    "src/app/(public)/kudos/_components/kudos-hashtag-picker.stories.tsx",
  ]
---

# Phase 11 — Track A: trường Hashtag + dropdown picker

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
  - `mms_E_Frame 536` `I520:11647;520:9890` — label `mms_E.1_Title` `…;520:9891` (`Hashtag` + `*`) · `mms_E.2_Tag Group` `…;662:8595` (nút `+ Hashtag`, ghi chú `Tối đa 5`, chip đã thêm)
- **Dropdown list hashtag (CÓ design data): https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x** (`1002:13013`) — có sẵn item `mms_A/B/C_Hashtag đã chọn` và `mms_D_Hashtag chưa chọn`
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: ihQ26W78P2` *(dropdown: `p9zO-c4a4x`)* · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`
`outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-compose.spec.ts"]` · `redCommand: pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos-compose.spec.ts`** — ràng buộc trực tiếp: C04, C05, **C12**, **C13**, **C14**, C20, C22.
- `phase-08` cấp `kudos-compose-field.tsx` — import, không dựng lại
- `phase-03` cấp copy: `hashtagLabel`, `hashtagAdd`, `limitNote`, `hashtagPickerLabel`, `hashtagRemove`, `errorHashtagMax`
- `src/app/(public)/kudos/_components/kudos-filter-menu.tsx:77-125` + `src/hooks/use-menu-keyboard-nav.ts` — hạ tầng bàn phím/ARIA cho dropdown đã có sẵn trong repo, **dùng lại**
- `src/app/(public)/kudos/_components/kudos-hashtag-list.tsx` — chip hashtag của F007, đối chiếu style chip (**không sửa file đó**)

## Overview

**Priority**: P1 · **Track A** (`momorph-ui-implementer`, `mode: section`) · **Goal**: trường Hashtag bắt buộc — nút `+ Hashtag`, dropdown gợi ý lấy từ vocabulary trang `/kudos` đã tính sẵn, chip xoá được, chặn ở 5.

## Out of scope

- **Không** query hashtag mới: vocabulary đến từ prop (trang `/kudos` đã tính, `src/dal/kudos.ts:132`) — clarifications § hashtag, và đó là lý do không có bảng vocabulary nào.
- **Không** giữ state `hashtags` trong component; `onAdd`/`onRemove` là props (phase 07 chặn ở 5 và set `errors`).
- **Không** sửa `kudos-hashtag-list.tsx` (F007) dù cùng hình dạng chip: hai ngữ cảnh khác nhau (một cái là filter đọc, một cái là input xoá được), gộp lại sẽ kéo `onSelectHashtag` của feed vào form.
- **Không** tạo file trong `_utils`/`_hooks`/`_actions`.

## Requirements

FR-205, FR-402, FR-403 · BR-002, BR-001 (chip là `hashtags[1..5]`, Danh hiệu là `[0]`) · spec item **E**, **E.1**, **E.2** + frame `p9zO-c4a4x` · TC ID-14, ID-15, ID-16, ID-17, ID-34, ID-35, ID-36, ID-52, ID-53 · hợp đồng C12, C13, C14.

## Architecture notes

- `kudos-hashtag-picker.tsx`: dropdown theo frame `p9zO-c4a4x` — hai trạng thái item (**đã chọn** / **chưa chọn**) có sẵn node data nên lấy đúng số đo từ đó; cộng ô nhập tay để thêm tag free-text (US002 "hoặc nhập tay"). Bàn phím/ARIA dùng `use-menu-keyboard-nav` — **không** viết lại roving tabindex.
- `kudos-hashtag-field.tsx`: bọc trong `kudos-compose-field` (`required`); hàng chip (`data-testid="kudos-hashtag-chip"`, mỗi chip một nút `x` `aria-label` từ copy) + nút `+ Hashtag` (`data-testid="kudos-hashtag-add"`) + ghi chú `Tối đa 5`. Khi đã 5 chip: nút **vẫn hiện** nhưng `aria-disabled="true"` và bấm vào hiện `errorHashtagMax` — ID-16 nói "vẫn hiển thị hoặc disabled (theo spec)", còn C14 đòi **thông báo** phải xuất hiện, nên ẩn nút là không thoả được C14.
- Chip **không** phải `<span>`: nút `x` là `<button type="button">`.

## Implementation Steps

1. Đọc C12/C13/C14, lấy `data-testid` từ hợp đồng.
2. `get_frame(p9zO-c4a4x)` cho dropdown và `get_frame(ihQ26W78P2)` cho section `520:9890`.
3. `kudos-hashtag-picker.tsx` — list + hai trạng thái item + ô nhập tay; nối `use-menu-keyboard-nav`.
4. `kudos-hashtag-field.tsx` — chip row + nút thêm + ghi chú + slot picker.
5. 2 `.stories.tsx`: picker (`Default`, `SomeSelected`, `EmptyVocabulary`), field (`NoChips`, `ThreeChips`, `FiveChips` + nút `aria-disabled`, `WithError`, `LimitMessage`).
6. `plannedChecks` 5 lệnh.

## Todo List

- [ ] Dropdown lấy số đo từ frame `p9zO-c4a4x` (frame này **có** node data)
- [ ] Đủ 5 chip → nút `aria-disabled` + hiện `Tối đa 5 hashtag` (không ẩn nút)
- [ ] Nút `x` trên chip là `<button type="button">` với `aria-label`
- [ ] Vocabulary đến từ prop, không query
- [ ] Dùng lại `use-menu-keyboard-nav`, không viết lại roving tabindex
- [ ] Không `useState` cho danh sách chip
- [ ] 2 story file · 5 lệnh checks xanh · file ≤200 dòng

## Success Criteria

- Storybook xanh; `FiveChips` cho thấy nút `+ Hashtag` `aria-disabled` và thông báo giới hạn.
- `grep -rn "useState\|fetch(\|getKudosBoard" kudos-hashtag-field.tsx kudos-hashtag-picker.tsx` rỗng.
- `git diff --stat src/app/\(public\)/kudos/_components/kudos-hashtag-list.tsx` rỗng.
- Mỗi chip có đúng một nút xoá có thể focus bằng bàn phím.
- `wc -l` ≤200 mỗi file.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Ẩn nút `+ Hashtag` khi đủ 5 (copy hành vi của `+ Image`) | Cao | Cao — C14 không thể xanh vì không còn gì để bấm | § Architecture giải thích; Todo ghi rõ |
| Sửa `kudos-hashtag-list.tsx` để "dùng chung chip" | TB | TB — kéo phụ thuộc filter của feed vào form | Out of scope + `git diff --stat` |
| Tự query danh sách hashtag | TB | TB — thêm một nguồn dữ liệu trùng | Out of scope; vocabulary qua prop |
| Viết lại điều hướng bàn phím cho dropdown | TB | TB — trùng `use-menu-keyboard-nav`, a11y kém hơn | Context Links + Todo |
| Cho thêm chip trùng tên | TB | Thấp — mảng `hashtags` có phần tử lặp | Phase 07 dedupe; component chỉ gọi `onAdd` |

## Security Considerations

Hashtag là free-text (không bảng vocabulary để validate) nên nó là dữ liệu người dùng: render dạng text, không HTML. Giới hạn 5 ở đây chỉ là UX — phase 06 kiểm lại `hashtags.length` phía máy chủ.

## Next Steps

Không mở khoá phase nào khác. Phase 13 lắp trường này vào form.
