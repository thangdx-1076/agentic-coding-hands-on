---
status: implemented
authored_by: takumi
created: 2026-09-09
lang: vi
---

# Functional Spec — F012_NotificationsPanel

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-09

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, source citations, pseudocode,
key entities, và DB writes cho Dev/QA/SA.

**Nguồn**: MoMorph screen `6-1LRz3vqr` "Tất cả thông báo" (13 spec row `completed`, 21 test case,
`TC-F007-001..021` — mã của dự án khác, KHÔNG tái dùng; repo này dùng TC-001..021). Quyết định dịch
sang kiến trúc repo: `plans/260909-0239-notifications-panel/clarifications.md`.

**Traceability:** F012_NotificationsPanel → SCR003_HomeScreen, SCR004_Awards, SCR006_Profile,
SCR007_KudosLiveBoard (cross-cutting header component, KHÔNG tạo SCR### mới) → US001-US004 (draft,
local) → N/A (không background job — ghi qua trigger DB đồng bộ, không phải job nền)

## 1. Overview

**Problem:** Sunner không biết mình vừa được ai gửi Kudos hay ai thả tim cho Kudos của mình. Chuông
thông báo đã nằm sẵn trên header 4 màn hình (`/`, `/awards`, `/profile`, `/kudos`) nhưng bấm vào chỉ
hiện một dòng "Bạn chưa có thông báo" cứng — không có dữ liệu phía sau, và badge luôn là một chấm
tròn không số.

**Solution:** Một popup neo vào chuông, liệt kê thông báo của chính người dùng theo thời gian giảm
dần, 10 mục mỗi trang, đánh dấu đã đọc từng mục hoặc tất cả, badge số (cap `9+`) cập nhật realtime.

**Scope:** Bảng `public.notifications` + RLS + realtime; phát thông báo khi nhận Kudos và khi Kudos
của mình được thả tim; đọc danh sách phân trang keyset; đánh dấu đã đọc; message dựng client-side từ
template i18n nên đổi ngôn ngữ áp dụng hồi tố cho cả thông báo cũ.

**Non-Scope (nợ có tên, xem § 11):**
- **Không có emitter** cho `kudos_hidden` — `public.kudos` không có cột trạng thái và repo không có
  admin moderation.
- **Không có emitter** cho `secret_box_available` — suất box là giá trị dẫn xuất
  `floor(sum(heart_count)/5)`, không phải một sự kiện có thời điểm phát rõ ràng.
- Cả hai loại vẫn ship đủ **giá trị enum + renderer** — test seed row trực tiếp để kiểm.
- Không deep-link từ thông báo sang Kudos gốc.
- Không gom 4 điểm render `SiteHeader` về một layout chung (refactor riêng, ghi ở
  `plans/action-items.md`).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner đã đăng nhập | Bất kỳ ai đã xác thực Google | Xem/đánh dấu đã đọc thông báo của chính mình |
| Khách chưa đăng nhập | Chưa xác thực | Không thấy nội dung thông báo nào — mọi lời gọi bị chặn ở RLS |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem thông báo của mình | Mở popup, thấy danh sách + badge số | US001 | FR-001–FR-007, FR-601, FR-602 | BR-001 | SCR003, SCR004, SCR006, SCR007 |
| CAP-02 | Phân trang | Bấm "Xem thêm" để nạp trang kế | US002 | FR-101–FR-103 | BR-002 | như trên |
| CAP-03 | Đánh dấu đã đọc | Đánh dấu 1 mục hoặc tất cả | US003 | FR-201–FR-204, FR-603 | BR-003 | như trên |
| CAP-04 | Realtime | Nhận thông báo mới không cần reload | US004 | FR-301 | BR-004 | như trên |
| CAP-05 | Phát thông báo | (hệ thống) sinh thông báo khi có Kudos/tim | N/A — system | FR-401–FR-405 | BR-005 | N/A |
| CAP-06 | Ngôn ngữ | Đổi ngôn ngữ áp dụng hồi tố | N/A — cross-cutting | FR-501–FR-502 | BR-006 | như trên |

## 3. Open Decisions

None — mọi gap đã chốt ở `clarifications.md` theo quy tắc "Quyết định thay tôi, đừng hỏi" của
`CLAUDE.md`. 2 loại thông báo không có emitter là nợ có tên (§ 11), không phải quyết định treo.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Chuông chỉ render cho người đã đăng nhập.
- **FR-002** Badge hiện **số** chưa đọc; ẩn hẳn khi số = 0; cap hiển thị `9+` khi > 9.
- **FR-003** Bấm chuông mở/đóng popup. Đóng khi bấm ra ngoài hoặc Escape (focus trả về nút chuông).
- **FR-004** Popup có tiêu đề "Thông báo" và nút "Đánh dấu đọc tất cả".
- **FR-005** Mỗi mục: icon theo loại + message (có đoạn in đậm cho tên) + thời gian tương đối +
  chấm đỏ nếu chưa đọc.
- **FR-006** Không có thông báo nào (hoặc lỗi tải) → hiện trạng thái trống, không có nút "Xem thêm".
- **FR-007** Danh sách chỉ nạp khi popup mở LẦN ĐẦU; badge thì luôn nạp — mở lại sau khi đã nạp một
  lần không refetch.

### Pagination (1xx)

- **FR-101** 10 mục mỗi trang, sắp xếp `created_at` giảm dần, tie-break bằng `id`.
- **FR-102** "Xem thêm" nối tiếp trang sau bằng cursor keyset `(created_at, id)`, không dùng
  `offset`, không trùng mục.
- **FR-103** Hết trang → `nextCursor` là `null`, nút biến mất.

### Mark-read (2xx)

- **FR-201** Bấm vào thân một mục = đánh dấu đã đọc, **không điều hướng** (link `kudos_hidden` bên
  trong message dừng nổi bọt sự kiện click để giữ 2 hành vi tách biệt).
- **FR-202** "Đánh dấu đọc tất cả" xoá mọi chấm đỏ; 0 thông báo chưa đọc vẫn thành công (`{updated:
  0}`), không báo lỗi.
- **FR-203** Trạng thái đã đọc bền qua reload (ghi ở DB, không phải state client).
- **FR-204** Badge **không bao giờ** do client tự trừ — chỉ refetch từ server sau mỗi mark-read/
  mark-all-read.

### Realtime (3xx)

- **FR-301** Có thông báo mới → badge tăng mà không cần reload; popup đang mở thì mục hiện ra ngay
  (refetch trang đầu, không phải chèn optimistic).

### Emit (4xx)

- **FR-401** Tạo Kudos → phát `kudos_received` cho người nhận (`NEW.receiver_id`).
- **FR-402** Tự gửi Kudos cho chính mình → **không** phát. Tương tự, tự thả tim cho Kudos của mình
  → **không** phát (bất khả thi ở đường ghi thật do `kudo_hearts_insert_own`, nhưng emitter vẫn giữ
  guard này làm phòng thủ lớp hai).
- **FR-403** Kudos ẩn danh → payload lưu **`anonymous_name`**, tuyệt đối không có `sender_id` hay
  tên thật.
- **FR-404** Thả tim → phát `heart_received` cho **người GỬI** Kudos, đúng một lần cho mỗi cặp
  (kudos, người thả). Bỏ tim rồi thả lại không phát thêm; bỏ tim không xoá thông báo cũ.
- **FR-405** Ghi thông báo hỏng **không được** làm hỏng thao tác gốc — Kudos/tim vẫn thành công, lỗi
  chỉ ghi `RAISE WARNING`.

### Language (5xx)

- **FR-501** Message **không lưu dạng text**. Lưu `type` + `payload`; câu chữ dựng ở client từ
  template i18n → đổi ngôn ngữ áp dụng hồi tố cho cả thông báo cũ.
- **FR-502** Thông báo `kudos_hidden` nhúng link "Tiêu chuẩn cộng đồng ↗" → **`/standards`** (route
  thật của repo).

### Security (6xx)

- **FR-601** Mọi lời gọi đều phải có session; không có → không trả dữ liệu (RLS chặn, không phải
  kiểm tra ứng dụng).
- **FR-602** Người dùng chỉ đọc được thông báo của chính mình. Ràng buộc nằm ở **RLS**, áp dụng
  đồng nhất cho cả REST lẫn kênh realtime.
- **FR-603** Đánh dấu đã đọc trên id của người khác **hoặc** id không tồn tại → cùng một kết quả
  `{ok:false}`. Không phân biệt hai trường hợp (chống rò rỉ sự tồn tại).

## 5. Business Rules

- **BR-001** Badge ẩn khi `unreadCount === 0`; hiện số nguyên khi 1-9; hiện `"9+"` khi > 9. Server
  count luôn là nguồn đúng.
- **BR-002** Phân trang dùng keyset `(created_at DESC, id DESC)`, không `offset` — tránh trùng/bỏ
  sót mục khi có dòng mới chèn giữa hai lần tải.
- **BR-003** `markRead`/`markAllRead` fail CLOSED (trả `{ok:false}`/`{updated:0}` khi có lỗi hoặc
  không khớp hàng nào); `getUnreadCount` fail OPEN về `0` — badge hỏng không được sập header.
- **BR-004** Kênh realtime chỉ là tín hiệu "có gì đó thay đổi, refetch" — không tự chèn dữ liệu từ
  payload realtime vào state, tránh lệch với RLS.
- **BR-005** Emitter là trigger `AFTER INSERT` `SECURITY DEFINER`, không phải Server Action — cùng
  transaction với sự kiện sinh ra nó; lỗi emitter không rollback thao tác gốc.
- **BR-006** Namespace i18n `notifications.*` là namespace cấp cao mới; `home.notifications.empty`
  cũ dời sang đây; `home.header.notificationsLabel` (aria-label nút chuông) giữ nguyên chỗ.

## 6. Screens

Không có SCR### riêng — đây là một header component cross-cutting, render trên 4 screen ĐÃ CÓ:

| Screen | SCR### | Bell/panel xuất hiện qua |
|--------|--------|---------------------------|
| Trang chủ | SCR003_HomeScreen | `SiteHeader` |
| Giải thưởng | SCR004_Awards | `SiteHeader` |
| Hồ sơ | SCR006_Profile | `SiteHeader` |
| Bảng Kudos | SCR007_KudosLiveBoard | `SiteHeader` |

`/standards` (SCR005) và `/prelaunch` (SCR009) **không** render `SiteHeader` nên không có chuông;
`/login`, `/todo` dùng chrome khác (trước khi xác thực / placeholder).

### User Journey

1. Sunner đã đăng nhập bấm chuông trên header — popup mở, nạp trang đầu (10 mục mới nhất).
2. Bấm một mục → đánh dấu đã đọc, chấm đỏ biến mất, badge tự trừ (qua refetch, không phải trừ tay).
3. Bấm "Xem thêm" → nối thêm 10 mục cũ hơn, không trùng mục đã có.
4. Có Kudos/tim mới trong lúc popup đang mở → mục mới xuất hiện, badge tăng, không cần reload.

## 7. User Stories

### US001 — Xem thông báo của mình

**Actor:** Sunner đã đăng nhập
**Goal:** Biết ai vừa gửi Kudos hoặc thả tim cho mình
**Business value:** Tăng cảm giác được ghi nhận, kéo người dùng quay lại tương tác.

**Acceptance Criteria:**
- [ ] Badge hiện đúng số chưa đọc, ẩn khi 0, cap `9+`.
- [ ] Popup mở hiện đúng danh sách của CHÍNH MÌNH, không lẫn của người khác.
- [ ] 0 thông báo → trạng thái trống, không có nút "Xem thêm".

### US002 — Phân trang

**Actor:** Sunner đã đăng nhập
**Goal:** Xem lại thông báo cũ hơn 10 mục gần nhất
**Business value:** Không mất lịch sử ghi nhận khi số thông báo tích luỹ nhiều.

**Acceptance Criteria:**
- [ ] "Xem thêm" nối đúng 10 mục kế tiếp, không trùng.
- [ ] Hết dữ liệu → nút biến mất.

### US003 — Đánh dấu đã đọc

**Actor:** Sunner đã đăng nhập
**Goal:** Dọn sạch chấm đỏ sau khi đã xem
**Business value:** Badge phản ánh đúng số thông báo THẬT SỰ chưa xem.

**Acceptance Criteria:**
- [ ] Bấm 1 mục → chỉ mục đó hết chấm đỏ, không điều hướng đi đâu.
- [ ] "Đánh dấu đọc tất cả" → hết mọi chấm đỏ, kể cả khi vốn đã 0.
- [ ] Đánh dấu trên id của người khác/id không tồn tại → cùng kết quả thất bại, không lộ khác biệt.

### US004 — Nhận thông báo mới (realtime)

**Actor:** Sunner đã đăng nhập
**Goal:** Biết ngay khi có Kudos/tim mới, không cần tự reload
**Business value:** Tăng tính "sống" của tính năng ghi nhận.

**Acceptance Criteria:**
- [ ] Badge tăng khi có thông báo mới, dù popup đang đóng hay mở.
- [ ] Popup đang mở → mục mới hiện ra không cần thao tác gì thêm.
- [ ] Người dùng B **không bao giờ** nhận được sự kiện realtime của người dùng A.

## 8. Scenarios

### US001 — Happy Path

**Given** Sunner đã đăng nhập có 3 thông báo chưa đọc, **When** họ bấm chuông, **Then** popup mở,
hiện đúng 3 mục, badge hiện số "3".

### US001 — Chưa đăng nhập

**Given** khách chưa đăng nhập, **When** họ ở bất kỳ trang nào có `SiteHeader`, **Then** không có
chuông thông báo nào hiển thị (thay bằng link "Đăng nhập").

### US003 — Chống rò rỉ sự tồn tại

**Given** Sunner A gọi đánh dấu đã đọc bằng một id thuộc về Sunner B (hoặc một id không tồn tại),
**When** request tới server, **Then** cả hai trường hợp trả về CÙNG kết quả thất bại — không có
cách nào phân biệt "tồn tại nhưng không phải của tôi" với "không tồn tại".

### US004 — Realtime tôn trọng RLS

**Given** Sunner A và Sunner B cùng mở popup, **When** A nhận một Kudos mới, **Then** chỉ badge/
danh sách của A cập nhật — B không nhận sự kiện, không thấy thông báo của A dù đang mở kênh realtime
cùng lúc.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| 0 thông báo | Trạng thái trống, không nút "Xem thêm" | "Bạn chưa có thông báo" |
| Tự gửi Kudos cho chính mình | Không phát thông báo | "None — silent" |
| Thả tim rồi bỏ rồi thả lại cùng 1 kudo | Chỉ 1 dòng `heart_received`, không nhân đôi | "None — dedupe ở DB" |
| Bỏ tim | Thông báo `heart_received` đã phát TRƯỚC ĐÓ vẫn còn, không bị xoá | "None — silent" |
| Kudos ẩn danh | Payload chỉ có `anonymous_name`, không có tên thật/`sender_id` | Message hiện biệt danh |
| `senderName`/`actorName` là `null` (thiếu `full_name`) | Renderer fallback `"Sunner"` | "**Sunner** đã gửi Kudos cho bạn" |
| Đánh dấu đã đọc trên id người khác/không tồn tại | `{ok:false}`, cùng 1 kết quả | "None — không phân biệt" |
| Ghi thông báo lỗi (DB) | Kudos/tim vẫn thành công, chỉ log warning | "None — người dùng không thấy gì khác" |
| `kudos_hidden`/`secret_box_available` | Enum + renderer sẵn sàng nhưng KHÔNG có emitter — chỉ xuất hiện qua seed thủ công | N/A — nợ có tên, § 11 |

## 10. Edge Behaviours to Verify

- **FR-602/FR-603** → RLS chặn cả đọc trực tiếp lẫn qua realtime của người khác; mark-read trên id
  lạ/id người khác trả cùng kết quả.
- **FR-404** → thả/bỏ/thả lại → đúng 1 dòng `heart_received`, sống sót qua lần bỏ tim.
- **FR-405** → giả lập lỗi ghi thông báo, xác nhận Kudos/tim gốc vẫn thành công.
- **FR-002** → 0 ẩn badge · 1-9 hiện đúng số · 10+ hiện `"9+"`.
- **FR-501** → đổi ngôn ngữ, xác nhận thông báo CŨ cũng đổi câu chữ (không lưu text tĩnh).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `kudos_hidden` không có emitter — `public.kudos` không có cột trạng thái, repo chưa có admin moderation | Loại thông báo này chỉ xuất hiện qua seed thủ công, không bao giờ phát sinh tự nhiên trong sản phẩm hiện tại | [EXPECTED] |
| RISK-02 | known-issue | `secret_box_available` không có emitter — suất box là giá trị dẫn xuất, không phải sự kiện có thời điểm rõ ràng | Tương tự RISK-01 | [EXPECTED] |
| RISK-03 | known-issue | `unreadCount` phải bơm thủ công vào ≥7 điểm gọi (không có layout chung cho `SiteHeader`) — cùng nợ đã ghi từ F003/F007 | Rủi ro một trang mới quên bơm `unreadCount`, badge hiện sai | [EXPECTED], ghi ở `plans/action-items.md` |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| `useMenuKeyboardNav` (đã có, `account-menu.tsx`/`language-selector.tsx`) | pattern | Cân nhắc tái dùng cho đóng/mở popup — **quyết định cuối: KHÔNG dùng**, giữ `role="dialog"` vì danh sách thay đổi độ dài khi "Xem thêm" (xem `notification-panel.tsx:24-28`) | technical-spec.md § 4.1 |
| Supabase Realtime (`supabase_realtime` publication) | infra | Lần đầu repo dùng — kênh `postgres_changes` INSERT lọc `user_id` | `0012_notifications.sql:121-132` |
| `kudos_card-person.tsx`'s `?? "Sunner"` fallback convention | pattern | Áp dụng lại cho `senderName`/`actorName` khi `null` | `src/utils/notification-message.ts:47` |

## 13. Configuration

Không có biến môi trường mới — toàn bộ trạng thái đọc từ bảng `public.notifications` qua RLS/session
có sẵn.
