---
status: draft
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Permissions

**Project**: agentic-coding-hands-on
**Phạm vi**: forward-draft — mô tả mô hình phân quyền SAU khi PR di chuyển sang `src/`
(`.claude/skills/nextjs-route-colocation-architecture/references/migration-map.md`) merge.
Tài liệu "đã implement" hiện hành là `docs/vi/system/permissions.md`; file này không thay thế
nó, chỉ là input cho planner. **Route và trạng thái public/protected của chúng KHÔNG đổi**:
`/` public, `/login` public, `/todo` protected, `/auth/callback` ngoài ranh giới đăng
nhập/chưa đăng nhập — chỉ đổi FILE nào thực thi từng lớp guard.

> **Curated, plain-language view.** Tài liệu cho PM/BA/client, không phải nơi liệt kê mã
> PERM### hay bảng matrix — mã đầy đủ nằm ở
> [permissions-matrix.md](../../../../docs/vi/generated/permissions-matrix.md).

## Authorization System Type

**System Type**: `other` — không đổi. Trục chính vẫn là **đã đăng nhập hay chưa**; cột `role`
(`member`|`admin`) trên `public.users` vẫn chỉ là tín hiệu hiển thị UI (ẩn/hiện mục "Trang
quản trị"), chưa gác route nào — chưa đủ để xếp vào `rbac`/`hybrid`.

**Identified Roles**: `member` | `admin`, đọc server-side qua PostgREST dưới RLS own-row. Mã
phân loại cho permission-item này (`PERM###`, type `screen-permission`) vẫn `TBD (draft)` —
cấp bởi `rebuild-spec` core pass kế tiếp, không đổi vì đợt di chuyển này.

## Mô hình hai lớp guard (path mục tiêu)

Hai lớp guard tách biệt, cơ chế KHÔNG đổi — chỉ đổi file:

- **Lớp optimistic — `src/proxy.ts`** (hiện `proxy.ts`). Matcher KHÔNG đổi: `/`, `/login`,
  `/todo/:path*`, loại trừ `/auth/callback`. Chỉ đọc cookie qua `getUser()`, chỉ redirect,
  không phải nguồn sự thật.
- **Lớp authoritative — `src/app/(protected)/layout.tsx`** (MỚI). Session check qua `src/dal`
  → `redirect("/login")` khi chưa đăng nhập. Thay cho việc từng page tự gọi `getUser()`: hiện
  `app/todo/page.tsx` tự làm việc này (dòng 20-28); sau di chuyển,
  `src/app/(protected)/todo/page.tsx` bỏ đoạn guard đó, layout ở tầng cha làm thay cho mọi
  route trong nhóm `(protected)` — hiện chỉ có `/todo`, nhưng route protected mới trong tương
  lai (roadmap: admin, awards CRUD, notifications) tự động được gác cùng cơ chế mà không cần
  lặp lại code guard.
- **Role read — `src/dal/users.ts`** (hiện `lib/auth/get-user-role.ts`, thêm
  `import "server-only"`). Vẫn là NHÃN hiển thị, fail-open về `"member"` khi lỗi/không có
  row/không nhận diện được giá trị — KHÔNG phải authz gate, không đổi qua di chuyển này.

`/` gọi `src/dal/users.ts` để cá nhân hoá header (menu tài khoản hay nút "Đăng nhập"), không
qua lớp authoritative ở trên — `/` nằm ngoài nhóm route `(protected)`, đúng như hành vi hiện
tại (public, không route-guard).

## Curated View

- **Chưa đăng nhập**: xem được `/` (public). Vào `/todo` → redirect `/login` qua
  `src/app/(protected)/layout.tsx`.
- **Đã đăng nhập, `member`**: xem `/` và `/todo`; menu tài khoản trên `/` có "Hồ sơ", "Đăng
  xuất" — không có "Trang quản trị".
- **Đã đăng nhập, `admin`**: thêm mục "Trang quản trị" (`/admin`) trong menu — route này CHƯA
  tồn tại (404 cho tới khi được xây), không phải lỗi phân quyền.
- **Đã đăng nhập**: vào `/login` → redirect `/` (qua `src/proxy.ts`, không đổi).
- **Không ai** xem hoặc sửa được quyền/thông tin của tài khoản khác — RLS own-row trên
  `public.users`, không đổi.

Không nội dung nào trong mục này đổi so với `docs/vi/system/permissions.md` hiện hành — di
chuyển chỉ đổi file thực thi, không đổi ai xem được gì.

## Access Boundaries

Ranh giới chính vẫn là đăng nhập hay chưa, áp dụng cho `/login` và `/todo` — không đổi phạm
vi so với hiện tại. `PERM001_RootRouteGuard` (mã trong
[permissions-matrix.md](../../../../docs/vi/generated/permissions-matrix.md)) tiếp tục ở
trạng thái **superseded** — không đổi qua đợt di chuyển này, `/` vẫn không có route-guard.

`src/proxy.ts` tiếp tục chạy qua cả `/` (refresh session cookie mỗi lượt ghé) dù không redirect
gắn với route này — khớp hành vi `proxy.ts` hiện tại.

URL path tập trung về `src/constants/routes.ts` (mới, PR3) thay cho literal rải rác trong
proxy, các page, hook, và test — không đổi giá trị path, chỉ gom một chỗ.

`src/app/auth/callback/route.ts` (hiện `app/auth/callback/route.ts`) vẫn ngoài ranh giới đăng
nhập/chưa đăng nhập — không đổi.

## Special Conditions

- **Fail-open/fail-closed bất đối xứng** giữa `/login` (fail-open) và `/todo` (fail-closed) —
  không đổi.
- **`safeNextPath`** — cơ chế chống mở-redirect không đổi, chỉ đổi vị trí file: từ
  `lib/supabase/next-path.ts` sang `src/utils/url/next-path.ts` (phân loại lại: đây là
  business-agnostic utility, không phải vendor glue cho Supabase).
- **Role fail-open về `member`** — không đổi, xem § Mô hình hai lớp guard.
- **5 route đích Homepage liên kết chưa tồn tại**: `/awards`, `/kudos`, `/standards`,
  `/profile`, `/admin` — không đổi, ngoài phạm vi đợt di chuyển này.
- Không có time-based, IP-based, hay feature-flag nào gate quyền truy cập — không đổi.
