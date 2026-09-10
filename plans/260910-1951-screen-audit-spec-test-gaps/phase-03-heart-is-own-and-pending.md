---
phase: 03
title: "Nút tim: cờ is_own trên view + trạng thái đang gửi"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F008
status: completed
priority: P1
effort: 3h
depends_on: [02]
blocks: [10]
owned_files:
  - supabase/migrations/0016_kudos_cards_is_own.sql
  - src/dal/kudos-cards-query.ts
  - src/dal/kudos-cards-query.test.ts
  - src/app/(public)/kudos/_utils/kudos-card-state.ts
  - src/app/(public)/kudos/_utils/kudos-card-state.test.ts
  - src/app/(public)/kudos/_hooks/use-kudos-hearts.ts
  - src/app/(public)/kudos/_hooks/use-kudos-hearts.test.ts
  - src/app/(public)/kudos/_components/kudos-heart-button.tsx
  - src/app/(public)/kudos/_components/kudos-client.tsx
  - src/app/(public)/kudos/_components/kudos-feed.tsx
  - tests/e2e/kudos.spec.ts
---

# Phase 03 — Nút tim: hết nút chết, có trạng thái chờ

## Context Links

- Spec: `spec/F008_KudosHeartReaction/functional-spec.md` FR-205 · `technical-spec.md` § 3.1
  (BR-004, BR-005), § 3.2, § 4.2 (SQL `is_own`), § 4.4 Bin 3 (A0 · FR-601), § 5.1 SC-004/SC-005,
  § 5.3 #1, § 5.4
- Audit: `research/audit-kudos-board.md` gap 8, gap 9, gap 18 · `reports/baseline-260910-1951.md`
  (dòng `[C26]` `fixme`) · verified V6
- MoMorph: `momorph/specs-MaZUn5xHXZ.csv` rows C.4, C.4.1, B.4.4

## Overview

**Priority** P1 · **Status** pending · Hai lỗi cùng ở nút tim: (1) `use-kudos-hearts.ts:59-60` âm
thầm bỏ lượt bấm thứ 2 khi request trước chưa trả lời, `kudos-heart-button.tsx:52-60` không có
trạng thái chờ nào; (2) `kudos-card-state.ts:36` tính `isOwnKudo` bằng `card.sender.id === viewerId`,
nhưng `sender_id` là `NULL` với kudo ẩn danh (`0009`) ⇒ chính người gửi thấy nút **enabled** rồi
server từ chối — nút chết, không phải lỗi dữ liệu.

## Key Insights

- **Cross-feature:** cột `is_own` nằm trên view `kudos_cards` do **F007** sở hữu, phục vụ đúng 1
  rule của F008. Spec § 5.3 #1 đề xuất F007 thực hiện; phase này làm cả hai vì file đã cùng chủ.
- `auth.uid()` trong view `security_invoker = false` vẫn đọc JWT của request (GUC), không phải của
  owner ⇒ `is_own` tính đúng. Với `anon`, `auth.uid()` là `NULL` ⇒ `is_own` false/NULL.
- `CREATE OR REPLACE VIEW` chỉ **thêm cột ở cuối** được. Phải nêu lại nguyên danh sách cột của
  `0009:49-57` theo đúng thứ tự rồi append `is_own` cuối cùng. Đổi thứ tự ⇒ Postgres báo lỗi và
  buộc `DROP ... CASCADE` (mất grant) — đừng đi đường đó.
- `is_own` là boolean tính từ `sender_id` **thật** (chưa mask) — an toàn, không lộ lại danh tính
  người gửi ẩn danh. `sender_id` vẫn `NULL` cho kudo ẩn danh, **không** thay thế cơ chế đó (AD-2).
- `[C26]` (`kudos.spec.ts:739`) `fixme` với lý do lỗi thời ("Compose Kudo dialog not implemented" —
  đã có từ F009). Bỏ `fixme` được ngay: kudo **không ẩn danh** do chính viewer gửi vốn đã disable
  đúng hôm nay ⇒ C26 xanh liền, đây là *phủ lại coverage*, không phải RED. RED của phase là ca **ẩn danh**.
- Disable ở UI chỉ là gương phản chiếu — RLS `0007:78-83` vẫn là điểm chặn thật (FR-601).

## Requirements

Functional: BR-004 — nút của đúng kudo đang thao tác disable tạm thời tới khi server trả lời (thành
công hay lỗi); BR-005 — chính người gửi 1 kudo ẩn danh thấy nút disable y như kudo không ẩn danh,
xác định qua cờ server cấp.

Non-functional: `pendingIds` chỉ là state client (UX), không phải lớp khoá mới — `UNIQUE(kudo_id,
user_id)` vẫn là nguồn nhất quán; không thêm round-trip.

## Architecture

```
0016  CREATE OR REPLACE VIEW public.kudos_cards ...  (nguyên 0009 + append)
        (k.sender_id = auth.uid()) AS is_own     ← cột CUỐI
                 ↓ select list
src/dal/kudos-cards-query.ts  CardRow += is_own: boolean | null
                 ↓ toCard (src/dal/kudos.ts — KHÔNG thuộc phase này, chỉ đọc)
KudosCard += isOwn
                 ↓
use-kudos-hearts.ts  trả thêm pendingIds: Set<string>  (từ inFlight ref, expose qua state)
                 ↓
kudos-card-state.ts  deriveKudosCardState({ isOwn, pending, ... })  ← bỏ so sánh sender.id === viewerId
                 ↓
kudos-heart-button.tsx  prop `pending` → aria-busy + disabled + cursor
```

`kudos-client.tsx`/`kudos-feed.tsx` chỉ OR `pendingIds` vào `heartDisabled` khi gọi
`deriveKudosCardState`.

## Related Code Files

Tạo: `supabase/migrations/0016_kudos_cards_is_own.sql`.
Sửa: `kudos-cards-query.ts` (select list + type) · `kudos-card-state.ts:31-45` · `use-kudos-hearts.ts:50-77`
· `kudos-heart-button.tsx:43-73` · `kudos-client.tsx:120-137` · `kudos-feed.tsx:119-123` · 3 file
`.test.ts` tương ứng · `tests/e2e/kudos.spec.ts` (bỏ `fixme` `:739`, thêm test ẩn danh + test chờ).
Xoá: nhánh `card.sender.id === viewerId` ở `kudos-card-state.ts:36`.

## Implementation Steps

1. **RED (unit + e2e)** —
   (a) `kudos-card-state.test.ts`: card ẩn danh (`sender.id === null`) + `isOwn: true` ⇒
   `heartDisabled === true`. Hôm nay `deriveKudosCardState` chưa nhận `isOwn` ⇒ typecheck/test đỏ.
   (b) `use-kudos-hearts.test.ts`: gọi `toggleHeart(id)` 2 lần trong cùng tick ⇒ `pendingIds.has(id)`
   true sau lần 1. Hôm nay không có `pendingIds` ⇒ đỏ.
   (c) `tests/e2e/kudos.spec.ts` `[C31] @auth @local-db`: đăng nhập, gửi 1 kudo **ẩn danh** qua
   compose dialog (đường `kudos-compose.spec.ts` C23 đã dùng), quay lại `/kudos`, assert nút tim của
   thẻ đó `disabled`/`aria-disabled` — hôm nay enabled ⇒ đỏ.
   Chạy `pnpm test:unit` và `pnpm test:e2e kudos.spec.ts`, ghi exit code + dòng assertion.
2. Migration `0016`: copy nguyên select list `0009:49-57`, append `is_own`, giữ `WITH
   (security_invoker = false)`, cập nhật `COMMENT ON VIEW` (thêm 1 câu: `is_own` là boolean tính từ
   `sender_id` thật, không lộ danh tính; `sender_id` vẫn NULL cho ẩn danh), giữ REVOKE/GRANT.
3. `supabase migration up`. Verify `psql`: `\d+ public.kudos_cards` có `is_own` ở cuối; chạy
   `SET ROLE anon; SELECT is_own FROM kudos_cards LIMIT 1;` → NULL/false, không lỗi.
4. `kudos-cards-query.ts`: thêm `is_own` vào select list + type. Chú ý mọi test mock select-string.
5. `use-kudos-hearts.ts`: đổi `inFlight` ref thành state expose `pendingIds` (giữ ref cho guard nếu
   cần, nhưng nguồn render phải là state).
6. `kudos-card-state.ts`: nhận `isOwn` + `pending`; xoá phép so sánh cũ.
7. `kudos-heart-button.tsx`: prop `pending` → `aria-busy`, `disabled`, `cursor-not-allowed`.
   (Nhớ: `disabled` một mình KHÔNG cho ra `cursor: not-allowed` — phải set class.)
8. Bỏ `test.fixme` ở `kudos.spec.ts:739` + sửa lý do trong comment; C26 dùng kudo **không** ẩn danh.
9. GREEN: unit, `pnpm test:e2e` full, 4 gate.

## Todo List

- [ ] RED: 3 assertion (a)(b)(c) đỏ với lý do đúng, không phải lỗi mock
- [ ] `0016` append `is_own` CUỐI select list, thứ tự cột `0009` nguyên vẹn
- [ ] `psql \d+` xác nhận cột + quyền anon không đổi
- [ ] `pendingIds` là state (render được), không chỉ ref
- [ ] `kudos-card-state.ts` hết `sender.id === viewerId`
- [ ] `fixme` `:739` biến mất, lý do lỗi thời bị xoá
- [ ] GREEN + 4 gate + e2e full (217 + test mới)

## Success Criteria

- RED thật, 3 lần: (a) đỏ vì `heartDisabled === false` với card ẩn danh của chính mình; (b) đỏ vì
  `pendingIds` undefined; (c) đỏ vì nút enabled trên trình duyệt. Không có lỗi nào là import/config.
- GREEN: `grep -n "test.fixme" tests/e2e/kudos.spec.ts` → 0 hit ở `[C26]`.
- Bấm tim 2 lần liên tiếp ⇒ đúng 1 request (assert bằng `page.on("request")` hoặc qua `pendingIds`).
- 808 + test mới xanh; 217 e2e không hồi quy; 5 skip cũ giảm còn 4 (C26 hết `fixme`).

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| `CREATE OR REPLACE VIEW` fail vì lệch thứ tự cột | trung bình | trung bình | copy nguyên `0009:49-57`, append cuối; nếu vẫn fail thì `DROP VIEW ... CASCADE` + recreate **và** chạy lại REVOKE/GRANT trong cùng migration |
| `auth.uid()` không có trong view definer | thấp | cao | bước 3 verify bằng `psql` với 2 role khác nhau trước khi viết code TS |
| `is_own` lộ danh tính người gửi ẩn danh | thấp | cao | chỉ boolean, `sender_id` vẫn NULL ở output; reviewer soi select list |
| `pendingIds` gây re-render cả feed | trung bình | thấp | `Set` mới chỉ khi tập thay đổi; đo bằng test hook, không đoán |
| C26 bỏ `fixme` rồi lại đỏ | trung bình | trung bình | C26 dùng kudo KHÔNG ẩn danh (đường đã đúng hôm nay); ca ẩn danh là C31 riêng |
| Test mock select-string vỡ khi thêm cột | cao | thấp | grep mọi mock chứa `sender_kudos_received` và cập nhật cùng lúc |

**Rollback:** revert `0016` bằng một migration nghịch đảo `CREATE OR REPLACE VIEW` (bản `0009`
nguyên văn) — **không** `DROP VIEW`, vì DAL của F007 phụ thuộc view này để render toàn bộ board.
Revert code TS đi kèm cùng commit.

## Security Considerations

Không có lớp bảo mật mới. `0007:78-83` (`WITH CHECK` chặn sender tự tim) vẫn là điểm chặn thật cho
mọi trường hợp, kể cả khi BR-004/BR-005 có bug. `is_own` chỉ là tín hiệu UX; không dùng nó để cấp
quyền ở bất kỳ đâu.

## Implementation Deviation

`aria-busy` was NOT added to the heart button. The `pendingIds` Set is gated through `heartDisabled` prop (existing plumbing), which provides functional behavior (BR-004: nút disabled while pending). Adding `aria-busy` would require modifying `kudos-card-actions.tsx` (outside this phase's ownership). The heart button behavior is functionally correct but lacks the `aria-busy` semantic marker. Logged as debt in `plans/action-items.md`.

## Next Steps

Phase 10 nhận `tests/e2e/kudos.spec.ts`. Ghi câu trả lời cho `spec/F008 § 5.3 #1` (ai sở hữu
migration) vào `plans/action-items.md` § Decisions: **F007 sở hữu, thực hiện trong phase này**.

## MoMorph refs:
- Sun* Kudos Live Board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F008_KudosHeartReaction/`
  (plan này không có `clarifications.md`)
- testPolicy: e2e-red-first
