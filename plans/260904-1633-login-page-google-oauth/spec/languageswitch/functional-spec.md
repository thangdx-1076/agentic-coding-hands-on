---
status: draft
authored_by: takumi
created: 2026-09-04
lang: vi
---

**Priority**: P1
**Type**: ui

## 1. Overview

**Problem:** Khách truy cập màn `/login` chỉ thấy giao diện tiếng Việt mặc định; chưa có cách đổi sang tiếng Anh.
**Solution:** Bộ chọn ngôn ngữ ở góc phải header `/login` cho phép chuyển đổi VN ⇄ EN ngay lập tức; lựa chọn lưu vào cookie `NEXT_LOCALE` (next-intl, không dùng URL prefix) để áp dụng lại ở lần tải trang sau.
**Scope:** Đổi toàn bộ copy UI của `/login` (và `/todo` placeholder, dùng chung `messages/{locale}.json`) giữa `vi`/`en`; lưu lựa chọn qua cookie `NEXT_LOCALE` (path=`/`, 1 năm).
**Non-Scope:** Không thêm ngôn ngữ thứ 3; không dùng URL prefix/i18n routing; không tự phát hiện ngôn ngữ trình duyệt; không có màn cài đặt ngôn ngữ riêng; không sở hữu khung màn `/login` (F001 sở hữu khung màn).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách truy cập | Người dùng ở màn `/login`, chưa cần đăng nhập | Xem giao diện bằng ngôn ngữ mong muốn (VN hoặc EN) |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Đổi ngôn ngữ giao diện (VN/EN) | Khách bấm bộ chọn ở header, chọn VN hoặc EN, giao diện đổi ngay và được nhớ ở lần sau | US001, US002 | FR-001, FR-101, FR-201, FR-401, FR-402 | BR-001, BR-002 | SCR001_Login / region: language-selector |

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Hệ thống dùng next-intl, đọc locale từ cookie `NEXT_LOCALE`; mặc định `vi` khi chưa có cookie; không dùng URL prefix.

### Navigation (1xx)

- **FR-101** Bộ chọn ngôn ngữ hiển thị cố định ở góc phải header `/login`, luôn thấy được kể cả chưa đăng nhập.

### Language Selector (2xx)

- **FR-201** Bộ chọn hiển thị cờ Việt Nam + nhãn ngôn ngữ hiện tại ("VN" hoặc "EN") + mũi tên chevron; bấm vào mở menu 2 mục "VN" và "EN".

### Interaction (4xx)

- **FR-401** Chọn một mục trong menu đặt cookie `NEXT_LOCALE` (path=`/`, 1 năm) và áp dụng lại toàn bộ copy UI theo ngôn ngữ mới ngay sau khi chọn.
- **FR-402** Khi rê chuột qua bộ chọn ngôn ngữ, bộ chọn có hiệu ứng highlight và con trỏ chuyển thành pointer.

## 5. Business Rules

- Chỉ hỗ trợ 2 ngôn ngữ `vi` (nhãn "VN") và `en` (nhãn "EN"); ngôn ngữ mặc định là `vi` khi chưa có cookie `NEXT_LOCALE`. (BR-001)
- Toàn bộ copy UI của `/login` và `/todo` lấy từ `messages/vi.json`/`messages/en.json`; nhãn "LOGIN With Google" giữ nguyên ở cả 2 ngôn ngữ theo thiết kế. (BR-002)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Bộ chọn ngôn ngữ (Login header) | SCR001_Login / region: language-selector | Cờ VN + nhãn ngôn ngữ hiện tại + chevron ở góc phải header `/login` | Bấm mở menu, chọn "VN" hoặc "EN" để đổi ngôn ngữ giao diện |

### User Journey

1. Khách vào `/login`, header hiển thị bộ chọn ngôn ngữ với cờ VN + nhãn "VN" (mặc định).
2. Khách bấm bộ chọn — menu mở với 2 mục "VN" và "EN".
3. Khách chọn "EN" — cookie `NEXT_LOCALE=en` được lưu, toàn bộ nội dung trang đổi sang tiếng Anh ngay lập tức, bộ chọn hiển thị "EN".
4. Lần tải trang sau, giao diện vẫn hiển thị tiếng Anh nhờ cookie đã lưu.

## 7. User Stories

### US001_ChuyenDoiNgonNgu — Chuyển đổi ngôn ngữ giao diện

**Actor:** Khách truy cập
**Goal:** Xem giao diện `/login` bằng tiếng Việt hoặc tiếng Anh theo ý muốn
**Business value:** Phục vụ người dùng SAA 2025 không nói tiếng Việt, tăng khả năng tiếp cận màn đăng nhập

**Acceptance Criteria:**
- [ ] Bấm bộ chọn ngôn ngữ mở menu với 2 mục "VN" và "EN"
- [ ] Chọn "EN" đổi toàn bộ copy UI sang tiếng Anh ngay lập tức, bộ chọn hiển thị "EN"

### US002_LuuLuaChonNgonNgu — Lưu lựa chọn ngôn ngữ

**Actor:** Khách truy cập
**Goal:** Không phải chọn lại ngôn ngữ mỗi lần quay lại `/login`
**Business value:** Trải nghiệm nhất quán giữa các lần truy cập, giảm thao tác lặp lại

**Acceptance Criteria:**
- [ ] Lựa chọn ngôn ngữ được lưu vào cookie `NEXT_LOCALE` (path=`/`, 1 năm)
- [ ] Tải lại trang sau khi đã chọn ngôn ngữ vẫn hiển thị đúng ngôn ngữ đã chọn

## 8. Scenarios

### US001_ChuyenDoiNgonNgu — Happy Path

**Given** khách đang ở `/login` với ngôn ngữ mặc định tiếng Việt, **When** khách bấm bộ chọn ngôn ngữ và chọn "EN", **Then** toàn bộ nội dung `/login` hiển thị bằng tiếng Anh ngay lập tức và bộ chọn hiển thị "EN".

### US001_ChuyenDoiNgonNgu — Error: cookie mang giá trị không hợp lệ

**Given** cookie `NEXT_LOCALE` mang giá trị không thuộc `vi`/`en` (bị can thiệp thủ công), **When** khách tải `/login`, **Then** [EXPECTED] hệ thống hiển thị mặc định tiếng Việt, không có thông báo lỗi.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Chưa có cookie `NEXT_LOCALE` (lần đầu truy cập) | Hệ thống dùng mặc định `vi` | "Không có thông báo — giao diện hiển thị tiếng Việt ngay" |
| Cookie `NEXT_LOCALE` mang giá trị không hợp lệ (khác `vi`/`en`) | [EXPECTED] hệ thống dùng mặc định `vi` | "Không có thông báo lỗi" |
| JavaScript bị tắt ở trình duyệt | [EXPECTED] bộ chọn (client component) không mở được menu; trang vẫn hiển thị theo cookie hiện có | "Không có thông báo — tính năng phụ thuộc JavaScript" |

## 10. Edge Behaviours to Verify

- **FR-001** → Kiểm tra: chưa có cookie `NEXT_LOCALE` thì trang hiển thị tiếng Việt mặc định.
- **FR-401** → Kiểm tra: chọn "EN" trong menu đặt cookie `NEXT_LOCALE=en` (path=`/`, 1 năm) và toàn bộ copy đổi sang tiếng Anh ngay sau khi chọn.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Bộ chọn ngôn ngữ là client component phụ thuộc JavaScript; chưa có phương án dự phòng khi JS bị tắt | Người dùng tắt JS không đổi được ngôn ngữ, vẫn xem được `/login` theo cookie hiện có | [EXPECTED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F001_GoogleOAuthLogin | feature | Bộ chọn ngôn ngữ nằm trong header của `/login`, khung màn do F001 sở hữu; F002 chỉ sở hữu vùng con | SCR001_Login / region: language-selector |
| next-intl 4.14.2 | infrastructure | Cung cấp cơ chế i18n cookie-based (`getRequestConfig`, `NextIntlClientProvider`), không dùng URL prefix | research/researcher-01-supabase-google-oauth-nextjs16.md § Q3 |

## 13. Configuration

```text
DEFAULT_LOCALE = vi           # ngôn ngữ mặc định khi chưa có cookie NEXT_LOCALE
SUPPORTED_LOCALES = vi, en    # 2 ngôn ngữ hỗ trợ trên bộ chọn (nhãn "VN"/"EN")
COOKIE_MAX_AGE = 1 năm        # thời gian lưu cookie NEXT_LOCALE sau khi chọn
```
