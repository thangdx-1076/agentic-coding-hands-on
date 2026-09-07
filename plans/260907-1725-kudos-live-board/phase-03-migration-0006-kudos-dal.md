---
phase: 03
feature: F007
track: B
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "supabase/migrations/0006_kudos.sql",
    "src/dal/kudos.ts",
    "src/dal/kudos.test.ts",
    "src/dal/kudos-client.ts",
    "src/dal/kudos-client.test.ts",
  ]
---

# Phase 03 — Migration `0006_kudos.sql` + view `kudos_cards` + DAL

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_B.3_KUDO - Highlight` `2940:13465` · `mms_C.3_KUDO Post` `3127:21871` — hình dạng dữ liệu 1 thẻ
  - `mms_C.3.3_Thông tin người nhận` `I3127:21871;256:4860` — phòng ban `CEVC10` là nguồn của cột `department`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/kudosliveboard/technical-spec.md` § 4.2 — schema dự kiến (đọc, nhưng **AD-1/AD-3 trong `plan.md` thắng** ở 2 điểm ghi bên dưới)
- `supabase/migrations/0005_profile_cards_view.sql` — khuôn RLS + REVOKE-trước-GRANT, đọc trọn comment đầu file
- `supabase/migrations/0003_awards_table.sql` — khuôn bảng public-read, `GRANT SELECT TO anon, authenticated`
- `src/dal/awards.ts` + `src/dal/profile-cards.ts` — khuôn DAL (injected client, type hẹp, fail-open)

## Overview

**Priority**: P0 · **Status**: pending · **Track B** (`implementer`, RED-first)
**Goal (1 dòng)**: Dựng bảng `kudos`, cột `users.department`, view đọc `kudos_cards`, và DAL `getKudosBoard` đọc trọn board trong một lượt.

## Out of scope

- **Không** tạo `kudo_hearts` và **không** nhắc tên bảng đó ở bất kỳ đâu trong `0006` hay `src/dal/kudos.ts` (AD-2) — F007 phải chạy được khi `0007` chưa apply.
- **Không** seed dữ liệu (phase 05 sở hữu).
- **Không** thêm policy INSERT/UPDATE/DELETE nào lên `kudos` — F007 read-only; dialog Viết Kudo đã hoãn.

## Key Insights

- **`heart_count` là cột trên `kudos`, không phải subquery** (AD-1). View `kudos_cards` sinh ở file này **không thể** tham chiếu `kudo_hearts` (sinh ở `0007`). Cột mặc định `0`; phase 04 gắn trigger duy trì nó.
- **`department` phải nullable.** `public.users` được trigger `0002` ghi vào mỗi lần đăng nhập; một cột `NOT NULL` không default sẽ làm mọi lượt signup mới gãy ngay tại trigger.
- **View lộ tên người → lặp lại đúng 3 điều của `0005`**: liệt kê cột tường minh (**không `SELECT *`**), `WITH (security_invoker = false)` viết rõ, và `REVOKE ALL ... FROM anon, PUBLIC, authenticated` **trước** `GRANT SELECT`. Supabase cấp sẵn `ALL` cho `anon`/`authenticated` trên mọi object mới trong schema `public`.
- **Khác `0005` một điểm cố ý**: `/kudos` là trang PUBLIC nên `anon` **được** GRANT SELECT — cùng lý do `0003_awards_table.sql` cấp cho `anon`.
- **`kudos_cards` là view nhiều bảng (JOIN)** nên Postgres KHÔNG coi nó auto-updatable — không có đường ghi leo thang như `profile_cards` từng có. Vẫn REVOKE ALL, vì lý do lộ đọc thì y nguyên.
- **Fail-open là bắt buộc**, không phải tuỳ chọn: `getKudosBoard` trả về một board rỗng khi Supabase chết. Đó chính là cơ chế làm 10 test CI-safe của phase 01 chạy được trong CI.

## Architecture — data flow

```text
searchParams {hashtag?, department?, cursor?}
  -> page.tsx (phase 13) -> getKudosBoard(toKudosClient(supabase), opts)
       |-- kudos_cards ORDER BY heart_count DESC, created_at DESC LIMIT 5     -> highlight
       |-- kudos_cards ORDER BY created_at DESC LIMIT 10 (keyset cursor)      -> feed
       |-- kudos       COUNT(*)                                              -> spotlightTotal
       |-- kudos_cards DISTINCT receiver_full_name                           -> spotlightNames
       |-- kudos_cards DISTINCT hashtags / departments                       -> filter options
  -> KudosBoard  (mọi nhánh lỗi -> board rỗng, không throw)
```

## Related Code Files

**Tạo**: `supabase/migrations/0006_kudos.sql`, `src/dal/kudos.ts`, `src/dal/kudos.test.ts`, `src/dal/kudos-client.ts`, `src/dal/kudos-client.test.ts`

## Implementation Steps

1. Viết test đỏ trước: `src/dal/kudos.test.ts` với client stub — 1 ca happy, 1 ca `error` → board rỗng, 1 ca `data: null` → board rỗng, 1 ca lọc `hashtag`, 1 ca lọc `department`, 1 ca cursor.
2. `0006_kudos.sql`, theo đúng thứ tự này:
   - `CREATE TABLE public.kudos (id, sender_id, receiver_id, content, hashtags text[], image_urls text[], heart_count integer NOT NULL DEFAULT 0, created_at)`; hai FK `ON DELETE CASCADE` tới `public.users(id)`.
   - `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;` *(nullable — xem Key Insights)*
   - Index cho hai đường đọc nóng: `(heart_count DESC, created_at DESC)` cho carousel, `(created_at DESC)` cho feed keyset, và **GIN** trên `hashtags` cho bộ lọc `@>`.
   - `ENABLE` + `FORCE ROW LEVEL SECURITY`; `DROP POLICY IF EXISTS` rồi `CREATE POLICY kudos_select_all FOR SELECT TO anon, authenticated USING (true)`.
   - `REVOKE ALL ON public.kudos FROM anon, PUBLIC, authenticated;` **rồi** `GRANT SELECT ... TO anon, authenticated;`
   - `CREATE OR REPLACE VIEW public.kudos_cards WITH (security_invoker = false)` — liệt kê cột tường minh, mỗi phía đúng 4 cột `users` (`id, full_name, avatar_url, department`) cộng 1 subquery `sender_kudos_received` / `receiver_kudos_received` (nguồn của BR-008).
   - `COMMENT ON VIEW` giải thích vì sao `anon` được đọc ở đây mà không được ở `profile_cards`.
   - `REVOKE ALL ON public.kudos_cards ...` rồi `GRANT SELECT ... TO anon, authenticated;`
3. Apply: `supabase migration up` từ repo root. **Không bao giờ `supabase db reset`.**
4. Verify quyền bằng SQL thật (không tin file đã viết):
   `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name IN ('kudos','kudos_cards');` → `anon` chỉ có `SELECT`, không dòng `INSERT`/`UPDATE`/`DELETE` nào cho `anon`/`authenticated`.
5. `src/dal/kudos-client.ts` — `toKudosClient()` thu hẹp `SupabaseClient` xuống đúng method dùng, mirror `toAwardsClient`.
6. `src/dal/kudos.ts` — `import "server-only";` đầu file; column list giữ literal type (không widen `string`, xem `awards.ts:37-49`); map snake_case → camelCase; **mọi** nhánh lỗi trả board rỗng.
7. `pnpm test:unit:coverage` (gate 100%) → lint → format:check → build → typecheck.

## Todo List

- [ ] `src/dal/kudos.test.ts` đỏ trước khi có `kudos.ts`
- [ ] `0006_kudos.sql` đủ 7 khối ở bước 2, REVOKE đứng trước GRANT
- [ ] `department` nullable, `IF NOT EXISTS`
- [ ] 3 index: carousel, feed keyset, GIN hashtags
- [ ] `supabase migration up` chạy sạch, chạy lại lần 2 vẫn sạch (idempotent)
- [ ] Verify grant bằng `information_schema.role_table_grants`
- [ ] `kudos-client.ts` + test
- [ ] `kudos.ts` fail-open mọi nhánh + test
- [ ] coverage 100% / lint / format / build / typecheck

## Success Criteria

- `supabase migration up` chạy **hai lần liên tiếp** đều sạch.
- Truy vấn `information_schema.role_table_grants` cho `kudos` và `kudos_cards`: `anon` và `authenticated` chỉ xuất hiện với `SELECT`.
- `SELECT * FROM public.kudos_cards LIMIT 1;` bằng anon key trả kết quả (rỗng cũng được), không lỗi permission.
- `pnpm test:unit:coverage` xanh, `src/dal/kudos.ts` và `kudos-client.ts` đạt 100%.
- `getKudosBoard` với một client stub luôn `throw` vẫn trả về board rỗng, không ném ra ngoài.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Quên REVOKE → `anon` có `INSERT/UPDATE/DELETE` trên `kudos` | Trung bình | **Nghiêm trọng** — anon key nằm sẵn trong bundle trình duyệt, ai cũng ghi được | Bước verify 4 là cửa cứng, đọc quyền thật chứ không đọc file SQL |
| `SELECT *` trong view kéo theo `email`/`role`/`locale` của `users` | Trung bình | Cao — lộ email toàn công ty cho anon | Liệt kê cột tường minh; `COMMENT ON VIEW` ghi cấm nới rộng |
| `department` lỡ tay `NOT NULL` | Thấp | Cao — trigger `0002` gãy, không ai đăng nhập được nữa | Ghi thẳng vào Todo; verify bằng một lượt signup thử sau khi apply |
| Bộ lọc hashtag quét tuần tự khi feed lớn | Thấp | Trung bình | Index GIN ngay từ đầu, dùng toán tử `@>` chứ không `ILIKE` |
| DAL ném lỗi thay vì fail-open | Trung bình | Cao — 10 test CI-safe của phase 01 đỏ trong CI | Test bước 1 có ca "client luôn throw" |

## Security Considerations

Đây là ranh giới bảo mật thật đầu tiên của F007. Ba điều bắt buộc, không được bỏ điều nào: cột tường minh (không `*`), `security_invoker = false` viết rõ ràng chứ không dựa mặc định, và REVOKE ALL trước GRANT SELECT. `anon` được đọc là **cố ý** vì trang public — nhưng đúng `SELECT`, và đúng 4 cột mỗi phía.

## Next Steps

Mở khoá phase 04 (FK + cột `heart_count`), phase 06 (`load-more-kudos` gọi DAL này), phase 05 (seed).
