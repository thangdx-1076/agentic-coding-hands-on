---
status: implemented
authored_by: rebuild-spec
---
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F002_LanguageSwitch

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-10

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoint, Source citation, pseudocode,
key entity, DB write cho độc giả Dev/QA/SA.

**Traceability:** F002_LanguageSwitch → SCR001_LoginScreen → US001_SwitchLanguage → `tests/e2e/login.spec.ts` (10 case: TC 8415b629, TC 20d87e28, KB a1f8c2d1, c4e7d9f2, f7b2a4e8, e3c9b1a5, d6f1c3b9, b8e2d7a4, c5a9f2d3, a2d8e6f1)

## 1. Overview

**Problem:** Khách truy cập màn hình đăng nhập cần đọc nội dung bằng ngôn ngữ mình quen thuộc
(Tiếng Việt hoặc English), nhưng trước khi có bộ chọn này thì ngôn ngữ giao diện bị cố định.
**Solution:** Một bộ chọn ngôn ngữ đặt ở header của màn Đăng nhập, cho phép đổi giữa Tiếng Việt
và English; lựa chọn được ghi nhớ (khoảng 1 năm) và áp dụng lại toàn bộ nội dung ngay sau khi
chọn, không cần tải lại trang.
**Scope:** Hiển thị đúng cờ + nhãn của ngôn ngữ hiện tại, cho chọn giữa 2 ngôn ngữ hỗ trợ (mỗi
lựa chọn có cờ riêng), ghi nhớ lựa chọn cho các lần ghé thăm sau, điều hướng đầy đủ bằng bàn phím
theo chuẩn accessibility, và giữ nội dung tiếng Anh (`messages/en.json`) sạch — không còn sót text
tiếng Việt.
**Non-Scope:** Không hỗ trợ ngôn ngữ nào khác ngoài vi/en; không đổi ngôn ngữ tự động theo trình
duyệt; không liên quan đến trạng thái đăng nhập (tính năng này hoạt động độc lập với F001, xem
`feature-list.md` § F002).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách truy cập (Anonymous) | Người chưa đăng nhập, đang ở màn Đăng nhập | Đọc nội dung màn hình bằng ngôn ngữ mình quen thuộc |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Chuyển đổi ngôn ngữ giao diện | Mở bộ chọn ngôn ngữ (chuột hoặc bàn phím), xem ngôn ngữ hiện tại (đúng cờ + nhãn), chọn Tiếng Việt hoặc English (mỗi lựa chọn có cờ riêng, lựa chọn active có nền phân biệt) và thấy toàn bộ nội dung đổi theo ngay lập tức | US001 | FR-001, FR-002, FR-003, FR-101, FR-201, FR-202, FR-203, FR-401, FR-402, FR-601 | BR-001, BR-002, SM-001 | SCR001 |

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Hệ thống chỉ chấp nhận đúng 2 giá trị ngôn ngữ (Tiếng Việt, English); mọi giá trị
  khác luôn được chuẩn hoá về Tiếng Việt trước khi dùng.
- **FR-002** *(REVISION — mới)* Gói nội dung tiếng Anh (`messages/en.json`) không được chứa bất kỳ
  đoạn text tiếng Việt nào ở bất kỳ leaf nào — mọi khoá đã có bản dịch tiếng Việt phải có bản dịch
  tiếng Anh tương ứng, không được để nguyên tiếng Việt làm placeholder.
- **FR-003** *(REVISION — mới)* Ba nhãn điều hướng dùng chung ở header ("About SAA 2025",
  "Award(s) Information", "Sun* Kudos") giữ nguyên tiếng Anh ở CẢ 2 locale — đây là quyết định nội
  dung có chủ đích, không phải phần dịch còn thiếu.

### Navigation (1xx)

- **FR-101** Bộ chọn ngôn ngữ luôn hiển thị sẵn ngay trong header của màn Đăng nhập, không cần
  điều hướng riêng để tìm tới nó.

### Login Screen (2xx)

- **FR-201** *(REVISION — sửa)* Nút trigger của bộ chọn ngôn ngữ hiển thị ĐÚNG cờ và nhãn của ngôn
  ngữ đang active — cờ Việt Nam + "VN" khi đang ở tiếng Việt, cờ Anh/UK + "EN" khi đang ở tiếng
  Anh (KHÔNG phải luôn luôn cờ Việt Nam bất kể locale nào). Khi kích hoạt, trigger mở ra đúng 2 lựa
  chọn theo mẫu menu chuẩn accessibility.
- **FR-202** Toàn bộ điều hướng bàn phím trong menu (mũi tên mở và chạy vòng, Home/End nhảy hai
  đầu, Escape đóng và trả focus, Tab đóng nhưng không trả focus) hoạt động theo đúng chuẩn ARIA
  APG cho menu-button.
- **FR-203** *(REVISION — mới, theo MoMorph `hUyaaugye2` row A/A.1/A.2)* Mỗi lựa chọn trong menu
  hiển thị cờ của riêng ngôn ngữ đó (cờ Việt Nam cho "VN", cờ Anh cho "EN"); lựa chọn đang active
  có nền phân biệt với lựa chọn còn lại; mỗi ô lựa chọn có kích thước 110×56px, nền tối.

### Interaction (4xx)

- **FR-401** *(REVISION — làm rõ giá trị thật)* Chọn một ngôn ngữ ghi nhớ lựa chọn vào cookie
  `NEXT_LOCALE` (`maxAge` 31536000 giây ~ 1 năm, `sameSite=lax`, `path=/`) và làm toàn bộ nội dung
  giao diện hiển thị lại theo ngôn ngữ mới ngay lập tức, không cần tải lại trang — lựa chọn phải
  sống sót qua một lần tải lại trang (reload).
- **FR-402** Nếu lựa chọn ngôn ngữ đã ghi nhớ trước đó bị hỏng/không hợp lệ, hệ thống âm thầm
  quay về Tiếng Việt ở lần ghé thăm kế tiếp, không hiển thị lỗi nào.

### Security (6xx)

- **FR-601** Giá trị ngôn ngữ do người dùng gửi lên luôn phải được kiểm tra qua danh sách hợp lệ
  (Tiếng Việt/English) trước khi được dùng để chọn nội dung dịch, nhằm chặn nguy cơ giá trị độc
  hại ảnh hưởng tới cách hệ thống nạp nội dung.

## 5. Business Rules

- Mọi giá trị ngôn ngữ gửi từ phía người dùng luôn được kiểm tra và chuẩn hoá về đúng 1 trong 2
  giá trị hợp lệ trước khi ghi nhớ lại, bất kể giá trị gửi lên là gì (BR-001)
- Đổi ngôn ngữ dùng chung cơ chế "đang xử lý" với hành động đăng nhập Google, nên nút đăng nhập
  cũng thoáng chuyển sang trạng thái đang xử lý khi người dùng chỉ đổi ngôn ngữ — hành vi này là
  cố ý, được giữ nguyên qua lần chỉnh sửa gần nhất (BR-002)
- Trạng thái đóng/mở của menu chọn ngôn ngữ được theo dõi để focus bàn phím luôn đúng vào lựa
  chọn đang active (SM-001)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Login | SCR001_LoginScreen | Bộ chọn ngôn ngữ ở góc phải header, trigger hiển thị đúng cờ + nhãn ("VN" hoặc "EN") của ngôn ngữ đang active kèm mũi tên chỉ xuống; mở menu thấy 2 lựa chọn, mỗi lựa chọn có cờ riêng, lựa chọn active có nền phân biệt | Click hoặc dùng bàn phím (ArrowDown/ArrowUp) để mở menu; chọn Tiếng Việt hoặc English; điều hướng menu bằng mũi tên/Home/End; đóng menu bằng Escape hoặc Tab |

### User Journey

1. Khách truy cập vào màn Đăng nhập, thấy bộ chọn ngôn ngữ ở header đang hiển thị đúng cờ + nhãn
   ngôn ngữ hiện tại ("VN" hoặc "EN").
2. Khách click (hoặc dùng bàn phím) để mở menu — thấy đúng 2 lựa chọn Tiếng Việt/English, mỗi lựa
   chọn có cờ riêng.
3. Khách chọn một ngôn ngữ — menu đóng lại, nhãn + cờ trên bộ chọn đổi theo, và toàn bộ nội dung
   màn hình (tiêu đề, mô tả, nút đăng nhập, footer) hiển thị lại bằng ngôn ngữ vừa chọn ngay lập
   tức; lựa chọn còn giữ nguyên sau khi tải lại trang.

```mermaid
journey
    title Chuyển đổi ngôn ngữ giao diện
    section Mở bộ chọn
      Thấy đúng cờ + nhãn ngôn ngữ hiện tại: 5: Khách truy cập
      Mở menu bằng chuột hoặc bàn phím: 5: Khách truy cập
    section Chọn ngôn ngữ
      Chọn Tiếng Việt hoặc English (mỗi lựa chọn có cờ riêng): 5: Khách truy cập
      Thấy toàn bộ nội dung đổi ngôn ngữ ngay: 5: Khách truy cập
```

## 7. User Stories

### US001_SwitchLanguage — Switch Language

**Actor:** Khách truy cập (Anonymous)
**Goal:** Chuyển đổi ngôn ngữ hiển thị giữa Tiếng Việt và English trên màn Đăng nhập.
**Business value:** Đọc được nội dung màn hình bằng ngôn ngữ mình quen thuộc, giảm rào cản ngôn
ngữ ngay từ bước đầu tiên tiếp xúc với sản phẩm.

**Acceptance Criteria:**
- [ ] Trigger luôn hiển thị đúng cờ + nhãn khớp ngôn ngữ đang active — không cố định một cờ.
- [ ] Mở bộ chọn ngôn ngữ hiển thị đúng 2 lựa chọn Tiếng Việt/English, mỗi lựa chọn có cờ riêng,
      lựa chọn active có nền phân biệt, theo mẫu menu chuẩn accessibility.
- [ ] Chọn một ngôn ngữ làm nhãn + cờ trên bộ chọn cập nhật đúng theo lựa chọn, nội dung trang
      hiển thị lại bằng ngôn ngữ mới, và lựa chọn còn giữ nguyên sau khi tải lại trang.
- [ ] Một lựa chọn ngôn ngữ đã ghi nhớ trước đó nhưng bị hỏng/không hợp lệ luôn được âm thầm
      quay về Tiếng Việt mặc định ở lần ghé thăm kế tiếp.
- [ ] `messages/en.json` không còn leaf nào sót lại text tiếng Việt.

## 8. Scenarios

### US001_SwitchLanguage — Happy Path

**Given** đang ở màn Đăng nhập với ngôn ngữ hiện tại là Tiếng Việt, **When** khách mở bộ chọn
ngôn ngữ và chọn English, **Then** trigger đổi cờ + nhãn thành cờ Anh/"EN" và toàn bộ nội dung màn
hình hiển thị lại bằng English, không cần tải lại trang; tải lại trang vẫn giữ English.

### US001_SwitchLanguage — Error: Lựa chọn ngôn ngữ đã ghi nhớ bị hỏng

**Given** lựa chọn ngôn ngữ đã ghi nhớ trước đó mang giá trị rác (vd. một chuỗi không hợp lệ),
**When** khách ghé thăm lại màn Đăng nhập, **Then** hệ thống hiển thị màn hình bằng Tiếng Việt
mặc định, không có lỗi nào hiển thị cho khách.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Lựa chọn ngôn ngữ đã ghi nhớ mang giá trị rác/không hợp lệ | Hệ thống âm thầm dùng Tiếng Việt mặc định ở lần ghé thăm kế tiếp | "None — silent handling" |
| Chưa từng ghé thăm trước đó (chưa có lựa chọn ngôn ngữ nào được ghi nhớ) | Hệ thống hiển thị ngay bằng Tiếng Việt mặc định từ lần render đầu tiên, không có khoảng trống nội dung | "None — silent handling" |
| Click nhanh 2 lựa chọn ngôn ngữ khác nhau trước khi lựa chọn đầu xử lý xong | Không có cơ chế khoá/chờ — ngôn ngữ nào xử lý xong sau cùng sẽ là ngôn ngữ hiển thị cuối cùng | "None — silent handling" |
| Chọn lại đúng ngôn ngữ đang hiển thị | Lựa chọn vẫn được ghi nhớ lại (thời hạn ghi nhớ được làm mới), giao diện không có gì thay đổi để thấy | "None — silent handling" |

## 10. Edge Behaviours to Verify

- **FR-002** → Tester quét toàn bộ `messages/en.json`, xác nhận không leaf nào còn text tiếng Việt.
- **FR-003** → Tester xác nhận 3 nhãn nav dùng chung header giữ tiếng Anh khi đổi sang locale `vi`.
- **FR-201** → Tester xác nhận trigger đổi ĐÚNG cờ (không chỉ nhãn chữ) khi đổi locale.
- **FR-203** → Tester xác nhận mỗi lựa chọn trong menu có cờ riêng, lựa chọn active có nền khác
  biệt, và kích thước ô đúng 110×56px.
- **FR-401** → Tester xác nhận chọn ngôn ngữ đổi toàn bộ nội dung trang ngay lập tức, không tải
  lại trang, và lựa chọn còn giữ nguyên sau khi reload (cookie `NEXT_LOCALE`, `maxAge` 31536000,
  `sameSite=lax`).
- **FR-402** → Tester xác nhận một lựa chọn ngôn ngữ đã ghi nhớ nhưng bị hỏng luôn quay về Tiếng
  Việt mặc định mà không có lỗi hiển thị.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Nhãn ngôn ngữ mặc định (field `languageLabel` của MODEL003_LoginCopy, được server tính sẵn) không được màn hình đọc — màn hình tự tính lại nhãn của riêng nó từ ngôn ngữ hiện tại. Hai chỗ tính cùng một giá trị nhưng độc lập nhau. | Hiện tại vô hại vì cả hai luôn ra cùng kết quả; rủi ro là nếu sau này một trong hai chỗ bị sửa mà chỗ kia không được sửa theo, hai nơi sẽ lệch nhau âm thầm | confirmed |
| RISK-02 | known-issue | Đổi ngôn ngữ dùng chung cơ chế "đang xử lý" với hành động đăng nhập Google, nên nút đăng nhập Google cũng thoáng chuyển sang trạng thái đang xử lý/bị vô hiệu hoá khi người dùng chỉ đổi ngôn ngữ, không hề đụng tới đăng nhập | Hành vi thị giác gây khó hiểu nhẹ cho người dùng (nút đăng nhập "nháy" khi họ chỉ đổi ngôn ngữ), nhưng đây là đánh đổi có chủ đích để không đổi hành vi trong lần chỉnh sửa gần nhất | confirmed |
| RISK-03 | risk | Nếu việc ghi lại lựa chọn ngôn ngữ gặp lỗi ở phía server (một tình huống hiếm, chỉ xảy ra khi bị gọi sai ngữ cảnh), không có chỗ nào ở phía màn hình bắt lỗi đó — lỗi sẽ thoát ra ngoài hành động thay vì được xử lý êm | Nếu tình huống hiếm này thật sự xảy ra, người dùng có thể thấy lỗi hiển thị đột ngột thay vì một thông báo rõ ràng | [UNVERIFIED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| next-intl (thư viện dịch, phiên bản 4.14.2) | infrastructure | Cung cấp cơ chế đọc gói nội dung dịch theo ngôn ngữ đang chọn (chế độ không dùng URL prefix) | FR-401, FR-402 |
| Server Actions của Next.js (App Router) | infrastructure | Cần thiết để ghi lại lựa chọn ngôn ngữ phía server mà không cần một API endpoint riêng | FR-401, BR-001 |
| F001_GoogleOAuthLogin | feature | Dùng chung khung màn hình Đăng nhập (header) và dùng chung cơ chế "đang xử lý" của nút đăng nhập (xem BR-002) — dù outcome nghiệp vụ hoàn toàn độc lập | BR-002 |
| `IconEnFlag` | component | Cờ Anh cho trigger/menu khi locale `en`, chọn theo `label` qua bảng `FLAG` (FR-201/FR-203) | FR-201, FR-203 |

## 13. Configuration

```text
LOCALE_COOKIE = "NEXT_LOCALE"        # tên nơi lưu lựa chọn ngôn ngữ của người dùng
LOCALE_COOKIE_MAX_AGE = 31536000     # lựa chọn được ghi nhớ khoảng 1 năm trước khi hết hạn (sameSite=lax, path=/)
DEFAULT_LOCALE = "vi"                 # ngôn ngữ mặc định khi chưa có lựa chọn hợp lệ nào
```
