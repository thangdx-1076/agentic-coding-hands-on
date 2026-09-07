---
phase: 03
feature: F004
track: B
status: ✅ completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/dal/awards.ts",
    "src/dal/awards.test.ts",
    "src/dal/awards-client.ts",
    "src/dal/awards-client.test.ts",
    "src/constants/routes.ts",
    "src/proxy.ts",
    "messages/vi.json",
    "messages/en.json",
  ]
---

# Phase 03 — DAL `getAwards` + i18n + đăng ký route

## Context Links

- `spec/F004_AwardSystemPage/technical-spec.md` § 4.5 (DAL contract, code mẫu)
- `plans/reports/researcher-260906-2258-repo-conventions.md` § 2 (i18n), § 3 (DAL layering), § 4 (coverage gate)
- Khuôn mẫu: `src/dal/users.ts:10-13,32-41`, `src/dal/users-role-client.ts:21-38`, `src/dal/auth.ts:16-27`
- `src/lib/i18n/messages-parity.test.ts` (gate parity vi/en)

## Overview

**Priority**: P1 · **Status**: pending · **Track B, RED-first**
Toàn bộ tầng dữ liệu + đăng ký đường đi cho `/awards`, không đụng UI. Chạy song song hoàn toàn với 01/02/04.

## Key Insights

- **DAL nhận client được inject, không tự `createClient()`** (`src/dal/users.ts:10-13`). Kiểu `AwardsClient` khai đúng chain dùng thật — `.from("awards").select(...).eq("locale", …).order("sort_order", {ascending:true})` — hẹp hơn SDK để test stub được mà không phải dựng cả bề mặt Supabase.
- `.order(...)` trả `PromiseLike`, **không** `Promise`: postgrest builder là thenable không có `catch`/`finally`. Khai sai kiểu là TS đỏ.
- `awards-client.ts` là shim tránh **TS2589** ("type instantiation excessively deep") — dựng lại chain bằng arrow tường minh, y hệt `toUsersRoleClient` (`src/dal/users-role-client.ts:21-38`).
- **Fail-open `[]`**: lỗi Supabase / `data == null` / exception → trả mảng rỗng, không ném. Đây là điều kiện làm CI chạy được khi Supabase không tới được (xem phase 07).
- **`src/dal/**/*.ts` nằm trong allowlist coverage 100%** (`vitest.config.ts:97-122`). `awards.ts` phải phủ đủ 4 nhánh: happy path, `error` truthy, `data === null`, `throw`. `awards-client.ts` phủ bằng cách gọi shim với một client giả và assert chain được gọi đúng tham số.
- **i18n — dùng lại khoá chrome, không nhân bản.** Repo đã có tiền lệ đọc chéo namespace cho chrome dùng chung: `(home)/page.tsx:113-117` đọc `tLogin("footer")` cho `home.footer.copyright` với comment nêu rõ lý do DRY. `/awards` làm y vậy: `getTranslations("home")` cho nav/header/footer/kudos/account/notifications, `getTranslations("login")` cho copyright, và khoá top-level MỚI `awards.*` chỉ chứa chrome riêng của trang. *(Nợ lại: đổi tên `home.*` phần chrome thành `chrome.*` ở một phiên khác — làm bây giờ sẽ đụng `(home)/page.tsx` mà phase 02 đang giữ.)*
- `messages-parity.test.ts` fail cứng nếu khoá lệch giữa 2 locale → thêm `awards.*` vào **cả** `vi.json` và `en.json` cùng lúc, cùng đường dẫn.
- Giá trị `vi` của `awards.heading` phải đúng chuỗi `"Hệ thống giải thưởng SAA 2025"` — E2E assert nguyên văn, và `DEFAULT_LOCALE = "vi"`.
- **Nội dung 6 giải KHÔNG vào `messages/*.json`** — nguồn sự thật là DB (`clarifications.md`). `en` chỉ dịch chrome; mô tả giải chưa có bản EN (đã ghi nợ).
- `config.matcher` trong `src/proxy.ts:118` bắt buộc là mảng literal (Next phân tích tĩnh lúc build) → thêm chuỗi `"/awards"`, KHÔNG dùng `ROUTES.AWARDS` ở đó.

## Requirements

- `getAwards(client, locale): Promise<Award[]>` — map snake_case → camelCase, giữ thứ tự `sort_order` tăng dần.
- `Award = { slug, title, description, quantityValue, quantityUnit, prizeValues: {amount, note}[] }`.
- `import "server-only";` ở đầu cả 2 file DAL.
- `ROUTES.AWARDS = "/awards"`.
- `config.matcher` gồm `/awards` để proxy chuẩn hoá `NEXT_LOCALE` và refresh session cho khách vào thẳng trang này (`/` đã được match đúng vì lý do đó — `src/proxy.ts:110-117`). `/awards` **không** được thêm vào nhánh `isProtectedPage`.
- Khoá `awards.*` (cả 2 locale): `caption`, `heading`, `navLabel`, `quantityLabel`, `prizeLabel`, `empty`.

## Architecture

```text
page.tsx (phase 06)
  └─ createClient()  [@/lib/supabase/server]
       └─ toAwardsClient(supabase)   → AwardsClient (kiểu hẹp, tránh TS2589)
            └─ getAwards(client, locale)
                 ├─ ok    → Award[] (đã map camelCase, sort_order asc)
                 └─ lỗi/rỗng/throw → []          ← điều kiện fail-open của CI

proxy.ts matcher: ["/", "/awards", "/login", "/todo/:path*"]
     /awards → chuẩn hoá cookie locale + refresh session, KHÔNG redirect
```

## Related Code Files

**Create**: `src/dal/awards.ts`, `src/dal/awards.test.ts`, `src/dal/awards-client.ts`, `src/dal/awards-client.test.ts`
**Modify**: `src/constants/routes.ts` (thêm `AWARDS`), `src/proxy.ts` (`config.matcher`), `messages/vi.json`, `messages/en.json`
**Delete**: —

## Implementation Steps

1. **RED trước**: viết `src/dal/awards.test.ts` với 4 case (happy 6 dòng đã sort, `error` truthy, `data: null`, client ném) — chạy đỏ.
2. Viết `src/dal/awards.ts` theo `technical-spec § 4.5` cho tới khi 4 case xanh.
3. Viết `awards-client.test.ts`: gọi `toAwardsClient(fake)` rồi chạy hết chain, assert `from/select/eq/order` nhận đúng đối số. Sau đó viết `awards-client.ts`.
4. Thêm `AWARDS: "/awards"` vào `src/constants/routes.ts`.
5. Thêm `"/awards"` vào `config.matcher` (literal). Không thêm nhánh guard nào.
6. Thêm khối `awards` vào `messages/vi.json` **và** `messages/en.json`; chạy `pnpm test:unit` để `messages-parity.test.ts` xác nhận.
7. `pnpm lint --max-warnings 0` → `pnpm test:unit:coverage` (phải 100%) → `pnpm build` → `pnpm typecheck`.

## Todo List

- [x] `awards.test.ts` đỏ trước, 4 nhánh
- [x] `awards.ts` xanh, `import "server-only"`, fail-open `[]`
- [x] `awards-client.test.ts` + `awards-client.ts` (shim, tránh TS2589)
- [x] `ROUTES.AWARDS`
- [x] `config.matcher` thêm `"/awards"` dạng literal
- [x] `awards.*` vào cả `vi.json` và `en.json`, parity test xanh
- [x] Coverage 100%, typecheck sạch

## Success Criteria

- `pnpm test:unit:coverage` = 100% với 2 file DAL mới trong bảng.
- `messages-parity.test.ts` xanh.
- `pnpm typecheck` sạch — đặc biệt không có TS2589 ở `awards-client.ts`.
- `curl -I localhost:3000/awards` sau phase 06 không redirect về `/login` (proxy không gác).
- Không file nào >200 dòng.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| TS2589 khi truyền client SDK thẳng vào `getAwards` | Cao | Trung bình — build đỏ khó hiểu | Bắt buộc đi qua `toAwardsClient`; ghi comment lý do ngay trong file như `users-role-client.ts` |
| Khai `.order()` trả `Promise` thay vì `PromiseLike` | Trung bình | Trung bình — typecheck đỏ ở call site | Nêu trong Key Insights; copy đúng khuôn `users.ts` |
| Quên thêm khoá vào `en.json` | Trung bình | Thấp — parity test bắt ngay | Bước 6 chạy test ngay sau khi sửa JSON |
| Thêm `/awards` vào matcher rồi vô tình lọt nhánh `isProtectedPage` | Thấp | **Cao** — trang công khai bị đá về `/login`, phá TC ID-0 | `isProtectedPage` chỉ so `startsWith(ROUTES.TODO)`; thêm test E2E ID-0 ở phase 07 làm lưới chặn |
| Coverage 100% khó với `awards-client.ts` (chỉ toàn arrow) | Trung bình | Trung bình | Test gọi hết chain một lượt là phủ đủ; không đặt logic nào vào shim |

## Security Considerations

- `import "server-only"` chặn cả 2 file DAL bị kéo vào bundle client.
- Client component tuyệt đối không được gọi `getAwards`; đọc DB chỉ xảy ra ở Server Component (phase 06).
- Fail-open ở đây là hiển thị, không phải authorization: `/awards` vốn công khai, `[]` chỉ làm trang rỗng chứ không mở thêm quyền gì.
- Không log nội dung `error` của Supabase ra client; nuốt trong `catch` như `src/dal/auth.ts`.

## Next Steps

Mở khoá phase 06. Không chặn 01, 02, 04, 05.
