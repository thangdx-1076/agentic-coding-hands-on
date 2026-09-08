---
status: draft
authored_by: takumi
created: 2026-09-08
lang: vi
---

<!-- Forward-draft delta cho CountdownPrelaunchPage (F011, provisional). Đối chiếu với
docs/vi/system/architecture.md hiện có — chỉ viết phần THAY ĐỔI do feature này, đúng heading
shape "## Bổ sung dự kiến — {FeatureName}" đã dùng cho F007-F010. KHÔNG chạm docs/ thật. -->

## Bổ sung dự kiến — CountdownPrelaunchPage

> **[CountdownPrelaunchPage — chưa build, forward-draft]** Delta của feature đang author trong
> `plans/260908-1653-countdown-prelaunch-page/`. Quyết định gốc: `clarifications.md § Session
> 2026-09-08`. Mã feature `F011` chưa cấp chính thức — cấp ở promote, KHÔNG đoán số ở đây ngoài
> ghi chú tham chiếu.

### Route mới, PUBLIC, không route-guard

`src/app/(public)/prelaunch/` (Server Component `page.tsx`) — cùng nhóm `(public)` như `/`,
`/awards`, `/standards`; không qua `(protected)/layout.tsx`, không đọc session để quyết định
hiển thị. Tái dùng nguyên trạng đã có ở trang chủ: `countdown.ts`/`use-countdown.ts`/
`countdown-tiles.tsx` — 3 file này CLIMB scope-ladder từ `(home)/_utils`/`_hooks`/`_components`
lên `src/utils`/`src/hooks`/`src/components` (thư mục dùng chung ở Zone A, không phải Zone B),
vì nay có ≥2 route consumer (`(home)` và `prelaunch`) — cùng nguyên tắc climb đã áp dụng cho
`SiteHeader`/`SiteFooter`/`get-viewer.ts` ở các đợt trước, chỉ khác đích: lần này lên hẳn Zone A
(`src/<layer>/`) vì cả 2 consumer là component/hook/util thuần, không phải chrome đặc thù route.
`src/components/` là thư mục MỚI (chưa tồn tại trong repo tính tới F010) — feature này là consumer
đầu tiên của nó.

### Điểm mới THẬT SỰ: mở rộng edge guard `src/proxy.ts`, KHÔNG phải một file `middleware.ts` mới

Repo này chạy Next 16 — bản đã đổi tên `middleware.ts` thành `proxy.ts` (xem `AGENTS.md` +
`src/proxy.ts` đã tồn tại với `config.matcher`). Khoá điều hướng của feature này vì vậy là một
nhánh MỞ RỘNG bên trong `proxy()` đã có, chạy TRƯỚC/song song nhánh guard đăng nhập optimistic
hiện tại — không phải một file guard thứ hai.

Điều kiện khoá là **AND của 2 vế**, cờ mới `PRELAUNCH_LOCK_ENABLED`, **mặc định TẮT**:

```text
khoá khi:  PRELAUNCH_LOCK_ENABLED === "true"  AND  countdown chưa về 0
```

Lý do bắt buộc mặc định tắt: `playwright.config.ts` và `.env.local` đều đặt `EVENT_START_AT` ở
tương lai — nếu khoá chỉ dựa vào countdown một mình, mọi route sẽ redirect về `/prelaunch` trong
dev/CI, làm đỏ toàn bộ 135 e2e test hiện có và app không vào được khi dev.

**Ngoại lệ miễn khoá (không route nào trong danh sách này bị redirect dù khoá đang bật):**
`/prelaunch` (chính nó), `/auth/*` (khoá sẽ hỏng OAuth callback), `/api/*` (route handler, không
phải trang), `/_next/*` và mọi file tĩnh có phần mở rộng (loại ở tầng `config.matcher`, phần còn
lại kiểm trong thân hàm `proxy()`). Khi countdown đã về 0, khoá tự gỡ hoàn toàn dù cờ còn `true`;
vào lại `/prelaunch` lúc đó bị đưa về `/`.

`config.matcher` hiện tại (`/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`) là
whitelist hẹp — cần MỞ RỘNG để khớp gần như mọi route (trừ `_next`/file tĩnh, loại ở matcher) mới
khoá được đúng nghĩa "toàn bộ điều hướng". Cú pháp matcher "tất cả trừ..." chính xác cho Next 16
chưa được xác nhận trong draft này — xem `technical-spec.md § 5.3 Unresolved Questions`.

### Không đổi

Không service backend mới, không Supabase call mới (feature không chạm database — biến môi
trường là nguồn dữ liệu duy nhất). Hai lớp guard hiện có (`proxy.ts` optimistic +
`(protected)/layout.tsx` authoritative) giữ nguyên cơ chế cho `/todo`/`/profile`; nhánh khoá
prelaunch là một quyết định ĐỘC LẬP, không thay thế hay làm yếu nhánh auth hiện có.
