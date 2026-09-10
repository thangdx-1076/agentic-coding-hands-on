---
status: implemented
authored_by: takumi
created: 2026-09-05
lang: vi
---

# Functional Spec — F003_Homepage

**Priority**: P0
**Type**: ui
**Generated**: 2026-09-06

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoint, Source citation, pseudocode,
key entity, DB write cho độc giả Dev/QA/SA.

**Traceability:** F003_Homepage → SCR003_Home (draft) → US001-US004 (draft, local)
→ — (không có BL### mới) → — (route `/`, Server Component, chưa có ROUTE### riêng) →
`momorph/test-cases.csv` ID-0…ID-62 (62 TC)

## 1. Overview

**Problem:** Trang chủ hiện tại (`/`) chỉ là một redirect thuần theo trạng thái đăng nhập — khách
truy cập không có cách nào xem thông tin sự kiện SAA 2025 mà không đăng nhập trước.
**Solution:** Một trang chủ công khai duy nhất tại `/`, hiển thị hero + đếm ngược, thông tin sự
kiện, danh sách giải thưởng, quảng bá Sun* Kudos, và một header/footer nhận biết trạng thái đăng
nhập (đã đăng nhập thấy thêm chuông thông báo + menu tài khoản; admin thấy thêm Trang quản trị).
**Scope:** Hiển thị công khai toàn bộ nội dung marketing SAA 2025; điều hướng tới các trang chi
tiết (Award Information, Sun* Kudos, Tiêu chuẩn chung, Hồ sơ, Trang quản trị); header/footer nhận
biết trạng thái đăng nhập và vai trò.
**Non-Scope:** Không tự implement 5 trang đích (`/awards`, `/kudos`, `/standards`, `/profile`,
`/admin`) — chỉ link tới; không có bảng notifications thật (panel luôn rỗng); không đổi hành vi
chuyển ngôn ngữ (F002 sở hữu, tái dùng nguyên trạng).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách truy cập (Anonymous) | Chưa đăng nhập | Xem nội dung SAA 2025, tìm đường đăng nhập |
| Thành viên (Authenticated member) | Đã đăng nhập, role=member | Xem nội dung + quản lý tài khoản (Hồ sơ/Đăng xuất) |
| Quản trị viên (Authenticated admin) | Đã đăng nhập, role=admin | Như member + truy cập Trang quản trị |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem & tương tác với trang chủ SAA 2025 | Xem toàn bộ nội dung công khai (hero, đếm ngược, thông tin sự kiện, CTA, Root Further, khối Giải thưởng đủ 3 dòng mô tả, 6 thẻ giải thưởng, Sun* Kudos, footer), điều hướng tới các trang liên quan với đúng nhãn/kích thước header, và — khi đã đăng nhập — mở menu tài khoản, xem thông báo, dùng widget hành động nhanh | US001, US002, US003, US004 | FR-001, FR-002, FR-003, FR-101, FR-102, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-209, FR-210, FR-211, FR-212, FR-213, FR-214, FR-401, FR-402, FR-403, FR-601 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, DEC-001, SM-001 | SCR003_Home |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Nội dung thật của menu widget hành động nhanh (spec không liệt kê option) | **RESOLVED 2026-09-08** — MoMorph cấp thiết kế thật cho component set `214:3916` (2 variant: đóng/mở). Nội dung `[INFERRED]` cũ (bút chì → "Sun* Kudos" `/kudos`, icon SAA → "Award Information" `/awards`) bị thay hoàn toàn bởi panel đã thiết kế: "Thể lệ" (`ROUTES.STANDARDS`) và "Viết KUDOS" (`ROUTES.KUDOS`) — `/awards` không còn là lựa chọn trong widget (header nav vẫn giữ link `/awards` riêng). Trigger cũng đổi: pill 106×64 morph thành nút tròn 56×56 đỏ `#D4271D` "×" khi mở, cùng 1 `<button>` DOM node. Chi tiết: `technical-spec.md` § 3.1 A6, § 4.3 SM-001. | Thiết kế thật đã có, không còn suy diễn | no |
| D002 | Nội dung thật của khối thông tin sự kiện — design ghi "26/12/2025 · Âu Cơ Art Center · Livestream", spec/TC ghi "18h30 · Nhà hát nghệ thuật quân đội · Group Facebook Sun* Family" | Dùng theo spec/TC (TC ID-14 là acceptance criteria, design chỉ là authority cho phần nhìn) | TC là nguồn xác nhận nội dung được chấp nhận, ưu tiên hơn văn bản trong file design | no |
| D003 | Font digit "Digital Numbers" (7-segment LED) cho `CountdownTiles` chưa có file/license — cần chọn: (a) mua/license font thật, (b) dùng font 7-segment thay thế đã được duyệt, (c) tạm giữ fallback `monospace`. Dùng CHUNG bởi F003 (đếm ngược trang chủ) và F011 (đếm ngược prelaunch) — quyết định 1 lần ở đây, F011 trỏ về. | (b) — chọn 1 font 7-segment thay thế miễn phí/có license hợp lệ, thay `monospace` tạm thời; (c) KHÔNG đạt bar "UI chính xác tuyệt đối so với Figma" nên không phải default lâu dài | Đây là quyết định cấp phép/thương hiệu — không phải thứ developer tự chọn được; nợ đã ghi tại `plans/260908-1653-countdown-prelaunch-page/clarifications.md` § Ghi nợ | yes |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Route `/` phải public — mọi khách truy cập, dù đã đăng nhập hay chưa, đều xem được
  toàn bộ nội dung, không có redirect nào theo trạng thái đăng nhập.
- **FR-002** Toàn bộ nội dung tĩnh có bản tiếng Việt (nguồn Figma) và bản tiếng Anh tương ứng,
  đồng bộ theo next-intl.
- **FR-003** Vai trò người dùng (thành viên/quản trị viên) được xác định phía server từ dữ liệu
  tài khoản; nếu không đọc được, hệ thống coi như thành viên thường.

### Navigation (1xx)

- **FR-101** Người dùng có thể tới trang chủ trực tiếp, qua click logo, qua click link điều
  hướng, hoặc mặc định ngay sau khi đăng nhập thành công.
- **FR-102** Click logo hoặc link "About SAA 2025" khi đang ở đúng trang chủ chỉ cuộn lên đầu
  trang, không tải lại/điều hướng lại.

### Trang chủ SAA 2025 (2xx)

- **FR-201** Khối hero hiển thị tiêu đề lớn "ROOT FURTHER", dòng phụ "Coming soon" (khi phù hợp),
  và đồng hồ đếm ngược 3 đơn vị Ngày/Giờ/Phút.
- **FR-202** Đồng hồ đếm ngược tự cập nhật mỗi phút, luôn hiển thị đủ 2 chữ số; khi tới hoặc qua
  mốc sự kiện thì dừng ở 00/00/00 và ẩn "Coming soon".
- **FR-203** Khối thông tin sự kiện hiển thị đúng thời gian, địa điểm và ghi chú tường thuật trực
  tiếp.
- **FR-204** Hai nút CTA điều hướng tới trang thông tin giải thưởng và trang Sun* Kudos tương ứng.
- **FR-205** Đoạn nội dung giới thiệu tinh thần chương trình ("Root Further") hiển thị tĩnh, không
  tương tác.
- **FR-206** Danh sách 6 hạng mục giải thưởng hiển thị dạng lưới (3 cột trên màn rộng, 2 cột trên
  màn hẹp hơn), mỗi hạng mục có ảnh, tiêu đề, mô tả tối đa 2 dòng và link "Chi tiết"; toàn bộ vùng
  thẻ đều dẫn tới đúng vị trí hạng mục ở trang thông tin giải thưởng.
- **FR-207** Khối quảng bá Sun* Kudos hiển thị tiêu đề, mô tả và nút "Chi tiết" dẫn tới trang
  Sun* Kudos.
- **FR-208** Header hiển thị logo, 3 link điều hướng chính, bộ chọn ngôn ngữ, và — tuỳ trạng thái
  đăng nhập — hoặc một link đăng nhập, hoặc chuông thông báo cùng nút tài khoản.
- **FR-209** Footer hiển thị logo, 4 link điều hướng và dòng bản quyền.
- **FR-210** Một nút hành động nhanh nổi, cố định ở góc dưới bên phải màn hình, mở menu 2 lối tắt
  tới các tính năng thường dùng.
- **FR-211** Khối tiêu đề mục Giải thưởng hiển thị đủ 3 dòng: caption nhỏ "Sun* annual awards
  2025", tiêu đề lớn "Hệ thống giải thưởng", và dòng mô tả phụ "Các hạng mục sẽ được trao giải theo
  TOP những người xuất sắc nhất."
- **FR-212** Link nav thứ 2 trong header hiển thị đúng nhãn SỐ NHIỀU "Awards Information" (KHÔNG
  phải "Award Information" số ít) — theo MoMorph row A1.3/7.3 và TC ID-21/23.
- **FR-213** Logo header có kích thước 64×60px.
- **FR-214** Chữ số trong mỗi ô đếm ngược (hero) dùng font 7-segment "Digital Numbers" (hoặc font
  thay thế đã được duyệt theo D003) — KHÔNG được rơi về `monospace` mặc định của trình duyệt.

### Interaction (4xx)

- **FR-401** Mọi menu bật/tắt trên trang (menu tài khoản, menu widget) đều tuân theo cùng một
  chuẩn thao tác bàn phím và chuột (mở bằng click/Enter/Space, đóng bằng Esc/click ra ngoài, di
  chuyển vòng bằng mũi tên).
- **FR-402** Chuông thông báo mở một panel; khi chưa có thông báo nào, panel hiển thị trạng thái
  rỗng rõ ràng; huy hiệu đỏ chỉ hiện khi thực sự có thông báo chưa đọc.
- **FR-403** Menu tài khoản luôn có "Hồ sơ" và "Đăng xuất"; chỉ tài khoản quản trị viên mới thấy
  thêm "Trang quản trị"; đăng xuất dùng lại đúng cơ chế đăng xuất đã có của hệ thống.

### Security (6xx)

- **FR-601** Việc hiển thị mục "Trang quản trị" chỉ được quyết định bởi vai trò đọc được phía
  server, không bao giờ bởi một lựa chọn/giá trị nào từ phía client.

## 5. Business Rules

- Header chỉ hiện chuông thông báo và nút tài khoản khi đã đăng nhập; khách chưa đăng nhập thấy
  một link đăng nhập thay thế (BR-001)
- Mục "Trang quản trị" trong menu tài khoản chỉ hiện khi vai trò người dùng là quản trị viên
  (BR-002)
- Đồng hồ đếm ngược khi tới/qua mốc sự kiện giữ nguyên 00/00/00, ẩn "Coming soon", không bao giờ
  hiển thị số âm (BR-003)
- Mốc sự kiện cấu hình sai/thiếu không làm hệ thống lỗi — countdown coi như "chưa biết mốc", vẫn
  hiện 00/00/00 và vẫn hiện "Coming soon" (BR-004)
- Huy hiệu đỏ trên chuông thông báo chỉ hiện khi có thông báo chưa đọc; hiện tại luôn là 0 vì chưa
  có nguồn dữ liệu thật (BR-005)
- Mọi menu bật/tắt trên trang dùng chung một cơ chế bàn phím/chuột duy nhất (BR-006)
- Click logo/link đang active chỉ cuộn lên đầu trang thay vì điều hướng lại (DEC-001)
- Trạng thái đóng/mở của menu tài khoản và menu widget được theo dõi để focus bàn phím luôn đúng
  (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Trang chủ SAA 2025 | SCR003_Home (draft — số thật cấp lúc promote) | Header (logo 64×60px, nav "Awards Information" số nhiều), hero + đếm ngược, thông tin sự kiện, CTA, nội dung Root Further, khối Giải thưởng đủ 3 dòng mô tả, 6 thẻ giải thưởng, quảng bá Sun* Kudos, footer, widget nổi | Điều hướng tới mọi trang liên quan; (nếu đã đăng nhập) mở menu tài khoản/thông báo; đổi ngôn ngữ; mở widget hành động nhanh |

### User Journey

1. Khách vào `/`, thấy ngay hero với đếm ngược và toàn bộ nội dung công khai, không cần đăng nhập.
2. Khách cuộn qua các khối thông tin sự kiện, Root Further, danh sách giải thưởng, Sun* Kudos.
3. Khách click 1 thẻ giải thưởng hoặc nút CTA — được đưa tới đúng trang/mục liên quan.
4. (Nếu đã đăng nhập) khách mở menu tài khoản hoặc chuông thông báo từ header; admin thấy thêm
   lối vào Trang quản trị.

## 7. User Stories

### US001_BrowseHomepage — Browse Homepage

**Actor:** Khách truy cập (Anonymous)
**Goal:** Xem toàn bộ nội dung công khai của trang chủ SAA 2025 (hero, đếm ngược, thông tin sự
kiện, giải thưởng, Sun* Kudos) và điều hướng tới các trang liên quan.
**Business value:** Hiểu được chương trình SAA 2025 và tìm đường tới thông tin chi tiết mà không
cần đăng nhập trước — mở rộng tiếp cận tới toàn bộ Sunner.

**Acceptance Criteria:**
- [ ] Vào `/` không đăng nhập vẫn thấy đủ toàn bộ nội dung công khai, kể cả dòng mô tả thứ 3 của
      khối Giải thưởng.
- [ ] Đếm ngược hiển thị đúng trạng thái (đang đếm / đã tới mốc) theo `EVENT_START_AT`, chữ số
      dùng font LED (không phải `monospace`).
- [ ] Header hiển thị logo 64×60px và nhãn nav "Awards Information" (số nhiều).
- [ ] Mọi link (CTA, thẻ giải thưởng, Sun* Kudos, footer) dẫn đúng route/hashtag.

### US002_ManageAccountFromHeader — Manage Account From Header

**Actor:** Thành viên (Authenticated member)
**Goal:** Mở menu tài khoản từ header để xem Hồ sơ, đăng xuất, hoặc (nếu admin) vào Trang quản
trị.
**Business value:** Quản lý phiên đăng nhập và truy cập nhanh các trang quản lý từ bất kỳ đâu
trên trang chủ mà không cần rời trang trước.

**Acceptance Criteria:**
- [ ] Menu tài khoản mở/đóng đúng chuẩn bàn phím + chuột.
- [ ] Chỉ tài khoản quản trị viên thấy mục "Trang quản trị".
- [ ] Chọn "Đăng xuất" kết thúc phiên và đưa về `/login`.

### US003_CheckNotifications — Check Notifications

**Actor:** Thành viên (Authenticated member)
**Goal:** Mở panel thông báo từ header để biết có thông báo mới hay không.
**Business value:** Hạ tầng UI thông báo sẵn sàng cho tính năng notifications thật ở tương lai,
không để người dùng chờ một tính năng chưa tồn tại mà không có phản hồi gì.

**Acceptance Criteria:**
- [ ] Click chuông mở panel dạng dialog.
- [ ] Panel hiển thị đúng trạng thái rỗng khi chưa có thông báo.
- [ ] Huy hiệu đỏ không hiện khi không có thông báo chưa đọc.

### US004_UseQuickActionWidget — Use Quick Action Widget

**Actor:** Khách truy cập (Anonymous hoặc Authenticated)
**Goal:** Mở menu hành động nhanh nổi để đi thẳng tới Thể lệ hoặc Viết KUDOS.
**Business value:** Rút ngắn thao tác tới 2 tính năng thường dùng mà không cần cuộn/tìm trong
header, đặc biệt hữu ích khi đang ở cuối trang.

**Acceptance Criteria:**
- [ ] Widget luôn hiện, cố định góc dưới phải, không phân biệt trạng thái đăng nhập.
- [ ] Mở đúng menu 2 mục.
- [ ] Chọn 1 mục điều hướng đúng route.

## 8. Scenarios

### US001_BrowseHomepage — Happy Path

**Given** chưa tới mốc sự kiện và chưa đăng nhập, **When** khách vào `/`, **Then** trang hiển thị
đầy đủ hero/đếm ngược đang chạy/thông tin sự kiện/khối Giải thưởng đủ 3 dòng/6 thẻ giải thưởng/
Sun* Kudos/footer, header có logo 64×60px và nhãn "Awards Information".

### US001_BrowseHomepage — Error: Mốc sự kiện cấu hình sai

**Given** `EVENT_START_AT` thiếu hoặc sai định dạng, **When** khách vào `/`, **Then** đếm ngược
hiện `00/00/00` và "Coming soon" vẫn hiện, trang không lỗi/không crash.

### US002_ManageAccountFromHeader — Happy Path

**Given** đã đăng nhập với vai trò quản trị viên, **When** mở menu tài khoản, **Then** thấy đúng 3
mục Hồ sơ/Trang quản trị/Đăng xuất theo đúng thứ tự.

### US002_ManageAccountFromHeader — Error: Đọc vai trò thất bại

**Given** hệ thống đọc vai trò thất bại (Supabase gián đoạn), **When** mở menu tài khoản, **Then**
chỉ thấy Hồ sơ/Đăng xuất (fail-open coi như thành viên thường), không có lỗi hiển thị cho khách.

### US003_CheckNotifications — Happy Path

**Given** đã đăng nhập và chưa có thông báo nào, **When** click chuông, **Then** panel mở, hiện
"Bạn chưa có thông báo", không có huy hiệu đỏ.

### US004_UseQuickActionWidget — Happy Path

**Given** đang ở `/`, **When** click widget rồi chọn "Viết KUDOS", **Then** trang điều hướng tới
`/kudos`.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Biến môi trường mốc sự kiện thiếu hoặc sai định dạng | Countdown coi như chưa biết mốc: hiện 00/00/00, vẫn hiện "Coming soon", trang không lỗi | "None — silent handling" |
| Đã tới hoặc qua mốc sự kiện | 3 ô giữ nguyên 00/00/00, ẩn "Coming soon", không hiển thị số âm | "None — silent handling" |
| Đọc vai trò người dùng bị lỗi (Supabase gián đoạn) | Coi như thành viên thường (fail-open); không hiện "Trang quản trị" dù người dùng có thể là quản trị viên thật | "None — silent handling" |
| Thẻ giải thưởng thiếu slug hashtag hợp lệ | Điều hướng tới trang thông tin giải thưởng nhưng không tự cuộn tới mục nào | "None — silent handling" |
| Trang đích (Trang quản trị, Hồ sơ, Thông tin giải thưởng, Sun* Kudos, Tiêu chuẩn chung) chưa được xây dựng | Link vẫn hiển thị và điều hướng đúng địa chỉ, nhưng trang đích hiện chưa tồn tại | "Not found" (trang lỗi mặc định của Next.js cho tới khi các trang đó được implement) |

## 10. Edge Behaviours to Verify

- **FR-001** → Tester xác nhận `/` trả nội dung thành công cho cả 2 trạng thái đăng nhập, không
  có redirect nào.
- **FR-202** → Tester xác nhận đếm ngược giảm đúng mỗi phút và dừng đúng ở 00/00/00 khi tới/qua
  mốc.
- **FR-206** → Tester xác nhận cả 6 thẻ giải thưởng đều dẫn đúng hashtag hạng mục tương ứng.
- **FR-211** → Tester xác nhận khối Giải thưởng render đủ 3 dòng, kể cả dòng mô tả phụ.
- **FR-212** → Tester xác nhận nhãn nav là "Awards Information" (số nhiều) ở cả 2 locale.
- **FR-213** → Tester xác nhận logo header đo được 64×60px.
- **FR-214** → Tester xác nhận `font-family` của chữ số đếm ngược không phải `monospace` mặc định
  (phải là font LED thật hoặc thay thế đã duyệt theo D003) — hiện vẫn `monospace` vì D003 chưa
  chốt, xem RISK-03.
- **FR-403** → Tester xác nhận menu tài khoản chỉ hiện "Trang quản trị" cho đúng tài khoản quản
  trị viên.
- **FR-402** → Tester xác nhận huy hiệu đỏ không hiện khi không có thông báo chưa đọc.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | `/admin` không có route thật — `account-menu.tsx` render `href="/admin"` cho `role='admin'` nhưng `ROUTES` không có `ADMIN`; 4 trang đích còn lại (`/awards`, `/kudos`, `/standards`, `/profile`) đã implement từ các feature riêng | Link "Trang quản trị" 404 cho admin; TC ID-59 (broken links) chỉ còn áp dụng cho `/admin` | confirmed (`/admin` only) |
| RISK-02 | risk | Bảng `notifications` đã có từ F012_NotificationsPanel (migration `0012_notifications.sql`, `0013_notification_emitters.sql`) | Panel thông báo không còn rỗng vĩnh viễn — `NotificationBell`/`useNotifications` đọc dữ liệu thật | resolved |
| RISK-03 | known-issue | Font "Digital Numbers" cho digit đếm ngược chưa được nạp — không có file font nào dưới `public/`; `countdown-tiles.tsx` khai `fontFamily: '"Digital Numbers", monospace'` nhưng font khai không tồn tại nên trình duyệt luôn render `monospace`. Dùng chung với F011 (đếm ngược prelaunch). Nợ đã ghi ở `plans/260908-1653-countdown-prelaunch-page/clarifications.md` § Ghi nợ; cần D003 (quyết định cấp phép font, chưa chốt). | Chữ số đếm ngược sai font thiết kế trên cả `/` và `/prelaunch` | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_GoogleOAuthLogin | feature | Dùng chung session/guard; PERM001 (Root Route Guard) trở nên lỗi thời do `/` không còn redirect — cập nhật thật ở permissions-matrix.md thuộc phạm vi F001, không phải feature này | FR-001 |
| F002_LanguageSwitch | feature | Tái dùng nguyên trạng `LanguageSelector` trong header, không re-spec | FR-208 |
| Supabase `saa-app` (`public.users.role`) | external-service | Nguồn dữ liệu vai trò member/admin, đọc phía server | FR-003, FR-601 |
| `EVENT_START_AT` (biến môi trường) | config | Mốc thời gian sự kiện quyết định trạng thái đếm ngược | FR-202 |
| `/admin` (route không tồn tại) | feature | Nút "Trang quản trị" của `account-menu.tsx` trỏ tới route này cho `role='admin'` — không có trang, không có `ROUTES.ADMIN` | RISK-01 |
| Font "Digital Numbers" hoặc thay thế được duyệt | asset/license | Cần để `CountdownTiles` khớp thiết kế LED — quyết định người, xem D003 | FR-214 |

## 13. Configuration

```text
EVENT_START_AT = <ISO-8601 datetime>   # mốc thời gian sự kiện SAA 2025 bắt đầu, quyết định đồng hồ đếm ngược
```
