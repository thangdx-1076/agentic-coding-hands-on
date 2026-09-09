---
title: "Phase 2 — Migration 0012: bảng notifications, RLS, realtime publication"
feature: F012
status: completed
priority: P1
effort: 1.5h
owner: implementer
result: schema + 3 index + RLS + GRANT theo cột + publication; verified RLS=forced, anon=0 quyền, auth=SELECT+UPDATE(is_read)
---

# Phase 2 — Migration `0012`

## Context Links

- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 1, § 2
- [permissions.md](spec/system/permissions.md) — trục phân quyền `ownership` đầu tiên của dự án
- Mẫu: `supabase/migrations/0007_kudo_hearts.sql:39-62`, `0011_secret_box.sql:85-104`
- [study](reports/researcher-260909-0244-study.md) § 6

## Overview

**Priority** P1 · **Status** pending · Depends on: phase 01 (RED đã ghi). Chặn 03, 04, 06.

Tạo `public.notifications` + index + unique bộ phận dedupe + RLS + REVOKE/GRANT + đưa bảng vào
publication `supabase_realtime`. **Không** trigger ở phase này (phase 03).

## Key Insights

1. **Bảng mới trong schema `public` của instance này mặc định cấp quyền rộng.** REVOKE ALL từ cả
   ba role `anon, PUBLIC, authenticated` **ngay sau `CREATE TABLE`**, trước khi GRANT lại có chọn
   lọc (`0007:59-62`, `0011:91-95`). Bỏ bước này = bảng thông báo đọc được bởi `anon`.
2. **Không có INSERT policy cho người dùng.** Người nhận không bao giờ là người ghi. Ghi đi qua
   `SECURITY DEFINER` ở phase 03.
3. **UPDATE policy chỉ được đổi `is_read`.** `USING (user_id = auth.uid())` +
   `WITH CHECK (user_id = auth.uid())` giữ quyền sở hữu; ràng buộc "chỉ cột `is_read`" thực thi
   bằng **GRANT UPDATE (is_read) ON public.notifications TO authenticated** — cấp quyền theo cột,
   không phải bằng policy (policy không lọc được cột).
4. **Dedupe `heart_received` phải ở DB**, unique index bộ phận trên
   `(user_id, type, (payload->>'kudosId'), (payload->>'actorId')) WHERE type = 'heart_received'`.
   Bỏ tim rồi thả lại là hai transaction khác nhau — chỉ ràng buộc DB mới đúng dưới đồng thời.
5. **`ALTER PUBLICATION supabase_realtime ADD TABLE` không idempotent** — bọc trong `DO $$ ... IF
   NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE ...) THEN ... END $$;` để chạy lại không
   nổ.
6. **Realtime tôn trọng RLS nhưng phải kiểm bằng test** (TC-002) — phase 09 là nơi chứng minh, kèm
   `REPLICA IDENTITY` đủ cho filter theo `user_id` (mặc định `DEFAULT` là đủ cho INSERT payload).

## Requirements

FR-601 (mọi lời gọi cần session) · FR-602 (RLS own-row, kể cả realtime) · FR-603 (không phân biệt
"của người khác" với "không tồn tại" — hệ quả tự nhiên của SELECT/UPDATE bị RLS lọc, không cần code).

## Architecture

```
public.users(id) ──1:N──▶ public.notifications(user_id)   ON DELETE CASCADE
  id uuid PK · type text CHECK(4 giá trị) · payload jsonb · is_read bool · created_at timestamptz
index: (user_id, created_at DESC, id DESC)          ← keyset
index: (user_id) WHERE is_read = false              ← đếm chưa đọc
unique index bộ phận                                 ← dedupe heart_received
RLS: select_own · update_own_read        GRANT: SELECT, UPDATE(is_read) → authenticated
publication supabase_realtime ⊇ notifications
```

## Related Code Files

**Tạo**: `supabase/migrations/0012_notifications.sql`
**Đọc**: `supabase/migrations/0007_kudo_hearts.sql`, `0011_secret_box.sql`
**KHÔNG chạm**: `src/**`, `tests/**`, `messages/**`

## File ownership

```
supabase/migrations/0012_notifications.sql
```

## Implementation Steps

1. `CREATE TABLE public.notifications` đúng 6 cột trong technical-spec § 1, `type` có
   `CHECK (type IN ('kudos_received','heart_received','secret_box_available','kudos_hidden'))`.
2. `REVOKE ALL ON public.notifications FROM anon, PUBLIC, authenticated;`
3. `ENABLE ROW LEVEL SECURITY` **và** `FORCE ROW LEVEL SECURITY` (cả hai dòng).
4. `DROP POLICY IF EXISTS` rồi `CREATE POLICY notifications_select_own` /
   `notifications_update_own_read` — đặt tên theo `<table>_<action>_<scope>`.
5. `GRANT SELECT ON public.notifications TO authenticated;` +
   `GRANT UPDATE (is_read) ON public.notifications TO authenticated;` — không GRANT INSERT/DELETE.
6. 2 index + 1 unique index bộ phận.
7. Thêm bảng vào publication (bọc `IF NOT EXISTS`).
8. `COMMENT ON TABLE/COLUMN` giải thích **lý do**, không mô tả suông — đặc biệt: vì sao không có
   INSERT policy, vì sao unique index bộ phận thay cho `ON CONFLICT` ở app.
9. `supabase migration up` (**không** `db reset`), rồi `psql` xác minh bằng các truy vấn ở
   Success Criteria.

## Todo List

- [x] table + CHECK + FK cascade
- [x] REVOKE trước GRANT, đủ 3 role
- [x] RLS enable + force + 2 policy
- [x] GRANT theo cột cho `is_read`
- [x] 3 index (2 thường + 1 unique bộ phận)
- [x] publication idempotent
- [x] COMMENT ON đủ table + mọi cột
- [x] `migration up` chạy sạch

## Success Criteria

Kiểm bằng `psql`, không bằng cảm giác:

- `\d+ public.notifications` liệt kê đủ 3 index và constraint CHECK.
- `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='notifications';` → `t,t`.
- `SELECT polname FROM pg_policy WHERE polrelid='public.notifications'::regclass;` → đúng 2 dòng,
  không dòng nào cho INSERT/DELETE.
- `SELECT has_table_privilege('anon','public.notifications','SELECT');` → `f`.
- `SELECT has_column_privilege('authenticated','public.notifications','payload','UPDATE');` → `f`;
  `...,'is_read','UPDATE'` → `t`.
- `SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications';` → 1 dòng.
- Chạy lại `pnpm test:e2e tests/e2e/notifications.spec.ts`: các test seed **đổi lý do đỏ** từ
  `relation "notifications" does not exist` sang assertion của màn. Đây là acceptance criteria,
  không phải tuỳ chọn.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Quên REVOKE → `anon` đọc được thông báo người khác | Trung | **Nghiêm trọng** | criteria `has_table_privilege('anon',…)='f'` là gate |
| `db reset` xoá `auth.users` thật | Thấp | **Không hồi phục** | chỉ `migration up`; ghi cảnh báo ngay dòng đầu file SQL |
| Unique bộ phận sai biểu thức jsonb (`->` vs `->>`) | Trung | Cao | test đồng thời ở phase 03 (thả/bỏ/thả) |
| Publication thêm hai lần khi rerun | Trung | Thấp | bọc `IF NOT EXISTS` |

## Security Considerations

Đây là lần đầu ranh giới quyền của dự án nằm trong Postgres (permissions.md). Không mở `DELETE`,
không mở đường admin đọc thông báo người khác — chưa ai đặt hàng.

## Rollback

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
DROP TABLE public.notifications;  -- policy + index đi theo
```
Không dữ liệu nào ngoài bảng này bị ảnh hưởng.

## Next Steps

03 (emitter) ∥ 04 (DAL) ∥ 06 (i18n) mở khoá đồng thời sau phase này.
