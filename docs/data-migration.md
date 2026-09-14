# Data migration — đổi DỮ LIỆU trên production

Tài liệu này nói về việc đổi **dữ liệu** (row) trên Supabase production: seed nội
dung, backfill cột, dọn dữ liệu demo, sửa row đã sai. Nó **không** nói về đổi
**schema** — phần đó ở [deployment.md](deployment.md) § Bước 5.5 và trong
`.github/workflows/migrate.yml`.

Ranh giới rõ ràng vì rủi ro khác nhau hoàn toàn:

|                   | Schema migration                        | Data migration                                     |
| ----------------- | --------------------------------------- | -------------------------------------------------- |
| Đổi cái gì        | bảng, cột, view, policy, trigger        | nội dung row                                       |
| Sai thì           | app throw, thấy ngay                    | **im lặng** — số liệu lệch, không ai biết          |
| Undo              | viết migration đảo ngược                | chỉ khôi phục được từ **backup có trước khi chạy** |
| Đường chạy chuẩn  | `migrate.yml` (có approval gate)        | cùng đường đó, khi nào không được thì xem § 3       |

> **Điều duy nhất phải nhớ nếu chỉ đọc một dòng:** `DELETE`/`UPDATE` trên
> production không có Ctrl+Z. Backup trước (§ 4), đếm row trước và sau (§ 9).

---

## 1 — Bản đồ dữ liệu: cái gì ở đâu, ai được ghi

Trước khi viết một câu SQL nào, phải biết cột đó **ai là người ghi hợp lệ**. Repo
này cố tình chỉ cho một writer duy nhất với vài cột — ghi tay vào đó là làm hỏng
dữ liệu chứ không phải sửa.

| Bảng / đối tượng            | Chứa gì                        | Writer hợp lệ duy nhất                                    | Mất là mất luôn?                       |
| --------------------------- | ------------------------------ | --------------------------------------------------------- | -------------------------------------- |
| `auth.users`                | lần đăng nhập Google thật      | Supabase Auth                                             | **Có.** Không tái tạo được             |
| `public.users`              | profile mirror                 | trigger `handle_new_user` (0002) + chính chủ (4 cột)      | tái tạo được nếu `auth.users` còn      |
| `public.users.department`   | phòng ban                      | **chưa có ai** — chỉ seed/backfill (comment ở 0006)       | không, backfill lại được               |
| `public.kudos`              | kudo thật của Sunner           | server action `create-kudo.ts`                            | **Có**                                 |
| `public.kudos.heart_count`  | tổng tim (denormalized)        | **chỉ** trigger `sync_kudo_heart_count` (0007)            | tính lại được từ `kudo_hearts`         |
| `public.kudo_hearts`        | ai tim kudo nào                | `toggleKudoHeart` qua RLS                                 | **Có**                                 |
| `public.notifications`      | thông báo                      | **chỉ** 2 trigger ở 0013                                  | không quan trọng, sinh lại theo event  |
| `public.secret_box_openings`| log mở hộp (append-only)       | **chỉ** RPC `open_secret_box()` (0011)                     | **Có** — badge đã trao                 |
| `public.awards`             | nội dung trang `/awards`       | migration (0003 vi, 0004 en)                              | không, nằm trong repo                  |
| Storage `kudo-images`       | ảnh đính kèm kudo              | upload từ compose dialog                                  | **Có** — xem § 8                       |
| View `kudos_cards`, `profile_cards`, `kudos_filter_options`, `recent_gift_recipients` | không chứa gì | — | — |

Bốn view trên **không có dữ liệu**: chúng đọc từ bảng gốc. Đừng bao giờ tìm cách
"sửa dữ liệu trong view" — sửa bảng nguồn, view tự đúng.

### Cascade: xoá một `auth.users` là xoá tới đâu

```
auth.users
  └─ public.users              (ON DELETE CASCADE, 0001)
       ├─ kudos.sender_id      (CASCADE, 0006)
       ├─ kudos.receiver_id    (CASCADE, 0006)  ← kudo người khác GỬI CHO họ cũng mất
       │    └─ kudo_hearts     (CASCADE, 0007)
       ├─ kudo_hearts.user_id  (CASCADE, 0007)
       ├─ notifications        (CASCADE, 0012)
       └─ secret_box_openings  (CASCADE, 0011)
```

`receiver_id` cascade là chỗ dễ bị bất ngờ nhất: xoá 1 account demo thì mọi kudo
**người thật gửi cho account đó** biến mất theo, không cảnh báo gì.

---

## 2 — Bốn loại data change, và loại nào đi đường nào

| Loại                                                        | Ví dụ thật trong repo                          | Đường chạy       | Idempotent kiểu gì                |
| ----------------------------------------------------------- | ---------------------------------------------- | ---------------- | --------------------------------- |
| **A. Content seed** — dữ liệu nội dung, nguồn là repo       | `0003`/`0004` seed `awards`                    | migration file   | `ON CONFLICT … DO UPDATE`         |
| **B. Backfill** — điền cột mới cho row đã có                | `0019` set `department` cho 8 UUID demo        | migration file   | `UPDATE` tới giá trị literal      |
| **C. Cleanup** — xoá dữ liệu demo/rác                       | rollback header của `0008`                     | SQL Editor (§ 3) | `WHERE` khớp đúng tập cần xoá     |
| **D. Repair** — sửa row đã ghi sai                          | `0008` Step 5 sửa `image_urls` của kudo #1     | migration file   | `WHERE` hết khớp sau khi đã sửa   |

**A, B, D luôn là một file migration.** Lý do không phải hình thức: file migration
được commit (review được), chạy qua `migrate.yml` nên có approval gate + log ai
chạy lúc nào, và CLI bị pin ở version `2.98.2` thay vì version bất kỳ trên máy ai
đó. Một câu `UPDATE` gõ vào SQL Editor không để lại gì cả.

**C là ngoại lệ hợp lý.** Xoá dữ liệu demo là việc chạy **một lần duy nhất, ở một
môi trường duy nhất** — nó không thuộc về lịch sử schema của repo, và nếu để thành
migration thì mọi môi trường mới (local của người mới join) sẽ xoá luôn seed mà họ
đang cần để dev. Đường đúng là SQL Editor, và phải chép câu lệnh vào § "Nợ lại"
của `plans/action-items.md` để còn dấu vết.

---

## 3 — Ba đường ghi vào production, chọn cái nào

| Đường                                        | Chạy bằng role  | RLS         | Có log?             | Dùng khi                              |
| -------------------------------------------- | --------------- | ----------- | ------------------- | ------------------------------------- |
| **1. Migration file** → `migrate.yml`        | `postgres`      | bypass      | ✅ Actions run + git | A, B, D — mặc định, luôn ưu tiên       |
| **2. SQL Editor** (Dashboard → SQL Editor)   | `postgres`      | bypass      | ❌ không gì cả       | C, và đọc/verify                       |
| **3. Script + `SERVICE_ROLE_KEY`**           | `service_role`  | bypass      | ❌                   | **local thôi** — xem cảnh báo dưới     |

Cả ba đều bypass RLS, kể cả khi bảng bật `FORCE ROW LEVEL SECURITY` (các bảng ở
đây đều bật) — vì `postgres` có `rolbypassrls = true`, đã verify trong header
`0007`. Đây là lý do backfill `users.department` chạy được: `authenticated` chỉ
được `GRANT UPDATE (full_name, avatar_url, locale, updated_at)` và chỉ trên row
của chính mình (0001), nên không có đường nào từ app làm được việc này.

> **`node scripts/grant-secret-boxes.mjs` không phải công cụ production.** Header của
> `scripts/grant-secret-boxes.mjs` nói thẳng: nó **fabricate engagement** — tạo
> kudo mới rồi cho 5 demo Sunner tim vào để đẻ ra entitlement. Trên production
> việc đó nghĩa là đưa kudo giả vào feed thật và đẩy nó lên Highlight carousel.
> Chỉ trỏ script này vào Supabase local.

> **`pnpm db:migrate` không tồn tại.** Header của `0003`/`0004` có nhắc lệnh này;
> `package.json` không có script nào tên vậy. Dùng `supabase migration up` (local)
> hoặc `supabase db push` / `migrate.yml` (hosted).

---

## 4 — Backup: bắt buộc, và phải kiểm bản backup

Không có backup thì mọi mục dưới đây đều là thao tác một chiều.

```bash
# Từ gốc repo, sau khi đã `supabase link --project-ref <ref>`
supabase db dump --linked --data-only --schema public --file backup-data.sql
supabase db dump --linked            --schema public --file backup-schema.sql
```

**Rồi kiểm ngay, đừng tin file vừa tạo:**

```bash
ls -lh backup-data.sql                         # vài KB ⇒ khả năng cao là rỗng
grep -c "INSERT INTO\|COPY public" backup-data.sql
grep -n "public.users\|public.kudos" backup-data.sql | head
```

Ba thứ `db dump` **không** cứu được, phải biết trước:

1. **`auth.users` không nằm trong `--schema public`.** Dump này không khôi phục
   được các lần đăng nhập thật. Đó là dữ liệu duy nhất trong hệ thống không tái
   tạo được — nếu thao tác sắp chạy có chạm tới `auth.users` (mọi `DELETE` ở § 7.3
   đều chạm), phải có backup ở tầng Dashboard nữa: **Database → Backups**.
2. **File trong Storage không nằm trong SQL dump.** Xem § 8.
3. **PITR là add-on trả tiền.** Vào Dashboard → Database → Backups xem plan hiện
   tại thực sự cho gì (daily snapshot hay PITR) — đừng giả định.

---

## 5 — Luật cứng

1. **Không bao giờ `supabase db reset` với project này.** Nó drop cả
   `auth.users`. 20 trong 23 file migration ghi đúng câu cảnh báo này ở header vì
   nó là cách nhanh nhất để mất sạch dữ liệu thật.
2. **Không `UPDATE kudos.heart_count` bằng tay.** Trigger `sync_kudo_heart_count`
   (0007) là writer duy nhất. Muốn đổi số tim thì thêm/bớt row `kudo_hearts`, để
   trigger tự cộng.
3. **Không `INSERT INTO notifications` bằng tay.** Hai trigger ở `0013` là writer
   duy nhất, và `0012` tạo unique index dedupe trên
   `(user_id, type, payload->>'kudosId', payload->>'actorId')` với
   `type = 'heart_received'` — insert tay rất dễ đụng nó và abort cả transaction.
4. **Không `INSERT INTO secret_box_openings` để "trao quà".** Bảng này là log
   append-only của RPC `open_secret_box()`; `unopened` được tính lại mỗi lần là
   `floor(SUM(kudos.heart_count WHERE sender_id = me) / 5) - count(*)`. Insert tay
   là **trừ** quà của người ta, không phải cộng.
5. **Migration data phải chạy lại được không đổi kết quả.** `migrate.yml` chỉ
   apply file chưa có trong `schema_migrations`, nhưng local thì chạy lại thường
   xuyên. `ON CONFLICT`, `WHERE NOT EXISTS`, hoặc `UPDATE` tới literal — chọn một.
6. **Mỗi file migration data phải có câu rollback ở header.** `0008` và `0023` làm
   đúng vậy, và bảng Rollback trong `deployment.md` dựa vào đúng chỗ đó.
7. **Không bao giờ fabricate dữ liệu lên row của người thật.** Đây là bài học có
   giá: một bản nháp của `0023` cho demo Sunner tim mọi kudo không phải của demo
   để tạo entitlement. Nó sweep cả kudo do e2e tạo vào top-5 Highlight và làm đỏ
   C13/C16/C35. Header `0023` ghi lại nguyên văn kết luận: *"A migration cannot
   tell a real Sunner's kudo from a test fixture, so it has no business
   fabricating engagement on rows it did not create."*

---

## 6 — Quy trình chuẩn

### 6.0 — Tám bước, không bỏ bước nào

1. **Xác định loại** (§ 2) ⇒ ra đường chạy.
2. **Backup** (§ 4) và kiểm file backup.
3. **Đếm trước.** Chạy câu đếm ở § 9 trên production, chép kết quả vào plan/PR.
4. **Viết SQL**, kèm header có: lý do, câu rollback, và ghi rõ vì sao idempotent.
5. **Thử trên local trước.** `supabase start` rồi `supabase migration up`. Nếu
   local không giống production (thường là vậy — production không có seed demo),
   restore `backup-data.sql` vào một database local riêng rồi thử ở đó.
6. **Dry-run trên production.** Actions → *Migrate production database* → gõ
   `migrate` → job `plan` in ra danh sách file. Đọc danh sách rồi mới Approve.
7. **Apply** và đọc Summary của run.
8. **Verify** (§ 9) — đếm lại, so với bước 3, kiểm invariant. Rồi ghi vào
   `plans/action-items.md`.

### 6.1 — Bẫy thứ tự: data migration và code

`migrate.yml` **chỉ đổi database, không deploy code**; merge vào `main` **chỉ
deploy code, không đụng database**. Hai đường tách nhau, và không có gì ép đúng
thứ tự (`deployment.md` giải thích đầy đủ, kèm sự cố migration `0022`).

Với data migration, quy tắc dễ hơn schema: **data đi trước code, luôn luôn.**
Backfill `department` rồi hãy deploy code hiển thị nó — thứ tự ngược lại thì UI
hiện ô trống cho tới khi có người nhớ ra.

### 6.2 — Bọc transaction khi và chỉ khi có nhiều câu lệnh liên quan

Supabase CLI apply mỗi file migration trong một transaction rồi mới ghi vào
`schema_migrations`, nên một file = một đơn vị atomic — không cần tự `BEGIN`.
Không file nào trong `supabase/migrations/` tự mở transaction; 5 chỗ trông giống
`BEGIN` là thân function plpgsql (`AS $$ BEGIN`). Giữ nguyên quy ước đó.

Chỗ **cần** `BEGIN`/`COMMIT` bằng tay là **SQL Editor** (§ 3 đường 2), nơi mỗi
câu lệnh tự commit riêng. Một `DELETE` kèm một `UPDATE` mà chỉ chạy được nửa đầu
là trạng thái tệ hơn cả không chạy gì:

```sql
BEGIN;

DELETE FROM public.secret_box_openings
 WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE '%@kudos-demo.saa');

-- Xem số liệu TRƯỚC KHI commit. Sai thì ROLLBACK; đúng thì COMMIT;
SELECT count(*) AS con_lai FROM public.secret_box_openings;

COMMIT;   -- hoặc: ROLLBACK;
```

---

## 7 — Ví dụ thật

### 7.1 — Sửa nội dung `awards` (loại A) — và cái bẫy `DO NOTHING`

`0003`/`0004` seed bằng `ON CONFLICT (slug, locale) DO NOTHING`. Nghĩa là: **sửa
text trong hai file đó rồi push lại sẽ không đổi gì trên production.** Row đã tồn
tại, `DO NOTHING` bỏ qua, `db push` báo thành công, nội dung vẫn cũ.

Đây không phải giả thuyết — `0008` gặp đúng nó và phải thêm "Step 5", một câu
`UPDATE` riêng, chỉ để sửa `image_urls` của một kudo mà `DO NOTHING` không chạm
tới.

File mới, `supabase/migrations/0024_awards_content_fix.sql`:

```sql
-- 0024_awards_content_fix.sql
--
-- Sửa số tiền giải Best Manager (vi + en). 0003/0004 seed bằng
-- ON CONFLICT DO NOTHING, nên sửa text trong hai file đó KHÔNG có tác dụng
-- lên database đã seed — phải UPSERT bằng DO UPDATE như dưới.
--
-- Rollback: chạy lại file này với giá trị cũ ('10.000.000 VNĐ' /
--   '10,000,000 VND'), hoặc restore awards từ backup-data.sql.
--
-- Idempotent: DO UPDATE ghi tới literal, chạy bao nhiêu lần cũng ra một kết quả.
-- DO NOT run `supabase db reset` on this project.

INSERT INTO public.awards
    (slug, locale, sort_order, title, description, quantity_value, quantity_unit, prize_values)
VALUES
    ('best-manager', 'vi', 4, 'Best Manager',
     (SELECT description FROM public.awards WHERE slug = 'best-manager' AND locale = 'vi'),
     '01', 'Cá nhân',
     '[{"amount": "12.000.000 VNĐ", "note": ""}]'::jsonb)
ON CONFLICT (slug, locale) DO UPDATE
SET prize_values = EXCLUDED.prize_values,
    updated_at   = now();
```

Ba chi tiết bắt buộc: `EXCLUDED.<col>` chỉ liệt kê **cột thực sự muốn đổi** (liệt
kê cả `description` là ghi đè mất bản đã sửa tay nếu có); `updated_at = now()`
phải set tay vì không có trigger nào làm; và `quantity_value` là **text** — `'01'`
chứ không phải `1`, vì số 0 đứng đầu là nội dung và e2e assert nguyên văn (comment
ở `0003`).

### 7.2 — Backfill `users.department` cho Sunner thật (loại B)

`department` nullable và comment ở `0006` nói rõ nó "only ever backfilled by
seed/demo data". Khi có danh sách thật từ HR:

```sql
-- 0025_backfill_real_departments.sql
--
-- Backfill users.department từ danh sách HR (nguồn: <ticket/file>, <ngày>).
--
-- Scope theo EMAIL, và loại trừ 8 UUID demo của 0008/0019 — department của họ
-- do 0019 quản, ghi đè là làm đỏ filter test của Phòng ban.
--
-- Rollback: UPDATE public.users SET department = NULL WHERE email IN (…);
--   (chỉ đúng nếu trước đó chúng đang NULL — xem câu đếm ở § 9 trước khi chạy)
--
-- Idempotent: UPDATE tới literal.
-- DO NOT run `supabase db reset` on this project.

UPDATE public.users AS u
SET department = v.department
FROM (VALUES
    ('an.nguyen@sun-asterisk.com',  'CEVC1'),
    ('binh.tran@sun-asterisk.com',  'OPD'),
    ('chi.le@sun-asterisk.com',     'Infra')
) AS v(email, department)
WHERE u.email = v.email
  AND u.email NOT LIKE '%@kudos-demo.saa'
  AND u.department IS DISTINCT FROM v.department;   -- không ghi lại row đã đúng
```

Giá trị `department` phải nằm trong đúng 6 giá trị dropdown thiết kế công nhận:
`CEVC1`, `CEVC2`, `CEVC3`, `CEVC4`, `OPD`, `Infra` (xem header `0019`). Không có
CHECK constraint chặn — gõ sai chính tả thì dropdown `Phòng ban` mọc thêm một
option lạ, và không có gì báo lỗi.

Email không khớp row nào thì `UPDATE` **im lặng bỏ qua**. Kiểm trước:

```sql
SELECT v.email
FROM (VALUES ('an.nguyen@sun-asterisk.com'), ('binh.tran@sun-asterisk.com')) AS v(email)
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.email = v.email);
-- Trả về dòng nào ⇒ người đó chưa từng đăng nhập, backfill sẽ bỏ qua họ.
```

### 7.3 — Dọn dữ liệu demo trước khi mở cho Sunner thật (loại C)

`deployment.md` § Bước 2 đã nêu quyết định giữ-hay-xoá. Đây là phần thao tác.

**Thời điểm là tất cả: chạy TRƯỚC khi có người thật đăng nhập.** Sau đó thì không
còn lọc ngược được nữa — kudo thật có thể đã gửi cho account demo, và câu `DELETE`
dưới đây sẽ cascade xoá luôn kudo thật đó (§ 1).

```sql
-- SQL Editor. Chạy từng bước, đọc kết quả từng bước.

-- Bước 1 — đo thiệt hại TRƯỚC khi xoá.
SELECT
  (SELECT count(*) FROM auth.users   WHERE email LIKE '%@kudos-demo.saa')          AS demo_accounts,
  (SELECT count(*) FROM public.kudos k JOIN public.users u ON u.id = k.sender_id
     WHERE u.email LIKE '%@kudos-demo.saa')                                        AS kudo_demo_gui,
  (SELECT count(*) FROM public.kudos k JOIN public.users u ON u.id = k.receiver_id
     WHERE u.email LIKE '%@kudos-demo.saa'
       AND k.sender_id NOT IN (SELECT id FROM public.users
                                WHERE email LIKE '%@kudos-demo.saa'))              AS kudo_THAT_se_mat;

-- `kudo_THAT_se_mat` > 0 ⇒ DỪNG. Có người thật đã gửi kudo cho account demo;
-- xoá là mất kudo của họ. Lúc này phải chọn: giữ demo data, hoặc chuyển
-- receiver_id của những kudo đó sang một account khác trước khi xoá.

-- Bước 2 — xoá (đúng câu rollback ở header 0008; cascade lo phần còn lại).
BEGIN;
DELETE FROM auth.users WHERE email LIKE '%@kudos-demo.saa';
SELECT count(*) AS demo_con_lai FROM auth.users WHERE email LIKE '%@kudos-demo.saa';  -- phải = 0
COMMIT;
```

Xoá xong, `/kudos` mất Highlight carousel và Spotlight về 0, `Phòng ban` dropdown
rỗng (`kudos_filter_options` đọc department của **receiver**), và panel "10 SUNNER
NHẬN QUÀ MỚI NHẤT" hiện empty state — cả ba đều đúng, không phải bug. Đó là cái
giá của việc chọn "Xoá" ở `deployment.md` § Bước 2.

### 7.4 — Tính lại `heart_count` khi nghi nó lệch (loại D)

`heart_count` là cột denormalized. Nếu có ai từng ghi tay vào nó, hoặc trigger
từng bị disable, con số sẽ lệch mãi. Không sửa bằng cách gõ số đúng vào — tính
lại từ nguồn:

```sql
-- Kiểm trước: liệt kê row lệch. Rỗng ⇒ không có gì phải sửa.
SELECT k.id, k.heart_count AS dang_luu, count(h.id) AS thuc_te
FROM public.kudos k
LEFT JOIN public.kudo_hearts h ON h.kudo_id = k.id
GROUP BY k.id, k.heart_count
HAVING k.heart_count <> count(h.id);
```

Lưu ý trước khi "sửa": trigger `0007` cộng theo `CASE` có tính cột
`kudo_hearts.special` (tim ngày đặc biệt = +2). Hôm nay chưa có gì set `special`
thành `true`, nên `count(*)` là đúng — nhưng nếu về sau có, thì công thức tính lại
phải là `SUM(CASE WHEN special THEN 2 ELSE 1 END)`, không phải `count(*)`. Đọc
đúng thân function `sync_kudo_heart_count()` trong `0007` rồi mới viết câu UPDATE.

---

## 8 — Storage: bucket `kudo-images`

Bucket `kudo-images` (`public = true`) do `0010` tạo bằng
`INSERT INTO storage.buckets`. Dữ liệu ở đây có **hai phần**, và data migration
chỉ chạm được một phần:

| Phần               | Ở đâu                    | `db dump` có lấy?                     |
| ------------------ | ------------------------ | ------------------------------------- |
| Metadata (row)     | `storage.objects`        | chỉ khi thêm `--schema storage`       |
| Nội dung file      | object storage backend   | **Không.** SQL không chứa byte ảnh    |

Hệ quả thực tế:

- `DELETE FROM storage.objects` xoá metadata nhưng có thể để lại file orphan ở
  backend. Muốn xoá file thì dùng Storage API / Dashboard → Storage, đừng dùng SQL.
- Backup ảnh là việc riêng: Dashboard → Storage → download, hoặc gọi Storage API.
  `supabase db dump` không cứu được ảnh.
- `kudos.image_urls` là `text[]` **không có FK** tới `storage.objects`. Xoá file
  không làm sạch URL trong `kudos`, và ngược lại — hai bên lệch nhau là hoàn toàn
  có thể, `<img>` sẽ 404. Sửa `image_urls` thì tự kiểm file còn tồn tại.

---

## 9 — Verify: đếm và kiểm invariant

Chạy **trước** và **sau**, so hai kết quả. Chép cả hai vào PR hoặc
`plans/action-items.md` — "chạy xong thấy ổn" không phải bằng chứng.

```sql
-- (A) Ảnh chụp số lượng
SELECT 'auth.users'           AS bang, count(*) FROM auth.users
UNION ALL SELECT 'users',            count(*) FROM public.users
UNION ALL SELECT 'users (demo)',     count(*) FROM public.users WHERE email LIKE '%@kudos-demo.saa'
UNION ALL SELECT 'users (no dept)',  count(*) FROM public.users WHERE department IS NULL
UNION ALL SELECT 'kudos',            count(*) FROM public.kudos
UNION ALL SELECT 'kudo_hearts',      count(*) FROM public.kudo_hearts
UNION ALL SELECT 'notifications',    count(*) FROM public.notifications
UNION ALL SELECT 'secret_box_openings', count(*) FROM public.secret_box_openings
UNION ALL SELECT 'awards',           count(*) FROM public.awards
ORDER BY bang;
```

```sql
-- (B) Invariant — cả bốn câu PHẢI trả 0 dòng
-- 1. heart_count khớp kudo_hearts
SELECT k.id FROM public.kudos k LEFT JOIN public.kudo_hearts h ON h.kudo_id = k.id
GROUP BY k.id, k.heart_count HAVING k.heart_count <> count(h.id);

-- 2. mọi auth.users đều có mirror ở public.users (trigger 0002 không sót ai)
SELECT a.id FROM auth.users a LEFT JOIN public.users u ON u.id = a.id WHERE u.id IS NULL;

-- 3. awards đủ 6 slug × 2 locale = 12 row
SELECT locale, count(*) FROM public.awards GROUP BY locale HAVING count(*) <> 6;

-- 4. không ai mở nhiều hộp hơn số hộp họ có (entitlement = floor(sum(heart)/5))
SELECT u.id, count(s.id) AS da_mo,
       floor(COALESCE(SUM(k.heart_count), 0) / 5) AS duoc_mo
FROM public.users u
LEFT JOIN public.secret_box_openings s ON s.user_id = u.id
LEFT JOIN public.kudos k ON k.sender_id = u.id
GROUP BY u.id
HAVING count(s.id) > floor(COALESCE(SUM(k.heart_count), 0) / 5);
```

Câu (B).1 dùng `count(*)` — đọc lại ghi chú về `special` ở § 7.4 nếu đã có row nào
`special = true`.

Verify ở tầng app, sau khi SQL đã xanh:

- `/awards` — đổi VN/EN, nội dung vừa sửa hiện đúng cả hai.
- `/kudos` — Highlight carousel, dropdown `Phòng ban`, Spotlight total.
- `/profile` — department hiện trên card.

---

## 10 — Rollback theo từng loại

| Loại                     | Undo bằng gì                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| A. Content seed          | Chạy lại file với giá trị cũ (`DO UPDATE` nên rollback cũng là một upsert)    |
| B. Backfill              | `UPDATE … SET <cột> = NULL WHERE …` — chỉ đúng nếu trước đó nó NULL           |
| C. Cleanup (`DELETE`)    | **Không undo được.** Chỉ còn backup. Đây là lý do § 4 không phải tuỳ chọn     |
| D. Repair                | Chạy lại với giá trị cũ, lấy từ backup                                       |
| Storage                  | Upload lại file từ bản backup Storage — SQL không liên quan                   |

Một migration data đã apply thì `schema_migrations` coi như xong; muốn đảo ngược
là **viết file mới**, không sửa file cũ. Sửa file đã push là làm lệch lịch sử giữa
production và mọi máy local.

---

## 11 — Checklist

```
[ ] Xác định loại A/B/C/D  → đường chạy (§ 2, § 3)
[ ] supabase db dump (data + schema) — VÀ đã grep kiểm file (§ 4)
[ ] Có chạm auth.users?  → thêm backup Dashboard → Database → Backups
[ ] Có chạm Storage?     → backup ảnh riêng (§ 8)
[ ] Chạy câu đếm (A) + invariant (B) TRƯỚC — đã chép kết quả lại
[ ] SQL không ghi vào: heart_count / notifications / secret_box_openings (§ 5)
[ ] SQL idempotent, và header có câu rollback
[ ] Đã thử trên local (hoặc trên bản restore từ backup)
[ ] Actions → Migrate production database → gõ `migrate` → ĐỌC job `plan` → Approve
[ ] Chạy lại (A) + (B) SAU — so với số trước
[ ] Verify trên app: /awards, /kudos, /profile
[ ] Data đã xong TRƯỚC khi merge code đọc nó (§ 6.1)
[ ] Ghi vào plans/action-items.md: chạy gì, số row trước/sau, câu rollback
```
