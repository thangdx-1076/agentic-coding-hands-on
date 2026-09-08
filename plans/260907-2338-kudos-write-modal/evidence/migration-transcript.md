# Migration transcript — `0009_kudos_write_anonymity.sql` + `0010_kudo_images_bucket.sql`

Ngày chạy: 2026-09-08. Instance: local `supabase start` (`saa-app`), API
`http://127.0.0.1:55321`, Postgres `postgresql://postgres:postgres@127.0.0.1:55322/postgres`.
Apply bằng `supabase migration up` (không `db reset`). Verify bằng
`docker exec -i supabase_db_saa-app psql -U postgres`, giống pattern
`plans/260907-1725-kudos-live-board/evidence/rls-verification.md`. Toàn bộ
thao tác ghi thử đều trong một `BEGIN ... ROLLBACK`, không còn dữ liệu nào
sót lại (xác nhận ở cuối file).

## 0. `supabase migration list --local` trước khi apply

```
  Local | Remote | Time (UTC)
  ------|--------|------------
   0001 | 0001   | 0001
   0002 | 0002   | 0002
   0003 | 0003   | 0003
   0004 | 0004   | 0004
   0005 | 0005   | 0005
   0006 | 0006   | 0006
   0007 | 0007   | 0007
   0008 | 0008   | 0008
```

`0009` xác nhận là số kế tiếp.

## 1. `supabase migration up` — output thật

```
$ supabase migration up
Connecting to local database...
Applying migration 0009_kudos_write_anonymity.sql...
NOTICE (00000): policy "kudos_insert_own" for relation "public.kudos" does not exist, skipping
Applying migration 0010_kudo_images_bucket.sql...
NOTICE (00000): policy "kudo_images_insert_authenticated" for relation "storage.objects" does not exist, skipping
NOTICE (00000): policy "kudo_images_select_public" for relation "storage.objects" does not exist, skipping
Local database is up to date.
```

Exit code: `0`. Các `NOTICE ... does not exist, skipping` đến từ
`DROP POLICY IF EXISTS` chạy trước `CREATE POLICY` trong cùng file (không
có policy cũ nào để xoá lần đầu apply) — không phải lỗi.

`supabase migration list --local` sau khi apply:

```
  Local | Remote | Time (UTC)
  ------|--------|------------
   0001 | 0001   | 0001
   ...
   0008 | 0008   | 0008
   0009 | 0009   | 0009
   0010 | 0010   | 0010
```

## 2. `\d public.kudos` — 2 cột mới

```
                                 Table "public.kudos"
     Column     |           Type           | Collation | Nullable |      Default
----------------+--------------------------+-----------+----------+-------------------
 id             | uuid                     |           | not null | gen_random_uuid()
 sender_id      | uuid                     |           | not null |
 receiver_id    | uuid                     |           | not null |
 content        | text                     |           | not null |
 hashtags       | text[]                   |           | not null | '{}'::text[]
 image_urls     | text[]                   |           | not null | '{}'::text[]
 heart_count    | integer                  |           | not null | 0
 created_at     | timestamp with time zone |           | not null | now()
 is_anonymous   | boolean                  |           | not null | false
 anonymous_name | text                     |           |          |
Policies (forced row security enabled):
    POLICY "kudos_insert_own" FOR INSERT
      TO authenticated
      WITH CHECK ((sender_id = auth.uid()))
    POLICY "kudos_select_all" FOR SELECT
      TO anon,authenticated
      USING (true)
```

`is_anonymous boolean NOT NULL DEFAULT false` — đúng yêu cầu. Chỉ có
`kudos_insert_own` (INSERT) và `kudos_select_all` (SELECT, kế thừa từ
`0006`) — **không có** policy `UPDATE`/`DELETE` nào.

## 3. Baseline trước khi test ghi (contract F007 không đổi)

```sql
SELECT count(*) AS anonymous_rows_before_test FROM public.kudos WHERE is_anonymous = true;
--  anonymous_rows_before_test
-- ----------------------------
--                            0

SELECT count(*) AS kudos_total,
       (SELECT count(*) FROM public.kudos_cards WHERE sender_full_name IS NOT NULL) AS view_sender_name_not_null
FROM public.kudos;
--  kudos_total | view_sender_name_not_null
-- -------------+---------------------------
--           12 |                        12
```

Mọi hàng seed (`0008`) đều `is_anonymous = false`; view trả đủ tên người
gửi cho cả 12/12 hàng — output `kudos_cards` với dữ liệu hiện có **giống
hệt** trước migration, không hồi quy hợp đồng F007.

## 4. `pg_policies` — 4 policy mới trên `kudos` + `objects`

```sql
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('kudos','objects') ORDER BY tablename, policyname;
--  tablename |            policyname
-- -----------+----------------------------------
--  kudos     | kudos_insert_own
--  kudos     | kudos_select_all
--  objects   | kudo_images_insert_authenticated
--  objects   | kudo_images_select_public
```

## 5. `storage.buckets` — bucket `kudo-images` public

```sql
SELECT id, public FROM storage.buckets WHERE id = 'kudo-images';
--      id      | public
-- -------------+--------
--  kudo-images | t
```

## 6. Test ghi trong transaction (ROLLBACK ở cuối, users thật/seed thật)

- `sender_id` = `af5c6b7d-ada8-4698-95b4-032f97ad89f0` (`dang.xuan.thang@sun-asterisk.com`, tài khoản Google thật đã đăng nhập local)
- `receiver_id` = `a0000000-0000-4000-8000-000000000004` (seed `Lê Kiều Trang`)
- `other_id` = `a0000000-0000-4000-8000-000000000002` (seed `Dương thúy An`, dùng làm sender KHÔNG khớp `auth.uid()`)
- `test_kudo_id` = `b0000000-0000-4000-8000-000000000010` (hàng seed có sẵn, sender = `Dương thúy An`)

### (a) — `anon` đọc `kudos_cards` trên hàng vừa bật `is_anonymous`

```sql
BEGIN;
UPDATE public.kudos SET is_anonymous = true, anonymous_name = 'Một Sunner'
  WHERE id = 'b0000000-0000-4000-8000-000000000010';
SET ROLE anon;
SELECT sender_id, sender_full_name FROM public.kudos_cards
  WHERE id = 'b0000000-0000-4000-8000-000000000010';
RESET ROLE;
```

Kết quả thật:

```
UPDATE 1
SET
 sender_id | sender_full_name
-----------+------------------
           | Một Sunner
(1 row)

RESET
```

`sender_id` ra `NULL`, `sender_full_name` ra đúng `anonymous_name` —
đúng tín hiệu ẩn danh AD-2 đòi hỏi, không phải tên thật.

### (b1) — `authenticated` INSERT với `sender_id = auth.uid()` → thành công

```sql
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'af5c6b7d-ada8-4698-95b4-032f97ad89f0';
INSERT INTO public.kudos (sender_id, receiver_id, content)
VALUES ('af5c6b7d-ada8-4698-95b4-032f97ad89f0', 'a0000000-0000-4000-8000-000000000004',
        'RLS verify — matching sender_id (rolled back)')
RETURNING id, sender_id, receiver_id;
RESET ROLE;
```

Kết quả thật:

```
SET
SET
                  id                  |              sender_id               |             receiver_id
--------------------------------------+--------------------------------------+--------------------------------------
 d099c180-329a-477e-b6ca-e357e55a1eba | af5c6b7d-ada8-4698-95b4-032f97ad89f0 | a0000000-0000-4000-8000-000000000004
(1 row)

INSERT 0 1
RESET
```

### (b2) — `authenticated` INSERT với `sender_id` KHÁC `auth.uid()` → bị chặn

```sql
SAVEPOINT before_mismatch;
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'af5c6b7d-ada8-4698-95b4-032f97ad89f0';
INSERT INTO public.kudos (sender_id, receiver_id, content)
VALUES ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
        'RLS verify — mismatched sender_id (must fail)');
```

Kết quả thật:

```
SAVEPOINT
SET
SET
ERROR:  new row violates row-level security policy for table "kudos"
```

Đây chính là `WITH CHECK (sender_id = auth.uid())` của `kudos_insert_own`
chặn — request giả lập thẳng vào Postgres với vai trò `authenticated`,
không đi qua Server Action nào, đúng như phase 06 sẽ dựa vào.

```sql
ROLLBACK TO SAVEPOINT before_mismatch;
RESET ROLE;
ROLLBACK;
```

## 7. Dọn dẹp — không còn dữ liệu thử nghiệm nào

```sql
SELECT is_anonymous, anonymous_name FROM public.kudos
  WHERE id = 'b0000000-0000-4000-8000-000000000010';
--  is_anonymous | anonymous_name
-- --------------+----------------
--  f            |
--
SELECT count(*) AS should_be_zero FROM public.kudos WHERE content LIKE 'RLS verify%';
--  should_be_zero
-- ----------------
--               0
```

`ROLLBACK` hoàn tác đúng: hàng seed trở lại `is_anonymous = false`, cả hai
hàng test (thành công lẫn thất bại) đều không còn tồn tại trong bảng.

## 8. Regression F007 — `kudos.spec.ts --grep "@local-db"`

```
$ E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos.spec.ts --grep "@local-db"
Running 15 tests using 4 workers
  ✓  [C11] Carousel displays exactly 5 highlight cards with counter 1/5
  ✓  [C13] Kudo card displays sender, receiver, time, content, hashtags, heart, copy link
  ✓  [C12] Carousel navigation: prev disabled on slide 1, next cycles through slides
  ✓  [C14] Filter by hashtag: URL param, carousel and feed filter, counter resets
  ✓  [C16] Click hashtag on card applies filter
  ✓  [C15] Filter by department: URL param, both carousel and feed filter
  ✓  [C18] Infinite scroll loads more cards when reaching sentinel
  ✓  [C17] No filter results returns empty state, no error
  ✓  [C19] Scrolling to end of data: no sentinel, no error
  ✓  [C20] Spotlight total count matches pattern and seed count
  ✓  [C21] Sunner search highlights matching name in scatter, URL unchanged
  -  [C26] Own kudo: heart button disabled @local-db (skipped — also tagged @auth, out of this grep's scope)
  ✓  [C22] Anonymous: heart button visible and disabled with title
  ✓  [C24] Detail button does not navigate URL
  ✓  [C23] Copy link: clipboard contains URL, toast shows confirmation

1 skipped
14 passed (9.5s)
```

Exit code: `0`. F007's DOM/read contract is unchanged by `0009`/`0010`.

## 9. Gates

```
$ pnpm lint --max-warnings 0
> eslint --max-warnings 0
(no output — clean, exit 0)

$ pnpm format:check
> prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

Neither gate touches SQL; run to prove no other file moved during this phase.

## Kết luận

- `0009`/`0010` apply sạch trên instance đang chạy, không cần `db reset`.
- View `kudos_cards` không đổi output cho dữ liệu hiện có (12/12 hàng vẫn
  có tên người gửi).
- Ẩn danh thật: `sender_id → NULL`, `sender_full_name → anonymous_name`.
- `kudos_insert_own` chặn đúng: sender khớp `auth.uid()` mới INSERT được;
  giả mạo `sender_id` của người khác bị Postgres từ chối ở tầng RLS.
- Bucket `kudo-images` tồn tại, `public = true`, đúng 2 policy trên
  `storage.objects`, không có `ALTER TABLE storage.objects ENABLE ROW
  LEVEL SECURITY` nào trong repo (`grep -rn "storage.objects"
  supabase/migrations/` chỉ ra `CREATE POLICY`/`DROP POLICY`/comment).
- Không còn dữ liệu thử nghiệm nào sót lại trong DB.
