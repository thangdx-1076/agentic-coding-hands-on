---
title: "Login screen (Google OAuth) + VN/EN language switch"
description: "Màn /login SAA 2025: đăng nhập Google qua Supabase Auth (PKCE), guard 2 lớp, /todo placeholder, i18n cookie NEXT_LOCALE."
status: completed
priority: P1
effort: 10h
branch: main
tags: [auth, supabase, oauth, i18n, next16, momorph]
created: 2026-09-04
work_type: feature
spec:
  - docs/vi/features/F001_GoogleOAuthLogin/
  - docs/vi/features/F002_LanguageSwitch/
system_drafts: [plans/260904-1633-login-page-google-oauth/spec/system/architecture.md, plans/260904-1633-login-page-google-oauth/spec/system/permissions.md]
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz
clarifications: plans/260904-1633-login-page-google-oauth/clarifications.md
---

# Login screen SYSTEM — implementation plan

**Features**: `F001_GoogleOAuthLogin` (P0, mixed) · `F002_LanguageSwitch` (P1, ui) — mã provisional, xem `spec/feature-list.md`.
**Test policy**: `e2e-red-first` — RED đã validated (exit 1, `evidence/red-run.log`). GREEN = `npx playwright test tests/e2e/login.spec.ts --reporter=list` exit 0, do `tester` chạy sau implementation.
**Tracks**: Track A (`momorph-ui-implementer`) chạy song song Track B (`implementer`) sau shared gate; không có merge barrier ngoài phase-04.

## Phases

| # | Phase | Feature | Owner | Status | Depends on | Effort |
|---|-------|---------|-------|--------|-----------|--------|
| 01 | [Track A — presentational UI](phase-01-track-a-presentational-login-ui.md) | F001, F002 | momorph-ui-implementer | completed | — (gate passed) | 3h |
| 02 | [i18n foundation (next-intl, cookie)](phase-02-i18n-foundation-next-intl-cookie.md) | F002 | implementer | completed | — | 1.5h |
| 03 | [Supabase auth foundation + guard](phase-03-supabase-auth-foundation-guard.md) | F001 | implementer | completed | 02 | 2.5h |
| 04 | [Integration — /login wiring](phase-04-integration-login-page-wiring.md) | F001, F002 | implementer | completed | 01, 02, 03 | 1.5h |
| 05 | [Temper — GREEN, visual, polish](phase-05-temper-green-visual-polish.md) | F001, F002 | tester + momorph-ui-implementer | completed | 04 | 1.5h |

Dependency order: `01 ∥ (02 → 03) → 04 → 05`.

## File ownership (no two concurrent phases share a file)

| Phase | Owns |
|-------|------|
| 01 | `components/login/**`, `app/fonts.ts`, `app/globals.css` |
| 02 | `next.config.ts`, `i18n/request.ts`, `messages/*.json`, `lib/i18n/**`, `app/layout.tsx`, `app/actions/locale.ts`, `vitest.config.ts`, `package.json` (next-intl, vitest) |
| 03 | `lib/supabase/**`, `proxy.ts`, `app/auth/callback/route.ts`, `app/todo/**`, `app/page.tsx`, `package.json` (supabase) |
| 04 | `app/login/**` (+ đọc `app/fonts.ts`, sửa `app/layout.tsx` sau khi 02 xong) |
| 05 | `tests/e2e/**`, `playwright.config.ts`, `playwright/.auth/**` (tester) · `components/login/**` (polish, momorph-ui-implementer) |

Phase 02 → 03 tuần tự nên cùng chạm `package.json` là hợp lệ. Track A (01) KHÔNG được sửa `package.json`; cần dep mới → báo orchestrator.

## Key references

- Clarifications + § E2E contract + § RED evidence: `clarifications.md`
- Research (pinned versions, code shapes): `research/researcher-01-supabase-google-oauth-nextjs16.md`
- RED report: `reports/tester-red-login-e2e.md` · log: `evidence/red-run.log`
- Specs: `spec/googleoauthlogin/{functional,technical}-spec.md`, `spec/languageswitch/{functional,technical}-spec.md`, `spec/googleoauthlogin/screens/SCR-{login,todo}/spec.md`
- MoMorph design data: `momorph/specs.csv`, `momorph/test-cases.csv`, `data/preview.png`

## Cross-phase risks

| Risk | Impact | Countermeasure | Phase |
|------|--------|----------------|-------|
| GoTrue allow-list có thể từ chối `redirect_to` kèm `?next=/todo` → login rơi về SITE_URL | High | Verify bằng curl authorize trước khi wire; fallback bỏ `next`, callback default `/todo` (BR-002) — cần orchestrator ký vì lệch § E2E contract | 04 |
| `playwright.config.ts` project `chromium` không set `storageState`; bật 2 test authenticated sẽ fail ở `chromium-anon` | High | tester scope storageState theo `test.use` trong từng describe (hoặc tách file), không nới assertion | 05 |
| `app/fonts.ts` do Track A sở hữu, `app/layout.tsx` do Track B — import sai tên export → build fail | Medium | phase-04 đọc `app/fonts.ts` thật rồi mới sửa layout; chưa có → BLOCKED, không tự tạo | 04 |
| `public/login/keyvisual.png` user chưa export → hero thiếu ảnh nền | Low | Không chặn GREEN (E2E chỉ assert `img[alt="ROOT FURTHER"]`); ghi chú vùng này khi visual diff | 05 | — **Resolved 2026-09-05** (asset từ saa-app, next/image; xem clarifications.md)
| Google OAuth client creds của `saa-app` | Low | Đã verify 302 → accounts.google.com (`reports/tester-red-login-e2e.md`) | 03 |

## Delivery summary (2026-09-05)

**Shipped**: F001_GoogleOAuthLogin (PKCE OAuth, 2-layer guard) + F002_LanguageSwitch (vi/en, cookie-based).

**Track A** (13 components + app/fonts.ts + globals.css additive): login header/hero/footer, Google button, language selector, error alert, Montserrat fonts. Correction + Polish passes applied (hero offset fix, hover/focus states, responsive mobile padding).

**Track B**: i18n (next-intl, cookie `NEXT_LOCALE`), Supabase auth (proxy + PKCE handler + `/todo` guard), `/login` wiring (server + client, OAuth initiation via `signInWithOAuth`). vitest unit runner added.

**Polish Phase (05)**: U+2028/U+2029 hardening (decoded pass in `next-path.ts`), ARIA APG menu-button keyboard nav (ArrowDown/Up/Home/End/Escape/Tab + focus roving), regression test for mouse-after-keyboard focus reset. 6 new vitest cases + 8 new E2E keyboard tests + 1 regression E2E test.

**Evidence**: Playwright 23/23 GREEN (14 original + 8 keyboard + 1 regression), vitest 32/32, tsc/lint/build exit 0. Reviewer sealed (score 9, zero Critical findings). Log: `plans/260904-1633-login-page-google-oauth/evidence/green-run-polish.log`.

**Docs Generation**: Full `/tkm:rebuild-spec` core pass completed in separate plan `plans/260905-1447-rebuild-spec-core/`. 12 core artifacts promoted to `docs/vi/` (system docs reconciled from forward-draft, F001/F002 codes pinned). State cursor advanced; `last_feature_spec_run_sha` still empty (feature spec pass deferred).

**All open items resolved**:
