---
phase: 07
feature: F007, F008
track: A
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.5h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-card.tsx",
    "src/app/(public)/kudos/_components/kudos-card.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-card-person.tsx",
    "src/app/(public)/kudos/_components/kudos-card-person.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-hashtag-list.tsx",
    "src/app/(public)/kudos/_components/kudos-hashtag-list.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-heart-button.tsx",
    "src/app/(public)/kudos/_components/kudos-heart-button.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-image-strip.tsx",
    "src/app/(public)/kudos/_components/kudos-image-strip.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-card-actions.tsx",
    "src/app/(public)/kudos/_components/kudos-card-actions.stories.tsx",
    "src/app/(public)/kudos/_shared/kudos-copy.ts",
  ]
---

# Phase 07 — Track A: thẻ Kudos dùng chung + `kudos-copy`

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_B.3_KUDO - Highlight` `2940:13465` — biến thể `highlight` (3 dòng, **không** ảnh đính kèm)
    - avatar gửi `I2940:13465;335:9443;256:4734` · info gửi `...;256:4737` · mũi tên `I2940:13465;335:9444` · avatar nhận `...;335:9446;256:4734` · info nhận `...;335:9446;256:4737`
    - thời gian `I2940:13465;335:9449` · nội dung `...;335:9450` · hashtag `...;335:9458` · action `...;335:9461`
  - `mms_C.3_KUDO Post` `3127:21871` — biến thể `feed` (5 dòng, **có** ảnh đính kèm)
    - info gửi `I3127:21871;256:4858` · icon sent `...;256:5161` · info nhận `...;256:4860` · time `...;256:5229` · content `...;256:5155` · ảnh `...;256:5176` · hashtag `...;256:5158` · action `...;256:5194` · tim `...;256:5175` · copy link `...;256:5216`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: đọc `evidence/red-evidence.md` (kết quả phase 01)
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts` — hợp đồng DOM, đọc thẳng file này**, không suy diễn lại. Ràng buộc trực tiếp: C13, C16, C22, C23, C24.
- `phase-06` cấp `formatKudoTime`, `starTier` — import, **không** viết lại
- `phase-02` cấp `evidence/asset-dimensions.md` và namespace `kudos.feed.*`
- `src/app/(public)/awards/_shared/awards-copy.ts` — khuôn `*-copy.ts` (type + default tĩnh)
- `spec/kudosliveboard/technical-spec.md` § 4.4 — BR-005/006/007/008 đều là quy tắc của chính component này

## Overview

**Priority**: P0 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Dựng **một** component thẻ Kudos dùng chung cho cả carousel lẫn feed, khác nhau đúng một prop `variant`, nhận trọn dữ liệu qua props và không có I/O nào.

## Out of scope

- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions` — coverage gate 100% sẽ đỏ và phase 06 đã cấp đủ (xem phase 06 § Risk).
- **Không** gọi DAL, `fetch`, `useEffect` đọc dữ liệu, hay đọc cookie.
- **Không** gắn handler thật cho nút tim — nhận `onToggleHeart` qua props, phase 13 nối vào Server Action.
- **Không** cho nút "Xem chi tiết" điều hướng: render như `<button disabled>` với `title` giải thích, **không** bọc `<Link>` (frame `onDIohs2bS` chưa build — C24 assert đúng điều này).
- **Không** làm lightbox ảnh (`C.3.6` click → ảnh full) và **không** làm hover preview profile.
- **Không** sửa `kudos-screen.tsx`, `kudos-client.tsx`, `page.tsx`, `messages/*.json`, hay file test nào.

## Key Insights

- **Một component, hai biến thể — spec nói thẳng vậy** (§ 4.4): `maxLines = variant === "highlight" ? 3 : 5`. Nhân bản thành hai component là vi phạm DRY và sẽ trôi lệch ngay lần sửa đầu tiên.
- **File ≤200 dòng là lý do có 6 file chứ không phải 1.** Thẻ Kudos gánh 6 vùng con (2 khối người, nội dung, hashtag, ảnh, thanh action) — tách sẵn ngay từ đầu, đừng đợi nó phình rồi mới cắt.
- **Nút tim mang 3 trạng thái, và cả 3 do props quyết định, không tự suy ra**: `hearted` (xám/đỏ), `disabled` khi viewer là sender (BR-002) hoặc khi ẩn danh (FR-602, kèm `title` mời đăng nhập). `data-hearted` phải có mặt trên DOM — C25 đọc chính thuộc tính đó.
- **Hashtag là `<button>`, không phải `<span>`.** Click nó đổi bộ lọc (BR-004/C16). Nhưng phase này chỉ gọi `onSelectHashtag` từ props.
- **`_shared/kudos-copy.ts` giữ TYPE và giá trị mặc định tĩnh**, giá trị thật đến từ `messages/*.json` qua phase 13. Đúng ranh giới `awards-copy.ts` đang giữ, và ESLint chặn cứng import chéo `_shared` giữa segment.
- **Không đổi tên node design.** Text hiển thị chép đúng chữ hoa/thường của node (`Copy Link`, `Xem chi tiết`) — luật kế thừa từ commit `b6920ec`.

## Related Code Files

**Tạo**: 6 cặp `.tsx` + `.stories.tsx` và `_shared/kudos-copy.ts` (xem `file_ownership`).

## Implementation Steps

1. Đọc `tests/e2e/kudos.spec.ts` (C13, C16, C22, C23, C24) và lấy đúng bộ `data-testid` từ đó.
2. `_shared/kudos-copy.ts` — `KudosCopy` type + `defaultKudosCopy` (giá trị tĩnh cho Storybook/test), gồm nhánh `feed.*` mà thẻ cần: `detail`, `copyLink`, `copiedToast`, `heartLabel`, `signInToHeart`.
3. `kudos-card-person.tsx` — avatar + tên (bọc `<Link href={/profile?id=...}>`) + phòng ban + hoa thị từ `starTier()`. Dùng cho **cả** người gửi lẫn người nhận, phân biệt bằng prop `role`.
4. `kudos-hashtag-list.tsx` — tối đa 5 tag/dòng, quá thì `...` (BR-006); mỗi tag là `<button data-testid="kudos-hashtag">`.
5. `kudos-image-strip.tsx` — tối đa 5 ảnh, căn trái (BR-007); `next/image` với `width`/`height` lấy từ `evidence/asset-dimensions.md`; ảnh **không** click được (lightbox hoãn).
6. `kudos-heart-button.tsx` — `data-testid="kudos-card-heart"`, `data-hearted`, `disabled` + `title` theo § Key Insights.
7. `kudos-card-actions.tsx` — nút tim + `Copy Link` + `Xem chi tiết` (disabled).
8. `kudos-card.tsx` — lắp 6 mảnh, `variant: "highlight" | "feed"` điều khiển `maxLines` và việc có hiện `kudos-image-strip` hay không; `data-testid="kudos-card"` + `data-variant`.
9. Mỗi component một `.stories.tsx`, tối thiểu các story: `highlight`, `feed`, `anonymous` (tim disabled), `ownKudo` (tim disabled), `hearted`, `longContent` (đúng chỗ cắt `...`), `sixHashtags`, `sixImages`. **Dữ liệu story chép từ frame**, không bịa.
10. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc hợp đồng C13/C16/C22/C23/C24 trước khi viết dòng nào
- [ ] `kudos-copy.ts` (type + default tĩnh, không giá trị runtime)
- [ ] 6 component, mỗi file ≤200 dòng
- [ ] `data-testid` + `data-variant` + `data-hearted` đúng hợp đồng
- [ ] Cắt 3 dòng / 5 dòng đúng biến thể (BR-005)
- [ ] Tối đa 5 hashtag (BR-006), tối đa 5 ảnh căn trái (BR-007)
- [ ] Hoa thị đọc từ `starTier()` của phase 06, không tự tính lại (BR-008)
- [ ] "Xem chi tiết" là `<button disabled>`, **không** `<Link>`
- [ ] 8 story tối thiểu ở bước 9
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- Storybook build xanh và mỗi biến thể ở bước 9 render đúng, đối chiếu được với ảnh frame.
- `grep -rn "useEffect\|fetch(\|createClient" src/app/\(public\)/kudos/_components/kudos-card*.tsx` không ra kết quả.
- `wc -l` mọi file mới ≤ 200.
- Thẻ dựng bằng đúng props, không prop nào có giá trị mặc định "bịa" cho dữ liệu thật (default chỉ có ở `defaultKudosCopy`).
- `pnpm typecheck` xanh với `variant` là union literal, không phải `string`.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Tách thành hai component riêng cho highlight và feed | Trung bình | Cao — DRY vỡ, hai nhánh trôi lệch, phase 09/11 sửa chồng nhau | `variant` ghi cứng trong Goal và Todo; spec § 4.4 nói thẳng |
| Bọc "Xem chi tiết" bằng `<Link>` cho "đủ nghĩa" | Cao | Trung bình — C24 đỏ, và dẫn người dùng tới trang chưa tồn tại | Out of scope ghi rõ; C24 là cửa cứng |
| Tự tính hoa thị trong JSX thay vì gọi `starTier()` | Trung bình | Trung bình — hai nguồn sự thật cho BR-008 | Todo ghi thẳng; review đối chiếu import |
| Viết một file `.ts` trong `_hooks` cho tiện | Trung bình | Cao — coverage gate 100% đỏ | Out of scope cấm; phase 06 đã cấp đủ hook |
| Bịa nội dung thẻ trong story | Cao | Trung bình — vi phạm luật MoMorph | Bước 9 bắt chép từ frame; `evidence/seed-transcript.md` (phase 05) là nguồn dùng chung |

## Security Considerations

Component thuần trình bày, không I/O. Hai điểm cần cẩn thận: `next/image` chỉ nhận `image_urls` từ DB nên `next.config` phải cho phép đúng host (nếu chưa, báo BLOCKED chứ đừng mở `**`); và nội dung lời cảm ơn render dạng **text**, không `dangerouslySetInnerHTML` — đây là dữ liệu do người dùng nhập.

## Next Steps

Mở khoá phase 09 (carousel) và phase 11 (feed) — cả hai tiêu thụ `KudosCard` ở chế độ chỉ đọc.
