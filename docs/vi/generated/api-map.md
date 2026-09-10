---
authored_by: rebuild-spec
---
# API Map

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05

**Phạm vi thật (đọc trước khi dùng bảng dưới)**: repo này có đúng MỘT backend route (`GET /auth/callback`) — F004/F005/F006/F007/F008/F009/F010/F011/F012 đều KHÔNG thêm route BE nào (chỉ frontend page + DAL đọc, hoặc Server Action). Các endpoint Supabase Auth (`/auth/v1/token`, `/auth/v1/authorize`, ...) chạy trên instance Supabase bên ngoài — KHÔNG phải API của app này nên không xuất hiện trong bảng. `src/app/_actions/set-locale.ts`, `src/app/_actions/logout.ts`, (từ F007/F008, 2026-09-07) 2 Server Action dưới `src/app/(public)/kudos/_actions/`, (từ F009, 2026-09-08) 2 Server Action MỚI thêm cùng thư mục (`createKudo`, `searchSunners`), (từ F010, 2026-09-0x) `openSecretBoxAction` (`src/app/(public)/kudos/_actions/open-secret-box.ts`), và (từ F012, 2026-09-09) `markReadAction`/`markAllReadAction` (`src/app/_actions/notifications.ts`) đều là Next.js Server Actions (RPC qua POST ẩn của framework), không phải HTTP endpoint có path — liệt kê ở mục riêng, không trộn vào bảng route. Không có background job, không có webhook trong repo — không bịa dòng nào cho hai loại này.

---

## Auth

Nguồn: `route-list.md` § Backend Routes; BL map theo `behavior-logic.md` § Related Routes.

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /auth/callback | BL002_SupabaseServerClient | public — route tự nhận PKCE code từ Supabase và tạo session (`exchangeCodeForSession`); không có session trước khi route này chạy nên không thể yêu cầu auth. Route bị loại tường minh khỏi matcher của `proxy.ts` (tự xử lý redirect riêng). |

`Owner F###` đã được điền trong `route-list.md` (= `F001`, F001_GoogleOAuthLogin claims route này) — `feature-list.md` đã tồn tại với 12 feature, không còn để trống.

---

## Non-Route Backend Logic (Supabase-client BL items)

Ba BL### còn lại trong `behavior-logic.md` là factory function tích hợp Supabase Auth SDK, được gọi TỪ BÊN TRONG route/page/action — bản thân chúng không phải route và không có path riêng:

| BL### | Source File | Gọi từ | Không phải route vì |
|-------|-------------|--------|----------------------|
| BL001_SupabaseBrowserClient | src/lib/supabase/client.ts | `src/api/auth.ts:45` (trước `signInWithOAuth`) | chạy trong trình duyệt, không có path server-side |
| BL002_SupabaseServerClient | src/lib/supabase/server.ts | `src/app/(public)/login/page.tsx:75`, `src/app/(protected)/todo/page.tsx:21`, `src/app/(public)/(home)/page.tsx:11`, `src/app/_actions/logout.ts:15`, `src/app/auth/callback/route.ts:32`, cộng (F007/F008, 2026-09-07) `src/app/(public)/kudos/page.tsx:72`, `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:44`, `src/app/(public)/kudos/_actions/load-more-kudos.ts:53`, cộng (F009, 2026-09-08) `src/app/(public)/kudos/_actions/create-kudo.ts:99`, `src/app/(public)/kudos/_actions/search-sunners.ts:59`, cộng (F010, 2026-09-0x) `src/app/(public)/kudos/_actions/open-secret-box.ts`, cộng (F012, 2026-09-09) `src/app/_actions/notifications.ts` ×2 (`markReadAction`, `markAllReadAction`) | factory dùng lại ở 13+ nơi (Server Components/Action/Route Handler), không tự thân là 1 endpoint |
| BL003_SupabaseProxyClient | src/lib/supabase/proxy-client.ts | `src/proxy.ts:132` (`getUserOrNull`) | chạy trong lớp proxy theo path matcher (`/`, `/login`, `/todo/:path*`), không map 1-1 vào 1 route cụ thể |

---

## Server Actions (không phải HTTP endpoint có path — KHÔNG liệt kê như route)

| Action | File | Handler BL### | Auth |
|--------|------|---------------|------|
| `setLocale(locale)` | src/app/_actions/set-locale.ts | `[UNMAPPED]` — không gọi Supabase, chỉ ghi cookie `NEXT_LOCALE` qua `normalizeLocale` | public — không auth guard, chạy trước/sau bất kỳ trang nào |
| `logoutAction()` | src/app/_actions/logout.ts | BL002_SupabaseServerClient (`createClient()` rồi `signOut()`) | yêu cầu đã đăng nhập theo ngữ cảnh gọi — action SHARED, dùng chung bởi form logout trên `/todo`, `/profile`, `/`, `/awards`, `/kudos` (không riêng `/todo`); action tự thân không kiểm tra lại session, best-effort `signOut()` rồi luôn redirect `/login` |
| `toggleKudoHeart(kudoId)` | src/app/(public)/kudos/_actions/toggle-kudo-heart.ts | BL002_SupabaseServerClient (`createClient()` rồi `.from("kudo_hearts")` insert/delete + đọc lại `kudos.heart_count`) | fail-CLOSED — tự `supabase.auth.getUser()` bên trong (không dựa route-guard nào, vì `/kudos` không có guard); `!user` → `{ok:false, reason:"unauthenticated"}`; RLS `kudo_hearts_insert_own` chặn thêm "không tự thả tim trên kudo mình gửi" (F008) NGAY CẢ khi action bị gọi trực tiếp; có `revalidatePath(ROUTES.KUDOS)` khi ghi thành công |
| `loadMoreKudos({cursor, hashtag, department})` | src/app/(public)/kudos/_actions/load-more-kudos.ts | BL002_SupabaseServerClient (`createClient()` rồi gọi lại `getKudosBoard`) | public — không auth guard, đọc lại CÙNG `getKudosBoard` mà `page.tsx` dùng cho trang 1; fail-open trả `{items:[], nextCursor:null}` khi `cursor` không hợp lệ hoặc lỗi; CỐ Ý không `revalidatePath` (khác `toggleKudoHeart`) — tránh xoá các trang feed đã tải thêm phía client |
| `createKudo(formData)` | src/app/(public)/kudos/_actions/create-kudo.ts | BL002_SupabaseServerClient (`createClient()` rồi `auth.getUser()`, `.storage.from("kudo-images")` upload, `.from("kudos")` insert) | fail-CLOSED (F009) — tự `auth.getUser()` bên trong; `!user` → `{ok:false, reason:"unauthenticated"}`; validate tay (không zod) → `{ok:false, reason:"validation", fieldErrors}`; upload ảnh lỗi giữa chừng → best-effort xoá ảnh đã lên, `{ok:false, reason:"upload"}`, KHÔNG insert; RLS `kudos_insert_own` (`WITH CHECK sender_id = auth.uid()`) chặn cả khi action bị gọi trực tiếp; insert lỗi sau khi ảnh đã lên → best-effort xoá ảnh rồi `{ok:false, reason:"error"}`; thành công có `revalidatePath(ROUTES.KUDOS)` |
| `searchSunners(query)` | src/app/(public)/kudos/_actions/search-sunners.ts | BL002_SupabaseServerClient (`createClient()` rồi `auth.getUser()`, đọc view `profile_cards` qua `src/dal/sunner-search.ts`) | public read nhưng tự thân chặn anonymous ở tầng action (F009) — `!user` → trả `[]` (không throw); fail-open trả `[]` trên bất kỳ lỗi Supabase nào hoặc `query` rỗng/dưới 1 ký tự; cắt `query` ở 128 ký tự trước khi query — không phải route HTTP, không `revalidatePath` (đọc thuần) |
| `openSecretBoxAction()` | src/app/(public)/kudos/_actions/open-secret-box.ts | BL002_SupabaseServerClient (`createClient()` rồi `.rpc("open_secret_box")`) | fail-CLOSED (F010) — không nhận tham số, danh tính VÀ entitlement đều resolve server-side (`createClient()`'s session cookie, rồi lại `auth.uid()` bên trong RPC `0011_secret_box.sql`); `try/catch` hạ MỌI lỗi (RPC lỗi lạ, response sai hình dạng, `createClient()` lỗi) về `{ok:false, reason:"unknown"}` ngoại trừ 2 lý do RPC tự đặt tên (`no_boxes_left`, `unauthenticated`); CỐ Ý không `revalidatePath` — tránh remount `SecretBoxLauncher` làm mất `<dialog>` đang mở |
| `markReadAction(id)` | src/app/_actions/notifications.ts | BL002_SupabaseServerClient (`createClient()` rồi `auth.getUser()`, `.from("notifications").update({is_read:true})` qua DAL `markRead`) | fail-CLOSED (F012) — tự `auth.getUser()` bên trong; `!user` hoặc `id` rỗng → `{ok:false}`; RLS `notifications_update_own_read` + `GRANT UPDATE (is_read)` chặn sửa hàng người khác/cột khác kể cả khi action bị gọi trực tiếp; CỐ Ý không `revalidatePath` (giống `openSecretBoxAction`) — panel tự refetch |
| `markAllReadAction()` | src/app/_actions/notifications.ts | BL002_SupabaseServerClient (`createClient()` rồi `auth.getUser()`, `.from("notifications").update({is_read:true})` qua DAL `markAllRead`) | fail-CLOSED (F012) — tự `auth.getUser()` bên trong; `!user` → `{ok:false}`; 0 hàng chưa đọc là kết quả bình thường (`{ok:true, updated:0}`), không phải lỗi; CỐ Ý không `revalidatePath` |

---

## Background Jobs / Webhooks

Không có. Không tìm thấy `scheduled-job`, `queue-worker`, hay `webhook` nào trong `behavior-logic.md` (0/3 BL### thuộc các loại này) — đây là thực tế của app demo 2 màn hình, không phải khoảng trống coverage.

---

## Summary

| Category | Count |
|----------|-------|
| Backend Routes (HTTP) | 1 |
| Non-route BL integration items | 3 |
| Server Actions (non-HTTP) | 9 |
| Background jobs | 0 |
| Webhooks | 0 |
