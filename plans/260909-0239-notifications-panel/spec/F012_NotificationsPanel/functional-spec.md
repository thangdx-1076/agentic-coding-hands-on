---
status: draft
authored_by: takumi
created: 2026-09-09
lang: vi
---

# Functional Spec — F012_NotificationsPanel

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-09

**See also:** [`technical-spec.md`](./technical-spec.md)

**Nguồn**: MoMorph screen `6-1LRz3vqr` "Tất cả thông báo" (13 spec row `completed`, 21 test
case). Quyết định dịch sang kiến trúc repo: [`clarifications.md`](../../clarifications.md).

**Traceability:** F012 (provisional) → SCR010_NotificationsPanel (provisional) → US003, US004,
US005, US006 → N/A (không có background job)

## 1. Overview

**Problem:** Sunner không biết mình vừa được ai gửi Kudos hay ai thả tim cho Kudos của mình.
Chuông thông báo đã nằm sẵn trên header mọi trang nhưng bấm vào chỉ hiện một dòng "Bạn chưa có
thông báo" cứng — không có dữ liệu phía sau, và badge luôn bằng 0 vì không ai truyền số thật.

**Solution:** Một popup neo vào chuông, liệt kê thông báo của chính người dùng theo thời gian
giảm dần, 10 mục mỗi trang, đánh dấu đã đọc từng mục hoặc tất cả, badge số cập nhật realtime.

**Scope:** Bảng `notifications` + RLS; phát thông báo khi nhận Kudos và khi Kudos của mình được
thả tim; đọc danh sách phân trang keyset; đánh dấu đã đọc; badge số có cap `9+`; realtime
INSERT; message dựng client-side từ template i18n nên đổi ngôn ngữ áp dụng hồi tố.

**Non-Scope (nợ có tên, xem § 5):**
- **Không có emitter** cho `kudos_hidden` — `public.kudos` không có cột trạng thái và repo
  không có admin moderation.
- **Không có emitter** cho `secret_box_available` — suất box là giá trị dẫn xuất
  `floor(sum(heart_count)/5)` chứ không phải sự kiện.
- Cả hai loại vẫn ship đủ **giá trị enum + renderer**, vì test case seed row trực tiếp.
- Không deep-link từ thông báo sang Kudos gốc (spec ghi rõ "deep-links are future work").
- Không gom 4 điểm render `SiteHeader` về một layout chung — đó là refactor riêng.

## 2. Actors

| Actor | Được làm gì |
|---|---|
| Sunner đã đăng nhập | Xem/đánh dấu đã đọc thông báo **của chính mình** |
| Khách chưa đăng nhập | Không thấy chuông; mọi lời gọi bị chặn ở tầng session |

## 3. Capabilities

### CAP-01 — Xem thông báo của mình

- **FR-001** Chuông chỉ render cho người đã đăng nhập (đã đúng ở code hiện tại).
- **FR-002** Badge hiện **số** chưa đọc; ẩn hẳn khi số = 0; cap hiển thị `9+` khi > 9.
  *(Code hiện tại vẽ chấm tròn không số — phải sửa.)*
- **FR-003** Bấm chuông mở/đóng popup. Đóng khi bấm ra ngoài hoặc Escape.
- **FR-004** Popup có tiêu đề "Thông báo" và nút "Đánh dấu đọc tất cả".
- **FR-005** Mỗi mục: icon theo loại + message in đậm + thời gian tương đối + chấm đỏ nếu chưa đọc.
- **FR-006** Không có thông báo nào → hiện trạng thái trống, không có nút "Xem thêm".
- **FR-007** Danh sách chỉ nạp khi popup đang mở; badge thì luôn nạp.

### CAP-02 — Phân trang

- **FR-101** 10 mục mỗi trang, sắp xếp `created_at` giảm dần.
- **FR-102** "Xem thêm" nối tiếp trang sau, không trùng mục.
- **FR-103** Hết trang → không còn con trỏ, nút biến mất.

### CAP-03 — Đánh dấu đã đọc

- **FR-201** Bấm vào thân một mục = đánh dấu đã đọc, **không điều hướng**.
- **FR-202** "Đánh dấu đọc tất cả" xoá mọi chấm đỏ; số 0 thông báo chưa đọc thì vẫn thành công,
  không báo lỗi.
- **FR-203** Trạng thái đã đọc bền qua reload.
- **FR-204** Badge **không bao giờ** do client tự trừ — chỉ refetch từ server.

### CAP-04 — Realtime

- **FR-301** Có thông báo mới → badge tăng mà không cần reload; popup đang mở thì mục hiện ra.

### CAP-05 — Phát thông báo

- **FR-401** Tạo Kudos → phát `kudos_received` cho người nhận.
- **FR-402** Tự gửi Kudos cho chính mình → **không** phát.
- **FR-403** Kudos ẩn danh → payload lưu **biệt danh**, tuyệt đối không có tên/id thật.
- **FR-404** Thả tim → phát `heart_received` cho chủ Kudos, **đúng một lần** cho mỗi cặp
  (kudos, người thả). Bỏ tim rồi thả lại không phát thêm; bỏ tim không xoá thông báo cũ.
- **FR-405** Ghi thông báo hỏng **không được** làm hỏng thao tác gốc — Kudos/tim vẫn thành công,
  lỗi chỉ ghi log.

### CAP-06 — Ngôn ngữ

- **FR-501** Message **không lưu dạng text**. Lưu `type` + `payload`, dựng câu ở client từ
  template i18n → đổi ngôn ngữ áp dụng hồi tố cho cả thông báo cũ.
- **FR-502** Thông báo `kudos_hidden` nhúng link "Tiêu chuẩn cộng đồng ↗" → **`/standards`**
  (spec gốc ghi `/community-standards`, repo không có route đó).

## 4. Quyền & biên giới dữ liệu

- **FR-601** Mọi lời gọi đều phải có session; không có → từ chối, không trả dữ liệu.
- **FR-602** Người dùng chỉ đọc được thông báo của chính mình. Ràng buộc này phải nằm ở **RLS**,
  không chỉ ở tầng ứng dụng — kênh realtime cũng đi qua RLS.
- **FR-603** Đánh dấu đã đọc trên id của người khác **hoặc** id không tồn tại → cùng một kết quả
  "không tìm thấy". Không được để phân biệt hai trường hợp (rò rỉ sự tồn tại).

## 5. Nợ kỹ thuật khi đóng feature

| Nợ | Vì sao | Cần gì để trả |
|---|---|---|
| `kudos_hidden` không có emitter | `public.kudos` không có cột trạng thái; không có admin moderation | Feature moderation + cột trạng thái, rồi phát khi chuyển sang ẩn |
| `secret_box_available` không có emitter | Suất box là giá trị dẫn xuất, không phải sự kiện | Định nghĩa "vượt mốc suất mới" như một sự kiện + mốc đã-báo |

## 6. Câu hỏi còn treo

- Thời gian tương đối ("2 giờ trước") dựng bằng gì? Repo chưa có helper nào; `Intl.RelativeTimeFormat`
  là lựa chọn không thêm dependency — để Blueprint chốt.
