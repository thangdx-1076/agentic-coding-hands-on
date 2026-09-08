# Feature List

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: toàn bộ source hiện có — 6 screen (`/`, `/awards`, `/login`, `/profile`, `/standards`, `/todo`), 1 backend route, 3 US###, 3 BL###, 4 PERM###, 3 MODEL### (+ `Award`, `ProfileCard`, chưa cấp MODEL### riêng)

**F-code stability note**: F001/F002 và slug của chúng được giữ nguyên từ `docs/vi/_canonical-fcodes.json` (đã promote ở lần chạy trước) — wave này chỉ bổ sung các trường Related bằng mã thật (US###/SCR###/ROUTE###/MODEL###/BL###/PERM###) hiện đã tồn tại, không renumber/rename/split/merge.

## Feature Hierarchy

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F001_GoogleOAuthLogin | Đăng nhập Google OAuth & Bảo vệ truy cập | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F002_LanguageSwitch | Chuyển đổi ngôn ngữ giao diện (VN/EN) | ui | TypeScript | agentic-coding-hands-on | P1 |
| F003_Homepage | Trang chủ SAA 2025 (Homepage) | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F004_AwardSystemPage | Hệ thống giải thưởng SAA 2025 (Awards) | ui | TypeScript | agentic-coding-hands-on | P1 |
| F005_StandardsRulesPage | Thể lệ SAA 2025 (Standards) | ui | TypeScript | agentic-coding-hands-on | P2 |
| F006_ProfilePage | Hồ sơ Sunner (Profile) | mixed | TypeScript | agentic-coding-hands-on | P1 |
| F007_KudosLiveBoard | Bảng Kudos trực tiếp (`/kudos`) | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F008_KudosHeartReaction | Thả tim cho Kudos | mixed | TypeScript | agentic-coding-hands-on | P1 |
| F009_KudosCompose | Viết Kudo (dialog soạn Kudos trên /kudos) | mixed | TypeScript | agentic-coding-hands-on | P1 |
| F010_SecretBoxModal | Mở Secret Box trên /kudos | mixed | TypeScript | agentic-coding-hands-on | P2 |

## Feature Details

### F001: Đăng nhập Google OAuth & Bảo vệ truy cập

**Type**: mixed
**Description**: Khách truy cập đăng nhập bằng tài khoản Google qua Supabase Auth (flow PKCE); thành công đưa vào `/` (trang chủ — đổi từ `/todo` kể từ F003_Homepage; `/todo` vẫn tồn tại như một khu vực được bảo vệ riêng, truy cập qua URL trực tiếp). Toàn bộ vòng đời phiên đăng nhập nằm trong MỘT outcome duy nhất: vào được khu vực bảo vệ, giữ được phiên, và rời khỏi phiên đúng cách.

**Vì sao "Đăng nhập" và "Bảo vệ truy cập" là MỘT outcome, không phải hai** (justification bắt buộc theo yêu cầu clustering): route-guard trong dự án này (`PERM001-004`) không có trục ủy quyền thứ hai nào — không role, không ownership, không policy table (`permissions-matrix.md` § Ground-truth note: "Dự án này KHÔNG có RBAC"). Bốn PERM### chỉ kiểm tra đúng MỘT thứ: đã đăng nhập (Authenticated) hay chưa (Anonymous). Guard tồn tại chỉ để enforce đúng trạng thái mà US002 (đăng nhập) và US003 (đăng xuất) tạo ra/kết thúc — root redirect (PERM001), login fail-open (PERM002), todo fail-closed (PERM003), callback next-path (PERM004) đều là hệ quả trực tiếp của "đã đăng nhập chưa", không phải một quyết định phân quyền độc lập. Vì không có second axis, tách guard thành F### riêng sẽ tạo một Feature không có primary business outcome của chính nó (nó không phục vụ actor/intent nào khác ngoài enforce login state) — vi phạm chính nguyên tắc "một outcome giải thích mọi US" mà Feature Clustering Rule yêu cầu. Toàn bộ US (US002, US003) và mọi PERM### (001-004) đều được giải thích trọn vẹn bởi một outcome: "khách vào và rời khu vực được bảo vệ một cách đúng đắn, có xác thực Google, không có bug open-redirect".

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 2 screen shell (SCR001 toàn bộ trừ vùng language-selector, SCR002 toàn bộ) + 3 BL### integration client (browser/server/proxy Supabase) + 4 PERM### route-guard + 1 ROUTE### (callback)

**Related Screens**:
- SCR001_LoginScreen: Login (sở hữu khung màn hình đầy đủ — trừ vùng language-selector trong header, do F002 sở hữu; SCR001 không có REG### phát sinh vì `screen-list.md` phân loại atomic nên đây là partial-scope theo mô tả, không phải partial-screen `SCR###/REG###` chính thức)
- SCR002_TodoScreen: Todo (placeholder)

**Related User Stories**:
- US002_LoginWithGoogle: Login With Google
- US003_LogOut: Log Out

**Related APIs/Routes**:
- (GET) /auth/callback — ROUTE001

**Related Data Models**:
- MODEL002_SupabaseUser

**Related Background Logic**:
- BL001_SupabaseBrowserClient: SupabaseBrowserClient
- BL002_SupabaseServerClient: SupabaseServerClient
- BL003_SupabaseProxyClient: SupabaseProxyClient

**Related Permissions**:
- PERM001_RootRouteGuard: Root Route Guard
- PERM002_LoginRouteGuard: Login Route Guard (fail-open)
- PERM003_TodoRouteGuard: Todo Route Guard (fail-closed)
- PERM004_CallbackNextPathGuard: Callback Next-Path Open-Redirect Guard

---

### F002: Chuyển đổi ngôn ngữ giao diện (VN/EN)

**Type**: ui
**Description**: Khách chuyển ngôn ngữ giao diện VN/EN qua bộ chọn ở header màn `/login`. Lựa chọn lưu vào cookie `NEXT_LOCALE` (next-intl, no-routing), áp dụng lại toàn bộ nội dung UI ngay sau khi chọn. Outcome độc lập với F001 — không liên quan trạng thái đăng nhập, không đi qua PERM### nào (locale normalize ở `proxy.ts` là input-validation thuần, không phải locale-gate, xem `permissions-matrix.md` § Codebase check note).

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: 1 UI component (LanguageSelector, vùng con trong header của SCR001) + 1 MODEL### (AppLocale)

**Related Screens**:
- SCR001_LoginScreen: Login (chỉ vùng LanguageSelector trong header — không sở hữu khung màn hình; `screen-list.md` không phát sinh REG### nào cho SCR001 vì screen được phân loại atomic, nên tham chiếu ở đây dùng mã bare SCR001 theo đúng mã thật hiện có, không bịa `SCR001/REG###`)

**Related User Stories**:
- US001_SwitchLanguage: Switch Language

**Related APIs/Routes**:
- Không có ROUTE### — `setLocale(locale)` là Next.js Server Action (`app/actions/locale.ts`), không phải HTTP endpoint có path (xem `api-map.md` § Server Actions)

**Related Data Models**:
- MODEL001_AppLocale

**Related Background Logic**:
- Không có — `setLocale` đánh dấu `[UNMAPPED]` trong `behavior-logic.md`/`api-map.md` (không gọi Supabase, chỉ ghi cookie)

**Related Permissions**:
- Không có — đổi ngôn ngữ không đi qua route-guard nào; xem justification F001 ở trên cho lý do PERM001-004 thuộc F001

---

### F003: Trang chủ SAA 2025 (Homepage)

**Type**: mixed
**Description**: Khách (ẩn danh hoặc đã đăng nhập) xem trang chủ công khai `/` của SAA 2025: hero ROOT FURTHER với đồng hồ đếm ngược tới `EVENT_START_AT`, thông tin sự kiện, CTA sang Award Information / Sun* Kudos, nội dung Root Further, 6 thẻ hạng mục giải thưởng (link `/awards#<slug>`), khối Sun* Kudos, widget hành động nhanh; header hiển thị bell + menu tài khoản theo role (`public.users.role`, fail-open `member`) cho người đã đăng nhập. `/` không còn redirect (PERM001 hết hiệu lực); đích sau đăng nhập đổi từ `/todo` sang `/`.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: `app/page.tsx` + `components/home/**` + `lib/countdown/countdown.ts` + `hooks/use-countdown.ts` + `lib/auth/get-user-role.ts` + `hooks/use-select-locale.ts`

**Related Screens**:
- SCR003_HomeScreen: Trang chủ (Homepage)

**Related User Stories**:
- TBD (draft) — xem `features/F003_Homepage/functional-spec.md § 7`

**Related APIs/Routes**:
- Không có ROUTE### mới — đọc `public.users` qua PostgREST (Supabase) bằng JWT của user

**Related Data Models**:
- MODEL002_SupabaseUser (mở rộng: `role` từ `public.users`)
- MODEL001_AppLocale

**Related Background Logic**:
- BL002_SupabaseServerClient (dùng lại)

**Related Permissions**:
- PERM001_RootRouteGuard — HẾT HIỆU LỰC (`/` public)
- Role-based screen-permission cho mục "Trang quản trị" — TBD (draft), mã do core pass cấp

---

### F004: Hệ thống giải thưởng SAA 2025 (Awards)

**Type**: ui
**Description**: Khách (ẩn danh hoặc đã đăng nhập) xem trang công khai `/awards`: 6 hạng mục giải thưởng SAA 2025 (Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP) với đầy đủ mô tả/số lượng/giá trị, nav trái điều hướng nội-trang (click-scroll + scroll-spy), và khối quảng bá Sun* Kudos — trang chi tiết hoá đúng 6 thẻ tóm tắt mà F003_Homepage đã hiển thị trên `/`. Không route BE mới, không action nào ghi DB.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: `src/app/(public)/awards/page.tsx` + `awards/_components/**` + `awards/_hooks/use-award-category-nav.ts` + `awards/_utils/scroll-spy.ts` + `src/dal/{awards,awards-client}.ts`

**Related Screens**:
- SCR004_Awards: Hệ thống giải thưởng SAA 2025

**Related User Stories**:
- TBD (draft) — xem `features/F004_AwardSystemPage/functional-spec.md § 7`

**Related APIs/Routes**:
- Không có ROUTE### mới — đọc `public.awards` qua PostgREST (Supabase) bằng client hẹp `toAwardsClient`, không có route BE nào tự viết

**Related Data Models**:
- `Award` (chưa có MODEL### — cấp bởi core pass kế tiếp, xem `entities.md`)
- MODEL001_AppLocale (tái dùng nguyên trạng từ F002)

**Related Background Logic**:
- Không có BL### mới

**Related Permissions**:
- Không có PERM### mới — `/awards` PUBLIC, không route-guard (cùng nhóm với `/`, xem `permissions-matrix.md`)

---

### F005: Thể lệ SAA 2025 (Standards)

**Type**: ui
**Description**: Khách (ẩn danh hoặc đã đăng nhập) xem trang công khai `/standards`: thể lệ đầy đủ SAA 2025 — huy hiệu Hero cho người nhận Kudos (4 hạng), Secret Box 6-icon cho người gửi Kudos, Kudos Quốc dân — lấp link chết "Tiêu chuẩn chung" trước đó trỏ tới route chưa tồn tại. Nội dung 100% tĩnh (i18n namespace `standards`) — không bảng Supabase, không DAL, không migration nào, khác hẳn F004_AwardSystemPage. Trang KHÔNG dùng lại `SiteHeader`/`SiteFooter` (khác `/`, `/awards`) — design chỉ vẽ 1 panel, không có chrome nào trong node tree.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: `src/app/(public)/standards/page.tsx` + `standards/_components/**` (`StandardsClient`, `StandardsScreen`, `HeroBadgeTierRow`, `SecretBoxBadge`) + `standards/_hooks/use-standards-close.ts` + `standards/_shared/{standards-copy,build-standards-copy}.ts`

**Related Screens**:
- SCR005_Standards: Thể lệ SAA 2025

**Related User Stories**:
- TBD (draft, local) — xem `features/F005_StandardsRulesPage/functional-spec.md § 7` (theo đúng tiền lệ F003/F004, không đăng ký vào `user-stories.md`)

**Related APIs/Routes**:
- Không có ROUTE### mới — 1 frontend page tĩnh, không route BE nào tự viết (cùng lý do F004)

**Related Data Models**:
- Không có MODEL### mới — `StandardsCopy` là content-shape tĩnh dựng từ i18n, không phải bảng Supabase (cùng lý do MODEL003_LoginCopy)
- MODEL001_AppLocale (tái dùng nguyên trạng — chỉ locale quyết định bản dịch)

**Related Background Logic**:
- Không có BL### mới — không tích hợp Supabase/external service nào

**Related Permissions**:
- Không có PERM### mới — `/standards` PUBLIC, không route-guard, cùng nhóm `/` và `/awards` (xem `permissions-matrix.md`)

---

### F006: Hồ sơ Sunner (Profile)

**Type**: mixed
**Description**: Sunner đã đăng nhập xem hồ sơ của chính mình (`/profile`) hoặc của một Sunner
khác (`/profile?id={uuid}`) — hero (tên + avatar, không dept/tier/stars), 6 ô badge khoá, statistics
card 5 dòng `0` (self) hoặc thanh "Viết Kudo" disabled thay thế (other), dropdown chiều Kudos (self
2 chiều, other chỉ Received). Route nằm trong nhóm `(protected)`, dùng lại đúng gate của `/todo` —
không gate riêng. Mọi bề mặt phụ thuộc hệ Kudos (chưa tồn tại) render honest rỗng/disabled, cùng
tiền lệ Secret Box của F005. Lấp link chết "Hồ sơ" trước đó ở menu tài khoản.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: `src/app/(protected)/profile/page.tsx` + `profile/_components/**` +
`profile/_utils/parse-profile-id.ts` + `profile/_shared/{profile-copy,build-profile-copy}.ts` +
`src/dal/{profile-cards,profile-cards-client}.ts`

**Related Screens**:
- SCR006_Profile: Hồ sơ Sunner

**Related User Stories**:
- TBD (draft, local) — xem `features/F006_ProfilePage/functional-spec.md § 7` (theo đúng tiền lệ
  F003-F005, không đăng ký vào `user-stories.md`)

**Related APIs/Routes**:
- Không có ROUTE### mới — 1 frontend page có gác đăng nhập, không route BE nào tự viết (cùng lý do
  F004/F005)

**Related Data Models**:
- `ProfileCard` (chưa có MODEL### riêng — view `public.profile_cards`, cấp bởi core pass kế tiếp,
  xem `entities.md`)
- MODEL002_SupabaseUser (tái dùng — header dùng chung với F003/F004)
- MODEL001_AppLocale (tái dùng nguyên trạng)

**Related Background Logic**:
- Không có BL### mới — dùng lại `SupabaseServerClient` (BL002) qua DAL mới, cùng pattern
  `awards.ts`/`users.ts` (chưa có dòng riêng nào trong `behavior-logic.md` cho client Supabase kiểu
  này, giống F004)

**Related Permissions**:
- Không có PERM### mới cấp chính thức — `/profile` gia nhập ĐÚNG cơ chế route-guard hiện có của
  `(protected)/layout.tsx` (cùng PERM003_TodoRouteGuard), chỉ thêm 1 route con được bảo vệ; mã
  chính thức "TBD (draft)", cấp bởi `rebuild-spec` Core pass kế tiếp (xem `permissions-matrix.md`)

---

### F007: Bảng Kudos trực tiếp (`/kudos`)

**Type**: mixed
**Description**: Sunner mở `/kudos` và đọc được toàn bộ đời sống lời cảm ơn của sự kiện trong
một trang: banner ghi nhận, carousel HIGHLIGHT 5 kudo nhiều tim nhất, bảng Spotlight điểm tên
người nhận kèm tổng số kudo, feed ALL KUDOS cuộn vô hạn, và sidebar thống kê cá nhân cộng hai
bảng xếp hạng. Bộ lọc Hashtag và Phòng ban thu hẹp đồng thời cả carousel lẫn feed. Trang mở cho
cả người chưa đăng nhập — lấp 5 điểm liên kết `/kudos` đang 404 (nav header, footer, khối Sun*
Kudos ở `/` và `/awards`, widget hành động nhanh, nút "Viết KUDOS" ở `/standards`). "Live board"
là nhãn design, không phải Supabase Realtime — server render + revalidate.

**Vì sao đây là MỘT outcome**: mọi bề mặt trong screen phục vụ đúng một ý định — *nhìn thấy ai
đã cảm ơn ai trong sự kiện này*. Carousel, Spotlight và feed là ba lát cắt của cùng một tập dữ
liệu (`kudos`), khác nhau ở thứ tự và mức tổng hợp chứ không ở mục đích; bộ lọc chỉ thu hẹp tập
đó. Sidebar là cùng dữ liệu soi từ góc "của tôi". Tách bất kỳ mảnh nào thành F### riêng sẽ tạo
ra một Feature không có ý định độc lập của chính nó.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components** *(planned — promote ở implement-start, code chưa tồn tại)*:
`src/app/(public)/kudos/page.tsx` + `kudos/_components/**` + `kudos/_hooks/{use-carousel-index,
use-spotlight-search,use-infinite-feed}.ts` + `kudos/_utils/{format-kudo-time,star-tier}.ts` +
`kudos/_actions/load-more-kudos.ts` + `kudos/_shared/{kudos-copy,build-kudos-copy}.ts` +
`src/dal/{kudos,kudos-client}.ts` + migration `0006_kudos.sql`

**Related Screens**:
- SCR007_KudosLiveBoard: Bảng Kudos trực tiếp (dùng CHUNG với F008 — F007 sở hữu board và render
  nút tim, F008 sở hữu bảng `kudo_hearts` và đường ghi)

**Related User Stories**:
- TBD (draft, local) — xem `features/F007_KudosLiveBoard/functional-spec.md § 7` (US001-US008
  local, theo đúng tiền lệ F003-F006, không đăng ký vào `user-stories.md`)

**Related APIs/Routes**:
- Không có ROUTE### mới — `/kudos` là 1 frontend page; `loadMoreKudos` là Next.js Server Action,
  không phải HTTP endpoint có path (cùng lý do `setLocale` ở F002, xem `api-map.md` § Server Actions)

**Related Data Models**:
- `Kudo` / `KudoCard` (bảng `public.kudos` + view `public.kudos_cards`, migration `0006`; chưa có
  MODEL### riêng — cấp bởi core pass kế tiếp, xem `entities.md`)
- MODEL002_SupabaseUser (mở rộng: cột `department` nullable mới — nguồn DUY NHẤT của bộ lọc Phòng
  ban và của phòng ban hiển thị trên thẻ)
- MODEL001_AppLocale (tái dùng nguyên trạng)

**Related Background Logic**:
- Không có BL### mới — dùng lại `SupabaseServerClient` (BL002) qua DAL mới `src/dal/kudos.ts`,
  cùng pattern `awards.ts`/`profile-cards.ts` (chưa có dòng riêng nào trong `behavior-logic.md`
  cho client Supabase kiểu này, giống F004/F006)

**Related Permissions**:
- Không có PERM### mới — `/kudos` PUBLIC, không route-guard, gia nhập đúng nhóm `/`, `/awards`,
  `/standards` (BR-015); redirect khi người chưa đăng nhập bấm avatar/tên là gate CÓ SẴN của
  `/profile` (cơ chế PERM003 qua `(protected)/layout.tsx`, F006), không phải gate mới của F007

**Ngoài phạm vi** (cần một frame Figma chưa tồn tại — xem `clarifications.md`): dialog Viết Kudo
(`ihQ26W78P2`) · dialog Secret Box (`J3-4YFIpMM`) · trang chi tiết kudo (`onDIohs2bS`) · hover
preview profile (`Bf5XiTE7AO`) · lightbox ảnh · pan/zoom Spotlight (`B.7.2` là FRAME rỗng).

---

### F008: Thả tim cho Kudos

**Type**: mixed
**Description**: Sunner đã đăng nhập bấm trái tim trên một kudo để bày tỏ đồng tình. Lượt tim
được ghi vào DB, số tim trên thẻ đổi ngay, và tài khoản **người gửi** kudo được cộng tim tương
ứng. Bỏ tim thu hồi đúng số đã cộng. Feature không có route hay screen riêng — nút tim là 1
control nằm trong `/kudos` mà F007 sở hữu và render.

**Vì sao đây là outcome RIÊNG, không gộp vào F007**: đối chiếu đúng phép thử mà F001 đã áp (một
sub-behavior chỉ enforce trạng thái do feature khác tạo ra thì KHÔNG được tách). Thả tim vượt
phép thử đó ở ba điểm: nó là **ghi**, có bảng riêng và ba business rule riêng (một lượt/người/kudo
· người gửi bị chặn tự thả tim · bỏ tim thu hồi đúng số); nó có **actor hẹp hơn** F007 (bắt buộc
đăng nhập, trong khi F007 mở cho anonymous); và nó thay đổi số dư của **một người thứ ba** (người
gửi), nuôi tiếp hệ hoa thị / Hero tier chứ không chỉ đổi cái đang hiển thị. Đó là một ý định
người dùng độc lập, không phải hệ quả của việc đọc bảng.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components** *(planned)*: migration `0007_kudo_hearts.sql` (bảng + RLS + trigger
`sync_kudo_heart_count`) + `src/dal/{kudo-hearts,kudo-hearts-client}.ts` +
`src/app/(public)/kudos/_actions/toggle-kudo-heart.ts` +
`kudos/_components/kudos-heart-button.tsx` *(component do F007 render, F008 cấp đường ghi)*

**Related Screens**:
- SCR007_KudosLiveBoard: Bảng Kudos trực tiếp (dùng chung với F007 — F008 không tạo screen mới)

**Related User Stories**:
- TBD (draft, local) — xem `features/F008_KudosHeartReaction/functional-spec.md § 7` (US001
  local, cùng tiền lệ F003-F007)

**Related APIs/Routes**:
- Không có ROUTE### mới — `toggleKudoHeart` là Next.js Server Action, không phải HTTP endpoint
  có path

**Related Data Models**:
- `KudoHeart` (bảng `public.kudo_hearts`, migration `0007`; chưa có MODEL### riêng — cấp bởi core
  pass kế tiếp, xem `entities.md`)
- `Kudo` (F007) — cột `heart_count` denormalized do trigger của F008 duy trì (AD-1, `plan.md`)
- MODEL002_SupabaseUser (tái dùng — người thả tim và người gửi kudo được cộng tim)

**Related Background Logic**:
- Không có BL### mới — dùng lại `SupabaseServerClient` (BL002) qua DAL mới
  `src/dal/kudo-hearts.ts`; trigger `SECURITY DEFINER` là logic trong DB, không phải BL### client

**Related Permissions**:
- **TBD (draft)** — quyền ghi tim là RLS trên `public.kudo_hearts` (chỉ `authenticated`, chỉ row
  của chính mình), KHÔNG phải route-guard nên không gia nhập PERM001-004; mã chính thức để
  `rebuild-spec` Core pass kế tiếp cấp, cùng tiền lệ mà F006 đã dùng. Xem
  `docs/vi/system/permissions.md` cho bản ghi narrative.

**Ngoài phạm vi**: quy tắc "+2 tim trong ngày đặc biệt do admin cấu hình" — không có màn admin,
không có bảng config, không dựng được precondition của test case. Cột `special` vẫn được tạo sẵn
trong migration để lần sau không phải migrate lại.

---

## Summary

- **Total Features**: 10 (cập nhật 2026-09-08 — thêm F010)
- **Total Screens**: 8 — SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen (F003), SCR004_Awards (F004), SCR005_Standards (F005), SCR006_Profile (F006), SCR007_KudosLiveBoard (F007 + F008 + F010 — screen được BA F### cùng tham chiếu, F010 chỉ mở modal phủ trên, không có SCR### riêng), SCR008_KudosCompose (F009 — dialog không route riêng); cả tám đều được ít nhất một F### tham chiếu
- **Total User Stories**: 3 — US001 (F002), US002 (F001), US003 (F001); F003-F010 chưa có US### chính thức (TBD, xem `/tkm:rebuild-spec --features F003,F004,F005,F006,F007,F008,F009,F010`)
- **Total Routes**: 1 — ROUTE001 (F001); F004-F010 không có ROUTE### mới (frontend page + Server Action/RPC, không route BE nào tự viết — F009 thêm 2 Server Action mới, `createKudo`/`searchSunners`; F010 thêm 1 Server Action `openSecretBoxAction` gọi `.rpc("open_secret_box")`, không phải ROUTE###)
- **Total Data Models**: 3 — MODEL001 (F002), MODEL002 (F001 + F003, mở rộng `role`), MODEL003 (không map F### — copy tĩnh của SCR001, xem ghi chú bên dưới); `Award` (F004), `ProfileCard` (F006), `Kudo`/`KudoHeart` (F007/F008), `KudoImage` trên `storage.objects` (F009), `SecretBoxOpening` (F010, bảng `public.secret_box_openings`) đều chưa có MODEL### riêng (TBD, xem `entities.md`); F005 không có MODEL### mới (`StandardsCopy` là content-shape tĩnh, cùng lý do MODEL003); F009 mở rộng `Kudo` sẵn có (2 cột ẩn danh) thay vì tạo model mới; F010 chỉ đọc `Kudo` sẵn có, không ghi thêm cột nào lên đó
- **Total Background Logic**: 3 — BL001, BL002, BL003 (F001; F003/F007/F009 dùng lại BL002); F004-F010 không có BL### mới (RPC `open_secret_box()` của F010 là hàm Postgres `SECURITY DEFINER`, logic trong DB, không phải BL### client)
- **Total Permissions**: 4 — PERM001-004 (F001; PERM001 nay superseded do F003 — xem `permissions-matrix.md`); F004, F005 không tạo PERM### mới (`/awards`, `/standards` PUBLIC, cùng nhóm `/`); F006 không tạo PERM### mới (`/profile` protected, gia nhập cơ chế PERM003 hiện có — mã "TBD (draft)", cấp bởi core pass kế tiếp); F007/F008 (thả tim), F009 (gửi Kudo + upload ảnh + ẩn danh) và F010 (RPC `open_secret_box`, chỉ `authenticated` được `GRANT EXECUTE`) đều mở trục phân quyền GHI mới nhưng CHƯA cấp mã PERM### riêng — chờ `rebuild-spec` Core pass, xem `permissions-matrix.md § /kudos` và `permissions.md § Bổ sung dự kiến`
- **Languages Detected**: TypeScript

**Ghi chú MODEL003_LoginCopy**: đây là content-shape tĩnh (copy Figma của `/login`, không phải domain data) dùng chung bởi cả hai vùng của SCR001 (hero copy thuộc F001, `languageLabel` thuộc F002) — không gán riêng cho một F### vì không có US### nào trực tiếp tiêu thụ nó như dữ liệu nghiệp vụ; đây là input tĩnh cho UI, tương tự cách `data-model.md` tự mô tả nó ("không phải domain/persisted data"). Không phải orphan theo nghĩa quy tắc reviewer (quy tắc coverage chỉ bắt buộc với US###/SCR###), nêu ở đây để tường minh.

## Cross-Reference Validation

- [x] All F### codes are unique (F001-F010 — không trùng, không renumber; F007/F008 cấp ở block liền `[F007..F008]`, F009 kế tiếp liền, F010 kế tiếp liền, id_contiguity PASS)
- [x] All F### codes are referenced in UserStories.md — N/A hướng ngược: mọi US### đều được một F### tham chiếu (US001→F002, US002→F001, US003→F001); F003-F010 chưa có US### chính thức (TBD)
- [x] All screen references are valid (SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen, SCR004_Awards, SCR005_Standards, SCR006_Profile, SCR007_KudosLiveBoard, SCR008_KudosCompose tồn tại trong `screen-flow.md`/`screen-list.md`)
- [x] All user story references are valid (US001-003 tồn tại trong `user-stories.md`)
- [x] All route references are valid (ROUTE001 tồn tại trong `route-list.md`; F004-F010 không có ROUTE### mới)
- [x] All data model references are valid (MODEL001, MODEL002 tồn tại trong `entities.md`; `Award` (F004), `ProfileCard` (F006), `Kudo`/`KudoHeart` (F007/F008), `SecretBoxOpening` (F010) thêm mới, chưa có MODEL### riêng; F005 không thêm model nào; F009 mở rộng `Kudo` sẵn có, không tạo model mới; F010 chỉ đọc `Kudo` sẵn có, không tạo model mới)
- [x] All behavior logic references are valid (BL001-003 tồn tại trong `behavior-logic.md`)
- [x] All permission references are valid (PERM001-004 tồn tại trong `permissions-matrix.md`; PERM001 nay superseded; F004, F005, F006 không tạo PERM### mới; F007/F008/F009/F010 chờ mã core pass, xem Summary)
- [x] Every US has a parent feature (F###) — US001→F002; US002, US003→F001
- [x] Every screen has a parent feature (F###) — SCR001→F001+F002; SCR002→F001; SCR003→F003; SCR004→F004; SCR005→F005; SCR006→F006; SCR007→F007+F008+F010; SCR008→F009
- [x] Every route maps to a feature (F###) — ROUTE001→F001
- [x] Every data model maps to a feature (F###) — MODEL001→F002; MODEL002→F001+F003; MODEL003 dùng chung, xem ghi chú Summary; `Award`→F004; `ProfileCard`→F006; `Kudo`/`KudoHeart`→F007/F008 (F009 mở rộng `Kudo`, F010 chỉ đọc); `SecretBoxOpening`→F010
- [x] Every background logic maps to a feature (F###) — BL001-003→F001 (BL002 dùng lại ở F003/F007/F009)
- [x] Every permission maps to a feature (F###) — PERM001-004→F001

### F009: Viết Kudo (dialog soạn Kudos trên /kudos)

**Type**: mixed
**Description**: Sunner đã đăng nhập mở dialog "Viết Kudo" từ pill trên `/kudos`, chọn người
nhận, đặt một Danh hiệu, viết lời cảm ơn (toolbar định dạng + `@ + tên`), gắn 1–5 hashtag, đính
tối đa 5 ảnh, tuỳ chọn gửi ẩn danh, rồi Gửi. Đây là **đường INSERT đầu tiên vào `public.kudos`**
(policy `kudos_insert_own`, migration `0009`), lần đầu dự án dùng **Supabase Storage** (bucket
`kudo-images`, migration `0010`), và vá view `kudos_cards` để ẩn danh không rò danh tính người gửi.

**Vì sao đây là outcome RIÊNG, không gộp vào F007**: F007 là bảng đọc công khai; F009 là hành vi
GHI với actor hẹp hơn (bắt buộc đăng nhập), có màn riêng (dialog SCR008_KudosCompose — frame Figma
`ihQ26W78P2` mà F007 đã ghi là "chưa build"), schema delta riêng (2 cột ẩn danh + policy ghi +
bucket), và tạo ra dữ liệu mới thay vì hiển thị dữ liệu có sẵn.

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components**: migration `0009_kudos_write_anonymity.sql` + `0010_kudo_images_bucket.sql`
+ `src/dal/{sunner-search,sunner-search-client}.ts` +
`src/app/(public)/kudos/_actions/{create-kudo,upload-kudo-images,search-sunners}.ts` +
`kudos/_components/kudos-compose-{dialog,field,footer,form,body,launcher}.tsx`,
`kudos-{recipient,title,content,hashtag,image,anonymous}-field.tsx`, `kudos-format-toolbar.tsx`,
`kudos-hashtag-picker.tsx`, `kudos-sunner-options.tsx`, `kudos-keyvisual-band.tsx`,
`kudo-markdown-text.tsx` (component `kudos-compose-pill.tsx` sửa lại, không mới) +
`kudos/_hooks/use-kudos-compose-{dialog,form,attachments,content}.ts`, `kudos-compose-draft.ts`,
`kudos-compose-form-rules.ts`, `use-sunner-suggest.ts` +
`kudos/_utils/validate-kudo-{draft,images}.ts`, `insert-markdown-marker.ts`, `parse-kudo-markdown.ts`

**Related Screens**:
- SCR008_KudosCompose: Viết Kudo (dialog soạn Kudos trên /kudos) (mới — dialog phủ trên SCR007_KudosLiveBoard, không route riêng)

**Related User Stories**:
- TBD (draft, local) — xem `features/F009_KudosCompose/functional-spec.md § 6` (US001-US004 local, cùng tiền lệ F003-F008)

**Related APIs/Routes**:
- Không có ROUTE### mới — `createKudo`, `searchSunners` là Next.js Server Action, không phải HTTP endpoint có path

**Related Data Models**:
- `Kudo` (F007) — mở rộng 2 cột `is_anonymous`, `anonymous_name` (migration `0009`); view `kudos_cards` bọc `CASE WHEN is_anonymous` trên cột sender
- `KudoImage` (`storage.objects`, bucket `kudo-images`, migration `0010`; chưa có MODEL### riêng — cấp bởi core pass kế tiếp)
- `ProfileCard` (F006, view `profile_cards`) — tái dùng làm nguồn tìm người nhận, đúng 3 cột, không nới SELECT list

**Related Background Logic**:
- Không có BL### mới — dùng lại `SupabaseServerClient` (BL002) qua DAL mới `src/dal/sunner-search.ts` và Server Action `create-kudo.ts`

**Related Permissions**:
- TBD (draft) — `kudos_insert_own` (WITH CHECK `sender_id = auth.uid()`), 2 policy `storage.objects` cho bucket `kudo-images` (authenticated INSERT, public SELECT); xem `docs/vi/system/permissions.md § Bổ sung dự kiến — F009_KudosCompose`

---

### F010: Mở Secret Box trên /kudos

**Type**: mixed
**Description**: Người dùng Kudos đã đăng nhập mở modal Secret Box trên `/kudos`, bấm vào box để
máy chủ rút ngẫu nhiên 1 trong 6 huy hiệu và ghi lại lượt mở. Entitlement tính theo lượt tim chính
người dùng đã GỬI (không phải nhận) — cứ 5 lượt tim thì được thêm 1 hộp. Toàn bộ tính entitlement,
rút ngẫu nhiên có trọng số, và chống double-click/đa tab chạy trong một hàm Postgres `SECURITY
DEFINER` mới (`open_secret_box()`, migration `0011`) — `.rpc()` đầu tiên của repo.

**Vì sao đây là outcome RIÊNG, không gộp vào F007/F008**: F007 là bảng đọc công khai; F008 là ghi
tim phục vụ người NHẬN kudo. F010 phục vụ chính người GỬI kudo, đổi lượt tim tích luỹ thành phần
thưởng cụ thể (huy hiệu) qua một bảng ghi riêng (`secret_box_openings`) và một hàm RPC `SECURITY
DEFINER` riêng — không phải hệ quả đọc lại dữ liệu của F007/F008 mà là một ý định người dùng độc
lập (mở hộp để nhận thưởng).

**Workspace**: agentic-coding-hands-on
**Languages**: TypeScript
**Components** *(implemented — đã merge, xác nhận theo code thật)*: migration
`0011_secret_box.sql` + `src/dal/secret-box.ts` + `src/dal/secret-box-client.ts` +
`src/dal/kudos-stats.ts` (mở rộng) +
`src/app/(public)/kudos/_components/{secret-box-launcher,secret-box-dialog}.tsx` +
`src/app/(public)/kudos/_hooks/use-secret-box-dialog.ts` +
`src/app/(public)/kudos/_actions/open-secret-box.ts` +
`src/app/(public)/kudos/_utils/secret-box-badge-asset.ts` (khai báo lại 6 badge cục bộ, KHÔNG dời
`standards/_shared/standards-copy.ts` như bản draft từng giả định) +
`src/app/(public)/kudos/_shared/build-kudos-copy.ts` (mở rộng)

**Related Screens**:
- SCR007_KudosLiveBoard: Bảng Kudos trực tiếp (modal phủ trên board có sẵn, không có SCR### riêng
  — dùng chung với F007/F008)

**Related User Stories**:
- TBD (draft, local) — xem `features/F010_SecretBoxModal/functional-spec.md § 7` (US001-US003
  local, cùng tiền lệ F007-F009)

**Related APIs/Routes**:
- Không có ROUTE### mới — `openSecretBoxAction` là Next.js Server Action gọi
  `.rpc("open_secret_box")`, không phải HTTP endpoint có path

**Related Data Models**:
- `SecretBoxOpening` (bảng `public.secret_box_openings`, migration `0011`; chưa có MODEL### riêng
  — cấp bởi core pass kế tiếp, xem `entities.md`)
- `Kudo` (F007) — chỉ đọc `sender_id`, `heart_count` để tính entitlement, không ghi thêm cột nào

**Related Background Logic**:
- Không có BL### mới — RPC `open_secret_box()` là hàm Postgres `SECURITY DEFINER`, logic nằm
  trong DB, không phải BL### client (cùng lý do trigger `sync_kudo_heart_count` của F008)

**Related Permissions**:
- TBD (draft) — RPC `REVOKE ALL ... FROM anon, PUBLIC` rồi `GRANT EXECUTE ... TO authenticated`;
  không phải route-guard nên không gia nhập PERM001-004; mã chính thức để `rebuild-spec` Core pass
  kế tiếp cấp, cùng tiền lệ F007/F008/F009. Xem `docs/vi/system/permissions.md`.

**Ngoài phạm vi**: nút "Mở Secret Box" trên `/profile` (giữ `disabled` — chưa có đường ống stats
thật, xem `functional-spec.md § 3` D002); phản chiếu huy hiệu vừa nhận vào `BadgeCollection` của
`/profile` (D003) — bảng `secret_box_openings` đã đủ dữ liệu để làm sau, ngoài scope PR này.
