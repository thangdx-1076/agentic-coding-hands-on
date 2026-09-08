# Tính năng F009_KudosCompose — Hướng dẫn đọc

Đọc các tệp của tính năng này theo thứ tự, rồi mở đặc tả đầy đủ màn hình từ bảng dưới.

**Trạng thái:** `implemented` theo nghĩa "đã đăng ký vào `docs/`" — spec được promote ở
**implement-start** (trước phase 01 của `plans/260907-2338-kudos-write-modal/`), cùng cách F007/F008.
Bằng chứng RED/GREEN và visual capture do phase 01/15 sinh ra.

## Thứ tự đọc

1. [functional-spec.md](functional-spec.md) — làm gì, hành vi ra sao, màn hình hiển thị gì
2. [technical-spec.md](technical-spec.md) — triển khai ra sao

## Màn hình trong tính năng này

| Màn hình | SCR | Đặc tả |
|---|---|---|
| Viết Kudo (dialog) | SCR008_KudosCompose | [`docs/vi/screens/SCR008_KudosCompose/spec.md`](../../screens/SCR008_KudosCompose/spec.md) |

SCR008_KudosCompose là dialog phủ trên SCR007_KudosLiveBoard, mở từ pill mà F007 đã render nhưng cố tình
chưa gắn handler.

## Mã đã cấp (allocation log)

| Registry | Max trước lượt này | F009 dùng gì |
|---|---|---|
| F### | F008_KudosHeartReaction | **F009_KudosCompose** (next free) — đã đăng ký vào `feature-list.md` và `_canonical-fcodes.json` |
| SCR### | SCR007_KudosLiveBoard | **SCR008_KudosCompose** (next free) — đã đăng ký vào `screen-list.md`, có `spec.md` riêng |
| US### | US003 (chỉ F001/F002 đăng ký) | **Không đăng ký mới** — dùng US001-US004 local/draft (functional-spec.md § 6), tiền lệ F003-F008 |
| ROUTE### | ROUTE001 | **Không cấp mới** — `createKudo`/`searchSunners` là Server Action, không route BE |
| BL### | BL003 | **Không cấp mới** — dùng lại `SupabaseServerClient` (BL002) qua `src/dal/sunner-search.ts` |
| PERM### | PERM004 | **Chưa cấp — TBD (draft)** — `kudos_insert_own` + 2 policy `storage.objects` là bề mặt quyền GHI mới, chờ core pass cấp mã; mô tả ở `docs/vi/system/permissions.md § Bổ sung dự kiến — F009_KudosCompose` |
| MODEL### | *(xem `entities.md`)* | **Không cấp mới** — mở rộng `Kudo` (2 cột ẩn danh), thêm `KudoImage` trên `storage.objects`; chờ core pass |

## Giới hạn của spec này

- Promote ở implement-start → mọi tham chiếu code trong 2 spec ban đầu mang nhãn `(planned)` /
  `TBD (draft)`. **Cập nhật 2026-09-08**: code đã lên thật (nhánh `feat/kudos-write-modal`, 27/27
  e2e GREEN) — `technical-spec.md` đã đối chiếu lại với real `path:line` citation cho hầu hết Source
  line; `functional-spec.md § 11/§ 12` cũng cập nhật theo as-built. Nguồn sự thật vẫn là
  `clarifications.md` + 26 spec item / 57 test case MoMorph
  (`plans/260907-2338-kudos-write-modal/momorph/`) cho mọi quyết định thiết kế/hành vi.
- **Bổ sung 2026-09-08 (Addlink Box)**: nút "Chèn liên kết" trên toolbar, trước đây gọi
  `window.prompt`, nay mở dialog `<dialog>` native lồng "Thêm đường dẫn" (A5, SM-002, BR-007,
  BR-008) — không cấp F###/SCR### mới, xem `plans/260908-0919-kudos-addlink-box/clarifications.md`.
  Đã implement và reconcile về real `path:line` (e2e `kudos-link-dialog.spec.ts` 11/11 GREEN).
- Design có **4 trường bắt buộc** (Danh hiệu có node `*` thật) trong khi 57 test case tải về chỉ
  biết 3 — hợp đồng e2e cố ý đi xa hơn CSV, lý do ở `clarifications.md § Hai node`.
- 3 frame không có node data (dropdown gợi ý người nhận, state lỗi, state đã tick ẩn danh) →
  dựng theo pattern repo, không đoán số đo.
