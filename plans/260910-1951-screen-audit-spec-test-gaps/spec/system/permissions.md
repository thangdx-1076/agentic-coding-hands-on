---
status: draft
authored_by: takumi
created: 2026-09-10
lang: vi
target: docs/vi/system/permissions.md
kind: system-doc-delta
---

# Delta phân quyền — đường đọc công khai cho "10 SUNNER NHẬN QUÀ MỚI NHẤT"

Chỉ ghi phần THAY ĐỔI. Mọi mục khác của `docs/vi/system/permissions.md` giữ nguyên.

## Quyết định cũ bị đảo — phải sửa, không được để hai chỗ nói ngược nhau

`docs/vi/system/permissions.md:408-414` đang chốt dứt khoát:

> Trục đọc mirror đúng pattern RLS own-row […] không có cách nào đọc lượt mở hộp của người khác
> qua bảng này — **không cần view SECURITY DEFINER nào cho đường đọc**, khác `profile_cards`/
> `kudos_cards` (2 view đó tồn tại vì cần phơi dữ liệu CỦA NGƯỜI KHÁC; **log mở hộp thì không**)

Lý do đảo: F007 FR-219 (`MaZUn5xHXZ` rows D, D.3, D.3.2, D.3.4) yêu cầu `/kudos` — **trang công
khai**, `anon` đọc được — hiển thị 10 người nhận quà gần nhất. Đó đúng là "phơi dữ liệu của người
khác". Khi viết lại mục này, phải nói rõ nó thay thế kết luận cũ, kèm lý do; đừng thêm một mục mới
để hai chỗ cùng tồn tại.

## Ranh giới của view mới

Cần một view SECURITY DEFINER (`security_invoker = false`) trên `secret_box_openings` join
`users`, theo đúng pattern `kudos_cards` (`0006`/`0009`) và `profile_cards` (`0005`).

Cột được phơi — đúng những gì row D.3.4 cần render và không hơn:

| Cột | Vì sao cần | Ghi chú |
|---|---|---|
| `user_id` | row D.3.2/D.3.4: click avatar/tên → mở profile | `profile_cards` đã phơi id theo cùng lý do |
| `full_name` | tên hiển thị (bold 22px `#FFEA9E`) | |
| `avatar_url` | avatar tròn 64×64 | |
| `opened_at` | khoá sắp thứ tự `DESC` + lấy 10 | |
| `badge_key` | dòng "mô tả quà" | xem Quyết định mở D004 bên dưới |

**Tuyệt đối không phơi**: `email`, `role`, `locale`, `created_at`, `updated_at` của `users` —
cùng ranh giới `0005`/`0006` đã vạch (SEC_004). Quyền: `GRANT SELECT TO anon, authenticated`,
`REVOKE ALL` phần còn lại. Không đổi `security_invoker = true` — bật lại RLS own-row là view
trả rỗng cho mọi khách.

Bảng `secret_box_openings` **giữ nguyên** RLS own-row hiện có. View là đường đọc thứ hai, hẹp
hơn; không nới policy của bảng gốc.

## Điều thực sự bị công khai — cần người xác nhận

View này làm ba dữ kiện thành công khai với cả `anon`: **ai** đã mở hộp quà, **lúc nào**, và
**badge nào**. Trước đây không ai ngoài chính chủ đọc được. Design yêu cầu vậy (đây là bảng vinh
danh trên trang công khai) nên chủ ý là rõ, nhưng nó là nới lỏng quyền riêng tư thật, không phải
thuần kỹ thuật — ghi vào tài liệu như một quyết định có chủ đích, đừng để nó lẫn vào phần mô tả
kỹ thuật.

Giới hạn 10 hàng gần nhất là ràng buộc hiển thị, **không phải** ranh giới bảo mật: view phơi toàn
bộ log cho ai truy vấn trực tiếp. Nếu chỉ muốn lộ 10 hàng thì phải là RPC nhận `limit`, hoặc view
có `LIMIT` bên trong. Nói rõ điều đã chọn, đừng để người đọc sau tưởng `LIMIT 10` ở tầng gọi là
một tường bảo mật.

## Quyết định mở

- **D004** — `badge_key` là 1 trong 6 badge icon (`stay-gold`, `flow-to-horizon`, `touch-of-light`,
  `beyond-the-boundary`, `revival`, `root-further`; `0011:71-74`). Design row D.3.4 lại viết mô tả
  quà vật lý ("Nhận được 1 áo phông SAA") và ghi "Data source: populated from prize draw result" —
  một nguồn dữ liệu không tồn tại trong repo. **Đã chốt cho lần này**: render caption của badge,
  vì đó là dữ liệu thật đang có. Quà vật lý cần bảng riêng và là quyết định của người.
- **rankUps** ("10 SUNNER CÓ SỰ THĂNG HẠNG MỚI NHẤT") vẫn rỗng: không có bảng theo dõi thăng hạng.
  Không có delta phân quyền nào cho nó. Đừng gộp với view trên.
