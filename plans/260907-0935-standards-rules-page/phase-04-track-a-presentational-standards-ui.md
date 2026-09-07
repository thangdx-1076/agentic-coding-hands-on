---
phase: 04
feature: F005
track: A
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 2.5h
owner: momorph-ui-implementer
mode: screen
note: "Mid-flight defect: badge assets re-cropped to 64×64 inner frame (removed baked-in captions). Unified badge height using SECRET_BOX_BADGE_SIZE constant. Removed per-badge height table and fill frame from secret-box-badge.tsx"
file_ownership:
  [
    "src/app/(public)/standards/_components/standards-screen.tsx",
    "src/app/(public)/standards/_components/standards-screen.stories.tsx",
    "src/app/(public)/standards/_components/hero-badge-tier-row.tsx",
    "src/app/(public)/standards/_components/hero-badge-tier-row.stories.tsx",
    "src/app/(public)/standards/_components/secret-box-badge.tsx",
    "src/app/(public)/standards/_components/secret-box-badge.stories.tsx",
    "src/app/(public)/standards/_components/standards-footer-actions.tsx",
    "src/app/(public)/standards/_components/standards-footer-actions.stories.tsx",
    "src/app/(public)/standards/_shared/standards-copy.ts",
  ]
---

# Phase 04 — Track A: UI trình bày panel Thể lệ

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (frame `3204:6051`, 1440×1796, bg `#00101A`)
  - panel `3204:6053` · s1 `3204:6132` · s2 `3204:6077` · s3 `3204:6090` · footer `3204:6092` (`Đóng` `3204:6093`, `Viết KUDOS` `3204:6094`)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- **`tests/e2e/standards.spec.ts` — hợp đồng DOM, đọc thẳng file này**, không suy diễn lại (kết quả phase 01)
- `phase-01-red-e2e-standards-contract.md` § Requirements — bảng C1-C14
- `spec/F005_StandardsRulesPage/technical-spec.md` § 4.1 (bảng component), § 4.5 (DOM/a11y)
- `spec/SCR005_Standards/spec.md` § 2 (layout regions), § 5 (UI states), § 8 (a11y)
- `data/preview.png` — ảnh render, dùng làm chuẩn spacing/typography
- Kết quả phase 02: `public/standards/*` (11 asset + bảng kích thước nội tại), `(public)/_components/icons/icon-pencil.tsx`, khoá i18n `standards.*`
- `src/app/(public)/awards/_components/awards-screen.tsx` + `_shared/awards-copy.ts` — khuôn gần nhất

## Overview

**Priority**: P2 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: screen`)
**Goal (1 dòng)**: Dựng toàn bộ phần trình bày của panel Thể lệ — `<main>` cuộn được trên nền `#00101A`, h1, 3 section, 4 tier, lưới 6 badge, 2 nút footer — nhận tất cả dữ liệu qua props.

## Out of scope

- **Không** `SiteHeader` / `SiteFooter` / `KeyvisualBackground` / `KudosSection` / `getViewer` — design không vẽ chrome (clarifications.md § Session bổ sung). Nếu lúc code phát hiện bằng chứng ngược (layer ẩn trong `get_frame`), **dừng lại báo**, không tự thêm.
- **Không** trạng thái `disabled` cho 2 nút (BR-005, D001).
- **Không** sửa `messages/*.json`, `page.tsx`, `standards-client.tsx`, hook, hay bất kỳ file test nào.
- **Không** breakpoint responsive tự nghĩ ra (design chỉ vẽ 1440) — chỉ co giãn tự nhiên: dưới `lg` panel chiếm full width.
- Không `useEffect`, không `fetch`, không gọi DAL.

## Key Insights

- **`<main>` là scroll container, không phải window.** `h-dvh overflow-y-auto` trên `<main>`, panel bám phải (`ml-auto`, `max-w-[552px]` theo tỉ lệ design 1440), nền trang `#00101A`. C8/C9 assert `main.scrollTop`/`scrollHeight` — nếu để window scroll thay vì `main`, cả hai test đỏ dù trang nhìn vẫn đúng.
- **Đúng 1 `<main>`, 0 `<header>`, 0 `<footer>`.** Thanh 2 nút ở đáy là `<div>` sticky (`sticky bottom-0`) **bên trong** `<main>`, **không** phải thẻ `<footer>` — C2 assert `page.locator("footer")` count 0. Đây là cách kiểm chứng được quyết định "không bọc chrome".
- **Caption badge là DOM text, không phải `alt`.** 6 caption phải là `<p>` thật (FR-103, C5) để screen reader và Playwright đọc được. Ảnh badge dùng `alt=""` decorative. Đừng nhét caption vào `alt` rồi tưởng đã xong.
- **Ảnh tier thì ngược lại**: `alt` mang tên tier (`New Hero`…) vì chữ nằm trong ảnh, không có text node nào khác thay được (C4).
- **Nội dung là `character`, không phải `itemName`.** Tên layer của TEXT node không nhất thiết bằng nội dung. Badge thứ 6: tên layer `ROOT FUTHER` (thiếu R) nhưng `get_node("I3204:6088;737:20392").character` = **`ROOT FURTHER`** → hiển thị `ROOT FURTHER`. Slug và tên file vẫn là `root-further` (`badge-root-further.png`) nên slug ↔ caption khớp nhau, không có bẫy nào ở đây nữa. Tương tự `Đóng`/`Viết KUDOS` mang tên component mặc định. Mọi string khác name == character.
- **Bảng cấu trúc tĩnh, khai một lần, dùng ba nơi.** `_shared/standards-copy.ts` giữ `HERO_TIERS` (slug · asset · w · h) và `SECRET_BOX_BADGES` (slug · asset · w · h); `StandardsScreen` map qua chúng, `buildCopy` (phase 05) cũng map qua chúng, story cũng vậy. Không ai gõ tay lại đường dẫn ảnh hay cặp w/h — đó chính là cái bẫy "width or height modified" `/awards` đã dính.
- **Kích thước nội tại lấy từ phase 02** (đã đo lại bằng `sips`), không đoán: hero 126×22 / 110×20 / 109×19 / 110×20; badge 80×88 (revival, stay-gold) và 80×104 (4 cái còn lại). Badge lệch chiều cao vì exporter cắt caption khác nhau → render trong khung cố định `h-[104px]` với `object-contain` để 6 ô thẳng hàng, thay vì để chiều cao nội tại đẩy lưới lệch.
- **Icon**: "Đóng" dùng `next/image` với `/standards/close.svg` (24×24, `fill="white"` — đúng màu cho nút outlined trên nền tối). "Viết KUDOS" dùng **component** `IconPencil` từ `(public)/_components/icons/` (ancestor private folder — hợp lệ theo rule 3; import ngang sang `(home)/` là lỗi review). Lý do không dùng `/home/Pen.svg` qua `<Image>`: file đó `fill="white"`, trắng trên nút vàng là vô hình.
- **Đúng 1 `a[href="/kudos"]` trên trang.** Không chrome nên không có link `/kudos` nào khác — `page.locator('a[href="/kudos"]')` ở C12 an toàn. Đừng thêm link `/kudos` thứ hai ở bất kỳ đâu.
- **`onClose` là function prop** → không băng qua được ranh giới Server Component. `StandardsScreen` nhận `{ copy, onClose }` và **không** tự `"use client"`; ranh giới client nằm ở `standards-client.tsx` (phase 05). Cây component này phải render được trong Storybook mà không cần router.
- **Story bắt buộc**: `HeroBadgeTierRow`, `SecretBoxBadge`, `StandardsFooterActions` đều là common component (nhận đủ dữ liệu qua props, không import copy của feature, compose < 2 component có tên) → mỗi cái một `.stories.tsx`. `StandardsScreen` là composition nhưng quy ước repo đòi mỗi route chính có một story dựng từ component trình bày (`/`→`HomeScreen`, `/awards`→`AwardsScreen`) → vẫn viết.
- **Fixture story không nhân bản nội dung.** `sampleStandardsCopy` trong `_shared/standards-copy.ts` giữ **nguyên văn** heading, 4 dòng điều kiện và 6 caption (những chuỗi bị e2e assert, và những chuỗi có ký tự bẫy), nhưng **rút gọn** 4 mô tả tier + 2 đoạn intro/closing. Nguồn sự thật là `messages/vi.json` — ghi comment nói rõ.
- **Hover (GUI_004) + focus**: cả 2 nút đổi màu/độ nổi khi hover và có `focus-visible:ring-2` (theo nếp `NavLink`/`GoogleLoginButton`). E2E không assert hover — visual validation ở phase 06 mới chứng minh.
- **File ≤200 dòng**: `standards-screen.tsx` chỉ compose 3 section; chi tiết 1 tier nằm ở `hero-badge-tier-row.tsx`, 1 ô badge ở `secret-box-badge.tsx`, thanh nút ở `standards-footer-actions.tsx`.

## Requirements

Hợp đồng DOM (lấy từ `tests/e2e/standards.spec.ts` + technical-spec § 4.5) — bản rút gọn, **file test vẫn là bản có thẩm quyền**:

- Đúng 1 `<main>` cuộn dọc; `<h1>` = `Thể lệ`; 0 `<header>`, 0 `<footer>`.
- 3 `<section>`, mỗi cái 1 `<h2>`, đúng thứ tự và đúng nguyên văn 3 heading.
- Section 1: intro + đúng 4 `<img>` `alt` = `New Hero` / `Rising Hero` / `Super Hero` / `Legend Hero`, kèm dòng điều kiện + đoạn mô tả, thứ tự New → Rising → Super → Legend.
- Section 2: intro (chứa ❤️) + lưới **3 cột × 2 hàng**, đúng 6 `<img alt="">` + 6 `<p>` caption text thật, thứ tự REVIVAL → TOUCH OF LIGHT → STAY GOLD → FLOW TO HORIZON → BEYOND THE BOUNDARY → ROOT FURTHER + đoạn closing.
- Section 3: heading + 1 `<p>` chứa ❤️.
- Thanh nút (sticky trong `<main>`): `<button>` `Đóng` (icon X trái, secondary/outlined) + `<a href="/kudos">` `Viết KUDOS` (icon bút trái, primary vàng). Không element nào có `disabled`.
- Mọi file ≤ 200 dòng; kebab-case; named export; không `"use client"` ở bất kỳ file nào trong phase này.

## Architecture

```text
StandardsScreen({ copy, onClose })            ← server-renderable, presentational
 └─ <main h-dvh overflow-y-auto bg-[#00101A]>       (scroll container, C1/C8/C9)
     └─ <div ml-auto max-w-[552px] px-8>            (panel bám phải)
         ├─ <h1>{copy.title}</h1>
         ├─ <section> <h2>{hero.heading}</h2> <p>{hero.intro}</p>
         │      HERO_TIERS.map(t => <HeroBadgeTierRow tier={t} copy={hero.tiers[t.slug]} />)
         ├─ <section> <h2>{secretBox.heading}</h2> <p>{secretBox.intro}</p>
         │      <ul grid grid-cols-3>
         │        SECRET_BOX_BADGES.map(b => <SecretBoxBadge badge={b} caption={…} />)
         │      </ul>
         │      <p>{secretBox.closing}</p>
         ├─ <section> <h2>{nation.heading}</h2> <p>{nation.body}</p>
         └─ <div sticky bottom-0>  <StandardsFooterActions copy={copy.footer} onClose={onClose} />

HeroBadgeTierRow      <img alt={tier.alt} w/h từ bảng> + <p cond> + <p desc>
SecretBoxBadge        <li> <img alt="" object-contain h-[104px]> + <p>{CAPTION}</p>
StandardsFooterActions  <button onClick={onClose}> Image(/standards/close.svg) + "Đóng"
                        <Link href="/kudos">        <IconPencil/>              + "Viết KUDOS"

_shared/standards-copy.ts
  type StandardsCopy · HERO_TIERS · SECRET_BOX_BADGES · sampleStandardsCopy (fixture story)
```

## Related Code Files

**Create**
- `src/app/(public)/standards/_components/standards-screen.tsx` (+ `.stories.tsx`)
- `src/app/(public)/standards/_components/hero-badge-tier-row.tsx` (+ `.stories.tsx`)
- `src/app/(public)/standards/_components/secret-box-badge.tsx` (+ `.stories.tsx`)
- `src/app/(public)/standards/_components/standards-footer-actions.tsx` (+ `.stories.tsx`)
- `src/app/(public)/standards/_shared/standards-copy.ts`

**Modify**: — *(kể cả `src/styles/globals.css`: chỉ thêm token dưới `@theme inline` NẾU design thật sự có màu chưa tồn tại; nếu cần, xin quyền sở hữu file đó trước, đừng tự sửa)*
**Delete**: —
**Chỉ đọc**: `tests/e2e/standards.spec.ts`, `public/standards/*`, `(public)/_components/icons/icon-pencil.tsx`, `messages/vi.json`

## Implementation Steps

1. Đọc `tests/e2e/standards.spec.ts` đầu-cuối, chép hợp đồng DOM ra nháp **trước khi viết dòng JSX nào**.
2. `get_frame` + `get_design_item_image` cho `3204:6051` lấy spacing/typography/màu thật; đối chiếu `data/preview.png`. Không đoán giá trị nào.
3. `_shared/standards-copy.ts`: type `StandardsCopy` (khớp shape khoá i18n chốt ở phase 02) + `HERO_TIERS` + `SECRET_BOX_BADGES` (slug · asset · width · height) + `sampleStandardsCopy`.
4. `hero-badge-tier-row.tsx` + story.
5. `secret-box-badge.tsx` + story (khung cố định `h-[104px]`, `object-contain`).
6. `standards-footer-actions.tsx` + story (story truyền `onClose: fn()`); hover + `focus-visible:ring-2` cho cả 2 nút.
7. `standards-screen.tsx` compose đúng thứ tự DOM; đếm tay: 1 `<main>`, 1 `<h1>`, 3 `<section>`, 4 + 6 `<img>`, 1 `<button>`, 1 `a[href="/kudos"]`, 0 `<header>`, 0 `<footer>`.
8. `standards-screen.stories.tsx`: story `Default` (`sampleStandardsCopy`). Dùng `const meta = {…} satisfies Meta<…>; export default meta;`.
9. Kiểm từng file ≤200 dòng.
10. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.

## Todo List

- [ ] Chép hợp đồng DOM từ `standards.spec.ts`
- [ ] `standards-copy.ts` — type + 2 bảng cấu trúc + fixture rút gọn
- [ ] `hero-badge-tier-row.tsx` + story
- [ ] `secret-box-badge.tsx` + story — caption là `<p>`, ảnh `alt=""`
- [ ] `standards-footer-actions.tsx` + story — `<button>` + `<a href="/kudos">`, hover + focus ring
- [ ] `standards-screen.tsx` — `<main>` cuộn, panel bám phải, 3 section
- [ ] `standards-screen.stories.tsx`
- [ ] Đếm tay: 1 main · 3 section · 4+6 img · 0 header · 0 footer · 1 link `/kudos`
- [ ] `grep "ROOT FURTHER"` trong fixture (và `ROOT FUTHER` rỗng), `grep "10–20"` (en-dash)
- [ ] Mọi file ≤200 dòng
- [ ] Gate: lint · format · build · typecheck · storybook

## Success Criteria

- Storybook `Screens/StandardsScreen` render được, **không** cảnh báo `next/image` "width or height modified" trong console.
- Đếm tay trong markup khớp đủ: 1 `<main>` · 1 `<h1>` · 3 `<section>` · 4 `<img alt="{tên tier}">` · 6 `<img alt="">` + 6 `<p>` caption · 1 `<button>` · 1 `<a href="/kudos">` · 0 `<header>` · 0 `<footer>`.
- Không file nào chứa `"use client"`; không file nào import `SiteHeader`/`SiteFooter`/`getViewer`/`@/dal`.
- Không import ngang sang `(home)/` hay `awards/`; icon pen đến từ `(public)/_components/icons/`.
- `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm build-storybook` xanh; mọi file ≤200 dòng.
- Không sửa file nào ngoài `file_ownership`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Để window scroll thay vì `<main>` cuộn | **Cao** | Cao — C8 + C9 đỏ dù nhìn đúng | Ghi cứng ở Key Insights + Architecture; kiểm bằng devtools trước khi đóng phase |
| Dùng `<footer>` cho thanh nút | **Cao** | Cao — C2 đỏ | `<div sticky bottom-0>`, ghi rõ; đếm tay ở bước 7 |
| Nhét caption badge vào `alt` | Trung bình | Cao — C5 đỏ, hỏng screen reader | FR-103 ghi rõ; story hiển thị caption dưới ảnh |
| Chép `ROOT FUTHER` từ tên layer thay vì `character` | Trung bình | Cao — C5 đỏ | Fixture copy-paste từ `messages/vi.json` (phase 02); `grep "ROOT FUTHER"` phải rỗng trước khi đóng |
| Gõ tay cặp w/h ảnh → cảnh báo `next/image` | Trung bình | Thấp–Trung bình | Bảng `HERO_TIERS`/`SECRET_BOX_BADGES` là nguồn duy nhất; không lặp lại số ở JSX |
| Badge 88 vs 104 làm lưới lệch hàng | Trung bình | Trung bình — lệch visual | Khung cố định `h-[104px]` + `object-contain`; xác nhận ở visual phase 06 |
| Tự thêm `SiteHeader`/`SiteFooter` cho "giống `/awards`" | Trung bình | Cao — C2 đỏ, sai design | Out of scope ghi đầu file; phát hiện bằng chứng ngược thì **dừng lại báo** |
| Dùng `<Image src="/home/Pen.svg">` → pen trắng trên nút vàng | Trung bình | Trung bình — nhìn như mất icon | Chốt `IconPencil` (currentColor); nêu lý do tại chỗ |
| `"use client"` leo lên `standards-screen.tsx` | Trung bình | Trung bình — kéo cả cây sang bundle client | Success Criteria kiểm `grep "use client"` phải rỗng |
| Chép trọn nội dung dài vào fixture story | Trung bình | Trung bình — nhân bản, lệch `messages/*.json` | Fixture rút gọn mô tả, giữ nguyên văn heading/caption/điều kiện, kèm comment |

## Security Considerations

- Không component nào gọi Supabase, `fetch`, hay đọc cookie — dữ liệu vào 100% qua props từ phase 05.
- Nội dung render bằng text node thường; **không** `dangerouslySetInnerHTML` (kể cả khi đoạn văn có emoji/xuống dòng — dùng `whitespace-pre-line`).
- `<a href="/kudos">` là link nội bộ, không `target="_blank"`, không `rel` ra ngoài origin.
- Ảnh chỉ đến từ `/standards/*` và `public/home/*` trong repo — không remote host, không cần `next.config` `images.remotePatterns`.

## Next Steps

Mở khoá phase 05 (`page.tsx` + client boundary). Cần phase 01 (hợp đồng DOM) và phase 02 (asset + icon + khoá i18n) đã đóng trước khi bắt đầu.
