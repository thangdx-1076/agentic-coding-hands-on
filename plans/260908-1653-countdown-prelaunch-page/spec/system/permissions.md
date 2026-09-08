---
status: draft
authored_by: takumi
created: 2026-09-08
lang: vi
---

<!-- Forward-draft delta cho CountdownPrelaunchPage (F011, provisional). Đối chiếu với
docs/vi/system/permissions.md hiện có — chỉ viết phần THAY ĐỔI do feature này, đúng heading shape
"## Bổ sung dự kiến — {FeatureName}" đã dùng cho F007-F010. KHÔNG chạm docs/ thật. Không PERM###
nào được cấp số ở đây — chờ Core rebuild-spec pass ở promote. -->

## Bổ sung dự kiến — CountdownPrelaunchPage

> **[CountdownPrelaunchPage — chưa build, forward-draft]** Delta của feature đang author trong
> `plans/260908-1653-countdown-prelaunch-page/`. Quyết định gốc: `clarifications.md § Session
> 2026-09-08`. `PERM###` cho các bề mặt dưới đây vẫn `TBD (draft)` — cấp ở promote.

### `/prelaunch` là route công khai, không route-guard — hệ thống KHÔNG đổi phân loại `other`

`/prelaunch` gia nhập đúng nhóm PUBLIC hiện có (`/`, `/awards`, `/standards`, `/kudos`) — không
qua `(protected)/layout.tsx`, không phân biệt vai trò `member`/`admin`. Màn này không có gì cần
bảo vệ (đếm ngược tĩnh, không PII, không dữ liệu cá nhân), nên không tạo permission-item mới cho
việc XEM màn.

### Trục khoá MỚI: khoá theo THỜI ĐIỂM + CỜ CẤU HÌNH, không phải theo danh tính

Mọi `PERM###` từ F001 tới F010 trả lời câu hỏi "đã đăng nhập hay chưa" (hoặc, với F008/F009, thêm
"có phải chủ sở hữu hàng dữ liệu hay không"). CountdownPrelaunchPage thêm một trục khoá KHÁC HẲN,
không dựa trên danh tính người dùng: **khoá điều hướng dựa trên (a) một cờ cấu hình vận hành
(`PRELAUNCH_LOCK_ENABLED`) và (b) một điều kiện thời gian (đếm ngược đã về 0 hay chưa)**. Người
dùng đã đăng nhập với vai trò `admin` cũng bị khoá y hệt người chưa đăng nhập — trục này không
phân biệt actor.

Vì lý do đó, `PRELAUNCH_LOCK_ENABLED` **KHÔNG phải một permission-item theo actor** (không có
"ai được miễn") — nó là một cổng vận hành áp cho MỌI actor như nhau, gần với khái niệm
maintenance-mode hơn là access-control. Mục "Special Conditions" của tài liệu gốc đã ghi "không có
feature-flag nào gate quyền truy cập" cho `EVENT_START_AT` (chỉ đổi chữ hiển thị) — cờ
`PRELAUNCH_LOCK_ENABLED` là NGOẠI LỆ đầu tiên: đây LÀ một cổng chặn thật (redirect), không chỉ đổi
chữ hiển thị, nhưng vẫn không phải RBAC/ownership vì áp dụng đồng nhất bất kể actor là ai.

### Danh sách miễn khoá — không phải một danh sách quyền, một danh sách kỹ thuật

`/prelaunch`, `/auth/*`, `/api/*`, `/_next/*`, file tĩnh — miễn khoá vì lý do KỸ THUẬT (tránh vòng
lặp redirect, tránh hỏng OAuth callback, route handler không phải trang), không phải vì các route
đó có quyền cao hơn. Không route nào trong danh sách này đổi permission-item của riêng nó do
feature này — `/auth/callback` vẫn nằm ngoài ranh giới đăng nhập/chưa đăng nhập như trước.

### Fail-safe: mặc định TẮT, không fail-open/fail-closed theo nghĩa cũ

Khác các fail-open/fail-closed đã ghi cho F003-F009 (xử lý LỖI khi đọc dữ liệu), cờ này không có
khái niệm "lỗi khi đọc" — nó chỉ có 2 giá trị tường minh (`"true"` hoặc bất kỳ giá trị nào khác =
tắt). Giá trị mặc định khi biến môi trường KHÔNG được set là TẮT (an toàn — không khoá gì), tránh
lặp lại rủi ro đã lường trước: một môi trường quên set biến này sẽ KHÔNG vô tình khoá toàn site.

### Bề mặt cần cấp PERM### thật khi promote

`PERM001`–`PERM004` đã dùng (F001–F006); F007–F010 vẫn `TBD (draft)`. CountdownPrelaunchPage
thêm bề mặt mới dưới đây, cũng chờ mã ở bước promote — KHÔNG đoán số:

- redirect toàn site về `/prelaunch` khi `PRELAUNCH_LOCK_ENABLED=true` VÀ chưa tới giờ sự kiện
- miễn khoá cho `/prelaunch`, `/auth/*`, `/api/*` (bản thân danh sách ngoại lệ)
- gỡ khoá tự động + redirect `/prelaunch` → `/` khi đã tới giờ sự kiện
