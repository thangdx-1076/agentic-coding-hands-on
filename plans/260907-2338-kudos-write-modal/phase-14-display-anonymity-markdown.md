---
phase: 14
feature: F009
track: integration
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: implementer
file_ownership:
  [
    "src/dal/kudos.ts",
    "src/dal/kudos.test.ts",
    "src/dal/kudos-cards-query.ts",
    "src/dal/kudos-cards-query.test.ts",
    "src/app/(public)/kudos/_components/kudo-markdown-text.tsx",
    "src/app/(public)/kudos/_components/kudo-markdown-text.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-card.tsx",
    "src/app/(public)/kudos/_components/kudos-card-person.tsx",
    "src/app/(public)/kudos/_components/kudos-card-person.stories.tsx",
  ]
---

# Phase 14 — Hiển thị: ẩn danh qua DAL + renderer markdown trên thẻ kudo

## Context Links

- `phase-02` đã vá view: hàng `is_anonymous = true` trả `sender_id = NULL`, `sender_full_name = anonymous_name`, `sender_avatar_url`/`sender_department` `NULL`, `sender_kudos_received = 0`
- `phase-04` cấp `parseKudoMarkdown` — **import, không viết parser thứ hai**
- `src/dal/kudos-cards-query.ts:24` (`sender_id: string`), `:48-51` (`CARD_COLUMNS` — **không đổi**) · `src/dal/kudos.ts:32-38` (`KudosPerson`), `:152` (map `row.sender_id`)
- `src/app/(public)/kudos/_components/kudos-card.tsx:61` (`data-sender-id`), `:99-104` (render `{card.content}` plain text) · `kudos-card-person.tsx:89` (`href={ROUTES.PROFILE}?id=…`)
- `src/app/(public)/kudos/_utils/kudos-card-state.ts:36` + `_hooks/use-kudos-hearts.ts:41` — so `card.sender.id === viewerId`; `null` không bao giờ khớp một string, **không cần sửa**
- `spec/system/permissions.md` § ẩn danh · `clarifications.md` § toolbar · plan.md AD-2, BR-005

## Overview

**Priority**: P1 · **Goal**: đường ĐỌC hiểu được hai thứ mới — sender có thể `null` (kudo ẩn danh) và nội dung có thể chứa marker markdown — mà không mở rộng bề mặt của F007 quá 4 dòng type.

## Requirements

BR-004, BR-005 · US004 · FR-204 · TC ID-27..32 (định dạng hiện ở thẻ, xem clarifications) · hợp đồng **C25**, **C26** · permissions.md § "Ẩn danh là NGỤY TRANG hiển thị".

## Architecture notes

Blast radius cố tình hẹp (AD-2 — view **không** thêm cột nào, nên `CARD_COLUMNS` và `KudosClient` giữ nguyên):

1. `kudos-cards-query.ts:24` → `sender_id: string | null`. Đúng một dòng; danh sách cột không đổi.
2. `kudos.ts:32` → `KudosPerson.id: string | null`. `:152` map giữ nguyên. Không thêm field `isAnonymous` — `sender.id === null` **là** tín hiệu, thêm cờ thứ hai là hai nguồn sự thật.
3. `kudos-card-person.tsx:89` → `person.id === null` thì render tên dạng text (không `<Link>`), không avatar, không hoa thị. C25 assert đúng điều này.
4. `kudos-card.tsx:61` `data-sender-id`: `card.sender.id === null` → React tự bỏ attribute. Giữ nguyên biểu thức, chỉ thêm comment giải thích.
5. `kudos-card.tsx:99-104` → `<KudoMarkdownText value={card.content} />` thay cho `{card.content}`. `kudo-markdown-text.tsx` nhận cây token từ `parseKudoMarkdown` và dựng **React element** (`<strong>`, `<em>`, `<s>`, `<ol><li>`, `<blockquote>`, `<a rel="noopener noreferrer">`) — **không** `dangerouslySetInnerHTML`, **không** dependency markdown. Nội dung không có marker phải render **giống hệt** trước (seed data không chứa marker nào → hợp đồng F007 không đổi hành vi).

## Implementation Steps

1. Sửa 2 dòng type ở `src/dal/*`, chạy `pnpm typecheck` để **compiler chỉ ra** hết chỗ cần nhánh `null` — đừng đoán bằng grep.
2. Cập nhật `src/dal/kudos.test.ts` + `kudos-cards-query.test.ts`: thêm case hàng ẩn danh (`sender_id: null`, `sender_full_name: 'Một Sunner'`) và giữ mọi case cũ. Coverage phải về lại 100%.
3. `kudo-markdown-text.tsx` + `.stories.tsx`: story `PlainText`, `Bold`, `Italic`, `Strike`, `NumberedList`, `Quote`, `Link`, `UnmatchedMarker` (hiện thô), `MultiLine`.
4. `kudos-card.tsx`: thay chỗ render nội dung; **không** đổi `data-testid="kudos-card-content"` (F007 C13 đọc nó).
5. `kudos-card-person.tsx` + story: thêm nhánh `null` + story `Anonymous`.
6. `pnpm test:unit:coverage` → `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build-storybook`.
7. `pnpm exec playwright test tests/e2e/kudos.spec.ts` — chứng minh F007 không hồi quy, đặc biệt C13 (nội dung thẻ) và C28/C29 (link profile trên thẻ).

## Todo List

- [ ] `sender_id: string | null` + `KudosPerson.id: string | null` — đúng 2 dòng type
- [ ] **Không** thêm cột vào `CARD_COLUMNS`, không thêm cờ `isAnonymous` vào `KudosCard`
- [ ] `typecheck` là công cụ tìm chỗ cần nhánh `null`, không phải grep
- [ ] Test DAL có case hàng ẩn danh, coverage về 100%
- [ ] `kudo-markdown-text.tsx` dựng React element, **không** `dangerouslySetInnerHTML`, link có `rel="noopener noreferrer"`
- [ ] `data-testid="kudos-card-content"` không đổi
- [ ] `kudos.spec.ts` xanh nguyên vẹn

## Success Criteria

- `pnpm test:unit:coverage` xanh, `src/dal/kudos.ts` + `kudos-cards-query.ts` vẫn 100%.
- `git diff src/dal/kudos-cards-query.ts` **không** chạm `CARD_COLUMNS`/`CardColumns` — chỉ dòng 24.
- `grep -rn "dangerouslySetInnerHTML" src/` rỗng; `grep -rn "\"marked\"\|react-markdown" package.json` rỗng.
- Nội dung không có marker render byte-for-byte như trước: `pnpm exec playwright test tests/e2e/kudos.spec.ts` xanh, gồm C13.
- Story `Anonymous` của `kudos-card-person` cho thấy tên **không** phải link và không có avatar.
- Mọi file ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Nới `CARD_COLUMNS` để lấy `is_anonymous` | Cao | TB — đổi literal type, kéo theo `KudosClient` và test của F007 | AD-2: `sender_id === null` là tín hiệu đủ; `git diff` là cửa |
| Renderer sinh HTML để "nhanh" | TB | **Cao** — mở bề mặt XSS trên trang công khai | Todo + grep ở Success Criteria; parser phase 04 chỉ trả token |
| Đổi `data-testid` nội dung thẻ | TB | Cao — C13 của F007 đỏ | Bước 4 + Success Criteria |
| Quên nhánh `null` ở một chỗ khác (`data-sender-id`, star tier) | TB | TB — render `"null"` hoặc link `?id=null` | Bước 1 để compiler chỉ chỗ |
| Coverage rơi dưới 100% vì thêm nhánh mà không thêm test | Cao | TB — CI đỏ, dễ bị quy oan cho phase khác | Bước 2 nằm trước mọi lệnh build |
| Kudo ẩn danh của chính mình hiện nút tim enabled | Cao | Thấp | **Đã chấp nhận** (plan.md AD-2 § known limitation) — không cố sửa bằng cách phơi lại `sender_id` |

## Security Considerations

Đây là nửa sau của việc chống rò danh tính: phase 02 bịt ở view, phase này bảo đảm tầng đọc **không tự dựng lại** thông tin đã bị bịt — không suy `sender_id` từ nguồn khác, không query `kudos` thô để "lấy lại tên cho đủ". Renderer là bề mặt XSS duy nhất mở ra ở phase này: React element, whitelist scheme (phase 04), `rel="noopener noreferrer"` cho link ngoài, không HTML thô.

## Next Steps

Mở khoá phase 13 (form gửi được kudo ẩn danh và markdown mà thẻ hiện đúng).
