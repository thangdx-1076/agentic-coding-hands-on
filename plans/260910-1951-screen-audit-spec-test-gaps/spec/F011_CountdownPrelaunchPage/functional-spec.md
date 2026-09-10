---
status: draft
authored_by: takumi
created: 2026-09-10
lang: vi
---
<!-- REVISION draft — so với `docs/vi/features/F011_CountdownPrelaunchPage/` hiện có:
     (1) AND-lock rule (PRELAUNCH_LOCK_ENABLED + chưa tới giờ) ĐÃ đúng — chỉ elevate citation,
         KHÔNG phải bug mới;
     (2) EVENT_START_AT là env var, MoMorph databaseNote nói API — ghi rõ đây là quyết định đã
         chốt, không phải gap;
     (3) FR-204 (format ngày) SỬA lại để hết mâu thuẫn nội bộ với đính chính đã có ở § 5 cũ;
     (4) Two-box LED layout — MỚI, xác nhận qua get_frame_image thật: cần 2 hộp/đơn vị, hiện
         code gộp 1 hộp — VÀ code trích dẫn SAI nguồn cho quyết định gộp đó;
     (5) Font "Digital Numbers" — MỚI, dùng chung quyết định D003 ở F003_Homepage (không tự chốt
         ở đây, tránh trùng lặp DRY). -->

# Functional Spec — F011_CountdownPrelaunchPage

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-10

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, và DB writes cho Dev/QA/SA.

**Traceability:** F011 (provisional) → SCR009_CountdownPrelaunch (provisional) → US001, US002 →
N/A (không có background job) → TBD (draft) → TBD (draft)

## 1. Overview

**Problem:** Trước giờ sự kiện Sun* Annual Awards 2025, chưa có màn nào cho khách ghé thăm biết
còn bao lâu nữa sự kiện bắt đầu, và không có cách nào khoá việc xem trước nội dung các trang khác
nếu ban tổ chức muốn giữ bí mật cho tới giờ G.
**Solution:** Một màn `/prelaunch` công khai hiển thị đếm ngược DAYS/HOURS/MINUTES trên nền toàn
màn hình, mỗi đơn vị 2 hộp LED riêng biệt; tuỳ chọn khoá điều hướng toàn site về màn này cho tới
khi đếm ngược về 0, bật/tắt bằng một cờ cấu hình.
**Scope:** Hiển thị đếm ngược tĩnh, không tương tác; khoá điều hướng ở tầng request (không phải
client-side), điều kiện khoá là AND của 2 cờ (cờ bật + chưa tới giờ); cờ khoá mặc định TẮT.
**Non-Scope:** Không có phân quyền theo vai trò cho màn này — công khai cho mọi actor; không có
API mới cho ngày sự kiện (tái dùng `EVENT_START_AT` env var đã có, KHÔNG dựng API dù MoMorph row 1
gợi ý API).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Người dùng bất kỳ | Nhân sự Sun*, đã đăng nhập hay chưa, ghé app trước sự kiện | Biết còn bao lâu tới sự kiện |
| Ban tổ chức (vận hành) | Đội vận hành bật cờ khoá trước giờ sự kiện | Không cho ai xem trước nội dung trang khác tới giờ G |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Hiển thị màn Countdown Prelaunch | Xem nền sự kiện + đếm ngược DAYS/HOURS/MINUTES (2 hộp LED/đơn vị, font 7-segment), tự cập nhật mỗi giây | US001 | FR-001, FR-002, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-401, FR-601 | BR-004 | SCR009_CountdownPrelaunch |
| CAP-02 | Khoá điều hướng toàn site trước giờ sự kiện | (Ban tổ chức) Bật cờ để mọi route (trừ ngoại lệ) tự động đưa khách về `/prelaunch` cho tới giờ G | US002 | FR-102, FR-103 | BR-001, BR-002, BR-003, BR-005, DEC-001 | N/A — không có UI riêng, xem `technical-spec.md` § 3.2 |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | *(REVISION — RESOLVED, ghi lại để không ai suy diễn lại)* Nguồn target datetime cho đếm ngược — MoMorph row `1` (`databaseNote`) ghi "TODO: thiết kế API endpoint để lấy target datetime", nhưng feature dùng ĐÚNG env var `EVENT_START_AT` có sẵn (tái dùng từ trang chủ), KHÔNG dựng API mới. | Env var `EVENT_START_AT` — đã implement, xem `src/app/(public)/prelaunch/page.tsx:57-68`, `src/proxy.ts:49-56` | MoMorph databaseNote là gợi ý tự sinh, không phải yêu cầu chốt — code + FR-001 (đã có từ trước) là nguồn thật | no |
| D002 | Font "Digital Numbers" (7-segment LED) cho digit đếm ngược — **dùng CHUNG quyết định với F003_Homepage `D003`** (`docs/../F003_Homepage` hoặc plan dir tương ứng § 3) — KHÔNG tự chốt riêng ở đây vì `CountdownTiles` là 1 component dùng chung cho cả `/` và `/prelaunch` (DRY, 1 quyết định 1 chỗ). | Theo quyết định của F003 D003 khi được chốt | 2 route dùng chung đúng 1 component, không tách quyết định | yes (chờ D003) |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Ngày giờ mục tiêu của sự kiện đọc từ `EVENT_START_AT` (tái dùng nguyên trạng biến đã
  có ở trang chủ), không dựng API/biến mới — xem D001 (MoMorph row 1's `databaseNote` không thắng).
- **FR-002** `EVENT_START_AT` thiếu hoặc sai định dạng không làm màn lỗi — đếm ngược tự hạ về
  `00/00/00`.

### Navigation (1xx)

- **FR-101** Màn `/prelaunch` công khai, không cần đăng nhập, không phụ thuộc kết quả đếm ngược.
- **FR-102** Khi cờ khoá bật VÀ đếm ngược chưa về 0 (2 điều kiện AND — đã chốt tại
  `plans/260908-1653-countdown-prelaunch-page/clarifications.md:34`), mọi route trừ danh sách miễn
  khoá tự động đưa khách về `/prelaunch`.
- **FR-103** Khi đếm ngược đã về 0, khoá tự gỡ; vào lại `/prelaunch` lúc này (nếu cờ vẫn bật) được
  đưa về `/`.

### Countdown Prelaunch Screen (2xx)

- **FR-201** Nền toàn màn hình là 1 ảnh full-bleed cộng 1 lớp phủ tối, tĩnh, không tương tác.
- **FR-202** Tiêu đề hiển thị theo ngôn ngữ: VI "Sự kiện sẽ bắt đầu sau", EN "Event starts in".
- **FR-203** 3 ô đếm ngược DAYS/HOURS/MINUTES, nhãn viết hoa màu trắng.
- **FR-204** *(REVISION — sửa, hết mâu thuẫn nội bộ)* Số hiển thị luôn pad tối thiểu 2 chữ số;
  hours đúng khoảng 00–23, minutes đúng khoảng 00–59; **days KHÔNG giới hạn 2 chữ số — `pad2()`
  chỉ pad LÊN, không cắt, nên ≥100 hiển thị đủ 3 chữ số (vd. `120`)** — đã chốt tại
  `plans/260906-0042-homepage-saa-page/clarifications.md:39`. Chỉ giá trị ÂM mới clamp về `00`.
- **FR-205** Đếm ngược tick mỗi giây, không cần tải lại trang.
- **FR-206** Khi tới giờ sự kiện, cả 3 ô đọc `00` đồng thời.
- **FR-207** *(REVISION — mới, xác nhận qua ảnh design thật `8PJQswPZmU`)* Mỗi đơn vị đếm ngược
  (DAYS/HOURS/MINUTES) hiển thị 2 hộp LED riêng biệt, mỗi hộp 1 chữ số, có khoảng cách nhìn thấy
  giữa 2 hộp — KHÔNG gộp thành 1 chuỗi 2 ký tự trong 1 hộp.
- **FR-208** *(REVISION — mới, dùng chung F003)* Chữ số dùng font 7-segment "Digital Numbers"
  (hoặc thay thế đã duyệt theo D002/F003-D003) — không rơi về `monospace` mặc định.
- **FR-401** Đếm ngược tiếp tục chạy phía client sau khi trang tải xong, không phụ thuộc thêm
  request nào tới máy chủ.

### Security (6xx)

- **FR-601** Màn này không có bất kỳ gate quyền nào — công khai cho mọi actor. 4 test case
  ACCESSING của MoMorph (`68d82c58`, `e6a59553`, `1c266552`, `17aa9e0d`) là boilerplate tự sinh
  (`Expected_Result` = "---"/"as per application configuration") — chủ đích KHÔNG hiện thực, xem
  § 11.

## 5. Business Rules

- Số hiển thị mỗi ô clamp về `00` khi âm; days ≥ 100 hiển thị đủ 3 chữ số, KHÔNG clamp (đã gộp
  vào FR-204 ở trên, xem BR-004 ở technical-spec.md § 3.1 A1). (BR-004)
- Khoá điều hướng CHỈ kích hoạt khi cờ `PRELAUNCH_LOCK_ENABLED` bật VÀ đếm ngược chưa về 0 — mặc
  định cờ TẮT. (BR-001)
- Danh sách miễn khoá: `/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, và mọi file tĩnh có phần mở
  rộng. (BR-002)
- Khi đếm ngược đã về 0, khoá gỡ hoàn toàn dù cờ còn bật; vào `/prelaunch` lúc này bị đưa về `/`.
  (BR-003)
- Mở `config.matcher` không được kéo theo Supabase overreach: nhánh khoá chạy trước và không I/O;
  một request KHÔNG bị redirect mà nằm ngoài whitelist 6 route cũ thì trả `NextResponse.next()` ngay,
  không gọi `getUserOrNull`, không chạm cookie. (BR-005)
- Quyết định redirect hay pass-through dựa đúng 2 điều kiện AND cộng danh sách miễn khoá ở trên.
  (DEC-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Countdown Prelaunch | SCR009_CountdownPrelaunch | Nền toàn màn + lớp phủ tối, tiêu đề, 3 ô đếm ngược DAYS/HOURS/MINUTES (mỗi ô 2 hộp LED riêng, font 7-segment) | Xem đếm ngược tự cập nhật; không có hành động nào khác trên màn |

### User Journey

1. Khách bị khoá điều hướng (hoặc vào thẳng URL) tới `/prelaunch`, thấy nền sự kiện và tiêu đề đếm
   ngược.
2. 3 ô DAYS/HOURS/MINUTES (mỗi ô 2 hộp LED riêng) tự giảm mỗi giây, không cần thao tác gì.
3. Khi đếm ngược về 0, cả 3 ô đọc `00`; nếu khách reload hoặc vào lại `/prelaunch` lúc này, họ
   được đưa thẳng về `/` (chỉ khi cờ khoá vẫn bật).

## 7. User Stories

### US001 — Xem đếm ngược trước sự kiện

**Actor:** Người dùng bất kỳ
**Goal:** Biết còn bao lâu nữa sự kiện bắt đầu
**Business value:** Tạo cảm giác chờ đợi/hồi hộp trước sự kiện, giữ khách quay lại theo dõi.

**Acceptance Criteria:**
- [ ] 3 ô DAYS/HOURS/MINUTES hiển thị đúng (2 hộp LED/ô), tick mỗi giây, không cần reload.
- [ ] `EVENT_START_AT` thiếu/hỏng → cả 3 ô hiện `00`, trang không lỗi.
- [ ] Chữ số dùng font LED (không phải `monospace` mặc định trình duyệt).

### US002 — Khoá điều hướng cho tới giờ sự kiện

**Actor:** Ban tổ chức (vận hành)
**Goal:** Không cho khách xem trước nội dung trang khác cho tới giờ G
**Business value:** Giữ kiểm soát thời điểm công bố nội dung sự kiện, tránh lộ trước.

**Acceptance Criteria:**
- [ ] Bật cờ (`PRELAUNCH_LOCK_ENABLED=true`) VÀ chưa tới giờ → mọi route trừ ngoại lệ redirect
      `/prelaunch`.
- [ ] Tắt cờ, hoặc đã tới giờ → không route nào bị khoá.

## 8. Scenarios

### US001 — Happy Path

**Given** `EVENT_START_AT` là một thời điểm tương lai hợp lệ, **When** khách mở `/prelaunch`,
**Then** 3 ô đếm ngược (mỗi ô 2 hộp LED) hiển thị đúng và tự giảm mỗi giây.

### US001 — Error: EVENT_START_AT thiếu/hỏng

**Given** `EVENT_START_AT` không set hoặc không parse được, **When** khách mở `/prelaunch`,
**Then** cả 3 ô hiện `00`, trang render bình thường không lỗi.

### US002 — Happy Path

**Given** cờ khoá bật và chưa tới giờ sự kiện, **When** khách gọi bất kỳ route nào ngoài danh sách
miễn khoá, **Then** khách bị đưa về `/prelaunch`.

### US002 — Error: cờ tắt

**Given** cờ khoá tắt (mặc định), **When** khách gọi bất kỳ route nào, **Then** không route nào
bị khoá, kể cả khi đếm ngược chưa về 0.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `EVENT_START_AT` thiếu hoặc sai định dạng | 3 ô hiện `00`, không throw | "None — silent handling" |
| Đếm ngược về đúng 0 khi đang mở trang | 3 ô chuyển `00` tại chỗ, không cần reload | "None — silent handling" |
| Cờ khoá tắt | Mọi route render bình thường, kể cả `/prelaunch` | "None — không có gì bị khoá" |
| Gõ thẳng URL một route bị khoá (không qua link) khi lock đang bật | Vẫn bị redirect `/prelaunch` — gate ở tầng request | "None — redirect im lặng" |
| Vào lại `/prelaunch` sau khi đã tới giờ, cờ vẫn bật | Redirect về `/` | "None — redirect im lặng" |
| Days ≥ 100 | Hộp thứ 3 của DAYS xuất hiện thêm (không clamp) — xem FR-204/FR-207 tương tác: 2-hộp layout giả định luôn 2 chữ số, cần xác nhận layout cho case 3 chữ số | [UNVERIFIED] — chưa quyết định hộp thứ 3 render thế nào |

## 10. Edge Behaviours to Verify

- **FR-002** → Kiểm tra `EVENT_START_AT` thiếu/hỏng không làm trang lỗi, hiện `00/00/00`.
- **FR-204** → Kiểm tra số ÂM clamp về `00`. Days ≥ 100 thì hiện đủ (`120`), KHÔNG clamp.
- **FR-207** → Kiểm tra mỗi đơn vị render đúng 2 hộp LED riêng biệt (2 phần tử DOM/đơn vị, mỗi
  phần tử 1 chữ số) — KHÔNG phải 1 chuỗi 2 ký tự trong 1 hộp.
- **FR-208** → Kiểm tra `font-family` của chữ số không phải `monospace` mặc định.
- **FR-102** → Kiểm tra route ngoài danh sách miễn khoá bị redirect đúng khi cờ bật + chưa tới giờ.
- **FR-103** → Kiểm tra khoá tự gỡ đúng lúc đếm ngược về 0.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Màn không có gate quyền nào (FR-601); 4 test case ACCESSING chỉ là boilerplate tự sinh, không có assertion thật | Một yêu cầu phân quyền tương lai cho `/prelaunch` sẽ phải tự nghiên cứu lại từ đầu | [EXPECTED] |
| RISK-02 | known-issue | *(REVISION — nâng cấp status)* Font "Digital Numbers" cho digit LED chưa được nạp trong app (`CountdownTiles` fallback `monospace`) — nợ có sẵn từ trang chủ, dùng chung. **Bar chấp nhận của khách hàng là "UI chính xác tuyệt đối so với Figma"** — recorded debt KHÔNG đủ để đóng vấn đề này; cần D002/F003-D003 chốt. | Digit không đúng font gốc thiết kế trên cả `/` và `/prelaunch` | confirmed — cần quyết định người |
| RISK-03 | known-issue | *(REVISION — mới)* `countdown-tiles.tsx:10-17` gộp 2 hộp LED/đơn vị design thành 1 hộp, với comment trích dẫn "clarifications.md § Hero/Countdown" làm căn cứ — nhưng quyết định đó KHÔNG tồn tại trong `plans/260906-0042-homepage-saa-page/clarifications.md` hay `plans/260908-1653-countdown-prelaunch-page/clarifications.md` (đã kiểm cả 2 file). Trích dẫn sai nguồn. Ràng buộc thật đang tồn tại là E2E contract tại `plans/260906-0042-homepage-saa-page/clarifications.md:67` ("3 ô countdown ... mỗi ô text khớp `/^\d{2,}$/`"), giả định 1 text node/đơn vị — đây là cái thật sự cản việc tách 2 hộp, không phải quyết định thiết kế. | Vi phạm FR-207; sửa đòi phải viết lại assertion e2e đó thành per-digit thay vì `\d{2,}` trên 1 node | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| `CountdownTiles`/`useCountdown`/`countdown.ts` của trang chủ (dùng chung `src/components`/`src/hooks`/`src/utils`) | feature | Tái dùng nguyên logic đếm ngược đã có, tránh dựng lại (DRY) | FR-203, FR-204, FR-207, FR-208 |
| `EVENT_START_AT` (biến môi trường đã có) | config | Nguồn duy nhất cho ngày giờ mục tiêu — KHÔNG dùng API dù MoMorph row 1 gợi ý (D001) | FR-001 |
| `PRELAUNCH_LOCK_ENABLED` (biến môi trường mới) | config | Bật/tắt khoá điều hướng, mặc định tắt | FR-102, BR-001 |
| E2E contract `plans/260906-0042-homepage-saa-page/clarifications.md:67` | contract | Assertion `\d{2,}$` hiện giả định 1 text node/đơn vị — PHẢI sửa thành per-digit trước khi FR-207 (2 hộp) có thể implement mà không đỏ test cũ | FR-207 |
| Font "Digital Numbers" hoặc thay thế được duyệt | asset/license | Quyết định dùng chung với F003 D003 (D002 ở trên) | FR-208 |

## 13. Configuration

```text
EVENT_START_AT = <ISO-8601>        # đã có từ trang chủ, tái dùng nguyên trạng — thời điểm sự kiện bắt đầu
PRELAUNCH_LOCK_ENABLED = false      # bật/tắt khoá điều hướng trước giờ sự kiện; mặc định tắt
```
