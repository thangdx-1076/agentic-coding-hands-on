---
phase: 02
title: "Top-10 SUNNER nhận quà: view definer + DAL + nối dây"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F007
status: completed
priority: P0
effort: 3h
depends_on: [01]
blocks: [03]
owned_files:
  - supabase/migrations/0015_recent_gift_recipients.sql
  - src/dal/recent-gift-recipients.ts
  - src/dal/recent-gift-recipients.test.ts
  - src/app/(public)/kudos/page.tsx
  - src/app/(public)/kudos/_components/kudos-client.tsx
  - src/app/(public)/kudos/_components/kudos-leaderboard.tsx
  - src/app/(public)/kudos/_shared/build-kudos-copy.ts
  - tests/e2e/kudos.spec.ts
---

# Phase 02 — "10 SUNNER NHẬN QUÀ MỚI NHẤT" có dữ liệu thật

## Context Links

- Spec: `spec/F007_KudosLiveBoard/functional-spec.md` FR-219, BR-020 · `technical-spec.md` § 4.1,
  § 4.2 (SQL nguyên văn), § 4.6, § 5.1 SC-008, US010
- **System delta (đọc trước khi viết SQL):** `spec/system/permissions.md` — nó ĐẢO một quyết định
  đã chốt ở `docs/vi/system/permissions.md:408-414` ("không cần view SECURITY DEFINER nào cho đường
  đọc"). Khi cập nhật tài liệu, phải viết là *thay thế* kết luận cũ kèm lý do, không thêm mục mới.
- Audit: `research/audit-kudos-board.md` gap 1, gap 2 (cả hai critical) · verified V8/V9/V10
- MoMorph: `momorph/specs-MaZUn5xHXZ.csv` rows D, D.3, D.3.1–D.3.6 · TC `6b1e2359`, `0952e2f0`

## Overview

**Priority** P0 (critical) · **Status** pending · `kudos-client.tsx:188-189` hardcode
`rankUps={[]} giftRecipients={[]}`, nên panel D.3 render `Chưa có dữ liệu` **vĩnh viễn** — 1 trong
6 tính năng khách yêu cầu chưa từng chạy. Ledger đã có từ `0011_secret_box.sql:68-76`.
`rankUps` **giữ `[]`** — thật sự không có bảng theo dõi thăng hạng; đừng bịa ra.

## Key Insights

- `secret_box_openings` RLS là own-rows-only (`0011:101-105`). Không nới policy bảng gốc — thêm một
  view definer hẹp hơn, đúng pattern `kudos_cards`.
- **Đây là nới lỏng quyền riêng tư thật**: `anon` sẽ đọc được *ai* mở hộp, *lúc nào*, *badge nào*.
  `spec/system/permissions.md` § "Điều thực sự bị công khai" yêu cầu ghi việc này như một quyết định
  có chủ đích, không lẫn vào phần mô tả kỹ thuật.
- `LIMIT 10` nằm TRONG view (spec § 4.2) — nó là ràng buộc hiển thị, **không** phải tường bảo mật;
  phải nói rõ điều đó trong `COMMENT ON VIEW`.
- **D004 đã chốt**: render caption của badge (`stay-gold`… `root-further`), KHÔNG phải quà vật lý —
  "prize draw result" là nguồn dữ liệu không tồn tại trong repo.
- Caption 6 badge đã có sẵn ở `messages/{vi,en}.json` → `standards.secretBoxSection.badges.<camelKey>.caption`.
  Dùng lại namespace đó trong `build-kudos-copy.ts` ⇒ **không thêm leaf mới**, `messages/*.json` không
  bị phase này khoá. `isBadgeKey()` (`kudos/_utils/secret-box-badge-asset.ts:57`) là choke-point
  validate, gọi nó trước khi map.
- `kudos-client.tsx` đang **197 dòng** — thêm dây là vượt 200. Bước 5 xử lý trước khi thêm.

## Requirements

Functional: sidebar hiện tối đa 10 Sunner mở Secret Box gần nhất, sort `opened_at DESC`, mỗi dòng
avatar 64×64 + tên + caption badge; click avatar/tên → profile (TC `6b1e2359`, `0952e2f0`); ledger
rỗng ⇒ giữ nhánh `Chưa có dữ liệu` hiện có (BR-012, không phải lỗi).

Non-functional: fail-open như mọi DAL của trang này (lỗi Supabase ⇒ `[]`, không throw, không 500);
view chỉ phơi 5 cột đã liệt kê.

## Architecture

```
0015  VIEW public.recent_gift_recipients WITH (security_invoker = false)
      SELECT u.id, u.full_name, u.avatar_url, s.badge_key, s.opened_at
      FROM secret_box_openings s JOIN users u ON u.id = s.user_id
      ORDER BY s.opened_at DESC LIMIT 10
      REVOKE ALL → GRANT SELECT TO anon, authenticated
                 ↓
src/dal/recent-gift-recipients.ts  getRecentGiftRecipients(client) → GiftRecipient[]
                 ↓
kudos/page.tsx (Promise.all cùng board/hearts/stats)
                 ↓  giftRecipients (prop mới, thật)
kudos-client.tsx → KudosScreen → kudos-sidebar → KudosLeaderboard
      caption ← build-kudos-copy.ts: isBadgeKey(badge_key) → t(`standards.secretBoxSection.badges.<camel>.caption`)
```

Cột **tuyệt đối không phơi**: `email`, `role`, `locale`, `created_at`, `updated_at` của `users`.

## Related Code Files

Tạo: `supabase/migrations/0015_recent_gift_recipients.sql` · `src/dal/recent-gift-recipients.ts`
+ `.test.ts`.
Sửa: `kudos/page.tsx` (thêm 1 read vào `Promise.all`) · `kudos-client.tsx:189` (`giftRecipients`
thật; `:188 rankUps={[]}` GIỮ NGUYÊN) · `kudos-leaderboard.tsx:14-16` (**xoá** đoạn biện minh
"neither a rank-tracking nor a gift ledger exists yet" — đã lỗi thời từ `0011`) ·
`build-kudos-copy.ts` (map badge → caption) · `tests/e2e/kudos.spec.ts` (C08 + test mới).
Xoá: comment `kudos-leaderboard.tsx:14-16` (chỉ đoạn 3 dòng đó, giữ phần mô tả node Figma).

## Implementation Steps

1. **RED (e2e, `@local-db`)** — trong `tests/e2e/kudos.spec.ts` thêm `[C30] @local-db` : dùng
   `getServiceRoleKey()` (`tests/e2e/helpers/service-role.ts`) insert 1 dòng
   `secret_box_openings(user_id = <user seed đã có>, badge_key = 'stay-gold')` qua REST, `goto /kudos`,
   assert `[data-testid=kudos-leaderboard]` đầu tiên **chứa tên Sunner đó** và **không** chứa
   `Chưa có dữ liệu`; `afterEach` xoá dòng vừa insert. Chạy `pnpm test:e2e kudos.spec.ts` → **đỏ**.
2. Thêm unit `src/dal/recent-gift-recipients.test.ts` (client mock): đọc đúng view, map 5 cột,
   lỗi ⇒ `[]`. CI loại `@local-db` nên đây là lớp phủ duy nhất chạy trên CI — bắt buộc, không tuỳ chọn.
3. Migration `0015` theo SQL § 4.2 nguyên văn + `COMMENT ON VIEW` nêu: (a) vì sao definer, (b)
   `LIMIT 10` là hiển thị chứ không phải bảo mật, (c) danh sách cột cấm.
4. `supabase migration up` (KHÔNG `db reset`). Verify bằng `psql`: `SET ROLE anon; SELECT * FROM
   public.recent_gift_recipients;` phải trả dòng; `SET ROLE anon; SELECT * FROM secret_box_openings;`
   phải vẫn rỗng/bị chặn (policy bảng gốc không đổi).
5. `wc -l kudos-client.tsx` — nếu ≥ 197, tách phần lắp prop sidebar sang
   `_shared/build-kudos-sidebar-props.ts` TRƯỚC khi thêm dây.
6. Viết DAL → nối `page.tsx` → truyền vào `KudosClient` → caption qua `build-kudos-copy.ts`.
7. Xoá comment lỗi thời ở `kudos-leaderboard.tsx:14-16`.
8. GREEN: bước 1 xanh, `pnpm test:unit`, 4 gate, `pnpm test:e2e` full.

## Todo List

- [ ] RED e2e `@local-db` chạy đỏ (không phải lỗi thiếu key/Docker), lưu exit code
- [ ] Unit DAL cho đường CI
- [ ] Migration `0015` + `COMMENT` + REVOKE-trước-GRANT + cột liệt kê tường minh
- [ ] `psql` verify: anon đọc view được, anon vẫn KHÔNG đọc bảng gốc
- [ ] `kudos-client.tsx` < 200 dòng sau khi nối dây
- [ ] Xoá comment `kudos-leaderboard.tsx:14-16`
- [ ] `rankUps={[]}` còn nguyên (grep xác nhận)
- [ ] GREEN + 4 gate + e2e full

## Success Criteria (REVISED)

**Note:** Original criterion `` grep -n "rankUps={\\[\\]}" `` → 1 hit is obsolete. The codebase extracted `build-kudos-sidebar-props.ts` to stay under 200-line cap for `kudos-client.tsx`, so `rankUps` declaration moved. The substance (hardcoded empty, with documented reason) is preserved and verified to still exist; only the grep pattern no longer matches the string in that exact location.

- RED thật: assertion "sidebar chứa <tên Sunner>" fail vì panel in `Chưa có dữ liệu` — không phải
  fail vì thiếu service-role key, Docker chưa lên, hay selector sai.
- GREEN: C08 (nhánh rỗng) VÀ C30 (nhánh có dữ liệu) cùng xanh trong một lượt.
- `psql -c "select count(*) from public.recent_gift_recipients"` ≤ 10 luôn đúng.
- `grep -n "gift ledger exists yet" src/` → 0 hit. Verify `rankUps` hardcoded empty by reading `build-kudos-sidebar-props.ts`.
- 808 + test mới xanh; 217 e2e cũ không đổi kết quả.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| View phơi thêm cột `users` ngoài ý muốn | trung bình | **cao** (PII) | liệt kê 5 cột tường minh, cấm `SELECT *`; bước 4 `psql` in ra `\d+ recent_gift_recipients` để soi |
| `anon` đọc được view trước khi REVOKE | trung bình | cao | REVOKE ALL đặt TRƯỚC GRANT trong cùng migration |
| e2e rác tích tụ trong `secret_box_openings` | cao | trung bình | `afterEach` xoá theo id vừa insert; nếu key thiếu thì test **fail**, không skip im lặng |
| CI không chạy được chứng cứ (`@local-db` bị loại) | chắc chắn | trung bình | unit DAL ở bước 2 là lớp phủ CI; ghi rõ giới hạn này trong docblock của test |
| Vượt 200 dòng `kudos-client.tsx` | cao | thấp | bước 5 tách `build-kudos-sidebar-props.ts` trước |
| Ai đó hiểu `LIMIT 10` là tường bảo mật | trung bình | trung bình | `COMMENT ON VIEW` nói thẳng: view phơi TOÀN BỘ log cho ai query trực tiếp |

**Rollback:** `DROP VIEW IF EXISTS public.recent_gift_recipients;` + revert commit. Bảng gốc và
policy của nó không bị chạm ⇒ không mất dữ liệu, không cần backfill.

## Security Considerations

Đây là quyết định phân quyền, không phải chi tiết kỹ thuật: view làm "ai mở hộp / lúc nào / badge
nào" thành dữ liệu công khai với cả `anon`. Design yêu cầu (bảng vinh danh trên trang công khai) nên
chủ ý là rõ, nhưng khi cập nhật `docs/vi/system/permissions.md` phải ghi thành một mục quyết định có
chủ đích và nói rõ nó thay thế kết luận `:408-414`. Không đổi `security_invoker = true` (bật lại RLS
own-row ⇒ view trả rỗng cho mọi khách).

## Next Steps

Phase 03 nhận `kudos-client.tsx` + `tests/e2e/kudos.spec.ts`. Cập nhật `docs/vi/system/permissions.md`
là việc của `doc-writer` ở bước Delivery, dùng `spec/system/permissions.md` làm delta.

## MoMorph refs:
- Sun* Kudos Live Board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F007_KudosLiveBoard/` +
  `spec/system/permissions.md` (plan này không có `clarifications.md`)
- testPolicy: e2e-red-first
