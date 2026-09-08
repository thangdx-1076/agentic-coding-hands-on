---
status: draft
authored_by: takumi
created: 2026-09-07
lang: vi
---

# Functional Spec — F009_KudosCompose

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-07

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoint, Source citation, pseudocode,
key entities, và DB write cho Dev/QA/SA.

**Traceability:** F009_KudosCompose → US001, US002, US003, US004

## 1. Overview

**Problem:** Sunner muốn công khai cảm ơn đồng đội ngay trên trang bảng Kudos mà không phải rời
trang hay tìm nút riêng — hiện `/kudos` chỉ có bảng đọc và pill "Viết Kudo" chưa hoạt động
(readonly, chưa có `onClick`).
**Solution:** Thêm dialog "Viết Kudo" mở đè lên `/kudos`: chọn người nhận, đặt danh hiệu, viết lời
cảm ơn (có định dạng cơ bản + nhắc tên), gắn tối đa 5 hashtag và 5 ảnh, tuỳ chọn gửi ẩn danh — gửi
xong dialog đóng và Kudo mới hiện ngay trên bảng.
**Scope:** mở/đóng dialog từ pill có sẵn; 4 trường bắt buộc (Người nhận, Danh hiệu, Nội dung,
Hashtag); hashtag/ảnh có giới hạn; gửi ẩn danh tuỳ chọn; validate và ghi Kudo mới; cập nhật bảng
ngay sau khi gửi.
**Non-Scope:** không có route riêng cho màn soạn Kudo (không phải trang mới); không sửa cách hiển
thị Kudo cũ; không thêm bảng vocabulary hashtag chính thức (chỉ gợi ý từ dữ liệu sẵn có); không làm
rich-text editor thật (chỉ chèn ký hiệu markdown-subset vào textarea thường).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner | nhân viên nội bộ đã đăng nhập | Gửi một lời cảm ơn (Kudo) có định dạng tới đồng đội |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Soạn và gửi Kudo | Sunner chọn người nhận, đặt danh hiệu, viết lời cảm ơn kèm hashtag/ảnh/tuỳ chọn ẩn danh rồi gửi | US001, US002, US003, US004 | FR-001, FR-002, FR-101, FR-102, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-401, FR-402, FR-403, FR-404, FR-601 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, DEC-001, DEC-002, SM-001 | SCR-kudos-compose (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Khi bật "Gửi ẩn danh" nhưng để trống tên ẩn danh lúc bấm Gửi, hệ thống có chặn submit như 4 trường bắt buộc khác không? | Chặn submit + báo lỗi tại ô tên ẩn danh, giống các trường bắt buộc còn lại | Nhất quán với cách 4 trường bắt buộc đang được validate, tránh lưu Kudo ẩn danh không có tên hiển thị | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Cần bucket Supabase Storage lưu ảnh Kudos, tạo bằng migration, trước khi tính năng
  đính kèm ảnh hoạt động.
- **FR-002** Cần migration bật RLS insert cho bảng `kudos` (chỉ sender ghi dòng của chính mình) và
  thêm 2 cột ẩn danh, trước khi Server Action gửi Kudo hoạt động.

### Navigation (1xx)

- **FR-101** Sunner đã đăng nhập mở modal Viết Kudo bằng cách bấm pill "Viết Kudo" trên trang
  `/kudos`.
- **FR-102** Người dùng chưa đăng nhập bấm pill thì được đưa tới trang đăng nhập thay vì mở modal.

### Kudos Compose (2xx)

- **FR-201** Modal hiển thị đúng 4 trường bắt buộc (Người nhận, Danh hiệu, Nội dung, Hashtag) cùng
  2 trường tuỳ chọn (Image, Gửi ẩn danh).
- **FR-202** Trường Người nhận là ô tìm kiếm autocomplete, gợi ý Sunner theo tên khi gõ, chỉ nhận
  một Sunner có thật.
- **FR-203** Trường Danh hiệu là input text bắt buộc kèm placeholder và 2 dòng gợi ý.
- **FR-204** Trường Nội dung là textarea bắt buộc, có toolbar định dạng và hỗ trợ "@ + tên" để
  nhắc đồng nghiệp.
- **FR-205** Trường Hashtag cho thêm tối đa 5 chip qua dropdown gợi ý, tối thiểu 1 hashtag.
- **FR-206** Trường Image cho đính kèm tối đa 5 ảnh `.jpg`/`.png`, xoá được từng ảnh riêng lẻ.
- **FR-207** Checkbox "Gửi ẩn danh" khi bật hiện thêm ô nhập tên ẩn danh, khi tắt thì ẩn đi.
- **FR-208** Nút Gửi bị disable cho tới khi cả 4 trường bắt buộc hợp lệ; nút Hủy luôn bật.

### Interaction (4xx)

- **FR-401** Gửi thành công thì modal đóng và Kudo mới xuất hiện ngay trên bảng `/kudos`.
- **FR-402** Thiếu bất kỳ trường bắt buộc nào khi bấm Gửi thì hiển thị viền đỏ + thông báo lỗi
  đúng tại trường đó và không submit.
- **FR-403** Thêm hashtag thứ 6 bị chặn kèm thông báo giới hạn "Tối đa 5 hashtag".
- **FR-404** Thêm ảnh thứ 6, hoặc chọn sai định dạng file (không phải `.jpg`/`.png`), bị chặn kèm
  thông báo lỗi.

### Security (6xx)

- **FR-601** Máy chủ tự xác thực người gửi trước khi ghi Kudo; yêu cầu từ người chưa đăng nhập bị
  từ chối dù có bỏ qua bước điều hướng.

## 5. Business Rules

- Danh hiệu được lưu làm phần tử đầu của mảng hashtag; các hashtag người dùng thêm là các phần tử
  tiếp theo, tối đa 6 phần tử. (BR-001)
- Tổng số hashtag chip tối thiểu 1, tối đa 5. (BR-002)
- Ảnh đính kèm tối đa 5 file, chỉ nhận `.jpg`/`.png`, lưu vào bucket Storage riêng cho Kudos.
  (BR-003)
- Bật "Gửi ẩn danh" bắt buộc phải nhập tên ẩn danh; hệ thống lưu `is_anonymous=true` kèm tên đó.
  (BR-004)
- Toolbar định dạng chèn ký hiệu markdown-subset vào nội dung; thẻ Kudo hiển thị lại đúng định
  dạng thay vì ký hiệu thô. (BR-005)
- Chưa đăng nhập thì không mở được modal (bị đưa tới đăng nhập) và Server Action luôn tự kiểm tra
  phiên đăng nhập trước khi ghi. (BR-006)
- Bật checkbox "Gửi ẩn danh" thì lộ thêm ô nhập tên ẩn danh trên form. (DEC-001)
- Thiếu bất kỳ trường bắt buộc nào lúc bấm Gửi thì báo lỗi đúng tại từng trường và không submit.
  (DEC-002)
- Trạng thái hiển thị của modal Viết Kudo đi qua 4 mốc: đóng, mở, đang gửi, đóng lại. (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Viết Kudo (dialog) | SCR-kudos-compose (draft) | Dialog che phủ `/kudos`, gồm tiêu đề, các trường Người nhận/Danh hiệu/Nội dung/Hashtag/Image/Checkbox ẩn danh, và 2 nút Hủy/Gửi | Chọn người nhận, đặt danh hiệu, viết nội dung có định dạng, gắn hashtag/ảnh, chọn gửi ẩn danh, gửi hoặc huỷ |

### User Journey

1. Sunner đang xem bảng Kudos tại `/kudos`, thấy pill "Viết Kudo".
2. Sunner bấm pill — nếu đã đăng nhập, dialog "Viết Kudo" mở đè lên trang; nếu chưa, được đưa tới
   trang đăng nhập.
3. Sunner chọn người nhận, đặt danh hiệu, viết nội dung, thêm hashtag (và tuỳ chọn ảnh/ẩn danh).
4. Sunner bấm "Gửi" — dialog đóng và Kudo mới xuất hiện ngay trên bảng, hoặc bấm "Hủy" để đóng
   dialog mà không lưu gì.

## 7. User Stories

### US001_SendKudo — Gửi một Kudo tới đồng đội

**Actor:** Sunner
**Goal:** Gửi một lời cảm ơn (Kudo) có danh hiệu, nội dung và hashtag tới một đồng đội cụ thể.
**Business value:** Ghi nhận đóng góp của đồng đội công khai, củng cố văn hoá cảm ơn nội bộ.

**Acceptance Criteria:**
- [ ] Chọn được người nhận từ danh sách gợi ý theo tên.
- [ ] Điền đủ Danh hiệu, Nội dung, ≥1 Hashtag rồi Gửi thành công — dialog đóng, Kudo mới hiện trên
      bảng.
- [ ] Thiếu bất kỳ trường bắt buộc nào thì Gửi bị chặn, đúng trường đó báo lỗi.

### US002_ManageHashtags — Gắn hashtag cho Kudo

**Actor:** Sunner
**Goal:** Gắn các hashtag mô tả cho lời cảm ơn, tối đa 5 hashtag.
**Business value:** Giúp lời cảm ơn dễ được tìm/lọc theo chủ đề trên bảng Kudos.

**Acceptance Criteria:**
- [ ] Thêm được hashtag qua dropdown gợi ý hoặc nhập tay.
- [ ] Xoá được từng hashtag đã thêm.
- [ ] Không thêm được quá 5 hashtag, có thông báo giới hạn.

### US003_AttachImages — Đính kèm ảnh minh hoạ

**Actor:** Sunner
**Goal:** Đính kèm tối đa 5 ảnh minh hoạ cho lời cảm ơn.
**Business value:** Bằng chứng trực quan làm lời cảm ơn thuyết phục và sinh động hơn.

**Acceptance Criteria:**
- [ ] Thêm được ảnh `.jpg`/`.png` qua file picker.
- [ ] Xoá được từng ảnh đã thêm.
- [ ] Không thêm được quá 5 ảnh; file sai định dạng bị từ chối kèm thông báo lỗi.

### US004_SendAnonymousKudo — Gửi Kudo ẩn danh

**Actor:** Sunner
**Goal:** Gửi lời cảm ơn mà không tiết lộ danh tính người gửi thật.
**Business value:** Khuyến khích những lời cảm ơn thẳng thắn khi người gửi ngại lộ danh tính.

**Acceptance Criteria:**
- [ ] Bật checkbox "Gửi ẩn danh" thì hiện thêm ô nhập tên ẩn danh.
- [ ] Gửi thành công thì Kudo được đánh dấu ẩn danh kèm tên ẩn danh đã nhập.
- [ ] Tắt checkbox thì ô tên ẩn danh biến mất trở lại.

## 8. Scenarios

### US001_SendKudo — Happy Path

**Given** Sunner đã đăng nhập và mở dialog Viết Kudo, **When** chọn người nhận hợp lệ, điền Danh
hiệu/Nội dung, thêm 1 hashtag rồi bấm Gửi, **Then** dialog đóng và Kudo mới xuất hiện trên bảng
`/kudos`.

### US001_SendKudo — Error: thiếu trường bắt buộc

**Given** dialog đang mở, **When** để trống Người nhận rồi bấm Gửi, **Then** trường Người nhận
hiện viền đỏ kèm thông báo lỗi, form không được gửi.

### US002_ManageHashtags — Happy Path

**Given** dialog đang mở, **When** thêm 3 hashtag hợp lệ, **Then** cả 3 hiển thị dạng chip có thể
xoá.

### US002_ManageHashtags — Error: vượt giới hạn

**Given** đã có 5 hashtag, **When** cố thêm hashtag thứ 6, **Then** hệ thống chặn thêm và hiện
"Tối đa 5 hashtag".

### US003_AttachImages — Happy Path

**Given** dialog đang mở, **When** chọn 2 ảnh `.jpg` hợp lệ, **Then** cả 2 hiển thị thumbnail có
thể xoá.

### US003_AttachImages — Error: sai định dạng

**Given** dialog đang mở, **When** chọn file `.pdf`, **Then** hệ thống từ chối và hiện thông báo
lỗi định dạng file.

### US004_SendAnonymousKudo — Happy Path

**Given** dialog đang mở, **When** bật "Gửi ẩn danh" và nhập tên ẩn danh, **Then** Kudo được gửi
với danh tính ẩn.

### US004_SendAnonymousKudo — Error: tên ẩn danh rỗng

**Given** đã bật "Gửi ẩn danh", **When** để trống tên ẩn danh rồi bấm Gửi, **Then** hệ thống báo
lỗi tại ô tên ẩn danh, form không được gửi *(theo default của Open Decision D001)*.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Thiếu tất cả trường bắt buộc khi bấm Gửi | hiển thị lỗi ở cả 4 trường, không submit | "Vui lòng điền đầy đủ thông tin bắt buộc." |
| Thêm hashtag thứ 6 | bị chặn thêm | "Tối đa 5 hashtag." |
| Thêm ảnh thứ 6 hoặc sai định dạng | bị chặn thêm/upload | "Sai định dạng file — chỉ nhận .jpg hoặc .png, tối đa 5 ảnh." |
| Truy cập khi chưa đăng nhập | chuyển hướng đăng nhập, không mở modal | "Vui lòng đăng nhập để gửi Kudo." |
| Bật ẩn danh nhưng để trống tên ẩn danh lúc Gửi | chặn submit *(mặc định, xem D001)* | "Không được để trống." |

## 10. Edge Behaviours to Verify

- **FR-208** → Nút Gửi chỉ bật khi cả 4 trường bắt buộc đã hợp lệ, tắt ngay khi bất kỳ trường nào
  bị xoá trống lại.
- **FR-401** → Sau khi gửi thành công, Kudo mới phải xuất hiện trên bảng `/kudos` mà không cần tải
  lại trang thủ công.
- **FR-403** → Hashtag thứ 6 luôn bị chặn, không lọt qua được bằng bất kỳ thao tác nào.
- **FR-404** → File sai định dạng luôn bị chặn ở bước chọn file, không upload lên Storage.
- **FR-601** → Server Action luôn tự kiểm tra phiên đăng nhập, kể cả khi client bị qua mặt (gọi
  thẳng action).

## 11. Risks & Known Issues

N/A — none found.

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F007 (bảng Kudos) | feature | Modal mở đè lên bảng `/kudos` đã ship; Kudo mới phải hiện ngay trên bảng đó | FR-401 |
| F005 (trang /standards) | feature | Link "Tiêu chuẩn cộng đồng" trong toolbar trỏ tới trang này | FR-204 |
| Supabase Storage | infrastructure | Cần bucket lưu ảnh đính kèm, hiện chưa được bật trong cấu hình | FR-206, BR-003 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
