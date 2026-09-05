# Phase 07 — Cấu hình Storybook + MSW + next-intl

## Context Links

- [`plan.md`](./plan.md) · [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) § Q2, Q3, Q4, Q7
- Spec: A3/A4 (§ 3.3) của [`technical-spec.md`](./spec/testing-storybook-standards/technical-spec.md)
- Giải câu chưa chốt § 5.3 **#2** (API bề mặt `msw-storybook-addon@3.0.0`)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1.5h · **Depends on**: 02

**Deviation note (Unresolved question #2):** The API surface of `msw-storybook-addon@3.0.0` was resolved by introspecting the package's export map and runtime exports rather than reading `node_modules/` docs (environment restriction). Finding: v3.0.0 has **no `initialize()`** — the function does not exist in this major version. The `mswLoader` export from `"./csf3"` is a factory `(setup?) => LoaderFunction` that must be called, which is correctly applied: `loaders: [mswLoader()]`. The circulating documentation is wrong for this version.

Dựng Storybook chạy được **trước khi** có story nào. Kết thúc phase, `pnpm build-storybook`
exit 0 với 0 story — đó là cửa xanh hợp lệ.

## Key Insights

- **`staticDirs: ["../public"]` là bắt buộc, không phải tuỳ chọn.** Next tự serve `/public`;
  Storybook thì không. Thiếu nó thì `/login/keyvisual.png`, `/login/Logo.png`,
  `/login/Root_Further_Logo.png` 404 ở mọi story — và `public/mockServiceWorker.js` cũng
  không được serve, MSW browser chết theo.
- **`preview.tsx`, không phải `.ts`** — decorator `NextIntlClientProvider` trả JSX.
- **`next.config.ts` bọc qua `createNextIntlPlugin()`.** `@storybook/nextjs-vite` chạy trên
  Vite, KHÔNG đi qua chuỗi plugin của Next → cấu hình next-intl phía server không áp dụng
  trong Storybook. Đó chính là lý do phải có decorator, chứ không phải "phòng xa".
- **`next/image` và `next/font/google` không cần mock** — `@storybook/nextjs-vite` xử lý sẵn
  (`app/fonts.ts` dùng Montserrat/Montserrat_Alternates, `login-background.tsx` dùng `<Image fill>`).
- **Tailwind v4 qua `@tailwindcss/postcss`**: Vite hỗ trợ PostCSS sẵn, `postcss.config.mjs` của
  repo tự được áp dụng. **KHÔNG đổi sang `@tailwindcss/vite`** để "sửa" một bug không tồn tại
  ở cấu hình này.
- **Câu #2 giải bằng cách đọc README của package đã cài**, không đoán từ blog. `initialize()`
  có còn cần gọi riêng hay `addons: ["msw-storybook-addon"]` tự lo — README trong
  `node_modules/msw-storybook-addon/` là nguồn duy nhất đáng tin ở thời điểm cài.

## Requirements

- FR-003: `.storybook/preview.tsx` import handler từ **chính** `mocks/handlers.ts` mà vitest dùng.
- BR-003: **không** viết handler `/auth/v1/authorize`. MSW không chặn được redirect top-level.
- Non-functional: `build-storybook` exit 0; `pnpm lint`/`format:check` xanh trên `.storybook/**`.

## Architecture

```
.storybook/main.ts
   framework  @storybook/nextjs-vite
   stories    ../components/**/*.stories.@(ts|tsx)
              ../app/**/*.stories.@(ts|tsx)
   addons     msw-storybook-addon
   staticDirs ../public          ← serve ảnh /login/* VÀ mockServiceWorker.js

.storybook/preview.tsx
   import "../app/globals.css"                  Tailwind v4, cùng entry app dùng
   import viMessages from "../messages/vi.json" resolveJsonModule đã bật sẵn
   initialize({ onUnhandledRequest: "warn" })   (nếu README xác nhận vẫn cần)
   loaders    [mswLoader]
   decorators NextIntlClientProvider locale="vi"
   parameters nextjs: { appDirectory: true }
              msw: { handlers }   ← từ ../mocks/handlers
```

`onUnhandledRequest` khác nhau có chủ ý: `"error"` ở Node (test phải fail khi gọi mạng lạ),
`"warn"` ở Storybook (một request lạ không đáng làm hỏng trang tài liệu).

## Related Code Files

**Tạo**
- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `public/mockServiceWorker.js` (sinh bởi `msw init`, **commit vào repo** — đúng convention MSW)

**Sửa / Xoá**: không có. `eslint.config.mjs` và `.prettierignore` đã được phase 03 chuẩn bị sẵn
2 dòng ignore (`storybook-static/**`, `public/mockServiceWorker.js`).

## Implementation Steps

1. **Đọc README trước khi viết code** (câu #2):
   ```bash
   sed -n '1,120p' node_modules/msw-storybook-addon/README.md
   ls node_modules/msw-storybook-addon/dist/
   ```
   Xác định: subpath `msw-storybook-addon/csf3` có tồn tại không · `initialize()` còn cần gọi
   không · `mswLoader` export ở đâu. Ghi kết luận vào doc comment đầu `preview.tsx`.
2. `pnpm dlx msw init public --save` → sinh `public/mockServiceWorker.js`. Kiểm nó KHÔNG bị
   `.gitignore` nuốt (`git check-ignore -v public/mockServiceWorker.js` phải exit 1).
3. Viết `.storybook/main.ts` theo § Architecture. `framework` khai tường minh, không auto-detect.
4. Viết `.storybook/preview.tsx` theo § Architecture, dùng đúng API mà bước 1 xác nhận.
5. `pnpm build-storybook` — exit 0. 0 story là bình thường (Storybook cảnh báo, không fail).
6. `pnpm storybook` — mở `http://localhost:6006`, DevTools Network phải thấy
   `mockServiceWorker.js` trả 200, console có dòng MSW "Mocking enabled". Tắt server.
7. Cửa xanh (`pnpm lint` giờ có quét `.storybook/**` — sửa lỗi type/import nếu có, đừng tắt rule).

## Todo List

- [x] Đọc `node_modules/msw-storybook-addon/README.md`, chốt API surface (câu #2)
- [x] `pnpm dlx msw init public --save`, verify không bị gitignore
- [x] `.storybook/main.ts` — framework tường minh + `staticDirs`
- [x] `.storybook/preview.tsx` — globals.css, next-intl decorator, mswLoader, handlers dùng chung
- [x] `pnpm build-storybook` exit 0
- [x] Xác nhận thủ công `mockServiceWorker.js` trả 200 và MSW bật
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm build-storybook                                  # exit 0
test -f public/mockServiceWorker.js                   # exit 0
git check-ignore -v public/mockServiceWorker.js       # exit 1 (KHÔNG bị ignore)
grep -q 'staticDirs' .storybook/main.ts               # exit 0
grep -q 'mocks/handlers\|\.\./mocks' .storybook/preview.tsx   # exit 0 — FR-003 nửa browser
grep -c 'auth/v1/authorize' .storybook/preview.tsx    # 0 — BR-003
pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck  # exit 0
```

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| API `msw-storybook-addon@3.0.0` khác tài liệu (câu #2) | **Cao** — major mới, đang giữa migration CSF-Next | Trung bình | Bước 1 đọc README của package đã cài, trước khi viết dòng nào |
| 4 major mới chồng nhau (Storybook 10 · Next 16 · addon 3 · Vite) → lỗi chưa có tài liệu | **Cao** (RISK-01 của spec) | Cao | Đã dành riêng thời lượng; nếu vỡ ở framework thì đường lùi là `@storybook/nextjs` (webpack), ghi rõ lý do khi chuyển |
| Tailwind v4 không load, story không có style | Trung bình | Trung bình | Bước 6 kiểm mắt thường; nếu trắng trơn, kiểm `postcss.config.mjs` có được Vite đọc không — KHÔNG đổi sang `@tailwindcss/vite` |
| `pnpm lint` đỏ trên `.storybook/**` (type-checked overlay) | Trung bình | Thấp | `tsconfig.json` include `**/*.ts(x)` nên parse được; sửa type cho đúng thay vì thêm exception |
| `format:check` đỏ vì `storybook-static/` sau bước 5 | Trung bình | Thấp | Phase 03 đã thêm vào `.prettierignore`; nếu vẫn đỏ thì dòng đó chưa đúng |
| Quên `staticDirs` → ảnh 404, MSW browser chết | Trung bình | Cao | Là success criteria, có `grep` kiểm |

## Security Considerations

- `mockServiceWorker.js` được serve từ `public/` nên **cũng vào bundle production**. Đó là file
  chuẩn của MSW, chỉ hoạt động khi có script gọi `worker.start()` — app không gọi, nên nó nằm im.
  Không tự ý thêm bất kỳ đoạn khởi động MSW nào vào `app/layout.tsx`.
- `preview.tsx` **không** được chứa URL hay key Supabase thật — handler đọc từ env như phase 03.
- `onUnhandledRequest: "warn"` chỉ áp cho Storybook. Không hạ mức của runtime Node xuống theo.

## Next Steps

Mở khoá phase 08 (story common component) và 09 (tách `TodoScreen` + story route) — chạy song
song được.
