---
phase: 13
feature: F009
track: integration
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-compose-form.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-body.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-launcher.tsx",
    "src/app/(public)/kudos/_components/kudos-keyvisual-band.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-pill.tsx",
    "src/app/(public)/kudos/_components/kudos-screen.tsx",
    "src/app/(public)/kudos/_components/kudos-client.tsx",
    "src/app/(public)/kudos/page.tsx",
    "src/app/(public)/kudos/_shared/build-kudos-copy.ts",
  ]
---

# Phase 13 — Lắp form, launcher, pill và thread props (merge point duy nhất)

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2 (modal `520:11647`)
- Pill nguồn: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (`mm:2940:13449`)
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- **`tests/e2e/kudos-compose.spec.ts`** — hợp đồng đầy đủ C01–C27; phase này là chỗ mọi dòng phải xanh được
- `src/app/(public)/kudos/_components/kudos-compose-pill.tsx:8-17` — `<input readOnly>` cố tình không handler; comment `:12-14` nói rõ lý do → **phải cập nhật cả comment đó**
- `page.tsx:63-66` đã có `viewerId` (`currentUser?.id ?? null`) — nguồn cho `isSignedIn`, không cần đọc auth lần nữa
- `kudos-client.tsx:29-46` (`KudosClientProps`) · `kudos-screen.tsx:29-63` (`KudosScreenProps`) · `_shared/build-kudos-copy.ts:26-45` (`KudosPageCopy`)
- `phase-03` copy · `phase-05` `searchSunners` · `phase-06` `createKudo` · `phase-07` 3 hook · `phase-08..12` component · `phase-14` renderer + DAL shape
- plan.md AD-1, AD-7 · FR-101, FR-102, FR-401, BR-006 · TC ID-0, ID-1, ID-2, ID-46, ID-47

## Overview

**Priority**: P1 · **Goal**: nối 12 phase trước thành một dialog chạy thật — pill mở dialog (hoặc đi `/login`), form lắp đủ 8 vùng, gửi thành công thì `revalidatePath` đã chạy ở action và dialog đóng.

## Architecture notes

```text
page.tsx (RSC)  ──copy(composeModal) + isSignedIn + hashtagVocabulary + 2 action──▶ KudosClient
KudosClient ("use client") ──prop `compose`── ▶ KudosScreen ──▶ KudosKeyvisualBand
   KudosKeyvisualBand = KudosBanner + KudosComposeLauncher + KudosHeroSearchPill
   KudosComposeLauncher = use-kudos-compose-dialog + use-kudos-compose-form + use-sunner-suggest
        → KudosComposePill (trigger) + KudosComposeDialog(footer=KudosComposeFooter){ KudosComposeForm }
```

- **`kudos-screen.tsx` đang 197/200 dòng và `kudos-client.tsx` 187/200** (AD-7). Rút khối `<div className="relative w-full">` (banner + 2 pill) ra `kudos-keyvisual-band.tsx`, kèm nguyên comment giải thích overlay; `kudos-screen` giảm ~20 dòng rồi nhận thêm **một** prop object `compose` — không thêm 6 prop rời. Thứ tự DOM banner → pill → highlight **không đổi** (C10 của F007).
- `kudos-compose-pill.tsx`: **giữ nguyên `<input readOnly>`** — `kudos.spec.ts:101-120` (C03) assert đúng `[data-testid=kudos-compose-pill] input` có `placeholder` nguyên văn **và** `readonly`; đổi nó thành `<button>` là làm đỏ hợp đồng F007, còn nhét `<input>` vào trong `<button>`/`<a>` là HTML không hợp lệ (interactive lồng interactive). Cách đúng: thêm **một** prop `onActivate` + `dialogOpen`, gắn `onClick`/`onKeyDown` (Enter/Space) **lên chính input readonly** kèm `aria-haspopup="dialog"` và `aria-expanded={dialogOpen}` — đúng pattern `notification-bell.tsx:70-71`, và cũng là pattern quen thuộc của ô readonly mở picker. Input readonly vẫn focus được nên bàn phím dùng được bình thường. Pill **không** tự quyết đi đâu: `kudos-compose-launcher` gọi `openDialog()` khi đã đăng nhập và `router.push(ROUTES.LOGIN)` khi chưa (`useRouter` sống ở launcher, không ở pill — pill vẫn thuần trình bày).
- `kudos-compose-form.tsx`: lắp 8 vùng theo thứ tự C04 trong một `<form>`; nếu vượt 180 dòng thì tách phần thân xuống `kudos-compose-body.tsx` (đã cấp sẵn quyền trong `file_ownership` để không phải xin thêm giữa đường).
- `build-kudos-copy.ts`: thêm `composeModal: KudosComposeCopy` vào `KudosPageCopy`, map từ `tKudos("composeModal.*")`. Không đổi field nào đang có.
- `hashtagVocabulary` lấy từ `board.filters.hashtags` đã có sẵn trên `KudosClientProps` — **không** query thêm.

## Implementation Steps

1. Đọc trọn `tests/e2e/kudos-compose.spec.ts` trước khi sửa dòng nào.
2. `build-kudos-copy.ts`: thêm leaf `composeModal`.
3. `kudos-compose-form.tsx` (+ `kudos-compose-body.tsx` nếu cần): lắp 8 vùng, nhận toàn bộ giá trị/handler từ props.
4. `kudos-compose-launcher.tsx` (`"use client"`): gọi 3 hook, **destructure ngay tại call site** (React Compiler), nối `onOpen` cho pill, `onCancel`/`Hủy` cho dialog, `submit` cho footer; `ok:true` → `reset()` + `closeDialog()`.
5. `kudos-compose-pill.tsx`: giữ `<input readOnly>`, thêm `onActivate`/`dialogOpen` + `aria-haspopup`/`aria-expanded`; cập nhật doc-comment `:12-14` (đang nói "dialog … does not exist in this repo yet") cho khớp sự thật mới, **không** đổi testid/placeholder/icon.
6. `kudos-keyvisual-band.tsx`: rút khối overlay ra; `kudos-screen.tsx` render band + nhận prop `compose`.
7. `kudos-client.tsx`: dựng object `compose` (copy, `isSignedIn`, vocabulary, 2 action) và truyền xuống.
8. `page.tsx`: truyền `composeModal` copy + `searchSunners`/`createKudo` xuống `KudosClient`.
9. `pnpm build` → `pnpm typecheck` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm test:unit:coverage` → `pnpm build-storybook`.
10. Chạy thử tay một lần: `pnpm dev`, đăng nhập, gửi 1 kudo có 1 ảnh + 1 hashtag, xác nhận thẻ mới hiện trên feed **không cần F5** (FR-401).

## Todo List

- [ ] Đọc hợp đồng C01–C27 trước
- [ ] `kudos-keyvisual-band.tsx` rút ra trước khi thêm prop (giữ trần 200 dòng)
- [ ] `kudos-screen` nhận **một** prop object `compose`, không 6 prop rời
- [ ] Pill **vẫn là `<input readOnly>`** (C03 của F007) + `aria-haspopup="dialog"`; quyết định mở-dialog-hay-`/login` nằm ở launcher
- [ ] Hook destructure tại call site, không giữ object
- [ ] `hashtagVocabulary` lấy từ `board.filters.hashtags`, không query thêm
- [ ] Thứ tự DOM banner → pill → highlight không đổi
- [ ] 6 lệnh gate xanh + thử tay bước 10

## Success Criteria

- `pnpm build` + `pnpm typecheck` + `pnpm lint --max-warnings 0` + `pnpm test:unit:coverage` + `pnpm build-storybook` xanh.
- `wc -l` **mọi** file trong `file_ownership` ≤200 — đặc biệt `kudos-screen.tsx` và `kudos-client.tsx`.
- `pnpm exec playwright test tests/e2e/kudos.spec.ts` (hợp đồng F007) xanh **nguyên vẹn** — không sửa một dòng nào của file đó, kể cả C03 và C10.
- Gửi thử tay thành công: thẻ mới hiện ngay trên feed, hàng `kudos` có `hashtags[0]` = Danh hiệu, `image_urls` trỏ bucket `kudo-images`.
- `grep -rn "useTranslations" "src/app/(public)/kudos/_components/"` rỗng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| `kudos-screen.tsx`/`kudos-client.tsx` vượt 200 dòng | **Cao** | TB — vi phạm luật repo, review trả về | AD-7: rút band ra **trước**, một prop object; `wc -l` ở Success Criteria |
| Đổi pill thành `<button>`/`<Link>` → C03 của `kudos.spec.ts` đỏ, hoặc HTML lồng interactive | **Cao** | Cao — hồi quy F007 | Giữ `<input readOnly>` + `onActivate` + `aria-haspopup`; Success Criteria đòi `kudos.spec.ts` xanh nguyên vẹn |
| Giữ object hook (`form.draft`) tại call site | Cao | Cao — hàng loạt lỗi `react-hooks/refs`, lint đỏ | Bước 4 + skill `separate-hook-logic-from-components` |
| Nhồi 8 vùng vào một file 250 dòng | Cao | TB | `kudos-compose-body.tsx` đã cấp sẵn quyền |
| Query thêm vocabulary/hạng mục người nhận ở `page.tsx` | TB | TB — thêm round-trip cho dữ liệu đã có | Dùng `board.filters.hashtags` |
| Quên `revalidatePath` (đặt ở client thay vì action) | TB | Cao — FR-401 không thoả, phải F5 | Nó thuộc phase 06; bước 10 thử tay là cửa kiểm |

## Security Considerations

Hai lớp gate phải **cùng** tồn tại: pill trỏ `/login` khi chưa đăng nhập (chỉ là UX, permissions.md § "kiểm tra lớp 1") và Server Action tự `auth.getUser()` (lớp thật). Đừng bỏ lớp nào vì "lớp kia đã chặn". Và không thêm `/kudos` vào matcher `src/proxy.ts` — làm vậy sẽ chặn nhầm cả lượt xem của khách, phá quyết định PUBLIC của F007/F008.

## Next Steps

Mở khoá phase 15 (temper). Sau khi phase 15 xanh, plan đóng; promote spec/system docs là bước riêng.
