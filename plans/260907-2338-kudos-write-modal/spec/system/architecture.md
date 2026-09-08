---
status: draft
authored_by: takumi
created: 2026-09-07
lang: vi
---
<!--
FORWARD-DRAFT NOTICE (F009_KudosComposeModal — "Viết Kudo",
plans/260907-2338-kudos-write-modal): đây là bản SAO NGUYÊN VĂN của
`docs/vi/system/architecture.md` (đọc 2026-09-07, đã chứa delta F007/F008),
cộng CHỈ phần delta mà F009 giới thiệu. Mọi dòng gốc giữ nguyên 100%.
Phần MỚI nằm trọn trong mục cuối file. File này CHƯA merge vào
`docs/vi/system/architecture.md` thật; nó được promote ở implement-start và
đối chiếu lại với as-built ở Delivery. Trích các mục gốc còn nguyên vẹn để
người đọc không phải mở 2 file — nội dung gốc xem
`docs/vi/system/architecture.md`, không chép lại toàn bộ ở đây để tránh
trôi (DRY); chỉ mục cuối là nội dung thật của bản nháp này.
-->

# Architecture

> Xem bản đầy đủ tại `docs/vi/system/architecture.md` (đã gồm delta
> F007_KudosLiveBoard/F008_KudosHeartReaction). Mục dưới đây là delta
> RIÊNG của F009_KudosComposeModal, đọc nối tiếp sau mục "Bổ sung dự kiến
> — F007_KudosLiveBoard + F008_KudosHeartReaction" của file đó.

## Bổ sung dự kiến — F009_KudosComposeModal ("Viết Kudo")

> **[F009 draft — chưa merge]** Delta của feature này trong
> `plans/260907-2338-kudos-write-modal/`. Quyết định gốc:
> `clarifications.md § Quyết định`. Nguồn kỹ thuật:
> `plans/260907-2338-kudos-write-modal/research/researcher-data-layer-report.md`.

### Lần đầu ứng dụng có Supabase Storage — data-store thứ 3

Tính tới F008, hệ thống có 2 ranh giới đọc dữ liệu Supabase: RLS own-row
trên `public.users` (migration `0001`) và view SECURITY DEFINER
(`public.profile_cards`, `public.kudos_cards`). F009 thêm loại data-store
thứ 3 chưa từng dùng trong repo: **Supabase Storage**, bucket mới
`kudo-images`.

`supabase/config.toml:109-120` đã bật `[storage] enabled = true` +
`file_size_limit = "50MiB"` từ trước, nhưng khối `[storage.buckets.images]`
vẫn đang comment — chưa bucket nào thật sự tồn tại
(researcher-data-layer-report.md § 6). F009 mở bucket bằng **migration SQL**
(`INSERT INTO storage.buckets`), không bật qua `config.toml`, để mọi môi
trường apply migration đều có bucket giống nhau — cùng cách `0006`/`0007`
đã tạo bảng, không phải một cơ chế riêng (quyết định trong
`clarifications.md § Quyết định` — "Upload ảnh").

Ai ghi, ai đọc:
- **Ghi**: Server Action `create-kudo.ts` (mới, xem dưới) — nhận file ảnh
  qua `FormData`, gọi `.storage.from("kudo-images").upload(...)` bằng
  ĐÚNG client `@supabase/ssr` cookie-based mà action đã dùng để `INSERT`
  hàng `kudos` (không tạo client Storage riêng).
- **Đọc**: mọi `<img>` trên feed `/kudos` — công khai, không qua Next.js,
  không qua DAL; trình duyệt gọi thẳng URL public của Storage (giống cách
  `kudos-card.tsx` hôm nay trỏ `<img>` vào asset tĩnh
  `public/kudos/sample-image.png`, chỉ khác nguồn).
- **Đích**: URL trả về từ `.upload()` (hoặc `getPublicUrl()`) được nối vào
  mảng `kudos.image_urls text[]` (cột đã có sẵn từ `0006_kudos.sql:26`,
  comment `0006_kudos.sql:33` "Up to 5 elements (BR-007); enforced by the
  UI, not a CHECK constraint here" — không migration nào cần sửa cột này).

### Luồng ghi 1 kudo — đối lập với luồng đọc đã có

Sáu feature đầu (F001–F006) và cả F007 đều là đọc thuần: DAL `server-only`
→ Server Component → HTML. F008 thêm Server Action ghi đầu tiên
(`toggle-kudo-heart.ts`) nhưng ghi vào bảng phụ (`kudo_hearts`), không đụng
`kudos`. F009 là lần đầu có một Server Action **INSERT** thẳng vào
`public.kudos`:

```text
đọc (không đổi) : page.tsx (RSC) → src/dal/kudos.ts (server-only) → kudos_cards (SECURITY DEFINER) → HTML
ghi (mới)       : dialog "Viết Kudo" (client) → create-kudo.ts (Server Action)
                    → (nếu có ảnh) Storage upload → 5 URL
                    → INSERT public.kudos (RLS kudos_insert_own, xem permissions.md)
                    → revalidatePath(ROUTES.KUDOS) → RSC render lại
```

Đừng nhầm hai luồng: `kudos_cards` là VIEW chỉ-đọc (join, không
updatable — `0006_kudos.sql:98` ghi rõ "NOT auto-updatable in Postgres"),
KHÔNG BAO GIỜ là đích INSERT. Action ghi thẳng vào bảng gốc `public.kudos`,
router đọc lại qua view như cũ.

Nút mở dialog đã có sẵn trong repo, hiện cố tình vô hiệu:
`kudos-compose-pill.tsx` — `<input readOnly>`, không có `onClick`, comment
tại chỗ nói rõ lý do ("the dialog it should open … does not exist in this
repo yet", `src/app/(public)/kudos/_components/kudos-compose-pill.tsx:12-14`).
F009 là feature lấp đúng khoảng trống đó.

### DAL đọc mới: tìm người nhận qua `profile_cards`

`public.users` bật FORCE RLS own-row (`0001_...sql:55-59`) nên không ai
query trực tiếp bảng đó để tìm "Sunner khác" — kể cả để làm ô chọn người
nhận. F006_ProfilePage đã mở view `public.profile_cards`
(`security_invoker = false`, `GRANT SELECT` chỉ `authenticated`,
`0005_profile_cards_view.sql:70`) đúng cho việc này, nhưng chỉ có hàm
đọc-1-id (`getProfileCard`, `src/dal/profile-cards.ts:74`). F009 thêm một
hàm đọc-nhiều mới — file riêng, không sửa `src/dal/profile-cards.ts` (giữ
ranh giới sở hữu file theo feature, quyết định trong `clarifications.md`):

- `src/dal/sunner-search.ts` (mới) — hàm `searchSunners(client, query,
  limit)`, `ilike` trên `full_name` qua `profile_cards`, `import
  "server-only"`, nhận client injected như mọi DAL khác trong repo (không
  tự tạo client — pattern `getKudosBoard`/`getProfileCard`).
- `src/dal/sunner-search-client.ts` (mới) — adapter thu hẹp kiểu builder,
  cùng pattern `toProfileCardsClient`/`toAwardsClient`/`toUsersRoleClient`
  (tránh lỗi TS2589 khi truyền `ServerSupabaseClient` nguyên bản qua nhiều
  tầng gọi).

Không nới `SELECT` list của `profile_cards` — doc-comment của view tự cấm
(`0005_profile_cards_view.sql`, mã SEC_004) — 3 cột hiện có (`id,
full_name, avatar_url`) là đủ cho ô chọn người nhận.

### Không thêm bảng hashtag; gợi ý dẫn xuất từ dữ liệu đã đọc

Không có bảng vocabulary hashtag nào trong schema — `getKudosBoard`
(`src/dal/kudos.ts:132`) đã tự suy hashtag từ nội dung `kudos_cards` để
phục vụ bộ lọc trên `/kudos`. Dialog "Viết Kudo" nằm CÙNG trang, nên nhận
lại đúng danh sách đó qua prop có sẵn — không query thêm, không bảng mới
(quyết định `clarifications.md`, tránh trùng lặp một nguồn dữ liệu đã tồn
tại — DRY).

### ADR — Server Action upload ảnh, không phải browser-side upload trực tiếp

**Bối cảnh**: dialog cho phép đính tối đa 5 ảnh (BR-007,
`0006_kudos.sql:33`). Hai cách hợp lý để đưa ảnh lên Storage:

| | A — Server Action upload (chọn) | B — Browser upload trực tiếp |
|---|---|---|
| Client Supabase dùng | `@supabase/ssr` server (cookie), CÙNG client action đã dùng để `INSERT kudos` | `src/lib/supabase/client.ts` (factory đã tồn tại nhưng **0 lần được gọi để ghi** ở bất kỳ đâu trong `src/` — researcher-data-layer-report.md § 2, § "Client variant") |
| Điểm re-derive danh tính | 1 lần, trong action (`auth.getUser()`), gác cả upload lẫn insert | 2 lần tách rời: RLS Storage lúc browser upload, RLS `kudos_insert_own` lúc action insert |
| Khớp pattern có sẵn | Đúng 100% `toggleKudoHeart` (`createClient()` → `auth.getUser()` → fail-closed → `revalidatePath`) | Không có tiền lệ nào trong repo — mọi Supabase call ngoài OAuth (`src/api/auth.ts:40-56 signInWithGoogle`) đều chạy server-side |
| Độ phức tạp thêm vào client | Không — 1 `<form>` submit, JS y hệt các action khác | Thêm state machine 2 bước (upload → lấy URL → gọi action), thêm bundle logic upload phía client |
| Giới hạn thực tế | Payload Server Action qua `FormData` — ổn với ≤5 ảnh, `file_size_limit` Storage vẫn là `"50MiB"`/file (`config.toml:112`); không cần progress bar riêng vì spec không vẽ UI progress-per-file | Tốt hơn cho ảnh rất lớn/nhiều ảnh đồng thời — nhưng không phải bài toán ở đây (tối đa 5 ảnh, dialog 1 lần gửi) |

**Quyết định: A — Server Action upload.** Lý do theo đúng thứ tự ưu tiên
CLAUDE.md § "Quyết định thay tôi": **(b) khớp pattern đã có trong repo**
thắng — repo hiện có ĐÚNG MỘT client variant từng ghi dữ liệu
(`@supabase/ssr` server, cookie-based), không có service-role, không có
browser-side write nào ngoài luồng OAuth. Dựng thêm một luồng upload
browser-side là mở một class client-trust mới (khác OAuth redirect) chỉ để
phục vụ đúng 1 form, ngược YAGNI. Rủi ro cần canh khi implement: nếu ảnh
lớn/nhiều khiến payload Server Action chạm giới hạn body mặc định của Next
Server Actions, cấu hình `serverActions.bodySizeLimit` trong
`next.config.ts` (giá trị cụ thể để implementer quyết, không đoán ở đây).

### Cấu hình cần thêm ở `next.config.ts` — chưa xác nhận, không đoán số

`serverActions.bodySizeLimit` là điểm cần kiểm tra khi implement (xem ADR
trên) — file này KHÔNG đưa ra một con số vì chưa đo dung lượng payload thật
(base64/multipart 5 ảnh); nêu ở đây để không ai quên, không phải một cấu
hình đã chốt.

### Rendering định dạng — tách khỏi phạm vi F009, chạm đúng 1 file của F007

Toolbar định dạng (B/I/S/số thứ tự/link/quote) chèn marker
markdown-subset vào một `<textarea>` thường (không rich editor — repo
không có precedent contentEditable). Vì `kudos-card.tsx:99-104` hiện render
`{card.content}` dạng plain text (researcher-data-layer-report.md § 7), cần
thêm một renderer nhỏ tại đúng chỗ đó để hiển thị marker thành định dạng
thật, tránh hiện `**abc**` nguyên xi trên feed đã ship. Renderer dựng React
element trực tiếp — không `dangerouslySetInnerHTML`, không thêm dependency
markdown (quyết định `clarifications.md`, giữ nguyên bề mặt bảo mật hiện
có). Đây là điểm CHẠM DUY NHẤT của F009 vào file thuộc F007.

### Không đổi

- Không route mới, không đổi `src/proxy.ts` matcher — `/kudos` vẫn PUBLIC,
  không route-guard (xem permissions.md).
- Không service-role client mới — action vẫn dùng `@supabase/ssr` server
  client hiện có (`src/lib/supabase/server.ts`).
- `domain/`, `contexts/`, `src/configs/env.ts` tiếp tục CHƯA tồn tại — F009
  không tạo consumer đầu tiên cho các thư mục này (YAGNI, cùng ghi chú ở
  mục gốc phía trên).
