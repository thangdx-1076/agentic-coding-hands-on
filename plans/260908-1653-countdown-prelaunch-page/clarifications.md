# Clarifications — Countdown Prelaunch Page

MoMorph refs:
- Countdown - Prelaunch page: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
- testPolicy: e2e-red-first

## Session 2026-09-08

Resolved by the orchestrator under CLAUDE.md § "Quyết định thay tôi, đừng hỏi" (priority: (a)
Recommended → (b) matches an existing repo pattern → (c) fewest files changed). No option below
risks data loss, spend, or secret exposure, so none was escalated.

- Q: Route path cho màn prelaunch? → A: `/prelaunch` dưới `src/app/(public)/prelaunch/`. Rule (b) —
  mọi màn public hiện có đều nằm trong route group `(public)`; màn này không cần auth (TC
  `e6a59553` cho phép anonymous).
- Q: Nguồn target datetime — spec ghi `TODO: thiết kế API endpoint`? → A: tái dùng env
  `EVENT_START_AT` đã có, validate bằng đúng `parseTargetDate` mà `(home)/page.tsx:152` đang dùng.
  Rule (b) + DRY. Không dựng endpoint mới cho một giá trị mỗi năm đổi một lần.
- Q: Khoá điều hướng bằng middleware hay client guard? → A: edge guard, không phải client guard.
  Spec nói "toàn bộ điều hướng bị khoá" — client guard không khoá được direct URL, nên không phải
  là hiện thực của yêu cầu này.
- Q: ~~`src/middleware.ts`~~ → **SỬA (2026-09-08, sau khi researcher đọc code + Next docs):** repo
  chạy Next 16.3.4, ở bản này `middleware.ts` đã đổi tên thành `proxy.ts`. `src/proxy.ts` đã tồn
  tại sẵn (auth guard + locale cookie). Tạo `src/middleware.ts` mới thì file đó **không bao giờ
  chạy**. → Mở rộng `src/proxy.ts` đang có, không tạo file mới. Xác minh: `src/proxy.ts` có thật,
  `next@16.3.4`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Q: `config.matcher` hiện là whitelist literal 6 route — mở thế nào để khoá được mọi đường? → A:
  đổi sang negative lookahead `"/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"`,
  cú pháp lấy đúng từ proxy.md § Matcher. **Kèm điều kiện bắt buộc:** `proxy()` phải short-circuit
  kiểm tra lock TRƯỚC, rồi với route không nằm trong whitelist cũ thì `return NextResponse.next()`
  ngay — không gọi `getUserOrNull`. Nếu không, mọi asset/route sẽ ăn thêm một round-trip Supabase
  `getUser()`, đúng cái "proxy overreach" mà comment trong `src/proxy.ts` đã ghi là đã cân nhắc và
  loại bỏ. Hành vi của 6 route cũ giữ nguyên tuyệt đối.
- Q: Middleware khoá dựa trên điều kiện gì? → A: hai điều kiện AND — `PRELAUNCH_LOCK_ENABLED === "true"`
  **và** target chưa về 0. Cờ mới, mặc định OFF. Lý do: `playwright.config.ts:70` và `.env.local:4`
  đều đặt `EVENT_START_AT` ở tương lai; khoá chỉ theo countdown sẽ redirect mọi route về
  `/prelaunch`, làm đỏ toàn bộ 135 e2e test hiện có và làm app không vào được khi dev. Rule (c).
- Q: Đường nào được miễn khoá? → A: `/prelaunch`, `/auth/*` (OAuth callback — khoá là hỏng đăng nhập),
  `/api/*`, `/_next/*`, `/favicon.ico` và mọi file tĩnh có phần mở rộng. Matcher loại `_next` ở tầng
  config, phần còn lại kiểm trong hàm.
- Q: Vào `/prelaunch` sau khi countdown về 0 thì sao? → A: redirect `/` — chỉ khi lock đang bật. Lock
  tắt thì `/prelaunch` render bình thường, để còn xem/test/chụp visual được.
- Q: Tái dùng `CountdownTiles` của homepage hay dựng riêng? → A: tái dùng. Node sub-tree
  `Frame 485 / Group 5 / Group 4 / LABEL` giống hệt `mm:2167:9037`. Nâng file từ
  `(home)/_components/` lên `src/components/` để hai route cùng dùng — đúng luật WHERE của
  `nextjs-route-colocation-architecture` (shared khi ≥2 route dùng). Kéo theo `_utils/countdown.ts`
  → `src/utils/countdown.ts` và `_hooks/use-countdown.ts` → `src/hooks/use-countdown.ts`.
- Q: Copy tiêu đề lấy ở đâu? → A: next-intl, khoá mới `prelaunch.*` trong `messages/vi.json` +
  `messages/en.json`. VI "Sự kiện sẽ bắt đầu sau" / EN "Event starts in" đúng như spec item `0.2`.
  Nhãn DAYS/HOURS/MINUTES tái dùng `home.hero.*` (đã có, cùng chữ) — DRY.
- Q: 4 test case ACCESSING (`68d82c58`, `e6a59553`, `1c266552`, `17aa9e0d`) hiện thực thế nào? → A:
  không hiện thực. Cả 4 đều là boilerplate sinh tự động, Sub_Category ghi thẳng "Access control
  unspecified" và Expected_Result là "---" hoặc "as per application configuration". Màn này public,
  không có phân quyền. Ghi nợ, không bịa yêu cầu.
- Q: Background image? → A: `2268:35129 MM_MEDIA_BG Image` + `2268:35130 Cover`. Dùng lại asset nền
  của hero homepage nếu trùng; nếu không thì tải asset từ MoMorph. Xác nhận ở Track A.

## Ghi nợ

- 4 ACCESSING test case bỏ qua có chủ đích (lý do ở trên).
- Font "Digital Numbers" vẫn chưa được nạp — `CountdownTiles` fallback `monospace`. Nợ này có sẵn
  từ phase homepage, màn này thừa hưởng, không làm nặng thêm.
