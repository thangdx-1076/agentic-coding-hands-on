---
phase: 10
feature: F009
track: A
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.25h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-content-field.tsx",
    "src/app/(public)/kudos/_components/kudos-content-field.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-format-toolbar.tsx",
    "src/app/(public)/kudos/_components/kudos-format-toolbar.stories.tsx",
  ]
---

# Phase 10 — Track A: toolbar định dạng + textarea Nội dung

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
  - `mms_C_Chức năng` `I520:11647;520:9877` — 6 nút: bold `…;520:9881` · italic `…;662:11119` · stroke `…;662:11213` · number `…;662:10376` · link `…;662:10507` · quote `…;662:10647`
  - **Link `Tiêu chuẩn cộng đồng` `I520:11647;3053:11619`** — 16px/700, màu `#E46060`, canh **phải**, cùng hàng toolbar cạnh nút quote; **không có row nào trong spec CSV** (clarifications § Hai node)
  - `mms_D_text filed` `I520:11647;520:9886` (placeholder `Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!`) · `mms_D.1_Gợi ý` `…;520:9887`
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: ihQ26W78P2` · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`
`outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-compose.spec.ts"]` · `redCommand: pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos-compose.spec.ts`** — ràng buộc trực tiếp: C04, C05, **C09**, **C10**, **C11**, C20, C27.
- `phase-08` cấp `kudos-compose-field.tsx` + `kudos-sunner-options.tsx` (dùng cho gợi ý `@mention`) — import, không dựng lại
- `phase-04` `insertMarkdownMarker` và `phase-07` `applyFormat`/`use-sunner-suggest` — component **chỉ** gọi callback, không tự tính chuỗi
- `phase-03` cấp copy: `contentLabel`, `contentPlaceholder`, `contentHint`, `standardsLink`, `toolbar.{bold,italic,strike,number,link,quote}`
- `src/constants/routes.ts` — `ROUTES.STANDARDS`

## Overview

**Priority**: P1 · **Track A** (`momorph-ui-implementer`, `mode: section`) · **Goal**: một `<textarea>` thường với hàng toolbar 6 nút và link `Tiêu chuẩn cộng đồng`, cộng một dòng hint — thuần props, không state.

## Out of scope

- **Không** rich-text / `contentEditable` / thư viện editor. `textarea` là đúng thứ design vẽ; định dạng hiện ở thẻ kudo sau khi gửi (BR-005, clarifications § toolbar). Lệch có ý thức so với ID-27..32 (đều Medium).
- **Không** bộ đếm ký tự: cột `maxLength` của D.1 rỗng và frame chỉ vẽ một dòng gợi ý — dựng counter là tự phát minh (C11 assert **không** có counter).
- **Không** tự tính chuỗi markdown, **không** `setSelectionRange`, **không** debounce `@mention` — gọi callback từ props.
- **Không** tạo file trong `_utils`/`_hooks`/`_actions`; không sửa file phase khác.

## Requirements

FR-204, FR-402 · BR-005 · spec item **C**, **C.1–C.6**, **D**, **D.1** + **node link `Tiêu chuẩn cộng đồng` không số** · TC ID-5, ID-11, ID-27..33, ID-51 · hợp đồng C09, C10, C11, C27.

## Architecture notes

- `kudos-format-toolbar.tsx`: 6 `<button type="button">` (mỗi nút icon từ frame, `aria-label` từ copy, `data-testid="kudos-format-<kind>"`), rồi **link canh phải** `<a href={ROUTES.STANDARDS}>` — cùng tab, **không** `target="_blank"` (clarifications: không có design cho target mới). `onFormat(kind)` là prop duy nhất.
- `kudos-content-field.tsx`: bọc trong `kudos-compose-field` (`required`); `<textarea data-testid="kudos-content-input">` với `registerTextarea` (**ref callback** từ phase 07, không `RefObject`), `value`/`onChange` từ props; dưới nó dòng hint `data-testid="kudos-content-hint"`; slot cho `kudos-sunner-options` khi `mentionOpen` (ID-33/C27).
- `type: "button"` cho **mọi** nút toolbar — trong một `<form>`, thiếu nó là submit ngoài ý muốn.

## Implementation Steps

1. Đọc C09/C10/C11/C27, lấy `data-testid` từ hợp đồng.
2. `get_frame(ihQ26W78P2)` lấy icon + số đo 6 nút và node link `3053:11619` (node này không có trong CSV — phải đọc từ frame).
3. `kudos-format-toolbar.tsx` — 6 nút + link phải; icon inline `currentColor` như `kudos-compose-pill.tsx` đang làm (dùng một lần thì để local, không tạo `icons/`).
4. `kudos-content-field.tsx` — textarea + hint + slot mention.
5. 2 `.stories.tsx`: toolbar (`Default`, `Pressed` nếu frame có state đó — nếu không thì **không** bịa), content (`Empty`, `Filled`, `WithError`, `MentionOpen`).
6. `plannedChecks` 5 lệnh.

## Todo List

- [ ] `textarea` thường — **không** contentEditable/editor lib
- [ ] **Không** bộ đếm ký tự (C11 assert vắng mặt)
- [ ] Link `Tiêu chuẩn cộng đồng` → `ROUTES.STANDARDS`, cùng tab, canh phải
- [ ] 6 nút `type="button"`, `aria-label` từ copy, `data-testid` theo hợp đồng
- [ ] `registerTextarea` là ref callback từ props, không `useRef` cục bộ
- [ ] Dòng hint nguyên văn, kể cả dấu ngoặc cong `“ ”`
- [ ] 2 story file · 5 lệnh checks xanh · file ≤200 dòng

## Success Criteria

- Storybook xanh, toolbar khớp frame về thứ tự icon và vị trí link.
- `grep -rn "contentEditable\|dangerouslySetInnerHTML\|insertMarkdownMarker\|setSelectionRange" kudos-content-field.tsx kudos-format-toolbar.tsx` rỗng.
- Đúng **6** `<button>` trong toolbar và đúng **1** `<a>`; không nút nào thiếu `type="button"`.
- Không element nào mang vai trò counter ký tự.
- `wc -l` ≤200 mỗi file.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Kéo một editor rich-text vào cho "đúng ID-27..32" | Cao | Cao — thêm dependency, đẩy HTML vào cột feed đang đọc plain text | Out of scope + clarifications § toolbar đã phân xử |
| Dựng counter ký tự vì tên spec D.1 có chữ "bộ đếm" | Cao | TB — C11 đỏ, và là tính năng bịa | Out of scope; C11 assert vắng mặt |
| Bỏ sót link `Tiêu chuẩn cộng đồng` (không có row CSV) | Cao | TB — C10 đỏ | MoMorph refs ghi node id; Todo |
| Nút toolbar thiếu `type="button"` → submit form khi bấm B | Cao | Cao — gửi kudo ngoài ý muốn | Todo + Success Criteria đếm |
| Tự tính chuỗi marker trong component | TB | TB — hai nguồn sự thật với phase 04 | grep ở Success Criteria |

## Security Considerations

Textarea nhận nội dung do người dùng nhập và giá trị đó đi ra feed công khai. Ở phase này giữ đúng hai giới hạn: value là chuỗi thuần (không HTML), và tuyệt đối không `dangerouslySetInnerHTML` — việc hiển thị định dạng là của phase 14, qua React element.

## Next Steps

Không mở khoá phase nào khác. Phase 13 lắp editor vào form; phase 14 làm phần hiển thị định dạng trên thẻ.
