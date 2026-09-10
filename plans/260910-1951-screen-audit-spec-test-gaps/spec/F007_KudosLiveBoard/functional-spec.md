---
status: draft
authored_by: takumi
fcode: F007
created: 2026-09-10
lang: vi
---

# Functional Spec — F007_KudosLiveBoard — REVISION

**Priority**: P0
**Type**: mixed
**Generated**: 2026-09-10

**See also:** [`technical-spec.md`](./technical-spec.md) — action/rung/Source citations cho phần
thay đổi này.

**Revision note:** bản `docs/vi/features/F007_KudosLiveBoard/functional-spec.md` hiện tại
(`status: implemented`) thiếu 4 yêu cầu khách hàng đã xác nhận qua audit; file này chỉ liệt kê
phần THAY ĐỔI/THÊM MỚI, khớp với `technical-spec.md` REVISION cùng thư mục. §§ không nhắc tới bên
dưới (Overview, Actors, US001-US009 cũ, v.v.) giữ nguyên như bản đã ship.

## 2. Functional Capabilities — không thêm CAP mới

Vẫn 1 capability `CAP-01` — các thay đổi dưới đây đều thuộc capability đã có (xem, lọc, lan toả
bảng Kudos), chỉ mở rộng `Requirements`/`Business Rules`: bổ sung FR-215, FR-217, FR-218, FR-219,
BR-017, BR-019, BR-020, US010.

## 3. Open Decisions — bổ sung

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D003 | Bộ lọc Hashtag và Phòng ban kết hợp AND hay OR khi cả 2 cùng được chọn? | Giữ nguyên AND (hành vi code hiện tại) | Không có row thiết kế nào (kể cả 2 CSV dropdown mới đọc) nói rõ; code đã chạy AND từ trước, đổi sang OR là thay đổi hành vi cần xác nhận sản phẩm trước, không phải một gap kỹ thuật | no |
| D004 | Mô tả "quà" hiển thị cho mỗi Sunner ở "10 SUNNER NHẬN QUÀ MỚI NHẤT" là gì, khi hệ thống thật chỉ lưu `badge_key` (1 trong 6 huy hiệu), không lưu text quà vật lý như node mock ("Nhận được 1 áo phông SAA")? | Hiển thị tên/caption huy hiệu thật (đã có sẵn ánh xạ badge→caption trong `standards-copy.ts`) | Text "áo phông SAA" là dữ liệu mock của Figma, không tồn tại trong schema thật (`secret_box_openings` không có cột mô tả quà) — dùng đúng dữ liệu hệ thống có, không bịa thêm cột mới | no |
| D005 | Dữ liệu seed hiện tại (`0008_kudos_demo_seed.sql`) chỉ có 2 phòng ban (`CEVC10`, `CEVC20`) — không đủ để bất kỳ test nào chứng minh danh sách option Phòng ban (FR-215) thật sự đầy đủ/distinct trên dữ liệu thật. Có nên mở rộng seed về gần với danh sách tổ chức thật (minh hoạ ở `WXK5AYB_rG` row A) không? | Không mở rộng seed trong revision này — để riêng cho người quyết định dữ liệu | Đây là quyết định về khối lượng/nội dung dữ liệu demo (không phải một khiếm khuyết kỹ thuật), có thể ảnh hưởng tới các test khác đang dựa vào đúng 2 phòng ban hiện có (`src/dal/kudos.test.ts`) — cần người quyết định trước khi đổi seed | no |

## 4. Requirements — bổ sung

### SCR007_KudosLiveBoard (2xx) — bổ sung

- **FR-215** Danh sách option của bộ lọc Hashtag và bộ lọc Phòng ban được lấy từ TOÀN BỘ dữ liệu
  `kudos` thật trong CSDL — mọi giá trị distinct thực sự tồn tại, không phụ thuộc việc PostgREST
  giới hạn 1 lần đọc ở 1000 dòng (`max_rows`). Cụ thể (falsifiable): với >1000 dòng `kudos`, 2 danh
  sách option vẫn phải chứa đủ MỌI giá trị hashtag/phòng ban phân biệt có trong dữ liệu, không chỉ
  những giá trị xuất hiện trong 1000 dòng đầu PostgREST tình cờ trả về.

  *(Sửa lại so với bản trước của chính spec này — bản trước coi đây là 2 danh sách CỐ ĐỊNH cần
  hardcode. Đó là hiểu sai: parent spec `MaZUn5xHXZ` row B.1.1 ghi "Danh sách hashtag được truy vấn
  từ cơ sở dữ liệu", row B.1.2 ghi "Danh sách phòng ban sẽ được truy vấn từ cơ sở dữ liệu" —
  `supabase/migrations/0008_kudos_demo_seed.sql:28-33` trích dẫn lại đúng dòng B.1.2 này. 13 hashtag
  ở `JWpsISMAaM` row A và ~50 phòng ban ở `WXK5AYB_rG` row A là nội dung MINH HOẠ cho việc dữ liệu tổ
  chức thật trông như thế nào — không phải một allowlist validation, không phải một hằng số UI.)*

  13 tên hashtag trong nội dung minh hoạ (tham khảo — KHÔNG phải hằng số UI, KHÔNG phải allowlist
  validation; chỉ là ví dụ nội dung dự kiến khi seed dữ liệu): Toàn diện, Giỏi chuyên môn, Hiệu suất
  cao, Truyền cảm hứng, Cống hiến, Aim High, Be Agile, Wasshoi, Hướng mục tiêu, Hướng khách hàng,
  Chuẩn quy trình, Giải pháp sáng tạo, Quản lý xuất sắc.

  Danh sách phòng ban minh hoạ (`WXK5AYB_rG` row A) KHÔNG được trích nguyên văn ở đây — không có
  ranh giới tách rõ giữa các tên trong CSV nguồn, và (quan trọng hơn) không ai cần parse nó: đây là
  dữ liệu minh hoạ, không phải nội dung cần đưa vào UI. Prose CSV gốc nằm nguyên trong
  `plans/260910-1951-screen-audit-spec-test-gaps/momorph/specs-WXK5AYB_rG.csv` nếu cần tham khảo.
- **FR-217** Tổng "N KUDOS" ở Spotlight là số đếm chính xác của toàn bộ bảng `kudos`, không bị giới
  hạn bởi ngưỡng 1000 dòng mặc định của PostgREST. *(Cùng gốc lỗi với FR-215 — cả 2 đều sửa 1 lần
  đọc `kudos_cards` không giới hạn/không sắp xếp bị `max_rows` cắt, xem `technical-spec.md § 1`.)*
- **FR-218** Bảng dropdown Hashtag/Phòng ban hiển thị đúng phong cách thiết kế: nền tối, viền, bo
  góc, đệm, cuộn dọc khi danh sách vượt chiều cao khung, trạng thái mục đang chọn khác biệt rõ với
  mục thường, và nhãn hashtag giữ tiền tố "#" giống trên thẻ Kudos.
- **FR-219** Sidebar hiển thị danh sách "10 SUNNER NHẬN QUÀ MỚI NHẤT" từ dữ liệu Secret Box thật đã
  mở, sắp theo thời điểm mở gần nhất trước — không còn là danh sách rỗng cố định.

## 5. Business Rules — bổ sung

- Tổng Spotlight và 2 danh sách option của bộ lọc không được tính từ 1 lần đọc bị giới hạn 1000
  dòng — tổng phải là số đếm chính xác, và 2 danh sách option phải chứa đủ mọi giá trị distinct
  thật trong dữ liệu `kudos`, không phụ thuộc dòng nào PostgREST tình cờ trả về. (BR-017)
- Panel dropdown và mỗi option dùng đúng giá trị thiết kế (nền, viền, bo góc, đệm, cuộn, trạng thái
  đang chọn, kiểu chữ, tiền tố "#" cho hashtag) — chi tiết giá trị ở `technical-spec.md § 3.1 A9`.
  (BR-019)
- Sidebar hiển thị đúng 10 Sunner mở Secret Box gần nhất, sắp theo thời điểm mở giảm dần. (BR-020)
- `rankUps` (leaderboard "SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT") KHÔNG nằm trong revision này — không
  có bảng rank-tracking nào tồn tại, tiếp tục hiển thị "Chưa có dữ liệu" theo đúng thiết kế hiện có;
  ghi rõ ở đây để không nhầm với BR-020 (gift recipients, CÓ dữ liệu thật). (ngoài phạm vi — không
  cấp BR mới)

## 7. User Stories — bổ sung

### US010_ViewRecentGiftRecipients — View Recent Gift Recipients

**Actor:** Sunner (bất kỳ)
**Goal:** Xem nhanh 10 đồng nghiệp vừa mở Secret Box gần đây nhất ngay trên board Kudos.
**Business value:** Tạo thêm điểm ghi nhận công khai cho hoạt động Secret Box (F000), hiện tại
đang là một danh sách rỗng vĩnh viễn dù dữ liệu Secret Box thật đã tồn tại từ migration `0011`.

**Acceptance Criteria:**
- [ ] Có ≥1 lượt mở Secret Box → sidebar "10 SUNNER NHẬN QUÀ MỚI NHẤT" hiện đúng tên/avatar Sunner
  đó, mới nhất trước.
- [ ] Chưa ai mở Secret Box → sidebar hiện "Chưa có dữ liệu" (nhánh rỗng đã có, không phải lỗi
  mới).
- [ ] Bấm avatar/tên một Sunner trong danh sách này mở đúng trang hồ sơ người đó (tái dùng hành vi
  điều hướng chung đã có ở leaderboard, US008).

## 8. Scenarios — bổ sung

### US010_ViewRecentGiftRecipients — Happy Path

**Given** đã có ≥1 Sunner mở Secret Box, **When** Sunner bất kỳ mở `/kudos`, **Then** sidebar "10
SUNNER NHẬN QUÀ MỚI NHẤT" hiện đúng (các) Sunner đó, sắp theo thời điểm mở gần nhất.

### US010_ViewRecentGiftRecipients — Error: chưa có dữ liệu

**Given** chưa ai từng mở Secret Box, **When** Sunner mở `/kudos`, **Then** sidebar hiện "Chưa có
dữ liệu" thay vì danh sách trống không giải thích.

## 9. Edge Cases — bổ sung

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Chưa ai mở Secret Box | Sidebar "10 SUNNER NHẬN QUÀ MỚI NHẤT" hiện nhánh rỗng đã có | "Chưa có dữ liệu" |
| Số dòng `kudos` vượt 1000 | Tổng Spotlight (COUNT chính xác) và 2 danh sách option bộ lọc (mọi giá trị distinct thật) vẫn đúng, không đứng lại ở tập con 1000 dòng cũ | "Không có thông báo riêng — số liệu vẫn cập nhật đúng" |
| Danh sách phòng ban thật (số lượng phụ thuộc dữ liệu, không cố định) vượt chiều cao panel dropdown | Panel cuộn dọc, không tràn layout | "Không có thông báo riêng — cuộn để xem hết" |

## 10. Edge Behaviours to Verify — bổ sung

- **FR-215** → Kiểm tra seed dữ liệu với nhiều giá trị hashtag/phòng ban phân biệt vượt 1000 dòng,
  2 danh sách option bộ lọc vẫn chứa đủ mọi giá trị distinct (không thể chạy trên seed hiện có —
  xem D005).
- **FR-217** → Kiểm tra seed >1000 dòng kudos (hoặc mock count), tổng Spotlight vẫn đúng.
- **FR-218** → Kiểm tra panel dropdown Phòng ban cuộn được và mục đang chọn có nền khác biệt.
- **FR-219** → Kiểm tra sidebar hiện đúng Sunner vừa mở Secret Box, không còn hardcode rỗng.

## 11. Risks & Known Issues — bổ sung

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-02 | known-issue | MoMorph row A + TC `40d4ba26` ghi banner "Hệ thống ghi nhận lời cảm ơn", nhưng TEXT node thật `2940:13439` là "Hệ thống ghi nhận và cảm ơn" — code đã đúng theo node thật, spec prose và TC sai. | Không ảnh hưởng người dùng (code đúng); audit sau có thể tưởng nhầm là bug nếu không ghi lại. | confirmed |
| RISK-03 | known-issue | Row D.1 ghi "6 dòng số liệu" nhưng frame `2940:13490` chỉ vẽ 5 dòng thật (khớp code + e2e C27). | Không ảnh hưởng người dùng; chỉ là lỗi đánh máy trong prose thiết kế. | confirmed |

Cả 2 dòng trên KHÔNG phải yêu cầu sửa code — mã nguồn đã đúng theo dữ liệu node thật; chỉ upstream
MoMorph row/TC cần sửa ở lần audit thiết kế sau.

## 12. Dependencies — bổ sung

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| `secret_box_openings` (migration `0011`, F000/F010_SecretBoxModal) | data | Nguồn dữ liệu thật cho "10 SUNNER NHẬN QUÀ MỚI NHẤT" — cần 1 view `SECURITY DEFINER` mới vì RLS gốc là own-rows-only | BR-020, `technical-spec.md § 4.2` |
| `standards-copy.ts` badge→caption mapping | data | Nguồn hiển thị mô tả quà cho mỗi Sunner trong danh sách gift recipients (D004) | `src/app/(public)/standards/_shared/standards-copy.ts:95-100` |
