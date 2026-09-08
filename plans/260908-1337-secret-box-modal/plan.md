---
title: "Secret Box modal trên /kudos — mở hộp, nhận huy hiệu"
description: "Bật nút Mở Secret Box trên /kudos: modal 2 state, rút 1/6 huy hiệu bằng Postgres SECURITY DEFINER RPC, entitlement theo lượt tim đã GỬI."
status: pending
priority: P2
effort: 10h
branch: feat/secret-box-modal
tags: [secret-box, kudos, momorph, e2e-red-first, supabase-rpc, migration]
created: 2026-09-08
work_type: feature
spec_draft: plans/260908-1337-secret-box-modal/spec/secret-box-modal/
system_docs:
  - plans/260908-1337-secret-box-modal/spec/system/permissions.md
  - plans/260908-1337-secret-box-modal/spec/system/architecture.md
---

# Secret Box modal trên /kudos

Feature mới, chưa có F### (cấp ở promote; placeholder `F000_SecretBoxModal`). Người dùng đã đăng
nhập trên `/kudos` mở modal, bấm box để **máy chủ** rút 1 trong 6 huy hiệu và ghi lượt mở. Toàn bộ
entitlement + rút thăm + chống double-click nằm trong `open_secret_box()` (`SECURITY DEFINER`) —
`.rpc()` đầu tiên của repo.

- [`clarifications.md`](./clarifications.md) (**authoritative**) · [`evidence/study-context.json`](./evidence/study-context.json)
- Spec draft: [`spec/secret-box-modal/`](./spec/secret-box-modal/) · System: [`permissions.md`](./spec/system/permissions.md) · [`architecture.md`](./spec/system/architecture.md)
- Research: [backend](./reports/researcher-260908-1337-secret-box-backend.md) · [frontend](./reports/researcher-260908-1337-secret-box-frontend.md) · RED: [`tester-260908-1414`](./reports/tester-260908-1414-red-evidence.md)
- Test contract: `tests/e2e/secret-box.spec.ts` (S01–S13, S15) — **assertion KHÔNG được sửa**
- MoMorph: `J3-4YFIpMM` (`1466:7676`)

## Phases

| # | Phase | Status | Effort | Depends on |
|---|---|---|---|---|
| 01 | [Sửa hướng seed của RED fixture](./phase-01-fix-red-fixture-entitlement-direction.md) | pending | 30m | — |
| 02 | [Migration 0011 — bảng + RLS + RPC](./phase-02-migration-0011-secret-box-openings-and-rpc.md) | pending | 1.5h | — |
| 03 | [Track A — dialog trình bày + hook + asset](./phase-03-secret-box-dialog-presentational.md) | pending | 3h | — |
| 04 | [Track B — DAL + server action](./phase-04-secret-box-dal-and-server-action.md) | pending | 2h | 02 |
| 05 | [Tích hợp — launcher, số thật, copy](./phase-05-integrate-launcher-counts-and-copy.md) | pending | 2h | 01, 03, 04 |
| 06 | [Cổng kiểm chứng + đồng bộ docs](./phase-06-verification-and-docs-sync.md) | pending | 1h | 05 |

**Wave 1 (song song):** 01 ∥ 02 ∥ 03 · **Wave 2:** 04 (sau 02, vẫn ∥ 03) · **Wave 3:** 05 · **Wave 4:** 06

File ownership disjoint — 01 `tests/e2e/secret-box.spec.ts` · 02 `supabase/migrations/0011_*` ·
03 `_components/secret-box-dialog.*`, `_hooks/use-secret-box-dialog.*`, `_utils/secret-box-badge-asset.*`,
2 asset `public/standards/` · 04 `src/dal/secret-box*`, `src/dal/kudos-stats*`, `_actions/open-secret-box.*` ·
05 `page.tsx`, `kudos-stat-list.*`, `secret-box-launcher.tsx`, `_shared/build-kudos-copy.ts`,
`messages/*.json`, `tests/e2e/kudos.spec.ts:745-747`.
**`page.tsx` + `kudos-stat-list.tsx` chỉ thuộc phase 05** — Track A/B không chạm.

## Test policy — `e2e-red-first`

- `redCommand` `pnpm run test:e2e tests/e2e/secret-box.spec.ts` · `redExitCode` `1` — 12 failed (S01–S12) / 2 passed (S13, S15)
- `redFailure` S01 `expect(kudos-open-gift).toBeEnabled()` → nhận `disabled` (`page.tsx:146-147` cứng `0`)
- **S13 + S15 xanh hôm nay và phải xanh ở MỌI biên phase.** Không phase nào được làm yếu / skip /
  viết lại assertion để lấy xanh. Sửa duy nhất ngoài fixture: `tests/e2e/kudos.spec.ts:745-747` (phase 05).
- Ngoài scope tuyệt đối: `/profile` (nút giữ `disabled`), `tests/e2e/profile.spec.ts` C6/C7.
- CI chỉ chạy S15 (`--grep-invert "@auth|@local-db"`) → suite đầy đủ **phải verify local** với
  `saa-app` chạy. CI xanh KHÔNG chứng minh feature này đúng.
- Migration: `supabase start` từ repo root, áp bằng `supabase migration up` — **TUYỆT ĐỐI không `supabase db reset`** (xoá dữ liệu local của user).

## Decisions (chốt lúc lập blueprint)

- **D-P01 · RED fixture seed sai chiều → phase 01 sửa.** `beforeEach` seed `sender_id = senderId`,
  `receiver_id = viewer`, nhưng BR-002 tính `sum(heart_count WHERE sender_id = viewer)`
  (`src/dal/kudos-stats.ts:19-25`) → entitlement = 0 → **S01–S12 không bao giờ xanh dù implement đúng**.
  Phase 01 lật đúng 2 tham số `seedHeartCount`, **không chạm assertion nào**.
- **D-P02 · KHÔNG promote `SECRET_BOX_BADGES` lên `src/app/_shared`** (trái technical-spec § 5.2,
  giả định đó tự ghi "chưa xác nhận bằng code thật"). Reveal chỉ cần `src` + 64×64, không cần caption →
  util thuần trong `_utils/` DRY hơn, blast radius 0 (không chạm `/standards` + `standards.spec.ts` C5 chạy trong CI).
- **D-P03 · Không thêm prop mới xuyên `kudos-client.tsx` (198 dòng) / `kudos-screen.tsx` (188 dòng)** —
  vượt trần 200. Copy đi trong `KudosStatListCopy`, số đếm trong `stats`, action được launcher `import` trực tiếp từ module `"use server"`.
- **D-P04 · `openSecretBoxAction` KHÔNG `revalidatePath("/kudos")`** — revalidate remount launcher,
  `<dialog>` unmount giữa luồng → phá S07/S09/S10. Số đếm trong modal là client state từ `unopened` của RPC.

## Open Questions (mang từ clarifications.md, chưa giải)

1. Hai tiêu đề là `INFERRED`. Khách chốt chỉ MỘT tiêu đề thì chọn chuỗi nào — sửa 1 hằng số trong `messages/*.json`.
2. Nút `/profile` vẫn `disabled`. Dựng stats pipeline cho profile (kéo theo viết lại C6/C7) hay bỏ nút khỏi design?
3. Huy hiệu nhận được chưa phản chiếu vào `BadgeCollection` của `/profile` (6 slot tĩnh) — `0011` đã đủ dữ liệu, ngoài scope PR này.
