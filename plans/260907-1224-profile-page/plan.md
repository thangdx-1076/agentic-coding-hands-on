---
title: "Hồ sơ Sunner — protected route `/profile`"
description: "Trang có gác đăng nhập `/profile`: hero tên+avatar đọc qua view `profile_cards` (migration 0005), 6 ô huy hiệu khoá, statistics card 5 dòng 0 ↔ thanh Viết Kudo, dropdown chiều Kudos rỗng. Lấp link chết cuối cùng của menu tài khoản."
status: completed
priority: P1
effort: 10.25h
branch: feat/profile-page
tags: [profile, next16, momorph, supabase, definer-view, i18n, e2e-red-first]
created: 2026-09-07
work_type: feature
spec_promoted: docs/vi/features/F006_ProfilePage/
spec_draft_origin: plans/260907-1224-profile-page/spec/F006_ProfilePage/
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb
clarifications: plans/260907-1224-profile-page/clarifications.md
---

# Hồ sơ `/profile` — implementation plan

**Feature**: `F006_ProfilePage` · **Screen**: SCR006_Profile · **Test policy**: `e2e-red-first`.
Phase 01 (`tester`) viết `tests/e2e/profile.spec.ts` và **phải đỏ thật** trước dòng code UI đầu tiên. File đó là **hợp đồng DOM duy nhất** cho phase 05 — đọc thẳng, không suy diễn lại.
Khác `/standards` (F005) ở 4 điểm cố ý: **có gác đăng nhập** (`(protected)`), **có Supabase** (view mới `profile_cards`), **CÓ `SiteHeader`/`SiteFooter`**, và vì thế **phần lớn spec phải tag `@auth`** (CI không chạy được).

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [RED — `profile.spec.ts` + hợp đồng DOM](phase-01-red-e2e-profile-contract.md) | test gate | tester | completed | — | 1h |
| 02 | [Prereq: promote site chrome lên `src/app/_*`](phase-02-promote-site-chrome-to-app-root.md) | B | implementer | completed | 01 | 1.5h |
| 03 | [Migration 0005 `profile_cards` + DAL + unit test](phase-03-migration-0005-profile-cards-dal.md) | B | implementer | completed | 01 | 1.25h |
| 04 | [Nền: route, proxy, i18n `profile`, assets](phase-04-route-proxy-i18n-assets-foundation.md) | B | implementer | completed | 01 | 1h |
| 05 | [Track A — UI trình bày hồ sơ](phase-05-track-a-presentational-profile-ui.md) | A | momorph-ui-implementer | completed | 01, 02, 04 | 2.5h |
| 06 | [Track B — `parseProfileId` + unit test](phase-06-track-b-profile-id-resolution.md) | B | implementer | completed | 01, 04 | 0.5h |
| 07 | [Lắp `page.tsx` + client boundary + buildCopy](phase-07-integration-profile-page-wiring.md) | B | implementer | completed | 02, 03, 04, 05, 06 | 1h |
| 08 | [Temper — GREEN e2e, visual, regression](phase-08-temper-green-e2e-visual.md) | — | tester | completed | 07 | 1.5h |

Thứ tự phụ thuộc: `01` → `02 ∥ 03 ∥ 04` → `05 ∥ 06` → `07` → `08`.
**Chạy song song được**: 02/03/04 (ba nhóm file rời hẳn nhau), rồi 05/06. 07 là merge point duy nhất.

## File ownership (không phase song song nào chung file)

| Phase | Owns |
|-------|------|
| 01 | `tests/e2e/profile.spec.ts` *(tạo)*, `tests/e2e/helpers/sign-in.ts` *(thêm 1 tham số optional)* |
| 02 | `src/app/_components/**`, `src/app/_shared/site-chrome.ts`, `src/app/_utils/get-viewer.ts(+test)`, `src/app/_hooks/use-select-locale.ts(+test)` *(đích di chuyển)*; `src/app/(public)/_{components,shared,utils,hooks}/**` *(xoá nguồn)*; rewrite import trong `(public)/(home)/**`, `(public)/awards/**`, `(public)/standards/_components/**`, `vitest.config.ts` |
| 03 | `supabase/migrations/0005_profile_cards_view.sql`, `src/dal/profile-cards.ts(+test)`, `src/dal/profile-cards-client.ts(+test)` |
| 04 | `src/constants/routes.ts`, `src/proxy.ts`, `messages/vi.json`, `messages/en.json`, `public/profile/**` |
| 05 | `src/app/(protected)/profile/_components/{profile-screen,profile-hero,badge-collection,profile-statistics-card,kudos-direction-select}.tsx` + 5 `.stories.tsx`, `src/app/(protected)/profile/_shared/profile-copy.ts` |
| 06 | `src/app/(protected)/profile/_utils/parse-profile-id.ts(+test)` |
| 07 | `src/app/(protected)/profile/page.tsx`, `src/app/(protected)/profile/_components/profile-client.tsx`, `src/app/(protected)/profile/_shared/build-profile-copy.ts` |
| 08 | `tests/e2e/profile.spec.ts` *(nhận lại từ 01 — tuần tự, cùng owner `tester`)* |

`profile-client.tsx` **cố ý không** nằm trong glob của phase 05 — Track A sở hữu đúng 11 file liệt kê, không sở hữu cả `_components/**`.

## Key dependencies & quyết định chốt

- **Prereq bắt buộc, không có trong brief: chrome đang nằm sai chỗ.** `SiteHeader`/`SiteFooter`/`AccountMenu`/`SiteChromeCopy`/`getViewer`/`useSelectLocale` sống ở `src/app/(public)/_{components,shared,utils,hooks}/`. `/profile` ở `(protected)/` → đó là **import ngang giữa 2 route group**, đúng thứ F005 đã gọi là lỗi review và xử bằng cách promote (`IconPencil`). Nơi tổ tiên chung của `(public)` và `(protected)` là `src/app/` → phase 02 promote lên đó. Không promote thì cả 05 lẫn 07 đều kẹt.
- **RED của nhánh `@auth` cần Supabase local ĐANG CHẠY.** Supabase down → `(protected)/layout.tsx` redirect `/login` → test đỏ vì hạ tầng, không phải vì màn hình. Preflight: `supabase start` từ repo root (**không bao giờ `db reset`** — `auth.users` giữ sign-in thật), rồi `lsof -ti:3000 | xargs -r kill -9`.
- **Chỉ đúng 1 test CI-safe**: C17 (anonymous → `/login`) chạy được cả khi Supabase chết. Mọi test còn lại tag `@auth`. `ci.yml` đã `--grep-invert "@auth|@local-db"` ở 2 chỗ → **không sửa `ci.yml`**, nhưng phải nói thẳng: CI xanh gần như không chứng minh gì về `/profile`.
- **User thứ 2 cho `?id=` không cần seed migration.** `createTestSession(email2)` tạo `auth.users` row, trigger `0002` mirror sang `public.users` và trả về `user_id`. Nhưng trigger đọc `raw_user_meta_data->>'full_name'` mà `sign-in.ts` đang gửi `data: {}` → `full_name` NULL, và `ON CONFLICT DO NOTHING` khiến lần signup sau **không sửa được** giá trị đã NULL. Phase 01 thêm tham số `metadata` optional vào helper và dùng **email chưa từng tồn tại**.
- **View `profile_cards` là ranh giới bảo mật thật duy nhất thêm vào hệ.** 3 điều bắt buộc, mỗi cái đã có 1 dòng risk riêng ở phase 03: liệt kê cột tường minh (**không `SELECT *`**), `WITH (security_invoker = false)` viết rõ chứ không dựa mặc định, và **`REVOKE ALL ... FROM anon, PUBLIC`** — Supabase có default privileges cấp sẵn cho `anon`, không revoke là phơi tên+avatar toàn công ty ra anon key.
- **Gate cứng**: coverage 100% trên allowlist `.ts` → `profile-cards.ts`, `profile-cards-client.ts`, `parse-profile-id.ts` (đặt trong `_utils/` đúng vì glob `src/app/**/_utils/**/*.ts`) **phải** có test colocated. `messages-parity.test.ts` → mọi khoá `profile.*` vào **cả** `vi.json` và `en.json`.
- **Lệnh thật của repo**: không có `pnpm test`, không có `pnpm db:migrate`. Dùng `pnpm test:unit:coverage`, `pnpm test:e2e`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build` → `pnpm typecheck` (đúng thứ tự này), `pnpm build-storybook`; migration chạy bằng `supabase migration up`.
- **File ≤200 dòng**, kebab-case, named export, `"use client"` chỉ ở leaf.

## Out of scope (cố ý, đã chốt)

Toàn bộ Kudos domain: bảng `kudos`, board `/kudos`, modal Viết Kudo, feed thật, hashtag, đính kèm, ❤️ · 10 TC hoãn F007+ (FUN_006, FUN_007, FUN_010, FUN_013-015, GUI_006, GUI_007, SEC_002, SEC_003) · Cột `department`/Hero tier/hoa-thị stars (chưa có nguồn — RISK-02) · Sửa `docs/**` và `spec/**` · Đăng ký US###/PERM### vào registry chính thức.

## Rollback

Mỗi phase lùi độc lập, không phase nào phá `/`, `/login`, `/todo`, `/awards`, `/standards`:
01/08 = xoá spec + revert 1 tham số helper · **02 = revert commit move (rủi ro cao nhất — 4 trang đang chạy đều import; e2e `home`/`awards`/`standards`/`login` là lưới an toàn, phải xanh trước khi đóng phase)** · 03 = `DROP VIEW public.profile_cards` + revert commit; không code nào đang import DAL · 04 = revert commit, `/profile` về 404 như hiện tại · 05 = revert commit (component chưa được `page.tsx` render) · 06 = revert commit (helper chưa ai import) · 07 = xoá `page.tsx` → `/profile` quay lại 404.
