---
title: "Countdown Prelaunch Page (F011 / SCR009)"
description: "Màn /prelaunch công khai đếm ngược tới EVENT_START_AT, cộng khoá điều hướng toàn site bật/tắt bằng cờ, mặc định TẮT."
status: pending
priority: P1
effort: 7.5h
branch: feat/countdown-prelaunch-page
tags: [prelaunch, countdown, proxy, i18n, refactor, e2e-red-first]
created: 2026-09-08
---

# Countdown Prelaunch Page

Input đã chốt: [`spec/`](./spec/) · [`clarifications.md`](./clarifications.md) ·
[`reports/study-260908-1653-countdown-prelaunch.md`](./reports/study-260908-1653-countdown-prelaunch.md).
Kế hoạch này chỉ sắp thứ tự, chia sở hữu file, rủi ro và đường lùi — không mở lại quyết định thiết kế.

MoMorph: `9ypp4enmFmdK3YAFJLIu6C` / screen `8PJQswPZmU` · testPolicy: **e2e-red-first**

## Phases

| # | Phase | Status | Deps | Effort | Verify |
|---|---|---|---|---|---|
| 01 | [Promote countdown modules lên Zone A](./phase-01-promote-countdown-modules-to-shared.md) | pending | — | 1h | `git show -M --stat` = 5 rename R100 + 1 dòng import |
| 02 | [RED evidence (tester)](./phase-02-red-first-prelaunch-test-evidence.md) | pending | 01 | 1.5h | `pnpm exec playwright test tests/e2e/prelaunch.spec.ts` exit ≠ 0 vì `status()` = 404 |
| 03 | [Route `/prelaunch` + i18n](./phase-03-prelaunch-route-and-i18n.md) | pending | 02 | 2h | `pnpm exec playwright test tests/e2e/prelaunch.spec.ts` GREEN |
| 04 | [Khoá điều hướng trong `src/proxy.ts`](./phase-04-proxy-prelaunch-navigation-lock.md) | pending | 03 | 2h | `pnpm test:unit:coverage` 100% GREEN |
| 05 | [Green verification + docs](./phase-05-green-verification-and-docs.md) | pending | 04 | 1h | Toàn bộ gate CI + 135+ e2e GREEN |

Chuỗi tuyến tính. 03 và 04 vốn độc lập nhưng cả hai đều cần `src/constants/routes.ts`; 03 sở hữu
file đó nên 04 phải chờ — không tách sở hữu chỉ để lấy một chút song song.

## Integration contract (03 ↔ 04 ↔ tester)

DOM của `/prelaunch` — phase 02 viết assertion theo đúng cái này, phase 03 hiện thực theo đúng cái này:

- đúng 1 `[role="timer"]`, bên trong đúng 3 tile; mỗi tile có 1 phần tử số khớp `/^\d{2,}$/` và 1 nhãn
- 3 nhãn theo thứ tự DOM: `DAYS`, `HOURS`, `MINUTES` (tái dùng `home.hero.*`)
- tiêu đề: `prelaunch.title` — vi `Sự kiện sẽ bắt đầu sau`, en `Event starts in`
- KHÔNG có `<header>`, KHÔNG có `<footer>` trên màn này
- `GET /prelaunch` trả status `200`, không redirect (cờ khoá mặc định TẮT)

Hàm quyết định thuần — phase 02 viết test theo đúng chữ ký này, phase 04 hiện thực:

```ts
// src/domain/prelaunch-lock.ts
export type ProxyPlan =
  | { kind: "redirect"; to: "/prelaunch" | "/" }
  | { kind: "pass" }   // NextResponse.next() ngay, KHÔNG chạm Supabase, KHÔNG chạm cookie (BR-005)
  | { kind: "auth" };  // đi tiếp vào nhánh locale + getUserOrNull đã có
export function isPrelaunchLockEnabled(raw: string | undefined): boolean;
export function planProxy(input: {
  pathname: string; lockEnabled: boolean; reached: boolean;
}): ProxyPlan;
```

## Sửa mâu thuẫn spec (đã quyết, không hỏi lại)

`technical-spec.md § 3.2` bảng DEC dòng 2 ghi `/prelaunch` AND (`reached` **OR cờ tắt**) → redirect `/`.
Sai. 4 nguồn khác nói ngược lại: `clarifications.md` ("Lock tắt thì `/prelaunch` render bình thường"),
`FR-103` ("nếu cờ vẫn bật"), `SC-003`, và bảng edge case `functional-spec.md § 9`. Thêm nữa, nếu lấy
theo bảng DEC thì `/prelaunch` sẽ redirect `/` trong MỌI lượt CI (cờ luôn tắt ở đó) và màn này vĩnh
viễn không e2e được. → **Luật đúng: `pathname === "/prelaunch" AND lockEnabled AND reached → redirect "/"`.**

## e2e chứng minh được gì, KHÔNG chứng minh được gì

`playwright.config.ts` ghim `EVENT_START_AT=2099-12-31T18:30:00+07:00` và không set
`PRELAUNCH_LOCK_ENABLED` cho web server; env cố định cho cả lượt chạy nên **không test nào lật được cờ
khoá**. Ma trận đầy đủ ở [phase-02](./phase-02-red-first-prelaunch-test-evidence.md) § Test matrix.
Tóm tắt: e2e phủ trạng thái MỞ (render `/prelaunch`, 6 route cũ + `/kudos` không bị khoá); trạng thái
KHOÁ và trạng thái đã-tới-giờ phủ bằng unit vét cạn trên `planProxy` (gate coverage 100% đã có sẵn),
cộng một recipe kiểm tay ghi trong phase 05. Không dựng runner thứ hai, không thêm `webServer` thứ hai.

## Dependencies

`src/utils/countdown.ts` (sau phase 01) ← `src/hooks/use-countdown.ts` ← `prelaunch-countdown.tsx`;
`src/utils/countdown.ts` ← `src/domain/prelaunch-lock.ts` ← `src/proxy.ts`. Không có bảng Supabase nào
tham gia — đây là feature đầu tiên của repo không chạm database.
