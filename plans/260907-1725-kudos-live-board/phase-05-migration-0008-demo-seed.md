---
phase: 05
feature: F007, F008
track: B
status: pending
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: implementer
file_ownership:
  [
    "supabase/migrations/0008_kudos_demo_seed.sql",
    "plans/260907-1725-kudos-live-board/evidence/seed-transcript.md",
  ]
---

# Phase 05 — Migration `0008_kudos_demo_seed.sql`: 8 Sunner + kudos chép từ Figma

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - Ảnh frame: `momorph/frame-image-url.txt` — **nguồn nội dung có thẩm quyền**
  - `mms_B.7_Spotlight` `2940:14174` (tên) · `mms_B.7.1_388 KUDOS` `3007:17482` (tổng) · `mms_C.3_KUDO Post` `3127:21871` (nội dung 1 thẻ) · `mms_D.3.2` `2940:13516` (tên nhận quà)
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md` § "Dữ liệu mock lấy từ đâu"
- testPolicy: `e2e-red-first`

## Context Links

- `supabase/migrations/0001_users_table.sql:9` — `public.users.id` **REFERENCES `auth.users(id)`**, đây là ràng buộc chi phối cả phase
- `supabase/migrations/0002_handle_new_user_trigger.sql` — trigger mirror, đọc `raw_user_meta_data->>'full_name'` và `->>'avatar_url'`
- `supabase/migrations/0004_awards_en_seed.sql` — tiền lệ duy nhất của repo về seed bằng migration
- `phase-01-red-e2e-kudos-contract.md` C11, C20 — số liệu seed phải làm hai test đó thoả được

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Đưa 8 Sunner và tập kudos chép nguyên văn từ frame Figma vào DB, đủ để carousel top-5, bộ lọc, phân trang feed và tổng Spotlight đều là dữ liệu thật.

## Out of scope

- **Không** sửa `0006` hay `0007`.
- **Không** bịa tên, nội dung lời cảm ơn, hashtag hay con số nào — luật MoMorph: *"Use Figma design content as mock data source. Do NOT invent data."*
- **Không** đụng 199 `auth.users` đang có. Chỉ INSERT hàng mới với UUID cố định và `ON CONFLICT DO NOTHING`.

## Key Insights

- **Không seed thẳng `public.users` được.** Cột `id` là FK tới `auth.users(id)`. Phải INSERT `auth.users` trước rồi để trigger `0002` mirror sang — đúng con đường mà mọi lượt đăng nhập thật vẫn đi.
- **`auth.users` chỉ có 3 cột NOT NULL: `id`, `is_sso_user`, `is_anonymous`** — hai cột sau có DEFAULT (đã verify trên instance đang chạy). Một INSERT `(id, email, raw_user_meta_data)` là đủ để trigger chạy. `public.users.email` NOT NULL UNIQUE nên `email` bắt buộc phải có.
- **`department` phải UPDATE sau khi trigger chạy** — trigger `0002` không biết cột đó. Thứ tự: INSERT `auth.users` → trigger tạo `public.users` → `UPDATE public.users SET department = ...`.
- **Đừng seed `heart_count` bằng tay.** Seed hàng `kudo_hearts` thật và để trigger phase 04 tính. Đó vừa là dữ liệu đúng, vừa là phép kiểm tra trigger sống trên dữ liệu thật.
- **Seed phải tôn trọng BR-002**: không hàng `kudo_hearts` nào có `user_id = kudos.sender_id`, nếu không chính policy của phase 04 sẽ chặn ngay khi apply.
- **192/199 `auth.users` hiện tại là rác e2e với `full_name` NULL.** Mọi truy vấn của F007 đi qua JOIN với `kudos` nên không chạm tới chúng — nhưng đừng bao giờ viết một truy vấn quét thẳng `users` cho Spotlight hay leaderboard.

## Architecture — thứ tự bắt buộc

```text
INSERT auth.users (8 hàng, uuid cố định, ON CONFLICT DO NOTHING)
   -> TRIGGER on_auth_user_created  -> public.users (id, email, full_name, avatar_url)
UPDATE public.users SET department = ...   (8 hàng)
INSERT public.kudos (>= 12 hàng, uuid cố định)     -- đủ để feed phân trang qua trang 1
INSERT public.kudo_hearts (phân bổ lệch nhau)      -- -> TRIGGER sync_kudo_heart_count -> heart_count
```

## Related Code Files

**Tạo**: `supabase/migrations/0008_kudos_demo_seed.sql`, `plans/260907-1725-kudos-live-board/evidence/seed-transcript.md`

## Implementation Steps

1. Tải ảnh frame và **đọc bằng Read** (không suy diễn từ tên layer):
   `curl -sL "$(cat plans/260907-1725-kudos-live-board/momorph/frame-image-url.txt)" -o plans/260907-1725-kudos-live-board/momorph/frame-image.png`
2. Chép nguyên văn vào `evidence/seed-transcript.md` **trước khi viết SQL**: 8 họ tên, phòng ban thấy được (design hiện `CEVC10`), mỗi nội dung lời cảm ơn đọc được, mọi hashtag, mốc thời gian `10:00 - 10/30/2025`, tổng `388 KUDOS`, và các số sidebar. Ô nào ảnh không đọc rõ thì ghi `KHÔNG ĐỌC ĐƯỢC` — **không** điền bừa.
   Tên đã chốt sẵn trong `clarifications.md`: `Đỗ hoàng Hiệp`, `Dương thúy An`, `Mai phương Thúy`, `Lê Kiều Trang`, `Nguyễn Văn Quy`, `Nguyễn Bá Chức`, `Nguyễn Hoàng Linh`, cộng `Huỳnh Dương Xuân` ở `mms_D.3.2`. Giữ nguyên hoa/thường như design.
3. Email demo dùng domain riêng nhận diện được: `<slug>@kudos-demo.saa`. Một dòng lệnh xoá sạch được toàn bộ phase này khi rollback.
4. Viết `0008_kudos_demo_seed.sql` theo đúng thứ tự ở § Architecture. Mọi INSERT kèm `ON CONFLICT DO NOTHING`; UUID viết cứng (không `gen_random_uuid()`) để migration idempotent.
5. Phân bổ `kudo_hearts` sao cho **5 kudo dẫn đầu tách bạch nhau về số tim** — hoà điểm sẽ làm C11/C12 flaky vì tie-break `created_at` chưa có TC nào xác nhận (technical-spec § 5.2).
6. Đầu file ghi comment: đây là dữ liệu demo, nguồn là frame `2940:13431`, và cách gỡ (`DELETE FROM auth.users WHERE email LIKE '%@kudos-demo.saa'` cascade sạch mọi thứ).
7. `supabase migration up`, rồi chạy lại lần hai. **Không bao giờ `db reset`.**
8. Verify: `SELECT count(*) FROM kudos;` khớp với con số mà C20 sẽ assert · `heart_count` khớp `count(*)` trên `kudo_hearts` từng hàng · `SELECT DISTINCT unnest(hashtags) FROM kudos;` cho ít nhất 2 tag để C14 có cái để lọc · `SELECT DISTINCT department FROM users WHERE department IS NOT NULL;` cho ít nhất 2 phòng ban cho C15.

## Todo List

- [ ] Tải + đọc `frame-image.png` bằng Read
- [ ] `evidence/seed-transcript.md` chép nguyên văn, đánh dấu ô không đọc được
- [ ] 8 hàng `auth.users`, uuid cố định, domain `@kudos-demo.saa`
- [ ] `UPDATE public.users SET department` sau khi trigger chạy
- [ ] ≥12 hàng `kudos`, ≥2 hashtag phân biệt, ≥2 phòng ban phân biệt
- [ ] `kudo_hearts` không vi phạm BR-002, top-5 tách bạch số tim
- [ ] `supabase migration up` hai lần đều sạch
- [ ] 4 phép verify bước 8
- [ ] lint / format:check / build / typecheck

## Success Criteria

- `SELECT count(*) FROM public.users WHERE email LIKE '%@kudos-demo.saa';` trả đúng `8`, và cả 8 hàng có `full_name` **khác NULL** (chứng minh trigger đã đọc được `raw_user_meta_data`).
- Mọi hàng `kudos`: `heart_count` = `count(*)` hàng `kudo_hearts` tương ứng.
- 5 kudo nhiều tim nhất có 5 giá trị `heart_count` **đôi một khác nhau**.
- `evidence/seed-transcript.md` không chứa một tên/nội dung/con số nào không xuất hiện trong ảnh frame hoặc `clarifications.md`.
- Đăng nhập thật (Google) vẫn chạy sau khi apply — trigger `0002` không bị seed làm hỏng.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Bịa tên/nội dung vì ảnh mờ | Cao | Cao — vi phạm thẳng luật MoMorph và acceptance criterion #15 | Bước 2 bắt ghi `KHÔNG ĐỌC ĐƯỢC`; thà ít hàng còn hơn hàng bịa |
| Ghi vào `auth.users` làm hỏng phiên đăng nhập thật | Thấp | **Nghiêm trọng** — 199 phiên thật đang nằm đó | UUID cố định + `ON CONFLICT DO NOTHING` + domain riêng; tuyệt đối không `UPDATE`/`DELETE` hàng có sẵn |
| Ai đó chạy `supabase db reset` để "seed lại cho sạch" | Trung bình | **Nghiêm trọng** — mất toàn bộ đăng nhập thật | Comment cảnh báo ngay đầu file, cùng chữ đã dùng ở `0003`/`0005` |
| Top-5 hoà điểm tim | Trung bình | Trung bình — C11/C12 flaky | Bước 5 + Success Criteria "đôi một khác nhau" |
| Seed vi phạm `WITH CHECK` của `0007` → migration gãy giữa chừng | Trung bình | Trung bình | Kiểm `user_id <> sender_id` khi soạn dữ liệu, không đợi Postgres báo |

## Security Considerations

Đây là migration duy nhất trong repo chạm schema `auth`. Chỉ INSERT, không bao giờ UPDATE/DELETE hàng có sẵn. 8 tài khoản demo không có `encrypted_password` và không có hàng `auth.identities` → **không đăng nhập được**, chúng chỉ tồn tại làm chủ sở hữu dữ liệu hiển thị. Không seed email thật của người thật.

## Next Steps

Làm cho 11 test `@local-db` của phase 01 trở nên chạy được. Không phase nào phụ thuộc phase này về mặt code — nó chỉ cấp dữ liệu.
