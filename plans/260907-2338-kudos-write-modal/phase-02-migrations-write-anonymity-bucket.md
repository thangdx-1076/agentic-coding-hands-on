---
phase: 02
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.25h
owner: implementer
file_ownership:
  [
    "supabase/migrations/0009_kudos_write_anonymity.sql",
    "supabase/migrations/0010_kudo_images_bucket.sql",
    "plans/260907-2338-kudos-write-modal/evidence/migration-transcript.md",
  ]
---

# Phase 02 — Migration 0009 (ghi + ẩn danh) và 0010 (bucket ảnh)

## Context Links

- `spec/system/permissions.md` § `kudos_insert_own`, § Storage, § "Ẩn danh là NGỤY TRANG hiển thị" — **đọc trọn 3 mục này trước khi viết SQL**
- `spec/system/architecture.md` § "Lần đầu ứng dụng có Supabase Storage"
- `supabase/migrations/0006_kudos.sql:16-18` (lời hứa "compose dialog adds its own write policy"), `:20-29` (bảng), `:82-101` (view + doc-comment cấm `SELECT *`)
- `supabase/migrations/0007_kudo_hearts.sql:78-84` — hình dạng policy INSERT phải mirror
- `research/researcher-data-layer-report.md` § 1, § 6 · `supabase/config.toml:109-120`
- FR-001, FR-002, BR-001, BR-004 · plan.md AD-2, AD-3

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: mở đường GHI đầu tiên vào `public.kudos`, đóng lỗ rò danh tính của view `kudos_cards`, và tạo bucket `kudo-images` — tất cả bằng migration apply-forward, không `db reset`.

## Architecture notes

`0009` (một transaction, thứ tự bắt buộc):

1. `ALTER TABLE public.kudos ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false, ADD COLUMN anonymous_name text;`
2. `CREATE OR REPLACE VIEW public.kudos_cards` — chép **nguyên** danh sách cột của `0006:82-101` (giữ `WITH (security_invoker = false)`, giữ `COMMENT ON VIEW`, **không** `SELECT *`), chỉ bọc 5 cột phía sender: `sender_id → CASE WHEN k.is_anonymous THEN NULL ELSE su.id END`, `sender_full_name → … THEN k.anonymous_name ELSE su.full_name`, `sender_avatar_url`/`sender_department` → `NULL`, `sender_kudos_received` → `0`. **Không thêm cột mới** (AD-2). Cột phía receiver và `REVOKE ALL` + `GRANT SELECT TO anon, authenticated` giữ nguyên.
3. `DROP POLICY IF EXISTS kudos_insert_own ON public.kudos; CREATE POLICY kudos_insert_own ON public.kudos FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid()); GRANT INSERT ON public.kudos TO authenticated;`

`0010`: `INSERT INTO storage.buckets (id, name, public) VALUES ('kudo-images','kudo-images',true) ON CONFLICT (id) DO NOTHING;` + policy `kudo_images_insert_authenticated` (`FOR INSERT TO authenticated WITH CHECK (bucket_id='kudo-images')`) + `kudo_images_select_public` (`FOR SELECT TO public USING (bucket_id='kudo-images')`).

Cột và view **phải cùng file** — tách ra là mở một cửa sổ mà `is_anonymous` đã tồn tại còn view vẫn trả tên thật. Storage tách file vì rollback khác hẳn và mang bẫy chỉ nổ trên hosted.

## Related Code Files

**Tạo**: 2 file migration + `evidence/migration-transcript.md`. **Không sửa** `0006`/`0007`/`0008` (đã apply), không sửa `config.toml`, không sửa `src/**` (đó là phase 14).

## Implementation Steps

1. `supabase migration list` từ repo root — xác nhận `0001`–`0008` đã apply và `0009` là số tiếp theo.
2. Viết `0009_kudos_write_anonymity.sql` theo đúng 3 bước § Architecture, mỗi khối một comment nói *vì sao*, theo văn phong doc-comment của `0006`/`0007`.
3. Viết `0010_kudo_images_bucket.sql`. **TUYỆT ĐỐI KHÔNG** `ALTER TABLE storage.objects ENABLE/FORCE ROW LEVEL SECURITY` — local `postgres` là owner nên câu đó chạy được ở đây rồi vỡ trên hosted (`must be owner of table objects`); ghi cảnh báo này thành comment ngay trong file.
4. `supabase migration up` (**không** `db reset` — `auth.users` đang giữ phiên thật).
5. Verify bằng `psql`, ghi output thật vào `evidence/migration-transcript.md`:
   - `\d public.kudos` có 2 cột mới, `is_anonymous` `NOT NULL DEFAULT false`.
   - `SELECT count(*) FROM public.kudos_cards WHERE sender_full_name IS NOT NULL;` **không đổi** so với trước (mọi seed row `is_anonymous = false`).
   - Chèn thử 1 hàng `is_anonymous = true, anonymous_name = 'Một Sunner'` bằng role `postgres`, rồi `SELECT sender_id, sender_full_name FROM kudos_cards WHERE id = …` → phải ra `NULL` + `'Một Sunner'`. **Xoá hàng thử sau khi verify.**
   - `SELECT polname FROM pg_policies WHERE tablename IN ('kudos','objects');` liệt kê 3 policy mới.
   - `SELECT id, public FROM storage.buckets;` → `kudo-images | t`.
6. `pnpm exec playwright test tests/e2e/kudos.spec.ts --grep "@local-db"` — chứng minh hợp đồng F007 không đổi hành vi.

## Todo List

- [ ] `supabase migration list` xác nhận 0009 là số kế tiếp
- [ ] `0009`: 2 cột → view `CASE WHEN` (5 cột sender) → policy INSERT + GRANT, đúng thứ tự đó
- [ ] `0010`: bucket + 2 policy, **không** `ALTER TABLE storage.objects`
- [ ] `supabase migration up` (không `db reset`)
- [ ] 5 lệnh verify + output thật trong `evidence/migration-transcript.md`, hàng thử đã xoá
- [ ] `kudos.spec.ts --grep "@local-db"` vẫn xanh
- [ ] `pnpm format:check`

## Success Criteria

- Cả 2 migration apply sạch trên instance đang chạy, không cần reset.
- Với dữ liệu hiện có, output view `kudos_cards` **giống hệt** trước migration (mọi row `is_anonymous = false`) → hợp đồng F007 không hồi quy.
- Hàng `is_anonymous = true` trả `sender_id IS NULL` và `sender_full_name = anonymous_name` — có transcript làm bằng.
- Danh sách cột của view khớp `CARD_COLUMNS` (`kudos-cards-query.ts:48`) từng chữ: không thêm, không bớt, không đổi thứ tự.
- Không có câu `ALTER TABLE storage.objects` nào trong repo: `grep -rn "storage.objects" supabase/migrations/` chỉ ra `CREATE POLICY`.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| `CREATE OR REPLACE VIEW` đổi tên/thứ tự cột → Postgres từ chối, hoặc DAL đọc lệch | TB | Cao | Chép nguyên list `0006:82-101`, chỉ bọc `CASE`; Success Criteria đối chiếu với `CARD_COLUMNS` |
| Copy pattern `ALTER TABLE … ENABLE RLS` sang `storage.objects` | Cao | Cao — local xanh, hosted vỡ | Bước 3 cấm thẳng + comment cảnh báo trong file |
| Quên `GRANT INSERT` → RLS đúng nhưng vẫn `permission denied` | TB | Cao — phase 06 debug sai chỗ | Nằm trong cùng bước 3 với `CREATE POLICY` |
| Bỏ sót `sender_id` khi bọc `CASE` (chỉ ẩn tên) | TB | **Nghiêm trọng** — join `profile_cards` là lấy lại tên thật | Bước 5 verify đúng cột `sender_id IS NULL` |
| Hàng thử `is_anonymous=true` bị bỏ lại trong DB | TB | TB — C23/C25 đếm sai thẻ | Todo ghi rõ "hàng thử đã xoá" |

## Security Considerations

Đây là phase mang toàn bộ trọng lượng bảo mật của feature. Ba điều không được nhân nhượng: (1) view phải bịt `sender_id` — ẩn tên mà giữ id là ẩn danh giả, vì `profile_cards` cho `authenticated` tra ngược ra tên; (2) `WITH CHECK (sender_id = auth.uid())` là thứ duy nhất chặn một REST request tự đặt `sender_id` của người khác — không phải UI; (3) **không** thêm policy `UPDATE`/`DELETE` trên `kudos`: không spec, không TC, không design nào đòi, thêm là fabricate quyền. `sender_id` thật vẫn nằm trong bảng `kudos` cho RLS và audit — chỉ view là chỗ che.

## Next Steps

Mở khoá phase 06 (action ghi + upload) và phase 14 (DAL/thẻ đọc shape mới).
