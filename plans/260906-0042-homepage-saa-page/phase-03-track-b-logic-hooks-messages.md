---
phase: 03
feature: F003
status: completed
priority: P0
test_policy: e2e-red-first
effort: 2.5h
owner: implementer
file_ownership: ["lib/countdown/countdown.ts", "lib/countdown/countdown.test.ts", "lib/auth/get-user-role.ts", "lib/auth/get-user-role.test.ts", "hooks/use-countdown.ts", "hooks/use-countdown.test.ts", "hooks/use-select-locale.ts", "hooks/use-select-locale.test.ts", "mocks/handlers.ts", "messages/vi.json", "messages/en.json"]
---

# Phase 03 — Track B: logic thuần, hooks, messages, MSW

## Context Links

- `spec/homepage/technical-spec.md` § 3.1 A2, § 4.4 BR-004, § 4.5 ALG-001 + INT-001
- `spec/homepage/functional-spec.md` FR-002, FR-003, FR-202, BR-003, BR-004, US001, US002
- `clarifications.md` § Hero/Countdown, § Header (role, language selector), § Nội dung tĩnh
- `research/researcher-01-next16-homepage-patterns.md` § 1 (seed countdown), § 6 (`t.raw` + parity test)
- `research/researcher-02-supabase-local-role-notifications.md` § 1 (role read), § 2 (MSW trả mảng)
- `.claude/skills/write-unit-tests-and-storybook-stories/SKILL.md` (allowlist 100%)

## Overview

**Priority**: P0 · **Status**: pending
Nền Track B: 2 module thuần (`countdown`, `get-user-role`), 2 hook (`use-countdown`, `use-select-locale`), copy vi/en cho `home.*`, và 1 MSW handler cho `public.users`. Không đụng route, không đụng component — phase 05 mới ráp. Chạy song song Track A và phase 04.

## Key Insights

- Chia lớp bắt buộc: tính toán ở `lib/`, state/effect ở `hooks/`, không JSX ở đâu trong phase này. Hook trả **object có tên**, không phải mảng vị trí.
- Seed `useState(initialNowMs)` từ prop server → render client đầu tiên trùng byte với SSR; KHÔNG `suppressHydrationWarning` (khác giả định spec draft § 5.2 — clarifications + research thắng).
- Tick **1000ms**, không phải 60s như spec draft: E2E dùng `page.clock.runFor(1000)` rồi `fastForward("00:01:00")`, đồng hồ phải nhả trạng thái mới trong vòng 1 giây.
- `getUserRole` nhận client **được inject** để stub khi test — không tự `createClient()` bên trong (khác code shape research 02 § 1; đổi theo clarifications để chạy được ở project `node`).
- Parity test flatten cả index mảng → `home.rootFurther.paragraphs: string[]` hai locale phải **cùng độ dài**, lệch là đỏ.
- File mới trong `lib/**` và `hooks/**` lọt vào mẫu số đo phủ với 0% nếu thiếu test → CI đỏ ngay. Test đi cùng phase, không hoãn.

## Requirements

- **FR-202 / ALG-001 / BR-003** — đếm ngược ngày/giờ/phút, pad ≥2 chữ số, days ≥100 hiện 3 chữ số, không âm; tới/qua mốc → `00/00/00` + ẩn "Coming soon".
- **BR-004** — `EVENT_START_AT` thiếu/sai ISO-8601 → `parseTargetDate` trả `null`; countdown `00/00/00` nhưng **vẫn hiện** "Coming soon"; không throw.
- **FR-003 / FR-601 / INT-001 / BR-002** — role đọc phía server, fail-open `member` khi lỗi hoặc không có row.
- **FR-002** — mọi copy tĩnh có bản vi + en, cùng key set.

## Architecture

```
lib/countdown/countdown.ts  parseTargetDate(iso?) -> Date|null · remaining(target, nowMs) -> {days,hours,minutes,reached} · pad2(n) -> string
hooks/use-countdown.ts      useCountdown(targetIso, initialNowMs) -> {days,hours,minutes,showComingSoon}   (setInterval 1000, clear khi unmount)
lib/auth/get-user-role.ts   getUserRole(supabase, userId) -> 'member'|'admin'                              (maybeSingle, try/catch, fail-open)
hooks/use-select-locale.ts  useSelectLocale() -> {isPending, handleSelectLocale(l)}                         (useTransition + setLocale)
mocks/handlers.ts           GET {SUPABASE_URL}/rest/v1/users?select=role&id=eq.<uuid> -> JSON ARRAY
messages/{vi,en}.json       home.* mirror leaf path của HomeCopy (phase 02)
```

## Related Code Files

**Create**: `lib/countdown/countdown.ts(+.test.ts)`, `lib/auth/get-user-role.ts(+.test.ts)`, `hooks/use-countdown.ts(+.test.ts)`, `hooks/use-select-locale.ts(+.test.ts)`
**Modify**: `mocks/handlers.ts`, `messages/vi.json`, `messages/en.json` · **Delete**: —

## Implementation Steps

1. RED trước — `lib/countdown/countdown.test.ts`: `parseTargetDate` với `undefined`/`""`/`"not-a-date"` → `null`, ISO hợp lệ → `Date`. `remaining`: còn 1 ngày 2 giờ 3 phút; đúng mốc (`reached: true`, mọi số 0); quá mốc (không âm); ≥100 ngày. `pad2`: `0→"00"`, `7→"07"`, `123→"123"`.
2. Viết `lib/countdown/countdown.ts` theo pseudocode ALG-001 (`totalMin = floor(max(0, target - nowMs) / 60000)`).
3. RED — `hooks/use-countdown.test.ts` (project jsdom, `vi.useFakeTimers`): render đầu dùng `initialNowMs` (không gọi `Date.now()`); sau 1000ms có cập nhật; `targetIso: null` → `00/00/00` + `showComingSoon: true`; qua mốc → `00/00/00` + `showComingSoon: false`; unmount clear interval.
4. Viết `hooks/use-countdown.ts`: `useMemo(parseTargetDate)`, `useState(initialNowMs)`, `useEffect` + `setInterval(1000)` (bỏ qua khi target `null`), trả object đã `pad2`.
5. RED — `lib/auth/get-user-role.test.ts`: stub client 5 nhánh — `role='admin'` → `'admin'`; `role='member'` → `'member'`; `error` khác null → `'member'`; `data` null → `'member'`; client ném exception → `'member'`.
6. Viết `lib/auth/get-user-role.ts`: `supabase.from("users").select("role").eq("id", userId).maybeSingle()` trong try/catch; tham số kiểu interface tối thiểu (không đòi kiểu đầy đủ `SupabaseClient`) để stub gọn.
7. RED — `hooks/use-select-locale.test.ts`: `vi.mock("@/app/actions/locale")`; `handleSelectLocale("en")` gọi `setLocale` đúng 1 lần với `"en"`; `isPending` phản ánh transition. KHÔNG đụng `use-login-actions.ts`.
8. Viết `hooks/use-select-locale.ts`: `useTransition` + `startTransition(() => setLocale(l))`, trả `{ isPending, handleSelectLocale }`.
9. `mocks/handlers.ts`: thêm handler `users` trả **mảng** (`[{ role: "member" }]` khi `id === eq.${MOCK_USER.id}`, ngược lại `[]`) — fixture dùng chung theo luật "MSW một module, hai runtime". Không unit test nào lệ thuộc nó (helper nhận client inject); ghi 1 dòng comment nói rõ đây là fixture cho Storybook/browser.
10. `messages/vi.json`: thêm khối `home.*` chép nguyên văn `momorph/texts.json`, leaf path khớp `HomeCopy` phase 02 (đọc `components/home/home-copy.ts` nếu đã có; chưa có thì theo hợp đồng ở `plan.md`). `messages/en.json`: bản dịch, `rootFurther.paragraphs` cùng số phần tử. Tái dùng `login.footer` cho copyright — KHÔNG tạo key trùng.
11. `pnpm test:unit`, `pnpm test:unit:coverage`, `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm format:check` — tất cả exit 0.

## Todo List

- [x] `lib/countdown/countdown.ts` + test (RED → GREEN)
- [x] `hooks/use-countdown.ts` + test jsdom (seed, tick 1s, null, qua mốc, cleanup)
- [x] `lib/auth/get-user-role.ts` + test (5 nhánh, fail-open)
- [x] `hooks/use-select-locale.ts` + test
- [x] MSW handler `users` trả mảng
- [x] `messages/{vi,en}.json` khối `home.*`, parity xanh
- [x] đo phủ 100% / typecheck / lint / format exit 0

## Success Criteria

- `pnpm test:unit:coverage` exit 0 và **100%** trên allowlist (4 file mới đều được phủ) — ALG-001, INT-001, BR-003, BR-004 mỗi cái có case tương ứng.
- `lib/i18n/messages-parity.test.ts` xanh mà không phải sửa test (FR-002).
- Không file `.tsx` nào bị chạm; `lib/**` không import React; hook không chứa JSX/className.
- `hooks/use-login-actions.ts` và `app/actions/locale.ts` giữ nguyên (DRY: `setLocale` tái dùng).

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| Số đo phủ < 100% vì nhánh catch không được gọi | H×H | Mỗi hàm có case stub ném exception; chạy `pnpm test:unit:coverage` trước khi báo xong |
| Leaf path `home.*` lệch `HomeCopy` của Track A | M×M | Đọc `components/home/home-copy.ts` trước khi viết messages; lệch thì phase 05 gap-fill (03 đã kết thúc, không đồng thời) |
| `paragraphs` hai locale lệch số phần tử → parity đỏ | M×M | Dịch theo từng phần tử, đếm lại trước khi báo xong |
| Tick 1s làm test jsdom flaky | M×M | `vi.useFakeTimers()` + `advanceTimersByTime`, không dùng timer thật |
| Handler MSW `users` trả object thay vì mảng | L×M | Research 02 § 2: `maybeSingle()` trên GET dùng `Accept: application/json` → server trả mảng |

## Security Considerations

- `getUserRole` **fail-open** là có chủ đích: role ở đây là nhãn hiển thị, không phải cổng bảo mật. Cổng thật thuộc `/admin` ở feature sau — ghi rõ trong JSDoc để không ai tái dùng nhầm làm authz.
- Không log `userId`, không log payload Supabase. Không service-role key; helper chỉ dùng client do caller inject (RLS own-row).
- `EVENT_START_AT` là server-only, KHÔNG `NEXT_PUBLIC_*` — phase này chỉ nhận giá trị đã parse qua tham số.

## Next Steps

Phase 05 import 2 hook + 2 module lib này để ráp `app/page.tsx` và `app/home-client.tsx`. Không bàn giao gì cho Track A (Track A không được import `hooks/use-countdown`).
