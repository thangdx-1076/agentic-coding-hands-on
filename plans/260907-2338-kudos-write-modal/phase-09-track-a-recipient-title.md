---
phase: 09
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
    "src/app/(public)/kudos/_components/kudos-recipient-field.tsx",
    "src/app/(public)/kudos/_components/kudos-recipient-field.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-title-field.tsx",
    "src/app/(public)/kudos/_components/kudos-title-field.stories.tsx",
  ]
---

# Phase 09 — Track A: trường Người nhận + trường Danh hiệu

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
  - `mms_B_Chọn người nhận` `I520:11647;520:9871` — title `…;520:9872` (`Người nhận` + `*`, bold 22px) · search `…;520:9873` (placeholder `Tìm kiếm`, viền `#998C5F`, radius 8px, cao 56px, có icon mũi tên dropdown)
  - **Section `Danh hiệu` `I520:11647;1688:10448` (Frame 552) — có node `*`, KHÔNG có row nào trong spec CSV và KHÔNG có test case nào trong 57 case** (clarifications § Hai node). Label `Danh hiệu`, placeholder `Dành tặng một danh hiệu cho đồng đội`, hint 2 dòng.
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: ihQ26W78P2` · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on`
`outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-compose.spec.ts"]` · `redCommand: pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos-compose.spec.ts`** — ràng buộc trực tiếp: C04, C05, **C06**, C20, C21, C22.
- `phase-08` cấp `kudos-compose-field.tsx` (label/`*`/lỗi) và `kudos-sunner-options.tsx` (listbox) — **import, không dựng lại**
- `phase-03` cấp copy: `recipientLabel`, `recipientPlaceholder`, `recipientEmpty`, `recipientLoading`, `titleLabel`, `titlePlaceholder`, `titleHintExample`, `titleHintUsage`
- `src/app/(public)/kudos/_components/kudos-sunner-search.tsx` — pattern ô tìm kiếm đã có trong repo (dùng cho phần không có design data)

## Overview

**Priority**: P1 · **Track A** (`momorph-ui-implementer`, `mode: section`) · **Goal**: hai trường bắt buộc đầu tiên, thuần props: một combobox có dropdown gợi ý và một input text kèm 2 dòng hint.

## Out of scope

- **Không** debounce, **không** gọi Server Action, **không** `useState` cho query — tất cả ở `use-sunner-suggest` (phase 07); component nhận `query`, `options`, `isLoading`, `isOpen`, `onQueryChange`, `onSelect`.
- **Không** dựng lại listbox hay khối lỗi — dùng của phase 08.
- **Không** tạo file trong `_utils`/`_hooks`/`_actions`; **không** sửa file của phase khác.

## Requirements

FR-202, FR-203, FR-402 · US001 · spec item **B**, **B.1**, **B.2** + **node `Danh hiệu` không số** · TC ID-4, ID-7, ID-25, ID-26, ID-50 (Người nhận); `Danh hiệu` **không có TC** — hợp đồng C06 là nguồn duy nhất, cố ý đi xa hơn CSV.

## Architecture notes

- `kudos-recipient-field.tsx`: `role="combobox"` + `aria-expanded` + `aria-controls` trỏ listbox của phase 08, `aria-autocomplete="list"`. Hiển thị Sunner đã chọn: tên (và avatar nếu design vẽ) ngay trong ô, kèm cách bỏ chọn. `data-testid="kudos-recipient-field"` / `kudos-recipient-input`.
- `kudos-title-field.tsx`: input text bọc trong `kudos-compose-field` (`required`), cộng **2 dòng hint** render thành 2 dòng riêng (không nối một dòng — node design là 2 dòng, C06 assert cả hai). `data-testid="kudos-title-field"` / `kudos-title-input`.
- Cả hai **không** giữ state riêng nào ngoài thứ `<input>` tự có; giá trị và lỗi đến từ props.

## Implementation Steps

1. Đọc C04/C05/C06/C20/C21/C22, lấy `data-testid` từ hợp đồng.
2. `get_frame(ihQ26W78P2)` lấy số đo thật của `520:9871` (section Người nhận) **và** `1688:10448` (section Danh hiệu — node này không có trong CSV nên phải đọc từ frame).
3. `kudos-recipient-field.tsx` — ô + icon mũi tên + slot dropdown; ARIA combobox theo § Architecture.
4. `kudos-title-field.tsx` — input + 2 dòng hint, chuỗi từ copy.
5. 2 `.stories.tsx`: recipient (`Empty`, `Typing` + options, `Loading`, `NoResults`, `Selected`, `WithError`), title (`Empty`, `Filled`, `WithError`).
6. `plannedChecks` 5 lệnh.

## Todo List

- [ ] Đọc hợp đồng C06 trước — `Danh hiệu` là trường bắt buộc **thứ 4**, có `*`
- [ ] Số đo section `Danh hiệu` đọc từ frame `1688:10448`, không suy từ section khác
- [ ] Hint render **2 dòng**, nguyên văn
- [ ] Import field shell + listbox của phase 08, không dựng lại
- [ ] ARIA combobox đầy đủ (`aria-expanded`/`aria-controls`/`aria-autocomplete`)
- [ ] Không `useState`/`useEffect`/gọi action
- [ ] 2 story file, đủ biến thể bước 5 · 5 lệnh checks xanh · file ≤200 dòng

## Success Criteria

- Storybook xanh; biến thể `Selected`/`NoResults` render đúng, đối chiếu `momorph/frame-image.png`.
- C06 có đủ DOM để xanh về sau: label có `*`, placeholder đúng, **2** element hint đúng nguyên văn.
- `grep -rn "useState\|useEffect\|fetch(\|searchSunners" kudos-recipient-field.tsx kudos-title-field.tsx` rỗng.
- Không chuỗi tiếng Việt cứng trong `.tsx` (trừ story).
- `wc -l` ≤200 mỗi file.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Bỏ qua `Danh hiệu` vì "CSV không có, TC không có" | **Cao** | **Cao** — thiếu 1/4 trường bắt buộc, C06/C20/C22 đỏ vĩnh viễn | clarifications § Hai node + C06 + Todo dòng đầu |
| Nối 2 dòng hint thành 1 | Cao | TB — C06 đỏ | Todo + Success Criteria đếm 2 element |
| Tự debounce/gọi action trong component | TB | Cao — trùng phase 07, lệch AD-6 | Out of scope; grep ở Success Criteria |
| Dựng dropdown riêng thay vì dùng `kudos-sunner-options` | TB | TB — hai listbox trôi lệch, vỡ DRY | Out of scope; phase 08 là chủ sở hữu |
| Cho phép gõ tự do rồi coi là recipient hợp lệ | TB | Cao — `receiver_id` sai/không tồn tại, INSERT vỡ FK | Chỉ `onSelect` từ options mới set `recipientId`; text tự do chỉ là `query` |

## Security Considerations

Ô Người nhận hiển thị `full_name` từ view `profile_cards` (3 cột, `authenticated` mới đọc được) — không render thêm trường nào khác dù props có mang. `recipientId` chỉ được set qua `onSelect`, không bao giờ suy từ chuỗi người dùng gõ; máy chủ vẫn kiểm lại FK ở phase 06.

## Next Steps

Không mở khoá phase nào khác. Phase 13 lắp hai trường này vào form.
