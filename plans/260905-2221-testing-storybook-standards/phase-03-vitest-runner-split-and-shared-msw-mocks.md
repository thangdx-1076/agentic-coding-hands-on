# Phase 03 — Tách runner vitest + MSW dùng chung

## Context Links

- [`plan.md`](./plan.md) · Spec: A1 (§ 3.1), A2 (§ 3.2) của [`technical-spec.md`](./spec/testing-storybook-standards/technical-spec.md)
- [`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md) § Q3, § Full proposed vitest.config.ts
- [`storybook-msw-setup`](../reports/researcher-260905-2221-storybook-msw-setup.md) § Q4
- Giải câu chưa chốt § 5.3 **#5** (`setupFiles` root hay per-project)

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1h · **Depends on**: 02

Dựng hạ tầng để 3 phase test (04, 05, 06) chạy song song được. Phase này KHÔNG viết test nào,
và KHÔNG bật ngưỡng coverage.

## Key Insights

- **`environmentMatchGlobs` đã deprecated từ vitest v3** — dùng `test.projects` (ổn định từ
  3.2, repo pin 3.2.7, đã qua lần đổi tên từ `workspace`).
- **`coverage` và `resolve.alias` chỉ khai ở ROOT được**, 2 project kế thừa qua `extends: true`.
  Một báo cáo, một exit code — đúng thứ cần.
- **Widen `coverage.include` ngay bây giờ nhưng KHÔNG đặt `thresholds`.** Không có threshold
  thì `test:unit:coverage` in ra ~50% rồi exit 0 — vô hại, mà lại thành đồng hồ đo tiến độ
  thật cho phase 04/05/06. Ngưỡng bật ở phase 10.
- **`setupFiles` đặt ở ROOT** (câu #5, chốt tại đây). MSW patch tầng `http`/`fetch` của Node,
  nằm dưới mọi DOM shim → môi trường-bất-khả-tri. Đặt ở root còn có lợi phụ: một hook test lỡ
  bắn request thật cũng fail ngay thay vì lọt ra mạng.
- **Cần `test.env`.** Phase 06 sẽ chạy `@supabase/ssr` THẬT qua MSW, nên `NEXT_PUBLIC_SUPABASE_URL`
  phải có giá trị xác định trong test và **`mocks/handlers.ts` phải đọc đúng biến đó** — một
  nguồn duy nhất, không hardcode 2 nơi.
- **`public/mockServiceWorker.js` sẽ làm `pnpm lint` đỏ** nếu không ignore: eslint chạy `eslint`
  không tham số → quét cả `public/`, mà `globalIgnores` hiện không có `public/`. Đây là lỗi
  Day-1 chưa ai ghi trong report — file do MSW sinh, không ai sửa tay, phải ignore.
- **`storybook-static/` sẽ làm `pnpm format:check` đỏ**: `.prettierignore` chưa có nó, prettier
  sẽ quét hàng nghìn file JS sinh ra sau `build-storybook`.

## Requirements

- FR-003: một module handler MSW duy nhất, 2 runtime cùng import.
- A1: 2 project `node` / `jsdom`, một exit code.
- Non-functional: `pnpm test:unit` vẫn xanh với đúng 5 file test đang có.

## Architecture

```
vitest.config.ts (ROOT)
├─ resolve.alias        @/ → repo root        ─┐
├─ test.env             SUPABASE_URL + KEY     ├─ cả 2 project kế thừa (extends: true)
├─ test.setupFiles      tests/setup/msw-node.ts┤
├─ test.coverage        allowlist, CHƯA có threshold ─┘
└─ test.projects
   ├─ node   → lib/**/*.test.ts, app/**/*.test.ts
   └─ jsdom  → hooks/**/*.test.ts

mocks/handlers.ts  ──┬──> mocks/node.ts ──> tests/setup/msw-node.ts  (runtime Node, phase 03)
                     └──> .storybook/preview.tsx                     (runtime browser, phase 07)
```

Data flow của MSW ở runtime Node: `beforeAll` → `server.listen({onUnhandledRequest:"error"})`
→ mọi `fetch`/`http` trong process bị chặn → `afterEach` `resetHandlers()` (huỷ override của
từng test) → `afterAll` `close()`.

## Related Code Files

**Tạo**
- `mocks/handlers.ts` — handler dùng chung: `POST /auth/v1/token`, `GET /auth/v1/user`, `POST /auth/v1/logout`
- `mocks/node.ts` — `setupServer(...handlers)` từ `msw/node`
- `tests/setup/msw-node.ts` — vòng đời `beforeAll`/`afterEach`/`afterAll`

**Sửa**
- `vitest.config.ts` — **sở hữu MỌI key TRỪ `coverage.thresholds`** (phase 10 sở hữu key đó)
- `eslint.config.mjs` — widen scope vitest plugin + 3 dòng `globalIgnores`
- `.prettierignore` — thêm `storybook-static`

**Xoá**: không có.

## Implementation Steps

1. Viết `vitest.config.ts` theo shape của report § "Full proposed vitest.config.ts", **bỏ dòng
   `thresholds`**, và thêm `test.env`:
   ```ts
   env: {
     NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
   },
   setupFiles: ["./tests/setup/msw-node.ts"],
   ```
   Giữ nguyên comment giải thích alias đã có (nó ghi lại một bug thật), viết lại comment coverage
   cho khớp allowlist mới, ghi rõ: *không có glob `.tsx` nào — đó chính là cơ chế loại
   `components/**` và `app/**/page.tsx`, không phải một exclude list phải bảo trì.*
2. `mocks/handlers.ts`: đọc `process.env.NEXT_PUBLIC_SUPABASE_URL` (fallback
   `"http://127.0.0.1:54321"`), export `handlers`. Không viết handler cho
   `/auth/v1/authorize` — BR-003, MSW không chặn được redirect top-level.
3. `mocks/node.ts` + `tests/setup/msw-node.ts` theo report § Q4.
4. `eslint.config.mjs` — 2 sửa đổi:
   ```diff
   - files: ["lib/**/*.test.ts"],
   + files: ["lib/**/*.test.ts", "hooks/**/*.test.ts", "app/**/*.test.ts"],
   ```
   và thêm vào `globalIgnores`: `"storybook-static/**"`, `"public/mockServiceWorker.js"`.
5. `.prettierignore` — thêm `storybook-static` (ngay dưới `coverage`). `public/` đã có sẵn.
6. Chạy `pnpm test:unit` — phải thấy 2 project chạy (`node`, `jsdom`), 5 file cũ vẫn pass,
   project `jsdom` báo "no test files" là bình thường ở phase này.
7. `pnpm test:unit:coverage` — exit **0**, con số thấp (~50%), bảng phải liệt kê cả `hooks/**`
   và `app/actions/**` ở 0%. Nếu chúng KHÔNG xuất hiện trong bảng thì allowlist sai.
8. Cửa xanh.

## Todo List

- [x] `vitest.config.ts`: `projects` node/jsdom, alias, env, setupFiles, coverage allowlist (KHÔNG thresholds)
- [x] `mocks/handlers.ts` đọc env, 3 handler
- [x] `mocks/node.ts`
- [x] `tests/setup/msw-node.ts` (`onUnhandledRequest: "error"`)
- [x] eslint: widen vitest glob + 2 globalIgnores
- [x] `.prettierignore`: `storybook-static`
- [x] Xác nhận bảng coverage có `hooks/**` và `app/**` ở 0%
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm test:unit                       # exit 0, output có cả "node" và "jsdom"
pnpm test:unit:coverage              # exit 0 (chưa có threshold), bảng liệt kê hooks/** ở 0%
pnpm test:unit:coverage 2>&1 | grep -q "use-login-actions.ts"   # exit 0 — allowlist đúng
pnpm lint --max-warnings 0 && pnpm format:check && pnpm build && pnpm typecheck   # exit 0
```

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Alias `@/` gãy sau khi tách `projects` | Thấp (report đã verify thực nghiệm) | Cao — mọi test đỏ | `pnpm test:unit` ở bước 6 là bằng chứng: 5 file cũ dùng alias, còn pass là còn đúng |
| `setupFiles` ở root làm project `jsdom` chậm/lỗi | Thấp | Trung bình | Nếu đỏ, hạ xuống chỉ project `node` và ghi lại — đây là đúng câu #5, quyết định có đường lùi |
| `onUnhandledRequest: "error"` làm test cũ đỏ vì request bất ngờ | Thấp (test cũ mock hết) | Trung bình | Bước 6 phát hiện ngay; nếu có, thêm handler thật vào `mocks/handlers.ts`, KHÔNG hạ xuống `"warn"` để giấu |
| `mocks/**` và `tests/setup/**` bị `recommendedTypeChecked` bắt lỗi | Trung bình | Thấp | `tsconfig.json` include `**/*.ts` nên `projectService` parse được; sửa type cho đúng, không tắt rule |
| Widen `coverage.include` khiến ai đó tưởng repo đang hỏng | Trung bình | Thấp | Comment trong `vitest.config.ts` nói rõ ngưỡng bật ở phase 10 |

## Security Considerations

- `test.env` chỉ chứa placeholder (`127.0.0.1:54321`, `test-publishable-key`) — **không bao giờ**
  điền giá trị thật của `saa-app` vào đây, file này commit lên repo.
- `onUnhandledRequest: "error"` là một lớp bảo vệ thật: test không thể vô tình gọi ra
  Supabase/Google thật.
- `mocks/handlers.ts` trả token giả (`"mock-token"`) — không được copy token thật vào.

## Next Steps

Mở khoá phase 04, 05, 06 — ba phase chạy song song, file ownership rời nhau hoàn toàn.
Phase 10 sẽ thêm đúng một key `coverage.thresholds` vào file này.
