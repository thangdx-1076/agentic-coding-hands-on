---
status: draft
authored_by: takumi
created: 2026-09-04
lang: vi
---

# SCR001_Login — Screen Spec

**Screen**: SCR001_Login: Đăng nhập
**Feature**: F001_GoogleOAuthLogin
**Type**: atomic
**Route**: `/login`
**Generated**: 2026-09-04

## 1. Overview

**Purpose:** Khách chưa đăng nhập vào đây để bắt đầu luồng đăng nhập Google; đây là điểm vào chính của ứng dụng SAA 2025.
**Actors:** Khách (chưa đăng nhập)
**Entry Conditions:** Chưa có phiên đăng nhập hợp lệ (guard optimistic cho qua); hoặc callback trả về lỗi. **Exit Conditions:** bấm "LOGIN With Google" và xác thực thành công → rời màn này, tới `/todo`.

## 2. Screen Layout

### Layout Sketch

Header sticky top chứa logo (trái) và bộ chọn ngôn ngữ (phải — vùng do F002_LanguageSwitch sở hữu). Khu vực nội dung chính ở giữa phủ hero visual làm nền, khối giới thiệu (tiêu đề, mô tả, nút đăng nhập Google) nằm bên trái. Footer fixed bottom chứa dòng bản quyền. (TBD (draft) — file:line chưa có, code chưa viết.)

```
┌─ R1: Header (sticky-top) ───────────────┐
│ R2: Nội dung chính (hero + đăng nhập)   │
└─ R3: Footer (fixed-bottom) ─────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | sticky-top | no | Logo (F001), Bộ chọn ngôn ngữ (F002 — TBD (draft)) |
| R2 | Nội dung chính | static | no | Hero visual, tiêu đề, mô tả, nút "LOGIN With Google" |
| R3 | Footer | fixed-bottom | no | Text bản quyền |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Logo Sun* Annual Awards 2025 | image | — | static | Always | — (không tương tác) | static | raw | — | asset `public/login/logo.*` (TBD draft) |
| E02 | Bộ chọn ngôn ngữ | dropdown | no | "VN" | Always | Mở menu chọn ngôn ngữ (chi tiết hành vi do F002_LanguageSwitch sở hữu) | static | — | — | Owned by F002_LanguageSwitch — TBD (draft) |
| E03 | Hero visual | image | — | static | Always | — (trang trí, không tương tác) | static | raw | — | asset `public/login/hero-visual.*` (TBD draft) |
| E04 | Nội dung giới thiệu: tiêu đề "ROOT FURTHER" + subtitle "Bắt đầu hành trình của bạn cùng SAA 2025." + tagline "Đăng nhập để khám phá!" | display field | — | static | Always | — | static | raw | — | — |
| E05 | Nút "LOGIN With Google" | button | — | Enabled | Always | Khởi động luồng Google OAuth (PKCE) | — | — | — | binding: `isPending` (useTransition) |
| E06 | Thông báo lỗi inline (`role="alert"`) | message | — | Ẩn | Conditional | — | route param `error` | raw | hidden | query param `error` |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Đăng nhập Google | E05 | click | không đang pending | Nút chuyển `disabled` + spinner; trình duyệt điều hướng sang trang xác thực Google | TBD (draft) |

### Happy Path

1. Khách vào R1 Header, R2 Nội dung chính, R3 Footer — thấy đầy đủ logo, hero, nút đăng nhập, bản quyền.
2. Khách bấm "LOGIN With Google" tại R2 — nút chuyển trạng thái đang xử lý (disabled + spinner), rồi trình duyệt được điều hướng ra ngoài ứng dụng sang trang xác thực Google (rời màn hình này).

### Branches

Google xác thực thất bại/bị huỷ → quay lại `/login?error=...` (xem hàng `error` ở § 5 UI States).

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Bấm "LOGIN With Google" | Nút `disabled`, `aria-busy="true"`, hiện spinner | none | TBD (draft) |
| error | URL có `?error=...` | E06 hiện, chữ đỏ nhạt, `role="alert"` | Bấm lại "LOGIN With Google" | TBD (draft) |
| redirect (thành công) | Google xác thực xong, `/auth/callback` xử lý xong | Trình duyệt rời `/login` | none | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E05 | Vô hiệu hoá trong lúc đang xử lý đăng nhập, tránh bấm nhiều lần | (không có message — chỉ đổi trạng thái nút) | click |
| E06 | Hiện khi `error` xuất hiện trên query string sau khi callback thất bại | "Đăng nhập không thành công. Vui lòng thử lại." (en: "Login failed. Please try again.") | server response |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Thông báo lỗi đăng nhập hiện khi callback trả về lỗi | auth | E06 | `error` có trên query string | `error` không có | Message cố định, không đổi theo loại lỗi cụ thể |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| `/` (root) | Guard `proxy.ts` chuyển hướng khi truy cập `/` | chưa đăng nhập | TBD (draft) |
| SCR002_Todo | Bấm "Đăng xuất" | đã đăng nhập | TBD (draft) |
| external (`/auth/callback`) | Google xác thực thất bại/huỷ hoặc đổi mã lỗi | có `error` trên query | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bấm "LOGIN With Google" | E05 | không đang pending | external (Google OAuth authorize) | redirect | TBD (draft) |
| Guard tự động chuyển hướng | — | đã có session hợp lệ | SCR002_Todo | redirect | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Nút Google có accessible name "LOGIN With Google"; E06 dùng `role="alert"`; E02 dùng `aria-haspopup="menu"` (F002 sở hữu) |
| Keyboard navigation | [EXPECTED] | Toàn bộ control thao tác được bằng Tab/Enter |
| Focus management | [EXPECTED] | Không có modal/drawer trên màn này |
| Screen reader compatibility | [EXPECTED] | Cần audit thực tế sau khi code xong |
| Error announcement | [EXPECTED] | E06 dùng `role="alert"` để trình đọc thông báo ngay |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
