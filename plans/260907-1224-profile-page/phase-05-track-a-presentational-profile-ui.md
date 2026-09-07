---
phase: 05
feature: F006
track: A
status: completed
priority: P1
test_policy: e2e-red-first
effort: 2.5h
owner: momorph-ui-implementer
mode: screen
file_ownership:
  [
    "src/app/(protected)/profile/_components/profile-screen.tsx",
    "src/app/(protected)/profile/_components/profile-screen.stories.tsx",
    "src/app/(protected)/profile/_components/profile-hero.tsx",
    "src/app/(protected)/profile/_components/profile-hero.stories.tsx",
    "src/app/(protected)/profile/_components/badge-collection.tsx",
    "src/app/(protected)/profile/_components/badge-collection.stories.tsx",
    "src/app/(protected)/profile/_components/profile-statistics-card.tsx",
    "src/app/(protected)/profile/_components/profile-statistics-card.stories.tsx",
    "src/app/(protected)/profile/_components/kudos-direction-select.tsx",
    "src/app/(protected)/profile/_components/kudos-direction-select.stories.tsx",
    "src/app/(protected)/profile/_shared/profile-copy.ts",
  ]
---

# Phase 05 — Track A: UI trình bày hồ sơ

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`, 1440×4660, bg `#00101A`)
  - hero `mms_A_Info` `362:5052` (avatar `362:5053`, tên `362:5054`, dòng bỏ hẳn `362:5064`)
  - badge `362:5066`-`362:5071` · slot thống kê `mms_B_Thống kê` `362:5073` (5 dòng `362:5076`-`362:5081`, nút `362:5082`)
  - header KUDOS `362:5084` (eyebrow `362:5085`, heading `362:5088`) · dropdown `mms_C.3_Button` `362:5089`
  - feed `mms_D_Post all` `362:5091` — **KHÔNG build**
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- **`tests/e2e/profile.spec.ts` — hợp đồng DOM, đọc thẳng file này**, không suy diễn lại (kết quả phase 01)
- `phase-01-red-e2e-profile-contract.md` § Requirements — bảng C1-C18
- `spec/F006_ProfilePage/technical-spec.md` § 4.1 (bảng component), § 4.2 (content model), § 4.5 (DOM/a11y)
- Kết quả phase 02: chrome ở `src/app/_components/`, type ở `src/app/_shared/site-chrome.ts`
- Kết quả phase 04: `public/profile/*` + `evidence/asset-dimensions.md` + shape khoá `profile.*`
- `src/app/(public)/awards/_components/awards-screen.tsx` + `_shared/awards-copy.ts` — khuôn gần nhất (có chrome)
- `src/app/(public)/standards/_components/secret-box-badge.tsx` — khuôn ô badge khoá

## Overview

**Priority**: P1 · **Status**: pending · **Track A** (`momorph-ui-implementer`, `mode: screen`)
**Goal (1 dòng)**: Dựng toàn bộ phần trình bày của màn hồ sơ — chrome + hero + 6 ô badge khoá + slot thống kê 1-trong-2 + header KUDOS với dropdown — nhận tất cả dữ liệu qua props, không I/O.

## Out of scope

- **Không** build feed `mms_D_Post all` (`362:5091`) hay bất kỳ card Kudo nào — feed luôn rỗng (FUN_010/GUI_006/GUI_007 hoãn F007+).
- **Không** dòng department + Hero tier + hoa-thị stars (`362:5064`) — bỏ **hẳn cả dòng**, không bỏ từng phần (GUI_009).
- **Không** modal cho "Viết Kudo" / "Mở Secret Box" — 2 control `disabled` cứng, không handler.
- **Không** sửa `page.tsx`, `profile-client.tsx`, `build-profile-copy.ts`, `messages/*.json`, `parse-profile-id.ts`, hay file test nào.
- **Không** gọi DAL, `fetch`, `useEffect`, hay đọc cookie.
- **Không** breakpoint responsive tự nghĩ ra (design chỉ vẽ 1440) — chỉ co giãn tự nhiên.

## Key Insights

- **Màn này CÓ chrome, khác `/standards`.** Đúng 1 `<header>` + 1 `<footer>` (`SiteHeader`/`SiteFooter` từ `@/app/_components/`). Hệ quả: `a[href="/kudos"]` xuất hiện **nhiều hơn 1 lần** trên trang (nav + footer) — đừng thêm link `/kudos` thứ n trong nội dung, và đừng tưởng locator của F005 dùng lại được.
- **Import chrome từ `@/app/_components/`, KHÔNG từ `(public)/`.** Phase 02 đã promote chính vì lý do này. Thấy đường dẫn `(public)/_components` trong file của mình = lỗi review, dừng lại.
- **Header luôn ở biến thể "đã đăng nhập".** `/profile` chỉ render sau khi `(protected)/layout.tsx` cho qua → `viewer` không bao giờ null → có bell + menu tài khoản, **không bao giờ** nút "Đăng nhập" (C1, SC-011).
- **Slot `362:5073` render 1-TRONG-2, không bao giờ cả 2.** `isSelf` → statistics card 5 dòng + "Mở Secret Box"; `!isSelf` → **chỉ** thanh "Viết Kudo" thay thế **toàn bộ** slot. Đây là điều xác nhận muộn qua MoMorph (technical-spec § 5.2, sửa lớn thứ 2 so với bản draft đầu) — co-render là sai design, không chỉ sai test (C8).
- **Sent bị BỎ HẲN khỏi DOM trên hồ sơ người khác**, không `disabled`, không `hidden`, không CSS. Server quyết định mảng `directions` (`["received","sent"]` vs `["received"]`) và component chỉ map. C9 đếm số option — một `<option disabled>` vẫn đếm là 1 và test đỏ. Đây là SEC_001: đóng rò rỉ bằng cách **xoá bề mặt**.
- **Tiêu đề bộ sưu tập nằm DƯỚI hàng ô, không phải trên** (FR-201, C4 assert DOM order). Đây là chi tiết dễ làm ngược theo bản năng.
- **`Bộ sưu tập icon` (other) KHÔNG chèn tên.** Bản draft trước đoán nhầm có interpolation `{full_name}`; GUI_003 verbatim đã sửa. Đừng khôi phục cái đoán cũ.
- **6 ô badge luôn khoá, driven bởi danh sách unlocked LUÔN RỖNG.** Viết như `unlockedSlugs: string[]` mặc định `[]` rồi `data-locked={!unlockedSlugs.includes(slug)}` — không hardcode `data-locked="true"` từng ô. Cùng cơ chế, ngày có huy hiệu thật chỉ cần truyền mảng.
- **5 dòng thống kê là bảng cấu trúc, không phải 5 khối JSX chép tay.** Khai `STATISTICS_ROWS` (key · thứ tự · có divider sau hay không) trong `_shared/profile-copy.ts`, map qua nó. Divider nằm giữa dòng 3 và 4 (C6).
- **`kudos-direction-select.tsx` là leaf `"use client"` duy nhất của phase này** — nó có `useState` cho chiều đang chọn. Đây là chệch khỏi luật "Track A không viết `use client`" của F005, và có chủ đích: state hoàn toàn cục bộ, không I/O, không router. **`profile-screen.tsx` KHÔNG được `"use client"`** — client boundary thật là `profile-client.tsx` của phase 07.
- **Trigger dropdown theo mẫu `{Nhãn} ({count})`, count LUÔN `0`.** Design cho ví dụ `Đã gửi (5)`; bản build khởi tạo `Đã nhận (0)`. Đừng chép số 5 từ design.
- **Avatar là ảnh remote** (`avatar_url` từ Google) — `next/image` với host ngoài đòi `next.config` `images.remotePatterns`. Chưa có cấu hình đó → dùng `<img>` thường cho avatar, hoặc xin quyền sở hữu `next.config.ts` trước. **Đừng tự sửa `next.config.ts`** — nó không nằm trong ownership.
- **`fullName` có thể `null`** → hero hiển thị `copy.hero.fallbackName`. Nhánh này phải render được trong story.
- **Kích thước ảnh lấy từ `evidence/asset-dimensions.md`** (phase 04 đo bằng `sips`), không gõ tay — đúng bẫy "width or height modified" `/awards` đã dính.
- **File ≤200 dòng**: `profile-screen.tsx` chỉ compose; chi tiết hero ở `profile-hero.tsx`, 6 ô ở `badge-collection.tsx`, slot ở `profile-statistics-card.tsx`, dropdown ở `kudos-direction-select.tsx`.

## Requirements

Hợp đồng DOM (rút gọn từ `tests/e2e/profile.spec.ts` — **file test vẫn là bản có thẩm quyền**):

- Đúng 1 `<header>`, 1 `<footer>`, biến thể đã đăng nhập (có `button[aria-label="Tài khoản"]`, không có `a[aria-label="Đăng nhập"]`).
- Hero: keyvisual full-bleed → avatar tròn đè mép dưới, căn giữa → đúng 1 heading mang tên hồ sơ (hoặc `fallbackName`) → **không** dòng department/tier/stars.
- Badge: đúng 6 phần tử slot trong 1 hàng căn giữa, mọi ô `data-locked="true"`; tiêu đề nằm **sau** hàng ô theo DOM order; self = `Bộ sưu tập icon của tôi`, other = `Bộ sưu tập icon`.
- Slot `362:5073`, loại trừ lẫn nhau:
  - self → 5 dòng verbatim + giá trị `0` + 1 divider giữa dòng 3-4 + `<button disabled>` `Mở Secret Box`; **không** `Viết Kudo`.
  - other → **chỉ** `Viết Kudo` `disabled`; **không** 5 dòng, **không** nút Secret Box.
- Header KUDOS: eyebrow `Sun* Annual Awards 2025` + heading `KUDOS` + dropdown. Self → 2 option (`Đã nhận (0)`, `Đã gửi (0)`); other → **đúng 1** option Received.
- Chọn chiều → hiện copy rỗng tương ứng (không danh sách trống im lặng).
- Click `Viết Kudo`/`Mở Secret Box` → không `[role="dialog"]`, không network.
- Không chip Spam ở bất kỳ đâu (feed không được build).
- Mọi file ≤200 dòng; kebab-case; named export; `"use client"` **chỉ** ở `kudos-direction-select.tsx`.

## Architecture

```text
ProfileScreen({ copy, profile, isSelf, viewer, locale, onSelectLocale, logoutAction })
 └─ <SiteHeader copy viewer unreadCount={0} …>            ← @/app/_components/site-header
 └─ <main>
     ├─ <ProfileHero profile copy.hero />                 mm:362:5052
     │     keyvisual full-bleed · avatar tròn · <h1> tên  (KHÔNG 362:5064)
     ├─ <BadgeCollection heading={isSelf ? headingSelf : headingOther}
     │                   unlockedSlugs={[]} />            mm:362:5066-5071
     │     <ul> 6 × <li data-locked="true"> → rồi MỚI tới <h2> tiêu đề
     ├─ <ProfileStatisticsCard copy.stats isSelf />       mm:362:5073
     │     isSelf ? (STATISTICS_ROWS.map → 5 dòng "0" + divider + button disabled)
     │            : (thanh "Viết Kudo" disabled — THAY THẾ toàn bộ slot)
     └─ <section>  eyebrow + <h2>KUDOS</h2>               mm:362:5084
          <KudosDirectionSelect directions={isSelf ? ["received","sent"] : ["received"]}
                                copy.kudos />            mm:362:5089  ← "use client"
            useState(chiều) → trigger `{Nhãn} (0)` → <p> copy rỗng tương ứng
 └─ <SiteFooter copy />                                   ← @/app/_components/site-footer

_shared/profile-copy.ts
  type ProfileCopy = SiteChromeCopy & { hero, badges, stats, kudos }
  BADGE_SLOTS (6 slug · asset · w · h)   STATISTICS_ROWS (5 key · dividerAfter)
  KUDOS_DIRECTIONS   sampleProfileCopy (fixture story)
```

## Related Code Files

**Create**
- `src/app/(protected)/profile/_components/profile-screen.tsx` (+ `.stories.tsx`)
- `src/app/(protected)/profile/_components/profile-hero.tsx` (+ `.stories.tsx`)
- `src/app/(protected)/profile/_components/badge-collection.tsx` (+ `.stories.tsx`)
- `src/app/(protected)/profile/_components/profile-statistics-card.tsx` (+ `.stories.tsx`)
- `src/app/(protected)/profile/_components/kudos-direction-select.tsx` (+ `.stories.tsx`)
- `src/app/(protected)/profile/_shared/profile-copy.ts`

**Modify**: — *(kể cả `next.config.ts` và `src/styles/globals.css`: cần token/remotePattern mới thì **xin quyền sở hữu trước**, đừng tự sửa)*
**Delete**: —
**Chỉ đọc**: `tests/e2e/profile.spec.ts`, `public/profile/*`, `evidence/asset-dimensions.md`, `src/app/_components/**`, `src/app/_shared/site-chrome.ts`, `messages/vi.json`

## Implementation Steps

1. Đọc `tests/e2e/profile.spec.ts` đầu-cuối, chép hợp đồng DOM ra nháp **trước khi viết dòng JSX nào**.
2. `get_frame` + `get_design_item_image` cho `362:5037` lấy spacing/typography/màu thật. Không đoán giá trị nào.
3. `_shared/profile-copy.ts`: `ProfileCopy = SiteChromeCopy & {...}` (đúng nếp `AwardsCopy`) + `BADGE_SLOTS` (w/h từ `evidence/asset-dimensions.md`) + `STATISTICS_ROWS` + `KUDOS_DIRECTIONS` + `sampleProfileCopy`.
4. `profile-hero.tsx` + story (2 story: có `fullName`, và `fullName: null` → fallback).
5. `badge-collection.tsx` + story — 6 ô từ `BADGE_SLOTS`, `data-locked` suy từ `unlockedSlugs`, tiêu đề **sau** `<ul>`.
6. `profile-statistics-card.tsx` + story — 2 story `Self` / `Other`, chứng minh loại trừ lẫn nhau bằng mắt.
7. `kudos-direction-select.tsx` + story — 2 story (2 chiều / 1 chiều); `"use client"`; focus-visible ring; `aria-expanded`/`role` đúng nếp `language-selector.tsx`.
8. `profile-screen.tsx` compose đúng thứ tự DOM; đếm tay: 1 `<header>`, 1 `<footer>`, 1 heading tên, 6 badge-slot, 0 hoặc 5 dòng thống kê tuỳ nhánh, 1 hoặc 2 option dropdown, 0 chip Spam, 0 feed card.
9. `profile-screen.stories.tsx`: story `Self` + story `Other`. Dùng `const meta = {…} satisfies Meta<…>; export default meta;`.
10. Kiểm từng file ≤200 dòng; `grep -rn '"use client"' src/app/\(protected\)/profile/_components/` chỉ khớp `kudos-direction-select.tsx`.
11. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.

## Todo List

- [ ] Chép hợp đồng DOM từ `profile.spec.ts`
- [ ] `profile-copy.ts` — type kế thừa `SiteChromeCopy` + 3 bảng cấu trúc + fixture
- [ ] `profile-hero.tsx` + 2 story (có tên / fallback), KHÔNG dòng `362:5064`
- [ ] `badge-collection.tsx` + story — 6 ô, `unlockedSlugs=[]`, tiêu đề DƯỚI hàng ô
- [ ] `profile-statistics-card.tsx` + 2 story — self ↔ other loại trừ lẫn nhau
- [ ] `kudos-direction-select.tsx` + 2 story — Sent bị xoá khỏi mảng ở nhánh other
- [ ] `profile-screen.tsx` — chrome + 4 khối, KHÔNG feed
- [ ] `profile-screen.stories.tsx` — Self + Other
- [ ] Đếm tay: 1 header · 1 footer · 6 badge · 5-hoặc-0 dòng stats · 1-hoặc-2 option · 0 chip Spam
- [ ] `"use client"` chỉ ở 1 file
- [ ] Mọi file ≤200 dòng
- [ ] Gate: lint · format · build · typecheck · storybook

## Success Criteria

- ✅ Storybook `Screens/ProfileScreen` render đúng cả `Self` và `Other`, không cảnh báo `next/image`.
- ✅ DOM: 1 header · 1 footer · 1 heading tên · 6 badge `data-locked="true"` · self 5 dòng + 1 button · other 1 thanh + 0 dòng · 2 vs 1 option · 0 chip · 0 feed.
- ✅ Chrome imports từ `@/app/_components/`, không từ `(public)/`.
- ✅ `"use client"` đúng 1 file (`kudos-direction-select.tsx`).
- ✅ Không `useEffect`, `fetch`, DAL.
- ✅ Lint, format, build, typecheck, storybook xanh; mọi file ≤200 dòng.

**Corrections during implementation:**
1. Frame references: Plan ghi badge-slot ở `362:5066-5071` và stats ở `mms_B_Thống kê 362:5073`. Live verify via MoMorph: badge 6-slot container là `362:5064` (NOT 5073), stats slot là `362:5073`. Frame `362:5064` là department/tier/stars line mà spec định bỏ hẳn (C3/GUI_009), không phải 6-badge container. **Thực: badge ở `362:5066-5071`, stats ở `362:5073`** (plan đúng, live scan cần sắp xếp lại).
2. Type collision: `ProfileCopy.kudos` collided with `SiteChromeCopy.kudos` (both exist, TS2322). **Fixed**: renamed to `ProfileCopy.kudosDirection` to avoid ambiguity.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Co-render statistics card **và** thanh Viết Kudo | **Cao** (bản draft đầu của spec mô tả mơ hồ) | Cao — C8 đỏ, sai design | Ghi cứng "1-TRONG-2" ở Key Insights + Architecture; 2 story riêng chứng minh bằng mắt |
| Render Sent rồi `disabled`/`hidden` thay vì xoá khỏi mảng | **Cao** | Cao — C9 đỏ, **và** SEC_001 không được đóng | Server quyết `directions`; component chỉ map; đếm option ở bước 8 |
| Đặt tiêu đề bộ sưu tập TRÊN hàng ô | **Cao** (bản năng ngược) | Trung bình — C4 đỏ | FR-201 + Architecture ghi rõ; kiểm DOM order ở bước 5 |
| Khôi phục interpolation `{full_name}` cho tiêu đề other | Trung bình | Trung bình — C5 đỏ | GUI_003 verbatim; fixture copy-paste từ `messages/vi.json` |
| Import chrome từ `(public)/_components` | Trung bình | Cao — lỗi review, và vỡ nếu phase 02 chưa xong | Success Criteria grep; phase 02 là dependency cứng |
| `"use client"` leo lên `profile-screen.tsx` | Trung bình | Trung bình — kéo cả cây sang bundle client | Success Criteria đếm đúng 1 file |
| `next/image` cho avatar remote → build đỏ vì thiếu `remotePatterns` | **Cao** | Trung bình | Dùng `<img>` cho avatar, hoặc xin quyền `next.config.ts` trước; **không** tự sửa |
| Chép `Đã gửi (5)` từ design | Trung bình | Trung bình — C9 đỏ | Count luôn `0`, ghi ở Key Insights |
| Gõ tay w/h ảnh | Trung bình | Thấp–Trung bình | `BADGE_SLOTS` đọc từ `evidence/asset-dimensions.md`, số không lặp ở JSX |
| Tự build feed "cho giống design" | Trung bình | Cao — vượt scope, kéo theo chip Spam vào DOM | Out of scope đầu file; success criteria đếm 0 feed card |
| Vẽ lại dòng `362:5064` vì thấy design có | Trung bình | Trung bình — C3 đỏ | GUI_009: trạng thái spec định nghĩa, không phải thiếu sót; thấy bằng chứng ngược thì **dừng lại báo** |

## Security Considerations

- Không component nào gọi Supabase, `fetch`, hay đọc cookie — dữ liệu vào 100% qua props từ phase 07.
- **Component chỉ nhận `ProfileCard` (`id`, `fullName`, `avatarUrl`)** — không nhận, không render `email`/`role` (SEC_004). Nếu prop nào mang thêm trường, đó là lỗi hợp đồng, báo lại chứ đừng render.
- `avatarUrl` là URL do bên thứ 3 cấp: render trong `src/` (`<img>`), **không** nhúng vào `style`/`background-image` bằng chuỗi ghép, **không** `dangerouslySetInnerHTML`.
- 2 control `disabled` là `disabled` thật ở tầng DOM, không phải chỉ đổi màu — click không được có handler nào phía sau.

## Next Steps

Mở khoá phase 07 (`page.tsx` + client boundary). Cần phase 01 (hợp đồng DOM), 02 (chrome đã promote) và 04 (asset + shape i18n) đã đóng trước khi bắt đầu. Chạy song song được với phase 06.
