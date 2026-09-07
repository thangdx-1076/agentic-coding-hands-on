---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
---

# Functional Spec — F005_StandardsRulesPage

**Priority**: P2
**Type**: ui
**Generated**: 2026-09-07

**See also:** [`technical-spec.md`](./technical-spec.md) — route, content contract, DOM/a11y
contract, pseudocode cho độc giả Dev/QA/SA.

**Traceability:** F005_StandardsRulesPage → SCR005_Standards → US001-US003 (draft, local — theo
đúng quy ước F003/F004, không đăng ký vào `docs/vi/generated/user-stories.md`) → — (không có
BL### mới) → — (route `/standards`, Server Component, không có ROUTE### riêng — cùng nhóm `/`,
`/awards`) → `momorph/test-cases.csv` TC_THELE_GUI_001…004, TC_THELE_FUN_001…005 (9 TC —
**GUI_003 và FUN_005 không thoả được**, xem § 3 Open Decisions và § 9 Edge Cases)

## 1. Overview

**Problem:** `site-footer.tsx:74` đã trỏ link "Tiêu chuẩn chung" tới `/standards`, nhưng route đó
chưa tồn tại (404) — đây là link chết còn lại duy nhất trên site sau khi F004 lấp `/awards`.
**Solution:** Một trang công khai `/standards` hiển thị đầy đủ nội dung "Thể lệ" SAA 2025: huy
hiệu Hero cho người nhận Kudos (4 hạng), Secret Box 6-icon cho người gửi Kudos, và Kudos Quốc
dân — cộng 2 nút hành động ("Đóng" quay lại, "Viết KUDOS" mở form gửi Kudos).
**Scope:** Hiển thị công khai nội dung Thể lệ (tĩnh, đọc từ i18n namespace `standards`); panel
cuộn được khi nội dung dài hơn khung; 2 nút hành động ở footer panel.
**Non-Scope:** Không xây `/kudos` (nút "Viết KUDOS" tiếp tục trỏ `href="/kudos"`, TC FUN_004 chỉ
assert điều hướng, không assert trang đích tồn tại); không implement trạng thái `disabled` cho 2
nút footer (TC GUI_003/FUN_005, xem § 3); không thêm bảng Supabase nào (nội dung tĩnh, YAGNI).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách truy cập (Anonymous) | Chưa đăng nhập | Đọc thể lệ chương trình, không cần đăng nhập |
| Thành viên/Quản trị viên (Authenticated) | Đã đăng nhập | Xem cùng nội dung công khai như Anonymous — trang không cá nhân hoá |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem thể lệ SAA 2025 & thao tác Đóng/Viết KUDOS | Đọc đủ 3 mục thể lệ + 4 hạng Hero + 6 icon Secret Box; cuộn khi nội dung dài; Đóng panel (quay lại) hoặc mở form Viết KUDOS | US001, US002, US003 | FR-001, FR-002, FR-003, FR-101, FR-102, FR-103, FR-104, FR-201, FR-202, FR-203, FR-204, FR-301, FR-302 | BR-001, BR-002, BR-003, BR-004, BR-005 | SCR005_Standards |

## 3. Open Decisions

Không có quyết định mở — toàn bộ đã chốt tại `clarifications.md` (route, nguồn nội dung, đích 2
nút, disabled scope, bản dịch EN). Liệt kê lại đây để dễ tra cứu, không phải quyết định mới.

| D### | Decision | Trạng thái | Rationale |
|------|----------|------------|-----------|
| D001 | TC_THELE_GUI_003 + TC_THELE_FUN_005 (disabled state của 2 nút footer) | **Không implement** — ghi "Nợ lại" | Không tồn tại điều kiện thật nào làm nút disabled trên trang tĩnh này; implement một state không đạt tới được vi phạm YAGNI |
| D002 | Bản dịch EN | Lấy nguyên văn từ MoMorph `list_file_localizations`; `is_reviewed: false` | Máy dịch, chưa người duyệt — ghi vào "Tôi cần làm" cho spec owner (§ 11 RISK-02) |
| D003 | Nút "Đóng" không có entry localization trong design | vi: "Đóng" (literal từ render); EN: "Close" (suy luận UI chuẩn) | Node tên "Awards Information Navigation Links" là label mặc định của component, không phải bản dịch thật của nội dung |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Route `/standards` phải PUBLIC — mọi khách truy cập, dù đã đăng nhập hay chưa, xem
  được toàn bộ nội dung, không guard/redirect nào theo trạng thái đăng nhập. Cùng nhóm với `/` và
  `/awards` (khác `/todo`).
- **FR-002** Nội dung Thể lệ đọc từ i18n namespace `standards` trong `messages/{vi,en}.json` —
  KHÔNG có bảng Supabase, không DAL, không migration nào cho feature này (khác F004_awards).
- **FR-003** Giữ nguyên chính tả/ký tự đặc biệt của design: tên icon **"ROOT FURTHER"** — layer
  MoMorph tên "ROOT FUTHER" (thiếu chữ R) nhưng `character` (nội dung text thật của node) là "ROOT
  FURTHER"; chọn `character`, không phải tên layer, làm nguồn — en-dash trong **"10–20"**, emoji
  **❤️** trong 2 đoạn văn (intro section 2, body section 3). *(Sửa 2026-09-07 sau khi đối chiếu
  code đã ship: `standards-copy.ts:83,89,117-118,163` và `messages/{vi,en}.json` đều dùng "ROOT
  FURTHER" — spec draft ban đầu ghi nhầm "ROOT FUTHER" theo tên layer.)*

### Nội dung panel (1xx)

- **FR-101** Panel hiển thị đủ mọi phần đã khai trong spec A (`3204:6053`): tiêu đề "Thể lệ", 3
  section nội dung, footer 2 nút. *(TC GUI_001)*
- **FR-102** Section 1 ("NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC") hiển thị
  heading + đoạn intro + đúng 4 tier theo thứ tự New Hero → Rising Hero → Super Hero → Legend
  Hero, mỗi tier gồm 1 ảnh badge + 1 dòng điều kiện + 1 đoạn mô tả.
- **FR-103** Section 2 ("NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN") hiển
  thị heading + đoạn intro + lưới 6 badge (3 cột: hàng 1 REVIVAL/TOUCH OF LIGHT/STAY GOLD, hàng 2
  FLOW TO HORIZON/BEYOND THE BOUNDARY/ROOT FURTHER) + đoạn closing. Mỗi caption là text node thật
  (không nướng vào ảnh — clarifications.md § Caption badge).
- **FR-104** Section 3 ("KUDOS QUỐC DÂN") hiển thị heading + 1 đoạn body.

### Footer & hành động (2xx)

- **FR-201** Footer hiển thị đúng 2 nút theo spec B (`3204:6092`): "Đóng" kiểu secondary/outlined
  + icon "X", "Viết KUDOS" kiểu primary màu vàng + icon bút. *(TC GUI_002)*
- **FR-202** Hover đổi màu/độ nổi (elevation) cho cả 2 nút. *(TC GUI_004)*
- **FR-203** Click "Đóng" → `router.back()`; khi không có lịch sử điều hướng để quay lại
  (direct-load hoặc mở tab mới) → fallback điều hướng `ROUTES.HOME`. *(TC FUN_003)*
- **FR-204** Click "Viết KUDOS" → điều hướng `href="/kudos"` — route đích chưa tồn tại, chấp
  nhận 404 cho tới khi trang đó được xây (cùng pattern `KudosSection` F003/F004). *(TC FUN_004)*

### Scroll (3xx)

- **FR-301** Panel cuộn được khi nội dung dài hơn chiều cao khung; cuộn xuống hết rồi cuộn lên
  lại đều hoạt động bình thường. *(TC FUN_001)*
- **FR-302** Panel KHÔNG phát sinh thanh cuộn/không cho cuộn khi nội dung vừa khít khung.
  *(TC FUN_002)*

## 5. Business Rules

- Route `/standards` không qua bất kỳ guard đăng nhập nào; PUBLIC cho mọi actor (BR-001)
- Nội dung Thể lệ 100% tĩnh — không đọc bảng nào, không cá nhân hoá theo actor/role; chỉ locale
  (vi/en, next-intl) quyết định bản dịch hiển thị (BR-002)
- "Đóng" luôn ưu tiên `router.back()`; chỉ fallback `ROUTES.HOME` khi thực sự không có lịch sử
  điều hướng để quay lại — không bao giờ điều hướng tới route không liên quan (BR-003)
- "Viết KUDOS" luôn trỏ `/kudos` bất kể route đó đã tồn tại hay chưa — không ẩn/disable link chỉ
  vì đích chưa được xây (BR-004, cùng nguyên tắc BR-006 của F004)
- Không có điều kiện runtime nào làm 2 nút footer disabled trên trang này — TC GUI_003/FUN_005
  không được implement, để nguyên có chủ đích (BR-005)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Thể lệ SAA 2025 | SCR005_Standards | Panel "Thể lệ" phải màn hình trên nền tối `#00101A`: tiêu đề, 3 section nội dung (Hero badge, Secret Box 6-icon, Kudos Quốc dân), footer 2 nút | Cuộn panel khi nội dung dài; Đóng (quay lại); mở form Viết KUDOS (`/kudos`, hiện 404) |

### User Journey

1. Khách vào `/standards` (trực tiếp, hoặc từ link "Tiêu chuẩn chung" ở footer bất kỳ trang
   nào), thấy panel "Thể lệ" hiện đầy đủ, không cần đăng nhập.
2. Khách cuộn panel để đọc hết 3 section (nếu nội dung dài hơn khung).
3. Khách click "Đóng" — quay lại trang trước đó (hoặc `/` nếu không có lịch sử) — hoặc click
   "Viết KUDOS" — điều hướng `/kudos` (hiện 404 cho tới khi trang đó được xây ở phiên khác).

## 7. User Stories

*(draft, local — theo đúng quy ước đã dùng ở F003/F004: không đăng ký vào
`docs/vi/generated/user-stories.md`, số hiệu chỉ có ý nghĩa trong phạm vi feature này)*

### US001_ViewStandardsRules — View Standards Rules

**Actor:** Khách truy cập (Anonymous)
**Goal:** Đọc đầy đủ thể lệ SAA 2025 (điều kiện nhận huy hiệu Hero, cách sưu tập 6 icon, Kudos
Quốc dân) mà không cần đăng nhập.
**Business value:** Thay thế link chết "Tiêu chuẩn chung" hiện có trên footer, minh bạch luật
chơi cho toàn bộ Sunner.

**Acceptance Criteria:**
- [ ] Vào `/standards` không đăng nhập vẫn thấy đủ tiêu đề, 3 section, footer 2 nút.
- [ ] Section 1 hiển thị đúng 4 tier theo thứ tự New → Rising → Super → Legend.
- [ ] Section 2 hiển thị đúng lưới 6 badge, giữ nguyên chính tả "ROOT FURTHER".

### US002_CloseStandardsPanel — Close Standards Panel

**Actor:** Bất kỳ khách truy cập nào
**Goal:** Đóng panel Thể lệ, quay lại đúng nội dung đang xem trước đó.
**Business value:** Điều hướng nhất quán — panel không phải một ngõ cụt.

**Acceptance Criteria:**
- [ ] Click "Đóng" khi có lịch sử điều hướng → quay lại trang trước.
- [ ] Click "Đóng" khi vào `/standards` trực tiếp (không có lịch sử) → điều hướng `/`.

### US003_NavigateToWriteKudos — Navigate To Write Kudos

**Actor:** Bất kỳ khách truy cập nào
**Goal:** Từ trang thể lệ, mở ngay form viết Kudos để áp dụng luật chơi vừa đọc.
**Business value:** Giảm ma sát chuyển đổi đọc luật → hành động, nhất quán với 4 link `/kudos`
khác đã có trên site.

**Acceptance Criteria:**
- [ ] Click "Viết KUDOS" điều hướng `/kudos`.

## 8. Scenarios

### US001_ViewStandardsRules — Happy Path

**Given** khách chưa đăng nhập, **When** vào `/standards`, **Then** panel hiển thị đầy đủ tiêu
đề + 3 section + footer 2 nút, đúng nội dung, đúng thứ tự.

### US001_ViewStandardsRules — Scroll dài

**Given** nội dung Thể lệ dài hơn chiều cao khung, **When** khách cuộn xuống rồi cuộn lên,
**Then** panel cuộn mượt, tới được cuối nội dung và quay lại đầu.

### US002_CloseStandardsPanel — Có lịch sử điều hướng

**Given** khách vào `/standards` từ 1 trang khác trong site, **When** click "Đóng", **Then**
`router.back()` đưa khách về đúng trang trước đó.

### US002_CloseStandardsPanel — Không có lịch sử (direct-load)

**Given** khách mở `/standards` trực tiếp bằng URL hoặc tab mới, **When** click "Đóng", **Then**
điều hướng `ROUTES.HOME` (`/`) thay vì kẹt tại trang hoặc lỗi.

### US003_NavigateToWriteKudos — Happy Path

**Given** đang ở `/standards`, **When** click "Viết KUDOS", **Then** trình duyệt điều hướng tới
`/kudos` (hiện 404 cho tới khi route đó được xây).

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Click "Đóng" không có lịch sử điều hướng | Fallback điều hướng `ROUTES.HOME` | — (điều hướng im lặng, không thông báo) |
| Click "Viết KUDOS" | Điều hướng `/kudos` — route chưa tồn tại | "Not found" (trang lỗi mặc định Next.js) |
| Nội dung Thể lệ vừa khít khung (không tràn) | Panel không phát sinh scrollbar | — |
| 2 nút footer ở trạng thái `disabled` | **Không xảy ra trên trang này** — không điều kiện nào kích hoạt state đó (TC GUI_003/FUN_005 out-of-scope, xem § 3 D001) | N/A |

## 10. Edge Behaviours to Verify

- **FR-203** → Tester xác nhận cả 2 nhánh: có lịch sử (`router.back()` đúng trang trước) và
  không có lịch sử (fallback `/`).
- **FR-301/FR-302** → Tester xác nhận panel cuộn đúng khi nội dung dài, và không cuộn giả khi
  nội dung vừa khung (thu nhỏ viewport để ép tràn nếu cần).
- **FR-002** → Tester xác nhận không có network call nào tới Supabase từ trang này (khác
  `/awards`).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | `/kudos` chưa được implement | Nút "Viết KUDOS" 404 cho tới khi trang đó được xây; TC FUN_004 chỉ assert điều hướng, không assert trang đích | confirmed (cùng RISK-01 của F004) |
| RISK-02 | risk | Bản dịch EN từ MoMorph `is_reviewed: false` (máy dịch, chưa người duyệt) | Nội dung EN có thể sai/lệch văn phong cho tới khi có người review | pending sign-off |
| DEBT-01 | debt | TC_THELE_GUI_003 + TC_THELE_FUN_005 (disabled state) không implement | Nếu sau này có điều kiện thật làm nút disabled (vd yêu cầu đăng nhập để Viết KUDOS), 2 TC này cần mở lại | accepted (YAGNI) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| `src/constants/routes.ts` (`ROUTES.HOME`) | shared module | Đích fallback của nút "Đóng" khi không có lịch sử | technical-spec.md § 4 |
| `site-footer.tsx:74` | consumer | Link "Tiêu chuẩn chung" hiện có đã trỏ `/standards` — feature này lấp route, không sửa footer | `src/app/(public)/_components/site-footer.tsx` |
| `/kudos` (chưa implement) | feature | Đích của nút "Viết KUDOS" | RISK-01 |
| `public/home/Pen.svg` | asset | Icon bút của nút "Viết KUDOS" — tái dùng, không thêm bản trùng | clarifications.md § Assets |

## 13. Configuration

Không có biến môi trường mới cho feature này.

## 14. Test Results (Delivery)

**Chính sách**: `e2e-red-first` — RED trước code, GREEN + visual validation sau. Bằng chứng đầy
đủ: `plans/260907-0935-standards-rules-page/reports/tester-260907-red-standards-contract.md`,
`tester-260907-green-standards-temper.md`, `evidence/green-e2e-standards.txt`.

| Giai đoạn | Command | Exit Code | Kết quả |
|---|---|---|---|
| RED | `pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list` | 1 | 13/14 fail hợp lệ (404 — route chưa tồn tại), không phải lỗi hạ tầng |
| GREEN | `pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list` | 0 | 14/14 PASS (C1-C14) |

**Quality gates** (`format:check`, `lint --max-warnings 0`, `test:unit:coverage`): tất cả PASS,
coverage 100% cho `use-standards-close.ts` (3 case: `canGoBack: true`/`false`/API vắng mặt). Visual
validation 3 breakpoint (1440/768/375) xác nhận không mismatch. Chi tiết đầy đủ trong 2 report
trên.
