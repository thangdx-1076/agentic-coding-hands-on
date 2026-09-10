---
phase: 01
title: "Kudos aggregates: COUNT chính xác + option lọc distinct"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F007
status: completed
priority: P0
effort: 3h
depends_on: []
blocks: [02, 10]
owned_files:
  - supabase/migrations/0014_kudos_filter_options.sql
  - src/dal/kudos-board-aggregates.ts
  - src/dal/kudos-board-aggregates.test.ts
  - src/dal/kudos.ts
  - src/dal/kudos.test.ts
  - src/app/(public)/kudos/page.tsx
---

# Phase 01 — Aggregates của board Kudos hết phụ thuộc `max_rows`

## Context Links

- Spec: `spec/F007_KudosLiveBoard/functional-spec.md` FR-215, FR-217, BR-017 · `technical-spec.md`
  § 1, § 3.{N+1}, § 4.1, § 4.4 Bin 3 (A0 · FR-217), § 5.1 SC-009
- Audit: `research/audit-kudos-board.md` gap 3 (critical), gap 4, UNVERIFIABLE-1
- Đã tự xác minh: `reports/orchestrator-verified-260910-2010.md` V11
- MoMorph: `momorph/specs-MaZUn5xHXZ.csv` rows B.1.1, B.1.2, B.7.1 · `momorph/specs-JWpsISMAaM.csv`
  row A · `momorph/specs-WXK5AYB_rG.csv` row A

## Overview

**Priority** P0 (critical) · **Status** pending · Ba triệu chứng, một gốc: `src/dal/kudos.ts:103`
đọc `selectCards(client, {})` không `limit` không `order`, rồi `:130` đếm bằng `.length` và
`:134-139` rút danh sách option từ chính mảng đó. `supabase/config.toml:18` đặt `max_rows = 1000`,
nên quá 1000 kudo là tổng Spotlight đóng băng ở `1000` và 2 dropdown chỉ thấy 1000 dòng PostgREST
tình cờ trả về.

## Key Insights

- **Danh sách option là dữ liệu vận hành, không phải vocabulary tĩnh.** `specs-JWpsISMAaM.csv`
  row B.1.1/B.1.2 ghi "truy vấn từ cơ sở dữ liệu"; spec revision § 5.3 #1 nói rõ draft trước đề
  xuất sai hướng. **KHÔNG** tạo `src/constants/kudos-vocabulary.ts` — audit gap 4 đề xuất nó, spec
  đã bác.
- PostgREST không có `DISTINCT` ⇒ cần một view SQL. Đây là lý do phase này có migration, không phải
  để "chuẩn hoá".
- `board.filters.hashtags` còn được dùng làm `compose.hashtagVocabulary`
  (`kudos-client.tsx:194-196`) — đổi nguồn là đổi cả picker của compose. Giữ đúng một nguồn (DRY).
- `src/dal/kudos.ts` đang 183 dòng ⇒ thêm code vào đó là vượt trần 200. Aggregates phải là file riêng.

## Requirements

Functional: (a) `spotlightTotal` = `COUNT` chính xác của `public.kudos`, độc lập `max_rows`;
(b) `filters.hashtags` / `filters.departments` = MỌI giá trị distinct thật trong dữ liệu, không phải
tập con 1000 dòng đầu; (c) thứ tự option ổn định (alphabet) để test không flaky.

Non-functional: 1 round-trip cho count (`head: true`, không tải row) + 1 cho option list; view chỉ
phơi `kind`/`value`, không PII; fail-open giữ nguyên — lỗi Supabase ⇒ `EMPTY_BOARD`, không throw.

## Architecture

```
0014 view public.kudos_filter_options(kind text, value text)
   = SELECT DISTINCT 'hashtag', unnest(hashtags) FROM kudos
     UNION ALL
     SELECT DISTINCT 'department', u.department FROM kudos k JOIN users u ON u.id = k.receiver_id
   (security_invoker = false · REVOKE ALL · GRANT SELECT TO anon, authenticated)

src/dal/kudos-board-aggregates.ts
   getKudosTotal(client)          → .from("kudos").select("*", {count:"exact", head:true})
   getKudosFilterOptions(client)  → .from("kudos_filter_options").select("kind,value").order("value")
        ↓ (Promise.all cùng 2 read còn lại)
src/dal/kudos.ts  getKudosBoard() → spotlightTotal, filters
        ↓
src/app/(public)/kudos/page.tsx → KudosClient (không đổi shape prop)
```

`spotlightNames` giữ nguyên đường cũ (scatter chỉ cần tên người nhận trong tập đang hiển thị —
không phải aggregate board-wide, đừng gộp vào đây).

## Related Code Files

Tạo: `supabase/migrations/0014_kudos_filter_options.sql` · `src/dal/kudos-board-aggregates.ts` +
`.test.ts`.
Sửa: `src/dal/kudos.ts` (bỏ `:130`, `:134-139`, gọi 2 hàm mới trong `Promise.all` tại `:102-117`;
cập nhật docblock `:79-93` vốn đang tự tả sai) · `src/dal/kudos.test.ts` · `page.tsx` (chỉ nếu cần
truyền client — ưu tiên không đổi).
Xoá: không.

## Implementation Steps

1. **RED** — viết `src/dal/kudos-board-aggregates.test.ts` + bổ sung `src/dal/kudos.test.ts`:
   (a) `getKudosTotal` gọi `select` với `{ count: "exact", head: true }` và trả `count`, KHÔNG
   `rows.length`; (b) `getKudosFilterOptions` đọc `kudos_filter_options`, tách theo `kind`, sort
   theo `value`; (c) `getKudosBoard` với client mock trả 1200 dòng `kudos_cards` nhưng `count = 4210`
   ⇒ `spotlightTotal === 4210`; (d) option list KHÔNG chứa giá trị chỉ có trong mảng card mock ⇒
   chứng minh nguồn đã đổi. Chạy `pnpm test:unit` → **đỏ**.
2. Viết migration `0014` theo § 4.2 pattern `0006`/`0009`: `CREATE OR REPLACE VIEW` + `COMMENT ON VIEW`
   giải thích ranh giới, `REVOKE ALL ... FROM anon, PUBLIC, authenticated`, rồi `GRANT SELECT`. Liệt
   kê cột tường minh, không `SELECT *`.
3. `supabase migration up` (KHÔNG `db reset`). Kiểm bằng `psql`: `SELECT kind, count(*) FROM
   public.kudos_filter_options GROUP BY 1` và `SET ROLE anon; SELECT ... ` phải đọc được.
4. Viết `src/dal/kudos-board-aggregates.ts` (≤ 80 dòng, `import "server-only"` theo pattern DAL).
5. Nối vào `getKudosBoard`, xoá `.length` + `dedupe(totalsRows…)`. Giữ `catch → EMPTY_BOARD`.
6. `pnpm test:unit` → **xanh**. `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm format:check`.
7. `pnpm test:e2e` full (Supabase local đang chạy) — C09/C14/C15/C20/C27 phải giữ xanh với 2 phòng
   ban seed hiện có.

## Todo List

- [ ] RED: 4 assertion unit ở bước 1, chạy đỏ, chụp exit code + dòng lỗi
- [ ] Migration `0014` + `COMMENT` + REVOKE-trước-GRANT
- [ ] Verify quyền `anon` bằng `psql`
- [ ] `kudos-board-aggregates.ts` + nối `getKudosBoard`
- [ ] GREEN unit + 4 gate + e2e full
- [ ] `wc -l src/dal/kudos.ts` < 200

## Success Criteria

- RED thật: `pnpm test:unit` exit ≠ 0, thông báo trỏ vào assertion `spotlightTotal === 4210`
  (nhận `1000`/`1200`) — không phải lỗi import/config.
- GREEN: 808 + số test mới, 0 fail. `psql -c "select count(*) from kudos_filter_options"` > 0.
- `grep -n "totalsRows.length\|dedupe(totalsRows" src/dal/kudos.ts` → 0 hit.
- Không có file nào tên `kudos-vocabulary.ts` trong repo.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| View mới anon đọc được ngoài ý muốn | trung bình | trung bình | `REVOKE ALL` TRƯỚC `GRANT SELECT`, chỉ 2 cột `kind`/`value`, không join thêm cột nào của `users` ngoài `department` |
| `unnest` trên `hashtags` NULL làm rớt dòng | thấp | thấp | `hashtags` là `text[] NOT NULL` (`0006`); vẫn thêm `WHERE hashtags IS NOT NULL` cho chắc |
| Đổi thứ tự option làm vỡ C14/C15 | thấp | trung bình | C14/C15 chọn option bằng `data-value` (`kudos.spec.ts:411,441`), không bằng text/thứ tự — đã kiểm |
| `count: "exact"` chậm khi bảng lớn | thấp | thấp | `head: true` không tải row; đo bằng `EXPLAIN` nếu > 200ms, chưa cần index mới |
| Vượt trần 200 dòng `src/dal/kudos.ts` | cao | thấp | aggregates ở file riêng; bước 6 đo `wc -l` |

**Rollback (phase có DB):** `DROP VIEW IF EXISTS public.kudos_filter_options;` rồi revert commit —
view là đường đọc thêm, không đổi bảng/policy nào, nên drop không mất dữ liệu và code cũ chạy lại
được ngay.

## Security Considerations

`kudos_filter_options` chạy `security_invoker = false` (owner bypass RLS) đúng như `kudos_cards`.
Nó phơi tập tên phòng ban đang có kudo cho `anon` — `/kudos` vốn công khai và đã phơi
`receiver_department` từng thẻ qua `kudos_cards` (`0006:56-57`), nên đây không phải mở rộng bề mặt
mới. Tuyệt đối không thêm `email`/`role`/`locale` vào view (SEC_004, ranh giới `0005`/`0006`).

## Next Steps

Mở đường cho phase 02 (`src/dal/kudos.ts`, `page.tsx` chuyển chủ) và phase 10 (panel dropdown buộc
phải cuộn khi danh sách không còn trần cứng).

## MoMorph refs:
- Sun* Kudos Live Board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Dropdown hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/JWpsISMAaM
- Dropdown phòng ban: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/WXK5AYB_rG
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F007_KudosLiveBoard/`
  (plan này KHÔNG có `clarifications.md`; quyết định nằm trong spec revision + `reports/orchestrator-verified-260910-2010.md`)
- testPolicy: e2e-red-first
