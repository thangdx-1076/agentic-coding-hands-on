---
status: implemented
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Functional Spec — F004_AwardSystemPage

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-07

**See also:** [`technical-spec.md`](./technical-spec.md) — route, schema, DAL contract, DOM/a11y
contract, pseudocode cho độc giả Dev/QA/SA.

**Traceability:** F004_AwardSystemPage → SCR004_Awards → US001-US003 (draft, local)
→ — (không có BL### mới) → — (route `/awards`, Server Component, chưa có ROUTE### riêng) →
`momorph/test-cases.csv` (frame `zFYDgyj_pD`) ID-0…ID-14 (15 TC — **ID-1 superseded**, **ID-12/
ID-14 không thoả được**, xem § 4 Requirements và `docs/vi/system/permissions.md`)

## 1. Overview

**Problem:** Trước khi F004 landing, SAA 2025 chỉ quảng bá 6 hạng mục giải thưởng bằng thẻ tóm tắt
trên trang chủ (`/`, F003); không có trang riêng nào trình bày đầy đủ mô tả, số lượng và giá trị
từng giải, và 6 link `/awards#<slug>` trên trang chủ + footer khi đó trỏ tới một route chưa tồn
tại (404).
**Solution:** Một trang công khai `/awards` trình bày đầy đủ 6 hạng mục giải (Top Talent, Top
Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP) với nav danh mục bên
trái (click-scroll + scroll-spy), và một khối quảng bá Sun* Kudos ở cuối trang.
**Scope:** Hiển thị công khai 6 hạng mục giải đọc từ Supabase (tiêu đề, mô tả, số lượng, giá trị
giải); nav trái điều hướng nội-trang; khối Kudos; responsive (sidebar ↔ thanh chip); empty-state
khi nguồn dữ liệu lỗi.
**Non-Scope:** Không xây `/kudos` (nút "Chi tiết" của khối Kudos tiếp tục trỏ `href="/kudos"`
như F003, TC ID-12/ID-14 ghi nợ); không thêm bản dịch tiếng Anh cho nội dung 6 giải (nguồn
MoMorph chỉ có tiếng Việt — xem § 11, ghi nợ); không sửa `AwardCard`/lưới giải trên trang chủ.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách truy cập (Anonymous) | Chưa đăng nhập | Xem đầy đủ thông tin 6 hạng mục giải, không cần đăng nhập |
| Thành viên/Quản trị viên (Authenticated) | Đã đăng nhập | Xem cùng nội dung công khai như Anonymous — trang không cá nhân hoá theo vai trò |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem & điều hướng Hệ thống giải thưởng SAA 2025 | Xem 6 hạng mục giải (tiêu đề, mô tả, số lượng, giá trị) và khối Sun* Kudos; dùng nav trái để nhảy tới đúng mục, active state bám theo cả click lẫn cuộn trang | US001, US002, US003 | FR-001, FR-002, FR-003, FR-101, FR-102, FR-103, FR-104, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006 | SCR004_Awards |

## 3. Open Decisions

Không có quyết định mở — toàn bộ đã chốt tại `clarifications.md` (route, RLS, empty-state,
nav, layout, asset, icon, Kudos href, model giá trị giải).

| D### | Decision | Trạng thái | Rationale |
|------|----------|------------|-----------|
| D002 | Bản dịch EN cho mô tả/tiêu đề 6 giải | Chỉ seed `locale='vi'`; `locale='en'` để trống cho tới khi có bản dịch | MoMorph chỉ có tiếng Việt (§ 11 Risks) |

**Sửa lại D001 (đã đóng, không còn là quyết định mở):** lượt spec đầu kết luận 4/6 mô tả giải
(Top Project, Top Project Leader, Best Manager, MVP) "không có nội dung riêng trong MoMorph" và
seed placeholder lặp lại mô tả Top Talent. **Kết luận đó sai và đã được đính chính trước khi lên
code.** Bốn node tương ứng là **component instance** trong Figma; đọc chúng bằng
`query_by_type(TEXT)` trả về text mặc định của component, không phải override thật của instance —
ba nguồn độc lập (ảnh render từng thẻ, ảnh render toàn màn hình, `download_specs` CSV) đều xác
nhận mỗi thẻ có tiêu đề + mô tả + số lượng + giá trị riêng, khác nhau rõ ràng. Migration đã seed
đúng 6 mô tả thật, phân biệt (§ 4.4 `technical-spec.md`) — không còn nội dung debt nào ở đây.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Route `/awards` phải PUBLIC — mọi khách truy cập, dù đã đăng nhập hay chưa, xem
  được toàn bộ nội dung, không redirect nào theo trạng thái đăng nhập. *(TC ID-0; supersedes
  TC ID-1 — xem `permissions.md` delta)*
- **FR-002** Nội dung 6 hạng mục giải (tiêu đề, mô tả, số lượng, giá trị) đọc từ bảng
  `public.awards` phía server qua DAL, không nhân bản sang `messages/*.json`; chrome tĩnh
  (heading, nhãn nav, nhãn cột, footer) tiếp tục nằm ở `messages/*.json` như F003.
  *(TC ID-4, ID-6)*
- **FR-003** Supabase lỗi hoặc không có dòng nào cho locale hiện tại → DAL trả mảng rỗng
  (fail-open, không throw); trang vẫn render header/nav-shell/footer, vùng nội dung hiện
  empty-state rõ ràng thay vì 6 section giả hoặc lỗi 500.

### Navigation (1xx)

- **FR-101** Nav danh mục bên trái liệt kê ĐÚNG 6 mục theo thứ tự dữ liệu trả về (top-talent,
  top-project, top-project-leader, best-manager, signature-2025-creator, mvp), mỗi mục là một
  `<a>` với `href="#<slug>"` và text đúng tiêu đề giải. *(TC ID-5)*
- **FR-102** Click một mục nav cuộn mượt (smooth scroll) tới đúng `<section>` tương ứng và đặt
  mục đó `aria-current="true"`; tôn trọng `prefers-reduced-motion` — khi bật, cuộn tức thời
  (jump) thay vì mượt. *(TC ID-9)*
- **FR-103** Scroll-spy (IntersectionObserver) tự cập nhật mục active theo vị trí cuộn thực tế,
  độc lập với việc người dùng có click nav hay tự cuộn tay; tại một thời điểm chỉ đúng 1 mục
  mang `aria-current="true"`. *(TC ID-11)*
- **FR-104** Dưới `lg` (mobile/tablet), nav trái biến thành thanh chip cuộn ngang dính dưới
  header; từ `lg` trở lên là sidebar sticky bên trái. *(suy diễn responsive — design chỉ vẽ
  desktop, xem clarifications.md)*

### Trang Hệ thống giải thưởng (2xx)

- **FR-201** Trang hiển thị `<h1>` "Hệ thống giải thưởng SAA 2025" với caption phụ "Sun* Annual
  Awards 2025" phía trên (viết hoa — design node `313:8454`, `character`: "Sun* Annual Awards
  2025"). *(TC ID-4)* *(Sửa 2026-09-07: trước đó ghi chữ thường "Sun* annual awards 2025" theo
  suy luận thống nhất với caption trang chủ — sai; trang chủ (node `2167:9070`) và `/awards`
  (node `313:8454`) có 2 design node khác nhau thật, mỗi trang theo đúng node của mình, không
  thống nhất.)*
- **FR-202** Thứ tự DOM tổng thể: header → h1+caption → nav → 6 section giải → khối Sun* Kudos
  → footer. *(TC ID-3)*
- **FR-203** 6 section giải xen kẽ layout ảnh trái/nội dung phải (mục 1,3,5) và nội dung
  trái/ảnh phải (mục 2,4,6); dưới `lg` xếp dọc, ảnh luôn ở trên. *(clarifications.md § Layout)*
- **FR-204** Mỗi section giải hiển thị `<h2>` tiêu đề, đúng 1 ảnh 336×336 (asset tái dùng, xem
  technical-spec.md § Assets), 1 dòng số lượng giải, và ít nhất 1 dòng giá trị giải; Signature
  2025 hiển thị 2 dòng giá trị (cá nhân + tập thể). *(TC ID-6, ID-7)*
- **FR-205** Khối Sun* Kudos hiển thị `<h2>Sun* Kudos</h2>`, nhãn "Phong trào ghi nhận", mô tả,
  và link "Chi tiết" `href="/kudos"` — tái dùng nguyên `KudosSection` đã có ở F003 (cùng
  component instance Figma). *(TC ID-8; TC ID-12/ID-14 đánh dấu "chưa thoả" theo giả
  định `/kudos` chưa tồn tại — route nay đã live (F007_KudosLiveBoard), cần rerun; xem § 11 Risks)*
- **FR-206** Trang không phát sinh lỗi JavaScript nào khi tải và khi tương tác nav.
  *(TC ID-13)*

## 5. Business Rules

- Route `/awards` không qua bất kỳ guard đăng nhập nào; PUBLIC cho mọi actor (BR-001)
- Supabase lỗi/rỗng → DAL fail-open trả `[]`; trang hiện empty-state trong khung, không 500,
  không render 6 section giả với nội dung trống (BR-002)
- Tại một thời điểm, đúng 1 mục nav mang `aria-current="true"` — click và scroll-spy đều ghi
  đè cùng một state, không có 2 nguồn tranh chấp (BR-003)
- `prefers-reduced-motion: reduce` tắt smooth scroll, thay bằng cuộn tức thời (BR-004)
- Giá trị giải là danh sách `{amount, note}[]` — 5 hạng mục có 1 phần tử, Signature 2025 có 2
  (cá nhân 5.000.000 VNĐ + tập thể 8.000.000 VNĐ) (BR-005)
- Nút "Chi tiết" của khối Kudos luôn trỏ `/kudos` bất kể route đó đã tồn tại hay chưa — không
  ẩn/disable link chỉ vì đích chưa được xây (BR-006)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Hệ thống giải thưởng SAA 2025 | SCR004_Awards | Header, h1+caption, nav trái 6 mục, 6 section giải (ảnh+mô tả+số lượng+giá trị), khối Sun* Kudos, footer | Điều hướng nội-trang qua nav trái (click hoặc cuộn tay); mở link Kudos (dẫn tới `/kudos`) |

### User Journey

1. Khách vào `/awards` (trực tiếp, từ CTA "ABOUT AWARDS" ở `/`, hoặc từ thẻ giải trên `/`),
   thấy ngay h1 + nav trái + section đầu tiên, không cần đăng nhập.
2. Khách click 1 mục nav hoặc tự cuộn — trang cuộn tới đúng section, nav cập nhật active theo.
3. Khách cuộn tới cuối trang, thấy khối Sun* Kudos, click "Chi tiết" (dẫn `/kudos`).

## 7. User Stories

### US001_BrowseAwardSystemPage — Browse Award System Page

**Actor:** Khách truy cập (Anonymous)
**Goal:** Xem đầy đủ mô tả, số lượng và giá trị của 6 hạng mục giải SAA 2025 mà không cần đăng
nhập.
**Business value:** Cung cấp thông tin giải thưởng đầy đủ, thay thế 404 hiện tại của 6 link đã
có trên trang chủ và footer.

**Acceptance Criteria:**
- [x] Vào `/awards` không đăng nhập vẫn thấy đủ h1, nav, 6 section, khối Kudos, footer.
- [x] Cả 6 section hiển thị đúng tiêu đề, số lượng, giá trị giải theo bảng nội dung.
- [x] Mỗi section có đúng 1 ảnh.

### US002_NavigateAwardCategories — Navigate Award Categories

**Actor:** Bất kỳ khách truy cập nào (Anonymous hoặc Authenticated)
**Goal:** Dùng nav trái để nhảy nhanh tới đúng hạng mục giải quan tâm, biết mình đang ở mục nào.
**Business value:** Điều hướng nhanh trên trang dài 6 hạng mục mà không cần cuộn tay tìm kiếm.

**Acceptance Criteria:**
- [x] Nav liệt kê đúng 6 mục, đúng thứ tự, đúng href.
- [x] Click 1 mục cuộn mượt tới đúng section và active đúng mục đó.
- [x] Tự cuộn tay cũng cập nhật active đúng theo vị trí cuộn (scroll-spy).
- [x] Tại một thời điểm chỉ đúng 1 mục active.

### US003_HandleAwardsDataOutage — Handle Awards Data Outage

**Actor:** Bất kỳ khách truy cập nào
**Goal:** Vẫn xem được khung trang (header/nav-shell/footer) ngay cả khi nguồn dữ liệu giải
thưởng gặp sự cố, thay vì gặp trang lỗi.
**Business value:** Một sự cố Supabase không kéo sập toàn bộ trang công khai — cùng triết lý
fail-open đã áp dụng ở `/` (F003).

**Acceptance Criteria:**
- [x] Supabase lỗi/không có dữ liệu → trang không trả lỗi 500.
- [x] Vùng nội dung hiện empty-state rõ ràng; header/footer vẫn nguyên.

## 8. Scenarios

### US001_BrowseAwardSystemPage — Happy Path

**Given** bảng `public.awards` có đủ 6 dòng cho locale hiện tại, **When** khách vào `/awards`,
**Then** trang hiển thị đầy đủ h1/nav/6 section/khối Kudos/footer đúng nội dung và thứ tự.

### US002_NavigateAwardCategories — Happy Path

**Given** đang ở `/awards`, **When** click mục nav "Best Manager", **Then** trang cuộn mượt tới
`#best-manager` và mục đó (chỉ mục đó) mang `aria-current="true"`.

### US002_NavigateAwardCategories — Reduced motion

**Given** `prefers-reduced-motion: reduce` được bật, **When** click 1 mục nav, **Then** trang
nhảy tức thời (không animation) tới đúng section, active state vẫn cập nhật đúng.

### US003_HandleAwardsDataOutage — Error: Supabase gián đoạn

**Given** Supabase không phản hồi hoặc trả lỗi, **When** khách vào `/awards`, **Then** header/
nav-shell/footer vẫn hiện, vùng nội dung hiện empty-state, không có lỗi 500/trang trắng.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Supabase lỗi hoặc bảng `awards` rỗng cho locale hiện tại | DAL fail-open trả `[]`; trang render `AwardsEmptyState` trong khung, không 6 section giả | "Hiện chưa có thông tin giải thưởng." (`messages/*.json` `awards.empty`) |
| `prefers-reduced-motion: reduce` | Cuộn tức thời thay vì mượt khi click nav | "None — silent handling" |
| Click "Chi tiết" ở khối Kudos | Điều hướng `/kudos` — route đã tồn tại (F007_KudosLiveBoard) | Mở `/kudos` bình thường; TC ID-12/ID-14 cần QA xác nhận lại trên route thật thay vì giả định 404 |

## 10. Edge Behaviours to Verify

- **FR-001** → Tester xác nhận `/awards` trả nội dung thành công cho cả 2 trạng thái đăng
  nhập, không redirect nào (thay thế hoàn toàn kỳ vọng cũ của TC ID-1).
- **FR-103** → Tester xác nhận scroll-spy và click cùng ghi vào một state, không có lúc nào
  2 mục active cùng lúc.
- **FR-003** → Tester xác nhận trang không crash/500 khi giả lập Supabase lỗi.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | `/kudos` (F007_KudosLiveBoard) đã implement từ phiên khác — nút "Chi tiết" của khối Kudos không còn 404 | TC ID-12/ID-14 được đánh dấu "chưa thoả" dựa trên giả định route chưa tồn tại; cần QA chạy lại trên `/kudos` thật để xác nhận | resolved (route), TC cần rerun |
| RISK-02 | risk | Bảng `public.awards` chỉ seed `locale='vi'` — chưa có bản `en` | Khách chọn ngôn ngữ EN vẫn thấy nội dung 6 giải bằng tiếng Việt (chrome tĩnh vẫn dịch đúng qua next-intl) | confirmed |
| RISK-03 | risk | MoMorph TC ID-1 (kỳ vọng redirect `/login` khi chưa đăng nhập) bị supersede bởi quyết định kiến trúc "SAA event/award marketing content is public" (`permissions.md`, 2026-09-06) | Cần spec owner xác nhận lại chính thức TC ID-1 đã supersede, chưa chỉ là quyết định kỹ thuật đơn phương | pending sign-off |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F003_Homepage | feature | Tái dùng `KudosSection`, `SiteHeader`/`SiteFooter`, asset ring `Award_BG.png` + PNG tên giải, và pattern DAL/fail-open | `docs/vi/features/F003_Homepage/technical-spec.md` |
| Supabase `saa-app`, bảng mới `public.awards` | external-service | Nguồn sự thật nội dung 6 giải, đọc server-side | technical-spec.md § 4.3 |
| `/kudos` (F007_KudosLiveBoard, đã implement) | feature | Đích của nút "Chi tiết" khối Kudos | RISK-01 |

## 13. Configuration

Không có biến môi trường mới cho feature này.

## 14. Test Results (Delivery)

Gate cuối: `tsc` 0 lỗi, `lint` 0 lỗi, `format:check` sạch, 151 unit test ở 100% coverage, `build`
xanh, Playwright 66 passed / 3 skipped / 0 failed.

**CI KHÔNG verify nội dung 6 giải**: test nội dung mang tag `@local-db` và bị loại khỏi CI vì CI
không kết nối được instance Supabase local. CI chỉ xác nhận `/awards` render và xuống cấp đúng
về empty-state (không xác nhận nội dung thật của 6 mô tả/giá trị).
