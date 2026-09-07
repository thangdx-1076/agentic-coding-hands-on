---
title: "Sun* Kudos Live board — public route `/kudos`"
description: "Trang `/kudos` công khai: banner + ô nhập, carousel HIGHLIGHT top-5 theo tim, Spotlight scatter + tổng đếm thật, feed ALL KUDOS cuộn vô hạn, sidebar 5 chỉ số + 2 leaderboard, thả tim ghi DB. Màn đầu tiên của repo có dữ liệu ghi được — migration 0006/0007/0008."
status: completed
priority: P0
effort: 16h
branch: feat/kudos-live-board
tags: [kudos, next16, momorph, supabase, rls, trigger, i18n, e2e-red-first]
created: 2026-09-07
work_type: feature
spec:
  - docs/vi/features/F007_KudosLiveBoard/
  - docs/vi/features/F008_KudosHeartReaction/
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
clarifications: plans/260907-1725-kudos-live-board/clarifications.md
---

# `/kudos` — implementation plan

**F007_KudosLiveBoard** (P0) + **F008_KudosHeartReaction** (P1) · SCR007 · `e2e-red-first`. Phase 01 (`tester`) viết `tests/e2e/kudos.spec.ts` và **phải đỏ thật** trước dòng code UI đầu tiên — file đó là **hợp đồng DOM duy nhất** cho 6 phase UI, đọc thẳng, không suy diễn lại. Khác `/profile` (F006) ở 3 điểm cố ý: **public** (không gate), **có đường GHI vào DB** (F008), và **cần dữ liệu seed thật** (8 Sunner) nên sinh thêm tầng test `@local-db`.

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [RED — `kudos.spec.ts` + hợp đồng DOM](phase-01-red-e2e-kudos-contract.md) | test gate | tester | completed | — | 1.5h |
| 02 | [Nền: route, i18n `kudos`, assets](phase-02-foundation-route-i18n-assets.md) | B | implementer | completed | 01 | 0.75h |
| 03 | [Migration 0006 `kudos` + view + DAL](phase-03-migration-0006-kudos-dal.md) | B | implementer | completed | 01 | 1.5h |
| 04 | [Migration 0007 `kudo_hearts` + trigger + action](phase-04-migration-0007-hearts-toggle.md) | B | implementer | completed | 03 | 1.25h |
| 05 | [Migration 0008 seed 8 Sunner + kudos Figma](phase-05-migration-0008-demo-seed.md) | B | implementer | completed | 03, 04 | 1h |
| 06 | [Logic route: `_utils`/`_hooks`/`_actions` + unit test](phase-06-route-logic-utils-hooks-actions.md) | B | implementer | completed | 03 | 1.25h |
| 07 | [Track A — thẻ Kudos dùng chung + `kudos-copy`](phase-07-track-a-shared-kudos-card.md) | A | momorph-ui-implementer | completed | 01, 02 | 1.5h |
| 08 | [Track A — banner A + ô nhập A.1 + filter B.1](phase-08-track-a-banner-input-filter.md) | A | momorph-ui-implementer | completed | 01, 02 | 1h |
| 09 | [Track A — carousel HIGHLIGHT B](phase-09-track-a-highlight-carousel.md) | A | momorph-ui-implementer | completed | 01, 06, 07 | 1.25h |
| 10 | [Track A — Spotlight B.6/B.7](phase-10-track-a-spotlight.md) | A | momorph-ui-implementer | completed | 01, 06 | 1h |
| 11 | [Track A — feed ALL KUDOS C](phase-11-track-a-all-kudos-feed.md) | A | momorph-ui-implementer | completed | 01, 06, 07 | 1.25h |
| 12 | [Track A — sidebar D](phase-12-track-a-sidebar.md) | A | momorph-ui-implementer | completed | 01, 02 | 1h |
| 13 | [Lắp `page.tsx` + client boundary + buildCopy](phase-13-integration-kudos-page-wiring.md) | B | implementer | completed | 02–12 | 1.25h |
| 14 | [Temper — GREEN e2e, visual, regression](phase-14-temper-green-e2e-visual.md) | — | tester | completed | 13 | 1.5h |

Thứ tự: `01` → `02 ∥ 03` → `04 ∥ 06 ∥ 07 ∥ 08 ∥ 12` → `05 ∥ 09 ∥ 10 ∥ 11` → `13` → `14`. `13` là merge point duy nhất.

## File ownership (không phase song song nào chung file; path rút gọn = `src/app/(public)/kudos/`)

| Phase | Owns |
|-------|------|
| 01 | `tests/e2e/kudos.spec.ts` *(tạo)* |
| 02 | `src/constants/routes.ts`, `messages/vi.json`, `messages/en.json`, `public/kudos/**` |
| 03 | `supabase/migrations/0006_kudos.sql`, `src/dal/kudos.ts(+test)`, `src/dal/kudos-client.ts(+test)` |
| 04 | `supabase/migrations/0007_kudo_hearts.sql`, `src/dal/kudo-hearts.ts(+test)`, `src/dal/kudo-hearts-client.ts(+test)`, `_actions/toggle-kudo-heart.ts(+test)` |
| 05 | `supabase/migrations/0008_kudos_demo_seed.sql`, `evidence/seed-transcript.md` |
| 06 | `_utils/{format-kudo-time,star-tier}.ts(+test)`, `_hooks/{use-carousel-index,use-spotlight-search,use-infinite-feed}.ts(+test)`, `_actions/load-more-kudos.ts(+test)` |
| 07 | `_components/{kudos-card,kudos-card-person,kudos-hashtag-list,kudos-heart-button,kudos-image-strip,kudos-card-actions}.tsx` + 6 `.stories.tsx`, `_shared/kudos-copy.ts` |
| 08 | `_components/{kudos-banner,kudos-compose-pill,kudos-filter-bar,kudos-filter-menu}.tsx` + 4 `.stories.tsx` |
| 09 | `_components/{kudos-highlight-carousel,kudos-carousel-nav,kudos-slide-counter}.tsx` + 3 `.stories.tsx` |
| 10 | `_components/{kudos-spotlight,kudos-spotlight-scatter,kudos-sunner-search}.tsx` + 3 `.stories.tsx` |
| 11 | `_components/{kudos-feed,kudos-feed-sentinel,kudos-empty-state}.tsx` + 3 `.stories.tsx` |
| 12 | `_components/{kudos-sidebar,kudos-stat-list,kudos-leaderboard}.tsx` + 3 `.stories.tsx` |
| 13 | `page.tsx`, `_components/{kudos-client,kudos-screen}.tsx`, `_shared/build-kudos-copy.ts` — 3 file này **cố ý không** thuộc glob phase 07–12: Track A sở hữu đúng danh sách liệt kê, không sở hữu cả `_components/**` |
| 14 | `tests/e2e/kudos.spec.ts` *(nhận lại từ 01 — tuần tự, cùng owner)*, `tests/e2e/standards.spec.ts` *(sửa 1 comment "trang đích 404")* |

## Quyết định chốt (đọc trước khi code)

- **AD-1 — `kudos.heart_count` là cột denormalized trên `kudos` (0006), do TRIGGER trên `kudo_hearts` (0007) duy trì.** Hai spec mâu thuẫn: F007 §4.2 giả định có cột, F008 §1 nói `COUNT` trực tiếp. Phân xử bằng ràng buộc vật lý: view `kudos_cards` sinh ở `0006` **không thể** tham chiếu bảng sinh ở `0007`, và `authenticated` tuyệt đối không được cấp `UPDATE` trên `kudos`. Trigger `SECURITY DEFINER` chạy được vì role `postgres` có `rolbypassrls = true` (đã verify trên `supabase_db_saa-app`). Biểu thức cộng viết sẵn `CASE WHEN special THEN 2 ELSE 1 END` → quy tắc "ngày đặc biệt" sau này không phải migrate lại.
- **AD-2 — trạng thái "đã thả tim của người xem" do DAL của F008 đọc, không phải F007.** `src/dal/kudos.ts` không được nhắc tới `kudo_hearts`; nhờ vậy F007 chạy và test được độc lập khi `0007` chưa apply.
- **AD-3 — seed nằm ở migration RIÊNG `0008`.** Nó cần cả `0006` lẫn `0007`, mà hai file kia đã có chủ khác nhau. `public.users.id` là **FK tới `auth.users(id)`** (0001) → không thể seed thẳng `public.users`; phải INSERT `auth.users` (chỉ `id`, `email`, `raw_user_meta_data` là bắt buộc — đã verify) rồi để trigger `0002` mirror sang.
- **AD-4/AD-5 — bộ lọc sống ở URL `searchParams` (không `useState`), phân trang dùng keyset cursor `created_at` (không `OFFSET`).** Đúng thiết kế A1; carousel tự về slide 1 nhờ remount, không cần reset thủ công (BR-003). `OFFSET` sẽ nhân đôi/nuốt bản ghi khi có kudo mới chèn vào giữa lúc cuộn.
- **AD-6 — thêm `ROUTES.KUDOS` nhưng KHÔNG viết lại 5 điểm liên kết đang hardcode `href="/kudos"`.** 5 file đó thuộc F003–F005 và e2e của chúng assert đúng chuỗi `a[href="/kudos"]`; đổi sang hằng số là 0 thay đổi hành vi, đổi lại 5 file có nguy cơ xung đột.
- **AD-7 — ba tầng tag e2e.** DAL fail-open trả `[]` khi Supabase không với tới được (đúng cách `/awards` đang chạy trong CI), nên nhánh **CI-safe** kiểm được: chrome, banner, placeholder ô nhập, `maxLength` ô tìm, và **cả hai chuỗi empty state**. `@local-db` cho mọi assert dựa trên dữ liệu seed; `@auth` cho thả tim, 5 chỉ số cá nhân, điều hướng profile. **Không sửa `ci.yml`** — `--grep-invert "@auth|@local-db"` đã đúng sẵn.
- **AD-8 — 2 dòng Secret Box ở sidebar render `0`, nút "Mở quà" render `disabled`.** Chưa có bảng quà nào, nên `0` là con số ĐÚNG cho người đã đăng nhập (không ai có hộp quà), khác hẳn trường hợp ẩn danh mà D001 chốt là phải ẩn cả khối. Cả 2 leaderboard cũng chưa có nguồn → cùng hiện `Chưa có dữ liệu`, thoả luôn FR-213/TC[22].
- **Lệnh và quy ước**: `pnpm test:unit:coverage` (gate 100% trên allowlist `.ts`), `pnpm test:e2e`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build` → `pnpm typecheck`, `pnpm build-storybook`; migration bằng `supabase migration up` từ repo root, **không bao giờ `supabase db reset`** (`auth.users` giữ 199 phiên thật). File ≤200 dòng, kebab-case, named export, `"use client"` chỉ ở leaf, import chrome bằng relative `../../../_components/...` (alias `@/app/**/_*` bị ESLint cấm).

## Out of scope (đã chốt ở `clarifications.md`, không mở lại)

- **5 bề mặt cần một frame Figma chưa tồn tại** — dialog Viết Kudo `ihQ26W78P2` (ô nhập A.1 chỉ render) · dialog Secret Box `J3-4YFIpMM` (nút "Mở quà" disabled) · trang chi tiết kudo `onDIohs2bS` (nút "Xem chi tiết" không điều hướng) · hover preview profile `Bf5XiTE7AO` · lightbox ảnh. Kéo theo TC[01], TC[18], TC[20], TC[26], TC[34], TC[38], TC[39] không thoả; TC[40] chỉ thoả nửa click.
- **Pan/zoom Spotlight** (`B.7.2` là FRAME rỗng, Spotlight vốn là ~120 TEXT node tĩnh — TC[37]) và **quy tắc "+2 tim ngày đặc biệt"** (không có màn admin, không bảng config, không dựng nổi precondition — TC[25]; cột `special` vẫn tạo sẵn).
- **Supabase Realtime** — "Live board" là nhãn design, không TC nào đòi cập nhật không reload; server render + revalidate. **Đăng ký F007/F008/SCR007/US###/PERM### vào `docs/vi/**`** là việc của bước promote, không phải của plan này.

## Rollback

Mỗi phase lùi độc lập; không phase nào phá `/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile`. 01/14 = xoá spec (+revert 1 comment) · 02 = revert commit, `/kudos` về 404 như hiện tại · **03 = `DROP VIEW public.kudos_cards; DROP TABLE public.kudos; ALTER TABLE public.users DROP COLUMN department;` — `department` là thay đổi DUY NHẤT chạm vào một bảng đang chạy, và nó nullable nên trigger `0002` không hề gãy** · 04 = `DROP TABLE public.kudo_hearts; DROP FUNCTION public.sync_kudo_heart_count();` (cascade xoá trigger; `heart_count` đứng yên ở giá trị cuối) · 05 = `DELETE FROM auth.users WHERE email LIKE '%@kudos-demo.saa';` (cascade dọn sạch cả `users`, `kudos`, `kudo_hearts`) · 06–12 = revert commit, chưa file nào được `page.tsx` render · 13 = xoá `page.tsx` → `/kudos` quay lại 404.
