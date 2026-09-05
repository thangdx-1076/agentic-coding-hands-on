# Screen List

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05
**Analysis Scope**: route-view (Next.js 16 App Router) — 2 screens (`/login`, `/todo`)

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

---

## SCR001_LoginScreen

**Type**: atomic

### Description

Màn hình đăng nhập công khai (`/login`) — cổng vào duy nhất của app khi chưa xác thực. Hiển thị key visual + copy Figma (`vi` mặc định, `en` qua next-intl), cho phép đổi ngôn ngữ và đăng nhập bằng Google (Supabase OAuth). Guard AUTHORITATIVE (`getAuthenticatedUser()`, `app/login/page.tsx:73-83`) fail OPEN — lỗi Supabase không chặn người dùng vào trang này, khác hẳn `/todo`. Nếu đã có session hợp lệ, redirect ngay sang `/todo` trước khi render.

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

- SCR002_TodoScreen: Todo (điều hướng khi OAuth thành công qua ROUTE001, hoặc khi guard phát hiện đã đăng nhập)

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

## Summary

- **Total Screens**: 2

---

## Cross-Reference Validation

- [x] All SCR### codes are unique
- [x] All SCR### codes are referenced in ScreenFlow.md
- [x] All related screen references are valid
- [x] All route URLs are properly formatted (`/login`, `/todo` — khớp route-list.md)
- [ ] All SCR### codes are referenced in FeatureList.md — FeatureList chưa tồn tại ở wave này (Wave 5, chạy sau)
- [x] No orphaned screen references
- [x] No REG### emitted (cả 2 screen đều atomic — xem justification ở từng SCR)
