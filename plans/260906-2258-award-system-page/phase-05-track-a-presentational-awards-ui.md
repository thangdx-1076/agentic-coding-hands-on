---
phase: 05
feature: F004
track: A
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 3h
owner: momorph-ui-implementer
file_ownership:
  [
    "src/app/(public)/awards/_components/awards-screen.tsx",
    "src/app/(public)/awards/_components/award-section.tsx",
    "src/app/(public)/awards/_components/award-category-nav.tsx",
    "src/app/(public)/awards/_components/awards-empty-state.tsx",
    "src/app/(public)/awards/_components/awards-screen.stories.tsx",
    "src/app/(public)/awards/_components/icons/**",
    "src/app/(public)/awards/_shared/awards-copy.ts",
    "src/styles/globals.css",
  ]
---

# Phase 05 — Track A: UI trình bày `/awards`

## MoMorph refs

- Hệ thống giải: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD (frame `313:8436`)
- Clarifications: `plans/260906-2258-award-system-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `tests/e2e/awards.spec.ts` — **hợp đồng DOM, đọc thẳng file này**, không suy diễn lại
- `spec/F004_AwardSystemPage/technical-spec.md` § 4.6 (DOM/a11y contract), § 4.1 (bảng component)
- `spec/award-seed-content.md` § "Ảnh giải" (map slug → PNG + kích thước nội tại)
- `clarifications.md` § layout xen kẽ, § nav mobile, § ảnh giải, § icon mới
- Kết quả phase 02: `src/app/(public)/_components/{site-header,site-footer,kudos-section,keyvisual-background}.tsx`, `_shared/site-chrome.ts`, `_shared/award-name-graphics.ts`
- Kết quả phase 04: `../_hooks/use-award-category-nav`

## Overview

**Priority**: P1 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: screen`)
Dựng toàn bộ phần trình bày của `/awards`: h1 + caption, nav danh mục, 6 section giải layout xen kẽ, khối Kudos tái dùng, empty-state. Không đọc DB, không viết hook, không sửa `messages/*.json`.

## Key Insights

- **Chỉ ĐÚNG MỘT phần tử `<nav aria-label="Danh mục giải thưởng">` được render.** Nav responsive (chip cuộn ngang dưới `lg`, sidebar sticky từ `lg`) phải là **một** `<nav>` đổi class theo breakpoint — KHÔNG render 2 bản rồi ẩn/hiện. Hai bản nav sẽ làm `toHaveCount(6)` (TC ID-5) thành 12 và `a[href="#top-talent"]` (TC ID-9/11) vi phạm strict mode.
- **Mỗi `<section>` có đúng 2 `<img>`**: vòng vàng `/home/Award_BG.png` + PNG tên giải theo slug, ghép y như `award-card.tsx:80-112`. Kích thước w/h **khác nhau theo slug** — truyền sai cặp là bật cảnh báo "width or height modified" của Next, và cảnh báo đó không làm đỏ TC ID-13 (chỉ bắt `pageerror`) nhưng vẫn là lỗi. Dùng `AWARD_NAME_GRAPHIC` đã hoist ở phase 02 (`(public)/_shared/award-name-graphics.ts`), không khai lại bảng.
  *(TC ID-7 hiện assert `toHaveCount(1)` — sai với thiết kế 2 lớp. **Tester sửa test ở phase 07**, Track A không được cắt bớt ảnh để chiều test.)*
- **Layout xen kẽ**: ảnh trái / nội dung phải cho section 1, 3, 5; đảo lại cho 2, 4, 6. Dưới `lg` xếp dọc, ảnh luôn ở trên. Suy ra từ index, không nhét cờ vào dữ liệu.
- **`scroll-mt`**: header là `sticky top-0` (`site-header.tsx`), nên mỗi `<section id>` cần `scroll-mt-24` (hoặc tương đương chiều cao header) — thiếu nó thì `scrollIntoView` giấu tiêu đề sau header và `toBeInViewport({ratio: 0.5})` (TC ID-9) chông chênh.
- **Chiều cao section**: mô tả `signature-2025-creator` và `mvp` có 2 đoạn (`\n\n`) → section rất cao. TC ID-9 đòi 50% section lọt viewport 1280×720. Giữ cột chữ `max-w-[640px]`, `text-base leading-6`, và không thêm khoảng trắng dọc thừa; nếu vẫn quá cao, báo lại cho tester ở phase 07 thay vì tự nới test.
- `whitespace-pre-line` trên đoạn mô tả để `\n\n` từ DB thành ngắt đoạn thật.
- **3 icon mới** (`Target`, `Diamond`, `License`, 24px) viết thành inline SVG component theo khuôn `(public)/_components/icons/icon-*.tsx`, mỗi file kèm `.stories.tsx` (icon là common component). Không tải PNG.
- `AwardsScreen` là **composition component** → không bắt buộc story theo skill, NHƯNG quy ước repo đòi mỗi route chính có một story dựng từ component trình bày (`/` → `HomeScreen`, `/login` → `LoginScreen`) → vẫn viết `awards-screen.stories.tsx`.
- **Fixture story không được nhân bản seed**: `_shared/awards-copy.ts` chứa `defaultAwardsCopy` (chrome vi) + `sampleAwards` gồm **3 giải, mô tả rút gọn** đủ để thấy layout xen kẽ. Nội dung thật sống ở DB (`clarifications.md`), không chép 6 mô tả dài vào repo.
- Bảng màu: dùng lại token `login-*` sẵn có (`--color-login-background`, `--color-login-button`…) như `/` đang làm. Chỉ thêm token mới vào `@theme inline` (`src/styles/globals.css:8-21`) nếu design thật sự có màu chưa tồn tại, đặt tên `--color-awards-<role>` theo đúng nếp `login-*`.
- Props toàn bộ là dữ liệu thuần (`awards: Award[]`, `copy`, `viewer`, `onSelectLocale`, `logoutAction`) — `AwardsScreen` không tự gọi DAL, không `useEffect`.

## Requirements

Hợp đồng DOM (lấy từ `tests/e2e/awards.spec.ts`, technical-spec § 4.6):

- `<h1>` chứa `Hệ thống giải thưởng SAA 2025`; caption `Sun* annual awards 2025` ở phía trên.
- `<nav aria-label="Danh mục giải thưởng">` chứa **đúng 6** `<a>`, đúng thứ tự/href: `#top-talent`, `#top-project`, `#top-project-leader`, `#best-manager`, `#signature-2025-creator`, `#mvp`; nhãn lần lượt `Top Talent`, `Top Project`, `Top Project Leader`, `Best Manager`, `Signature 2025 - Creator`, `MVP (Most Valuable Person)`.
- Mục active mang `aria-current="true"`; các mục khác **không** có thuộc tính đó.
- 6 `<section id="<slug>">`, mỗi cái có `<h2>` là tiêu đề giải, một dòng số lượng (`quantityValue` + `quantityUnit` + nhãn `copy.quantityLabel`), và 1–2 dòng giá trị giải (`prizeValues.map`).
- Thứ tự DOM: `<header>` → `<h1>` → `<nav>` → 6 section → khối Kudos (`<h2>Sun* Kudos</h2>` + link `/kudos`) → `<footer>`.
- Rỗng (`awards.length === 0`): render header/h1/caption/Kudos/footer bình thường, **không** render `<nav>` và **không** render section nào, hiện `AwardsEmptyState` với `copy.empty`. Không throw, không 500.
- Mọi file ≤200 dòng — `awards-screen.tsx` chỉ compose, chi tiết một giải nằm trong `award-section.tsx`.

## Architecture

```text
AwardsScreen (server-renderable, presentational)
 ├─ KeyvisualBackground              [(public)/_components]
 ├─ SiteHeader  copy viewer …        [(public)/_components]
 ├─ <main>
 │   ├─ <p caption> + <h1>
 │   ├─ awards.length
 │   │    ? <div lg:grid lg:grid-cols-[240px_1fr]>
 │   │        ├─ AwardCategoryNav  ("use client", 1 <nav>, chip <lg / sidebar sticky ≥lg)
 │   │        └─ awards.map((a,i) => <AwardSection award={a} reversed={i % 2 === 1} />)
 │   │    : <AwardsEmptyState message={copy.empty} />
 │   └─ KudosSection                  [(public)/_components]
 └─ SiteFooter                        [(public)/_components]

AwardSection#<slug>  scroll-mt-24
 ├─ figure: <img Award_BG.png> + <img AWARD_NAME_GRAPHIC[slug]>   (2 ảnh, ghép như award-card)
 └─ div: <h2 IconTarget/> · <p whitespace-pre-line> · IconDiamond+số lượng · IconLicense+giá trị[]
```

## Related Code Files

**Create**
- `src/app/(public)/awards/_components/awards-screen.tsx`
- `src/app/(public)/awards/_components/award-section.tsx`
- `src/app/(public)/awards/_components/award-category-nav.tsx` (`"use client"` — leaf tương tác duy nhất)
- `src/app/(public)/awards/_components/awards-empty-state.tsx`
- `src/app/(public)/awards/_components/icons/icon-target.tsx`, `icon-diamond.tsx`, `icon-license.tsx` (+ 3 `.stories.tsx`)
- `src/app/(public)/awards/_components/awards-screen.stories.tsx`
- `src/app/(public)/awards/_shared/awards-copy.ts`

**Modify**: `src/styles/globals.css` — **chỉ thêm** token dưới `@theme inline` nếu cần
**Delete**: —

## Implementation Steps

1. Đọc `tests/e2e/awards.spec.ts` đầu-cuối và chép hợp đồng DOM ra giấy nháp trước khi viết dòng JSX nào.
2. `get_frame` + `get_design_item_image` cho `313:8436` để lấy spacing/typography thật; **dùng ảnh render làm chuẩn**, text node của instance không đáng tin (`award-seed-content.md` § "Vì sao cần đính chính").
3. Viết `_shared/awards-copy.ts`: `AwardsCopy` type + `defaultAwardsCopy` (vi) + `sampleAwards` (3 giải, mô tả rút gọn).
4. Viết 3 icon + story.
5. `award-section.tsx`: figure 2 lớp ảnh + nội dung; prop `reversed` quyết định thứ tự cột ở `lg`.
6. `award-category-nav.tsx`: `"use client"`, destructure hook phase 04 ngay tại call site, render đúng 1 `<nav>`; `aria-current` chỉ đặt lên mục active.
7. `awards-empty-state.tsx` + nhánh rỗng trong `awards-screen.tsx`.
8. `awards-screen.tsx` compose theo đúng thứ tự DOM; kiểm lại từng file ≤200 dòng.
9. `awards-screen.stories.tsx`: story `Default` (6 giải giả), `Empty` (`awards={[]}`), `Anonymous`/`Member` cho header. Dùng `const meta = {...} satisfies Meta<...>; export default meta;`.
10. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.

## Todo List

- [x] Chép hợp đồng DOM từ `awards.spec.ts`
- [x] `awards-copy.ts` (chrome vi + fixture 3 giải rút gọn)
- [x] 3 icon 24px + story
- [x] `award-section.tsx` — 2 ảnh, `scroll-mt`, layout xen kẽ theo index
- [x] `award-category-nav.tsx` — **một** `<nav>`, 6 `<a>`, `aria-current="true"` duy nhất
- [x] `awards-empty-state.tsx` + nhánh rỗng
- [x] `awards-screen.tsx` đúng thứ tự DOM, tái dùng chrome đã promote
- [x] `awards-screen.stories.tsx` (Default + Empty)
- [x] Gate quality + Storybook xanh

**Post-delivery correction**: hero node `2789:12915` missing ROOT FURTHER wordmark → added; review DOM-neutral verified.

## Success Criteria

- Storybook `Screens/AwardsScreen` render được cả 2 story, không cảnh báo `next/image` trong console.
- Đếm tay trong markup: **1** `<nav aria-label="Danh mục giải thưởng">`, **6** `<a href="#...">` bên trong, **6** `<section id>`, **2** `<img>` mỗi section.
- Story `Empty` không render `<nav>` và không section nào, nhưng vẫn có header/h1/Kudos/footer.
- `pnpm typecheck`, `pnpm lint`, `pnpm build-storybook` xanh; không file nào >200 dòng.
- Không sửa file nào ngoài `file_ownership`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Render 2 `<nav>` (mobile + desktop) | **Cao** | Cao — TC ID-5/9/11 đỏ vì strict mode | Ghi cứng ở Key Insights + Success Criteria; đếm tay trước khi đóng phase |
| Bỏ lớp ảnh tên giải để chiều `toHaveCount(1)` | Trung bình | Cao — lệch design, che mất defect thật của test | Cấm rõ ở đây; sửa test là việc của tester phase 07 |
| Section quá cao → `toBeInViewport({ratio:0.5})` không đạt | Trung bình | Trung bình — TC ID-9 chập chờn | Giới hạn `max-w` cột chữ; nếu vẫn cao, báo tester thay vì tự nới |
| Quên `scroll-mt` → tiêu đề nằm dưới sticky header | Trung bình | Trung bình | `scroll-mt-24` trên mọi `<section id>`, kiểm bằng visual pass |
| Sai cặp w/h của PNG tên giải | Trung bình | Thấp — cảnh báo dev của Next | Dùng `AWARD_NAME_GRAPHIC` đã hoist, không gõ tay lại |
| Chép 6 mô tả dài vào fixture story | Trung bình | Trung bình — nhân bản nội dung, lệch DB về sau | Fixture 3 giải, mô tả rút gọn, ghi comment nêu lý do |

## Security Considerations

- Không component nào ở đây gọi Supabase hay `fetch`; dữ liệu vào qua props từ Server Component (phase 06).
- Mô tả giải render bằng text node thường — **không** `dangerouslySetInnerHTML` (nội dung từ DB, dù là nội bộ vẫn coi là untrusted).
- `"use client"` chỉ đặt ở `award-category-nav.tsx`, không leo lên `awards-screen.tsx` (tránh kéo cả cây sang bundle client).
- Link `/kudos` vẫn render dù route chưa tồn tại (chốt ở `clarifications.md`); không mở target/rel ra ngoài origin.

## Next Steps

Mở khoá phase 06 (page lắp `AwardsScreen`). Cần phase 02 + 04 đã đóng trước khi bắt đầu.
