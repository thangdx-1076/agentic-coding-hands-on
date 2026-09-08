---
status: implemented
authored_by: takumi
fcode: F011
created: 2026-09-08
lang: vi
---

# SCR009_CountdownPrelaunch — Screen Spec

**Screen**: SCR009_CountdownPrelaunch: Countdown Prelaunch
**Feature**: CountdownPrelaunchPage (F011, provisional — cấp thật ở promote)
**Type**: atomic
**Route**: `/prelaunch`
**Generated**: 2026-09-08

## 1. Overview

**Purpose:** Cho bất kỳ khách nào (đã đăng nhập hay chưa) biết còn bao lâu tới sự kiện Sun*
Annual Awards 2025 bắt đầu, trên nền toàn màn hình mang không khí sự kiện.
**Actors:** Người dùng bất kỳ (đã đăng nhập hay chưa)
**Entry Conditions:** Bị điều hướng lại từ một route khác khi khoá đang bật và chưa tới giờ sự
kiện, HOẶC vào thẳng URL `/prelaunch`.
**Exit Conditions:** Không có hành động thoát nào do người dùng chủ động trên chính màn này; khi
đếm ngược đã về 0 và khoá vẫn bật, một lượt truy cập MỚI vào `/prelaunch` bị đưa thẳng về `/`
trước khi màn kịp render (xem `technical-spec.md` § 3.2 A2).

## 2. Screen Layout

### Layout Sketch

Một layout toàn màn hình, không cuộn: lớp dưới cùng là ảnh nền full-bleed cộng lớp phủ tối, lớp
trên là nội dung căn giữa gồm tiêu đề và 3 ô đếm ngược xếp ngang. Không có header/footer, không
modal. Cây node cùng hình dạng với khối đếm ngược hero trang chủ (`mm:2167:9037`).

```
┌─────────────────────────────────────────┐
│  R1: Nền toàn màn (static, full-bleed)  │
│  ┌─────────────────────────────────┐    │
│  │  R2: Nội dung giữa (static)      │    │
│  │   Tiêu đề                        │    │
│  │   [DAYS] [HOURS] [MINUTES]       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Nền toàn màn | static, full-bleed | no | ảnh nền `MM_MEDIA_BG`, lớp phủ `Cover` |
| R2 | Nội dung giữa | static, căn giữa | no | tiêu đề, `CountdownTiles` |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Nền toàn màn | image | — | — | Always | — | static | raw | — | N/A |
| E02 | Lớp phủ tối | display field | — | — | Always | — | static | raw | — | N/A |
| E03 | Tiêu đề | display field | — | "Sự kiện sẽ bắt đầu sau" / "Event starts in" | Always | — | static (i18n) | raw | — | N/A |
| E04 | Ô DAYS | display field | — | "00" | Always | — | computed | 2 chữ số, 00-99 | — | binding: `remaining().days` |
| E05 | Nhãn DAYS | display field | — | "DAYS" | Always | — | static (i18n) | raw | — | N/A |
| E06 | Ô HOURS | display field | — | "00" | Always | — | computed | 2 chữ số, 00-23 | — | binding: `remaining().hours` |
| E07 | Nhãn HOURS | display field | — | "HOURS" | Always | — | static (i18n) | raw | — | N/A |
| E08 | Ô MINUTES | display field | — | "00" | Always | — | computed | 2 chữ số, 00-59 | — | binding: `remaining().minutes` |
| E09 | Nhãn MINUTES | display field | — | "MINUTES" | Always | — | static (i18n) | raw | — | N/A |

## 4. User Actions

> **Scope:** trong phạm vi màn này. Điều hướng vào/ra màn nằm ở `## 8. Navigation`.

### Available Actions

`N/A — no elements carry a discrete user-triggered action.`

### Happy Path

1. Người dùng đến `/prelaunch` (bị khoá đưa về, hoặc vào thẳng URL) — thấy nền sự kiện, tiêu đề,
   và 3 ô đếm ngược.
2. 3 ô tự giảm mỗi giây, không cần thao tác gì từ người dùng.
3. Khi đếm ngược về 0, cả 3 ô đọc "00" — người dùng vẫn ở lại màn này (không tự chuyển trang khi
   đang mở sẵn); một lượt truy cập MỚI vào `/prelaunch` sau thời điểm này mới bị đưa về `/`.

### Branches

`N/A — single-action screen, no branches`

### Interaction Notes

- **Đếm ngược tick mỗi giây, không cần reload trang** — source: `use-countdown.ts` (tái dùng).

## 5. UI States

> **Required rows:** không có async ops nào trên chính màn này (dữ liệu tính tại render server,
> không gọi API phía client).

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| ticking | mặc định, còn thời gian | 3 ô giảm dần mỗi giây | none | TBD (draft) |
| reached | đếm ngược về 0 trong lúc màn đang mở | cả 3 ô đọc "00", layout không đổi | none | TBD (draft) |

## 6. Validation & Feedback

`N/A — no validation rules or submit-side error feedback detected.`

## 7. Conditional UI

`N/A — no conditional UI detected.`

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Bất kỳ route nào khớp `config.matcher`, trừ danh sách miễn khoá | request bất kỳ (kể cả gõ thẳng URL) | `PRELAUNCH_LOCK_ENABLED=true` VÀ chưa tới giờ sự kiện VÀ route không thuộc danh sách miễn khoá | TBD (draft) |
| — | vào thẳng URL `/prelaunch` | luôn khả dụng, không cần điều kiện | TBD (draft) |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| (tự động, không do người dùng bấm) | — | Một lượt truy cập MỚI vào `/prelaunch` khi đã tới giờ sự kiện VÀ cờ khoá vẫn bật | `/` | redirect trước khi màn này render | TBD (draft) |

`Không có exit nào do thao tác người dùng trên chính màn này.`

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | `CountdownTiles` tái dùng đã có `role="timer"` trên gốc — cần xác nhận lại khi tích hợp vào màn mới |
| Keyboard navigation | [EXPECTED] | Không có phần tử tương tác nào trên màn — không cần tab order riêng |
| Focus management | [EXPECTED] | Không có modal/focus trap — trang tĩnh |
| Screen reader compatibility | [EXPECTED] | Cần xác nhận `aria-live` có phù hợp cho số đang tick liên tục hay không (tick 1s có thể gây đọc liên tục nếu bật `aria-live="polite"` không đúng cách) |
| Error announcement | [EXPECTED] | Không có trạng thái lỗi nào trên màn này |

## 10. Responsive Behavior

| Breakpoint | Region / Element | Behavior | Source |
|------------|-------------------|----------|--------|
| mobile (mặc định) | E04, E06, E08 (ô đếm) | Kích thước tile nhỏ nhất, tái dùng breakpoint đã có ở `CountdownTiles` | TBD (draft) |
| `sm:` | E04, E06, E08 | Tile lớn hơn 1 nấc | TBD (draft) |
| `lg:` | E04, E06, E08 | Tile ở kích thước pixel-perfect gốc thiết kế | TBD (draft) |
