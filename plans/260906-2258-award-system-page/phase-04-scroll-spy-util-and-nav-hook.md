---
phase: 04
feature: F004
track: B
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/app/(public)/awards/_utils/scroll-spy.ts",
    "src/app/(public)/awards/_utils/scroll-spy.test.ts",
    "src/app/(public)/awards/_hooks/use-award-category-nav.ts",
    "src/app/(public)/awards/_hooks/use-award-category-nav.test.ts",
  ]
---

# Phase 04 — Pure scroll-spy + hook `useAwardCategoryNav`

## Context Links

- `clarifications.md` § "Nav trái hoạt động thế nào" (click-scroll + IntersectionObserver + reduced-motion)
- `spec/F004_AwardSystemPage/technical-spec.md` § 3.1 A2, BR-003, BR-004
- `.claude/skills/separate-hook-logic-from-components/SKILL.md` (3 tầng, ref callback, destructure tại call site)
- `tests/e2e/awards.spec.ts:201-247` (TC ID-9, ID-11 — hợp đồng hành vi thật)
- Khuôn mẫu hook có test: `src/app/(public)/(home)/_hooks/use-countdown.ts(+.test.ts)`, `src/app/(public)/_hooks/use-select-locale.ts`

## Overview

**Priority**: P1 · **Status**: pending · **Track B, RED-first**
Tách trước phần logic của nav trái để Track A (phase 05) chỉ việc render. Theo luật đã ghi ở memory dự án: Track A không chạm `_hooks/` — hook dùng chung/mới phải là phase riêng chạy trước.

## Key Insights

- **Tầng pure phải tồn tại**: `scroll-spy.ts` nhận `IntersectionObserverEntry[]` (hoặc shape tối giản `{ target: {id}, isIntersecting, intersectionRatio, boundingClientRect.top }[]`) + `activeSlug` hiện tại, trả slug mới. Không JSX, không React → test bằng object thường, không cần DOM.
- **Chọn shape đầu vào tối giản, không phải `IntersectionObserverEntry` thật** — jsdom không có `IntersectionObserver`; hàm pure nhận struct hẹp thì test viết bằng literal, còn hook mới là chỗ dịch entry thật sang struct đó.
- **`_utils/**/*.ts` và `_hooks/**/*.ts` đều nằm trong allowlist coverage 100%** (`vitest.config.ts:97-122`). Test hook chạy ở project `jsdom` (`src/app/**/_hooks/**/*.test.ts`), test util chạy ở project `node`. Đặt sai chỗ là file bị cả 2 project bỏ qua → coverage tụt → CI đỏ.
- **jsdom KHÔNG có `IntersectionObserver`** → test hook phải stub `globalThis.IntersectionObserver` bằng class giả lưu callback lại rồi bắn tay. Cũng phải stub `matchMedia` (jsdom không có) cho nhánh reduced-motion.
- **Click phải thắng observer (BR-003)**: TC ID-11 assert ngay sau click có **đúng 1** `aria-current="true"` và đúng là link vừa bấm. Nhưng smooth-scroll làm observer bắn liên tục trên đường đi và sẽ ghi đè active bằng các section trung gian. Lời giải: hook giữ một cờ `lockedUntil`/`isProgrammaticScroll` — click set active ngay + khoá observer, mở khoá khi `scrollend` (hoặc timeout dự phòng ~700ms cho trình duyệt chưa có `scrollend`).
- **`prefers-reduced-motion: reduce` (BR-004)** → `behavior: "auto"` thay `"smooth"`. Đọc qua `matchMedia` trong hook, không trong component.
- Hook trả **một object có tên, destructure ngay tại call site**; **không** lộ `RefObject` ra ngoài — chỉ trả ref callback (`registerSection(slug)`), theo skill.
- Hook không được tự `document.getElementById` cho phần scroll nếu đã có ref: giữ một `Map<slug, Element>` nội bộ do ref callback nạp.
- `aria-current="true"` (không phải `"page"`) — E2E assert đúng chuỗi `"true"`.

## Requirements

- **BR-003** — đúng 1 slug active tại một thời điểm; click ghi active tức thì, observer chỉ ghi đè khi người dùng tự cuộn.
- **BR-004** — reduced-motion → cuộn tức thời, active vẫn cập nhật đúng.
- API hook: `useAwardCategoryNav(slugs: string[])` → `{ activeSlug, registerSection, handleNavClick }`.
- `handleNavClick(slug, event)` phải `preventDefault()` để tự điều khiển cuộn, đồng thời vẫn cập nhật hash (`history.replaceState`) — link giữ `href="#slug"` thật cho E2E và cho khách tắt JS.
- Cleanup: `observer.disconnect()` + huỷ timer trong hàm dọn của `useEffect`.
- 100% coverage cả 2 file; file ≤200 dòng.

## Architecture

```text
component (phase 05, "use client")
   └─ const { activeSlug, registerSection, handleNavClick } = useAwardCategoryNav(slugs)
          │
          ├─ useState(activeSlug)  ← nguồn sự thật của aria-current
          ├─ useRef(Map<slug, Element>)  ← nạp bởi registerSection(slug)
          ├─ useRef(isProgrammaticScroll)
          └─ useEffect: new IntersectionObserver(cb, { rootMargin, threshold })
                 cb(entries) → nếu isProgrammaticScroll → bỏ qua
                              → ngược lại: pickActiveSlug(toSpyEntries(entries), activeSlug)  [pure]
click → preventDefault → setActive(slug) → khoá observer
      → el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
      → scrollend | timeout 700ms → mở khoá
```

## Related Code Files

**Create**
- `src/app/(public)/awards/_utils/scroll-spy.ts` — `type SpyEntry`, `pickActiveSlug(entries, current): string`
- `src/app/(public)/awards/_utils/scroll-spy.test.ts`
- `src/app/(public)/awards/_hooks/use-award-category-nav.ts`
- `src/app/(public)/awards/_hooks/use-award-category-nav.test.ts`

**Modify**: — · **Delete**: —

## Implementation Steps

1. Viết `scroll-spy.test.ts` trước: không entry nào intersecting → giữ `current`; một entry intersecting → slug đó; nhiều entry intersecting → chọn cái gần đỉnh viewport nhất (`boundingClientRect.top` nhỏ nhất trong nhóm >= 0, fallback ratio lớn nhất); entries rỗng → giữ `current`.
2. Viết `scroll-spy.ts` cho tới khi xanh. Không import React ở đây.
3. Viết `use-award-category-nav.test.ts` (project `jsdom`): stub `IntersectionObserver` + `matchMedia` + `Element.prototype.scrollIntoView`; case: khởi tạo active = slug đầu; observer bắn → đổi active; click → active đổi ngay và observer bị bỏ qua tới khi mở khoá; reduced-motion → `scrollIntoView` nhận `behavior: "auto"`; unmount → `disconnect()` được gọi.
4. Viết hook cho tới khi xanh; giữ mọi tính toán chọn slug ở tầng pure.
5. `pnpm test:unit:coverage` — 100% cho cả 2 file. `pnpm lint --max-warnings 0`, `pnpm typecheck`.

## Todo List

- [x] `scroll-spy.test.ts` đỏ trước (4+ case, không cần DOM)
- [x] `scroll-spy.ts` xanh, thuần hàm
- [x] `use-award-category-nav.test.ts` với stub IO + matchMedia + scrollIntoView
- [x] Hook xanh: click thắng observer, reduced-motion, cleanup
- [x] Coverage 100% cả 2 file, lint + typecheck sạch

## Success Criteria

- 100% coverage trên `scroll-spy.ts` và `use-award-category-nav.ts`.
- Test chứng minh: sau `handleNavClick("best-manager")` thì `activeSlug === "best-manager"` **và** một lần bắn observer trỏ `top-talent` ngay sau đó KHÔNG đổi được active.
- Test chứng minh `disconnect()` chạy khi unmount (không rò observer).
- Hook không export `RefObject` nào; chỉ `activeSlug`, `registerSection`, `handleNavClick`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Observer ghi đè active ngay sau click → TC ID-11 đỏ | **Cao** | Cao — E2E fail dù UI đúng | Cờ khoá + `scrollend`/timeout; có test unit riêng cho đúng tình huống này (bước 3) |
| `scrollend` chưa hỗ trợ ở Chromium bản Playwright dùng | Trung bình | Trung bình — khoá không bao giờ mở | Luôn kèm timeout dự phòng, không phụ thuộc riêng `scrollend` |
| jsdom thiếu `IntersectionObserver`/`matchMedia` → test crash | Cao | Thấp — lộ ngay lần chạy đầu | Stub trong `beforeEach`, khôi phục ở `afterEach` |
| Đặt test hook vào project `node` → không được chạy, coverage tụt | Trung bình | Trung bình | Đường dẫn `_hooks/**` tự rơi vào project `jsdom` (`vitest.config.ts:53-71`); không đổi tên thư mục |
| `threshold`/`rootMargin` sai với section cao → active nhảy loạn | Trung bình | Trung bình | Chốt `rootMargin: "-96px 0px -60% 0px"`, `threshold: 0`; tinh chỉnh ở phase 07 sau khi thấy layout thật |

## Security Considerations

Không có bề mặt bảo mật: hook thuần client, không fetch, không đọc/ghi storage, không nhận input người dùng ngoài slug do chính trang phát ra. `history.replaceState` chỉ ghi hash trong cùng origin.

## Next Steps

Mở khoá phase 05 (component `award-category-nav.tsx` import hook này). Không chặn 01, 02, 03.
