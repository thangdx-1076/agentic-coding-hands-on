---
status: implemented
authored_by: takumi
created: 2026-09-06
lang: vi
---
<!--
RECONCILED (F010_SecretBoxModal, plans/260908-1337-secret-box-modal): mục cuối file bên dưới
("Bổ sung dự kiến — SecretBoxModal") đã được đối chiếu lại với as-built sau khi feature merge —
không còn là forward-draft. Mọi dòng gốc phía trên giữ nguyên 100%.
-->


# Permissions

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-07 (cập nhật sau khi F006_ProfilePage `/profile` lên code thật — xem `plans/260907-1224-profile-page/clarifications.md`; đồng thời vá khoảng lệch có trước F006: `/standards` đã lên code PUBLIC từ F005_StandardsRulesPage nhưng file này chưa từng phản ánh điều đó)
**Analysis Scope**: `/`, `/awards`, `/standards`, `/kudos` (cả bốn PUBLIC, không route-guard), `/login`, `/todo`, `/profile` (route-guard, nhóm `(protected)`, mới từ F006_ProfilePage), `/auth/callback` — toàn bộ authorization surface của app. Route Homepage liên kết còn lại (`/admin`) CHƯA tồn tại, ngoài phạm vi phân tích quyền vì chưa có code (menu "Trang quản trị" vẫn render `href="/admin"` cho `role="admin"` — dead link 404, xem `src/app/_components/account-menu.tsx:90-100`).

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
- **Người dùng đã đăng nhập, vai trò `admin`** có thêm mục "Trang quản trị" (`/admin`) trong menu tài khoản — mục này hiện dẫn tới một route CHƯA implement (404 cho tới khi được xây), không phải một lỗi phân quyền. **Dead link đã xác nhận trong code:** `src/app/_components/account-menu.tsx:90-100` render `href="/admin"` vô điều kiện khi `isAdmin` — không có kiểm tra route tồn tại; `/admin` không có trong `src/app/**` và `ROUTES` (`src/constants/routes.ts`) không có entry `ADMIN`, nên bấm mục này 404 thật cho mọi admin cho tới khi route được xây.
- **Người đã đăng nhập** không thể quay lại xem `/login` — tự động chuyển hướng, nhưng đích đã đổi: sang `/` (trước đây là `/todo`). Ngược lại, người đã đăng nhập VẪN xem được `/` bình thường — khác hành vi cũ (trước đây `/` cũng redirect người đã đăng nhập, sang `/todo`).
- **Không ai** — dù đã đăng nhập hay chưa, dù vai trò gì — có thể xem hoặc chỉnh sửa quyền/thông tin của một tài khoản khác qua `public.users` trực tiếp. RLS own-row trên `public.users` đảm bảo mỗi người chỉ đọc được đúng hàng của chính mình qua bảng đó; không có API nào trong app trả `email`/`role` của người khác.
- **Người dùng đã đăng nhập** (bất kỳ vai trò nào) xem được `/profile` — hồ sơ của chính mình
  (không tham số) hoặc hồ sơ MỘT Sunner khác qua `?id={uuid}` hợp lệ (F006_ProfilePage, mới). Đây
  là ngoại lệ DUY NHẤT cho câu "không ai xem được thông tin của một tài khoản khác" ở trên:
  `/profile?id=...` cho xem đúng `id, full_name, avatar_url` của người đó — KHÔNG BAO GIỜ `email`
  hay `role` — qua 1 view mới (`public.profile_cards`, xem Access Boundaries bên dưới). `?id=` sai
  định dạng, lặp key, hoặc không khớp Sunner nào đều trả "Not found", không lộ lỗi hệ thống.
  **Người dùng chưa đăng nhập** bị chặn `/profile` giống hệt `/todo` — chuyển hướng ngay `/login`.

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
   `/awards`. Gác lại nghĩa là khách chưa đăng nhập bấm "Awards Information" ngay trên một trang
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

**`/profile` (F006_ProfilePage) gia nhập ĐÚNG nhóm `(protected)` mà đoạn "route colocation" ở
trên mô tả** — KHÔNG có gate riêng, KHÔNG có mã machine-owned mới cho chính route-guard này
(route-guard vẫn là `(protected)/layout.tsx`, chỉ thêm 1 route con vào danh sách nó bảo vệ, cùng
cơ chế `/todo`). Điểm THẬT SỰ MỚI là 1 ranh giới đọc dữ liệu, không phải 1 ranh giới route:
migration `0005` thêm view `public.profile_cards` — chạy với quyền của owner (role có `BYPASSRLS`,
không phải người gọi), phơi ra ĐÚNG 3 cột (`id, full_name, avatar_url`) của MỌI hàng
`public.users` cho `authenticated` (không `anon`), và giữ kín `email`/`role`/`locale` — khác hẳn
RLS own-row (`users_select_own`) đang áp dụng cho chính `public.users`. Đây là ranh giới đọc THỨ 2
của toàn hệ thống (sau RLS own-row) — không phải `rbac`/`abac` mới, chỉ là 1 view giới hạn cột cho
1 nhu cầu hiển thị cụ thể (xem `docs/vi/features/F006_ProfilePage/technical-spec.md` § 3.1 cho cơ
chế đầy đủ). `src/proxy.ts` cũng thêm `/profile` vào `config.matcher` VÀ mở rộng `isProtectedPage`
khỏi phép so khớp `startsWith(ROUTES.TODO)` đơn lẻ thành so khớp theo danh sách
(`PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE]`) — cùng lý do `/todo` đã có, không phải 1 cơ
chế mới.

`/auth/callback` (`src/app/auth/callback/route.ts`) vẫn nằm ngoài ranh giới đăng nhập/chưa đăng nhập như trước — không đổi; chỉ đổi giá trị mặc định của `safeNextPath` (`src/utils/url/next-path.ts`, xem Special Conditions).

## Special Conditions

- **Bất đối xứng fail-open/fail-closed giữa `/login` và `/todo`** — không đổi so với trước: `/login` fail mở (Supabase lỗi vẫn hiện form, coi như chưa đăng nhập), `/todo` fail đóng (Supabase lỗi thì không có đường nào lộ nội dung bảo vệ).
- **Chống mở-redirect (`safeNextPath`) ở `/auth/callback`** — cơ chế không đổi (same-origin, root-relative-only; chặn `//`, `/\`, `://`, control/line-separator char thô hoặc percent-encoded); chỉ đổi GIÁ TRỊ mặc định khi `?next=` thiếu hoặc không hợp lệ: từ `/todo` sang `/` (khớp đích đăng nhập mặc định mới).
- **Nhãn vai trò (`role`) đọc fail-open về `member`** (`src/dal/users.ts`, hàm `getUserRole`) — nếu PostgREST lỗi, timeout, hoặc không có row cho user, hệ thống coi như `member` thay vì chặn trang hoặc hiện lỗi. Rationale: đây là một NHÃN hiển thị (ẩn/hiện một mục menu), không phải một cổng bảo vệ tài nguyên — chặn cả trang chủ chỉ vì không đọc được `role` sẽ tệ hơn nhiều so với việc một admin thấy tạm thời thiếu mục "Trang quản trị" trong một request lỗi thoáng qua. Cùng triết lý với `/login` fail-open ở trên: ưu tiên không khoá người dùng ngoài ý muốn hơn là phòng thủ tuyệt đối cho một chi tiết hiển thị.
- **1 route đích được Homepage liên kết chưa tồn tại**: `/admin` — trả 404 cho tới khi được implement (`/awards` đã ra khỏi danh sách này kể từ F004_AwardSystemPage, `/standards` kể từ F005_StandardsRulesPage, `/profile` kể từ F006_ProfilePage, `/kudos` kể từ F007_KudosLiveBoard — 4 route này nay đều có code thật). Đây KHÔNG phải khoảng trống phân quyền — không có route nghĩa là không có gì để phân quyền; ghi nợ tại `clarifications.md § Unresolved` (TC ID-59). Nút "Chi tiết" của khối Kudos trên `/`, `/awards`, `/standards`, `/profile` cùng trỏ `/kudos` — route này nay đã live (F007_KudosLiveBoard), không còn 404. Khi `/admin` được xây, cần quyết định RIÊNG có nên thêm route-guard theo `role` hay không (hiện KHÔNG có — mục menu chỉ ẩn/hiện, chưa gác route) — ngoài phạm vi phiên làm việc này.
- **Fail-open cho việc đọc hồ sơ, không phải cho quyền truy cập (F006):** `getProfileCard`
  (`src/dal/profile-cards.ts`) fail-open trả `null` khi Supabase lỗi HOẶC khi không có hàng khớp
  `id` — cả 2 nguyên nhân dẫn tới CÙNG một hành vi quan sát được (`notFound()`, trang "Not
  found"). Đây là fail-open NỘI DUNG (không tìm thấy gì để hiển thị), không phải một quyết định
  phân quyền: KHÔNG có nhánh nào biến `/profile` thành công khai hay thành bị chặn dựa trên lỗi
  đọc — gate đăng nhập của `(protected)/layout.tsx` không đổi bất kể `getProfileCard` có lỗi hay
  không. Cùng triết lý `getAwards`/`getUserRole` đã ghi ở trên.
- **Fail-open cho nội dung giải, không phải cho quyền truy cập (F004):** DAL `getAwards` fail-open trả `[]` khi Supabase lỗi — đây là fail-open NỘI DUNG (empty-state), không phải fail-open QUYỀN (trang vẫn luôn public, không có nhánh nào biến `/awards` thành protected khi lỗi). Cùng triết lý `getUserRole` fail-open `"member"` ở F003: một lỗi đọc dữ liệu không được phép biến thành một quyết định phân quyền.
- **Cập nhật (CountdownPrelaunchPage): nay CÓ một feature-flag gate quyền truy cập** — dòng gốc bên
  dưới không còn đúng nguyên vẹn, giữ lại để thấy sự thay đổi. `EVENT_START_AT` một mình KHÔNG phải
  permission env-gate — nó chỉ đổi chữ hiển thị. Nhưng cờ MỚI `PRELAUNCH_LOCK_ENABLED`, kết hợp
  `EVENT_START_AT` chưa về mốc, LÀ một `env-gate`/`feature-flag` chặn thật (redirect toàn site về
  `/prelaunch`) — xem § "Bổ sung dự kiến — CountdownPrelaunchPage" bên dưới cho chi tiết đầy đủ.
- Không có time-based restriction hay IP-based rule nào khác gate quyền truy cập — không đổi.
  `EVENT_START_AT` MỘT MÌNH (không có `PRELAUNCH_LOCK_ENABLED` đi kèm) KHÔNG phải một permission
  env-gate — nó chỉ đổi chữ hiển thị ("Coming soon" ẩn/hiện, số đếm ngược), không chặn hay mở bất
  kỳ route/nội dung nào tự nó.


## Bổ sung dự kiến — F007_KudosLiveBoard + F008_KudosHeartReaction

> **[F007/F008 draft — chưa merge]** Toàn bộ mục này là delta của hai feature đang được xây
> trong `plans/260907-1725-kudos-live-board/`. Quyết định gốc: `clarifications.md § Quyết định`.

### `/kudos` là route CÔNG KHAI

`/kudos` đã được gộp vào Analysis Scope ở đầu file cùng nhóm `/`, `/awards`, `/standards`:
**không route-guard**, người chưa đăng nhập đọc được toàn bộ nội dung.

Căn cứ không phải suy đoán mà là chính test case của màn: precondition của TC
`Check access condition / Authentication required` ghi nguyên văn *"User is unauthenticated but
can view Kudos UI"*, và expected result chỉ đòi redirect/prompt khi người dùng **bấm vào một
profile hoặc vào chi tiết kudo** — tức là gate nằm ở ĐÍCH ĐẾN, không nằm ở `/kudos`.

Hệ quả kèm theo: 5 điểm vào đang hardcode `href="/kudos"` (site-header, site-footer,
`KudosSection`, widget-button, `/standards`) thôi 404 cùng lúc. Không cái nào trong số đó cần
đổi quyền.

### Trục phân quyền MỚI đầu tiên của dự án: quyền GHI

Từ F001 tới F006, mọi PERM### chỉ trả lời đúng một câu hỏi: *đã đăng nhập hay chưa*. Không có
ownership, không có policy table (`permissions-matrix.md § Ground-truth note`: "Dự án này KHÔNG
có RBAC").

F008 thêm trục thứ hai thật sự — **quyền ghi gắn với danh tính hàng dữ liệu**:

| Chủ thể | Đọc kudos | Thả tim |
|---|---|---|
| Anonymous | được | **không** — nút render nhưng disabled |
| Đã đăng nhập, không phải người gửi kudo đó | được | được, tối đa 1 lượt |
| Đã đăng nhập, LÀ người gửi kudo đó | được | **không** — nút disabled trên kudo của chính mình |

Hai điều cấm ở cột phải KHÔNG được để UI tự giữ. Chúng phải được enforce ở tầng dữ liệu:
- "1 lượt/người/kudo" → UNIQUE constraint `(kudo_id, user_id)`, không phải một lần đọc-rồi-ghi.
- "người gửi không tự thả tim" → điều kiện trong RLS policy `WITH CHECK`, đối chiếu
  `auth.uid()` với `kudos.sender_id`.
Lý do ghi rõ ở đây: đây là lần đầu trong dự án một quy tắc phân quyền KHÔNG thể suy ra từ
"đã đăng nhập chưa", nên nó cũng là lần đầu route-guard không đủ để bảo vệ.

### Fail-open tiếp tục áp cho ĐỌC, KHÔNG áp cho GHI

DAL đọc kudos giữ nguyên triết lý `getAwards`/`getProfileCard`: lỗi Supabase → trả `[]`/`null`,
trang vẫn public, hiện empty-state. Nhưng server action thả tim **fail-closed**: lỗi thì không
ghi và báo lỗi, tuyệt đối không "cứ cho qua". Một lỗi đọc biến thành empty-state là chấp nhận
được; một lỗi ghi biến thành lượt tim ma thì không.

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng. Bốn bề mặt mới dưới đây chờ mã ở bước promote:
đọc `/kudos` khi anonymous · thả tim khi đã đăng nhập · chặn tự thả tim trên kudo mình gửi ·
chặn thả tim lần hai trên cùng một kudo.

## Bổ sung dự kiến — F009_KudosCompose ("Viết Kudo")

> **Đã lên code thật** (nhánh `feat/kudos-write-modal`, 2026-09-08) — nội dung dưới đây đã được
> đối chiếu lại với as-built và migration đã apply thành công trên instance local (`supabase
> migration up`, không `db reset`). Quyết định gốc: `clarifications.md § Quyết định`. Bằng chứng:
> `plans/260907-2338-kudos-write-modal/evidence/migration-transcript.md` (RLS/view verify trực
> tiếp trên Postgres) và `evidence/green-evidence.md` (27/27 e2e `tests/e2e/kudos-compose.spec.ts`,
> bao gồm C25 "Submit anonymous → shows anonymous name, sender NOT link"). Nguồn kỹ thuật:
> `plans/260907-2338-kudos-write-modal/research/researcher-data-layer-report.md`.

### `kudos_insert_own` — policy GHI đầu tiên trên `public.kudos`

`0006_kudos.sql:16-18` tự ghi rõ từ trước: *"No INSERT/UPDATE/DELETE policy
on `kudos` at all … the 'Viết Kudo' compose dialog … adds its own write
policy when THEY are built, not here."* F009 là chỗ lời hứa đó được giữ.
Policy mới mirror ĐÚNG hình dạng `kudo_hearts_insert_own`
(`0007_kudo_hearts.sql:78-84`, `FOR INSERT TO authenticated WITH CHECK
(user_id = auth.uid() AND ...)`), thay vì phát minh hình dạng riêng:

```sql
-- Migration mới (F009), mirror 0007_kudo_hearts.sql:78-84
DROP POLICY IF EXISTS kudos_insert_own ON public.kudos;
CREATE POLICY kudos_insert_own ON public.kudos
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());
GRANT INSERT ON public.kudos TO authenticated;
```

Khác `kudo_hearts_insert_own` ở một điểm: `kudo_hearts` cấm tự-thả-tim
(`user_id <> sender của kudo`) vì đó là quan hệ hai hàng (heart ↔ kudo).
`kudos_insert_own` không cần điều kiện tương đương — gửi kudo cho CHÍNH
MÌNH (`sender_id = receiver_id`) không phải rủi ro bảo mật cần policy chặn
(nhiều nhất là một hành vi kỳ lạ về UX, không phải một lỗ hổng), và không
test case nào trong 57 case của màn này yêu cầu chặn nó — không thêm điều
kiện không ai đòi hỏi.

**Vì sao KHÔNG có `UPDATE`/`DELETE`:** không spec, không test case, không
node design nào của "Viết Kudo" nhắc tới sửa/xoá một kudo đã gửi. Thêm hai
policy đó là fabricate quyền không ai yêu cầu — ngược YAGNI. Nếu một
feature sau này cần "sửa/xoá kudo của chính mình", đó là lúc thêm, không
phải bây giờ.

### Storage — bucket `kudo-images`, 2 policy trên `storage.objects`

Bucket mới (xem architecture.md § "Lần đầu ứng dụng có Supabase Storage"),
tạo bằng `INSERT INTO storage.buckets (id, name, public) VALUES
('kudo-images', 'kudo-images', true)` — `public = true` vì `/kudos` đọc
công khai, không khác gì asset tĩnh `public/kudos/sample-image.png` hôm
nay. Hai policy trên `storage.objects`, lọc theo cột `bucket_id` (cách
lọc chuẩn của Supabase Storage — xem `supabase.com/docs/guides/storage/
security/access-control`):

```sql
-- Ghi: chỉ authenticated, chỉ vào đúng bucket này
CREATE POLICY "kudo_images_insert_authenticated" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'kudo-images');

-- Đọc: public/anon — belt-and-suspenders, xem ghi chú dưới
CREATE POLICY "kudo_images_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'kudo-images');
```

**Ghi chú KHÔNG được bỏ qua khi implement (đã verify qua docs Supabase, 2
GitHub issue — không đoán):**

1. `public = true` trên bucket TỰ NÓ đã bypass RLS cho đường đọc qua public
   URL (`<img src>` trên feed) — policy SELECT ở trên vì vậy chủ yếu là
   phòng thủ thêm cho truy cập trực tiếp qua bảng `storage.objects`
   (PostgREST/dashboard), không phải cơ chế chính khiến ảnh hiển thị được.
   Không dựa vào nó làm điều kiện duy nhất khi viết test.
2. **Không copy pattern `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY`**
   mà `0006`/`0007` dùng cho bảng `public.*` sang `storage.objects`. Trên
   Supabase hosted, `storage.objects` đã bật RLS mặc định và chủ sở hữu
   bảng không còn là role migration chạy — cố `ALTER TABLE` bảng này trả
   lỗi `must be owner of table objects` (xác nhận qua
   `github.com/supabase/supabase` issue #41126 và #36418, tài liệu
   `supabase.com/docs/guides/storage/security/ownership`). Migration F009
   chỉ nên chứa `INSERT INTO storage.buckets` + `CREATE POLICY` — bỏ hẳn
   câu `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`.
3. Instance local (`saa-app`, `supabase start`) chạy Postgres docker riêng,
   role `postgres` ở đó có thể vẫn là owner — nghĩa là lỗi ở mục 2 có thể
   KHÔNG lộ ra khi test local, chỉ lộ khi/nếu dự án này từng push lên một
   project Supabase hosted thật. Ghi ở đây để implementer không debug từ
   đầu nếu việc đó xảy ra sau này — repo hiện tại chỉ chạy local, chưa có
   project hosted (đúng phạm vi "verify at implementation", không phải một
   blocker bây giờ).

### Vì sao `/kudos` KHÔNG vào `src/proxy.ts` dù đã có đường ghi

`/kudos` giữ nguyên là route PUBLIC (đã chốt ở delta F007/F008 phía trên,
căn cứ đúng nguyên văn test case *"User is unauthenticated but can view
Kudos UI"*). F009 THÊM một hành động ghi vào trang này nhưng KHÔNG đổi
kết luận đó — vì gate nằm ở HÀNH ĐỘNG, không nằm ở ROUTE:

- **Đọc trang** `/kudos`: không gate — giữ nguyên `config.matcher` của
  `src/proxy.ts`, không thêm `/kudos` vào đó.
- **Mở dialog + điền form**: không gate — dialog vẫn render, chỉ khác quyết
  định "mở dialog hay điều hướng `/login`" nằm ở `kudos-compose-launcher.tsx`'s
  `handleActivate()` (KHÔNG phải trong pill trình bày thuần tuý
  `kudos-compose-pill.tsx`, vốn chỉ báo `onActivate` lên launcher qua
  `role="button"` + `onClick`/`onKeyDown`), dựa trên prop `isSignedIn` mà
  `kudos-client.tsx` tính từ `viewerId !== null` (Server Component `page.tsx`
  đã biết trước trạng thái đăng nhập, truyền xuống qua
  `kudos-screen.tsx`/`kudos-keyvisual-band.tsx`) — kiểm tra lớp 1, phía
  render, không phải phòng thủ bảo mật, chỉ là UX tránh mở một form rồi mới
  báo lỗi.
- **Gửi (INSERT thật)**: gate DUY NHẤT có giá trị bảo mật là bên trong
  Server Action `create-kudo.ts` — tự gọi `auth.getUser()` (ĐÚNG pattern
  `toggleKudoHeart`, `toggle-kudo-heart.ts:44-51`), fail-closed, trả
  `{ok:false, reason:"unauthenticated"}` nếu không có user, TRƯỚC khi chạm
  Storage hay bảng `kudos`. Một request REST trực tiếp bỏ qua UI vẫn bị
  chặn ở đây — không phải "chặn bằng cách ẩn nút" (comment thiết kế cùng
  triết lý `0007_kudo_hearts.sql:73-76`).

Route-level guard (`src/proxy.ts` + `(protected)/layout.tsx`) chỉ áp cho
"xem được trang hay không". F009 là feature ĐẦU TIÊN của dự án mà một
route công khai vẫn cần một gate NGOÀI route-guard — vì hành động ghi và
hành động xem tách rời nhau trên cùng một trang. Ghi ở đây rõ ràng để lần
sau không ai "sửa cho khớp" bằng cách thêm `/kudos` vào matcher — điều đó
sẽ chặn nhầm cả lượt xem của khách chưa đăng nhập, phá đúng quyết định
PUBLIC đã chốt ở F007/F008.

### Ẩn danh là NGỤY TRANG hiển thị, KHÔNG PHẢI ẩn ở tầng dữ liệu — cảnh báo bảo mật cần verify khi implement

Migration mới thêm `is_anonymous boolean NOT NULL DEFAULT false` +
`anonymous_name text` trên `public.kudos` (quyết định `clarifications.md`
— không có cột nào sẵn cho việc này, researcher-data-layer-report.md §1
xác nhận). Điểm PHẢI hiểu đúng: bật `is_anonymous` **không xoá, không ẩn
`sender_id` khỏi hàng dữ liệu** — hàng vẫn lưu ĐÚNG người gửi thật, y hệt
mọi kudo khác. `is_anonymous` chỉ là một cờ nói cho TẦNG HIỂN THỊ biết
"đừng vẽ tên/avatar người gửi thật, vẽ `anonymous_name` (hoặc nhãn ẩn
danh) thay vào".

Hệ quả bắt buộc — và đây là chỗ cần verify kỹ khi implement, không phải
suy đoán bây giờ: **`public.kudos_cards`
(`0006_kudos.sql:82-101`, SECURITY DEFINER, `GRANT SELECT TO anon,
authenticated`) hiện SELECT thẳng `su.id, su.full_name, su.avatar_url,
su.department` của sender KHÔNG điều kiện.** Nếu F009 thêm `is_anonymous`/
`anonymous_name` vào bảng `kudos` mà KHÔNG sửa view này, `kudos_cards` sẽ
tiếp tục trả nguyên danh tính sender thật cho MỌI truy vấn qua view — kể
cả một kudo được đánh dấu ẩn danh — và `anon`/`authenticated` đều đọc được
view đó. Ẩn danh khi ấy chỉ "ẩn" ở tầng UI nào tình cờ không hiển thị cột
đó, trong khi bất kỳ ai gọi thẳng REST vào `kudos_cards` vẫn thấy tên thật.
Đó là một lỗ rò danh tính thật, không phải một khác biệt trình bày.

**Đã sửa, cùng migration `0009_kudos_write_anonymity.sql` như yêu cầu.**
`CREATE OR REPLACE VIEW public.kudos_cards` bọc `CASE WHEN k.is_anonymous`
trên ĐÚNG 5 cột phía sender (`sender_id/sender_full_name/sender_avatar_url/
sender_department/sender_kudos_received` → `NULL`/`anonymous_name`/`NULL`/
`NULL`/`0`) — không thêm cột mới để báo hiệu ẩn danh, `sender_id → NULL` là
tín hiệu DUY NHẤT tầng UI cần (AD-2, `plan.md`). Verify TRỰC TIẾP trên
Postgres, không chỉ đọc code: `migration-transcript.md § 6(a)` — bật
`is_anonymous = true` trên một hàng seed rồi `SET ROLE anon; SELECT
sender_id, sender_full_name FROM kudos_cards` trả đúng `NULL` /
`'Một Sunner'` (giá trị `anonymous_name` vừa set), không phải tên thật.
Test case bổ sung ngoài 57 case gốc: e2e C25 ("Submit anonymous → shows
anonymous name, sender NOT link") xanh trong `green-evidence.md`. Hàng gốc
`public.kudos` vẫn giữ `sender_id`/`is_anonymous`/`anonymous_name` thật —
chỉ view này che khi đọc, đúng như cảnh báo ở trên yêu cầu.

### Ma trận quyền GHI của F009 (bổ sung ma trận F008 đã có ở delta trên)

| Chủ thể | Mở dialog | Gửi kudo | Gửi ẩn danh |
|---|---|---|---|
| Anonymous | được (chỉ xem/điền) | **không** — action fail-closed `unauthenticated` | n/a |
| Đã đăng nhập | được | được, `sender_id = auth.uid()` (RLS) | được — `sender_id` vẫn lưu thật, chỉ ẩn ở hiển thị (xem cảnh báo trên) |

Cùng triết lý F008 đã lập: quyền ghi không suy ra được từ "đã đăng nhập
hay chưa" một mình — cần thêm điều kiện gắn với danh tính hàng dữ liệu
(`WITH CHECK sender_id = auth.uid()`), và ẨN DANH không phải một ngoại lệ
của RLS mà là một concern hoàn toàn khác (view/hiển thị).

### Fail-open cho ĐỌC, fail-closed cho GHI — không đổi triết lý

DAL đọc mới (`searchSunners`, `src/dal/sunner-search.ts`) theo đúng triết
lý `getAwards`/`getProfileCard`: lỗi Supabase → trả mảng rỗng, ô chọn
người nhận hiện "không tìm thấy", KHÔNG throw, KHÔNG chặn dialog. Server
Action `create-kudo.ts` (ghi) fail-closed tuyệt đối — bất kỳ lỗi nào
(Storage upload lỗi, insert lỗi, RLS từ chối) đều trả `{ok:false, ...}` và
KHÔNG ghi phần nào của hàng `kudos` (không insert kudos thiếu ảnh nếu
upload ảnh lỗi giữa chừng — thứ tự: upload xong hết rồi mới insert, không
insert trước rồi vá ảnh sau).

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006). Bốn bề mặt của F008 vẫn
`TBD (draft)`. F009 thêm các bề mặt mới dưới đây, cũng chờ mã ở bước
promote — KHÔNG đoán số:

- gửi kudo khi đã đăng nhập (INSERT `kudos`, policy `kudos_insert_own`)
- chặn gửi kudo khi chưa đăng nhập (Server Action fail-closed)
- upload ảnh vào bucket `kudo-images` khi đã đăng nhập
- đọc công khai ảnh trong bucket `kudo-images` (anon)
- ẩn sender thật trên `kudos_cards` khi `is_anonymous = true` — điều kiện
  tiên quyết ("view đã sửa xong và có test xác nhận không rò `sender_id`/
  `sender_full_name` thật") NAY ĐÃ THOẢ, xem xác nhận ở mục trên
  (`migration-transcript.md § 6(a)` + e2e C25) — mã `PERM###` chính thức
  vẫn chờ `rebuild-spec` Core pass kế tiếp cấp, KHÔNG tự đặt số ở đây.

## Bổ sung dự kiến — SecretBoxModal

> **[F010_SecretBoxModal — đã merge]** Delta của feature đã build xong trong
> `plans/260908-1337-secret-box-modal/`. Quyết định gốc: `clarifications.md § Session 260908`.
> Mã feature `F010` đã cấp ở `feature-list.md`; PERM### riêng cho các bề mặt bên dưới vẫn chờ
> Core `rebuild-spec` pass — KHÔNG tự đoán số ở đây.

### Bảng `public.secret_box_openings` — log mở hộp, RLS own-row trên CHÍNH BẢNG không đổi

Migration `0011` thêm `public.secret_box_openings(user_id, badge_key, opened_at)`, RLS bật. Trên
chính bảng này, trục đọc vẫn mirror đúng pattern RLS own-row đã có từ `public.users` (`0001`): một
viewer chỉ SELECT được đúng hàng của chính mình (`user_id = auth.uid()`), qua policy
`secret_box_openings_select_own`. `0015`/`0017` (bên dưới) không đụng tới policy này — bảng gốc vẫn
own-row-only y nguyên.

### View `public.recent_gift_recipients` (`0015`) — ĐẢO kết luận "không cần view SECURITY DEFINER" ở trên

Kết luận trước đây ở mục này — "không cần view SECURITY DEFINER nào cho đường đọc [log mở hộp]" —
SAI với `/kudos`: trang **công khai** hiển thị "10 SUNNER NHẬN QUÀ MỚI NHẤT" (F007 FR-219/BR-020).
Đó đúng là "phơi dữ liệu CỦA NGƯỜI KHÁC", cùng lý do `profile_cards`/`kudos_cards` cần view riêng.
Migration `0015_recent_gift_recipients.sql` thêm view `public.recent_gift_recipients`
(`security_invoker = false` — SECURITY DEFINER view, chạy bằng quyền chủ sở hữu, bỏ qua RLS bảng
gốc) để phục vụ đúng đường đọc công khai này. Đoạn dưới đây THAY THẾ hoàn toàn kết luận cũ ở trên —
không để hai kết luận cùng tồn tại.

Cột phơi ra đúng 5 cột: `id, full_name, avatar_url, badge_key, opened_at` (`id`/`full_name`/
`avatar_url` lấy từ `public.users`, `badge_key`/`opened_at` từ `secret_box_openings`) — không hơn.
Cấm tuyệt đối `email, role, locale, created_at, updated_at` của `users`, cùng ranh giới SEC_004 mà
`profile_cards`/`kudos_cards` đã vạch. Quyền: `REVOKE ALL` trước, sau đó `GRANT SELECT TO anon,
authenticated` — đọc công khai, không cần đăng nhập.

`LIMIT 10` trong view là RÀNG BUỘC HIỂN THỊ, không phải ranh giới bảo mật: ai query thẳng view này
vẫn thấy 10 lượt mở gần nhất của TẤT CẢ Sunner, không phải một lát cắt theo viewer. Muốn giới hạn
số hàng lộ ra theo cách khác (RPC nhận tham số `limit`, hay theo viewer) là việc chưa làm.

Đây là một quyết định NỚI LỎNG quyền riêng tư có chủ đích, không phải chi tiết kỹ thuật thuần túy:
trước `0015`, không ai ngoài chính chủ đọc được ai đã mở Secret Box, lúc nào, huy hiệu gì; sau
`0015`, ba dữ kiện đó công khai với cả `anon`. Design yêu cầu vậy (bảng vinh danh trên trang công
khai) nên nó cần người ký duyệt, không phải chỉ review kỹ thuật.

**Đã ký duyệt 2026-09-10** — dang.xuan.thang, trả lời trực tiếp trong phiên takumi khi được đặt
ba lựa chọn: (1) ký và mở PR · (2) bỏ panel Top-10 khỏi PR, giữ 11 phase còn lại · (3) push branch
nhưng chưa mở PR. Chọn (1). Trước khi hỏi, `evidence-gate --stage hard` chặn đúng ở một điểm này
(`riskGate.signoffRequired: true`, `humanSignedOff: false`) và không điểm nào khác. Xuất xứ đầy đủ:
`plans/260910-1951-screen-audit-spec-test-gaps/reports/inspection-riskgate-260910-2312.md`.

`secret_box_openings` giữ nguyên RLS own-row (`0011`) — view là đường đọc thứ hai, hẹp hơn, không
phải nới policy bảng gốc. Migration `0017` thêm index `(opened_at DESC)` trên `secret_box_openings`
để phục vụ `ORDER BY opened_at DESC LIMIT 10` của view — không đụng policy/grant/cột nào.

### Ghi CHỈ qua RPC `open_secret_box()` — SECURITY DEFINER được GỌI, khác trigger `0007`

Client KHÔNG BAO GIỜ insert trực tiếp vào `secret_box_openings`. Ghi duy nhất đi qua một hàm
Postgres `open_secret_box()`, `SECURITY DEFINER` cộng `SET search_path` (cùng guard chống
privilege-escalation mà `0002_handle_new_user_trigger.sql` đã dùng). Đây là hàm `SECURITY
DEFINER` ĐẦU TIÊN của dự án được GỌI TRỰC TIẾP bởi client — `0007`'s `sync_kudo_heart_count`
cũng `SECURITY DEFINER` nhưng là TRIGGER (chạy khi có INSERT/DELETE trên `kudo_hearts`, không ai
gọi nó bằng tên); `open_secret_box()` là một lệnh gọi có chủ đích, khác cơ chế kích hoạt hoàn toàn.

### Entitlement luôn tính lại phía server — không tin số hay ảnh badge từ client

Số hộp có thể mở (`floor(sum(kudos.heart_count WHERE sender_id = viewer)/5) − count(own
openings)`) được tính lại BÊN TRONG cùng transaction với lượt INSERT, không nhận bất kỳ tham số
đếm nào từ client. Đây là yêu cầu trực tiếp từ 2 test case của MoMorph: `5cc072ad` (client sửa số
hộp không được chấp nhận) và `2e7bec78` (client sửa URL ảnh badge không được chấp nhận) — cả hai
buộc chỗ tính toán phải nằm ngoài tầm với của client, đúng lý do `open_secret_box()` là một hàm
Postgres chứ không phải một Server Action tính rồi mới ghi.

### Chống double-click — `pg_advisory_xact_lock` theo user

Hai lượt gọi gần như đồng thời của cùng một viewer (double-click) được serialize bằng
`pg_advisory_xact_lock` khoá theo `user_id`, trong cùng transaction đọc-lại-entitlement-rồi-ghi ở
trên — không có khoảng hở giữa "đọc số hộp còn lại" và "ghi lượt mở" mà một request thứ hai có thể
chen vào.

### `/kudos` vẫn PUBLIC — Secret Box ẩn hoàn toàn với khách chưa đăng nhập, không cần guard riêng

Không có route-guard mới, không có permission-item route-level mới. `KudosStatList`
(`kudos-stat-list.tsx:65-68`) đã trả `null` cho toàn bộ khối thống kê (kể cả nút "Mở Secret Box")
khi `stats === null` — tức là khách chưa đăng nhập không thấy nút này tồn tại trên DOM, không phải
một nút disabled. Test case `e6a59553` và `1c266552` thoả mãn nhờ đúng hành vi có sẵn này, không
cần thêm một điều kiện client nào. Người đã đăng nhập mà `secretBoxUnopened === 0` thấy nút
**visible nhưng disabled** (giữ nguyên pattern `title` giải thích sẵn có) — modal không mở được ở
0, thoả test case `84a5ba82` case 4.

### Phạm vi: `/profile` KHÔNG được cấp bề mặt nào trong feature này

Nút "Mở Secret Box" trên `/profile` (`profile-statistics-card.tsx`, mm:362:5082) giữ nguyên
`disabled` — feature này CHỈ chạm `/kudos`. Lý do là dữ liệu, không phải sở thích: `/profile`
chưa có đường ống stats thật cho viewer (`ProfileStatisticsCard` không nhận prop stats nào, render
`0` hardcode), nên bật nút ở đó là một feature khác, kéo theo viết lại 2 test case đã ship
(`profile.spec.ts:40-41`, C6/C7 — giá trị `0` cố định + nút disabled trong MỌI trường hợp). Hai
contract đó KHÔNG bị chạm bởi feature này. Ghi nợ tại `clarifications.md § Unresolved`.

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006); F008/F009 vẫn `TBD (draft)`. SecretBoxModal thêm các bề
mặt mới dưới đây, cũng chờ mã ở bước promote — KHÔNG đoán số:

- đọc lượt mở hộp của chính mình trên `secret_box_openings` (RLS own-row)
- gọi `open_secret_box()` khi đã đăng nhập và còn hộp chưa mở
- chặn gọi `open_secret_box()` khi chưa đăng nhập
- chặn mở vượt entitlement (kể cả khi client gửi số/URL badge giả)

## Bổ sung dự kiến — CountdownPrelaunchPage

> **[F011_CountdownPrelaunchPage — đã lên code, chưa merge main]** Delta của feature xây trong
> `plans/260908-1653-countdown-prelaunch-page/` (nhánh `feat/countdown-prelaunch-page`). Quyết
> định gốc: `clarifications.md § Session 2026-09-08`. `PERM###` cho bề mặt dưới đây vẫn
> `TBD (draft)` — cấp ở promote. Đối chiếu lại với `src/domain/prelaunch-lock.ts`/`src/proxy.ts`
> as-built, KHÔNG phải draft ban đầu — 2 điểm draft từng để ngỏ nay đã chốt, ghi rõ ở dưới.

### `/prelaunch` là route công khai, không route-guard cho CHÍNH NÓ — hệ thống KHÔNG đổi phân loại `other`

`/prelaunch` gia nhập đúng nhóm PUBLIC hiện có — không qua `(protected)/layout.tsx`, không phân
biệt vai trò `member`/`admin`. Màn này không có gì cần bảo vệ (đếm ngược tĩnh, không PII), nên
không tự nó tạo permission-item cho việc XEM màn.

### Trục khoá MỚI: khoá theo THỜI ĐIỂM + CỜ CẤU HÌNH, không phải theo danh tính — và áp cho MỌI route khác, không riêng `/prelaunch`

Mọi `PERM###` từ F001 tới F010 trả lời câu hỏi "đã đăng nhập hay chưa" (hoặc, F008/F009, thêm "có
phải chủ sở hữu hàng dữ liệu"). CountdownPrelaunchPage thêm một trục khoá KHÁC HẲN, không dựa trên
danh tính: **khoá điều hướng dựa trên (a) cờ vận hành `PRELAUNCH_LOCK_ENABLED` và (b) điều kiện
thời gian (đếm ngược đã về 0 hay chưa)**. Người dùng `admin` đã đăng nhập bị khoá y hệt người chưa
đăng nhập — trục này không phân biệt actor.

`PRELAUNCH_LOCK_ENABLED` **KHÔNG phải một permission-item theo actor** — nó là một cổng vận hành
áp cho MỌI actor như nhau, gần maintenance-mode hơn RBAC/ownership.

**Sửa lại so với draft ban đầu — phạm vi khoá RỘNG HƠN nhiều so với "chỉ route mới lộ ra":**
as-built (`src/domain/prelaunch-lock.ts`, hàm `planProxy`) xác nhận nhánh khoá chạy TRƯỚC phép so
khớp whitelist 6-route cũ của `proxy.ts`. Nghĩa là **khi khoá đang bật, redirect về `/prelaunch` áp
dụng cho MỌI route trang, kể cả 6 route mà hệ thống từng chỉ có 4 `PERM###` route-guard/refresh-cookie
cho chúng: `/` (từng PERM001, nay superseded), `/login` (PERM002), `/todo` (PERM003), `/awards`,
`/standards`, `/profile` (gia nhập PERM003's cơ chế)**. Trước sự kiện và khi cờ bật, KHÔNG route nào
trong 6 route đó chạy tới nhánh guard/refresh-cookie gốc của nó — nhánh khoá đã redirect trước khi
tới đó. Hai lớp guard hiện có (`proxy.ts` optimistic + `(protected)/layout.tsx` authoritative) không
hề bị tắt hay yếu đi bởi thay đổi này — chúng chỉ đơn giản không được nhường đường tới trong lúc
khoá còn bật; khi khoá tắt (mặc định) hoặc countdown đã về 0, toàn bộ 6 route trở lại hành vi guard
y hệt trước feature này, không đổi gì.

### Danh sách miễn khoá — không phải một danh sách quyền, một danh sách kỹ thuật

`/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh — miễn khoá vì lý do KỸ THUẬT (tránh vòng
lặp redirect, tránh hỏng OAuth callback, route handler không phải trang), không phải vì các route
đó có quyền cao hơn. `/login` và `/todo` KHÔNG nằm trong danh sách miễn khoá này — khác draft ban
đầu có thể gợi ý, chúng bị khoá y hệt mọi route khác khi cờ bật (xem mục trên).

### Fail-safe: mặc định TẮT, không fail-open/fail-closed theo nghĩa cũ

Khác các fail-open/fail-closed đã ghi cho F003-F009 (xử lý LỖI khi đọc dữ liệu), cờ này không có
khái niệm "lỗi khi đọc" — chỉ 2 giá trị tường minh (`"true"`, không phân biệt hoa/thường, hoặc bất
kỳ giá trị nào khác = tắt, xác nhận tại `isPrelaunchLockEnabled`). Mặc định khi biến môi trường
KHÔNG được set là TẮT (an toàn) — một môi trường quên set biến này sẽ KHÔNG vô tình khoá toàn site.

### 303 cho redirect không phải GET/HEAD — sửa phát sinh khi implement, không có trong draft

Draft ban đầu không lường điểm này: redirect của nhánh khoá dùng **303**, không phải 307 mặc định
của `NextResponse.redirect`. Lý do: 307 giữ nguyên method, nên một Server Action POST tới một route
đang bị khoá sẽ re-POST sang `/prelaunch` (không có action đó) và nhận 404
`x-nextjs-action-not-found` thay vì màn đếm ngược — đo được lúc implement. GET/HEAD vẫn nhận
redirect mặc định (không cần 303). Đây là chi tiết kỹ thuật của redirect, không đổi bất kỳ ma trận
quyền nào ở trên.

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006); F007–F010 vẫn `TBD (draft)`. CountdownPrelaunchPage thêm
bề mặt mới dưới đây, cũng chờ mã ở bước promote — KHÔNG đoán số:

- redirect TOÀN BỘ route trang (bao gồm `/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile`)
  về `/prelaunch` khi `PRELAUNCH_LOCK_ENABLED=true` VÀ chưa tới giờ sự kiện
- miễn khoá cho `/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh (bản thân danh sách ngoại lệ)
- gỡ khoá tự động + redirect `/prelaunch` → `/` khi đã tới giờ sự kiện

## Bổ sung dự kiến — F012_NotificationsPanel

> **[F012_NotificationsPanel — đã lên code, chưa merge `main`]** Delta của feature xây trong
> `plans/260909-0239-notifications-panel/` (nhánh `feat/notifications-panel`, 12 commit, chưa push).
> Quyết định gốc: `clarifications.md`. Đối chiếu lại với as-built
> (`supabase/migrations/0012_notifications.sql`, `0013_notification_emitters.sql`,
> `src/dal/notifications.ts`, `src/api/notifications.ts`) — KHÔNG phải draft ban đầu
> (`plans/260909-0239-notifications-panel/spec/system/permissions.md`, `status: forward-draft`). Một
> điểm draft cần sửa lại trước khi ghi vào đây, nêu ngay dưới: draft gọi đây là "trục phân quyền thứ
> hai" của dự án — sai, đối chiếu với chính các mục bên trên của file này.

### Đính chính: đây KHÔNG phải trục phân quyền thứ hai — RLS own-row đã lặp lại 4 lần từ F001

Draft viết: "Cho tới nay trục duy nhất là đã đăng nhập hay chưa... F012 thêm quyền theo sở hữu dữ
liệu ở tầng cơ sở dữ liệu [lần đầu]." Đối chiếu với chính file này thì claim đó sai ở hai điểm:

1. **RLS own-row cho ĐỌC đã có từ migration `0001`** — `public.users` đã được đọc own-row từ ngày
   đầu (§ Curated View ở trên: "RLS own-row trên `public.users` đảm bảo mỗi người chỉ đọc được đúng
   hàng của chính mình"). `public.secret_box_openings` (F010, migration `0011`) lặp lại đúng pattern
   này và tự ghi rõ ở mục "Bổ sung dự kiến — SecretBoxModal" phía trên: "Trục đọc mirror đúng pattern
   RLS own-row đã có từ `public.users` (`0001`)".
2. **Trục quyền GHI gắn với danh tính hàng dữ liệu đã được chính file này gọi là "trục thứ hai" từ
   F008** (§ "Bổ sung dự kiến — F007_KudosLiveBoard + F008_KudosHeartReaction" phía trên: "F008 thêm
   trục thứ hai thật sự — quyền ghi gắn với danh tính hàng dữ liệu"). F009 lặp lại đúng pattern này
   cho `kudos_insert_own`.

`public.notifications` (F012) vì vậy là **một mẫu KHÁC của cùng loại ranh giới đã lặp lại 4 lần**
trong dự án (`users`/`0001` đọc; `kudo_hearts`+`kudos`/`0007`+`0009` ghi; `secret_box_openings`/`0011`
đọc), không phải một trục mới. Giữ nguyên phân loại `other` (§ Authorization System Type) đúng theo
tiền lệ: không lần nào trong 4 lần trước việc thêm một bảng RLS own-row khác kéo theo đổi phân loại —
đổi lần này mà không đổi những lần trước là áp tiêu chuẩn không nhất quán. Quyết định cuối cùng có
nên gộp bốn tiền lệ này thành `ownership`/`hybrid` là một đánh giá TOÀN DỰ ÁN, để `rebuild-spec` Core
pass quyết định — không phải việc của một lượt đồng bộ tài liệu cho một feature đơn lẻ.

### Cái THẬT SỰ mới của F012: 3 điểm, không phải "ranh giới đầu tiên trong Postgres"

1. **Lần đầu RLS phải chịu trách nhiệm cho một kênh REALTIME.** 3 pattern RLS own-row trước
   (`users`, `secret_box_openings`, và cặp ghi `kudo_hearts`/`kudos`) đều chỉ phục vụ REST/RPC qua
   PostgREST — chưa cái nào đứng sau `supabase_realtime`. `public.notifications` là bảng ĐẦU TIÊN
   vào publication này (`0012_notifications.sql:121-132`), và RLS phải lọc đúng cho cả luồng INSERT
   qua kênh `postgres_changes`, không chỉ SELECT qua REST — verify bằng test thật, không suy đoán từ
   tài liệu Supabase (`tests/e2e/notifications.spec.ts:178` TC-002, `:664` TC-019; xanh trong
   `plans/260909-0239-notifications-panel/phase-09-green-visual-and-gate.md`, 214 pass/5 skip/0 fail).
2. **Lần đầu quyền ghi bị bó hẹp còn ĐÚNG MỘT CỘT bằng GRANT, không phải bằng policy.** RLS
   `USING`/`WITH CHECK` chỉ chứng minh được quyền sở hữu HÀNG, không chặn được CỘT nào bị UPDATE — 4
   bảng RLS trước đều không cần ranh giới cột (chủ sở hữu được sửa toàn hàng, hoặc không được sửa
   gì). `notifications_update_own_read` cho phép UPDATE hàng của mình, nhưng chỉ `GRANT UPDATE
   (is_read) ON public.notifications` mới chặn được việc tự sửa `type`/`payload`
   (`0012_notifications.sql:72-79`).
3. **Người nhận không bao giờ là người ghi — kể cả gián tiếp qua RPC.** `secret_box_openings` (F010)
   vẫn cho viewer TỰ GỌI một RPC (`open_secret_box()`) để tạo ra hàng của chính mình.
   `notifications` không có đường nào như vậy: không GRANT INSERT cho `authenticated`, ghi duy nhất
   qua trigger `AFTER INSERT` (`0013_notification_emitters.sql`) — đúng hình dạng trigger
   `sync_kudo_heart_count` (`0007`) chứ không phải hình dạng RPC-được-gọi của `0011`.

### Chống rò rỉ sự tồn tại — cùng triết lý đã có, áp cho một bảng mới

FR-603 (đánh dấu đã đọc trên id của người khác và trên id không tồn tại phải trả về cùng một kết
quả) không phải một yêu cầu mới về nguyên tắc — `getProfileCard` (F006) đã fail-open cùng một cách
cho hai nguyên nhân khác nhau (§ Special Conditions ở trên: "cả 2 nguyên nhân dẫn tới CÙNG một hành
vi quan sát được"). Cái mới ở F012 là cơ chế: `markRead` không cần tự phân biệt hai trường hợp — RLS
`USING (user_id = auth.uid())` đã lọc mất hàng của người khác THÀNH "0 dòng khớp" trước khi hàm kịp
thấy khác biệt (`src/dal/notifications.ts:123-154`), nên không có nhánh nào để lộ.

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006); F007–F011 vẫn `TBD (draft)`. F012 thêm các bề mặt mới dưới
đây, cũng chờ mã ở bước promote — KHÔNG đoán số:

- đọc thông báo của chính mình trên `public.notifications` (RLS own-row, kể cả qua realtime)
- đánh dấu đã đọc từng thông báo/tất cả của chính mình (UPDATE cột `is_read`)
- chặn đọc/ghi thông báo của người khác, kể cả khi id có thật (không phân biệt với id không tồn tại)
- ghi thông báo qua trigger `SECURITY DEFINER` khi có Kudos/tim mới — không có GRANT INSERT cho bất
  kỳ role người dùng nào
