# Phase 05 — Test 2 hook dưới jsdom

## Context Links

- [`plan.md`](./plan.md) · [`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md) § Q1, Q2, Q5(c), Q5(d)
- Skill ranh giới lớp: `.claude/skills/separate-hook-logic-from-components/SKILL.md`

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 2h · **Depends on**: 03

Hai hook đang **không có test nào**. Đây là phase nặng nhất về kỹ thuật: `useTransition`,
`document` listener thật, và focus thật.

## Key Insights

- **`isPending` bật `true` ĐỒNG BỘ** ngay tại lời gọi `startTransition` — không cần `await`
  để quan sát. Đây là phát biểu nguyên văn của react.dev, và là mấu chốt để test đúng.
- **`waitForNextUpdate()` KHÔNG tồn tại** trên `renderHook` hiện tại — nó thuộc gói
  `@testing-library/react-hooks` đã bị gộp bỏ. Dùng `waitFor` (export ở top level của
  `@testing-library/react`).
- **`handleSelectLocale` DÙNG CHUNG transition với login** — đổi ngôn ngữ cũng làm nút login
  pending. Đây là hành vi **cố ý giữ nguyên** từ lần refactor trước (đã ghi trong doc comment
  của hook và trong `plans/action-items.md` § Nợ lại). Test này là **regression guard**,
  không phải chỗ để "sửa cho đẹp".
- **Hai cơ chế trong `use-menu-keyboard-nav` cần hai kỹ thuật khác nhau**:
  - outside-click + focus effect → DOM thật (`document.createElement`, `registerRoot`/
    `registerItem` trong `act()`, `fireEvent.mouseDown(document.body)`, đọc `document.activeElement`);
  - phím ArrowDown/Up/Home/End/Escape/Tab → chỉ là hàm trả về, **gọi thẳng** với event object
    tự dựng `{ key, preventDefault: vi.fn() }`. Không cần dispatch thật. Đừng over-build.
- **`IS_REACT_ACT_ENVIRONMENT` không cần set tay** — `@testing-library/react` tự set khi import.
- **`@vitejs/plugin-react` không cần** — không test nào ở đây render JSX; `renderHook` nhận
  callback thuần.
- **Nhánh khó nhất là `close(returnFocus = true)`** — phải có `buttonRef` thật đã gắn qua
  `registerButton`, nếu không `buttonRef.current?.focus()` chỉ chạy nhánh optional-chaining
  rỗng và branch coverage thiếu. Cần cả 2 case: có button gắn và không gắn.

## Requirements

- FR-001, FR-002: `hooks/**/*.ts` đạt 100% cả 4 chỉ số.
- Non-functional: giữ hành vi hiện tại nguyên vẹn — phase này KHÔNG sửa file hook.

## Architecture

```
project "jsdom"  →  hooks/**/*.test.ts
   │
   ├─ use-login-actions.test.ts
   │     mock @/lib/auth/sign-in-with-google   (không để chạm createClient thật)
   │     mock @/app/actions/locale             ("use server" module, mock ở ranh giới)
   │     renderHook + act + waitFor
   │
   └─ use-menu-keyboard-nav.test.ts
         không mock gì — logic chỉ số ở lib/ui/roving-index.ts là code thật, để nó chạy
         DOM thật cho effect; gọi hàm trực tiếp cho handler bàn phím
```

**Ma trận nhánh phải phủ** (`use-menu-keyboard-nav`): `handleButtonClick` mở/đóng ·
`handleButtonKeyDown` ArrowDown/ArrowUp/phím khác · `handleMenuKeyDown` 6 nhánh + `default` ·
`close(true)`/`close(false)` · effect outside-click khi `open`/khi `!open` · effect focus.

## Related Code Files

**Tạo**
- `hooks/use-login-actions.test.ts`
- `hooks/use-menu-keyboard-nav.test.ts`

**Sửa / Xoá**: không có. **Tuyệt đối không sửa** `hooks/use-login-actions.ts` hay
`hooks/use-menu-keyboard-nav.ts`.

## Implementation Steps

1. `use-login-actions.test.ts`:
   - mock cả 2 module ranh giới (`sign-in-with-google`, `app/actions/locale`);
   - case 1: promise chưa resolve → `isPending === true` ngay sau `act(() => handleLoginClick())`;
   - case 2: resolve `{ok:false}` trong `await act(async () => {...})` → `hasClientError === true`,
     `isPending` về `false` qua `waitFor`;
   - case 3: resolve `{ok:true}` → `hasClientError` vẫn `false`;
   - case 4: `handleLoginClick` lần 2 sau lỗi → `hasClientError` reset về `false` trước khi chạy;
   - case 5 (regression guard): `handleSelectLocale("en")` với `setLocale` không bao giờ resolve
     → `isPending === true`. Doc comment ghi rõ: dùng chung transition là **cố ý**.
   - Khẳng định `signInWithGoogle` nhận `{ origin: window.location.origin, next: "/todo" }`.
2. `use-menu-keyboard-nav.test.ts` — dựng helper nhỏ trong file:
   ```ts
   const key = (k: string) => ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLDivElement>;
   ```
   rồi đi hết ma trận nhánh ở § Architecture. Với outside-click: tạo `div` thật, append vào
   `document.body`, gắn qua `registerRoot` trong `act()`, mở menu, `fireEvent.mouseDown(document.body)`
   → `open === false`; và case click **bên trong** root → `open` giữ `true`.
   Dọn `document.body` trong `afterEach`.
3. Kiểm `activeIndex` chạy vòng: `itemCount: 2`, ArrowDown 3 lần → về 1 → 0 → 1.
4. `pnpm test:unit:coverage` → `hooks/**` 100% cả 4 cột.
5. Cửa xanh.

## Todo List

- [x] `use-login-actions.test.ts` — 5 case, gồm regression guard shared transition
- [x] `use-menu-keyboard-nav.test.ts` — handler bàn phím (gọi thẳng)
- [x] `use-menu-keyboard-nav.test.ts` — outside-click + focus (DOM thật)
- [x] `close(true)` và `close(false)`, có/không có button đã gắn
- [x] `hooks/**` = 100% trong bảng coverage
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm test:unit                                    # exit 0, project jsdom có test chạy
pnpm test:unit:coverage 2>&1 | grep -E "use-(login-actions|menu-keyboard-nav)\.ts"
# cả 2 dòng 100 | 100 | 100 | 100
pnpm lint --max-warnings 0 && pnpm format:check && pnpm build && pnpm typecheck   # exit 0
git diff --name-only hooks/ | grep -v "\.test\.ts$"   # rỗng
```

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Test `useTransition` flaky vì timing microtask | **Cao** | Cao (CI đỏ ngẫu nhiên) | Luôn `await act(async () => { ...; await Promise.resolve(); })` rồi `waitFor` — không bao giờ `setTimeout`. Chạy `pnpm test:unit --repeat 5` trước khi coi là xong |
| Nhánh `default` của `switch` trong `handleMenuKeyDown` không đạt được | Trung bình | Trung bình | Có case gọi với phím lạ (vd `"a"`) và khẳng định không đổi state, không `preventDefault` |
| Focus effect không chạy trong jsdom | Trung bình | Cao | jsdom hỗ trợ `.focus()`/`activeElement`; nếu vẫn không, gắn item thật vào `document.body` (element rời không nhận focus) |
| Ai đó "sửa" shared transition cho đẹp | Trung bình | Cao (đổi hành vi UI) | Case 5 là guard; doc comment nói thẳng đây là cố ý, đổi phải là quyết định thiết kế riêng |
| Sửa file hook để dễ test | Thấp | Cao | `git diff --name-only hooks/` là success criteria |

## Security Considerations

Không có bề mặt bảo mật mới. Một lưu ý: `use-login-actions` chạm `window.location.origin` —
test không được thay bằng origin lạ để "tiện", vì `signInWithGoogle` dựng `redirectTo` từ đó.

## Next Steps

Phase 10 bật ngưỡng. Chạy song song được với phase 04 và 06 (không dùng chung file nào).
