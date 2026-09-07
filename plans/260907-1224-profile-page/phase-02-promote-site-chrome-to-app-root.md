---
phase: 02
feature: F006
track: B
status: completed
priority: P1
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/app/_components/**",
    "src/app/_shared/site-chrome.ts",
    "src/app/_utils/get-viewer.ts",
    "src/app/_utils/get-viewer.test.ts",
    "src/app/_hooks/use-select-locale.ts",
    "src/app/_hooks/use-select-locale.test.ts",
    "src/app/(public)/_components/**",
    "src/app/(public)/_shared/**",
    "src/app/(public)/_utils/**",
    "src/app/(public)/_hooks/**",
    "src/app/(public)/(home)/_components/home-client.tsx",
    "src/app/(public)/(home)/_components/home-screen.tsx",
    "src/app/(public)/(home)/_shared/home-copy.ts",
    "src/app/(public)/(home)/page.tsx",
    "src/app/(public)/awards/_components/awards-client.tsx",
    "src/app/(public)/awards/_components/awards-screen.tsx",
    "src/app/(public)/awards/_shared/awards-copy.ts",
    "src/app/(public)/awards/page.tsx",
    "src/app/(public)/standards/_components/standards-footer-actions.tsx",
    "vitest.config.ts",
  ]
---

# Phase 02 — Prereq: promote site chrome lên `src/app/_*`

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 4.1 — "`SiteHeader`/`SiteFooter` — XÁC NHẬN tái dùng nguyên vẹn"
- `plans/260907-0935-standards-rules-page/phase-02-route-i18n-assets-foundation.md` — tiền lệ promote `IconPencil`
- `src/app/(public)/_shared/site-chrome.ts` — chính comment của file đã ghi tiền lệ: "Promoted out of `(home)/_shared/home-copy.ts` … a route segment must never import another segment's `_shared` types"
- `vitest.config.ts:97-122` — allowlist coverage
- `tests/e2e/{home,awards,standards,login}.spec.ts` — lưới an toàn của phase này

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Di chuyển cụm chrome dùng chung từ `src/app/(public)/_{components,shared,utils,hooks}/` lên `src/app/_{components,shared,utils,hooks}/` — **thuần move + rewrite import, không đổi một hành vi nào** — để `(protected)/profile` import được mà không phạm luật import ngang.

## Out of scope

- **Không** đổi markup, className, prop, hay logic của bất kỳ component nào. Diff phải đọc được như `git mv` + sửa đường dẫn import.
- **Không** đụng `(public)/(home)/_components/**`, `(public)/awards/_components/**`, `(public)/login/**` ngoài đúng những dòng `import` trỏ tới đường dẫn cũ.
- **Không** tạo file mới của `/profile`.
- **Không** promote `keyvisual-background.tsx`/`kudos-section.tsx` nếu `/profile` không dùng — xem bước 1.

## Key Insights

- **Vì sao bắt buộc, không phải dọn dẹp cho đẹp.** `SiteHeader`, `SiteFooter`, `AccountMenu`, `NotificationBell`, `NavLink`, `LogoLink`, `LanguageSelector`, `icons/`, `SiteChromeCopy`, `SiteViewer`, `getViewer`, `useSelectLocale` đều nằm trong `(public)/_*`. `/profile` nằm ở `(protected)/`. Từ `(protected)/profile` nhìn sang `(public)/_components` là **cousin**, không phải ancestor → đúng thứ F005 gọi là "import ngang … là lỗi review". Tổ tiên chung của 2 route group là `src/app/` → đích promote là `src/app/_*`.
- **Private folder không ảnh hưởng routing.** `_components` chỉ có nghĩa "không phải route segment". Đặt ở `src/app/_components/` vẫn hợp lệ và vẫn nằm ngoài router — đúng cơ chế `src/app/_actions/` đang dùng.
- **Bẫy im lặng: coverage allowlist.** `vitest.config.ts` include `src/app/**/_utils/**/*.ts` và `src/app/**/_hooks/**/*.ts`. Sau move, đường dẫn là `src/app/_utils/get-viewer.ts` — `**/` phải match **0 segment** thì glob mới còn ăn. Nếu không ăn, file rơi khỏi mẫu số và gate 100% **vẫn xanh** trong khi độ phủ thật đã giảm — hỏng kiểu không ai thấy. Bước 6 kiểm bằng số thật, không bằng niềm tin.
- **`use-select-locale` là hook client**, `get-viewer` là `server-only`. Đừng gộp chúng vào cùng một thư mục — giữ đúng `_hooks/` và `_utils/` như hiện tại, chỉ đổi độ sâu.
- **Lưới an toàn đã có sẵn.** `/`, `/awards`, `/standards`, `/login` đều có e2e. Phase này xanh nghĩa là 4 spec đó vẫn xanh nguyên. Đây là phase rủi ro cao nhất của cả plan — chạy đủ lưới trước khi đóng.
- **Storybook cũng import các file này.** `.stories.tsx` đi kèm phải move cùng file component, không tách.
- **`standards-footer-actions.tsx`** import `IconPencil` từ `(public)/_components/icons/` → nằm trong danh sách rewrite. Đây là consumer duy nhất của `icons/` ngoài chrome; đừng bỏ sót nó rồi để build đỏ.

## Requirements

- Sau phase này, `import ... from "@/app/(public)/_components/..."` **không còn tồn tại** ở bất kỳ đâu trong `src/`.
- `grep -rn "(public)/_components\|(public)/_shared\|(public)/_utils\|(public)/_hooks" src/` trả **rỗng**.
- `src/app/(public)/_components/`, `_shared/`, `_utils/`, `_hooks/` **không còn tồn tại**.
- Mọi `.stories.tsx` đi cùng component đã move; `pnpm build-storybook` xanh.
- Coverage mẫu số **không giảm**: `get-viewer.ts` và `use-select-locale.ts` vẫn xuất hiện trong báo cáo coverage.
- 4 spec e2e hiện có (`home`, `awards`, `standards`, `login`) xanh y như trước phase.

## Architecture

```text
TRƯỚC                                          SAU
src/app/(public)/_components/**            →   src/app/_components/**
  site-header.tsx, site-footer.tsx,              (nguyên tên, nguyên nội dung)
  account-menu.tsx(+stories), nav-link,
  logo-link, notification-bell,
  keyvisual-background, kudos-section,
  icons/**, language-selector/**
src/app/(public)/_shared/site-chrome.ts    →   src/app/_shared/site-chrome.ts
src/app/(public)/_shared/award-name-graphics.ts →  ở lại? xem bước 1
src/app/(public)/_utils/get-viewer.ts(+test) →  src/app/_utils/get-viewer.ts(+test)
src/app/(public)/_hooks/use-select-locale.ts(+test) → src/app/_hooks/use-select-locale.ts(+test)

Import mới, từ mọi consumer (kể cả (protected)/profile):
  import { SiteHeader } from "@/app/_components/site-header";
  import type { SiteChromeCopy } from "@/app/_shared/site-chrome";
```

## Related Code Files

**Create** (đích của move — nội dung không đổi so với nguồn)
- `src/app/_components/**` (13 component + stories, gồm `icons/` và `language-selector/`)
- `src/app/_shared/site-chrome.ts`
- `src/app/_utils/get-viewer.ts` (+ `.test.ts`)
- `src/app/_hooks/use-select-locale.ts` (+ `.test.ts`)

**Modify** (chỉ dòng `import`)
- `src/app/(public)/(home)/{page.tsx,_components/home-client.tsx,_components/home-screen.tsx,_shared/home-copy.ts}`
- `src/app/(public)/awards/{page.tsx,_components/awards-client.tsx,_components/awards-screen.tsx,_shared/awards-copy.ts}`
- `src/app/(public)/standards/_components/standards-footer-actions.tsx`
- `vitest.config.ts` *(chỉ nếu bước 6 chứng minh glob hụt — thêm `src/app/_utils/**/*.ts`, `src/app/_hooks/**/*.ts` tường minh)*

**Delete**: `src/app/(public)/_components/`, `_shared/site-chrome.ts`, `_utils/`, `_hooks/` (nguồn)
**Chỉ đọc**: 4 file e2e spec làm lưới an toàn

## Implementation Steps

1. Liệt kê chính xác consumer: `grep -rln "_components/site-header\|_components/site-footer\|_shared/site-chrome\|_utils/get-viewer\|_hooks/use-select-locale\|_components/icons\|_components/language-selector\|_components/keyvisual-background\|_components/kudos-section\|_components/nav-link\|_components/logo-link\|_components/account-menu\|_components/notification-bell" src/`. Quyết định `award-name-graphics.ts`: chỉ `/awards` dùng → **để nguyên tại `(public)/_shared/`**, không promote (YAGNI).
2. `git mv` từng thư mục/file sang đích. Giữ nguyên tên file, nguyên nội dung.
3. Sửa import **nội bộ** trong các file vừa move (chúng import lẫn nhau bằng đường dẫn tương đối `../_shared/site-chrome` → độ sâu đã đổi).
4. Sửa import ở 9 file consumer. Ưu tiên dạng alias `@/app/_components/...` thay vì tương đối nhiều `../` — dễ đọc và không lệ thuộc độ sâu.
5. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.
6. **Kiểm coverage mẫu số bằng số thật**: `pnpm test:unit:coverage`, rồi xác nhận `get-viewer.ts` và `use-select-locale.ts` **có mặt** trong bảng coverage. Vắng mặt → glob đã hụt → thêm 2 dòng tường minh vào `vitest.config.ts` include và chạy lại.
7. Lưới an toàn: `lsof -ti:3000 | xargs -r kill -9`, `supabase start`, rồi `pnpm test:e2e tests/e2e/{home,awards,standards,login}.spec.ts --reporter=list`. Phải xanh đúng như trước phase.
8. `grep -rn "(public)/_components\|(public)/_shared/site-chrome\|(public)/_utils\|(public)/_hooks" src/` → phải rỗng.

## Todo List

- [ ] Liệt kê consumer thật bằng grep, chốt `award-name-graphics.ts` ở lại
- [ ] `git mv` cụm `_components/**` (kèm `icons/`, `language-selector/`, mọi `.stories.tsx`)
- [ ] `git mv` `site-chrome.ts`, `get-viewer.ts(+test)`, `use-select-locale.ts(+test)`
- [ ] Sửa import nội bộ giữa các file vừa move
- [ ] Sửa import ở 9 file consumer, dùng alias `@/app/_*`
- [ ] Gate: lint · format · build · typecheck · storybook
- [ ] **Kiểm mẫu số coverage bằng số thật**, sửa `vitest.config.ts` nếu hụt
- [ ] e2e `home` + `awards` + `standards` + `login` xanh
- [ ] `grep "(public)/_"` rỗng

## Success Criteria

- ✅ `pnpm build`, `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build-storybook` xanh.
- ✅ `pnpm test:unit:coverage` xanh, `get-viewer.ts` + `use-select-locale.ts` có mặt trong bảng coverage.
- ✅ 4 spec e2e (`home`, `awards`, `standards`, `login`) xanh, 81 test pass, 3 skip.
- ✅ `git diff --stat` 31 file promoted, diff là đường dẫn import chỉ.
- ✅ `grep -rn "(public)/_components\|(public)/_shared/site-chrome\|(public)/_utils\|(public)/_hooks" src/` rỗng.

**Note (Gain a 10th consumer)**: Plan liệt kê 9 consumer. Thực tế `src/app/(public)/login/_components/login-header.tsx` cũng import chrome-related, granted exception. `award-name-graphics.ts` còn lại ở `(public)/_shared/` (YAGNI — `/awards` dùng duy nhất).

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Coverage allowlist hụt sau move → gate 100% xanh giả | Trung bình | **Cao** — mất phủ mà không ai thấy | Bước 6 kiểm bằng bảng coverage thật, không suy đoán glob; sửa `vitest.config.ts` nếu cần |
| Sót 1 import → build đỏ giữa lúc phase 03/04 đang chạy song song | **Cao** | Trung bình | Bước 8 grep + `pnpm build` là điều kiện đóng phase |
| Vô tình "tiện tay" sửa markup/className khi move | Trung bình | Cao — 4 trang đang chạy có thể lệch, e2e phát hiện muộn | Success Criteria đòi diff 0 dòng logic; review `git diff -M` |
| `.stories.tsx` bị bỏ lại → `build-storybook` đỏ | Trung bình | Thấp–Trung bình | Move theo cặp file+story; gate storybook ở bước 5 |
| Đường dẫn tương đối nội bộ sai độ sâu sau move | **Cao** | Trung bình | Bước 3 tách riêng; `pnpm typecheck` bắt hết |
| Promote luôn `award-name-graphics.ts` "cho đồng bộ" | Thấp | Thấp | YAGNI — chỉ `/awards` dùng, để nguyên; chốt ở bước 1 |
| Move rộng tay sang `(home)/_components/**` | Thấp | Cao — vượt ownership, đụng phase khác | Out of scope ghi rõ; ownership list là hợp đồng |

## Security Considerations

- Không đổi hành vi auth: `getViewer()` giữ nguyên fail-open `null`, `(protected)/layout.tsx` **không bị chạm**.
- `get-viewer.ts` giữ nguyên `import "server-only"` — mất dòng này là kéo `createClient` sang bundle client. Kiểm bằng grep sau khi move.
- Không file nào trong phase này đọc `?id=` hay bất kỳ input người dùng nào — đây là phase cơ học.

## Next Steps

Mở khoá phase 05 (Track A cần `@/app/_components/site-header`) và phase 07. Chạy song song được với phase 03 và 04.
