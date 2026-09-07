# Clarifications — Thể lệ UPDATE (`/standards`)

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6
  (file "SAA 2025 - Internal Live Coding", frame `3204:6051`, 1440×1796, bg `#00101A`)
- design_status: `done` · spec_status: `done` · dev_status: `none`
- Specs: 4 items (`momorph/specs.csv`) · Test cases: 9 (`momorph/test-cases.csv`)
- Preview: `data/preview.png` · Assets: `assets/` (12 files)

## Session 2026-09-07

Không có câu hỏi nào bị treo — mọi gap được chốt tại chỗ theo CLAUDE.md
§ "Quyết định thay tôi, đừng hỏi". Liệt kê dưới đây để review.

- Q: Design là drawer/panel (spec A gọi là "Panel", footer có nút "Đóng"), nhưng
  repo đang có link chết `href="/standards"`. Làm route page hay modal?
  → A: **Route page `/standards`**. Lý do: (a) `site-footer.tsx:74` đã trỏ sẵn
  `/standards` với mm ref `I5001:14800;1161:9487` — đây là link chết duy nhất
  gỡ được trong 1 vòng; (b) khớp pattern `/awards` đã có (Server Component →
  buildCopy → Client component); (c) không chỗ nào trong code hiện tại mở modal
  này, làm modal thì phải bịa thêm trigger. Panel giữ nguyên hình dạng
  right-aligned sheet trên nền `#00101A`.

- Q: Nút "Đóng" trên route page thì đóng cái gì?
  → A: `router.back()`, fallback `ROUTES.HOME` khi không có history
  (direct-load / tab mới). Khớp TC_THELE_FUN_003 "previous content is shown".

- Q: Nút "Viết KUDOS" trỏ đâu — `/kudos` chưa tồn tại?
  → A: `/kudos`. Đã có 4 link khác trỏ `/kudos` (`site-header.tsx:70`,
  `site-footer.tsx:67`, `kudos-section.tsx:63`, `widget-button.tsx:154`).
  Thêm link thứ 5 là nhất quán với trạng thái hiện tại, không phải regression
  mới. Không disable, không đổi đích.

- Q: TC_THELE_GUI_003 + TC_THELE_FUN_005 test trạng thái `disabled` của 2 nút
  footer. Có implement không?
  → A: **Không**. Trên trang thể lệ tĩnh không tồn tại điều kiện nào làm nút
  disabled — spec B chỉ mô tả disabled như một state chung của component
  Button. Implement state không đạt tới được là vi phạm YAGNI. Ghi vào
  "Nợ lại"; nếu sau này có điều kiện thật (vd chưa đăng nhập) thì mở lại.

- Q: Nguồn nội dung — Supabase table như `/awards`, hay static i18n?
  → A: **Static i18n**, namespace `standards` trong `messages/{vi,en}.json`.
  Nội dung thể lệ là copy tĩnh của chương trình, không có CRUD, không có
  quantity/prize per row như awards. Thêm bảng DB là YAGNI.

- Q: Copy EN lấy đâu?
  → A: MoMorph `list_file_localizations` (target_lang `en`) — dữ liệu của
  chính design, không bịa. Đã xác nhận có entry cho: "Thể lệ"→"Rules",
  "Viết KUDOS"→"Write KUDOS", "KUDOS QUỐC DÂN"→"NATION KUDOS",
  "NGƯỜI NHẬN KUDOS…"→"KUDOS Receiver: Hero badge for positive influence",
  "Có 1-4 người gửi Kudos cho bạn"→"1-4 people send you Kudos".
  Các string còn lại kéo cùng cách khi implement. `is_reviewed: false` — máy
  dịch, chưa ai duyệt → ghi vào "Tôi cần làm" cho người review.

- Q: Nút "Đóng" không có entry localization (TEXT node tên là
  "Awards Information Navigation Links" — label mặc định của component).
  → A: Lấy literal từ render: vi "Đóng". EN dùng "Close" (chuẩn UI, không phải
  nội dung chương trình). Ghi nhận là suy luận, không phải dữ liệu design.

## Assets

`assets/` — copy sang `public/standards/` khi implement.

| File | Nguồn | Ghi chú |
|---|---|---|
| `new-hero.png` (126×22) | crop `data/preview.png` @ (947,260,1073,282) | export MCP trả `null` |
| `rising-hero.png` (110×20) | `get_media_files` `3204:6172` | |
| `super-hero.png` (109×19) | `get_media_files` `3204:6181` | |
| `legend-hero.png` (110×20) | `get_media_files` `3204:6190` | |
| `badge-revival.png` (80×88) | crop circle @ (983,823,1047,887), pad về 80×88 | export MCP trả `null` |
| `badge-touch-of-light.png` (80×104) | `get_media_files` `3204:6087` | |
| `badge-stay-gold.png` (80×88) | `get_media_files` `3204:6086` | |
| `badge-flow-to-horizon.png` (80×104) | `get_media_files` `3204:6083` | |
| `badge-beyond-the-boundary.png` (80×104) | `get_media_files` `3204:6084` | |
| `badge-root-further.png` (80×104) | `get_media_files` `3204:6088` | |
| `close.svg` (24×24) | `get_media_files` `I3204:6093;186:2759` | |
| `pen.svg` (24×24) | `get_media_files` `I3204:6094;186:1763` | trùng `public/home/Pen.svg` — kiểm tra trước khi thêm |

Hai asset crop từ preview: `get_media_files` và `get_media_file` đều trả
`null`/401 cho `3204:6163` và `3204:6082` (retry 2 lần). Crop tại bbox lấy từ
`get_node` — pixel của chính design, không phải giá trị bịa. Badge REVIVAL
được pad lại để khớp cách exporter loại bỏ TEXT node (các badge khác chỉ có
artwork tròn, caption render bằng HTML).

## Caption badge là TEXT node, không phải ảnh

6 caption (REVIVAL, TOUCH OF LIGHT, STAY GOLD, FLOW TO HORIZON,
BEYOND THE BOUNDARY, ROOT FUTHER) là TEXT node riêng trong node tree → render
bằng HTML, không nướng vào ảnh.

**Đính chính chính tả badge thứ 6 (quan trọng):** tên layer là `ROOT FUTHER`
(thiếu R) nhưng `get_node(I3204:6088;737:20392).character` trả về
**`ROOT FURTHER`**. Nội dung hiển thị là `character`, không phải tên layer →
dùng **"ROOT FURTHER"**. Ghi chú trước đó trong file này (bảo giữ "FUTHER")
là SAI, đã bỏ.

**Hệ quả chung:** `itemName` của TEXT node KHÔNG phải lúc nào cũng bằng nội
dung. Đã đối chiếu `character` cho toàn bộ string quan trọng:
- `I3204:6093;186:2760` → `"Đóng"` (tên layer: "Awards Information Navigation Links")
- `I3204:6094;186:1568` → `"Viết KUDOS"` (cùng tên layer mặc định)
- `3204:6078`, `3204:6091` → name == character, chỉ dư `\n` ở cuối (trim khi dùng)
- 5 caption badge còn lại + 4 tier Hero + 3 heading → name == character

## Test policy

**`e2e-red-first`** — auto-select theo `momorph-development.md` § Test-policy
Resolution bước 3: test cases chứa navigation (`TC_THELE_FUN_003` đóng panel,
`TC_THELE_FUN_004` mở form KUDOS) và scroll behavior (`TC_THELE_FUN_001/002`).

Runner đã có, không cần scaffold:
- `@playwright/test` `1.62.1` (package.json)
- lệnh: `pnpm test:e2e`
- spec dir: `tests/e2e/` (đã có `awards.spec.ts`, `home.spec.ts`, `login.spec.ts`)

`tester` giữ RED; agent UI không được sửa file test.

## Nội dung panel (nguồn: node tree `3204:6051`, text = tên node)

1. Title — "Thể lệ" (`3204:6055`)
2. Section 1 `3204:6132` — "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC"
   - intro `3204:6133`
   - 4 tier: New Hero (1-4) / Rising Hero (5-9) / Super Hero (10–20) / Legend Hero (>20),
     mỗi tier = badge ảnh + dòng điều kiện + đoạn mô tả
3. Section 2 `3204:6077` — "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN"
   - intro `3204:6078` · grid 6 badge (3 cột) · closing `3204:6089`
4. Section 3 `3204:6090` — "KUDOS QUỐC DÂN" + `3204:6091`
5. Footer `3204:6092` — "Đóng" (secondary/outlined, icon X) + "Viết KUDOS" (primary vàng, icon bút)

Ký tự cần giữ nguyên: en-dash trong "10–20", emoji ❤️ trong `3204:6078` và `3204:6091`.

## Session 2026-09-07 (bổ sung — sau Stage 1.5)

- Q: Design không vẽ SiteHeader/SiteFooter — panel bắt đầu ngay bằng title
  "Thể lệ". Route page có bọc chrome như `/awards` không?
  → A: **Không bọc chrome.** MoMorph rule #1: "NEVER guess visual values —
  MCP design data is authoritative". Design không có header/nav/footer thì
  không tự thêm. Lối ra khỏi trang là nút "Đóng" — đúng như design thiết kế.
  Đây là điểm khác biệt có chủ ý so với `/awards`.

- Q: Vùng tối trống bên trái panel (≈900px trong canvas 1440) là gì?
  → A: Đó là chỗ trang bên dưới hiện ra khi panel là overlay. Trên route
  standalone, render panel right-aligned trên nền `#00101A` (màu nền frame
  `3204:6051`) — giữ đúng hình học design: panel bám phải, full height,
  nội dung tự scroll.

- Q: Có làm overlay thật bằng intercepting route (`@modal` + `(.)standards`)
  để "previous content" hiện ra đúng nghĩa không?
  → A: **Không, ở vòng này.** Intercepting route cần cả slot overlay lẫn page
  standalone cho direct-load — gấp đôi bề mặt code cho một trang tĩnh.
  KISS/YAGNI. Ghi vào "Nợ lại": nếu sau này muốn đúng hành vi drawer thì đó
  là đường đi, không phải viết lại.

- Q: US###/ROUTE###/BL###/PERM### cấp mới thế nào?
  → A: Theo tiền lệ F003/F004 — không phát sinh ROUTE###/BL###/PERM### (không
  có BE route, không integration, không guard). F005 / SCR005 đã xác nhận
  không đụng mã cũ (max hiện tại F004/SCR004).

## Session 2026-09-07 (bổ sung 2 — defect bắt được giữa chừng)

- Q: `useStandardsClose` dùng `window.history.length > 1` để chọn `back()` vs
  `push(HOME)`. Có đúng không?
  → A: **Sai.** Phase 01 đo thực tế trong Chromium: direct `goto("/standards")`
  cho `history.length === 2`, không phải 1. Ba kịch bản:

  | Kịch bản | `history.length` | Đúng ra phải |
  |---|---|---|
  | `/` → click footer link → `/standards` | 3 | `back()` |
  | Playwright `goto("/standards")` trực tiếp | 2 | push HOME |
  | Browser thật, gõ URL ở tab mới | 1 | push HOME |

  Không ngưỡng nào tách được 3 ca. Unit test cũ pass vì mock giá trị — nó
  encode cái bug chứ không bắt được bug. Đã trả lại implementer đổi sang tín
  hiệu phân biệt được thật (Navigation API `canGoBack`, hoặc breadcrumb
  sessionStorage), kèm yêu cầu đo trong browser thật chứ không chỉ jsdom.

- Q: C10/C11 trong `standards.spec.ts` assert `expect(page.url()).toContain("/")`.
  → A: **Assertion rỗng** — mọi URL đều chứa `/`, kể cả `/standards`. Hai test
  này sẽ GREEN kể cả khi nút "Đóng" không làm gì. Đã trả lại tester siết thành
  so khớp pathname chính xác, và yêu cầu audit toàn bộ file tìm assertion cùng
  loại (đặc biệt các assert đang pass trên trang 404).

  Bài học ghi lại: RED hợp lệ chưa đủ. Test đỏ vì trang chưa tồn tại vẫn có thể
  chứa assertion rỗng — phải soi từng assert xem nó fail được khi nào.

## Session 2026-09-07 (bổ sung 3 — copy EN)

- Q: Phase 02 chạy trong subagent không có MoMorph MCP nên đã tự dịch EN bằng
  tay. Giữ hay thay?
  → A: **Thay bằng bản MoMorph.** Orchestrator có MCP, đã kéo
  `list_file_localizations` (target_lang `en`) và ghi đè 7 chuỗi trong
  `messages/en.json`: `heroSection.intro`, 3 tier description (new/rising/legend),
  `secretBoxSection.{heading,intro,closing}`, `nationKudosSection.body`.
  Clarifications yêu cầu "dữ liệu của chính design, không bịa" — bản dịch tay
  vi phạm điều đó.

- Q: MoMorph trả `"Sunnercollecting all 6 icons..."` — dính chữ, thiếu dấu cách.
  → A: Sửa thành `"Sunner collecting"`. Đây là lỗi của máy dịch, không phải giá
  trị thiết kế; ship nguyên si là ship một defect nhìn thấy được. Khác với
  `ROOT FURTHER` — cái đó là nội dung thật của design.

- Q: `superHero.description` không có entry EN nào trong MoMorph.
  → A: Giữ bản dịch tay của phase 02, đánh dấu trong action-items cho người
  duyệt. Không bịa ra entry MoMorph không tồn tại.

- Q: `character` của `3204:6182` (Super Hero desc) chứa `\n` giữa câu và `\n\n\n`
  ở cuối.
  → A: `\n` giữa câu là ngắt dòng mềm cho layout, không phải ngữ nghĩa → thu về
  dấu cách. Đuôi `\n\n\n` là padding → cắt. Đã xác nhận không còn `\n` trong
  bất kỳ giá trị nào của namespace `standards`.

**Toàn bộ 20 chuỗi EN đều `is_reviewed: false`** — máy dịch, chưa ai duyệt.
Đã ghi vào `plans/action-items.md` mục "Tôi cần làm".

## Session 2026-09-07 (bổ sung 4 — chốt tín hiệu nút Đóng)

- Q: Thay `history.length` bằng gì?
  → A: **`window.navigation.canGoBack`** (Navigation API). Implementer đo thật
  trong Chromium qua Playwright, chạy với dev server của chính repo:

  | Tín hiệu | Nav in-app qua `<Link>` | `goto()` trực tiếp |
  |---|---|---|
  | `window.history.length` | 3 | 2 |
  | `document.referrer` | `""` | `""` |
  | `navigation.canGoBack` | **true** | **false** |
  | `navigation.entries().length` | 2 | 1 |

  `document.referrer` chết ngay: `<Link>` của Next là chuyển trang same-document
  nên referrer không đổi, rỗng ở cả 2 ca. `history.length` đúng như đã ngờ —
  không ngưỡng nào tách được, vì `about:blank` của Playwright thổi phồng số đếm.
  `canGoBack` là tín hiệu khẳng định, entry list của nó không dính nhiễu đó.

- Q: Navigation API chỉ có ở Chromium. Firefox/Safari thì sao?
  → A: `window.navigation?.canGoBack` là `undefined` → rơi vào nhánh
  `router.push(ROUTES.HOME)`. Chọn mặc định an toàn: về HOME luôn là đích
  bảo vệ được, còn `back()` sai trên direct load thì không. Không đoán.

- Q: TS 5.9.3 chưa có type cho `Navigation` — dùng `any`?
  → A: Không. Khai báo local type hẹp đúng 1 member đang đọc
  (`type NavigationApiWindow = Window & { navigation?: { canGoBack: boolean } }`).

**Nợ lại:** nhánh "API vắng mặt" chỉ được unit test phủ, e2e không chạm tới
vì Playwright ở repo này chỉ chạy Chromium. Đây là giới hạn cấu trúc, không
phải thiếu sót — ghi ra để biết.

## Session 2026-09-07 (bổ sung 5 — defect caption badge, bắt bằng mắt)

- Q: E2E 14/14 xanh, tester báo "visual PASS". Nhưng nhìn trang thật thì mỗi
  badge hiện caption HAI lần. Sao?
  → A: **Ảnh export của MoMorph nướng caption vào raster.** `get_media_files`
  trả nguyên khung instance (80×88 / 80×104), trong đó có cả vùng TEXT node
  caption. Component lại render thêm `<p>` caption theo hợp đồng C5 → in hai
  lần. Riêng badge thứ 6 in ra **hai chính tả khác nhau chồng nhau**:
  "ROOT FUTHER" (nướng trong ảnh) và "ROOT FURTHER" (DOM text).

  E2E không bắt được vì nó chỉ đếm/so DOM text — chữ nằm trong pixel thì
  assertion nào cũng mù. Chỉ nhìn mới thấy.

  **Sửa:** crop lại cả 6 asset về đúng frame `Huy hiệu` bên trong (`get_node`,
  64×64 cho cả 6), bỏ vùng caption. Caption để `<p>` lo — đúng như C5 yêu cầu.

  | Badge | bbox vòng tròn (preview 1440×1796) |
  |---|---|
  | REVIVAL | (983, 823, 1047, 887) |
  | TOUCH OF LIGHT | (1131, 823, 1195, 887) |
  | STAY GOLD | (1280, 823, 1344, 887) |
  | FLOW TO HORIZON | (983, 943, 1047, 1007) |
  | BEYOND THE BOUNDARY | (1131, 943, 1195, 1007) |
  | ROOT FURTHER | (1280, 943, 1344, 1007) |

- Q: Ghi chú cũ trong code bảo "chiều cao lệch 88 vs 104 vì exporter crop
  caption khác nhau" — đúng không?
  → A: Sai. Lệch là vì caption dài ngắn khác nhau chiếm số dòng khác nhau
  TRONG ảnh. Sau khi crop, cả 6 đồng nhất 64×64 → bỏ được bảng height theo
  từng badge và bỏ luôn `fill` + khung `h-[104px]` cố định trong
  `secret-box-badge.tsx`. Code gọn hơn, và đó là dấu hiệu cách hiểu mới đúng.

**Bài học:** GREEN e2e + "visual PASS" của agent không thay được việc tự mở
trang ra nhìn. Assertion DOM mù với chữ nằm trong ảnh.
