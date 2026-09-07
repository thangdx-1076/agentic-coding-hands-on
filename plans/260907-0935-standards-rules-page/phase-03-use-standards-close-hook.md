---
phase: 03
feature: F005
track: B
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 0.5h
owner: implementer
note: "Mid-flight defect: history.length heuristic replaced with window.navigation?.canGoBack (Navigation API) to correctly distinguish in-app navigation from direct load"
file_ownership:
  [
    "src/app/(public)/standards/_hooks/use-standards-close.ts",
    "src/app/(public)/standards/_hooks/use-standards-close.test.ts",
  ]
---

# Phase 03 — Hook `useStandardsClose` + unit test

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (nút "Đóng" `3204:6093`)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F005_StandardsRulesPage/technical-spec.md` § 3.2 (pseudocode `handleClose`, BR-003)
- `spec/SCR005_Standards/spec.md` § 4 Branches, § 10 Exits
- `src/app/(public)/_hooks/use-select-locale.ts(+.test.ts)` — khuôn hook + test gần nhất (cũng dùng `useRouter`)
- `src/app/(public)/awards/_hooks/use-award-category-nav.test.ts` — khuôn test hook jsdom
- `vitest.config.ts:76-92` (project `jsdom` bắt `src/app/**/_hooks/**/*.test.ts`), `:97-122` (allowlist coverage)

## Overview

**Priority**: P2 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Tách logic nút "Đóng" ra `_hooks/use-standards-close.ts` — `router.back()` khi có lịch sử, `router.push(ROUTES.HOME)` khi không — kèm test phủ đủ 2 nhánh.

## Out of scope

- Không viết JSX, không đụng `_components/`, không đụng `page.tsx`.
- Không xử lý phím tắt `Escape` (design không có, TC không có → YAGNI).
- Không animation/transition khi rời trang.

## Key Insights

- **Vì sao là hook chứ không phải hàm trong component**: `separate-hook-logic-from-components` § "Boundary test" — dùng `useRouter()` (React state/context) → tầng hook, không phải component, không phải pure logic. Component chỉ nhận `onClose` và gắn vào `onClick`.
- **Coverage là gate cứng, không phải chỉ số.** Một `.ts` mới trong `src/app/**/_hooks/**` vào thẳng mẫu số coverage ở 0% → `pnpm test:unit:coverage` exit ≠ 0 ngay. Test phải land **cùng lượt** với hook, và phải phủ **cả 2 nhánh** (100% branches, không chỉ lines).
- **Destructure tại call site.** Trả về **một object có tên** (`{ handleClose }`) và component phải destructure ngay — giữ nguyên object rồi đọc `x.handleClose` sẽ ăn lỗi `react-hooks/refs` của React Compiler (`separate-hook-logic-from-components` § "What a hook returns"). Ghi rõ trong JSDoc của hook để phase 04 không làm sai.
- **`window.history.length > 1` là heuristic, không phải API đảm bảo** (technical-spec § 5.2). Chấp nhận vì clarifications yêu cầu đúng hành vi đó và App Router không có API nào tốt hơn. Guard `typeof window !== "undefined"` phải có: hook chạy trong file `"use client"` nhưng vẫn được prerender trên server ở lượt SSR đầu.
- **Test giả lập `history.length` thế nào**: jsdom cho `window.history.length === 1` mặc định và thuộc tính này read-only → dùng `vi.spyOn(window.history, "length", "get")` hoặc `Object.defineProperty(window.history, "length", { configurable: true, get: … })` và khôi phục trong `afterEach`. Mock `next/navigation`'s `useRouter` trả `{ back: vi.fn(), push: vi.fn() }` như `use-select-locale.test.ts` đang làm.
- **`ROUTES.HOME`, không hardcode `"/"`** — hằng đã có, và đó là cả lý do `src/constants/routes.ts` tồn tại.

## Requirements

- Export `useStandardsClose(): { handleClose: () => void }`.
- `handleClose()`:
  - `typeof window !== "undefined" && window.history.length > 1` → `router.back()`, **không** gọi `push`.
  - ngược lại → `router.push(ROUTES.HOME)`, **không** gọi `back`.
- `handleClose` bọc `useCallback` với deps `[router]` — identity ổn định, tránh gắn/tháo handler mỗi lần render.
- Test phủ: nhánh có history · nhánh không history · (nếu cần cho 100% branch) nhánh `window` undefined mô phỏng bằng cách tách guard ra biến kiểm được — **không** viết code chết chỉ để chiều coverage; nếu guard `typeof window` không thể phủ trong jsdom thì bỏ guard đó và dựa vào `"use client"` + `useCallback` (handler chỉ chạy khi có click, tức luôn có `window`). **Chọn phương án bỏ guard**: đơn giản hơn, không có nhánh không phủ được, và `handleClose` theo định nghĩa chỉ chạy từ sự kiện DOM.

## Architecture

```text
standards/_hooks/use-standards-close.ts   ("use client")
  useRouter()  →  handleClose = useCallback(() => {
                     window.history.length > 1 ? router.back() : router.push(ROUTES.HOME)
                  }, [router])
  return { handleClose }
        ▲
        └── standards-client.tsx (phase 05) destructure ngay tại call site
              → truyền xuống StandardsScreen qua prop onClose
```

## Related Code Files

**Create**: `src/app/(public)/standards/_hooks/use-standards-close.ts`, `src/app/(public)/standards/_hooks/use-standards-close.test.ts`
**Modify**: — · **Delete**: —
**Chỉ đọc**: `src/constants/routes.ts`, `src/app/(public)/_hooks/use-select-locale.test.ts`

## Implementation Steps

1. Viết `use-standards-close.test.ts` **trước** (RED ở tầng unit): mock `next/navigation`, 2 test cho 2 nhánh, assert cả "gọi cái này" lẫn "**không** gọi cái kia".
2. `pnpm test:unit` → đỏ vì module chưa tồn tại. Ghi lại.
3. Viết `use-standards-close.ts` tối thiểu đủ xanh; JSDoc nêu BR-003, nêu heuristic `history.length`, nêu yêu cầu destructure tại call site.
4. `pnpm test:unit:coverage` → xanh **và** 100% giữ nguyên (file mới phải đủ statements/branches/functions/lines).
5. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`.

## Todo List

- [ ] Test trước, đỏ trước
- [ ] Hook `{ handleClose }`, `useCallback([router])`, `ROUTES.HOME`
- [ ] JSDoc: BR-003 + heuristic + "destructure tại call site"
- [ ] 2 nhánh phủ, mỗi nhánh assert cả positive lẫn negative
- [ ] `pnpm test:unit:coverage` giữ 100%
- [ ] lint · format · build · typecheck

## Success Criteria

- `pnpm test:unit:coverage` exit 0 với `use-standards-close.ts` ở 100% cả 4 cột.
- Test thất bại thật nếu đảo điều kiện thành `< 1` (kiểm bằng cách sửa tạm rồi hoàn nguyên) — chứng minh test có răng.
- Hook không import gì từ `_components/`, không JSX, ≤ 60 dòng.
- Không file nào ngoài `file_ownership` bị chạm.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Quên test → CI đỏ ngay vì gate 100% | Trung bình | Cao | Bước 1 viết test trước; Success Criteria kiểm coverage |
| `window.history.length` read-only trong jsdom, mock trượt im lặng | **Cao** | Trung bình — test xanh giả | `Object.defineProperty(..., { configurable: true, get })` + `afterEach` khôi phục; assert cả nhánh negative |
| Nhồi thêm guard `typeof window` không phủ được → coverage < 100% | Trung bình | Trung bình | Đã chốt bỏ guard ở § Requirements, kèm lý do |
| Phase 04/05 giữ nguyên object thay vì destructure → lỗi `react-hooks/refs` | Trung bình | Trung bình — `pnpm lint` đỏ | Ghi vào JSDoc của chính hook, nơi người dùng nó sẽ đọc |
| Hardcode `"/"` thay `ROUTES.HOME` | Thấp | Thấp | Success Criteria + review |

## Security Considerations

- `router.push` chỉ nhận hằng nội bộ `ROUTES.HOME` — không có đường nào để giá trị do người dùng kiểm soát (query, cookie, referrer) chui vào đích điều hướng, nên không có open-redirect.
- `router.back()` trả về entry lịch sử của chính trình duyệt, không đọc/ghi state nào.
- Hook không chạm cookie, storage, hay Supabase.

## Next Steps

Chạy song song với phase 02. Cả hai xong → phase 04 (Track A) và sau đó phase 05 lắp `standards-client.tsx` tiêu thụ hook này.
