---
status: draft
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Permissions

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-06 (forward-draft — bổ sung Homepage SAA `/`, xem `plans/260906-0042-homepage-saa-page/clarifications.md`)
**Analysis Scope**: `/` (nay PUBLIC, không còn route-guard — planned), `/login`, `/todo`, `/auth/callback` — toàn bộ authorization surface của app. 5 route Homepage liên kết tới (`/awards`, `/kudos`, `/standards`, `/profile`, `/admin`) CHƯA tồn tại, ngoài phạm vi phân tích quyền vì chưa có code.

> **Curated, plain-language view.** This document is for PM, BA, and client audiences who
> need to understand access without reading raw codes. The raw PERM### matrix lives at
> [permissions-matrix.md](../generated/permissions-matrix.md). Derive this prose FROM that matrix.
> No PERM### codes and no matrix tables belong here.

## Authorization System Type

**System Type**: `other`

The primary authorization system used by this project:

| System Type | Description |
|-------------|-------------|
| `rbac` | Role-Based Access Control — roles (admin, user, manager) drive access |
| `abac` | Attribute-Based Access Control — policies on attributes (department, owner, status) |
| `acl` | Access Control List — explicit per-user permissions |
| `ownership` | Resource Ownership — owner_id / created_by / can_edit rules |
| `hybrid` | Mixed — roles combined with ownership checks |
| `other` | Custom permission logic |

Vẫn chọn `other`, nhưng lý do đã thay đổi một phần (forward-draft). Trục phân quyền chính vẫn là **đã đăng nhập hay chưa** — route-guard trên `/login`, `/todo`; `/` không còn nằm trong trục này (xem Access Boundaries). Điểm mới: bảng `public.users` sẽ có cột `role` (`member`|`admin`, planned), đọc để quyết định MỘT mục hiển thị trong menu tài khoản ("Trang quản trị"). Điều này CHƯA đủ để xếp hệ thống vào `rbac`/`hybrid` — không route/resource nào thực sự bị CHẶN theo `role` trong phạm vi hiện tại: `/admin` (đích của mục menu đó) chưa tồn tại, nên `role` hiện chỉ là một tín hiệu **screen-permission cấp UI** (ẩn/hiện một link), không phải một permission-item route-level. Nếu `/admin` sau này tự gác theo `role`, hệ thống khi đó mới đúng nghĩa `hybrid`.

**Identified Roles**:

- Trước: không có role nào. Nay (planned): có cột `role` (`member` | `admin`) trên `public.users`, đọc server-side qua PostgREST dưới RLS own-row (JWT của chính người dùng; `authenticated` đã có quyền SELECT mặc định — không cần grant mới, verify trực tiếp trên DB). Đọc **fail-open về `member`** khi lỗi hoặc không có row (rationale: xem Special Conditions). Vai trò này KHÔNG tạo route-guard mới; nó chỉ quyết định một mục ("Trang quản trị") có xuất hiện trong menu tài khoản hay không. Mã phân loại cho permission-item này (`PERM###`, type `screen-permission`) chưa được cấp — `TBD (draft)`, cấp khi rebuild-spec Core pass chạy lại sau khi tính năng lên code thật; không phải một con số đoán ở đây.

## Curated View

- **Người dùng chưa đăng nhập (anonymous)** giờ xem được `/` — trang chủ SAA 2025 công khai, không còn bị chuyển hướng (khác trước: `/` từng redirect thẳng sang `/login`). Header hiển thị nút "Đăng nhập" (link `/login`) ở góc phải thay vì bell/menu tài khoản. `/todo` vẫn bị chặn như cũ — mọi cố gắng vào `/todo` vẫn chuyển hướng ngay về `/login`.
- **Người dùng đã đăng nhập bằng Google, vai trò `member`** xem được `/` và `/todo` như nhau; menu tài khoản trên `/` có "Hồ sơ", "Đăng xuất" — KHÔNG có "Trang quản trị".
- **Người dùng đã đăng nhập, vai trò `admin`** có thêm mục "Trang quản trị" (`/admin`) trong menu tài khoản — mục này hiện dẫn tới một route CHƯA implement (404 cho tới khi được xây), không phải một lỗi phân quyền.
- **Người đã đăng nhập** không thể quay lại xem `/login` — tự động chuyển hướng, nhưng đích đã đổi: sang `/` (trước đây là `/todo`). Ngược lại, người đã đăng nhập VẪN xem được `/` bình thường — khác hành vi cũ (trước đây `/` cũng redirect người đã đăng nhập, sang `/todo`).
- **Không ai** — dù đã đăng nhập hay chưa, dù vai trò gì — có thể xem hoặc chỉnh sửa quyền/thông tin của một tài khoản khác. RLS own-row trên `public.users` đảm bảo mỗi người chỉ đọc được đúng hàng của chính mình; không có API nào trong app trả dữ liệu role/profile của người khác.

## Access Boundaries

Ranh giới truy cập chính vẫn là **đăng nhập hay chưa**, nhưng phạm vi áp dụng đã THU HẸP: trước đây `/` cũng là một route-guard (PERM001_RootRouteGuard — mã hiện có trong [permissions-matrix.md](../generated/permissions-matrix.md), redirect hai chiều theo trạng thái đăng nhập); nay `/` không còn route-guard nào — nó là nội dung công khai cho mọi actor. PERM001_RootRouteGuard vì vậy **hết hiệu lực** (superseded); mã này KHÔNG bị xoá khỏi tài liệu ở draft này (draft không được ghi `docs/generated/*`) — việc đánh dấu lại `superseded` trong `permissions-matrix.md` là việc của rebuild-spec Core pass sau khi tính năng lên code thật.

`/` VẪN đọc trạng thái đăng nhập (và, khi đã đăng nhập, đọc `role`) — nhưng chỉ để CÁ NHÂN HÓA giao diện (hiện bell + menu tài khoản hay nút đăng nhập; hiện hay ẩn "Trang quản trị"), không phải để quyết định có được xem trang hay không. Một route-guard chặn nội dung; một personalization-read chỉ đổi NỘI DUNG HIỂN THỊ trong khi trang chính luôn render cho mọi actor — đây là khác biệt cốt lõi giữa PERM001 (cũ) và hành vi mới.

**Vì sao `/` chuyển sang public** (quyết định 2026-09-06, xem `clarifications.md`): Homepage SAA là trang giới thiệu sự kiện (giải thưởng, đếm ngược, thông tin sự kiện) — nội dung vốn dành cho toàn bộ nhân viên kể cả trước khi họ đăng nhập; không có lý do nghiệp vụ nào để khoá nó sau route-guard, và giữ guard sẽ buộc khách chưa đăng nhập phải qua `/login` mới xem được thông tin quảng bá công khai — ngược mục đích của trang. Route-guard vẫn giữ nguyên ở `/todo` vì đó là nội dung có tính cá nhân (dù hiện chỉ là placeholder).

Hai lớp kiểm tra optimistic (`proxy.ts`) + authoritative (component tự gọi lại) vẫn áp dụng nguyên vẹn cho `/login` và `/todo`; `proxy.ts` vẫn giữ `/` trong danh sách route chạy qua để refresh session cookie mỗi lượt ghé (tránh session gần hết hạn không được gia hạn tới khi khách vào `/todo`/`/login`) nhưng KHÔNG còn redirect nào gắn với `/` ở cả hai lớp.

`/auth/callback` vẫn nằm ngoài ranh giới đăng nhập/chưa đăng nhập như trước — không đổi; chỉ đổi giá trị mặc định của `safeNextPath` (xem Special Conditions).

## Special Conditions

- **Bất đối xứng fail-open/fail-closed giữa `/login` và `/todo`** — không đổi so với trước: `/login` fail mở (Supabase lỗi vẫn hiện form, coi như chưa đăng nhập), `/todo` fail đóng (Supabase lỗi thì không có đường nào lộ nội dung bảo vệ).
- **Chống mở-redirect (`safeNextPath`) ở `/auth/callback`** — cơ chế không đổi (same-origin, root-relative-only; chặn `//`, `/\`, `://`, control/line-separator char thô hoặc percent-encoded); chỉ đổi GIÁ TRỊ mặc định khi `?next=` thiếu hoặc không hợp lệ: từ `/todo` sang `/` (khớp đích đăng nhập mặc định mới).
- **Nhãn vai trò (`role`) đọc fail-open về `member`** (mới, planned) — nếu PostgREST lỗi, timeout, hoặc không có row cho user, hệ thống coi như `member` thay vì chặn trang hoặc hiện lỗi. Rationale: đây là một NHÃN hiển thị (ẩn/hiện một mục menu), không phải một cổng bảo vệ tài nguyên — chặn cả trang chủ chỉ vì không đọc được `role` sẽ tệ hơn nhiều so với việc một admin thấy tạm thời thiếu mục "Trang quản trị" trong một request lỗi thoáng qua. Cùng triết lý với `/login` fail-open ở trên: ưu tiên không khoá người dùng ngoài ý muốn hơn là phòng thủ tuyệt đối cho một chi tiết hiển thị.
- **5 route đích được Homepage liên kết chưa tồn tại**: `/awards`, `/kudos`, `/standards`, `/profile`, `/admin` — tất cả trả 404 cho tới khi từng screen được implement (mỗi cái là một MoMorph screen riêng, việc của các phiên sau). Đây KHÔNG phải khoảng trống phân quyền — không có route nghĩa là không có gì để phân quyền; ghi nợ tại `clarifications.md § Unresolved` (TC ID-59). Khi `/admin` được xây, cần quyết định RIÊNG có nên thêm route-guard theo `role` hay không (hiện KHÔNG có — mục menu chỉ ẩn/hiện, chưa gác route) — ngoài phạm vi phiên làm việc này.
- Không có time-based restriction, IP-based rule, hay feature-flag nào gate quyền truy cập — không đổi. Biến môi trường mới `EVENT_START_AT` (đếm ngược sự kiện, planned) KHÔNG phải một permission env-gate — nó chỉ đổi chữ hiển thị ("Coming soon" ẩn/hiện, số đếm ngược), không chặn hay mở bất kỳ route/nội dung nào.
