---
title: "Chuẩn unit test co-located + Storybook, và đưa repo về đúng chuẩn"
description: "Skill định nghĩa chuẩn test/story trước, rồi 9 phase kéo coverage logic layer lên 100% và dựng Storybook cho common component + route chính"
status: completed
priority: P1
effort: 12.5h
branch: feat/test-storybook-standards
tags: [testing, storybook, msw, vitest, coverage, skill]
created: 2026-09-05
spec_draft: plans/260905-2221-testing-storybook-standards/spec/testing-storybook-standards/
---

# Chuẩn unit test co-located + Storybook

Hai deliverable, đúng thứ tự user yêu cầu: **(1)** skill định nghĩa chuẩn, **(2)** code
được kéo về đúng chuẩn đó.

**Spec nguồn** (đã chốt, không mở lại): [`functional-spec.md`](./spec/testing-storybook-standards/functional-spec.md) ·
[`technical-spec.md`](./spec/testing-storybook-standards/technical-spec.md) · **System doc draft**
(promote đích `docs/vi/system/architecture.md` ở Delivery, không thuộc phase nào): [`spec/system/architecture.md`](./spec/system/architecture.md)
**Research**: [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) ·
[`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md)

## Phases

| # | Phase | Status | Effort | Depends on |
|---|-------|--------|--------|------------|
| 01 | [Viết skill chuẩn test/story](./phase-01-author-testing-storybook-skill.md) | completed | 1h | — |
| 02 | [Cài dependency test + Storybook](./phase-02-install-test-and-storybook-dependencies.md) | completed | 0.5h | — |
| 03 | [Tách runner vitest + MSW dùng chung](./phase-03-vitest-runner-split-and-shared-msw-mocks.md) | completed | 1h | 02 |
| 04 | [Test 3 factory Supabase + vá `next-path`](./phase-04-unit-tests-supabase-factories-and-next-path-gap.md) | completed | 1.5h | 03 |
| 05 | [Test 2 hook dưới jsdom](./phase-05-unit-tests-hooks-under-jsdom.md) | completed | 2h | 03 |
| 06 | [Test Server Action + route callback (MSW thật)](./phase-06-unit-tests-server-actions-and-oauth-callback.md) | completed | 2h | 03 |
| 07 | [Cấu hình Storybook + MSW + next-intl](./phase-07-storybook-config-with-msw-and-next-intl.md) | completed | 1.5h | 02 |
| 08 | [Story cho common component](./phase-08-stories-for-common-components.md) | completed | 1h | 07 |
| 09 | [Tách `TodoScreen` + story cho route chính](./phase-09-extract-todo-screen-and-route-stories.md) | completed | 1.5h | 07 |
| 10 | [Bật ngưỡng 100% + cổng CI](./phase-10-enforce-coverage-threshold-and-ci-gate.md) | completed | 0.5h | 04,05,06,08,09 |

Chạy song song được: `01 ∥ 02` → `03 ∥ 07` → `(04 ∥ 05 ∥ 06) ∥ (08 ∥ 09)` → `10`.

## Cửa xanh sau MỖI phase

```bash
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck
```

Cả 5 lệnh exit 0. `test:unit:coverage` **không** nằm trong cửa này cho tới phase 10 —
đó chính là cách ngưỡng 100% không bao giờ bật trước khi test có đủ.

## File ownership — 2 chỗ chồng lấn, cả hai an toàn

Bảng đầy đủ nằm trong từng phase file. Hai ngoại lệ:

1. `vitest.config.ts` — phase 03 sở hữu MỌI key trừ `coverage.thresholds`; phase 10 sở hữu ĐÚNG
   key đó, không đụng `projects`/`include`/`alias`. An toàn vì 10 phụ thuộc bắc cầu vào 03.
2. `components/login/` — phase 08 và 09 cùng thư mục, khác file (08: 7 story common component;
   09: `login-screen.stories.tsx`).

## Rollback

Mỗi phase là 1 commit, lùi bằng `git revert <sha>`. Không phase nào đụng runtime production
(`proxy.ts`, `lib/**/*.ts` non-test, `app/**/page.tsx`) **trừ phase 09** — rollback chi tiết
nằm trong phase file đó. Không có migration, không có dữ liệu người dùng dính vào.

## 5 câu chưa chốt ở technical-spec § 5.3 — ai giải, giải bằng cách nào

| # | Câu hỏi | Phase giải | Cách giải |
|---|---------|-----------|-----------|
| 1 | `storybook init` tự chọn framework nào | 02 | Không dùng auto-detect. Pin tay `@storybook/nextjs-vite@10.6.0`, verify bằng `pnpm ls` |
| 2 | API bề mặt `msw-storybook-addon@3.0.0` | 07 | Đọc `node_modules/msw-storybook-addon/README.md` đã cài, trước khi viết `preview.tsx` |
| 3 | pnpm resolve Vite major nào | 02 | `pnpm ls vite` sau install, ghi lại số thật |
| 4 | `NextResponse.redirect()` có độc lập request-context | 06 | Smoke test nhánh không-code TRƯỚC, rồi mới viết phần còn lại |
| 5 | `setupFiles` MSW ở root hay per-project | 03 | **Đã chốt: ROOT.** MSW patch tầng `http`/`fetch` của Node, không đụng jsdom |

## Decisions cần ghi vào `plans/action-items.md` ở Delivery

- Tên skill `write-unit-tests-and-storybook-stories` — kebab-case, tự mô tả, cùng giọng skill có sẵn.
- MSW `setupFiles` ở ROOT `vitest.config.ts`, cả 2 project dùng chung (giải câu #5).
- CI job `quality` thêm bước `build-storybook` — theo pattern repo: gate mọi artifact kiểm được.
- Phase 01 chạy `prettier --write CLAUDE.md`: `format:check` ĐANG đỏ sẵn, mọi cửa xanh vô nghĩa nếu không dọn.
- Test route callback đi qua MSW thật (không mock `@/lib/supabase/server`) để FR-003 có nghĩa —
  rủi ro PKCE verifier + đường lùi ghi trong phase 06.
