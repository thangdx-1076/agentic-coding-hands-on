---
phase: 11
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
    "src/app/(public)/kudos/_components/kudos-feed.tsx",
    "src/app/(public)/kudos/_components/kudos-feed.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-feed-sentinel.tsx",
    "src/app/(public)/kudos/_components/kudos-feed-sentinel.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-empty-state.tsx",
    "src/app/(public)/kudos/_components/kudos-empty-state.stories.tsx",
  ]
---

# Phase 11 — Track A: feed ALL KUDOS (vùng C)

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_C_All kudos` `2940:13475` · `mms_C.1_Header` `2940:14221` · `mms_C.2_Danh sách lời cảm ơn` `2940:13482`
  - `mms_C.3_KUDO Post` `3127:21871` và ba bản lặp `C.5` `3127:22053` · `C.6` `3127:22375` · `C.7` `3127:22439`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts`** — ràng buộc trực tiếp: C07, C13, C14, C17, C18, C19
- `phase-07` cấp `KudosCard` với `variant="feed"` — import, **không** dựng thẻ mới
- `phase-06` cấp `useInfiniteFeed` — import, **không** tự viết `IntersectionObserver`
- `src/app/(public)/awards/_components/award-category-nav.tsx` — tiền lệ scroll-spy `IntersectionObserver` của repo

## Overview

**Priority**: P0 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Danh sách ALL KUDOS nối thêm trang khi cuộn tới cuối, và hiện đúng một chuỗi rỗng khi không có gì để hiện.

## Out of scope

- **Không** tự viết `IntersectionObserver` — `useInfiniteFeed` của phase 06 là nguồn duy nhất; tự viết là bỏ qua chốt chống-gọi-chồng và làm C18/C19 chớp tắt.
- **Không** gọi Server Action trực tiếp — nhận `loadMore` qua props, phase 13 nối vào `loadMoreKudos`.
- **Không** phân trang bằng nút bấm hay số trang — design là cuộn vô hạn.
- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions`; **không** sửa `kudos-card.tsx`, `kudos-screen.tsx`, `page.tsx`, hay file test.

## Key Insights

- **"Hết dữ liệu" KHÁC "chưa có dữ liệu".** Cuộn hết trang cuối thì im lặng dừng lại, không hiện thông báo nào (C19). Chỉ khi `items.length === 0` mới hiện `Hiện tại chưa có Kudos nào.` (C07/C17). Gộp hai trạng thái này là lỗi hay gặp nhất ở feed.
- **`kudos-empty-state.tsx` là component dùng chung với carousel.** Cùng một chuỗi hiện ở hai chỗ (BR-011) — một component, hai chỗ gọi. Carousel của phase 09 cũng dùng chính nó.
- **Sentinel phải nằm ngoài danh sách, không phải phần tử cuối của danh sách.** Nếu sentinel là card cuối thì nó biến mất khi trang mới nối vào và observer mất mục tiêu.
- **Sentinel chỉ render khi `hasMore`** — đó chính là cách C19 quan sát "không request nữa": phần tử `kudos-feed-sentinel` biến mất khỏi DOM.
- **Khoá `key` phải là `kudo.id`**, không phải index — nối thêm trang mà dùng index thì React tái sử dụng nhầm DOM và trạng thái tim nhảy lung tung giữa các thẻ.
- **Feed cuộn độc lập với sidebar** (FR-211) — bố cục hai cột, cột phải cuộn riêng.

## Related Code Files

**Tạo**: 3 cặp `.tsx` + `.stories.tsx` (xem `file_ownership`).

## Implementation Steps

1. Đọc C07, C13, C14, C17, C18, C19 trong `tests/e2e/kudos.spec.ts`.
2. `kudos-empty-state.tsx` — `data-testid="kudos-empty"`, nhận `message` qua prop (dùng chung với phase 09; không hard-code chuỗi trong component).
3. `kudos-feed-sentinel.tsx` — `<div data-testid="kudos-feed-sentinel" ref={...}>`, chỉ render khi `hasMore`; có vùng cao đủ để observer bắt được (không `height: 0`).
4. `kudos-feed.tsx` — eyebrow/heading (`C.1`), danh sách `KudosCard variant="feed"` với `key={kudo.id}`, rồi sentinel; `items.length === 0` → `KudosEmptyState`; chỉ báo đang tải khi `isLoading`.
5. Story: `firstPage`, `loading`, `exhausted` (không có sentinel), `empty`, `filteredEmpty`.
6. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc C07/C13/C14/C17/C18/C19 trước khi viết
- [ ] `useInfiniteFeed` được import, không tự viết observer
- [ ] Sentinel nằm **ngoài** danh sách và chỉ render khi `hasMore`
- [ ] `key={kudo.id}`, không phải index
- [ ] Rỗng ≠ hết trang: chỉ `items.length === 0` mới hiện empty state
- [ ] `KudosEmptyState` nhận chuỗi qua prop (dùng chung phase 09)
- [ ] Bố cục hai cột, cột sidebar cuộn độc lập
- [ ] 5 story ở bước 5
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- Story `exhausted`: **không** có phần tử `kudos-feed-sentinel` trong DOM.
- Story `exhausted`: **không** có `kudos-empty` — đây chính là điều C19 phân biệt.
- Story `empty`: đúng 1 `kudos-empty` với chuỗi `Hiện tại chưa có Kudos nào.`
- `grep -rn "IntersectionObserver" src/app/\(public\)/kudos/_components/` không ra kết quả (nó ở `_hooks`).
- `wc -l` mọi file mới ≤ 200; Storybook build xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Hiện empty state khi cuộn hết trang | Cao | Cao — C19 đỏ, người dùng tưởng feed rỗng | Story `exhausted` khẳng định không có `kudos-empty` |
| Sentinel là phần tử cuối danh sách | Trung bình | Cao — nạp một trang rồi ngừng hẳn, C18 đỏ | Bước 3 tách riêng file cho sentinel |
| `key={index}` khi nối trang | Trung bình | Cao — trạng thái tim nhảy sang thẻ khác sau khi nối | Todo ghi rõ; review đối chiếu |
| Tự viết `IntersectionObserver` | Trung bình | Cao — mất chốt chống gọi chồng, feed lặp bản ghi | `grep` trong Success Criteria là cửa cứng |
| Sentinel cao 0px, observer không bao giờ bắn | Trung bình | Cao — C18 đỏ dù logic đúng | Bước 3 ghi rõ phải có chiều cao |

## Security Considerations

Không I/O trong component. Nội dung lời cảm ơn là dữ liệu người dùng nhập → render dạng text, tuyệt đối không `dangerouslySetInnerHTML` (spec cũ từng nhắc "parse markdown" ở FUN_013 — **không** làm trong phạm vi này).

## Next Steps

Cấp vùng C cho phase 13.
