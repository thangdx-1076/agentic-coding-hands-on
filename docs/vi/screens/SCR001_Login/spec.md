---
status: implemented
authored_by: takumi
created: 2026-09-04
lang: vi
fcode: F001
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
**Entry Conditions:** Chưa có phiên đăng nhập hợp lệ (guard optimistic cho qua); hoặc callback trả về lỗi. **Exit Conditions:** bấm "LOGIN With Google" và xác thực thành công → rời màn này, tới `/` (trang chủ — đổi từ `/todo` kể từ F003_Homepage, 2026-09-06; `/todo` vẫn tồn tại, chỉ không còn là đích mặc định).

## 2. Screen Layout

### Layout Sketch

Header sticky top chứa logo (trái) và bộ chọn ngôn ngữ (phải — vùng do F002_LanguageSwitch sở hữu). Khu vực nội dung chính ở giữa phủ hero visual làm nền, khối giới thiệu (tiêu đề, mô tả, nút đăng nhập Google) nằm bên trái. Footer fixed bottom chứa dòng bản quyền. (`src/app/(public)/login/_components/login-screen.tsx` compose `LoginBackground` + `LoginHeader` + `LoginHero` + `LoginFooter`.)

```
┌─ R1: Header (sticky-top) ───────────────┐
│ R2: Nội dung chính (hero + đăng nhập)   │
└─ R3: Footer (fixed-bottom) ─────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Header | sticky-top | no | Logo (F001), Bộ chọn ngôn ngữ (F002, `src/app/(public)/login/_components/login-header.tsx`) |
| R2 | Nội dung chính | static | no | Hero visual, tiêu đề, mô tả, nút "LOGIN With Google" (`src/app/(public)/login/_components/login-hero.tsx`) |
| R3 | Footer | fixed-bottom | no | Text bản quyền (`src/app/(public)/login/_components/login-footer.tsx`) |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Logo Sun* Annual Awards 2025 | image | — | static | Always | — (không tương tác) | static | raw | — | asset `public/login/Logo.png` |
| E02 | Bộ chọn ngôn ngữ | dropdown | no | "VN" | Always | Mở menu chọn ngôn ngữ (chi tiết hành vi do F002_LanguageSwitch sở hữu) | static | — | — | Owned by F002_LanguageSwitch — `src/app/_components/language-selector/language-selector.tsx` |
| E03 | Hero visual | image | — | static | Always | — (trang trí, không tương tác) | static | raw | — | asset `public/login/keyvisual.png` (2× export Figma node 662:14389, render `next/image` fill/object-cover) |
| E04 | Nội dung giới thiệu: tiêu đề "ROOT FURTHER" + subtitle "Bắt đầu hành trình của bạn cùng SAA 2025." + tagline "Đăng nhập để khám phá!" | display field | — | static | Always | — | static | raw | — | — |
| E05 | Nút "LOGIN With Google" | button | — | Enabled | Always | Khởi động luồng Google OAuth (PKCE) | — | — | — | binding: `isPending` (useTransition) |
| E06 | Thông báo lỗi inline (`role="alert"`) | message | — | Ẩn | Conditional | — | route param `error` | raw | hidden | query param `error` |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Đăng nhập Google | E05 | click | không đang pending | Nút chuyển `disabled` + spinner; trình duyệt điều hướng sang trang xác thực Google | `src/app/(public)/login/_components/google-login-button.tsx`, `src/app/(public)/login/_hooks/use-login-actions.ts:43-58` |

### Happy Path

1. Khách vào R1 Header, R2 Nội dung chính, R3 Footer — thấy đầy đủ logo, hero, nút đăng nhập, bản quyền.
2. Khách bấm "LOGIN With Google" tại R2 — nút chuyển trạng thái đang xử lý (disabled + spinner), rồi trình duyệt được điều hướng ra ngoài ứng dụng sang trang xác thực Google (rời màn hình này).

### Branches

Google xác thực thất bại/bị huỷ → quay lại `/login?error=...` (xem hàng `error` ở § 5 UI States).

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | Bấm "LOGIN With Google" | Nút `disabled`, `aria-busy="true"`, hiện spinner | none | `src/app/(public)/login/_components/google-login-button.tsx:28-34` |
| error | URL có `?error=...` | E06 hiện, chữ đỏ nhạt, `role="alert"` | Bấm lại "LOGIN With Google" | `src/app/(public)/login/page.tsx:70-82` (`hasErrorParam`) |
| redirect (thành công) | Google xác thực xong, `/auth/callback` xử lý xong | Trình duyệt rời `/login` | none | `src/app/auth/callback/route.ts:31-39` |

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
| `/` (root) | Guard `src/proxy.ts` chuyển hướng khi truy cập route bảo vệ | chưa đăng nhập | `src/proxy.ts:84-97` |
| SCR002_Todo | Bấm "Đăng xuất" | đã đăng nhập | `src/app/_actions/logout.ts:15-25` |
| external (`/auth/callback`) | Google xác thực thất bại/huỷ hoặc đổi mã lỗi | có `error` trên query | `src/app/auth/callback/route.ts:24-29` |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bấm "LOGIN With Google" | E05 | không đang pending | external (Google OAuth authorize) | redirect | `src/api/auth.ts` (fn `signInWithGoogle`) |
| Guard tự động chuyển hướng | — | đã có session hợp lệ | SCR003_Home (đổi từ SCR002_Todo, F003_Homepage 2026-09-06) | redirect | `src/app/(public)/login/page.tsx:33-37` |

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
