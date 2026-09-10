---
status: draft
authored_by: takumi
fcode: F011
created: 2026-09-10
lang: vi
---
<!-- REVISION draft — xem functional-spec.md đầu file cho phạm vi sửa/thêm (FR-204, FR-207, FR-208,
     D001/D002). -->

# F011_CountdownPrelaunchPage — Technical Spec

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-10

**See also:** [`functional-spec.md`](./functional-spec.md) — overview, open decisions, requirements/business rules, screens, user stories, scenarios, edge cases, cấu hình.

**How to read this file:** § 2 là index; § 4 là appendix dùng chung — chỉ nhảy vào khi § 3 trỏ tới.

## 1. Technical Overview

Màn `/prelaunch` (Server Component, PUBLIC) hiển thị đếm ngược tới `EVENT_START_AT`, tái dùng 100% logic tính toán/tick/render đã có ở trang chủ (`src/components`, `src/hooks`, `src/utils`). Phần mới duy nhất là mở rộng edge guard `src/proxy.ts` để khoá điều hướng toàn site về `/prelaunch` khi cờ `PRELAUNCH_LOCK_ENABLED` bật và đếm ngược chưa về 0. Feature đầu tiên của repo KHÔNG chạm Supabase — toàn bộ trạng thái tính từ 2 biến môi trường.

**REVISION (2026-09-10):**
1. FR-204 (format ngày) được viết lại — bản trước tự mâu thuẫn (nói "days 00-99" ở FR nhưng lại
   "không clamp ≥100" ở đính chính § 5) — nay hợp nhất, không còn 2 nguồn khác nhau.
2. FR-207 (2 hộp LED/đơn vị) là MỚI — xác nhận qua `get_frame_image` thật trên MoMorph
   `8PJQswPZmU`: mỗi đơn vị là 2 tile riêng có khoảng cách. Code hiện gộp 1 hộp, và trích dẫn SAI
   nguồn cho quyết định gộp đó (xem § 3.1 A1 Known Gap).
3. FR-208 (font LED) là MỚI, dùng chung quyết định D002 → F003 D003 (không tự chốt ở đây).
4. D001 (nguồn `EVENT_START_AT`) và BR-001/DEC-001 (AND-lock) ĐÃ đúng ở bản trước — chỉ elevate
   citation về `clarifications.md`, KHÔNG phải thay đổi hành vi.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | `FR-601` | — | § 4.4 |
| **A1** | `PrelaunchPage` (Server Component) | `GET` `/prelaunch` | `FR-001, FR-002, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-401, BR-004, US001` | — *(read-only)* | § 3.1 |
| **A2** | `proxy` (edge guard, mở rộng) | `*` mọi route khớp matcher, trừ ngoại lệ | `FR-102, FR-103, BR-001, BR-002, BR-003, BR-005, DEC-001, US002` | — *(read-only)* | § 3.2 |

## 3. Actions

### 3.1 CAP-01 — Hiển thị màn Countdown Prelaunch

#### A1 · Hiển thị đếm ngược trên nền sự kiện
`GET` `/prelaunch` → `` `PrelaunchPage` (Server Component) ``
`FR-001` `FR-002` `FR-101` `FR-201` `FR-202` `FR-203` `FR-204` `FR-205` `FR-206` `FR-207` `FR-208` `FR-401` · `US001` · `SCR009_CountdownPrelaunch`

**Who** · Bất kỳ ai, đã đăng nhập hay chưa — không gate nào *(gate A0 — § 4.4, `FR-601`)*.
**FE** · `PrelaunchPage` render nền full-bleed + lớp phủ tối tĩnh, tiêu đề i18n `prelaunch.title`, và `CountdownTiles` (tái dùng `src/app/(public)/_components/countdown-tiles.tsx`) qua `useCountdown` (tái dùng `src/app/(public)/_hooks/use-countdown.ts`) — tick 1s phía client, seed từ `initialNowMs` server.

**Known Gap (FR-207, FR-208 — chưa implement, dùng chung với F003, ghi lại để dev bám theo):**
- **FR-207** — `countdown-tiles.tsx:26-46` (`DigitBox`) render 1 `<div>` chứa CHUỖI 2 ký tự
  (`{value}`, vd. `"12"`) trong 1 hộp — design (`get_frame_image` trên `8PJQswPZmU`) yêu cầu 2 tile
  riêng, mỗi tile 1 chữ số. Comment nguồn tại `countdown-tiles.tsx:10-17` trích dẫn
  "clarifications.md § Hero/Countdown" làm căn cứ gộp — **trích dẫn SAI**: đã đọc cả
  `plans/260906-0042-homepage-saa-page/clarifications.md` và
  `plans/260908-1653-countdown-prelaunch-page/clarifications.md`, không có quyết định "gộp 2 hộp
  thành 1" nào ở đây. Ràng buộc THẬT đang tồn tại: E2E contract
  `plans/260906-0042-homepage-saa-page/clarifications.md:67` — `"mỗi ô text khớp
  /^\d{2,}$/"` — giả định 1 text node/đơn vị. **Sửa FR-207 kéo theo PHẢI sửa assertion e2e đó
  thành per-digit (vd. 2 node con, mỗi node khớp `/^\d$/`) trước khi tách hộp, nếu không sẽ đỏ
  test hiện có.**
- **FR-208** — `countdown-tiles.tsx:38-41`: `fontFamily: '"Digital Numbers", monospace'` — không
  có file font nào nạp app → luôn fallback `monospace`. Chờ D002/F003-D003.

**Request** · không tham số — đọc `EVENT_START_AT` phía server tại render time.
**BE** · `resolveTargetIso()` đọc `process.env.EVENT_START_AT`, validate qua `parseTargetDate`
(tái dùng `src/utils/countdown.ts`); thiếu/hỏng → `null`, không throw (`FR-002`).
**Rule** · Không có nhánh hiển thị khác nhau theo actor — nội dung giống nhau cho mọi visitor.
**Result** · Read-only, không ghi DB. `remaining()`/`pad2()` tính days/hours/minutes zero-pad —
**BR-004 — Giá trị ÂM clamp về `00`; `pad2()` chỉ pad LÊN, không cắt bớt, nên days ≥ 100 hiển
thị đủ `120` chứ không clamp** (đây là bản hợp nhất — FR-204 và BR-004 giờ nói CÙNG một điều,
không còn 2 nguồn khác nhau như bản trước). Hàm thuần, không I/O, đã có unit test 100% coverage.
**Source:** `src/app/(public)/prelaunch/page.tsx:24-77` → `src/utils/countdown.ts:15-52` → `src/app/(public)/_hooks/use-countdown.ts:36-72` → `src/app/(public)/_components/countdown-tiles.tsx:26-46`

<!-- No diagram: read-only, single render path, below threshold. -->

---

### 3.2 CAP-02 — Khoá điều hướng toàn site trước giờ sự kiện

#### A2 · Chặn điều hướng khi cờ khoá bật và chưa tới giờ
`*` mọi route khớp `config.matcher`, trừ ngoại lệ → `` `proxy` `` (`src/proxy.ts`, mở rộng)
`FR-102` `FR-103` `DEC-001` · `US002`

**Who** · Ban tổ chức (vận hành) thiết lập `PRELAUNCH_LOCK_ENABLED`; áp dụng cho MỌI visitor.
**FE** · Không có UI riêng — chặn ở tầng request TRƯỚC khi trang đích render.
**Request** · mọi request khớp `config.matcher` — đọc `pathname` để so khớp danh sách miễn khoá.
**BE** · `proxy` chạy nhánh khoá này TRƯỚC nhánh guard đăng nhập hiện có; tính `reached` bằng ĐÚNG
`parseTargetDate`/`remaining` mà A1 dùng (DRY).
**Rule** · Quyết định redirect theo 2 điều kiện AND cộng danh sách miễn khoá — **đã chốt tại
`plans/260908-1653-countdown-prelaunch-page/clarifications.md:34`, KHÔNG phải quyết định mới**:

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | flow | `PRELAUNCH_LOCK_ENABLED === "true"` AND `!reached` AND pathname ∉ exempt list | redirect sang `/prelaunch`, giữ nguyên đích gốc không lộ ra URL | `src/domain/prelaunch-lock.ts:94-120` |
| — | — | pathname === `/prelaunch` AND (`reached` OR cờ tắt) | redirect `/` | `src/domain/prelaunch-lock.ts:101-105` |
| — | — | mọi trường hợp khác | pass through | `src/domain/prelaunch-lock.ts:107-119` |

- **BR-001 — Khoá chỉ kích hoạt khi cờ bật VÀ đếm ngược chưa về 0.** Mặc định TẮT — khoá riêng
  theo đếm ngược sẽ redirect toàn bộ 135 e2e test hiện có. Nguồn: `clarifications.md:34`.
- **BR-002 — Miễn khoá: `/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh có phần mở rộng.**
- **BR-003 — Khi đếm ngược đã về 0, khoá gỡ hoàn toàn dù cờ còn bật; vào `/prelaunch` lúc này bị
  đưa về `/`.**
- **BR-005 — Mở matcher không được kéo theo Supabase overreach.** `proxy()` chạy nhánh khoá TRƯỚC,
  không I/O. Route không thuộc whitelist cũ thì `return NextResponse.next()` ngay, KHÔNG gọi
  `getUserOrNull`.
**Result** · Read-only — không ghi DB, không đổi cookie ngoài cookie session/locale đã có.
**Source:** `src/domain/prelaunch-lock.ts:14-120` → `src/proxy.ts:45-80`

<!-- No diagram: bảng DEC ở trên đã đủ thể hiện các nhánh. -->

### 3.3 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | `EVENT_START_AT` thiếu hoặc không parse được | 3 ô hiện `00`, không throw (`BR-004`, `FR-002`) |
| A1 | Đếm ngược về đúng 0 trong khi trang đang mở | 3 ô chuyển `00` tại chỗ, không cần reload |
| A1 | days ≥ 100 (hộp thứ 3 xuất hiện) | **[UNVERIFIED]** layout 2-hộp/đơn vị (FR-207) giả định luôn 2 chữ số; chưa quyết định hộp thứ 3 render ra sao khi tách hộp — ghi ở functional-spec.md § 9 |
| A2 | `PRELAUNCH_LOCK_ENABLED` tắt | Không route nào bị khoá, kể cả `/prelaunch` render bình thường |
| A2 | Gõ thẳng URL một route bị khoá, không qua link | Vẫn redirect `/prelaunch` — gate ở tầng request |
| A2 | Vào `/prelaunch` sau khi đã tới giờ, cờ vẫn bật | Redirect `/` |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `PrelaunchPage` | Server Component render màn Countdown Prelaunch | A1 | `src/app/(public)/prelaunch/page.tsx` |
| `CountdownTiles`/`DigitBox` | 3 ô LED digit + label, tái dùng từ trang chủ — hiện 1 hộp/đơn vị, cần 2 (FR-207 gap) | A1 | `src/app/(public)/_components/countdown-tiles.tsx` |
| `useCountdown` | Hook tick 1s, seed từ server, tái dùng | A1 | `src/app/(public)/_hooks/use-countdown.ts` |
| `countdown` (utils) | `parseTargetDate`/`remaining`/`pad2`, thuần, không I/O | A1, A2 | `src/utils/countdown.ts` |
| `proxy` | Edge guard — auth optimistic (có sẵn) + khoá điều hướng prelaunch (mở rộng) | A2 | `src/proxy.ts` |

### 4.2 Data Model

Không có bảng/entity Supabase nào — feature không đọc/ghi database. Toàn bộ trạng thái tính từ 2 biến môi trường (`EVENT_START_AT`, `PRELAUNCH_LOCK_ENABLED`).

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

None. "Đã khoá"/"đã gỡ khoá" chỉ 2 giá trị, 1 chuyển tiếp một chiều — dưới ngưỡng `kind: ui`.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · `FR-601` — Feature này không có gate quyền nào ở bất kỳ action nào.** 4 test case ACCESSING
của MoMorph là boilerplate tự sinh — chủ đích KHÔNG hiện thực.
**Source:** TBD (draft)

#### Bin 2 — used by ≥2 named actions

Không có — `BR-004` chỉ A1 dùng, `BR-001`/`BR-002`/`BR-003`/`BR-005` chỉ A2 dùng.

### 4.5 Algorithms & Integrations

None. `remaining()`/`pad2()` là hàm thuần O(1) đã có sẵn (tái dùng); không tích hợp bên ngoài nào.

### 4.6 Configuration

```text
EVENT_START_AT                       # đã có từ trang chủ, tái dùng nguyên trạng (A1) — KHÔNG dùng API (D001)
PRELAUNCH_LOCK_ENABLED = "false"     # cờ mới; chỉ "true" mới bật khoá, giá trị khác coi là tắt (A2)
```

**Client behavior:** see [`behavior-logic.md`](../../../../../docs/generated/behavior-logic.md), [`permissions.md`](../../../../../docs/system/permissions.md), [`architecture.md`](../../../../../docs/system/architecture.md).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* 3 ô hiển thị đúng zero-pad tối thiểu 2 chữ số; âm → `00`; days ≥ 100 giữ nguyên 3 chữ số (covers FR-204, BR-004)
- **SC-002** *(A1)* Tick mỗi giây không cần reload; về 0 cả 3 ô đọc `00` (covers FR-205, FR-206)
- **SC-003** *(A2)* Cờ tắt → không route nào bị khoá, kể cả `/prelaunch` (covers FR-102, BR-001)
- **SC-004** *(A2)* Cờ bật + chưa tới giờ → mọi route trừ ngoại lệ redirect `/prelaunch`; đã tới giờ → `/prelaunch` redirect `/` (covers FR-102, FR-103, DEC-001)
- **SC-NEW-01** — **[UNVERIFIED — chưa có test, chờ sửa E2E contract]** Mỗi đơn vị render 2 hộp LED riêng (covers FR-207) — cần sửa `plans/260906-0042-homepage-saa-page/clarifications.md:67`'s assertion trước.
- **SC-NEW-02** — **[UNVERIFIED — chưa có test, phụ thuộc D002]** `font-family` chữ số không phải `monospace` (covers FR-208).

#### US001 *(A1)*

**Independent Test:** set `EVENT_START_AT` tương lai gần, mở `/prelaunch`, quan sát 3 ô (mỗi ô 2
hộp) giảm dần theo thời gian thực; set rỗng/hỏng, quan sát `00/00/00` không crash.
**Acceptance Scenarios:** (1) hợp lệ tương lai → 3 ô đúng, tick mỗi giây. (2) thiếu/hỏng → cả 3 ô `00`, không lỗi.

#### US002 *(A2)*

**Independent Test:** set `PRELAUNCH_LOCK_ENABLED=true` + `EVENT_START_AT` tương lai, gọi trực tiếp route ngoài whitelist → xác nhận redirect `/prelaunch`; set `EVENT_START_AT` quá khứ → xác nhận không redirect và `/prelaunch` tự về `/`.
**Acceptance Scenarios:** (1) cờ bật, chưa tới giờ → route ngoài whitelist redirect `/prelaunch`. (2) cờ bật, đã tới giờ → `/prelaunch` redirect `/`.

### 5.2 Assumptions

- *(A2)* Asset nền `MM_MEDIA_BG`/`Cover` giả định trùng (hoặc gần trùng) asset nền hero trang chủ.
- *(A2)* Mở rộng matcher không làm đổi hành vi của 6 route cũ — ràng buộc bằng BR-005 và e2e regression sẵn có.
- *(A1)* **REVISION — MỚI:** tách 2 hộp/đơn vị (FR-207) giả định layout không đổi kích thước tổng
  thể của khối countdown đáng kể — chưa xác nhận bằng ảnh design đo pixel thật, chỉ xác nhận cấu
  trúc 2-tile qua `get_frame_image`.

### 5.3 Unresolved Questions

1. **Two-box layout kéo theo sửa E2E contract** *(A1)*: `plans/260906-0042-homepage-saa-page/
   clarifications.md:67` giả định 1 text node/đơn vị (`/^\d{2,}$/`) — PHẢI viết lại thành
   per-digit assertion trước khi FR-207 có thể implement mà không đỏ 135 e2e test hiện có. Đây là
   việc của tester/implementer khi vào code, không tự sửa ở spec stage.
2. **Font "Digital Numbers"** *(A1)*: chờ D002 → F003 D003 (quyết định người, license/7-segment
   thay thế) — không assert được font thật cho tới khi chốt.
3. **Hộp thứ 3 khi days ≥ 100** *(A1)*: 2-hộp/đơn vị (FR-207) giả định luôn 2 chữ số; chưa có
   quyết định layout khi cần hộp thứ 3 — xem functional-spec.md § 9 Edge Cases.
4. Asset nền *(A2)*: xem § 5.2 — xác nhận ở Track A bằng file thật.

### 5.4 Source References

Code đã viết và merge (`status: implemented` ở bản gốc — draft này chỉ REVISE spec text, không
đổi code). File thật, đã đọc và xác nhận:

| Vai trò | Source |
|---|---|
| Hàm quyết định thuần (`planProxy`, `isPrelaunchLockEnabled`, `ProxyPlan`) | `src/domain/prelaunch-lock.ts:14-120` |
| Bảng chân trị 58 case | `src/domain/prelaunch-lock.test.ts:1-560` |
| Nhánh khoá trong edge guard | `src/proxy.ts:45-80` |
| `config.matcher` negative lookahead | `src/proxy.ts:187-189` |
| Route `/prelaunch`, đọc + validate `EVENT_START_AT` | `src/app/(public)/prelaunch/page.tsx:24-77` |
| Toán đếm ngược thuần (dùng chung với trang chủ) | `src/utils/countdown.ts:15-52` (`pad2` không cắt, chỉ pad — dòng 49-51) |
| Hook tick, seed từ server | `src/app/(public)/_hooks/use-countdown.ts:36-72` |
| 3 ô số LED — hiện 1 hộp/đơn vị, cần 2 (FR-207 gap) | `src/app/(public)/_components/countdown-tiles.tsx:10-46,84-113` |
| E2E màn hình | `tests/e2e/prelaunch.spec.ts:1-150` |
| E2E contract cần sửa cho FR-207 | `plans/260906-0042-homepage-saa-page/clarifications.md:67` |
| AND-lock decision (đã chốt, không phải mới) | `plans/260908-1653-countdown-prelaunch-page/clarifications.md:34` |
| Font debt (đã ghi, chưa đủ để đóng — RISK-02) | `plans/260908-1653-countdown-prelaunch-page/clarifications.md` § Ghi nợ |

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
