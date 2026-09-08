---
status: draft
authored_by: takumi
fcode: F003
created: 2026-09-08
---

# SCR003_Home — Screen Spec (revision: Widget Button trạng thái mở rộng)

**Screen**: SCR003_Home: Trang chủ SAA 2025
**Feature**: F003_Homepage
**Type**: composite
**Route**: /
**Generated**: 2026-09-08

**Revision note:** Bản sửa của `docs/vi/screens/SCR003_Home/spec.md` (`status: draft` gốc, số
`SCR###` thật đã cấp = `SCR003`). Chỉ vùng R8 (widget hành động nhanh) đổi — mọi vùng khác giữ
nguyên. Xem `plans/260908-1103-home-widget-fab/clarifications.md`.

## 1. Overview

**Purpose:** Trang chủ công khai của SAA 2025 — nơi bất kỳ khách truy cập nào (đã hoặc chưa đăng
nhập) xem thông tin sự kiện, đếm ngược, danh sách giải thưởng, quảng bá Sun* Kudos, và điều hướng
tới các trang liên quan.
**Actors:** Khách truy cập (Anonymous), Thành viên (Authenticated member), Quản trị viên
(Authenticated admin)
**Entry Conditions:** Không có điều kiện nào — public, không guard (xem `technical-spec.md` § 4.4
Bin 3, action A0).
**Exit Conditions:** Người dùng rời trang qua 1 trong các link điều hướng (Thể lệ, Viết KUDOS qua
widget hoặc footer, Award Information, Sun* Kudos, Hồ sơ, Trang quản trị, Đăng nhập) hoặc đăng
xuất (về `/login`); ở lại trang cũng là một trạng thái "done" hợp lệ — không có hành động bắt buộc
nào.

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
   - - - R8: Widget nổi (fixed bottom-right, pill/panel) - - -
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
| R8 | Widget hành động nhanh *(sửa ở revision này)* | fixed bottom-right | no | WidgetButton (trigger morph pill/× + panel 2 mục) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Logo | image/link | — | — | Always | Về `/`, cuộn lên đầu nếu đang active | static | raw | — | binding: `home.logo` |
| E02 | About SAA 2025 (nav) | link | — | Enabled | Always | Cuộn lên đầu nếu active, khác thì điều hướng `/` | static | raw | — | N/A |
| E03 | Award Information (nav) | link | — | Enabled | Always | Điều hướng `/awards` | static | raw | — | N/A |
| E04 | Sun* Kudos (nav) | link | — | Enabled | Always | Điều hướng `/kudos` | static | raw | — | N/A |
| E05 | Language selector | button | — | "VN" | Always | Mở menu VN/EN (F002, tái dùng — không re-spec ở đây) | static | raw | — | N/A |
| E06 | Đăng nhập (link, khách) | link | — | Enabled | Conditional (Anonymous) | Điều hướng `/login` | static | raw | — | N/A |
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
| E19 | Widget trigger (pill/×) *(sửa ở revision này)* | button | — | Enabled | Always | Click/Enter/Space mở panel; morph pill→× khi mở, ×→pill khi đóng | static | raw | — | binding: `aria-expanded` |
| E20 | Thể lệ (widget option) *(mới)* | link (menuitem) | — | Enabled | Conditional (panel mở) | Điều hướng `/standards` | static | raw | — | N/A |
| E21 | Viết KUDOS (widget option) *(mới)* | link (menuitem) | — | Enabled | Conditional (panel mở) | Điều hướng `/kudos` | static | raw | — | N/A |
| E22 | Trigger widget ở trạng thái MỞ (nút × đỏ) *(mới)* — **KHÔNG phải element riêng: chính là E19 sau morph, cùng một `<button>` DOM node** | button | — | Enabled | Conditional (panel mở) | Đóng panel, trả focus về trigger — không phải `menuitem`, đứng ngoài `[role="menu"]` | static | raw | — | N/A |

Cap 25: nhóm 6 thẻ giải thưởng gộp thành 1 dòng (E16, "repetitive groups collapse to one row");
2 option widget (E20/E21) tách dòng riêng vì khác hành vi/đích điều hướng, không lặp cấu trúc như
6 thẻ giải thưởng. E22 được cấp id riêng chỉ để mô tả *trạng thái mở* của E19 — trong DOM không
bao giờ tồn tại đồng thời hai `<button>`; xem BR-007.

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Mở menu tài khoản | E08 | click / Enter / Space | đã đăng nhập | `[role="menu"]` mở | `components/home/account-menu.tsx` |
| Mở panel thông báo | E07 | click | đã đăng nhập | `[role="dialog"]` mở, rỗng | `components/home/notification-bell.tsx` |
| Mở panel widget *(sửa ở revision này)* | E19 | click / Enter / Space | luôn khả dụng | `[role="menu"]` 2 `menuitem` (Thể lệ, Viết KUDOS) mở; trigger morph pill→× | `src/app/(public)/(home)/_components/widget-button.tsx` |
| Đóng panel widget (×) *(mới)* | E22 | click | panel đang mở | panel đóng; trigger morph ×→pill; focus trả về trigger | `src/app/(public)/(home)/_components/widget-button.tsx` |
| Cuộn lên đầu | E01, E02 | click khi đang active | `pathname === href` | cuộn mượt lên đầu, không tải lại | `components/home/nav-link.tsx` |

### Happy Path

1. Khách vào `/`, thấy hero + đếm ngược + toàn bộ nội dung công khai.
2. Khách click 1 thẻ giải thưởng (ảnh, tiêu đề, hoặc "Chi tiết") — điều hướng `/awards#<slug>`.
3. (Nếu đã đăng nhập) khách mở menu tài khoản, chọn "Đăng xuất" — về `/login`.
4. **(Mới)** Bất kỳ lúc nào, khách click widget góc dưới phải, chọn "Viết KUDOS" — điều hướng
   `/kudos`.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Click logo/nav "About SAA 2025" | đang active (`pathname === href`) | Cuộn lên đầu, không điều hướng lại | `components/home/nav-link.tsx` |
| Mở menu tài khoản | `role === "admin"` | Thêm mục "Trang quản trị" | `components/home/account-menu.tsx` |
| Đóng panel widget *(mới)* | click trigger lần 2 / click ngoài / Escape / click × | Cả 4 cách đều đóng panel + trả focus về trigger | `src/app/(public)/(home)/_components/widget-button.tsx` |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| empty (bell panel) | click bell, 0 thông báo | "Bạn chưa có thông báo" | đóng panel | `components/home/notification-bell.tsx` |
| error (đọc role) | Supabase lỗi/không có row | fail-open `role: "member"`, không hiển thị lỗi cho user | — | `lib/auth/get-current-user-role.ts` |
| success (đếm ngược về 0) | `nowMs >= targetMs` | 3 ô giữ `00/00/00`, ẩn "Coming soon" | — | `hooks/use-countdown.ts` |
| open (widget panel) *(mới)* | click / Enter / Space trên trigger | Trigger morph pill→×; panel 2 mục (Thể lệ, Viết KUDOS) hiện, neo phải/dưới cùng điểm với pill | Chọn mục / đóng qua ×/Esc/click ngoài/trigger | `src/app/(public)/(home)/_components/widget-button.tsx` |

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
| Panel widget (E20, E21, E22) *(mới)* | state | E20, E21, E22 | `open === true` | `open === false` | Trigger (E19) tự nó luôn hiện — chỉ đổi hình dạng pill↔× |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external — bất kỳ URL nào | truy cập trực tiếp `/` | không có điều kiện (public) | — |
| `/login` (F001) | đăng nhập thành công / đã có session | mặc định landing sau đăng nhập | `app/login/login-client.tsx` (F001) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Click "Award Information" | E03 | — | external (`/awards`, chưa implement) | redirect | `components/home/home-header.tsx` |
| Click "Sun* Kudos" | E04 | — | external (`/kudos`, đã implement) | redirect | `components/home/home-header.tsx` |
| Click thẻ giải thưởng | E16 | — | external (`/awards#<slug>`, chưa implement) | redirect | `components/home/award-card.tsx` |
| Click "Chi tiết" (Kudos) | E17 | — | external (`/kudos`, đã implement) | redirect | |
| Click "Tiêu chuẩn chung" (footer) | E18 | — | external (`/standards`, đã implement) | redirect | `components/home/home-footer.tsx` |
| Chọn "Hồ sơ" | (con của E08) | đã đăng nhập | external (`/profile`, chưa implement) | redirect | |
| Chọn "Trang quản trị" | (con của E08) | `role === "admin"` | external (`/admin`, chưa implement) | redirect | |
| Chọn "Đăng xuất" | (con của E08) | đã đăng nhập | `/login` | redirect (submit `logoutAction`, đã có) | `app/todo/actions.ts` (đã có, tái dùng) |
| Click "Đăng nhập" (khách) | E06 | Anonymous | `/login` | redirect | |
| Chọn "Thể lệ" (widget) *(mới)* | E20 | panel đang mở | external (`/standards`, đã implement) | redirect | `src/app/(public)/(home)/_components/widget-button.tsx` |
| Chọn "Viết KUDOS" (widget) *(mới)* | E21 | panel đang mở | external (`/kudos`, đã implement) | redirect | `src/app/(public)/(home)/_components/widget-button.tsx` |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | `aria-haspopup="menu"`/`"dialog"`, `role="menu"`/`"menuitem"`/`"dialog"`, `aria-label` cho mọi nút icon: "Đăng nhập", "Tài khoản", "Thông báo", "Hành động nhanh" (trigger widget, CỐ ĐỊNH cả 2 trạng thái pill/×), "Chi tiết <tên giải>"; trigger ở trạng thái mở (E22, nút ×) **giữ nguyên** `aria-label="Hành động nhanh"` — state do `aria-expanded` mang, KHÔNG đổi sang "Hủy" (xem BR-007). `home.widget.cancelLabel` chỉ dùng cho `<title>`/nhãn phụ của icon ×, không bao giờ là accessible name của nút |
| Keyboard navigation | [EXPECTED] | Mọi menu qua `useMenuKeyboardNav` (đã có) — Enter/Space mở, ArrowDown/Up di chuyển vòng, Esc đóng + trả focus; trigger ở trạng thái × (E22) là chính nút mở menu nên nằm ngoài roving tabindex của `[role="menu"]` — Tab từ item cuối rời menu về trigger như mọi menu khác |
| Focus management | [EXPECTED] | Roving tabindex trong menu; trả focus về trigger khi Esc hoặc click × |
| Screen reader compatibility | [EXPECTED] | Chưa audit thật — greenfield, kế hoạch rõ ràng ở trên |
| Error announcement | [EXPECTED] | Không có form nên không có lỗi validate cần `aria-live` |

## 10. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| <768px | R1 (Header) | Nav link xuống hàng dưới logo; controls (E05-E08) giữ bên phải — không có hamburger (không có trong design) | |
| <1024px | R5 (lưới giải thưởng) | Grid 2 cột (tablet lẫn mobile) | |
| ≥1024px | R5 (lưới giải thưởng) | Grid 3 cột | |

N/A — không có breakpoint riêng cho R8/widget trong design (`313:9137`/`313:9139` không có
variant responsive khác).
