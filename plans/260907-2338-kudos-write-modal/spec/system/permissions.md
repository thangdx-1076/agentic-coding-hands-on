---
status: draft
authored_by: takumi
created: 2026-09-07
lang: vi
---
<!--
FORWARD-DRAFT NOTICE (F009_KudosComposeModal — "Viết Kudo",
plans/260907-2338-kudos-write-modal): đây là bản SAO NGUYÊN VĂN của
`docs/vi/system/permissions.md` (đọc 2026-09-07, đã chứa delta F007/F008),
cộng CHỈ phần delta mà F009 giới thiệu. Mọi dòng gốc giữ nguyên 100%.
Phần MỚI nằm trọn trong mục cuối file. File này CHƯA merge vào
`docs/vi/system/permissions.md` thật; nó được promote ở implement-start và
đối chiếu lại với as-built ở Delivery. Nội dung gốc xem
`docs/vi/system/permissions.md` — không chép lại ở đây (DRY); chỉ mục
cuối là nội dung thật của bản nháp này.
-->

# Permissions

> Xem bản đầy đủ tại `docs/vi/system/permissions.md` (đã gồm delta
> F007_KudosLiveBoard/F008_KudosHeartReaction — trong đó `/kudos` đã được
> xác nhận là route CÔNG KHAI, không route-guard). Mục dưới đây là delta
> RIÊNG của F009_KudosComposeModal, đọc nối tiếp sau mục "Bổ sung dự kiến
> — F007_KudosLiveBoard + F008_KudosHeartReaction" của file đó.

> **PERM### note**: không mã nào dưới đây được phát minh. Bốn bề mặt PERM###
> mới của F008 vẫn `TBD (draft)` (chưa promote). F009 thêm bề mặt PERM### thứ
> năm/sáu — cũng `TBD (draft)`, cấp thật ở bước promote, KHÔNG đoán số ở đây.

## Bổ sung dự kiến — F009_KudosComposeModal ("Viết Kudo")

> **[F009 draft — chưa merge]** Delta của feature này trong
> `plans/260907-2338-kudos-write-modal/`. Quyết định gốc:
> `clarifications.md § Quyết định`. Nguồn kỹ thuật:
> `plans/260907-2338-kudos-write-modal/research/researcher-data-layer-report.md`.

### `kudos_insert_own` — policy GHI đầu tiên trên `public.kudos`

`0006_kudos.sql:16-18` tự ghi rõ từ trước: *"No INSERT/UPDATE/DELETE policy
on `kudos` at all … the 'Viết Kudo' compose dialog … adds its own write
policy when THEY are built, not here."* F009 là chỗ lời hứa đó được giữ.
Policy mới mirror ĐÚNG hình dạng `kudo_hearts_insert_own`
(`0007_kudo_hearts.sql:78-84`, `FOR INSERT TO authenticated WITH CHECK
(user_id = auth.uid() AND ...)`), thay vì phát minh hình dạng riêng:

```sql
-- Migration mới (F009), mirror 0007_kudo_hearts.sql:78-84
DROP POLICY IF EXISTS kudos_insert_own ON public.kudos;
CREATE POLICY kudos_insert_own ON public.kudos
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());
GRANT INSERT ON public.kudos TO authenticated;
```

Khác `kudo_hearts_insert_own` ở một điểm: `kudo_hearts` cấm tự-thả-tim
(`user_id <> sender của kudo`) vì đó là quan hệ hai hàng (heart ↔ kudo).
`kudos_insert_own` không cần điều kiện tương đương — gửi kudo cho CHÍNH
MÌNH (`sender_id = receiver_id`) không phải rủi ro bảo mật cần policy chặn
(nhiều nhất là một hành vi kỳ lạ về UX, không phải một lỗ hổng), và không
test case nào trong 57 case của màn này yêu cầu chặn nó — không thêm điều
kiện không ai đòi hỏi.

**Vì sao KHÔNG có `UPDATE`/`DELETE`:** không spec, không test case, không
node design nào của "Viết Kudo" nhắc tới sửa/xoá một kudo đã gửi. Thêm hai
policy đó là fabricate quyền không ai yêu cầu — ngược YAGNI. Nếu một
feature sau này cần "sửa/xoá kudo của chính mình", đó là lúc thêm, không
phải bây giờ.

### Storage — bucket `kudo-images`, 2 policy trên `storage.objects`

Bucket mới (xem architecture.md § "Lần đầu ứng dụng có Supabase Storage"),
tạo bằng `INSERT INTO storage.buckets (id, name, public) VALUES
('kudo-images', 'kudo-images', true)` — `public = true` vì `/kudos` đọc
công khai, không khác gì asset tĩnh `public/kudos/sample-image.png` hôm
nay. Hai policy trên `storage.objects`, lọc theo cột `bucket_id` (cách
lọc chuẩn của Supabase Storage — xem `supabase.com/docs/guides/storage/
security/access-control`):

```sql
-- Ghi: chỉ authenticated, chỉ vào đúng bucket này
CREATE POLICY "kudo_images_insert_authenticated" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'kudo-images');

-- Đọc: public/anon — belt-and-suspenders, xem ghi chú dưới
CREATE POLICY "kudo_images_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'kudo-images');
```

**Ghi chú KHÔNG được bỏ qua khi implement (đã verify qua docs Supabase, 2
GitHub issue — không đoán):**

1. `public = true` trên bucket TỰ NÓ đã bypass RLS cho đường đọc qua public
   URL (`<img src>` trên feed) — policy SELECT ở trên vì vậy chủ yếu là
   phòng thủ thêm cho truy cập trực tiếp qua bảng `storage.objects`
   (PostgREST/dashboard), không phải cơ chế chính khiến ảnh hiển thị được.
   Không dựa vào nó làm điều kiện duy nhất khi viết test.
2. **Không copy pattern `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY`**
   mà `0006`/`0007` dùng cho bảng `public.*` sang `storage.objects`. Trên
   Supabase hosted, `storage.objects` đã bật RLS mặc định và chủ sở hữu
   bảng không còn là role migration chạy — cố `ALTER TABLE` bảng này trả
   lỗi `must be owner of table objects` (xác nhận qua
   `github.com/supabase/supabase` issue #41126 và #36418, tài liệu
   `supabase.com/docs/guides/storage/security/ownership`). Migration F009
   chỉ nên chứa `INSERT INTO storage.buckets` + `CREATE POLICY` — bỏ hẳn
   câu `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`.
3. Instance local (`saa-app`, `supabase start`) chạy Postgres docker riêng,
   role `postgres` ở đó có thể vẫn là owner — nghĩa là lỗi ở mục 2 có thể
   KHÔNG lộ ra khi test local, chỉ lộ khi/nếu dự án này từng push lên một
   project Supabase hosted thật. Ghi ở đây để implementer không debug từ
   đầu nếu việc đó xảy ra sau này — repo hiện tại chỉ chạy local, chưa có
   project hosted (đúng phạm vi "verify at implementation", không phải một
   blocker bây giờ).

### Vì sao `/kudos` KHÔNG vào `src/proxy.ts` dù đã có đường ghi

`/kudos` giữ nguyên là route PUBLIC (đã chốt ở delta F007/F008 phía trên,
căn cứ đúng nguyên văn test case *"User is unauthenticated but can view
Kudos UI"*). F009 THÊM một hành động ghi vào trang này nhưng KHÔNG đổi
kết luận đó — vì gate nằm ở HÀNH ĐỘNG, không nằm ở ROUTE:

- **Đọc trang** `/kudos`: không gate — giữ nguyên `config.matcher` của
  `src/proxy.ts`, không thêm `/kudos` vào đó.
- **Mở dialog + điền form**: không gate — dialog vẫn render, chỉ khác nút
  nguồn (`kudos-compose-pill.tsx`) trỏ `/login` thay vì mở dialog khi
  Server Component `page.tsx` đã biết trước là chưa đăng nhập (kiểm tra
  lớp 1, phía render, không phải phòng thủ bảo mật — chỉ là UX tránh mở
  một form rồi mới báo lỗi).
- **Gửi (INSERT thật)**: gate DUY NHẤT có giá trị bảo mật là bên trong
  Server Action `create-kudo.ts` — tự gọi `auth.getUser()` (ĐÚNG pattern
  `toggleKudoHeart`, `toggle-kudo-heart.ts:44-51`), fail-closed, trả
  `{ok:false, reason:"unauthenticated"}` nếu không có user, TRƯỚC khi chạm
  Storage hay bảng `kudos`. Một request REST trực tiếp bỏ qua UI vẫn bị
  chặn ở đây — không phải "chặn bằng cách ẩn nút" (comment thiết kế cùng
  triết lý `0007_kudo_hearts.sql:73-76`).

Route-level guard (`src/proxy.ts` + `(protected)/layout.tsx`) chỉ áp cho
"xem được trang hay không". F009 là feature ĐẦU TIÊN của dự án mà một
route công khai vẫn cần một gate NGOÀI route-guard — vì hành động ghi và
hành động xem tách rời nhau trên cùng một trang. Ghi ở đây rõ ràng để lần
sau không ai "sửa cho khớp" bằng cách thêm `/kudos` vào matcher — điều đó
sẽ chặn nhầm cả lượt xem của khách chưa đăng nhập, phá đúng quyết định
PUBLIC đã chốt ở F007/F008.

### Ẩn danh là NGỤY TRANG hiển thị, KHÔNG PHẢI ẩn ở tầng dữ liệu — cảnh báo bảo mật cần verify khi implement

Migration mới thêm `is_anonymous boolean NOT NULL DEFAULT false` +
`anonymous_name text` trên `public.kudos` (quyết định `clarifications.md`
— không có cột nào sẵn cho việc này, researcher-data-layer-report.md §1
xác nhận). Điểm PHẢI hiểu đúng: bật `is_anonymous` **không xoá, không ẩn
`sender_id` khỏi hàng dữ liệu** — hàng vẫn lưu ĐÚNG người gửi thật, y hệt
mọi kudo khác. `is_anonymous` chỉ là một cờ nói cho TẦNG HIỂN THỊ biết
"đừng vẽ tên/avatar người gửi thật, vẽ `anonymous_name` (hoặc nhãn ẩn
danh) thay vào".

Hệ quả bắt buộc — và đây là chỗ cần verify kỹ khi implement, không phải
suy đoán bây giờ: **`public.kudos_cards`
(`0006_kudos.sql:82-101`, SECURITY DEFINER, `GRANT SELECT TO anon,
authenticated`) hiện SELECT thẳng `su.id, su.full_name, su.avatar_url,
su.department` của sender KHÔNG điều kiện.** Nếu F009 thêm `is_anonymous`/
`anonymous_name` vào bảng `kudos` mà KHÔNG sửa view này, `kudos_cards` sẽ
tiếp tục trả nguyên danh tính sender thật cho MỌI truy vấn qua view — kể
cả một kudo được đánh dấu ẩn danh — và `anon`/`authenticated` đều đọc được
view đó. Ẩn danh khi ấy chỉ "ẩn" ở tầng UI nào tình cờ không hiển thị cột
đó, trong khi bất kỳ ai gọi thẳng REST vào `kudos_cards` vẫn thấy tên thật.
Đó là một lỗ rò danh tính thật, không phải một khác biệt trình bày.

View `kudos_cards` PHẢI được sửa (cùng migration hoặc migration nối tiếp)
để, khi `is_anonymous = true`, trả `NULL` (hoặc `anonymous_name`) thay cho
`sender_full_name`/`sender_avatar_url`/`sender_id` — quyết định CHÍNH XÁC
sửa cột nào, `CASE WHEN` ở đâu, là việc của implementer/reviewer lúc code,
KHÔNG chốt sẵn ở draft này (không có test case nào trong 57 case đặc tả
hình dạng SQL); ghi lại đây như một **security consideration bắt buộc
verify**, không phải một chi tiết có thể bỏ qua vì "ẩn danh chỉ là UI".

### Ma trận quyền GHI của F009 (bổ sung ma trận F008 đã có ở delta trên)

| Chủ thể | Mở dialog | Gửi kudo | Gửi ẩn danh |
|---|---|---|---|
| Anonymous | được (chỉ xem/điền) | **không** — action fail-closed `unauthenticated` | n/a |
| Đã đăng nhập | được | được, `sender_id = auth.uid()` (RLS) | được — `sender_id` vẫn lưu thật, chỉ ẩn ở hiển thị (xem cảnh báo trên) |

Cùng triết lý F008 đã lập: quyền ghi không suy ra được từ "đã đăng nhập
hay chưa" một mình — cần thêm điều kiện gắn với danh tính hàng dữ liệu
(`WITH CHECK sender_id = auth.uid()`), và ẨN DANH không phải một ngoại lệ
của RLS mà là một concern hoàn toàn khác (view/hiển thị).

### Fail-open cho ĐỌC, fail-closed cho GHI — không đổi triết lý

DAL đọc mới (`searchSunners`, `src/dal/sunner-search.ts`) theo đúng triết
lý `getAwards`/`getProfileCard`: lỗi Supabase → trả mảng rỗng, ô chọn
người nhận hiện "không tìm thấy", KHÔNG throw, KHÔNG chặn dialog. Server
Action `create-kudo.ts` (ghi) fail-closed tuyệt đối — bất kỳ lỗi nào
(Storage upload lỗi, insert lỗi, RLS từ chối) đều trả `{ok:false, ...}` và
KHÔNG ghi phần nào của hàng `kudos` (không insert kudos thiếu ảnh nếu
upload ảnh lỗi giữa chừng — thứ tự: upload xong hết rồi mới insert, không
insert trước rồi vá ảnh sau).

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006). Bốn bề mặt của F008 vẫn
`TBD (draft)`. F009 thêm các bề mặt mới dưới đây, cũng chờ mã ở bước
promote — KHÔNG đoán số:

- gửi kudo khi đã đăng nhập (INSERT `kudos`, policy `kudos_insert_own`)
- chặn gửi kudo khi chưa đăng nhập (Server Action fail-closed)
- upload ảnh vào bucket `kudo-images` khi đã đăng nhập
- đọc công khai ảnh trong bucket `kudo-images` (anon)
- ẩn sender thật trên `kudos_cards` khi `is_anonymous = true` — **PERM###
  này không được cấp cho tới khi view đã sửa xong và có test xác nhận
  không rò `sender_id`/`sender_full_name` thật** (xem cảnh báo bảo mật ở
  trên); cấp mã trước khi có bằng chứng là fabricate một permission-item
  chưa từng được enforce.
