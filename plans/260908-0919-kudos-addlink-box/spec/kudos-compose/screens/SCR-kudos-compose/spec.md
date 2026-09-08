---
status: draft
authored_by: takumi
fcode: F009
created: 2026-09-08
lang: vi
---

# SCR008_KudosCompose — Screen Spec

**Screen**: SCR008_KudosCompose: Viết Kudo
**Feature**: F009_KudosCompose
**Type**: composite
**Route**: N/A — dialog phủ trên `/kudos`, không phải route riêng
**Generated**: 2026-09-08

## 1. Overview

**Purpose:** Cho phép Sunner đã đăng nhập soạn và gửi một Kudo (lời cảm ơn) tới đồng đội ngay trên
trang bảng Kudos, không cần rời trang.
**Actors:** Sunner (đã đăng nhập)
**Entry Conditions:** Đã đăng nhập; đang ở trang `/kudos`; bấm pill "Viết Kudo".
**Exit Conditions:** Gửi thành công (modal đóng, Kudo mới xuất hiện trên bảng) HOẶC bấm Hủy/Escape/
click nền (modal đóng, không lưu).

## 2. Screen Layout

### Layout Sketch

Overlay dialog che phủ `/kudos` phía sau bằng lớp nền tối (mask), modal căn giữa màn hình, cuộn dọc
khi nội dung dài hơn viewport. Từ trên xuống: tiêu đề, thân form (các trường theo thứ tự thiết kế),
footer 2 nút hành động cố định đáy modal. Khi bấm nút "Chèn liên kết" trên toolbar, một `<dialog>`
native thứ hai — "Thêm đường dẫn" — mở LỒNG bên trên (top-layer cao hơn), cũng căn giữa màn hình,
đè cả lên dialog Viết Kudo phía sau. *(design: frame `520:11647` cho dialog cha; frame "Addlink Box"
`1002:12917`/instance `1002:12682` cho dialog lồng, 752×388, bg `#FFF8E1`, radius 24, padding 40)*

```
┌───────────────────────────────────┐
│  R1: Tiêu đề (static)             │
├───────────────────────────────────┤
│  R2: Thân form (scrollable)      │
│  - Người nhận / Danh hiệu         │
│  - Toolbar + Nội dung             │
│  - Hashtag / Image / Ẩn danh      │
├───────────────────────────────────┤
│  R3: Footer Hủy / Gửi (static)   │
└───────────────────────────────────┘
      - - - (lồng trên, khi mở) - - -
┌───────────────────────────────────┐
│  R4: Dialog "Thêm đường dẫn"      │
│  - Tiêu đề                        │
│  - Nội dung / URL                 │
│  - Footer Hủy / Lưu               │
└───────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|----------------|
| R1 | Tiêu đề modal | static | no | label tiêu đề |
| R2 | Thân form | static | yes | ô Người nhận, ô Danh hiệu, toolbar + textarea Nội dung, Hashtag, Image, checkbox ẩn danh |
| R3 | Footer hành động | static | no | nút Hủy, nút Gửi |
| R4 | Dialog "Thêm đường dẫn" (lồng, conditional) | static, top-layer trên R1-R3 | no | tiêu đề, ô Nội dung, ô URL, nút Hủy, nút Lưu |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | Tiêu đề modal | display field | — | "Gửi lời cám ơn và ghi nhận đến đồng đội" | Always | — | static | raw | — | N/A |
| E02 | Người nhận | text input | yes | Empty | Always | mở dropdown gợi ý, lọc theo tên (yêu cầu E02) | computed | raw | placeholder "Tìm kiếm" | binding: `form.recipientId` |
| E03 | Danh hiệu | text input | yes | Empty | Always | — | — | raw | placeholder "Dành tặng một danh hiệu cho đồng đội" | binding: `form.title` |
| E04 | Dòng gợi ý Danh hiệu | display field | — | static text | Always | — | static | raw | — | N/A |
| E05 | Toolbar định dạng (B/I/S/số/link/quote) | button | — | Enabled | Always | chèn marker định dạng vào Nội dung (yêu cầu E06); nút "Chèn liên kết" mở R4 | — | — | — | N/A |
| E06 | Nội dung | textarea | yes | Empty | Always | gõ "@ + tên" hiện gợi ý mention | computed | raw | placeholder "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!" | binding: `form.content` |
| E07 | Dòng gợi ý dưới Nội dung | display field | — | static text | Always | — | static | raw | — | N/A |
| E08 | Link "Tiêu chuẩn cộng đồng" | link | — | — | Always | mở `/standards` cùng tab | static | raw | — | N/A |
| E09 | Nút "+ Hashtag" | button | yes *(≥1 hashtag)* | Empty | Always | mở dropdown gợi ý, thêm chip (tối đa 5) | computed vocabulary | raw | — | binding: `form.hashtags` |
| E10 | Hashtag chip | display field | — | — | Conditional | xoá chip (yêu cầu E09) | computed | raw | ẩn khi 0 chip | binding: `form.hashtags` |
| E11 | Nút "+ Image" | button | — | Empty | Conditional | mở file picker, chọn tối đa 5 ảnh `.jpg`/`.png` | — | raw | ẩn khi đã đủ 5 ảnh | binding: `form.images` |
| E12 | Image thumbnail | image | — | — | Conditional | xoá ảnh (yêu cầu E11) | computed | raw | ẩn khi 0 ảnh | binding: `form.images` |
| E13 | Checkbox "Gửi ẩn danh" | checkbox | no | unchecked | Always | bật/tắt hiện E14 | — | — | — | binding: `form.isAnonymous` |
| E14 | Tên ẩn danh | text input | Conditional *(bắt buộc khi E13 checked — xem D001)* | Empty | Conditional | — | — | raw | placeholder TBD (draft) | binding: `form.anonymousName` |
| E15 | Nút "Hủy" | button | — | Enabled | Always | đóng modal, không lưu | — | — | — | N/A |
| E16 | Nút "Gửi" | button | — | Disabled | Always | validate & gửi (yêu cầu E02, E03, E06, E09), đóng modal khi thành công | — | — | — | N/A |
| E17 | Tiêu đề dialog "Thêm đường dẫn" | display field | — | "Thêm đường dẫn" | Conditional *(R4 mở)* | — | static | raw | — | `testid: kudos-link-title` |
| E18 | Nội dung (link text) | text input | yes | Empty *(prefill = text đang bôi đen khi bấm E05 Link, nếu có)* | Conditional *(R4 mở)* | — | computed (selection) | raw, 1–100 ký tự trim | placeholder TBD (draft) | `testid: kudos-link-text-input`, binding: `form.linkText` |
| E19 | URL | text input | yes | Empty | Conditional *(R4 mở)* | — | — | raw, 5–2048 ký tự trim, `http`/`https` | placeholder TBD (draft) | `testid: kudos-link-url-input`, binding: `form.linkUrl` |
| E20 | Nút "Hủy" (dialog link) | button | — | Enabled | Conditional *(R4 mở)* | đóng R4, không đổi E06 (yêu cầu E17-E19) | — | — | — | `testid: kudos-link-cancel` |
| E21 | Nút "Lưu" (dialog link) | button | — | Enabled | Conditional *(R4 mở)* | validate E18/E19, chèn markdown vào E06 rồi đóng R4 khi hợp lệ | — | — | — | `testid: kudos-link-save` |

## 4. User Actions

> **Scope:** chỉ tương tác trong phạm vi màn hình này. Điều hướng ra ngoài (đăng nhập, `/standards`)
> nằm ở `## 8. Navigation`.

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Tìm & chọn người nhận | E02 | gõ + click mục gợi ý | — | trường điền tên đã chọn, dropdown đóng | TBD (draft) |
| Nhập danh hiệu | E03 | gõ | — | giá trị cập nhật vào state | TBD (draft) |
| Định dạng nội dung | E05 | click nút toolbar | cần bôi đen text trong E06 | marker định dạng được chèn vào E06 | TBD (draft) |
| Nhắc đồng nghiệp | E06 | gõ "@ + tên" | — | hiện danh sách gợi ý tên, chọn để chèn | TBD (draft) |
| Mở tiêu chuẩn cộng đồng | E08 | click | — | mở `/standards` (rời màn hình) | TBD (draft) |
| Thêm hashtag | E09 | click, chọn/nhập rồi xác nhận | chưa đủ 5 chip | chip mới xuất hiện ở E10 | TBD (draft) |
| Xoá hashtag | E10 | click nút "x" trên chip | — | chip biến mất | TBD (draft) |
| Thêm ảnh | E11 | click, chọn file | chưa đủ 5 ảnh, đúng định dạng | thumbnail mới xuất hiện ở E12 | TBD (draft) |
| Xoá ảnh | E12 | click nút "x" trên thumbnail | — | thumbnail biến mất, nút "+ Image" hiện lại nếu vừa dưới 5 | TBD (draft) |
| Bật/tắt ẩn danh | E13 | click checkbox | — | E14 hiện/ẩn tương ứng | TBD (draft) |
| Huỷ soạn | E15 | click | — | modal đóng, không lưu dữ liệu | TBD (draft) |
| Gửi Kudo | E16 | click | 4 trường bắt buộc hợp lệ | modal đóng, Kudo mới hiện trên bảng (rời trạng thái "đang soạn") | TBD (draft) |
| Mở "Thêm đường dẫn" | nút Link trong E05 | click (`data-format=link`) | dialog Viết Kudo đang mở | R4 mở, E18 prefill từ vùng chọn trong E06 (nếu có) | `kudos-format-toolbar.tsx:59-68` |
| Huỷ liên kết | E20 | click, hoặc Escape khi R4 mở | — | R4 đóng, E06 không đổi | TBD (draft) |
| Lưu liên kết | E21 | click | E18/E19 hợp lệ | R4 đóng, `[E18](E19)` chèn vào E06 tại vị trí đã chọn lúc mở | TBD (draft) |

### Happy Path

1. Sunner bấm pill "Viết Kudo" trên `/kudos" — modal mở, hiện đầy đủ các trường trống.
2. Sunner gõ và chọn một người nhận trong dropdown gợi ý (E02).
3. Sunner nhập Danh hiệu (E03) và viết Nội dung (E06), có thể dùng toolbar (E05) hoặc "@ + tên".
   Khi cần chèn liên kết, Sunner bấm nút Link trong E05 — R4 mở, Sunner nhập Nội dung + URL rồi bấm
   "Lưu" (E21) để chèn markdown vào E06, hoặc "Hủy" (E20)/Escape để đóng R4 mà không đổi gì.
4. Sunner thêm ít nhất 1 hashtag (E09) — có thể thêm ảnh (E11) và bật ẩn danh (E13) nếu muốn.
5. Nút "Gửi" (E16) chuyển sang trạng thái bật khi cả 4 trường bắt buộc hợp lệ.
6. Sunner bấm "Gửi" — modal đóng, Kudo mới xuất hiện ngay trên bảng `/kudos`.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Bấm "Gửi" | thiếu ≥1 trong 4 trường bắt buộc | viền đỏ + thông báo lỗi tại đúng trường, modal không đóng | TBD (draft) |
| Thêm hashtag | đã có 5 chip | bị chặn, hiện "Tối đa 5 hashtag" | TBD (draft) |
| Thêm ảnh | đã có 5 ảnh hoặc sai định dạng | bị chặn, hiện thông báo tương ứng | TBD (draft) |
| Bật ẩn danh (E13) | để trống tên ẩn danh (E14) khi Gửi | báo lỗi tại E14 *(mặc định, xem D001)* | TBD (draft) |
| Bấm "Lưu" (E21) trong R4 | E18 hoặc E19 không hợp lệ | lỗi hiện dưới đúng trường, R4 không đóng | TBD (draft) |

### Interaction Notes

- **Escape hoặc click ra ngoài modal đóng dialog, không lưu dữ liệu** — theo hành vi mặc định của
  `<dialog>` native (`showModal()`/sự kiện `cancel`).
- **Gõ "@" trong Nội dung hiện danh sách gợi ý tên đồng nghiệp** để chèn dạng plain text `@Tên`.
- **Escape khi R4 đang mở CHỈ đóng R4** — dialog Viết Kudo phía sau vẫn `open`, `cancel` event của
  nó không bị kích hoạt lần thứ hai (native `<dialog>` chỉ đóng dialog trên cùng top-layer).

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| loading | đang gõ tìm người nhận (E02) | hiện trạng thái đang tìm trong dropdown | gõ tiếp | TBD (draft) |
| empty | tìm người nhận không ra kết quả | dropdown hiện "không có kết quả" | sửa từ khoá | TBD (draft) |
| error | thiếu trường bắt buộc / lỗi mạng khi Gửi | viền đỏ tại trường lỗi hoặc thông báo lỗi chung | sửa lại rồi Gửi lại | TBD (draft) |
| saving | đã bấm "Gửi", đang chờ máy chủ | nút "Gửi" hiện spinner, disable toàn form | không có (chờ) | TBD (draft) |
| success | Gửi thành công | modal đóng, Kudo mới hiện trên bảng | — | TBD (draft) |
| R4 closed | mặc định, hoặc sau Hủy/Escape/Lưu hợp lệ | R4 không hiển thị | bấm nút Link (E05) để mở lại | TBD (draft) |
| R4 open | vừa bấm nút Link (E05) | R4 hiện, E18/E19 trống (hoặc E18 prefill từ vùng chọn) | nhập E18/E19, Hủy, Lưu | TBD (draft) |
| R4 error | Lưu (E21) khi E18/E19 không hợp lệ | viền đỏ + `role="alert"` dưới đúng trường (E18 và/hoặc E19), R4 vẫn mở | sửa lại rồi Lưu lại | TBD (draft) |
| R4 validating/saving | vừa bấm Lưu (E21), đang kiểm tra E18/E19 | tức thời (không có network) — chuyển ngay sang R4 closed (hợp lệ) hoặc R4 error | không có (tức thời) | TBD (draft) |

## 6. Validation & Feedback

| Element | Rule | Feedback | Trigger |
|---------|------|----------|---------|
| E02 | Bắt buộc, phải chọn một Sunner có thật từ danh sách | "Không được để trống" | submit |
| E03 | Bắt buộc | "Không được để trống" | submit |
| E06 | Bắt buộc | "Không được để trống" | submit |
| E09 | Bắt buộc tối thiểu 1, tối đa 5 | "Không được để trống" / "Tối đa 5 hashtag" | change / submit |
| E11 | Tối đa 5 ảnh, chỉ nhận `.jpg`/`.png` | "Tối đa 5 ảnh" / "Định dạng file không hợp lệ" | change |
| E14 | Bắt buộc khi E13 được check *(mặc định, xem D001)* | "Không được để trống" | submit |
| E18 | Bắt buộc, tối đa 100 ký tự sau `trim()` | "Không được để trống." / "Tối đa 100 ký tự." | submit (Lưu) |
| E19 | Bắt buộc, 5–2048 ký tự sau `trim()`, phải parse được và scheme `http`/`https` | "Không được để trống." / "URL phải từ 5 đến 2048 ký tự." / "URL không hợp lệ — chỉ nhận http hoặc https." | blur / submit (Lưu) |

## 7. Conditional UI

| Condition | Type | Element(s) | Visible when | Hidden when | Notes |
|-----------|------|------------|--------------|-------------|-------|
| Ô nhập tên ẩn danh chỉ hiện khi bật ẩn danh | hardcoded-id | E14 | E13 checked | E13 unchecked | DEC-001 trong technical-spec.md |
| Nút "+ Image" ẩn khi đã đủ 5 ảnh | hardcoded-id | E11 | dưới 5 ảnh | đã có 5 ảnh | BR-003 trong technical-spec.md |
| Hashtag chip chỉ hiện khi đã thêm | hardcoded-id | E10 | ≥1 chip | 0 chip | — |
| Dialog "Thêm đường dẫn" (R4) chỉ hiện khi bấm nút Link trên toolbar | hardcoded-id | R4, E17-E21 | vừa bấm nút Link (E05) | Hủy / Escape / Lưu hợp lệ | DEC-003 trong technical-spec.md |

## 8. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| Kudos (trang `/kudos`) | click pill "Viết Kudo" | đã đăng nhập | TBD (draft) |
| Toolbar định dạng (E05), trong cùng màn hình | click nút Link | dialog Viết Kudo đang mở | `kudos-format-toolbar.tsx:59-68` |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bấm pill khi chưa đăng nhập | — *(pill trên Kudos)* | chưa đăng nhập | Đăng nhập (external) | redirect | TBD (draft) |
| Gửi thành công | E16 | 4 trường bắt buộc hợp lệ | (stays on screen) | modal đóng, `/kudos` cập nhật Kudo mới | TBD (draft) |
| Huỷ / Escape / click nền | E15 | — | (stays on screen) | modal đóng, không lưu | TBD (draft) |
| Mở tiêu chuẩn cộng đồng | E08 | — | external URL `/standards` | new tab? *(chưa xác nhận — xem § 5.3 technical-spec.md)* | TBD (draft) |
| Lưu liên kết hợp lệ | E21 | E18/E19 hợp lệ | (stays on screen) | R4 đóng, markdown chèn vào E06, dialog Viết Kudo vẫn mở | TBD (draft) |
| Huỷ / Escape liên kết | E20 | — | (stays on screen) | R4 đóng, E06 không đổi, dialog Viết Kudo vẫn mở | TBD (draft) |

## 9. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [EXPECTED] | `<dialog>` native cho `role="dialog"` ngầm định + `aria-modal`; cần `aria-label`/`aria-labelledby` cho tiêu đề modal. R4 lồng dùng CÙNG pattern: `aria-labelledby="kudos-link-title"` trỏ vào E17 (planned — chưa viết) |
| Keyboard navigation | [EXPECTED] | `<dialog>`/`showModal()` cho focus trap và Tab-cycle sẵn có theo trình duyệt; R4 lồng có top-layer riêng nên Tab không thoát được ra dialog cha trong khi R4 mở |
| Focus management | [EXPECTED] | Focus tự động vào modal khi mở, trả lại nút trigger khi đóng. R4: focus tự động vào E18 khi mở; khi R4 đóng (Hủy/Escape/Lưu), focus TRẢ VỀ đúng nút Link đã bấm mở nó (E05's `data-format="link"` button) — không phải trả về `<body>` hay dialog cha nói chung |
| Screen reader compatibility | [EXPECTED] | Chưa kiểm chứng — cần gắn nhãn rõ cho từng trường khi implement, kể cả E18/E19 |
| Error announcement | [EXPECTED] | Thông báo lỗi từng trường cần `aria-live`/`role="alert"` để trình đọc màn hình bắt được. R4: lỗi E18/E19 dùng `role="alert"` theo đúng pattern `KudosComposeField` hiện có (`kudos-compose-field.tsx:108-118`, 14px bold `#FF8A80`) — chưa có frame lỗi riêng cho R4, tái dùng pattern repo |

## 10. Responsive Behavior

N/A — no responsive behavior found in source *(design chỉ có 1 breakpoint desktop; R4 cố định
`w-[752px]` như dialog cha, không responsive thêm)*.
