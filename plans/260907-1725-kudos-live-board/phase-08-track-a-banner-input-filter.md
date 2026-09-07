---
phase: 08
feature: F007
track: A
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-banner.tsx",
    "src/app/(public)/kudos/_components/kudos-banner.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-pill.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-pill.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-filter-bar.tsx",
    "src/app/(public)/kudos/_components/kudos-filter-bar.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-filter-menu.tsx",
    "src/app/(public)/kudos/_components/kudos-filter-menu.stories.tsx",
  ]
---

# Phase 08 — Track A: banner A + ô nhập A.1 + bộ lọc B.1

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_A_KV Kudos` `2940:13437` — tiêu đề `Hệ thống ghi nhận lời cảm ơn` + logo SAA 2025 KUDOS
  - `mms_A.1_Button ghi nhận` `2940:13449` — pill + icon bút trái + placeholder
  - `mms_B.1_header` `2940:13452` — eyebrow `Sun* Annual Awards 2025` + heading `HIGHLIGHT KUDOS`
  - `mms_B.1.1_ButtonHashtag` `2940:13459` · `mms_B.1.2_Button Phong ban` `2940:13460`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts`** — ràng buộc trực tiếp: C02, C03, C04, C14, C15
- `phase-02` cấp `messages.kudos.{banner,compose,highlight}` + `public/kudos/**` + `evidence/asset-dimensions.md`
- `src/app/(public)/awards/_components/award-category-nav.tsx` — khuôn control có trạng thái active của repo

## Overview

**Priority**: P0 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Dựng ba khối trên cùng của board — banner chỉ đọc, ô nhập pill chỉ render, và hai dropdown lọc đẩy lựa chọn lên URL.

## Out of scope

- **Không** mở dialog Viết Kudo khi bấm pill (frame `ihQ26W78P2` chưa build) — pill là `<input readonly>` hoặc `<button>` **không** handler mở modal. TC[18]/TC[20] đã ghi nợ.
- **Không** tự đọc `searchParams` hay gọi `useRouter` bên trong component — nhận `selected` + `onSelect` qua props; phase 13 nối vào URL.
- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions`.
- **Không** sửa `kudos-screen.tsx`, `page.tsx`, `messages/*.json`, hay file test.

## Key Insights

- **Bộ lọc KHÔNG giữ state riêng** (AD-4). Nguồn sự thật là URL; component chỉ hiển thị `selected` nhận từ props và gọi `onSelect`. Giữ thêm một `useState` song song là tạo hai nguồn sự thật và làm C14 chớp tắt.
- **Danh sách hashtag và phòng ban đến từ DB, không hard-code** (FR-206). Prop là `options: string[]`; danh sách rỗng thì nút vẫn render nhưng menu hiện trạng thái rỗng — không được ẩn nút (C04 assert nó visible ngay cả khi CI không có DB).
- **Placeholder là hợp đồng, không phải copy.** `Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?` phải khớp từng ký tự kể cả ở bundle `en` — C03 assert nguyên văn.
- **Trạng thái active/inactive của hai nút lọc phải thấy được** (TC[06]) — dùng `data-active` để test bám vào chứ không bám vào class Tailwind.
- **Menu dropdown cần đóng được bằng phím Escape và bằng click ra ngoài**; nút mang `aria-expanded`. Đây là a11y tối thiểu, không phải tính năng thêm.

## Related Code Files

**Tạo**: 4 cặp `.tsx` + `.stories.tsx` (xem `file_ownership`).

## Implementation Steps

1. Đọc C02, C03, C04, C14, C15 trong `tests/e2e/kudos.spec.ts`, lấy đúng `data-testid`.
2. `kudos-banner.tsx` — `<h1>` chứa tiêu đề, logo qua `next/image` với kích thước thật từ `evidence/asset-dimensions.md`, `alt` lấy từ copy. Không interactive.
3. `kudos-compose-pill.tsx` — `<input readonly data-testid="kudos-compose-pill">` + icon bút bên trái, bo tròn dạng pill. Không handler mở modal.
4. `kudos-filter-menu.tsx` — dropdown dùng chung: `label`, `options`, `selected`, `onSelect`, `onClear`; `aria-expanded`, đóng bằng Escape và click ngoài, có mục xoá bộ lọc (TC[28]/TC[29] đòi "clearing the filter displays all Kudos").
5. `kudos-filter-bar.tsx` — eyebrow + heading + hai `KudosFilterMenu` (`Hashtag`, `Phòng ban`) với `data-testid` riêng, `data-active`.
6. Story: `default`, `hashtagSelected`, `departmentSelected`, `emptyOptions`, `bothSelected`.
7. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc C02/C03/C04/C14/C15 trước khi viết
- [ ] Banner: `<h1>` + logo có `alt`, không interactive
- [ ] Pill: placeholder khớp từng ký tự, `readonly`, icon bút bên trái
- [ ] `KudosFilterMenu` dùng chung cho cả hai nút (DRY), có mục xoá lọc
- [ ] `aria-expanded` + Escape + click-ngoài
- [ ] `data-active` cho trạng thái đã chọn
- [ ] `options: []` vẫn render nút, không ẩn
- [ ] 5 story ở bước 6
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- Story `emptyOptions` vẫn hiện cả hai nút lọc — chứng minh C04 sẽ GREEN trong CI không có DB.
- `grep -rn "useRouter\|useSearchParams\|useState" src/app/\(public\)/kudos/_components/kudos-filter-*.tsx` chỉ ra `useState` cho việc mở/đóng menu, **không** cho giá trị đã chọn.
- Placeholder trong code khớp byte-for-byte với chuỗi trong C03.
- `wc -l` mọi file mới ≤ 200; Storybook build xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Giữ giá trị lọc trong `useState` song song với URL | Cao | Cao — C14/C15 chớp tắt, back/forward sai | Success Criteria có `grep` làm cửa cứng |
| Ẩn nút lọc khi `options` rỗng | Trung bình | Cao — C04 đỏ trong CI | Story `emptyOptions` là bằng chứng bắt buộc |
| Gắn `onClick` mở modal cho pill "cho đủ" | Trung bình | Trung bình — dẫn tới một dialog không tồn tại | Out of scope ghi rõ; pill là `readonly` |
| Hai dropdown copy-paste thành hai component | Trung bình | Thấp — nợ DRY | `KudosFilterMenu` là file riêng ngay từ bước 4 |
| Menu không đóng được bằng bàn phím | Trung bình | Trung bình — a11y hụt, TC layout đỏ | Escape + `aria-expanded` nằm trong Todo |

## Security Considerations

Không I/O. `options` là chuỗi từ DB được render dạng text — không `dangerouslySetInnerHTML`. Giá trị lọc sẽ thành query param ở phase 13, nên component chỉ trả về chuỗi thô, không tự dựng URL.

## Next Steps

Cấp cho phase 13 ba khối trên cùng; không phase Track A nào phụ thuộc phase này.
