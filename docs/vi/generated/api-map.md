---
authored_by: rebuild-spec
---
# API Map

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-05

**Phạm vi thật (đọc trước khi dùng bảng dưới)**: repo này có đúng MỘT backend route (`GET /auth/callback`) — F004/F005/F006/F007/F008 đều KHÔNG thêm route BE nào (chỉ frontend page + DAL đọc, hoặc Server Action). Các endpoint Supabase Auth (`/auth/v1/token`, `/auth/v1/authorize`, ...) chạy trên instance Supabase bên ngoài — KHÔNG phải API của app này nên không xuất hiện trong bảng. `app/actions/locale.ts`, `app/todo/actions.ts`, và (từ F007/F008, 2026-09-07) 2 Server Action mới dưới `src/app/(public)/kudos/_actions/` là Next.js Server Actions (RPC qua POST ẩn của framework), không phải HTTP endpoint có path — liệt kê ở mục riêng, không trộn vào bảng route. Không có background job, không có webhook trong repo — không bịa dòng nào cho hai loại này.

---

## Auth

Nguồn: `route-list.md` § Backend Routes; BL map theo `behavior-logic.md` § Related Routes.

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /auth/callback | BL002_SupabaseServerClient | public — route tự nhận PKCE code từ Supabase và tạo session (`exchangeCodeForSession`); không có session trước khi route này chạy nên không thể yêu cầu auth. Route bị loại tường minh khỏi matcher của `proxy.ts` (tự xử lý redirect riêng). |

`Owner F###` để trống trong route-list.md vì feature-list.md chưa tồn tại ở wave này (Wave 5 chạy sau) — không suy diễn thêm ở đây.

---

## Non-Route Backend Logic (Supabase-client BL items)

Ba BL### còn lại trong `behavior-logic.md` là factory function tích hợp Supabase Auth SDK, được gọi TỪ BÊN TRONG route/page/action — bản thân chúng không phải route và không có path riêng:

| BL### | Source File | Gọi từ | Không phải route vì |
|-------|-------------|--------|----------------------|
| BL001_SupabaseBrowserClient | lib/supabase/client.ts | `lib/auth/sign-in-with-google.ts:44` (trước `signInWithOAuth`) | chạy trong trình duyệt, không có path server-side |
| BL002_SupabaseServerClient | lib/supabase/server.ts | `app/login/page.tsx:75`, `app/todo/page.tsx:21`, `app/page.tsx:11`, `app/todo/actions.ts:15`, `app/auth/callback/route.ts:32`, cộng (F007/F008, 2026-09-07) `src/app/(public)/kudos/page.tsx:72`, `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:44`, `src/app/(public)/kudos/_actions/load-more-kudos.ts:53` | factory dùng lại ở 8 nơi (Server Components/Action/Route Handler), không tự thân là 1 endpoint |
| BL003_SupabaseProxyClient | lib/supabase/proxy-client.ts | `proxy.ts:73` (`getUserOrNull`) | chạy trong lớp proxy theo path matcher (`/`, `/login`, `/todo/:path*`), không map 1-1 vào 1 route cụ thể |

---

## Server Actions (không phải HTTP endpoint có path — KHÔNG liệt kê như route)

| Action | File | Handler BL### | Auth |
|--------|------|---------------|------|
| `setLocale(locale)` | app/actions/locale.ts | `[UNMAPPED]` — không gọi Supabase, chỉ ghi cookie `NEXT_LOCALE` qua `normalizeLocale` | public — không auth guard, chạy trước/sau bất kỳ trang nào |
| `logoutAction()` | app/todo/actions.ts | BL002_SupabaseServerClient (`createClient()` rồi `signOut()`) | yêu cầu đã đăng nhập theo ngữ cảnh gọi (form logout chỉ render ở `/todo`, trang có guard fail-closed) — action tự thân không kiểm tra lại session, best-effort `signOut()` rồi luôn redirect `/login` |
| `toggleKudoHeart(kudoId)` | src/app/(public)/kudos/_actions/toggle-kudo-heart.ts | BL002_SupabaseServerClient (`createClient()` rồi `.from("kudo_hearts")` insert/delete + đọc lại `kudos.heart_count`) | fail-CLOSED — tự `supabase.auth.getUser()` bên trong (không dựa route-guard nào, vì `/kudos` không có guard); `!user` → `{ok:false, reason:"unauthenticated"}`; RLS `kudo_hearts_insert_own` chặn thêm "không tự thả tim trên kudo mình gửi" (F008) NGAY CẢ khi action bị gọi trực tiếp; có `revalidatePath(ROUTES.KUDOS)` khi ghi thành công |
| `loadMoreKudos({cursor, hashtag, department})` | src/app/(public)/kudos/_actions/load-more-kudos.ts | BL002_SupabaseServerClient (`createClient()` rồi gọi lại `getKudosBoard`) | public — không auth guard, đọc lại CÙNG `getKudosBoard` mà `page.tsx` dùng cho trang 1; fail-open trả `{items:[], nextCursor:null}` khi `cursor` không hợp lệ hoặc lỗi; CỐ Ý không `revalidatePath` (khác `toggleKudoHeart`) — tránh xoá các trang feed đã tải thêm phía client |

---

## Background Jobs / Webhooks

Không có. Không tìm thấy `scheduled-job`, `queue-worker`, hay `webhook` nào trong `behavior-logic.md` (0/3 BL### thuộc các loại này) — đây là thực tế của app demo 2 màn hình, không phải khoảng trống coverage.

---

## Summary

| Category | Count |
|----------|-------|
| Backend Routes (HTTP) | 1 |
| Non-route BL integration items | 3 |
| Server Actions (non-HTTP) | 4 |
| Background jobs | 0 |
| Webhooks | 0 |
