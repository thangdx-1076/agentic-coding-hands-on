---
phase: 10
feature: F007
track: A
status: pending
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-spotlight.tsx",
    "src/app/(public)/kudos/_components/kudos-spotlight.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-spotlight-scatter.tsx",
    "src/app/(public)/kudos/_components/kudos-spotlight-scatter.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-sunner-search.tsx",
    "src/app/(public)/kudos/_components/kudos-sunner-search.stories.tsx",
  ]
---

# Phase 10 — Track A: Spotlight (vùng B.6 / B.7)

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_B.6_Header Giải thưởng` `2940:13476` · `mms_B.7_Spotlight` `2940:14174`
  - `mms_B.7.1_388 KUDOS` `3007:17482` — tổng **query từ DB**, không phải số tĩnh
  - `mms_B.7.2_Pan zoom` `3007:17479` — **FRAME RỖNG trong design, không build**
  - `mms_B.7.3_Tìm kiếm sunner` `2940:14833` — placeholder `Tìm kiếm`, `maxLength` 100
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md` § Spotlight + § D002
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts`** — ràng buộc trực tiếp: C05, C06, C20, C21
- `phase-06` cấp `useSpotlightSearch` — import, **không** tự giữ query/logic khớp
- `spec/kudosliveboard/functional-spec.md` § 11 RISK-01 — scatter tĩnh sẽ lệch khi dữ liệu thật vượt quy mô mock

## Overview

**Priority**: P1 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Khối Spotlight — tổng `N KUDOS` đọc từ DB, scatter tên tĩnh dựng từ dữ liệu thật, và ô tìm Sunner làm nổi bật tên khớp ngay tại chỗ.

## Out of scope

- **Không** pan/zoom (`B.7.2` là FRAME RỖNG trong design — TC[37] đã ghi nợ). Không render nút đó, không render một nút giả không làm gì.
- **Không** canvas, không thư viện word-cloud, không vật lý va chạm — design là ~120 TEXT node tĩnh.
- **Không** click-node mở chi tiết kudo và **không** tooltip hover (TC[38] hoãn cùng nhóm với trang chi tiết).
- **Không** điều hướng khi tìm kiếm (D002) — chỉ làm nổi bật trong tập đang hiển thị.
- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions`; **không** sửa `kudos-screen.tsx`, `page.tsx`, hay file test.

## Key Insights

- **`388` là số thật, không phải chữ trong design.** Spec ghi rõ tổng được query từ DB (BR-009); C20 assert nó bằng số hàng `kudos` đã seed. Hard-code `388` là đỏ ngay.
- **Scatter tĩnh nhưng dữ liệu thật.** Vị trí/kích thước chữ là bố cục tĩnh chép từ design; **danh sách tên** đến từ props (`spotlightNames`, người nhận kudo thật). Bố cục tĩnh + nội dung động là đúng nghĩa "không bịa dữ liệu".
- **Không đủ tên thì lặp lại bố cục ít vị trí hơn, không độn tên giả.** Design vẽ 8 tên lặp lại nhiều lần; khi DB chỉ có 3 người nhận thì hiện 3.
- **Ô tìm cần cả hai chốt của BR-010**: `maxLength={100}` trên chính `<input>` (C06 kiểm bằng cách gõ 101 ký tự rồi đọc `inputValue().length`) **và** nút submit `disabled` khi ô rỗng (C05).
- **Tên khớp mang `data-matched="true"`** — C21 bám vào thuộc tính đó, không bám vào màu.
- **Trạng thái loading/empty của Spotlight** (TC[27]): không có tên nào → hiện thông báo rỗng, không hiện một khung trống.

## Related Code Files

**Tạo**: 3 cặp `.tsx` + `.stories.tsx` (xem `file_ownership`).

## Implementation Steps

1. Đọc C05, C06, C20, C21 trong `tests/e2e/kudos.spec.ts`.
2. `kudos-sunner-search.tsx` — `<input data-testid="kudos-sunner-search" maxLength={100} placeholder={copy.spotlight.searchPlaceholder}>` + nút kính lúp `data-testid="kudos-sunner-search-submit"` với `disabled` khi rỗng; Enter cũng submit; nhận `query`/`onQueryChange`/`onSubmit` từ `useSpotlightSearch` ở component cha.
3. `kudos-spotlight-scatter.tsx` — bố cục tĩnh chép từ frame; mỗi tên là một `<span data-testid="kudos-spotlight-name" data-matched={...}>`; `names.length === 0` → thông báo rỗng.
4. `kudos-spotlight.tsx` — eyebrow/heading (`B.6`), `data-testid="kudos-spotlight-total"` hiển thị `${total} KUDOS`, rồi `KudosSunnerSearch` + `KudosSpotlightScatter`; gọi `useSpotlightSearch(names)`.
5. Story: `default`, `searchMatched`, `searchNoMatch`, `emptyNames`, `zeroTotal`.
6. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc C05/C06/C20/C21 trước khi viết
- [ ] Tổng lấy từ prop, **không** hằng số `388`
- [ ] `maxLength={100}` trên chính `<input>`
- [ ] Nút tìm `disabled` khi ô rỗng
- [ ] `data-matched` trên tên khớp
- [ ] Không render nút pan/zoom
- [ ] `names: []` → thông báo rỗng, không khung trống
- [ ] 5 story ở bước 5
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- `grep -rn "388" src/app/\(public\)/kudos/_components/kudos-spotlight*.tsx` không ra kết quả.
- Story `zeroTotal` hiển thị `0 KUDOS` — chứng minh C20 hoạt động cả khi CI không có DB.
- Gõ 101 ký tự vào story `default` → giá trị input dài đúng 100.
- Story `searchMatched`: đúng những `<span>` khớp mang `data-matched="true"`, không phần tử nào khác.
- `wc -l` mọi file mới ≤ 200; Storybook build xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Hard-code `388 KUDOS` theo design | Cao | Cao — C20 đỏ, và là dữ liệu bịa | Success Criteria có `grep` làm cửa cứng |
| Dựng canvas/word-cloud "cho giống thật" | Trung bình | Cao — thêm dependency và hành vi design không mô tả, ngược clarifications | Out of scope cấm thẳng, kèm lý do |
| Độn tên giả cho scatter trông đầy | Trung bình | Cao — vi phạm luật MoMorph | Key Insights ghi rõ: ít tên thì hiện ít |
| `maxLength` đặt ở state thay vì trên `<input>` | Trung bình | Trung bình — C06 đọc `inputValue()` sẽ thấy 101 | Todo ghi rõ vị trí đặt |
| Render nút pan/zoom vô hiệu "cho đủ design" | Trung bình | Thấp — control chết, gây hiểu nhầm | Out of scope: **không render** |

## Security Considerations

Không I/O. Tên Sunner render dạng text thuần. Ô tìm chỉ lọc phía client trên mảng đã tải — không có truy vấn nào nhận chuỗi người dùng nhập, nên không có bề mặt injection ở đây.

## Next Steps

Cấp vùng B.6/B.7 cho phase 13.
