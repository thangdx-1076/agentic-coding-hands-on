---
status: implemented
authored_by: takumi
fcode: F011
created: 2026-09-08
lang: vi
---

# F011_CountdownPrelaunchPage

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-08

**See also:** [`functional-spec.md`](./functional-spec.md) — overview, open decisions, requirements/business rules, screens, user stories, scenarios, edge cases, cấu hình.

**How to read this file:** § 2 là index; § 4 là appendix dùng chung — chỉ nhảy vào khi § 3 trỏ tới.

## 1. Technical Overview

Màn `/prelaunch` (Server Component, PUBLIC) hiển thị đếm ngược tới `EVENT_START_AT`, tái dùng 100% logic tính toán/tick/render đã có ở trang chủ (nâng cấp thành shared: `src/components`, `src/hooks`, `src/utils`). Phần mới duy nhất là mở rộng edge guard `src/proxy.ts` để khoá điều hướng toàn site về `/prelaunch` khi cờ `PRELAUNCH_LOCK_ENABLED` bật và đếm ngược chưa về 0. Feature đầu tiên của repo KHÔNG chạm Supabase — toàn bộ trạng thái tính từ 2 biến môi trường.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | `FR-601` | — | § 4.4 |
| **A1** | `PrelaunchPage` (Server Component) | `GET` `/prelaunch` | `FR-001, FR-002, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-401, BR-004, US001` | — *(read-only)* | § 3.1 |
| **A2** | `proxy` (edge guard, mở rộng) | `*` mọi route khớp matcher, trừ ngoại lệ | `FR-102, FR-103, BR-001, BR-002, BR-003, BR-005, DEC-001, US002` | — *(read-only)* | § 3.2 |

## 3. Actions

### 3.1 CAP-01 — Hiển thị màn Countdown Prelaunch

#### A1 · Hiển thị đếm ngược trên nền sự kiện
`GET` `/prelaunch` → `` `PrelaunchPage` (Server Component) ``
`FR-001` `FR-002` `FR-101` `FR-201` `FR-202` `FR-203` `FR-204` `FR-205` `FR-206` `FR-401` · `US001` · `SCR009_CountdownPrelaunch`

**Who** · Bất kỳ ai, đã đăng nhập hay chưa — không gate nào *(gate A0 — § 4.4, `FR-601`)*.
**FE** · `PrelaunchPage` render nền full-bleed + lớp phủ tối tĩnh, tiêu đề i18n `prelaunch.title`, và `CountdownTiles` (tái dùng `src/components/countdown-tiles.tsx`) qua `useCountdown` (tái dùng `src/hooks/use-countdown.ts`) — tick 1s phía client, seed từ `initialNowMs` server (cùng pattern trang chủ, hydration khớp SSR).
**Request** · không tham số — đọc `EVENT_START_AT` phía server tại render time.
**BE** · `resolveTargetIso()` (cùng pattern `(home)/page.tsx`) đọc `process.env.EVENT_START_AT`, validate qua `parseTargetDate` (tái dùng `src/utils/countdown.ts`); thiếu/hỏng → `null`, không throw (`FR-002`).
**Rule** · Không có nhánh hiển thị khác nhau theo actor — nội dung giống nhau cho mọi visitor; xem A2 cho nhánh quyết định điều hướng.
**Result** · Read-only, không ghi DB. `remaining()`/`pad2()` tính days/hours/minutes zero-pad — **BR-004 — Giá trị ÂM clamp về `00`; `pad2()` chỉ pad LÊN, không cắt bớt, nên days ≥ 100 hiển thị đủ `120` chứ không clamp.** Hàm thuần, không I/O, đã có unit test 100% coverage.
**Source:** TBD (draft)

<!-- No diagram: read-only, single render path, below threshold. -->

---

### 3.2 CAP-02 — Khoá điều hướng toàn site trước giờ sự kiện

#### A2 · Chặn điều hướng khi cờ khoá bật và chưa tới giờ
`*` mọi route khớp `config.matcher`, trừ ngoại lệ → `` `proxy` `` (`src/proxy.ts`, mở rộng)
`FR-102` `FR-103` `DEC-001` · `US002`

**Who** · Ban tổ chức (vận hành) thiết lập `PRELAUNCH_LOCK_ENABLED`; áp dụng cho MỌI visitor, không phân biệt đã đăng nhập.
**FE** · Không có UI riêng — chặn ở tầng request TRƯỚC khi trang đích render; visitor thấy `/prelaunch` thay vì đích ban đầu.
**Request** · mọi request khớp `config.matcher` — đọc `pathname` để so khớp danh sách miễn khoá.
**BE** · `proxy` chạy nhánh khoá này TRƯỚC nhánh guard đăng nhập hiện có; tính `reached` bằng ĐÚNG `parseTargetDate`/`remaining` mà A1 dùng — không tính lại bằng cách khác (DRY).
**Rule** · Quyết định redirect theo 2 điều kiện AND cộng danh sách miễn khoá:

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | flow | `PRELAUNCH_LOCK_ENABLED === "true"` AND `!reached` AND pathname ∉ exempt list | redirect sang `/prelaunch`, giữ nguyên đích gốc không lộ ra URL | `src/domain/prelaunch-lock.ts:94-120` |
| — | — | pathname === `/prelaunch` AND (`reached` OR cờ tắt) | redirect `/` | TBD (draft) |
| — | — | mọi trường hợp khác | pass through | TBD (draft) |

- **BR-001 — Khoá chỉ kích hoạt khi cờ bật VÀ đếm ngược chưa về 0.** Mặc định TẮT — khoá riêng theo đếm ngược sẽ redirect toàn bộ 135 e2e test hiện có (`playwright.config.ts`/`.env.local` đều đặt `EVENT_START_AT` ở tương lai).
- **BR-002 — Miễn khoá: `/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh có phần mở rộng.** `/auth/*` miễn vì khoá sẽ hỏng OAuth callback; `/api/*` là route handler, không phải trang; `/_next/*`/file tĩnh loại ở `config.matcher`.
- **BR-003 — Khi đếm ngược đã về 0, khoá gỡ hoàn toàn dù cờ còn bật; vào `/prelaunch` lúc này bị đưa về `/`.**
- **BR-005 — Mở matcher không được kéo theo Supabase overreach.** `proxy()` chạy nhánh khoá TRƯỚC, không I/O. Route không thuộc whitelist cũ (`/`, `/login`, `/todo/*`, `/awards`, `/standards`, `/profile`) thì `return NextResponse.next()` ngay, KHÔNG gọi `getUserOrNull`. Hành vi của 6 route cũ giữ nguyên tuyệt đối. Thiếu ràng buộc này thì mọi route gánh thêm một round-trip `getUser()` — đúng cái "proxy overreach" comment trong `src/proxy.ts` ghi là đã loại bỏ.
**Result** · Read-only — không ghi DB, không đổi cookie ngoài cookie session/locale mà `proxy` hiện có đã ghi.
**Source:** TBD (draft)

<!-- No diagram: bảng DEC ở trên đã đủ thể hiện các nhánh; single decision path, below threshold. -->

### 3.3 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | `EVENT_START_AT` thiếu hoặc không parse được | 3 ô hiện `00`, không throw (`BR-004`, `FR-002`) |
| A1 | Đếm ngược về đúng 0 trong khi trang đang mở | 3 ô chuyển `00` tại chỗ, không cần reload (client tick, không phải server) |
| A2 | `PRELAUNCH_LOCK_ENABLED` tắt | Không route nào bị khoá, kể cả `/prelaunch` render bình thường |
| A2 | Gõ thẳng URL một route bị khoá, không qua link | Vẫn redirect `/prelaunch` — gate ở tầng request, không phải chỉ ẩn link |
| A2 | Vào `/prelaunch` sau khi đã tới giờ, cờ vẫn bật | Redirect `/` |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `PrelaunchPage` | Server Component render màn Countdown Prelaunch | A1 | `src/app/(public)/prelaunch/page.tsx` *(mới)* |
| `CountdownTiles` | 3 ô LED digit + label, tái dùng từ trang chủ | A1 | `src/components/countdown-tiles.tsx` *(nâng cấp từ `(home)/_components/`)* |
| `useCountdown` | Hook tick 1s, seed từ server, tái dùng | A1 | `src/hooks/use-countdown.ts` *(nâng cấp từ `(home)/_hooks/`)* |
| `countdown` (utils) | `parseTargetDate`/`remaining`/`pad2`, thuần, không I/O | A1, A2 | `src/utils/countdown.ts` *(nâng cấp từ `(home)/_utils/`)* |
| `proxy` | Edge guard — auth optimistic (có sẵn) + khoá điều hướng prelaunch (mở rộng) | A2 | `src/proxy.ts` |

### 4.2 Data Model

Không có bảng/entity Supabase nào — feature không đọc/ghi database. Toàn bộ trạng thái tính từ 2 biến môi trường (`EVENT_START_AT`, `PRELAUNCH_LOCK_ENABLED`).

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None. "Đã khoá"/"đã gỡ khoá" chỉ 2 giá trị, 1 chuyển tiếp một chiều — dưới ngưỡng `kind: ui` (cần ≥3 state HOẶC ≥2 transition); ở lại dạng `BR-001`/`DEC-001`, không cần SM-### riêng.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · `FR-601` — Feature này không có gate quyền nào ở bất kỳ action nào.** Không guard đăng nhập, không kiểm role, không dùng `(protected)/layout.tsx`. 4 test case ACCESSING của MoMorph (`68d82c58`, `e6a59553`, `1c266552`, `17aa9e0d`) là boilerplate tự sinh (`Sub_Category` = "Access control unspecified", `Expected_Result` = "---"/"as per application configuration") — chủ đích KHÔNG hiện thực, không suy ra luật phân quyền nào từ đó.
**Source:** TBD (draft)

#### Bin 2 — used by ≥2 named actions

Không có — không rule nào được dùng bởi ≥2 action trong feature này; `BR-004` chỉ A1 dùng, `BR-001`/`BR-002`/`BR-003`/`BR-005` chỉ A2 dùng.

### 4.5 Algorithms & Integrations

None. `remaining()`/`pad2()` là hàm thuần O(1) đã có sẵn (tái dùng, không phải thuật toán mới của feature này); không tích hợp bên ngoài nào (không API/webhook/queue).

### 4.6 Configuration

```text
EVENT_START_AT                       # đã có từ trang chủ, tái dùng nguyên trạng (A1)
PRELAUNCH_LOCK_ENABLED = "false"     # cờ mới; chỉ "true" mới bật khoá, giá trị khác coi là tắt (A2)
```

**Client behavior:** see [`behavior-logic.md`](../../../../../docs/generated/behavior-logic.md) (client-side patterns), [`permissions.md`](../../../../../docs/system/permissions.md) (feature flags / env gates), [`architecture.md`](../../../../../docs/system/architecture.md) (guards / deep-link / unsaved-changes).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* 3 ô hiển thị đúng zero-pad tối thiểu 2 chữ số; âm → `00`; days ≥ 100 giữ nguyên 3 chữ số (covers FR-204, BR-004)
- **SC-002** *(A1)* Tick mỗi giây không cần reload; về 0 cả 3 ô đọc `00` (covers FR-205, FR-206)
- **SC-003** *(A2)* Cờ tắt → không route nào bị khoá, kể cả `/prelaunch` (covers FR-102, BR-001)
- **SC-004** *(A2)* Cờ bật + chưa tới giờ → mọi route trừ ngoại lệ redirect `/prelaunch`; đã tới giờ → `/prelaunch` redirect `/` (covers FR-102, FR-103, DEC-001)

#### US001 *(A1)*

**Independent Test:** set `EVENT_START_AT` tương lai gần, mở `/prelaunch`, quan sát 3 ô giảm dần theo thời gian thực; set rỗng/hỏng, quan sát `00/00/00` không crash.
**Acceptance Scenarios:** (1) hợp lệ tương lai → 3 ô đúng, tick mỗi giây. (2) thiếu/hỏng → cả 3 ô `00`, không lỗi.

#### US002 *(A2)*

**Independent Test:** set `PRELAUNCH_LOCK_ENABLED=true` + `EVENT_START_AT` tương lai, gọi trực tiếp route ngoài whitelist (vd `/todo`) → xác nhận redirect `/prelaunch`; set `EVENT_START_AT` quá khứ → xác nhận không redirect và `/prelaunch` tự về `/`.
**Acceptance Scenarios:** (1) cờ bật, chưa tới giờ → route ngoài whitelist redirect `/prelaunch`. (2) cờ bật, đã tới giờ → `/prelaunch` redirect `/`.

### 5.2 Assumptions

- *(A2)* Asset nền `MM_MEDIA_BG`/`Cover` giả định trùng (hoặc gần trùng) asset nền hero trang chủ — `clarifications.md` để "xác nhận ở Track A", chưa xác nhận bằng file thật.
- *(A2)* ~~`config.matcher` cú pháp chưa xác nhận~~ → đã xác nhận, xem § 5.3. Giả định còn lại: mở rộng matcher không làm đổi hành vi của 6 route cũ — ràng buộc bằng BR-005 và bằng e2e regression sẵn có.

### 5.3 Unresolved Questions

1. ~~**Tên file guard thật**~~ → **ĐÃ CHỐT (2026-09-08, orchestrator xác minh trực tiếp):** mở rộng
   `src/proxy.ts`, KHÔNG tạo `src/middleware.ts`. Bằng chứng: `src/proxy.ts` tồn tại và đang là edge
   guard duy nhất; `next@16.3.4`; `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
   `clarifications.md` đã được sửa lại cho khớp.
2. ~~**`config.matcher` mở rộng theo cú pháp gì**~~ → **ĐÃ CHỐT:** negative lookahead, đúng dạng
   proxy.md § Matcher ghi (*"Consider using a negative match pattern to exclude these paths"*):
   `"/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"`.
   **Ràng buộc bắt buộc kèm theo → BR-005 (§ 3.2):** `proxy()` chạy nhánh khoá trước, và với route
   KHÔNG thuộc whitelist cũ (`/`, `/login`, `/todo/*`, `/awards`, `/standards`, `/profile`) thì
   `return NextResponse.next()` ngay, không gọi `getUserOrNull`. Không có ràng buộc này thì mọi
   route đều gánh thêm một round-trip Supabase `getUser()` — đúng cái "proxy overreach" mà comment
   trong `src/proxy.ts` ghi là đã cân nhắc và loại bỏ.
3. **Asset nền** *(A1)*: xem § 5.2 — xác nhận ở Track A bằng file thật.

### 5.4 Source References

Code đã viết và merge (`status: implemented`). File thật, đã đọc và xác nhận:

| Vai trò | Source |
|---|---|
| Hàm quyết định thuần (`planProxy`, `isPrelaunchLockEnabled`, `ProxyPlan`) | `src/domain/prelaunch-lock.ts:14-120` |
| Bảng chân trị 58 case | `src/domain/prelaunch-lock.test.ts:1-560` |
| Nhánh khoá trong edge guard, redirect 303 cho non-GET/HEAD | `src/proxy.ts:45-80` |
| `config.matcher` negative lookahead | `src/proxy.ts:196-199` |
| Route `/prelaunch`, đọc + validate `EVENT_START_AT` | `src/app/(public)/prelaunch/page.tsx:24-77` |
| Layout nền + overlay + tiêu đề | `src/app/(public)/prelaunch/_components/prelaunch-screen.tsx:1-83` |
| Wrapper tick client | `src/app/(public)/prelaunch/_components/prelaunch-countdown.tsx:1-50` |
| Toán đếm ngược thuần (dùng chung với trang chủ) | `src/utils/countdown.ts:15-52` |
| Hook tick, seed từ server | `src/hooks/use-countdown.ts:36-72` |
| 3 ô số LED (dùng chung với trang chủ) | `src/components/countdown-tiles.tsx:84-113` |
| E2E màn hình | `tests/e2e/prelaunch.spec.ts:1-150` |

Đo tay trạng thái KHOÁ (e2e không lật được cờ, xem § 5.3):
`plans/260908-1653-countdown-prelaunch-page/reports/manual-lock-verification-260908.md`.

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [system-overview.md](../../../../../docs/system/system-overview.md) | — | [ ] |
| Architecture | [architecture.md](../../../../../docs/system/architecture.md) | — | [ ] |
| Feature List | [feature-list.md](../../../../../docs/generated/feature-list.md) | F011 | [ ] |
| API Map | [api-map.md](../../../../../docs/generated/api-map.md) | TBD (draft) | [ ] |
| Entities | [entities.md](../../../../../docs/generated/entities.md) | TBD (draft) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | SCR009 | [ ] |
| Behavior Logic | [behavior-logic.md](../../../../../docs/generated/behavior-logic.md) | TBD (draft) | [ ] |
| Permissions Matrix | [permissions-matrix.md](../../../../../docs/generated/permissions-matrix.md) | TBD (draft) | [ ] |
| User Stories | [user-stories.md](../../../../../docs/generated/user-stories.md) | TBD (draft) | [ ] |
