---
status: implemented
authored_by: takumi
created: 2026-09-06
lang: vi
---
<!--
FORWARD-DRAFT NOTICE (F007_KudosLiveBoard + F008_KudosHeartReaction,
plans/260907-1725-kudos-live-board):
Nội dung dưới đây là bản SAO NGUYÊN VĂN của `docs/vi/system/permissions.md` (đọc 2026-09-07), cộng
CHỈ phần delta mà F007/F008 giới thiệu. Mọi dòng gốc giữ nguyên 100% — không sửa, không xoá.
Phần MỚI nằm trọn trong mục cuối file. File này CHƯA merge vào `docs/vi/system/permissions.md` thật;
nó được promote ở implement-start và được đối chiếu lại với as-built ở Delivery.
-->


# Permissions

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-07 (cập nhật sau khi F006_ProfilePage `/profile` lên code thật — xem `plans/260907-1224-profile-page/clarifications.md`; đồng thời vá khoảng lệch có trước F006: `/standards` đã lên code PUBLIC từ F005_StandardsRulesPage nhưng file này chưa từng phản ánh điều đó)
**Analysis Scope**: `/`, `/awards`, `/standards` (cả ba PUBLIC, không route-guard), `/login`, `/todo`, `/profile` (route-guard, nhóm `(protected)`, mới từ F006_ProfilePage), `/auth/callback` — toàn bộ authorization surface của app. 2 route Homepage liên kết còn lại (`/kudos`, `/admin`) CHƯA tồn tại, ngoài phạm vi phân tích quyền vì chưa có code.

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
- **2 route đích được Homepage liên kết chưa tồn tại**: `/kudos`, `/admin` — tất cả trả 404 cho tới khi từng screen được implement (mỗi cái là một MoMorph screen riêng, việc của các phiên sau; `/awards` đã ra khỏi danh sách này kể từ F004_AwardSystemPage, `/standards` kể từ F005_StandardsRulesPage, `/profile` kể từ F006_ProfilePage — 3 route này nay đều có code thật). Đây KHÔNG phải khoảng trống phân quyền — không có route nghĩa là không có gì để phân quyền; ghi nợ tại `clarifications.md § Unresolved` (TC ID-59). Nút "Chi tiết" của khối Kudos trên `/`, `/awards`, `/standards`, `/profile` cùng trỏ `/kudos`, cùng 404 tạm thời — không phải khoảng trống phân quyền mới. Khi `/admin` được xây, cần quyết định RIÊNG có nên thêm route-guard theo `role` hay không (hiện KHÔNG có — mục menu chỉ ẩn/hiện, chưa gác route) — ngoài phạm vi phiên làm việc này.
- **Fail-open cho việc đọc hồ sơ, không phải cho quyền truy cập (F006):** `getProfileCard`
  (`src/dal/profile-cards.ts`) fail-open trả `null` khi Supabase lỗi HOẶC khi không có hàng khớp
  `id` — cả 2 nguyên nhân dẫn tới CÙNG một hành vi quan sát được (`notFound()`, trang "Not
  found"). Đây là fail-open NỘI DUNG (không tìm thấy gì để hiển thị), không phải một quyết định
  phân quyền: KHÔNG có nhánh nào biến `/profile` thành công khai hay thành bị chặn dựa trên lỗi
  đọc — gate đăng nhập của `(protected)/layout.tsx` không đổi bất kể `getProfileCard` có lỗi hay
  không. Cùng triết lý `getAwards`/`getUserRole` đã ghi ở trên.
- **Fail-open cho nội dung giải, không phải cho quyền truy cập (F004):** DAL `getAwards` fail-open trả `[]` khi Supabase lỗi — đây là fail-open NỘI DUNG (empty-state), không phải fail-open QUYỀN (trang vẫn luôn public, không có nhánh nào biến `/awards` thành protected khi lỗi). Cùng triết lý `getUserRole` fail-open `"member"` ở F003: một lỗi đọc dữ liệu không được phép biến thành một quyết định phân quyền.
- Không có time-based restriction, IP-based rule, hay feature-flag nào gate quyền truy cập — không đổi. Biến môi trường mới `EVENT_START_AT` (đếm ngược sự kiện) KHÔNG phải một permission env-gate — nó chỉ đổi chữ hiển thị ("Coming soon" ẩn/hiện, số đếm ngược), không chặn hay mở bất kỳ route/nội dung nào.


## Bổ sung dự kiến — F007_KudosLiveBoard + F008_KudosHeartReaction

> **[F007/F008 draft — chưa merge]** Toàn bộ mục này là delta của hai feature đang được xây
> trong `plans/260907-1725-kudos-live-board/`. Quyết định gốc: `clarifications.md § Quyết định`.

### `/kudos` là route CÔNG KHAI

`/kudos` rời khỏi danh sách "route đích chưa tồn tại" ở mục trên (`/admin` vẫn ở lại). Nó vào
cùng nhóm với `/`, `/awards`, `/standards`: **không route-guard**, người chưa đăng nhập đọc được
toàn bộ nội dung.

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
