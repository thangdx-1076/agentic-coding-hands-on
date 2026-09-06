# Feature List

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: toàn bộ source hiện có — 2 screen (`/login`, `/todo`), 1 backend route, 3 US###, 3 BL###, 4 PERM###, 3 MODEL###

**F-code stability note**: F001/F002 và slug của chúng được giữ nguyên từ `docs/vi/_canonical-fcodes.json` (đã promote ở lần chạy trước) — wave này chỉ bổ sung các trường Related bằng mã thật (US###/SCR###/ROUTE###/MODEL###/BL###/PERM###) hiện đã tồn tại, không renumber/rename/split/merge.

## Feature Hierarchy

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F001_GoogleOAuthLogin | Đăng nhập Google OAuth & Bảo vệ truy cập | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F002_LanguageSwitch | Chuyển đổi ngôn ngữ giao diện (VN/EN) | ui | TypeScript | agentic-coding-hands-on | P1 |
| F003_Homepage | Trang chủ SAA 2025 (Homepage) | mixed | TypeScript | agentic-coding-hands-on | P0 |

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
**Description**: Khách (ẩn danh hoặc đã đăng nhập) xem trang chủ công khai `/` của SAA 2025: hero ROOT FURTHER với đồng hồ đếm ngược tới `EVENT_START_AT`, thông tin sự kiện, CTA sang Awards Information / Sun* Kudos, nội dung Root Further, 6 thẻ hạng mục giải thưởng (link `/awards#<slug>`), khối Sun* Kudos, widget hành động nhanh; header hiển thị bell + menu tài khoản theo role (`public.users.role`, fail-open `member`) cho người đã đăng nhập. `/` không còn redirect (PERM001 hết hiệu lực); đích sau đăng nhập đổi từ `/todo` sang `/`.

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

## Summary

- **Total Features**: 3
- **Total Screens**: 3 — SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen (F003; cả ba đều được ít nhất một F### tham chiếu)
- **Total User Stories**: 3 — US001 (F002), US002 (F001), US003 (F001); F003 chưa có US### chính thức (TBD, xem `/tkm:rebuild-spec --features F003`)
- **Total Routes**: 1 — ROUTE001 (F001)
- **Total Data Models**: 3 — MODEL001 (F002), MODEL002 (F001 + F003, mở rộng `role`), MODEL003 (không map F### — copy tĩnh của SCR001, xem ghi chú bên dưới)
- **Total Background Logic**: 3 — BL001, BL002, BL003 (F001; F003 dùng lại BL002)
- **Total Permissions**: 4 — PERM001-004 (F001; PERM001 nay superseded do F003 — xem `permissions-matrix.md`)
- **Languages Detected**: TypeScript

**Ghi chú MODEL003_LoginCopy**: đây là content-shape tĩnh (copy Figma của `/login`, không phải domain data) dùng chung bởi cả hai vùng của SCR001 (hero copy thuộc F001, `languageLabel` thuộc F002) — không gán riêng cho một F### vì không có US### nào trực tiếp tiêu thụ nó như dữ liệu nghiệp vụ; đây là input tĩnh cho UI, tương tự cách `data-model.md` tự mô tả nó ("không phải domain/persisted data"). Không phải orphan theo nghĩa quy tắc reviewer (quy tắc coverage chỉ bắt buộc với US###/SCR###), nêu ở đây để tường minh.

## Cross-Reference Validation

- [x] All F### codes are unique (F001, F002, F003 — không trùng, không renumber)
- [x] All F### codes are referenced in UserStories.md — N/A hướng ngược: mọi US### đều được một F### tham chiếu (US001→F002, US002→F001, US003→F001); F003 chưa có US### (TBD)
- [x] All screen references are valid (SCR001_LoginScreen, SCR002_TodoScreen, SCR003_HomeScreen tồn tại trong `screen-list.md`)
- [x] All user story references are valid (US001-003 tồn tại trong `user-stories.md`)
- [x] All route references are valid (ROUTE001 tồn tại trong `route-list.md`)
- [x] All data model references are valid (MODEL001, MODEL002 tồn tại trong `entities.md`)
- [x] All behavior logic references are valid (BL001-003 tồn tại trong `behavior-logic.md`)
- [x] All permission references are valid (PERM001-004 tồn tại trong `permissions-matrix.md`; PERM001 nay superseded)
- [x] Every US has a parent feature (F###) — US001→F002; US002, US003→F001
- [x] Every screen has a parent feature (F###) — SCR001→F001+F002; SCR002→F001; SCR003→F003
- [x] Every route maps to a feature (F###) — ROUTE001→F001
- [x] Every data model maps to a feature (F###) — MODEL001→F002; MODEL002→F001+F003; MODEL003 dùng chung, xem ghi chú Summary
- [x] Every background logic maps to a feature (F###) — BL001-003→F001 (BL002 dùng lại ở F003)
- [x] Every permission maps to a feature (F###) — PERM001-004→F001
