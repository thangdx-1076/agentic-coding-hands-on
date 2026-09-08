---
feature: F000
phase: 02
title: "Migration 0011 — bảng secret_box_openings + RLS + open_secret_box RPC"
status: pending
priority: P1
effort: 1.5h
track: B
depends_on: []
owns:
  - supabase/migrations/0011_secret_box.sql
---

# Phase 02 — Migration 0011: bảng + RLS + `open_secret_box()` RPC

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

Track B, RED-first. Phase này không có e2e riêng — nó được chứng minh bằng **psql**, và được e2e
phủ ở phase 05 (S07/S08/S10). Không viết test nào vào `tests/e2e/`.

## Context Links

- [`plan.md`](./plan.md) · [`clarifications.md`](./clarifications.md) § "Kỹ thuật — nơi đặt tính ngẫu nhiên"
- [`reports/researcher-260908-1337-secret-box-backend.md`](./reports/researcher-260908-1337-secret-box-backend.md) § Q3, Q4 — SQL sketch đã review
- [`spec/secret-box-modal/technical-spec.md`](./spec/secret-box-modal/technical-spec.md) § 3.1 A3, § 4.2, § 4.4 A0/BR-002/BR-003, § 4.5 ALG-001
- [`spec/system/permissions.md`](./spec/system/permissions.md) — delta quyền của feature này
- Tiền lệ trong repo: `supabase/migrations/0007_kudo_hearts.sql:99-119` (`SECURITY DEFINER` +
  `SET search_path`), `0002_handle_new_user_trigger.sql`, `0006_kudos.sql:20-29` (schema `kudos`)

## Overview

- **Priority:** P1 · **Status:** pending · **Effort:** 1.5h · **Depends on:** —
- Một file migration duy nhất: bảng log `secret_box_openings`, RLS, và hàm
  `open_secret_box()` (`SECURITY DEFINER`, `SET search_path`) chứa advisory lock + kiểm lại
  entitlement trong transaction + rút thăm có trọng số.
- Codes: FR-203, FR-601, BR-001, BR-002, BR-003, ALG-001, DISC-001, SC-002, SC-003, US002.

## Key Insights

1. **Bảng log, không cột counter** (clarifications § "Lưu gì"). `opened = count(*)` không bao giờ
   lệch; một cột counter phải đồng bộ với trigger `sync_kudo_heart_count` của `0007` → trigger-trên-trigger,
   đúng thứ tác giả `0007` đã tránh. Bảng này cũng chính là nguồn `BadgeCollection` cần sau (D003).
2. **Rút thăm KHÔNG được nằm ở server action.** Test case `5cc072ad`/`2e7bec78` đòi sửa client phải
   bị bỏ qua → logic rút thăm phải ở nơi client không chạm tới được. Đây là `.rpc()` đầu tiên của
   repo (`grep -rn "\.rpc(" src` → rỗng), nhưng `SECURITY DEFINER` là pattern đã có.
3. **`pg_advisory_xact_lock` theo user, không `SELECT ... FOR UPDATE`.** Trước lần mở đầu tiên
   không có dòng nào để lock. Advisory xact lock tự nhả khi commit/rollback; request thua chờ tới
   khi request thắng commit, đọc lại `count(*)` đã tăng, rồi tự `RAISE 'no_boxes_left'` — client
   không phải retry.
4. **`badge_key` để kebab-case, khớp stem asset đã ship** (`public/standards/badge-stay-gold.png`, …).
   Slug camelCase (`stayGold`) chỉ tồn tại ở tầng copy `messages/*.json`; mapping nằm ở phase 03.
   Không tạo hệ đặt tên thứ hai trong DB.
5. **`REVOKE` trước `GRANT`**, và không `GRANT INSERT` cho `authenticated`: chỉ hàm
   `SECURITY DEFINER` được ghi. `anon` không có `EXECUTE`.

## Requirements

- **FN:** `open_secret_box()` trả `(badge_key text, unopened int)`; ghi đúng 1 dòng mỗi lần thành công.
- **FN:** `auth.uid()` NULL → `RAISE EXCEPTION 'unauthenticated'` (FR-601).
- **FN:** `opened >= entitlement` → `RAISE EXCEPTION 'no_boxes_left'`, không ghi gì (BR-002).
- **FN:** phân phối 30/25/20/10/10/5 theo ngưỡng tích luỹ, mỗi lần rút độc lập, **cho trùng** (BR-001).
- **NFN:** idempotent DDL (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`)
  để migration chạy lại được mà không cần reset.
- **NFN:** `SET search_path = public, pg_temp` trên hàm (chống privilege escalation, như `0002`/`0007`).

## Architecture

```
client → openSecretBoxAction (phase 04) → supabase.rpc("open_secret_box")
                                             │  (không tham số — hàm tự đọc auth.uid())
                                             ▼
   BEGIN
     auth.uid() null? → RAISE 'unauthenticated' (28000)
     pg_advisory_xact_lock(hashtextextended(uid::text, 0))     ← serialize theo user
     entitlement := floor(coalesce(sum(k.heart_count),0)/5)     from kudos WHERE sender_id = uid
     opened      := count(*)                                    from secret_box_openings WHERE user_id = uid
     opened >= entitlement? → RAISE 'no_boxes_left' (P0001)      ← recheck TRONG transaction
     badge := weighted_pick(random()*100)                        ← ALG-001
     INSERT secret_box_openings(user_id, badge_key)
     RETURN (badge, entitlement - opened - 1)
   COMMIT                                                        ← lock tự nhả
```

Bảng (ERD ở technical-spec § 4.2): `id uuid PK`, `user_id uuid NOT NULL REFERENCES public.users(id)
ON DELETE CASCADE`, `badge_key text NOT NULL CHECK (IN 6 giá trị)`, `opened_at timestamptz NOT NULL
DEFAULT now()`, index trên `user_id`.

RLS: `ENABLE` + `FORCE ROW LEVEL SECURITY`; `REVOKE ALL FROM anon, PUBLIC, authenticated`; policy
`FOR SELECT TO authenticated USING (user_id = auth.uid())`; `GRANT SELECT TO authenticated`;
**không** `GRANT INSERT/UPDATE/DELETE` cho ai.

## Related Code Files

**Create:** `supabase/migrations/0011_secret_box.sql`

**Read for context:** `supabase/migrations/0007_kudo_hearts.sql` (comment header, thứ tự
REVOKE/GRANT, `SET search_path`), `0006_kudos.sql:20-29`, `0002_handle_new_user_trigger.sql`

**Modify / Delete:** không có. **KHÔNG chạm** `0007` (trigger `sync_kudo_heart_count` là chủ duy
nhất của `kudos.heart_count`).

## Implementation Steps

1. `supabase start` từ repo root. **KHÔNG `supabase db reset`** — sẽ xoá dữ liệu local của user.
2. Viết `0011_secret_box.sql` theo shape của `0007`: comment header giải thích *tại sao* log-table
   thay vì counter và *tại sao* advisory lock, rồi DDL bảng → index → RLS → policy → GRANT → hàm →
   GRANT/REVOKE EXECUTE.
3. Hàm: `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp`, `RETURNS TABLE
   (badge_key text, unopened int)`. Dùng `hashtextextended(v_user_id::text, 0)` cho advisory key.
4. Áp migration **không reset**: `supabase migration up` từ repo root. Nếu CLI đã pin không có
   subcommand đó, fallback: chạy file qua `psql "$DATABASE_URL" -f supabase/migrations/0011_secret_box.sql`.
   Xác nhận `supabase migration list` thấy `0011` applied.
5. Chứng minh bằng psql (xem Success Criteria) — gồm cả test đua 2 session.
6. Chạy lại migration lần thứ hai để chứng minh idempotent (không lỗi, không thêm dòng).

## Todo List

- [ ] `supabase start` (repo root), không `db reset`
- [ ] Viết `0011_secret_box.sql` — bảng + index + RLS + policy + GRANT
- [ ] Hàm `open_secret_box()` với `SECURITY DEFINER` + `SET search_path = public, pg_temp`
- [ ] `pg_advisory_xact_lock` + recheck entitlement trong cùng transaction
- [ ] Ngưỡng 30/55/75/85/95 (ALG-001) + `CHECK` 6 giá trị kebab
- [ ] `REVOKE ALL` trước `GRANT`; không `GRANT INSERT` cho `authenticated`
- [ ] `REVOKE EXECUTE ... FROM anon, PUBLIC` + `GRANT EXECUTE ... TO authenticated`
- [ ] Áp bằng `supabase migration up` (KHÔNG reset), `migration list` thấy applied
- [ ] psql: unauthenticated · no_boxes_left · happy path · phân phối · đua 2 session
- [ ] Chạy lại migration → idempotent
- [ ] `pnpm typecheck && pnpm lint` (không đổi TS, chỉ để chắc tree sạch)

## Success Criteria

Tất cả chạy bằng `psql "$DATABASE_URL"` trên instance local:

1. **Guard chưa đăng nhập (FR-601):** `select * from public.open_secret_box();` với role không có
   `auth.uid()` → lỗi `unauthenticated`, `secret_box_openings` không thêm dòng.
2. **Hết hộp (BR-002):** user 0 tim → `no_boxes_left`, 0 dòng ghi.
3. **Happy path (FR-203):** user có `sum(heart_count where sender_id=u)=5` → trả `unopened = 0`,
   `badge_key` thuộc 6 giá trị, đúng 1 dòng mới. Gọi lần 2 → `no_boxes_left`.
4. **Phân phối (BR-001, ALG-001):** user có 1000 tim (`entitlement = 200`), gọi 200 lần trong loop
   → `select badge_key, count(*) from secret_box_openings where user_id=u group by 1` phủ đủ 6
   giá trị và không giá trị nào lệch quá ±10 điểm phần trăm so với 30/25/20/10/10/5.
5. **Đua (BR-003, SC-003):** user có đúng 1 hộp; 2 session psql song song, session A `BEGIN;` gọi
   hàm (chưa commit), session B gọi hàm → B **block**; A `COMMIT` → B trả `no_boxes_left`. Kết quả:
   `count(*) = 1`. Lặp lại bằng 2 lệnh chạy đồng thời không có `BEGIN` cũng cho `count(*) = 1`.
6. **RLS (permissions delta):** với role `authenticated` mạo danh user X,
   `select * from public.secret_box_openings` chỉ trả dòng của X; `insert into
   public.secret_box_openings ...` → **permission denied**.
7. **`anon` không gọi được:** `set role anon; select * from public.open_secret_box();` → permission denied.
8. **Idempotent:** chạy lại file migration → không lỗi, `count(*)` không đổi.
9. `git diff --name-only` chỉ có `supabase/migrations/0011_secret_box.sql`.

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| Ai đó chạy `supabase db reset` để áp migration → xoá dữ liệu local của user | Med | **Critical** | Ghi cấm ở cả plan.md, Implementation Steps, Todo. Dùng `supabase migration up`; fallback `psql -f`. Không có bước nào trong phase này cần reset |
| `random()` trong plpgsql tưởng là crypto-random | Low | Low | Không phải yêu cầu bảo mật — chỉ cần phân phối đúng (BR-001). Ghi comment trong SQL để reviewer không "sửa" thành `gen_random_bytes` |
| `hashtextextended` không tồn tại trên phiên bản Postgres của instance local | Low | High | Verify ngay bước 3: `select hashtextextended('x',0);`. Fallback `hashtext(uuid::text)::bigint` (có từ Postgres 8.x) |
| `FORCE ROW LEVEL SECURITY` khiến chính hàm `SECURITY DEFINER` bị RLS chặn khi INSERT | Med | High | Owner của hàm là chủ bảng; `FORCE` áp cho **table owner** → phải hoặc bỏ `FORCE`, hoặc thêm policy `FOR INSERT` cho owner. **Verify bằng Success Criteria #3 trước khi coi phase xong** — nếu #3 fail vì RLS, chọn bỏ `FORCE` và ghi lý do vào comment SQL |
| `ON DELETE CASCADE` khiến `afterEach` xoá viewer làm mất dòng openings → test sau đọc lệch | Low | Low | Mong muốn: mỗi test tạo user mới; cascade là hành vi đúng |
| Hàm trả `TABLE` → `.rpc()` trả **array**, không phải object | Med | High | Ghi rõ trong phase 04: boundary check phải xử lý cả `[{...}]` và `{...}`. Là nguồn của technical-spec § 5.3 Q2 — phase này ghi lại hình dạng thật quan sát được vào comment SQL |

## Security Considerations

- `SECURITY DEFINER` + `SET search_path = public, pg_temp` — thiếu `search_path` là lỗ leo thang
  quyền kinh điển; cả `0002` và `0007` đều có, giữ nguyên.
- Hàm **không nhận tham số** → client không thể truyền `user_id` hay `badge_key`; danh tính đến từ
  `auth.uid()` (FR-601, SC-003).
- `REVOKE` đứng trước `GRANT`; `anon`/`PUBLIC` không có `EXECUTE` và không có quyền nào trên bảng.
  Bảng mới **anon-readable cho tới khi bị REVOKE** — thứ tự này là load-bearing.
- Không `GRANT INSERT` cho `authenticated`: đường ghi duy nhất là hàm.
- Policy `SELECT` liệt kê điều kiện `user_id = auth.uid()`; DAL ở phase 04 chọn cột tường minh,
  không `SELECT *`.

## Next Steps

- Mở đường cho **phase 04** (DAL + server action). Song song được với 01 và 03.
- **Rollback:** `DROP FUNCTION IF EXISTS public.open_secret_box(); DROP TABLE IF EXISTS
  public.secret_box_openings;` rồi xoá file migration + dòng tương ứng trong
  `supabase_migrations.schema_migrations`. Không cần reset. Không có bảng nào khác phụ thuộc.
