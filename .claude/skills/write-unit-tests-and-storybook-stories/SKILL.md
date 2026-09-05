---
name: write-unit-tests-and-storybook-stories
description: Chuẩn bắt buộc về file đi kèm — logic (hook/util/helper/Server Action/Route Handler) phải có unit test co-located, coverage 100%; common component phải có Storybook story; mỗi route chính có story xem được; MSW là lớp mock API dùng chung cho cả test lẫn story. Kích hoạt MỖI KHI tạo mới hoặc sửa file trong hooks/, lib/, app/actions/, app/todo/actions.ts, app/auth/callback/route.ts; khi tạo hoặc sửa component trong components/; khi chạy vitest/coverage/storybook; hoặc khi user nói "viết test", "unit test", "coverage", "storybook", "story", "mock API", "msw".
---

# Viết gì kèm theo file vừa đụng

Skill này trả lời đúng một câu: **đã biết code thuộc lớp nào rồi, thì phải kèm file gì bên cạnh?**

Câu trước đó — *đoạn code này thuộc lớp nào* — do
[`separate-hook-logic-from-components`](../separate-hook-logic-from-components/SKILL.md) trả lời.
Đọc skill đó trước nếu chưa chắc ranh giới `lib/` — `hooks/` — component. Ở đây coi như đã phân lớp xong.

Quy tắc này **bắt buộc**. Không phải gợi ý.

## Bảng tra: sửa file này thì phải kèm file gì

| Sửa / tạo file | Bắt buộc kèm | Runner |
|---|---|---|
| `lib/**/*.ts` (hàm thuần, util, helper) | `lib/**/*.test.ts` ngay cạnh | vitest, project `node` |
| `hooks/use-*.ts` | `hooks/use-*.test.ts` ngay cạnh | vitest, project `jsdom` |
| `app/actions/**/*.ts`, `app/todo/actions.ts`, `app/auth/callback/route.ts` | `*.test.ts` ngay cạnh | vitest, project `node` |
| Common component (xem ranh giới dưới) | `*.stories.tsx` ngay cạnh | Storybook |
| Component composition, mọi `.tsx` trong `app/**` | **không bắt buộc gì** | Playwright phủ |

"Ngay cạnh" nghĩa là cùng thư mục, cùng tên gốc. `hooks/use-login-actions.ts` →
`hooks/use-login-actions.test.ts`. Không có thư mục `__tests__/` riêng.

## Ranh giới "common component"

Trả lời 3 câu, **dừng ở chữ "không" đầu tiên**:

1. Nhận toàn bộ dữ liệu qua props?
2. Không import copy/dữ liệu đặc thù tính năng, và không import gì từ `app/`?
3. Không lắp ghép ≥2 component đã đặt tên? (icon không tính)

Đủ 3 chữ "có" → **common** → bắt buộc có story.
Thiếu 1 → **composition** → không bắt buộc.

Phân loại thật của repo hôm nay:

| Common (phải có story) | Composition (không bắt buộc) |
|---|---|
| `GoogleLoginButton` | `LoginHeader` — lắp `Image` + `LanguageSelector` |
| `LanguageSelector` | `LoginHero` — lắp `Image` + 2 component |
| `LoginErrorAlert` | `LoginBackground` — hardcode ảnh riêng của login |
| `LoginFooter` | `LoginScreen` — import `login-copy.ts` |
| 3 icon trong `components/login/icons/` | |

Không có thư mục `components/common/`. Ranh giới nằm ở **nội dung file**, không ở vị trí —
component ở đâu thì story nằm cạnh đó.

## Mỗi route chính phải có story xem được

Story dựng từ **component trình bày** của route, không từ `page.tsx`
(`async` Server Component, Storybook không render được).

| Route | Story dựng từ |
|---|---|
| `/login` | `LoginScreen` — đã thuần trình bày, chỉ cần truyền props |
| `/todo` | `TodoScreen` |
| `/` | miễn — chỉ `redirect()`, không có JSX |

Route mới mà JSX viết thẳng trong `page.tsx` → tách một component trình bày ra trước, rồi mới viết story.

## Coverage 100% — nghĩa là gì, và không nghĩa là gì

`vitest.config.ts` đo theo **allowlist tường minh**:

```
lib/**/*.ts · hooks/**/*.ts · app/actions/**/*.ts · app/todo/actions.ts · app/auth/callback/route.ts
```

`thresholds: { 100: true }` — dưới 100% là exit khác 0, CI đỏ. Đây là cổng chặn, không phải số đo.

**Không có glob `.tsx` nào trong allowlist.** Đó là cơ chế — sai khác phần mở rộng, không phải
một danh sách `exclude` phải bảo trì. Thêm `.tsx` vào là phá cả thiết kế.

Con số 100% nói: mọi helper thuần, mọi máy trạng thái quan sát được của hook, và logic riêng của
từng Server Action/Route Handler đều có test chạy qua.

Nó **không** nói: Server Component render đúng · Supabase/Google OAuth thật chạy được · UI trông
đúng. Ba thứ đó thuộc Playwright và Storybook. Đừng trích con số này để kết luận thay chúng.

Thêm file mới vào `lib/`, `hooks/`, hay `app/actions/` mà chưa có test → CI đỏ ngay, vì file đó
lọt vào mẫu số với 0%. Đó là hành vi đúng, không phải lỗi cấu hình.

## MSW — một module, hai runtime

```
mocks/handlers.ts   ← nguồn duy nhất
   ├── mocks/node.ts        → setupServer, vitest đọc qua setupFiles
   └── .storybook/preview   → service worker, Storybook đọc
```

Sửa handler ở `mocks/handlers.ts` thì cả test lẫn story cùng thấy. **Không** định nghĩa handler
thứ hai cho cùng một endpoint.

Endpoint mock được (đều gọi phía server): `/auth/v1/token`, `/auth/v1/user`, `/auth/v1/logout`.

**Cảnh báo — `signInWithOAuth` MSW không chặn được.** Nó là redirect top-level của trình duyệt,
không phải `fetch`/XHR. Story mô phỏng bấm nút đăng nhập bằng cách truyền prop `onLoginClick`,
không bằng handler `/auth/v1/authorize`. Viết handler cho đường đó là viết code chết.

## Story viết theo shape nào

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { GoogleLoginButton } from "./google-login-button";

const meta = {
  component: GoogleLoginButton,
} satisfies Meta<typeof GoogleLoginButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "LOGIN With Google" } };
export const Pending: Story = { args: { label: "LOGIN With Google", pending: true } };
```

`const meta = {...}` rồi `export default meta` — **không** `export default {...}` trực tiếp.
Rule `import/no-anonymous-default-export` đang bật; default export ẩn danh làm `pnpm lint` đỏ
ngay file story đầu tiên.

Story phải phủ các variant chính của component (mặc định + mỗi state đổi hình dạng: pending,
error, open...). Story chỉ có `Default` cho một component có 3 state là chưa đạt "hướng dẫn sử dụng".

## Test hook — hai kỹ thuật, dùng đúng chỗ

- **Handler trả về từ hook** (`handleMenuKeyDown`, `handleButtonKeyDown`): gọi thẳng, tự dựng
  event tối thiểu `{ key, preventDefault: vi.fn() }`. Không cần `fireEvent`.
- **Effect gắn vào DOM thật** (`document.addEventListener`, `.focus()`): dựng node bằng
  `document.createElement`, nối qua ref callback trong `act()`, rồi `fireEvent.mouseDown(...)`
  và assert `document.activeElement`.

`useTransition`: `isPending` bật `true` **đồng bộ** ngay tại `startTransition` — assert được
không cần `await`. Chờ nó tắt thì dùng `waitFor`, **không** `waitForNextUpdate` (API của gói
`@testing-library/react-hooks` đã bị gỡ, không tồn tại nữa).

## Không áp dụng khi

- Component composition — đã lắp ghép rồi, story của route phủ nó.
- Mọi `.tsx` trong `app/**` — `page.tsx` là `async` Server Component, vitest không hỗ trợ (giới
  hạn của chính Next.js). File ranh giới client của route (`*-client.tsx`) cũng miễn theo cùng lý
  do: nó chỉ nối props với hành động, phần nhìn nằm ở component trình bày mà story của route đã
  phủ. Playwright là nơi kiểm cả hai.
- File `*-copy.ts` chỉ chứa chuỗi tĩnh, file `*.d.ts`.
- File config ở gốc repo.

Đừng viết test cho có. Nhưng đừng thêm file vào `lib/`, `hooks/`, `app/actions/` rồi để trống —
allowlist sẽ bắt, và đúng ra là nó phải bắt.
