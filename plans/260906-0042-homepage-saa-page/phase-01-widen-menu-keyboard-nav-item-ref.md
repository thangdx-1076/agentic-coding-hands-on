---
phase: 01
feature: F003
status: completed
priority: P0
test_policy: e2e-red-first
effort: 0.5h
owner: implementer
file_ownership: ["hooks/use-menu-keyboard-nav.ts", "hooks/use-menu-keyboard-nav.test.ts"]
---

# Phase 01 — Prereq: nới kiểu ref item của `useMenuKeyboardNav`

## Context Links

- `clarifications.md` § Header (menu tài khoản), § E2E contract (menu tài khoản)
- `research/researcher-01-next16-homepage-patterns.md` § 5 (menuitem trên `<button>` trong form)
- `.claude/skills/separate-hook-logic-from-components/SKILL.md` (ref callback, destructure tại call site)
- `hooks/use-menu-keyboard-nav.ts` (hiện tại), `components/login/language-selector.tsx` (caller duy nhất hôm nay)

## Overview

**Priority**: P0 · **Status**: completed (2026-09-06, orchestrator — type-only; typecheck exit 0, hook tests 14/14)
Hook hiện chỉ nhận `HTMLButtonElement` cho `registerItem`. Menu tài khoản của homepage có 2 item là `<a role="menuitem" href>` (Hồ sơ, Trang quản trị) và 1 item `<button type="submit" role="menuitem">` (Đăng xuất) — Track A sẽ không typecheck sạch nếu không nới trước. Đây là thay đổi **type-only**, chạy trước cả 2 track (0.5h), không đổi hành vi runtime.

## Key Insights

- Chỉ `registerItem` cần nới (`HTMLElement`); `registerButton` vẫn là nút mở menu thật → giữ `HTMLButtonElement`, chỉ nới nếu `pnpm typecheck` thực sự đòi.
- `itemRefs` đổi sang `(HTMLElement | null)[]`; mọi thao tác trong hook chỉ dùng `.focus()` và `tabIndex` — cả hai đều có trên `HTMLElement`.
- `LanguageSelector` truyền `<button>` vẫn hợp lệ (contravariance của tham số callback không cản: `HTMLButtonElement` là subtype của `HTMLElement`, callback nhận `HTMLElement` gán được vào chỗ cần `(node: HTMLButtonElement | null) => void`).
- Test cũ (`hooks/use-menu-keyboard-nav.test.ts`) KHÔNG được sửa assertion. Hook nằm trong allowlist coverage 100% → thay đổi type-only không tạo nhánh mới, coverage giữ nguyên.

## Requirements

- **BR-006** (technical-spec § 4.4 Bin 2) — hợp đồng bàn phím dùng chung cho menu tài khoản + widget giữ nguyên: Enter/Space/click mở, mũi tên chạy vòng, Esc đóng + trả focus, click ngoài đóng, roving tabindex.
- **SM-001** — máy trạng thái `closed ⇄ open` không đổi.

## Related Code Files

**Modify**: `hooks/use-menu-keyboard-nav.ts` (kiểu `registerItem`, `itemRefs`, JSDoc) · **Create**: — · **Delete**: —
Tuỳ chọn: thêm 1 case vào `hooks/use-menu-keyboard-nav.test.ts` chứng minh `registerItem` nhận `HTMLAnchorElement` (không sửa case cũ).

## Implementation Steps

1. `itemRefs = useRef<(HTMLElement | null)[]>([])`.
2. `registerItem(index: number): (node: HTMLElement | null) => void` — thân hàm giữ nguyên.
3. Cập nhật type `MenuKeyboardNav.registerItem` trong khối type export.
4. Cập nhật JSDoc: item có thể là `<button>` hoặc `<a role="menuitem">`; ghi lại giới hạn `itemCount` cố định vẫn đúng (menu tài khoản 2 hoặc 3 item nhưng cố định trong một lần render vì role không đổi giữa phiên).
5. (Tuỳ chọn) thêm case test anchor.
6. `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm test:unit:coverage` — cả ba exit 0, coverage vẫn 100%.

## Todo List

- [x] Nới `itemRefs` + `registerItem` sang `HTMLElement`
- [x] Cập nhật type export + JSDoc
- [x] `LanguageSelector` vẫn typecheck sạch, không sửa file đó
- [x] typecheck / lint / unit coverage 100% exit 0

## Success Criteria

- `pnpm typecheck` exit 0; `pnpm test:unit:coverage` exit 0 và vẫn 100% (BR-006 không đổi hành vi).
- `git diff` chỉ chạm 1–2 file trong `hooks/`, không có thay đổi runtime nào ngoài kiểu.
- Track A (phase 02) gắn được `ref={registerItem(i)}` lên `<a role="menuitem">` mà không cast.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Nới type kéo theo lỗi typecheck ở `LanguageSelector` | L×M | Chạy typecheck ngay ở step 6; nếu đỏ thì nới thêm `registerButton`, không cast `as` |
| Ai đó "tiện tay" sửa hành vi hook | L×H | File ownership giới hạn đúng 2 file; assertion cũ bất di bất dịch |
| Phase này chậm → chặn Track A | L×M | Scope 0.5h, chỉ type; nếu quá 1h → báo orchestrator |

## Security Considerations

Không có bề mặt bảo mật: thay đổi thuần kiểu TypeScript, không đụng auth, cookie hay dữ liệu người dùng.

## Next Steps

Mở khoá phase 02 (Track A). Phase 03 và 04 không lệ thuộc phase này, có thể chạy song song ngay.
