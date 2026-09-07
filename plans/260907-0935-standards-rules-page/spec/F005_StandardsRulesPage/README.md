# Tính năng F005_StandardsRulesPage — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — được triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Thể lệ SAA 2025 | SCR005_Standards | [spec.md](../../SCR005_Standards/spec.md) |

## Mã đã cấp (allocation log)

Đọc `docs/vi/generated/{feature-list,user-stories,screen-list,route-list,behavior-logic,
permissions-matrix}.md` trước khi cấp mã, max hiện có trước lượt này:

| Registry | Max trước lượt này | F005 dùng gì |
|---|---|---|
| F### | F004_AwardSystemPage | **F005_StandardsRulesPage** (mới, next free) |
| SCR### | SCR004_Awards | **SCR005_Standards** (mới, next free) |
| US### (registry chính thức `user-stories.md`) | US003 (chỉ F001/F002 đăng ký) | **Không đăng ký mới** — theo đúng tiền lệ F003/F004 (`feature-list.md` § F003, F004: "TBD (draft)"), F005 dùng **US001-US003 local/draft** riêng của feature này (xem functional-spec.md § 7), không ghi đè/mở rộng registry chính thức |
| ROUTE### | ROUTE001 (chỉ `/auth/callback`, F001) | **Không cấp mới** — `/standards` là 1 frontend page (`page.tsx`), không có route BE nào tự viết, cùng lý do F004 không cấp ROUTE### cho `/awards` |
| BL### | BL003 | **Không cấp mới** — nội dung tĩnh i18n, không tích hợp Supabase/external service nào |
| PERM### | PERM004 | **Không cấp mới** — `/standards` PUBLIC, không route-guard, gia nhập đúng nhóm `/` (PERM001, superseded) và `/awards` (F004, không PERM### riêng) |

Không có xung đột mã nào với F001-F004 / SCR001-SCR004.
