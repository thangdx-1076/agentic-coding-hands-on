---
phase: 02
feature: F004, F003
track: B
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 2h
owner: implementer
file_ownership:
  [
    "src/app/(public)/_components/**",
    "src/app/(public)/_shared/**",
    "src/app/(public)/_utils/get-viewer.ts",
    "src/app/(public)/_utils/get-viewer.test.ts",
    "src/app/(public)/(home)/**",
  ]
---

# Phase 02 — Promote chrome dùng chung lên `(public)/_components/`

## Context Links

- `.claude/skills/nextjs-route-colocation-architecture/SKILL.md:30` (scope ladder), `:104` (reviewer fail-list)
- `plans/reports/researcher-260906-2258-repo-conventions.md` § 1, § 4
- `spec/F004_AwardSystemPage/technical-spec.md` § 4.1 (bảng component + lý do promote)
- Tiền lệ có sẵn: `src/app/(public)/_components/language-selector/` (đã leo vì `(home)` + `login` cùng dùng)

## Overview

**Priority**: P1 · **Status**: pending · **Track B (prereq refactor)**
`/awards` dùng lại `Header`, `HomeFooter`, `KudosSection`, `KeyvisualBackground` đang nằm trong `(home)/_components/`. Theo scope ladder, file có consumer ngoài segment hiện tại phải leo đúng 1 nấc → `(public)/_components/`. Phase này **thuần di chuyển + đổi import + tách kiểu copy**, KHÔNG đổi một dòng DOM nào.

**Vì sao Track B chứ không phải Track A**: không có mapping Figma mới nào ở đây. Đây là refactor cơ học đụng vào toàn bộ `(home)`, và nó phải xong TRƯỚC khi `momorph-ui-implementer` bắt đầu — nếu để Track A tự làm, hai track sẽ tranh cùng file `(home)/_components/*`.

## Key Insights

- **Không thể promote 4 component một mình.** Dependency bắc cầu phải leo cùng, nếu không `(public)/_components/site-header.tsx` sẽ import ngang vào `(home)/_components/logo-link` — đúng mục đầu tiên trong reviewer fail-list. Closure thật (đọc từ import graph):
  - `header.tsx` → `logo-link`, `nav-link`, `account-menu`, `notification-bell`, `icons/icon-user`
  - `account-menu.tsx` → `icons/icon-user` · `notification-bell.tsx` → `icons/icon-bell`
  - `home-footer.tsx` → `logo-link` · `kudos-section.tsx` → `icons/icon-up-right`
  - `keyvisual-background.tsx` → không có dep
- **Ở lại `(home)`** (chỉ đổi 1 dòng import): `cta-buttons.tsx:3` và `award-card.tsx:5` đang dùng `./icons/icon-up-right` → đổi sang path đã promote. `widget-button` + `icon-pencil` KHÔNG leo (chỉ `(home)` dùng).
- **Vướng kiểu `HomeCopy`**: `header.tsx:3`, `home-footer.tsx:4`, `kudos-section.tsx:3` đều nhận `copy: HomeCopy` từ `../_shared/home-copy`. Component đã leo không được import ngược xuống `_shared` của segment con. Lời giải: tách phần chrome ra `(public)/_shared/site-chrome.ts` (`SiteChromeCopy` = `{ nav, header, footer, kudos, account, notifications }` + `defaultSiteChromeCopy` + `SiteViewer`), rồi `HomeCopy = SiteChromeCopy & { hero, event, cta, rootFurther, awards, widget }`. **Call site không phải sửa**: `HomeCopy` structurally thoả `SiteChromeCopy` nên `copy={copy}` vẫn typecheck.
- `HeaderViewer` (`header.tsx:14`) đổi tên thành `SiteViewer` và về `_shared/site-chrome.ts` — không để `_utils/get-viewer.ts` phải import kiểu từ `_components` (sai chiều trong-segment).
- **`getViewer` bị nhân bản nếu không tách**: `(home)/page.tsx:154-167` có đúng logic `/awards` cần. Hoist thành `(public)/_utils/get-viewer.ts`. Cảnh báo: `src/app/**/_utils/**/*.ts` NẰM TRONG allowlist coverage → file này bắt buộc có `get-viewer.test.ts` đạt 100% (3 nhánh: không user → `null`; có user → `{email, isAdmin}`; ném lỗi → `null`).
- `.storybook/main.ts:17` quét `../src/**/*.stories.@(ts|tsx)` — story di chuyển cùng component là đủ, không phải đăng ký gì thêm.
- `home-screen.stories.tsx` KHÔNG import header/footer/kudos trực tiếp (chỉ `home-screen` + `countdown-tiles` + `home-copy`) → nó không vỡ. 7 story vỡ là 7 story đi kèm chính các component được promote; chúng di chuyển nguyên vẹn, chỉ đổi `title` nếu title cũ ghi "Home/...".

## Requirements

- Không đổi DOM, className, thứ tự element, hay text nào — `tests/e2e/home.spec.ts` (5 assertion về `/awards`, và toàn bộ phần còn lại) phải xanh y nguyên.
- Không đổi props signature công khai của các component được promote (ngoài việc nới kiểu `copy` từ `HomeCopy` → `SiteChromeCopy`).
- Mọi file ≤200 dòng; kebab-case; named export.
- Import direction: `(public)/_components/*` chỉ được import `(public)/_shared`, `(public)/_components/*` khác, và `@/<layer>`. Tuyệt đối không `../(home)/...`.

## Architecture

```text
TRƯỚC                                     SAU
(home)/_components/header.tsx        →    (public)/_components/site-header.tsx
(home)/_components/home-footer.tsx   →    (public)/_components/site-footer.tsx
(home)/_components/kudos-section.tsx →    (public)/_components/kudos-section.tsx
(home)/_components/keyvisual-...tsx  →    (public)/_components/keyvisual-background.tsx
(home)/_components/{logo-link,nav-link,account-menu,notification-bell}.tsx
                                     →    (public)/_components/<same>.tsx
(home)/_components/icons/{icon-user,icon-bell,icon-up-right}.tsx
                                     →    (public)/_components/icons/<same>.tsx
(home)/_shared/home-copy.ts (chrome phần) →  (public)/_shared/site-chrome.ts
(home)/_components/award-card.tsx AWARD_NAME_GRAPHIC:18-36
                                     →    (public)/_shared/award-name-graphics.ts
(home)/page.tsx getViewer():154-167  →    (public)/_utils/get-viewer.ts (+ test)

home-copy.ts:  export type HomeCopy = SiteChromeCopy & { hero; event; cta; rootFurther; awards; widget }
               export const defaultHomeCopy = { ...defaultSiteChromeCopy, hero: ..., ... }
```

## Related Code Files

**Create**
- `src/app/(public)/_shared/site-chrome.ts` — `SiteChromeCopy`, `defaultSiteChromeCopy`, `SiteViewer`
- `src/app/(public)/_shared/award-name-graphics.ts` — `AWARD_NAME_GRAPHIC` (6 entry, w/h nội tại thật)
- `src/app/(public)/_utils/get-viewer.ts` + `get-viewer.test.ts`
- `src/app/(public)/_components/{site-header,site-footer,kudos-section,keyvisual-background,logo-link,nav-link,account-menu,notification-bell}.tsx`
- `src/app/(public)/_components/icons/{icon-user,icon-bell,icon-up-right}.tsx`
- 7 `.stories.tsx` đi kèm (logo-link, nav-link, account-menu, notification-bell, icon-user, icon-bell, icon-up-right)

**Modify**
- `src/app/(public)/(home)/_shared/home-copy.ts` — compose từ `SiteChromeCopy`
- `src/app/(public)/(home)/_components/home-screen.tsx:5-13` — 4 import đổi sang `../../_components/*`
- `src/app/(public)/(home)/_components/home-client.tsx:7` — `HeaderViewer` → `SiteViewer` từ `_shared/site-chrome`
- `src/app/(public)/(home)/page.tsx:9,154-167` — bỏ `getViewer` cục bộ, import từ `../_utils/get-viewer`
- `src/app/(public)/(home)/_components/award-card.tsx:5,18-36` — icon import + dùng `AWARD_NAME_GRAPHIC` đã hoist
- `src/app/(public)/(home)/_components/cta-buttons.tsx:3` — icon import

**Delete**: 11 file `.tsx` + 7 `.stories.tsx` gốc trong `(home)/_components/` (đã di chuyển, KHÔNG để lại bản sao)

## Implementation Steps

1. Tạo `_shared/site-chrome.ts`: cắt `nav/header/footer/kudos/account/notifications` khỏi `HomeCopy` (bao gồm cả giá trị mặc định tương ứng trong `defaultHomeCopy`), thêm `SiteViewer`.
2. Sửa `home-copy.ts` thành `SiteChromeCopy & {...}` + `{ ...defaultSiteChromeCopy, ... }`. Chạy `pnpm typecheck` — phải sạch trước khi đi tiếp.
3. `git mv` 11 component + 7 story lên `(public)/_components/` (icons vào `_components/icons/`). Đổi tên `header.tsx`→`site-header.tsx` (`Header`→`SiteHeader`), `home-footer.tsx`→`site-footer.tsx` (`HomeFooter`→`SiteFooter`).
4. Sửa import bên trong nhóm đã promote sang relative cùng cấp; đổi `copy: HomeCopy` → `copy: SiteChromeCopy`; `HeaderViewer` → `SiteViewer` (re-export không cần).
5. Hoist `AWARD_NAME_GRAPHIC` sang `_shared/award-name-graphics.ts`; `award-card.tsx` import lại, hành vi không đổi.
6. Hoist `getViewer` sang `_utils/get-viewer.ts`; viết `get-viewer.test.ts` phủ 3 nhánh (stub `getCurrentUser`/`getUserRole` qua `vi.mock`, mirror `src/dal/users.test.ts`).
7. Sửa 4 file `(home)` còn lại theo bảng Modify. Sửa `title` của 7 story sang namespace chung (vd `Chrome/LogoLink`).
8. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm test:unit:coverage` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.
9. `pnpm exec playwright test tests/e2e/home.spec.ts` — phải xanh y như trước phase.

## Todo List

- [x] `_shared/site-chrome.ts` + `home-copy.ts` compose lại, typecheck sạch
- [x] Di chuyển 11 component + 7 story, đổi tên `SiteHeader`/`SiteFooter`
- [x] Sửa import trong nhóm promote (không còn path `(home)`)
- [x] Hoist `AWARD_NAME_GRAPHIC`, sửa `award-card.tsx` + `cta-buttons.tsx`
- [x] Hoist `getViewer` + `get-viewer.test.ts` 100%
- [x] Sửa `home-screen.tsx`, `home-client.tsx`, `(home)/page.tsx`
- [x] Toàn bộ gate quality xanh + `home.spec.ts` xanh

## Success Criteria

- `grep -rn "(home)/_components" src` không còn kết quả nào từ ngoài `(home)`.
- `grep -rn "\.\./(home)" "src/app/(public)/_components"` rỗng.
- `pnpm test:unit:coverage` giữ 100% (file mới `get-viewer.ts` có test).
- `tests/e2e/home.spec.ts` xanh, số test không đổi.
- `pnpm build-storybook` xanh; 7 story đã di chuyển vẫn render.
- Diff không chứa thay đổi className/JSX nào ngoài dòng import (kiểm bằng `git diff --stat` + đọc mắt).

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Lỡ tay "cải tiến" JSX khi di chuyển → `/` lệch pixel | Trung bình | Cao — vỡ F003 đã nghiệm thu | `git mv` trước, sửa import sau; review diff yêu cầu chỉ có dòng `import`/tên export |
| Bỏ sót một dep bắc cầu → import ngang lọt lưới | Trung bình | Trung bình — reviewer trả về | Bước verify bằng `grep` ở Success Criteria, chạy trước khi đóng phase |
| `SiteChromeCopy` cắt thiếu leaf → `defaultHomeCopy` mất trường | Trung bình | Cao — `/` render undefined | `pnpm typecheck` ngay sau bước 2, trước khi chạm component |
| `get-viewer.ts` rơi vào allowlist mà quên test → CI đỏ ngay | Cao | Trung bình | Ghi rõ trong Key Insights; bước 6 viết test cùng lúc |
| Phase 05 (Track A) khởi động sớm, tranh file `(home)` | Trung bình | Cao — mất việc | `plan.md` khai 05 depends on 02; không spawn Track A trước khi 02 đóng |

## Security Considerations

- `getViewer` giữ nguyên fail-open `null` — Supabase chết thì `/` và `/awards` vẫn render như khách vãng lai, không 500. **Không** biến nó thành authorization gate: đây chỉ là nhãn hiển thị (mirror `getUserRole`, `src/dal/users.ts:47-70`).
- Promote không nới quyền: `SiteHeader` vẫn chỉ nhận `viewer` đã tính sẵn từ Server Component, không tự gọi Supabase.

## Next Steps

Mở khoá phase 05 (Track A cần `SiteHeader`/`SiteFooter`/`KudosSection`/`KeyvisualBackground` tại path mới). Không chặn 01, 03, 04.
