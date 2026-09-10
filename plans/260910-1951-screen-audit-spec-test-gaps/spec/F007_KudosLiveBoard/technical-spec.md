---
status: draft
authored_by: takumi
fcode: F007
created: 2026-09-10
lang: vi
---

# F007_KudosLiveBoard — REVISION

**Priority**: P0
**Type**: mixed
**Generated**: 2026-09-10

**Revision note:** bản `docs/vi/features/F007_KudosLiveBoard/technical-spec.md` hiện tại
(`status: implemented`) thiếu 4 điểm khách hàng yêu cầu — đã xác nhận qua audit
(`plans/260910-1951-screen-audit-spec-test-gaps/research/audit-kudos-board.md`) và 2 spec CSV
dropdown chưa từng đọc (`JWpsISMAaM`, `WXK5AYB_rG`). File này CHỈ liệt kê phần THAY ĐỔI/THÊM MỚI —
mọi Action/BR/FR không nhắc tới bên dưới giữ nguyên như bản đã ship.

## 1. Technical Overview

Bổ sung cho Technical Overview hiện có: A1 (render `/kudos`) nay còn đọc thêm 1 view mới
`public.recent_gift_recipients` (SECURITY DEFINER, bọc `secret_box_openings` — bảng RLS
own-rows-only của F008/F000) để lấp sub-feature 6 (`giftRecipients` hiện hardcode rỗng). 2 bộ lọc
Hashtag/Phòng ban VẪN suy ra từ dữ liệu kudos thật trong CSDL — đúng như parent spec đã ghi rõ
(`MaZUn5xHXZ` row B.1.1: "Danh sách hashtag được truy vấn từ cơ sở dữ liệu"; row B.1.2: "Danh sách
phòng ban sẽ được truy vấn từ cơ sở dữ liệu"; cũng được xác nhận lại ở
`supabase/migrations/0008_kudos_demo_seed.sql:28-33`). Cái SAI không phải nguồn dữ liệu (DB đã
đúng), mà là cách đọc: A1 hiện lấy option list và tổng Spotlight từ CÙNG 1 mảng bị PostgREST cắt ở
`max_rows=1000` (`supabase/config.toml:18`), nên khi vượt ngưỡng đó, cả tổng lẫn danh sách lọc đều
sai âm thầm (audit gap #3) — sửa bằng 1 truy vấn distinct-value + 1 `COUNT` chính xác, không phải
bằng cách thay dữ liệu thật bằng hằng số cố định (xem § 5.3 về lần sửa sai trước của chính draft
này). `rankUps` (leaderboard "THĂNG HẠNG") KHÔNG nằm trong revision này — không có bảng
rank-tracking nào tồn tại (`grep -rn "rank" src/dal src/app/\(public\)/kudos` → 0 hit ngoài chính
tên biến UI), giữ nguyên rỗng theo thiết kế, xem § 5.2.

## 2. Action Index — dòng đổi/thêm

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A1** | `KudosPage` (Server Component) — **Codes bổ sung:** FR-215, FR-217, FR-219, BR-017, BR-020, US010 | `GET` `/kudos` | *(giữ nguyên các code cũ + code mới trên)* | — *(read-only)* | § 3.1 |
| **A9** | `KudosFilterMenu` (client-only, không BE — trình bày panel dropdown) | — *(click mở, không HTTP)* | FR-218, BR-019 | — *(read-only)* | § 3.1 |

`A9` mới: tách riêng khỏi A1 vì đây là hành vi TRÌNH BÀY của chính dropdown (panel/scroll/option
style), không phải dữ liệu A1 đọc — theo đúng ranh giới action hiện có (`KudosFilterBar` đã là 1
component riêng trong § 4.1, chỉ chưa có action/rung riêng).

## 3. Actions — rung bổ sung

### 3.1 CAP-01 (bổ sung vào A1 hiện có)

**Rule (bổ sung):**
- **BR-017 — Tổng Spotlight và 2 danh sách option của bộ lọc (Hashtag, Phòng ban) KHÔNG được tính
  từ 1 lần đọc không giới hạn/không sắp xếp trên `kudos_cards` (giới hạn `max_rows=1000` của
  PostgREST, `supabase/config.toml:18`) — phải dùng `COUNT` chính xác cho tổng, và một truy vấn
  distinct-value (hoặc RPC/view) cho 2 danh sách option, độc lập với số dòng PostgREST trả về cho
  bất kỳ lần đọc nào khác. Dữ liệu 2 danh sách này VẪN đọc từ bảng `kudos` thật — parent spec
  (`MaZUn5xHXZ` B.1.1/B.1.2) đã nói rõ đây là dữ liệu vận hành, không phải danh sách cố định theo
  thiết kế.** *(Bin 1 — chỉ dùng ở A1; thay thế cách tính hiện tại ở
  `src/dal/kudos.ts:103,130,134-139`, cùng 1 gốc lỗi với FR-217 — xem § 1)*
- **BR-020 — Sidebar hiển thị đúng 10 Sunner mở Secret Box gần nhất, sắp theo `opened_at` giảm
  dần, đọc qua view `SECURITY DEFINER` (RLS gốc của `secret_box_openings` chỉ own-rows).**
  *(Bin 1 — chỉ dùng ở A1)*

**BE (bổ sung):** đọc thêm `` `getRecentGiftRecipients(client, { limit: 10 })` `` (DAL mới, mirror
`getKudosBoard`'s fail-open-to-`[]` pattern) → `SELECT ... FROM public.recent_gift_recipients ORDER
BY opened_at DESC LIMIT 10` (view đã join sẵn `users` cho tên/avatar). Tổng Spotlight đổi từ
`selectCards(client, {}).length` sang `.select("*", { count: "exact", head: true })`
(`src/dal/kudos.ts:103,130` — sửa tại chỗ, không thêm read mới). 2 danh sách option đổi từ suy ra
qua `totalsRows.flatMap/.map` trên mảng đã bị `max_rows` cắt (`kudos.ts:134-139`) sang 1 truy vấn
distinct-value riêng trên toàn bộ `kudos_cards` — ví dụ `SELECT DISTINCT unnest(hashtags)`/
`SELECT DISTINCT receiver_department`, hoặc 1 view/RPC tương đương; KHÔNG một hằng số tĩnh nào
được thêm vào repo (bản draft trước của chính file này từng đề xuất sai
`src/constants/kudos-vocabulary.ts` — đã rút lại, xem § 5.3).

**Result (bổ sung):** props `giftRecipients: KudosLeaderboardItemData[]` xuống `KudosScreen` không
còn hardcode `[]` (`kudos-client.tsx:189` hiện tại) — lấy từ `getRecentGiftRecipients`. Mỗi mục
hiển thị avatar/tên (từ `users`) và mô tả quà — mô tả lấy từ `badge_key` map sang caption đã có sẵn
(`standards-copy.ts:95-100` mẫu ánh xạ badge→tên hiển thị; xem Open Decision D004 ở
`functional-spec.md § 3` về việc dùng caption huy hiệu thay cho text quà vật lý mock).
**Source (bổ sung):** `src/app/(public)/kudos/_components/kudos-leaderboard.tsx:14-16` (comment
hiện tại khẳng định sai "chưa có gift ledger" — migration `0011_secret_box.sql:68-77` đã tạo
`secret_box_openings`; xoá comment này khi implement) → `src/app/(public)/kudos/_components/kudos-client.tsx:188-189`
(2 dòng hardcode `[]` — `rankUps` giữ `[]`, chỉ `giftRecipients` đổi).

---

#### A9 · Trình bày panel dropdown Hashtag/Phòng ban
— *(click mở, không HTTP)* → `` `KudosFilterMenu` `` (client-only)
`FR-218` · `SCR007_KudosLiveBoard` · `BR-019`

**Who** · Bất kỳ khách truy cập nào mở dropdown Hashtag hoặc Phòng ban *(gate A0)*.
**FE** · `KudosFilterMenu` (`src/app/(public)/kudos/_components/kudos-filter-menu.tsx:104,117`) —
panel hiện `rounded bg-[#0B0F12] shadow-lg` không viền, không đệm, `overflow-hidden` không giới
hạn chiều cao; option hiện `px-4 py-2 text-sm … text-left` và render `{option}` bare (không tiền tố
`#` cho hashtag). Đây là 3 khác biệt với node thiết kế thật (`563:8026`/`563:8027`) mà audit gap
#5-#7 nêu.
**Request** · không có (client-only).
**BE** · không có.
**Rule**
- **BR-019 — Panel dropdown và mỗi option dùng đúng giá trị thiết kế: panel nền `#00070C`, viền
  `1px solid #998C5F`, bo góc `8px`, đệm `6px`, cuộn dọc khi danh sách vượt chiều cao khung
  (~348px); option cao `56px`, đệm `16px`, bo góc `4px`, chữ Montserrat 700 16px/24px,
  letter-spacing `0.5px`, căn giữa; mục đang chọn có nền `rgba(255,234,158,0.10)` + text-shadow
  `0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287`; nhãn hashtag giữ tiền tố `#`.** *(Bin 1 — chỉ dùng
  ở A9; giá trị đọc trực tiếp từ node `563:8026`/`563:8027`, không suy đoán — xem audit report
  dòng 38-45)*
**Result** · read-only — không ghi DB, chỉ đổi CSS/markup của panel đã có.
**Source:** `src/app/(public)/kudos/_components/kudos-filter-menu.tsx:104,117`.

<!-- Không cần diagram: trình bày client-side thuần, không ghi bảng nào. -->

**Hover color:** không có giá trị thiết kế xác nhận cho trạng thái hover (spec CSV chỉ ghi "hiển
thị hiệu ứng nổi nhẹ", không có node hover riêng) — giữ nguyên `hover:bg-white/10` hiện tại như một
giá trị đoán, không phải giá trị đã đọc; xem `functional-spec.md § 3` D003.

**Vì sao `max-height` + cuộn dọc (trong BR-019) quan trọng hơn sau khi BR-017 đổi:** danh sách
Phòng ban giờ đọc DISTINCT trực tiếp từ dữ liệu thật, không còn là 1 con số biết trước (~50 theo
audit) — số lượng phòng ban thật có thể tăng/giảm theo dữ liệu vận hành, không cố định. Panel
KHÔNG có `max-height` (như code hiện tại) sẽ tràn layout tuỳ theo dữ liệu, không tuỳ theo thiết kế
— `max-height`/`overflow-y-auto` do đó là yêu cầu bắt buộc cho MỌI kích cỡ danh sách, không chỉ
trường hợp ~50 mục audit từng thấy.

### 3.{N+1} Edge cases — dòng bổ sung

| Action | Scenario | Behavior |
|---|---|---|
| A1 | `secret_box_openings` rỗng (chưa ai mở Secret Box) | `getRecentGiftRecipients` trả `[]`; sidebar hiện "Chưa có dữ liệu" giống nhánh rỗng hiện có (BR-012) — không phải lỗi |
| A1 | Số dòng `kudos` vượt 1000 | Tổng Spotlight và 2 danh sách option bộ lọc vẫn đúng/đầy đủ (BR-017 dùng `COUNT` chính xác + truy vấn distinct-value, không còn phụ thuộc `max_rows`) |
| A9 | Danh sách phòng ban (số lượng phụ thuộc dữ liệu thật, không cố định) vượt chiều cao panel | Panel cuộn dọc (`max-h` + `overflow-y-auto`), không tràn layout — đúng với MỌI độ dài danh sách, không riêng ~50 mục |

## 4. Shared Foundation — mục bổ sung

### 4.1 Components — dòng bổ sung

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `getRecentGiftRecipients` | Đọc 10 Sunner mở Secret Box gần nhất qua view definer | A1 | `src/dal/kudos.ts` (hàm mới) hoặc `src/dal/secret-box.ts` |
| `getKudosFilterOptions` (tên đề xuất) | Truy vấn distinct-value cho 2 danh sách option (hashtag, phòng ban) trên toàn bộ `kudos_cards`, độc lập `max_rows` | A1 | `src/dal/kudos.ts` (hàm mới, thay thế `kudos.ts:134-139`) |

### 4.2 Data Model — bổ sung

```sql
-- Migration mới (số hiệu do implementer chọn theo thứ tự thật, ví dụ 0012_recent_gift_recipients.sql).
-- RLS của secret_box_openings là own-rows-only (0011:101-105) — không đổi policy đó, thêm 1 view
-- SECURITY DEFINER công khai theo đúng mẫu kudos_cards (0006) đã dùng.
CREATE OR REPLACE VIEW public.recent_gift_recipients
    WITH (security_invoker = false)
AS
SELECT
    u.id, u.full_name, u.avatar_url, s.badge_key, s.opened_at
FROM public.secret_box_openings s
JOIN public.users u ON u.id = s.user_id
ORDER BY s.opened_at DESC
LIMIT 10;

REVOKE ALL ON public.recent_gift_recipients FROM anon, PUBLIC, authenticated;
GRANT SELECT ON public.recent_gift_recipients TO anon, authenticated;
```

`LIMIT 10` ngay trong view (đủ cho D.3, không cần tham số) — mirror cách `kudos_cards` không giới
hạn nhưng nơi đây giới hạn sẵn vì mục đích duy nhất là sidebar top-10; nếu sau này cần top-N khác,
đổi view thành hàm/RPC nhận tham số thay vì sửa `LIMIT` cứng.

### 4.4 Shared Rules — bổ sung

#### Bin 3 — cross-cutting

**A0 · FR-217 — Mọi phép đếm/liệt kê board-wide (tổng Spotlight, danh sách lọc) không được phụ
thuộc `max_rows=1000` của PostgREST.** Áp dụng cho A1 (đọc lần đầu) và ngầm định cho mọi lần đọc
lại board sau này (ví dụ `loadMoreKudos`, dùng chung DAL) — không riêng 1 hành động.
**Source:** `supabase/config.toml:18`.

### 4.6 Configuration — bổ sung

```text
GIFT_RECIPIENTS_LIMIT = 10   # số Sunner hiển thị ở "10 SUNNER NHẬN QUÀ MỚI NHẤT" (BR-020)
```

Không có hằng số cấu hình nào cho danh sách hashtag/phòng ban — 2 danh sách này là dữ liệu vận
hành đọc trực tiếp từ CSDL (BR-017), không phải giá trị cấu hình tĩnh.

## 5. Verification & Technical Notes — bổ sung

### 5.1 Technical Verification — dòng bổ sung

- **SC-008** *(A1)* Sidebar "10 SUNNER NHẬN QUÀ MỚI NHẤT" render đúng 10 mục (hoặc ít hơn nếu chưa
  đủ dữ liệu), sắp `opened_at` giảm dần, không còn hardcode rỗng (covers FR-219, BR-020)
- **SC-009** *(A1)* Seed >1000 dòng `kudos` (hoặc mock `COUNT`) trải trên >1000 giá trị hashtag/
  phòng ban phân biệt — tổng Spotlight vẫn là `COUNT` chính xác, VÀ 2 danh sách option vẫn chứa đủ
  MỌI giá trị distinct thật trong dữ liệu, không đứng ở tập con 1000 dòng đầu (covers FR-215,
  FR-217, BR-017)
- **SC-010** *(A9)* Panel dropdown Phòng ban cuộn được với bất kỳ độ dài danh sách nào (không riêng
  ~50 mục), không tràn; mục đang chọn có nền khác biệt (covers FR-218, BR-019)

#### US010_ViewRecentGiftRecipients *(A1)*

**Independent Test:** Seed ≥1 row `secret_box_openings`, mở `/kudos` — sidebar phải hiện đúng tên
Sunner đó thay vì "Chưa có dữ liệu".

**Acceptance Scenarios:**
1. **Given** có ≥1 lượt mở Secret Box, **When** mở `/kudos`, **Then** sidebar "10 SUNNER NHẬN QUÀ
   MỚI NHẤT" hiện đúng (các) Sunner đó, mới nhất trước.
2. **Given** chưa ai mở Secret Box, **When** mở `/kudos`, **Then** sidebar hiện "Chưa có dữ liệu"
   (không phải lỗi).

### 5.2 Assumptions — bổ sung

- *(A1)* `rankUps` (leaderboard "THĂNG HẠNG") giữ nguyên `[]` trong revision này — KHÔNG có bảng
  rank-tracking nào tồn tại trong schema hiện tại; đây là quyết định giữ nguyên đã có (không phải
  một gap của revision này), ghi lại tường minh để không lẫn với sub-feature 6 (`giftRecipients`).
- *(A1)* Giả định `recent_gift_recipients` không cần lọc theo hashtag/department (D.3 trong thiết
  kế không có điều khiển lọc riêng) — luôn là top-10 toàn hệ thống.

### 5.3 Unresolved Questions — bổ sung

1. **Draft trước của chính file này đề nghị sai hướng cho FR-215/FR-216** *(A1)*: bản draft ban đầu
   coi 13 hashtag ở `JWpsISMAaM` row A và ~50 phòng ban ở `WXK5AYB_rG` row A là danh sách CỐ ĐỊNH
   cần hardcode — SAI. Parent spec `MaZUn5xHXZ` row B.1.1/B.1.2 nói rõ cả 2 danh sách "được truy
   vấn từ cơ sở dữ liệu"; migration `0008_kudos_demo_seed.sql:28-33` xác nhận lại cùng dòng spec
   đó. 2 CSV dropdown là nội dung MINH HOẠ ("dữ liệu tổ chức thật trông như thế nào"), không phải
   vocabulary UI — đã sửa thành FR-215 hợp nhất (§ 2 `functional-spec.md`); không còn cần tách ranh
   giới ~50 tên phòng ban trong CSV vì không ai cần parse chúng nữa.
2. **Mô tả quà trong D.3 là text mock vật lý** *(A1)*: node D.3.4 ghi "Nhận được 1 áo phông SAA"
   nhưng hệ thống thật chỉ có `badge_key` (1 trong 6 huy hiệu) — xem Open Decision D004 ở
   `functional-spec.md § 3`.
3. **Filter AND/OR** *(A9, A1)*: xem Open Decision D003 ở `functional-spec.md § 3` — giữ nguyên
   hành vi AND hiện tại (`kudos-cards-query.ts:104-109`) cho tới khi có quyết định.
4. **Seed hiện chỉ có 2 phòng ban** *(A1)*: xem Open Decision D005 ở `functional-spec.md § 3` — SC-009
   không thể chạy trên seed hiện có (`0008_kudos_demo_seed.sql` chỉ tạo `CEVC10`/`CEVC20`), cần dữ
   liệu test riêng để xác nhận danh sách option thật sự đầy đủ.

### 5.4 Source References — không đổi cấu trúc, xem bản hiện có; các path mới ở trên đều là file
CHƯA tồn tại (`getKudosFilterOptions` trong `src/dal/kudos.ts`, migration `recent_gift_recipients`)
— không trích `path:line` cho chúng cho tới khi implement (theo đúng quy tắc draft).

### 5.5 Artifact References — không đổi so với bản hiện có.

## Known-stale-upstream (không phải yêu cầu thay đổi)

Ghi lại 2 điểm MoMorph sai, CODE ĐÚNG — không sửa code theo prose spec, chỉ cần MoMorph/TC được
sửa ở lần audit sau (xem `audit-kudos-board.md` UNVERIFIABLE #3, #4):

- Banner tiêu đề: row A + TC `40d4ba26` ghi "Hệ thống ghi nhận lời cảm ơn"; TEXT node thật
  `2940:13439` là "Hệ thống ghi nhận và cảm ơn" — code (`messages/vi.json:214`) và e2e C02 đã đúng
  theo node thật.
- Row D.1 ghi "6 dòng số liệu"; frame `2940:13490` chỉ có 5 dòng số liệu thật (D.1.2/D.1.3/D.1.4/
  D.1.6/D.1.7) — code (`kudos-stat-list.tsx:57-63`) và e2e C27 đã đúng theo frame thật.
