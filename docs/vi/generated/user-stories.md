# User Stories

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: route-view (Next.js 16 App Router) — US001-US003 phủ đúng 2 trong 9 screen hiện có (`/login`, `/todo`), 3 interaction points thực có trong code; F003-F012 chưa có US### chính thức (TBD, xem `feature-list.md`)

**Code Format**: All US codes MUST follow `US###_NameSlug` format (e.g., US001_Login, US002_ViewDashboard)

**US Types**:
- `ui` - User-facing stories (require Screen mapping)
- `system` - System stories: hook, event, observer, bg-job, trigger, etc. (no Screen mapping needed)

**Note**: Feature mapping is managed in FeatureList.md only. This document contains user stories without direct feature references. UI US require Screen mapping; system/bg-job US do not.

**Honest scope note**: App demo 2 màn hình — chưa có tính năng todo thật (`/todo` là placeholder). Cả 3 US dưới đây khớp đúng 3 interaction point thực có trong code (không có bg-job/hook/observer nào lộ ra ngoài cho người dùng thao tác trực tiếp — 3 BL### trong `behavior-logic.md` đều là integration client factory được gọi TỪ BÊN TRONG các US này, không phải điểm vào riêng). Redirect tự động của guard (`proxy.ts`, `getUser()`/`getCurrentUser()`) KHÔNG được tách thành US riêng — đây là "passive routing", bị loại tường minh khỏi vocabulary "Navigation actions" của IPE Step 1; hành vi này đã có trong `permissions-matrix.md` (PERM001-004) và `screen-flow.md` (Guard Logic).

## Interaction Inventory

| Screen | Element | Type | Action | Endpoint |
|--------|---------|------|--------|---------|
| SCR001_LoginScreen | LanguageSelector dropdown | secondary-action | Chọn vi/en, gọi Server Action ghi cookie `NEXT_LOCALE` | Server Action `setLocale(locale)` — `src/app/_actions/set-locale.ts` |
| SCR001_LoginScreen | GoogleLoginButton | primary-action | Khởi tạo Supabase OAuth, điều hướng Google consent rồi PKCE callback | `signInWithOAuth` (client) → GET `/auth/callback` (ROUTE001) |
| SCR002_TodoScreen | Logout form/button | primary-action | Submit Server Action, `signOut()` best-effort rồi luôn redirect `/login` | Server Action `logoutAction()` — `src/app/_actions/logout.ts` (shared, dùng chung 5+ trang) |

## User Story Index

| Code | Title | Type | Priority | Screens |
|------|-------|------|----------|---------|
| US001_SwitchLanguage | Switch Language | ui | Medium | SCR001_LoginScreen |
| US002_LoginWithGoogle | Login With Google | ui | Critical | SCR001_LoginScreen, SCR002_TodoScreen |
| US003_LogOut | Log Out | ui | High | SCR002_TodoScreen, SCR001_LoginScreen |

---

## US001_SwitchLanguage: Switch Language

**Type**: ui
**Interaction**: secondary-action
**Priority**: Medium
**Estimate**: XS

### User Story

Là khách truy cập màn hình đăng nhập (Anonymous), tôi muốn chuyển đổi ngôn ngữ hiển thị giữa Tiếng Việt và English để đọc nội dung màn hình bằng ngôn ngữ mình quen thuộc.

### Acceptance Criteria

- [ ] Criterion 1: Mở LanguageSelector hiển thị đúng 2 lựa chọn vi/en theo mẫu ARIA menu-button.
- [ ] Criterion 2: Chọn một ngôn ngữ gọi Server Action `setLocale`, ghi cookie `NEXT_LOCALE` hợp lệ (`vi` hoặc `en`); nhãn "VN"/"EN" trên LanguageSelector cập nhật đúng theo lựa chọn.
- [ ] Criterion 3: Cookie `NEXT_LOCALE` mang giá trị rác/không hợp lệ bị `proxy.ts` chuẩn hoá về `vi` mặc định ở request kế tiếp (input-validation thuần, không phải locale-gate — xem `permissions-matrix.md`).

### Technical Notes

- **Endpoint**: Server Action `setLocale(locale)` — `src/app/_actions/set-locale.ts`
- **Data Required**: MODEL001_AppLocale
- **Dependencies**: `proxy.ts` (cookie normalize), next-intl

### Screens

- SCR001_LoginScreen: Login

### Background Logic

- Không có BL### tương ứng — `setLocale` là Server Action ghi cookie thuần, `api-map.md` đánh dấu `[UNMAPPED]` (không gọi Supabase).

### Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy Path | Đang ở `/login`, locale hiện tại `vi` | Click LanguageSelector → chọn "English" | Nhãn đổi thành "EN", nội dung dịch sang `en`, cookie `NEXT_LOCALE=en` |
| Error Case | Cookie `NEXT_LOCALE` bị set giá trị rác (vd. `"fr"`) | Request kế tiếp đi qua `proxy.ts` | `proxy.ts` normalize cookie về `vi` mặc định, không có lỗi hiển thị nào |

---

## US002_LoginWithGoogle: Login With Google

**Type**: ui
**Interaction**: primary-action
**Priority**: Critical
**Estimate**: S

### User Story

Là khách truy cập chưa đăng nhập (Anonymous) trên màn hình đăng nhập, tôi muốn đăng nhập bằng tài khoản Google của mình để vào được khu vực nội dung được bảo vệ (`/todo`).

### Acceptance Criteria

- [ ] Criterion 1: Click nút "LOGIN With Google" gọi `signInWithOAuth` (BL001_SupabaseBrowserClient); nút chuyển trạng thái pending (disabled + spinner) trong lúc chờ.
- [ ] Criterion 2: OAuth thành công → Google redirect về ROUTE001 (`GET /auth/callback`) → `exchangeCodeForSession` thành công → redirect tới `safeNextPath(next)` (mặc định `/todo`, PERM004).
- [ ] Criterion 3: OAuth provider trả `?error`/`?error_description`, hoặc `exchangeCodeForSession` thất bại/thiếu cả `code` lẫn `error` → redirect `/login?error=...`, `LoginErrorAlert` hiển thị đúng 1 thông báo cố định đã dịch (raw value không bao giờ được render — an toàn XSS).
- [ ] Criterion 4: `signInWithOAuth()` phía client tự lỗi/throw → `clientError` state bật, hiển thị cùng thông báo cố định qua `LoginErrorAlert` ngay, không cần round-trip `?error=`.

### Technical Notes

- **Endpoint**: client SDK `signInWithOAuth` (BL001) → GET `/auth/callback` (ROUTE001, BL002) qua guard PERM004
- **Data Required**: MODEL002_SupabaseUser (session sau khi exchange thành công)
- **Dependencies**: BL001_SupabaseBrowserClient, BL002_SupabaseServerClient, PERM002_LoginRouteGuard, PERM004_CallbackNextPathGuard

### Screens

- SCR001_LoginScreen: Login (điểm bắt đầu)
- SCR002_TodoScreen: Todo (đích khi thành công)

### Background Logic

- BL001_SupabaseBrowserClient
- BL002_SupabaseServerClient

### Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy Path | Chưa đăng nhập, đang ở `/login` | Click "LOGIN With Google" → chọn tài khoản Google → cấp quyền | Redirect `/todo`, hiển thị lời chào theo email |
| Error Case | Chưa đăng nhập, đang ở `/login` | Người dùng huỷ consent trên Google (provider trả `?error`) | Redirect `/login?error=...`, `LoginErrorAlert` hiển thị thông báo cố định |

---

## US003_LogOut: Log Out

**Type**: ui
**Interaction**: primary-action
**Priority**: High
**Estimate**: XS

### User Story

Là người dùng đã đăng nhập (Authenticated) trên màn hình Todo, tôi muốn đăng xuất khỏi tài khoản Google của mình để kết thúc phiên làm việc, tránh người khác dùng chung máy xem được nội dung của tôi.

### Acceptance Criteria

- [ ] Criterion 1: Click nút đăng xuất submit Server Action `logoutAction`.
- [ ] Criterion 2: `logoutAction` gọi `supabase.auth.signOut()` best-effort rồi LUÔN redirect `/login`, kể cả khi `signOut()` lỗi (session server đã hết hạn).
- [ ] Criterion 3: Sau khi redirect, truy cập lại `/todo` bằng URL trực tiếp bị guard PERM003 chặn (fail closed), redirect `/login` vì không còn session hợp lệ.

### Technical Notes

- **Endpoint**: Server Action `logoutAction()` — `src/app/_actions/logout.ts` (shared, không riêng `/todo`)
- **Data Required**: — (best-effort `signOut()`, không đọc lại data sau đó)
- **Dependencies**: BL002_SupabaseServerClient, PERM003_TodoRouteGuard

### Screens

- SCR002_TodoScreen: Todo (nguồn)
- SCR001_LoginScreen: Login (đích)

### Background Logic

- BL002_SupabaseServerClient

### Test Scenarios

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Happy Path | Đã đăng nhập, đang ở `/todo` | Click nút đăng xuất | `signOut()` thành công, redirect `/login` |
| Error Case | Đã đăng nhập, đang ở `/todo`, session đã hết hạn phía Supabase | Click nút đăng xuất | `signOut()` lỗi nhưng bị bỏ qua (best-effort), vẫn redirect `/login` |

---

## Screen → US Map

| Screen | US Codes |
|--------|---------|
| SCR001_LoginScreen | US001, US002, US003 (US003 chỉ là đích redirect, không sở hữu interaction tại đây) |
| SCR002_TodoScreen | US002 (đích thành công), US003 (interaction gốc) |

> Screen sở hữu interaction gốc: SCR001 → US001, US002 (interaction bắt đầu tại đây). SCR002 → US003 (interaction bắt đầu tại đây). Không screen nào có 0 US — không cần `[IPE_ZERO]`.

## Summary

- **Total User Stories**: 3
- **By Type**: ui: 3, system: 0
- **By Actor**: Anonymous: 2 (US001, US002), Authenticated: 1 (US003)
- **By Priority**: Critical: 1, High: 1, Medium: 1

## Cross-Reference Validation

- [x] All US### codes are unique (US001-US003, contiguous)
- [x] All acceptance criteria are testable
- [x] All technical notes are complete
- [x] All US### codes are referenced in FeatureList.md — feature-list.md tồn tại, tham chiếu đủ US001 (F002), US002 (F001), US003 (F001) ở Summary line 351
- [x] All `ui` US### mapped to SCR### (parent SCR tồn tại trong screen-list.md; app không có REG###)
- [x] All system US### have at least one BL### mapped — N/A, không có US type=system trong tài liệu này
