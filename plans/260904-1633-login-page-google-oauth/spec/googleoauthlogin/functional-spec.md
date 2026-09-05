---
status: draft
authored_by: takumi
created: 2026-09-04
lang: vi
---

**Priority**: P0
**Type**: mixed

## 1. Overview

**Problem:** Người dùng cần một cách đăng nhập nhanh, không phải tạo tài khoản riêng, để vào ứng dụng nội bộ SAA 2025 (Sun* Annual Awards); hệ thống cần chặn người chưa đăng nhập xem nội dung được bảo vệ.
**Solution:** Cho khách đăng nhập bằng bất kỳ tài khoản Google nào qua Supabase Auth (Google OAuth, luồng PKCE); sau khi xác thực, đưa tới `/todo` được bảo vệ. Guard hai lớp (optimistic trong `proxy.ts` + authoritative trong `/todo`) đảm bảo đã đăng nhập không quay lại `/login`, chưa đăng nhập không vào được `/todo`.
**Scope:** Đăng nhập Google (PKCE) trên `/login`; route xử lý `/auth/callback` đổi code lấy session; guard truy cập cho `/login`, `/`, `/todo`; trang `/todo` placeholder (chào email + nút đăng xuất); thông báo lỗi khi đăng nhập thất bại/huỷ.
**Non-Scope:** Không phân quyền theo vai trò (mọi tài khoản Google được phép như nhau); không xây nội dung thật của `/todo` (chỉ placeholder); không xử lý bộ chọn ngôn ngữ (region này do F002_LanguageSwitch sở hữu — partial-screen ownership, xem `feature-list.md`).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Khách (chưa đăng nhập) | Người truy cập ứng dụng SAA 2025 lần đầu hoặc chưa xác thực | Đăng nhập bằng Google để vào `/todo` |
| Người dùng đã xác thực | Khách đã đăng nhập thành công bằng Google | Xem thông tin của mình trên `/todo` và đăng xuất khi cần |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Đăng nhập Google & bảo vệ truy cập | Khách đăng nhập bằng tài khoản Google bất kỳ, được đưa tới trang bảo vệ; hệ thống tự động điều hướng theo trạng thái đăng nhập và cho phép đăng xuất | US001, US002, US003, US004, US005 | FR-001, FR-101, FR-201, FR-202, FR-203, FR-204, FR-301, FR-302, FR-401, FR-402, FR-601, FR-602, FR-603 | BR-001, BR-002, BR-003, DEC-001, DEC-002 | SCR001_Login, SCR002_Todo |

**Single-capability rationale:** US001 và US003 phục vụ đúng một outcome — xác thực bằng Google và bảo vệ truy cập nhất quán cho toàn bộ ứng dụng.

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Ứng dụng phải đọc được cấu hình Supabase Auth (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) khi khởi động, trỏ tới instance local `saa-app`.

### Navigation (1xx)

- **FR-101** Truy cập `/` chuyển hướng tới `/login` (chưa đăng nhập) hoặc `/todo` (đã đăng nhập).

### Đăng nhập (2xx)

- **FR-201** Trang `/login` hiển thị header (logo + bộ chọn ngôn ngữ), hero (tiêu đề, mô tả, nút "LOGIN With Google") và footer bản quyền.
- **FR-202** Bấm nút "LOGIN With Google" khởi động luồng Google OAuth (PKCE).
- **FR-203** Trong lúc chờ xác thực, nút chuyển sang trạng thái vô hiệu hoá kèm chỉ báo đang tải.
- **FR-204** Khi URL có tham số `error`, `/login` hiển thị thông báo lỗi cố định ngay dưới nút Google.

### Todo placeholder (3xx)

- **FR-301** Trang `/todo` hiển thị email của người dùng đã đăng nhập.
- **FR-302** Trang `/todo` có nút "Đăng xuất"; bấm vào sẽ đăng xuất và quay về `/login`.

### Interaction (4xx)

- **FR-401** Sau khi Google xác thực thành công, `/auth/callback` đổi mã xác thực lấy session và chuyển hướng tới đích dự kiến (mặc định `/todo`).
- **FR-402** Đích chuyển hướng sau callback (`next`) chỉ được chấp nhận nếu là đường dẫn nội bộ bắt đầu bằng `/`.

### Security (6xx)

- **FR-601** Người đã đăng nhập truy cập `/login` hoặc `/` tự động chuyển hướng tới `/todo`.
- **FR-602** Người chưa đăng nhập truy cập `/todo` tự động chuyển hướng tới `/login`.
- **FR-603** `/todo` xác thực lại phía server trước khi hiển thị nội dung, không chỉ dựa vào việc đã qua bước chuyển hướng ban đầu.

## 5. Business Rules

- Mọi tài khoản Google hợp lệ đều được phép đăng nhập, không giới hạn theo vai trò (BR-001)
- Đích chuyển hướng sau callback chỉ được chấp nhận khi là đường dẫn nội bộ bắt đầu bằng `/`, để tránh chuyển hướng ra ngoài ứng dụng (BR-002)
- Hệ thống tự động điều hướng theo trạng thái đăng nhập cho `/login`, `/` và `/todo` trước khi trang được xác thực lại phía server (BR-003)
- Khi đổi mã xác thực thành công, hệ thống chuyển hướng tới đích dự kiến (DEC-001)
- Khi có lỗi từ Google hoặc đổi mã xác thực thất bại, hệ thống chuyển hướng về trang đăng nhập kèm mã lỗi (DEC-002)

## 6. Screens

| Screen Name | SCR### | What User Sees | What User Can Do |
|-------------|--------|-----------------|-------------------|
| Đăng nhập | SCR001_Login | Header (logo + bộ chọn ngôn ngữ), hero (tiêu đề "ROOT FURTHER", mô tả, nút "LOGIN With Google"), footer bản quyền | Bấm đăng nhập Google; xem thông báo lỗi nếu đăng nhập thất bại |
| Todo (placeholder được bảo vệ) | SCR002_Todo | Tiêu đề chào kèm email người dùng, nút đăng xuất | Đăng xuất |

### User Journey

1. Khách vào màn "Đăng nhập" và thấy header, hero, nút "LOGIN With Google".
2. Khách bấm nút — được chuyển sang trang xác thực Google.
3. Xác thực thành công → khách được đưa tới màn "Todo (placeholder được bảo vệ)", thấy email của mình và nút "Đăng xuất".
4. Nếu xác thực thất bại hoặc bị huỷ, khách quay lại "Đăng nhập" và thấy thông báo lỗi dưới nút Google.
5. Khách bấm "Đăng xuất" trên "Todo (placeholder được bảo vệ)" → quay lại "Đăng nhập".

## 7. User Stories

**US001_GoogleLogin — Đăng nhập bằng Google**
**Actor:** Khách (chưa đăng nhập)
**Goal:** Đăng nhập vào ứng dụng bằng tài khoản Google của mình.
**Business value:** Loại bỏ nhu cầu tạo tài khoản riêng, giảm ma sát khi truy cập ứng dụng nội bộ SAA 2025.

**Acceptance Criteria:**
- [ ] Bấm "LOGIN With Google" mở luồng xác thực Google.
- [ ] Xác thực thành công → được đưa tới `/todo`.

**US002_AutoRedirectAuthenticated — Tự động vào Todo khi đã đăng nhập**
**Actor:** Người dùng đã xác thực
**Goal:** Không phải đăng nhập lại khi đã có phiên hợp lệ.
**Business value:** Trải nghiệm mượt, tránh thao tác thừa.

**Acceptance Criteria:**
- [ ] Truy cập `/login` khi đã đăng nhập → tự động chuyển tới `/todo`.
- [ ] Truy cập `/` khi đã đăng nhập → tự động chuyển tới `/todo`.

**US003_BlockUnauthenticated — Chặn truy cập khi chưa đăng nhập**
**Actor:** Khách (chưa đăng nhập)
**Goal:** Không thể xem nội dung được bảo vệ khi chưa xác thực.
**Business value:** Bảo vệ dữ liệu, đáp ứng yêu cầu bảo mật cơ bản.

**Acceptance Criteria:**
- [ ] Truy cập `/todo` khi chưa đăng nhập → tự động chuyển tới `/login`.
- [ ] Truy cập `/` khi chưa đăng nhập → tự động chuyển tới `/login`.

**US004_Logout — Đăng xuất**
**Actor:** Người dùng đã xác thực
**Goal:** Đăng xuất khỏi ứng dụng.
**Business value:** Cho phép chủ động kết thúc phiên, đặc biệt trên thiết bị dùng chung.

**Acceptance Criteria:**
- [ ] Bấm "Đăng xuất" trên `/todo` → phiên bị xoá và quay lại `/login`.

**US005_LoginErrorMessage — Thấy lỗi đăng nhập**
**Actor:** Khách (chưa đăng nhập)
**Goal:** Biết ngay khi đăng nhập Google thất bại hoặc bị huỷ để thử lại.
**Business value:** Giảm bối rối, tăng tỉ lệ thử lại thành công.

**Acceptance Criteria:**
- [ ] URL `/login?error=...` → hiện thông báo lỗi inline dưới nút Google.

## 8. Scenarios

**US001_GoogleLogin — Happy Path**
**Given** khách chưa đăng nhập trên `/login`, **When** bấm "LOGIN With Google" và xác thực Google thành công, **Then** khách được chuyển tới `/todo`.

**US001_GoogleLogin — Error: xác thực Google thất bại/bị huỷ**
**Given** khách bấm "LOGIN With Google", **When** Google trả lỗi hoặc khách huỷ xác thực, **Then** khách được đưa về `/login?error=...` và thấy thông báo lỗi (xem US005_LoginErrorMessage).

**US002_AutoRedirectAuthenticated — Happy Path**
**Given** khách đã đăng nhập, **When** truy cập `/login` hoặc `/`, **Then** hệ thống tự động chuyển khách tới `/todo`.

**US003_BlockUnauthenticated — Happy Path**
**Given** khách chưa đăng nhập, **When** truy cập `/todo`, **Then** hệ thống tự động chuyển khách tới `/login`.

**US004_Logout — Happy Path**
**Given** khách đã đăng nhập trên `/todo`, **When** bấm "Đăng xuất", **Then** phiên bị xoá và khách quay lại `/login`.

**US005_LoginErrorMessage — Happy Path**
**Given** URL là `/login?error=...`, **When** trang `/login` tải, **Then** thông báo lỗi inline hiện ngay dưới nút Google.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Đăng nhập Google thất bại hoặc bị huỷ | Chuyển hướng về `/login?error=<code>` | "Đăng nhập không thành công. Vui lòng thử lại." |
| Tham số `next` bị chỉnh sửa để trỏ ra ngoài ứng dụng | Callback bỏ qua giá trị không hợp lệ, dùng mặc định `/todo` | "None — silent handling" |
| Khách bấm "LOGIN With Google" nhiều lần liên tiếp trong lúc đang xử lý | Nút đã vô hiệu hoá trong lúc chờ nên không gửi thêm yêu cầu | "None — nút đã vô hiệu hoá, không có thông báo" |
| Phiên hết hạn ngay trước khi vào `/todo` (race giữa guard và request thật) | Xác thực lại phía server trên `/todo` phát hiện phiên không hợp lệ, chuyển hướng `/login` | "None — silent redirect" |

## 10. Edge Behaviours to Verify

- **FR-001** → Ứng dụng đọc đúng cấu hình Supabase khi khởi động (không lỗi khởi tạo client).
- **FR-101** → Truy cập `/` chuyển hướng đúng theo trạng thái đăng nhập.
- **FR-201** → `/login` hiển thị đủ header, hero, nút Google, footer khi tải lần đầu.
- **FR-202** → Bấm nút Google khởi động luồng OAuth (điều hướng sang endpoint authorize).
- **FR-203** → Nút chuyển sang trạng thái vô hiệu hoá kèm chỉ báo tải ngay khi bấm.
- **FR-204** → Thông báo lỗi hiện đúng khi URL có `?error=`.
- **FR-301** → `/todo` hiển thị đúng email người dùng đã đăng nhập.
- **FR-302** → Bấm "Đăng xuất" xoá phiên và quay về `/login`.
- **FR-401** → Callback đổi mã xác thực hợp lệ thành phiên đăng nhập và chuyển hướng đúng đích.
- **FR-402** → Đích chuyển hướng không hợp lệ (không bắt đầu bằng `/`) bị bỏ qua, dùng mặc định.
- **FR-601** → Đã đăng nhập vào `/login` hoặc `/` → tự chuyển `/todo`.
- **FR-602** → Chưa đăng nhập vào `/todo` → tự chuyển `/login`.
- **FR-603** → `/todo` xác thực lại phía server trước khi hiển thị nội dung.

## 11. Risks & Known Issues

N/A — none found.

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Supabase Auth (instance local `saa-app`) | external-service | Toàn bộ luồng đăng nhập phụ thuộc GoTrue (PKCE, đổi mã lấy session) chạy tại `saa-app` | FR-401, FR-402 |
| Google OAuth provider (bật trên `saa-app`) | external-service | Xác thực người dùng cuối cùng qua Google; nếu client ID/secret chưa cấu hình, đăng nhập không hoạt động | Xem `clarifications.md § Unresolved` |
| F002_LanguageSwitch | feature | Bộ chọn ngôn ngữ trên header `/login` do F002 triển khai; F001 chỉ chừa chỗ (partial-screen ownership) | `feature-list.md` |

## 13. Configuration

```text
NEXT_PUBLIC_SUPABASE_URL = http://127.0.0.1:55321          # endpoint Supabase Auth (instance saa-app, local)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = <lấy từ `supabase status`>  # khoá publishable, không commit vào repo
```
