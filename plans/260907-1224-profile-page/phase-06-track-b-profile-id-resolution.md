---
phase: 06
feature: F006
track: B
status: completed
priority: P1
effort: 0.5h
owner: implementer
file_ownership:
  [
    "src/app/(protected)/profile/_utils/parse-profile-id.ts",
    "src/app/(protected)/profile/_utils/parse-profile-id.test.ts",
  ]
---

# Phase 06 — Track B: `parseProfileId` + unit test

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 3.1 — pseudocode phân giải, thứ tự kiểm tra CỐ Ý
- `spec/F006_ProfilePage/functional-spec.md` § 4 (FR-401…FR-406), § 9 Edge Cases
- `clarifications.md` § Decisions taken — D003, D004, D005, D006
- `src/app/(public)/login/page.tsx:16-22` — shape `searchParams` (`string | string[] | undefined`)
- `src/app/(public)/standards/_hooks/use-standards-close.test.ts` — khuôn unit test colocated
- `vitest.config.ts:97-122` — `src/app/**/_utils/**/*.ts` nằm trong allowlist coverage 100%

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Tách toàn bộ quyết định phân giải `?id=` thành 1 hàm thuần có test 100%, để `page.tsx` (phase 07) chỉ còn việc dịch kết quả thành `notFound()`/`redirect()`/render.

## Out of scope

- Không gọi DAL, không query, không `notFound()`/`redirect()` bên trong hàm — hàm **trả về quyết định**, không thực thi nó. Hàm thuần thì test được 100% mà không cần mock `next/navigation`.
- Không viết `page.tsx` (phase 07 sở hữu).
- Không đụng component nào.

## Key Insights

- **Đặt ở `_utils/` là quyết định có lý do, không phải thói quen.** `vitest.config.ts` include `src/app/**/_utils/**/*.ts` → file này rơi vào gate coverage 100%. Đặt nhầm vào `_shared/` hay `_components/` là nó **rơi ra khỏi mẫu số** và logic bảo mật nhạy nhất của trang đi vào production không test — hỏng kiểu không ai thấy.
- **Thứ tự kiểm tra là CỐ Ý, không được đảo**: `undefined`/`""` → self · non-string (`string[]`) → reject · regex UUID fail → reject · trùng viewer → canonical · còn lại → fetch. Đảo "trùng viewer" lên trước "regex" nghĩa là so sánh một chuỗi chưa qua shape-check với id thật — vô hại hôm nay, nhưng nó phá bất biến "không bao giờ dùng giá trị chưa validate".
- **Shape-check TRƯỚC mọi query là để chặn `22P02`.** Postgres ném `invalid input syntax for type uuid` khi nhận rác; lỗi đó nổi lên thành trang 500 chứ không phải 404 (FUN_004). Regex là hàng rào, không phải trang trí.
- **`string[]` → reject, KHÔNG lấy `[0]`.** Next trả mảng khi key lặp. Lấy phần tử đầu là **đoán ý người dùng khi input mơ hồ** — chính xác thứ BR-004 cấm. Và nó mở một bề mặt lách: `?id=<uuid mình>&id=<uuid người khác>` sẽ hành xử khác nhau tuỳ ai lấy phần tử nào.
- **Regex phải neo 2 đầu (`^…$`) và không dùng flag `g`.** Thiếu `^`/`$` thì `"xxx<uuid>yyy"` lọt. Flag `g` trên một regex module-scope làm `.test()` **có trạng thái** (`lastIndex`) và trả kết quả xen kẽ true/false giữa các lần gọi — bẫy kinh điển, và ở đây nó nghĩa là 404 ngẫu nhiên.
- **Trả về discriminated union**, không phải `string | null`. `null` không phân biệt được "self" với "404", và `page.tsx` sẽ phải suy đoán lại. Union làm `switch` ở phase 07 vét cạn được ở tầng type.
- **So id với viewer không phân biệt hoa/thường.** Regex nhận cả `A-F` (`/i`); UUID từ Postgres luôn lowercase. `?id=<UUID VIẾT HOA của chính mình>` phải canonicalize chứ không được rơi xuống nhánh fetch rồi 404. Normalize `toLowerCase()` trước khi so.

## Requirements

- `parseProfileId(rawId: string | string[] | undefined, viewerId: string): ProfileIdResolution`
- `ProfileIdResolution = { kind: "self" } | { kind: "canonical" } | { kind: "other"; id: string } | { kind: "reject" }`
- Bảng hành vi:

| Input | Kết quả | FR / TC |
|---|---|---|
| `undefined` | `self` | FR-401, FUN_005 b1 |
| `""` | `self` | FR-401, D005 |
| `["a","b"]` (mọi mảng, kể cả 1 phần tử) | `reject` | FR-403, FUN_005 b2 |
| `"not-a-uuid"` | `reject` | FR-402, FUN_004 |
| UUID hợp lệ = `viewerId` (mọi cách viết hoa/thường) | `canonical` | FR-404, FUN_002 |
| UUID hợp lệ ≠ `viewerId` | `other` + `id` đã lowercase | FR-406 |

- Hàm **thuần**: không I/O, không throw, không đọc env.
- Coverage 100% (statements/branches/functions/lines).

## Architecture

```text
src/app/(protected)/profile/_utils/parse-profile-id.ts

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                 ↑ neo 2 đầu, KHÔNG flag g (lastIndex có trạng thái → 404 ngẫu nhiên)

export type ProfileIdResolution =
  | { kind: "self" } | { kind: "canonical" }
  | { kind: "other"; id: string } | { kind: "reject" };

export function parseProfileId(rawId, viewerId): ProfileIdResolution
  undefined | ""        → self
  typeof !== "string"   → reject          (mảng do key lặp)
  !UUID_RE.test(rawId)  → reject          (trước MỌI query)
  lower === viewerId'   → canonical
  else                  → { other, id: lower }

phase 07 dịch: self→render(viewer) · canonical→redirect(ROUTES.PROFILE)
               reject→notFound() · other→getProfileCard() → null ? notFound() : render
```

## Related Code Files

**Create**: `src/app/(protected)/profile/_utils/parse-profile-id.ts` (+ `.test.ts`)
**Modify**: — · **Delete**: —
**Chỉ đọc**: `src/app/(public)/login/page.tsx` (shape `searchParams`), `spec/F006_ProfilePage/technical-spec.md` § 3.1

## Implementation Steps

1. Viết `parse-profile-id.ts` đúng thứ tự nhánh ở Architecture. Regex neo 2 đầu, `/i`, không `g`.
2. Normalize `viewerId` và `rawId` bằng `toLowerCase()` trước khi so.
3. Viết `parse-profile-id.test.ts` phủ đủ 6 dòng bảng hành vi, cộng 3 ca biên:
   - `["chỉ-một-phần-tử"]` → `reject` (mảng vẫn là mảng)
   - `"<UUID VIẾT HOA của chính viewer>"` → `canonical`
   - `"<uuid hợp lệ>xxx"` và `"xxx<uuid hợp lệ>"` → `reject` (chứng minh neo `^`/`$`)
4. Gọi `parseProfileId` **hai lần liên tiếp** với cùng một UUID hợp lệ trong 1 test và assert cả 2 lần cho cùng kết quả — chốt cứng rằng regex không mang trạng thái.
5. `pnpm test:unit:coverage` → 100% cho file này. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`.

## Todo List

- [ ] `parse-profile-id.ts` — union 4 nhánh, thứ tự cố ý
- [ ] Regex `^…$`, `/i`, **không** `g`
- [ ] Normalize lowercase trước khi so với `viewerId`
- [ ] Test 6 dòng bảng hành vi
- [ ] Test mảng 1 phần tử → `reject`
- [ ] Test UUID viết hoa của chính mình → `canonical`
- [ ] Test chuỗi bọc quanh UUID → `reject` (chứng minh neo)
- [ ] Test gọi 2 lần liên tiếp cho cùng kết quả (chống `lastIndex`)
- [ ] Gate: coverage 100% · lint · format · build · typecheck

## Success Criteria

- `pnpm test:unit:coverage` xanh, `parse-profile-id.ts` **xuất hiện trong bảng coverage** ở mức 100% cả 4 chỉ số (xuất hiện = glob `_utils/` đã ăn; thiếu = đặt sai chỗ).
- `grep -n "notFound\|redirect\|@/dal\|createClient\|await" src/app/\(protected\)/profile/_utils/parse-profile-id.ts` → **rỗng** (hàm thuần, đồng bộ).
- `grep -n "/g" src/app/\(protected\)/profile/_utils/parse-profile-id.ts` → không có flag `g` trên `UUID_RE`.
- File ≤200 dòng; named export.
- Không file nào ngoài `file_ownership` bị chạm.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Đặt file ngoài `_utils/` → rơi khỏi allowlist, gate 100% xanh giả | Trung bình | **Cao** — logic bảo mật không test mà CI vẫn xanh | Success Criteria đòi thấy file trong bảng coverage, không chỉ "test xanh" |
| Regex thiếu neo `^`/`$` → `"xxx<uuid>yyy"` lọt qua shape-check | Trung bình | **Cao** — chuỗi rác đi thẳng vào query, `22P02` → 500 | Test bọc-quanh-UUID ở bước 3 |
| Regex mang flag `g` → `lastIndex` có trạng thái, 404 xen kẽ | Trung bình | **Cao** — bug không tái hiện được, cực khó chẩn | Test gọi 2 lần liên tiếp (bước 4) + grep ở Success Criteria |
| Lấy `[0]` khi `searchParams` trả mảng | Trung bình | Cao — BR-004 vỡ, mở bề mặt `?id=A&id=B` | Bảng hành vi + test mảng 1 phần tử |
| Đảo thứ tự: so `viewerId` trước regex | Trung bình | Trung bình — phá bất biến "không dùng giá trị chưa validate" | Thứ tự ghi cứng ở Architecture + Key Insights |
| Trả `string \| null` thay vì union | Trung bình | Trung bình — phase 07 phải đoán lại, `switch` không vét cạn được | Requirements chốt union |
| Không normalize hoa/thường → `?id=<UUID HOA của mình>` rơi xuống fetch rồi 404 | Trung bình | Trung bình — FUN_002 đỏ | Bước 2 + test viết hoa |

## Security Considerations

- Đây là **hàng rào validate input duy nhất** của trang: mọi giá trị đi tới `getProfileCard` đều đã qua đây. Nới lỏng regex = nới lỏng hàng rào.
- Hàm không chạm DB, không chạm session — nó chỉ **quyết định**; thực thi (`notFound`/`redirect`/query) nằm ở phase 07, nơi có thẩm quyền.
- Không log giá trị `rawId` (input người dùng) ra console — không cần, và log input thô là thói quen xấu.
- Không throw: một input xấu phải thành `reject` (404), không bao giờ thành 500.

## Next Steps

Mở khoá phase 07. Chạy song song được với phase 05 (không chung file nào).
