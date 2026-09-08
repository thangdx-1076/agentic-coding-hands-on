---
status: implemented
authored_by: takumi
created: 2026-09-08
lang: vi
---

# Functional Spec — F010_SecretBoxModal

**Priority**: P2
**Type**: mixed

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** TBD (draft) → TBD (draft) → US001, US002, US003

## 1. Overview

**Problem:** Người dùng Kudos tích luỹ lượt tim ❤️ trên các Kudos họ gửi, nhưng chưa có cách nào
thực sự "đổi" số lượt đó thành phần thưởng cụ thể — nút "Mở Secret Box" trên `/kudos` tồn tại
sẵn nhưng luôn ở trạng thái `disabled`, và số liệu hiển thị luôn cứng là `0`.
**Solution:** Cho phép người dùng đã đăng nhập trên `/kudos` mở Secret Box thật: tính đúng số hộp
được mở dựa trên lượt tim đã gửi, bấm mở để máy chủ rút ngẫu nhiên 1 trong 6 huy hiệu, và giảm
đúng số hộp chưa mở.
**Scope:** Chỉ `/kudos`; tính entitlement theo lượt tim đã gửi; modal 2 trạng thái (chưa mở / đã
mở); rút huy hiệu và ghi số hộp hoàn toàn ở phía máy chủ; đóng/mở modal theo pattern `<dialog>`
gốc đã có trong sản phẩm.
**Non-Scope:** Nút "Mở Secret Box" trên `/profile` (giữ `disabled`, xem `## 3. Open Decisions`
D002); phản chiếu huy hiệu vừa nhận vào bộ sưu tập huy hiệu trên `/profile` (xem D003).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Người dùng Kudos đã đăng nhập | Thành viên đã xác thực, đang xem bảng `/kudos` | Mở Secret Box để nhận huy hiệu ngẫu nhiên dựa trên lượt tim đã tích luỹ |

## 2. Functional Capabilities

**Single-capability rationale:** US001, US002 và US003 đều phục vụ một mục tiêu duy nhất — biến
lượt tim tích luỹ thành phần thưởng cụ thể qua modal Secret Box trên `/kudos`.

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Mở Secret Box trên /kudos | Xem số hộp chưa mở, bấm mở để nhận huy hiệu ngẫu nhiên, xem huy hiệu vừa nhận, đóng modal | US001, US002, US003 | FR-001, FR-002, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-401, FR-601, FR-602 | BR-001, BR-002, BR-003, BR-004, DEC-001, DEC-002, DEC-003, SM-001 | TBD (draft) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Modal có nên chỉ dùng MỘT tiêu đề duy nhất, thay vì 2 tiêu đề khác nhau theo trạng thái chưa mở/đã mở (cách đọc hiện là `[INFERRED]`)? | Giữ 2 tiêu đề: "KHÁM PHÁ SECRET BOX CỦA BẠN" (chưa mở) và "MỞ SECRET BOX THÀNH CÔNG" (đã mở) | Đây là cách đọc duy nhất khớp cả 2 nguồn MCP (render frame và spec row/test case) cùng lúc | no |
| D002 | Có xây đường ống stats thật cho `/profile` để bật nút "Mở Secret Box" ở đó, kéo theo viết lại các kịch bản kiểm thử tự động đã có cho `/profile`? | Không — nút `/profile` giữ nguyên `disabled`, coi là việc của một tính năng sau | `/profile` chưa có đường ống stats thật (thẻ thống kê trên `/profile` chưa nhận số liệu thật); bật nút ở đây là phạm vi một PR khác | no |
| D003 | Huy hiệu vừa nhận có cần phản chiếu ngay vào bộ sưu tập huy hiệu trên `/profile` (hiện là 6 slot tĩnh)? | Không trong PR này | Bảng ghi lịch sử mở hộp (migration 0011) đã đủ dữ liệu để làm sau; nối dữ liệu vào bộ sưu tập huy hiệu là việc riêng | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Hệ thống tính số Secret Box được phép mở (entitlement) theo tổng lượt tim mà chính người dùng đã GỬI, cứ mỗi 5 lượt tim làm tròn xuống thành 1 hộp.
- **FR-002** Trang `/kudos` không còn hiển thị số Secret Box đã mở/chưa mở bằng giá trị cứng `0` — cả hai lấy từ dữ liệu thật.

### Navigation (1xx)

- **FR-101** Nút "Mở Secret Box" trên `/kudos` là điểm vào duy nhất của tính năng này; nút cùng tên trên `/profile` vẫn giữ nguyên `disabled`, ngoài phạm vi.

### Secret Box Modal (2xx)

- **FR-201** Modal ở trạng thái chưa mở hiển thị tiêu đề "KHÁM PHÁ SECRET BOX CỦA BẠN", dòng hướng dẫn, hộp quà chưa mở, và nhãn + số hộp chưa mở.
- **FR-202** Nút mở modal `disabled` khi số hộp chưa mở bằng 0; modal không mở được trong trường hợp này.
- **FR-203** Bấm vào box gọi máy chủ, nhận đúng 1 trong 6 huy hiệu ngẫu nhiên, và số hộp chưa mở giảm đúng 1.
- **FR-204** Sau khi mở thành công, modal chuyển tiêu đề sang "MỞ SECRET BOX THÀNH CÔNG" và hiển thị đúng ảnh huy hiệu vừa nhận ở kích thước gốc 64×64, không phóng to.
- **FR-205** Khi số hộp chưa mở về 0 ngay trong modal đang mở, dòng hướng dẫn bị ẩn và box không còn bấm mở được nữa.

### Interaction (4xx)

- **FR-401** Modal đóng được bằng nút X hoặc phím Escape, theo đúng pattern `<dialog>` gốc đã dùng ở các modal khác trong sản phẩm.

### Security (6xx)

- **FR-601** Việc rút huy hiệu và tính/ghi số hộp chưa mở chỉ chạy ở phía máy chủ (Postgres, chỉ `authenticated` mới gọi được); sửa giá trị phía client không đổi được huy hiệu hay số hộp đã lưu, và hai lần mở gần như đồng thời không bao giờ vượt quá số hộp thực có.
- **FR-602** Khách ẩn danh (chưa đăng nhập) không thấy nút hay số liệu Secret Box nào trên `/kudos`.

## 5. Business Rules

- Tỷ lệ 6 huy hiệu cố định (30/25/20/10/10/5%); mỗi lần mở là một lượt rút độc lập, cho phép trùng huy hiệu giữa các lần. (BR-001)
- Số Secret Box được mở tính theo lượt tim người dùng đã GỬI, không phải lượt tim nhận được. (BR-002)
- Hai lần mở gần như đồng thời (double-click, nhiều tab) bị khoá theo người dùng và kiểm lại quyền ngay trong giao dịch ghi, không bao giờ mở vượt số hộp thực có. (BR-003)
- Trạng thái đã mở hiển thị đúng huy hiệu ở kích thước gốc 64×64, không phóng to, vì không có asset hộp-đã-mở riêng. (BR-004)
- Nút "Mở Secret Box" `disabled` khi hết hộp, `enabled` khi còn ít nhất 1 hộp. (DEC-001)
- Khi số hộp chưa mở về 0 ngay trong modal đang mở, dòng hướng dẫn ẩn đi và box hết bấm được. (DEC-002)
- Mở thành công chuyển tiêu đề modal từ "KHÁM PHÁ SECRET BOX CỦA BẠN" sang "MỞ SECRET BOX THÀNH CÔNG" kèm huy hiệu vừa nhận. (DEC-003)
- Modal Secret Box có 3 trạng thái hiển thị — đóng, chưa mở, đã mở — chuyển đổi qua các hành động mở nút / bấm box / đóng modal. (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Secret Box Modal | TBD (draft) | Modal 2 trạng thái trên nền `/kudos`: chưa mở (hộp quà, hướng dẫn, số hộp) và đã mở (huy hiệu vừa nhận) | Bấm box để mở, xem huy hiệu, đóng modal bằng X hoặc Escape |

### User Journey

1. Người dùng đã đăng nhập ở `/kudos` thấy nút "Mở Secret Box"; nút `enabled` nếu còn hộp, `disabled` nếu hết.
2. Bấm nút mở modal Secret Box, thấy tiêu đề "KHÁM PHÁ SECRET BOX CỦA BẠN" cùng số hộp chưa mở.
3. Bấm vào box; hệ thống rút ngẫu nhiên 1 huy hiệu, modal chuyển sang "MỞ SECRET BOX THÀNH CÔNG" và hiện huy hiệu vừa nhận, số hộp giảm 1.
4. Nếu vẫn còn hộp, người dùng có thể bấm box tiếp; nếu hết hộp, dòng hướng dẫn ẩn và box hết bấm được.
5. Người dùng đóng modal bằng nút X hoặc phím Escape, quay lại `/kudos`.

## 7. User Stories

### US001 — Xem trạng thái Secret Box và mở modal

**Actor:** Người dùng Kudos đã đăng nhập
**Goal:** Biết mình còn bao nhiêu Secret Box chưa mở và mở modal để xem chi tiết
**Business value:** Khuyến khích tương tác Kudos bằng cách cho thấy phần thưởng đã tích luỹ được, thúc đẩy gửi thêm Kudos.

**Acceptance Criteria:**
- [ ] Nút "Mở Secret Box" hiển thị `enabled` khi còn ít nhất 1 hộp chưa mở, `disabled` kèm tooltip giải thích khi còn 0.
- [ ] Bấm nút khi `enabled` mở modal hiển thị tiêu đề "KHÁM PHÁ SECRET BOX CỦA BẠN", dòng hướng dẫn, hộp quà chưa mở, và số hộp chưa mở.
- [ ] Khách ẩn danh không thấy nút này ở bất kỳ đâu trên `/kudos`.

### US002 — Mở một Secret Box để nhận huy hiệu

**Actor:** Người dùng Kudos đã đăng nhập
**Goal:** Bấm vào box trong modal để mở và nhận một huy hiệu ngẫu nhiên
**Business value:** Biến lượt tim tích luỹ thành phần thưởng cụ thể, tạo cảm giác thành tựu.

**Acceptance Criteria:**
- [ ] Bấm vào box gọi máy chủ, nhận đúng 1 trong 6 huy hiệu, số hộp chưa mở giảm đúng 1.
- [ ] Modal chuyển sang tiêu đề "MỞ SECRET BOX THÀNH CÔNG" và hiển thị đúng ảnh huy hiệu vừa nhận ở kích thước gốc 64×64, không phóng to.
- [ ] Nếu số hộp chưa mở về 0 ngay trong modal đang mở, dòng hướng dẫn bị ẩn và box không bấm mở được nữa.
- [ ] Hai lần bấm liên tiếp (double-click) hoặc hai tab cùng lúc không bao giờ mở nhiều hộp hơn số hộp thực sự còn.

### US003 — Đóng modal Secret Box

**Actor:** Người dùng Kudos đã đăng nhập
**Goal:** Đóng modal bất cứ lúc nào bằng nút X hoặc phím Escape
**Business value:** Giữ trải nghiệm nhất quán với các modal khác trong sản phẩm, không để khách bị "kẹt" trong modal.

**Acceptance Criteria:**
- [ ] Bấm nút X đóng modal.
- [ ] Nhấn phím Escape đóng modal theo đúng pattern `<dialog>` gốc đã dùng ở các modal khác.

## 8. Scenarios

### US001 — Happy Path

**Given** người dùng đã đăng nhập có `secretBoxUnopened > 0` trên `/kudos`, **When** họ bấm nút "Mở Secret Box", **Then** modal mở hiển thị trạng thái chưa mở với đúng số hộp.

### US001 — Error: hết hộp

**Given** `secretBoxUnopened === 0`, **When** người dùng nhìn thấy nút, **Then** nút hiển thị `disabled` kèm tooltip giải thích và modal không mở được dù có bấm.

### US002 — Happy Path

**Given** modal đang mở ở trạng thái chưa mở với `unopened > 0`, **When** người dùng bấm vào box, **Then** máy chủ trả về 1 huy hiệu, modal chuyển trạng thái đã mở hiển thị đúng huy hiệu, số hộp giảm 1.

### US002 — Error: hết hộp ngay lúc mở đồng thời

**Given** hai request mở hộp được gửi gần như đồng thời khi chỉ còn đúng 1 hộp, **When** cả hai tới máy chủ, **Then** chỉ một request thành công và hiển thị huy hiệu, request còn lại nhận thông báo lỗi và không hiển thị huy hiệu giả.

### US003 — Happy Path

**Given** modal đang mở, **When** người dùng bấm nút X, **Then** modal đóng.

### US003 — Error: đóng khi đang xử lý mở hộp

**Given** modal đang mở và một lượt mở box đang xử lý, **When** người dùng nhấn Escape trước khi máy chủ trả lời, **Then** modal đóng ngay lập tức, yêu cầu vẫn tiếp tục chạy nền và số liệu được cập nhật ở lần mở modal kế tiếp.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `secretBoxUnopened === 0` khi tải trang | Nút hiển thị `disabled`, không mở được modal | "Giữ nguyên tooltip `title` có sẵn trên nút — không có văn bản mới" |
| Double-click hoặc 2 tab cùng mở khi chỉ còn đúng 1 hộp | Chỉ 1 yêu cầu ghi thành công nhờ khoá theo người dùng; yêu cầu còn lại bị từ chối | "Có lỗi khi mở Secret Box, vui lòng thử lại" |
| `unopened` về 0 ngay trong modal đang mở (sau khi mở hộp cuối) | Ẩn dòng hướng dẫn, box hết bấm được, huy hiệu vừa nhận vẫn hiển thị nguyên | "None — silent handling" |
| Khách ẩn danh (chưa đăng nhập) truy cập `/kudos` | Không hiển thị nút hay số liệu Secret Box nào | "None — nút không tồn tại, không có thông báo" |

## 10. Edge Behaviours to Verify

- **FR-001** → Kiểm tra entitlement tính đúng: tổng lượt tim đã gửi chia 5, làm tròn xuống, trừ số đã mở.
- **FR-203** → Kiểm tra bấm box trả về đúng 1 huy hiệu hợp lệ và số hộp giảm đúng 1 mỗi lần.
- **FR-205** → Kiểm tra khi số hộp về 0 trong modal đang mở, dòng hướng dẫn ẩn và box hết bấm được.
- **FR-601** → Kiểm tra không thể qua mặt số hộp/huy hiệu bằng cách sửa giá trị phía client, và double-click không mở vượt quyền.

## 11. Risks & Known Issues

N/A — none found.

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Đường ống thống kê Kudos hiện có (danh sách chỉ số Kudos, lượt tim theo người gửi) | feature | Cần số liệu lượt tim thật để tính entitlement | BR-002 |
| Cột lưu số lượt tim trên mỗi Kudos (đồng bộ bởi trigger có sẵn) | data | Nguồn duy nhất để tính số hộp được mở | FR-001 |
| 6 file PNG huy hiệu đã có sẵn trong `public/standards/` | data | Ảnh hiển thị ở trạng thái đã mở, không cần tạo asset mới | FR-204 |

## 13. Configuration

```text
HEARTS_PER_SECRET_BOX = 5          # cứ 5 lượt tim gửi đi thì được mở thêm 1 Secret Box
BADGE_ODDS = {
  "Stay Gold": "30%",
  "Flow to Horizon": "25%",
  "Touch of Light": "20%",
  "Beyond the Boundary": "10%",
  "Revival": "10%",
  "Root Further": "5%",
}
```
