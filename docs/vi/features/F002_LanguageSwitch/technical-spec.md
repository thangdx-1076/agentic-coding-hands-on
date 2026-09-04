---
status: implemented
authored_by: takumi
created: 2026-09-04
lang: vi
fcode: F002
---

# F002_LanguageSwitch

## 1. Technical Overview

Vùng Language Selector trong header `/login` (client component) cho khách chọn locale `vi`/`en`. Chọn xong gọi Server Action `setLocale` đặt cookie `NEXT_LOCALE` (path=`/`, 1 năm) rồi trigger re-render; `i18n/request.ts` (`getRequestConfig`, next-intl 4.14.2) đọc cookie này ở mọi request để chọn `messages/{locale}.json`, mặc định `vi` khi chưa có cookie. Không dùng URL prefix/i18n routing.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | FR-001 | — | § 4.4 |
| **A1** | `setLocale` *(Server Action, planned)* | `Server Action` · `setLocale` | FR-101, FR-201, FR-401, FR-402, US001, US002 | — *(cookie only, no DB table)* | § 3.1 |

## 3. Actions

### 3.1 CAP-01 — Đổi ngôn ngữ giao diện (VN/EN)

#### A1 · Chọn ngôn ngữ hiển thị (VN/EN)
`Server Action` → `` `setLocale` `` *(planned)*
`FR-101` `FR-201` `FR-401` `FR-402` `US001` `US002` · `SCR001_Login / region: language-selector`

<!-- Rung order per wire-format-contract.md § 3 — include only the rungs that apply, in this order: Who, FE, Request, BE, Rule, Result, Source. An absent rung is OMITTED entirely, never rendered as N/A or None. (that shape trips rung_empty_rendered, a critical). Only the RELATIVE ORDER of whichever rungs you do include is checked (rung_order); presence of every rung is never required. Every rung except Source is rendered as a bold label, a middot, then the body; Source is the one exception — colon inside the bold, a single space, then a backticked path:line citation, no middot — see the contract for the exact form. -->

**Who** · Khách truy cập `/login` (chưa cần đăng nhập)
**FE** · Client component `LanguageSelector` (planned) render trong header: cờ VN (`public/login/VN.svg`) + nhãn "VN"/"EN" + chevron (`public/login/Down.svg`); `button[aria-haspopup="menu"]`. Bấm mở `[role="menu"]` với 2 `[role="menuitem"]` "VN"/"EN"; rê chuột có highlight + `cursor: pointer` (FR-402).
**Request** · tham số `locale` = `"vi"` \| `"en"` (giá trị chọn từ menu)
**BE** · Server Action `setLocale` — set cookie `NEXT_LOCALE` (path=`/`, 1 năm) rồi trigger re-render (gọi trong `useTransition`, xem § 5.2).
**Rule** · **BR-001 — Chỉ hỗ trợ 2 locale `vi`/`en`; mặc định `vi` khi chưa có cookie.** Cookie được đọc trong `i18n/request.ts` (`getRequestConfig`), không dùng URL prefix. *(§ 4.4 — Bin 1, dùng bởi đúng 1 action, ghi inline tại đây)*
**Result** · Không ghi DB — chỉ set cookie `NEXT_LOCALE`. Toàn bộ copy UI của `/login` và `/todo` render lại theo locale mới (`messages/{locale}.json`, BR-002).
**Source:** TBD (draft) — chưa có source code.

<!-- No diagram: dưới ngưỡng — 1 hop client → Server Action → cookie, không ghi ≥2 bảng, không phải background/async. -->

#### Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A0 | Chưa có cookie `NEXT_LOCALE` | `getRequestConfig` trả về mặc định `vi` |
| A0 | Cookie `NEXT_LOCALE` giá trị không hợp lệ (khác `vi`/`en`) | [EXPECTED] fallback về `vi` — cần xác nhận qua code khi implement (§ 5.3) |
| A1 | JavaScript tắt ở trình duyệt | [EXPECTED] `LanguageSelector` là client component — chưa có phương án fallback no-JS ở draft này |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `LanguageSelector` *(planned)* | Client component: cờ + nhãn + chevron, mở/đóng menu VN/EN | A1 | TBD (draft) |
| `setLocale` *(planned, Server Action)* | Đặt cookie `NEXT_LOCALE` (path=`/`, 1 năm), trigger re-render | A1 | TBD (draft) |

### 4.2 Data Model

N/A — không có entity do app sở hữu; lựa chọn ngôn ngữ lưu trong cookie `NEXT_LOCALE` (client-side), không có bảng DB.

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None — trạng thái đóng/mở dropdown là client-local, tầm thường (2 trạng thái); không mô hình hoá SM-### chính thức trong bản draft này.

### 4.4 Shared Rules

None — BR-001 chỉ dùng bởi đúng 1 action (A1), ghi inline trong Rule rung của A1 (Bin 1), không đủ điều kiện vào § 4.4.

### 4.5 Algorithms & Integrations

None.

### 4.6 Configuration

```text
NEXT_LOCALE_DEFAULT = vi              # mặc định khi chưa có cookie (A0)
NEXT_LOCALE_COOKIE_MAX_AGE = 31536000 # 1 năm (giây) — thời gian sống cookie NEXT_LOCALE (A1)
```

**Client behavior:** see behavior-logic.md, permissions.md, architecture.md

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* Chọn "EN" trong menu → cookie `NEXT_LOCALE=en` (path=`/`, 1 năm) được set, trang render lại với nội dung tiếng Anh (covers FR-401, BR-001)
- **SC-002** *(A0)* Không có cookie `NEXT_LOCALE` → trang render mặc định tiếng Việt (covers FR-001)

#### US001_ChuyenDoiNgonNgu *(A1)*

**Independent Test:** Mở `/login` không cookie, bấm bộ chọn, chọn "EN" trong `[role="menu"]`, kiểm tra cookie `NEXT_LOCALE=en` được set và copy đổi sang tiếng Anh.

**Acceptance Scenarios:**
1. **Given** `/login` chưa có cookie `NEXT_LOCALE`, **When** khách bấm bộ chọn và chọn "EN", **Then** cookie `NEXT_LOCALE=en` được set và toàn bộ copy hiển thị tiếng Anh.
2. **Given** cookie `NEXT_LOCALE=en` đã có, **When** khách tải lại `/login`, **Then** trang hiển thị tiếng Anh ngay từ lần render đầu.

#### US002_LuuLuaChonNgonNgu *(A1)*

**Independent Test:** Chọn "EN", đóng tab, mở lại `/login` — kiểm tra vẫn hiển thị tiếng Anh nhờ cookie.

**Acceptance Scenarios:**
1. **Given** khách đã chọn "EN" ở lần truy cập trước, **When** khách quay lại `/login`, **Then** trang hiển thị tiếng Anh mà không cần chọn lại.

### 5.2 Assumptions

- *(A1)* Dùng Server Action (`'use server'`) để set cookie theo khuyến nghị của research report (thay vì `document.cookie` phía client) — idiomatic hơn với Next 16, dễ test hơn (research/researcher-01-supabase-google-oauth-nextjs16.md § Q3).
- *(A1)* Dropdown gọi Server Action bên trong `useTransition` (`startTransition`) để có pending state mượt, không cần gọi thêm `revalidate` vì Server Action tự tạo round-trip render lại `i18n/request.ts`.

### 5.3 Unresolved Questions

1. **Cookie `NEXT_LOCALE` giá trị không hợp lệ** *(A0)*: `getRequestConfig` có tự fallback về `vi` khi cookie mang giá trị khác `vi`/`en` không, hay cần validate thủ công trong `i18n/request.ts`? Chưa xác nhận được vì chưa có code.

**Resolved 2026-09-04 (user):**
- Cookie `NEXT_LOCALE` không hợp lệ (∉ {vi,en}) → fallback `vi` VÀ `proxy.ts` set lại `NEXT_LOCALE=vi` trên response; `i18n/request.ts` cũng fallback `vi`.
- Không hỗ trợ no-JS (không `<noscript>` form); selector chỉ hoạt động khi có JavaScript — rủi ro chấp nhận.

### 5.4 Source References

Chưa có source code — xem `functional-spec.md § 7 User Stories` và `§ 8 Scenarios` để biết hành vi dự kiến.

#### Data Flow

```text
Chưa có source code — không có data flow cụ thể để mô tả (xem functional-spec.md § 7–§ 8 về hành vi dự kiến khi implement).
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | TBD (draft) | TBD (draft) | [ ] |
| Architecture | TBD (draft) | TBD (draft) | [ ] |
| Feature List | [feature-list.md](../feature-list.md) | F002 | [ ] |
| API Map | TBD (draft) | TBD (draft) | [ ] |
| Entities | TBD (draft) | TBD (draft) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | TBD (draft) | [ ] |
| Behavior Logic | TBD (draft) | TBD (draft) | [ ] |
| Permissions Matrix | TBD (draft) | TBD (draft) | [ ] |
| User Stories | TBD (draft) | TBD (draft) | [ ] |
