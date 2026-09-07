---
phase: 09
feature: F007
track: A
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.25h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-highlight-carousel.tsx",
    "src/app/(public)/kudos/_components/kudos-highlight-carousel.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-carousel-nav.tsx",
    "src/app/(public)/kudos/_components/kudos-carousel-nav.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-slide-counter.tsx",
    "src/app/(public)/kudos/_components/kudos-slide-counter.stories.tsx",
  ]
---

# Phase 09 — Track A: carousel HIGHLIGHT KUDOS (vùng B)

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_B.2_HIGHLIGHT KUDOS` `2940:13461` · `mms_B.2.3_content` `2940:13463`
  - Cặp nút cạnh thẻ: `mms_B.2.1_Button lùi` `2940:13470` · `mms_B.2.2_Button tiến` `2940:13468`
  - Cặp nút cạnh số trang: `mms_B.5_slide` `2940:13471` → `B.5.1` `2940:13472` · `B.5.2_số trang` `2940:13473` · `B.5.3` `2940:13474`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts`** — ràng buộc trực tiếp: C07 *(empty state)*, C11, C12, C14 *(reset về slide 1)*
- `phase-07` cấp `KudosCard` với `variant="highlight"` — import, **không** dựng thẻ mới
- `phase-06` cấp `useCarouselIndex` — import, **không** tự giữ `index`
- `spec/kudosliveboard/technical-spec.md` § 4.3 SM-001

## Overview

**Priority**: P0 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Carousel 5 thẻ nổi bật — thẻ giữa rõ, hai bên mờ — với **hai** cặp nút điều hướng và một chỉ số trang cùng đọc một state.

## Out of scope

- **Không** tự viết logic index/disable — `useCarouselIndex` của phase 06 là nguồn duy nhất (BR-002).
- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions`.
- **Không** tự sắp xếp hay cắt top-5: `items` nhận qua props đã được DAL sắp sẵn theo `heart_count DESC` (BR-001).
- **Không** autoplay, không swipe gesture, không thư viện carousel ngoài — design không mô tả cái nào.
- **Không** sửa `kudos-card.tsx` (phase 07 sở hữu), `kudos-screen.tsx`, `page.tsx`, hay file test.

## Key Insights

- **Hai cặp nút, một state.** Design vẽ nút lùi/tiến ở hai chỗ (`B.2.1/B.2.2` cạnh thẻ và `B.5.1/B.5.3` cạnh số trang). Spec ghi rõ "cả 2 vị trí nút dùng chung 1 state". Làm `KudosCarouselNav` một lần rồi dùng hai lần với prop `placement`.
- **`disabled` là thuộc tính DOM thật, không phải class mờ đi.** C12 assert `disabled`; một `<button>` chỉ đổi `opacity` vẫn click được và vẫn đỏ.
- **Reset về slide 1 khi bộ lọc đổi xảy ra "miễn phí"** (AD-4): bộ lọc nằm ở URL, trang render lại, `useCarouselIndex` nhận `count` mới và tự về `0`. Đừng thêm một `useEffect` reset thủ công.
- **Rỗng thì hiện `Hiện tại chưa có Kudos nào.`, không hiện carousel rỗng** (BR-011/C07). Chuỗi này dùng chung với feed — lấy từ copy, không gõ lại ở hai nơi.
- **`x/5` không phải lúc nào cũng là 5.** Khi lọc còn 3 kudo thì đọc `1/3`. Counter tính từ `items.length`, không phải hằng số 5.
- **Thẻ hai bên mờ vẫn phải ẩn khỏi trình đọc màn hình và khỏi tab order** — dùng `aria-hidden` + `inert` cho slide không active, nếu không Playwright sẽ thấy 3 thẻ trùng nội dung và C11 đếm sai.

## Related Code Files

**Tạo**: 3 cặp `.tsx` + `.stories.tsx` (xem `file_ownership`).

## Implementation Steps

1. Đọc C07, C11, C12, C14 trong `tests/e2e/kudos.spec.ts`.
2. `kudos-slide-counter.tsx` — `data-testid="kudos-slide-counter"`, hiển thị `${index + 1}/${count}`.
3. `kudos-carousel-nav.tsx` — cặp nút; props `canPrev`, `canNext`, `onPrev`, `onNext`, `placement`; `data-testid="kudos-carousel-prev"` / `kudos-carousel-next`; `aria-label` tiếng Việt; `disabled` thật.
4. `kudos-highlight-carousel.tsx` — gọi `useCarouselIndex(items.length)`; render thẻ active rõ + hai thẻ kề mờ (`aria-hidden` + `inert`); đặt `KudosCarouselNav` hai lần; `items.length === 0` → `copy.feed.empty` trong một `[data-testid="kudos-empty"]`.
5. Story: `fiveItems`, `filteredToThree`, `singleItem` (cả hai nút disabled), `empty`.
6. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc C07/C11/C12/C14 trước khi viết
- [ ] `useCarouselIndex` được import, không tái hiện logic
- [ ] Hai cặp nút cùng một `KudosCarouselNav`, cùng một state
- [ ] `disabled` là thuộc tính thật, không chỉ đổi style
- [ ] Counter tính từ `items.length`, không hằng số 5
- [ ] Slide không active mang `aria-hidden` + `inert`
- [ ] Rỗng → `data-testid="kudos-empty"` với chuỗi từ copy
- [ ] 4 story ở bước 5
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- Story `singleItem`: cả prev lẫn next đều có thuộc tính `disabled` trong DOM.
- Story `fiveItems`: đúng **1** phần tử có `data-testid="kudos-card"` mà không mang `aria-hidden` — đây là điều làm C11 đếm đúng.
- Story `filteredToThree`: counter đọc `1/3`.
- `grep -rn "useState" src/app/\(public\)/kudos/_components/kudos-highlight-carousel.tsx` không ra kết quả (state ở hook).
- `wc -l` mọi file mới ≤ 200; Storybook build xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Ba thẻ cùng hiện trong DOM không `aria-hidden` → C11 đếm 3 thay vì 1 | Cao | Cao — C11/C13 đỏ và rất khó đoán ra nguyên nhân | Success Criteria đếm phần tử không `aria-hidden` |
| Hai cặp nút mỗi cặp một state | Trung bình | Cao — bấm nút dưới không đổi thẻ trên, C12 đỏ | Một `useCarouselIndex` duy nhất ở component cha |
| `disabled` làm bằng CSS | Trung bình | Cao — C12 đỏ | Todo ghi rõ; story `singleItem` là bằng chứng |
| Thêm `useEffect` reset khi filter đổi | Trung bình | Trung bình — nhấp nháy, tranh chấp với hook | Key Insights giải thích vì sao reset đã miễn phí |
| Kéo một thư viện carousel vào | Thấp | Trung bình — thêm dependency cho 5 thẻ tĩnh | Out of scope cấm thẳng |

## Security Considerations

Không I/O, không dữ liệu nhạy cảm. Rủi ro duy nhất là a11y: slide ẩn phải ra khỏi tab order (`inert`), nếu không người dùng bàn phím sẽ tab vào các nút không nhìn thấy.

## Next Steps

Cấp vùng B cho phase 13.
