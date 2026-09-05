# Phase 08 — Story cho common component

## Context Links

- [`plan.md`](./plan.md) · Spec: FR-004, BR-002, A3 (§ 3.3)
- Skill vừa viết: `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` § ranh giới "common"
- [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) § Q7 #1 (bẫy ESLint)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1h · **Depends on**: 07

Bảy story co-located cho bảy component đạt ranh giới "common" hôm nay. Không viết story cho
composition — đó là non-scope tường minh của spec.

## Key Insights

- **`export default { ... }` trần sẽ làm `pnpm lint` đỏ ngay file story đầu tiên.**
  `import/no-anonymous-default-export` đang bật qua `eslint-config-next` core-web-vitals.
  Shape bắt buộc:
  ```ts
  const meta = { component: X } satisfies Meta<typeof X>;
  export default meta;
  type Story = StoryObj<typeof meta>;
  ```
  Đây cũng là template hiện hành của chính Storybook — chọn nó thay vì tắt rule (không drift config).
- **Phân loại đã chốt, không phán lại**: common = `GoogleLoginButton`, `LanguageSelector`,
  `LoginErrorAlert`, `LoginFooter`, `IconDown`, `IconGoogle`, `IconVnFlag`.
  Composition (KHÔNG story ở phase này) = `LoginHeader` (lắp `LanguageSelector`),
  `LoginHero` (lắp `GoogleLoginButton` + `LoginErrorAlert`), `LoginBackground`,
  `LoginScreen` (thuộc phase 09, tư cách khác: component trình bày của route).
- **`LanguageSelector` là common dù có `"use client"` và gọi hook.** BR-002 xét dữ liệu vào
  (toàn bộ qua props: `label`, `onSelect`) và import (`@/hooks`, `@/lib` — không phải `app/`,
  không phải copy đặc thù tính năng). Hook là chi tiết bên trong, không phải dữ liệu đầu vào.
- **`LoginErrorAlert` render `null` khi `message` rỗng** — cần 2 story để nhìn thấy cả 2 trạng
  thái, nếu không reviewer mở ra thấy trang trắng và tưởng hỏng.
- **Không dùng MSW ở phase này.** Cả 7 component đều prop-driven thuần, không gọi mạng.
  Kéo MSW vào là thêm phức tạp không đổi lấy gì (YAGNI).
- Icon nền tối: đặt `parameters.backgrounds` hoặc decorator nền `#00101A` cho story icon dùng
  `currentColor` (`IconDown`), nếu không nó vô hình trên nền trắng mặc định.

## Requirements

- FR-004: mỗi common component có **một** file story co-located.
- US003 AC-2: story thể hiện được ít nhất biến thể chính (vd trạng thái `pending` của nút).
- Non-functional: file story < 200 dòng (thực tế 15–50 dòng).

## Architecture

| File story | Story exports | Vì sao đúng biến thể đó |
|---|---|---|
| `components/login/google-login-button.stories.tsx` | `Default`, `Pending` | `pending` đổi `disabled` + `aria-busy` + đổi icon sang spinner — biến thể chính |
| `components/login/language-selector.stories.tsx` | `Vietnamese`, `English` | `label` là toàn bộ bề mặt props; menu mở/đóng do hook, xem trực tiếp trong story |
| `components/login/login-error-alert.stories.tsx` | `WithMessage`, `Empty` | `message = null` → render `null`; phải nhìn thấy cả 2 |
| `components/login/login-footer.stories.tsx` | `Default` | Một prop duy nhất, không có biến thể thật |
| `components/login/icons/icon-down.stories.tsx` | `Default` | `currentColor` — đặt trên nền tối |
| `components/login/icons/icon-google.stories.tsx` | `Default` | Brand asset, màu cố định |
| `components/login/icons/icon-vn-flag.stories.tsx` | `Default` | Brand asset, màu cố định |

Dữ liệu story lấy từ `defaultLoginCopy` (`components/login/login-copy.ts`) — **không bịa chuỗi
mới**. Đó là nguồn copy `vi` thật của thiết kế.

## Related Code Files

**Tạo** (7 file, tất cả co-located)
- `components/login/google-login-button.stories.tsx`
- `components/login/language-selector.stories.tsx`
- `components/login/login-error-alert.stories.tsx`
- `components/login/login-footer.stories.tsx`
- `components/login/icons/icon-down.stories.tsx`
- `components/login/icons/icon-google.stories.tsx`
- `components/login/icons/icon-vn-flag.stories.tsx`

**Sửa / Xoá**: không có. **Không sửa file component nào** — nếu một component "cần sửa mới
story được" thì đó là phát hiện đáng báo, không phải việc âm thầm làm ở đây.

## Implementation Steps

1. Viết `login-footer.stories.tsx` trước — đơn giản nhất, dùng để xác nhận shape `satisfies Meta`
   qua được `pnpm lint`. Chạy `pnpm lint` ngay sau file này, trước khi viết 6 file còn lại.
2. Viết 3 story icon (cùng khuôn, chỉ khác component + nền).
3. `login-error-alert.stories.tsx` — 2 story, trong đó `Empty` có `parameters.docs.description`
   nói rõ "render `null` là đúng thiết kế".
4. `google-login-button.stories.tsx` — `Default` + `Pending`, `label` lấy từ
   `defaultLoginCopy.loginButton`, `onClick` là `fn()` của `storybook/test` (hoặc no-op).
5. `language-selector.stories.tsx` — `Vietnamese` (`label: "VN"`) + `English` (`label: "EN"`).
   Nền tối, vì component vẽ chữ trắng.
6. `pnpm build-storybook` — exit 0, output liệt kê đủ 7 component.
7. Mở `pnpm storybook`, mắt thường kiểm: nút `Pending` có spinner và bị disable; menu ngôn ngữ
   mở được bằng chuột và bằng ArrowDown.
8. Cửa xanh.

## Todo List

- [x] `login-footer.stories.tsx` + `pnpm lint` xác nhận shape
- [x] 3 story icon (nền tối cho `IconDown`)
- [x] `login-error-alert.stories.tsx` — 2 trạng thái
- [x] `google-login-button.stories.tsx` — `Default` + `Pending`
- [x] `language-selector.stories.tsx` — VN + EN
- [x] `build-storybook` exit 0, đủ 7 component
- [x] Kiểm mắt thường 2 tương tác chính
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
ls components/login/*.stories.tsx components/login/icons/*.stories.tsx | wc -l   # = 7
pnpm build-storybook                                                              # exit 0
grep -L "satisfies Meta" components/login/**/*.stories.tsx                        # rỗng
grep -rn "export default {" components/login --include="*.stories.tsx"            # rỗng
git diff --name-only components/ | grep -v "\.stories\.tsx$"                      # rỗng
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck  # exit 0
```

Kiểm định: mở Storybook, mỗi common component có mục riêng, `GoogleLoginButton/Pending` nhìn
thấy được spinner.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| `import/no-anonymous-default-export` làm đỏ toàn bộ 7 file | **Cao** nếu quên shape | Trung bình | Bước 1 viết 1 file rồi lint ngay — phát hiện với chi phí 1 file, không phải 7 |
| Story icon vô hình trên nền trắng | Trung bình | Thấp | Decorator/`backgrounds` nền `#00101A` cho `IconDown` |
| Cãi lại phân loại common/composition khi đang viết | Trung bình | Trung bình | Danh sách đã chốt ở § Key Insights; đổi phân loại là sửa spec, không phải sửa trong lúc code |
| Bịa dữ liệu mock thay vì dùng `defaultLoginCopy` | Trung bình | Thấp | Quy tắc: dữ liệu story lấy từ nguồn copy thật của repo |
| `language-selector` gọi `useMenuKeyboardNav` → lỗi hook ngoài React tree | Thấp | Trung bình | Storybook render trong React tree đầy đủ; nếu lỗi, đó là dấu hiệu `preview.tsx` sai, quay lại phase 07 |

## Security Considerations

Không có. Story không chạm auth, cookie, hay mạng. Một ràng buộc: **không** truyền URL/token
thật vào args của bất kỳ story nào.

## Next Steps

Phase 10 sẽ đưa `build-storybook` vào CI. Chạy song song được với phase 09.
