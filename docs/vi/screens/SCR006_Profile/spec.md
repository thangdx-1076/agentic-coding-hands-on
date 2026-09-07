---
status: implemented
authored_by: takumi
created: 2026-09-07
fcode: F006
---

# SCR006_Profile — Screen Spec

**Screen**: SCR006_Profile: Hồ sơ Sunner
**Feature**: F006_ProfilePage
**Type**: atomic
**Route**: /profile
**Generated**: 2026-09-07

**Composite classification (2-of-3 gate):** atomic. H1 (feature refs) fail — chỉ 1 F### tự sở
hữu route này. H2 (domain-module imports) fail — không import nào khớp `features/*`/`modules/*`.
H3 (semantic region wrappers): 1 `<main>` + 1 `<section>` (khối KUDOS) — dưới ngưỡng 3. 0/3 → 1/3
→ atomic, không phát sinh `REG###`.

## 1. Overview

**Purpose:** Trang hồ sơ Sunner có gác đăng nhập — hiển thị hồ sơ của chính người xem (`/profile`)
hoặc của một Sunner khác (`/profile?id={uuid}`), thay cho link chết "Hồ sơ" trước đó ở menu tài
khoản. Mọi bề mặt phụ thuộc hệ Kudos (chưa tồn tại) render trạng thái honest rỗng/disabled — cùng
nguyên tắc Secret Box mà SCR005_Standards đã lập tiền lệ.
**Actors:** Sunner đã đăng nhập (self hoặc other) — khách chưa đăng nhập không bao giờ chạm route
này (`(protected)/layout.tsx` chặn trước, redirect `/login`).
**Entry Conditions:** Đã đăng nhập (bắt buộc — route nằm trong nhóm `(protected)`, dùng lại đúng
gate của `/todo`). `?id=` optional: rỗng/vắng mặt → self; UUID hợp lệ khác chính mình → other;
UUID trùng chính mình → redirect canonical về `/profile`; sai định dạng hoặc lặp key → 404.
**Exit Conditions:** Không có nút thoát chuyên dụng nào trên trang (khác SCR005) — người dùng rời
qua điều hướng chung (`SiteHeader`/`SiteFooter`, menu tài khoản "Đăng xuất").

## 2. Screen Layout

### Layout Sketch

Khung nền tối `#00101A`, đầy đủ chrome (`SiteHeader`/`SiteFooter`, biến thể "đã đăng nhập") — khác
SCR005 (không chrome). Nội dung chính căn giữa theo cột, cuộn dọc toàn trang (không panel cuộn
riêng như SCR005).

```
┌─────────────────────────────────────────────┐
│  R1: SiteHeader (đã đăng nhập)                │
├─────────────────────────────────────────────┤
│  R2: Hero full-bleed (keyvisual + avatar +    │
│      tên), không dòng dept/tier/stars         │
│  R3: 6 ô badge khoá (1 hàng) + tiêu đề dưới    │
│  R4: Statistics card (self) HOẶC thanh "Viết   │
│      Kudo" (other) — loại trừ lẫn nhau         │
│  R5: Header "KUDOS" + dropdown chiều Kudos     │
│      + copy rỗng theo chiều đang chọn          │
├─────────────────────────────────────────────┤
│  R6: SiteFooter                               │
└─────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|-----------------|
| R1 | Header dùng chung | sticky top | no | `SiteHeader` (biến thể đã đăng nhập, luôn — anonymous không tới được route này) |
| R2 | Hero | top của `<main>` | trong dòng chảy trang | `ProfileHero` |
| R3 | Bộ sưu tập huy hiệu | giữa hero và statistics card | trong dòng chảy trang | `BadgeCollection` |
| R4 | Slot thống kê/Viết Kudo | dưới bộ sưu tập | trong dòng chảy trang | `ProfileStatisticsCard` |
| R5 | Khối KUDOS | dưới R4 | trong dòng chảy trang | heading "KUDOS", `KudosDirectionSelect` |
| R6 | Footer dùng chung | cuối `<main>` | no | `SiteFooter` |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | `SiteHeader` (biến thể đã đăng nhập) | header | — | — | Always | logo/nav/bell/`VN` switcher/menu tài khoản | injected | raw | — | `_components/site-header.tsx`, dùng chung `/`, `/awards` |
| E02 | Avatar tròn (200×200) | image | — | placeholder `#323231` nếu `avatarUrl` null | Always | — | `profile_cards.avatar_url` | `<img>` (không dùng `next/image`, xem note) | ô tròn xám trơn | `_components/profile-hero.tsx` |
| E03 | Tên hồ sơ (h1) | display field | — | `copy.hero.fallbackName` ("Sunner") nếu `fullName` null | Always | — | `profile_cards.full_name` | raw | fallback "Sunner" | `_components/profile-hero.tsx` |
| E04 | 6 ô badge (ảnh + `data-locked`) | card (group) | — | — | Always | — | static, luôn `data-locked="true"` | ảnh xám (`grayscale`) | — | binding: `BADGE_SLOTS` × 6, tái dùng 6 PNG badge của F005 (`public/standards/badge-*.png`) |
| E05 | Tiêu đề bộ sưu tập | display field | — | — | Always | — | computed theo `isSelf` | raw | — | self: "Bộ sưu tập icon của tôi"; other: "Bộ sưu tập icon" (không chèn tên) |
| E06 | Statistics card (5 dòng + nút) | card (group) | — | — | Chỉ self | nút "Mở Secret Box 🎁" luôn `disabled` | static (giá trị luôn `0`) | raw | — | `_components/profile-statistics-card.tsx` |
| E07 | Thanh "Viết Kudo" | button | — | Enabled visually, `disabled` thực | Chỉ other (thay thế toàn bộ E06) | click không hiệu ứng (không handler) | static | raw | — | `_components/profile-statistics-card.tsx` |
| E08 | Heading "KUDOS" + eyebrow | display field | — | — | Always | — | static (eyebrow tái dùng `copy.header.logoAlt`) | raw | — | `_components/profile-screen.tsx` |
| E09 | Dropdown chiều Kudos | combobox | — | `received` | Always | Click mở/đóng danh sách; chọn đổi copy rỗng | client state (`useState`) | raw, trigger `{Nhãn} (0)` | — | `_components/kudos-direction-select.tsx`; self 2 option, other chỉ 1 |
| E10 | Copy trạng thái rỗng | display field | — | — | Always | — | static theo chiều đang chọn | raw | luôn hiển thị (không phải danh sách trống im lặng) | `emptyReceived`/`emptySent` |
| E11 | `SiteFooter` | footer | — | — | Always | — | injected | raw | — | dùng chung `/`, `/awards` |

Cap 25 nhưng E04 (6 ô badge) gộp thành 1 dòng theo note template "repetitive groups collapse to
one row" — cấu trúc lặp lại giống hệt, chỉ khác artwork.

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Click nút combobox Kudos | E09 | click/Enter/Space | luôn khả dụng | Mở/đóng danh sách option (roving-tabindex, `useMenuKeyboardNav`) | `_components/kudos-direction-select.tsx` |
| Chọn 1 option trong danh sách | E09 | click option | danh sách đang mở | Đổi `selected`, đóng danh sách, đổi copy rỗng (E10) hiển thị — không network call | `_components/kudos-direction-select.tsx` |
| Click "Mở Secret Box 🎁" (self) | E06 | click | luôn `disabled` | Không hiệu ứng — không handler gắn, không modal | `_components/profile-statistics-card.tsx` |
| Click "Viết Kudo" (other) | E07 | click | luôn `disabled` | Không hiệu ứng — không handler gắn, không modal | `_components/profile-statistics-card.tsx` |

### Happy Path

1. Sunner đã đăng nhập click "Hồ sơ" trong menu tài khoản (hoặc gõ `/profile` trực tiếp) → thấy
   hồ sơ mình: tên + avatar, 6 ô badge khoá, statistics card 5 dòng `0`.
2. Sunner mở `/profile?id={uuid}` của một đồng nghiệp → thấy tên + avatar người đó, dropdown chỉ
   còn "Đã nhận", thanh "Viết Kudo" disabled thay cho statistics card.
3. Sunner đổi chiều dropdown Kudos → copy rỗng tương ứng hiển thị lại, không có gì để tải.
4. Sunner rời trang qua điều hướng chung (menu tài khoản, logo, nav) — không có nút "Đóng" riêng.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Phân giải `?id=` | rỗng/vắng mặt | Self view | `_utils/parse-profile-id.ts` (`kind: "self"`) |
| Phân giải `?id=` | không phải string (lặp key, vd `?id=a&id=b`) | `notFound()` (404) | `_utils/parse-profile-id.ts` (`kind: "reject"`) |
| Phân giải `?id=` | không khớp regex UUID | `notFound()` (404) — chặn TRƯỚC khi query, tránh Postgres `22P02` | `_utils/parse-profile-id.ts` (`kind: "reject"`) |
| Phân giải `?id=` | UUID hợp lệ, trùng chính người xem | `redirect("/profile")` (bỏ query) | `_utils/parse-profile-id.ts` (`kind: "canonical"`) |
| Phân giải `?id=` | UUID hợp lệ, khác self, không có hàng `profile_cards` | `notFound()` (404) | `page.tsx` (`getProfileCard` trả `null`) |
| Slot thống kê | `isSelf` | `true`: statistics card 5 dòng + nút Secret Box; `false`: CHỈ thanh "Viết Kudo", loại trừ lẫn nhau | `_components/profile-statistics-card.tsx` |
| Danh sách chiều Kudos | `isSelf` | `true`: `["received","sent"]`; `false`: `["received"]` (Sent bị BỎ HẲN, không phải ẩn) | `_components/profile-screen.tsx` |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| self view | không `?id=` hoặc `?id=` trùng self (sau redirect) | Statistics card + nút Secret Box disabled; dropdown 2 chiều | chọn chiều Kudos | `page.tsx` |
| other view | `?id=` UUID hợp lệ, khác self, có hàng | Thanh "Viết Kudo" disabled thay statistics card; dropdown 1 chiều (Received) | chọn chiều Kudos (chỉ 1 lựa chọn) | `page.tsx` |
| dropdown mở | click nút combobox | Danh sách option hiện, mũi tên xoay 180° | chọn option, Esc đóng, click ngoài đóng | `_components/kudos-direction-select.tsx` |
| dropdown đóng | mặc định / sau khi chọn | Chỉ trigger hiển thị | click mở lại | `_components/kudos-direction-select.tsx` |
| avatar rỗng | `profile_cards.avatar_url` null | Ô tròn nền `#323231` trơn thay ảnh | — | `_components/profile-hero.tsx` |
| tên rỗng | `profile_cards.full_name` null | Hiển thị fallback "Sunner" | — | `_components/profile-hero.tsx` |

N/A phần loading/saving — không async fetch phía client, không action nào ghi dữ liệu. 2 nút
disabled (Secret Box, Viết Kudo) disabled VĨNH VIỄN, không điều kiện runtime nào bật (BR-002).

## 6. Validation & Feedback

N/A — không có form nhập liệu nào trên màn hình này. Phân giải `?id=` (§ 4 Branches) là validation
duy nhất, xảy ra phía server trước khi trang render — không có thông báo lỗi inline nào, chỉ
`notFound()`/`redirect()`.

## 7. Conditional UI

Toàn bộ khác biệt self/other tập trung ở 3 chỗ, không có nhánh nào khác:
- E06/E07 (slot thống kê) loại trừ lẫn nhau theo `isSelf`.
- E05 (tiêu đề bộ sưu tập) đổi text theo `isSelf`.
- E09 (dropdown) đổi số lượng option theo `isSelf` — "Sent" bị BỎ HẲN khỏi mảng `directions` trên
  hồ sơ người khác (SEC_001), không phải render rồi `disabled`/`hidden`, xác nhận được bằng đếm số
  `role="option"` trong DOM.

Dòng department + Hero tier + hoa-thị stars (có trong design, node `362:5056`) bị BỎ HẲN toàn bộ,
không phải một nhánh điều kiện — `public.users` chưa có cột nguồn (GUI_009, xem
`docs/vi/features/F006_ProfilePage/functional-spec.md` § 11 RISK-02).

## 8. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [IMPLEMENTED] | `<h1>` tên hồ sơ, `<h2>` tiêu đề bộ sưu tập + heading "KUDOS"; dropdown dùng `role="combobox"`/`role="listbox"`/`role="option"` (không phải menu pattern của `LanguageSelector`) |
| Keyboard navigation | [IMPLEMENTED] | Dropdown dùng `useMenuKeyboardNav` (roving tabindex) — cùng hook `LanguageSelector`/`AccountMenu` đã dùng |
| Focus management | [IMPLEMENTED] | Nút combobox + option đều có `focus-visible:ring-2` |
| Reduced motion | [IMPLEMENTED] | `transition-transform`/`animate-login-menu-in` đều có biến thể `motion-reduce:transition-none` |
| Screen reader compatibility | [PARTIAL] | Avatar và ảnh badge đều `alt="" aria-hidden="true"` (thuần trang trí, tên đã có trong `<h1>` text riêng) — chấp nhận được vì không mất thông tin; KHÔNG có `aria-live` nào báo đổi copy rỗng khi chọn chiều dropdown (gap nhỏ, không nằm trong 18 TC in-scope của F006) |

## 9. Responsive Behavior

Không có ghi chú breakpoint cụ thể nào trong clarifications/test-case cho màn hình này ngoài
layout co giãn tự nhiên (Tailwind responsive, cùng tinh thần các screen khác) — implementer xác
nhận bằng Playwright visual capture ở 3 viewport (1440/768/375) khi Delivery, không suy diễn thêm
breakpoint cụ thể ở tài liệu này.

## 10. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR003_HomeScreen, SCR004_Awards (bất kỳ trang có `AccountMenu`) | Click "Hồ sơ" trong menu tài khoản | Đã đăng nhập | `_components/account-menu.tsx` (`home.account.profile` → `/profile`) |
| external — bất kỳ URL nào | truy cập trực tiếp `/profile` hoặc `/profile?id={uuid}` | Đã đăng nhập (không thì redirect `/login`) | — |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Click "Đăng xuất" trong menu tài khoản | E01 (`SiteHeader`) | Đã đăng nhập | `/login` | `logoutAction` (dùng chung, `src/app/_actions/logout.ts`) | `_components/site-header.tsx` |
| `?id=` trùng chính mình | — | UUID hợp lệ === id người xem | `/profile` (không tham số) | `redirect()`, không phải 1 click | `_utils/parse-profile-id.ts` |
| Anonymous cố truy cập | — | Chưa đăng nhập | `/login` | `redirect()` từ `(protected)/layout.tsx`, trước khi trang này render | `src/app/(protected)/layout.tsx` |

## 11. Verification Status

**Test policy:** `e2e-red-first` (chốt tại `clarifications.md`). Bằng chứng: `red-evidence.md` (RED
trước code — 404 vì route chưa tồn tại) → `green-evidence.md` (GREEN sau code — 22/22 test pass,
`tests/e2e/profile.spec.ts`, contract `[C1]`-`[C18]`, 18/30 TC MoMorph gốc trong phạm vi, 10 hoãn
sang F007+). **Giới hạn quan trọng**: CI (`ci.yml`) chỉ chạy `[C17]` (redirect ẩn danh, không cần
Supabase) — 21 test còn lại (`@auth`, cần session Supabase thật) chỉ chạy local, dấu tick xanh
trên PR KHÔNG xác nhận toàn bộ 22 test. Ảnh visual capture: `plans/260907-1224-profile-page/
evidence/visual-1440-{self,other}.png`.

Chi tiết đầy đủ contract `[C#]` ↔ TC MoMorph: `docs/vi/features/F006_ProfilePage/technical-spec.md`
§ 4.5.
