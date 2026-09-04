# Implementer report — phase-02 i18n foundation

**Status**: completed

## Files touched
- `lib/i18n/locale.ts` (+51) — new: `SUPPORTED_LOCALES`, `AppLocale`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `LOCALE_COOKIE_MAX_AGE`, `LOCALE_LABEL`, `isSupportedLocale`, `normalizeLocale`
- `lib/i18n/locale.test.ts` (+43) — new: 8 cases for `normalizeLocale`
- `vitest.config.ts` (+13) — new: node env, `include: lib/**/*.test.ts`
- `i18n/request.ts` (+28) — new: `getRequestConfig`, cookie → `normalizeLocale` → dynamic message import, try/catch fallback to `vi`
- `messages/vi.json`, `messages/en.json` (+15 each) — 9 keys each (`login.*` x7, `todo.*` x2), copy verbatim from clarifications.md
- `app/actions/locale.ts` (+41) — new Server Action `setLocale`, try/catch on `cookies().set`
- `next.config.ts` (+3 net) — wrapped with `createNextIntlPlugin()`
- `app/layout.tsx` (+16 net) — `getLocale()`/`getMessages()`, `<html lang={locale}>`, `<NextIntlClientProvider>`, title → "SAA 2025"; Geist font wiring untouched
- `package.json` (+2) — `next-intl: 4.14.2` dep, `vitest: ^3.2.7` devDep, `test:unit` script
- `package-lock.json` — updated by `npm install` (mechanical side effect, not manually edited)
- `plans/.../phase-02-i18n-foundation-next-intl-cookie.md` — `status: completed`, all 9 Todo items checked (only markdown edited)

## Commands + exit codes
- RED: `npx vitest run` with `lib/i18n/locale.ts` temporarily renamed away → `Cannot find module './locale'`, 1 suite failed (genuine RED, not config/dep failure)
- GREEN: `npx vitest run` after restoring → 8/8 tests passed, exit 0
- `npm run test:unit` → 8/8 passed, exit 0
- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0 (1 pre-existing warning in `tests/e2e/login.spec.ts`, out of scope)
- `npm run build` → exit 0 (Turbopack; next.config.ts + i18n/request.ts loaded without error)
- Dev smoke (also run, in addition to build): `npm run dev` → `curl localhost:3000/` = 200, `curl localhost:3000/login` = 404 (expected — `/login` route not implemented until phase-04, matches phase's stated non-regression criterion). Server killed; `lsof -i :3000` empty afterward.

## Acceptance criteria
- [x] `npx vitest run` GREEN for `normalizeLocale`, RED-first verified (see above), 8 cases incl. invalid→`vi` and `en` passthrough
- [x] `npx tsc --noEmit` exit 0; `npm run lint` exit 0
- [x] `npm run build` exit 0 AND dev smoke both run; next-intl plugin/request config load clean
- [x] `messages/vi.json`/`messages/en.json` identical key sets (verified via `node -e` deep-key diff — see below), copy only from clarifications table, `vi` default
- [x] No `data-testid`, kebab-case files, all ≤200 lines (max 51), no `any`, no TODO/FIXME, try/catch on the two risky paths (cookie write, message import)
- [x] Phase file Todo ticked, `status: completed`

Key-set check: `node -e` deep-compared sorted dotted-key arrays of both JSON files → `identical key sets: true` (9 keys each: `login.subtitle`, `login.tagline`, `login.loginButton`, `login.footer`, `login.error`, `login.logoAlt`, `login.heroAlt`, `todo.greeting`, `todo.logout`). `languageLabel` intentionally excluded from messages per clarifications (lives in `LOCALE_LABEL`, DRY).

## Deviations
- Pinned `next-intl` to exact `4.14.2` in package.json (npm's default `^4.14.2` range replaced) to match the existing exact-pin convention used by `next`/`react` in this file — resolved/installed version unaffected.
- `next.config.ts` uses `createNextIntlPlugin()` with no explicit path arg (default `./i18n/request.ts` resolved correctly per successful build — risk-assessment fallback not needed).
- `app/layout.tsx` passes `locale`/`messages` explicitly to `NextIntlClientProvider` (not relying on v4 zero-prop auto-inheritance) per the phase's own risk mitigation.

## Unresolved
None. Phase-03 can proceed (depends on `normalizeLocale`/`LOCALE_COOKIE` from `lib/i18n/locale.ts`, both stable).
