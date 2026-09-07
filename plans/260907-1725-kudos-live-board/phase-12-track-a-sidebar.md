---
phase: 12
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
    "src/app/(public)/kudos/_components/kudos-sidebar.tsx",
    "src/app/(public)/kudos/_components/kudos-sidebar.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-stat-list.tsx",
    "src/app/(public)/kudos/_components/kudos-stat-list.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-leaderboard.tsx",
    "src/app/(public)/kudos/_components/kudos-leaderboard.stories.tsx",
  ]
---

# Phase 12 — Track A: sidebar (vùng D)

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_D_Thống menu phải` `2940:13488` · `mms_D.1_Thống kê tổng quat` `2940:13489`
  - 5 chỉ số: `D.1.2` `2940:13491` · `D.1.3` `2940:13492` · `D.1.4` `3241:14882` · `D.1.6` `2940:13495` · `D.1.7` `2940:13496`
  - `D.1.5_phân cách` `2940:13494` · `D.1.8_Button mở quà` `2940:13497` — **render disabled**
  - `mms_D.3_10 SUNNER nhận quà` `2940:13510` (title `2940:13513`, item `2940:13516`-`2940:13520`)
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md` § D001
- testPolicy: `e2e-red-first`

## Track A dispatch contract

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: MaZUn5xHXZ` · `stack: Next.js 16 App Router + TypeScript + Tailwind + Storybook (nextjs-vite)`
`testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos.spec.ts"]` · `redCommand: pnpm test:e2e` · `redExitCode`/`redFailure`/`redEvidence`: `evidence/red-evidence.md`
`plannedChecks`: `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`
**Use Figma design content as mock data source. Do NOT invent data.**

## Context Links

- **`tests/e2e/kudos.spec.ts`** — ràng buộc trực tiếp: C08, C09, C27, C28
- `phase-02` cấp namespace `kudos.sidebar.*`
- `spec/kudosliveboard/functional-spec.md` § 3 D001 + FR-211, FR-213
- `plan.md` § AD-8 — vì sao 2 dòng Secret Box hiện `0` và nút "Mở quà" disabled

## Overview

**Priority**: P1 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: section`)
**Goal (1 dòng)**: Cột phải — 5 chỉ số cá nhân chỉ hiện cho người đã đăng nhập, cộng hai bảng xếp hạng luôn hiện, mỗi bảng tự có trạng thái rỗng riêng.

## Out of scope

- **Không** mở dialog Secret Box khi bấm "Mở quà" (frame `J3-4YFIpMM` + 8 state chưa build — TC[26] đã ghi nợ). Nút render `disabled` kèm `title`.
- **Không** hover preview profile trên mục leaderboard (TC[40] chỉ thoả nửa click).
- **Không** bịa số cho người ẩn danh — ẩn hẳn khối 5 chỉ số + nút "Mở quà" (D001).
- **Không** tạo file `.ts` trong `_utils`/`_hooks`/`_actions`; **không** sửa `kudos-screen.tsx`, `page.tsx`, `messages/*.json`, hay file test.

## Key Insights

- **Ẩn danh: ẩn hẳn khối, không hiện `0`** (D001). Hiện `0` cho khách vãng lai đọc thành "bạn có 0 kudos" chứ không phải "bạn chưa đăng nhập". C09 assert đúng **0** phần tử `kudos-stat-row`, nên "ẩn" phải là không render, không phải `hidden` bằng CSS.
- **Đã đăng nhập: 2 dòng Secret Box hiện `0` là ĐÚNG, không phải bịa** (AD-8). Chưa có hệ quà nào tồn tại nên không ai có hộp quà — `0` là con số thật. Khác hẳn trường hợp ẩn danh ở trên; đừng nhầm hai tình huống.
- **Hai leaderboard hiện `Chưa có dữ liệu` ở trạng thái hiện tại.** Cả "thăng hạng mới nhất" lẫn "nhận quà mới nhất" đều chưa có nguồn dữ liệu nào trong hệ. Đó chính là FR-213/BR-012/C08 — trạng thái rỗng là kết quả đúng, không phải thiếu sót.
- **Trạng thái rỗng của leaderboard là RIÊNG từng bảng** (FR-213): một bảng có dữ liệu, bảng kia rỗng thì chỉ bảng kia hiện thông báo. Đừng dựng một trạng thái rỗng chung cho cả sidebar.
- **Chuỗi `Chưa có dữ liệu` KHÔNG có dấu chấm cuối**, khác hẳn `Hiện tại chưa có Kudos nào.` Hai chuỗi khác nhau, hai component khác nhau — đừng tái dùng `KudosEmptyState` của phase 11 ở đây nếu nó gắn cứng dấu chấm.
- **Tên trong leaderboard là `<Link href="/profile?id=">`** (FR-402/C28) — gate đăng nhập tái dùng nguyên `(protected)/layout.tsx`, không dựng gate mới.
- **Sidebar cuộn độc lập với nội dung chính** (FR-211).

## Related Code Files

**Tạo**: 3 cặp `.tsx` + `.stories.tsx` (xem `file_ownership`).

## Implementation Steps

1. Đọc C08, C09, C27, C28 trong `tests/e2e/kudos.spec.ts`.
2. `kudos-stat-list.tsx` — 5 dòng `label: value` với `data-testid="kudos-stat-row"`, đường phân cách (`D.1.5`), rồi nút `Mở quà` `data-testid="kudos-open-gift"` ở trạng thái `disabled` + `title`. Nhận `stats: KudosStats | null`; `null` → **trả `null`**, không render gì.
3. `kudos-leaderboard.tsx` — `title` + danh sách mục (avatar + tên `<Link>` + mô tả); `items.length === 0` → `Chưa có dữ liệu` trong chính `[data-testid="kudos-leaderboard"]`.
4. `kudos-sidebar.tsx` — `KudosStatList` rồi hai `KudosLeaderboard`; container cuộn độc lập.
5. Story: `authenticated` (5 dòng + nút disabled), `anonymous` (không dòng nào, không nút), `bothBoardsEmpty`, `oneBoardFilled`.
6. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.

## Todo List

- [ ] Đọc C08/C09/C27/C28 trước khi viết
- [ ] `stats === null` → **không render** khối (không CSS hidden)
- [ ] Đúng 5 `kudos-stat-row` khi đã đăng nhập
- [ ] Nút "Mở quà" `disabled` + `title`, không handler
- [ ] Trạng thái rỗng RIÊNG cho từng leaderboard
- [ ] Chuỗi `Chưa có dữ liệu` **không** dấu chấm cuối
- [ ] Tên leaderboard bọc `<Link href="/profile?id=">`
- [ ] Sidebar cuộn độc lập
- [ ] 4 story ở bước 5
- [ ] build / typecheck / lint / format / build-storybook xanh

## Success Criteria

- Story `anonymous`: `querySelectorAll('[data-testid="kudos-stat-row"]').length === 0` và không có `kudos-open-gift` — đúng thứ C09 assert.
- Story `authenticated`: đúng **5** `kudos-stat-row`, không phải 6 (design vẽ 6 dòng gồm cả đường phân cách; FR-211 nói 5 chỉ số).
- Story `oneBoardFilled`: đúng **1** trong hai leaderboard hiện `Chưa có dữ liệu`.
- `grep -n "Chưa có dữ liệu\." src/app/\(public\)/kudos/_components/` không ra kết quả (không được có dấu chấm).
- `wc -l` mọi file mới ≤ 200; Storybook build xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Hiện `0` cho người ẩn danh thay vì ẩn khối | Cao | Cao — C09 đỏ, và nói dối người xem | D001 ghi trong Key Insights; story `anonymous` là bằng chứng |
| Ẩn bằng CSS thay vì không render | Trung bình | Cao — Playwright vẫn đếm ra 5 phần tử | Success Criteria đếm bằng `querySelectorAll` |
| Đếm 6 dòng vì design vẽ 6 (kể cả đường phân cách) | Trung bình | Trung bình — C27 đỏ | Success Criteria ghi rõ 5, không 6 |
| Một trạng thái rỗng chung cho cả sidebar | Trung bình | Trung bình — FR-213 hụt, C08 đỏ | Story `oneBoardFilled` |
| Thêm dấu chấm vào `Chưa có dữ liệu` | Trung bình | Trung bình — C08 đỏ vì lệch 1 ký tự | `grep` trong Success Criteria |
| Gắn handler mở Secret Box | Trung bình | Thấp — dẫn tới dialog chưa tồn tại | Out of scope; nút `disabled` |

## Security Considerations

`stats` là dữ liệu cá nhân của viewer — component **không** tự đọc session, chỉ nhận `null` hoặc số đã tính từ phase 13. Đường `null` phải là mặc định an toàn: thiếu dữ liệu thì không hiện gì, không hiện `0`. Leaderboard chỉ chứa tên và avatar công khai, không email.

## Next Steps

Cấp vùng D cho phase 13.
