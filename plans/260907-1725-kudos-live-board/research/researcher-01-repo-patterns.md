# Research: pattern hiện có cho route `/kudos` (data thật)

Skill đã nạp: `nextjs-route-colocation-architecture` (`.claude/skills/nextjs-route-colocation-architecture/SKILL.md`).

## 1. Route colocation

Route mới `/kudos` (public, giống `/awards`) cần tối thiểu:
- `page.tsx` — Server Component, đọc DAL, không `"use client"`.
- `_components/` — `kudos-client.tsx` (nhận function props) + `kudos-screen.tsx` (presentational) + `icons/` nếu cần. Bằng chứng: `src/app/(public)/awards/_components/{awards-client,awards-screen}.tsx`.
- `_shared/kudos-copy.ts` — type `KudosCopy` (nếu khác `SiteChromeCopy.kudos`) theo mẫu `awards-copy.ts`/`home-copy.ts` (`src/app/(public)/(home)/_shared/home-copy.ts:30` — `HomeCopy = SiteChromeCopy & {...}`).
- `_utils/` chỉ khi có helper thuần route-riêng (vd `scroll-spy.ts` ở awards).
- `_hooks/` chỉ khi có client state riêng route.
- `_actions/` không cần nếu không có mutation (dùng `../../_actions/logout` sẵn có).

Quy tắc cấm cross-`_shared`: `eslint.config.mjs:93-129` — hai rule `no-restricted-imports`:
- Zone A (`src/!(app)/**`) cấm import `@/app/**` (`eslint.config.mjs:74-92`).
- Trong `src/app/**`: cấm `@/app/**/_*` alias (phải import private folder bằng relative path), và cấm relative import sideways/downward giữa segment (`../login/_x`, `./child/_x`) qua regex tại `eslint.config.mjs:110-125`. Đây chính là lý do `SiteChromeCopy` phải promote lên `src/app/_shared/site-chrome.ts:7-9` — "a route segment must never import another segment's `_shared` types".

Kết luận cho `/kudos`: nếu Kudos copy dùng chung phần chrome (nav/header/kudos/footer/account) → đọc qua `SiteChromeCopy` ở `src/app/_shared/site-chrome.ts`, không tạo lại. Chỉ phần leaf riêng của trang Kudos board (danh sách kudos thật) mới vào `_shared/kudos-copy.ts` riêng của segment `/kudos`.

## 2. Supabase / data layer

Migrations (`supabase/migrations/`):
- `0001_users_table.sql` — bảng `users` (RLS own-row).
- `0002_handle_new_user_trigger.sql` — trigger tạo user khi `auth.users` insert.
- `0003_awards_table.sql` — bảng `awards` (locale, sort_order, jsonb prize_values; RLS `USING (true)`, SELECT cho `anon, authenticated`).
- `0004_awards_en_seed.sql` — seed EN cho awards.
- `0005_profile_cards_view.sql` — VIEW `profile_cards` (SECURITY DEFINER, security_invoker=false) lộ đúng 3 cột từ `users`, REVOKE ALL trước rồi GRANT SELECT lại cho `authenticated` (default privileges Supabase tự cấp ALL, phải revoke thủ công — insight quan trọng nếu tạo bảng/view mới cho kudos).

Pattern DAL (`src/dal/awards.ts`, `src/dal/profile-cards.ts` — cả hai identical shape):
1. `import "server-only";` đầu file.
2. Client KHÔNG tự tạo — luôn nhận injected qua param, type hẹp thủ công (`AwardsClient`/`ProfileCardsClient`) chỉ khai đúng method dùng (`.from().select().eq().order()` hoặc `.maybeSingle()`), KHÔNG dùng `SupabaseClient` đầy đủ — để test stub dễ.
3. `select()` columns giữ literal type (không widen `string`) — tránh TS2322 khi postgrest-js parse column list ở type-level (`src/dal/awards.ts:37-49`).
4. Fail-open bắt buộc: list → `[]`, single → `null`; không bao giờ throw (try/catch nuốt lỗi).
5. Map snake_case row → camelCase type public.
6. Có file `*-client.ts` cạnh (`toAwardsClient`, `toProfileCardsClient`) để adapter thật SupabaseClient → type hẹp — dùng trong `page.tsx`.

Server Component đọc trực tiếp qua DAL, không qua Route Handler: `page.tsx` gọi `createClient()` (`@/lib/supabase/server`) rồi `getAwards(toAwardsClient(supabase), locale)` (`src/app/(public)/awards/page.tsx:44-45`). Tương tự profile (`src/app/(protected)/profile/page.tsx:88-92`).

RLS: có, mọi bảng/view đều `ENABLE + FORCE ROW LEVEL SECURITY`, và **luôn REVOKE ALL rồi GRANT lại đúng quyền cần** vì Supabase default privileges cấp ALL cho `anon/authenticated` (ghi rõ trong comment `0005_profile_cards_view.sql`). Nếu `/kudos` cần bảng mới (vd `kudos_messages`), phải theo đúng pattern này — copy `0003` nếu public-read, hoặc thêm REVOKE/GRANT như `0005` nếu cần view giới hạn cột.

## 3. i18n

`messages/vi.json` top-level keys: `login, todo, home, awards, standards, profile` — một namespace/route. `awards` namespace chỉ chứa leaf RIÊNG của trang (`caption, heading, navLabel, quantityLabel, prizeLabel, empty`) — 6 keys, KHÔNG có `nav/header/kudos/footer/account/notifications`.

Ranh giới `_shared/*-copy.ts` vs `messages/*.json`:
- `src/app/_shared/site-chrome.ts` — type `SiteChromeCopy` (nav/header/kudos/footer/account/notifications) DÙNG CHUNG mọi route `(public)` + protected header. Đây là copy contract, giá trị mặc định hard-code (`defaultSiteChromeCopy`) dùng cho Storybook/test; giá trị THẬT lấy qua `getTranslations("home")` trong `page.tsx` (namespace `home` trong messages, không phải namespace riêng) — xem `awards/page.tsx:76-105` (`buildCopy` đọc `tHome(...)` cho mọi field chrome).
- `home-copy.ts` — compose `SiteChromeCopy` + leaf riêng Homepage (`hero, event, cta, rootFurther, awards, widget`) — type only, giá trị thật cũng qua `messages/vi.json.home`.
- Vậy: **type + default value tĩnh (fallback/test) nằm ở `_shared/*-copy.ts`; giá trị runtime thật nằm ở `messages/{vi,en}.json`** đọc qua `next-intl` trong `page.tsx`. `/kudos` cần thêm namespace `kudos` vào cả 2 file messages cho phần leaf riêng, và tái dùng `home`/`login` namespace cho phần chrome/footer giống `awards/page.tsx` đã làm (dòng comment: "footer.copyright reuses login.footer... DRY").

## 4. Testing

- `playwright.config.ts` có, `testDir: "./tests/e2e"`, script `pnpm test:e2e` (= `playwright test`), baseURL từ `E2E_PORT` (mặc định 3000), `webServer` tự chạy `pnpm dev`.
- Spec hiện có: `tests/e2e/{awards,home,login,profile,standards}.spec.ts` — đặt tên `<route-slug>.spec.ts`, đồng cấp `tests/e2e/helpers/{promote-to-admin,sign-in,supabase-reachable}.ts`. `/kudos` nên thêm `tests/e2e/kudos.spec.ts`.
- Vitest: `vitest.config.ts` dùng `projects` (không phải `workspace`, deprecated) — 2 env: `node` (logic/actions thuần) và `jsdom` (hooks chạm DOM). Alias `@` = `./src/`, `server-only` stub cho DAL test.
- Storybook: `.storybook/main.ts` — framework `@storybook/nextjs-vite` (không phải webpack), `stories: ["../src/**/*.stories.@(ts|tsx)"]`, addon `msw-storybook-addon`, `staticDirs: ["../public"]`.
- MSW: có, `src/mocks/handlers.ts` — 1 danh sách handler DÙNG CHUNG cho vitest (`mocks/node.ts` → `setupServer`) và Storybook (`.storybook/preview.tsx` → worker). Mock hiện tại: PKCE token exchange, `/auth/v1/user` (session check), `/auth/v1/logout`, `/rest/v1/users?id=` (role read cho account-menu). CHƯA có handler cho bảng `awards`/`profile_cards`/kudos — DAL test tự stub client, không qua MSW (comment rõ trong file: "No unit test consumes this handler... tested against stubs, not this fixture").

## 5. Site chrome tái dùng

Đã promote lên app root, `/kudos` import relative theo scope ladder (route `/kudos` nằm ngang hàng `/awards` dưới `(public)`, KHÔNG dưới `(home)`):
- `SiteHeader` → `src/app/_components/site-header.tsx`
- `SiteFooter` → `src/app/_components/site-footer.tsx`
- `KudosSection` → `src/app/_components/kudos-section.tsx`
- `KeyvisualBackground` → `src/app/_components/keyvisual-background.tsx`
- Type copy chung → `src/app/_shared/site-chrome.ts` (`SiteChromeCopy`, `SiteViewer`)

Cách import đúng (bằng chứng `awards-screen.tsx:3-7`, path độ sâu `(public)/awards/_components/` → `src/app/_components/` là 3 cấp `../../../`):
```
import { KeyvisualBackground } from "../../../_components/keyvisual-background";
import { SiteHeader } from "../../../_components/site-header";
import { SiteFooter } from "../../../_components/site-footer";
import { KudosSection } from "../../../_components/kudos-section";
import type { SiteViewer } from "../../../_shared/site-chrome";
```
Nếu `/kudos` đặt cùng cấp `(public)/kudos/`, path relative giống hệt awards (3 dấu `../../../`). KHÔNG dùng alias `@/app/_components/...` (bị eslint cấm — `@/app/**` chỉ cấm cho Zone A, nhưng trong Zone `src/app/**` alias `@/app/**/_*` cũng bị cấm — luôn dùng relative).

`_actions/logout.ts` và `_utils/get-viewer.ts` dùng chung ở `src/app/_actions/` và `src/app/_utils/` — awards import `../../_actions/logout` và `../../_utils/get-viewer` (2 cấp vì file đó nằm ngay dưới `(public)`, không phải dưới segment).

## 6. Lệnh verify (package.json)

```
typecheck : tsc --noEmit
lint      : eslint            (lint:fix cho auto-fix)
test unit : vitest run        (test:unit:coverage cho coverage)
build     : next build
e2e       : playwright test   (script: pnpm test:e2e)
storybook build: storybook build
format check: prettier --check .
```

## Điểm cần quyết định (không tự đoán, để planner/user chốt)

- Bảng nguồn dữ liệu Kudos thật là gì — bảng mới (`kudos_messages`?) hay đã có sẵn migration chưa khảo sát hết (chỉ thấy 0001-0005, không có bảng kudos)? Cần schema thật (sender, receiver, message, timestamp, live/realtime?) trước khi viết DAL.
- "Live board" gợi ý cần realtime (Supabase Realtime subscription) — pattern này CHƯA tồn tại trong repo (mọi DAL hiện tại là fetch một lần qua Server Component, không có ví dụ client-side realtime channel). Cần nghiên cứu riêng nếu chọn hướng này.

**Status:** DONE
**Summary:** Đã khảo sát đủ 6 mục: route colocation (`/kudos` theo mẫu `/awards`, dùng eslint boundary cấm cross-`_shared`), DAL pattern fail-open + injected-client + literal-column-type (`awards.ts`/`profile-cards.ts`), RLS luôn REVOKE-ALL-rồi-GRANT lại do Supabase default privileges, i18n tách `_shared/*-copy.ts` (type+default tĩnh) khỏi `messages/*.json` (giá trị runtime qua next-intl), test stack (Playwright+Vitest projects+Storybook nextjs-vite+MSW handlers dùng chung node/browser), site-chrome đã promote lên `src/app/_components|_shared` import bằng relative path.
**Concerns:** Repo chưa có bảng/schema Kudos thật và chưa có tiền lệ realtime — 2 điểm này nằm ngoài phạm vi "khảo sát pattern có sẵn", cần nghiên cứu/quyết định riêng trước khi viết DAL cho `/kudos`.
