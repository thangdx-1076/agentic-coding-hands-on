---
status: draft
authored_by: takumi
created: 2026-09-06
---

# SCR-home — Screen Spec

**Screen**: SCR-home (draft — SCR### số thật cấp lúc promote): Trang chủ SAA 2025
**Feature**: F000_Homepage (F003 provisional)
**Type**: composite
**Route**: /
**Generated**: 2026-09-06

## 1. Overview

**Purpose:** Trang chủ công khai của SAA 2025 — nơi bất kỳ khách truy cập nào (đã hoặc chưa đăng
nhập) xem thông tin sự kiện, đếm ngược, danh sách giải thưởng, quảng bá Sun* Kudos, và điều hướng
tới các trang liên quan.
**Actors:** Khách truy cập (Anonymous), Thành viên (Authenticated member), Quản trị viên
(Authenticated admin)
**Entry Conditions:** Không có điều kiện nào — public, không guard (xem `technical-spec.md` § 4.4
Bin 3, action A0).
**Exit Conditions:** Người dùng rời trang qua 1 trong các link điều hướng (Awards Information,
Sun* Kudos, Tiêu chuẩn chung, Hồ sơ, Trang quản trị, Đăng nhập) hoặc đăng xuất (về `/login`); ở
lại trang cũng là một trạng thái "done" hợp lệ — không có hành động bắt buộc nào.

## 2. Screen Layout

### Layout Sketch

Trang chia 8 vùng theo chiều dọc: header sticky bán trong suốt trên cùng, hero toàn màn với đếm
ngược, khối thông tin sự kiện + CTA, đoạn nội dung Root Further, lưới 6 thẻ giải thưởng, khối
quảng bá Sun* Kudos, footer ở cuối, và widget nổi cố định góc dưới phải xuyên suốt (không thuộc
luồng cuộn) (`data/preview.png`, 1512×4480).

```
┌─────────────────────────────────────────┐
│  R1: Header (sticky-top, bán trong suốt)│
├─────────────────────────────────────────┤
│  R2: Hero + Đếm ngược (static)          │
├─────────────────────────────────────────┤
│  R3: Thông tin sự kiện + CTA            │
├─────────────────────────────────────────┤
│  R4: Root Further content               │
├─────────────────────────────────────────┤
│  R5: Lưới 6 thẻ giải thưởng             │
├─────────────────────────────────────────┤
│  R6: Sun* Kudos promo                   │
├─────────────────────────────────────────┤
│  R7: Footer                             │
└─────────────────────────────────────────┘
   - - - R8: Widget nổi (fixed bottom-right, luôn hiện) - - -
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | sticky-top | no | HomeHeader, LanguageSelector (F002), NotificationBell, AccountMenu |
| R2 | Hero + Đếm ngược | static | yes (cuộn theo trang) | CountdownTimer |
| R3 | Thông tin sự kiện + CTA | static | yes | HeroCta |
| R4 | Root Further content | static | yes | (thuần văn bản) |
| R5 | Lưới giải thưởng | static | yes | AwardCard × 6 |
| R6 | Sun* Kudos promo | static | yes | (thuần văn bản + ảnh) |
| R7 | Footer | static | yes | HomeFooter |
| R8 | Widget hành động nhanh | fixed bottom-right | no | WidgetButton |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Logo | image/link | — | — | Always | Về `/`, cuộn lên đầu nếu đang active | static | raw | — | binding: `home.logo` |
| E02 | About SAA 2025 (nav) | link | — | Enabled | Always | Cuộn lên đầu nếu active, khác thì điều hướng `/` | static | raw | — | N/A |
| E03 | Awards Information (nav) | link | — | Enabled | Always | Điều hướng `/awards` | static | raw | — | N/A |
| E04 | Sun* Kudos (nav) | link | — | Enabled | Always | Điều hướng `/kudos` | static | raw | — | N/A |
| E05 | Language selector | button | — | "VN" | Always | Mở menu VN/EN (F002, tái dùng — không re-spec ở đây) | static | raw | — | N/A |
| E06 | Đăng nhập (link, khách) | link | — | Enabled | Conditional (Anonymous) | Điều hướng `/login` | computed | raw | — | N/A |
| E07 | Bell (thông báo) | button | — | Enabled | Conditional (Authenticated) | Mở panel rỗng | computed | raw | — | N/A |
| E08 | Account menu button | button | — | Enabled | Conditional (Authenticated) | Mở menu Hồ sơ/Đăng xuất/Trang quản trị | computed | raw | — | binding: `role` |
| E09 | Hero title "ROOT FURTHER" | display field | — | — | Always | — | static | raw | — | N/A |
| E10 | "Coming soon" label | display field | — | — | Conditional (chưa tới mốc) | — | computed | raw | dash | N/A |
| E11 | Countdown (DAYS/HOURS/MINUTES) | display field | — | 00/00/00 | Always | — | computed | 2-digit pad | — | binding: `EVENT_START_AT` |
| E12 | Thông tin sự kiện | display field | — | — | Always | — | static | raw | — | N/A |
| E13 | ABOUT AWARDS (CTA) | button/link | — | Enabled | Always | Điều hướng `/awards` | static | raw | — | N/A |
| E14 | ABOUT KUDOS (CTA) | button/link | — | Enabled | Always | Điều hướng `/kudos` | static | raw | — | N/A |
| E15 | Root Further content | display field | — | — | Always | — | static | raw | — | N/A |
| E16 | 6 thẻ giải thưởng (ảnh+tiêu đề+mô tả+Chi tiết) | card (group) | — | — | Always | Điều hướng `/awards#<slug>` | static | line-clamp-2 (mô tả) | — | N/A |
| E17 | Sun* Kudos promo + Chi tiết | card | — | Enabled | Always | Điều hướng `/kudos` | static | raw | — | N/A |
| E18 | Footer nav (4 link) + bản quyền | link group | — | Enabled | Always | Điều hướng tương ứng / về `/` | static | raw | — | N/A |
| E19 | Widget button | button | — | Enabled | Always | Mở menu 2 mục (Kudos, Awards) | static | raw | — | N/A |

Cap 25 nhưng nhóm 6 thẻ giải thưởng gộp thành 1 dòng (E16) theo note template "repetitive groups
collapse to one row" — 6 thẻ giống cấu trúc, chỉ khác nội dung (tiêu đề/mô tả/slug).

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Mở menu tài khoản | E08 | click / Enter / Space | đã đăng nhập | `[role="menu"]` mở | `components/home/account-menu.tsx` (planned) |
| Mở panel thông báo | E07 | click | đã đăng nhập | `[role="dialog"]` mở, rỗng | `components/home/notification-bell.tsx` (planned) |
| Mở menu widget | E19 | click / Enter / Space | luôn khả dụng | `[role="menu"]` 2 mục mở | `components/home/widget-button.tsx` (planned) |
| Cuộn lên đầu | E01, E02 | click khi đang active | `pathname === href` | cuộn mượt lên đầu, không tải lại | `components/home/nav-link.tsx` (planned) |

### Happy Path

1. Khách vào `/`, thấy hero + đếm ngược + toàn bộ nội dung công khai.
2. Khách click 1 thẻ giải thưởng (ảnh, tiêu đề, hoặc "Chi tiết") — điều hướng `/awards#<slug>`.
3. (Nếu đã đăng nhập) khách mở menu tài khoản, chọn "Đăng xuất" — về `/login`.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Click logo/nav "About SAA 2025" | đang active (`pathname === href`) | Cuộn lên đầu, không điều hướng lại | `components/home/nav-link.tsx` (planned) |
| Mở menu tài khoản | `role === "admin"` | Thêm mục "Trang quản trị" | `components/home/account-menu.tsx` (planned) |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| empty (bell panel) | click bell, 0 thông báo | "Bạn chưa có thông báo" | đóng panel | `components/home/notification-bell.tsx` (planned) |
| error (đọc role) | Supabase lỗi/không có row | fail-open `role: "member"`, không hiển thị lỗi cho user | — | `lib/auth/get-current-user-role.ts` (planned) |
| success (đếm ngược về 0) | `nowMs >= targetMs` | 3 ô giữ `00/00/00`, ẩn "Coming soon" | — | `hooks/use-countdown.ts` (planned) |

N/A phần loading/saving — Server Component không có async fetch phía client cho nội dung chính;
không có hành động nào ghi dữ liệu trên màn hình này.

## 6. Validation & Feedback

N/A — không có form nhập liệu nào trên màn hình này (thuần hiển thị + điều hướng).

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Bell + Account menu button | auth | E07, E08 | Authenticated | Anonymous | Anonymous thấy E06 (link đăng nhập) thay thế |
| "Trang quản trị" trong account menu | auth | (mục con của E08) | `role === "admin"` | `role === "member"` hoặc fail-open | Không phải feature-flag — dữ liệu từ `public.users.role` |
| "Coming soon" label | hardcoded-id | E10 | chưa tới `EVENT_START_AT` | đã tới/qua mốc | Hành vi đã chốt ở `clarifications.md`, không còn là câu hỏi mở |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external — bất kỳ URL nào | truy cập trực tiếp `/` | không có điều kiện (public) | — |
| `/login` (F001) | đăng nhập thành công / đã có session | mặc định landing sau đăng nhập | `app/login/login-client.tsx` (F001, planned edit) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Click "Awards Information" | E03 | — | external (`/awards`, chưa implement) | redirect | `components/home/home-header.tsx` (planned) |
| Click "Sun* Kudos" | E04 | — | external (`/kudos`, chưa implement) | redirect | `components/home/home-header.tsx` (planned) |
| Click thẻ giải thưởng | E16 | — | external (`/awards#<slug>`, chưa implement) | redirect | `components/home/award-card.tsx` (planned) |
| Click "Chi tiết" (Kudos) | E17 | — | external (`/kudos`, chưa implement) | redirect | (planned) |
| Click "Tiêu chuẩn chung" (footer) | E18 | — | external (`/standards`, chưa implement) | redirect | `components/home/home-footer.tsx` (planned) |
| Chọn "Hồ sơ" | (con của E08) | đã đăng nhập | external (`/profile`, chưa implement) | redirect | (planned) |
| Chọn "Trang quản trị" | (con của E08) | `role === "admin"` | external (`/admin`, chưa implement) | redirect | (planned) |
| Chọn "Đăng xuất" | (con của E08) | đã đăng nhập | `/login` | redirect (submit `logoutAction`, đã có) | `app/todo/actions.ts` (đã có, tái dùng) |
| Click "Đăng nhập" (khách) | E06 | Anonymous | `/login` | redirect | (planned) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | `aria-haspopup="menu"`/`"dialog"`, `role="menu"`/`"menuitem"`/`"dialog"`, `aria-label` cho mọi nút icon (theo `clarifications.md`: "Đăng nhập", "Tài khoản", "Thông báo", "Hành động nhanh", "Chi tiết <tên giải>") |
| Keyboard navigation | [EXPECTED] | Mọi menu qua `useMenuKeyboardNav` (đã có) — Enter/Space mở, ArrowDown/Up di chuyển vòng, Esc đóng + trả focus |
| Focus management | [EXPECTED] | Roving tabindex trong menu; trả focus về trigger khi Esc |
| Screen reader compatibility | [EXPECTED] | Chưa audit thật — greenfield, kế hoạch rõ ràng ở trên |
| Error announcement | [EXPECTED] | Không có form nên không có lỗi validate cần `aria-live` |

## 10. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| <768px | R1 (Header) | Nav link xuống hàng dưới logo; controls (E05-E08) giữ bên phải — không có hamburger (không có trong design) | (planned) |
| <1024px | R5 (lưới giải thưởng) | Grid 2 cột (tablet lẫn mobile) | (planned) |
| ≥1024px | R5 (lưới giải thưởng) | Grid 3 cột | (planned) |
