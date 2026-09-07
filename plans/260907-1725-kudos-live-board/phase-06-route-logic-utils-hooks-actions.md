---
phase: 06
feature: F007
track: B
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.25h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/_utils/format-kudo-time.ts",
    "src/app/(public)/kudos/_utils/format-kudo-time.test.ts",
    "src/app/(public)/kudos/_utils/star-tier.ts",
    "src/app/(public)/kudos/_utils/star-tier.test.ts",
    "src/app/(public)/kudos/_hooks/use-carousel-index.ts",
    "src/app/(public)/kudos/_hooks/use-carousel-index.test.ts",
    "src/app/(public)/kudos/_hooks/use-spotlight-search.ts",
    "src/app/(public)/kudos/_hooks/use-spotlight-search.test.ts",
    "src/app/(public)/kudos/_hooks/use-infinite-feed.ts",
    "src/app/(public)/kudos/_hooks/use-infinite-feed.test.ts",
    "src/app/(public)/kudos/_actions/load-more-kudos.ts",
    "src/app/(public)/kudos/_actions/load-more-kudos.test.ts",
  ]
---

# Phase 06 — Logic route: `_utils` / `_hooks` / `_actions` + unit test 100%

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - `mms_B.5.1/B.5.3` `2940:13472`/`2940:13474` — disable hai đầu · `mms_C.3.4_Time` `I3127:21871;256:5229` — `HH:mm - MM/DD/YYYY`
  - `mms_B.3.2` `I2940:13465;335:9443;256:4737` — ngưỡng hoa thị 10/20/50 · `mms_B.7.3` `2940:14833` — ô tìm 100 ký tự
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `vitest.config.ts:97-121` — allowlist coverage bao gồm `src/app/**/_utils/**/*.ts`, `_hooks/**/*.ts`, `_actions/**/*.ts`, ngưỡng `thresholds: { 100: true }`
- `spec/kudosliveboard/functional-spec.md` § 13 Configuration — 7 hằng số, dùng thẳng chúng
- `src/app/(public)/awards/_utils/scroll-spy.ts` + `_hooks/` — khuôn hook + test đã có trong repo
- `phase-03-migration-0006-kudos-dal.md` — `getKudosBoard` là thứ `loadMoreKudos` gọi

## Overview

**Priority**: P0 · **Status**: pending · **Track B** (`implementer`, RED-first)
**Goal (1 dòng)**: Rút mọi quy tắc tính toán của board ra khỏi JSX thành 6 module `.ts` thuần, mỗi cái có test riêng, để Track A chỉ còn việc vẽ.

## Out of scope

- **Không** tạo file `.tsx` nào. Đường ranh giới rất rõ: `.ts` có logic → phase này; `.tsx` có JSX → Track A.
- **Không** viết `toggle-kudo-heart.ts` (phase 04 sở hữu).
- **Không** sửa `src/dal/**` hay migration nào.

## Key Insights

- **Đây là ranh giới do coverage gate vẽ ra, không phải do thẩm mỹ.** `vitest.config.ts` bắt 100% trên mọi `.ts` trong `_utils`/`_hooks`/`_actions`, nhưng cố ý **không** có glob `.tsx`. Track A viết một file `.ts` là kéo cả gate xuống đỏ — nên logic phải sang phía này trước.
- **`use-carousel-index` là nơi BR-002 sống**, không phải trong nút. Hook trả `{index, canPrev, canNext, next, prev}`; hai cặp nút (`B.2.1/B.2.2` cạnh thẻ và `B.5.1/B.5.3` cạnh số trang) cùng đọc một state — spec nói rõ "cả 2 vị trí nút dùng chung 1 state".
- **`format-kudo-time` không được dùng locale máy.** Design cố định `HH:mm - MM/DD/YYYY` (thứ tự Mỹ, không phải `DD/MM`), và C13 assert bằng regex. `toLocaleString` sẽ đổi theo môi trường CI → dựng chuỗi bằng tay từ các `getUTC*`/`get*` cụ thể.
- **`use-infinite-feed` phải chống gọi trùng.** `IntersectionObserver` bắn nhiều lần khi sentinel còn trong viewport; không có cờ `isLoading` thì một cú cuộn nạp ba trang. C19 assert "hết dữ liệu thì không request nữa" — hook phải nhớ `hasMore = false`.
- **`load-more-kudos` là Server Action đọc, không ghi.** Không `revalidatePath` (đang nối thêm vào danh sách phía client, revalidate sẽ thổi bay nó).
- **`use-spotlight-search` chỉ lọc/đánh dấu trong tập đang hiển thị** (D002) — không điều hướng, không gọi server. Trả `Set` tên khớp; so sánh bỏ dấu để gõ "Hiep" vẫn khớp "Đỗ hoàng Hiệp" (`normalize("NFD")` + bỏ dấu tổ hợp).

## Related Code Files

**Tạo**: 6 module `.ts` + 6 file `.test.ts` liệt kê ở `file_ownership`.

## Implementation Steps

1. `star-tier.ts` — `starTier(received: number): 0|1|2|3` theo `50/20/10` (BR-008). Test biên: `9, 10, 19, 20, 49, 50, 0, -1`.
2. `format-kudo-time.ts` — `formatKudoTime(iso: string): string` → `"10:00 - 10/30/2025"`. Test: padding 0 (`09:05`), nửa đêm, chuỗi rác trả `""` chứ không throw.
3. `use-carousel-index.ts` — nhận `count`, giữ `index`; `canPrev = index > 0`, `canNext = index < count - 1`; `count` đổi (bộ lọc mới) thì reset về `0` (BR-003). Test cả `count = 0` và `count = 1`.
4. `use-spotlight-search.ts` — nhận `names: string[]`, trả `{query, setQuery, matched: Set<string>, canSubmit}`; `canSubmit = query.trim().length > 0` (BR-010); cắt `MAX_LENGTH = 100`. Test: rỗng, đúng 100, 101, khớp bỏ dấu, không khớp.
5. `load-more-kudos.ts` — `"use server"`, nhận `{cursor, hashtag?, department?}`, gọi `getKudosBoard`, trả `{items, nextCursor}`. Fail-open `{items: [], nextCursor: null}`. Test bằng cách mock DAL.
6. `use-infinite-feed.ts` — nhận trang đầu + hàm loader; `IntersectionObserver` trên `ref` sentinel; cờ `isLoading` chặn gọi chồng; `hasMore = nextCursor !== null`. Test trong project `jsdom` với `IntersectionObserver` stub; ca bắt buộc: quan sát bắn 3 lần liên tiếp → loader gọi **đúng 1 lần**.
7. `pnpm test:unit:coverage` → lint → format:check → build → typecheck.

## Todo List

- [ ] `star-tier.ts` + test biên 10/20/50
- [ ] `format-kudo-time.ts` + test, **không** dùng `toLocaleString`
- [ ] `use-carousel-index.ts` + test, reset khi `count` đổi
- [ ] `use-spotlight-search.ts` + test, khớp bỏ dấu, cap 100
- [ ] `load-more-kudos.ts` + test, fail-open, **không** `revalidatePath`
- [ ] `use-infinite-feed.ts` + test chống gọi chồng
- [ ] `pnpm test:unit:coverage` xanh với ngưỡng 100%

## Success Criteria

- `pnpm test:unit:coverage` xanh; cả 6 module đạt 100% statement/branch — thiếu một nhánh là cả job đỏ.
- `formatKudoTime("2025-10-30T10:00:00Z")` trả đúng `"10:00 - 10/30/2025"` bất kể `TZ` của tiến trình.
- `use-infinite-feed`: 3 lần `IntersectionObserver` bắn liên tiếp → loader chạy đúng 1 lần.
- `grep -rn "\.tsx" src/app/\(public\)/kudos/_utils src/app/\(public\)/kudos/_hooks` không ra kết quả nào.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Track A tự viết `.ts` trong `_hooks`/`_utils` | Trung bình | Cao — coverage gate đỏ, không ai biết ai gây ra | Mục Out of scope của **mọi** phase Track A cấm thẳng; phase này giao đủ 6 hook/util nên Track A không thiếu gì |
| `format-kudo-time` lệ thuộc timezone CI | Cao | Trung bình — C13 đỏ chỉ trên CI | Cấm `toLocaleString` ngay trong Todo; test chạy với `TZ` khác nhau |
| `use-infinite-feed` nạp chồng trang | Cao | Trung bình — feed lặp bản ghi, C18 flaky | Cờ `isLoading` + test 3-lần-bắn là cửa cứng |
| Reset carousel bị quên khi đổi bộ lọc | Trung bình | Trung bình — BR-003 hụt, C14 đỏ | Reset nằm trong hook chứ không rải ở component |

## Security Considerations

`load-more-kudos` là Server Action **đọc**: không nhận `userId` từ client, không ghi. Tham số `cursor`/`hashtag`/`department` đi thẳng vào PostgREST filter — dùng đúng API builder của supabase-js (không nối chuỗi SQL), và validate `cursor` là ISO timestamp trước khi truyền.

## Next Steps

Mở khoá phase 09 (carousel), 10 (Spotlight), 11 (feed).
