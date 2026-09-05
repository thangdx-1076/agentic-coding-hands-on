---
phase: 02
status: pending
priority: P1
effort: 2h
owner: implementer
depends_on: [01]
file_ownership: ["eslint.config.mjs", "tsconfig.json", "package.json", "app/**", "components/**", "lib/**", "i18n/**", "tests/**"]
---

# Phase 02 — ESLint standard + 36 finding đã đo

## Context Links

- `clarifications.md` § Stage 1 ("Đầy đủ như đề xuất" — chốt trọn bộ 6 lớp)
- `plans/reports/researcher-260905-1624-eslint-standard.md` § Q1–Q8 (số finding lấy từ trial run thật, không phải ước lượng)
- `spec/system/architecture.md` § Tech Stack dòng "Lint"

## Overview

**Priority**: P1 · **Status**: pending
Nâng `eslint.config.mjs` từ mặc định `eslint-config-next` lên bộ chuẩn đầy đủ, rồi dọn đúng 36 finding đã đo. Chưa đụng Prettier (phase 03). Chưa viết test mới (phase 04).

## Key Insights

- Cấu hình hiện tại **đã có sẵn** plugin `react`, `react-hooks`, `import`, `jsx-a11y` cùng `import/resolver` typescript. Đừng cài lại chúng — chỉ 4 package thật sự mới: `typescript-eslint`, `eslint-plugin-playwright`, `@vitest/eslint-plugin`, và promote `eslint-plugin-import` từ transitive lên devDependency tường minh.
- Tên package Vitest đúng là **`@vitest/eslint-plugin`**; `eslint-plugin-vitest` là tên cũ đã deprecated — cài nhầm là nợ kỹ thuật ngay ngày đầu.
- `jsx-a11y` phải merge **rules**, không khai lại **plugin key** — flat config ném lỗi khi trùng plugin identity (Next đã đăng ký `jsx-a11y` rồi).
- 2 finding là **bug thật**: `tests/e2e/login.spec.ts:153` (`route.abort()`) và `:207` (`route.fulfill()`) thiếu `await` bên trong route handler → promise trôi. `eslint-plugin-playwright` bắt cùng lớp lỗi này qua `missing-playwright-await`.
- `login.spec.ts:171,186,188` đã có sẵn một `eslint-disable-next-line @typescript-eslint/no-explicit-any`. Rule type-checked đưa vào **rule ID mới** mà comment cũ không phủ — đây là chi phí migrate thật, không phải bug mới xuất hiện.
- 4 file `.mjs` (`eslint.config.mjs`, `postcss.config.mjs`, `tests/e2e/visual-capture.mjs`, `visual-validation.mjs`) **parse fail** dưới `projectService` vì `tsconfig.json` không `include` `**/*.mjs`. Đây là lỗ hổng cấu hình, không phải lint finding — vá bằng override tắt type-checked overlay cho `**/*.mjs`, đừng nhét chúng vào tsconfig (sẽ kéo theo type-check cả script không liên quan).
- `interactive-supports-focus` bắn ở `language-selector.tsx:150` là **giới hạn đã biết của rule**: nó không hiểu roving tabindex. Fix đúng là `tabIndex={-1}` trên wrapper `role="menu"` (ghi lại chủ đích), KHÔNG phải disable comment.
- Bỏ `import/no-cycle`: 0 hit trên 34 file, mà lại là rule chậm nhất plugin. Bỏ `--cache`: 34 file thì cache không tiết kiệm gì mà đẻ thêm `.eslintcache` phải gitignore. Bỏ SARIF/reviewdog: exit code khác 0 đã đủ chặn merge.
- Dùng `recommendedTypeChecked`, **không** `strictTypeChecked` — strict thêm ~15 rule ý kiến cá nhân sẽ đốt sáng phát hiện thuần phong cách trên một app 2 màn hình.

## Requirements

- `eslint.config.mjs` xếp theo đúng thứ tự: base Next (giữ nguyên) → `typescript-eslint.configs.recommendedTypeChecked` (`projectService: true`, `tsconfigRootDir`) → override tắt type-checked cho `**/*.mjs` → rules `jsx-a11y` recommended đầy đủ (merge rules) → `import/order` (`newlines-between: always`) → `eslint-plugin-playwright` flat recommended scope `tests/e2e/**/*.spec.ts` → `@vitest/eslint-plugin` recommended scope `lib/**/*.test.ts`.
- `no-floating-promises` + `no-misused-promises` ở mức `error`.
- Script `"lint": "eslint"` giữ nguyên; thêm `"lint:fix": "eslint --fix"`.
- `pnpm lint --max-warnings 0` exit 0 khi phase đóng.
- KHÔNG thêm `eslint-config-prettier` ở phase này (phase 03 sở hữu).

## Architecture

```
eslint.config.mjs  (thứ tự = độ ưu tiên, sau đè trước)
 1. ...nextVitals            react + react-hooks + @next/next + 6 rule jsx-a11y + 1 rule import
 2. ...nextTs                typescript-eslint recommended (KHÔNG type-checked)
 3. recommendedTypeChecked   + projectService  ─ files: **/*.{ts,tsx}
 4. override                 files: **/*.mjs   ─ disableTypeChecked
 5. jsx-a11y recommended     merge RULES (không khai lại plugin key)
 6. import/order             newlines-between: always
 7. playwright flat/recommended   files: tests/e2e/**/*.spec.ts
 8. vitest recommended            files: lib/**/*.test.ts
 9. globalIgnores            .next, out, build, next-env.d.ts (+ .claude, plans, docs nếu bước 3 cho thấy bị quét)
```

## Related Code Files

**Modify**: `eslint.config.mjs`, `package.json` (4 devDep + `lint:fix`), `tests/e2e/login.spec.ts` (2 bug `await` + 3 finding `no-unsafe-*` + 1 `no-unnecessary-type-assertion`), `tests/e2e/helpers/sign-in.ts` (2 `no-unsafe-assignment` từ `JSON.parse`), `i18n/request.ts` (5 `no-unsafe-*` từ dynamic import), `components/login/language-selector.tsx:150` (`tabIndex={-1}`), + 16 file bị `--fix` chạm bởi `import/order`
**Create**: — · **Delete**: —

## Implementation Steps

1. `pnpm add -D typescript-eslint eslint-plugin-playwright @vitest/eslint-plugin eslint-plugin-import`.
2. Viết `eslint.config.mjs` theo layout ở § Architecture.
3. `pnpm lint --max-warnings 0` lần đầu — **đếm số file thực sự được quét**. Nếu ESLint mò vào `plans/**`, `docs/**` hay `.claude/**` (đang untracked, có file .mjs/.json), thêm chúng vào `globalIgnores`. Xác nhận trước rồi mới thêm, đừng ignore phòng hờ.
4. `pnpm lint:fix` — hấp thụ 21 finding `import/order` (100% auto-fix). Review diff: chỉ được là đổi thứ tự import + blank line, không có gì khác.
5. Sửa tay 2 bug thật: thêm `await` cho `route.abort()` (`login.spec.ts:153`) và `route.fulfill()` (`:207`), và đổi callback thành `async`. Đây là sửa BUG, không phải chiều lòng linter — promise trôi trong route handler làm test có thể chạy tiếp trước khi request bị chặn xong.
6. Sửa `login.spec.ts:171,186,188`: khai type cho `__reportBtnState` qua một interface `declare global` cục bộ thay vì `(window as any)`, gỡ luôn được disable comment cũ. Không chồng thêm disable comment mới.
7. `sign-in.ts:52,54`: ép kiểu kết quả `JSON.parse` về interface `SessionResponse` đã có sẵn trong file.
8. `i18n/request.ts:21-26`: gắn type cho kết quả dynamic import (`as { default: AbstractIntlMessages }` hoặc tương đương) — 1 chỗ, không cần override cả file.
9. `language-selector.tsx:150`: thêm `tabIndex={-1}` vào `<div role="menu">`. Kiểm tra lại bằng tay rằng roving focus vẫn nhảy đúng sang `menuitem` (test bàn phím ở phase 04 sẽ gác chuyện này).
10. `pnpm lint --max-warnings 0` exit 0. Xác nhận `missing-playwright-await` không còn hit nào.
11. `pnpm build && pnpm typecheck && pnpm test:unit` xanh.
12. E2E regression (cần saa-app): `pnpm test:e2e` vẫn 23/23 — bước 5, 6, 9 có sửa code test và code UI thật.
13. Commit tách 2: `chore(lint): add eslint standard` (config + dep + autofix) rồi `fix(test,a11y): resolve lint findings` (10 sửa tay).

## Todo List

- [ ] Cài 4 devDep (đúng tên `@vitest/eslint-plugin`)
- [ ] Viết `eslint.config.mjs` 9 tầng
- [ ] Kiểm phạm vi quét, chốt `globalIgnores`
- [ ] `lint:fix` hấp thụ 21 `import/order`, review diff thuần thứ tự
- [ ] `await` cho `route.abort()` + `route.fulfill()` (2 bug thật)
- [ ] Type hoá `__reportBtnState`, gỡ `no-explicit-any` disable cũ
- [ ] Type hoá `JSON.parse` trong `sign-in.ts`, dynamic import trong `i18n/request.ts`
- [ ] `tabIndex={-1}` cho wrapper `role="menu"`
- [ ] lint 0 warning / build / typecheck / unit xanh; e2e 23/23
- [ ] 2 commit tách bạch

## Success Criteria

| Command | Expected |
|---|---|
| `pnpm lint --max-warnings 0` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test:unit` | exit 0, 32/32 |
| `pnpm test:e2e` (saa-app chạy) | exit 0, 23/23 |
| `grep -n "eslint-disable" tests/e2e/login.spec.ts` | 0 hit (disable cũ đã gỡ, không thêm mới) |

## Rollback

Revert 2 commit theo thứ tự ngược. Sửa tay ở bước 5-9 chạm code chạy thật (`language-selector.tsx`, `i18n/request.ts`) nên rollback phải kèm chạy lại `pnpm test:e2e` — không chỉ revert rồi tin. Config lint thuần là additive, gỡ ra không để lại dấu vết nào trong runtime.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| `--fix` sửa quá tay ngoài `import/order` | M×M | Review diff bước 4 trước khi commit; chỉ chấp nhận đổi thứ tự import + blank line |
| Trùng plugin key `jsx-a11y` → flat config throw | M×M | Merge `flatConfigs.recommended.rules`, không spread cả config object |
| `tabIndex={-1}` phá roving focus của menu | L×H | Kiểm tay ngay bước 9; 9 test bàn phím ARIA hiện có là lưới an toàn ở bước 12 |
| `projectService` làm lint chậm hẳn | L×L | 34 file — typescript-eslint ghi nhận độ trễ dưới giây ở quy mô này; đo lại ở bước 10 nếu thấy khác |
| Sửa `i18n/request.ts` làm hỏng load message | L×H | Chỉ thêm type annotation, không đổi biểu thức; `pnpm build` + e2e (mọi test đều render text đã dịch) bắt được ngay |
| `eslint-plugin-playwright` bắn thêm rule ngoài dự đoán (`no-conditional-in-test`) | M×L | Số hit chưa được trial (plugin chưa cài lúc research) — nếu bắn vào code trong `page.evaluate` (là code browser, không phải test body) thì scope-tắt đúng rule đó kèm comment lý do |

## Security Considerations

- `no-floating-promises` ở mức `error` là guard hồi quy cho các đường Server Action / Supabase: hiện tại chúng đều đã `await` đúng (đã kiểm `app/auth/callback/route.ts`, `app/actions/locale.ts`, `app/todo/actions.ts` — 0 hit), rule giữ cho nó không trượt về sau.
- `jsx-a11y` đầy đủ không phải chuyện thẩm mỹ: focus trap và element tương tác không focus được là rào chặn thật với người dùng bàn phím.
- Không thêm dep runtime nào — cả 4 package đều `devDependencies`, không lọt vào bundle client.

## Next Steps

Phase 03 spread `eslint-config-prettier` vào cuối mảng config này rồi reformat 16 file. Vì `eslint-config-prettier` chỉ TẮT rule, nó không thể đẻ ra failure mới trên cây vừa xanh.
