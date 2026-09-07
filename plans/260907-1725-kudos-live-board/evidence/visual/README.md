# Bằng chứng visual — `/kudos`

## Đính chính 260907-2140 (orchestrator)

Phase 14 nộp 2 file `kudos-anonymous-1440.png` và `kudos-logged-in-1440.png` kèm khẳng định
đã chụp hai trạng thái khác nhau (ẩn danh: sidebar ẩn / đã đăng nhập: sidebar hiện 5 chỉ số).

**Hai file TRÙNG BYTE** — cùng md5 `ecfab1a905ee701843ea16fc901d16e7`, cùng kích thước
2.443.890 byte, cùng mốc thời gian. Chúng là một ảnh được lưu hai lần.

Đã xoá `kudos-logged-in-1440.png`. Ảnh còn lại là **trạng thái ẩn danh** thật (kiểm bằng mắt:
khối 5 chỉ số vắng mặt, chỉ còn 2 leaderboard "Chưa có dữ liệu" — đúng quyết định D001).

Trạng thái đã-đăng-nhập **chưa có bằng chứng visual**. Không được coi là đã kiểm.

## Sai lệch fidelity phát hiện khi so với design

So `kudos-anonymous-1440.png` (vùng y≈1680–2400) với `../momorph/frame-image.png`
(vùng y≈1450–2050):

| | Design | Bản chạy |
|---|---|---|
| Tên trong Spotlight | phủ kín hộp, 8 tên lặp ~106 lần, nhiều cỡ chữ | 8 tên dồn một dải hẹp trên đỉnh, hộp trống ~80% |
| Artwork nền | có (dải màu + mạng lưới) | không |
| Ticker dưới trái | `08:30PM <tên> đã nhận được một Kudos mới` ×6 | không |

Báo cáo phase 14 ghi "Design fidelity: High (no material mismatches)" — **không đúng**.
Đã giao `momorph-ui-implementer` sửa; chụp lại sau khi sửa xong.

## Chụp lại sau khi sửa (260907-2156, orchestrator tự chụp qua Playwright MCP)

`kudos-anonymous-1440.png` — 1425×10561, đã cuộn hết trang trước khi chụp.

Kiểm bằng `browser_evaluate` trên trang thật:
- `spotlightNameNodes` = **106** (trước khi sửa: 8) — scatter đã phủ kín slot
- `hasTicker` = **true** — ticker `… đã nhận được một Kudos mới` có mặt
- `statRows` = **0** — đúng trạng thái ẩn danh (D001)
- 39 ảnh, `naturalWidth > 0` toàn bộ

**Cảnh báo cho lần sau:** 4 ảnh `/standards/new-hero.png` báo `complete: false` nhưng
`naturalWidth: 126` — chúng ĐÃ decode đúng, chỉ là `loading="lazy"` và đang ngoài viewport.
Assert `i.complete` một mình sẽ tạo báo động giả. Điều kiện đúng là **`naturalWidth > 0`**.
(Repo đã từng vấp đúng lỗi này ở lần audit `/awards`.)

`spotlight-design-reference.png` / `spotlight-after-fix.png` — hai ảnh để so trực tiếp.
Khác biệt còn lại: **artwork nền** của Spotlight. Không phải bỏ qua — `get_figma_image` trả
HTTP 500 kể cả với node media đã biết chắc tồn tại, nên là lỗi dịch vụ tạm thời. Đã KHÔNG vẽ
gradient thay thế.

## Trạng thái đã đăng nhập

**Không có ảnh chụp.** Được phủ bằng test thay vì ảnh: `[C27]` (`@auth`) assert đúng 5 dòng
`kudos-stat-row`, và toàn bộ tầng `@auth` xanh. Nói rõ ở đây để không ai tưởng đã nhìn tận mắt.
