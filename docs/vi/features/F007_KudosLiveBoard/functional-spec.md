---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
---

**Priority**: P0
**Type**: mixed

## 1. Overview

**Problem:** Năm điểm liên kết đang hiện diện công khai trên site (header, footer, khối Sun*
Kudos ở `/`/`/awards`, widget hành động nhanh, nút "Viết KUDOS" ở `/standards`) đều trỏ tới
`/kudos` — một trang chưa hề tồn tại (404). Sunner không có cách nào thấy được toàn bộ hoạt động
gửi lời cảm ơn (Kudos) đang diễn ra trong sự kiện SAA 2025.
**Solution:** Trang `/kudos` hiển thị bảng Kudos trực tiếp trong một lần tải: banner ghi nhận,
carousel 5 kudo nhiều tim nhất, bảng Spotlight điểm tên người nhận kèm tổng số kudo thật, feed
toàn bộ kudos cuộn vô hạn, và sidebar thống kê cá nhân cộng 2 bảng xếp hạng. Bộ lọc Hashtag và
Phòng ban thu hẹp đồng thời carousel lẫn feed.
**Scope:** Dựng trọn cấu trúc board và mọi tương tác nằm hoàn toàn trong màn hình này (lọc, lật
carousel, tìm Sunner, cuộn feed, copy link, mở hồ sơ) — mở cho cả người dùng ẩn danh và đã đăng
nhập.
**Non-Scope:** Mở dialog Viết Kudo, dialog Secret Box, trang chi tiết kudo, hover preview profile,
lightbox ảnh, pan/zoom Spotlight thật — 5 bề mặt này cần một frame Figma chưa tồn tại, hoãn sang
phiên sau. Bản thân hành vi bấm/thu hồi trái tim thuộc `F008_KudosHeartReaction` — F007 chỉ hiển
thị số tim, không viết FR/BR nào cho hành vi bấm.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Sunner ẩn danh | Nhân viên Sun* chưa đăng nhập, ghé `/kudos` từ một trong 5 điểm liên kết công khai | Xem toàn bộ hoạt động Kudos của sự kiện mà không cần đăng nhập |
| Sunner đã đăng nhập | Nhân viên đã đăng nhập bằng Google | Lọc/tìm đúng kudo quan tâm, xem thống kê cá nhân và mở hồ sơ đồng nghiệp |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem, lọc & lan toả bảng Kudos trực tiếp | Xem toàn bộ board (banner, carousel Highlight, Spotlight, feed ALL KUDOS, sidebar); lọc theo Hashtag/Phòng ban; lật carousel; tìm Sunner trong Spotlight; cuộn thêm feed; copy link 1 kudo; mở hồ sơ người gửi/nhận/leaderboard | US001, US002, US003, US004, US005, US006, US007, US008 | FR-001, FR-002, FR-101, FR-102, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-209, FR-210, FR-211, FR-212, FR-213, FR-401, FR-402, FR-601, FR-602 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, BR-007, BR-008, BR-009, BR-010, BR-011, BR-012, BR-013, BR-014, BR-015, SM-001 | SCR007_KudosLiveBoard |

**Single-capability rationale:** Xem toàn bộ board (US001), lọc theo hashtag/phòng ban (US003), và
chia sẻ một kudos ra ngoài (US006) đều phục vụ đúng một ý định — thấy và lan toả lời cảm ơn đang
diễn ra trong sự kiện — không phải ba ý định tách biệt, đúng lý do `feature-list.md` đã gộp toàn
bộ board vào một Feature duy nhất thay vì tách theo từng khu vực hiển thị.

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Sidebar 5 chỉ số cá nhân + nút "Mở quà" hiển thị thế nào cho người chưa đăng nhập? | Ẩn hoàn toàn khối 5 chỉ số + nút "Mở quà" khi ẩn danh; giữ nguyên 2 danh sách xếp hạng (dữ liệu công khai, không thuộc về người xem). | 5 chỉ số vốn cá nhân hoá theo viewer — hiện "0" giả cho người ẩn danh dễ gây hiểu nhầm "bạn có 0 kudos" thay vì "chưa đăng nhập"; ẩn khối là lựa chọn ít nhầm lẫn nhất và không cần dựng thêm trạng thái mới. | no |
| D002 | Ô tìm Sunner trong Spotlight (B.7.3) làm gì khi Spotlight đã là scatter tĩnh (không phải canvas tương tác)? | Tìm kiếm lọc/làm nổi bật đúng (các) tên khớp trong scatter tĩnh hiện có; không điều hướng đi đâu. | Click-node và trang chi tiết đã hoãn cùng lý do Spotlight tĩnh (`clarifications.md`); giữ hành vi tìm kiếm trong đúng phạm vi dữ liệu đang hiển thị là lựa chọn ít thay đổi nhất. | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Dữ liệu Kudos (người gửi, người nhận, nội dung, hashtag, ảnh, thời điểm, số tim) được đọc công khai từ một nguồn `kudos` duy nhất, không phân biệt vai trò đăng nhập.
- **FR-002** Phòng ban của mỗi Sunner được lưu ở một cột dữ liệu mới trên `users`, làm nguồn cho bộ lọc "Phòng ban" và cho thông tin hiển thị trên thẻ Kudos.

### Navigation (1xx)

- **FR-101** Cả 5 điểm liên kết hiện có tới `/kudos` (header, footer, khối Sun* Kudos, widget nổi, nút "Viết KUDOS" ở `/standards`) đều mở được trang, không còn trả lỗi 404.
- **FR-102** `/kudos` không yêu cầu đăng nhập — người dùng ẩn danh và đã đăng nhập cùng thấy một bố cục.

### SCR007_KudosLiveBoard (2xx)

- **FR-201** Banner đầu trang hiển thị tiêu đề "Hệ thống ghi nhận và cảm ơn" và logo sự kiện, chỉ để đọc.
- **FR-202** Ô nhập dưới banner hiển thị dạng pill với icon bút và placeholder mời gửi lời cảm ơn; trong phạm vi F007, ô này chỉ render — bấm vào chưa mở dialog gửi Kudo.
- **FR-203** Carousel Highlight Kudos hiển thị đúng 5 thẻ kudo nhiều tim nhất, thẻ ở giữa nổi bật, hai bên mờ.
- **FR-204** Người dùng lật carousel bằng 2 cặp nút mũi tên (cạnh thẻ và cạnh số trang) cùng điều khiển một vị trí trượt; số trang hiển thị dạng "x/5".
- **FR-205** Mỗi thẻ Kudos (Highlight và ALL KUDOS) hiển thị avatar/tên/phòng ban/số hoa thị của người gửi và người nhận, thời điểm đăng theo định dạng "HH:mm - MM/DD/YYYY", nội dung lời cảm ơn, danh sách hashtag, số lượt tim, nút Copy Link và nút "Xem chi tiết".
- **FR-206** Bộ lọc Hashtag và Phòng ban lấy danh sách trực tiếp từ dữ liệu thật; chọn một giá trị lọc lại đồng thời carousel Highlight và feed ALL KUDOS.
- **FR-207** Bấm vào một hashtag hiển thị trên thẻ áp dụng đúng bộ lọc Hashtag đó.
- **FR-208** Khu vực Spotlight hiển thị tổng số kudos thật của hệ thống ("N KUDOS") và một scatter tĩnh tên các Sunner nhận nhiều Kudos.
- **FR-209** Ô tìm Sunner trong Spotlight nhận tối đa 100 ký tự.
- **FR-210** Feed ALL KUDOS tải thêm kudo khi người dùng cuộn tới cuối danh sách (infinite scroll).
- **FR-211** Sidebar hiển thị 5 chỉ số cá nhân (Kudos nhận được/đã gửi, tim nhận được, Secret Box đã mở/chưa mở) và 2 danh sách xếp hạng ("SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT", "SUNNER NHẬN QUÀ MỚI NHẤT"), cuộn độc lập với nội dung chính.
- **FR-212** Khi hệ thống chưa có kudo nào, carousel Highlight và feed ALL KUDOS đều hiển thị cùng một thông báo rỗng.
- **FR-213** Khi một danh sách xếp hạng ở sidebar chưa có dữ liệu, danh sách đó hiển thị thông báo rỗng riêng.

### Interaction (4xx)

- **FR-401** Bấm "Copy Link" trên bất kỳ thẻ Kudos nào sao chép URL của kudo đó vào clipboard và hiển thị toast xác nhận.
- **FR-402** Bấm avatar hoặc tên (người gửi, người nhận, hoặc một mục trong leaderboard) điều hướng sang trang hồ sơ Sunner tương ứng.

### Security (6xx)

- **FR-601** Người dùng chưa đăng nhập bấm vào đích mở hồ sơ hoặc "Xem chi tiết" bị chuyển hướng sang đăng nhập; việc xem chính `/kudos` không bị chặn.
- **FR-602** Người dùng chưa đăng nhập nhìn thấy nút trái tim ở trạng thái vô hiệu hoá kèm gợi ý đăng nhập.

## 5. Business Rules

- Carousel Highlight luôn lấy đúng 5 kudo có số tim cao nhất tại thời điểm tải trang. (BR-001)
- Cả hai cặp nút điều hướng carousel disable đồng thời: nút lùi ở slide đầu tiên, nút tiến ở slide thứ 5. (BR-002)
- Chọn một giá trị Hashtag hoặc Phòng ban lọc lại cả carousel Highlight lẫn feed ALL KUDOS, và đưa carousel về slide 1. (BR-003)
- Bấm một hashtag hiển thị trên thẻ áp dụng bộ lọc Hashtag đúng tag đó, tương đương chọn từ dropdown. (BR-004)
- Nội dung lời cảm ơn cắt ở dòng thứ 3 (thẻ Highlight) hoặc dòng thứ 5 (thẻ ALL KUDOS), phần dư hiện "...". (BR-005)
- Hashtag hiển thị tối đa 5 tag trên 1 dòng, quá dòng hiện "...". (BR-006)
- Ảnh đính kèm hiển thị tối đa 5 ảnh mỗi thẻ, căn lề trái. (BR-007)
- Số hoa thị của người gửi/người nhận tính từ tổng số kudo họ đã NHẬN: 10 kudo = 1 hoa thị, 20 = 2, 50 = 3. (BR-008)
- Tổng "N KUDOS" ở đầu Spotlight là số đếm thật của toàn bộ bảng kudos, không phải giá trị tĩnh. (BR-009)
- Ô tìm Sunner trong Spotlight nhận tối đa 100 ký tự và vô hiệu hoá nút tìm khi để trống. (BR-010)
- Khi hệ thống chưa có kudo nào, carousel Highlight và feed ALL KUDOS đều hiển thị "Hiện tại chưa có Kudos nào." (BR-011)
- Khi một danh sách xếp hạng ở sidebar chưa có dữ liệu, danh sách đó hiển thị "Chưa có dữ liệu". (BR-012)
- Người dùng chưa đăng nhập bấm avatar, tên, hoặc "Xem chi tiết" trên bất kỳ Kudos nào bị chuyển hướng sang đăng nhập; chỉ xem trang không bị chặn. (BR-013)
- Nút trái tim luôn hiển thị số lượt tim hiện tại; với người chưa đăng nhập, nút render ở trạng thái vô hiệu hoá kèm gợi ý đăng nhập — hành vi bấm tim khi đã đăng nhập thuộc `F008_KudosHeartReaction`, không phải quy tắc của F007. (BR-014)
- `/kudos` không áp dụng route-guard nào; người dùng ẩn danh và đã đăng nhập nhận cùng một nội dung trang. (BR-015)
- Vị trí trượt hiện tại của carousel Highlight Kudos là trạng thái riêng của trình duyệt, không được lưu lại giữa các lượt tải trang. (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Bảng Kudos trực tiếp | SCR007_KudosLiveBoard | Banner ghi nhận, carousel 5 kudo nổi bật, bảng Spotlight, feed toàn bộ kudos, sidebar thống kê + xếp hạng | Lọc theo hashtag/phòng ban, lật carousel, cuộn feed, copy link, mở hồ sơ, tìm Sunner trong Spotlight |

### User Journey

1. Sunner (ẩn danh hoặc đã đăng nhập) mở `/kudos` từ header, footer, khối Sun* Kudos, widget, hoặc nút "Viết KUDOS" ở `/standards`, và thấy banner ghi nhận cùng carousel Highlight Kudos.
2. Sunner lọc theo Hashtag hoặc Phòng ban — carousel Highlight và feed ALL KUDOS lọc lại đồng thời.
3. Sunner cuộn xuống Spotlight, thấy tổng số kudos thật và tìm tên một đồng nghiệp.
4. Sunner cuộn tiếp xuống feed ALL KUDOS, tải thêm kudo khi cuộn tới cuối danh sách hiện có.
5. Sunner bấm Copy Link trên một kudo để chia sẻ, hoặc bấm avatar/tên để mở hồ sơ người đó (yêu cầu đăng nhập).
6. Sunner đã đăng nhập xem 5 chỉ số cá nhân và 2 bảng xếp hạng ở sidebar.

## 7. User Stories

### US001_ViewKudosLiveBoard — View Kudos Live Board

**Actor:** Sunner ẩn danh
**Goal:** Mở `/kudos` từ bất kỳ điểm liên kết nào trên site và xem toàn bộ board Kudos mà không cần đăng nhập.
**Business value:** Biến 5 liên kết "Sun* Kudos" đang 404 trên site (header, footer, khối Kudos, widget, `/standards`) thành một trang thật.

**Acceptance Criteria:**
- [ ] Vào `/kudos` từ cả 5 điểm liên kết đều trả về `200`, không redirect sang `/login`.
- [ ] Banner, carousel Highlight, Spotlight, feed ALL KUDOS và sidebar đều hiển thị cho cả actor ẩn danh và đã đăng nhập.

### US002_NavigateHighlightCarousel — Navigate Highlight Carousel

**Actor:** Sunner (bất kỳ)
**Goal:** Lật qua 5 kudo nổi bật nhất mà không phải cuộn cả feed.
**Business value:** Làm nổi bật những lời cảm ơn giàu tương tác nhất trong sự kiện.

**Acceptance Criteria:**
- [ ] Bấm nút tiến chuyển sang thẻ kế tiếp, số trang tăng theo; disable khi ở thẻ 5.
- [ ] Bấm nút lùi chuyển về thẻ trước, disable khi ở thẻ 1.

### US003_FilterKudosByHashtagOrDepartment — Filter Kudos by Hashtag or Department

**Actor:** Sunner (bất kỳ)
**Goal:** Thu hẹp cả carousel lẫn feed về đúng chủ đề hoặc phòng ban quan tâm.
**Business value:** Giúp tìm nhanh lời cảm ơn liên quan tới một nhóm/chủ đề giữa hàng trăm kudo.

**Acceptance Criteria:**
- [ ] Chọn 1 hashtag từ dropdown lọc lại cả carousel Highlight và feed ALL KUDOS.
- [ ] Chọn 1 phòng ban từ dropdown lọc lại cả hai khu vực tương tự.
- [ ] Bấm 1 hashtag ngay trên thẻ kudos áp dụng đúng bộ lọc đó.

### US004_SearchSunnerInSpotlight — Search Sunner in Spotlight

**Actor:** Sunner (bất kỳ)
**Goal:** Tìm nhanh một đồng nghiệp trong bảng Spotlight đông tên.
**Business value:** Giúp người xem xác nhận đồng nghiệp mình có tên trong Spotlight mà không phải dò từng tên.

**Acceptance Criteria:**
- [ ] Gõ tối đa 100 ký tự vào ô tìm; ký tự thứ 101 không được nhập.
- [ ] Nút tìm vô hiệu hoá khi ô tìm để trống.

### US005_BrowseAllKudosFeed — Browse All Kudos Feed

**Actor:** Sunner (bất kỳ)
**Goal:** Đọc lần lượt toàn bộ lời cảm ơn của sự kiện.
**Business value:** Cho người xem cảm nhận được quy mô và không khí ghi nhận của toàn sự kiện, không chỉ 5 kudo nổi bật.

**Acceptance Criteria:**
- [ ] Cuộn tới cuối danh sách hiện có tự tải thêm kudo tiếp theo.
- [ ] Hệ thống chưa có kudo nào hiển thị "Hiện tại chưa có Kudos nào."

### US006_ShareKudosLink — Share Kudos Link

**Actor:** Sunner (bất kỳ)
**Goal:** Sao chép liên kết một kudo cụ thể để chia sẻ ra ngoài board.
**Business value:** Lan toả một lời cảm ơn cụ thể sang kênh khác (chat nội bộ, mạng xã hội).

**Acceptance Criteria:**
- [ ] Bấm "Copy Link" sao chép đúng URL của kudo vào clipboard.
- [ ] Toast "Link copied — ready to share!" hiện ra ngay sau khi copy.

### US007_ViewOwnKudosStats — View Own Kudos Stats

**Actor:** Sunner đã đăng nhập
**Goal:** Xem nhanh 5 chỉ số cá nhân và 2 bảng xếp hạng liên quan tới hoạt động Kudos của sự kiện.
**Business value:** Tạo động lực tham gia — người xem thấy vị trí/đóng góp của mình trong sự kiện.

**Acceptance Criteria:**
- [ ] Sidebar hiển thị đúng 5 chỉ số: Kudos nhận được, Kudos đã gửi, tim nhận được, Secret Box đã mở, Secret Box chưa mở.
- [ ] Danh sách xếp hạng chưa có dữ liệu hiển thị "Chưa có dữ liệu".

### US008_OpenSunnerProfileFromKudos — Open Sunner Profile from Kudos

**Actor:** Sunner (bất kỳ)
**Goal:** Mở hồ sơ người gửi, người nhận, hoặc một mục trong leaderboard ngay từ board Kudos.
**Business value:** Kết nối board Kudos với hồ sơ cá nhân (F006), giúp người xem biết thêm về người được nhắc tới.

**Acceptance Criteria:**
- [ ] Sunner đã đăng nhập bấm avatar/tên mở đúng trang hồ sơ người đó.
- [ ] Sunner chưa đăng nhập bấm avatar/tên bị chuyển hướng sang đăng nhập.

## 8. Scenarios

### US001_ViewKudosLiveBoard — Happy Path

**Given** Sunner chưa đăng nhập bấm nút "Chi tiết" của khối Sun* Kudos ở `/`, **When** trang
`/kudos` tải xong, **Then** banner, carousel Highlight, Spotlight, feed và sidebar (rút gọn theo
D001) đều hiển thị, không có redirect nào xảy ra.

### US002_NavigateHighlightCarousel — Happy Path

**Given** carousel đang ở thẻ 1/5, **When** Sunner bấm nút tiến 4 lần liên tiếp, **Then** carousel
dừng ở thẻ 5/5 và nút tiến chuyển sang trạng thái disabled.

### US003_FilterKudosByHashtagOrDepartment — Happy Path

**Given** board đang hiển thị mọi kudos, **When** Sunner chọn hashtag `#Dedicated`, **Then**
carousel Highlight và feed ALL KUDOS chỉ còn kudo mang hashtag đó, carousel về lại slide 1.

### US003_FilterKudosByHashtagOrDepartment — Error: bộ lọc không khớp kudo nào

**Given** Sunner chọn một hashtag không có kudo nào mang tag đó, **When** bộ lọc áp dụng xong,
**Then** carousel và feed cùng hiển thị "Hiện tại chưa có Kudos nào." thay vì lỗi.

### US004_SearchSunnerInSpotlight — Happy Path

**Given** Sunner gõ tên một đồng nghiệp có mặt trong Spotlight, **When** bấm Enter hoặc icon tìm,
**Then** tên khớp được làm nổi bật trong scatter tĩnh.

### US004_SearchSunnerInSpotlight — Error: nhập quá 100 ký tự

**Given** Sunner đang gõ vào ô tìm Sunner, **When** gõ tới ký tự thứ 101, **Then** ô nhập chặn
không cho gõ thêm — không có kudo/toast lỗi nào hiện ra.

### US005_BrowseAllKudosFeed — Happy Path

**Given** feed còn kudo chưa tải, **When** Sunner cuộn tới cuối danh sách hiện có, **Then** trang
tự tải thêm một trang kudo tiếp theo, nối vào cuối danh sách.

### US005_BrowseAllKudosFeed — Error: hệ thống chưa có kudo nào

**Given** bảng `kudos` rỗng, **When** Sunner mở `/kudos`, **Then** feed ALL KUDOS hiển thị "Hiện
tại chưa có Kudos nào." thay vì danh sách trống không giải thích.

### US006_ShareKudosLink — Happy Path

**Given** Sunner đang xem một thẻ Kudos, **When** bấm "Copy Link", **Then** URL của kudo đó được
sao chép vào clipboard và toast "Link copied — ready to share!" hiện ra ngay.

### US007_ViewOwnKudosStats — Happy Path

**Given** Sunner đã đăng nhập và đã nhận/gửi một số kudos, **When** mở `/kudos`, **Then** sidebar
hiển thị đúng 5 chỉ số cá nhân và 2 danh sách xếp hạng.

### US008_OpenSunnerProfileFromKudos — Happy Path

**Given** Sunner đã đăng nhập đang xem một thẻ Kudos, **When** bấm tên người nhận, **Then** trang
hồ sơ (`/profile?id=...`) của người đó mở ra.

### US008_OpenSunnerProfileFromKudos — Error: chưa đăng nhập

**Given** Sunner chưa đăng nhập đang xem board Kudos, **When** bấm avatar hoặc tên bất kỳ, **Then**
hệ thống chuyển hướng sang trang đăng nhập thay vì mở hồ sơ.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Ô tìm Sunner nhập quá 100 ký tự | Ô input tự chặn không cho gõ thêm từ ký tự thứ 101 | "Không có thông báo riêng — ô nhập tự chặn ký tự vượt quá 100" |
| Ô tìm Sunner để trống rồi bấm tìm | Nút tìm ở trạng thái vô hiệu hoá, không gửi được yêu cầu tìm | "Không có thông báo riêng — nút tìm bị vô hiệu hoá" |
| Hệ thống chưa có kudo nào | Carousel Highlight và feed ALL KUDOS đều hiện thông báo rỗng | "Hiện tại chưa có Kudos nào." |
| Danh sách xếp hạng sidebar chưa có dữ liệu | Danh sách đó hiện thông báo rỗng riêng, phần còn lại của sidebar vẫn hiển thị | "Chưa có dữ liệu" |
| Người chưa đăng nhập bấm avatar/tên/"Xem chi tiết" | Hệ thống chuyển hướng sang trang đăng nhập | "Không có thông báo tại chỗ — chuyển hướng sang màn đăng nhập" |
| Carousel đang ở thẻ đầu tiên hoặc cuối cùng | Nút lùi/tiến tương ứng bị vô hiệu hoá, không lật thêm được | "Không có thông báo riêng — nút mũi tên bị vô hiệu hoá" |

## 10. Edge Behaviours to Verify

- **FR-204** → Kiểm tra nút lùi/tiến carousel disable đúng ở thẻ 1 và thẻ 5.
- **FR-206** → Kiểm tra chọn 1 hashtag/phòng ban lọc lại cả carousel và feed cùng lúc, đưa carousel về slide 1.
- **FR-209** → Kiểm tra ô tìm chặn ký tự thứ 101 và nút tìm disable khi rỗng.
- **FR-210** → Kiểm tra cuộn tới cuối feed tự tải thêm kudo.
- **FR-212** → Kiểm tra thông báo rỗng hiện đúng chuỗi khi chưa có kudo nào.
- **FR-601** → Kiểm tra người chưa đăng nhập bị chuyển hướng khi bấm avatar/tên.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Spotlight scatter dựng tĩnh cho đúng 8 tên lặp lại theo design gốc (Figma); khi dữ liệu thật có nhiều Sunner nhận kudo hơn 8 người, scatter tĩnh có thể không còn phản ánh đúng danh sách người nhận nhiều nhất. | Trải nghiệm Spotlight kém chính xác/kém hữu ích khi quy mô dữ liệu thật lớn hơn mock. | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F008_KudosHeartReaction | feature | Nút tim trên mỗi thẻ Kudos hiển thị số liệu và trạng thái, nhưng hành vi bấm/thu hồi tim do F008 triển khai | BR-014, `feature-list.md` § F008 |
| F006_ProfilePage | feature | Bấm avatar/tên trên board điều hướng sang trang hồ sơ đã có sẵn, tái dùng nguyên gate đăng nhập của trang đó | FR-402, BR-013, SCR006_Profile |
| Cột `department` mới trên `users` | data | Bộ lọc Phòng ban và hiển thị phòng ban trên thẻ cần nguồn dữ liệu này | FR-002 |
| Dữ liệu mẫu Figma (tên, nội dung, hashtag, mốc thời gian, số liệu sidebar) | data | Seed dữ liệu thật cho demo, không bịa | `clarifications.md` § Quyết định |

## 13. Configuration

```text
HIGHLIGHT_CAROUSEL_SIZE = 5       # số kudo hiển thị trong carousel Highlight (BR-001)
SUNNER_SEARCH_MAX_LENGTH = 100    # số ký tự tối đa ô tìm Sunner (BR-010)
CONTENT_MAX_LINES_HIGHLIGHT = 3   # số dòng tối đa nội dung trên thẻ Highlight trước khi rút gọn (BR-005)
CONTENT_MAX_LINES_FEED = 5        # số dòng tối đa nội dung trên thẻ ALL KUDOS trước khi rút gọn (BR-005)
HASHTAG_MAX_PER_LINE = 5          # số hashtag tối đa hiển thị trên 1 dòng trước khi rút gọn (BR-006)
IMAGE_MAX_PER_CARD = 5            # số ảnh đính kèm tối đa hiển thị trên 1 thẻ (BR-007)
STAR_TIER_THRESHOLDS = 10, 20, 50 # số kudo nhận được để đạt 1/2/3 hoa thị (BR-008)
```
