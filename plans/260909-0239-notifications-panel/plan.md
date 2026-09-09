---
title: "F012 — Notifications panel (Tất cả thông báo)"
description: "Bảng notifications + RLS + 2 emitter trigger, panel neo vào chuông header, badge số realtime, message dựng client từ template i18n."
status: pending
priority: P1
effort: 16.5h
branch: feat/notifications-panel
tags: [notifications, supabase, rls, realtime, i18n, e2e-red-first]
created: 2026-09-09
work_type: feature
testPolicy: e2e-red-first
evidence: plans/260909-0239-notifications-panel/evidence/
---

# F012 — Notifications panel

Nguồn: [clarifications.md](clarifications.md) (authoritative) ·
[functional-spec.md](spec/F012_NotificationsPanel/functional-spec.md) ·
[technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) ·
[permissions.md](spec/system/permissions.md) ·
[study](reports/researcher-260909-0244-study.md).

`e2e-red-first`: **phase 01 là RED**, không phase nào được code trước khi có RED thật.
Nhánh mới cắt từ `origin/main` (hiện đang đứng trên `feat/admin-route-guard` — không dùng lại).
Một commit mỗi phase.

## Phases

| # | Phase | File | Status | Song song với | FR / TC |
|---|---|---|---|---|---|
| 1 | E2E RED screen-level | [phase-01-e2e-red-notifications.md](phase-01-e2e-red-notifications.md) | pending | — | toàn bộ TC-001..021 trừ 014 |
| 2 | Migration `0012` — bảng, RLS, realtime | [phase-02-migration-notifications-table.md](phase-02-migration-notifications-table.md) | pending | — | FR-601/602/603 · TC-001/002 |
| 3 | Migration `0013` — 2 emitter trigger | [phase-03-migration-emitter-triggers.md](phase-03-migration-emitter-triggers.md) | pending | 4, 6 | FR-401..405 · TC-010..013, 021 |
| 4 | domain + DAL + server action | [phase-04-domain-dal-actions.md](phase-04-domain-dal-actions.md) | pending | 3, 6 | FR-101..103, 201..204, 501 |
| 5 | browser api + realtime + hook | [phase-05-browser-api-and-hook.md](phase-05-browser-api-and-hook.md) | pending | — | FR-007, 301 · TC-019 |
| 6 | i18n `notifications.*` | [phase-06-i18n-notifications-namespace.md](phase-06-i18n-notifications-namespace.md) | pending | 3, 4 | FR-501/502 · TC-009/015 |
| 7 | Bơm `unreadCount` + copy vào 4 điểm header | [phase-07-wire-unread-count-and-copy.md](phase-07-wire-unread-count-and-copy.md) | pending | — | FR-002 · TC-003/004/005 |
| 8 | Panel UI + badge số | [phase-08-panel-ui-and-badge.md](phase-08-panel-ui-and-badge.md) | pending | — | FR-003..006, 201/202 |
| 9 | GREEN + visual + gate | [phase-09-green-visual-and-gate.md](phase-09-green-visual-and-gate.md) | pending | — | toàn bộ |

## Dependencies

```
01 ─┬─ 02 ─┬─ 03 ─┐
    │      ├─ 04 ─┼─ 05 ─┐
    └──────┴─ 06 ─┘      ├─ 07 ─ 08 ─ 09
                         │
```
`03 ∥ 04 ∥ 06` sau khi 02 xong (ownership rời nhau: `.sql` / `src/{domain,dal,app/_actions}` /
`messages/`). `05` cần domain type của `04`. `07` cần `getUnreadCount` (04) + key i18n (06).
`08` cần hook (05) + prop contract (07).

## Hai quyết định đã chốt (không để lửng)

1. **Panel giữ `role="dialog"`, KHÔNG mở rộng `useMenuKeyboardNav`.** Chi tiết + đánh đổi:
   [phase-08](phase-08-panel-ui-and-badge.md) § Key Insights 1.
2. **`unreadCount` là field bắt buộc trên `SiteViewer`**, không phải prop riêng của `SiteHeader`.
   TypeScript thay cho layout chung. Chi tiết: [phase-07](phase-07-wire-unread-count-and-copy.md).

## Lệch có chủ ý so với technical-spec

- **Không dùng `t.rich`.** Repo không có `useTranslations` client và không có
  `NextIntlClientProvider`; message dựng ở client từ template string. Link `/standards` đi qua
  marker `<link>…</link>` + hàm thuần `splitLinkTemplate`. Lý do đầy đủ: [phase-06](phase-06-i18n-notifications-namespace.md) § Key Insights 2.
- **Migration tách 2 file** `0012` (schema/RLS/realtime) + `0013` (emitter) — để phase 03 chạy song
  song và rollback riêng từng nửa. Số `0012` vẫn đúng cho file đầu.

## Verification (mọi phase, đúng thứ tự)

```bash
pnpm lint --max-warnings 0
pnpm format:check
pnpm test:unit:coverage
pnpm build
pnpm typecheck
pnpm test:e2e tests/e2e/notifications.spec.ts
```

**KHÔNG BAO GIỜ** `supabase db reset` — `auth.users` chứa đăng nhập thật. Migration mới chỉ
`supabase migration up`.

## Rollback

Mỗi phase = 1 commit → `git revert` là đường lùi mặc định. Hai phase SQL có `down` viết tay trong
chính phase file (drop trigger → drop policy → drop publication membership → drop table). Không
phase nào xoá dữ liệu người dùng có sẵn.
