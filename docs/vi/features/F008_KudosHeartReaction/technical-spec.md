---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
fcode: F008
---

# F008_KudosHeartReaction

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-07

**See also:** [`functional-spec.md`](./functional-spec.md) — tổng quan, Open Decisions, FR/BR
one-liner, screens, user stories, scenarios, edge cases cho độc giả BA/QA.

**How to read this file:** § 2 là bảng chỉ mục — chọn action cần xem rồi đọc trọn block ở § 3.
§ 4 là phụ lục dùng chung — chỉ ghé khi § 3 trỏ tới.

## 1. Technical Overview

Feature này thêm đúng 1 bảng mới (`kudo_hearts`) và 1 Server Action (`toggleKudoHeart`) ghi/xoá
lượt tim trên một kudo — không có route hay component riêng, vì nút tim là 1 control nằm trong
màn `/kudos` mà **F007_KudosLiveBoard sở hữu và render** (component, JSX, số hiển thị). Ranh giới
với F007: F007 render nút + số tim (đọc trực tiếp bảng `kudo_hearts` qua RLS SELECT công khai,
không qua một API riêng của F008); F008 sở hữu bảng dữ liệu, RLS, và con đường ghi duy nhất
(`toggleKudoHeart`). Số tim không có cột đếm riêng — luôn là `COUNT`/`SUM` trực tiếp trên
`kudo_hearts`, nên bỏ tim (xoá row) tự động thu hồi đúng số đã cộng, không cần một bước "revoke"
riêng. 1 capability (`CAP-01`), 1 action ghi DB.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — không thuộc riêng action nào* | — | FR-601 | — | § 4.4 |
| **A1** | `toggleKudoHeart()` (Server Action) | `POST` *(Server Action, không có HTTP path riêng)* | FR-001, FR-201, FR-202, FR-203, FR-204, FR-205, FR-401, FR-402, FR-601, BR-001, BR-002, BR-003, BR-004, BR-005, US001, US002 | `kudo_hearts` | § 3.1 |

## 3. Actions

### 3.1 CAP-01 — Thả tim cho Kudos

#### A1 · Thả tim / bỏ tim (toggle) cho một Kudo
`POST` *(Server Action, không có HTTP path riêng)* → `` `toggleKudoHeart()` ``
`FR-001` `FR-201` `FR-202` `FR-203` `FR-204` `FR-205` `FR-401` `FR-402` `FR-601` · `SCR007_KudosLiveBoard` · `US001` `US002`

**Who** · Sunner đã đăng nhập, không phải là người đã gửi chính kudo đang thao tác *(gate A0 —
§ 4.4)*.
**FE** · `KudosHeartButton` (`src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73`) —
JSX/CSS của nút do F007 sở hữu; F008 định nghĩa hành vi khi nút được bấm và GIÁ TRỊ đúng của trạng
thái nút qua `deriveKudosCardState` (`src/app/(public)/kudos/_utils/kudos-card-state.ts:39-58`):
xám khi chưa có lượt tim của người xem, đỏ khi đã có (FR-201); `heartDisabled` = `true` khi
`viewerId === null` (FR-203), hoặc `card.isOwn === true` (FR-202/FR-205 — đọc cờ `is_own` do
server tính sẵn trên view `kudos_cards`, KHÔNG so `card.sender.id === viewerId` vì `sender.id`
luôn `null` với kudo ẩn danh), hoặc `pendingIds.has(card.id)` (FR-204). `useKudosHearts`
(`src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:69-109`) giữ `inFlight` (`useRef<Set<string>>`)
+ `pendingIds` (`useState` mirror) — 1 toggle/kudo tại một thời điểm; lượt bấm thứ 2 trên kudo
đang pending bị bỏ qua (`if (inFlight.current.has(card.id)) return`). Client gọi
`toggleKudoHeart(kudoId)` khi bấm, không truyền trạng thái hearted hiện có — server tự xác định
lại từ session + dữ liệu, không tin dữ liệu client gửi lên.
**Request** · tham số `kudoId` *(uuid — id của kudo đang thao tác)*.
**BE** · `` `toggleKudoHeart(kudoId)` `` (`src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61`)
— đọc lại session hiện tại (`auth.uid()`), gọi `applyToggle` để kiểm tra đã tồn tại row
`kudo_hearts` cho `(kudoId, userId)` hay chưa và quyết định INSERT (thả tim) hay DELETE (bỏ tim);
bắt riêng lỗi `23505` (unique-violation) khi 2 click đua nhau đều INSERT — request thua đọc lại
row thay vì trả lỗi. Fail CLOSED (khác các DAL đọc board khác) — mọi lỗi trả `{ok:false}`, không
để lại state nửa vời.
**Rule**
- **BR-001 — Mỗi Sunner chỉ có đúng 1 lượt thả tim cho 1 kudo.** Ràng buộc `UNIQUE (kudo_id,
  user_id)` trên bảng `kudo_hearts` (§ 4.2) chặn lượt ghi thứ 2; INSERT thứ 2 luôn thất bại ở
  tầng DB, không chỉ kiểm tra ở tầng ứng dụng.
- **BR-002 — Sunner đã gửi 1 kudo không được thả tim cho chính kudo đó.** Chính sách RLS
  `WITH CHECK` trên `kudo_hearts` so khớp `user_id = auth.uid()` với `kudos.sender_id` của kudo
  đang thao tác (§ 4.2); INSERT bị DB từ chối nếu trùng, không chỉ dựa vào nút đã disable ở UI.
- **BR-003 — Mỗi lượt thả tim cộng đúng 1 tim vào tài khoản của Sunner đã GỬI kudo đó (không
  phải người nhận); bỏ tim thu hồi đúng số đã cộng.** Không có cột đếm tim riêng — số tim là
  `COUNT`/`SUM` trực tiếp trên `kudo_hearts` (xem § 5.4 Data Flow), nên xoá row khi bỏ tim tự
  động thu hồi đúng số đã cộng.
- **BR-004 — Nút tim của đúng kudo đang thao tác chuyển sang trạng thái disable tạm thời trong
  lúc `toggleKudoHeart` chưa trả lời; trở lại bình thường ngay khi server trả lời (thành công hay
  lỗi).** *(Bin 1 — chỉ dùng ở A1; nguồn: `use-kudos-hearts.ts:76-105` — `inFlight`/`pendingIds`,
  `finally` luôn xoá khỏi `inFlight` dù thành công hay lỗi)*
- **BR-005 — Chính người gửi 1 kudo ẩn danh nhìn thấy nút tim của kudo đó ở trạng thái disable,
  giống hệt kudo không ẩn danh — xác định qua cờ do server cấp (`is_own`, migration `0016`), không
  so sánh `sender.id` phía client.** *(Bin 1 — chỉ dùng ở A1; nguồn:
  `kudos-card-state.ts:50,54` — `card.isOwn === true`)*
**Result** · INSERT đúng 1 row `kudo_hearts` (thả tim) hoặc DELETE đúng 1 row đó (bỏ tim); không
có write nào khác trong cùng request. `revalidatePath(ROUTES.KUDOS)` sau khi ghi. Client re-render
ngay màu nút và số tim mới ngay khi action trả về (`ToggleKudoHeartResult.hearted`/`heartCount`),
không cần tải lại trang (FR-401); khi DELETE, số tim đọc được cho tài khoản người gửi giảm đúng
bằng số đã cộng trước đó, vì số tim luôn là phép đếm trực tiếp trên bảng (FR-402, BR-003).
**Source:** `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61` →
`src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:69-109` →
`src/app/(public)/kudos/_utils/kudos-card-state.ts:39-58` →
`src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73`

<!-- Không cần sequence diagram: action ghi đúng 1 bảng (dưới ngưỡng ≥2 bảng), đồng bộ, không có
     bước nền/queue nào. -->

---

### 3.2 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | Bấm tim 2 lần liên tiếp thật nhanh trước khi request đầu hoàn tất (race) | Ràng buộc `UNIQUE (kudo_id, user_id)` ở DB là trọng tài cuối cùng — request tới DB trước thắng, request sau đọc lại trạng thái mới nhất và tự đồng bộ, không tạo 2 row |
| A1 | Gọi thẳng `toggleKudoHeart` trên kudo do chính mình gửi, bỏ qua nút đã disable ở UI | RLS `WITH CHECK` (BR-002) từ chối INSERT ở tầng DB, không phụ thuộc kiểm tra phía client |
| A1 | Gọi thẳng `toggleKudoHeart` khi chưa đăng nhập | RLS yêu cầu role `authenticated` — request bị từ chối, không row nào được ghi *(§ 4.4, A0)* |
| A1 | Kudo bị xoá trong lúc vẫn còn lượt tim cũ tham chiếu tới | Khoá ngoại `kudo_id` → `kudos.id` với `ON DELETE CASCADE` xoá theo mọi lượt tim liên quan |
| A1 | Bấm tim khi request trước của CHÍNH kudo đó còn đang chạy | Nút hiện trạng thái disable tạm thời (BR-004) thay vì âm thầm bỏ qua lượt bấm — người dùng thấy phản hồi, không tưởng nút bị đơ |
| A1 | Chính người gửi 1 kudo ẩn danh bấm tim trên chính kudo đó | Nút disable đúng như kudo không ẩn danh (BR-005) qua cờ `is_own` |

## 4. Shared Foundation

### 4.1 Components

None. Toàn bộ hành vi nằm trong đúng 1 Server Action (A1); không có component/service nào dùng
chung giữa ≥2 action vì feature chỉ có 1 action thật.

### 4.2 Data Model

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|
| KudoHeart | `kudo_hearts` *(mới, F008 sở hữu)* | `id`, `kudo_id`, `user_id`, `special`, `created_at` | Lượt thả tim của 1 Sunner cho 1 kudo; `UNIQUE (kudo_id, user_id)` enforce BR-001 |
| Kudo | `kudos` *(F007 sở hữu, F008 chỉ đọc)* | `id`, `sender_id` | Đọc `sender_id` để chặn tự thả tim (BR-002) và xác định tài khoản được cộng/thu hồi tim (BR-003) |
| User | `public.users` *(hệ thống, F008 chỉ đọc)* | `id` | Khoá ngoại `user_id` của lượt tim trỏ về Sunner đang đăng nhập |

**Schema dự kiến** (migration provisional `0007_kudo_hearts.sql`, chạy SAU `0006_kudos.sql` của
F007 vì có khoá ngoại tới `kudos.id` — xem § 5.3 Unresolved Questions #1):

```sql
CREATE TABLE public.kudo_hearts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kudo_id uuid NOT NULL REFERENCES public.kudos(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    special boolean NOT NULL DEFAULT false, -- cột để sẵn cho quy tắc "+2 tim ngày đặc biệt"
                                             -- (hoãn — xem clarifications.md); luôn false hiện tại
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (kudo_id, user_id) -- BR-001: đúng 1 người, 1 lượt tim, 1 kudo
);

ALTER TABLE public.kudo_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudo_hearts FORCE ROW LEVEL SECURITY;

-- REVOKE trước GRANT — cùng pattern 0005_profile_cards_view.sql: default privileges của
-- Supabase cấp ALL cho anon/authenticated trên object mới trong schema public.
REVOKE ALL ON public.kudo_hearts FROM anon, PUBLIC, authenticated;

-- Đọc công khai: cả anonymous lẫn authenticated cần đếm số tim để hiển thị trên thẻ
-- (F007 đọc trực tiếp bảng này, không qua API riêng của F008).
GRANT SELECT ON public.kudo_hearts TO anon, authenticated;
CREATE POLICY kudo_hearts_select_all
    ON public.kudo_hearts FOR SELECT
    TO anon, authenticated
    USING (true);

-- BR-002 nằm ngay trong WITH CHECK: user không thể tự thả tim cho kudo mình gửi,
-- enforce ở tầng DB chứ không chỉ ở nút disable phía UI.
GRANT INSERT ON public.kudo_hearts TO authenticated;
CREATE POLICY kudo_hearts_insert_own
    ON public.kudo_hearts FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND user_id <> (SELECT sender_id FROM public.kudos WHERE id = kudo_id)
    );

-- Bỏ tim: chỉ được xoá đúng lượt tim của chính mình.
GRANT DELETE ON public.kudo_hearts TO authenticated;
CREATE POLICY kudo_hearts_delete_own
    ON public.kudo_hearts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
```

**Bổ sung (2026-09-10, BR-005):** `kudos_cards` (view F007 sở hữu, migration `0006`/`0009`) trước
đây chỉ lộ `sender_id` đã `NULL` hoá cho kudo ẩn danh — không đủ để F008 xác định `is_own` khi
`sender_id` bị ẩn. Migration `0016_kudos_cards_is_own.sql` thêm 1 cột tính sẵn vào cuối `SELECT`
của view (`CREATE OR REPLACE VIEW` chỉ được thêm cột ở cuối, không đổi thứ tự cột hiện có):

```sql
(k.sender_id = auth.uid()) AS is_own   -- true kể cả khi kudo ẩn danh (so trên sender_id THẬT,
                                        -- chưa mask — chỉ boolean lộ ra, không lộ danh tính)
```

`is_own` là `NULL` khi `auth.uid()` là `NULL` (chưa đăng nhập) — UI coi `NULL` như `false`. Cột
này thuộc migration của F007 (chủ view) nhưng phục vụ đúng 1 rule của F008 (BR-005) — F008 chỉ
tiêu thụ trong `deriveKudosCardState` (§ 3.1), không tự sở hữu view.

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities. `special` là boolean đơn (không phải enum ≥2 giá
trị phân nhánh hành vi) nên không cần DISC-###.

### 4.3 State Management

None. Trạng thái "đã thả tim / chưa thả tim" của 1 cặp (kudo, người xem) chỉ là 2 trạng thái với
2 lượt chuyển (thả/bỏ) — dưới ngưỡng cần một block SM-### riêng; đã mô tả đủ trong BR-001/BR-003
ở § 3.1.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, không thuộc riêng action nào

**A0 · FR-601 — Mọi ràng buộc nghiệp vụ của lượt tim (một lượt/người/kudo — BR-001; người gửi
không tự thả tim — BR-002) được Postgres RLS enforce lại ở tầng DB, không chỉ dựa vào Server
Action.** Áp dụng cho MỌI câu lệnh INSERT/DELETE trên bảng `kudo_hearts`, không riêng A1 — đây là
chốt chặn cuối cùng nếu tầng ứng dụng có bug hoặc bị gọi thẳng bỏ qua UI. Role `authenticated` là
điều kiện tiên quyết cho INSERT/DELETE; `anon` chỉ có SELECT. **Mở rộng (BR-004/BR-005):** việc
disable nút tim ở UI (anonymous, in-flight, hoặc own-kudo/is_own) luôn CHỈ là gương phản chiếu —
Postgres RLS (`kudo_hearts_insert_own`, § 4.2) vẫn là điểm chặn thật, kể cả khi 2 rule UI này có
bug — BR-004/BR-005 không phải lớp bảo mật mới, chỉ là UX.
**Source:** `supabase/migrations/0007_kudo_hearts.sql` · schema thật ở § 4.2.

### 4.5 Algorithms & Integrations

None. Công thức tính tổng tim credited cho 1 tài khoản (`SUM(CASE WHEN special THEN 2 ELSE 1
END)` trên các row `kudo_hearts` mà kudo tương ứng có `sender_id` = tài khoản đó) là phép cộng
đơn giản, không đạt ngưỡng "phép tính không tầm thường" cần một block ALG-### riêng — đã nêu
trong BR-003 và § 5.4 Data Flow.

### 4.6 Configuration

None. Quy tắc "+2 tim ngày đặc biệt" là cấu hình do admin đặt trong tương lai, nhưng chưa có màn
admin nào tồn tại nên chưa có hằng số/env nào để khai báo ở đây — xem `functional-spec.md` § 1
Non-Scope.

**Client behavior:** see
[`behavior-logic.md`](../../../../docs/vi/generated/behavior-logic.md) (client-side patterns — debounce, optimistic UI, polling, upload, realtime),
[`permissions.md`](../../../../docs/vi/system/permissions.md) (feature flags / experiments / env / locale gates),
[`screen-flow.md`](../../../../docs/vi/generated/screen-flow.md) (guards / deep-link state restoration / unsaved-changes protection).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* Toggle tim thành công: đổi đúng 1 row trong `kudo_hearts`, số tim đổi đúng ±1,
  trạng thái nút đổi màu đúng (covers FR-401, FR-402, BR-001, BR-003)
- **SC-002** *(A1)* Chặn thả tim trái phép: sender tự thả tim trên kudo của mình bị từ chối ở
  tầng RLS dù bỏ qua UI (covers FR-202, BR-002, FR-601)
- **SC-003** *(A1)* Người chưa đăng nhập không thể ghi lượt tim dù cố gọi thẳng server action
  (covers FR-203, FR-601)
- **SC-004** *(A1)* Bấm tim 2 lần liên tiếp trước khi request đầu trả lời — nút hiện disable tạm
  thời ở lần bấm thứ 2, không có request thứ 2 nào được gửi (covers BR-004) — unit
  `src/app/(public)/kudos/_hooks/use-kudos-hearts.test.ts`.
- **SC-005** *(A1)* Đăng nhập bằng đúng tài khoản đã gửi 1 kudo ẩn danh, xem lại kudo đó trên board
  — nút tim hiện disable (covers BR-005, FR-202) — unit test đọc `card.isOwn`/`deriveKudosCardState`.

#### US001_ThaTimChoKudo *(A1)*

**Independent Test:** Gọi trực tiếp `toggleKudoHeart(kudoId)` với 1 tài khoản Sunner hợp lệ không
phải sender của kudo đó, xác nhận có đúng 1 row mới trong `kudo_hearts`; gọi lại lần 2 xác nhận
row bị xoá (unheart) — không cần qua UI.

**Acceptance Scenarios:**

1. **Given** Sunner đã đăng nhập chưa thả tim cho kudo X, **When** gọi toggle lần 1, **Then** 1
   row được insert, số tim +1.
2. **Given** Sunner đã thả tim cho kudo X, **When** gọi toggle lần 2, **Then** row bị xoá, số tim
   -1.
3. **Given** Sunner là sender của kudo X, **When** gọi toggle, **Then** bị RLS từ chối, không
   row nào được ghi.

#### US002_SeePendingAndOwnKudoHeartState *(A1)*

**Independent Test:** Gọi `toggleHeart` 2 lần liên tiếp trong cùng 1 tick cho cùng 1 kudo qua
`useKudosHearts` — assert lần gọi thứ 2 không tạo request mới (`inFlight` chặn), `pendingIds`
chứa đúng id trong lúc chờ.

**Acceptance Scenarios:**
1. **Given** Sunner vừa bấm tim, request chưa trả lời, **When** bấm tim lại ngay lập tức, **Then**
   nút hiện disable tạm thời, không gửi thêm request.
2. **Given** Sunner đã gửi 1 kudo ẩn danh, **When** chính Sunner đó xem lại kudo này trên board,
   **Then** nút tim hiện disable giống mọi kudo tự gửi khác (qua `card.isOwn`).

### 5.2 Assumptions

- *(A1)* Giả định `kudos.sender_id` (do migration `0006_kudos.sql` của F007 định nghĩa) tồn tại
  và trỏ về `public.users.id` — F008 đọc cột này để enforce BR-002 nhưng không sở hữu bảng
  `kudos`.
- *(A1)* Giả định F007's DAL/UI đọc trực tiếp bảng `kudo_hearts` (qua policy SELECT công khai) để
  tính số tim mỗi kudo và tổng "Số tim bạn nhận được" ở sidebar (`D.1.4`) — F008 không cung cấp
  API/DAL đọc riêng, tránh trùng lặp logic đọc giữa 2 feature.
- *(A1)* Giả định migration `0007_kudo_hearts.sql` của F008 chạy sau migration `0006_kudos.sql`
  của F007 vì có khoá ngoại tới `kudos.id`.
- *(A1)* Cột `is_own` thêm vào `kudos_cards` (migration `0016`) là cách rẻ nhất để giải quyết
  BR-005 — không cần đổi cơ chế ẩn danh (`sender_id NULL`) hiện có, chỉ thêm 1 cột boolean tính
  sẵn.
- *(A1)* `pendingIds` chỉ tồn tại trong state client (không round-trip server) — server đã tự
  đồng bộ đúng qua `UNIQUE(kudo_id, user_id)` (BR-001), `pendingIds` chỉ là tín hiệu UX, không
  phải một lớp khoá mới.

### 5.3 Unresolved Questions

1. **Đơn vị migration — RESOLVED**: bảng `kudo_hearts` nằm trong migration riêng thật
   `0007_kudo_hearts.sql`, tách khỏi `0006_kudos.sql` của F007 — đúng như giả định ban đầu.
2. **Nguồn đọc số tim — RESOLVED**: F007 tính số tim mỗi kudo bằng `COUNT`/`SUM` trực tiếp trên
   `kudo_hearts` qua view `kudos_cards`, không denormalize vào cột riêng.
3. **Mâu thuẫn text trong spec CSV (item `C.4.1`)** *(A1)*: trường `databaseNote` ghi "thu hồi ...
   cho người nhận kudo", trong khi `description` cùng item và TC "Like on special day" đều ghi rõ
   tài khoản được cộng tim là "sender's account" — đã theo `description` + TC + `feature-list.md`
   (tài khoản NGƯỜI GỬI), coi `databaseNote` là lỗi đánh máy trong design tool, không phải một
   nguồn sự thật khác.
4. **Ai sở hữu migration `is_own` — RESOLVED**: `0016_kudos_cards_is_own.sql` — F007 (chủ view
   `kudos_cards`) thực hiện theo yêu cầu từ F008, đúng tiền lệ F008 đọc `kudos.sender_id` mà
   không cần F007 đổi API.

### 5.4 Source References

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1 | 1 | `toggleKudoHeart` | `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61` | Server Action ghi/xoá lượt tim |
| A1 | 2 | `useKudosHearts` | `src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:69-109` | State client: `heartOverrides` + `pendingIds` (BR-004) |
| A1 | 3 | `deriveKudosCardState` | `src/app/(public)/kudos/_utils/kudos-card-state.ts:39-58` | Gộp trạng thái nút tim mỗi thẻ — `isOwn` (BR-005) + `pending` (BR-004) |
| A1 | 4 | `KudosHeartButton` | `src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73` | Render nút — nhận `disabled`/`title` đã tính sẵn |
| A1 | 5 | `kudos_cards.is_own` | `supabase/migrations/0016_kudos_cards_is_own.sql` | Cờ ownership tính trên `sender_id` thật, chưa mask |

#### Data Flow

```text
toggleKudoHeart(kudoId) input
  -> xác thực session hiện tại (auth.getUser())
  -> applyToggle: SELECT 1 FROM kudo_hearts WHERE kudo_id = ... AND user_id = auth.uid()
  -> có row: DELETE row đó (bỏ tim, thu hồi đúng số đã cộng)
     không có row: INSERT row mới (thả tim); RLS WITH CHECK chặn nếu user_id = kudos.sender_id;
     bắt riêng lỗi 23505 (2 click đua nhau) -> đọc lại row thay vì trả lỗi
  -> revalidatePath(ROUTES.KUDOS); trả về { hearted, heartCount } cho client re-render nút + số
     tim (F007 sở hữu phần render)
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [overview.md](../../../../docs/vi/system/overview.md) | TBD (draft) | [ ] |
| Architecture | [architecture.md](../../../../docs/vi/system/architecture.md) | TBD (draft) | [ ] |
| Feature List | [feature-list.md](../feature-list.md) | F008 | [ ] |
| API Map | [api-map.md](../../../../docs/vi/generated/api-map.md) | TBD (draft) | [ ] |
| Entities | [entities.md](../../../../docs/vi/generated/entities.md) | TBD (draft) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | TBD (draft) | [ ] |
| Behavior Logic | [behavior-logic.md](../../../../docs/vi/generated/behavior-logic.md) | TBD (draft) | [ ] |
| Permissions Matrix | [permissions-matrix.md](../../../../docs/vi/generated/permissions-matrix.md) | TBD (draft) | [ ] |
| User Stories | [user-stories.md](../../../../docs/vi/generated/user-stories.md) | TBD (draft) | [ ] |
