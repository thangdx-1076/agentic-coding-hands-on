---
title: "Phase 3 — Migration 0013: 2 emitter trigger SECURITY DEFINER"
feature: F012
status: pending
priority: P1
effort: 1.5h
owner: implementer
---

# Phase 3 — Migration `0013` (emitter)

## Context Links

- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 3 (**vì sao trigger, không
  phải server action** — 3 lý do, không thiết kế lại)
- [clarifications.md](clarifications.md) § Phạm vi 4 loại — **chỉ 2 emitter**
- Mẫu: `supabase/migrations/0007_kudo_hearts.sql:99-129` (`sync_kudo_heart_count`, writer duy nhất)
- [study](reports/researcher-260909-0244-study.md) § 1, § 2

## Overview

**Priority** P1 · **Status** pending · Depends on: 02. Song song được với 04 và 06.

Hai trigger `AFTER INSERT`: `emit_kudos_received()` trên `public.kudos`, `emit_heart_received()`
trên `public.kudo_hearts`. Không có trigger nào trên DELETE, không có emitter cho
`kudos_hidden` và `secret_box_available`.

## Key Insights

1. **Trigger, không phải server action.** `create-kudo.ts:144-153` insert đúng một dòng và **không
   có transaction**; thêm lần ghi thứ hai ở tầng app tạo cửa sổ ghi-một-nửa. Thả tim đã có tiền lệ
   trigger giữ `heart_count`. Không mở lại quyết định này.
2. **FR-405 xử lý bằng `EXCEPTION WHEN OTHERS THEN RAISE WARNING`, không nuốt im.** Emit hỏng →
   kudos/tim vẫn thành công, log có tiếng kêu (TC-021).
3. **`unique_violation` là dedupe đúng ý, không phải lỗi** — bắt riêng
   `EXCEPTION WHEN unique_violation THEN RETURN NEW;` trước nhánh `WHEN OTHERS` (FR-404/TC-013).
   Thứ tự nhánh quan trọng: `OTHERS` đặt trước sẽ nuốt mất `unique_violation` và biến dedupe thành
   WARNING rác.
4. **Tự gửi / tự thả tim: RETURN sớm, không phát** (FR-402/EC001/BL02). `NEW.sender_id =
   NEW.receiver_id` cho kudos; với tim là `NEW.user_id = (chủ kudos)`.
5. **Ranh giới ẩn danh nằm ở chỗ đọc.** `payload.senderName` lấy `kudos.anonymous_name` khi
   `NEW.is_anonymous`, ngược lại tên thật từ `public.users`. **`sender_id` và tên thật tuyệt đối
   không vào payload** (BL03/EC002) — đây là chỗ rò dễ nhất của cả feature.
6. **`SECURITY DEFINER` luôn kèm `SET search_path = public, pg_temp`** (0007:99-104) — thiếu là
   đường leo quyền.

## Requirements

FR-401 · FR-402 · FR-403 · FR-404 · FR-405. TC-010, 011, 012, 013, 021.

## Architecture / Data flow

```
INSERT public.kudos ──AFTER──▶ emit_kudos_received()
     │ sender_id = receiver_id? ──▶ RETURN NEW (im lặng)
     └─▶ INSERT notifications(user_id=NEW.receiver_id, type='kudos_received',
            payload={kudosId, senderName})     senderName = is_anonymous ? anonymous_name : users.name
INSERT public.kudo_hearts ──AFTER──▶ emit_heart_received()
     │ người thả = chủ kudos? ──▶ RETURN NEW
     └─▶ INSERT notifications(user_id=owner, type='heart_received',
            payload={kudosId, actorId, actorName})
         unique bộ phận trúng ──▶ WHEN unique_violation ──▶ RETURN NEW
DELETE public.kudo_hearts ──▶ (không có trigger — EC004, thông báo cũ ở lại)
```

## Related Code Files

**Tạo**: `supabase/migrations/0013_notification_emitters.sql`
**Đọc**: `0007_kudo_hearts.sql`, `0009_*` (cột `anonymous_name`), `0012_notifications.sql`
**KHÔNG chạm**: `src/**`, `0012_*.sql`

## File ownership

```
supabase/migrations/0013_notification_emitters.sql
```

## Implementation Steps

1. `CREATE OR REPLACE FUNCTION public.emit_kudos_received() RETURNS trigger LANGUAGE plpgsql
   SECURITY DEFINER SET search_path = public, pg_temp`.
2. Trong thân: guard tự gửi → `RETURN NEW`; tính `senderName`; `INSERT INTO public.notifications`;
   `EXCEPTION WHEN OTHERS THEN RAISE WARNING '...' ; RETURN NEW;`.
3. Tương tự `emit_heart_received()`, thêm nhánh `WHEN unique_violation THEN RETURN NEW;` **trước**
   `WHEN OTHERS`.
4. `DROP TRIGGER IF EXISTS` rồi `CREATE TRIGGER ... AFTER INSERT ON ... FOR EACH ROW EXECUTE
   FUNCTION ...` cho cả hai.
5. `COMMENT ON FUNCTION` cho cả hai: nói rõ vì sao là trigger chứ không phải action, và vì sao
   không có trigger DELETE.
6. `supabase migration up`, rồi kiểm bằng `psql` theo Success Criteria.

## Todo List

- [ ] `emit_kudos_received` + guard tự gửi + payload ẩn danh
- [ ] `emit_heart_received` + thứ tự nhánh EXCEPTION đúng
- [ ] 2 trigger AFTER INSERT, không có DELETE
- [ ] COMMENT ON FUNCTION nêu lý do
- [ ] `migration up` sạch

## Success Criteria

- `psql`: insert 1 kudos A→B ⇒ đúng 1 dòng `kudos_received` cho B; insert kudos A→A ⇒ **0 dòng**.
- Kudos ẩn danh: `SELECT payload FROM notifications ...` — payload **không chứa** `sender_id` và
  không chứa tên thật của A; `senderName` = `kudos.anonymous_name`.
- Thả tim → bỏ tim → thả lại: `SELECT count(*) ... type='heart_received'` = **1**, và dòng đó
  **vẫn còn** sau lần bỏ tim (EC004).
- Tự thả tim cho kudos của mình ⇒ 0 dòng.
- TC-021: tạm `ALTER TABLE notifications ADD CONSTRAINT` giả để emit fail (hoặc revoke tạm) →
  `INSERT INTO kudos` vẫn thành công, log có `WARNING`. Khôi phục sau khi kiểm.
- E2E: TC-010..013 và 021 đỏ vì assertion UI (chưa có panel), **không** vì emitter.

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Tên thật rò vào payload của kudos ẩn danh | Trung | **Nghiêm trọng** | criteria kiểm payload bằng psql; reviewer đọc lại nhánh `is_anonymous` |
| `WHEN OTHERS` đặt trước nuốt `unique_violation` | Cao | Trung | Insight 3 + criteria đếm = 1 |
| Trigger nuốt lỗi im lặng → mất thông báo không ai biết | Trung | Trung | bắt buộc `RAISE WARNING`, không `NULL` |
| `search_path` thiếu | Thấp | Cao | copy nguyên khuôn `0007:99-104` |

## Security Considerations

`SECURITY DEFINER` chạy quyền owner — thân hàm chỉ được insert vào `public.notifications`, không
được nhận tham số từ client. Không dùng `EXECUTE` động.

## Rollback

```sql
DROP TRIGGER IF EXISTS ... ON public.kudos;
DROP TRIGGER IF EXISTS ... ON public.kudo_hearts;
DROP FUNCTION IF EXISTS public.emit_kudos_received(), public.emit_heart_received();
```
Thông báo đã phát ở lại — đúng ý, không xoá dữ liệu người dùng.

## Next Steps

Không chặn ai. Kết quả được phase 09 xác nhận GREEN.
