---
title: "Trang thể lệ SAA 2025 — public route `/standards`"
description: "Trang công khai `/standards`: panel Thể lệ tĩnh đọc từ i18n namespace `standards`, không chrome, 2 nút footer Đóng/Viết KUDOS. Lấp link chết cuối cùng của site."
status: completed
priority: P2
effort: 7.5h
branch: feat/standards-rules-page
tags: [standards, next16, momorph, i18n, static-content, e2e-red-first]
created: 2026-09-07
completed: 2026-09-07
work_type: feature
spec: plans/260907-0935-standards-rules-page/spec/F005_StandardsRulesPage/
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6
clarifications: plans/260907-0935-standards-rules-page/clarifications.md
---

# Thể lệ `/standards` — implementation plan

**Feature**: `F005_StandardsRulesPage` · **Screen**: SCR005_Standards · **Test policy**: `e2e-red-first`.
Phase 01 (`tester`) viết `tests/e2e/standards.spec.ts` và **phải đỏ thật** trước khi có dòng code UI nào. File đó là **hợp đồng DOM duy nhất** cho phase 04 — đọc thẳng, không suy diễn lại.
Khác `/awards` ở 3 điểm cố ý: **không Supabase** (nội dung tĩnh i18n), **không SiteHeader/SiteFooter** (design không vẽ chrome), **không tag CI** (spec chạy được 100% trong CI vì không phụ thuộc DB).

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [RED — `standards.spec.ts` + hợp đồng DOM](phase-01-red-e2e-standards-contract.md) | test gate | tester | ✅ complete | — | 1h |
| 02 | [Nền: route, footer, proxy, i18n, assets, icon pen](phase-02-route-i18n-assets-foundation.md) | B | implementer | ✅ complete | 01 | 1.5h |
| 03 | [Hook `useStandardsClose` + unit test](phase-03-use-standards-close-hook.md) | B | implementer | ✅ complete | 01 | 0.5h |
| 04 | [Track A — UI trình bày panel Thể lệ](phase-04-track-a-presentational-standards-ui.md) | A | momorph-ui-implementer | ✅ complete | 01, 02 | 2.5h |
| 05 | [Lắp `page.tsx` + client boundary + buildCopy](phase-05-integration-standards-page-wiring.md) | B | implementer | ✅ complete | 02, 03, 04 | 0.75h |
| 06 | [Temper — GREEN e2e, visual, regression](phase-06-temper-green-e2e-visual.md) | — | tester | ✅ complete | 05 | 1.25h |

Thứ tự phụ thuộc: `01` → `02 ∥ 03` → `04` → `05` → `06`.
**Chạy song song được**: 02 và 03 (file rời nhau hoàn toàn). 04 là merge point thứ nhất, 05 là thứ hai.

## File ownership (không phase song song nào chung file)

| Phase | Owns |
|-------|------|
| 01 | `tests/e2e/standards.spec.ts` *(tạo mới)* |
| 02 | `src/constants/routes.ts`, `src/proxy.ts`, `messages/vi.json`, `messages/en.json`, `public/standards/**`, `src/app/(public)/_components/site-footer.tsx`, `src/app/(public)/_components/icons/icon-pencil.tsx(+.stories.tsx)` *(promote)*, `src/app/(public)/(home)/_components/icons/icon-pencil.tsx(+.stories.tsx)` *(xoá)*, `src/app/(public)/(home)/_components/widget-button.tsx` *(đổi 1 dòng import)* |
| 03 | `src/app/(public)/standards/_hooks/use-standards-close.ts(+.test.ts)` |
| 04 | `src/app/(public)/standards/_components/{standards-screen,hero-badge-tier-row,secret-box-badge,standards-footer-actions}.tsx` + 4 file `.stories.tsx` cùng tên, `src/app/(public)/standards/_shared/standards-copy.ts` |
| 05 | `src/app/(public)/standards/page.tsx`, `src/app/(public)/standards/_components/standards-client.tsx`, `src/app/(public)/standards/_shared/build-standards-copy.ts` |
| 06 | `tests/e2e/standards.spec.ts` *(nhận lại từ 01 — tuần tự, cùng owner `tester`, không song song)* |

`standards-client.tsx` **cố ý không** nằm trong glob của phase 04: Track A không sở hữu `_components/**`, chỉ sở hữu đúng 8 file liệt kê ở trên.

## Key dependencies & quyết định chốt

- **RED phải đỏ vì assertion màn hình, không vì hạ tầng.** `/standards` hiện 404 → `h1` "Thể lệ" không tồn tại → exit ≠ 0 hợp lệ. Trước mỗi lượt e2e: **giết dev server cũ ở `:3000`** (`lsof -ti:3000 | xargs -r kill -9`) — `reuseExistingServer: !CI` phục vụ build cũ và làm test trông "flaky" (ghi nhận từ phiên trước).
- **Không bảng Supabase, không DAL, không migration.** Nội dung sống ở `messages/{vi,en}.json` namespace `standards`. Hệ quả tốt: cả spec e2e chạy được trong CI, **không cần tag `@local-db`, không sửa `ci.yml`**.
- **Không SiteHeader/SiteFooter** (clarifications.md § Session bổ sung). Hệ quả kiểm chứng được: trang có **0** `<header>`, **0** `<footer>`, và **đúng 1** `a[href="/kudos"]` — nên không dính strict-mode như `/awards` đã dính.
- **Panel là `<main>` cuộn được** (`overflow-y:auto`, cao bằng viewport), không phải window scroll. FR-301/302 assert trên `main.scrollTop`/`scrollHeight`.
- **Icon pen: promote `IconPencil` lên `(public)/_components/icons/`** thay vì `<Image src="/home/Pen.svg">`. Lý do bắt buộc: `public/home/Pen.svg` là `fill="white"` — trắng trên nút vàng primary là vô hình. `IconPencil` đã là cùng path đó với `currentColor` và đã chạy trên đúng nền vàng ở `widget-button`. Không nhân bản path, không thêm asset thứ 12. **RESOLVED 2026-09-07** — coordinator đã xác minh `fill="white"` và chấp nhận: quyết định này **thay thế** constraint "reuse `public/home/Pen.svg`" trong `clarifications.md`. Không mở lại.
- **`character` là nội dung, `itemName` thì không.** Tên layer của TEXT node không nhất thiết bằng nội dung — luôn lấy `get_node(...).character`. Ba chỗ lệch trên màn này: `I3204:6088;737:20392` → **`ROOT FURTHER`** (tên layer ghi thiếu R: "ROOT FUTHER"), `I3204:6093;186:2760` → `Đóng`, `I3204:6094;186:1568` → `Viết KUDOS` (hai cái sau mang tên component mặc định). Mọi string còn lại name == character; `3204:6078` và `3204:6091` dư `\n` cuối → trim.
- **Ký tự phải giữ nguyên**: en-dash `10–20`, emoji ❤️ ở 2 đoạn, caption uppercase không dịch.
- **Gate cứng**: coverage 100% trên allowlist `.ts` → `use-standards-close.ts` **phải** có test colocated (`vitest.config.ts:97-122`). `messages-parity.test.ts` → mọi khoá mới vào **cả** `vi.json` và `en.json`.
- **Lệnh thật của repo**: không có `pnpm test`. Dùng `pnpm test:unit:coverage`, `pnpm test:e2e`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build` → `pnpm typecheck` (đúng thứ tự này, `ci.yml` giải thích vì sao), `pnpm build-storybook`.
- **File ≤200 dòng**, kebab-case, named export, `"use client"` chỉ ở leaf.

## Out of scope (cố ý, đã chốt)

TC_THELE_GUI_003 + TC_THELE_FUN_005 (trạng thái `disabled` của 2 nút) — không tồn tại điều kiện runtime nào kích hoạt, implement là YAGNI · Xây `/kudos` · Intercepting route `@modal`/`(.)standards` · Bảng Supabase · Breakpoint responsive cụ thể (design chỉ vẽ 1440).

## Mid-flight Defects Caught & Fixed

**All 6 phases delivered with 3 defects caught and corrected:**

1. **Phase 01/06 — C10/C11 vacuous assertions** (clarifications § bổ sung 2): Original assertions `expect(page.url()).toContain("/")` pass on every URL including `/standards` itself, defeating the test. Fixed by adding `page.waitForURL()` guards and tightening to exact pathname checks via `new URL(page.url()).pathname`.

2. **Phase 03 — `history.length` heuristic broken** (clarifications § bổ sung 4): Original branching on `window.history.length > 1` fails to distinguish in-app navigation (history=3) from direct load (history=2 in Playwright, 1 in a real browser). Measured in Chromium via the repo's dev server. Replaced with `window.navigation?.canGoBack` (Navigation API), falling back to `router.push(ROUTES.HOME)` on engines without the API.

3. **Phase 02/04 — badge captions printed twice** (clarifications § bổ sung 5): MoMorph export rasterizes captions into the badge images. Components also render DOM `<p>` captions per contract C5. Result: each badge name printed twice, and badge 6 printed two spellings stacked ("ROOT FUTHER" baked in, "ROOT FURTHER" in DOM). Fixed by re-cropping all 6 assets to 64×64 inner frame (artwork only, no caption). Unified badge dimensions in `standards-copy.ts` using `SECRET_BOX_BADGE_SIZE` constant. Simplified `secret-box-badge.tsx`: removed per-badge height table, removed `fill` frame, confirmed caption is DOM text only.

## Rollback

Mỗi phase lùi độc lập, không phase nào phá `/`, `/login`, `/todo`, `/awards`:
01/06 = xoá spec (không code nào phụ thuộc) · 02 = revert commit; `ROUTES.STANDARDS` biến mất, footer về `href="/standards"` literal, `IconPencil` về `(home)/`; `/standards` vẫn 404 như hiện tại · 03 = revert commit (hook chưa ai import) · 04 = revert commit (component chưa được `page.tsx` render) · 05 = xoá `page.tsx` → `/standards` quay lại 404.
