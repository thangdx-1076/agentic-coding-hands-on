---
title: "Phase 1 — E2E RED screen-level cho panel thông báo"
feature: F012
status: completed
priority: P1
effort: 2h
owner: tester
result: E2E RED gate: 20 test + 1 skip (TC-014), fail trên TC-006 assertion như dự kiến
---

# Phase 1 — E2E RED

## Context Links

- [plan.md](plan.md) · [clarifications.md](clarifications.md)
- [functional-spec.md](spec/F012_NotificationsPanel/functional-spec.md) FR-001..603
- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 7 đối chiếu 21 TC
- Mẫu: `tests/e2e/secret-box.spec.ts:32-51` (header tự khai policy + bản đồ TC→test),
  `tests/e2e/helpers/sign-in.ts`, `tests/e2e/helpers/service-role.ts`
- [study](reports/researcher-260909-0244-study.md) § 7

## Overview

**Priority** P1 · **Status** pending · Chặn mọi phase còn lại.

Viết **một** file spec screen-level, chạy `pnpm test:e2e tests/e2e/notifications.spec.ts`, ghi
RED thật vào `evidence/`. Không sửa một dòng `src/` nào trong phase này.

## Key Insights

1. **RED phải đỏ vì assertion của màn, không vì fixture nổ.** Bảng `notifications` chưa tồn tại ở
   thời điểm này, nên mọi test cần seed row sẽ chết ở bước seed — đó là *chưa có schema*, không
   phải *thiếu dependency*, nhưng nó **không đủ tư cách làm bằng chứng RED**. Vì vậy phase này
   chốt một **RED gate subset** gồm các test không cần seed:
   - `TC-006` panel mở ra phải có tiêu đề "Thông báo" + nút "Đánh dấu đọc tất cả" → hôm nay
     `notification-bell.tsx:88-95` chỉ render một chuỗi rỗng ⇒ **assertion fail thật**.
   - `TC-008` trạng thái trống không có nút "Xem thêm" → hiện pass; giữ để bắt hồi quy.
   - `TC-001` khách chưa đăng nhập không thấy chuông → hiện pass; giữ.
   `redFailure` phải trích đúng dòng assertion của TC-006, không được trích lỗi seed.
2. **Test cần seed vẫn viết đủ ngay bây giờ**, đánh dấu `@local-db`. Sau phase 02/03 chúng chuyển
   từ "fixture error" sang "assertion fail" — phase 02 và 03 có acceptance criteria kiểm đúng
   chuyển dịch đó (đỏ vì assertion, không phải vì `relation "notifications" does not exist`).
3. **`TC-F007-014` OUT OF SCOPE** (clarifications § Phạm vi). Không viết test cho nó, ghi một dòng
   `test.skip` kèm lý do + link nợ để người đọc sau không tưởng là quên.
4. **`TC-007` là cách duy nhất kiểm 2 loại không có emitter** — seed trực tiếp 1 row mỗi loại qua
   service role.
5. **Seed người dùng phải đi qua `auth.users`** (`createTestSession` trong `helpers/sign-in.ts`),
   không insert thẳng `public.users` — cột `id` là FK.
6. **Dev server lạ giữ cổng 3000 sẽ giả vờ flaky.** Kiểm PPID trước khi kết luận đỏ.

## Requirements

- Functional: phủ TC-001..013, 015..021 (trừ 014).
- Non-functional: 0 dependency mới; dùng đúng helper sẵn có; không sửa `playwright.config.ts`.

## Architecture / Data flow của test

```
createTestSession(email) ──▶ GoTrue REST ──▶ cookies ──▶ injectSupabaseSession(page)
service-role client ──▶ insert public.notifications (seed 1 row/loại)  ← từ phase 02 trở đi
page.goto("/") ──▶ click [aria-label="Thông báo"] ──▶ assert [role="dialog"] …
afterAll ──▶ deleteTestUser (cascade xoá notifications theo ON DELETE CASCADE)
```

## Related Code Files

**Tạo**
- `tests/e2e/notifications.spec.ts` (nếu > 200 dòng → tách `tests/e2e/notifications-emitters.spec.ts`
  cho TC-010..013, 021; hai file, ownership vẫn thuộc phase này)
- `tests/e2e/helpers/seed-notifications.ts` — seed/cleanup row bằng service role

**Đọc**: `tests/e2e/secret-box.spec.ts`, `tests/e2e/helpers/{sign-in,service-role}.ts`

**KHÔNG chạm**: bất cứ gì dưới `src/`, `supabase/`, `messages/`.

## File ownership

```
tests/e2e/notifications*.spec.ts
tests/e2e/helpers/seed-notifications.ts
plans/260909-0239-notifications-panel/evidence/**
```

## Implementation Steps

1. Header file tự khai: `Policy: e2e-red-first`, ngày, bản đồ `TC → test()`, câu "Tests FAIL now".
2. `test.describe` gắn `{ tag: "@auth @local-db" }` ở cấp block (không gắn từng test).
3. Viết nhóm **no-seed** trước: TC-001, TC-006, TC-008.
4. Viết nhóm **seed**: TC-002 (RLS: user B không đọc được row của A, kể cả qua realtime),
   TC-003/004/005 (badge ẩn · "3" · "9+"), TC-007 (4 loại render), TC-009 (đổi ngôn ngữ hồi tố),
   TC-015 (link `/standards` — **không** `/community-standards`), TC-016/017 (mark-read, bền qua
   reload), TC-018 (phân trang 10 + "Xem thêm" không trùng), TC-019 (realtime), TC-020 (id của
   người khác và id không tồn tại cho **cùng một** kết quả).
5. Viết nhóm **emitter**: TC-010/011/012 (gửi kudos, tự gửi cho mình không phát, ẩn danh chỉ có
   biệt danh), TC-013 (thả/bỏ/thả → đúng 1 row), TC-021 (emit hỏng không làm hỏng thao tác gốc).
6. Chạy `pnpm test:e2e tests/e2e/notifications.spec.ts` (bare, có lọc theo file — **không** thêm
   token `--`).
7. Ghi `evidence/red-<ts>.json`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure`
   (verbatim dòng assertion TC-006), `redEvidence` (đường dẫn log).

## Todo List

- [x] `notifications.spec.ts` + bản đồ TC (2 file, `notifications-emitters.spec.ts` để tách TC-010..013, 021)
- [x] helper seed/cleanup (`tests/e2e/helpers/seed-notifications.ts`)
- [x] chạy → exit code khác 0 (RED đúng)
- [x] `redFailure` trích assertion TC-006, không trích lỗi seed
- [x] ghi evidence (`evidence/red-*.json` đã ghi)

## Success Criteria

- `pnpm test:e2e tests/e2e/notifications.spec.ts` exit ≠ 0.
- Trong output có **ít nhất một** failure là assertion của TC-006 ("Thông báo" / "Đánh dấu đọc
  tất cả" không tìm thấy trong `[role="dialog"]`), **không** phải lỗi cài browser / dev server /
  import.
- 20 test tồn tại (21 TC − TC-014), mỗi test comment mã TC.
- `git status` sạch dưới `src/`, `supabase/`, `messages/`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermove |
|---|---|---|---|
| RED "giả" vì thiếu bảng | Cao | Cao — bằng chứng vô giá trị | RED gate subset no-seed (Insight 1) |
| Dev server lạ ở :3000 | Trung | Trung | kiểm PPID trước khi chạy; không đổi `E2E_PORT` để né |
| service-role key không có | Trung | Cao | `helpers/service-role.ts` đã fallback `supabase status -o env`; export sẵn env trước khi chạy |
| File spec > 200 dòng | Cao | Thấp | tách sẵn file emitter |

## Security Considerations

Không hardcode service-role key vào file test; lấy qua helper. Email test dùng tiền tố cố định để
`deleteTestUser` dọn được. Không commit `.env`.

## Next Steps

Phase 02 (schema) — chạy ngay sau khi evidence RED được ghi.
