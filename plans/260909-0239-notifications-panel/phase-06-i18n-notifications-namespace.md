---
title: "Phase 6 — namespace i18n notifications.* (vi/en)"
feature: F012
status: completed
priority: P1
effort: 0.5h
owner: implementer
result: messages/vi.json + en.json (notifications scope); parity test xanh; dời home.notifications.empty; giữ home.header.notificationsLabel
---

# Phase 6 — i18n `notifications.*`

## Context Links

- [clarifications.md](clarifications.md) § Ngôn ngữ hiển thị — **authoritative**: mở namespace
  `notifications.*` cấp cao, **dời** `home.notifications.empty` sang đó, **giữ**
  `home.header.notificationsLabel` tại chỗ
- [technical-spec.md](spec/F012_NotificationsPanel/technical-spec.md) § 6
- [study](reports/researcher-260909-0244-study.md) § 8 (repo không có `useTranslations` client,
  chưa dùng `t.rich` ở đâu)
- `src/__tests__/.../messages-parity.test.ts` (giữ vi/en đồng bộ)

## Overview

**Priority** P1 · **Status** pending · Depends on: 02 không bắt buộc — chạy song song với 03/04.
Chặn 07.

Chỉ đụng `messages/*.json`. Không đụng `.tsx`, không đụng `page.tsx` (phase 07 làm việc đó).

## Key Insights

1. **Study đề nghị nhét vào `home.notifications.*`; clarifications đã bác.** Lý do giữ nguyên
   quyết định: cây `types.*` là copy của một feature riêng; tiếp tục mượn `home` bắt **mọi** trang
   phải nạp namespace `home` chỉ để hiện thông báo. Không mở lại.
2. **Không dùng `t.rich`** — lệch có chủ ý so với technical-spec § 6. Repo không có
   `useTranslations` client, không có `NextIntlClientProvider`, và message phải dựng ở client
   (FR-501). Thay vào đó template chứa marker văn bản `<link>Tiêu chuẩn cộng đồng ↗</link>`, hàm
   thuần `splitLinkTemplate` (phase 04) cắt ra, component render `<Link href={ROUTES.STANDARDS}>`.
   Được gì: không thêm pattern mới, không đẩy toàn bộ messages xuống client, logic có unit test
   trong project `node`. Mất gì: marker là quy ước riêng, phải có test giữ nó — chính là test của
   `splitLinkTemplate` + TC-015.
3. **Interpolation `{senderName}`** cũng do `formatNotificationMessage` xử lý ở client, không do
   next-intl. Giữ đúng cú pháp `{tên}` để sau này chuyển sang ICU không phải sửa bản dịch.
4. **vi là bản chuẩn, en soi gương.** `messages-parity.test.ts` sẽ đỏ nếu lệch khoá — đó là gate.

## Requirements

FR-501 (message không lưu text, dựng từ template ⇒ đổi ngôn ngữ hồi tố), FR-502 (link `/standards`).
TC-009, TC-015.

## Architecture

```
messages/vi.json
  notifications: { title, markAllRead, loadMore, empty,
                   types: { kudosReceived, heartReceived, secretBoxAvailable, kudosHidden } }
messages/en.json  ← gương của vi, cùng khoá cùng thứ tự
home.notifications.empty  ── DỜI ĐI ──▶ notifications.empty
home.header.notificationsLabel ── GIỮ NGUYÊN (aria-label của nút header)
```

## Related Code Files

**Sửa**: `messages/vi.json`, `messages/en.json`
**KHÔNG chạm**: `src/**` (phase 07 sửa nơi đọc), `page.tsx` bất kỳ

## File ownership

```
messages/vi.json
messages/en.json
```

## Implementation Steps

1. Thêm khối `notifications` cấp cao vào `vi.json`, đặt đúng vị trí bảng chữ cái/thứ tự hiện có.
2. Nội dung vi (bám MoMorph + spec):
   - `title`: "Thông báo" · `markAllRead`: "Đánh dấu đọc tất cả" · `loadMore`: "Xem thêm"
   - `empty`: chuyển nguyên văn từ `home.notifications.empty` ("Bạn chưa có thông báo")
   - `types.kudosReceived`: "**{senderName}** đã gửi Kudos cho bạn"
   - `types.heartReceived`: "**{actorName}** đã thả tim cho Kudos của bạn"
   - `types.secretBoxAvailable`: "Bạn có một suất Hộp bí mật mới"
   - `types.kudosHidden`: "Kudos của bạn đã bị ẩn. Xem <link>Tiêu chuẩn cộng đồng ↗</link>"
3. Bản `en` soi gương, cùng khoá cùng thứ tự, giữ nguyên marker `{…}` và `<link>…</link>`.
4. Xoá `home.notifications` khỏi **cả hai** file. Giữ `home.header.notificationsLabel`.
5. `pnpm test:unit` — `messages-parity.test.ts` phải xanh.

## Todo List

- [x] khối `notifications` ở vi (title, markAllRead, loadMore, empty, types{4})
- [x] gương en, cùng thứ tự khoá (không dùng t.rich — repo không có NextIntlClientProvider)
- [x] dời `home.notifications.empty`, giữ `home.header.notificationsLabel`
- [x] parity test xanh

**Chú thích kế hoạch:** Phase 06 ghi "không dùng `t.rich`" — lệch có chủ ý so với technical-spec. Blueprint đề nghị ICU message ở server; thực tế là message template lưu i18n, dựng ở client bằng `formatNotificationMessage` (phase 04) với hàm thuần `splitLinkTemplate`. Không thêm pattern mới, không đẩy messages xuống client bundle vô ích.

## Success Criteria

- `python3 -c "import json;d=json.load(open('messages/vi.json'));print('notifications' in d, 'notifications' in d['home'])"` → `True False`.
- Cùng lệnh với `en.json` → `True False`.
- `messages-parity.test.ts` xanh (số lượng + thứ tự khoá vi/en khớp).
- `grep -rn "home.notifications" src messages` → chỉ còn kết quả trong phase 07 sau khi 07 xong;
  ngay sau phase này, `messages/` không còn khoá đó (build sẽ đỏ ở `src` cho tới khi 07 chạy —
  **đúng ý**, 07 phụ thuộc 06).

## Risk Assessment

| Rủi ro | KN | TĐ | Countermove |
|---|---|---|---|
| Dời khoá làm 4 page.tsx gãy build | Chắc chắn | Trung | có chủ ý; 07 chạy ngay sau, cùng PR, không merge lẻ phase 06 |
| Marker `<link>` bị dịch/đổi ở bản en | Trung | Trung | test `splitLinkTemplate` chạy trên **cả hai** template |
| Tên khoá `types.*` lệch với `NotificationType` | Trung | Trung | map camelCase↔snake_case đặt một chỗ trong `domain/notifications/message.ts` |

## Security Considerations

Không có. Không chứa dữ liệu người dùng.

## Rollback

`git revert` — hai file JSON, không schema, không state.

## Next Steps

Phase 07 nối copy này vào 4 điểm render header.
