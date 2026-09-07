---
status: implemented
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Permissions

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-07 (cập nhật sau khi F004_AwardSystemPage `/awards` lên code thật — xem `plans/260906-2258-award-system-page/clarifications.md`)
**Analysis Scope**: `/` và `/awards` (cả hai PUBLIC, không route-guard), `/login`, `/todo`, `/auth/callback` — toàn bộ authorization surface của app. 4 route Homepage liên kết còn lại (`/kudos`, `/standards`, `/profile`, `/admin`) CHƯA tồn tại, ngoài phạm vi phân tích quyền vì chưa có code.

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

Vẫn chọn `other`, nhưng lý do đã thay đổi một phần kể từ F003_Homepage. Trục phân quyền chính vẫn là **đã đăng nhập hay chưa** — route-guard trên `/login`, `/todo`; `/` không còn nằm trong trục này (xem Access Boundaries). Điểm mới: bảng `public.users` có cột `role` (`member`|`admin`), đọc để quyết định MỘT mục hiển thị trong menu tài khoản ("Trang quản trị"). Điều này CHƯA đủ để xếp hệ thống vào `rbac`/`hybrid` — không route/resource nào thực sự bị CHẶN theo `role` trong phạm vi hiện tại: `/admin` (đích của mục menu đó) chưa tồn tại, nên `role` hiện chỉ là một tín hiệu **screen-permission cấp UI** (ẩn/hiện một link), không phải một permission-item route-level. Nếu `/admin` sau này tự gác theo `role`, hệ thống khi đó mới đúng nghĩa `hybrid`.

**Identified Roles**:

- Trước: không có role nào. Nay: có cột `role` (`member` | `admin`) trên `public.users`, đọc server-side qua PostgREST dưới RLS own-row (JWT của chính người dùng; `authenticated` đã có quyền SELECT mặc định — không cần grant mới, verify trực tiếp trên DB). Đọc **fail-open về `member`** khi lỗi hoặc không có row (rationale: xem Special Conditions). Vai trò này KHÔNG tạo route-guard mới; nó chỉ quyết định một mục ("Trang quản trị") có xuất hiện trong menu tài khoản hay không. Mã phân loại cho permission-item này (`PERM###`, type `screen-permission`) chưa được cấp — `TBD (draft)`, cấp bởi lượt `rebuild-spec` Core pass kế tiếp; không phải một con số đoán ở đây.

## Curated View

- **Người dùng chưa đăng nhập (anonymous)** giờ xem được `/` — trang chủ SAA 2025 công khai, không còn bị chuyển hướng (khác trước: `/` từng redirect thẳng sang `/login`). Header hiển thị nút "Đăng nhập" (link `/login`) ở góc phải thay vì bell/menu tài khoản. `/todo` vẫn bị chặn như cũ — mọi cố gắng vào `/todo` vẫn chuyển hướng ngay về `/login`.
- **Người dùng chưa đăng nhập (anonymous)** cũng xem được `/awards` (F004_AwardSystemPage) — trang chi tiết 6 hạng mục giải thưởng mà `/` chỉ tóm tắt qua thẻ. Cùng một PUBLIC-by-design như `/`, không redirect nào, không phân biệt vai trò.
- **Người dùng đã đăng nhập bằng Google, vai trò `member`** xem được `/` và `/todo` như nhau; menu tài khoản trên `/` có "Hồ sơ", "Đăng xuất" — KHÔNG có "Trang quản trị".
- **Người dùng đã đăng nhập, vai trò `admin`** có thêm mục "Trang quản trị" (`/admin`) trong menu tài khoản — mục này hiện dẫn tới một route CHƯA implement (404 cho tới khi được xây), không phải một lỗi phân quyền.
- **Người đã đăng nhập** không thể quay lại xem `/login` — tự động chuyển hướng, nhưng đích đã đổi: sang `/` (trước đây là `/todo`). Ngược lại, người đã đăng nhập VẪN xem được `/` bình thường — khác hành vi cũ (trước đây `/` cũng redirect người đã đăng nhập, sang `/todo`).
- **Không ai** — dù đã đăng nhập hay chưa, dù vai trò gì — có thể xem hoặc chỉnh sửa quyền/thông tin của một tài khoản khác. RLS own-row trên `public.users` đảm bảo mỗi người chỉ đọc được đúng hàng của chính mình; không có API nào trong app trả dữ liệu role/profile của người khác.

## Access Boundaries

Ranh giới truy cập chính vẫn là **đăng nhập hay chưa**, nhưng phạm vi áp dụng đã THU HẸP: trước đây `/` cũng là một route-guard (PERM001_RootRouteGuard — mã hiện có trong [permissions-matrix.md](../generated/permissions-matrix.md), redirect hai chiều theo trạng thái đăng nhập); nay `/` không còn route-guard nào — nó là nội dung công khai cho mọi actor. PERM001_RootRouteGuard vì vậy **hết hiệu lực** (superseded) — mã này KHÔNG bị xoá khỏi `permissions-matrix.md`, chỉ được đánh dấu superseded ngay tại đó (giữ lại cho lịch sử, cùng nguyên tắc mọi mã machine-owned khác trong repo).

`/` VẪN đọc trạng thái đăng nhập (và, khi đã đăng nhập, đọc `role`) — nhưng chỉ để CÁ NHÂN HÓA giao diện (hiện bell + menu tài khoản hay nút đăng nhập; hiện hay ẩn "Trang quản trị"), không phải để quyết định có được xem trang hay không. Một route-guard chặn nội dung; một personalization-read chỉ đổi NỘI DUNG HIỂN THỊ trong khi trang chính luôn render cho mọi actor — đây là khác biệt cốt lõi giữa PERM001 (cũ) và hành vi mới.

**Vì sao `/` chuyển sang public** (quyết định 2026-09-06, xem `clarifications.md`): Homepage SAA là trang giới thiệu sự kiện (giải thưởng, đếm ngược, thông tin sự kiện) — nội dung vốn dành cho toàn bộ nhân viên kể cả trước khi họ đăng nhập; không có lý do nghiệp vụ nào để khoá nó sau route-guard, và giữ guard sẽ buộc khách chưa đăng nhập phải qua `/login` mới xem được thông tin quảng bá công khai — ngược mục đích của trang. Route-guard vẫn giữ nguyên ở `/todo` vì đó là nội dung có tính cá nhân (dù hiện chỉ là placeholder).

**`/awards` (F004_AwardSystemPage) tham gia đúng nhóm PUBLIC này** (quyết định 2026-09-06,
`plans/260906-2258-award-system-page/clarifications.md`) — cùng lý do trên áp dụng nguyên vẹn:
`/awards` chi tiết hoá đúng 6 hạng mục giải mà `/` đã quảng bá tóm tắt qua thẻ; khoá nó lại sau
route-guard sẽ đá khách chưa đăng nhập ra khỏi chính nội dung mà 6 link công khai trên `/`
(header/footer/CTA/thẻ giải) đang mời họ xem. Danh sách route KHÔNG qua route-guard giờ là:
`/`, `/awards`.

**MoMorph TC ID-1 bị supersede (ĐÃ CHỐT 2026-09-07):** test case gốc của F004 kỳ vọng khách chưa
đăng nhập bị redirect `/login` khi vào `/awards`. Quyết định kiến trúc "SAA event/award marketing
content is public" ở trên ghi đè kỳ vọng này — cùng cách PERM001_RootRouteGuard đã supersede cho
`/`. Ba lý do, theo thứ tự sức nặng:

1. **Không có gì để bảo vệ.** Sáu hạng mục giải là nội dung quảng bá nội bộ — tên, mô tả, số
   lượng, giá trị giải. Không PII, không dữ liệu thuộc về một cá nhân nào. Gác một trang không
   có gì bí mật là gác cho có.
2. **Gác nó sẽ phá `/`.** Trang chủ đã công khai và header/footer/CTA của nó có 6 link trỏ
   `/awards`. Gác lại nghĩa là khách chưa đăng nhập bấm "Award Information" ngay trên một trang
   công khai thì bị đá sang `/login` — ngược mục đích của trang giới thiệu sự kiện.
3. **Đã có tiền lệ đúng y hệt.** Quyết định 2026-09-06 mở công khai `/` nêu đích danh "giải
   thưởng" trong lý lẽ của nó. `/awards` là đúng loại nội dung đó, chỉ chi tiết hơn.

TC ID-1 nhiều khả năng viết theo mặc định "màn hình trong hệ thống thì phải đăng nhập", trước khi
team chốt `/` công khai — cùng vệt với việc `/` từng redirect sang `/login` rồi bị bỏ. TC ID-0
(đã đăng nhập xem được `/awards`) vẫn thoả nguyên vẹn.

**Bảng `public.awards` không tạo permission-item mới:** RLS `awards_select_all` mở SELECT cho cả
`anon` và `authenticated`, không phân nhánh theo `role` — bảng này không chứa PII (chỉ nội dung
giải thưởng tĩnh: tiêu đề, mô tả, số lượng, giá trị), nên GRANT rộng là chủ đích, không phải một
khoảng trống bảo mật. Hệ thống vẫn giữ nguyên phân loại `other` (§ Authorization System Type) —
F004 không đổi trục phân quyền.

Hai lớp kiểm tra optimistic (`src/proxy.ts`) + authoritative vẫn áp dụng nguyên vẹn cho `/login` và `/todo`; `src/proxy.ts` vẫn giữ `/` trong danh sách route chạy qua để refresh session cookie mỗi lượt ghé (tránh session gần hết hạn không được gia hạn tới khi khách vào `/todo`/`/login`) nhưng KHÔNG còn redirect nào gắn với `/` ở cả hai lớp.

**Cập nhật 2026-09-06 (route colocation)**: lớp authoritative của `/todo` không còn nằm trong bản thân trang — `src/app/(protected)/layout.tsx` (mới) là điểm gác DUY NHẤT cho mọi route trong nhóm `(protected)`, đọc session qua `src/dal/auth.ts` (`getCurrentUser`) rồi `redirect("/login")` khi chưa đăng nhập, trước khi `src/app/(protected)/todo/page.tsx` render. `/login` không nằm trong nhóm `(protected)` nên không qua layout này — trang tự gọi lại `getCurrentUser()` và `redirect` về `/` nếu đã đăng nhập, như cơ chế cũ. Route/URL/hành vi quan sát được không đổi — chỉ đổi file nào thực thi từng lớp.

`/auth/callback` (`src/app/auth/callback/route.ts`) vẫn nằm ngoài ranh giới đăng nhập/chưa đăng nhập như trước — không đổi; chỉ đổi giá trị mặc định của `safeNextPath` (`src/utils/url/next-path.ts`, xem Special Conditions).

## Special Conditions

- **Bất đối xứng fail-open/fail-closed giữa `/login` và `/todo`** — không đổi so với trước: `/login` fail mở (Supabase lỗi vẫn hiện form, coi như chưa đăng nhập), `/todo` fail đóng (Supabase lỗi thì không có đường nào lộ nội dung bảo vệ).
- **Chống mở-redirect (`safeNextPath`) ở `/auth/callback`** — cơ chế không đổi (same-origin, root-relative-only; chặn `//`, `/\`, `://`, control/line-separator char thô hoặc percent-encoded); chỉ đổi GIÁ TRỊ mặc định khi `?next=` thiếu hoặc không hợp lệ: từ `/todo` sang `/` (khớp đích đăng nhập mặc định mới).
- **Nhãn vai trò (`role`) đọc fail-open về `member`** (`src/dal/users.ts`, hàm `getUserRole`) — nếu PostgREST lỗi, timeout, hoặc không có row cho user, hệ thống coi như `member` thay vì chặn trang hoặc hiện lỗi. Rationale: đây là một NHÃN hiển thị (ẩn/hiện một mục menu), không phải một cổng bảo vệ tài nguyên — chặn cả trang chủ chỉ vì không đọc được `role` sẽ tệ hơn nhiều so với việc một admin thấy tạm thời thiếu mục "Trang quản trị" trong một request lỗi thoáng qua. Cùng triết lý với `/login` fail-open ở trên: ưu tiên không khoá người dùng ngoài ý muốn hơn là phòng thủ tuyệt đối cho một chi tiết hiển thị.
- **4 route đích được Homepage liên kết chưa tồn tại**: `/kudos`, `/standards`, `/profile`, `/admin` — tất cả trả 404 cho tới khi từng screen được implement (mỗi cái là một MoMorph screen riêng, việc của các phiên sau; `/awards` đã ra khỏi danh sách này kể từ F004_AwardSystemPage). Đây KHÔNG phải khoảng trống phân quyền — không có route nghĩa là không có gì để phân quyền; ghi nợ tại `clarifications.md § Unresolved` (TC ID-59). Nút "Chi tiết" của khối Kudos trên cả `/` và `/awards` cùng trỏ `/kudos`, cùng 404 tạm thời — không phải khoảng trống phân quyền mới. Khi `/admin` được xây, cần quyết định RIÊNG có nên thêm route-guard theo `role` hay không (hiện KHÔNG có — mục menu chỉ ẩn/hiện, chưa gác route) — ngoài phạm vi phiên làm việc này.
- **Fail-open cho nội dung giải, không phải cho quyền truy cập (F004):** DAL `getAwards` fail-open trả `[]` khi Supabase lỗi — đây là fail-open NỘI DUNG (empty-state), không phải fail-open QUYỀN (trang vẫn luôn public, không có nhánh nào biến `/awards` thành protected khi lỗi). Cùng triết lý `getUserRole` fail-open `"member"` ở F003: một lỗi đọc dữ liệu không được phép biến thành một quyết định phân quyền.
- Không có time-based restriction, IP-based rule, hay feature-flag nào gate quyền truy cập — không đổi. Biến môi trường mới `EVENT_START_AT` (đếm ngược sự kiện) KHÔNG phải một permission env-gate — nó chỉ đổi chữ hiển thị ("Coming soon" ẩn/hiện, số đếm ngược), không chặn hay mở bất kỳ route/nội dung nào.
