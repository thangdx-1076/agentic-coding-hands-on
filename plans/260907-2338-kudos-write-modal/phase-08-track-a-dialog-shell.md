---
phase: 08
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
    "src/app/(public)/kudos/_components/kudos-compose-dialog.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-dialog.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-field.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-field.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-sunner-options.tsx",
    "src/app/(public)/kudos/_components/kudos-sunner-options.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-footer.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-footer.stories.tsx",
  ]
---

# Phase 08 — Track A: vỏ `<dialog>` + field shell + options + footer

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2 (frame `520:11602`, modal `520:11647`, mask `520:11646`)
  - Tiêu đề `I520:11647;520:9870` (`mms_A`) · Footer `I520:11647;520:9905` (`mms_H`) · `Hủy` `…;520:9906` · `Gửi` `…;520:9907`
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: ihQ26W78P2` · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`
`outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-compose.spec.ts"]` · `redCommand: pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` · `redExitCode`/`redFailure`/`redEvidence`: đọc `evidence/red-evidence.md` (phase 01)
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos-compose.spec.ts` — hợp đồng DOM, đọc thẳng file này**, không suy diễn lại. Ràng buộc trực tiếp: C02, C03, C04, C05, C08, C20, C21, C22.
- `phase-03` cấp `_shared/kudos-compose-copy.ts` (type + default) — import, **không** tự viết chuỗi
- `research/researcher-ui-conventions-report.md` § 1 (repo **không có** modal nào), § 3 (**không có** `Button`/`Input`/`cn()` dùng chung — hand-roll Tailwind), § 5 (header comment trỏ node id, `data-testid` kebab-case)
- `src/app/(public)/login/_components/login-error-alert.tsx:10-21` — khuôn duy nhất cho khối lỗi (`role="alert"`, render `null` khi không lỗi)
- `src/app/(public)/kudos/_components/kudos-filter-menu.tsx:77-125` — khuôn markup listbox cho `kudos-sunner-options`

## Overview

**Priority**: P1 · **Track A** (`momorph-ui-implementer`, `mode: section`) · **Goal**: bốn nguyên liệu dùng chung mà 4 phase Track A còn lại sẽ lắp vào — vỏ dialog nhận `children`, một field shell mang label/`*`/lỗi, một listbox Sunner, và footer 2 nút.

## Out of scope

- **Không** import bất kỳ component nào của phase 09–12 — vỏ dialog nhận `children`/slot, để 4 phase kia chạy song song.
- **Không** `useState`/`useEffect`/`showModal()`/scroll lock: lifecycle là của `use-kudos-compose-dialog` (phase 07). Component chỉ nhận `open`, `onCancel`, `registerDialog` qua props.
- **Không** gọi DAL/`fetch`/Server Action, **không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions` (coverage gate 100% sẽ đỏ).
- **Không** sửa `kudos-screen.tsx`, `kudos-client.tsx`, `page.tsx`, `messages/*.json` hay file test nào.

## Requirements

FR-201, FR-208, FR-402 · DEC-002 · spec item **A**, **H**, **H.1**, **H.2** · TC ID-2, ID-3, ID-45, ID-48, ID-56 · hợp đồng C02, C03, C04, C05, C08, C20, C22.

## Architecture notes

- `kudos-compose-dialog.tsx`: `<dialog data-testid="kudos-compose-dialog" ref={registerDialog} onCancel={onCancel}>` với 3 vùng theo screen spec § 2 — R1 tiêu đề static, R2 `children` (`overflow-y-auto`, cuộn khi dài hơn viewport), R3 `footer` slot static. Nền tối là `::backdrop` (Tailwind `backdrop:` variant), **không** dựng div mask riêng — `520:11646` là mask của trang phía dưới, `<dialog>` native đã cho sẵn thứ tương đương. `aria-label` lấy từ copy.
- `kudos-compose-field.tsx`: label + `*` khi `required` + `children` + khối lỗi. **Không có design data cho state lỗi** (frame `5c7PkAibyD` in_progress, không node) → theo `login-error-alert.tsx`: `<p role="alert">` chữ đỏ dưới field, cộng `aria-invalid` + `aria-describedby` trên control (repo chưa có tiền lệ hai attribute này — phase này là chỗ đặt tiền lệ, ghi rõ trong header comment). Viền đỏ bằng một class truyền xuống, không đoán mã màu mới: dùng đúng đỏ đã có trong `login-error-alert.tsx`.
- `kudos-sunner-options.tsx`: `role="listbox"` + `role="option"`, mỗi option avatar + `full_name`; trạng thái `loading`/`empty` bằng chuỗi từ copy. **Không có design data** (frame `QIMJNgFb8K`/`zJzaC9GgXt` không có node style) → lấy đúng hình dạng dropdown của `kudos-filter-menu.tsx`, **không đoán số đo**.
- `kudos-compose-footer.tsx`: `Hủy` (text+icon, luôn enabled) và `Gửi` (icon_text, nền vàng). `Gửi` nhận `aria-disabled` — **không** dùng attribute `disabled` (AD-1), và có nhánh `submitting` (spinner + chuỗi `submitting`).

## Implementation Steps

1. Đọc C02/C03/C04/C05/C08/C20/C22 trong `tests/e2e/kudos-compose.spec.ts`, lấy đúng bộ `data-testid` từ đó.
2. `get_frame(ihQ26W78P2)` cho số đo thật của modal, tiêu đề, footer; nội dung text lấy từ copy của phase 03.
3. `kudos-compose-dialog.tsx` — 3 vùng + `::backdrop`, `children` + prop `footer`.
4. `kudos-compose-field.tsx` — label/`*`/error/`aria-invalid`/`aria-describedby`.
5. `kudos-sunner-options.tsx` — listbox + 3 trạng thái (có kết quả / đang tìm / rỗng).
6. `kudos-compose-footer.tsx` — 2 nút, `aria-disabled`, nhánh `submitting`.
7. 4 `.stories.tsx`: dialog (`Open`, `LongBody` để thấy cuộn), field (`Default`, `Required`, `WithError`), options (`WithResults`, `Loading`, `Empty`), footer (`Disabled`, `Enabled`, `Submitting`). Dữ liệu story **chép từ frame**, không bịa.
8. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc hợp đồng trước khi viết dòng nào
- [ ] Vỏ dialog nhận `children`, **không** import component phase 09–12
- [ ] Nền tối dùng `::backdrop`, không div mask
- [ ] `Gửi` dùng `aria-disabled`, không `disabled` (AD-1)
- [ ] Field shell có `aria-invalid` + `aria-describedby` + `role="alert"`
- [ ] Options/error state ghi rõ "không có design data, theo pattern repo" trong header comment
- [ ] 4 file story, mỗi biến thể ở bước 7
- [ ] 5 lệnh `plannedChecks` xanh · mỗi file ≤200 dòng

## Success Criteria

- `pnpm build-storybook` xanh, từng biến thể render đối chiếu được với `momorph/frame-image.png`.
- `grep -rn "useState\|useEffect\|fetch(\|createClient\|showModal" _components/kudos-compose-{dialog,field,footer}.tsx kudos-sunner-options.tsx` rỗng.
- `wc -l` mọi file mới ≤200.
- Không component nào chứa chuỗi tiếng Việt cứng — tất cả đi qua props/copy: `grep -n "Hủy\|Gửi\|Tìm kiếm"` trong `.tsx` (trừ `.stories.tsx`) rỗng.
- `pnpm typecheck` xanh với union literal cho `variant`/`state`, không phải `string`.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Vỏ dialog import trực tiếp các field → phase 09–12 không chạy song song được | Cao | Cao — Track A biến thành chuỗi tuần tự | `children`/slot ghi trong Goal + Out of scope |
| Tự dựng portal/focus-trap/scroll-lock vì "modal phải có" | Cao | TB — trùng việc `<dialog>` đã làm, trùng phase 07 | Out of scope cấm; clarifications đã chốt `<dialog>` native |
| Đoán số đo cho dropdown gợi ý và state lỗi | Cao | TB — bịa design | § Architecture bắt theo pattern repo và **nói rõ trong header comment** |
| Dùng `disabled` cho `Gửi` cho "đúng nghĩa" | Cao | Cao — C20/ID-56 không bao giờ xanh | AD-1 + Todo + hợp đồng assert thẳng attribute |
| Hard-code chuỗi tiếng Việt trong component | TB | TB — phá cơ chế i18n Server-Component-only | Success Criteria có grep |

## Security Considerations

Thuần trình bày, không I/O. Một điểm: khối lỗi render chuỗi **từ copy**, không bao giờ render message thô do máy chủ trả; và mọi text người dùng nhập (tên ẩn danh, nội dung) render dạng text, không `dangerouslySetInnerHTML`.

## Next Steps

Mở khoá phase 09, 10, 11, 12 — cả bốn tiêu thụ `kudos-compose-field` và (với 09/10) `kudos-sunner-options`.
