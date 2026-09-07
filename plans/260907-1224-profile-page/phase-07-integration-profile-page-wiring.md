---
phase: 07
feature: F006
track: B
status: completed
priority: P1
effort: 1h
owner: implementer
file_ownership:
  [
    "src/app/(protected)/profile/page.tsx",
    "src/app/(protected)/profile/_components/profile-client.tsx",
    "src/app/(protected)/profile/_shared/build-profile-copy.ts",
  ]
---

# Phase 07 — Lắp `page.tsx` + client boundary + `buildProfileCopy`

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 3.1 (pseudocode A1), § 5.3 (Data Flow)
- `src/app/(public)/awards/page.tsx` — khuôn gần nhất: `getViewer` + DAL + `buildCopy` + client boundary
- `src/app/(public)/awards/_components/awards-client.tsx` — khuôn client boundary
- `src/app/(public)/standards/_shared/build-standards-copy.ts` — khuôn tách `buildCopy` ra file riêng, và **lý do** phải tách
- `src/app/(protected)/todo/page.tsx` — tiền lệ đọc lại `getCurrentUser()` trong `(protected)`
- Kết quả phase 03 (`getProfileCard`, `toProfileCardsClient`), 05 (`ProfileScreen`, `ProfileCopy`), 06 (`parseProfileId`)

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Nối 4 mảnh đã có — phân giải `?id=`, đọc `profile_cards`, dựng copy từ i18n, bọc client boundary — thành route `/profile` chạy thật.

## Out of scope

- **Không** sửa component nào của phase 05 (`profile-screen.tsx` và 4 leaf) — thấy cần sửa thì trả bounded fix về Track A, đừng tự sửa.
- **Không** sửa `parse-profile-id.ts` (phase 06) hay DAL (phase 03).
- **Không** sửa `(protected)/layout.tsx` — gate không đổi.
- **Không** thêm khoá i18n mới (phase 04 sở hữu `messages/*.json`); thiếu khoá thì báo, đừng tự thêm.

## Key Insights

- **`page.tsx` là nơi DUY NHẤT được gọi `notFound()`/`redirect()`.** `parseProfileId` trả quyết định, `page.tsx` thực thi. `switch` trên `resolution.kind` vét cạn 4 nhánh — để TypeScript bắt nếu union đổi.
- **`notFound()` và `redirect()` hoạt động bằng cách THROW.** Đừng bọc chúng trong `try/catch` — một `try` rộng tay quanh khối phân giải sẽ nuốt chính cái redirect mình vừa gọi và biến 404 thành trang trắng. Nếu cần try/catch, chỉ bọc **đúng lời gọi DAL**, mà DAL đã fail-open sẵn nên không cần.
- **Đọc lại `getCurrentUser()` là round-trip thêm đã được chấp nhận** — cùng lý lẽ `TodoPage`. Layout đảm bảo non-null, nhưng type vẫn là `User | null`; xử lý `null` bằng `redirect(ROUTES.LOGIN)` chứ **không** `!`. Non-null assertion ở đây là đặt cược vào một bất biến ở file khác.
- **Self view cũng đọc qua `profile_cards`** (D011, BR-003) — **không** dùng `user.email`/`user.user_metadata` từ session cho hero. Một đường đọc, một shape, cho cả 2 nhánh. Nhánh self mà `getProfileCard` trả `null` (user vừa xoá row) → `notFound()`, cùng luật.
- **`buildProfileCopy` PHẢI là file riêng, không gộp vào `profile-copy.ts`.** `profile-copy.ts` được `ProfileScreen` import và component đó đi vào bundle client; `getTranslations` là `next-intl/server`. Gộp = kéo `next-intl/server` sang client. Lý do nguyên văn đã ghi ở `build-standards-copy.ts`.
- **`ProfileCopy` kế thừa `SiteChromeCopy`** → `buildProfileCopy` phải đọc **2 namespace**: `home` cho lá chrome (nav/header/kudos/footer/account/notifications) và `profile` cho lá riêng. `footer.copyright` tái dùng `login.footer` — đúng tiền lệ `(home)/page.tsx` và `awards/page.tsx`, đừng nhân bản chuỗi.
- **Map qua bảng cấu trúc, không gõ tay từng lá.** `STATISTICS_ROWS`/`BADGE_SLOTS` (phase 05) là nguồn duy nhất — đúng cách `buildStandardsCopy` map qua `HERO_TIERS`/`SECRET_BOX_BADGES`. Gõ tay 5 nhãn ở đây là mở đường cho lệch tên khoá.
- **`page.tsx` ≤200 dòng** — vì thế `buildProfileCopy` ra file riêng (đúng lý do `awards/page.tsx` tách `buildCopy`).
- **Client boundary chỉ để bọc function props.** `onSelectLocale` (`useSelectLocale` ở `@/app/_hooks/`) và `logoutAction` không băng qua được Server Component render → `profile-client.tsx` là chỗ nối. Nó **không** hút logic của `KudosDirectionSelect` — leaf đó đã tự `"use client"`.
- **`metadata.title`** đặt như `standards/page.tsx`/`awards/page.tsx` — tĩnh, không ghép tên người dùng vào title (tên hồ sơ người khác trong `<title>` là rò rỉ nhỏ nhưng miễn phí để tránh).

## Requirements

- `GET /profile` (đã đăng nhập, không tham số) → render hồ sơ mình đọc từ `profile_cards`.
- `?id=` xử đúng 4 nhánh của `parseProfileId`: `self` render · `canonical` → `redirect(ROUTES.PROFILE)` · `reject` → `notFound()` · `other` → `getProfileCard` → `null` ? `notFound()` : render other view.
- `isSelf` truyền xuống đúng, quyết định: tiêu đề bộ sưu tập, slot `362:5073`, mảng `directions`.
- Không nhánh nào query DB bằng giá trị chưa qua `parseProfileId`.
- `page.tsx` ≤200 dòng; không `"use client"`.

## Architecture

```text
src/app/(protected)/profile/page.tsx        (Server Component)
  viewer = await getCurrentUser()          → null ? redirect(ROUTES.LOGIN)
  { id: rawId } = await searchParams
  res = parseProfileId(rawId, viewer.id)
  switch (res.kind)
    "reject"    → notFound()
    "canonical" → redirect(ROUTES.PROFILE)
    "self"      → card = getProfileCard(toProfileCardsClient(supabase), viewer.id); isSelf = true
    "other"     → card = getProfileCard(toProfileCardsClient(supabase), res.id);    isSelf = false
  card === null → notFound()
  copy = buildProfileCopy(tHome, tProfile, tLogin, locale)
  → <ProfileClient copy profile={card} isSelf viewer locale logoutAction />

src/app/(protected)/profile/_components/profile-client.tsx    "use client"
  useSelectLocale()  → <ProfileScreen … onSelectLocale unreadCount={0} />

src/app/(protected)/profile/_shared/build-profile-copy.ts     (server-only path)
  SiteChromeCopy ← namespace "home" (+ footer.copyright ← login.footer)
  hero/badges/stats/kudos ← namespace "profile", map qua STATISTICS_ROWS/BADGE_SLOTS
```

## Related Code Files

**Create**
- `src/app/(protected)/profile/page.tsx`
- `src/app/(protected)/profile/_components/profile-client.tsx`
- `src/app/(protected)/profile/_shared/build-profile-copy.ts`

**Modify**: — · **Delete**: —
**Chỉ đọc**: `_components/profile-screen.tsx`, `_shared/profile-copy.ts`, `_utils/parse-profile-id.ts`, `src/dal/profile-cards*.ts`, `src/app/_utils/get-viewer.ts`, `src/app/_hooks/use-select-locale.ts`, `tests/e2e/profile.spec.ts`

## Implementation Steps

1. `build-profile-copy.ts`: nhận 3 translator (`home`, `profile`, `login`) + `locale`; map `STATISTICS_ROWS`/`BADGE_SLOTS` thay vì gõ tay lá.
2. `profile-client.tsx`: mirror `awards-client.tsx` gần như dòng-đối-dòng; chỉ bọc, không hút logic.
3. `page.tsx`: viết theo Architecture. `switch` vét cạn (`default: notFound()` hoặc `never` check). **Không** `try/catch` quanh khối `switch`.
4. Nhánh `self` và `other` dùng **cùng một** lời gọi `getProfileCard` — tách id ra biến rồi gọi 1 lần, đừng viết 2 nhánh gọi song song (DRY, và tránh lệch xử lý `null`).
5. Xử lý `viewer === null` bằng `redirect(ROUTES.LOGIN)`, **không** `viewer!`.
6. `metadata` tĩnh (`title: "Hồ sơ"`), không ghép tên.
7. Kiểm `page.tsx` ≤200 dòng; `grep '"use client"' page.tsx` rỗng.
8. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm test:unit:coverage`.
9. Smoke tay: `supabase start`, `lsof -ti:3000 | xargs -r kill -9`, `pnpm dev`, mở `/profile`, `/profile?id=<self>`, `/profile?id=<other>`, `/profile?id=xxx`, `/profile?id=a&id=b` — 5 URL, 5 hành vi đúng như bảng. Sai chỗ nào thì sửa **trước** khi giao phase 08.

## Todo List

- [ ] `build-profile-copy.ts` — 3 namespace, map qua bảng cấu trúc, `footer.copyright` ← `login.footer`
- [ ] `profile-client.tsx` — mirror `awards-client.tsx`, chỉ bọc
- [ ] `page.tsx` — `switch` vét cạn 4 nhánh, KHÔNG `try/catch` quanh nó
- [ ] 1 lời gọi `getProfileCard` dùng chung cho self/other
- [ ] `viewer === null` → `redirect(ROUTES.LOGIN)`, không `!`
- [ ] `metadata` tĩnh, không chèn tên
- [ ] `page.tsx` ≤200 dòng, không `"use client"`
- [ ] Gate: lint · format · build · typecheck · coverage
- [ ] Smoke tay đủ 5 URL

## Success Criteria

- 5 URL ở bước 9 cho đúng hành vi: self render · `?id=self` → URL về `/profile` không query · `?id=other` → hồ sơ người đó · `?id=xxx` → 404 · `?id=a&id=b` → 404.
- `pnpm build` + `pnpm typecheck` + `pnpm lint --max-warnings 0` + `pnpm format:check` + `pnpm test:unit:coverage` xanh.
- `grep -n "try {" src/app/\(protected\)/profile/page.tsx` → rỗng (hoặc chỉ bọc đúng 1 lời gọi không phải `notFound`/`redirect`).
- `grep -n "viewer!\|card!\|as unknown as" src/app/\(protected\)/profile/page.tsx` → rỗng.
- `grep -n "getTranslations" src/app/\(protected\)/profile/_shared/profile-copy.ts` → rỗng (server-only không lọt sang file bundle client).
- `grep -rn "user_metadata\|user.email" src/app/\(protected\)/profile/` → rỗng (hero đọc qua `profile_cards`, không qua session).
- Không sửa file nào ngoài `file_ownership`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| `try/catch` bọc `notFound()`/`redirect()` → nuốt luôn control flow, 404 thành trang trắng | **Cao** (phản xạ phòng thủ) | **Cao** — C12/C13/C15 đỏ, khó chẩn | Key Insights + Success Criteria grep `try {` |
| Dùng `user.user_metadata.full_name` cho hero thay vì `profile_cards` | **Cao** (session sẵn có, tiện tay) | Cao — vỡ BR-003/D011, 2 đường đọc lệch shape | Success Criteria grep `user_metadata`; 1 lời gọi DAL dùng chung |
| `getTranslations` lọt vào `profile-copy.ts` → `next-intl/server` sang bundle client | Trung bình | Cao — build phình/đỏ | File riêng `build-profile-copy.ts` + grep ở Success Criteria |
| `viewer!` thay vì xử lý `null` | **Cao** | Trung bình | Success Criteria grep `viewer!` |
| Gõ tay 5 nhãn/6 slug thay vì map bảng cấu trúc | Trung bình | Trung bình — lệch tên khoá, C6 đỏ | Bước 1 map qua `STATISTICS_ROWS`/`BADGE_SLOTS` |
| Tự sửa component của phase 05 khi thấy lệch | Trung bình | Trung bình — vượt ownership, mất dấu vết Track A | Out of scope: trả bounded fix về `momorph-ui-implementer` |
| Tự thêm khoá i18n thiếu | Trung bình | Trung bình — parity vi/en vỡ | Out of scope: báo về phase 04 |
| `page.tsx` phình >200 dòng vì gộp `buildCopy` | Trung bình | Thấp | Tách sẵn từ bước 1 |
| `switch` không vét cạn → union đổi mà không ai biết | Thấp | Trung bình | `default` + `never` check |

## Security Considerations

- **`page.tsx` là nơi duy nhất `?id=` chạm hệ thống**, và nó chỉ chạm sau `parseProfileId`. Không thêm đường nào khác đọc `searchParams`.
- Không truyền `viewer` (chứa `email`) xuống bất kỳ prop nào ngoài `SiteViewer { email, isAdmin }` mà chrome vốn cần — **không** trộn vào `profile`.
- `notFound()` cho cả "không có hàng" lẫn "lỗi Supabase thoáng qua": người ngoài không phân biệt được hai trạng thái → không dò được sự tồn tại của một `id`.
- `<title>` tĩnh — không đưa tên hồ sơ người khác vào title/metadata.
- Gate đăng nhập vẫn 100% là `(protected)/layout.tsx`; `page.tsx` không tự phán quyền.

## Next Steps

Mở khoá phase 08 (temper). Đây là merge point duy nhất — mọi phase trước phải đóng.
