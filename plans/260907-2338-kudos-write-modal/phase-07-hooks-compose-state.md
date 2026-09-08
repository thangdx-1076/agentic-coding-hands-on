---
phase: 07
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.25h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/_hooks/use-kudos-compose-dialog.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-compose-dialog.test.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-compose-form.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-compose-form.test.ts",
    "src/app/(public)/kudos/_hooks/use-sunner-suggest.ts",
    "src/app/(public)/kudos/_hooks/use-sunner-suggest.test.ts",
  ]
---

# Phase 07 — Hooks: dialog, form draft, gợi ý người nhận

## Context Links

- `.claude/skills/separate-hook-logic-from-components/SKILL.md` § "What a hook returns" — **destructure tại call site**, **không** trả `RefObject`, trả **ref callback** bọc `useCallback` (React Compiler chặn cứng, `pnpm lint` đỏ thật)
- `src/app/(public)/kudos/_hooks/use-kudos-hearts.ts:41` + `use-kudos-toast.ts` — khuôn hook có `useTransition`/timer trong repo
- `src/app/_components/notification-bell.tsx:38-49` — khuôn effect Escape + click-outside
- `src/app/(public)/login/_hooks/use-login-actions.ts:30-37` — repo dùng `useTransition`, **không** `useActionState`
- `phase-04` cấp `validateKudoDraft`/`validateKudoImages`/`insertMarkdownMarker` · `phase-05` cấp action `searchSunners` · `phase-06` cấp action `createKudo`
- SM-001, DEC-001, DEC-002, FR-207, FR-208, FR-401, FR-402 · TC ID-41..49, ID-56 · plan.md AD-1, AD-6

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: toàn bộ state và lifecycle của dialog nằm trong 3 hook có test, để 5 phase Track A chỉ còn JSX thuần nhận props.

## Architecture notes

- `use-kudos-compose-dialog.ts` → `{ open, registerDialog, openDialog, closeDialog, handleCancel }`. `openDialog` gọi `dialogEl.showModal()` (focus trap + `::backdrop` + inert nền là của `<dialog>` native), `closeDialog` gọi `.close()`; nghe event `cancel` (Escape) để đồng bộ state; scroll lock bằng `document.body.style.overflow` trong effect, **trả lại đúng giá trị cũ** khi đóng/unmount. `registerDialog` là **ref callback**, không phải `RefObject`.
- `use-kudos-compose-form.ts` → `{ draft, errors, isPending, submitError, setField, addHashtag, removeHashtag, addImages, removeImage, toggleAnonymous, applyFormat, canSubmit, submit, reset }`. `draft` một object duy nhất trong `useState` (không rải 8 `useState`). `canSubmit = isKudoDraftValid(draft)` → nuôi `aria-disabled` (AD-1); `submit()` **vẫn chạy** khi `canSubmit === false`: nó set `errors` và không gọi action (thoả FR-208 + ID-56 cùng lúc). Gửi qua `useTransition` + `createKudo(FormData)`; `ok:true` → `reset()` + `closeDialog` (do phase 13 nối), `ok:false` → giữ dialog mở, map `errors`/`submitError`. `applyFormat` gọi `insertMarkdownMarker` rồi `setSelectionRange` trên textarea đã register.
- `use-sunner-suggest.ts` → `{ query, setQuery, options, isLoading, isOpen, select, close }`. Debounce **250ms** (AD-6), tối thiểu 1 ký tự, huỷ kết quả cũ đến muộn (giữ một `requestId` tăng dần — không `AbortController` vì Server Action không nhận signal). Dùng lại cho **cả** ô Người nhận và gợi ý `@mention` (ID-33) — cùng nguồn dữ liệu, một hook.

## Requirements

FR-202, FR-204, FR-205, FR-206, FR-207, FR-208, FR-401, FR-402, FR-403, FR-404 · BR-002, BR-003, BR-004, BR-005, DEC-001, DEC-002, SM-001, D001 · spec item B.2, C.1-6, D, E.2, F, G, H.2 · TC ID-16, ID-17, ID-20, ID-25..49, ID-53..56.

## Implementation Steps

1. Test trước, cả 3 hook, project `jsdom` (glob `_hooks/**` đã được `vitest.config.ts` route sang đó).
2. `use-kudos-compose-dialog.ts` + test: attach node bằng `document.createElement("dialog")` qua ref callback trong `act()`; stub `showModal`/`close` (jsdom chưa có); assert `body.style.overflow` được đặt rồi **trả lại giá trị ban đầu**; `fireEvent(dialog, new Event("cancel"))` → `open === false`.
3. `use-kudos-compose-form.ts` + test: 4 trường rỗng + `submit()` → `errors` có 4 mã và action **không** được gọi (ID-56); chip thứ 6 bị chặn kèm `errors.hashtags === "tooMany"` (ID-17); ảnh thứ 6 và `.txt` bị chặn (ID-20, ID-55); `toggleAnonymous` bật/tắt và **xoá** `anonymousName` khi tắt (ID-44); `ok:false, reason:"unauthenticated"` → `submitError` set, dialog không đóng; `isPending` `true` **đồng bộ** ngay tại `startTransition` (không cần `await`).
4. `use-sunner-suggest.ts` + test: dùng `vi.useFakeTimers()` cho debounce; gõ 3 lần liên tiếp → action gọi **đúng 1 lần**; kết quả của query cũ về sau bị bỏ; `query` rỗng → `options` rỗng, không gọi action.
5. `pnpm exec vitest run "src/app/(public)/kudos/_hooks"` → `pnpm test:unit:coverage` → `pnpm lint --max-warnings 0` (bắt lỗi `react-hooks/refs` nếu trả ref sai kiểu).

## Todo List

- [ ] 3 hook, mỗi hook trả **một object đặt tên rõ**, ref là **ref callback** bọc `useCallback`
- [ ] `draft` một object, không rải 8 `useState`
- [ ] `submit()` khi không hợp lệ vẫn set `errors` và **không** gọi action (AD-1 + ID-56)
- [ ] Scroll lock trả lại giá trị `overflow` ban đầu khi đóng/unmount
- [ ] Debounce 250ms, huỷ kết quả đến muộn bằng `requestId`
- [ ] Không hook nào chứa JSX, `className`, hay chuỗi tiếng Việt
- [ ] coverage 100% trên 3 hook · lint · format

## Success Criteria

- `pnpm test:unit:coverage` xanh, 3 hook mới 100%.
- `pnpm lint --max-warnings 0` xanh — không lỗi `react-hooks/refs` (bằng chứng ref callback đúng chuẩn).
- `grep -rn "className\|<div\|return (" "src/app/(public)/kudos/_hooks/use-kudos-compose-form.ts"` rỗng: hook không mang trình bày.
- Không luật nghiệp vụ nào được cài lại trong hook — `grep -n "length > 5\|image/jpeg" _hooks/*.ts` rỗng, mọi luật gọi sang phase 04.
- Mỗi file ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Trả `RefObject` hoặc giữ nguyên object trả về (`form.draft`) tại call site | Cao | Cao — hàng loạt lỗi `react-hooks/refs`, `pnpm lint` đỏ | Skill nói thẳng; bước 5 chạy lint như một cửa |
| Cài lại luật validate trong hook cho nhanh | Cao | Cao — hai nguồn sự thật, client/server lệch | Success Criteria có grep; AD-9 |
| `showModal` không tồn tại trong jsdom → test đỏ vì môi trường | Cao | TB | Bước 2 stub tường minh |
| Debounce làm test bất định | TB | TB | `vi.useFakeTimers()`, không `setTimeout` thật |
| Scroll lock rò rỉ (`overflow: hidden` còn lại sau khi đóng) | TB | Cao — cả trang `/kudos` không cuộn được | Cleanup trả giá trị cũ; có assert riêng |
| Nhồi cả 3 hook thành 1 file | TB | TB — vượt 200 dòng, khó test riêng | 3 file trong `file_ownership` |

## Security Considerations

Hook là code chạy trên browser: mọi thứ ở đây là tiện lợi cho người dùng, **không** phải biên bảo mật. Cụ thể, `canSubmit` và giới hạn 5 ảnh ở đây chỉ để đỡ một round-trip; phase 06 kiểm lại tất cả. Không hook nào được giữ token, gọi Supabase trực tiếp, hay đọc cookie — mọi I/O đi qua Server Action.

## Next Steps

Mở khoá phase 13 (form lắp hook vào các component Track A).
