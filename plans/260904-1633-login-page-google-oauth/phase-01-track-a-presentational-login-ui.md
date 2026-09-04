---
phase: 01
feature: F001, F002
status: completed
priority: P0
test_policy: e2e-red-first
effort: 3h
owner: momorph-ui-implementer
file_ownership: ["components/login/**", "app/fonts.ts", "app/globals.css"]
---

# Phase 01 — Track A: presentational Login UI

**Screen**: SCR001_Login — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz · **Refs**: `clarifications.md` (§ E2E contract, § gap resolution), `momorph/specs.csv` items 1–3, `data/preview.png`

**Goal**: Dựng đủ vùng UI tĩnh của `/login` (header sticky + logo, hero + background/gradient, content block, nút Google, footer fixed, LanguageSelector a11y menu) đúng design, dùng nội dung từ Figma làm nguồn mock — không bịa dữ liệu.

**Out of scope** (Track B, KHÔNG chạm): `app/login/**`, `app/layout.tsx`, `proxy.ts`, `lib/**`, `i18n/**`, `messages/**`, `next.config.ts`, `package.json`, mọi lời gọi Supabase/next-intl, mọi `useTransition`/Server Action.

## Integration contract (Track B lệ thuộc, không được đổi đơn phương)

- `LoginScreen({ copy: LoginCopy; locale: 'vi'|'en'; onSelectLocale?; onLoginClick?; loginPending?; errorMessage? })`
- `LoginCopy = { subtitle, tagline, loginButton, footer, logoAlt, heroAlt, languageLabel }`
- `LanguageSelector` (client): `button[aria-haspopup="menu"]` name chứa `languageLabel`; mở `[role="menu"]` với 2 `[role="menuitem"]` tên **"VN"** và **"EN"** (nhãn cố định, không dịch).
- `GoogleLoginButton({ label, pending, onClick })`: pending → `disabled` + `aria-busy="true"` + spinner; KHÔNG `type="submit"`.
- `LoginErrorAlert({ message })`: `role="alert"`, đặt ngay dưới nút Google, chỉ render khi có message.
- Alt text **bất biến theo locale**: logo `alt="Sun* Annual Awards 2025"`, hero `alt="ROOT FURTHER"` (E2E assert chuỗi này).
- Hero background: `#00101A` + 2 gradient overlay + slot `<img src="/login/keyvisual.png">` (user export sau). Selector role/name/text; KHÔNG `data-testid`.

**Success criteria**: compile/typecheck + lint sạch; asset coverage đủ 5 file `public/login/*`; export đúng props contract trên; báo GREEN/visual handoff cho orchestrator. Sửa lỗi UI về sau vẫn do agent này nhận, không phải generic `implementer`.
