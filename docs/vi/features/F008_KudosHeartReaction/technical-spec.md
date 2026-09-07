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
| **A1** | `toggleKudoHeart()` (Server Action) | `POST` *(Server Action, không có HTTP path riêng)* | FR-001, FR-201, FR-202, FR-203, FR-401, FR-402, FR-601, BR-001, BR-002, BR-003, US001 | `kudo_hearts` | § 3.1 |

## 3. Actions

### 3.1 CAP-01 — Thả tim cho Kudos

#### A1 · Thả tim / bỏ tim (toggle) cho một Kudo
`POST` *(Server Action, không có HTTP path riêng)* → `` `toggleKudoHeart()` ``
`FR-001` `FR-201` `FR-202` `FR-203` `FR-401` `FR-402` `FR-601` · `SCR007_KudosLiveBoard` · `US001`

**Who** · Sunner đã đăng nhập, không phải là người đã gửi chính kudo đang thao tác *(gate A0 —
§ 4.4)*.
**FE** · Nút trái tim trên mỗi thẻ Kudos — JSX/CSS của nút do F007 sở hữu (xem
`spec/kudosliveboard/technical-spec.md`); F008 chỉ định nghĩa hành vi khi nút được bấm và GIÁ TRỊ
đúng của trạng thái nút: xám khi chưa có lượt tim của người xem, đỏ khi đã có (FR-201); disable
khi người xem chưa đăng nhập (FR-203) hoặc chính là sender của kudo đó (FR-202) — F007 chỉ vẽ lại
theo giá trị này, không tự suy ra. Client gọi `toggleKudoHeart(kudoId)` khi bấm, không truyền
trạng thái hearted hiện có — server tự xác định lại từ session + dữ liệu, không tin dữ liệu
client gửi lên.
**Request** · tham số `kudoId` *(uuid — id của kudo đang thao tác)*.
**BE** · `` `toggleKudoHeart(kudoId)` `` — đọc lại session hiện tại (`auth.uid()`), kiểm tra đã
tồn tại row `kudo_hearts` cho `(kudoId, userId)` hay chưa để quyết định INSERT (thả tim) hay
DELETE (bỏ tim). `TBD (draft)` — chưa có file thật.
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
**Result** · INSERT đúng 1 row `kudo_hearts` (thả tim) hoặc DELETE đúng 1 row đó (bỏ tim); không
có write nào khác trong cùng request. Client re-render ngay màu nút và số tim mới ngay khi action
trả về, không cần tải lại trang (FR-401); khi DELETE, số tim đọc được cho tài khoản người gửi
giảm đúng bằng số đã cộng trước đó, vì số tim luôn là phép đếm trực tiếp trên bảng, không phải
một bộ đếm riêng cần "hoàn tác" (FR-402, BR-003). `TBD (draft)`.
**Source:** `TBD (draft)`

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
điều kiện tiên quyết cho INSERT/DELETE; `anon` chỉ có SELECT.
**Source:** `TBD (draft)` · schema dự kiến ở § 4.2.

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

### 5.2 Assumptions

- *(A1)* Giả định `kudos.sender_id` (do migration `0006_kudos.sql` của F007 định nghĩa) tồn tại
  và trỏ về `public.users.id` — F008 đọc cột này để enforce BR-002 nhưng không sở hữu bảng
  `kudos`.
- *(A1)* Giả định F007's DAL/UI đọc trực tiếp bảng `kudo_hearts` (qua policy SELECT công khai) để
  tính số tim mỗi kudo và tổng "Số tim bạn nhận được" ở sidebar (`D.1.4`) — F008 không cung cấp
  API/DAL đọc riêng, tránh trùng lặp logic đọc giữa 2 feature.
- *(A1)* Giả định migration `0007_kudo_hearts.sql` của F008 chạy sau migration `0006_kudos.sql`
  của F007 vì có khoá ngoại tới `kudos.id`.

### 5.3 Unresolved Questions

1. **Đơn vị migration** *(A1)*: bảng `kudo_hearts` nằm trong migration riêng
   `0007_kudo_hearts.sql` hay gộp chung `0006_kudos.sql` của F007 — chưa xác nhận vì 2 file
   thuộc 2 agent khác nhau trong cùng phiên; giả định tách riêng để giữ ranh giới ownership giữa
   F007 và F008.
2. **Nguồn đọc số tim** *(A1)*: F007 tính số tim mỗi kudo bằng `COUNT(*)` trực tiếp trên
   `kudo_hearts` mỗi lần render, hay cache/denormalize vào một cột trên `kudos` — chưa quyết, để
   lại cho lúc implement Track B đo hiệu năng thật trên feed cuộn vô hạn.
3. **Mâu thuẫn text trong spec CSV (item `C.4.1`)** *(A1)*: trường `databaseNote` ghi "thu hồi ...
   cho người nhận kudo", trong khi `description` cùng item và TC "Like on special day" đều ghi rõ
   tài khoản được cộng tim là "sender's account" — đã theo `description` + TC + `feature-list.md`
   (tài khoản NGƯỜI GỬI), coi `databaseNote` là lỗi đánh máy trong design tool, không phải một
   nguồn sự thật khác.

### 5.4 Source References

Chưa có source code — xem `functional-spec.md § 7. User Stories` để biết hành vi dự kiến; xem
§ 5.3 ở trên cho các quyết định implementation còn treo (đơn vị migration, nguồn đọc số tim).

#### Data Flow

```text
toggleKudoHeart(kudoId) input
  -> xác thực session hiện tại (RLS auth.uid())
  -> SELECT 1 FROM kudo_hearts WHERE kudo_id = ... AND user_id = auth.uid()
  -> có row: DELETE row đó (bỏ tim, thu hồi đúng số đã cộng)
     không có row: INSERT row mới (thả tim); RLS WITH CHECK chặn nếu user_id = kudos.sender_id
  -> trả về trạng thái hearted mới cho client re-render nút + số tim (F007 sở hữu phần render)
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
