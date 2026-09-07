# Kudos prior-art — thu thập cho F007 `/kudos`

Nguồn: grep không phân biệt hoa/thường "kudos" trên toàn `docs/vi/`, `plans/*/plan.md`,
`plans/*/phase-*.md`, `plans/*/clarifications.md`, `plans/action-items.md`, cộng tìm trực tiếp
`FUN_006/007/010/013-015`, `GUI_006/007`, `SEC_002/003`, `ID-12`, `ID-14`.

## 1. 10 TC hoãn sang F007+ (từ plan profile:68)

**Không có CSV/momorph raw cho các TC này** — `plans/260907-1224-profile-page/momorph/` rỗng (30
TC gốc được đọc qua MCP lúc clarify, không persist CSV). Nội dung THẬT gần nhất tìm được là bảng
tóm tắt trong `plans/260907-1224-profile-page/reports/delivery-tracker-260907-1450-profile-page-reconciliation.md:75-84`
(paraphrase, không phải verbatim MoMorph):

| TC | Tóm tắt 1 dòng | Thuộc `/kudos`? |
|---|---|---|
| FUN_006 | Hiện chip khi feed có dữ liệu | Có — feed board |
| FUN_007 | Style chip Positive/Negative | Có — feed board |
| FUN_010 | Load feed từ API | Có — data fetching |
| FUN_013 | Parse markdown trong nội dung kudos | Có — nội dung post |
| FUN_014 | Render layout card kudos | Có — feed card |
| FUN_015 | Filter theo reaction/hashtag | Có — feed filter |
| GUI_006 | Layout hình ảnh feed card | Có — feed card |
| GUI_007 | Giao diện chip Spam | Có — moderation |
| SEC_002 | Anon không xem được feed kudos | Có — quyền xem board |
| SEC_003 | Không đọc được DM/kudos riêng của người khác | Có — privacy boundary |

**Cả 10 TC đều thuộc `/kudos`** — không có cái nào ngoài phạm vi màn Live board. Không TC nào có
nội dung Given/When/Then chi tiết trong tài liệu đã đọc; chỉ có tên + lý do hoãn. Cần tải lại CSV
gốc từ MoMorph (`download_test_cases`) khi bắt đầu clarify F007 — đừng suy diễn thêm từ bảng trên.

Bổ sung ngữ cảnh node/DOM (từ `docs/vi/features/F006_ProfilePage/functional-spec.md:313` +
`technical-spec.md:394`): feed card thật có cấu trúc `mms_D_Post all` (`362:5091`) gồm
avatar/tên/dept/tier người gửi+nhận, chip Spam (`mms_D.3.1_Status`, node id
`I3127:24455;3127:24095` và `I3127:24169;3127:24095`), timestamp, tiêu đề, body, 4 ảnh đính kèm,
hashtag, đếm ❤️, nút "Copy Link". Đây là node id thật trong Figma — dùng để cross-check khi
`get_frame`/`download_specs` cho F007.

## 2. TC ID-12, ID-14 của `/awards`

**Không có nội dung TC verbatim** — CSV gốc (`momorph/test-cases.csv`, frame `zFYDgyj_pD`,
ID-0…ID-14) không còn trong `plans/260906-2258-award-system-page/` (không tìm thấy file này ở
disk, dù functional-spec.md:19 dẫn chiếu nó). Nội dung suy ra từ mọi chỗ nhắc tới 2 TC này (đồng
nhất, lặp lại ≥8 lần trong 3 feature F003/F004/F005 + reports):

- **Nội dung TC**: click nút "Chi tiết" của khối Sun* Kudos → phải điều hướng mở được trang
  `/kudos`. `clarifications.md § Unresolved` (award-system-page): *"TC ID-12/ID-14 (nút 'Chi tiết'
  mở trang Sun* Kudos) không thoả được — `/kudos` chưa tồn tại."*
- Quyết định đã chốt: giữ `href="/kudos"` y hệt `/`, không xây `/kudos` trong phiên F004. TC ghi
  nợ chính thức (`RISK-01` xuất hiện lặp lại ở F003/F004/F005).
- **`/kudos` cần cung cấp để 2 TC pass**: route `/kudos` phải **tồn tại và trả 200** (không 404)
  khi điều hướng từ `href="/kudos"` — đây là điều kiện tối thiểu. Không có ràng buộc nào khác về
  nội dung trang đích được ghi trong 2 TC này (chúng chỉ test hành vi điều hướng ở phía nguồn
  `/awards`, không assert nội dung `/kudos`) — xác nhận tại
  `docs/vi/features/F004_AwardSystemPage/technical-spec.md:113`: "E2E chỉ assert `href`, không
  assert nội dung trang đích".

Cùng pattern lặp lại ở 4 nguồn khác trỏ `/kudos` (chưa tính `/awards`): `site-header.tsx:70`,
`site-footer.tsx:67`, `kudos-section.tsx:63`, `widget-button.tsx:154`, cộng `/standards` (nút
"Viết KUDOS") — tổng cộng **5 điểm entry vào `/kudos`** trên site hiện tại (F005 tech-spec:131-132
tự đếm là "action thứ 5").

## 3. Mô hình dữ liệu Kudos

**Chưa có.** `docs/vi/generated/data-model.md` — grep "kudos" 0 kết quả. Không bảng/thực thể
`kudos` nào được mô tả. Xác nhận thêm từ F006 functional-spec.md:105-106: "Không action nào trên
trang này đọc/ghi một bảng `kudos` không tồn tại" và D001 (F006): "Không tồn tại bảng `kudos`".
F007 phải tự thiết kế schema từ đầu — không kế thừa migration nào.

## 4. Quyền / vai trò

**Chưa có PERM### nào cho Kudos.** `docs/vi/system/permissions.md:12` liệt kê scope phân tích
hiện tại (`/`, `/awards`, `/standards`, `/login`, `/todo`, `/profile`, `/auth/callback`) và nói rõ:
*"2 route Homepage liên kết còn lại (`/kudos`, `/admin`) CHƯA tồn tại, ngoài phạm vi phân tích
quyền vì chưa có code."* Dòng 121: `/kudos` 404 "KHÔNG phải khoảng trống phân quyền — không có
route nghĩa là không có gì để phân quyền". SEC_002 (mục 1) ngụ ý board có phân biệt anon/authenticated
nhưng chưa có PERM### chính thức nào đăng ký.

## 5. User story

**Chưa có US### nào cho Kudos.** `docs/vi/generated/user-stories.md` — grep "kudos" 0 kết quả.
Story gần nhất chạm tới Kudos là `US003_NavigateToWriteKudos` (F005_StandardsRulesPage, KHÔNG
phải registry chính thức `user-stories.md` — chỉ trong functional-spec.md draft của F005), goal:
*"Từ trang thể lệ, mở ngay form viết Kudos để áp dụng luật chơi vừa đọc"* — chỉ test điều hướng
`/kudos`, không phải hành vi Kudos thật.

## 6. Screen registry

`docs/vi/generated/screen-list.md`: SCR001–SCR006 đã dùng (SCR006_Profile là số lớn nhất). Chưa
có SCR### nào cho `/kudos` — F007 sẽ là **SCR007**.

`docs/vi/generated/feature-list.md`: F001–F006 đã dùng → F007_KudosLiveBoard là feature kế tiếp
đúng số thứ tự.

## 7. Ràng buộc kế thừa (từ clarifications.md các phiên trước)

- **Không đổi tên component Figma instance khi tái dùng.** `KudosSection`
  (`kudos-section.tsx`) tái dùng nguyên trạng qua F003→F004, "không đổi tên", cùng
  `momorph-development.md` rule 1 (không đoán giá trị thị giác). `/kudos` PHẢI đọc content thật
  qua `get_frame`/`download_specs`, không tái dùng suy diễn.
- **Text theo đúng node design, không unify/rename** (commit gần nhất `b6920ec`) — áp dụng thẳng
  cho mọi copy Kudos mới (heading "KUDOS", "Viết KUDOS", "KUDOS QUỐC DÂN" — giữ nguyên hoa/thường
  như node).
- **Site chrome dùng chung**: `SiteHeader`/`SiteFooter` đã promote lên `src/app/_components/`
  (phase 02 profile-page) — mọi route protected/public đều import từ đây, không copy riêng.
  `/kudos` (nếu public) dùng thẳng chrome này.
- **TC là nguồn xác nhận nội dung, ưu tiên hơn text node design khi mâu thuẫn** (D002 F003, D014
  homepage) — áp dụng nếu CSV F007 mâu thuẫn với Figma text.
- **Ảnh render > specs CSV > text node** khi nghi ngờ nội dung thiếu (award-system-page decision
  log 248) — thứ tự ưu tiên đọc dữ liệu khi clarify F007.
- **Mock data phải lấy từ Figma design, không bịa** (rule chuẩn Track A momorph-development.md).
  Với `/kudos` — nếu feed/board cần dữ liệu mẫu, seed từ nội dung MoMorph, không tự sinh case giả.
- **Lazy-load ảnh / lệnh Playwright**: không tìm thấy ràng buộc lazy-load nào ghi riêng cho Kudos
  trong các clarifications đã đọc (chỉ có ghi chú chung trong agent-memory `.claude`, ngoài phạm
  vi grep yêu cầu — không trích ở đây vì không phải "đã viết sẵn trong lớp tài liệu repo").
- **Test policy tiền lệ**: mọi feature có tương tác thật (nav/click/toggle) đã chọn
  `e2e-red-first` (F004 nav+scroll, F006 dropdown+role-branch). `/kudos` có modal Viết Kudo + feed
  interaction → gần như chắc chắn rơi vào rule 3 `momorph-development.md`, nên preflight
  `e2e-red-first`.
- **File ≤200 dòng, kebab-case, named export, `"use client"` chỉ ở leaf** — quy ước lặp lại ở mọi
  phase file gần nhất (profile-page plan.md:64), áp dụng chung toàn repo.
- **`REVOKE ALL ... FROM anon, PUBLIC`** là pattern bảo mật bắt buộc cho mọi view/bảng Supabase
  mới lộ dữ liệu nhân sự (migration 0005 profile_cards) — bảng `kudos` mới của F007 (nếu chứa
  tên người gửi/nhận) phải áp lại đúng pattern này.

## Chưa có (đừng bịa)

- Nội dung Given/When/Then chi tiết của 10 TC mục 1 và 2 TC ID-12/ID-14 — cần tải CSV gốc qua
  MoMorph MCP (`download_test_cases`) lúc clarify, không có bản lưu cục bộ nào còn sống.
- `data-model.md`, `user-stories.md`, `behavior-logic.md`, `api-map.md` — 0 dòng nhắc "kudos".
- `permissions.md` — 0 PERM### cho Kudos, chỉ có câu xác nhận route chưa tồn tại.
- Ràng buộc lazy-load ảnh riêng cho Kudos feed (không có trong tài liệu đã grep).

**Status:** DONE
**Summary:** Không route/bảng/PERM/US nào cho Kudos tồn tại trong tài liệu chính thức (`docs/vi/generated/*`) — mọi thứ mới chỉ là tham chiếu/ghi nợ rải trong F003–F006 và action-items.md. 10 TC hoãn đều thuộc `/kudos`, nhưng nội dung chi tiết không còn CSV cục bộ, chỉ có bảng tóm tắt 1 dòng/TC trong delivery-tracker report. ID-12/ID-14 chỉ đòi hỏi `/kudos` tồn tại + trả 200, không assert nội dung trang đích. SCR007/F007 là số kế tiếp hợp lệ. 5 entry-point cũ (`site-header`, `site-footer`, `kudos-section`, `widget-button`, `standards` Viết KUDOS) đều cần trỏ đúng route mới khi F007 land — nên rà lại cả 5 file này sau khi build xong `/kudos`.
**Concerns:** Nội dung thật của 10 TC + ID-12/ID-14 chỉ có ở MoMorph gốc, không phải trong repo — bắt buộc phải `download_test_cases`/`get_frame` lại lúc clarify F007, không được suy diễn tiếp từ bảng tóm tắt trong báo cáo này (nó đã là bản paraphrase, không phải verbatim).
