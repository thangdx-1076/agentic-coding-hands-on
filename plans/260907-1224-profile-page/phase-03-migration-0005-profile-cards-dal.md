---
phase: 03
feature: F006
track: B
status: completed
priority: P1
effort: 1.25h
owner: implementer
file_ownership:
  [
    "supabase/migrations/0005_profile_cards_view.sql",
    "src/dal/profile-cards.ts",
    "src/dal/profile-cards.test.ts",
    "src/dal/profile-cards-client.ts",
    "src/dal/profile-cards-client.test.ts",
  ]
---

# Phase 03 — Migration `0005` `profile_cards` + DAL + unit test

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 3.1 **BE** — contract của view + DAL (pseudocode)
- `spec/F006_ProfilePage/functional-spec.md` § 11 RISK-03 — "sai 1 chỗ sẽ lộ toàn bộ `public.users`"
- `spec/system/permissions.md` § "[F006 draft]" trong Access Boundaries — ranh giới đọc THỨ 2 của hệ
- `clarifications.md` § Decisions taken — vì sao view, không phải RLS policy, không phải column GRANT
- `supabase/migrations/0001_users_table.sql` — `FORCE ROW LEVEL SECURITY`, `users_select_own`
- `supabase/migrations/0003_awards_table.sql` — house style: header comment, cấm `db reset`, re-runnable
- `src/dal/awards.ts` + `src/dal/awards.test.ts` — khuôn DAL + khuôn test phải mirror
- `src/dal/users-role-client.ts` — khuôn narrow-client shim (tránh TS2589)

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Tạo view `public.profile_cards` phơi **đúng 3 cột** cho `authenticated` (và **không** cho `anon`), cùng DAL `getProfileCard` fail-open `null` có unit test 100%.

## Out of scope

- Không bảng `kudos`, không cột `department`/tier/stars, không seed dữ liệu.
- Không sửa `0001`-`0004`, không đụng policy của `public.users`.
- Không viết `page.tsx` hay component nào — DAL chưa có consumer khi phase này đóng, đó là chủ đích.

## Key Insights

- **Đây là ranh giới bảo mật thật DUY NHẤT mà F006 thêm vào hệ.** Mọi thứ khác của feature là render tĩnh. Ba điều bắt buộc, mỗi cái tương ứng một dòng risk bên dưới:
  1. **Liệt kê cột tường minh, TUYỆT ĐỐI không `SELECT *`.** `SELECT *` nghĩa là ngày ai đó thêm cột nhạy cảm vào `public.users`, view tự động phơi nó ra — leak không cần ai sửa file này.
  2. **`WITH (security_invoker = false)` viết rõ.** Đúng là mặc định của Postgres, nhưng viết ra thì ý định kiểm toán được và một lần đổi mặc định trong tương lai không lật ngầm ngữ nghĩa. Đọc kèm: `public.users` có `FORCE ROW LEVEL SECURITY`, nên chỉ owner có `BYPASSRLS` (role chạy migration) mới đọc được toàn bảng qua view này.
  3. **`REVOKE ALL ON public.profile_cards FROM anon, PUBLIC;` trước khi GRANT.** Supabase đặt sẵn default privileges cấp quyền cho `anon` và `authenticated` trên object mới trong schema `public` — **không revoke là view tự động đọc được bằng anon key**, tức tên + avatar của toàn bộ nhân viên phơi ra ngoài. Đây là nguy cơ nghiêm trọng nhất của cả plan và nó xảy ra do **không làm gì**, chứ không do làm sai.
- **Supabase database linter sẽ cảnh báo `security_definer_view`.** Cảnh báo đó đúng về mặt tổng quát và **sai trong ca này** — đó chính là cơ chế được chọn có chủ đích (`clarifications.md` § D002). Viết lý do vào `COMMENT ON VIEW` để người sau không "sửa" nó thành `security_invoker = true` rồi làm `?id=` chết câm.
- **Fail-open `null`, không `[]`.** Khác `getAwards` (danh sách → `[]`): ở đây `null` được `page.tsx` biến thành `notFound()`. Hệ quả chấp nhận được và phải ghi vào comment: lỗi mạng thoáng qua và hồ sơ thật sự không tồn tại cho **cùng một kết quả quan sát được** — cả hai đều là "không có gì để hiển thị", không phải một quyết định phân quyền.
- **`select()` phải là literal type, không `string`.** Bài học nguyên văn từ `awards.ts`: postgrest builder parse chuỗi cột ở **tầng type** để suy ra shape hàng; widen thành `string` là gặp TS2322. Khai `type ProfileCardColumns = "id,full_name,avatar_url"`.
- **Cần shim `toProfileCardsClient`** như `users-role-client.ts`: so khớp cấu trúc cả client thật với type hẹp gây TS2589 ("type instantiation is excessively deep"). Re-issue chuỗi gọi qua arrow có type tường minh, **không** `as unknown as`.
- **Migration chạy bằng `supabase migration up`, KHÔNG BAO GIỜ `db reset`** — `auth.users` giữ sign-in thật (header `0003` đã ghi cấm này). File phải re-runnable: `CREATE OR REPLACE VIEW`.
- **Unit test không cần Supabase.** `getProfileCard` nhận client injected → stub `.from().select().eq().maybeSingle()`, y hệt `awards.test.ts`. Gate 100% áp cho `src/dal/**/*.ts` nên **mọi nhánh** phải có test: happy, `error`, `data: null`, throw.

## Requirements

- `public.profile_cards` phơi đúng `id uuid`, `full_name text`, `avatar_url text` — **không** `email`, **không** `role`, **không** `locale`.
- `authenticated` SELECT được; `anon` và `PUBLIC` **không**.
- View re-runnable (`CREATE OR REPLACE`), có `COMMENT ON VIEW` giải thích lựa chọn definer.
- `getProfileCard(client, id): Promise<ProfileCard | null>` — fail-open `null` ở cả 3 nhánh lỗi, **không bao giờ throw**.
- `ProfileCard = { id: string; fullName: string | null; avatarUrl: string | null }` (camelCase ở biên DAL, đúng nếp `Award`).
- Coverage 100% cho cả `profile-cards.ts` và `profile-cards-client.ts`.

## Architecture

```text
supabase/migrations/0005_profile_cards_view.sql
  CREATE OR REPLACE VIEW public.profile_cards
    WITH (security_invoker = false)          ← chạy quyền OWNER (BYPASSRLS)
    AS SELECT id, full_name, avatar_url      ← 3 cột, tường minh, không SELECT *
       FROM public.users;
  COMMENT ON VIEW ...                        ← vì sao definer, vì sao không policy
  REVOKE ALL ON public.profile_cards FROM anon, PUBLIC;   ← TRƯỚC grant
  GRANT SELECT ON public.profile_cards TO authenticated;

src/dal/profile-cards.ts          (server-only)
  type ProfileCard · type ProfileCardColumns (literal) · type ProfileCardsClient (hẹp)
  getProfileCard(supabase, id) → maybeSingle() → map snake→camel → null on error/throw

src/dal/profile-cards-client.ts   (server-only)
  toProfileCardsClient(serverClient): ProfileCardsClient   ← shim chống TS2589

src/dal/profile-cards.test.ts     stub client, 4 nhánh
src/dal/profile-cards-client.test.ts  chuỗi gọi được chuyển tiếp đúng
```

## Implementation Steps

1. Đọc `0003_awards_table.sql` lấy house style header comment (nguồn, lý do, cấm `db reset`).
2. Viết `0005_profile_cards_view.sql` theo Architecture. Thứ tự **REVOKE trước GRANT** — không đảo.
3. Áp dụng: `supabase migration up` (từ repo root). **Không** `db reset`.
4. **Chứng minh ranh giới bằng truy vấn thật, không bằng đọc file**:
   - `supabase db query "select column_name from information_schema.columns where table_name='profile_cards'"` → đúng 3 tên, không có `email`/`role`.
   - `supabase db query "select grantee, privilege_type from information_schema.role_table_grants where table_name='profile_cards'"` → có `authenticated`, **không** có `anon`.
   - Gọi PostgREST bằng anon key: `curl -s "$SUPABASE_URL/rest/v1/profile_cards?select=*" -H "apikey: $ANON_KEY"` → phải bị từ chối, **không** trả hàng nào.
5. Viết `profile-cards.ts` mirror `awards.ts` 1:1 về hình dạng (literal columns type, narrow client type, try/catch fail-open), khác ở chỗ trả `null` và dùng `maybeSingle()`.
6. Viết `profile-cards-client.ts` mirror `users-role-client.ts`.
7. Viết 2 file test mirror `awards.test.ts`: stub client thuần, không network. Nhánh bắt buộc: `data` hợp lệ · `error` khác null · `data: null` · `maybeSingle` throw · (client shim) chuỗi gọi chuyển tiếp đúng bảng/cột/id.
8. `pnpm test:unit:coverage` → 100% cho 2 file mới. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`.

## Todo List

- [ ] `0005_profile_cards_view.sql` — 3 cột tường minh, `security_invoker = false` viết rõ, `COMMENT ON VIEW`
- [ ] REVOKE `anon`, `PUBLIC` **trước** GRANT `authenticated`
- [ ] `supabase migration up` (KHÔNG `db reset`)
- [ ] Verify cột bằng `information_schema.columns`
- [ ] Verify grant bằng `information_schema.role_table_grants`
- [ ] Verify anon key **không** đọc được view (curl)
- [ ] `profile-cards.ts` — literal columns type, narrow client, fail-open `null`
- [ ] `profile-cards-client.ts` — shim chống TS2589
- [ ] 2 file test, phủ 4 nhánh + chuyển tiếp
- [ ] Gate: coverage 100% · lint · format · build · typecheck

## Success Criteria

- 3 lệnh verify ở bước 4 cho đúng kết quả mong đợi, **ghi output vào `evidence/`**.
- `pnpm test:unit:coverage` xanh, `profile-cards.ts` và `profile-cards-client.ts` đạt 100% cả 4 chỉ số.
- `grep -n "select \*\|SELECT \*" supabase/migrations/0005_profile_cards_view.sql` → **rỗng**.
- `grep -n "email\|role" supabase/migrations/0005_profile_cards_view.sql` → chỉ khớp trong comment giải thích, không trong câu `SELECT`.
- `pnpm build` + `pnpm typecheck` xanh; không file nào >200 dòng.
- Không file nào ngoài `file_ownership` bị chạm.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| **Quên REVOKE `anon`** → default privileges của Supabase phơi tên+avatar toàn công ty ra anon key | **Cao** (xảy ra do KHÔNG làm gì) | **Rất cao** — leak PII diện rộng | REVOKE là 1 dòng trong Todo; verify bằng curl anon key ở bước 4; e2e C16 là lưới thứ 2 |
| `SELECT *` thay vì 3 cột → cột nhạy cảm tương lai tự động lộ | Trung bình | **Rất cao** | Success Criteria grep `SELECT *` phải rỗng; `COMMENT ON VIEW` nói rõ lý do |
| Ai đó "sửa" thành `security_invoker = true` theo cảnh báo linter → `?id=` chết câm (RLS own-row chặn) | Trung bình | Cao — feature hỏng, khó chẩn | Viết lý do vào `COMMENT ON VIEW` ngay tại chỗ; ghi vào success criteria của phase 08 |
| `supabase db reset` để "cho sạch" | Thấp | **Rất cao** — mất `auth.users` thật | Header migration + Todo cấm; chỉ `migration up` |
| TS2322 do widen `select()` thành `string` | **Cao** | Trung bình | Literal type `ProfileCardColumns`, đúng bài học `awards.ts` |
| TS2589 khi truyền thẳng client thật | **Cao** | Trung bình | Shim `toProfileCardsClient` mirror `users-role-client.ts`, **không** `as unknown as` |
| Fail-open nhầm sang `[]`/throw thay vì `null` | Trung bình | Cao — `page.tsx` 500 thay vì 404 | Contract ghi rõ ở Requirements; test nhánh throw là bắt buộc |
| Coverage <100% vì thiếu nhánh throw | Trung bình | Trung bình — CI đỏ | 4 nhánh liệt kê tường minh ở bước 7 |

## Security Considerations

- ✅ **View này KHÔNG chứa `email`, `role`, `locale`, `created_at`, `updated_at`** — chỉ `id`, `full_name`, `avatar_url` (3 cột tường minh). Đây là câu chốt của SEC_004.
- ✅ `anon` KHÔNG có quyền trên view (verify bằng curl anon key).
- ✅ `authenticated` chỉ có `SELECT` (không INSERT/UPDATE/DELETE).
- **Escalation fixed**: Plan chỉ liệt kê `REVOKE ALL ... FROM anon, PUBLIC`. Supabase default privileges cũng cấp `authenticated` INSERT/UPDATE/DELETE trên new `public` objects. Vì `profile_cards` là auto-updatable single-table view với BYPASSRLS owner, authenticated Sunner có thể ghi đè `full_name`/`avatar_url` của bất kỳ Sunner khác (vượt qua `users_update_own`). **Fixed**: REVOKE mở rộng thành `REVOKE ALL ON public.profile_cards FROM anon, PUBLIC, authenticated`, rồi `GRANT SELECT` chỉ cho `authenticated`.
- Không tạo policy mới trên `public.users` — RLS own-row (`users_select_own`) giữ nguyên.
- DAL `import "server-only"` — chỉ Server Component read được, không lộ sang bundle client.
- Không secret vào migration/test; test dùng stub thuần.

## Next Steps

Mở khoá phase 07 (integration). Chạy song song được với phase 02 và 04. Phase 08 phải xác nhận migration đã áp dụng trước khi chạy GREEN.
