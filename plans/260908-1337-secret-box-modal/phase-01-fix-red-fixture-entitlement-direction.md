---
feature: F000
phase: 01
title: "Sửa hướng seed của RED fixture (BLOCKING GATE)"
status: completed
priority: P1
effort: 30m
test_policy: e2e-red-first
depends_on: []
owns:
  - tests/e2e/secret-box.spec.ts
---

# Phase 01 — Sửa hướng seed của RED fixture (BLOCKING GATE)

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

**test_policy: e2e-red-first.** Phase này sửa **fixture**, KHÔNG sửa assertion. Sau phase này
suite vẫn phải đỏ đúng như trước (12 failed / 2 passed, exit 1) — RED được **giữ nguyên**, không
bị làm yếu.

## Context Links

- [`plan.md`](./plan.md) § Decisions D-P01
- [`clarifications.md`](./clarifications.md) § "Quyền và số liệu" — công thức entitlement
- [`reports/tester-260908-1414-red-evidence.md`](./reports/tester-260908-1414-red-evidence.md) — RED gốc
- [`spec/secret-box-modal/technical-spec.md`](./spec/secret-box-modal/technical-spec.md) § 4.4 BR-002
- Code chứng cứ: `src/dal/kudos-stats.ts:19-25` (docstring), `:88-96` (`hearts` = `sentRows.reduce`)

## Overview

- **Priority:** P1 · **Status:** pending · **Effort:** 30m · **Depends on:** —
- Lật chiều `sender_id`/`receiver_id` trong `beforeEach` của describe block "Entitled user" ở
  `tests/e2e/secret-box.spec.ts` để viewer là **người GỬI** kudo có `heart_count = 5`.
- Đây là **cổng chặn**: chưa sửa thì S01–S12 không thể xanh ở phase 05 dù code đúng 100%, và
  người implement sẽ đi tìm bug trong code không có bug.

## Key Insights — vì sao fixture hiện tại vô hiệu hoá cả suite

`beforeEach` (`tests/e2e/secret-box.spec.ts` quanh dòng 205-212) gọi:

```ts
await seedHeartCount(supabaseUrl, serviceRoleKey, senderId, viewerSession.user_id, 5);
//                                                ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^
//                                                sender_id  receiver_id
```

nghĩa là: **user khác** gửi kudo cho **viewer**, kudo đó có 5 tim.

Nhưng BR-002 (và code đã ship) tính:

```
entitlement = floor( sum(kudos.heart_count WHERE sender_id = viewer) / 5 )
```

Với fixture hiện tại `sum(... sender_id = viewer)` = **0** → `entitlement = 0` → `unopened = 0` →
nút phải `disabled` → **S01 `toBeEnabled()` đỏ mãi mãi**, S02–S12 chết theo vì `click()` trên nút
disabled.

Hôm nay S01 đỏ vì `page.tsx:146-147` hardcode `0`, nên lỗi *trông* đúng — nhưng sau phase 05 nó sẽ
vẫn đỏ với **lý do khác**, và không ai được phép chữa bằng cách implement entitlement theo
`receiver_id` (trái BR-002, trái `kudos-stats.ts`, trái copy `messages/vi.json:145`).

## Requirements

- **FN:** viewer của describe block "Entitled user (unopened > 0)" phải có `unopened === 1` thật
  trong DB sau `beforeEach` (BR-002, FR-001).
- **NFN:** zero thay đổi trong bất kỳ dòng `expect(...)` nào của file. Zero thay đổi ở 2 describe
  block còn lại (S13 seed 0 tim — đúng rồi; S15 anonymous — không seed).
- **NFN:** giữ nguyên tag `@auth @local-db` và cơ chế cleanup `afterEach`.

## Architecture

Chỉ đảo thứ tự 2 argument tại **một** call site, cộng sửa comment cho khớp:

```
seedHeartCount(url, key, senderId=viewer.user_id, receiverId=otherUserId, 5)
  → INSERT kudos(sender_id=viewer, receiver_id=other, heart_count=5)
  → getKudosStats(viewer).hearts = 5
  → entitlement = floor(5/5) = 1 ; openings = 0 → unopened = 1
```

Biến `senderId` trong describe block đang giữ id của user phụ — sau khi lật, nó là **receiver**.
Đổi tên biến thành `counterpartId` để tên không nói dối (biến local, không ai import).

## Related Code Files

**Modify:** `tests/e2e/secret-box.spec.ts` — chỉ `beforeEach` của describe #1 (khoảng dòng 165-215):
call site `seedHeartCount`, tên biến `senderId` → `counterpartId`, comment `// Seed: sender sends 5
hearts to viewer` → mô tả đúng chiều, và docstring § "Seeding strategy" (khoảng dòng 44-49).

**Create / Delete:** không có.

**KHÔNG chạm:** mọi dòng `test(...)`, mọi `expect(...)`, `tests/e2e/kudos.spec.ts`,
`tests/e2e/profile.spec.ts`, bất kỳ file nào trong `src/`.

## Implementation Steps

1. `supabase start` từ repo root (không `db reset`). Xác nhận instance sống:
   `psql "$DATABASE_URL" -c "select count(*) from public.kudos;"`
2. Chạy baseline để có số đối chiếu: `pnpm run test:e2e tests/e2e/secret-box.spec.ts`
   → ghi lại exit code + số failed/passed.
3. Trong `beforeEach` của describe #1: đổi `senderId` → `counterpartId` (khai báo + gán), và lật
   call: `seedHeartCount(supabaseUrl, serviceRoleKey, viewerSession.user_id, counterpartId, 5)`.
4. Sửa comment tại chỗ + docstring § "Seeding strategy" để nói đúng: *viewer GỬI 1 kudo có 5 tim →
   entitlement `floor(5/5) = 1`; tim cộng cho NGƯỜI GỬI (BR-002, `kudos-stats.ts:19-25`)*.
5. `pnpm lint` + `pnpm typecheck`.
6. Chạy lại suite. Kiểm chứng bằng DB rằng seed đã đúng chiều (xem Success Criteria).

## Todo List

- [ ] `supabase start` từ repo root, instance sống (không `db reset`)
- [ ] Ghi baseline exit code / failed / passed
- [ ] Lật 2 argument `seedHeartCount` tại 1 call site
- [ ] `senderId` → `counterpartId` (khai báo + gán + mọi tham chiếu trong describe #1)
- [ ] Sửa comment tại chỗ + docstring § Seeding strategy
- [ ] `pnpm lint && pnpm typecheck` xanh
- [ ] Suite vẫn exit 1, 12 failed / 2 passed; S13 + S15 vẫn PASS
- [ ] `git diff --stat` chỉ đúng 1 file, không dòng `expect(` nào bị đổi

## Success Criteria

- `git diff tests/e2e/secret-box.spec.ts | grep -c "^[-+].*expect("` = **0**.
- `git diff --name-only` trả về đúng `tests/e2e/secret-box.spec.ts`.
- `pnpm run test:e2e tests/e2e/secret-box.spec.ts` → exit `1`, **12 failed / 2 passed**; S13 và S15
  nằm trong 2 passed. Lý do S01 đỏ vẫn là `toBeEnabled()` nhận `disabled`.
- Chứng cứ DB sau một lần chạy (thay `<viewer>` bằng id in ra từ test hoặc query theo email
  `viewer-%@secret-box-e2e.dev`):
  ```sql
  select u.id, sum(k.heart_count) as hearts_as_sender
  from auth.users u left join public.kudos k on k.sender_id = u.id
  where u.email like 'viewer-%@secret-box-e2e.dev' group by u.id;
  ```
  → `hearts_as_sender = 5` cho viewer (trước phase này là `0`/NULL).

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| Bị hiểu là "sửa test để lấy xanh" | High | High | Phase này **không** làm test xanh — suite vẫn 12 đỏ. Success Criteria buộc `grep -c "expect("` = 0 trong diff. Ghi rõ trong commit message: `test(e2e): fix secret-box seed direction to match BR-002` |
| Người implement bỏ qua phase này, rồi implement entitlement theo `receiver_id` để "chữa" S01 | Med | High | phase 05 § Risk lặp lại cảnh báo; phase 04 Success Criteria có psql assert `sender_id` |
| `afterEach` chỉ xoá viewer, `counterpartId` tích tụ rác trong `auth.users` | High | Low | Đã là hành vi có trước (comment `sender cleanup optional`); ~196 dòng rác e2e đã tồn tại. Không mở rộng scope ở phase này |
| Kudo mới (viewer là sender) xuất hiện trên board `/kudos` và làm lệch test khác | Low | Med | `kudos.spec.ts` không assert tổng số card cứng ở describe liên quan; verify bằng bước chạy `tests/e2e/kudos.spec.ts` tại phase 06 |

## Security Considerations

- `SERVICE_ROLE_KEY` chỉ đọc từ env trong test runner, không hardcode, không log. Phase này không
  thêm chỗ dùng mới.
- Seed vẫn đi qua `auth.users` (signup thật) → trigger `handle_new_user` tạo `public.users`; không
  INSERT trực tiếp `public.users` (FK sẽ vỡ).
- Không nới RLS nào để seed chạy được — service role vốn bypass RLS.

## Next Steps

- Mở đường cho **phase 05** (tích hợp) đo được S01–S12 thật.
- Song song được với phase 02 và 03 (ownership rời nhau hoàn toàn).
- Rollback: `git checkout -- tests/e2e/secret-box.spec.ts` (1 file, không migration, không state).
