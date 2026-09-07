# Screen List

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: route-view (Next.js 16 App Router) — 2 screens (`/login`, `/todo`) + SCR003-SCR005 bổ sung ở các wave sau (`/`, `/awards`, `/standards`)

**Code Format**: All codes MUST follow `SCR###_NameSlug` format (e.g., SCR001_LoginForm, SCR002_Dashboard) | `SCR###/REG###` for region-scoped references within a composite screen

**Note**: Feature mapping is managed in FeatureList.md only. UserStory mapping is done in UserStories.md (not in this document).

**Region Guidance**: Declare a Region only when it has ≥1 independence signal: distinct API endpoint (read or write), independent loading state, independent scroll container, independent auth / permission gate, distinct business workflow, distinct mutation surface / API cluster (distinct write endpoints or POST/PUT/DELETE namespace — even if the initial GET payload is shared), or distinct validation / action path. Shared initial payload does NOT disqualify a REG — if regions diverge on mutations, validation, or business workflow, they remain separate. Visual separation alone is NOT sufficient (trap 1).

**Region Cross-ref**: Region codes are per-screen; REG001 under SCR001 is distinct from REG001 under SCR002.

**REG Numbering**: Assign REG001, REG002, ... in top-to-bottom visual order as rendered at the screen's default viewport (desktop default if responsive). Ties broken by left-to-right reading order.

**Region Deprecation**: Regions table MAY include a `status` column with values `active` | `deprecated`. Deprecated regions keep their REG### number reserved.

## Screen Index

| Code | Name | Type | Components | Data Displayed |
|------|------|------|------------|----------------|
| SCR001_LoginScreen | Login | atomic | 10 | MODEL003_LoginCopy, MODEL001_AppLocale |
| SCR002_TodoScreen | Todo (placeholder) | atomic | 2 | MODEL002_SupabaseUser |
| SCR003_HomeScreen | Trang chủ (Homepage) | atomic | 14 | MODEL002_SupabaseUser (email, role qua public.users), MODEL001_AppLocale |
| SCR004_Awards | Hệ thống giải thưởng SAA 2025 | composite | 10 | MODEL002_SupabaseUser (email, dùng chung header F003), `Award` (chưa cấp MODEL### riêng) |
| SCR005_Standards | Thể lệ SAA 2025 | atomic | 9 | MODEL001_AppLocale (không đọc MODEL002 — trang không cá nhân hoá, không header) |
| SCR006_Profile | Hồ sơ Sunner | atomic | 11 | `ProfileCard` (chưa cấp MODEL### riêng — view `public.profile_cards`), MODEL002_SupabaseUser (email, dùng chung header F003), MODEL001_AppLocale |
| SCR007_KudosLiveBoard | Bảng Kudos trực tiếp | composite | 11 | `Kudo`/`KudoCard` (view `public.kudos_cards`, chưa cấp MODEL### riêng), `KudoHeart` (`public.kudo_hearts`, F008), MODEL002_SupabaseUser (email + cột `department` mới), MODEL001_AppLocale |

---

## SCR001_LoginScreen

**Type**: atomic

### Description

Màn hình đăng nhập công khai (`/login`) — cổng vào duy nhất của app khi chưa xác thực. Hiển thị key visual + copy Figma (`vi` mặc định, `en` qua next-intl), cho phép đổi ngôn ngữ và đăng nhập bằng Google (Supabase OAuth). Guard AUTHORITATIVE (`getAuthenticatedUser()`, `app/login/page.tsx:73-83`) fail OPEN — lỗi Supabase không chặn người dùng vào trang này, khác hẳn `/todo`. Nếu đã có session hợp lệ, redirect ngay sang `/` trước khi render (đổi từ `/todo`, xem SCR003_HomeScreen).

**Composite classification (H-rules, `composite-screen-detection.md`)**: atomic. H1 (feature refs) fail — chưa có F### nào tồn tại ở wave này. H2 (domain-module imports) fail — không import nào khớp `features/*`/`modules/*`/`domains/*` (chỉ có `@/lib/supabase/*`, `@/lib/i18n/*`, `@/components/login/*`, đều bị loại theo bảng include/exclude JS/TS). H3 (semantic region wrappers) fail — chỉ có 1 `<section>` (LoginHero); `<header>`/`<footer>` không nằm trong danh sách đếm của H3 (chỉ `section`/`article`/`aside`/`role="region"`), dưới ngưỡng 3. 2-of-3 gate: 0/3 → atomic, không có REG###.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| LoginClient (`app/login/login-client.tsx`) | client-boundary | Nối props với `useLoginActions` (`hooks/use-login-actions.ts`) — hook giữ state pending/lỗi, gọi `signInWithGoogle` (`lib/auth/sign-in-with-google.ts`) và Server Action `setLocale` |
| LoginScreen (`components/login/login-screen.tsx`) | layout (root) | Ghép bố cục toàn màn hình: background, header, hero, footer |
| LoginBackground | decorative | Ảnh key visual + 2 lớp gradient phủ, `aria-hidden` |
| LoginHeader | header | Logo tĩnh + LanguageSelector, sticky top |
| LanguageSelector | interactive (dropdown) | Menu chọn ngôn ngữ vi/en theo mẫu ARIA menu-button, gọi `onSelectLocale` |
| LoginHero | section | Logo Root Further, subtitle/tagline, nút Google login, alert lỗi |
| GoogleLoginButton | interactive (button) | CTA đăng nhập Google; disabled + spinner khi `pending` |
| LoginErrorAlert | alert | Hiển thị lỗi OAuth inline (`role="alert"`), ẩn khi không có lỗi |
| LoginFooter | footer | Dòng bản quyền, `position: fixed` bottom |
| IconDown / IconVnFlag / IconGoogle | icon | SVG tĩnh dùng trong LanguageSelector / GoogleLoginButton |

### Data Displayed

- Data Entity 1: MODEL003_LoginCopy (subtitle, tagline, loginButton, footer, logoAlt, heroAlt, languageLabel — copy `vi` mặc định từ `login-copy.ts`, bản `en` qua next-intl)
- Data Entity 2: MODEL001_AppLocale (locale hiện tại quyết định nhãn "VN"/"EN" trên LanguageSelector)

### Routes/URLs

- `/login`

### Related Screens

- SCR003_HomeScreen: Trang chủ (điều hướng khi OAuth thành công qua ROUTE001, hoặc khi guard phát hiện đã đăng nhập — đổi từ SCR002_TodoScreen)

---

## SCR002_TodoScreen

**Type**: atomic

### Description

Màn hình placeholder được bảo vệ (`/todo`) — chưa có tính năng todo thật (`app/todo/page.tsx:6-16`), tồn tại để chứng minh auth guard end-to-end. Guard AUTHORITATIVE gọi `getUser()` mỗi request, fail CLOSED: không có user → redirect `/login` ngay. Nội dung chỉ gồm lời chào theo email và nút đăng xuất.

**Composite classification**: atomic — không có tín hiệu H nào (không tab, không wizard, không import domain module, không có ≥3 wrapper ngữ nghĩa; chỉ 1 `<main>` chứa heading + form). Raw-div fallback không áp dụng vì đây không phải cấu trúc div thuần, nhưng kết quả vẫn atomic.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| Greeting heading | text | Chào user bằng email: `t("greeting", { email: user.email ?? "" })` |
| Logout form/button | interactive (form submit) | Submit Server Action `logoutAction` (`app/todo/actions.ts`) — gọi `supabase.auth.signOut()` rồi luôn redirect `/login` |

### Data Displayed

- Data Entity 1: MODEL002_SupabaseUser (chỉ field `email`, đọc từ `supabase.auth.getUser()`)

### Routes/URLs

- `/todo`

### Related Screens

- SCR001_LoginScreen: Login (đích redirect khi đăng xuất, hoặc khi guard phát hiện chưa đăng nhập)

---

## SCR003_HomeScreen

**Type**: atomic

**Feature:** F003 — Trang chủ SAA 2025 (Homepage)
**Route:** /
**Description:** Trang chủ công khai SAA 2025 (public, không guard) — hero ROOT FURTHER + đồng hồ đếm ngược (`EVENT_START_AT`), thông tin sự kiện, CTA, nội dung Root Further, 6 thẻ hạng mục giải thưởng, khối Sun* Kudos, widget hành động nhanh, header (nav + ngôn ngữ + bell + menu tài khoản theo role) và footer. `app/page.tsx` (Server Component) đọc session + role (`getUserRole`, fail-open `member`) rồi ủy quyền toàn bộ tương tác cho `app/home-client.tsx` (client boundary) — `HomeScreen`'s function props không thể băng qua render của Server Component.
**States:** anonymous, member, admin, countdown-running, event-reached (Coming soon ẩn), env-invalid (00 00 00), menu-open

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| HomeClient (`app/home-client.tsx`) | client-boundary | Nối props với `useSelectLocale` (`hooks/use-select-locale.ts`), dựng slot `CountdownTimer` xung quanh `HomeScreen` |
| HomeScreen (`components/home/home-screen.tsx`) | layout (root) | Ghép bố cục toàn màn hình: keyvisual nền, header, `<main>` (hero/CTA/Root Further/awards/kudos), footer, widget nổi |
| KeyvisualBackground | decorative | Ảnh nền hero full-bleed, `aria-hidden` |
| Header (`components/home/header.tsx`) | header | Logo, nav 3 link, LanguageSelector (F002, tái dùng), bell + menu tài khoản (đã đăng nhập) hoặc link đăng nhập (ẩn danh); sticky top |
| HeroSection | section | Heading "ROOT FURTHER" + slot đếm ngược + thông tin sự kiện |
| CountdownTimer (`components/home/countdown-timer.tsx`) | interactive (client, tick 1s) | Bọc `useCountdown` (`hooks/use-countdown.ts`), render `CountdownTiles` — seed từ `targetIso`/`initialNowMs` server truyền xuống |
| CtaButtons | interactive (link group) | "ABOUT AWARDS" → `/awards`, "ABOUT KUDOS" → `/kudos` |
| RootFurtherContent | section | Đoạn nội dung Root Further (nhiều paragraph) |
| AwardsSection (+ AwardCard × 6) | card grid | 6 thẻ hạng mục giải thưởng, mỗi thẻ link `/awards#<slug>` |
| KudosSection | section | Quảng bá Sun* Kudos, link "Chi tiết" → `/kudos` |
| HomeFooter | footer | Logo + nav 4 link + dòng bản quyền (tái dùng `login.footer`) |
| WidgetButton | interactive (dropdown menu) | Nút nổi fixed bottom-right, menu 2 mục (Sun* Kudos, Award Information) |
| AccountMenu | interactive (dropdown menu) | Menu tài khoản (Hồ sơ/Trang quản trị theo role/Đăng xuất), dùng `useMenuKeyboardNav` |
| NotificationBell | interactive (dialog) | Panel thông báo — luôn rỗng ("Bạn chưa có thông báo"), badge chỉ hiện khi `unreadCount > 0` |

### Data Displayed

- Data Entity 1: MODEL002_SupabaseUser (email, mở rộng `role` đọc qua `public.users` — `lib/auth/get-user-role.ts`, fail-open `member`)
- Data Entity 2: MODEL001_AppLocale (locale hiện tại quyết định nhãn "VN"/"EN" và bản dịch `home.*`)

### Routes/URLs

- `/`

### Related Screens

- SCR001_LoginScreen: Login (đích khi khách ẩn danh click "Đăng nhập", hoặc khi đăng xuất từ menu tài khoản)

---

## SCR004_Awards

**Type**: composite

**Feature:** F004 — Hệ thống giải thưởng SAA 2025 (Awards)
**Route:** /awards
**Description:** Trang công khai chi tiết 6 hạng mục giải thưởng SAA 2025 (public, không guard) — header/footer dùng chung với `/` (`SiteHeader`/`SiteFooter`, promoted lên `(public)/_components/`), hero ảnh + caption + h1, nav trái điều hướng nội-trang (click-scroll + scroll-spy) + 6 section giải (ảnh/mô tả/số lượng/giá trị) hoặc empty-state khi Supabase trả rỗng, khối Sun* Kudos tái dùng nguyên trạng từ F003. `src/app/(public)/awards/page.tsx` đọc `Award[]` qua DAL `getAwards()` (fail-open `[]`), không cá nhân hoá theo vai trò.
**States:** anonymous, member, admin, awards-empty (Supabase lỗi/rỗng → `AwardsEmptyState`), nav-scroll-spy-active

Chi tiết đầy đủ (layout region, 25 UI element, DOM contract): `docs/vi/screens/SCR004_Awards/spec.md`.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| AwardsClient (`_components/awards-client.tsx`) | client-boundary | Nối `viewer`/`awards` với `useAwardCategoryNav` (scroll-spy) |
| AwardCategoryNav | nav (sticky) | 6 mục điều hướng nội-trang, `aria-current` theo scroll-spy |
| AwardSection × 6 | card | 1 hạng mục giải: ảnh + h2 + mô tả + số lượng + giá trị |
| AwardsEmptyState | display field | Thay thế nav+6 section khi `awards=[]` |
| SiteHeader / SiteFooter / KudosSection | shared (F003) | Header, footer, khối Sun* Kudos — dùng chung nguyên trạng với SCR003_HomeScreen |

### Data Displayed

- Data Entity 1: `Award` (6 hàng — tiêu đề, mô tả, số lượng, giá trị, slug; chưa cấp MODEL### riêng, xem `entities.md`)
- Data Entity 2: MODEL002_SupabaseUser (email — chỉ để cá nhân hoá header dùng chung, không phải nội dung trang)

### Routes/URLs

- `/awards`

### Related Screens

- SCR003_HomeScreen: Trang chủ (nguồn — CTA "ABOUT AWARDS" + 6 thẻ giải; đích khi click "Đăng nhập"/"Đăng xuất")

---

## SCR005_Standards

**Type**: atomic

**Feature:** F005 — Thể lệ SAA 2025 (Standards)
**Route:** /standards
**Description:** Trang công khai trình bày đầy đủ thể lệ SAA 2025 (public, không guard, không header/footer — KHÁC SCR003/SCR004) — panel phải màn hình nền `#00101A`: tiêu đề "Thể lệ" + 3 section (Hero badge 4 hạng, Secret Box 6-icon, Kudos Quốc dân) + footer 2 nút ("Đóng" → `router.back()`/fallback `/`, "Viết KUDOS" → `/kudos`). Nội dung 100% tĩnh từ i18n namespace `standards` — `src/app/(public)/standards/page.tsx` không đọc session/role, không cá nhân hoá theo actor.
**States:** scroll (nội dung dài hơn khung), không-scroll (nội dung vừa khung)

Chi tiết đầy đủ (layout region, 9 UI element, DOM contract): `docs/vi/screens/SCR005_Standards/spec.md`.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| StandardsClient (`_components/standards-client.tsx`) | client-boundary | Sở hữu `handleClose` (`useStandardsClose`, dùng Navigation API `window.navigation.canGoBack`) |
| StandardsScreen | layout (root) | Tiêu đề + 3 `<section>` + footer 2 nút |
| HeroBadgeTierRow × 4 | card | 1 tier (badge ảnh + điều kiện + mô tả) |
| SecretBoxBadge × 6 | card | 1 icon badge (ảnh + caption text thật trong DOM) |

### Data Displayed

- Data Entity 1: MODEL001_AppLocale (locale hiện tại quyết định bản dịch `standards.*`) — KHÔNG đọc MODEL002_SupabaseUser (trang không có header, không cá nhân hoá)

### Routes/URLs

- `/standards`

### Related Screens

- (Entry only) Bất kỳ trang nào có `SiteFooter` — link "Tiêu chuẩn chung"; thoát về trang trước (`router.back()`) hoặc `/` khi không có lịch sử điều hướng

---

## SCR006_Profile

**Type**: atomic

**Feature:** F006 — Hồ sơ Sunner (Profile)
**Route:** /profile
**Description:** Trang hồ sơ Sunner có gác đăng nhập (nhóm `(protected)`, cùng gate với `/todo`) —
hero full-bleed keyvisual + avatar tròn + tên (không dept/tier/stars), 6 ô badge khoá, statistics
card 5 dòng `0` + nút "Mở Secret Box" disabled (self) HOẶC thanh "Viết Kudo" disabled thay thế toàn
bộ slot đó (other), header "KUDOS" + dropdown chiều Kudos (self 2 chiều, other chỉ Received).
`src/app/(protected)/profile/page.tsx` phân giải `?id=` qua `parseProfileId()`, đọc hồ sơ (self VÀ
other) qua DAL mới `getProfileCard()` — nguồn DUY NHẤT là view mới `public.profile_cards`
(migration `0005`), không đọc `public.users` trực tiếp. Dùng lại nguyên vẹn `SiteHeader`/
`SiteFooter` (khác SCR005, giống SCR003/SCR004).
**States:** self view, other view, dropdown mở/đóng, avatar rỗng (placeholder), tên rỗng (fallback
"Sunner")

Chi tiết đầy đủ (layout region, 11 UI element, DOM contract): `docs/vi/screens/SCR006_Profile/spec.md`.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| ProfileClient (`_components/profile-client.tsx`) | client-boundary | Nối `copy`/`profile`/`isSelf`/`viewer` xuống `ProfileScreen`, cùng vai trò `AwardsClient` |
| ProfileScreen | layout (root) | Ghép `SiteHeader` + hero + bộ sưu tập huy hiệu + slot thống kê/Viết Kudo + khối KUDOS + `SiteFooter` |
| ProfileHero | section | Keyvisual full-bleed + avatar tròn đè mép + tên (không dept/tier/stars, GUI_009) |
| BadgeCollection | card grid | 6 ô badge cố định, luôn `data-locked="true"`, tiêu đề self/other bên dưới hàng ô |
| ProfileStatisticsCard | card | Self: 5 dòng `0` + nút "Mở Secret Box" disabled; Other: CHỈ thanh "Viết Kudo" disabled (loại trừ lẫn nhau) |
| KudosDirectionSelect | interactive (combobox) | Dropdown chiều Kudos (client, `useState`, không network); danh sách theo `isSelf` |
| SiteHeader / SiteFooter | shared (F003) | Header, footer — dùng chung nguyên trạng với SCR003/SCR004 |

### Data Displayed

- Data Entity 1: `ProfileCard` (`id, full_name, avatar_url` — view `public.profile_cards`, chưa
  cấp MODEL### riêng, xem `entities.md`)
- Data Entity 2: MODEL002_SupabaseUser (email — chỉ để cá nhân hoá header dùng chung, không phải
  nội dung hồ sơ)
- Data Entity 3: MODEL001_AppLocale (locale hiện tại quyết định bản dịch `profile.*`)

### Routes/URLs

- `/profile`
- `/profile?id={uuid}`

### Related Screens

- SCR003_HomeScreen, SCR004_Awards: nguồn — click "Hồ sơ" trong menu tài khoản (`AccountMenu`,
  dùng chung `SiteHeader`); đích khi click "Đăng xuất"
- SCR001_LoginScreen: đích khi khách chưa đăng nhập cố truy cập `/profile` (redirect từ
  `(protected)/layout.tsx`, trước khi trang này render)

---

## SCR007_KudosLiveBoard

**Type**: composite

**Feature:** F007 — Bảng Kudos trực tiếp (`/kudos`) · F008 — Thả tim cho Kudos (nút tim trên thẻ)
**Route:** /kudos
**Description:** Trang Kudos công khai (`(public)`, không route-guard — cùng nhóm `/`, `/awards`,
`/standards`) hiển thị toàn bộ board trong một lần tải: banner "Hệ thống ghi nhận và cảm ơn" + ô
nhập pill (chỉ render, chưa mở dialog Viết Kudo), bộ lọc Hashtag + Phòng ban, carousel HIGHLIGHT 5
kudo nhiều tim nhất (2 cặp nút điều hướng + pagination "x/5"), Spotlight (tổng "N KUDOS" thật +
scatter tĩnh tên + ô tìm Sunner `maxLength=100`), feed ALL KUDOS cuộn vô hạn, và sidebar 5 chỉ số
cá nhân + 2 bảng xếp hạng cuộn độc lập. `src/app/(public)/kudos/page.tsx` (Server Component) đọc
`searchParams.hashtag`/`searchParams.department`, gọi DAL `getKudosBoard()` một lần rồi uỷ quyền
mọi tương tác cho `KudosClient`. Bộ lọc sống ở URL `searchParams` (không `useState`), feed phân
trang bằng keyset cursor `created_at`. Dùng lại nguyên vẹn `SiteHeader`/`SiteFooter` (giống
SCR003/SCR004/SCR006, khác SCR005). "Live board" là nhãn design — không Supabase Realtime, server
render + revalidate.
**States:** anonymous (ẩn HẲN 5 chỉ số + nút "Mở quà", giữ 2 leaderboard — D001; nút tim disabled
kèm gợi ý đăng nhập), authenticated (đủ sidebar, thả tim được qua F008), filtered (hashtag/phòng
ban, carousel về slide 1), carousel slide 1 / slide 5 (nút lùi/tiến disable tương ứng),
feed loading-more, feed đã tải hết (ngừng gọi, không thông báo), kudos-empty ("Hiện tại chưa có
Kudos nào." ở cả carousel lẫn feed), leaderboard-empty ("Chưa có dữ liệu"),
spotlight-search-highlight, copy-link-toast

Chi tiết đầy đủ (layout region R1-R8, 18 UI element, DOM contract): `docs/vi/screens/SCR007_KudosLiveBoard/spec.md`.

**Composite classification (2-of-3 gate):** H1 (feature refs) PASS — hai F### cùng tham chiếu màn
này (F007 sở hữu board, F008 sở hữu bảng `kudo_hearts` + đường ghi `toggleKudoHeart`). H2
(domain-module imports) fail — không import nào khớp `features/*`/`modules/*`/`domains/*`. H3
(semantic region wrappers) PASS theo cấu trúc dự kiến — 6 vùng nội dung + sidebar `<aside>`, trên
ngưỡng 3. 2/3 → composite. **Chưa phát sinh `REG###` chính thức ở lượt promote này** (code chưa
tồn tại): bảng vùng trong `spec.md` dùng nhãn layout `R1`-`R8`, đúng tiền lệ SCR004_Awards và
SCR006_Profile.

### Components

| Component | Type | Purpose |
|-----------|------|---------|
| KudosClient (`_components/kudos-client.tsx`) | client-boundary | Giữ danh sách feed đang hiển thị (`useInfiniteFeed`), handler lọc (`router.push`), thả tim, copy link + toast |
| KudosScreen (`_components/kudos-screen.tsx`) | layout (root) | Thuần bố cục: chrome + 6 vùng theo thứ tự tài liệu; feed và sidebar hai cột, sidebar cuộn riêng |
| KudosBanner / KudosComposePill | section + display field | Banner ghi nhận (chỉ đọc) và ô nhập pill (chỉ render — dialog Viết Kudo `ihQ26W78P2` chưa tồn tại) |
| KudosFilterBar (+ KudosFilterMenu × 2) | interactive (dropdown) | Bộ lọc Hashtag + Phòng ban, danh sách distinct lấy từ dữ liệu thật; lọc lại đồng thời carousel và feed |
| KudosHighlightCarousel (+ KudosCarouselNav, KudosSlideCounter) | interactive (carousel) | 5 thẻ nhiều tim nhất, thẻ giữa nổi bật; 2 cặp mũi tên dùng chung 1 state, pagination "x/5" |
| KudosSpotlight (+ KudosSpotlightScatter, KudosSunnerSearch) | section | Tổng "N KUDOS" (`COUNT(*)` thật) + scatter tĩnh tên Sunner + ô tìm `maxLength=100` (làm nổi bật, không điều hướng) |
| KudosFeed (+ KudosFeedSentinel, KudosEmptyState) | list | Feed ALL KUDOS cuộn vô hạn qua `IntersectionObserver` trên sentinel → Server Action `loadMoreKudos` |
| KudosCard (+ KudosCardPerson, KudosHashtagList, KudosImageStrip, KudosCardActions) | card | Thẻ Kudos dùng chung Highlight + feed: người gửi/nhận, nội dung, hashtag, ảnh, Copy Link, "Xem chi tiết" |
| KudosHeartButton | interactive (button) | Icon tim + số tim; F007 chỉ hiển thị, đường GHI thuộc F008 — ẩn danh thấy `disabled` kèm `title` mời đăng nhập |
| KudosSidebar (+ KudosStatList, KudosLeaderboard × 2) | aside | 5 chỉ số cá nhân + nút "Mở quà" disabled (ẩn HẲN khi ẩn danh) và 2 bảng xếp hạng |
| SiteHeader / SiteFooter | shared (F003) | Header, footer — dùng chung nguyên trạng với SCR003/SCR004/SCR006 |

### Data Displayed

- Data Entity 1: `Kudo` / `KudoCard` (người gửi, người nhận, nội dung, hashtag, ảnh, thời điểm,
  `heart_count` — view `public.kudos_cards`, chưa cấp MODEL### riêng, xem `entities.md`)
- Data Entity 2: `KudoHeart` (bảng `public.kudo_hearts` — F008, nguồn của số tim và trạng thái
  "đã thả tim" của người xem; chưa cấp MODEL### riêng)
- Data Entity 3: MODEL002_SupabaseUser (email cho header dùng chung + cột `department` mới, nguồn
  của bộ lọc Phòng ban và của phòng ban hiển thị trên thẻ)
- Data Entity 4: MODEL001_AppLocale (locale hiện tại quyết định bản dịch `kudos.*` — trừ các chuỗi
  TC assert nguyên văn và toast `Link copied — ready to share!` giữ nguyên ở cả hai bản)

### Routes/URLs

- `/kudos`
- `/kudos?hashtag={tag}`
- `/kudos?department={dept}`

### Related Screens

- SCR003_HomeScreen, SCR004_Awards, SCR005_Standards: nguồn — 5 điểm liên kết `/kudos` đang 404
  trước lượt này (nav header, footer, khối Sun* Kudos, widget hành động nhanh, nút "Viết KUDOS")
- SCR006_Profile: đích — bấm avatar/tên người gửi/nhận hoặc một mục leaderboard mở `/profile?id=`
- SCR001_LoginScreen: đích khi người chưa đăng nhập bấm avatar/tên (redirect từ
  `(protected)/layout.tsx` của `/profile`, không phải gate mới của F007)

---

## Summary

- **Total Screens**: 7

---

## Cross-Reference Validation

- [x] All SCR### codes are unique
- [ ] All SCR### codes are referenced in ScreenFlow.md — SCR001-SCR006 có; **SCR007_KudosLiveBoard
  CHƯA có trong `screen-flow.md`** (Navigation Map còn node `"/kudos - chưa implement, 404"` đã lỗi
  thời kể từ lượt promote này). `screen-flow.md` do core pass sở hữu (Screen Access Paths, Screen
  Transitions, Guard Logic đều phái sinh từ code chưa tồn tại) — không tự ý vá ở bước promote;
  `/tkm:rebuild-spec` kế tiếp sau khi `/kudos` lên code sẽ đồng bộ.
- [x] All related screen references are valid
- [x] All route URLs are properly formatted (`/`, `/awards`, `/kudos`, `/login`, `/profile`, `/standards`, `/todo` — `/kudos` mới ở lượt này, `route-list.md` do core pass kế tiếp cập nhật)
- [x] All SCR### codes are referenced in FeatureList.md (SCR001+SCR002 → F001/F002; SCR003 → F003; SCR004 → F004; SCR005 → F005; SCR006 → F006; SCR007 → F007+F008)
- [x] No orphaned screen references
- [x] No REG### emitted trong toàn bộ app (grep xác nhận 0 tham chiếu `REG` ở cả 7 spec.md) — SCR001-003, SCR005, SCR006 atomic có justification 2-of-3 gate; SCR007_KudosLiveBoard khai `Type: composite` KÈM justification H1/H2/H3 đầy đủ và ghi rõ lý do hoãn `REG###` (code chưa tồn tại ở lượt promote), dùng nhãn layout R1-R8; SCR004_Awards tự khai `Type: composite` trong `docs/vi/screens/SCR004_Awards/spec.md` nhưng không kèm justification H1/H2/H3 hay bảng REG### nào (chỉ có "Layout Regions" R1-R5 mô tả layout, không phải mã REG### chính thức) — gap có sẵn từ trước, nằm ngoài phạm vi F005/F006, không tự ý vá ở đây
