---
status: implemented
authored_by: takumi
created: 2026-09-07
fcode: F007
---

# SCR007_KudosLiveBoard — Screen Spec

**Screen**: SCR007_KudosLiveBoard: Bảng Kudos trực tiếp
**Feature**: F007_KudosLiveBoard (board) · F008_KudosHeartReaction (nút tim trên thẻ)
**Type**: composite
**Route**: /kudos
**Generated**: 2026-09-07

**Composite classification (2-of-3 gate):** composite. H1 (feature refs) PASS — hai F### cùng
tham chiếu màn này: F007 sở hữu board (component, JSX, số hiển thị), F008 sở hữu bảng `kudo_hearts`
+ đường ghi `toggleKudoHeart`. H2 (domain-module imports) fail — không import nào khớp
`features/*`/`modules/*`/`domains/*` (route-colocated `_components`/`_hooks`/`_actions` + `src/dal/*`).
H3 (semantic region wrappers) PASS theo cấu trúc dự kiến — 6 vùng nội dung (`<section>`) + sidebar
`<aside>`, trên ngưỡng 3. 2/3 → composite. **Chưa phát sinh `REG###` chính thức ở lượt promote
này** (code chưa tồn tại): bảng vùng dưới đây dùng nhãn layout `R1`-`R8`, đúng tiền lệ
SCR004_Awards và SCR006_Profile.

## 1. Overview

**Purpose:** Trang Kudos công khai — biến 5 điểm liên kết `/kudos` đang 404 trên site (header,
footer, khối Sun* Kudos ở `/` và `/awards`, widget hành động nhanh, nút "Viết KUDOS" ở
`/standards`) thành một trang thật, hiển thị toàn bộ đời sống lời cảm ơn của sự kiện SAA 2025
trong một lần tải. Mọi bề mặt cần một frame Figma chưa tồn tại (dialog Viết Kudo, dialog Secret
Box, trang chi tiết kudo, hover preview profile, lightbox ảnh) render trạng thái thật thà — cùng
nguyên tắc mà SCR005_Standards và SCR006_Profile đã lập tiền lệ.
**Actors:** Sunner ẩn danh (xem toàn bộ board, không cần đăng nhập) và Sunner đã đăng nhập (thêm
5 chỉ số cá nhân, thả tim, mở hồ sơ đồng nghiệp).
**Entry Conditions:** Không có — `/kudos` nằm trong nhóm `(public)`, không route-guard nào
(BR-015). Query optional: `?hashtag=` và/hoặc `?department=` (bộ lọc sống ở URL `searchParams`).
**Exit Conditions:** Không có nút thoát chuyên dụng — người dùng rời qua điều hướng chung
(`SiteHeader`/`SiteFooter`) hoặc bấm avatar/tên để sang `/profile?id=` (F006).

## 2. Screen Layout

### Layout Sketch

Khung nền tối, đầy đủ chrome (`SiteHeader`/`SiteFooter`, biến thể theo trạng thái đăng nhập) —
giống SCR003/SCR004/SCR006, khác SCR005 (không chrome). Nội dung chính một cột cho tới feed, từ
feed trở xuống chia hai cột: feed bên trái, sidebar bên phải cuộn độc lập.

```
┌───────────────────────────────────────────────────┐
│  R1: SiteHeader                                    │
├───────────────────────────────────────────────────┤
│  R2: Banner ghi nhận + ô nhập pill (chỉ render)     │
│  R3: Bộ lọc Hashtag + Phòng ban                     │
│  R4: Carousel HIGHLIGHT (5 thẻ, x/5, 2 cặp mũi tên) │
│  R5: Spotlight — "N KUDOS" + scatter + ô tìm Sunner │
│  ┌─────────────────────────┬───────────────────┐   │
│  │ R6: Feed ALL KUDOS      │ R7: Sidebar        │   │
│  │     (cuộn vô hạn)       │  5 chỉ số +        │   │
│  │                         │  2 leaderboard     │   │
│  └─────────────────────────┴───────────────────┘   │
├───────────────────────────────────────────────────┤
│  R8: SiteFooter                                    │
└───────────────────────────────────────────────────┘
```

### Layout Regions

| Region ID | Name | Position | Scrollable | Key Components |
|-----------|------|----------|------------|-----------------|
| R1 | Header dùng chung | sticky top | no | `SiteHeader` (biến thể anonymous hoặc đã đăng nhập) |
| R2 | Banner + ô nhập | top của `<main>` | trong dòng chảy trang | `KudosBanner`, `KudosComposePill` |
| R3 | Bộ lọc | dưới banner | trong dòng chảy trang | `KudosFilterBar`, `KudosFilterMenu` × 2 |
| R4 | Carousel HIGHLIGHT | dưới bộ lọc | trượt ngang (client state) | `KudosHighlightCarousel`, `KudosCarouselNav`, `KudosSlideCounter`, `KudosCard` × 5 |
| R5 | Spotlight | dưới carousel | trong dòng chảy trang | `KudosSpotlight`, `KudosSpotlightScatter`, `KudosSunnerSearch` |
| R6 | Feed ALL KUDOS | cột trái, dưới Spotlight | cuộn vô hạn (sentinel) | `KudosFeed`, `KudosFeedSentinel`, `KudosCard` × n, `KudosEmptyState` |
| R7 | Sidebar | cột phải, ngang R6 | cuộn độc lập với nội dung chính (FR-211) | `KudosSidebar`, `KudosStatList`, `KudosLeaderboard` × 2 |
| R8 | Footer dùng chung | cuối `<main>` | no | `SiteFooter` |

## 3. UI Elements

| ID | Element | Type | Required | Default | Visibility | Action | Source | Format | Empty Behavior | Cross-ref |
|----|---------|------|----------|---------|------------|--------|--------|--------|-----------------|-----------|
| E01 | `SiteHeader` | header | — | biến thể theo trạng thái đăng nhập | Always | logo/nav/bell/`VN` switcher/menu tài khoản hoặc link đăng nhập | injected | raw | — | dùng chung `/`, `/awards`, `/profile` |
| E02 | Banner ghi nhận | display field | — | — | Always | — | static (i18n `kudos`) | raw | — | FR-201; tiêu đề "Hệ thống ghi nhận và cảm ơn" + logo sự kiện, chỉ đọc |
| E03 | Ô nhập pill (icon bút + placeholder) | display field | — | — | Always | click KHÔNG mở dialog trong phạm vi F007 | static (i18n `kudos`) | raw | — | FR-202; placeholder nguyên văn `Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?` (frame `ihQ26W78P2` chưa tồn tại) |
| E04 | Dropdown Hashtag | combobox | — | không lọc | Always | chọn 1 giá trị → `router.push` với `?hashtag=` | distinct từ dữ liệu thật | raw | — | FR-206, BR-003 |
| E05 | Dropdown Phòng ban | combobox | — | không lọc | Always | chọn 1 giá trị → `router.push` với `?department=` | distinct `users.department` (cột mới) | raw | — | FR-002, FR-206, BR-003 |
| E06 | Carousel HIGHLIGHT (5 thẻ) | card (group) | — | slide 1 | Always | — | `kudos_cards` sắp `heart_count` giảm dần, `LIMIT 5` | thẻ giữa nổi bật, hai bên mờ | `Hiện tại chưa có Kudos nào.` | FR-203, BR-001, BR-011 |
| E07 | 2 cặp nút điều hướng + pagination "x/5" | button (group) | — | `1/5` | Always | lùi/tiến 1 slide; cả 2 cặp dùng chung 1 state | client state (`activeIndex`) | `x/5` | — | FR-204, BR-002, SM-001; lùi disable ở slide 1, tiến disable ở slide 5 |
| E08 | Thẻ Kudos (dùng chung Highlight + feed) | card | — | — | Always | — | `public.kudos_cards` | thời điểm `HH:mm - MM/DD/YYYY` | — | FR-205; avatar/tên/phòng ban/hoa thị người gửi + người nhận, nội dung, hashtag, ảnh |
| E09 | Nút trái tim + số tim | button | — | `heart_count` hiện tại | Always | đã đăng nhập: `toggleKudoHeart` (F008); ẩn danh: `disabled` + `title` mời đăng nhập | `kudos.heart_count` (denormalized, trigger F008 duy trì) | số nguyên | — | FR-205, FR-602, BR-014; đường GHI thuộc F008_KudosHeartReaction |
| E10 | Nút "Copy Link" + toast | button | — | — | Always | `navigator.clipboard.writeText(url)` → toast | client-only | toast `Link copied — ready to share!` (giữ tiếng Anh ở cả vi/en) | — | FR-401, US006 |
| E11 | Nút "Xem chi tiết" | button | — | — | Always | render nhưng KHÔNG điều hướng trong phạm vi F007 | — | raw | — | frame đích `onDIohs2bS` chưa tồn tại (`clarifications.md`) |
| E12 | Spotlight — tổng "N KUDOS" + scatter tĩnh tên | display field | — | — | Always | — | `COUNT(*)` thật trên `public.kudos`; scatter tĩnh theo design | `N KUDOS` | — | FR-208, BR-009; pan/zoom (`B.7.2`) hoãn — FRAME rỗng trong design |
| E13 | Ô tìm Sunner + nút tìm | text input + button | no | rỗng | Always | Enter/click icon → làm nổi bật tên khớp trong scatter, KHÔNG điều hướng | client state (`query`) | `maxLength=100`, placeholder `Tìm kiếm` | nút tìm `disabled` khi ô rỗng | FR-209, BR-010, D002 |
| E14 | Feed ALL KUDOS + sentinel | list | — | trang đầu (keyset cursor) | Always | cuộn tới sentinel → Server Action `loadMoreKudos` nối trang kế | `public.kudos_cards` sắp `created_at` giảm dần | danh sách `KudosCard` | `Hiện tại chưa có Kudos nào.` | FR-210, US005; hết dữ liệu = ngừng gọi, KHÔNG hiện thông báo (khác BR-011) |
| E15 | Thông báo rỗng Kudos | display field | — | — | Chỉ khi không có kudo nào khớp | — | static (i18n `kudos`) | raw, nguyên văn | luôn hiển thị (không phải danh sách trống im lặng) | FR-212, BR-011; áp cho CẢ carousel lẫn feed |
| E16 | Sidebar — 5 chỉ số cá nhân + nút "Mở quà" | card (group) | — | `0` cho người đã đăng nhập | Chỉ khi đã đăng nhập (ẩn HẲN khi ẩn danh) | nút "Mở quà" luôn `disabled` | thống kê cá nhân đọc theo viewer | raw | — | FR-211, US007, D001; 5 dòng: Kudos nhận được, Kudos đã gửi, tim nhận được, Secret Box đã mở, Secret Box chưa mở |
| E17 | 2 bảng xếp hạng | list (group) | — | — | Always (kể cả ẩn danh — dữ liệu công khai) | — | chưa có nguồn ở lượt này | raw | `Chưa có dữ liệu` (mỗi bảng độc lập) | FR-211, FR-213, BR-012; "SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT", "SUNNER NHẬN QUÀ MỚI NHẤT" |
| E18 | `SiteFooter` | footer | — | — | Always | — | injected | raw | — | dùng chung `/`, `/awards`, `/profile` |

E06/E08 và E14/E08 gộp thẻ lặp lại thành một dòng theo note template "repetitive groups collapse
to one row" — `KudosCard` là cùng một component, chỉ khác `maxLines` (3 ở Highlight, 5 ở feed,
BR-005).

## 4. User Actions

### Available Actions

| Action | Element | Trigger | Condition | Result on this screen | Source |
|--------|---------|---------|-----------|------------------------|--------|
| Chọn 1 hashtag từ dropdown | E04 | click option | luôn khả dụng | `router.push` `?hashtag=` → lọc lại ĐỒNG THỜI carousel + feed, carousel về slide 1 | FR-206, BR-003 |
| Chọn 1 phòng ban từ dropdown | E05 | click option | luôn khả dụng | như trên, với `?department=` | FR-206, BR-003 |
| Bấm 1 hashtag ngay trên thẻ | E08 | click | luôn khả dụng | áp đúng bộ lọc Hashtag đó, tương đương chọn từ dropdown | FR-207, BR-004 |
| Lật carousel (lùi/tiến) | E07 | click | lùi: không ở slide 1; tiến: không ở slide 5 | đổi `activeIndex`, đổi thẻ nổi bật, cập nhật `x/5` | FR-204, BR-002 |
| Gõ/tìm trong ô tìm Sunner | E13 | gõ / Enter / click icon | nút tìm chỉ bật khi ô không rỗng | làm nổi bật tên khớp trong scatter tĩnh — không round-trip server, không điều hướng | FR-209, D002 |
| Cuộn tới cuối feed | E14 | `IntersectionObserver` trên sentinel | còn dữ liệu chưa tải | gọi `loadMoreKudos(cursor)`, nối trang kế vào cuối danh sách | FR-210 |
| Bấm "Copy Link" | E10 | click | luôn khả dụng | URL kudo vào clipboard + toast `Link copied — ready to share!` | FR-401 |
| Bấm avatar hoặc tên (thẻ hoặc leaderboard) | E08, E17 | click | luôn khả dụng | `<Link href="/profile?id={uuid}">` — đã đăng nhập: mở hồ sơ; ẩn danh: gate của `/profile` redirect `/login` | FR-402, FR-601, BR-013 |
| Bấm nút tim | E09 | click | CHỈ khi đã đăng nhập và không phải kudo của chính mình | `toggleKudoHeart` — hành vi thuộc F008, F007 chỉ hiển thị | FR-602, BR-014 |
| Bấm "Xem chi tiết" | E11 | click | luôn khả dụng | KHÔNG điều hướng — frame đích chưa tồn tại | `clarifications.md` § Quyết định |
| Bấm "Mở quà" | E16 | click | luôn `disabled` | không hiệu ứng — chưa có bảng quà nào | `clarifications.md` (dialog `J3-4YFIpMM` chưa build) |

### Happy Path

1. Sunner (ẩn danh hoặc đã đăng nhập) mở `/kudos` từ một trong 5 điểm liên kết công khai → thấy
   banner ghi nhận, ô nhập pill, bộ lọc, carousel HIGHLIGHT `1/5`, Spotlight, feed và sidebar.
2. Sunner chọn hashtag hoặc phòng ban → carousel và feed lọc lại đồng thời, carousel về slide 1.
3. Sunner cuộn xuống Spotlight, thấy tổng `N KUDOS` thật và gõ tên một đồng nghiệp để làm nổi bật.
4. Sunner cuộn tiếp xuống feed ALL KUDOS → cuộn tới cuối tự tải thêm một trang kudo.
5. Sunner bấm "Copy Link" trên một kudo → toast xác nhận; hoặc bấm avatar/tên để mở `/profile?id=`.
6. Sunner đã đăng nhập xem 5 chỉ số cá nhân và 2 bảng xếp hạng ở sidebar, và thả tim cho một kudo.

### Branches

| Decision point | Condition | Outcome on this screen | Source |
|----------------|-----------|------------------------|--------|
| Trạng thái đăng nhập | ẩn danh | 5 chỉ số + nút "Mở quà" ẩn HẲN; 2 leaderboard vẫn hiện; nút tim `disabled` kèm `title` mời đăng nhập | D001, BR-014, FR-602 |
| Trạng thái đăng nhập | đã đăng nhập | sidebar đủ 5 chỉ số; nút tim thả được (F008) | FR-211, US007 |
| Bộ lọc | có `?hashtag=` và/hoặc `?department=` | carousel + feed cùng thu hẹp; carousel remount về slide 1 | BR-003 |
| Bộ lọc | không kudo nào khớp | carousel và feed cùng hiện `Hiện tại chưa có Kudos nào.` thay vì lỗi | BR-011 |
| Vị trí carousel | slide 1 | nút lùi `disabled` (cả 2 cặp) | BR-002 |
| Vị trí carousel | slide 5 | nút tiến `disabled` (cả 2 cặp) | BR-002 |
| Phân trang feed | còn dữ liệu | sentinel vào viewport → tải thêm | FR-210 |
| Phân trang feed | đã tải hết | ngừng gọi, không hiện thông báo nào | § Edge cases (khác BR-011) |
| Leaderboard | chưa có dữ liệu | CHỈ bảng đó hiện `Chưa có dữ liệu`; phần còn lại sidebar vẫn render | FR-213, BR-012 |
| Bấm avatar/tên khi ẩn danh | chưa đăng nhập | redirect `/login` qua gate `(protected)/layout.tsx` có sẵn của `/profile` — KHÔNG phải gate mới của F007 | BR-013 |

## 5. UI States

| State | Trigger | Visual Behavior | User Action Available | Source |
|-------|---------|----------------|-----------------------|--------|
| anonymous | không có session | Sidebar chỉ còn 2 leaderboard; nút tim `disabled` + `title` | lọc, lật carousel, cuộn feed, tìm Sunner, copy link | D001, FR-602 |
| authenticated | có session | Sidebar đủ 5 chỉ số + nút "Mở quà" `disabled`; nút tim thả được | thêm: thả/bỏ tim (F008), mở hồ sơ | FR-211 |
| filtered | `?hashtag=` / `?department=` | carousel + feed cùng thu hẹp, carousel về `1/5` | bỏ lọc bằng cách chọn lại | BR-003 |
| carousel slide 1 | mặc định / sau khi đổi bộ lọc | nút lùi `disabled`, pagination `1/5` | bấm tiến | BR-002, SM-001 |
| carousel slide 5 | lật tiến 4 lần | nút tiến `disabled`, pagination `5/5` | bấm lùi | BR-002 |
| feed loading-more | sentinel vào viewport, còn dữ liệu | nối thêm thẻ vào cuối danh sách | tiếp tục cuộn | FR-210 |
| feed đã tải hết | không còn cursor | ngừng gọi thêm, KHÔNG thông báo | — | § Edge cases |
| kudos-empty | bảng `kudos` rỗng hoặc bộ lọc không khớp | carousel VÀ feed cùng hiện `Hiện tại chưa có Kudos nào.` | đổi/bỏ bộ lọc | FR-212, BR-011 |
| leaderboard-empty | 1 bảng xếp hạng chưa có nguồn | chỉ bảng đó hiện `Chưa có dữ liệu` | — | FR-213, BR-012 |
| spotlight-search-highlight | gõ tên + Enter/click icon | tên khớp được làm nổi bật trong scatter tĩnh | xoá ô tìm để bỏ nổi bật | D002 |
| copy-link-toast | bấm "Copy Link" | toast `Link copied — ready to share!` hiện ngay, tự ẩn sau vài giây | — | FR-401 |

Vị trí trượt carousel là trạng thái riêng của trình duyệt, KHÔNG lưu giữa các lượt tải trang
(SM-001). Không có trạng thái "Live" theo nghĩa Supabase Realtime — "Live board" là nhãn design,
trang dùng server render + revalidate (`clarifications.md`).

## 6. Validation & Feedback

| Field | Rule | Error message | Source |
|-------|------|---------------|--------|
| Ô tìm Sunner (E13) | tối đa 100 ký tự — ký tự thứ 101 bị chặn ngay tại input (`maxLength=100`) | KHÔNG có thông báo lỗi — design không vẽ chuỗi nào, không bịa thêm | BR-010, `clarifications.md` § Chưa giải quyết |
| Ô tìm Sunner (E13) | không cho tìm khi rỗng | KHÔNG có required message — nút tìm ở trạng thái `disabled` | BR-010, D002 |

Không có form nhập liệu nào khác trên màn này — ô nhập pill (E03) chỉ render, chưa nhận input
trong phạm vi F007.

## 7. Conditional UI

Ba nhánh điều kiện, không có nhánh nào khác:
- **E16 (5 chỉ số + "Mở quà")** ẩn HẲN khi ẩn danh — không render rồi `hidden`, vì hiện `0` cho
  người chưa đăng nhập đọc thành "bạn có 0 kudos" chứ không phải "bạn chưa đăng nhập" (D001).
- **E09 (nút tim)** `disabled` + `title` mời đăng nhập khi ẩn danh; thả được khi đã đăng nhập và
  kudo không phải của chính mình (F008 BR — người gửi bị chặn tự thả tim).
- **E15 (thông báo rỗng)** thay thế nội dung của CẢ carousel lẫn feed khi không kudo nào khớp.

Bị BỎ HẲN khỏi phạm vi (không phải một nhánh điều kiện): dialog Viết Kudo, dialog Secret Box,
trang chi tiết kudo, hover preview profile, lightbox ảnh, pan/zoom Spotlight, quy tắc "+2 tim
ngày đặc biệt" — mỗi thứ đều cần một frame Figma hoặc một màn admin chưa tồn tại
(`clarifications.md` § Phát hiện chi phối toàn bộ phạm vi).

## 8. Accessibility

| Aspect | Status | Notes |
|--------|--------|-------|
| ARIA roles/labels | [PLANNED] | Dropdown bộ lọc theo mẫu `role="combobox"`/`role="listbox"`/`role="option"` (cùng mẫu `KudosDirectionSelect` của SCR006); nút carousel có nhãn lùi/tiến; pagination `x/5` đọc được |
| Keyboard navigation | [PLANNED] | Dropdown dùng `useMenuKeyboardNav` (roving tabindex) — cùng hook `LanguageSelector`/`AccountMenu`/`KudosDirectionSelect` |
| Focus management | [PLANNED] | Nút carousel, option bộ lọc, nút tim, "Copy Link" đều cần `focus-visible:ring-2` theo chuẩn các screen trước |
| Reduced motion | [PLANNED] | Chuyển slide carousel và toast cần biến thể `motion-reduce:transition-none`, đúng chuẩn SCR006 |
| Screen reader compatibility | [PARTIAL] | Chưa chốt `aria-live` cho toast Copy Link và cho việc nối thêm trang feed — không nằm trong 41 TC MoMorph in-scope; ghi nhận làm gap giống gap `aria-live` của SCR006 |

Trạng thái `[PLANNED]` vì spec này được promote ở implement-start (code chưa tồn tại) — Delivery
xác nhận lại bằng Playwright visual capture ở phase 14.

## 9. Responsive Behavior

Không có ghi chú breakpoint cụ thể nào trong `clarifications.md` hay test-case cho màn này ngoài
bố cục hai cột feed/sidebar co lại theo chiều rộng. Tester xác nhận bằng Playwright visual
capture ở 3 viewport (1440/768/375) khi Delivery — không suy diễn thêm breakpoint cụ thể ở đây,
đúng cách SCR006_Profile đã ghi.

## 10. Navigation

### Entry Points

| From | Trigger there | Condition | Source |
|------|----------------|-----------|--------|
| SCR003_HomeScreen | Nav header "Sun* Kudos", khối Sun* Kudos ("Chi tiết"), widget hành động nhanh, footer | không — public | FR-101 |
| SCR004_Awards | Khối Sun* Kudos tái dùng + header/footer dùng chung | không — public | FR-101 |
| SCR005_Standards | Nút "Viết KUDOS" ở footer panel | không — public | FR-101 |
| external — bất kỳ URL nào | truy cập trực tiếp `/kudos`, `/kudos?hashtag=`, `/kudos?department=` | không — public, không redirect | FR-102, BR-015 |

### Exits

| Action | Element | Condition | Destination | Result | Source |
|--------|---------|-----------|-------------|--------|--------|
| Bấm avatar/tên người gửi, người nhận, hoặc mục leaderboard | E08, E17 | đã đăng nhập | `/profile?id={uuid}` | mở hồ sơ Sunner (F006) | FR-402 |
| Bấm avatar/tên | E08, E17 | chưa đăng nhập | `/login` | redirect từ `(protected)/layout.tsx` của `/profile` — gate CÓ SẴN, không phải code mới của F007 | FR-601, BR-013 |
| Bấm "Đăng nhập" / "Đăng xuất" ở header | E01 | tuỳ trạng thái | `/login` | dùng chung `SiteHeader` | — |
| Bấm "Xem chi tiết" | E11 | — | KHÔNG có đích | không điều hướng — frame `onDIohs2bS` chưa tồn tại | `clarifications.md` |

## 11. Verification Status

**Test policy:** `e2e-red-first` (chốt tại `clarifications.md`). Bằng chứng chưa tồn tại ở lượt
promote này — spec được đăng ký vào `docs/` tại **implement-start**, trước phase 01. Hợp đồng DOM
duy nhất cho 6 phase UI là `tests/e2e/kudos.spec.ts` (phase 01, `tester`, phải ĐỎ thật trước dòng
code UI đầu tiên); GREEN + visual capture do phase 14 sinh ra.

**Ba tầng tag e2e** (AD-7, `plan.md`): nhánh **CI-safe** (không tag) kiểm chrome, banner,
placeholder ô nhập, `maxLength` ô tìm và cả hai chuỗi empty state — chạy được vì DAL fail-open trả
`[]` khi Supabase không với tới được, đúng cách `/awards` đang chạy trong CI. `@local-db` cho mọi
assert dựa trên dữ liệu seed (migration `0008`, 8 Sunner). `@auth` cho thả tim, 5 chỉ số cá nhân
và điều hướng profile. `ci.yml` giữ nguyên `--grep-invert "@auth|@local-db"` — **dấu tick xanh
trên PR KHÔNG xác nhận toàn bộ suite**, cùng giới hạn mà SCR006_Profile đã ghi.

Chi tiết đầy đủ action ↔ FR/BR ↔ TC MoMorph: `docs/vi/features/F007_KudosLiveBoard/technical-spec.md`
§ 2-3 và `docs/vi/features/F008_KudosHeartReaction/technical-spec.md` § 3.
