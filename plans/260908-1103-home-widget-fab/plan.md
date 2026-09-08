---
title: "Homepage Widget Button — trạng thái mở rộng (FAB)"
description: "Thay menu suy diễn của widget hành động nhanh bằng panel có design: 2 option vàng + trigger morph pill↔× đỏ."
status: complete
priority: P2
effort: 4h
branch: feat/home-widget-fab
tags: [f003, homepage, momorph, fab, revision, e2e-red-first]
created: 2026-09-08
completed: 2026-09-08
---

# Homepage Widget Button — trạng thái mở rộng (FAB)

Revision của **F003 (Homepage)**, không phải feature mới. Pill thu gọn đã đúng pixel; việc còn
lại là trạng thái **mở**: panel 2 option ("Thể lệ" → `/standards`, "Viết KUDOS" → `/kudos`)
mọc lên trên một trigger morph từ pill 106×64 thành nút tròn đỏ 56×56.

- Clarifications (**authoritative**): [`clarifications.md`](./clarifications.md)
- Study: [`reports/study-260908-1103-home-widget-fab.md`](./reports/study-260908-1103-home-widget-fab.md)
- RED evidence + locator contract: [`reports/tester-260908-1103-red-evidence.md`](./reports/tester-260908-1103-red-evidence.md)
- Spec draft: [`spec/F003_Homepage/`](./spec/F003_Homepage/)
- Test contract (**KHÔNG sửa**): `tests/e2e/home-widget-fab.spec.ts`, `tests/e2e/home.spec.ts`
- MoMorph: FAB mở rộng `Sv7DFwBw1h` (`313:9139`) · FAB thu gọn `_hphd32jN2` (`313:9137`)

## Phases

| # | Phase | Status | Effort | Depends on |
|---|---|---|---|---|
| 01 | [Promote/trích 2 icon dùng chung](./phase-01-promote-shared-icons.md) | completed | 45m | — |
| 02 | [Panel mở rộng + copy i18n (Track A)](./phase-02-expanded-fab-panel-and-copy.md) | completed | 2h | 01 |
| 03 | [Cổng kiểm chứng & chống hồi quy](./phase-03-verify-and-regression-gate.md) | completed | 45m | 02 |
| 04 | [Đối chiếu spec + bump version](./phase-04-spec-reconciliation-and-version-bump.md) | partial | 30m | 03 |

Tuần tự 01 → 02 → 03 → 04, không phase nào chạy song song. File ownership disjoint giữa 01
(`src/app/_components/icons/*`, `kudos-compose-icons.tsx`) và 02 (`(home)/**`, `messages/*`).
Track B (behavior/backend) **rỗng**: không DAL, không server action, không route, không migration.

## Test policy — `e2e-red-first`

RED đã có và đã xác thực:

- `redCommand`: `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts`
- `redExitCode`: `1` — 4 failed / 1 passed, 0 strict-mode violation
- `redFailure`: TC36 `not.toContainText("/")`; TC37 width 106 ≠ 56; TC38/TC40 không thấy `a[href="/standards"]`
- Baseline phải giữ: `home.spec.ts` 27/27, `pnpm typecheck` 0 lỗi, `pnpm test:unit` 536/536

## Ba bẫy chịu lực

Chi tiết + cách chữa nằm trong [phase 02](./phase-02-expanded-fab-panel-and-copy.md) § Key Insights.
Bỏ qua bất kỳ cái nào là test đỏ, không phải "chưa đẹp":

1. **React identity** khi morph → `registerButton` mất node → Escape không trả focus → `home.spec.ts` TC ID-35 đỏ.
2. **`buttonCount === 1` (TC37)** — locator quét mọi div tổ tiên, div gốc `home-screen.tsx` chứa cả `<button>` của `LanguageSelector` (đã đo thật: đếm ra 2).
3. **`hover:scale-105`** — `boundingBox()` tính cả transform (đã đo thật: `111.3×67.2` thay vì `106×64`) → TC37 đỏ ở assertion cuối.

## Decisions

- **Spec draft mâu thuẫn với clarifications + RED test → theo clarifications.** Spec draft
  (screen spec E22 dòng 100/188, technical spec dòng 155/159, BR-007) coi nút × là **button thứ
  hai** với `aria-label="Hủy"`. Sai: `home.spec.ts` TC ID-35 click `button[aria-label="Hành động
  nhanh"]` **lần hai lúc panel đang mở**. Một button duy nhất, label cố định; sửa spec ở phase 04
  **trước khi** promote sang `docs/`.
- **Bump patch `0.8.1 → 0.8.2`** — revision UI của feature đã implemented, không fcode mới.
- `#D4271D` dùng arbitrary value `bg-[#D4271D]`, không thêm token vào `globals.css` (tiền lệ
  `bg-[#0B0F12]` ngay trong file này). YAGNI.

## Out of scope

- `/kudos` **không** có FAB (`query_component` trên `MaZUn5xHXZ` không có instance nào).
- FAB **không** mở dialog compose F009 — "Viết KUDOS" là `<Link>` thuần tới `/kudos`.
- Không fcode mới, không migration/route/DAL/server action/persistence.
- Styling **lúc nghỉ** của pill thu gọn không đổi (ngoại lệ duy nhất: hover-transform, bẫy #3).
