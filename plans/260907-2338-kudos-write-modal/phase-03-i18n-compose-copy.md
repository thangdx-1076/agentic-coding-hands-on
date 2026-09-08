---
phase: 03
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 0.5h
owner: implementer
file_ownership:
  [
    "messages/vi.json",
    "messages/en.json",
    "src/app/(public)/kudos/_shared/kudos-compose-copy.ts",
  ]
---

# Phase 03 — i18n leaf `kudos.composeModal` + copy contract

## Context Links

- `research/researcher-ui-conventions-report.md` § 4 — i18n là **Server-Component-only**; không file nào trong `_components/` gọi `useTranslations`
- `src/app/(public)/kudos/_shared/kudos-copy.ts` — khuôn `*-copy.ts` (type + `default*` tĩnh) phải bắt chước
- `src/lib/i18n/messages-parity.test.ts` — gate: thiếu key ở một trong hai file là đỏ
- `momorph/specs-ihQ26W78P2.csv` (26 item, lấy chuỗi từ đây) · `clarifications.md` § Hai node (label/placeholder/hint của `Danh hiệu`)
- `phase-01` § Key Insights — danh sách chuỗi phải chép từng ký tự

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: một leaf `composeModal` dưới namespace `kudos` đã có, cộng một file copy contract (type + default tĩnh) để 5 phase Track A render text mà không cần gọi hook i18n.

## Requirements

FR-201, FR-203, FR-204, FR-205, FR-206, FR-207, FR-402, FR-403, FR-404 (chuỗi lỗi) · spec item A, B.1, B.2, C.1-6, D, D.1, E.1, E.2, F.1, F.5, G, H.1, H.2 · TC ID-3, ID-4, ID-5, ID-6, ID-11, ID-14, ID-17, ID-55, ID-56.

## Architecture notes

`messages/{vi,en}.json` → thêm `kudos.composeModal` (**sibling** của `kudos.compose` đang phục vụ pill; không đổi `kudos.compose`, không tạo namespace top-level mới). `_shared/kudos-compose-copy.ts` export `type KudosComposeCopy` + `defaultKudosComposeCopy` — giá trị tĩnh cho Storybook/test, giá trị thật đến từ `messages` qua `build-kudos-copy.ts` (phase 13). File này **không** compose `SiteChromeCopy` (dialog không render chrome), đúng lý do `kudos-copy.ts:1-13` đã ghi.

Khoá bắt buộc (đủ cho cả 5 phase Track A — chốt sẵn ở đây để không phase nào phải sửa file của phase khác giữa đường):

```text
title · recipientLabel · recipientPlaceholder · recipientEmpty · recipientLoading
titleLabel · titlePlaceholder · titleHintExample · titleHintUsage
contentLabel · contentPlaceholder · contentHint · standardsLink
toolbar: { bold, italic, strike, number, link, quote }   ← aria-label 6 nút
hashtagLabel · hashtagAdd · limitNote · hashtagPickerLabel · hashtagRemove
imageLabel · imageAdd · imageRemove
anonymousLabel · anonymousNameLabel · anonymousNamePlaceholder
cancel · submit · submitting
errorRequired · errorHashtagMax · errorImageInvalid · errorFormIncomplete
```

Bản `en` dịch nghĩa, **trừ** khoá nào design ghi bằng tiếng Anh nguyên bản (`Hashtag`, `Image`, `+ Hashtag`, `+ Image`) thì giữ y nguyên ở cả hai locale — đúng cách `kudos.feed.copiedToast` đang làm.

## Implementation Steps

1. Đọc 26 item CSV bằng python, lấy `description`/`character` thật — **không** lấy `itemName` (mọi node ở file này mang `itemName` rác `"Awards Information Navigation Links"`).
2. Thêm khối `composeModal` vào `messages/vi.json` (chuỗi gốc tiếng Việt) rồi `messages/en.json` (**cùng bộ khoá, đúng thứ tự**).
3. `errorHashtagMax = "Tối đa 5 hashtag."`, `errorImageInvalid = "Chỉ nhận file .jpg hoặc .png, tối đa 5 ảnh."`, `errorRequired = "Không được để trống"`, `errorFormIncomplete = "Vui lòng điền đầy đủ thông tin bắt buộc."` — nguyên văn functional-spec § 9.
4. `anonymousNamePlaceholder`: spec ghi `TBD (draft)` và frame `p9vFVBE_tc` không có node data → dùng `"Tên ẩn danh"`, theo pattern label-làm-placeholder của `kudos-hero-search-pill`. Ghi một dòng vào `plans/action-items.md` § Decisions.
5. Viết `_shared/kudos-compose-copy.ts`: type + `defaultKudosComposeCopy` chép **đúng** giá trị `vi`, mỗi field một doc-comment trỏ node id (`mm:I520:11647;…`) như `kudos-copy.ts` làm.
6. `pnpm exec vitest run src/lib/i18n/messages-parity.test.ts` → xanh. Rồi `pnpm lint --max-warnings 0`, `pnpm format:check`.

## Todo List

- [ ] Chuỗi lấy từ `description`/`character`, không từ `itemName`
- [ ] `kudos.composeModal` có mặt ở **cả** `vi.json` và `en.json`, cùng bộ khoá
- [ ] 4 chuỗi lỗi nguyên văn functional-spec § 9
- [ ] `anonymousNamePlaceholder` đã chốt + ghi `action-items.md`
- [ ] `kudos-compose-copy.ts`: type + default tĩnh, doc-comment trỏ node id
- [ ] `messages-parity.test.ts` xanh · lint · format

## Success Criteria

- `messages-parity.test.ts` xanh (bằng chứng hai file không lệch khoá).
- `kudos.compose.placeholder`/`.ariaLabel` **không đổi** một ký tự — pill của F007 và C03 của `kudos.spec.ts` vẫn đọc đúng.
- `grep -rn "useTranslations\|getTranslations" "src/app/(public)/kudos/_components/"` vẫn rỗng.
- `defaultKudosComposeCopy` khớp `messages/vi.json` từng chuỗi (một nguồn, chép tay một lần, không tính toán).
- File ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Thiếu một khoá mà Track A cần → phase khác phải sửa file này | TB | Cao — vỡ file ownership | Bộ khoá chốt sẵn ở § Architecture, suy ra từ đủ 26 spec item |
| Thêm khoá vào `vi.json` mà quên `en.json` | Cao | TB — coverage/CI đỏ | Bước 6 chạy `messages-parity.test.ts` |
| Dịch cả `Hashtag`/`Image`/`+ Image` sang tiếng Việt ở bản `en` | TB | Thấp — lệch design | § Architecture ghi rõ giữ nguyên bản |
| Đặt namespace top-level `composeModal` thay vì lồng dưới `kudos` | Thấp | TB — phá convention một-namespace-một-màn | `build-kudos-copy.ts:1-24` là chuẩn đối chiếu |

## Security Considerations

Không có dữ liệu người dùng ở phase này. Một lưu ý: chuỗi lỗi phải **chung chung** — không nhúng tên file, tên cột, hay lý do kỹ thuật vào thông báo cho người dùng; lỗi phía máy chủ chỉ trả `reason` dạng enum (phase 06), không trả message thô.

## Next Steps

Mở khoá 5 phase Track A (08–12) và phase 13 (`build-kudos-copy.ts` map `messages` vào type này).
