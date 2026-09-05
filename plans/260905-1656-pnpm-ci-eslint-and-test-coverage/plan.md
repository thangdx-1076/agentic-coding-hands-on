---
title: "pnpm + ESLint standard + Prettier + test gaps + GitHub Actions CI"
description: "Chuyển repo sang pnpm, dựng chuẩn lint/format đo được, bù 3 khoảng trống test lớn nhất, và dựng CI 2 job nói thẳng phần auth không được phủ."
status: pending
priority: P2
effort: 11h
branch: feat/login-google-oauth
tags: [tooling, pnpm, eslint, prettier, testing, ci, github-actions]
created: 2026-09-05
work_type: feature
spec_draft: plans/260905-1656-pnpm-ci-eslint-and-test-coverage/spec/system/architecture.md
clarifications: plans/260905-1656-pnpm-ci-eslint-and-test-coverage/clarifications.md
---

# Repo infrastructure — pnpm, lint standard, test gaps, CI

Bốn workstream hạ tầng, KHÔNG đổi một dòng hành vi runtime nào của app. Mọi quyết định đã chốt ở `clarifications.md` — plan này chỉ xếp thứ tự và gắn tiêu chí done đo được.

## Phases

| # | Phase | Owner | Status | Depends on | Effort |
|---|-------|-------|--------|-----------|--------|
| 01 | [pnpm migration + package-manager pin](phase-01-pnpm-migration-and-package-manager-pin.md) | implementer | pending | — | 2h |
| 02 | [ESLint standard + 36 finding đã đo](phase-02-eslint-standard-and-measured-fixes.md) | implementer | pending | 01 | 2h |
| 03 | [Prettier + reformat baseline](phase-03-prettier-format-baseline.md) | implementer | pending | 02 | 1h |
| 04 | [Test gaps + coverage tooling](phase-04-test-gaps-and-coverage-tooling.md) | tester | pending | 03 | 3.5h |
| 05 | [CI job `quality`](phase-05-ci-quality-job.md) | implementer | pending | 03 | 1.5h |
| 06 | [CI job `e2e` + coverage-limit notice](phase-06-ci-e2e-job-and-coverage-limit-notice.md) | implementer | pending | 04, 05 | 1h |

Thứ tự: `01 → 02 → 03 → (04 ∥ 05) → 06`.

**Vì sao đúng thứ tự này** (đây mới là phần thiết kế thật):
- **01 trước hết** — tiêu chí done của mọi phase sau là một câu lệnh. Đổi package manager sau cùng thì phải viết lại toàn bộ lệnh đó. Thêm nữa `pnpm import` chỉ giữ được parity version khi nó là thay đổi DUY NHẤT trong commit; 4 devDep mới của phase 02 phải vào qua `pnpm add`, không phải qua npm rồi import lại.
- **02 trước 04** — 2 bug `await` thật (`route.abort()`/`route.fulfill()`) nằm trong `tests/e2e/login.spec.ts`, đúng file phase 04 sẽ viết thêm. Sửa trước, và quan trọng hơn: test outage mới của phase 04 cũng dùng `page.route()` — viết nó dưới `missing-playwright-await` đang bật thì lớp bug đó bị chặn ngay lúc gõ, thay vì phát hiện sau.
- **03 trước 04, không phải sau** — reformat 16 file là diff cơ học. Đặt sau phase 04 thì diff logic test mới bị whitespace nhấn chìm khi review. Đặt trước thì test mới được viết trên cây đã chuẩn hoá và `prettier --check` của chính phase 04 giữ nó đúng. Cái giá phải trả (03 chạm `login.spec.ts` mà 04 sẽ sửa tiếp) là tuần tự, không phải tranh chấp.
- **05 song song 04** — job `quality` không cần biết test nào tồn tại; nó gác lint/format/typecheck/unit/build. Cho nó land sớm nghĩa là công việc test của phase 04 được CI thật soi ngay.
- **06 sau cùng** — `--grep-invert @auth` chỉ có nghĩa sau khi tag `@auth` tồn tại (phase 04). Land trước thì CI chạy cả 2 test `Authenticated` và đỏ ngay.

## File ownership

| Phase | Owns |
|-------|------|
| 01 | `package.json`, `pnpm-lock.yaml` (create), `package-lock.json` (delete), `playwright.config.ts`, `README.md` |
| 02 | `eslint.config.mjs`, `tsconfig.json`, `package.json`, + mọi file source bị `--fix` chạm (`app/**`, `components/**`, `lib/**`, `i18n/**`, `tests/**` — 16 file `import/order` + 4 file sửa tay) |
| 03 | `.prettierignore` (create), `package.json`, `eslint.config.mjs`, + 16 file source (CHỈ whitespace) |
| 04 | `tests/e2e/**`, `lib/i18n/messages-parity.test.ts` (create), `vitest.config.ts`, `package.json` |
| 05 | `.github/workflows/ci.yml` (create) |
| 06 | `.github/workflows/ci.yml` (modify) |

01→02→03→04 nối tiếp nên cùng chạm `package.json` là hợp lệ. Cặp song song duy nhất là **04 ∥ 05**: 04 giữ `package.json` + `tests/**`, 05 chỉ giữ `.github/**` — rời hẳn nhau. 06 nối tiếp 05 trên cùng file workflow.

## Cross-phase risks

| Risk | L×I | Countermeasure | Phase |
|------|-----|----------------|-------|
| `tsc --noEmit` fail trên cây sạch vì `LayoutProps` (Next 16 sinh type vào `.next/types` sau build) — CI đỏ vì lý do giả | H×H | Trong job `quality` xếp `build` TRƯỚC `typecheck`; ghi lý do ngay trong YAML | 05 |
| pnpm 10 chặn postinstall của 4 package transitive | M×L | Không blanket-approve, không `shamefully-hoist`; chỉ `pnpm approve-builds <pkg>` khi có triệu chứng có tên | 01 |
| Prettier xoá blank line giữa các import group → gãy `import/order` `newlines-between: always` | M×M | Chạy `pnpm lint` NGAY sau reformat, trước khi commit; 03 chưa xanh thì không mở 04 | 03 |
| Nhánh `?code=` thành công của `/auth/callback` cần cặp PKCE thật — có thể không dựng nổi kể cả ở local | M×M | Phủ 4 nhánh khả thi trước; nhánh success timebox 45', không dựng được thì ghi gap công khai, KHÔNG fake token | 04 |
| CI xanh trong khi authenticated path không được phủ → đọc nhầm thành "đã test hết" | M×H | Header comment trong `ci.yml` + step in cảnh báo ra `$GITHUB_STEP_SUMMARY`, hiện trên trang checks của PR | 06 |
| Branch hiện tại `feat/login-google-oauth`, trigger nhắm `main` → workflow không chạy lần nào trước khi merge | H×M | Thêm `workflow_dispatch` để chạy tay trên feature branch, chứng minh xanh trước khi merge | 05 |
| pnpm 10.33.2 đang nằm ở `~/.nvm/versions/node/v24.14.1/bin` — đổi Node bằng nvm là mất khỏi PATH | M×M | `packageManager` pin + ghi bước cài pnpm vào README prerequisites | 01 |

## Key references

- Quyết định chốt: `clarifications.md` · Architecture forward-draft: `spec/system/architecture.md`
- pnpm + CI (đã verify live install/lint/typecheck/unit/build): `plans/reports/researcher-260905-1624-pnpm-and-ci.md`
- ESLint (số finding thật từ trial run): `plans/reports/researcher-260905-1624-eslint-standard.md`
- Coverage matrix + gap có tên: `plans/reports/researcher-260905-1624-test-coverage-audit.md`
