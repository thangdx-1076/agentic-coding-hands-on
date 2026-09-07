---
phase: 01
feature: F004
track: B
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 0.5h
owner: implementer
file_ownership: ["~/Desktop/Claude-and-mormoph/saa-app/supabase/migrations/0003_awards_table.sql"]
---

# Phase 01 — Migration + seed bảng `public.awards`

## Context Links

- `clarifications.md` § "sử dụng supabase local" (nội dung 6 giải đọc từ DB, không nhân bản sang JSON)
- `spec/award-seed-content.md` — **nguồn nội dung DUY NHẤT**, thắng `technical-spec.md § 4.4`
- `spec/F004_AwardSystemPage/technical-spec.md` § 4.3 (DDL), § 5.2 (giả định về `anon`)
- `plans/reports/researcher-260906-2258-supabase-saa-app-schema.md` § 1, § 5, § 6

## Overview

**Priority**: P1 · **Status**: pending · **Track B**
Tạo bảng nội dung read-only đầu tiên của project trong instance Supabase local `saa-app` (`127.0.0.1:55321`), kèm 6 dòng seed `locale='vi'`. Đây là phase duy nhất chạm database và là phase duy nhất chạm file NGOÀI repo.

## Key Insights

- Project Supabase nằm **ngoài repo**: `~/Desktop/Claude-and-mormoph/saa-app`. Repo này không có và **không được mọc** thư mục `supabase/`.
- **`supabase db reset` bị CẤM tuyệt đối** — `auth.users` đang có 142 dòng thật, reset là mất sạch (report 02 § 5). Đường áp duy nhất: `supabase migration up`.
- `supabase migration new` sinh tên timestamp; **phải đổi thủ công thành `0003_awards_table.sql`** để nối tiếp `0001_users_table.sql` / `0002_handle_new_user_trigger.sql`.
- Seed nằm **trong chính migration** với `ON CONFLICT DO NOTHING`, KHÔNG tạo `supabase/seed.sql`: `config.toml` có `[db.seed] enabled = true` nhưng file seed chỉ được đọc bởi `db reset` — thứ đã bị cấm. Một `seed.sql` ở đây là code chết.
- **`/awards` là trang PUBLIC** → policy SELECT phải cấp cho **`anon` VÀ `authenticated`**, khác hẳn `users_select_own` của `0001` (dựa `auth.uid()`, trả NULL cho anon → loại sạch dòng). Khách chưa đăng nhập là người render trang này.
- `GRANT SELECT ... TO anon` là bắt buộc bên cạnh RLS: role `anon` chưa từng được xác nhận có SELECT mặc định trên schema `public` của instance này (technical-spec § 5.2). RLS mở mà thiếu GRANT thì PostgREST vẫn trả 401/permission denied.
- PK `(slug, locale)`: không entity nào FK vào bảng này, composite key vừa định danh vừa là unique constraint tự nhiên (KISS).

## Requirements

- Bảng `public.awards` đúng shape `technical-spec § 4.3`: `slug, locale, sort_order, title, description, quantity_value, quantity_unit, prize_values jsonb, created_at, updated_at`.
- `quantity_value` là **text**, không phải số — giữ nguyên leading zero (`'02'`, `'01'`) vì E2E assert đúng chuỗi đó.
- `prize_values` là mảng `{amount, note}`: 5 giải 1 phần tử, `signature-2025-creator` 2 phần tử.
- 6 dòng seed lấy **nguyên văn** từ `spec/award-seed-content.md`: giữ dấu `–` (en dash), nháy cong `“ ”`, dấu `*` trong "Sun*", và `\n\n` ở chỗ đánh dấu `[xuống dòng kép]` (`signature-2025-creator`, `mvp`).
- Chỉ seed `locale='vi'`. Không tự dịch sang `en` (ghi nợ trong `clarifications.md § Unresolved`).
- `ENABLE` + `FORCE ROW LEVEL SECURITY`; không policy INSERT/UPDATE/DELETE (default-deny).

## Architecture

```text
supabase migration up  ──►  public.awards (10 cột, PK (slug, locale))
                              ├─ RLS: awards_select_all  FOR SELECT TO anon, authenticated USING (true)
                              ├─ GRANT SELECT TO anon, authenticated
                              └─ 6 rows locale='vi', sort_order 1..6
PostgREST (:55321) ──► GET /rest/v1/awards?locale=eq.vi&order=sort_order.asc
```

## Related Code Files

**Create**: `~/Desktop/Claude-and-mormoph/saa-app/supabase/migrations/0003_awards_table.sql`
**Modify**: — · **Delete**: —
**KHÔNG tạo**: `supabase/seed.sql`, và bất kỳ thứ gì dưới `<repo>/supabase/`.

## Implementation Steps

1. `cd ~/Desktop/Claude-and-mormoph/saa-app` — mọi lệnh CLI phải chạy với cwd này (config.toml resolution).
2. `supabase migration new awards_table` → đổi tên file sinh ra thành `0003_awards_table.sql`.
3. Viết DDL theo `technical-spec § 4.3` (copy nguyên khối, kèm 2 `COMMENT ON`).
4. Viết `INSERT ... VALUES (...) ON CONFLICT (slug, locale) DO NOTHING;` với 6 dòng lấy từ `spec/award-seed-content.md` — **không** dùng khối SQL trong `technical-spec § 4.4` (khối đó chứa mô tả placeholder đã bị bác bỏ).
5. Escape SQL: nháy đơn trong text tiếng Việt phải nhân đôi; xuống dòng kép viết là `E'...\n\n...'` hoặc literal xuống dòng thật trong chuỗi.
6. `supabase migration up` — **không bao giờ** `supabase db reset`.
7. Verify bằng `supabase db query`: đếm 6 dòng, kiểm `prize_values` của `signature-2025-creator` có `jsonb_array_length = 2`.
8. Verify quyền `anon` thật sự đọc được: `curl -H "apikey: <ANON_KEY>" "http://127.0.0.1:55321/rest/v1/awards?select=slug&locale=eq.vi"` phải trả 6 dòng, không phải 401/`permission denied`.

## Todo List

- [x] Tạo `0003_awards_table.sql` (tên sequential, không timestamp)
- [x] DDL + RLS `TO anon, authenticated` + GRANT SELECT
- [x] 6 dòng seed nguyên văn từ `award-seed-content.md`, `ON CONFLICT DO NOTHING`
- [x] `supabase migration up` thành công
- [x] `supabase db query` xác nhận 6 dòng + `prize_values` đúng độ dài
- [x] `curl` bằng ANON_KEY xác nhận `anon` đọc được

## Success Criteria

- `select count(*) from public.awards where locale='vi'` = 6, `sort_order` 1..6 khớp thứ tự bảng trong `award-seed-content.md`.
- Đọc qua PostgREST bằng `ANON_KEY` (không JWT người dùng) trả đủ 6 dòng.
- `auth.users` vẫn 142 dòng sau khi áp migration.
- Repo không mọc thêm file nào (`git status` sạch).

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Ai đó gõ `supabase db reset` theo phản xạ | Trung bình | **Nghiêm trọng** — mất 142 auth user | Cấm ghi ở đầu file này, ở `plan.md`, và trong comment header của chính file migration |
| `anon` thiếu GRANT → PostgREST 401, trang luôn rỗng | Trung bình | Cao — E2E đỏ, tưởng lỗi code | Bước 8 verify bằng `curl` với ANON_KEY trước khi đóng phase |
| Escape sai nháy đơn / mất `\n\n` | Trung bình | Trung bình — nội dung lệch design | Bước 7 `db query` in ra `description` và so bằng mắt với `award-seed-content.md` |
| Áp nhầm migration timestamp rồi mới đổi tên | Thấp | Trung bình — `supabase_migrations.schema_migrations` ghi version cũ | Đổi tên TRƯỚC khi chạy `migration up` |

## Security Considerations

- Bảng chỉ đọc: không có policy INSERT/UPDATE/DELETE → default-deny, `anon` không thể ghi.
- `FORCE ROW LEVEL SECURITY` để chủ bảng cũng không bypass được.
- Nội dung là marketing công khai, không có PII → mở cho `anon` là đúng phân loại dữ liệu (`spec/system/permissions.md`).
- **Không** commit `ANON_KEY`/`SERVICE_ROLE_KEY` vào repo hay vào plan; lấy tại chỗ bằng `supabase status -o env`.

## Next Steps

Không phase nào trong repo *chặn* bởi phase này lúc code (03 test bằng client giả lập, 05/06 fail-open `[]`). Nhưng **phase 07 không thể GREEN** nhóm `@local-db` nếu 01 chưa xong. Chạy 01 song song với 02/03/04.
