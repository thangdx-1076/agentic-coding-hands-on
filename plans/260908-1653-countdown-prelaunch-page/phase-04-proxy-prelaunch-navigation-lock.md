# Phase 04 — Khoá điều hướng trong `src/proxy.ts`

## Context Links

- [plan.md](./plan.md) § Integration contract, § Sửa mâu thuẫn spec
- [spec/countdown-prelaunch-page/technical-spec.md](./spec/countdown-prelaunch-page/technical-spec.md) § 3.2 A2, § 5.3 (matcher đã chốt)
- [spec/system/architecture.md](./spec/system/architecture.md) § "Điểm mới THẬT SỰ"
- [spec/system/permissions.md](./spec/system/permissions.md) § "Trục khoá MỚI", § "Fail-safe"
- `src/proxy.ts` (comment "proxy overreach" hiện có) · `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

## Overview

**Priority:** P1 · **Status:** pending · **Effort:** 2h · **Deps:** 03

Phần duy nhất thật sự mới của feature. Mở rộng edge guard đã có — **không** tạo `src/middleware.ts`
(Next 16 đã đổi tên `middleware` → `proxy`; file mới sẽ không bao giờ chạy). Mở `config.matcher` từ
whitelist 6 route sang negative lookahead, và bù lại bằng BR-005 để không route nào phải gánh thêm một
round-trip Supabase.

## Key Insights

1. **BR-005 là ràng buộc cứng, không phải tối ưu.** Mở matcher mà không short-circuit thì mọi request
   trong app đều gọi `getUserOrNull()` → đúng cái "proxy overreach" mà comment trong `src/proxy.ts` ghi
   là đã cân nhắc và loại bỏ. Nhánh khoá phải chạy **trước**, và route ngoài whitelist cũ phải trả
   `NextResponse.next()` **ngay**.
2. **"Pass" nghĩa là không tác dụng phụ nào cả** — kể cả `normalizeLocaleCookie`. Hôm nay proxy không
   chạy trên `/kudos`; sau khi mở matcher nó sẽ chạy. Nếu nhánh pass vẫn ghi cookie locale thì `/kudos`
   đã đổi hành vi. `src/i18n/request.ts` tự `normalizeLocale` khi đọc cookie, nên bỏ qua ở đây là an
   toàn và giữ nguyên trạng.
3. **Whitelist cũ phải tái tạo chính xác:** `/`, `/login`, `/awards`, `/standards`, `/profile` khớp
   tuyệt đối; `/todo/:path*` khớp cả `/todo` lẫn `/todo/<bất kỳ>`. Sai một cái là 6 route cũ đổi hành vi.
4. **`src/proxy.ts` KHÔNG nằm trong allowlist coverage** (`vitest.config.ts` không có glob nào trúng
   `src/proxy.ts`). Vì vậy toàn bộ luật phải sống trong `src/domain/prelaunch-lock.ts` — file đó trúng
   glob `src/domain/**/*.ts`, gate 100% bắt buộc nó có test. Đây là cách duy nhất trạng thái KHOÁ có
   bằng chứng tự động, vì e2e không lật được cờ.
5. **Đọc cờ trước, parse ngày sau.** `isPrelaunchLockEnabled` chỉ so chuỗi. Chỉ khi cờ bật mới
   `parseTargetDate` + `remaining`. Cờ tắt (mặc định, mọi môi trường CI/dev) → gần như zero cost.
6. **`reached` khi cờ tắt phải là `false`, không phải `true`.** `true` sẽ kích nhánh `/prelaunch` → `/`
   và làm C1 của phase 02 đỏ lại.
7. Matcher đã chốt, viết nguyên văn (giữ `\\.` trong string literal TS):
   `"/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"`. Vẫn phải là mảng literal —
   Next phân tích tĩnh `config.matcher` lúc build, không đọc được hằng import.

## Requirements

- FR-102 cờ BẬT + chưa tới giờ → mọi route ngoài danh sách miễn khoá redirect `/prelaunch`.
- FR-103 / BR-003 tới giờ → gỡ khoá hoàn toàn; `/prelaunch` redirect `/` **chỉ khi cờ vẫn bật**.
- BR-001 hai điều kiện AND; cờ mặc định TẮT (`PRELAUNCH_LOCK_ENABLED` không set = tắt).
- BR-002 miễn khoá `/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh có phần mở rộng.
- BR-005 nhánh khoá chạy trước, không I/O; ngoài whitelist cũ → `NextResponse.next()` ngay.
- Hành vi của 6 route cũ giữ nguyên **bit-for-bit**.
- NFR: `src/proxy.ts` ≤ 200 dòng sau khi sửa; `src/domain/prelaunch-lock.ts` ≤ 200 dòng.

## Architecture

```
request
  │
  ├─ config.matcher  ── loại _next/static, _next/image, favicon.ico, api, auth, *.<ext>
  │
  ▼
proxy(request)
  │  lockEnabled = isPrelaunchLockEnabled(process.env.PRELAUNCH_LOCK_ENABLED)   // so chuỗi, 0 I/O
  │  reached     = lockEnabled ? isEventReached(process.env.EVENT_START_AT, Date.now()) : false
  │  plan        = planProxy({ pathname, lockEnabled, reached })                 // thuần
  │
  ├─ { kind: "redirect", to } ─► NextResponse.redirect(new URL(to, request.url))  // chưa có cookie nào để giữ
  ├─ { kind: "pass" }        ─► NextResponse.next()        // 0 cookie, 0 Supabase — BR-005
  └─ { kind: "auth" }        ─► nhánh hiện có: normalizeLocaleCookie → getUserOrNull → ma trận redirect cũ
```

Luật trong `planProxy`, đúng thứ tự:

1. `pathname === "/prelaunch"` → `lockEnabled && reached ? redirect "/" : pass`
2. `lockEnabled && !reached && !isExempt(pathname)` → `redirect "/prelaunch"`
3. `isLegacyProxyRoute(pathname)` → `auth`
4. còn lại → `pass`

`isExempt`: bắt đầu bằng `/auth/`, `/api/`, `/_next/`, hoặc segment cuối có phần mở rộng. Trùng lặp với
matcher là cố ý — defense-in-depth, và là thứ khiến BR-002 có test.

`isLegacyProxyRoute`: `"/" | "/login" | "/awards" | "/standards" | "/profile"` khớp tuyệt đối;
`pathname === "/todo"` hoặc `pathname.startsWith("/todo/")`.

## Related Code Files

**Create:**

- `src/domain/prelaunch-lock.ts` — `ProxyPlan`, `isPrelaunchLockEnabled`, `isEventReached`, `planProxy`
  (thư mục `src/domain/` là MỚI trong repo; skill cho phép tạo ở consumer thật đầu tiên)

**Modify:**

- `src/proxy.ts` — thêm nhánh khoá ở đầu `proxy()`, đổi `config.matcher`, cập nhật comment ma trận redirect

**Delete:** không file nào. **Tuyệt đối không tạo** `src/middleware.ts`.

**Cấm chạm:** `src/domain/prelaunch-lock.test.ts` (phase 02 sở hữu — phải làm nó xanh nguyên văn),
`tests/e2e/prelaunch.spec.ts`, `src/constants/routes.ts` (phase 03), `README.md` (phase 05).

## Implementation Steps

1. Đọc lại `src/domain/prelaunch-lock.test.ts` do phase 02 viết — nó là đặc tả. Không sửa nó.
2. Viết `src/domain/prelaunch-lock.ts`:
   - `isPrelaunchLockEnabled(raw)` → `raw === "true"` (mọi giá trị khác, kể cả `undefined`/`"TRUE"`/`"1"`, là tắt — permissions.md § Fail-safe)
   - `isEventReached(rawIso, nowMs)` → `parseTargetDate` từ `@/utils/countdown`; `null` → `false`
     (ngày không rõ **không** phải là "đã tới giờ"); ngược lại `remaining(target, nowMs).reached`
   - `planProxy(...)` theo 4 bước ở § Architecture
   - `isExempt` / `isLegacyProxyRoute` để private trong module (không export) — bề mặt công khai càng
     nhỏ càng tốt, và cả hai vẫn đạt 100% coverage qua `planProxy`
3. `pnpm test:unit src/domain/prelaunch-lock.test.ts` → xanh.
4. Sửa `src/proxy.ts`: chèn khối 3 dòng tính `lockEnabled`/`reached`/`plan` làm việc **đầu tiên** trong
   `proxy()`, trước cả `NextResponse.next({ request })` và `normalizeLocaleCookie`. Switch trên
   `plan.kind`. Nhánh `auth` giữ nguyên đúng code cũ, không sửa một ký tự logic nào.
5. Đổi `config.matcher` sang mảng 1 phần tử với chuỗi negative lookahead ở § Key Insights 7. Giữ nguyên
   comment giải thích tại sao vẫn là literal, thêm đoạn giải thích BR-005 và `isLegacyProxyRoute`.
6. Cập nhật comment "Redirect matrix" trong docblock của `proxy()` cho khớp 3 nhánh mới.
7. `pnpm lint --max-warnings 0 && pnpm format:check`; `pnpm build && pnpm typecheck`.
8. `pnpm test:unit:coverage` → 100%, exit 0.
9. Regression đầy đủ: `pnpm exec playwright test --grep-invert "@auth|@local-db"` — số test pass phải
   bằng trước phase 04 cộng số test mới của `prelaunch.spec.ts`.
10. Kiểm tay trạng thái KHOÁ (không phải gate CI, nhưng bắt buộc trước khi đóng phase):
    ```bash
    PRELAUNCH_LOCK_ENABLED=true EVENT_START_AT=2099-12-31T18:30:00+07:00 pnpm dev --port 3100
    curl -sI localhost:3100/todo     | head -2   # kỳ vọng 307 → location: /prelaunch
    curl -sI localhost:3100/prelaunch| head -2   # kỳ vọng 200
    curl -sI localhost:3100/api/x    | head -2   # kỳ vọng KHÔNG redirect
    # rồi đổi EVENT_START_AT sang 2020-01-01T00:00:00+07:00, restart:
    curl -sI localhost:3100/todo     | head -2   # kỳ vọng KHÔNG redirect (khoá đã gỡ)
    curl -sI localhost:3100/prelaunch| head -2   # kỳ vọng 307 → location: /
    ```
    Dán output vào `reports/manual-lock-verification-260908.md`.
11. Commit: `feat(proxy): add prelaunch navigation lock behind PRELAUNCH_LOCK_ENABLED`.

## Todo List

- [ ] `src/domain/prelaunch-lock.ts` với đúng 4 export công khai theo Integration contract
- [ ] `pnpm test:unit src/domain/prelaunch-lock.test.ts` xanh, KHÔNG sửa file test
- [ ] Nhánh khoá là việc đầu tiên trong `proxy()`, trước mọi I/O
- [ ] `kind: "pass"` trả `NextResponse.next()` trần — 0 cookie, 0 Supabase
- [ ] Nhánh `auth` giữ nguyên logic cũ từng ký tự
- [ ] `config.matcher` = negative lookahead, vẫn là mảng literal
- [ ] `src/proxy.ts` ≤ 200 dòng
- [ ] `pnpm test:unit:coverage` 100%
- [ ] Regression e2e đầy đủ xanh, `/kudos` và 6 route cũ không đổi hành vi
- [ ] Kiểm tay 4 trường hợp khoá, output lưu vào `reports/`
- [ ] KHÔNG có `src/middleware.ts` nào được tạo

## Success Criteria

```bash
pnpm test:unit:coverage                                   # exit 0, coverage 100% (gate cứng)
pnpm exec playwright test --grep-invert "@auth|@local-db" # exit 0, không mất test nào so với phase 03
pnpm lint --max-warnings 0 && pnpm format:check
pnpm build && pnpm typecheck
test ! -f src/middleware.ts && echo "no stray middleware"
```

Cộng `reports/manual-lock-verification-260908.md` với đủ 4 dòng curl và mã trạng thái thật.

## Risk Assessment

| Risk | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Mở matcher kéo `getUserOrNull()` vào mọi request (proxy overreach) | Cao nếu làm ẩu | Cao — mỗi request thêm 1 round-trip Supabase | BR-005: nhánh khoá chạy trước, ngoài whitelist cũ trả `pass` ngay. Test `planProxy` khẳng định `{kind:"pass"}` cho `/kudos`, `/khong-ton-tai` |
| `/kudos` đổi hành vi vì proxy nay chạy trên nó | Trung bình | Trung bình | `pass` không ghi cookie locale, không đọc session — tương đương proxy không chạy. C6 của e2e canh `/kudos` |
| `isLegacyProxyRoute` tái tạo sai `/todo/:path*` | Trung bình | Cao — `/todo/abc` mất auth guard | Bảng chân trị phase 02 có cả `/todo` lẫn `/todo/abc`; e2e `@auth` (chạy local) là lưới thứ hai |
| Vòng lặp redirect `/prelaunch` → `/prelaunch` | Thấp | Cao — site chết | Bước 1 của `planProxy` xử `/prelaunch` trước mọi nhánh khoá; test có case `pathname="/prelaunch"` ở cả 4 tổ hợp cờ×reached |
| Vòng lặp `/prelaunch` → `/` → `/prelaunch` khi đã tới giờ | Thấp | Cao | Khi `reached` là true, nhánh 2 không kích (điều kiện `!reached`), nên `/` trả `auth`, không quay lại |
| Redirect làm rơi cookie session đã staged | Thấp | Trung bình | Nhánh khoá redirect **trước** khi cookie nào được staged, nên không cần `redirectPreservingCookies`. Nhánh `auth` giữ nguyên helper cũ |
| Ai đó bật cờ ở production rồi quên tắt sau giờ G | Trung bình | Thấp | BR-003 tự gỡ khoá khi `reached` — cờ quên bật vẫn vô hại. Ghi vào README ở phase 05 |
| Môi trường quên set `PRELAUNCH_LOCK_ENABLED` | Chắc chắn | Không | Mặc định TẮT là hướng an toàn (permissions.md § Fail-safe) |
| Chuỗi matcher bị escape sai (`\.` vs `\\.`) → khớp hụt/khớp thừa | Trung bình | Cao | Chép nguyên văn từ technical-spec § 5.3; `pnpm build` + C6 bắt được ngay |

## Security Considerations

- Đây **không** phải access control. Cùng một cờ áp cho mọi actor, kể cả `admin` (permissions.md
  § "Trục khoá MỚI") — nó gần maintenance-mode hơn RBAC. Không tạo permission-item mới, không đụng
  `(protected)/layout.tsx`.
- Hai lớp guard hiện có giữ nguyên: `proxy` optimistic + `(protected)/layout.tsx` authoritative.
  Nhánh khoá **không thay thế và không làm yếu** guard đăng nhập. Phải xác nhận `/todo` và `/profile`
  vẫn redirect `/login` khi chưa đăng nhập.
- `/auth/*` miễn khoá là bắt buộc: khoá nó sẽ làm hỏng OAuth callback và khoá luôn đường đăng nhập.
- `PRELAUNCH_LOCK_ENABLED` là server-only, không tiền tố `NEXT_PUBLIC_`, không rò vào bundle client.
- Fail-safe một chiều: thiếu biến, biến rỗng, hay giá trị lạ đều = TẮT. Không có nhánh nào khoá site
  vì lỗi cấu hình.

## Rollback

Commit riêng. Lùi: `git revert <sha>` — trả `config.matcher` về whitelist 6 route và gỡ nhánh khoá; màn
`/prelaunch` của phase 03 vẫn sống và vẫn e2e được, vì nó không phụ thuộc proxy. Đây là lý do 03 và 04
là hai commit tách rời: có thể ship màn đếm ngược mà bỏ cơ chế khoá.

**Đường lùi runtime (không cần deploy):** đặt `PRELAUNCH_LOCK_ENABLED` khác `"true"` rồi restart. Cờ mặc
định TẮT nên trạng thái "đã revert" chính là trạng thái mặc định — không có bước gỡ nào phải nhớ.

## Next Steps

Phase 05: verification đầy đủ, README (`/prelaunch` vào bảng route, `PRELAUNCH_LOCK_ENABLED` vào mục env),
visual validation, journal.
