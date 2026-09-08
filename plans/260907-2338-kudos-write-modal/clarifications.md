# Clarifications — Viết Kudo (SCR008 / F009)

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
  (file "SAA 2025 - Internal Live Coding", frame `520:11602`, instance modal `520:11647`)
- fileKey: `9ypp4enmFmdK3YAFJLIu6C` · screenId: `ihQ26W78P2`
- Specs: 26 items → `momorph/specs-ihQ26W78P2.csv`
- Test cases: 57 (3 ACCESSING / 4 GUI / 50 FUNCTION) → `momorph/test-cases-ihQ26W78P2.csv`
- Frame image: `momorph/frame-image.png` (+ `frame-image-url.txt`)
- testPolicy: **`e2e-red-first`** — validation 3 trường bắt buộc, modal open/close, checkbox ẩn
  danh bật/tắt field, giới hạn 5 hashtag / 5 ảnh, nút Gửi enable/disable. Toàn state
  transition, không phải presentational. Runner `@playwright/test` đã có (`playwright.config.ts`,
  `pnpm test:e2e`, `tests/e2e/`) → không blocking, không cần scaffold.
- spec_lang: `vi` (kế thừa `primary_lang` trong `docs/vi/.rebuild-state.json`)
- F-code: **F009** · Screen code: **SCR008** (F001–F008 / SCR001–SCR007 đã dùng)
- Base: `feat/kudos-write-modal` ← `origin/main` (73055e8, đã có PR #13 F007 live board)

## Session 260907-2338

### Hai node có trong design nhưng KHÔNG có trong spec table

Đây là lỗi lặp lại lần thứ ba trong repo (F005 D003, F007 audit 260907-2325): bảng spec CSV
**không đánh số** một số item, nên đọc CSV một mình là thiếu. Chỉ cây node mới lộ ra. Nội dung
dưới đây lấy từ `character` của node thật, KHÔNG lấy từ `itemName`
(mọi node ở file này đều mang `itemName` rác `"Awards Information Navigation Links"`).

| Node | Là gì | `character` thật | Hệ quả |
|---|---|---|---|
| `I520:11647;1688:10448` (Frame 552) | Section **Danh hiệu** — có node `*` ⇒ **trường bắt buộc** | label `Danh hiệu`; placeholder `Dành tặng một danh hiệu cho đồng đội`; hint 2 dòng `Ví dụ: Người truyền động lực cho tôi.\nDanh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn.` | Trường bắt buộc **thứ 4**, không có spec row, không có test case nào trong 57 case |
| `I520:11647;3053:11619` (Button trong toolbar) | Link **Tiêu chuẩn cộng đồng** | `Tiêu chuẩn cộng đồng`, 16px/700, màu `#E46060`, canh phải, ở hàng toolbar cạnh nút quote | Đích đến là `/standards` (F005 đã có trong repo) — không phải dead link |

Hệ quả nặng nhất: **spec + test case nói form có 3 trường bắt buộc (Người nhận, Nội dung,
Hashtag); design nói có 4.** Test case ID-48/ID-49/ID-56 liệt kê điều kiện enable/disable nút
`Gửi` theo đúng 3 trường và bỏ sót `Danh hiệu`. Design là nguồn có thẩm quyền (Critical Rule 1),
nên `Danh hiệu` được tính là bắt buộc và hợp đồng e2e phải phủ nó — đây là chỗ hợp đồng cố tình
đi XA hơn test case tải về, và lý do được ghi ở đây để lần sau không ai "sửa lại cho khớp CSV".

### Frame phụ trợ: cái nào có design data, cái nào không

Modal này tham chiếu 3 frame con. Không phải cái nào cũng dùng được:

| Thành phần | Frame | Trạng thái | Dùng được? |
|---|---|---|---|
| Dropdown thêm hashtag | `p9zO-c4a4x` "Dropdown list hashtag" (`1002:13013`) | design done · spec done · **có node data** | **Có** — có sẵn item `mms_A/B/C_Hashtag đã chọn` + `mms_D_Hashtag chưa chọn` |
| Dropdown gợi ý người nhận | `QIMJNgFb8K`, `zJzaC9GgXt` | design in_progress · **`get_overview` trả "Frame metadata does not contain node style information"** | **Không** — không có số đo nào |
| State lỗi validation | `5c7PkAibyD` "Viết KUDO - Lỗi chưa điền đủ thông tin" | design in_progress · spec none · **không có node data** | **Không** |

Với hai cái không có data: không được đoán số đo. Lấy pattern đã có trong repo làm chuẩn
(ưu tiên (b) trong CLAUDE.md § "Quyết định thay tôi").

### Test case nói modal, frame vẽ cả trang

Frame `520:11602` là full 1440 gồm `Header` + `Keyvisual` + `Bìa` (banner KUDOS + card user) —
nhưng đó là **trang /kudos nằm dưới**, bị `Mask` (`520:11646`) làm tối, còn `520:11647` mới là
modal. 57/57 test case đều mở bằng "Mở modal Viết Kudo", ID-0/ID-2 nói "Modal ... mở thành công"
sau khi click nút/link ở màn nguồn. Nên đây là **dialog phủ trên `/kudos`**, không phải route
riêng. Nút nguồn đã tồn tại: `kudos-compose-pill.tsx` — hiện là `<input readOnly>` cố tình không
có `onClick` vì frame này chưa build (comment tại `kudos-compose-pill.tsx:12-13`).

### Quyết định (tự chốt theo CLAUDE.md § "Quyết định thay tôi")

Thứ tự ưu tiên áp dụng: (a) option `(Recommended)` → (b) khớp pattern đã có trong repo →
(c) ít file thay đổi nhất.

- Q: `Danh hiệu` lưu vào đâu — thêm cột `title` hay dùng lại `hashtags[0]`?
  → A: **`hashtags[0]`**, hashtag chip là `hashtags[1..5]`.
  Lý do (b)+(c): `kudos-hashtag-list.tsx:66-70` đã ghi rõ *"`KudosCard` has no separate 'topic'
  field to draw from … so this reads `hashtags[0]`"*, và seed row `0008_kudos_demo_seed.sql:118`
  đã đặt `ARRAY['IDOL GIỚI TRẺ','Dedicated','Inspring']` — phần tử 0 đọc đúng như một danh hiệu,
  phần tử 1-2 đúng như hashtag. `KudosFeaturedHashtag` render `hashtags[0]` ngay trên khung nội
  dung — chính là "tiêu đề Kudos" mà hint của field nói tới. Thêm cột `title` thì phải sửa
  migration + view `kudos_cards` + `src/dal/kudos.ts` + `kudos-card.tsx` + `kudos-hashtag-list.tsx`
  + backfill seed, tức mở lại F007 đã ship. Không đáng.
  Hệ quả phải chấp nhận: mảng dài tối đa 6 (1 danh hiệu + 5 hashtag), mà `KudosHashtagList` cắt ở
  5 chip rồi hiện `...` (BR-006) → hashtag thứ 5 bị ẩn sau `...`. Đây là hành vi truncation đã có
  sẵn trên `main`, không phải hồi quy mới.

- Q: Gửi ẩn danh lưu thế nào? Schema hiện không có cột nào.
  → A: **migration mới thêm `is_anonymous boolean NOT NULL DEFAULT false` + `anonymous_name text`**.
  Không có đường nào khác — `0006_kudos.sql` không có cột nào cho việc này (report data-layer §1).
  Checkbox bật thì hiện text field tên ẩn danh (test case ID-43/ID-44), nên cần cả hai cột.

- Q: Upload ảnh — làm thật hay dùng URL tĩnh như seed?
  → A: **làm thật: Supabase Storage bucket + policy qua migration**. 11 test case (ID-18..24,
  ID-37..40, ID-54..55) đều priority High; bỏ đi là bỏ một phần màn. `supabase/config.toml:114-120`
  có block bucket nhưng đang comment; storage service local đã chạy (`STORAGE_S3_URL` sống).
  Bucket tạo bằng migration (`storage.buckets` insert + policy) chứ không bằng config.toml, để
  môi trường nào apply migration cũng có.

- Q: Hashtag là free-text hay phải khớp vocabulary?
  → A: **free-text, có gợi ý từ vocabulary dẫn xuất sẵn có**. Không có bảng hashtag nào để
  validate (`src/dal/kudos.ts:132` dedupe tag từ chính nội dung kudos). Trang `/kudos` đã tính sẵn
  danh sách này cho filter → modal nằm cùng trang nên dùng lại prop đó, không query thêm.
  Frame `p9zO-c4a4x` cho đúng hình dropdown (item đã chọn / chưa chọn).

- Q: Nguồn dữ liệu người nhận?
  → A: **DAL mới `searchSunners` đọc view `profile_cards`** (`ilike` trên `full_name`, limit).
  `public.users` bật FORCE RLS chỉ cho đọc dòng của chính mình (`0001:55-59`), nên không query
  trực tiếp được. `profile_cards` là SECURITY DEFINER, `GRANT SELECT TO authenticated`
  (`0005_profile_cards_view.sql:70`) và phơi đúng 3 cột `id, full_name, avatar_url`.
  **Không nới SELECT list của view** — doc-comment của chính nó cấm (SEC_004).

- Q: Validate bằng zod?
  → A: **không, validate tay** theo đúng `toggle-kudo-heart.ts:39` (`typeof`/`.trim()`). Repo
  không có zod trong dependency; thêm một dependency chỉ cho một form là ngược YAGNI.

- Q: Chặn truy cập khi chưa đăng nhập (test ID-1)?
  → A: **hai lớp**: (1) pill trên `/kudos` khi chưa đăng nhập thì trỏ `/login` thay vì mở modal —
  page là Server Component nên biết trạng thái đăng nhập; (2) Server Action tự `auth.getUser()` và
  trả `{ok:false, reason:"unauthenticated"}`, fail closed. Không thêm `/kudos` vào matcher của
  `src/proxy.ts` — `/kudos` là trang public, chỉ hành động ghi mới cần đăng nhập.

- Q: Bộ đếm ký tự (spec D.1 tên là "Gợi ý và bộ đếm ký tự")?
  → A: **chỉ render dòng gợi ý, không có counter**. Cột `maxLength` của D.1 rỗng, mục Display của
  nó chỉ liệt kê dòng gợi ý, và frame chỉ vẽ một dòng `Bạn có thể "@ + tên"…`. Không có con số
  nào để đếm tới → dựng counter là tự phát minh.

- Q: `@ + tên` trong nội dung lưu thành gì?
  → A: **plain text `@Tên`**, không tạo entity/link. `kudos-card.tsx:103` render `{card.content}`
  dạng plain text; không có design nào cho mention chip trên thẻ kudo.

- Q: Link `Tiêu chuẩn cộng đồng` đi đâu?
  → A: **`ROUTES.STANDARDS`** (F005 đã có trong repo), cùng tab — không có design cho target mới.

- Q: Toolbar định dạng (B/I/S/number/link/quote) làm thế nào khi feed render plain text?
  → A: **toolbar chèn marker markdown-subset vào `<textarea>` thường; thêm một renderer nhỏ để
  `kudos-card.tsx` hiện đúng định dạng.**
  Đây là chỗ duy nhất đụng file của F007, và có lý do: `kudos-card.tsx:103` render `{card.content}`
  plain text (report data-layer §7), nên nếu chỉ lưu marker mà không render thì feed hiện `**abc**`
  nguyên xi — một defect nhìn thấy được trên trang đã ship. Ngược lại, không thể để 6 nút toolbar
  thành nút giả (development-rules: "Write the real implementation — never fake it or stub it out").
  Cách làm: marker `**b**`, `*i*`, `~~s~~`, `1. `, `[text](url)`, `> `; renderer dựng React element,
  **không** `dangerouslySetInnerHTML`, **không** thêm dependency markdown → không mở bề mặt XSS.
  Lệch có ý thức so với test case ID-27..32 (đều priority Medium): chúng mô tả "text được định dạng
  in đậm" ngay trong ô soạn thảo. Một `<textarea>` — đúng cái design vẽ — không bao giờ render được
  inline style; muốn vậy phải là contentEditable/rich editor, thứ design không vẽ và sẽ đẩy HTML vào
  cột mà feed đang đọc dạng plain text. Định dạng vì thế hiện thực ở thẻ kudo sau khi gửi.
  Đã kiểm: seed data không chứa marker nào nên contract e2e của F007 không đổi hành vi.

- Q: Dựng modal bằng gì? Repo không có precedent modal nào.
  → A: **`<dialog>` native + `showModal()`**. Report UI §1: không có portal / focus trap / scroll
  lock / dialog lib nào trong repo; hai cái gần nhất (`notification-bell.tsx`,
  `kudos-filter-menu.tsx`) là panel inline, ARIA role sai cho form dialog. `<dialog>` cho sẵn focus
  trap, Escape (event `cancel`), inert background và `::backdrop` — ít code nhất mà a11y đúng nhất.
  Scroll lock thì `<dialog>` không lo, thêm một effect nhỏ ngay trong component (một consumer duy
  nhất → không tách shared hook, YAGNI).

- Q: Copy đặt ở đâu?
  → A: **leaf mới dưới namespace `kudos` đã có**, luồn xuống bằng props qua
  `_shared/build-kudos-copy.ts`. Report UI §4: i18n trong repo này là Server-Component-only, không
  file nào trong `_components/` gọi `useTranslations`; `kudos.compose.ariaLabel` đã tồn tại và bằng
  `"Viết Kudo"`. Đi ngược cơ chế đó để gọi hook trong client component là phá convention.

- Q: Code ghi dữ liệu đặt ở DAL hay ở action?
  → A: **insert nằm trong Server Action** (`_actions/create-kudo.ts`), **read người nhận nằm ở DAL**
  (file mới `src/dal/sunner-search.ts` + adapter `sunner-search-client.ts`).
  Đúng precedent: `toggle-kudo-heart.ts:89` tự insert chứ không qua DAL, còn mọi read đều ở
  `src/dal/*.ts` kèm một `*-client.ts` thu hẹp client. Không sửa `src/dal/profile-cards.ts` (địa
  phận F006) dù cùng đọc một view — giữ ranh giới sở hữu file cho rõ.

### Bổ sung sau forward-draft system docs

- Q: Ẩn danh chỉ là chuyện UI, hay phải sửa cả view?
  → A: **phải sửa view `kudos_cards` trong cùng migration.** `0006_kudos.sql:82-101` select danh
  tính người gửi vô điều kiện, nên nếu chỉ thêm cột `is_anonymous` rồi để UI tự ẩn thì tên người
  gửi vẫn chảy ra qua view — client nào gọi view cũng đọc được. Ẩn danh kiểu đó là ẩn danh giả.
  Migration phải bọc nhánh `CASE WHEN is_anonymous` cho các cột phía sender.
  Hàng `sender_id` thật vẫn giữ trong bảng `kudos` (cần cho RLS `sender_id = auth.uid()` và cho
  audit) — chỉ view là chỗ che. Seed data đều `is_anonymous = false` nên output của view không đổi
  với dữ liệu hiện có → contract e2e của F007 không bị ảnh hưởng.

- Q: 5 ảnh đi qua Server Action thì có vượt body limit không?
  → A: **có rủi ro, phải xử lý ở phase upload.** Server Action của Next có giới hạn body mặc định
  (cỡ 1MB), 5 ảnh chắc chắn vượt. Chốt: **giữ upload phía server** (đúng pattern repo — không có
  chỗ nào ghi Supabase từ browser ngoài OAuth) và **nới giới hạn trong `next.config`** kèm chặn
  dung lượng từng file ở cả client và server.
  **Không đoán tên config key** — bản Next trong repo này là bản khác thường (middleware là
  `src/proxy.ts`), nên phase đó phải đọc `node_modules/next/dist/docs/` để lấy đúng key, theo
  AGENTS.md. Nếu đọc docs ra kết luận không nới được, mới chuyển sang upload trực tiếp từ browser
  (lúc đó cần thêm policy cho browser client, ghi lại ở đây trước khi làm).

- Q: D001 — bật ẩn danh nhưng để trống tên ẩn danh thì có chặn submit?
  → A: **giữ default của spec: chặn submit, báo lỗi tại ô tên ẩn danh.**
  Design không phán được vụ này: state "đã tick checkbox" **không được vẽ** trong frame
  `ihQ26W78P2`, và frame riêng cho nó (`p9vFVBE_tc "Ẩn danh"`) đang design in_progress, không có
  node data. Nên không có dấu `*` nào để đọc — khác hẳn `Danh hiệu` (ở đó có node `*` thật).
  Chốt theo ưu tiên (a) option `(Recommended)` + (c) ít thay đổi nhất: spec đã viết nhất quán
  hướng chặn submit ở §3 D001, §8 và §9. Nếu sau này frame kia có design và nói ngược lại thì sửa
  một dòng, không phải sửa kiến trúc.
