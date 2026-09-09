---
title: "Phase 9 — GREEN, visual validation, gate toàn bộ"
feature: F012
status: pending
priority: P1
effort: 1.5h
owner: tester
---

# Phase 9 — GREEN + visual + gate

## Context Links

- [phase-01](phase-01-e2e-red-notifications.md) — `redCommand` phải chạy lại **y hệt**
- MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/6-1LRz3vqr
- [plan.md](plan.md) § Verification

## Overview

**Priority** P1 · **Status** pending · Depends on: 03, 05, 06, 07, 08.

Đóng vòng `e2e-red-first`: chạy lại đúng lệnh RED cho ra GREEN, rồi kiểm hình.

## Key Insights

1. **Cùng một lệnh, không đổi cờ, không đổi file.** Đổi lệnh giữa RED và GREEN làm bằng chứng vô
   giá trị.
2. **Không nới test để lấy màu xanh.** Một test đỏ = quay lại phase sở hữu file đó với phạm vi hẹp,
   không sửa assertion.
3. **Tự kiểm lại lời khai của agent.** Trước khi báo GREEN, chạy tận tay các truy vấn `psql` ở
   Success Criteria của phase 02/03 — "đã pass" không thay được số liệu.
4. **Dọn `.playwright-mcp/` trước `format:check`**, và cuộn trang trước khi chụp ảnh (ảnh lười tải
   sẽ trông như vỡ).
5. **TC-002 và TC-019 là hai test tốn công nhất và cũng quan trọng nhất** — chúng là bằng chứng
   duy nhất rằng realtime tôn trọng RLS.

## Requirements

Toàn bộ FR-001..603 trừ phần out-of-scope; TC-001..021 trừ 014.

## Related Code Files

**Sửa**: chỉ `tests/e2e/**` khi test có lỗi *của chính nó*. **KHÔNG** sửa `src/**` ở phase này —
lỗi implementation trả về đúng phase sở hữu.

## File ownership

```
tests/e2e/**
plans/260909-0239-notifications-panel/evidence/**
```

## Implementation Steps

1. `supabase status` — instance local đang chạy; **không** `db reset`.
2. `pnpm test:e2e tests/e2e/notifications.spec.ts` (+ file emitter nếu đã tách).
3. Ghi `evidence/green-<ts>.json`: cùng `redCommand`, `exitCode: 0`, số test pass, tên file.
4. Visual: Playwright MCP mở `/`, đăng nhập phiên test đã seed, mở panel, chụp 4 trạng thái
   (trống · 3 mục · 10 mục + "Xem thêm" · `kudos_hidden` có link) và đối chiếu frame `589:9132`.
5. Gate đầy đủ, đúng thứ tự:
   `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm test:unit:coverage` → `pnpm build`
   → `pnpm typecheck` → `pnpm build-storybook`.
6. Ghi `plans/action-items.md`: nợ emitter `kudos_hidden`/`secret_box_available`, TC-014,
   `profile/page.tsx` chưa dùng `getViewer()`.

## Todo List

- [ ] e2e GREEN cùng lệnh RED
- [ ] evidence GREEN
- [ ] 4 ảnh đối chiếu MoMorph
- [ ] 6 lệnh gate xanh
- [ ] action-items ghi nợ

## Success Criteria

- `pnpm test:e2e tests/e2e/notifications.spec.ts` exit **0**, 20 test pass, 1 skip (TC-014 kèm lý do).
- TC-002 pass: phiên B **không** nhận được sự kiện INSERT của A và không đọc được row của A.
- TC-019 pass: badge tăng không cần reload.
- TC-020 pass: id lạ và id người khác trả **cùng** kết quả.
- 6 lệnh gate đều exit 0. `.playwright-mcp/` không còn trong cây làm việc.
- Không có sửa đổi nào dưới `src/` trong commit của phase này.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Test đỏ bị dán nhãn "flaky/có sẵn" | Trung | Cao | chạy lại 3 lần + `psql` xác minh dữ liệu trước khi kết luận |
| Dev server lạ ở :3000 làm sai kết quả | Trung | Trung | kiểm PPID trước |
| Realtime chậm hơn timeout mặc định | Trung | Trung | `expect.poll` với timeout rộng, **không** `waitForTimeout` cứng |
| CI nghiêm hơn local (`--max-warnings 0`, `format:check`, `build-storybook`) | Cao | Trung | chạy đủ 6 lệnh ở local trước khi push |

## Security Considerations

Dọn user test bằng `deleteTestUser`; không để lại row `notifications` mồ côi. Không in service-role
key vào log/evidence.

## Next Steps

`reviewer` → `rebuild-spec` core pass (đường dẫn mới dưới `src/domain`, `src/api`) → doc-writer nối
`spec/system/permissions.md` vào `docs/vi/system/permissions.md` → `/tkm:ship`.
