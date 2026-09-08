---
phase: 12
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
    "src/app/(public)/kudos/_components/kudos-image-field.tsx",
    "src/app/(public)/kudos/_components/kudos-image-field.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-anonymous-field.tsx",
    "src/app/(public)/kudos/_components/kudos-anonymous-field.stories.tsx",
  ]
---

# Phase 12 — Track A: khung Image + checkbox gửi ẩn danh

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
  - `mms_F_Frame 537` `I520:11647;520:9896` — label `mms_F.1_Title` `…;520:9897` (`Image`) · 3 thumbnail mẫu `…;662:9197`, `…;662:9393`, `…;662:9439` · nút `mms_F.5_Frame 542` `…;662:9132` (`+ Image`, ghi chú `Tối đa 5`)
  - `mms_G_Gửi ẩn danh` `I520:11647;520:14099` — nhãn `Gửi lời cám ơn và ghi nhận ẩn danh`
  - **State "đã tick" không được vẽ trong frame này**; frame riêng `p9vFVBE_tc "Ẩn danh"` đang in_progress, **không có node data** (clarifications § Frame phụ trợ)
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: ihQ26W78P2` · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`
`outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-compose.spec.ts"]` · `redCommand: pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos-compose.spec.ts`** — ràng buộc trực tiếp: C04, C05, **C15**, **C16**, **C17**, **C18**, **C19**.
- `phase-08` cấp `kudos-compose-field.tsx` — import, không dựng lại
- `phase-03` cấp copy: `imageLabel`, `imageAdd`, `imageRemove`, `limitNote`, `errorImageInvalid`, `anonymousLabel`, `anonymousNameLabel`, `anonymousNamePlaceholder`, `errorRequired`
- `src/app/(public)/kudos/_components/kudos-image-strip.tsx` — dải ảnh của F007, đối chiếu style thumbnail (**không sửa file đó**)
- `phase-04` `MAX_KUDO_IMAGE_BYTES` — hiển thị/áp giới hạn dung lượng lấy từ đúng hằng số đó

## Overview

**Priority**: P1 · **Track A** (`momorph-ui-implementer`, `mode: section`) · **Goal**: khung ảnh có `<input type="file">` thật để e2e lái được, cộng checkbox ẩn danh bật/tắt một ô tên — cả hai thuần props.

## Out of scope

- **Không** upload: component chỉ gọi `onAddFiles(FileList)`; upload là phase 06. **Không** validate mime/size tại đây — gọi hàm phase 04 qua callback của phase 07.
- **Không** lightbox/crop/reorder ảnh (không có design).
- **Không** giữ state `images`/`isAnonymous` trong component.
- **Không** tạo file trong `_utils`/`_hooks`/`_actions`; không sửa `kudos-image-strip.tsx`.

## Requirements

FR-206, FR-207, FR-402, FR-404 · BR-003, BR-004, DEC-001, D001 · spec item **F**, **F.1**, **F.2–F.4**, **F.5**, **G** · TC ID-6, ID-18..24, ID-37, ID-38, ID-39, ID-40, ID-41, ID-42, ID-43, ID-44, ID-54, ID-55 · hợp đồng C15, C16, C17, C18, C19.

## Architecture notes

- `kudos-image-field.tsx`: `<input type="file" accept="image/jpeg,image/png" multiple hidden data-testid="kudos-image-input">` — **phải là input file thật trong DOM** vì `setInputFiles` của Playwright là cách duy nhất C15/C16/C17 lái được; nút `+ Image` (`data-testid="kudos-image-add"`) là `<button type="button">` kích hoạt input đó. Thumbnail dùng `next/image` với `width`/`height` từ frame, mỗi cái một nút `x`. Đủ 5 ảnh → nút `+ Image` **ẩn** (BR-003, ID-38/ID-54 nói thẳng "ẩn"; khác hẳn Hashtag ở phase 11, và khác là có chủ ý). Lỗi định dạng hiện qua khối lỗi của `kudos-compose-field`.
- Preview thumbnail từ `File` chưa upload: dùng `URL.createObjectURL` — đây là một `useEffect` **duy nhất được phép** ở phase này, kèm `revokeObjectURL` khi unmount/xoá ảnh, vì không cách nào khác để hiện ảnh cục bộ. Nếu prop đã mang sẵn `previewUrl` do phase 07 tạo thì component **không** tự tạo (ưu tiên nhận qua props).
- `kudos-anonymous-field.tsx`: `<input type="checkbox" data-testid="kudos-anonymous-checkbox">` + nhãn nguyên văn; khi `checked` render thêm ô tên (`data-testid="kudos-anonymous-name-input"`) bọc trong `kudos-compose-field` với `required` (D001). Khi bỏ tick, ô **biến mất khỏi DOM** (ID-44/C18 assert vắng mặt, không phải `hidden`). **Không có design data** cho state đã tick → dùng đúng style field của phase 08, ghi rõ trong header comment.

## Implementation Steps

1. Đọc C15/C16/C17/C18/C19, lấy `data-testid` từ hợp đồng.
2. `get_frame(ihQ26W78P2)` lấy số đo thumbnail `662:9197/9393/9439`, nút `662:9132`, checkbox `520:14099`.
3. `kudos-image-field.tsx` — input file ẩn + nút + dải thumbnail + nút xoá; ẩn nút khi đủ 5.
4. `kudos-anonymous-field.tsx` — checkbox + nhãn + ô tên có điều kiện.
5. 2 `.stories.tsx`: image (`Empty`, `ThreeImages`, `FiveImages` nút đã ẩn, `InvalidFormatError`), anonymous (`Unchecked`, `Checked`, `CheckedWithError`).
6. `plannedChecks` 5 lệnh.

## Todo List

- [ ] `<input type="file">` **thật** trong DOM (Playwright `setInputFiles` cần nó)
- [ ] `accept="image/jpeg,image/png"` + `multiple`
- [ ] Đủ 5 ảnh → nút `+ Image` **ẩn** (khác Hashtag — có chủ ý)
- [ ] `revokeObjectURL` khi xoá ảnh/unmount nếu component tự tạo preview
- [ ] Bỏ tick ẩn danh → ô tên **rời khỏi DOM**, không chỉ `hidden`
- [ ] Ô tên ẩn danh mang `required` (D001)
- [ ] Không upload, không validate mime tại component
- [ ] 2 story file · 5 lệnh checks xanh · file ≤200 dòng

## Success Criteria

- Storybook xanh; `FiveImages` cho thấy nút `+ Image` đã ẩn, `CheckedWithError` cho thấy lỗi tại ô tên.
- `grep -rn "storage\.from\|\.upload(\|image/jpeg" kudos-image-field.tsx` chỉ còn `accept="image/jpeg,image/png"` — không upload, không tự validate mime.
- `git diff --stat src/app/\(public\)/kudos/_components/kudos-image-strip.tsx` rỗng.
- Có đúng một `<input type="file">` và nó nhận được `setInputFiles`.
- `wc -l` ≤200 mỗi file.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Dùng nút giả/drag-drop mà không có `<input type="file">` | Cao | **Cao** — C15/C16/C17 không thể lái, 11 TC ảnh mất trắng | § Architecture + Todo dòng đầu |
| Ẩn nút `+ Image` sai điều kiện, hoặc không hiện lại khi xoá ảnh | TB | TB — C16 đỏ | Story `FiveImages` + hợp đồng C16 |
| `createObjectURL` không revoke → rò bộ nhớ khi thêm/xoá nhiều lần | TB | Thấp | Todo; ưu tiên nhận `previewUrl` qua props |
| Ô tên ẩn danh chỉ `hidden` thay vì rời DOM | TB | TB — C18 đỏ | Todo + hợp đồng assert vắng mặt |
| Tự validate mime/size trong component | TB | TB — hai nguồn sự thật với phase 04 | grep ở Success Criteria |
| `next/image` từ chối host Storage | TB | TB — thumbnail vỡ ở phase 13/15 | Preview là blob URL nên không ảnh hưởng; nếu cần host thì **báo BLOCKED**, đừng mở `remotePatterns: **` |

## Security Considerations

Ô tên ẩn danh là dữ liệu người dùng và sẽ **hiển thị công khai thay cho tên thật** trên feed — render dạng text, không HTML, và không bao giờ tự điền tên thật của người gửi vào đó làm giá trị mặc định (đúng nghĩa ẩn danh). Input file có `accept` nhưng `accept` là gợi ý cho hộp thoại, không phải kiểm tra: phase 04 lọc ở client và phase 06 lọc lại ở server.

## Next Steps

Không mở khoá phase nào khác. Phase 13 lắp hai trường này vào form.
