---
phase: 05
title: "en.json hết tiếng Việt + parity test bắt được chuyện đó"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F002
status: completed
priority: P1
effort: 1.5h
depends_on: []
blocks: [06, 07]
owned_files:
  - messages/en.json
  - src/lib/i18n/messages-parity.test.ts
---

# Phase 05 — Bật EN mà 7 chỗ vẫn tiếng Việt

## Context Links

- Spec: `spec/F002_LanguageSwitch/functional-spec.md` FR-002, RISK-06 · `technical-spec.md` § 3.1
- Audit: `research/audit-awards-language.md` gap 4 · `reports/audit-verdict-260910-2015.md`
  § "3 lỗi nặng nhất" #2 · verified **V1** (191 leaf, 7 chuỗi) và **V2** (test không thể bắt)
- MoMorph: `momorph/specs-hUyaaugye2.csv` row A.2 ("cập nhật ngôn ngữ giao diện")

## Overview

**Priority** P1 · **Status** pending · 7 leaf trong `messages/en.json` còn nguyên tiếng Việt, và
`src/lib/i18n/messages-parity.test.ts` chỉ so **tập key** (`flattenKeys`, `:25-42`) nên vĩnh viễn
không bắt được. Đây là hạng mục điểm thấp nhất của cả audit.

## Key Insights

- Test hiện tại đúng về key, sai về phạm vi. Sửa test TRƯỚC ⇒ có RED thật; dịch sau ⇒ GREEN. Đảo thứ
  tự là mất chứng cứ.
- **Nhãn nav tiếng Anh trong `vi.json` KHÔNG phải bug** (verified R2): `About SAA 2025`, `Sun* Kudos`
  cố ý giữ tiếng Anh ở cả 2 locale. Vì vậy guard chỉ soi **một chiều**: dấu tiếng Việt trong
  `en.json`. Đừng thêm guard ngược lại.
- Đã kiểm: 7 chuỗi này bị assert trong `tests/e2e/kudos.spec.ts:97,222,235` nhưng ở locale **mặc
  định (vi)**, và không e2e nào chạy `/kudos` với `NEXT_LOCALE=en` (chỉ `standards.spec.ts:375` và
  `awards.spec.ts:378` dùng cookie EN, khác route) ⇒ dịch 7 chuỗi **không** làm đỏ e2e nào. Vẫn phải
  chạy full để chứng minh, không chỉ suy luận.
- 7 giá trị hiện tại (để dịch, không tra lại): `kudos.banner.title` = "Hệ thống ghi nhận và cảm ơn" ·
  `kudos.compose.placeholder` = "Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?" ·
  `kudos.heroSearch.placeholder` / `.ariaLabel` = "Tìm kiếm profile Sunner" ·
  `kudos.spotlight.searchPlaceholder` = "Tìm kiếm" · `kudos.feed.empty` = "Hiện tại chưa có Kudos nào." ·
  `kudos.sidebar.emptyBoard` = "Chưa có dữ liệu".

## Requirements

Functional: mọi leaf của `en.json` không chứa dấu tiếng Việt; test thất bại kèm **danh sách key
phạm** (không chỉ một con số) khi ai đó thêm chuỗi Việt vào `en.json`.

Non-functional: guard là unit test thuần fs + JSON, không thêm dependency; chạy < 50ms; whitelist
(nếu buộc phải có) là danh sách key tường minh với lý do từng dòng, không regex mờ.

## Architecture

```
src/lib/i18n/messages-parity.test.ts
  flattenKeys()      (giữ nguyên — 2 test cũ không đổi)
+ flattenEntries()   → [path, value][]   (leaf + giá trị)
+ VI_DIACRITICS      = /[ăâđêôơưĂÂĐÊÔƠƯáàảãạ…]/u  (mảng ký tự tường minh, có cả tổ hợp dấu U+0300-U+0323)
+ it("en.json chứa 0 leaf có dấu tiếng Việt") → liệt kê key phạm trong message lỗi
```

Không đụng `vi.json` (phase 07 mới là chủ file đó).

## Related Code Files

Sửa: `src/lib/i18n/messages-parity.test.ts` (thêm 1 `it`, thêm `flattenEntries`) ·
`messages/en.json` (7 leaf).
Tạo / Xoá: không.

## Implementation Steps

1. **RED** — thêm `it("en.json không còn leaf tiếng Việt")` vào `messages-parity.test.ts`. Dùng dải
   ký tự tường minh (nguyên âm có dấu + `đ` + dấu tổ hợp Unicode U+0300–U+0323), KHÔNG dùng
   `/[^\x00-\x7F]/` — `Sun*`, dấu `…`, emoji trong copy EN hợp lệ sẽ bị bắt oan. Chạy `pnpm test:unit`
   → **đỏ, liệt kê đúng 7 key**.
2. Đối chiếu con số: nếu đỏ ra khác 7 key, DỪNG — hoặc regex sai, hoặc `en.json` đã lệch so với
   verified V1. Điều tra trước khi dịch.
3. Dịch 7 giá trị sang tiếng Anh tự nhiên (không dịch máy từng từ). `heroSearch.placeholder` và
   `.ariaLabel` cùng nguồn ⇒ giữ cùng chuỗi. Không đổi key, không thêm/bớt leaf (2 test cũ soi số
   lượng key).
4. `pnpm test:unit` → **xanh**, 3 test trong file này.
5. `pnpm test:e2e` full — chứng minh 7 chuỗi mới không làm đỏ assertion nào (đặc biệt
   `standards.spec.ts` C13, `awards.spec.ts` REG EN).
6. 4 gate (`format:check` sẽ soi cả JSON — chạy `prettier --write messages/en.json` nếu lệch).

## Todo List

- [ ] RED: guard mới đỏ, message in đúng 7 key
- [ ] Regex ký tự tường minh, không phải "non-ASCII"
- [ ] Dịch 7 leaf, số lượng key không đổi (191)
- [ ] GREEN unit + e2e full + 4 gate
- [ ] Không chạm `messages/vi.json`

## Success Criteria

- RED thật: exit ≠ 0, thông báo chứa cả 7 đường dẫn key. Không phải lỗi parse JSON hay import.
- GREEN: `pnpm test:unit` xanh; thêm thử một chuỗi Việt vào `en.json` ⇒ test đỏ lại (chứng minh guard
  còn sống), rồi hoàn nguyên.
- `python3 -c` scan dấu tiếng Việt trên `en.json` → 0 hit.
- 808 + 1 test mới xanh; 217 e2e không đổi; `git diff --stat messages/vi.json` rỗng.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Guard bắt oan chuỗi EN hợp lệ | trung bình | trung bình | dải ký tự tường minh, không `[^\x00-\x7F]`; bước 2 đối chiếu đúng 7 key |
| Guard chạy ngược lên `vi.json` | thấp | cao | chỉ đọc `enMessages`; assert trong test rằng file đang soi là `en.json` |
| e2e đỏ vì đổi copy EN | thấp | trung bình | bước 5 chạy full; đã kiểm trước: không route nào assert 7 chuỗi này ở locale EN |
| Ai đó thêm whitelist rỗng nghĩa để test xanh | trung bình | cao | nếu cần whitelist thì mỗi dòng phải có lý do; reviewer bắt whitelist không lý do |

**Rollback:** revert commit. Không DB, không migration.

## Security Considerations

Không có. Chỉ dữ liệu văn bản hiển thị; không chuỗi nào chứa secret hay URL nội bộ (kiểm bằng mắt
khi dịch).

## Next Steps

Mở khoá `messages/en.json` cho phase 07 (nhãn nav + dòng mô tả Awards) và mở đường cho phase 06
(assertion "bật EN không còn thấy tiếng Việt" mới có nghĩa).

## MoMorph refs:
- Dropdown chọn ngôn ngữ: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/hUyaaugye2
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F002_LanguageSwitch/`
  (plan này không có `clarifications.md`)
- testPolicy: e2e-red-first
