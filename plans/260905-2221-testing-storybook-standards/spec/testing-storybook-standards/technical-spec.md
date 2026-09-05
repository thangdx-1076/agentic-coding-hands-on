---
status: draft
authored_by: takumi
created: 2026-09-05
lang: vi
---

# F000_TestingStorybookStandards

**Priority**: P1
**Type**: background
**Generated**: 2026-09-05

**See also:** [`functional-spec.md`](./functional-spec.md) — tổng quan bằng ngôn ngữ tự nhiên, Open
Decisions, yêu cầu/rule phát biểu 1 dòng, user story, scenario, edge case cho độc giả BA/QA.

## 1. Technical Overview

Chuẩn này enforce qua CI: mọi file logic layer (`hooks/**`, `lib/**`, Server Action/Route Handler
chỉ định) phải có unit test co-located và coverage đạt 100%; common component phải có Storybook
story; mỗi route chính có đúng 1 story dựng từ component trình bày của route đó; và một module MSW
dùng chung mock API cho cả 2 runtime (Node/vitest, browser/Storybook). Không có API endpoint hay
data model mới — feature này thay đổi cấu hình test/tooling (`vitest.config.ts`, `.storybook/`,
`mocks/`) và bổ sung test/story còn thiếu cho code đã tồn tại của F001/F002.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — phân loại file nào là logic layer / component nào là common* | — | FR-001 | — | § 4.4 |
| **A1** | `` `pnpm test:unit:coverage` `` | — | FR-001, FR-002, BR-001, US001 | — *(read-only)* | § 3.1 |
| **A2** | `` `setupServer` `` (mocks/node.ts) *(background, no FE)* | — | FR-003, BR-003, US002 | — *(mock, không ghi DB thật)* | § 3.2 |
| **A3** | `` `*.stories.tsx` `` (CSF3, common component) | — | FR-004, BR-002, US003 | — | § 3.3 |
| **A4** | `` `*.stories.tsx` `` (CSF3, route chính) | — | FR-005, US004 | — | § 3.3 |

## 3. Actions

### 3.1 CAP-01 — Kiểm thử tự động cho logic layer

#### A1 · Chạy toàn bộ unit test co-located, chặn merge nếu coverage dưới 100%
`` `pnpm test:unit:coverage` `` → `` `vitest run --coverage` ``
`FR-001` `FR-002` `BR-001` `US001`

**Who** · Developer, qua CI — không thao tác tay *(gate A0 — § 4.4)*
**BE** · `vitest.config.ts`'s `test.projects` chạy 2 project trong 1 lần gọi: `node`
(`lib/**/*.test.ts`, `app/**/*.test.ts`) và `jsdom` (`hooks/**/*.test.ts`, do hook cần
`document`/focus/keyboard). `test.coverage.include` là allowlist tường minh (`lib/**/*.ts`,
`hooks/**/*.ts`, `app/actions/**/*.ts`, `app/todo/actions.ts`, `app/auth/callback/route.ts`) với
`thresholds: {100: true}`.
**Rule** · **BR-001 — Component UI thuần được miễn khỏi allowlist này.** *(§ 4.4)* File nào rơi
vào allowlist mà thiếu test co-located, hoặc có test nhưng chưa phủ hết nhánh, đều làm bước này
fail — không riêng gì tổng trung bình, mà từng file/nhánh trong allowlist đều phải đạt 100%.
**Result** · CI dừng ở bước này (exit code khác 0) nếu bất kỳ file/nhánh nào trong allowlist dưới
100%, kể cả khi mọi test đều pass (test pass nhưng thiếu 1 nhánh vẫn fail coverage).
**Source:** TBD (draft)

<!-- Không diagram: read-only, không ghi DB, không phải job nền có nhánh phức tạp — dưới ngưỡng. -->

---

### 3.2 CAP-02 — Lớp mock API dùng chung

#### A2 · Cả 2 runtime cùng đọc một module handler MSW
*(background, no FE — không có actor người, chạy tự động khi test/Storybook khởi động)*
`FR-003` `BR-003` `US002`

**Who** · *không có actor người — MSW khởi động tự động theo lifecycle của test runner/Storybook*
**FE** · `.storybook/preview.tsx` gọi `initialize()` (`msw-storybook-addon/csf3`) và đăng ký
`mswLoader` — worker trình duyệt (`public/mockServiceWorker.js`, generated, commit vào repo) chặn
request ở tầng Service Worker.
**BE** · `tests/setup/msw-node.ts` (một vitest `setupFiles`) gọi `setupServer(...handlers)` từ
`mocks/node.ts` — chặn request ở tầng `http`/`fetch` của Node, không cần jsdom.
**Rule** · **BR-003 — MSW chỉ chặn được lệnh gọi mạng thật (fetch/XHR), nên có tác dụng thật ở
runtime Node.** *(§ 4.4)* `signInWithOAuth` là redirect top-level của trình duyệt, không phải lệnh
gọi mạng — MSW không chặn được nó dù ở runtime nào; story mô phỏng bấm nút đăng nhập phải mock qua
prop callback (`onLoginClick`), không qua handler MSW.
**Result** · Test/story chạy được mà không cần một Supabase instance thật đang sống; sửa 1 handler
trong `mocks/handlers.ts` thì cả 2 runtime cùng thấy thay đổi ngay, không cần sửa 2 nơi.
**Source:** TBD (draft)

<!-- Không diagram: không ghi DB, không phải job nền — chỉ là 1 module dùng chung được 2 nơi import. -->

---

### 3.3 CAP-03 — Tài liệu sống cho common component & route chính

#### A3 · Story cho common component
`` `*.stories.tsx` `` (CSF3) → phát hiện bởi `.storybook/main.ts`'s `stories` glob
`FR-004` `BR-002` `US003`

**Who** · Developer (tác giả component) và Reviewer (người xem story khi review)
**FE** · `.storybook/main.ts`'s `stories: ["../components/**/*.stories.@(ts|tsx)", ...]` tự phát
hiện file story co-located cạnh component — không cần đăng ký thủ công từng story.
**Rule** · **BR-002 — Ranh giới "common".** *(§ 4.4)* Component nhận toàn bộ dữ liệu qua props,
không import copy/dữ liệu đặc thù tính năng hay `app/`, và không lắp ghép ≥2 component khác đã đặt
tên (icon không tính) → bắt buộc có story. Thiếu 1 điều kiện → composition, KHÔNG bắt buộc.
**Result** · Common component xem được trong Storybook với đúng props/variant chính, không cần
chạy dev server hay đăng nhập.
**Source:** TBD (draft)

<!-- Không diagram: render tĩnh, không nhánh, không ghi DB. -->

---

#### A4 · Story cho route chính
`` `*.stories.tsx` `` (CSF3, route) → phát hiện bởi `.storybook/main.ts`'s `stories` glob
`FR-005` `US004`

**Who** · Reviewer (xem UI route khi review PR, không cần đăng nhập Google)
**FE** · Story dựng từ component TRÌNH BÀY (presentational) của route, không từ Server Component
bất đồng bộ trực tiếp (Storybook không render được `async` Server Component — xem § 5.3 #1 ở
report gốc; đây là lý do cấu trúc, không phải giới hạn tạm thời).
**Rule** · Route có render UI trình bày thật (khác `/`, vốn chỉ `redirect()`, không JSX nào) →
bắt buộc đúng 1 story dựng từ component trình bày của route đó; route chưa có component trình bày
tách riêng (như `/todo`, JSX hiện nằm inline trong Server Component) phải tách ra trước khi có
story.
**Result** · Route chính xem được trong Storybook mà không cần chạy dev server, đăng nhập Google,
hay một Supabase instance thật đang sống.
**Source:** TBD (draft)

<!-- Không diagram: render tĩnh, không nhánh, không ghi DB. -->

### 3.4 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | File mới trong allowlist thiếu test co-located | CI fail ở bước `test:unit:coverage`, không merge được |
| A1 | File mới trong allowlist có test nhưng chưa phủ hết nhánh | Coverage dưới 100% dù mọi test đều pass, CI fail |
| A2 | Hai handler MSW trùng path/method | Handler đăng ký sau ghi đè handler trước (thứ tự `use()`), không có cảnh báo trùng lặp |
| A3 · A4 | Component vừa lắp ghép ≥2 component khác vừa prop-driven (vd. `LoginHeader` lắp `LanguageSelector`) | Tính composition theo BR-002, không bắt buộc story dù các điều kiện khác đều thoả |
| A4 | Route chỉ `redirect()`, không render UI nào (route `/` hiện tại) | Không bắt buộc story cho route này — FR-005 chỉ áp dụng route có UI trình bày thật |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| vitest `projects` config | Chia 2 runtime test (`node`, `jsdom`) và định nghĩa allowlist + threshold coverage | A1 | `vitest.config.ts` |
| Shared MSW handlers | Danh sách handler mock API dùng chung cho cả 2 runtime | A2 | `mocks/handlers.ts` |
| MSW Node setup | Khởi động `setupServer` cho runtime Node (vitest) | A2 | `mocks/node.ts`, `tests/setup/msw-node.ts` |
| Storybook config | Story glob, addon MSW, decorator next-intl | A2, A3, A4 | `.storybook/main.ts`, `.storybook/preview.tsx` |

### 4.2 Data Model

#### Key Entities

| Entity | Table | Key Columns | Purpose |
|--------|-------|-------------|---------|

*Không có hàng nào — chuẩn này không định nghĩa entity/bảng/persistence mới (xem
`functional-spec.md § 1` Non-Scope). Các entity Supabase mà test mới sẽ mock (session, user) đã
thuộc phạm vi F001_GoogleOAuthLogin, không thuộc feature này.*

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None.

### 4.4 Shared Rules

*Không có Bin 2 — không BR nào trong feature này được dùng bởi ≥2 action; cả 3 BR đều Bin 1, đã
phát biểu đầy đủ + gloss inline ở rung Rule của action sở hữu (§ 3.1/§ 3.2/§ 3.3 ở trên).*

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · Ranh giới "logic layer" (file nào cần test) dựa trên phân lớp 3 tầng đã có sẵn.**
Áp dụng cho cả 4 action — mọi file rơi vào `lib/**`, `hooks/**`, `app/actions/**` (+ 2 file chỉ
định) đã đi qua ranh giới lib/hooks/component do skill nội bộ tách hook-khỏi-component định nghĩa
từ trước (không tạo ranh giới lớp mới); chuẩn này chỉ THÊM yêu cầu test co-located + coverage LÊN
TRÊN ranh giới sẵn có đó — component (`.tsx`) không nằm trong allowlist test vì đã bị phân lớp
"trình bày" từ trước, không phải một miễn trừ riêng của chuẩn này.
**Source:** TBD (draft)

### 4.5 Algorithms & Integrations

None.

### 4.6 Configuration

```text
COVERAGE_THRESHOLD = 100                     # % tối thiểu statements/branches/functions/lines (vitest.config.ts coverage.thresholds)
MSW_ON_UNHANDLED_REQUEST_NODE = "error"       # vitest: request không khớp handler nào -> fail test ngay, không lọt qua mạng thật
MSW_ON_UNHANDLED_REQUEST_STORYBOOK = "warn"   # Storybook: chỉ cảnh báo console, không chặn story render
```

**Client behavior:** xem `docs/vi/generated/behavior-logic.md`, `docs/vi/system/permissions.md`,
`docs/vi/system/architecture.md` — feature này không có client behavior/permission/architecture
riêng để bổ sung (thuần dev tooling, không chạm runtime production).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* CI fail (exit ≠ 0) khi coverage của allowlist dưới 100% — verify bằng cách cố
  tình bỏ 1 nhánh test và chạy `pnpm test:unit:coverage`, phải thấy fail. (covers FR-001, FR-002)
- **SC-002** *(A2)* Test gọi hàm exchange-code/getUser/signOut không phát sinh request nào ra mạng
  thật — verify bằng cách chạy `pnpm test:unit` khi tắt mạng, test liên quan Supabase vẫn pass.
  (covers FR-003)
- **SC-003** *(A3, A4)* `build-storybook` thoát mã 0 và liệt kê đủ story cho common component +
  route chính. (covers FR-004, FR-005)

#### US001_CoLocatedCoverage *(A1)*

**Independent Test:** Xoá test của 1 file trong allowlist, chạy `pnpm test:unit:coverage`, xác
nhận exit code khác 0.

**Acceptance Scenarios:**
1. **Given** file mới trong allowlist có test co-located phủ hết nhánh, **When** CI chạy
   `test:unit:coverage`, **Then** exit code = 0.
2. **Given** file mới trong allowlist thiếu test hoặc thiếu 1 nhánh, **When** CI chạy
   `test:unit:coverage`, **Then** exit code ≠ 0.

#### US002_SharedMswMocks *(A2)*

**Independent Test:** Chạy `pnpm test:unit` khi mạng bị chặn cục bộ, xác nhận test liên quan
Supabase vẫn pass nhờ handler MSW.

**Acceptance Scenarios:**
1. **Given** handler MSW trả thành công cho endpoint exchange-code, **When** test gọi hàm đó,
   **Then** test pass mà không cần Supabase thật.

#### US003_CommonComponentStory *(A3)*

**Independent Test:** Chạy `build-storybook`, xác nhận story của common component xuất hiện
trong output, không lỗi build.

**Acceptance Scenarios:**
1. **Given** component đạt ranh giới common (BR-002), **When** build Storybook, **Then** story
   tương ứng render không lỗi.

#### US004_MainRouteStory *(A4)*

**Independent Test:** Chạy `build-storybook`, xác nhận đúng 1 story cho `/login` và 1 story cho
`/todo` xuất hiện trong output.

**Acceptance Scenarios:**
1. **Given** `/login` đã có component trình bày prop-driven sẵn, **When** build Storybook,
   **Then** story `/login` render đúng giao diện mặc định (copy vi).

### 5.2 Assumptions

- *(A1)* Giả định `vitest.config.ts` hiện tại (1 environment `node`, không threshold) được THAY
  bằng shape mới (`projects` + allowlist + threshold) trong cùng lần triển khai — không chạy song
  song 2 config.
- *(A2)* Giả định `public/mockServiceWorker.js` (sinh ra cho worker trình duyệt) được commit vào
  repo theo đúng convention của MSW, không sinh lại mỗi lần cài đặt.
- *(A3, A4)* Giả định máy dev local chạy Node ≥22.12 (yêu cầu chính thức của Storybook 10); CI đã
  dùng Node 24 nên không bị ảnh hưởng.

### 5.3 Unresolved Questions

1. **Framework Storybook tự chọn** *(A3, A4)*: `storybook init` tự chọn `@storybook/nextjs-vite`
   hay `@storybook/nextjs` (webpack) cho dự án Next 16 App Router dùng Turbopack, không custom
   webpack config? Nguồn tham khảo mâu thuẫn nhau (đa số bài viết có trước Storybook 10). Giảm
   thiểu: chỉ định `--framework=@storybook/nextjs-vite` tường minh, không dựa auto-detect. *(nguồn:
   researcher-260905-2221-storybook-msw-setup.md)*
2. **API bề mặt chính xác của `msw-storybook-addon@3.0.0`** *(A2, A3, A4)*: đăng ký
   `addons: ["msw-storybook-addon"]` trong `main.ts` có tự quản lý luôn việc khởi động worker hay
   vẫn cần gọi `initialize()` riêng? Nguồn không thống nhất hoàn toàn — cần xác nhận lại với
   README của package thật tại thời điểm cài đặt. *(nguồn:
   researcher-260905-2221-storybook-msw-setup.md)*
3. **Major Vite thực tế pnpm resolve** *(A3, A4)*: peer range `^5||^6||^7||^8` chưa biết pnpm sẽ
   chọn bản nào — không chặn công việc, chỉ cần biết trước để debug sau này nếu có sự cố. *(nguồn:
   researcher-260905-2221-storybook-msw-setup.md)*
4. **`NextResponse.redirect()` có độc lập với request-context hay không** *(A1)*: chưa xác nhận
   được với tài liệu Next 16 đi kèm repo (đường dẫn tài liệu bị chặn đọc trong môi trường nghiên
   cứu) — ảnh hưởng độ tin cậy của shape test mock cho route callback OAuth. Khuyến nghị:
   smoke-test thủ công trước khi tin vào shape test này. *(nguồn:
   researcher-260905-2221-vitest-hooks-coverage.md)*
5. **Phạm vi `setupFiles` của MSW trong `vitest.config.ts`** *(A2)*: đặt ở ROOT (áp cho cả project
   `node` lẫn `jsdom`) hay chỉ ở project `node`? Report gốc chưa quyết — cần xác nhận trước khi
   wiring, dù đặt ở ROOT nhiều khả năng vô hại (MSW patch ở tầng Node `http`/`fetch`, không đụng
   jsdom). *(nguồn: researcher-260905-2221-vitest-hooks-coverage.md)*

### 5.4 Source References

Chưa có code triển khai cho chuẩn này — `vitest.config.ts` hiện tại vẫn ở shape cũ (1 environment,
không threshold), `.storybook/` và `mocks/` chưa tồn tại. Xem `functional-spec.md § 7 User
Stories` cho hành vi dự kiến. Các file ĐÃ tồn tại hôm nay và sẽ được đưa vào allowlist coverage
(mục tiêu, không phải nguồn của RULE này): 2 hook (`hooks/use-login-actions.ts`,
`hooks/use-menu-keyboard-nav.ts`), 3 factory Supabase (`lib/supabase/client.ts`,
`lib/supabase/server.ts`, `lib/supabase/proxy-client.ts`), và 3 Server Action/Route Handler
(`app/actions/locale.ts`, `app/todo/actions.ts`, `app/auth/callback/route.ts`). Các component ứng
viên "common" hôm nay (theo BR-002 — xem § 3.3): `GoogleLoginButton`, `LanguageSelector`,
`LoginErrorAlert`, `LoginFooter`, và 3 icon trong `components/login/icons/`.

#### Data Flow

```text
Không có request/response data flow — cả 4 action của feature này là cấu hình test/tooling (chạy
test, mock API cho test, render Storybook), không xử lý dữ liệu nghiệp vụ nào của riêng nó.
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [overview.md](../../../../docs/vi/system/overview.md) | — | [ ] |
| Architecture | [architecture.md](../../../../docs/vi/system/architecture.md) | — | [ ] |
| Feature List | [feature-list.md](../../../../docs/vi/generated/feature-list.md) | F000 *(draft, chưa cấp mã thật)* | [ ] |
| API Map | [api-map.md](../../../../docs/vi/generated/api-map.md) | — *(không có API endpoint mới)* | [ ] |
| Entities | [entities.md](../../../../docs/vi/generated/entities.md) | — *(không có data model mới)* | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | — *(N/A, background feature)* | [ ] |
| Behavior Logic | [behavior-logic.md](../../../../docs/vi/generated/behavior-logic.md) | — | [ ] |
| Permissions Matrix | [permissions-matrix.md](../../../../docs/vi/generated/permissions-matrix.md) | — | [ ] |
| User Stories | [user-stories.md](../../../../docs/vi/generated/user-stories.md) | — *(US001-US004 ở đây là mã cục bộ của feature này, chưa đăng ký vào inventory toàn project)* | [ ] |
