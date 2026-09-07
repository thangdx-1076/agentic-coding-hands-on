# RLS verification — `supabase/migrations/0007_kudo_hearts.sql`

Ngày chạy: 2026-09-07. Instance: `supabase_db_saa-app` (local, docker), qua
`docker exec -i supabase_db_saa-app psql -U postgres`. Toàn bộ chạy trong
MỘT transaction rồi `ROLLBACK` ở cuối — không có dữ liệu nào còn sót lại
(xác nhận ở cuối file). Users dùng thật từ `auth.users` local, không bịa.

- `sender_id` = `af5c6b7d-ada8-4698-95b4-032f97ad89f0` (dang.xuan.thang@sun-asterisk.com)
- `hearter_id` = `ef18a7a4-171c-4e6a-a14b-a2ec302a70b0` (e2e-1778093434733@sun-asterisk.com)
- `kudo_id` tạm = `11111111-1111-1111-1111-111111111111`, tạo bởi `postgres`
  (bypassrls) làm dữ liệu nền, sender = `sender_id`, receiver = `hearter_id`.

## Xác nhận trước khi viết trigger (Todo #1)

```sql
SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;
-- rolbypassrls
-- --------------
--  t
```
`current_user` = `postgres` khi áp migration/chạy trigger `SECURITY DEFINER`.

## Grants thực tế trên `kudo_hearts` (psql, sau khi áp `0007`)

```
 grantee       | privilege_type
---------------+----------------
 anon          | SELECT
 authenticated | DELETE
 authenticated | INSERT
 authenticated | SELECT
```
`authenticated` **không** có `UPDATE` — không có dòng nào cho `UPDATE` với
grantee `anon`/`authenticated` ở trên. Khớp đúng yêu cầu: anon chỉ đọc;
insert/delete chỉ authenticated; update không ai được cấp (chỉ trigger
`SECURITY DEFINER` ghi `heart_count`).

## TEST 1 — anon INSERT bị từ chối (không có GRANT)

```sql
SET ROLE anon;
INSERT INTO public.kudo_hearts (kudo_id, user_id) VALUES (:'kudo_id', :'hearter_id');
```
Kết quả thật:
```
ERROR:  permission denied for table kudo_hearts
HINT:  Grant the required privileges to the current role with: GRANT INSERT ON public.kudo_hearts TO anon;
```

## TEST 2 — sender tự thả tim kudo của chính mình bị chặn ở tầng DB (BR-002, kể cả gọi thẳng REST)

```sql
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'sender_id';  -- auth.uid() = sender_id = kudos.sender_id
INSERT INTO public.kudo_hearts (kudo_id, user_id) VALUES (:'kudo_id', :'sender_id');
```
Kết quả thật:
```
ERROR:  new row violates row-level security policy for table "kudo_hearts"
```
Đây là `WITH CHECK` của policy `kudo_hearts_insert_own`, không phải nút
disabled phía UI — request giả lập thẳng vào Postgres với vai trò
`authenticated` + `auth.uid()` = sender, không đi qua Server Action nào.

## TEST 3 — người khác (không phải sender) thả tim → thành công, `heart_count` cộng đúng 1

```sql
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'hearter_id';
INSERT INTO public.kudo_hearts (kudo_id, user_id) VALUES (:'kudo_id', :'hearter_id');
```
Kết quả thật: `before_heart = 0` → `INSERT 0 1` → `after_heart = 1`.
Trigger `sync_kudo_heart_count` chạy đúng (`special = false` mặc định →
cộng 1, khớp `CASE WHEN special THEN 2 ELSE 1 END`).

## TEST 4 — thả tim hai lần → `23505` (BR-001, phân xử bằng UNIQUE)

```sql
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'hearter_id';
INSERT INTO public.kudo_hearts (kudo_id, user_id) VALUES (:'kudo_id', :'hearter_id');
```
Kết quả thật:
```
ERROR:  duplicate key value violates unique constraint "kudo_hearts_kudo_id_user_id_key"
```
Đây chính là mã lỗi `23505` mà `toggle-kudo-heart.ts` bắt riêng để đọc lại
trạng thái thay vì ném lỗi ra người dùng (xem `src/app/(public)/kudos/_actions/toggle-kudo-heart.test.ts`,
ca "INSERT đụng UNIQUE (23505, race hai click)").

## TEST 5 — `heart_count` khớp `count(*)` thật trên `kudo_hearts`

```sql
SELECT k.heart_count, (SELECT count(*) FROM public.kudo_hearts h WHERE h.kudo_id = k.id) AS actual_hearts
FROM public.kudos k WHERE k.id = :'kudo_id';
```
Kết quả thật: `heart_count = 1`, `actual_hearts = 1` — bằng nhau.

## TEST 6 — bỏ tim thu hồi đúng số đã cộng

```sql
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = :'hearter_id';
DELETE FROM public.kudo_hearts WHERE kudo_id = :'kudo_id' AND user_id = :'hearter_id';
```
Kết quả thật: `DELETE 1` → `after_delete = 0` (từ `1`, đúng số đã cộng ở
TEST 3 — trigger đọc `OLD.special` của chính hàng bị xoá, không phải một
giá trị mặc định).

## Dọn dẹp

Toàn bộ 6 test chạy trong một `BEGIN ... ROLLBACK` duy nhất bọc ngoài (kể cả
kudo tạm ở bước setup). Sau `ROLLBACK`:
```sql
SELECT count(*) AS should_be_zero FROM public.kudos WHERE id = :'kudo_id';
-- should_be_zero = 0
```
Không còn dữ liệu thử nghiệm nào trong DB. `supabase.migration up` áp
`0007` một lần (log: `CREATE TABLE`/`CREATE POLICY`/... không lỗi), chạy
lại trực tiếp file SQL lần hai qua `psql` cho kết quả toàn `NOTICE ...
already exists, skipping` / `CREATE OR REPLACE` — idempotent, exit code 0
cả hai lần.
