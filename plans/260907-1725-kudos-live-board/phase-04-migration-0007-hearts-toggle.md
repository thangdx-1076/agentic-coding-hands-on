---
phase: 04
feature: F008
track: B
status: pending
priority: P1
test_policy: e2e-red-first
effort: 1.25h
owner: implementer
file_ownership:
  [
    "supabase/migrations/0007_kudo_hearts.sql",
    "src/dal/kudo-hearts.ts",
    "src/dal/kudo-hearts.test.ts",
    "src/dal/kudo-hearts-client.ts",
    "src/dal/kudo-hearts-client.test.ts",
    "src/app/(public)/kudos/_actions/toggle-kudo-heart.ts",
    "src/app/(public)/kudos/_actions/toggle-kudo-heart.test.ts",
  ]
---

# Phase 04 — Migration `0007_kudo_hearts.sql` + trigger + `toggleKudoHeart`

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_C.4.1_Hearts` `I3127:21871;256:5175` — nguồn duy nhất của cả 4 quy tắc tim
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md` § "Lượt tim cộng vào tài khoản NGƯỜI GỬI"
- testPolicy: `e2e-red-first`

## Context Links

- `spec/kudosheartreaction/technical-spec.md` § 3.1 (A1), § 4.2 (schema), § 4.4 (A0/FR-601)
- `supabase/migrations/0002_handle_new_user_trigger.sql` — khuôn `SECURITY DEFINER` + `SET search_path` duy nhất đang có trong repo
- `phase-03-migration-0006-kudos-dal.md` — `kudos.heart_count` và `kudos.sender_id` do phase đó định nghĩa
- `src/app/_actions/` — khuôn Server Action của repo

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`, RED-first)
**Goal (1 dòng)**: Bảng `kudo_hearts` với cả ba quy tắc tim được Postgres tự bảo vệ, một trigger giữ `kudos.heart_count` luôn đúng, và một Server Action là con đường ghi duy nhất.

## Out of scope

- **Không** render gì cả — nút tim là JSX của Track A (phase 07 sở hữu `kudos-heart-button.tsx`). Phase này chỉ định nghĩa **giá trị đúng** của trạng thái nút.
- **Không** implement quy tắc "+2 tim ngày đặc biệt" — cột `special` tạo sẵn, luôn `false`, không có màn admin nào đặt nó.
- **Không** sửa `0006_kudos.sql` (thuộc phase 03) hay `src/dal/kudos.ts`.

## Key Insights

- **Trigger, không phải hai câu lệnh trong Server Action** (AD-1). `authenticated` không được và sẽ không được cấp `UPDATE` trên `kudos` — cấp là mở đường cho bất kỳ ai đặt số tim tuỳ ý. Trigger `SECURITY DEFINER` chạy được vì role `postgres` có `rolbypassrls = true` — **đã verify** trên `supabase_db_saa-app`, không phải giả định. Xác nhận lại một lần trước khi viết: `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;`
- **Trigger cộng theo `CASE WHEN special THEN 2 ELSE 1 END` ngay từ bây giờ.** Không phải xây trước cho tương lai — đó là một biểu thức, và nó khiến quy tắc ngày đặc biệt sau này không cần migrate lại đúng như clarifications đã hứa.
- **Tim cộng cho NGƯỜI GỬI, không phải người nhận.** Design tự mâu thuẫn; TC `Like on special day` viết *"the sender's account receives +2 hearts"* và luật kế thừa F004/F005 là **TC thắng khi xung đột**. `heart_count` là số của **kudo**; "Số tim bạn nhận được" ở sidebar là `SUM(heart_count)` trên các kudo mà viewer là `sender_id` — không cần một bộ đếm nào trên `users`.
- **BR-002 nằm trong `WITH CHECK`, không nằm ở nút disabled.** `user_id <> (SELECT sender_id FROM public.kudos WHERE id = kudo_id)`. Gọi thẳng Server Action bỏ qua UI vẫn bị DB chặn.
- **Race hai lần bấm liên tiếp do `UNIQUE (kudo_id, user_id)` phân xử**, không do khoá phía ứng dụng. Action bắt riêng mã lỗi `23505` và đọc lại trạng thái thay vì ném lỗi ra người dùng.
- **`kudo_hearts` cần `GRANT SELECT` cho `anon`** — thẻ Kudos hiển thị cho khách vãng lai vẫn phải đếm được tim. Nhưng `INSERT`/`DELETE` chỉ cho `authenticated`.

## Architecture — data flow

```text
click tim -> toggleKudoHeart(kudoId)   [Server Action, "use server"]
   -> getCurrentUser()  ; chưa đăng nhập -> trả {ok:false, reason:"unauthenticated"}, KHÔNG ghi
   -> SELECT id FROM kudo_hearts WHERE kudo_id=? AND user_id=auth.uid()
        có  -> DELETE  --+
        không-> INSERT --+--> TRIGGER sync_kudo_heart_count()  -> UPDATE kudos.heart_count ±(1|2)
   -> revalidatePath("/kudos")
   -> trả {ok:true, hearted, heartCount}
```

## Related Code Files

**Tạo**: `supabase/migrations/0007_kudo_hearts.sql`, `src/dal/kudo-hearts.ts(+test)`, `src/dal/kudo-hearts-client.ts(+test)`, `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts(+test)`

## Implementation Steps

1. Test đỏ trước cho action: chưa đăng nhập → không ghi · chưa có row → INSERT · đã có row → DELETE · lỗi `23505` → đọc lại, không ném · lỗi RLS → `{ok:false}` chứ không throw.
2. `0007_kudo_hearts.sql`:
   - `CREATE TABLE public.kudo_hearts (id, kudo_id → kudos(id) CASCADE, user_id → users(id) CASCADE, special boolean NOT NULL DEFAULT false, created_at, UNIQUE (kudo_id, user_id))`.
   - Index `(user_id)` — đường đọc "kudo nào viewer đã thả tim" chạy mỗi lần render trang.
   - `ENABLE` + `FORCE ROW LEVEL SECURITY`.
   - `REVOKE ALL ON public.kudo_hearts FROM anon, PUBLIC, authenticated;` **trước mọi GRANT**.
   - `GRANT SELECT TO anon, authenticated` + policy `kudo_hearts_select_all USING (true)`.
   - `GRANT INSERT TO authenticated` + policy `kudo_hearts_insert_own` với `WITH CHECK (user_id = auth.uid() AND user_id <> (SELECT sender_id FROM public.kudos WHERE id = kudo_id))`.
   - `GRANT DELETE TO authenticated` + policy `kudo_hearts_delete_own USING (user_id = auth.uid())`.
   - Hàm `public.sync_kudo_heart_count()` — `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`; `AFTER INSERT` cộng, `AFTER DELETE` trừ, đúng `CASE WHEN special THEN 2 ELSE 1 END`.
   - `DROP TRIGGER IF EXISTS` rồi `CREATE TRIGGER on_kudo_heart_change AFTER INSERT OR DELETE ON public.kudo_hearts FOR EACH ROW EXECUTE FUNCTION public.sync_kudo_heart_count();`
3. Apply `supabase migration up`; chạy lại lần hai để chứng minh idempotent.
4. **Verify RLS bằng tay, không tin file SQL** — dùng anon key và một session thật:
   - anon `INSERT` → bị từ chối.
   - sender tự thả tim kudo của mình → bị từ chối bởi `WITH CHECK` (kể cả khi gọi thẳng REST, bỏ qua UI).
   - thả tim hai lần → lỗi `23505`.
   - `heart_count` sau INSERT/DELETE khớp `SELECT count(*) FROM kudo_hearts WHERE kudo_id = ...`.
5. `src/dal/kudo-hearts.ts`: `getViewerHeartedKudoIds(client, userId, kudoIds)` → `Set<string>` (fail-open: `Set` rỗng). Đây là chỗ **duy nhất** đọc `kudo_hearts`; `src/dal/kudos.ts` vẫn không biết bảng này tồn tại.
6. `toggle-kudo-heart.ts`: `"use server"`, đọc lại session ở server, **không** tin `hearted` client gửi lên, kết thúc bằng `revalidatePath(ROUTES.KUDOS)`.
7. `pnpm test:unit:coverage` → lint → format:check → build → typecheck.

## Todo List

- [ ] Xác nhận `rolbypassrls` của `current_user` trước khi viết trigger
- [ ] Test action đỏ trước (5 ca ở bước 1)
- [ ] `0007` đủ 8 khối bước 2, REVOKE trước mọi GRANT
- [ ] Trigger `SECURITY DEFINER` + `SET search_path = public, pg_temp`
- [ ] `supabase migration up` hai lần đều sạch
- [ ] 4 phép verify RLS thủ công ở bước 4, ghi kết quả vào `evidence/rls-verification.md`
- [ ] `kudo-hearts.ts` + client shim + test, fail-open `Set` rỗng
- [ ] `toggle-kudo-heart.ts` + test, `revalidatePath`
- [ ] coverage 100% / lint / format / build / typecheck

## Success Criteria

- `evidence/rls-verification.md` ghi đủ 4 kết quả bước 4, mỗi cái kèm câu lệnh đã chạy.
- Sau một chuỗi INSERT/DELETE bất kỳ, `SELECT k.heart_count, (SELECT count(*) FROM kudo_hearts h WHERE h.kudo_id = k.id) FROM kudos k;` cho hai cột **bằng nhau ở mọi hàng**.
- Sender tự thả tim bị từ chối ở tầng DB **dù gọi thẳng REST**, không phụ thuộc nút disabled.
- `pnpm test:unit:coverage` xanh; `kudo-hearts.ts`, `kudo-hearts-client.ts`, `toggle-kudo-heart.ts` đạt 100%.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Trigger im lặng không chạy → `heart_count` trôi khỏi sự thật | Trung bình | Cao — carousel top-5 xếp sai vĩnh viễn | Success Criteria có phép so hai cột; chạy lại sau phase 05 |
| `SECURITY DEFINER` không kèm `SET search_path` | Trung bình | **Nghiêm trọng** — đường leo thang quyền kinh điển | Ghi thẳng trong Todo; `0002` là khuôn có sẵn |
| Cấp `UPDATE` trên `kudos` cho `authenticated` cho "tiện" | Thấp | **Nghiêm trọng** — ai cũng đặt số tim tuỳ ý | Trigger tồn tại chính để khỏi cần grant đó; phase 03 đã REVOKE |
| `23505` lọt ra ngoài thành lỗi đỏ trên UI | Trung bình | Trung bình — race hai lần bấm hiện thành lỗi | Bắt riêng mã lỗi, đọc lại trạng thái, trả về im lặng |
| `getViewerHeartedKudoIds` ném lỗi khi Supabase chết | Trung bình | Cao — cả trang 500 thay vì render rỗng | Fail-open `Set` rỗng, có test riêng |

## Security Considerations

`kudo_hearts` là **đường GHI đầu tiên** người dùng cuối chạm tới trong repo này. FR-601 đòi Postgres là trọng tài cuối, không phải Server Action: cả BR-001 (`UNIQUE`) lẫn BR-002 (`WITH CHECK`) đều nằm ở tầng DB. `anon` chỉ `SELECT`. Hàm trigger chạy `SECURITY DEFINER` nên bắt buộc `SET search_path` và bắt buộc chỉ chạm đúng một cột của đúng một hàng.

## Next Steps

Mở khoá phase 05 (seed cần bảng này để dựng top-5 thật) và cấp giá trị `hearted`/`canHeart` cho phase 13.
