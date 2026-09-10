# Diagnosis — "Tìm kiếm profile Sunner" không hoạt động

- Date: 2026-09-10
- Mode: autonomous (fix-bug)
- Branch: main

## Triệu chứng (user)

"Tính năng tìm kiếm profile sunner khác chưa hoạt động đúng, đang có bug."

## Survey

Chỉ có 3 ô search trong app (grep `search` toàn `src`):

| UI | File | Trạng thái |
|---|---|---|
| Hero pill `/kudos`, placeholder **"Tìm kiếm profile Sunner"** | `src/app/(public)/kudos/_components/kudos-hero-search-pill.tsx` | **chết** — `readOnly`, không state, không handler |
| Spotlight "Tìm kiếm" (highlight scatter) | `kudos-sunner-search.tsx` + `use-spotlight-search.ts` | hoạt động (chỉ lọc tên trong scatter, không mở profile) |
| Combobox người nhận trong dialog Viết Kudo | `kudos-recipient-field.tsx` + `use-sunner-suggest.ts` | hoạt động (chọn người nhận, không mở profile) |

Chuỗi mở profile người khác đã có sẵn và đúng: `/profile?id=<uuid>` →
`parse-profile-id.ts` → `getProfileCard` (view `profile_cards`). Link từ
`kudos-card-person.tsx:100` và `kudos-leaderboard.tsx:70` dùng đúng đường này.

## Root cause (confirmed)

`src/app/(public)/kudos/_components/kudos-hero-search-pill.tsx:48-54` — ô input
duy nhất mang nhãn "Tìm kiếm profile Sunner" được render `readOnly`, không
`value`/`onChange`, không dropdown, không điều hướng. Docblock cùng file
(dòng 23-27) ghi rõ đây là chủ ý lúc dựng UI: "the Sunner-profile search this
opens has no Figma frame in this file, so wiring a handler would either no-op or
navigate somewhere that does not exist".

Hệ quả người dùng thấy: gõ vào ô không hiện chữ, không có kết quả, không mở được
profile Sunner khác → đúng triệu chứng. Không phải regression: pill readOnly từ
commit đầu `76987f1`.

Evidence chain:
1. `grep -ril search src` → chỉ 3 surface trên; không surface nào mở `/profile` từ ô search.
2. `kudos-hero-search-pill.tsx:50` `readOnly` + không có `onChange` trong file.
3. Không có e2e contract nào ràng buộc pill này (`grep hero-search tests/` = 0 hit) → không có test bảo vệ hành vi hiện tại, cũng không có test bắt lỗi.
4. Hạ tầng search đã tồn tại và không cần viết mới: Server Action `searchSunners`
   (`_actions/search-sunners.ts`), hook debounce `useSunnerSuggest`
   (`_hooks/use-sunner-suggest.ts`), dropdown `KudosSunnerOptions`
   (`_components/kudos-sunner-options.tsx`, đã tham số hoá testid để tái dùng).

Scope: 1 hook mới + 1 client wrapper mới + 5 file sửa (pill, keyvisual band, copy
builder, 2 file messages) + test.

## Fix

Nối pill vào đúng hạ tầng đã có, không dựng lớp mới:

- `_hooks/use-hero-profile-search.ts` (mới): query có cap, gọi `useSunnerSuggest`
  (chỉ khi đã đăng nhập), mở/đóng dropdown, `openProfile()` push
  `/profile?id=<uuid>`, Enter mở kết quả đầu.
- `kudos-hero-search-pill.tsx`: bỏ `readOnly`, thành controlled input + dropdown
  (vẫn presentational, story còn dùng được).
- `kudos-hero-profile-search.tsx` (mới): client wrapper giữ hook — cùng khuôn
  `kudos-compose-launcher.tsx`.
- `/kudos` là route public, `searchSunners` trả `[]` cho khách → hiện gợi ý đăng
  nhập thay vì "không tìm thấy" gây hiểu sai.

## Câu hỏi còn mở

- Design không có frame cho dropdown của hero pill (giống dropdown người nhận đã
  ship). Đang mượn nguyên shape `KudosSunnerOptions`.
