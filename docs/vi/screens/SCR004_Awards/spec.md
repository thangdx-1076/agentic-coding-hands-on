---
status: implemented
authored_by: takumi
created: 2026-09-06
fcode: F004
---

# SCR004_Awards — Screen Spec

**Screen**: SCR004_Awards: Hệ thống giải thưởng SAA 2025
**Feature**: F004_AwardSystemPage
**Type**: composite
**Route**: /awards
**Generated**: 2026-09-07

## 1. Overview

**Purpose:** Trang công khai trình bày đầy đủ 6 hạng mục giải thưởng SAA 2025 (tiêu đề, mô tả,
số lượng, giá trị) mà `/` (F003) chỉ giới thiệu tóm tắt qua thẻ; cung cấp nav trái điều hướng
nội-trang và một khối quảng bá Sun* Kudos ở cuối.
**Actors:** Khách truy cập (Anonymous), Thành viên/Quản trị viên (Authenticated) — nội dung không
cá nhân hoá theo vai trò, chỉ header nhận biết trạng thái đăng nhập giống F003.
**Entry Conditions:** Không có điều kiện nào — public, không guard (`docs/vi/system/permissions.md`
§ `/awards` là PUBLIC).
**Exit Conditions:** Người dùng rời trang qua 1 trong các link điều hướng (Đăng nhập khi ẩn danh,
Đăng xuất khi đã đăng nhập, Chi tiết Kudos → `/kudos`) hoặc điều hướng ra khỏi trang; ở lại trang
cũng là một trạng thái "done" hợp lệ.

## 2. Screen Layout

### Layout Sketch

Trang chia 6 vùng theo chiều dọc: header sticky dùng chung với F003, khối hero (ảnh trang trí +
caption + h1), vùng nav+6 section giải (hoặc empty-state khi rỗng), khối Sun* Kudos, footer dùng
chung.

```
┌─────────────────────────────────────────┐
│  R1: Header (sticky-top, dùng chung F003)│
├─────────────────────────────────────────┤
│  R2: Hero (ảnh trang trí + caption + h1) │
├─────────────────────────────────────────┤
│  R3: Nav trái (sticky, sidebar ↔ chip)   │
│      + 6 section giải (hoặc empty-state)│
├─────────────────────────────────────────┤
│  R4: Sun* Kudos promo (dùng chung F003) │
├─────────────────────────────────────────┤
│  R5: Footer (dùng chung F003)           │
└─────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|-----------------|
| R1 | Header | sticky-top | no | SiteHeader (dùng chung F003), LanguageSelector (F002), NotificationBell, AccountMenu |
| R2 | Hero | static | yes | ảnh trang trí (tái dùng từ F003), caption, `<h1>` |
| R3 | Nav + 6 section giải | nav: sticky; section: static | yes | AwardCategoryNav, AwardSection × 6, hoặc AwardsEmptyState |
| R4 | Sun* Kudos promo | static | yes | KudosSection (dùng chung F003, không đổi) |
| R5 | Footer | static | yes | SiteFooter (dùng chung F003) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Header (logo, nav, ngôn ngữ, bell/account hoặc đăng nhập) | group | — | — | Always | Như SCR003_Home | shared | raw | — | binding: `SiteHeader`, dùng chung F003 |
| E02 | Ảnh hero trang trí | image | — | — | Always | — | static | raw (decorative, `alt=""`) | — | tái dùng `/home/Root_Further_Logo.png` |
| E03 | Caption "Sun* Annual Awards 2025" | display field | — | — | Always | — | static | raw | — | binding: `awards.caption` |
| E04 | `<h1>` "Hệ thống giải thưởng SAA 2025" | display field | — | — | Always | — | static | raw | — | binding: `awards.heading` |
| E05 | Nav danh mục 6 mục (`aria-label="Danh mục giải thưởng"`) | nav (group) | — | mục đầu active | Conditional (`awards` không rỗng) | Click cuộn tới section; scroll-spy tự cập nhật active | computed | raw | Ẩn khi `awards=[]` (E10 hiện thay) | binding: `AwardCategoryNav` |
| E06 | 6 section giải (ảnh+h2+mô tả+số lượng+giá trị) | card (group) | — | — | Conditional (`awards` không rỗng) | — | computed | mô tả `white-space: pre-line` | Ẩn khi `awards=[]` | binding: `AwardSection` |
| E07 | Sun* Kudos promo + Chi tiết | card | — | Enabled | Always | Điều hướng `/kudos` | static | raw | — | tái dùng nguyên `KudosSection` F003 |
| E08 | Footer nav + bản quyền | link group | — | Enabled | Always | Như SCR003_Home | shared | raw | — | binding: `SiteFooter`, dùng chung F003 |
| E09 | Đăng nhập (link, khách) / Bell + Account menu (đã đăng nhập) | link/button | — | — | Conditional (theo trạng thái đăng nhập) | Như SCR003_Home | computed | raw | — | binding: `SiteHeader`, dùng chung F003 |
| E10 | Empty-state ("Hiện chưa có thông tin giải thưởng.") | display field | — | — | Conditional (`awards=[]`) | — | computed | raw | Đây CHÍNH LÀ empty behavior của E05/E06 | binding: `AwardsEmptyState` |

Cap 25 nhưng nhóm 6 section giải gộp thành 1 dòng (E06) theo note template "repetitive groups
collapse to one row" — 6 section giống cấu trúc, chỉ khác nội dung (tiêu đề/mô tả/số lượng/giá
trị/slug) và layout xen kẽ trái-phải theo index.

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Click mục nav | E05 | click | `awards` không rỗng | Cuộn mượt (hoặc tức thời nếu `prefers-reduced-motion`) tới section tương ứng; mục đó `aria-current="true"` | `src/app/(public)/awards/_components/award-category-nav.tsx` |
| Cuộn tay qua các section | E06 | scroll | `awards` không rỗng | Scroll-spy tự cập nhật mục active trong E05 theo vị trí cuộn thực tế | `src/app/(public)/awards/_hooks/use-award-category-nav.ts` |
| Click "Chi tiết" (Kudos) | E07 | click | luôn khả dụng | Điều hướng `/kudos` (chưa implement, hiện 404) | `src/app/(public)/_components/kudos-section.tsx` |
| Mở menu tài khoản / bell / đăng xuất | E09 | click | đã đăng nhập | Như SCR003_Home (dùng chung `SiteHeader`) | `src/app/(public)/_components/site-header.tsx` |

### Happy Path

1. Khách vào `/awards` (trực tiếp, từ CTA "ABOUT AWARDS" ở `/`, hoặc từ thẻ giải trên `/`), thấy
   ngay header + hero + nav trái + section đầu tiên, không cần đăng nhập.
2. Khách click 1 mục nav hoặc tự cuộn — trang cuộn tới đúng section, nav cập nhật active theo.
3. Khách cuộn tới cuối trang, thấy khối Sun* Kudos, click "Chi tiết" (dẫn `/kudos`, hiện 404 cho
   tới khi trang đó được xây ở phiên khác).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Render nav + 6 section, hay empty-state | `awards.length > 0` | `>0`: nav + section; `=0`: `AwardsEmptyState` thay thế toàn bộ vùng đó | `_components/awards-screen.tsx` |
| Layout ảnh trái/phải của mỗi section | `index % 2 === 1` (mục 2,4,6) | Ảnh phải/nội dung trái (đảo chiều `lg:flex-row-reverse`); mục 1,3,5 giữ ảnh trái | `_components/award-section.tsx` |
| Smooth scroll hay jump tức thời | `prefers-reduced-motion: reduce` | `reduce` bật → `scrollIntoView({behavior: "auto"})`; mặc định → `"smooth"` | `_hooks/use-award-category-nav.ts` |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| empty (nội dung giải) | `getAwards` trả `[]` (Supabase lỗi/không có dòng cho locale) | `AwardsEmptyState` hiện 1 đoạn text trong khung; header/hero/Kudos/footer vẫn render bình thường | không có (chỉ đọc) | `_components/awards-empty-state.tsx` |
| active nav item | click hoặc scroll-spy | Đúng 1 mục trong E05 mang `aria-current="true"`, style nhấn (border + text-shadow vàng) | click mục khác | `_components/award-category-nav.tsx` |
| scroll-lock tạm thời | vừa click 1 mục nav | Scroll-spy tạm ngưng ghi đè `activeSlug` cho tới khi cuộn xong (sự kiện `scrollend` hoặc 700ms fallback) | — | `_hooks/use-award-category-nav.ts` |

N/A phần loading/saving — Server Component không có async fetch phía client cho nội dung chính;
không có hành động nào ghi dữ liệu trên màn hình này.

## 6. Validation & Feedback

N/A — không có form nhập liệu nào trên màn hình này (thuần hiển thị + điều hướng).

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Nav + 6 section vs. empty-state | data-availability | E05, E06 vs. E10 | `awards.length > 0` | `awards.length === 0` | Không phải feature-flag — kết quả DAL fail-open |
| Bell + Account menu vs. link Đăng nhập | auth | E09 | Authenticated | Anonymous | Dùng chung `SiteHeader` với SCR003_Home, hành vi giống hệt |
| Layout ảnh trái/phải mỗi section | hardcoded-id | (con của E06) | index chẵn (1,3,5): ảnh trái | index lẻ (2,4,6): ảnh phải | Không phải điều kiện runtime — cố định theo thứ tự `sort_order` |

## 8. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [IMPLEMENTED] | `nav[aria-label="Danh mục giải thưởng"]`, `aria-current="true"` trên mục active, `alt=""`/`aria-hidden="true"` trên ảnh trang trí |
| Keyboard navigation | [IMPLEMENTED] | Mỗi mục nav là `<a href="#slug">` chuẩn (Tab/Enter hoạt động qua trình duyệt, không cần custom keydown handler) |
| Focus management | [IMPLEMENTED] | `focus-visible:ring-2` trên mỗi link nav |
| Reduced motion | [IMPLEMENTED] | `matchMedia("(prefers-reduced-motion: reduce)")` chuyển `scrollIntoView` từ `"smooth"` sang `"auto"` |
| Screen reader compatibility | [EXPECTED] | Chưa audit thật riêng cho `/awards` — kế thừa cùng pattern đã dùng ở SCR003_Home |

## 9. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| <1024px (`lg`) | E05 (nav) | Thanh chip cuộn ngang, sticky dưới header (`top-[72px]`) | `award-category-nav.tsx` |
| ≥1024px (`lg`) | E05 (nav) | Sidebar sticky bên trái (`top-24`, `w-[240px]`), cột dọc | `award-category-nav.tsx` |
| <1024px (`lg`) | E06 (mỗi section) | Ảnh và nội dung xếp dọc, ảnh luôn ở trên (`flex-col`) | `award-section.tsx` |
| ≥1024px (`lg`) | E06 (mỗi section) | Ảnh và nội dung xếp ngang, xen kẽ trái/phải theo index (`lg:flex-row` / `lg:flex-row-reverse`) | `award-section.tsx` |

## 10. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external — bất kỳ URL nào | truy cập trực tiếp `/awards` | không có điều kiện (public) | — |
| SCR003_Home (`/`) | click CTA "ABOUT AWARDS", hoặc click 1 trong 6 thẻ giải trên trang chủ | không có điều kiện | `docs/vi/generated/screen-flow.md` (cần bổ sung cạnh này — xem § Reconcile job 4) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Click "Chi tiết" (Kudos) | E07 | — | external (`/kudos`, chưa implement) | 404 | `_components/kudos-section.tsx` |
| Click "Đăng nhập" (khách) | E09 | Anonymous | `/login` | redirect | `site-header.tsx` |
| Chọn "Đăng xuất" | E09 | đã đăng nhập | `/login` | redirect (submit `logoutAction`, dùng chung F001/F003) | `src/app/_actions/logout.ts` |
