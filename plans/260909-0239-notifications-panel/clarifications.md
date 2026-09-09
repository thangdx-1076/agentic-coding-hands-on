# Clarifications — Màn "Tất cả thông báo"

- MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/6-1LRz3vqr
- fileKey `9ypp4enmFmdK3YAFJLIu6C` · screenId `6-1LRz3vqr` · frame `589:9132`
- Nguồn: 13 spec row (`spec_progress: completed`) + 21 test case (`TC-F007-001..021`)
- testPolicy: **`e2e-red-first`** — spec đầy chuyển trạng thái (mark-read, mark-all-read,
  phân trang, đóng/mở popup, badge realtime); runner `@playwright/test` 1.62.1 +
  `pnpm test:e2e` đã có sẵn trong repo, không phải scaffold mới.
- F-code repo: **F012_NotificationsPanel**. Mã `TC-F007-*` trong test case là numbering
  của dự án khác — repo này F007 đã là `F007_KudosLiveBoard`. Không tái dùng mã đó.

## Session 2026-09-09

Theo `CLAUDE.md` § "Quyết định thay tôi, đừng hỏi", mọi gap dưới đây tôi tự chốt.
Không cái nào chạm ngưỡng phải hỏi (mất dữ liệu / tốn tiền / lộ secret).

### Dịch kiến trúc — spec viết cho codebase khác

- Q: Spec gọi đích danh `components/notifications/notification-popup.tsx`, Radix Popover,
  TanStack Query (`notifications.list`, `notifications.unreadCount`), oRPC `authMiddleware`,
  `callAs()`. Repo này không có thứ nào trong số đó. → A: Giữ **hành vi**, bỏ **tên
  file/thư viện**. Map sang: Supabase JS + DAL module (`src/dal/notifications*.ts`) +
  server action, panel nối thẳng vào `src/app/_components/notification-bell.tsx` đã có.
  Đóng/mở popup tái dùng pattern `useMenuKeyboardNav` như `account-menu` và
  `language-selector`, không thêm dependency.
- Q: Spec item 3.5 điều hướng `/community-standards`. → A: Repo là **`/standards`**
  (`ROUTES.STANDARDS`). Dùng route thật, không tạo alias.
- Q: Payload spec ghi `anonymousNickname`. → A: Cột thật là `kudos.anonymous_name`
  (migration 0009). Payload snapshot lấy từ cột đó; giữ tên khoá payload là
  `senderName` đúng như spec, chỉ nguồn đọc là khác.

### Phạm vi 4 loại thông báo — nợ có tên

- Q: `kudos_hidden` (TC-F007-014) cần `admin.setStatus` để ẩn/hiện kudo. Repo không có
  cột `status`/`hidden` trên `public.kudos`, cũng không có admin moderation. → A: Ship
  `kudos_hidden` như **giá trị enum hợp lệ + renderer đầy đủ** (icon EyeOff, message có
  link `/standards`), nhưng **không có emitter** ở v1. Lý do: renderer là thứ TC-F007-007
  / 008 / 009 kiểm bằng cách seed row trực tiếp — vẫn test được. TC-F007-014 (chuỗi
  hide/re-hide/unhide) **out-of-scope**, chờ feature moderation.
- Q: `secret_box_available` — khi nào phát? → A: **Không emitter ở v1**, cùng lý do.
  Suất box là giá trị dẫn xuất `floor(sum(k.heart_count where sender_id = me) / 5)`
  (migration 0011 `open_secret_box()`), không phải sự kiện. Muốn phát đúng thì phải bắt
  thời điểm entitlement vượt mốc nguyên bên trong đường thả tim, kèm một mốc
  "đã báo tới suất thứ N" mới — đó là invariant mới, không nằm trong spec màn này.
  Enum + renderer vẫn ship đầy đủ.
- Q: Vậy v1 phát những loại nào? → A: **`kudos_received`** (insert kudos, bỏ qua tự gửi
  cho mình — EC001/BL02) và **`heart_received`** (thả tim, dedupe theo `kudos_id + actor_id`,
  không xoá khi bỏ tim — EC003/EC004/BL04).

### Badge

- Q: `notification-bell.tsx` hiện vẽ **chấm tròn** không số; spec item 1.1 đòi badge **số**,
  TC-F007-004 đòi hiện "3", TC-F007-005 đòi cap "9+". → A: Đổi sang badge số theo spec.
  Đây là sửa component đã có, không dựng mới.
- Q: `unreadCount` hiện mặc định `0` và không ai truyền
  ([site-header.tsx:82](../../src/app/_components/site-header.tsx)). → A: Đọc ở tầng
  layout/page rồi truyền xuống, cùng đường mà `viewer`/`isAdmin` đang đi.

### Realtime

- Q: Repo chưa dùng Supabase realtime lần nào. → A: Dùng `supabase.channel()` +
  `postgres_changes` trên INSERT của `notifications`, lọc theo `user_id` của chính mình;
  bật publication cho bảng trong migration. RLS phải chặn cả đường realtime
  (TC-F007-002) — realtime tôn trọng RLS, nhưng phải kiểm bằng test thật chứ không tin suông.
- Q: Badge có được client tự tăng không? → A: **Không.** Spec ghi rõ server count là
  nguồn đúng; realtime chỉ invalidate rồi refetch.

### Ngôn ngữ hiển thị

- Q: Message lưu ở đâu? → A: **Không lưu text.** Lưu `type` + `payload`; message dựng ở
  client từ template i18n (`next-intl`), nên đổi ngôn ngữ áp dụng hồi tố cho cả thông báo
  cũ (EC020/BL07, TC-F007-009). vi là bản chuẩn, en soi gương.
- Q: Đặt copy ở namespace nào? Study phát hiện repo **không có** `notifications.*` cấp cao —
  copy của chuông đang nằm ở `home.notifications.empty` và `home.header.notificationsLabel`,
  mọi trang mượn qua `tHome` (kể cả `/awards`, `/kudos`, `/profile`). → A: Mở **namespace
  `notifications.*` cấp cao** cho toàn bộ copy của panel (`title`, `markAllRead`, `loadMore`,
  `empty`, `types.*`), và **dời** `home.notifications.empty` sang đó. Giữ
  `home.header.notificationsLabel` nguyên chỗ — đó là aria-label của nút trong header, thuộc
  copy header. Lý do không nhét `types.*` vào dưới `home`: cây template 4 loại là copy của
  một feature riêng, không phải của trang chủ; tiếp tục mượn `home` chỉ vì tiền lệ sẽ khiến
  mọi trang phải load namespace `home` để hiện thông báo.
- Q: Repo đã dùng `t.rich` chưa? → A: **Chưa, ở đâu cả.** Message `kudos_hidden` cần
  `t.rich` để nhúng link `/standards`. Đây là kỹ thuật mới với repo — phải có test riêng,
  không giả định next-intl hành xử như mong đợi.

### Nơi bơm `unreadCount`

- Q: Chỗ ít sửa nhất để mọi trang có header đều biết số chưa đọc? → A: **Không có "một
  chỗ".** Study xác nhận repo không có layout chung; 4 điểm render `SiteHeader`, mỗi page tự
  gọi viewer riêng, `profile/page.tsx` còn lặp logic thay vì dùng `getViewer()`. Tối thiểu
  ~7 file phải đụng. Không tự ý gom về một layout chung trong phạm vi feature này — đó là
  refactor riêng, và làm kèm sẽ trộn hai thay đổi vào một PR.

### Phát sinh khi chạy (phase 02-03)

- Q: `heart_received` báo cho AI — người gửi hay người nhận kudo? Spec ghi "chủ Kudos", mơ hồ.
  → A: **Người GỬI**. `open_secret_box()` (migration `0011`) tính suất box bằng
  `SUM(k.heart_count) WHERE k.sender_id = v_user_id` kèm comment "Hearts credit the kudo's
  SENDER". Đi theo `receiver_id` sẽ khiến hệ thống **ghi công tim cho một người và báo cho người
  khác**. Đã ghi vào technical-spec § 3; TC-013 kiểm đúng chiều.
- Q: `senderName` bằng gì khi người gửi chưa có `full_name`? **9/21 user trên DB thật đang NULL**
  (đăng nhập Google không phải lúc nào cũng trả tên) — đây là dữ liệu hợp lệ, không phải dị
  thường của test. → A: Payload chụp **`null`**, trigger KHÔNG bịa tên. Fallback nằm ở **tầng
  render**, đúng quy ước sẵn có của repo: `kudos-card-person.tsx:96` dùng
  `person.fullName ?? "Sunner"` và `fullName` khai `string | null` suốt DAL.
  **Ràng buộc cho phase 08**: renderer PHẢI xử lý `null`, nếu không thông báo sẽ hiện
  "null đã gửi Kudos cho bạn". TC-010b ghim hợp đồng này.
- Q: `.env.local` không tới được test (dotenv bị comment ở `playwright.config.ts:7`) → A: thêm
  `getAnonKey()` vào `tests/e2e/helpers/service-role.ts`, suy ra từ CLI y như `getServiceRoleKey()`
  đã làm. Không chép `loadEnv()` tự chế vào từng spec.

## Chưa giải quyết

- Emitter cho `kudos_hidden` và `secret_box_available` — chờ admin moderation và một
  định nghĩa "suất box mới" dạng sự kiện. Đã ghi vào `plans/action-items.md`.
