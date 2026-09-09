---
status: forward-draft
authored_by: takumi
created: 2026-09-09
lang: vi
target: docs/vi/system/permissions.md
---

# Bổ sung dự kiến — F012_NotificationsPanel

> **Forward-draft.** Đây là phần dự kiến nối vào cuối `docs/vi/system/permissions.md` khi
> F012 lên code thật. Chưa đối chiếu as-built. Mọi dòng gốc của file đích giữ nguyên.

## Vì sao feature này chạm tài liệu phân quyền

F012 mở **trục phân quyền thứ hai** cho dự án. Cho tới nay trục duy nhất là *đã đăng nhập hay
chưa* (route-guard `/login`, `/todo`, `/profile`), cộng một cột `role` chỉ dùng để ẩn/hiện một
link trong menu. F012 thêm **quyền theo sở hữu dữ liệu ở tầng cơ sở dữ liệu**: một Sunner chỉ
được đọc những dòng `notifications` mang `user_id` của chính mình.

Đây là lần đầu ranh giới quyền của dự án nằm **trong Postgres** chứ không phải trong middleware
hay trong component. Sau F012, phân loại hệ thống nên chuyển từ `other` sang **`ownership`** —
hoặc `hybrid` nếu `/admin` cũng lên trong cùng chu kỳ.

## Ranh giới mới

| Tài nguyên | Ai đọc được | Ai ghi được | Cưỡng chế ở đâu |
|---|---|---|---|
| `public.notifications` | Chỉ chủ dòng (`user_id = auth.uid()`) | **Không ai** qua đường người dùng | RLS `SELECT` own-row |
| `notifications.is_read` | — | Chỉ chủ dòng, và chỉ cột này | RLS `UPDATE` own-row |
| Ghi thông báo mới | — | Chỉ trigger `SECURITY DEFINER` | Không cấp INSERT policy cho `authenticated` |

**Người nhận không phải người ghi.** Thông báo sinh ra từ hành động của *người khác* (gửi Kudos,
thả tim), nên chủ dòng không có lý do gì để được quyền INSERT. Đây là cùng một hình dạng đã dùng
cho `sync_kudo_heart_count()` (migration `0007`) và `open_secret_box()` (`0011`): dữ liệu người
dùng không được tự ghi thì đi qua `SECURITY DEFINER`.

## Hai điểm cần kiểm bằng test, không được tin suông

1. **Kênh realtime cũng phải qua RLS.** Supabase Realtime tôn trọng RLS, nhưng đây là lần đầu dự
   án dùng realtime — phải có test chứng minh người dùng B **không** nhận được sự kiện INSERT của
   A, chứ không chỉ đọc tài liệu Supabase rồi tin.
2. **Không phân biệt "của người khác" với "không tồn tại".** Đánh dấu đã đọc trên một id lạ và
   trên id của người khác phải trả về **cùng một kết quả**. Phân biệt hai trường hợp là rò rỉ sự
   tồn tại của dòng dữ liệu người khác.

## Ranh giới cố ý KHÔNG mở

- Không có quyền `DELETE` cho người dùng trên `notifications`. Chưa spec, chưa test case nào yêu
  cầu — thêm vào là bịa một quyền không ai đặt hàng (cùng lý lẽ migration `0009` từ chối thêm
  UPDATE/DELETE cho `kudos`).
- Không có quyền cho admin đọc thông báo của người khác. `/admin` chưa tồn tại.
- Payload của Kudos ẩn danh **không được** chứa tên thật hay `sender_id`. Ranh giới ẩn danh của
  dự án cho tới nay nằm ở view `kudos_cards`; F012 mở một đường đọc thứ hai, và đường đó phải giữ
  cùng lời hứa. Đây là chỗ dễ rò nhất trong feature này.
