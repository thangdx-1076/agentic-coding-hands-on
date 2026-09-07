---
title: "Hệ thống giải — public route `/awards`"
description: "Trang công khai `/awards`: 6 hạng mục giải đọc từ Supabase local, nav trái click-scroll + scroll-spy, chrome dùng chung được promote lên `(public)/_components/`."
status: completed
priority: P1
effort: 11h
branch: feat/award-system-page
tags: [awards, next16, momorph, supabase, i18n, scroll-spy, e2e-red-first]
created: 2026-09-06
work_type: feature
spec: plans/260906-2258-award-system-page/spec/F004_AwardSystemPage/
seed_content: plans/260906-2258-award-system-page/spec/award-seed-content.md
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
clarifications: plans/260906-2258-award-system-page/clarifications.md
---

# Hệ thống giải `/awards` — implementation plan

**Feature**: `F004_AwardSystemPage` · **Screen**: SCR004_Awards · **Test policy**: `e2e-red-first`.
RED đã có sẵn: `tests/e2e/awards.spec.ts` (10 test, TC ID-0/3/4/5/6/7/8/9/11/13) — implementation phải làm nó xanh, DOM contract lấy thẳng từ file đó, không suy diễn lại.
**Nguồn nội dung DUY NHẤT**: `spec/award-seed-content.md` (thắng `technical-spec.md § 4.4 Seed data`).

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [Migration + seed `public.awards`](phase-01-supabase-awards-migration-seed.md) | B | implementer (orchestrator chạy CLI) | ✅ completed | — | 0.5h |
| 02 | [Promote chrome dùng chung lên `(public)`](phase-02-promote-shared-site-chrome.md) | B (prereq refactor) | implementer | ✅ completed | — | 2h |
| 03 | [DAL `getAwards` + i18n + đăng ký route](phase-03-dal-awards-i18n-route-registration.md) | B | implementer | ✅ completed | — | 1.5h |
| 04 | [Pure scroll-spy + hook `useAwardCategoryNav`](phase-04-scroll-spy-util-and-nav-hook.md) | B | implementer | ✅ completed | — | 1.5h |
| 05 | [Track A — UI trình bày `/awards`](phase-05-track-a-presentational-awards-ui.md) | A | momorph-ui-implementer | ✅ completed | 02, 04 | 3h |
| 06 | [Lắp trang `page.tsx` + client boundary](phase-06-integration-awards-page-wiring.md) | B | implementer | ✅ completed | 03, 05 | 1h |
| 07 | [Temper — GREEN e2e, gắn tag CI, visual](phase-07-temper-green-e2e-ci-tagging-visual.md) | — | tester | ✅ completed | 01, 06 | 1.5h |

Thứ tự phụ thuộc: `01 ∥ 02 ∥ 03 ∥ 04` → `05` → `06` → `07`.
**Chạy song song được**: 01, 02, 03, 04 (bốn phase, file rời nhau hoàn toàn). 05 là merge point thứ nhất, 06 là thứ hai.

## File ownership (không phase song song nào chung file)

| Phase | Owns |
|-------|------|
| 01 | `~/Desktop/Claude-and-mormoph/saa-app/supabase/migrations/0003_awards_table.sql` — **ngoài repo này**, repo KHÔNG được mọc thư mục `supabase/` |
| 02 | `src/app/(public)/_components/{site-header,site-footer,kudos-section,keyvisual-background,logo-link,nav-link,account-menu,notification-bell}.tsx` + `_components/icons/{icon-user,icon-bell,icon-up-right}.tsx` (+ 7 file `.stories.tsx` đi kèm), `src/app/(public)/_shared/{site-chrome.ts,award-name-graphics.ts}`, `src/app/(public)/_utils/get-viewer.ts(+.test.ts)`, và MỌI file trong `src/app/(public)/(home)/**` |
| 03 | `src/dal/awards.ts(+.test.ts)`, `src/dal/awards-client.ts(+.test.ts)`, `src/constants/routes.ts`, `src/proxy.ts`, `messages/vi.json`, `messages/en.json` |
| 04 | `src/app/(public)/awards/_utils/scroll-spy.ts(+.test.ts)`, `src/app/(public)/awards/_hooks/use-award-category-nav.ts(+.test.ts)` |
| 05 | `src/app/(public)/awards/_components/{awards-screen,award-section,award-category-nav,awards-empty-state}.tsx`, `_components/icons/icon-{target,diamond,license}.tsx(+.stories.tsx)`, `_components/awards-screen.stories.tsx`, `src/app/(public)/awards/_shared/awards-copy.ts`, `src/styles/globals.css` (chỉ thêm token) |
| 06 | `src/app/(public)/awards/page.tsx`, `src/app/(public)/awards/_components/awards-client.tsx` |
| 07 | `tests/e2e/awards.spec.ts`, `.github/workflows/ci.yml` |

## Key dependencies & quyết định chốt

- **`supabase db reset` bị CẤM** (142 auth user thật). Chỉ `supabase migration up`. Seed nằm TRONG `0003_awards_table.sql` với `ON CONFLICT DO NOTHING`; KHÔNG tạo `supabase/seed.sql` (file đó chỉ được đọc bởi `db reset`).
- **RLS phải cho cả `anon` lẫn `authenticated`** — `/awards` công khai, khách chưa đăng nhập render trang.
- **Căng thẳng CI ↔ dữ liệu** (giải ở phase 07): CI chạy `--grep-invert @auth` với Supabase không tới được → `getAwards` fail-open `[]` → mọi assertion về nội dung giải sẽ đỏ. Chốt: **tách `awards.spec.ts` làm 2 describe**, nhóm phụ thuộc DB gắn tag mới `@local-db` và CI đổi sang `--grep-invert "@auth|@local-db"`. Lý do đầy đủ + 2 phương án bị loại: `phase-07 § Key Insights`.
- **2 defect trong RED phải sửa ở GREEN, do `tester` sở hữu, KHÔNG phải UI implementer**: `awards.spec.ts:197` (`a[href="/kudos"]` khớp 3 element → strict-mode) và `:181-184` (`section img` `toHaveCount(1)` nhưng ảnh giải là 2 lớp `Award_BG.png` + PNG tên giải).
- **Scope ladder**: `Header`/`HomeFooter`/`KudosSection`/`KeyvisualBackground` + toàn bộ dependency bắc cầu của chúng (`LogoLink`, `NavLink`, `AccountMenu`, `NotificationBell`, `IconUser`, `IconBell`, `IconUpRight`) leo lên `(public)/_components/`. Import ngang sang `_components` của segment anh em là lỗi review (`nextjs-route-colocation-architecture` SKILL.md:104).
- **Gate cứng**: 100% coverage trên allowlist `.ts` (`vitest.config.ts:97-122`) — mọi `.ts` mới trong `src/dal/**`, `src/app/**/_hooks|_utils|_actions/**` phải có test colocated. `messages-parity.test.ts` — khoá mới vào CẢ `vi.json` và `en.json`.
- **File ≤200 dòng**, kebab-case, named export.

## Outstanding Debt

**Chốt**: tất cả 7 phase hoàn tất. Các mục dưới là công nợ kỹ thuật/spec, KHÔNG phải lỗi delivery.

- **TC ID-1** (unauthenticated → redirect `/login`) — deliberate NOT implemented; `/awards` chốt công khai per `docs/vi/system/permissions.md:54`. Cần chủ spec xác nhận.
- **TC ID-12, ID-14** — unsatisfiable: tìm link `/kudos` trong trang nhưng `/kudos` chưa tồn tại. Chốt lại khi `/kudos` land.
- **EN locale** — chỉ seed `vi`. Dịch công khai nội dung 6 giải sang EN nằm ngoài scope.
- **CI coverage** — `@local-db` tests KHÔNG chạy trong CI (phụ thuộc Supabase local). CI chỉ chứng minh render + graceful degrade, không nội dung 6 giải.
- **Reviewer Medium ×2** — cross-boundary `document.getElementById` (award-category-nav.tsx:46-55) + one-shot `IntersectionObserver.observe()` (use-award-category-nav.ts:82-103) sẽ silent-fail nếu section leo lên `Suspense`/streaming về sau. Chốt: acceptable risk, được ghi.
- **Reviewer Low ×1** — missing per-slug name PNG renders nothing (award-section.tsx:37), no dev signal. Trap nếu 7th award thêm vào.

## Rollback

Mỗi phase lùi được độc lập: 01 = `DROP TABLE public.awards` (không migration nào khác phụ thuộc); 02 = revert commit (thuần di chuyển file, không đổi DOM); 03–06 = revert commit, `/awards` quay về 404 như hiện tại; 07 = revert `ci.yml` + spec. Không phase nào phá `/`, `/login`, `/todo`.
