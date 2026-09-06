---
phase: 05
feature: F003
status: completed
priority: P0
test_policy: e2e-red-first
effort: 2h
owner: implementer
depends_on: [02, 03, 04]
file_ownership: ["app/page.tsx", "app/home-client.tsx", "components/home/countdown-timer.tsx", ".env.local", "messages/vi.json (gap-fill)", "messages/en.json (gap-fill)"]
---

# Phase 05 — Integration: `app/page.tsx` + client wrappers

## Context Links

- `spec/homepage/technical-spec.md` § 3.1 A1 (HomePage), A2 (useCountdown), § 4.5 INT-001, § 5.4 Data Flow
- `spec/homepage/functional-spec.md` FR-001, FR-002, FR-003, FR-201…FR-210, FR-401…FR-403, FR-601; BR-001…BR-006; US001–US004
- `spec/homepage/screens/SCR-home/spec.md` (8 vùng R1–R8) · `clarifications.md` § E2E contract
- `research/researcher-01-next16-homepage-patterns.md` § 1 (seed), § 3 (`preload`), § 4 (fail-open), § 5 (`logoutAction`)
- Precedent: `app/login/page.tsx` + `app/login/login-client.tsx` (đúng hình dạng cần mirror)

## Overview

**Priority**: P0 · **Status**: pending
Ráp 3 mảnh đã xong: `HomeScreen` (phase 02) + hook/lib (phase 03) + định tuyến `/` public (phase 04). Server Component đọc session + role + `EVENT_START_AT` + `getTranslations("home")`, dựng `HomeCopy`, và giao phần tương tác cho ranh giới client. Sau phase này `home.spec.ts` phải chạy được GREEN — phase 06 mới là bên xác nhận.

## Key Insights

- Mirror `/login`: Server Component → `HomeClient` (`"use client"`) → `HomeScreen`. Prop hàm (`onSelectLocale`) không vượt được ranh giới Server Component, nên bắt buộc có `app/home-client.tsx`.
- **Countdown là slot `ReactNode`**, không phải object prop: `HomeClient` truyền `countdown={<CountdownTimer targetIso initialNowMs />}` để tick 1s chỉ re-render nhánh đồng hồ, không phải cả cây 6 card + footer.
- `CountdownTimer` (file của phase này) là client component mỏng: gọi `useCountdown`, destructure ngay, render `CountdownTiles` của Track A. Nhờ vậy Track A đứng một mình vẫn typecheck sạch.
- `logoutAction` là Server Action tái dùng nguyên trạng từ `app/todo/actions.ts` — truyền **từ Server Component xuống** (pattern chính tắc), không import trong client component.
- `initialNowMs = Date.now()` tính trong Server Component và truyền xuống; KHÔNG gọi `Date.now()` ở render client đầu tiên (chống hydration mismatch mà không cần `suppressHydrationWarning`).
- Fail-open ở A1: `getUser()` bọc try/catch (giống `/login`, khác `/todo` fail-closed) → lỗi Supabase vẫn render trang công khai với `viewer: null`.
- `t.raw("rootFurther.paragraphs")` trả mảng — ép kiểu `as string[]` tại đúng một chỗ, ngay trong `page.tsx`.

## Requirements

- **FR-001 / A0** — `/` render cho mọi khách, không redirect (đã mở đường ở phase 04).
- **FR-003 / FR-601 / BR-002 / INT-001** — role đọc phía server; "Trang quản trị" chỉ hiện khi `admin`; lỗi → `member`.
- **BR-001** — anon thấy link đăng nhập, không thấy bell; authed thấy bell + nút tài khoản.
- **FR-202 / BR-003 / BR-004** — countdown seed từ server, tick client; env thiếu/sai → `00/00/00` + vẫn "Coming soon".
- **FR-002** — copy lấy từ next-intl `home.*`, cả vi lẫn en.
- **BR-005** — `unreadCount` truyền cố định `0`.

## Architecture

```
GET /  → app/page.tsx (Server Component)
          ├─ createClient() → getUser()            (try/catch → null khi lỗi: fail-open)
          ├─ user ? getUserRole(supabase, user.id) : null      → viewer {email, isAdmin}
          ├─ parseEventStart(process.env.EVENT_START_AT)       → targetIso: string | null (+ console.warn 1 lần khi sai)
          ├─ initialNowMs = Date.now()
          ├─ getLocale() + getTranslations("home")             → copy: HomeCopy
          └─ <HomeClient copy locale viewer targetIso initialNowMs logoutAction />
                └─ "use client": useSelectLocale() → onSelectLocale
                   <HomeScreen … countdown={<CountdownTimer targetIso initialNowMs />} unreadCount={0} />
                        └─ CountdownTimer: useCountdown(targetIso, initialNowMs) → <CountdownTiles …/>
```

## Related Code Files

**Create**: `app/home-client.tsx`, `components/home/countdown-timer.tsx`
**Modify**: `app/page.tsx` (thay `redirect()` bằng render thật; thêm `export const metadata`), `.env.local` (thêm `EVENT_START_AT=2026-12-26T18:30:00+07:00`, file gitignored), `messages/{vi,en}.json` **chỉ khi** thiếu leaf so với `HomeCopy` (phase 03 đã kết thúc)
**Delete**: —

## Implementation Steps

1. Đọc `components/home/home-copy.ts` (phase 02) và `messages/vi.json` `home.*` (phase 03), đối chiếu leaf path. Thiếu leaf nào thì bổ sung vào **cả hai** locale, giữ parity test xanh.
2. `components/home/countdown-timer.tsx`: `"use client"`; props `{ targetIso: string | null; initialNowMs: number }`; `const { days, hours, minutes, showComingSoon } = useCountdown(targetIso, initialNowMs);` (destructure ngay tại call site — luật React Compiler); render `CountdownTiles` + nhãn "Coming soon" theo `showComingSoon`.
3. `app/home-client.tsx`: `"use client"`; props `{ copy, locale, viewer, targetIso, initialNowMs, logoutAction }`; `const { handleSelectLocale } = useSelectLocale();` rồi render `HomeScreen` với `countdown={<CountdownTimer …/>}`, `unreadCount={0}`, `onSelectLocale={handleSelectLocale}`, `logoutAction`.
4. `app/page.tsx`: xoá `redirect()`; `export const metadata = { title: "SAA 2025" }`; hàm `getViewer()` bọc try/catch quanh `getUser()` + `getUserRole` → `{ email, isAdmin } | null`.
5. `app/page.tsx`: `const targetIso = parseEventStart(process.env.EVENT_START_AT)` — dùng `parseTargetDate` của phase 03, chỉ truyền xuống chuỗi ISO đã validate (`null` khi sai) + `console.warn` một lần phía server.
6. `app/page.tsx`: `const locale = normalizeLocale(await getLocale()); const t = await getTranslations("home");` dựng `copy: HomeCopy` (paragraph dùng `t.raw`), rồi render `<HomeClient … logoutAction={logoutAction} />` (import `logoutAction` từ `@/app/todo/actions`).
7. Ghi `EVENT_START_AT` vào `.env.local` để `pnpm dev` thấy đồng hồ chạy. KHÔNG commit giá trị, KHÔNG dùng tiền tố `NEXT_PUBLIC_`.
8. `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm test:unit:coverage` (vẫn 100% — `.tsx` không nằm trong allowlist), `pnpm build`, `pnpm build-storybook` — tất cả exit 0.
9. Chạy thử `pnpm exec playwright test tests/e2e/home.spec.ts --reporter=list` để tự kiểm; kết quả chính thức do phase 06 ghi. **Không sửa file test** — sai lệch nào cũng chữa ở phía code.

## Todo List

- [x] Đối chiếu `HomeCopy` ↔ `messages/home.*`, gap-fill nếu thiếu (không thiếu leaf nào — `slug`/`image` giải quyết bằng merge trong `page.tsx`, `footer.copyright` tái dùng `login.footer`, `header.languageLabel` lấy từ `LOCALE_LABEL`)
- [x] `components/home/countdown-timer.tsx` (client, gọi `useCountdown`)
- [x] `app/home-client.tsx` (client boundary, `useSelectLocale`)
- [x] `app/page.tsx` Server Component: viewer fail-open + targetIso + initialNowMs + copy + metadata
- [x] `.env.local` có `EVENT_START_AT` (đã có sẵn từ trước, không cần sửa)
- [x] typecheck / lint / format / unit 100% / build / build-storybook exit 0
- [x] tự chạy `home.spec.ts` trước khi bàn giao phase 06 (27/27 pass)

## Success Criteria

- **SC-001** `/` trả 200 cho anon và authed, không redirect (FR-001).
- **SC-002** anon thấy `a[aria-label="Đăng nhập"]`, không có bell; authed thấy bell + nút tài khoản (FR-208, BR-001).
- **SC-003** sau 1 phút (`page.clock`) số phút giảm đúng 1 (FR-202).
- **SC-004** qua mốc → `00/00/00`, ẩn "Coming soon"; env sai → `00/00/00` nhưng vẫn hiện "Coming soon" (BR-003, BR-004).
- **SC-005** admin thấy "Trang quản trị", member không (FR-403, FR-601, BR-002).
- **SC-006** widget mở đúng 2 `menuitem` (FR-210).
- `pnpm build` exit 0 **khi không có** `EVENT_START_AT` trong môi trường (BR-004 không được làm gãy build).

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Hydration mismatch ở 3 ô số | M×H | Seed `initialNowMs` từ server, không `Date.now()` ở render client đầu; kiểm console warning khi `pnpm dev` |
| Leaf `home.*` thiếu → `t()` ném lỗi lúc render | M×H | Bước 1 đối chiếu trước khi viết `page.tsx`; parity test + `pnpm build` bắt sớm |
| Prop hàm vượt ranh giới Server Component → build fail | M×M | Mọi handler nằm trong `HomeClient`; Server Component chỉ truyền Server Action (`logoutAction`) và dữ liệu tuần tự hoá được |
| Cả cây re-render mỗi giây (jank) | M×M | Slot `ReactNode` — hook nằm trong `CountdownTimer`, `HomeClient` không tick |
| `[role="menu"]` trùng khi 2 menu cùng mở → strict-mode E2E đỏ | L×M | Mỗi menu tự đóng qua `useMenuKeyboardNav` (click ngoài/Esc); nếu vẫn trùng, sửa ở Track A qua phase 06, không sửa test |
| Track A đổi tên prop sau khi contract chốt | L×H | Contract ở `plan.md` là ràng buộc; lệch → trả về `momorph-ui-implementer`, không tự sửa `components/home/**` |

## Security Considerations

- Chỉ render email/role của **chính** viewer; không liệt kê người dùng khác. `getUserRole` chạy qua RLS own-row với JWT của caller.
- Fail-open chỉ áp cho **nhãn hiển thị** — không có quyết định phân quyền nào ở `/`; `/admin` tự guard ở feature sau.
- `EVENT_START_AT` server-only, không lộ vào bundle; không log giá trị env, không log `user.id`.
- `logoutAction` tái dùng nguyên trạng (đã `signOut()` + `redirect("/login")`), không tạo action mới → không mở thêm bề mặt POST.

## Next Steps

Phase 06: tester chạy lại đúng lệnh RED cho ra GREEN + full `pnpm test:e2e`, rồi visual validation; lỗi UI trả về `momorph-ui-implementer`.
