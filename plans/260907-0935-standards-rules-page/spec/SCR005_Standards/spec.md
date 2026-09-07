---
status: draft
authored_by: takumi
created: 2026-09-07
fcode: F005
---

# SCR005_Standards — Screen Spec

**Screen**: SCR005_Standards: Thể lệ SAA 2025
**Feature**: F005_StandardsRulesPage
**Type**: atomic
**Route**: /standards
**Generated**: 2026-09-07

**Composite classification (2-of-3 gate):** atomic. H1 (feature refs) fail — chỉ 1 F### tự sở
hữu route này. H2 (domain-module imports) fail — không import nào khớp `features/*`/`modules/*`.
H3 (semantic region wrappers) đạt ngưỡng ≥3 (đúng 3 `<section>`) nhưng **1/3 tín hiệu không đủ**
để thành composite (cần 2-of-3) → atomic, không phát sinh `REG###`.

## 1. Overview

**Purpose:** Trang công khai trình bày đầy đủ thể lệ SAA 2025 — điều kiện nhận huy hiệu Hero (4
hạng), cách sưu tập 6 icon Secret Box, và Kudos Quốc dân — thay cho link chết "Tiêu chuẩn chung"
hiện có ở footer mọi trang.
**Actors:** Khách truy cập (Anonymous), Thành viên/Quản trị viên (Authenticated) — nội dung không
cá nhân hoá theo actor, không có chrome nào (header/bell/account) đọc trạng thái đăng nhập trên
chính màn hình này (khác SCR003/SCR004).
**Entry Conditions:** Không có điều kiện nào — public, không guard.
**Exit Conditions:** Người dùng rời trang qua "Đóng" (quay lại trang trước, hoặc `/` nếu không có
lịch sử) hoặc "Viết KUDOS" (điều hướng `/kudos`, hiện 404); ở lại trang cuộn đọc cũng là trạng
thái hợp lệ.

## 2. Screen Layout

### Layout Sketch

Toàn khung nền tối `#00101A`; panel nội dung căn phải, chiếm phần bên phải khung, cuộn dọc độc
lập; footer 2 nút cố định ở đáy panel.

```
┌───────────────────────┬─────────────────────────┐
│                       │  R1: Panel nội dung       │
│   (nền #00101A trống) │  tiêu đề "Thể lệ"         │
│                       │  + 3 section (cuộn)       │
│                       ├─────────────────────────┤
│                       │  R2: Footer 2 nút (sticky)│
└───────────────────────┴─────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|-----------------|
| R1 | Panel nội dung (tiêu đề + 3 section) | right-aligned sheet | yes (`overflow-y: auto`) | tiêu đề, `HeroBadgeSection`, `SecretBoxSection`, `NationKudosSection` |
| R2 | Footer 2 nút hành động | sticky-bottom (trong panel) | no | nút "Đóng", nút "Viết KUDOS" |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Tiêu đề "Thể lệ" | display field (h1) | — | — | Always | — | static | raw | — | binding: `standards.title` |
| E02 | Section 1 heading + intro | display field | — | — | Always | — | static | raw | — | binding: `standards.heroSection.heading/intro` |
| E03 | 4 tier (badge ảnh + điều kiện + mô tả) | card (group) | — | — | Always | — | static | raw | — | binding: `HeroBadgeTierRow` × 4, note "repetitive groups collapse to one row" |
| E04 | Section 2 heading + intro | display field | — | — | Always | — | static | raw (giữ ❤️) | — | binding: `standards.secretBoxSection.heading/intro` |
| E05 | Lưới 6 badge (ảnh + caption text) | card (group) | — | — | Always | — | static | raw (caption uppercase, giữ "ROOT FUTHER") | — | binding: `SecretBoxBadge` × 6, note "repetitive groups collapse to one row" |
| E06 | Đoạn closing section 2 | display field | — | — | Always | — | static | raw | — | binding: `standards.secretBoxSection.closing` |
| E07 | Section 3 heading + body | display field | — | — | Always | — | static | raw (giữ ❤️) | — | binding: `standards.nationKudosSection.heading/body` |
| E08 | Nút "Đóng" (icon X + text) | button | — | Enabled | Always | Click → `router.back()`, fallback `ROUTES.HOME` | computed | raw | — | binding: `StandardsClient.handleClose` |
| E09 | Nút "Viết KUDOS" (icon bút + text) | link (styled button) | — | Enabled | Always | Click → điều hướng `/kudos` | static | raw | — | binding: `<Link href="/kudos">` |

Cap 25 nhưng E03 (4 tier) và E05 (6 badge) gộp mỗi nhóm thành 1 dòng theo note template
"repetitive groups collapse to one row" — cấu trúc lặp lại giống hệt, chỉ khác nội dung.

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Cuộn panel | R1 | scroll | Nội dung dài hơn khung | Panel cuộn mượt, không ảnh hưởng phần còn lại của viewport | `_components/standards-screen.tsx` |
| Click "Đóng" | E08 | click | luôn khả dụng | Có lịch sử điều hướng → quay lại trang trước; không có → điều hướng `/` | `_components/standards-client.tsx` |
| Click "Viết KUDOS" | E09 | click | luôn khả dụng | Điều hướng `/kudos` (chưa implement, hiện 404) | `_components/standards-screen.tsx` |

### Happy Path

1. Khách vào `/standards` (trực tiếp, hoặc từ link "Tiêu chuẩn chung" ở footer bất kỳ trang
   nào), thấy ngay panel "Thể lệ" với đủ 3 section, không cần đăng nhập.
2. Khách cuộn panel để đọc hết nội dung (nếu dài hơn khung).
3. Khách click "Đóng" (quay lại trang trước, hoặc `/` nếu không có lịch sử) hoặc "Viết KUDOS"
   (dẫn `/kudos`, hiện 404 cho tới khi trang đó được xây ở phiên khác).

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| `router.back()` hay fallback `/` khi click "Đóng" | `window.history.length > 1` | `>1`: `router.back()`; `<=1`: `router.push(ROUTES.HOME)` | `_components/standards-client.tsx` |
| Panel có scrollbar hay không | chiều cao nội dung so với khung | Dài hơn: cuộn được (FR-301); vừa khít: không scrollbar (FR-302) | CSS `overflow-y: auto` tự nhiên |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| hover nút footer | con trỏ hover E08/E09 | Đổi màu/độ nổi (elevation) | click | `_components/standards-screen.tsx` |
| scroll (nội dung dài) | render với 3 section dài hơn khung | Panel cuộn được, scrollbar xuất hiện | cuộn | CSS |
| không scroll (nội dung vừa khung) | render với nội dung ngắn | Không scrollbar, không cuộn được | — | CSS |

N/A phần loading/saving/disabled — không async fetch phía client, không action nào ghi dữ liệu,
không điều kiện nào làm 2 nút disabled trên trang này (BR-005, xem functional-spec.md § 3 D001).

## 6. Validation & Feedback

N/A — không có form nhập liệu nào trên màn hình này (thuần hiển thị + điều hướng).

## 7. Conditional UI

Không có UI điều kiện nào trên màn hình này — mọi phần tử (E01-E09) luôn hiển thị giống nhau cho
mọi actor (Anonymous/Authenticated) và mọi lần render (không data-availability, không auth-gated
element, không hardcoded-id branch nào khác panel/footer tĩnh).

## 8. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [PLANNED] | `<h1>Thể lệ</h1>`, 3 `<h2>` cấp section; ảnh badge decorative dùng `alt=""` hoặc `alt` mô tả tier khi cần đọc được bằng screen reader |
| Keyboard navigation | [PLANNED] | Nút "Đóng" là `<button>` chuẩn (Tab/Enter/Space hoạt động qua trình duyệt); "Viết KUDOS" là `<a href>` chuẩn |
| Focus management | [PLANNED] | `focus-visible:ring-2` trên cả 2 nút footer (cùng pattern `NavLink`/`GoogleLoginButton` đã có) |
| Reduced motion | N/A | Không có animation/scroll-behavior nào bị ảnh hưởng bởi `prefers-reduced-motion` trên màn hình này (khác SCR004, vốn có smooth-scroll nav) |
| Screen reader compatibility | [PLANNED] | Caption 6 badge PHẢI là text thật trong DOM (không alt-text thay thế) — FR-103, để screen reader đọc được đúng tên icon |

## 9. Responsive Behavior

Không có test case hay ghi chú clarifications nào về breakpoint cho màn hình này (design chỉ vẽ
1 kích thước 1440×1796) — khác SCR004 (`/awards`) vốn có ghi chú responsive rõ ràng. Implementer
áp dụng layout co giãn tự nhiên (panel full-width dưới màn hình hẹp) theo cùng tinh thần Tailwind
responsive đã dùng ở các screen khác, xác nhận lại bằng Playwright visual capture nếu cần — không
suy diễn thêm breakpoint cụ thể ở spec draft này.

## 10. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| external — bất kỳ URL nào | truy cập trực tiếp `/standards` | không có điều kiện (public) | — |
| Bất kỳ trang nào có `SiteFooter` (`/`, `/awards`, ...) | click link "Tiêu chuẩn chung" ở footer | không có điều kiện | `src/app/(public)/_components/site-footer.tsx:74` |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Click "Đóng" (có lịch sử) | E08 | `window.history.length > 1` | trang trước đó (bất kỳ) | `router.back()` | `_components/standards-client.tsx` |
| Click "Đóng" (không có lịch sử) | E08 | `window.history.length <= 1` | `/` (`ROUTES.HOME`) | `router.push` | `_components/standards-client.tsx` |
| Click "Viết KUDOS" | E09 | — | external (`/kudos`, chưa implement) | 404 | `_components/standards-screen.tsx` |
