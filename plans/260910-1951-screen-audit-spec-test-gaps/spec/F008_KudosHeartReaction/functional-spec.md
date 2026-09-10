---
status: draft
authored_by: takumi
fcode: F008
created: 2026-09-10
lang: vi
---

# Functional Spec — F008_KudosHeartReaction — REVISION

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-10

**See also:** [`technical-spec.md`](./technical-spec.md) — Source citations, rung chi tiết cho
phần thay đổi này.

**Revision note:** bản `docs/vi/features/F008_KudosHeartReaction/functional-spec.md` hiện tại
(`status: implemented`) thiếu 2 yêu cầu khách hàng xác nhận qua audit — thiếu trạng thái chờ khi
đang xử lý, và bug UI với kudo ẩn danh. File này chỉ liệt kê phần THÊM MỚI; §§ khác giữ nguyên.

## 2. Functional Capabilities — không thêm CAP mới

Vẫn 1 capability `CAP-01` (Thả tim cho Kudos) — mở rộng `Requirements`/`Business Rules`: bổ sung
FR-204, FR-205, BR-004, BR-005, US002.

## 4. Requirements — bổ sung

### Bảng Kudos trực tiếp (2xx) — bổ sung

- **FR-204** Nút tim của đúng kudo đang thao tác hiển thị trạng thái đang xử lý (disable tạm thời)
  trong lúc chờ máy chủ trả lời, thay vì không phản hồi gì với lượt bấm thứ 2.
- **FR-205** Nút tim của một kudo gửi ẩn danh disable đúng cho chính người đã gửi kudo đó, giống
  hệt kudo không ẩn danh — không còn hiện nhầm ở trạng thái có thể bấm.

## 5. Business Rules — bổ sung

- Trong lúc yêu cầu thả/bỏ tim của 1 kudo chưa được máy chủ trả lời, nút tim của đúng kudo đó ở
  trạng thái disable tạm thời; trở lại bình thường ngay khi có phản hồi (thành công hay lỗi).
  (BR-004)
- Chính người đã gửi 1 kudo ẩn danh nhìn thấy nút tim của kudo đó ở trạng thái disable, giống hệt
  mọi kudo tự gửi khác — không phụ thuộc việc danh tính người gửi có bị ẩn trên giao diện hay
  không. (BR-005)

## 7. User Stories — bổ sung

### US002_SeePendingAndOwnKudoHeartState — See Pending and Own-Kudo Heart Button State

**Actor:** Sunner đã đăng nhập
**Goal:** Nhìn thấy đúng trạng thái nút tim ngay cả khi yêu cầu đang xử lý hoặc khi đang xem lại
kudo ẩn danh do chính mình gửi.
**Business value:** Tránh cảm giác nút "bị đơ" khi mạng chậm, và tránh nút hiện sai trạng thái có
thể bấm trên kudo tự gửi ẩn danh — cả 2 đều làm người dùng nghi ngờ tính năng bị lỗi dù server vẫn
đúng.

**Acceptance Criteria:**
- [ ] Bấm tim, trước khi có phản hồi bấm lại lần nữa trên đúng kudo đó → nút hiện disable tạm
  thời, không có phản hồi bất thường (không đổi trạng thái 2 lần, không gửi 2 request).
- [ ] Đăng nhập đúng tài khoản đã gửi 1 kudo ẩn danh, xem lại kudo đó trên board → nút tim disable,
  giống mọi kudo tự gửi không ẩn danh khác.

## 8. Scenarios — bổ sung

### US002_SeePendingAndOwnKudoHeartState — Happy Path: đang xử lý

**Given** Sunner đã đăng nhập vừa bấm tim trên 1 kudo, **When** Sunner bấm lại ngay trong lúc yêu
cầu đầu chưa trả lời, **Then** nút hiện trạng thái disable tạm thời cho tới khi máy chủ trả lời.

### US002_SeePendingAndOwnKudoHeartState — Happy Path: kudo ẩn danh của chính mình

**Given** Sunner đã đăng nhập từng gửi 1 kudo ẩn danh, **When** Sunner xem lại đúng kudo đó trên
board, **Then** nút tim của kudo đó hiện disable, giống mọi kudo tự gửi khác.

## 9. Edge Cases — bổ sung

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Bấm tim liên tiếp thật nhanh trên cùng 1 kudo trước khi lượt trước trả lời | Nút hiện disable tạm thời ngay từ lượt bấm thứ 2, không gửi thêm request | "None — trạng thái nút tự phản ánh đang xử lý, không có thông báo lỗi rời rạc" |
| Chính người gửi 1 kudo ẩn danh xem lại kudo đó | Nút tim disable đúng như kudo không ẩn danh | "None — nút disable, không có tooltip nhắc lý do (khác trường hợp chưa đăng nhập, vốn có gợi ý đăng nhập)" |

## 10. Edge Behaviours to Verify — bổ sung

- **FR-204** → Xác nhận bấm tim lần 2 trong lúc lần 1 đang xử lý không gửi thêm request và nút
  hiện disable tạm thời.
- **FR-205** → Xác nhận nút tim disable đúng khi người xem hiện tại chính là người đã gửi 1 kudo ẩn
  danh (không dựa vào `sender.id`, vốn luôn `null` với kudo ẩn danh).

## 12. Dependencies — bổ sung

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F007's `kudos_cards` view | feature | FR-205 cần 1 cờ `is_own` tính từ `sender_id` THẬT (chưa mask ẩn danh) — F008 không tự sở hữu view này, chỉ tiêu thụ cột mới | `technical-spec.md § 4.2`, `technical-spec.md § 5.3` #1 |
