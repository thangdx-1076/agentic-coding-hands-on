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

## Summary

- **Total Features**: 6
- **Total Screens**: 6 — SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen (F003), SCR004_Awards (F004), SCR005_Standards (F005), SCR006_Profile (F006; cả sáu đều được ít nhất một F### tham chiếu)
- **Total User Stories**: 3 — US001 (F002), US002 (F001), US003 (F001); F003, F004, F005, F006 chưa có US### chính thức (TBD, xem `/tkm:rebuild-spec --features F003,F004,F005,F006`)
- **Total Routes**: 1 — ROUTE001 (F001); F004, F005, F006 không có ROUTE### mới (mỗi cái chỉ 1 frontend page, không route BE)
- **Total Data Models**: 3 — MODEL001 (F002), MODEL002 (F001 + F003, mở rộng `role`), MODEL003 (không map F### — copy tĩnh của SCR001, xem ghi chú bên dưới); `Award` (F004) và `ProfileCard` (F006) chưa có MODEL### riêng (TBD, xem `entities.md`); F005 không có MODEL### mới (`StandardsCopy` là content-shape tĩnh, cùng lý do MODEL003)
- **Total Background Logic**: 3 — BL001, BL002, BL003 (F001; F003 dùng lại BL002); F004, F005, F006 không có BL### mới
- **Total Permissions**: 4 — PERM001-004 (F001; PERM001 nay superseded do F003 — xem `permissions-matrix.md`); F004, F005 không tạo PERM### mới (`/awards`, `/standards` PUBLIC, cùng nhóm `/`); F006 không tạo PERM### mới (`/profile` protected, gia nhập cơ chế PERM003 hiện có — mã "TBD (draft)", cấp bởi core pass kế tiếp)
- **Languages Detected**: TypeScript

**Ghi chú MODEL003_LoginCopy**: đây là content-shape tĩnh (copy Figma của `/login`, không phải domain data) dùng chung bởi cả hai vùng của SCR001 (hero copy thuộc F001, `languageLabel` thuộc F002) — không gán riêng cho một F### vì không có US### nào trực tiếp tiêu thụ nó như dữ liệu nghiệp vụ; đây là input tĩnh cho UI, tương tự cách `data-model.md` tự mô tả nó ("không phải domain/persisted data"). Không phải orphan theo nghĩa quy tắc reviewer (quy tắc coverage chỉ bắt buộc với US###/SCR###), nêu ở đây để tường minh.

## Cross-Reference Validation

- [x] All F### codes are unique (F001, F002, F003, F004, F005, F006 — không trùng, không renumber)
- [x] All F### codes are referenced in UserStories.md — N/A hướng ngược: mọi US### đều được một F### tham chiếu (US001→F002, US002→F001, US003→F001); F003, F004, F005, F006 chưa có US### (TBD)
- [x] All screen references are valid (SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen, SCR004_Awards, SCR005_Standards, SCR006_Profile tồn tại trong `screen-flow.md`/`screen-list.md`)
- [x] All user story references are valid (US001-003 tồn tại trong `user-stories.md`)
- [x] All route references are valid (ROUTE001 tồn tại trong `route-list.md`; F004, F005, F006 không có ROUTE### mới)
- [x] All data model references are valid (MODEL001, MODEL002 tồn tại trong `entities.md`; `Award` (F004) và `ProfileCard` (F006) thêm mới, chưa có MODEL### riêng; F005 không thêm model nào)
- [x] All behavior logic references are valid (BL001-003 tồn tại trong `behavior-logic.md`)
- [x] All permission references are valid (PERM001-004 tồn tại trong `permissions-matrix.md`; PERM001 nay superseded; F004, F005, F006 không tạo PERM### mới)
- [x] Every US has a parent feature (F###) — US001→F002; US002, US003→F001
- [x] Every screen has a parent feature (F###) — SCR001→F001+F002; SCR002→F001; SCR003→F003; SCR004→F004; SCR005→F005; SCR006→F006
- [x] Every route maps to a feature (F###) — ROUTE001→F001
- [x] Every data model maps to a feature (F###) — MODEL001→F002; MODEL002→F001+F003; MODEL003 dùng chung, xem ghi chú Summary; `Award`→F004; `ProfileCard`→F006
- [x] Every background logic maps to a feature (F###) — BL001-003→F001 (BL002 dùng lại ở F003)
- [x] Every permission maps to a feature (F###) — PERM001-004→F001
