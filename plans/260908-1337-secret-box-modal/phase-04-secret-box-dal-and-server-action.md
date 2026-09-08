---
feature: F000
phase: 04
title: "Track B — DAL secret-box, mở rộng kudos-stats, server action"
status: completed
priority: P1
effort: 2h
track: B
agent: implementer
depends_on: [02]
owns:
  - src/dal/secret-box.ts
  - src/dal/secret-box.test.ts
  - src/dal/secret-box-client.ts
  - src/dal/secret-box-client.test.ts
  - src/dal/kudos-stats.ts
  - src/dal/kudos-stats.test.ts
  - src/dal/kudos-stats-client.ts
  - src/app/(public)/kudos/_actions/open-secret-box.ts
  - src/app/(public)/kudos/_actions/open-secret-box.test.ts
---

# Phase 04 — Track B: DAL + server action

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

Track B, RED-first theo hợp đồng thường của `implementer`: **viết unit test đỏ trước**, rồi code
tối thiểu cho xanh. E2E `tests/e2e/secret-box.spec.ts` là **read-only**, không sửa, không skip.

## Context Links

- [`plan.md`](./plan.md) § Decisions D-P04
- [`phase-02-...md`](./phase-02-migration-0011-secret-box-openings-and-rpc.md) — hình dạng RPC thật
  đã quan sát được (đọc comment trong `0011_secret_box.sql`)
- [`reports/researcher-260908-1337-secret-box-backend.md`](./reports/researcher-260908-1337-secret-box-backend.md) § Q2, Q5
- [`spec/secret-box-modal/technical-spec.md`](./spec/secret-box-modal/technical-spec.md) § 3.1 A1/A3, § 4.4 BR-002, § 5.2, § 5.3
- Tiền lệ code: `src/dal/kudos-stats.ts` (narrow client + fail-open) · `src/dal/kudos-stats-client.ts`
  (shim chống TS2589) · `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:1,120-146`
  (`"use server"`, boundary check qua `unknown`, fail CLOSED)

## Overview

- **Priority:** P1 · **Status:** pending · **Effort:** 2h · **Depends on:** phase 02
- Ba việc: (a) `getKudosStats` trả `secretBoxOpened`/`secretBoxUnopened` thật, (b) `src/dal/secret-box.ts`
  bọc `.rpc("open_secret_box")` với boundary check, (c) `openSecretBoxAction` — server action
  `"use server"` để client component `import` trực tiếp.
- Codes: FR-001, FR-002, FR-203, FR-601, BR-002, SC-002, US001, US002.

## Key Insights

1. **`.rpc()` đầu tiên của repo, và không có generated types.** `createClient()` không mang
   generic `Database` (`toggle-kudo-heart.ts:134-138`) → mọi giá trị trả về là `any` ở tầng type.
   `pnpm typecheck` **không** bắt được sai hình dạng ở đây → runtime check qua `unknown` là
   **load-bearing**, không phải phòng xa.
2. **Hàm `RETURNS TABLE` → `.rpc()` trả một ARRAY.** Boundary check phải chấp nhận cả `[{...}]`
   và `{...}`, lấy phần tử đầu, rồi hẹp `badge_key: string` (thuộc 6 giá trị) và `unopened: number`.
   Sai hình dạng → **throw**, không trả badge đoán. Đây là câu trả lời cho technical-spec § 5.3 Q2.
3. **`getKudosStats` đã tính đúng `hearts`** = `sum(heart_count WHERE sender_id = viewer)`
   (`:88-96`). `secretBoxUnopened = floor(hearts / 5) - opened` → **không** truy vấn lại `kudos`,
   không nhân bản công thức. Chỉ thêm **một** read: `count` dòng `secret_box_openings` của viewer.
4. **`KudosStatsClient` phải nới `table` union** thành `"kudos" | "secret_box_openings"` và `column`
   union thành `"sender_id" | "receiver_id" | "user_id"`. `kudos-stats-client.ts` là shim generic
   theo type nên có thể không cần đổi dòng nào — **verify, đừng đoán**; nếu `select(columns)` bị
   ràng type literal `"heart_count"`, nới đúng chỗ đó, không dùng `as unknown as`.
5. **Fail-open của `getKudosStats` là đúng chiều ở đây.** Lỗi Supabase → `EMPTY_STATS` → `unopened
   = 0` → nút `disabled` → không mở được hộp. Đó là fail **closed** về mặt quyền, dù cơ chế là
   fail-open về mặt số liệu. Ghi comment nói rõ để reviewer không "sửa" thành throw.
6. **`openSecretBoxAction` KHÔNG `revalidatePath("/kudos")`** (D-P04). Revalidate → server tree
   render lại với count 0 → launcher remount → `<dialog>` unmount giữa luồng → S07/S09/S10 vỡ.
   Đây là điểm khác `toggleKudoHeart` (nó có revalidate); ghi comment giải thích tại sao khác.

## Requirements

- **FN (FR-002):** `getKudosStats` trả `KudosStatsSummary` có thêm `secretBoxOpened` (=
  `count(openings)`) và `secretBoxUnopened` (= `max(0, floor(hearts/5) - opened)`).
- **FN:** `openSecretBox(client)` trả `{ ok: true, badgeKey, unopened }` hoặc
  `{ ok: false, reason: "no_boxes_left" | "unauthenticated" | "unknown" }` — union tường minh,
  không throw ra client component.
- **FN (FR-601):** action không nhận tham số nào từ client. Danh tính lấy từ session server-side;
  không truyền `userId`, không truyền `badgeKey`.
- **NFN:** narrow client + shim theo pattern `kudos-stats-client.ts` (chống TS2589), **không**
  `as unknown as`.
- **NFN:** `secretBoxUnopened` không bao giờ âm (dữ liệu lệch → kẹp về 0).
- **NFN:** unit test cho cả 4 file `.ts` mới/sửa; `_actions/*.ts` và `src/dal/*.ts` nằm trong
  allowlist coverage → giữ ngưỡng.
- **NFN:** mọi file < 200 dòng. `kudos-stats.ts` đang 121 dòng; nếu vượt sau khi thêm, tách phần
  Secret Box sang `src/dal/kudos-stats-secret-box.ts` chứ **không** nén comment đang có.

## Architecture

```
── Đọc (A1, mỗi lần render /kudos) ──────────────────────────────────────────
page.tsx (phase 05)
  → getKudosStats(toKudosStatsClient(supabase), viewerId)
      ├ select heart_count from kudos where receiver_id = viewer   → received
      ├ select heart_count from kudos where sender_id  = viewer   → sent, hearts
      └ select user_id     from secret_box_openings where user_id = viewer → opened  [MỚI]
    returns { received, sent, hearts,
              secretBoxOpened: opened,
              secretBoxUnopened: max(0, floor(hearts/5) - opened) }
    lỗi bất kỳ → EMPTY_STATS (0 hết) → nút disabled

── Ghi (A3, khi bấm box) ────────────────────────────────────────────────────
SecretBoxLauncher (phase 05, client)
  → import { openSecretBoxAction } from "../_actions/open-secret-box"   ← "use server", KHÔNG prop
  → openSecretBoxAction()                       (không tham số)
      → createClient()  (session cookie)
      → openSecretBox(toSecretBoxClient(supabase))
          → supabase.rpc("open_secret_box")
          → boundary check: unknown → array? lấy [0] → badge_key: 1/6 giá trị · unopened: number
          → sai hình dạng ⇒ throw  (fail CLOSED, không badge giả)
      → map lỗi Postgres: 'no_boxes_left' → { ok:false, reason:"no_boxes_left" }
                          'unauthenticated' → { ok:false, reason:"unauthenticated" }
      → KHÔNG revalidatePath  (D-P04)
    returns { ok:true, badgeKey, unopened }
```

## Related Code Files

**Create:** `src/dal/secret-box.ts` (+ `.test.ts`), `src/dal/secret-box-client.ts` (+ `.test.ts`),
`src/app/(public)/kudos/_actions/open-secret-box.ts` (+ `.test.ts`)

**Modify:** `src/dal/kudos-stats.ts` (thêm read openings + 2 field, nới `KudosStatsClient`),
`src/dal/kudos-stats.test.ts` (stub thêm bảng thứ hai + case mới), `src/dal/kudos-stats-client.ts`
(**chỉ nếu** type buộc — verify trước)

**Read for context:** `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts`,
`src/dal/kudo-hearts.ts`, `src/dal/kudo-hearts-client.ts`, `supabase/migrations/0011_secret_box.sql`

**KHÔNG chạm:** `page.tsx`, `kudos-stat-list.tsx`, `messages/*.json`, `tests/**`,
`supabase/migrations/**`, `src/app/(public)/kudos/_components/**`

## Implementation Steps

1. Xác nhận phase 02 đã áp: `supabase migration list` thấy `0011`; `psql -c "select * from
   public.open_secret_box();"` (với vai đúng) chạy được. Đọc comment hình dạng trả về trong
   `0011_secret_box.sql`.
2. **RED trước:** viết `src/dal/kudos-stats.test.ts` case mới — stub client trả 5 tim + 0 openings
   ⇒ `secretBoxUnopened === 1`, `secretBoxOpened === 0`; 5 tim + 1 opening ⇒ `0`/`1`; 4 tim ⇒ `0`/`0`;
   lệch dữ liệu (0 tim + 2 openings) ⇒ kẹp `0`, không âm; lỗi read openings ⇒ `EMPTY_STATS`.
   Chạy → đỏ.
3. Nới `KudosStatsClient` (table + column union), thêm read thứ ba vào `Promise.all`, tính 2 field.
   Verify `kudos-stats-client.ts` có cần đổi không (`pnpm typecheck` là trọng tài). Chạy test → xanh.
4. **RED trước:** `src/dal/secret-box.test.ts` — stub `.rpc()` trả `[{badge_key:"stay-gold",
   unopened:0}]` ⇒ ok; trả `{badge_key:..., unopened:...}` (không array) ⇒ ok; trả `[]` ⇒ throw;
   `badge_key` không thuộc 6 giá trị ⇒ throw; `unopened` là string ⇒ throw; `error.message`
   `no_boxes_left` ⇒ `{ok:false,reason:"no_boxes_left"}`.
5. Code `secret-box.ts` + `secret-box-client.ts` (shim narrow, `import "server-only"` như các DAL
   khác) cho xanh.
6. **RED trước:** `open-secret-box.test.ts` — action không nhận tham số; ok-path trả badge + unopened;
   `no_boxes_left` trả union lỗi; **assert không gọi `revalidatePath`**.
7. Code `open-secret-box.ts` với `"use server"` ở dòng đầu; comment giải thích vì sao KHÔNG revalidate.
8. `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:unit:coverage`.
9. Chạy `pnpm run test:e2e tests/e2e/secret-box.spec.ts` chỉ để **chứng minh không hồi quy**: S13
   và S15 vẫn PASS (chưa nối UI nên S01–S12 vẫn đỏ — đúng như mong đợi).

## Todo List

- [ ] Xác nhận `0011` đã applied (`supabase migration list`), đọc hình dạng trả về từ comment SQL
- [ ] RED: case mới trong `kudos-stats.test.ts` (5 case) → đỏ
- [ ] Nới `KudosStatsClient` table/column union; thêm read openings; tính 2 field; kẹp không âm
- [ ] Verify `kudos-stats-client.ts` — chỉ sửa nếu type buộc, **không** `as unknown as`
- [ ] RED: `secret-box.test.ts` (6 case gồm array/non-array/rỗng/badge lạ/type sai/no_boxes_left) → đỏ
- [ ] `secret-box.ts` + `secret-box-client.ts` với `import "server-only"` → xanh
- [ ] RED: `open-secret-box.test.ts` gồm assert **không** gọi `revalidatePath` → đỏ
- [ ] `open-secret-box.ts` với `"use server"` dòng đầu, không tham số, comment lý do không revalidate
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` xanh, coverage không tụt
- [ ] `pnpm run test:e2e tests/e2e/secret-box.spec.ts` → S13 + S15 vẫn PASS
- [ ] Mọi file < 200 dòng (`wc -l`); `kudos-stats.ts` nếu vượt thì tách, không nén comment
- [ ] `git diff --name-only` không có file ngoài `owns`

## Success Criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` **exit 0**; coverage cho `src/dal/` và
  `_actions/` không tụt dưới ngưỡng hiện tại.
- `grep -n "as unknown as" src/dal/secret-box*.ts src/dal/kudos-stats*.ts` → **rỗng**.
- `grep -n "revalidatePath" src/app/\(public\)/kudos/_actions/open-secret-box.ts` → **rỗng**.
- `head -1 src/app/\(public\)/kudos/_actions/open-secret-box.ts` = `"use server";`.
- Action không có tham số: signature là `openSecretBoxAction(): Promise<OpenSecretBoxResult>`.
- Chứng cứ psql sau một lần gọi thật qua action (chạy `/kudos` tay, bấm box sau phase 05 — ở phase
  này verify bằng script gọi DAL trực tiếp hoặc psql):
  `select user_id, badge_key from public.secret_box_openings order by opened_at desc limit 1;`
  → `user_id` là viewer, `badge_key` thuộc 6 giá trị.
- **S13 + S15 vẫn PASS**; số failed của `secret-box.spec.ts` không tăng.
- `tests/**` không xuất hiện trong `git diff --name-only`.

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| `.rpc()` trả array nhưng code coi là object (hoặc ngược lại) → `undefined` lọt vào UI | **High** | High | Boundary check xử lý cả 2 hình dạng, có unit test cho từng; phase 02 ghi hình dạng thật vào comment SQL để không phải đoán |
| Không có generated types nên `pnpm typecheck` xanh dù hình dạng sai | **High** | High | Runtime check qua `unknown` + 6 unit case; fail CLOSED (throw), không trả badge mặc định |
| Nới `KudosStatsClient` làm vỡ caller khác hoặc test đang có | Med | Med | Chỉ **nới** union (mở rộng, không thu hẹp) → caller cũ vẫn hợp lệ; `kudos-stats.test.ts` được sửa trong cùng phase, nằm trong `owns` |
| Thêm `revalidatePath` "cho nhất quán với toggleKudoHeart" | Med | **High** | D-P04 + comment trong code + Success Criteria có `grep` = rỗng + unit test assert không gọi |
| `secretBoxUnopened` âm khi dữ liệu lệch (openings > entitlement, ví dụ tim bị xoá) | Med | Med | Kẹp `Math.max(0, …)` + unit case tường minh; nút disabled chứ không hiện số âm |
| Sửa `getKudosStats` từ fail-open sang throw vì thấy "không an toàn" | Med | High | Comment giải thích: `/kudos` không có auth guard, fail-open ở đây = fail-closed về quyền mở hộp; `page.tsx` không được `throw` (docstring `page.tsx:50-53`) |
| Truyền action làm prop xuyên `kudos-client.tsx` (198 dòng) → vượt trần 200 | Med | Med | D-P03: module `"use server"` được client component import trực tiếp (tiền lệ `logout.ts`, `set-locale.ts`) |
| Đụng `kudos-stats.ts` cùng lúc với phase khác | Low | High | `src/dal/kudos-stats*` thuộc **duy nhất** phase 04 trong bảng ownership |

## Security Considerations

- Action **không nhận tham số** → không có bề mặt để client bơm `userId`/`badgeKey` (FR-601,
  test case `5cc072ad`/`2e7bec78`).
- Boundary check **fail closed**: hình dạng lạ ⇒ throw, tuyệt đối không hiện badge giả (khác các
  DAL đọc bảng công khai vốn fail open).
- DAL đọc chọn cột tường minh (`select("user_id")`), **không** `SELECT *` — bảng mới nằm sau RLS
  `user_id = auth.uid()`, nhưng liệt kê cột vẫn là luật của repo.
- `import "server-only"` ở cả 2 file DAL để không lọt vào bundle client.
- Không log `badge_key`, `user_id` hay nội dung session ra console.
- Không truyền `SERVICE_ROLE_KEY` vào đường này — action dùng client theo session người dùng.

## Next Steps

- Bàn cho **phase 05**: `KudosStatsSummary` (2 field mới) + `openSecretBoxAction` +
  `OpenSecretBoxResult` union.
- Song song được với phase 01 và 03; phụ thuộc phase 02.
- **Rollback:** `git revert` phase này. `kudos-stats.ts` quay về 3 field ⇒ `page.tsx` (phase 05)
  phải revert cùng — hai phase này là **một cặp rollback**, ghi rõ trong commit message.
