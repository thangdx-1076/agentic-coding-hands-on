---
status: draft
authored_by: takumi
fcode: F008
created: 2026-09-10
lang: vi
---

# F008_KudosHeartReaction — REVISION

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-10

**Revision note:** bản `docs/vi/features/F008_KudosHeartReaction/technical-spec.md` hiện tại
(`status: implemented`) còn để `Source: TBD (draft)` dù code đã ship — file này (a) lấp các
`path:line` thật cho A1, và (b) thêm 2 yêu cầu khách hàng xác nhận qua audit (in-flight disable,
`is_own` cho kudo ẩn danh). §§ không nhắc tới bên dưới giữ nguyên.

## 2. Action Index — Codes bổ sung cho A1

`A1` (`toggleKudoHeart()`) — **Codes bổ sung:** FR-204, FR-205, BR-004, BR-005, US002. Method ·
Path, Writes, Detail giữ nguyên (`POST`, Server Action, ghi `kudo_hearts`, § 3.1).

## 3. Actions — rung bổ sung/lấp Source cho A1

### 3.1 CAP-01 (bổ sung vào A1 hiện có)

**FE (bổ sung, thay `TBD (draft)`):** `KudosHeartButton`
(`src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73`) — hiện chưa nhận prop
`pending`; `useKudosHearts` (`src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:59-77`) giữ 1
`useRef<Set<string>>` (`inFlight`) đánh dấu kudo đang có request chưa trả lời, nhưng KHÔNG expose
set này ra ngoài — nút chỉ đọc `disabled` từ `deriveKudosCardState`
(`src/app/(public)/kudos/_utils/kudos-card-state.ts:31-45`), vốn không biết gì về in-flight.

**Rule (bổ sung):**
- **BR-004 — Nút tim của đúng kudo đang thao tác chuyển sang trạng thái disable tạm thời trong lúc
  `toggleKudoHeart` chưa trả lời; trở lại bình thường ngay khi server trả lời (thành công hay
  lỗi).** *(Bin 1 — chỉ dùng ở A1; nguồn gốc: `use-kudos-hearts.ts:59-60` hiện âm thầm bỏ qua lượt
  bấm thứ 2 thay vì hiện trạng thái chờ — audit gap #8)*
- **BR-005 — Chính người gửi 1 kudo ẩn danh nhìn thấy nút tim của kudo đó ở trạng thái disable,
  giống hệt kudo không ẩn danh — xác định qua 1 cờ do server cấp (`is_own`), không so sánh
  `sender.id` phía client (luôn `null` với kudo ẩn danh nên phép so sánh hiện tại luôn sai).**
  *(Bin 1 — chỉ dùng ở A1; nguồn gốc: `kudos-card-state.ts:36` — `card.sender.id === viewerId` —
  audit gap #9)*

**Result (bổ sung):** `useKudosHearts` trả thêm `pendingIds: Set<string>` (hoặc tương đương) bên
cạnh `heartOverrides`/`toggleHeart` hiện có; `KudosClient`/`KudosFeed` OR giá trị này vào
`heartDisabled` khi gọi `deriveKudosCardState`. `deriveKudosCardState` nhận thêm `isOwn` đã tính
sẵn từ dữ liệu (không tự suy `sender.id === viewerId` nữa).
**Source (lấp `TBD (draft)` của bản hiện có):** `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61`
→ `src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:50-77` → `src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73`
→ `src/app/(public)/kudos/_utils/kudos-card-state.ts:22-45`.

### 3.2 Edge cases — dòng bổ sung

| Action | Scenario | Behavior |
|---|---|---|
| A1 | Bấm tim khi request trước của CHÍNH kudo đó còn đang chạy | Nút hiện trạng thái disable tạm thời (BR-004) thay vì âm thầm bỏ qua lượt bấm — người dùng thấy phản hồi, không tưởng nút bị đơ |
| A1 | Chính người gửi 1 kudo ẩn danh bấm tim trên chính kudo đó | Nút disable đúng như kudo không ẩn danh (BR-005) — trước đây nút hiện enabled nhưng RLS vẫn từ chối ở tầng DB (không phải lỗi dữ liệu, chỉ là nút "chết": bấm không có phản hồi vì không request nào được gửi thành công) |

## 4. Shared Foundation — mục bổ sung

### 4.2 Data Model — bổ sung

`kudos_cards` (view do F007 sở hữu, migration `0006`/`0009`) hiện chỉ lộ `sender_id` (đã `NULL`
hoá cho kudo ẩn danh) — không đủ để F008 xác định `is_own` khi `sender_id` bị ẩn. Cần F007 thêm 1
cột tính sẵn vào view này:

```sql
-- Bổ sung vào SELECT của public.kudos_cards (migration mới, thuộc phạm vi F007's view — F008 chỉ
-- TIÊU THỤ cột mới này, không tự sở hữu view). Không đổi cột sender_id hiện có (vẫn NULL cho kudo
-- ẩn danh) — is_own là cột THÊM, không thay thế logic ẩn danh đã có.
    (k.sender_id = auth.uid()) AS is_own   -- true kể cả khi kudo ẩn danh (sender_id thật vẫn dùng
                                            -- để so sánh phía server, chỉ KHÔNG lộ ra client)
```

`is_own` tính bằng `sender_id` THẬT (chưa mask) so với `auth.uid()` ngay trong view — an toàn vì
đây là 1 boolean, không lộ lại danh tính người gửi ẩn danh. Đây là thay đổi trên view F007 sở hữu;
F008 chỉ tiêu thụ cột này trong `deriveKudosCardState` (§ 3.1 Result ở trên).

### 4.4 Shared Rules — bổ sung

#### Bin 3 — cross-cutting

**A0 · FR-601 (mở rộng) — Việc disable nút tim ở UI (anonymous, in-flight, hoặc own-kudo) luôn CHỈ
là gương phản chiếu; Postgres RLS (`0007:78-83`) vẫn là điểm chặn thật cho mọi trường hợp, kể cả
khi 2 rule mới ở trên (BR-004/BR-005) chưa kịp implement hoặc có bug.** Không đổi so với rule A0
hiện có — nhắc lại để rõ 2 rule mới không phải lớp bảo mật mới, chỉ là UX.

## 5. Verification & Technical Notes — bổ sung

### 5.1 Technical Verification — dòng bổ sung

- **SC-004** *(A1)* Bấm tim 2 lần liên tiếp trước khi request đầu trả lời — nút hiện disable tạm
  thời ở lần bấm thứ 2, không có request thứ 2 nào được gửi (covers BR-004)
- **SC-005** *(A1)* Đăng nhập bằng đúng tài khoản đã gửi 1 kudo ẩn danh, xem lại kudo đó trên board
  — nút tim hiện disable (covers BR-005, FR-202)

#### US002_HeartButtonPendingAndOwnershipGuard *(A1)*

**Independent Test:** Gọi `toggleKudoHeart` 2 lần liên tiếp trong cùng 1 tick cho cùng 1 kudo từ
client test — assert lần gọi thứ 2 không tạo request HTTP mới (dựa vào `pendingIds`), khác với bản
hiện tại vốn cũng chặn nhưng không có state nào để UI hiển thị lý do.

**Acceptance Scenarios:**
1. **Given** Sunner vừa bấm tim, request chưa trả lời, **When** bấm tim lại ngay lập tức, **Then**
   nút hiện disable tạm thời, không gửi thêm request.
2. **Given** Sunner đã gửi 1 kudo ẩn danh, **When** chính Sunner đó xem lại kudo này trên board,
   **Then** nút tim hiện disable giống mọi kudo tự gửi khác.

### 5.2 Assumptions — bổ sung

- *(A1)* Giả định cột `is_own` thêm vào `kudos_cards` là cách rẻ nhất để giải quyết BR-005 — không
  cần đổi cơ chế ẩn danh (`sender_id NULL`) hiện có, chỉ thêm 1 cột boolean tính sẵn.
- *(A1)* Giả định `pendingIds` chỉ cần tồn tại trong state client (không cần round-trip server) —
  server đã tự đồng bộ đúng qua `UNIQUE(kudo_id, user_id)` (BR-001), `pendingIds` chỉ là tín hiệu
  UX, không phải một lớp khoá mới.

### 5.3 Unresolved Questions — bổ sung

1. **Ai sở hữu migration thêm `is_own`** *(A1)*: cột này nằm trên view `kudos_cards` do F007 sở
   hữu nhưng phục vụ đúng 1 rule của F008 (BR-005) — chưa xác nhận migration mới thuộc phạm vi
   implement của F007 hay F008; đề xuất F007 thực hiện (chủ view) theo yêu cầu từ F008, tương tự
   cách F008 hiện đã đọc `kudos.sender_id` do F007 sở hữu mà không cần F007 đổi API.

### 5.4 Source References — bổ sung (thay các dòng `TBD (draft)` liên quan tới A1)

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1 | 1 | `toggleKudoHeart` | `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:32-61` | Server Action ghi/xoá lượt tim |
| A1 | 2 | `useKudosHearts` | `src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:50-77` | State client: overrides + (mới) `pendingIds` |
| A1 | 3 | `deriveKudosCardState` | `src/app/(public)/kudos/_utils/kudos-card-state.ts:22-45` | Gộp trạng thái nút tim mỗi thẻ — nhận thêm `isOwn`/`pending` |
| A1 | 4 | `KudosHeartButton` | `src/app/(public)/kudos/_components/kudos-heart-button.tsx:43-73` | Render nút — nhận thêm prop pending |

### 5.5 Artifact References — không đổi so với bản hiện có.
