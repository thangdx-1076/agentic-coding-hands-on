# Phase 09 — Tách `TodoScreen` + story cho route chính

## Context Links

- [`plan.md`](./plan.md) · Spec: FR-005, A4 (§ 3.3), US004 (gồm scenario lỗi "route chưa có component trình bày")
- [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) § Q6
- Skill ranh giới lớp: `.claude/skills/separate-hook-logic-from-components/SKILL.md`

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1.5h · **Depends on**: 07

**Phase DUY NHẤT sửa code chạy thật.** Hai route chính, hai xuất phát điểm khác nhau:
`/login` đã sẵn sàng, `/todo` phải tách component trình bày trước.

## Key Insights

- **`/login` không cần refactor gì.** `app/login/page.tsx` (async Server Component) đã uỷ thác
  toàn bộ render xuống `LoginClient` → `LoginScreen`, và `LoginScreen` nhận mọi thứ qua props
  với default là copy `vi` của Figma. Story chỉ cần import và render.
- **`/todo` thì chưa**: JSX viết thẳng trong `async function TodoPage()`. Storybook không render
  được `async` Server Component — đây là giới hạn cấu trúc mà chính doc của Next thừa nhận,
  không phải việc hoãn lại. Phải tách.
- **`TodoScreen` phải là component ĐỒNG BỘ, không `async`, không import gì server-only.**
  Không cần `"use client"` — nó vẫn là Server Component thường, nên Server Action đi qua prop
  `action` của `<form>` y như hiện tại, không đổi ranh giới client/server một chút nào.
  Thêm `"use client"` là **đổi hành vi**, không được làm.
- **Đây là một PHÉP DI CHUYỂN THUẦN.** JSX, className, text đều phải giống hệt. Không sửa
  Tailwind class "cho gọn", không đổi `<h1>` thành gì khác, không thêm `aria-*`. Diff sạch là
  điều kiện để rollback an toàn.
- **Vùng mù kiểm chứng:** phần render của `/todo` chỉ được Playwright phủ ở block `@auth`,
  vốn **local-only** (cần `saa-app` sống) và CI chạy `--grep-invert @auth`. Nghĩa là CI xanh
  KHÔNG chứng minh phase này không làm hỏng gì. Đối sách nằm ở § Risk.
- Copy story lấy từ `messages/vi.json` (`todo.greeting`, `todo.logout`) và `defaultLoginCopy` —
  không bịa chuỗi.

## Requirements

- FR-005: mỗi route chính có **đúng một** story dựng từ component trình bày của route đó.
- US004 AC-2: route chưa có component trình bày phải tách trước.
- Non-functional: `/todo` render ra HTML **giống hệt** trước khi tách.

## Architecture

**Trước**
```
app/todo/page.tsx (async RSC)
   createClient → getUser → guard → getTranslations → JSX inline
```

**Sau**
```
app/todo/page.tsx (async RSC)                    ← giữ nguyên toàn bộ phần logic/guard
   createClient → getUser → guard → getTranslations
   └─ <TodoScreen greeting={t("greeting",{email})} logoutLabel={t("logout")} logoutAction={logoutAction} />

components/todo/todo-screen.tsx (sync, presentational)
   props: { greeting: string; logoutLabel: string;
            logoutAction: (formData: FormData) => void | Promise<void> }
   trả về đúng khối <main>…</main> đang có
```

Ranh giới không đổi: guard `getUser()` authoritative vẫn ở page, Server Action vẫn là chính nó,
`<form action>` vẫn nhận cùng một hàm. `TodoScreen` không biết gì về Supabase hay next-intl.

**Hai story route:**

| Route | Component trình bày | File story | Args |
|---|---|---|---|
| `/login` | `LoginScreen` (đã có sẵn) | `components/login/login-screen.stories.tsx` | mặc định (copy `vi` Figma) + `onLoginClick` no-op |
| `/todo` | `TodoScreen` (tách ở phase này) | `components/todo/todo-screen.stories.tsx` | greeting/logout từ `messages/vi.json`, `logoutAction` no-op |

BR-003 áp dụng cho story `/login`: mock đăng nhập bằng prop `onLoginClick`, **không** bằng
handler MSW `/auth/v1/authorize`.

## Related Code Files

**Tạo**
- `components/todo/todo-screen.tsx`
- `components/todo/todo-screen.stories.tsx`
- `components/login/login-screen.stories.tsx`

**Sửa**
- `app/todo/page.tsx` — chỉ thay khối JSX bằng một lời gọi `<TodoScreen …>`

**Xoá**: không có.

## Implementation Steps

1. Chụp trạng thái trước: `git rev-parse HEAD` (mốc rollback). Nếu `saa-app` đang chạy, chạy
   `pnpm test:e2e --grep @auth` **trước khi sửa** và lưu kết quả — đó là baseline duy nhất phủ
   phần render `/todo`.
2. Tạo `components/todo/todo-screen.tsx`: **copy-paste nguyên khối `<main>…</main>`**, thay đúng
   3 chỗ: `t("greeting",…)` → `{greeting}`, `t("logout")` → `{logoutLabel}`,
   `action={logoutAction}` → `action={logoutAction}` (prop). Không đụng className.
3. Sửa `app/todo/page.tsx` — import `TodoScreen`, trả về nó. Giữ nguyên `createClient`, `getUser`,
   `redirect`, `getTranslations`, và cả doc comment giải thích guard authoritative.
4. `git diff app/todo/page.tsx` — phần bị xoá phải khớp từng ký tự với phần được thêm vào
   `todo-screen.tsx` (trừ 3 chỗ thay ở bước 2). Đây là kiểm tra bắt buộc, không phải gợi ý.
5. `pnpm build && pnpm typecheck` — bắt sớm lỗi kiểu của `action` prop.
6. Chạy lại e2e: `pnpm test:e2e --grep-invert @auth` (luôn được), và `--grep @auth` nếu `saa-app`
   sống. Kết quả phải giống baseline bước 1.
7. `components/todo/todo-screen.stories.tsx` — 1 story `Default`, copy từ `messages/vi.json`.
8. `components/login/login-screen.stories.tsx` — 1 story `Default` (tất cả default),
   cân nhắc thêm `Pending` và `WithError` nếu không phá "đúng 1 story cho route" — FR-005 nói
   *một story xem được cho route*, các biến thể phụ là bonus, **ưu tiên đúng 1** cho đơn giản.
9. `pnpm build-storybook` exit 0. Mở mắt thường: `/login` phải trông đúng như app thật.
10. Cửa xanh.

## Todo List

- [x] Ghi mốc rollback + baseline e2e (nếu `saa-app` sống)
- [x] `components/todo/todo-screen.tsx` — di chuyển thuần
- [x] `app/todo/page.tsx` — gọi `TodoScreen`
- [x] Diff đối chiếu từng ký tự (bước 4)
- [x] `pnpm build && pnpm typecheck`
- [x] e2e CI-safe xanh; e2e `@auth` xanh nếu chạy được
- [x] `todo-screen.stories.tsx`
- [x] `login-screen.stories.tsx`
- [x] `build-storybook` exit 0, mắt thường kiểm `/login`
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
grep -c "async" components/todo/todo-screen.tsx      # 0 — KHÔNG được async
grep -c '"use client"' components/todo/todo-screen.tsx  # 0 — không đổi ranh giới
grep -c "supabase\|next-intl\|getTranslations" components/todo/todo-screen.tsx  # 0
ls components/todo/todo-screen.stories.tsx components/login/login-screen.stories.tsx  # cả 2 tồn tại
pnpm build-storybook                                  # exit 0
pnpm exec playwright test --grep-invert @auth         # exit 0, cùng số test như trước
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck  # exit 0
```

Kiểm định thủ công (SC-003): mở Storybook → đúng 1 story cho `/login`, 1 cho `/todo`, cả hai
render được mà **không** cần đăng nhập, không cần dev server, không cần `saa-app`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| **Tách làm đổi HTML của `/todo` mà CI không bắt được** (vùng `@auth` local-only) | Trung bình | **Cao** — hỏng trang thật, xanh giả | 3 lớp: (a) kỷ luật di chuyển thuần + đối chiếu diff ở bước 4; (b) chạy `@auth` local nếu `saa-app` sống; (c) nếu không chạy được, ghi rõ vào commit message rằng phần render `/todo` chưa có bằng chứng tự động |
| Thêm `"use client"` "cho chắc" → đổi ranh giới server/client | Trung bình | Cao | Là success criteria có `grep` kiểm |
| Kiểu của `action` prop không khớp Server Action | Trung bình | Trung bình | Dùng `(formData: FormData) => void \| Promise<void>`; `logoutAction()` không tham số vẫn gán được |
| Tiện tay "dọn" Tailwind class lúc di chuyển | **Cao** (cám dỗ thật) | Cao | Bước 4 là cửa chặn; class đổi = scope violation, revert và làm lại |
| `LoginScreen` story vỡ vì `next/font` hoặc `next/image` | Thấp (framework hỗ trợ sẵn) | Trung bình | Nếu vỡ là lỗi cấu hình phase 07, quay lại đó — không hack trong story |
| Ai đó thêm 5 story cho `/login` rồi FR-005 thành mơ hồ | Trung bình | Thấp | Bước 8: ưu tiên đúng 1 story `Default` cho mỗi route |

## Rollback

`git revert <sha>` khôi phục JSX inline trong `app/todo/page.tsx` và xoá 3 file mới. Không có
migration, không có state, không có dữ liệu người dùng dính vào. Story của `/login` sẽ mất
theo — chấp nhận được, vì nó không phải code chạy thật.

## Security Considerations

- Guard `getUser()` authoritative **phải ở lại** `app/todo/page.tsx`, tuyệt đối không đẩy xuống
  `TodoScreen`. Component trình bày không được quyết định ai xem được gì.
- `TodoScreen` nhận `greeting` đã dựng sẵn (đã có email). Không truyền cả object `user` xuống —
  component trình bày không cần và không nên thấy nó.
- Story dùng email giả (`demo@example.com`), không dùng email thật của ai.

## Next Steps

Mở đường cho phase 10 đưa `build-storybook` vào CI. Chạy song song được với phase 08.
