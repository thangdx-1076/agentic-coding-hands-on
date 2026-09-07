---
phase: 06
feature: F004
track: B
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 1h
owner: implementer
file_ownership:
  [
    "src/app/(public)/awards/page.tsx",
    "src/app/(public)/awards/_components/awards-client.tsx",
  ]
---

# Phase 06 — Lắp trang `/awards`: `page.tsx` + client boundary

## Context Links

- `spec/F004_AwardSystemPage/technical-spec.md` § 3.1 A1, § 5.3 Data Flow
- Khuôn mẫu: `src/app/(public)/(home)/page.tsx` (Server Component đọc DAL + copy) và `home-client.tsx` (biên client cho `onSelectLocale`)
- Kết quả phase 03 (`src/dal/awards.ts`, `awards-client.ts`, khoá `awards.*`), phase 05 (`AwardsScreen`)

## Overview

**Priority**: P1 · **Status**: pending · **Track B**
Điểm hợp lưu thứ hai: nối tầng dữ liệu (03) vào tầng trình bày (05). Phase nhỏ nhưng là nơi duy nhất `/awards` thật sự tồn tại như một route.

## Key Insights

- **Cần biên client** giống `/`: `SiteHeader` nhận `onSelectLocale` — prop hàm không băng qua được ranh giới Server Component. `logoutAction` là Server Action nên đi qua được. Vì vậy `page.tsx` → `AwardsClient` (`"use client"`, gọi `useSelectLocale`) → `AwardsScreen`.
- `AwardCategoryNav` đã tự là client leaf; `AwardsClient` không được nuốt luôn phần tĩnh — chỉ bọc, không chuyển logic vào.
- **Chrome copy đọc chéo namespace** (chốt ở phase 03): `getTranslations("home")` cho nav/header/footer/kudos/account/notifications, `getTranslations("login")` cho `footer.copyright`, `getTranslations("awards")` cho caption/heading/navLabel/quantityLabel/prizeLabel/empty. Tiền lệ: `(home)/page.tsx:113-117`.
- **Viewer**: dùng `getViewer()` đã hoist ở phase 02 (`(public)/_utils/get-viewer.ts`) — không viết lại. Nó fail-open `null`.
- **Fail-open là điều kiện sống của CI**: `getAwards` trả `[]` khi Supabase không tới được → `AwardsScreen` render empty-state. `page.tsx` không được `throw`, không `notFound()`, không `redirect()`.
- `page.tsx` **không** `"use client"`, **không** `export const dynamic = "force-static"` — trang đọc cookie locale + session nên phải render động theo request.
- `metadata` tối thiểu: `title: "Hệ thống giải thưởng SAA 2025"` (mirror `(home)/page.tsx:17-19`).
- `page.tsx` sẽ dài nếu dựng object copy inline như `(home)/page.tsx` (200 dòng). Giữ dưới ngưỡng: gom việc dựng copy thành 1 hàm `buildCopy(t, tHome, tLogin)` trong cùng file, hoặc cắt sang `_shared/build-awards-copy.ts` nếu vượt 200 dòng. *(Nếu cắt sang `_utils/` thì file rơi vào allowlist coverage 100% — chọn `_shared/` để tránh, vì đây thuần lắp ghép chuỗi.)*

## Requirements

- `GET /awards` trả 200 cho cả khách ẩn danh lẫn người đã đăng nhập, không redirect (BR-001, TC ID-0).
- Đọc đúng một lần: `createClient()` → `toAwardsClient` → `getAwards(client, locale)` với `locale` từ `getLocale()` đã `normalizeLocale`.
- Supabase lỗi/rỗng → `awards=[]`, trang vẫn có header/h1/caption/Kudos/footer (BR-002, SC-005).
- Không ghi DB, không Server Action mới.
- File ≤200 dòng.

## Architecture

```text
GET /awards
 └─ AwardsPage (Server Component)
      ├─ getLocale() → normalizeLocale → locale
      ├─ getTranslations("awards" | "home" | "login") → copy
      ├─ getViewer()                       → SiteViewer | null   (fail-open)
      ├─ createClient() → toAwardsClient() → getAwards(locale)
      │                                        └─ Award[] | []   (fail-open)
      └─ <AwardsClient copy locale viewer awards logoutAction />
             └─ "use client": useSelectLocale()
                  └─ <AwardsScreen … onSelectLocale />
```

## Related Code Files

**Create**: `src/app/(public)/awards/page.tsx`, `src/app/(public)/awards/_components/awards-client.tsx`
**Modify**: — (mọi thứ khác đã do phase 02/03/05 lo)
**Delete**: —

## Implementation Steps

1. `awards-client.tsx`: `"use client"`, nhận `{ copy, locale, viewer, awards, logoutAction }`, gọi `useSelectLocale()`, render `AwardsScreen` — mirror `home-client.tsx` từng dòng.
2. `page.tsx`: `metadata`, `getLocale`/`normalizeLocale`, 3 lần `getTranslations`, `getViewer()`, `createClient` + `toAwardsClient` + `getAwards`, dựng `copy`, render `AwardsClient`.
3. Kiểm dòng: nếu `page.tsx` chạm 200, cắt hàm dựng copy sang `_shared/build-awards-copy.ts`.
4. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check`.
5. `pnpm dev` rồi mở `/awards` **với Supabase đang chạy** (6 giải hiện đủ) và **với Supabase tắt** (empty-state, không 500). Hai lượt kiểm này là bằng chứng đóng phase.

## Todo List

- [x] `awards-client.tsx` (biên client, mirror `home-client.tsx`)
- [x] `page.tsx` Server Component, 3 namespace copy, `getViewer`, `getAwards`
- [x] Kiểm ≤200 dòng, cắt `_shared/build-awards-copy.ts` nếu cần
- [x] `build` + `typecheck` + `lint` + `format:check` xanh
- [x] Kiểm tay 2 trạng thái: Supabase bật (6 giải) / tắt (empty-state, không 500)

## Success Criteria

- `/awards` trả 200 khi ẩn danh; `/todo` vẫn redirect về `/login` (proxy không bị ảnh hưởng).
- Supabase bật: 6 section đúng thứ tự `sort_order`, nội dung khớp `award-seed-content.md`.
- Supabase tắt: trang vẫn 200, hiện empty-state, không dòng `pageerror` nào trong console (TC ID-13).
- `pnpm build` + `pnpm typecheck` xanh.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| `"use client"` lỡ tay đặt lên `page.tsx` | Thấp | Cao — mất Server Component, không gọi được DAL | Reviewer fail-list; `page.tsx` không import gì từ `react` client |
| `t.raw`/khoá thiếu → next-intl ném lúc render → 500 | Trung bình | Cao — phá cả TC ID-0 | Phase 03 đã chốt parity; bước 5 kiểm tay cả 2 locale |
| Nhân đôi `getViewer` vì quên phase 02 đã hoist | Trung bình | Thấp — DRY | Ghi rõ ở Key Insights; grep `getCurrentUser` trong `awards/` phải rỗng |
| `page.tsx` phình >200 dòng như `(home)/page.tsx` | Trung bình | Thấp | Bước 3 cắt sang `_shared/`, KHÔNG sang `_utils/` (kéo theo gate coverage) |
| Supabase bật lúc dev che mất lỗi nhánh rỗng | Trung bình | Trung bình — CI đỏ về sau | Bước 5 bắt buộc thử lượt tắt Supabase |

## Security Considerations

- Chỉ Server Component chạm Supabase; `AwardsClient` không nhận client, không nhận key.
- Không đưa `viewer.email` vào thứ gì ngoài `SiteHeader` (đúng phạm vi hiện có ở `/`).
- Fail-open ở trang công khai không nới quyền: `/awards` vốn không có dữ liệu riêng tư nào.
- Không thêm route handler, không thêm bề mặt ghi.

## Next Steps

Mở khoá phase 07 (tester chạy GREEN + visual). Cần phase 01 đã áp migration để nhóm `@local-db` có dữ liệu.
