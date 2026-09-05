# Permissions

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: `/`, `/login`, `/todo`, `/auth/callback` — toàn bộ authorization surface hiện có của app

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

Chọn `other` vì hệ thống không khớp bất kỳ mục nào ở trên: không có role (loại `rbac`/`hybrid`), không có policy theo thuộc tính (loại `abac`), không có bảng quyền theo từng user (loại `acl`), và không có cột `owner_id`/`created_by` nào để check ownership (loại `ownership`) — placeholder `/todo` chưa có dữ liệu todo thật, nên chưa có khái niệm "item của ai". Toàn bộ hệ thống chỉ có đúng MỘT trục phân quyền: **đã đăng nhập hay chưa**.

**Identified Roles**:

- Không có role nào trong hệ thống. Đây không phải một khoảng trống coverage — codebase thực sự không có bảng role, không có cột `role`/`permission` trong data model, không có RBAC middleware nào. Trục duy nhất quyết định quyền truy cập là trạng thái đăng nhập (anonymous / authenticated), không phải vai trò tổ chức.

## Curated View

- **Người dùng chưa đăng nhập (anonymous)** chỉ xem được `/login` — mọi cố gắng vào `/` hoặc `/todo` đều bị chuyển hướng ngay về `/login`, kể cả trước khi trang kịp render. Không có ngoại lệ nào theo tài khoản hay vai trò, vì hệ thống không phân biệt tài khoản.
- **Người dùng đã đăng nhập bằng Google** (bất kỳ tài khoản Google hợp lệ nào, không phân biệt) có thể vào `/todo` và xem placeholder chào mừng theo email kèm nút đăng xuất. Mọi tài khoản đã đăng nhập có đúng một mức quyền như nhau — không có tài khoản nào "cao cấp" hơn tài khoản khác.
- **Người đã đăng nhập** không thể quay lại xem `/` hay `/login` — cả hai tự động chuyển hướng sang `/todo`, tránh hiển thị lại form đăng nhập cho người đã có phiên hợp lệ.
- **Không ai** — dù đã đăng nhập hay chưa — có thể xem hoặc chỉnh sửa quyền/thông tin của một tài khoản khác, vì hệ thống không có khái niệm "tài khoản khác": không danh sách user, không admin panel, không API nào trả dữ liệu của user thứ hai.

## Access Boundaries

Ranh giới truy cập duy nhất trong hệ thống là **đăng nhập hay chưa** — không có ranh giới kiểu admin-vs-user hay owner-vs-owner. Việc kiểm tra này chạy hai lớp trên mỗi route được bảo vệ: một lớp optimistic (`proxy.ts`, chạy trước khi trang render, dựa trên cookie session) và một lớp authoritative (chính trang đó tự hỏi lại Supabase mỗi request) — lớp sau không bao giờ tin riêng kết quả của lớp trước.

`/todo` hiện chỉ là trang placeholder (chưa có tính năng todo thật), nên chưa có ranh giới "ai sở hữu item nào" cần phân quyền tiếp — nếu tương lai có todo item thật gắn với từng user, hệ thống sẽ cần bổ sung ownership check mà **hiện tại không tồn tại trong code**.

`/auth/callback` không nằm trong ranh giới đăng nhập/chưa đăng nhập nói trên — nó là điểm hoàn tất OAuth, không yêu cầu tiền điều kiện session, và tự quyết định redirect dựa trên kết quả trao đổi mã PKCE với Supabase.

## Special Conditions

- **Bất đối xứng có chủ đích khi Supabase gặp sự cố**: `/login` fail **mở** — nếu không hỏi được Supabase, trang vẫn hiển thị form đăng nhập bình thường (coi như chưa đăng nhập), vì đây là cổng vào duy nhất của app và không được phép khoá hẳn người dùng ở ngoài. Ngược lại `/todo` fail **đóng** — nếu không hỏi được Supabase, hệ thống không có đường nào lộ nội dung được bảo vệ ra ngoài; đây là lựa chọn an toàn hơn cho nội dung cần bảo vệ. Đây là hai hành vi khác nhau có chủ đích, không phải một bên bị thiếu xử lý lỗi.
- **Chống mở-redirect (open redirect) ở bước hoàn tất đăng nhập**: sau khi trao đổi mã OAuth thành công tại `/auth/callback`, hệ thống cho phép quay lại một đường dẫn được yêu cầu trước đó (`?next=`) — nhưng giá trị này đến từ URL, không đáng tin. Trước khi dùng, hệ thống chỉ chấp nhận đường dẫn nội bộ (cùng domain, bắt đầu bằng đúng một dấu `/`); bất kỳ giá trị nào trông như dẫn ra ngoài hoặc chứa ký tự bất thường đều bị thay bằng đường dẫn mặc định `/todo`. Đây là một biện pháp bảo mật, không phải một luật phân quyền theo vai trò.
- Không có time-based restriction, không có IP-based rule, không có feature flag nào gate tính năng trong scope hiện tại (đã xác minh trực tiếp trên source — xem [permissions-matrix.md](../generated/permissions-matrix.md) § Client-Side Gate Types).
