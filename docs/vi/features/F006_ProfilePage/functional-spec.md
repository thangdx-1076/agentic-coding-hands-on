---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
---

# Functional Spec — F006_ProfilePage

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-07

**See also:** [`technical-spec.md`](./technical-spec.md) — route, content contract, DOM/a11y
contract, pseudocode cho độc giả Dev/QA/SA.

**Traceability:** F006_ProfilePage → SCR006_Profile (MoMorph frame `362:5037`, "Profile bản
thân", 1440×4660, design_status/spec_status `done`) → US001-US003 (draft, local — theo đúng quy
ước F003-F005, không đăng ký vào `docs/vi/generated/user-stories.md`) → BR-001…BR-006 (mới, xem
§ 5) → route `/profile` (`src/app/(protected)/profile/page.tsx`, Server Component, nhóm
`(protected)` — cùng gate với `/todo`, không có ROUTE### riêng, cùng lý do F004/F005 không cấp) →
`momorph/test-cases.csv` ACC_001, ACC_002, FUN_001-FUN_005, FUN_008, FUN_009, FUN_011, FUN_012,
GUI_001-GUI_005, GUI_008, GUI_009, SEC_001, SEC_004 (18 TC trong phạm vi — 10 TC hoãn sang F007+:
FUN_006, FUN_007, FUN_010, FUN_013, FUN_014, FUN_015, GUI_006, GUI_007, SEC_002, SEC_003 — xem
§ 3 Open Decisions và § 9 Edge Cases).

## 1. Overview

**Problem:** Menu tài khoản (`home.account.profile`, "Hồ sơ") và widget hành động nhanh đã trỏ tới
`/profile`, nhưng route đó chưa tồn tại (404) — link chết thứ 2 còn lại trên site sau khi F005 đã
lấp `/standards`. 30 test case tải về cho màn hình này lại được viết như thể một hệ **Kudos đã
tồn tại**: bảng `kudos`, board `/kudos`, modal "Viết Kudo", feed keyset-cursor, người gửi ẩn danh —
không cái nào có thật trong migrations `0001`-`0004` hay `src/`.

**Solution:** Một trang **có gác đăng nhập** `/profile` (nhóm `(protected)`, cùng cơ chế gác với
`/todo`) hiển thị hồ sơ — của chính người xem (self, không tham số) hoặc của một Sunner khác (qua
`?id=`) — dựng từ dữ liệu THẬT đang có (`public.users`, migration `0005` mới thêm view
`public.profile_cards`). Mọi bề mặt phụ thuộc Kudos (bộ sưu tập huy hiệu, statistics card, dropdown
chiều Kudos, thanh Viết Kudo) render **trạng thái honest rỗng/disabled** — đúng nguyên tắc Secret
Box mà `/standards` (F005) đã lập tiền lệ: "honest rendering của một tính năng hoãn lại, không
suy diễn số liệu".

**Scope:**
- Self view: tên + avatar từ `public.users`/`profile_cards` của chính người xem.
- Other view qua `?id={uuid}` hợp lệ: tên + avatar của Sunner đó, đọc qua
  `public.profile_cards` (không email, không role — SEC_004).
- Bộ sưu tập huy hiệu: 6 ô cố định, luôn khoá/xám (không có bảng huy hiệu thật nào để mở khoá).
- Statistics card: 5 dòng, tất cả hiển thị `0`; nút "Mở Secret Box" luôn `disabled`.
- Dropdown chiều Kudos: self có cả Received/Sent (đều `(0)`); hồ sơ người khác chỉ có Received
  (bỏ hẳn Sent — đóng rò rỉ người gửi ẩn danh, SEC_001).
- Thanh "Viết Kudo": chỉ xuất hiện ở hồ sơ người khác, ở slot statistics-card, luôn `disabled`,
  không gắn modal.
- Phân giải `?id=`: rỗng → self; sai định dạng UUID → 404; lặp key (`?id=a&id=b`) → 404; trùng
  chính người xem → canonicalize về `/profile`; UUID hợp lệ nhưng không có hàng tương ứng → 404.
- Gác đăng nhập: dùng lại `(protected)/layout.tsx` sẵn có — không viết gate riêng.

**Non-Scope:** Không xây bảng `kudos`, board `/kudos`, modal "Viết Kudo", feed thật, người gửi ẩn
danh, hashtag, đính kèm (F007+ work — xem "governing finding" ở `clarifications.md`). Không thêm
cột `department`/Hero tier/hoa-thị stars (chưa có cột nguồn — sản phẩm cần quyết định trước, xem
§ 11 RISK). Không đăng ký US###/PERM### mới vào registry chính thức — theo đúng tiền lệ F003-F005
(xem README.md § Mã đã cấp). Không viết SQL/migration/i18n JSON/test thật — spec draft này chỉ mô
tả hợp đồng, Track B (implementer) hiện thực.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner đã đăng nhập (xem hồ sơ mình) | Vào `/profile` không tham số | Xem tên/avatar của mình, biết tình trạng Kudos hiện tại (đều `0`, rỗng có chủ đích) |
| Sunner đã đăng nhập (xem hồ sơ người khác) | Vào `/profile?id={uuid}` hợp lệ của một Sunner khác | Xem tên/avatar công khai của đồng nghiệp đó, không thấy email/role/Sent-tab |
| Khách chưa đăng nhập | Chưa có session | Bị chuyển hướng `/login` ngay, không xem được nội dung nào của `/profile` (ACC_001) |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem hồ sơ bản thân | Vào `/profile`, thấy tên/avatar của mình + bộ sưu tập huy hiệu/statistics card/Kudos ở trạng thái rỗng có chủ đích | US001 | FR-001, FR-002, FR-003, FR-101, FR-102, FR-201, FR-202, FR-301, FR-302, FR-303, FR-305 | BR-001, BR-002, BR-003 | SCR006_Profile |
| CAP-02 | Xem hồ sơ Sunner khác qua `?id=` (hợp lệ/không hợp lệ) | Mở `/profile?id=...` của đồng nghiệp — xem đúng hồ sơ, hoặc bị 404/canonicalize nếu tham số sai/dư thừa | US002, US003 | FR-304, FR-306, FR-401, FR-402, FR-403, FR-404, FR-405, FR-406, FR-501, FR-502 | BR-004, BR-005, BR-006 | SCR006_Profile |

## 3. Open Decisions

Không có quyết định mở mới — toàn bộ đã chốt tại `clarifications.md` (Session 260907-1224). Liệt
kê lại đây để tra cứu nhanh, không phải quyết định mới của spec draft này.

| D### | Decision | Trạng thái | Rationale |
|------|----------|------------|-----------|
| D001 | Xây trọn hệ Kudos trước hay ship `/profile` với dữ liệu hiện có? | **Ship với dữ liệu hiện có** — mọi bề mặt phụ thuộc Kudos render honest rỗng/disabled | Không tồn tại bảng `kudos`; tiền lệ Secret Box của F005; ít file thay đổi nhất (CLAUDE.md decision rule c); không suy diễn số liệu |
| D002 | `?id=` đọc hàng của Sunner khác — `users_select_own` RLS chặn | Migration `0005` thêm view SECURITY-DEFINER-equivalent `public.profile_cards` (`id, full_name, avatar_url`), GRANT `authenticated` | Policy RLS thường sẽ lộ `email`/`role`; GRANT cột sẽ vỡ `getUserRole`'s own-row read; view definer là idiom sẵn có của spec |
| D003 | `?id=` sai định dạng UUID | Shape-check bằng regex UUID trước khi query, rồi `notFound()` | Tránh lỗi Postgres `22P02` lộ ra thành 500 (FUN_004) |
| D004 | `?id=a&id=b` (lặp key) | `notFound()` — không lấy phần tử đầu | `searchParams` của Next trả `string[]` khi key lặp; coi non-string là bị từ chối (FUN_005) |
| D005 | `?id=` rỗng | Self view | FUN_005 bước 1 |
| D006 | `?id=` trùng chính người xem | Canonicalize về `/profile` (redirect, không query) | FUN_002 — tránh 2 URL cho cùng nội dung |
| D007 | Department/Hero tier/hoa-thị stars không có cột | Bỏ hẳn các dòng đó | GUI_009 đã định nghĩa đúng cách render hồ sơ rỗng này — trạng thái hoãn là trạng thái spec định nghĩa, không phải phát minh |
| D008 | Statistics card 5 dòng | Tất cả `0`, "Mở Secret Box" `disabled` | GUI_005 (kế thừa nguyên tắc `/standards`) — 2 dòng Secret Box + 3 dòng Kudos cùng một lý do |
| D009 | Thanh "Viết Kudo" trên hồ sơ người khác | Render THAY THẾ TOÀN BỘ slot statistics-card (`362:5073`, xác nhận qua node id), `disabled`, không gắn modal — không co-render cùng 5 dòng/nút Secret Box | Nhánh self/other cấp-slot (FUN_008) implement được ngay; modal nó mở ra là việc của Kudos domain (FUN_006/007 hoãn) |
| D010 | Dropdown chiều Kudos | Self: 2 chiều, trigger `{Nhãn} ({count})` — vd `Đã gửi (5)` trong design, build của ta luôn `(0)`; hồ sơ người khác: chỉ Received | FUN_009; đóng rò rỉ người-gửi-ẩn-danh bằng cách bỏ hẳn bề mặt Sent (SEC_001), miễn phí vì feed đang rỗng |
| D011 | Nguồn đọc self/other | **Cả hai đều đọc qua `public.profile_cards`** — không đọc `public.users` trực tiếp cho mục đích hiển thị hồ sơ, kể cả hồ sơ chính mình | Màn hình không hiển thị `email`/`role`/`locale` (GUI_009 chỉ định tên+avatar); một đường đọc, một shape trả về cho cả 2 nhánh là DRY hơn 2 DAL riêng cho cùng 1 shape kết quả — CHỐT (không còn là suy luận riêng của spec draft, xem technical-spec.md § 5.2) |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Route `/profile` phải nằm trong nhóm `(protected)` — gác bởi
  `src/app/(protected)/layout.tsx` sẵn có (đọc `getCurrentUser()`, `redirect("/login")` khi chưa
  đăng nhập). Không viết gate riêng cho `/profile`. *(TC ACC_001, ACC_002)*
- **FR-002** Không action nào trên trang này đọc/ghi một bảng `kudos` không tồn tại — mọi số liệu
  Kudos (đếm, feed, badge) là hằng số tĩnh `0`/rỗng, không suy diễn.
- **FR-003** Nhận diện hồ sơ (self và other) luôn đọc qua `public.profile_cards`
  (`id, full_name, avatar_url`) — một đường đọc, một shape, cho cả 2 nhánh (§ 3 D011).

### Hồ sơ & bộ sưu tập huy hiệu (1xx-2xx)

- **FR-101** Hero hiển thị đúng `full_name` + `avatar_url` của hồ sơ đang xem (self hoặc other).
  *(TC GUI_001, GUI_008)*
- **FR-102** Hero KHÔNG hiển thị dòng department + tier Hero + hoa-thị stars — trên design đây là
  1 dòng gộp duy nhất ngay dưới tên (node `mms_A.2.2_Thông tin chi tiết`, id `362:5056`); dòng này bị BỎ HẲN
  toàn bộ trong bản build, không phải bỏ từng phần — các cột nguồn (department/tier) chưa tồn tại
  trên `public.users`; đây là trạng thái spec định nghĩa (GUI_009), không phải thiếu sót.
  *(TC GUI_009)*
- **FR-201** Bộ sưu tập huy hiệu hiển thị đúng 6 ô (node id xác nhận: `362:5066`, `362:5067`,
  `362:5068`, `362:5069`, `362:5070`, `362:5071` — mỗi ô mang 1 artwork con dạng
  `mms_B2.1_Ảnh Huy hiệu`), tất cả ở trạng thái khoá/xám — danh sách huy hiệu đã mở khoá luôn
  rỗng (không có bảng huy hiệu thật). Theo đúng qa note của `mms_A_Info` (`362:5052` — dòng spec
  DUY NHẤT ở trạng thái `completed`, các dòng khác `draft`): "Bộ sưu tập icon của tôi tuân theo
  icon mở được trong Secret box / Nếu chưa có icon nào thì để icon xám" — xác nhận đúng cơ chế
  "luôn xám vì danh sách mở khoá luôn rỗng", không phải suy diễn. 6 ô xếp thành 1 hàng CĂN GIỮA,
  nằm GIỮA hero và statistics card; tiêu đề nằm DƯỚI hàng ô (không phải trên). *(TC GUI_002)*
- **FR-202** Tiêu đề bộ sưu tập huy hiệu đổi theo self/other — copy THẬT đọc từ design (không
  suy diễn): hồ sơ mình = `Bộ sưu tập icon của tôi`; hồ sơ người khác = `Bộ sưu tập icon` (thể
  trung tính, KHÔNG chèn tên — sửa lại so với bản draft trước, vốn đoán nhầm có interpolation
  `{full_name}`). *(TC GUI_003)*

### Statistics card & Kudos (3xx)

- **FR-301** Statistics card (node id xác nhận `362:5073`, `mms_B_Thống kê`) CHỈ hiển thị trên
  hồ sơ MÌNH — đúng 5 dòng, copy THẬT đọc từ design, mỗi dòng giá trị `0`: `Số Kudos bạn nhận
  được:` (`362:5076`), `Số Kudos bạn đã gửi:` (`362:5077`), `Số tim bạn nhận được:` (`362:5078`)
  — rồi tới 1 divider — `Số Secret Box bạn đã mở:` (`362:5080`), `Số Secret Box chưa mở:`
  (`362:5081`). *(TC GUI_004)*
- **FR-302** Nút "Mở Secret Box 🎁" (`362:5082`) — chỉ xuất hiện cùng statistics card (self) — luôn
  ở trạng thái `disabled`, không điều kiện runtime nào bật nó — cùng nguyên tắc BR-005 của F005
  (`/standards`). *(TC GUI_005)*
- **FR-303** Dropdown chiều Kudos (node `mms_C.3_Button`, `362:5089`, thuộc header section
  `mms_C_Header Giải thưởng` `362:5084` — eyebrow `Sun* Annual Awards 2025`, heading `KUDOS`)
  trên hồ sơ MÌNH có cả 2 lựa chọn Received/Sent; trigger hiển thị chiều đang chọn kèm số đếm
  theo mẫu `{Nhãn} ({count})` (vd design cho `Đã gửi (5)` — bản build của ta khởi tạo
  `Đã nhận (0)` trước, cả 2 chiều đều `(0)`). *(TC FUN_009 — nhánh self)*
- **FR-304** Dropdown chiều Kudos trên hồ sơ NGƯỜI KHÁC chỉ có lựa chọn Received (`Đã nhận (0)`)
  — lựa chọn Sent bị BỎ HẲN khỏi UI (không phải ẩn/disable), đóng luôn rò rỉ "ai gửi kudos ẩn danh
  cho ai" bằng cách xoá bề mặt. *(TC FUN_009 — nhánh other, SEC_001)*
- **FR-305** Chọn 1 chiều trong dropdown hiển thị đúng copy trạng thái rỗng — nội dung verbatim
  CHƯA xác nhận với design (chỉ xác nhận số lượng/nhãn dropdown, không xác nhận copy empty-state;
  giữ placeholder đề xuất, xem technical-spec.md § 4.3) — không phải danh sách trống không lời
  giải thích. *(TC FUN_011, FUN_012)*
- **FR-306** Thanh "Viết Kudo" CHỈ xuất hiện trên hồ sơ NGƯỜI KHÁC (không xuất hiện trên hồ sơ
  mình — không thể tự gửi Kudos cho chính mình) — và THAY THẾ TOÀN BỘ slot statistics-card
  (`362:5073`), không co-render cùng 5 dòng/nút Secret Box của FR-301/FR-302 (xác nhận: "the slot
  the write-Kudo bar replaces"). Luôn `disabled`, KHÔNG gắn modal. *(TC FUN_008 — nhánh
  slot-level; modal FUN_006/FUN_007 hoãn sang F007+)*

### Phân giải `?id=` (4xx)

- **FR-401** `?id=` rỗng hoặc vắng mặt → hồ sơ MÌNH (self view), không query `profile_cards`
  thêm lần nào ngoài id của chính người xem. *(TC FUN_005 bước 1)*
- **FR-402** `?id=` không khớp định dạng UUID chuẩn (kiểm bằng regex, TRƯỚC bất kỳ query nào) →
  `notFound()`. Chặn lỗi Postgres `22P02` lộ ra thành trang 500. *(TC FUN_004)*
- **FR-403** `?id=` lặp key (`?id=a&id=b`, Next trả `string[]`) → coi là non-string, `notFound()`
  — không lấy phần tử đầu tiên (`[0]`). *(TC FUN_005 bước 2)*
- **FR-404** `?id=` là UUID hợp lệ VÀ trùng chính id người xem → canonicalize: redirect về
  `/profile` (bỏ query), không render 2 URL khác nhau cho cùng 1 nội dung. *(TC FUN_002)*
- **FR-405** `?id=` là UUID hợp lệ, khác id người xem, KHÔNG có hàng tương ứng trong
  `profile_cards` → `notFound()`.
- **FR-406** `?id=` là UUID hợp lệ, khác id người xem, CÓ hàng tương ứng → render hồ sơ NGƯỜI ĐÓ
  (other view, FR-304/FR-306 áp dụng).

### Bảo mật (5xx)

- **FR-501** Hồ sơ người khác KHÔNG BAO GIỜ render `email` hay `role` của người đó — cả 2 trường
  này không tồn tại trong shape mà `profile_cards` trả về, nên không có nhánh code nào có thể vô
  tình render chúng. *(TC SEC_004)*
- **FR-502** Hồ sơ người khác không lộ số Kudos ĐÃ GỬI của người đó qua bất kỳ bề mặt nào (dropdown
  Sent bị bỏ hẳn — FR-304). *(TC SEC_001)*

## 5. Business Rules

- `/profile` luôn qua đúng 1 gate — `(protected)/layout.tsx` — không có gate thứ 2 nào viết riêng
  cho route này (BR-001)
- Không bảng/cột Kudos thật nào tồn tại; mọi bề mặt phụ thuộc Kudos là hằng số tĩnh, không suy
  diễn số liệu từ dữ liệu khác (BR-002)
- Self và other cùng đọc qua 1 nguồn — `public.profile_cards` — không có 2 đường đọc khác shape
  cho cùng 1 loại nội dung hiển thị (BR-003, § 3 D011)
- `?id=` sai định dạng, lặp key, hoặc không có hàng tương ứng đều dẫn tới `notFound()` — không
  bao giờ suy đoán/lấy phần tử đầu tiên khi input mơ hồ (BR-004)
- `?id=` trùng chính người xem luôn canonicalize về `/profile` không tham số — không có 2 URL hiển
  thị cùng 1 nội dung hồ sơ mình (BR-005)
- Hồ sơ người khác không bao giờ hiển thị email, role, hay số Kudos đã gửi của người đó — đóng
  luôn các rò rỉ này bằng cách BỎ HẲN bề mặt/trường dữ liệu, không phải ẩn bằng CSS hay điều kiện
  runtime dễ vỡ (BR-006)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Hồ sơ Sunner | SCR006_Profile | `SiteHeader`/`SiteFooter` (tái dùng nguyên vẹn — XÁC NHẬN có mặt trong frame, khác `/standards`); hero full-bleed keyvisual với avatar tròn đè lên mép dưới, tên vàng; bộ sưu tập huy hiệu 6 ô khoá (giữa hero và statistics card); statistics card 5 dòng `0` (Secret Box disabled, chỉ self) hoặc thanh Viết Kudo disabled thay thế toàn bộ slot đó (chỉ other); dropdown chiều Kudos (self: 2 chiều, other: 1 chiều) | Xem hồ sơ mình (`/profile`) hoặc hồ sơ người khác (`/profile?id=...`); chọn chiều Kudos trong dropdown (kết quả luôn rỗng có chủ đích) |

### User Journey

1. Sunner đã đăng nhập click "Hồ sơ" ở menu tài khoản (hoặc widget) → vào `/profile`, thấy hồ sơ
   mình: tên, avatar, bộ sưu tập huy hiệu khoá, statistics card `0`.
2. Sunner mở link `/profile?id={uuid}` của một đồng nghiệp (vd. từ một bề mặt tương lai) → thấy
   đúng tên/avatar đồng nghiệp đó, dropdown Kudos chỉ còn Received, có thanh Viết Kudo disabled.
3. Khách chưa đăng nhập cố vào `/profile` (trực tiếp hoặc qua link) → bị chuyển hướng ngay về
   `/login`, không thấy nội dung nào.
4. Sunner gõ tay một `?id=` sai định dạng hoặc lặp key → nhận trang "Not found" mặc định của
   Next.js, không phải lỗi 500.

## 7. User Stories

*(draft, local — theo đúng quy ước F003-F005: không đăng ký vào
`docs/vi/generated/user-stories.md`, số hiệu chỉ có ý nghĩa trong phạm vi feature này)*

### US001_ViewOwnProfile — View Own Profile

**Actor:** Sunner đã đăng nhập
**Goal:** Xem hồ sơ của chính mình — tên, avatar, tình trạng Kudos hiện tại (dù đang rỗng).
**Business value:** Thay thế link chết "Hồ sơ" hiện có trên menu tài khoản; cho Sunner một điểm
neo để quay lại khi hệ Kudos thật (F007+) ra mắt.

**Acceptance Criteria:**
- [ ] Đăng nhập, vào `/profile` không tham số → thấy đúng tên + avatar của chính mình.
- [ ] Không thấy dòng department/tier/stars nào (GUI_009).
- [ ] Bộ sưu tập huy hiệu: đúng 6 ô, tất cả khoá.
- [ ] Statistics card: đúng 5 dòng, tất cả `0`; "Mở Secret Box" disabled.
- [ ] Dropdown Kudos có cả Received và Sent, đều `(0)`.

### US002_ViewSunnerProfile — View Another Sunner's Profile

**Actor:** Sunner đã đăng nhập
**Goal:** Xem hồ sơ công khai (tên, avatar) của một đồng nghiệp qua `?id=`.
**Business value:** Cho phép điều hướng tới hồ sơ người khác từ bất kỳ bề mặt tương lai nào liệt
kê Sunner (vd. bảng Kudos board của F007), mà không lộ dữ liệu nhạy cảm của người đó.

**Acceptance Criteria:**
- [ ] `?id=` là UUID hợp lệ của một Sunner khác → thấy đúng tên + avatar người đó.
- [ ] Không thấy email, role, hay số Kudos đã gửi của người đó ở bất kỳ đâu trên trang.
- [ ] Dropdown Kudos chỉ có Received.
- [ ] Thanh "Viết Kudo" xuất hiện, ở trạng thái disabled, không mở modal nào khi click.

### US003_RejectInvalidProfileLink — Reject Invalid Profile Link

**Actor:** Bất kỳ Sunner đã đăng nhập nào
**Goal:** Không bao giờ thấy lỗi 500 hay nội dung sai khi `?id=` bị gõ sai, lặp, hoặc trỏ tới
chính mình.
**Business value:** Trang không sập vì input xấu; URL tự chuẩn hoá khi trỏ tới chính người xem.

**Acceptance Criteria:**
- [ ] `?id=` sai định dạng UUID → trang "Not found", không phải lỗi 500.
- [ ] `?id=a&id=b` (lặp key) → trang "Not found".
- [ ] `?id=` rỗng → hiển thị hồ sơ mình, không lỗi.
- [ ] `?id=` trùng chính mình → URL tự chuyển về `/profile` không tham số.
- [ ] `?id=` là UUID hợp lệ nhưng không tồn tại Sunner nào → trang "Not found".

## 8. Scenarios

### US001_ViewOwnProfile — Happy Path

**Given** Sunner đã đăng nhập, **When** vào `/profile`, **Then** hero hiển thị đúng tên + avatar
của chính mình, bộ sưu tập huy hiệu 6 ô khoá, statistics card 5 dòng `0`.

### US002_ViewSunnerProfile — Happy Path

**Given** Sunner đã đăng nhập, **When** vào `/profile?id={uuid hợp lệ của người khác}`, **Then**
hero hiển thị tên + avatar người đó, dropdown chỉ có Received, thanh Viết Kudo disabled xuất hiện.

### US003_RejectInvalidProfileLink — `?id=` sai định dạng

**Given** Sunner đã đăng nhập, **When** vào `/profile?id=not-a-uuid`, **Then** trang trả "Not
found" ngay, không query database, không lỗi 500.

### US003_RejectInvalidProfileLink — `?id=` lặp key

**Given** Sunner đã đăng nhập, **When** vào `/profile?id=aaa&id=bbb`, **Then** trang trả "Not
found".

### US003_RejectInvalidProfileLink — `?id=` trùng chính mình

**Given** Sunner đã đăng nhập với id `U`, **When** vào `/profile?id=U`, **Then** URL tự chuyển về
`/profile` (không query).

### US003_RejectInvalidProfileLink — `?id=` hợp lệ nhưng không tồn tại

**Given** Sunner đã đăng nhập, **When** vào `/profile?id={uuid ngẫu nhiên, không thuộc ai}`,
**Then** trang trả "Not found".

### Anonymous — Bị chặn

**Given** khách chưa đăng nhập, **When** cố vào `/profile` (có hoặc không `?id=`), **Then** bị
chuyển hướng ngay `/login`, không render nội dung nào của `/profile`.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `?id=` sai định dạng UUID | Shape-check chặn TRƯỚC khi query, `notFound()` | "Not found" (trang lỗi mặc định Next.js) |
| `?id=` lặp key | `searchParams` trả `string[]`, coi là bị từ chối, `notFound()` | "Not found" |
| `?id=` rỗng | Self view, không lỗi | — |
| `?id=` trùng chính người xem | Redirect canonicalize về `/profile` | — (điều hướng im lặng) |
| `?id=` hợp lệ, không có hàng tương ứng | `notFound()` | "Not found" |
| Hồ sơ (self hoặc other) thiếu department/tier/stars | Bỏ hẳn các dòng đó (GUI_009) — không phải lỗi, là trạng thái spec định nghĩa | — |
| Bộ sưu tập huy hiệu | Luôn 6 ô khoá — không có bảng huy hiệu thật để mở khoá | — |
| Statistics card | Luôn 5 dòng `0`, "Mở Secret Box" disabled | — |
| Thanh "Viết Kudo" trên hồ sơ người khác | Render disabled, THAY THẾ toàn bộ slot statistics-card (`362:5073`) — không co-render cùng 5 dòng/nút Secret Box; click không làm gì (không modal wired) | — |
| Anonymous cố vào `/profile` | Chuyển hướng `/login` trước khi trang render (ACC_001) | — |
| Feed card nội bộ (`mms_D_Post all` `362:5091` và các con của nó: avatar/tên/dept/tier người gửi+nhận, chip Spam `mms_D.3.1_Status`, timestamp, tiêu đề, body, 4 ảnh đính kèm, hashtag, đếm ❤️, "Copy Link") | **KHÔNG spec/build ở F006** — toàn bộ feed là Kudos-domain (F007+); chip Spam (`I3127:24455;3127:24095`, `I3127:24169;3127:24095`, GUI_007) không bao giờ render vì feed luôn rỗng | N/A |
| 10 TC hoãn sang F007+ (FUN_006 modal, FUN_007, FUN_010, FUN_013, FUN_014, FUN_015, GUI_006, GUI_007, SEC_002, SEC_003) | **Không implement ở F006** — các TC này giả định board `/kudos`, feed thật, modal thật đã tồn tại; xây chúng là việc của Kudos domain (F007+), không phải "implement màn hình profile" | N/A |

## 10. Edge Behaviours to Verify

- **FR-401/FR-403/FR-404/FR-405** → Tester xác nhận đủ 4 nhánh phân giải `?id=`: rỗng (self),
  lặp key (404), trùng self (redirect), không tồn tại (404) — không nhánh nào rơi vào query lỗi
  hoặc lỗi 500.
- **FR-304/FR-306** → Tester xác nhận dropdown Sent KHÔNG xuất hiện trong DOM (không phải
  `disabled`/`hidden`) trên hồ sơ người khác — bề mặt phải bị bỏ hẳn.
- **FR-501** → Tester xác nhận network response của action đọc hồ sơ không chứa trường `email`
  hay `role` khi xem hồ sơ người khác.
- **FR-003/BR-003** → Tester xác nhận request tới `public.profile_cards` (không phải
  `public.users`) cho cả 2 nhánh self/other.
- **FR-301/FR-306** → Tester xác nhận slot `362:5073` render ĐÚNG 1 trong 2 biến thể tại một thời
  điểm (statistics card 5 dòng khi self, thanh Viết Kudo khi other) — không bao giờ cả 2 cùng lúc.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Kudos subsystem (bảng, board, modal, feed) hoàn toàn chưa tồn tại | 10/30 TC không implement được ở lượt này; F007+ phải mở lại chúng khi hệ Kudos thật ra đời | confirmed (governing finding, `clarifications.md`) |
| RISK-02 | risk | Department/Hero tier/hoa-thị stars không có cột nguồn (dòng gộp `mms_A.2.2_Thông tin chi tiết`, `362:5056`, bị bỏ hẳn) | Hero render thiếu dòng này vô thời hạn cho tới khi có quyết định sản phẩm (Sun*-HR-sourced hay app-derived?) | pending — unresolved question, `clarifications.md` § Unresolved |
| RISK-03 | risk | Migration `0005` (`profile_cards` view) là hạ tầng MỚI, dùng lần đầu ở feature này | Cần review kỹ semantics SECURITY DEFINER/`security_invoker` trước khi merge — sai 1 chỗ sẽ lộ toàn bộ `public.users` cho `authenticated` | pending sign-off, xem technical-spec.md § 3.1 |
| DEBT-01 | debt | Thanh "Viết Kudo" + nút "Mở Secret Box" render nhưng không có handler thật (disabled vĩnh viễn) | Khi Kudos domain (F007+) ra đời, 2 control này cần mở lại và gắn hành vi thật | accepted (YAGNI cho lượt này) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| `src/app/(protected)/layout.tsx` | shared module | Gác đăng nhập duy nhất cho `/profile`, tái dùng nguyên vẹn — không viết gate riêng | `src/app/(protected)/layout.tsx` |
| `src/dal/auth.ts` (`getCurrentUser`) | shared module | Đọc session để biết id người xem, cùng pattern `/todo` | `src/app/(protected)/todo/page.tsx:22` |
| Migration `0005` (`public.profile_cards`, mới) | infra | Nguồn đọc DUY NHẤT cho cả self/other — chưa tồn tại, feature này cần nó trước khi có code thật | clarifications.md § Decisions taken |
| `src/constants/routes.ts` (`ROUTES`) | shared module | Thêm `PROFILE: "/profile"`, dùng làm đích redirect canonicalize (FR-404) | technical-spec.md § 3.1 |
| `src/proxy.ts` | shared module | Thêm `/profile` vào matcher + mở rộng `isProtectedPage` khỏi test `startsWith(ROUTES.TODO)` đơn lẻ | technical-spec.md § 3.1 |
| `SiteHeader`/`SiteFooter` (đã có, dùng chung `/`, `/awards`) | shared module | XÁC NHẬN tái dùng nguyên vẹn cho `/profile` (khác `/standards` — frame này CÓ chrome: logo, nav, bell, `VN` switcher, avatar button ở đầu; footer chuẩn ở cuối) | node `mms_1_Button` (`I362:5041;186:1597`), `mms_7.4_Button-IC` (`I435:3154;1161:9487`) |
| `messages/{vi,en}.json` (namespace `profile`, mới) | i18n | Toàn bộ copy tĩnh của trang (hero, badge, statistics, empty-state) | technical-spec.md § 4.3 |
| `home.account.profile` (đã có) | consumer | Link "Hồ sơ" hiện có trên menu tài khoản trỏ `/profile` — feature này lấp route, không sửa menu | `messages/vi.json` § home.account |

## 13. Configuration

Không có biến môi trường mới cho feature này.

## 14. Test Policy (Delivery hoàn tất — 2026-09-07)

**Chính sách:** `e2e-red-first` (chốt tại `clarifications.md` — màn hình có route resolution,
dropdown, nhánh 404, chuyển tiếp trạng thái rỗng: hành vi, không phải thuần trình bày).

**Bằng chứng:**
- RED: route chưa tồn tại → 404 trước code (`plans/260907-1224-profile-page/evidence/red-evidence.md`)
- GREEN: `pnpm test:e2e tests/e2e/profile.spec.ts --reporter=list`, exit 0, **22/22 test pass**
  (contract `[C1]`-`[C18]`), 0 skip — `plans/260907-1224-profile-page/evidence/green-evidence.md`
- Regression: `home.spec.ts` 21/21, `awards.spec.ts` 13/13, `standards.spec.ts` 14/14,
  `login.spec.ts` 62 pass/2 skip — không hồi quy
- Ảnh visual: `plans/260907-1224-profile-page/evidence/visual-1440-{self,other}.png`
- **Giới hạn quan trọng**: CI (`ci.yml`) chỉ chạy `[C17]` (redirect ẩn danh, không cần Supabase) —
  21 test còn lại (`@auth`, cần session Supabase thật) chỉ chạy local; dấu tick xanh trên PR
  KHÔNG xác nhận toàn bộ 22 test.

Xem technical-spec.md § 5.1 cho danh sách SC-### ↔ contract `[C#]`, và § 4.5 cho bảng contract
đầy đủ.
