---
status: implemented
authored_by: takumi
created: 2026-09-04
lang: vi
fcode: F001
---

# SCR002_Todo — Screen Spec

**Screen**: SCR002_Todo: Todo (placeholder được bảo vệ)
**Feature**: F001_GoogleOAuthLogin
**Type**: atomic
**Route**: `/todo`
**Generated**: 2026-09-04

## 1. Overview

**Purpose:** Trang placeholder được bảo vệ, hiển thị ngay sau khi đăng nhập Google thành công; cho khách xem email của mình và đăng xuất. Không có tính năng todo thật.
**Actors:** Người dùng đã xác thực (bất kỳ tài khoản Google nào)
**Entry Conditions:** Đã đăng nhập thành công — gate authoritative nay tập trung tại
`src/app/(protected)/layout.tsx` (dùng chung cho `/todo` VÀ `/profile`, F006_ProfilePage gia nhập
đúng cơ chế này), không còn nằm riêng trong `page.tsx` của từng route; guard optimistic ở
`src/proxy.ts` vẫn chạy trước như lớp phòng thủ đầu tiên.
**Exit Conditions:** Bấm "Đăng xuất" → phiên bị xoá, quay lại `/login`.

## 2. Screen Layout

### Layout Sketch

Một vùng nội dung duy nhất, căn giữa: tiêu đề `<h1>` chứa email người dùng, bên dưới là nút "Đăng xuất". Không có header/footer riêng của màn này (`src/app/(protected)/todo/_components/todo-screen.tsx:16-34`).

```
┌─ R1: Nội dung chính ────────────────────┐
│  h1: chào + email · nút "Đăng xuất"     │
└──────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Nội dung chính | static | no | Tiêu đề `<h1>` (email), nút "Đăng xuất" |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Tiêu đề chào (`<h1>`, chứa email người dùng) | display field | — | — | Always | — | API field (session user) | raw | — | Supabase Auth user.email — MODEL002_SupabaseUser |
| E02 | Nút "Đăng xuất" | button | — | Enabled | Always | Đăng xuất người dùng (Server Action), chuyển hướng `/login` | — | — | — | binding: `logoutAction` (`src/app/_actions/logout.ts`) |

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Đăng xuất | E02 | click | — | Gọi Server Action đăng xuất, xoá session, chuyển hướng `/login` | `src/app/_actions/logout.ts:15-25` |

### Happy Path

1. Khách vào `/todo` (đã đăng nhập), thấy email của mình trên `<h1>` và nút "Đăng xuất" tại R1.
2. Khách bấm "Đăng xuất" — session bị xoá, khách được chuyển về `/login`.

### Branches

N/A — single-action screen, no branches.

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| submitting | Bấm "Đăng xuất" | Server Action xử lý; trang điều hướng ngay khi xong | none | `src/app/_actions/logout.ts:15-22` |
| redirect (thành công) | Đăng xuất thành công | Chuyển hướng về `/login` | none | `src/app/_actions/logout.ts:24` |

## 6. Validation & Feedback

N/A — no validation rules or submit-side error feedback detected.

## 7. Conditional UI

N/A — no conditional UI detected.

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR001_Login | Đăng nhập Google thành công (qua `/auth/callback`) | có session hợp lệ | `src/app/auth/callback/route.ts:31-39` |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bấm "Đăng xuất" | E02 | — | SCR001_Login | redirect | `src/app/_actions/logout.ts:24` |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | Nút có accessible name "Đăng xuất" |
| Keyboard navigation | [EXPECTED] | Nút thao tác được bằng Tab/Enter |
| Focus management | [EXPECTED] | Không có modal/drawer trên màn này |
| Screen reader compatibility | [EXPECTED] | Cần audit thực tế sau khi code xong |
| Error announcement | [EXPECTED] | Không có lỗi async trên màn này (Server Action điều hướng ngay) |

## 10. Responsive Behavior

N/A — no responsive behavior found in source.
