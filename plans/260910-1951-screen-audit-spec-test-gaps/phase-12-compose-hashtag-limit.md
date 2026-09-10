---
phase: 12
title: "Compose: thông báo 5 hashtag đúng nhịp + disable picker khi đủ 5"
track: B (behaviour/backend)
test_policy: e2e-red-first
feature: F009
status: completed
priority: P1
effort: 2h
depends_on: [11]
blocks: []
owned_files:
  - src/app/(public)/kudos/_hooks/use-kudos-compose-attachments.ts
  - src/app/(public)/kudos/_hooks/use-kudos-compose-attachments.test.ts
  - src/app/(public)/kudos/_components/kudos-hashtag-field.tsx
  - src/app/(public)/kudos/_components/kudos-hashtag-picker.tsx
  - src/app/(public)/kudos/_components/kudos-hashtag-picker.stories.tsx
  - tests/e2e/kudos-compose.spec.ts
---

# Phase 12 — 5 hashtag là hợp lệ, không phải lỗi

## Context Links

- **Không có spec revision cho F009.** Nguồn chốt: `momorph/specs-ihQ26W78P2.csv` rows **E**/**E.2**
  (cap là 5, 5 hợp lệ), TC **ID-16** ("5 hashtag được thêm thành công" — không lỗi), **ID-17**/**ID-53**
  (message chỉ khi thử tag thứ 6) · `momorph/specs-p9zO-c4a4x.csv` rows **A.1**, **B.1**, **C.1**,
  **D** ("Số hashtag đã chọn >= 5 … **disable các mục chưa chọn**", "Item bị disable — không phản hồi
  click") — frame này có **0 test case** trên MoMorph
- Audit: `research/audit-kudos-compose.md` gap 2, gap 3 (cả hai major)

## Overview

**Priority** P1 · **Status** pending · Hai lỗi lệch nhịp: (1) `use-kudos-compose-attachments.ts:54`
đặt `limitReached = hashtags.length >= 5` và `kudos-hashtag-field.tsx:82` hiển thị `maxMessage` từ
chính cờ đó ⇒ **đủ 5 chip (thành công) đã thấy lỗi**; (2) `kudos-hashtag-picker.tsx:128-142` render
mọi dòng là `<button>` luôn bật, không nhận `limitReached`, nên add thứ 6 chỉ bị nuốt lặng lẽ ở
`kudos-compose-form-rules.ts:90-92`.

## Key Insights

- **Tín hiệu từ chối đã có sẵn**: `addHashtagToList` trả `{ hashtags, limitReached: true }` đúng khi
  một lần add bị chặn (`kudos-compose-form-rules.ts:90-92`). Chỉ cần *giữ* tín hiệu đó thành state
  riêng, không cần luật mới.
- **Giữ `limitReached` cho `aria-disabled`** — nó vẫn đúng nghĩa "đã đủ 5". Đừng xoá; thêm một cờ
  thứ hai (`limitRejected`) cho *message*. Hai khái niệm khác nhau, đừng gộp.
- `limitRejected` phải **reset** khi user xoá 1 chip hoặc thêm được tag mới, nếu không message dính
  vĩnh viễn.
- `[C14]` (`kudos-compose.spec.ts:499`) hiện có **đúng 1 assertion** ("message visible") — vốn đã
  đúng trước cả lần add thứ 6, nên nó không phân biệt được "bị chặn" với "không bị chặn". Bắt buộc
  thêm `toHaveCount(5)` cho chip **và** assert message **không** xuất hiện ở đúng 5 chip.
- Picker: `disabled` một mình **không** cho ra `cursor: not-allowed` — muốn assert con trỏ thì phải
  set class. Và `aria-selected` hiện có phải giữ; chỉ thêm `disabled`/`aria-disabled` cho dòng
  `!isSelected && limitReached` (dòng ĐÃ chọn vẫn phải bỏ chọn được).
- `kudos-hashtag-picker.tsx` nhận vocabulary từ `compose.hashtagVocabulary` ← `board.filters.hashtags`
  (đổi nguồn ở phase 01). Phase này không chạm đường dữ liệu đó.

## Requirements

Functional: (a) đúng 5 chip ⇒ **không** message, nút thêm `aria-disabled`; (b) thử thêm tag thứ 6 ⇒
message "Tối đa 5 hashtag." xuất hiện, số chip **vẫn 5**; (c) xoá 1 chip ⇒ message mất; (d) khi đã
chọn 5, mọi dòng **chưa chọn** trong picker bị disable và không phản hồi click; dòng **đã chọn** vẫn
bỏ chọn được.

Non-functional: không thêm request; không đổi `validate-kudo-draft.ts` (luật `<1`/`>5` ở server giữ
nguyên); `MAX_HASHTAG_CHIPS` vẫn là nguồn duy nhất của số 5.

## Architecture

```
use-kudos-compose-attachments.ts
  limitReached  = hashtags.length >= MAX_HASHTAG_CHIPS      (GIỮ — dùng cho aria-disabled)
+ limitRejected = state, set true khi addHashtagToList trả limitReached: true
                  reset false khi add thành công / remove chip
        ↓
kudos-hashtag-field.tsx:82
  effectiveError = error ?? (limitRejected ? maxMessage : null)   ← đổi cờ, không đổi thứ tự ưu tiên
  <KudosHashtagPicker limitReached={limitReached} />               ← prop mới
        ↓
kudos-hashtag-picker.tsx:128-142
  disabled / aria-disabled khi (!isSelected && limitReached)
  + class trạng thái disable (opacity + cursor-not-allowed), bỏ hover khi disabled
```

Thứ tự ưu tiên cũ giữ nguyên: `error` từ submit luôn thắng `maxMessage`.

## Related Code Files

Sửa: `use-kudos-compose-attachments.ts:49-70` (+ `limitRejected`) + `.test.ts` ·
`kudos-hashtag-field.tsx:82,135-144` · `kudos-hashtag-picker.tsx:5-21,128-142` + `.stories.tsx`
(story "đã chọn 5") · `tests/e2e/kudos-compose.spec.ts` (`[C14]` `:499` + test picker mới).
Tạo / Xoá: không.

## Implementation Steps

1. **RED** — unit + e2e:
   (a) `use-kudos-compose-attachments.test.ts`: thêm 5 tag ⇒ `limitRejected === false`; thêm tag thứ
   6 ⇒ `limitRejected === true` và `hashtags.length === 5`; xoá 1 chip ⇒ `limitRejected === false`.
   Hôm nay không có `limitRejected` ⇒ đỏ.
   (b) `[C14]` trong `kudos-compose.spec.ts`: thêm đúng 5 tag ⇒ `expect(maxMessage).toBeHidden()`
   **và** `expect(chips).toHaveCount(5)`; rồi thử tag thứ 6 ⇒ message visible, chip **vẫn** 5.
   Assertion `toBeHidden()` ở 5 chip là RED thật (hôm nay message đang hiện).
   (c) test picker mới: chọn 5 tag, mở picker ⇒ dòng chưa chọn `toBeDisabled()`, click không đổi số
   chip; dòng đã chọn vẫn click bỏ chọn được. Hôm nay mọi dòng đều bật ⇒ đỏ.
   Chạy `pnpm test:unit` + `pnpm test:e2e kudos-compose.spec.ts`, ghi exit code + tên assertion.
2. Thêm `limitRejected` vào hook (state + reset ở cả 2 nhánh add-thành-công và remove).
3. `kudos-hashtag-field.tsx:82` đổi sang `limitRejected`; truyền `limitReached` xuống picker.
4. `kudos-hashtag-picker.tsx`: `disabled` + `aria-disabled` + class disable cho dòng chưa chọn khi
   `limitReached`; giữ `aria-selected`; bỏ `hover:bg-white/5` ở nhánh disabled.
5. Story "đã chọn 5" + `pnpm build-storybook`.
6. GREEN: unit, `pnpm test:e2e` full, 4 gate.

## Todo List

- [ ] RED ×3 (a)(b)(c) đỏ với lý do đúng
- [ ] `limitReached` GIỮ cho `aria-disabled`, `limitRejected` MỚI cho message
- [ ] `limitRejected` reset khi remove chip / add thành công
- [ ] Dòng ĐÃ chọn vẫn bỏ chọn được khi đủ 5
- [ ] `MAX_HASHTAG_CHIPS` vẫn là nguồn duy nhất của số 5 (grep không có `5` hardcode mới)
- [ ] `[C14]` có ≥ 3 assertion (hidden ở 5, visible ở 6, count vẫn 5)
- [ ] GREEN + 4 gate + storybook + e2e full

## Success Criteria

- RED thật ×3: (a) `limitRejected` undefined; (b) "expected hidden, received visible" ở đúng 5 chip;
  (c) "expected disabled" trên dòng picker chưa chọn. Không cái nào là lỗi mock/selector.
- GREEN: `[C14]` không còn là test 1-assertion; đếm được ≥ 3 `expect` trong block đó.
- `grep -n "limitReached ? maxMessage" src/app/\(public\)/kudos/_components/kudos-hashtag-field.tsx`
  → 0 hit.
- Đủ 5 chip: message ẩn, nút thêm `aria-disabled="true"`, dòng picker chưa chọn `disabled`.
- 808 + test mới xanh; 217 e2e không hồi quy.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| `limitRejected` dính vĩnh viễn sau khi xoá chip | **cao** | trung bình | reset ở CẢ 2 nhánh; test (a) có ca "xoá 1 chip ⇒ false" |
| Xoá luôn `limitReached` ⇒ mất `aria-disabled` | trung bình | trung bình | ghi thành checklist riêng; Success Criteria assert `aria-disabled` ở 5 chip |
| Disable cả dòng đã chọn ⇒ không bỏ chọn được | trung bình | cao | điều kiện `!isSelected && limitReached`; test (c) có ca bỏ chọn |
| Assert `cursor: not-allowed` mà chỉ set `disabled` | trung bình | thấp | phải set class `cursor-not-allowed`; nếu không thì đừng assert cursor |
| Hardcode `5` ở chỗ mới | trung bình | thấp | dùng `MAX_HASHTAG_CHIPS`; grep ở Success Criteria |
| Batch state của React nuốt `limitRejected` | trung bình | trung bình | hook đã dùng `hashtagsRef` cho đúng lý do này (`:44-48`) — đặt `limitRejected` từ kết quả trả về của `addHashtagToList`, không từ closure `hashtags` |

**Rollback:** revert commit. Không DB.

## Security Considerations

Không có lớp bảo mật mới. Server vẫn tự validate `>5` (`validate-kudo-draft.ts:79-84`) — disable ở
picker chỉ là UX, không phải điểm chặn.

## Implementation Deviation

**Scope creep necessity:** To wire `limitRejected` state up to the UI, three files outside the original `owned_files` had to be edited (each by 1 line):
- `use-kudos-compose-form.ts` — to expose `limitRejected` from form state
- `kudos-compose-launcher.tsx` — to pass it to child
- `kudos-compose-form.tsx` — to pass it to field

Without these wires, the state would not reach the field's message logic. This was unavoidable given the component architecture. Logged as uncontentious scope widening (file tree changes are minimal, each edit is <1 line).

## Next Steps

Kết thúc chuỗi `tests/e2e/kudos-compose.spec.ts` (11 → 12). Gap minor còn lại của picker (màu hover
`white/5` chưa có giá trị design) ghi `plans/action-items.md` § Nợ lại.

## MoMorph refs:
- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
- Dropdown list hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md` (plan hiện tại không có
  `clarifications.md` và **không có** spec revision F009)
- testPolicy: e2e-red-first
