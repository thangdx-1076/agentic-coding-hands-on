---
phase: 13
feature: F007, F008
track: B
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.25h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/page.tsx",
    "src/app/(public)/kudos/_components/kudos-client.tsx",
    "src/app/(public)/kudos/_components/kudos-screen.tsx",
    "src/app/(public)/kudos/_shared/build-kudos-copy.ts",
  ]
---

# Phase 13 — Lắp `page.tsx` + client boundary + `buildKudosCopy`

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- **`tests/e2e/kudos.spec.ts`** — toàn bộ C01–C29 phải GREEN sau phase này (trừ phần `@auth`/`@local-db` cần môi trường)
- `src/app/(public)/awards/page.tsx:44-105` — khuôn gần nhất: `createClient()` → DAL → `buildCopy` với `tHome` cho chrome
- `src/app/(protected)/profile/page.tsx:88-92` + `profile-client.tsx` — khuôn ranh giới server/client
- Kết quả phase 03 (`getKudosBoard`), 04 (`getViewerHeartedKudoIds`, `toggleKudoHeart`), 06 (`loadMoreKudos`), 07–12 (component)

## Overview

**Priority**: P0 · **Status**: pending · **Track B** (`implementer`) · **Merge point duy nhất**
**Goal (1 dòng)**: Nối Server Component → DAL → copy → 6 vùng UI thành trang `/kudos` chạy thật, và biến 5 liên kết đang chết trên site thành liên kết sống.

## Out of scope

- **Không** sửa bất kỳ file `.tsx` nào của phase 07–12. Thiếu prop hay sai `data-testid` → trả bounded fix về đúng phase Track A đó, **không** tự vá.
- **Không** sửa `tests/e2e/kudos.spec.ts` (phase 14 nhận lại quyền đó).
- **Không** sửa migration hay DAL — sai schema thì trả về phase 03/04.
- **Không** đụng `src/proxy.ts` hay 5 điểm liên kết cũ (AD-6).

## Key Insights

- **`page.tsx` là Server Component, không `"use client"`.** Đọc `searchParams` (Next 16: `searchParams` là Promise, phải `await`), gọi `createClient()` rồi DAL, dựng `copy`, giao cho `KudosClient`.
- **Ranh giới client nằm ở `kudos-client.tsx`, không lan xuống.** `"use client"` chỉ ở đó; `KudosScreen` và các vùng bên dưới là component nhận props. Đây là khuôn `awards-client.tsx`/`profile-client.tsx` đang dùng.
- **`buildKudosCopy` đọc HAI namespace**: `getTranslations("home")` cho chrome (nav/header/footer/account) và `getTranslations("kudos")` cho leaf. Đừng nhân bản chuỗi chrome sang namespace `kudos` — `awards/page.tsx` đã ghi rõ lý do DRY.
- **`hearted`/`canHeart` tính ở server**, không ở client: `canHeart = viewer !== null && viewer.id !== kudo.senderId`; `hearted = heartedIds.has(kudo.id)`. Client không tự suy ra (F008 § 3.1 nói thẳng "F007 chỉ vẽ lại theo giá trị này").
- **Bộ lọc đẩy lên URL bằng `router.push`, không `router.replace`** — người dùng phải back được về trạng thái trước (BR-003 + trải nghiệm).
- **Chrome import bằng relative 3 cấp**: `../../../_components/site-header` — alias `@/app/**/_*` bị ESLint cấm; `(public)/kudos/_components/` sâu đúng bằng `(public)/awards/_components/`.
- **Không `revalidatePath` trong `loadMoreKudos`** (phase 06 đã ghi) nhưng **có** trong `toggleKudoHeart` (phase 04) — hai Server Action, hai hành vi khác nhau, đừng đồng nhất.

## Architecture — lắp ráp

```text
page.tsx (Server)
  await searchParams -> {hashtag?, department?}
  createClient() -> getKudosBoard(toKudosClient(sb), {hashtag, department})
                 -> getViewerHeartedKudoIds(toKudoHeartsClient(sb), viewer?.id, ids)
  getViewer()    -> SiteViewer | null
  buildKudosCopy(tHome, tKudos) -> KudosCopy
  <KudosClient board copy viewer heartedIds />           ["use client" ở đây]
       -> <KudosScreen>
            SiteHeader | KudosBanner | KudosComposePill | KudosFilterBar
            KudosHighlightCarousel | KudosSpotlight
            KudosFeed  ‖  KudosSidebar
            SiteFooter
```

## Related Code Files

**Tạo**: `page.tsx`, `_components/kudos-client.tsx`, `_components/kudos-screen.tsx`, `_shared/build-kudos-copy.ts`

## Implementation Steps

1. `build-kudos-copy.ts` — nhận hai hàm `t`, trả `KudosCopy` đầy đủ. Chrome đọc namespace `home`, leaf đọc namespace `kudos`.
2. `page.tsx` — `await searchParams`; `createClient()`; `getViewer()`; gọi DAL; tính `canHeart`/`hearted`; render `KudosClient`. Không `"use client"`, không `useState`.
3. `kudos-client.tsx` — `"use client"`; giữ danh sách feed đang hiển thị qua `useInfiniteFeed`; handler `onSelectHashtag`/`onSelectDepartment` gọi `useRouter().push` với query mới; handler `onToggleHeart` gọi `toggleKudoHeart` và cập nhật số tim tại chỗ; handler `onCopyLink` viết clipboard + hiện toast `data-testid="kudos-toast"`.
4. `kudos-screen.tsx` — thuần bố cục: chrome + 6 vùng theo đúng thứ tự tài liệu mà C10 assert; feed và sidebar hai cột, sidebar cuộn riêng.
5. Chạy `pnpm dev`, mở `/kudos` bằng mắt, đối chiếu với `momorph/frame-image.png`.
6. Chạy nhánh CI-safe trước: `pnpm exec playwright test kudos --grep-invert "@auth|@local-db"` → phải **10/10 xanh**.
7. Rồi chạy toàn bộ: `pnpm test:e2e`. Mọi thất bại thuộc về UI thì trả bounded fix về đúng phase Track A sở hữu file đó.
8. `pnpm test:unit:coverage` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.

## Todo List

- [ ] `build-kudos-copy.ts` đọc 2 namespace, không nhân bản chuỗi chrome
- [ ] `page.tsx` Server Component, `await searchParams`
- [ ] `canHeart`/`hearted` tính ở server
- [ ] `"use client"` chỉ ở `kudos-client.tsx`
- [ ] Bộ lọc dùng `router.push` (không `replace`)
- [ ] Toast Copy Link `data-testid="kudos-toast"` với chuỗi em dash đúng
- [ ] Import chrome bằng relative `../../../_components/...`
- [ ] Đối chiếu bằng mắt với `frame-image.png`
- [ ] 10/10 test CI-safe xanh
- [ ] `pnpm test:e2e` toàn bộ, phân loại lỗi UI về đúng phase chủ sở hữu
- [ ] coverage / lint / format / build / typecheck / build-storybook xanh

## Success Criteria

- `GET /kudos` trả `200` cho cả ẩn danh lẫn đã đăng nhập — 5 liên kết đang chết trên site trở nên sống.
- `pnpm exec playwright test kudos --grep-invert "@auth|@local-db"` xanh **10/10**.
- Với Supabase đang chạy và seed của phase 05 đã apply: `pnpm test:e2e` xanh toàn bộ C01–C29.
- 5 spec cũ (`home`, `login`, `awards`, `standards`, `profile`) vẫn xanh — đặc biệt `awards` TC ID-8 và `standards` C7/C12, vốn assert `a[href="/kudos"]`.
- `pnpm test:unit:coverage` giữ nguyên 100%; `pnpm build` + `pnpm typecheck` xanh.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Tự vá file của phase 07–12 khi thiếu prop | Cao | Cao — phá ranh giới ownership, phase kia revert là mất | Out of scope cấm thẳng; trả bounded fix |
| `"use client"` leo lên `page.tsx` | Trung bình | Cao — mất SSR, `searchParams` hỏng, DAL chạy phía client | Khuôn `awards`/`profile` đã có; Todo ghi rõ |
| Quên `await searchParams` (Next 16 breaking change) | Cao | Cao — bộ lọc im lặng không chạy | Đọc `node_modules/next/dist/docs/` trước khi viết, đúng chỉ dẫn `AGENTS.md` |
| `standards.spec.ts` C12 đỏ vì `/kudos` giờ trả 200 | Thấp | Trung bình | C12 chỉ `waitForURL("/kudos")`, không assert nội dung — chỉ comment là lỗi thời, phase 14 sửa |
| Toast dùng hyphen thay vì em dash `—` | Trung bình | Trung bình — C23 đỏ vì lệch 1 ký tự | Chuỗi lấy từ `messages/*.json` (phase 02), không gõ tay |
| `heartedIds` đọc `kudo_hearts` khi `0007` chưa apply | Thấp | Trung bình — trang 500 | `getViewerHeartedKudoIds` fail-open `Set` rỗng (phase 04) |

## Security Considerations

`page.tsx` chạy phía server và là chỗ duy nhất đọc session. `canHeart` được tính ở server chứ không tin client — nhưng nó chỉ là gợi ý UI: chốt chặn thật vẫn là RLS `WITH CHECK` của phase 04. `/kudos` cố ý không có guard (BR-015); mọi liên kết profile trỏ `/profile?id=` và tái dùng nguyên gate `(protected)/layout.tsx`, **không** dựng gate mới.

## Next Steps

Giao cho phase 14 để tester chạy GREEN, chụp bằng chứng thị giác và soát hồi quy.
