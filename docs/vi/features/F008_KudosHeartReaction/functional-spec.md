---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
---

# Functional Spec — F008_KudosHeartReaction

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-07

**See also:** [`technical-spec.md`](./technical-spec.md) — bảng lượt tim, RLS, server action,
Source citations cho độc giả Dev/QA/SA.

**Traceability:** F008_KudosHeartReaction → SCR007_KudosLiveBoard (dùng
chung với F007_KudosLiveBoard, MoMorph screen `MaZUn5xHXZ`, item `C.4.1_Hearts`
`I3127:21871;256:5175`) → US001 (draft, local) → BR-001…BR-003 (mới, xem § 5) → không có route
riêng (nút tim là 1 control nằm trong `/kudos` do F007 sở hữu) →
`momorph/test-cases-MaZUn5xHXZ.csv` nhóm "Like business rule" (Sender cannot like own Kudos, One
like per user per Kudos) + "Check component interaction/Button [Heart]" trong phạm vi; "Like on
special day" hoãn — xem § 3 Open Decisions (không có, đã chốt ở `clarifications.md`) và § 9 Edge
Cases.

## 1. Overview

**Problem:** Một lời cảm ơn trên Bảng Kudos trực tiếp hiện chỉ là thông điệp một chiều — không có
cách nào để đồng nghiệp khác bày tỏ mình cũng đồng tình với lời cảm ơn đó, và Sunner bỏ công viết
lời cảm ơn hay không được ghi nhận định lượng cho nỗ lực đó.

**Solution:** Mỗi thẻ Kudos có 1 nút trái tim. Sunner đã đăng nhập bấm để thả tim (hoặc bấm lại để
bỏ tim); số tim trên thẻ đổi ngay, và tài khoản của Sunner đã **viết** kudo đó (không phải người
được cảm ơn) được cộng hoặc thu hồi đúng số tim tương ứng.

**Scope:** Bảng ghi lượt tim với ràng buộc đúng 1 lượt/1 người/1 kudo; chặn Sunner tự thả tim cho
kudo chính mình gửi; thu hồi đúng số tim đã cộng khi bỏ tim; nút tim hiển thị nhưng disable cho
người chưa đăng nhập.

**Non-Scope:** Quy tắc cộng thêm tim vào "ngày đặc biệt do admin cấu hình" (C.4.1) — không có màn
admin, không có bảng cấu hình, không dựng được precondition của test case tương ứng; hoãn theo
`clarifications.md`. Cột đánh dấu `special` vẫn có sẵn trong migration để lần sau không phải
migrate lại. F008 cũng không cung cấp một API/DAL đọc số tim riêng — xem § 12 Dependencies.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner đã đăng nhập | Nhân viên đã xác thực, đang xem Bảng Kudos trực tiếp | Thả tim (hoặc bỏ tim) cho một kudo của người khác để bày tỏ đồng tình |
| Sunner chưa đăng nhập | Khách truy cập `/kudos` công khai, chưa đăng nhập | Nhìn thấy nút tim (ở trạng thái disable) mà không thể tương tác |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Thả tim cho Kudos | Bấm trái tim trên 1 kudo của người khác để thả tim; bấm lại để bỏ tim | US001 | FR-001, FR-201, FR-202, FR-203, FR-401, FR-402, FR-601 | BR-001, BR-002, BR-003 | SCR007_KudosLiveBoard |

## 3. Open Decisions

None — no unresolved domain confirmations. Quy tắc "+2 tim ngày đặc biệt" không phải một domain
confirmation còn treo — đã được `clarifications.md` chốt là hoãn (không có màn admin để dựng
precondition), không phải một câu hỏi chờ stakeholder trả lời.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Hệ thống có một bảng lượt tim ghi quan hệ giữa 1 Sunner và 1 kudo, với ràng buộc
  không cho phép quá 1 lượt tim của cùng 1 người trên cùng 1 kudo.

### Bảng Kudos trực tiếp (2xx)

- **FR-201** Nút tim trên mỗi thẻ Kudos hiển thị đúng trạng thái của người xem hiện tại cho đúng
  kudo đó (xám = chưa thả, đỏ = đã thả).
- **FR-202** Nút tim bị disable trên kudo do chính người xem gửi — người gửi không thể tự thả tim
  cho lời cảm ơn của mình.
- **FR-203** Người chưa đăng nhập nhìn thấy nút tim ở trạng thái disable kèm gợi ý đăng nhập.

### Interaction (4xx)

- **FR-401** Bấm nút tim đổi trạng thái thả tim/bỏ tim và cập nhật ngay số lượt tim hiển thị trên
  thẻ, không cần tải lại trang.
- **FR-402** Bỏ tim thu hồi đúng số tim đã cộng trước đó vào tài khoản của Sunner đã gửi kudo đó.

### Security (6xx)

- **FR-601** Máy chủ luôn xác thực lại người dùng và kiểm tra lại toàn bộ điều kiện nghiệp vụ (đã
  đăng nhập, không phải người gửi, chưa từng thả tim) trước khi ghi một lượt tim — không tin
  tưởng trạng thái nút phía client.

## 5. Business Rules

- Mỗi Sunner chỉ có đúng 1 lượt thả tim cho 1 kudo; ràng buộc duy nhất trên bảng lượt tim chặn
  lượt ghi thứ 2 trở đi (BR-001)
- Sunner đã gửi 1 kudo không được thả tim cho chính kudo đó (BR-002)
- Mỗi lượt thả tim cộng đúng 1 tim vào tài khoản của Sunner đã GỬI kudo đó (không phải người
  nhận); bỏ tim thu hồi đúng số tim đã cộng (BR-003)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | Nút trái tim + số lượt tim trên mỗi thẻ Kudos (xám = chưa thả, đỏ = đã thả; disable trên kudo của chính mình hoặc khi chưa đăng nhập) | Thả tim / bỏ tim cho một kudo của người khác |

### User Journey

1. Sunner đang xem Bảng Kudos trực tiếp, thấy trái tim màu xám kèm số lượt tim trên một thẻ Kudos
   của đồng nghiệp.
2. Sunner bấm trái tim — trái tim chuyển đỏ, số tim tăng thêm 1 ngay lập tức, và tài khoản của
   Sunner đã gửi kudo đó được cộng 1 tim.
3. Sunner bấm lại trái tim đang đỏ — trái tim chuyển về xám, số tim giảm đúng 1, và tim đã cộng
   cho người gửi bị thu hồi đúng số đó.

## 7. User Stories

### US001_ThaTimChoKudo — Thả tim cho một Kudo

**Actor:** Sunner đã đăng nhập
**Goal:** Bày tỏ đồng tình với một lời cảm ơn bằng cách thả tim (và có thể bỏ tim nếu đổi ý)
**Business value:** Ghi nhận định lượng được lời cảm ơn tốt, nuôi dữ liệu cho hệ thống hoa
thị/Hero tier trên trang hồ sơ của Sunner đã viết kudo đó

**Acceptance Criteria:**
- [ ] Bấm tim trên kudo của người khác (chưa từng thả) → tim chuyển đỏ, số tim +1, tài khoản
  Sunner đã gửi kudo đó +1 tim.
- [ ] Bấm lại tim đang đỏ trên chính kudo đó → tim chuyển xám, số tim -1, tim đã cộng cho người
  gửi bị thu hồi đúng 1.
- [ ] Bấm tim trên kudo do chính mình gửi → nút luôn ở trạng thái disable, không ghi được lượt
  tim nào.
- [ ] Chưa đăng nhập → nút tim hiển thị nhưng disable, không thể bấm.

## 8. Scenarios

### US001_ThaTimChoKudo — Happy Path

**Given** Sunner đã đăng nhập đang xem một kudo của đồng nghiệp mà mình chưa từng thả tim, **When**
Sunner bấm nút trái tim, **Then** trái tim chuyển đỏ, số tim trên thẻ tăng thêm 1, và tài khoản
của Sunner đã gửi kudo đó được cộng 1 tim.

### US001_ThaTimChoKudo — Bỏ tim (unheart)

**Given** Sunner đã đăng nhập đã thả tim cho một kudo trước đó, **When** Sunner bấm lại nút trái
tim đang đỏ, **Then** trái tim chuyển về xám, số tim giảm đúng 1, và tim đã cộng cho tài khoản
người gửi kudo đó bị thu hồi đúng 1.

### US001_ThaTimChoKudo — Error: Tự thả tim cho kudo của chính mình

**Given** Sunner đã đăng nhập đang xem một kudo do chính mình gửi, **When** Sunner cố bấm nút
trái tim, **Then** nút vẫn ở trạng thái disable và không có lượt tim nào được ghi.

### US001_ThaTimChoKudo — Error: Chưa đăng nhập

**Given** khách truy cập `/kudos` chưa đăng nhập, **When** khách nhìn thấy nút trái tim trên một
thẻ Kudos, **Then** nút hiển thị nhưng ở trạng thái disable, không thể bấm.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Bấm tim liên tiếp thật nhanh trước khi lượt bấm trước hoàn tất (race) | Ràng buộc duy nhất trên bảng lượt tim là trọng tài cuối cùng ở tầng DB; yêu cầu tới sau tự đồng bộ lại đúng trạng thái, không tạo lượt tim trùng | "None — im lặng đồng bộ lại đúng trạng thái, không hiện lỗi" |
| Gọi thẳng hành động thả tim trên chính kudo mình gửi, bỏ qua nút đã disable ở giao diện | Máy chủ từ chối ghi ở tầng dữ liệu, không tạo lượt tim nào | "None — nút vẫn hiển thị disable, không có thông báo lỗi rời rạc" |
| Chưa đăng nhập cố thả tim (bỏ qua nút đã disable) | Máy chủ từ chối vì không xác thực được người dùng | "Đăng nhập để thả tim cho Kudos này" |
| Kudo bị xoá nhưng vẫn còn lượt tim cũ tham chiếu tới | Lượt tim liên quan bị xoá theo kudo (ràng buộc khoá ngoại cascade) | "None — kudo không còn hiển thị nên lượt tim liên quan cũng biến mất theo" |

## 10. Edge Behaviours to Verify

- **FR-401** → Xác nhận bấm tim đổi màu và số tim ngay lập tức, không cần tải lại trang.
- **FR-201** → Xác nhận trạng thái nút (xám/đỏ) đúng theo đúng người xem hiện tại, không lẫn giữa
  các Sunner khác nhau.
- **FR-202** → Xác nhận nút luôn disable trên đúng kudo do chính người xem gửi.
- **FR-402** → Xác nhận bỏ tim thu hồi đúng 1 tim khỏi tài khoản người gửi, không thừa không
  thiếu.
- **FR-601** → Xác nhận gọi thẳng hành động thả tim (bỏ qua giao diện) vẫn bị chặn đúng theo các
  điều kiện nghiệp vụ.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|

N/A — none found. Chưa có code nên chưa có hành vi bất thường nào được quan sát.

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F007_KudosLiveBoard | feature | Bảng lượt tim của F008 tham chiếu `kudos.id`/`kudos.sender_id` do F007 định nghĩa; nút tim và số tim hiển thị trên thẻ do F007 render, đọc trực tiếp dữ liệu F008 ghi — F008 không lộ API/DAL đọc riêng | `clarifications.md`, `feature-list.md` § F008 |
| public.users | data | Khoá ngoại của lượt tim trỏ về Sunner đang đăng nhập | `supabase/migrations/0001_users_table.sql` |

## 13. Configuration

N/A — no user-facing configuration constants for this feature. Quy tắc "+2 tim ngày đặc biệt" là
cấu hình do admin đặt trong tương lai, nhưng chưa có màn admin nào tồn tại — xem § 1 Non-Scope.
