# Clarifications — Secret Box modal (mở hộp quà, nhận huy hiệu)

MoMorph refs:
- Modal Secret Box: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM (`1466:7676`, design `done`, spec `done`, 4 spec row, 19 test case)
- Clarifications: `plans/260908-1337-secret-box-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Session 260908

### Kiểm kê dữ liệu design — chỉ MỘT frame có spec

- Q: Luồng Secret Box có bao nhiêu frame dùng được? → A: **Đúng một.** `J3-4YFIpMM` có 4 spec
  row (A/B/C/D, `spec_progress: completed`) + 19 test case thật. Toàn bộ 22 frame còn lại của
  luồng (`K-LuEblC08`, `p0qHd6DJ6A`, `m0zV-VstXX`, `P5b2MJQoW6`, `VsjjEDVgEx`, 6 frame
  "standby" spec `none`, 3 frame "Open Giftbox", và 9 frame `[iOS]`) trả `item_count: 0`
  hoặc `Frame metadata does not contain node style information`. iOS `KUmv414uC9`/`scvV-OQCAJ`
  có 2 row nhưng `description` rỗng, `spec_progress: draft` → không dùng được.
- Q: Asset có sẵn những gì? → A: 3 media node trên `J3-4YFIpMM`: `1466:7686`
  `MM_MEDIA_box quà chưa mở` (558×558), `1466:7685` `MM_MEDIA_hiệu ứng box quà` (546×546),
  `1466:7679` `MM_MEDIA_Close` (19×19). Cộng 6 badge PNG **đã có trong repo**
  `public/standards/badge-*.png` — đo thật: **đúng 64×64**, không phải 2x/3x.

### Xung đột copy tiêu đề — hai nguồn MCP nói khác nhau

- Q: Tiêu đề modal là gì? Render ghi "KHÁM PHÁ SECRET BOX CỦA BẠN", spec row A + cả 19 test
  case ghi "MỞ SECRET BOX THÀNH CÔNG". → A: **Cả hai đều đúng, cho hai state khác nhau.**
  Đây là cách đọc duy nhất mà cả hai nguồn cùng đúng: frame tên "chưa mở", render hộp đóng,
  chưa có huy hiệu → tiêu đề `KHÁM PHÁ SECRET BOX CỦA BẠN` là state **trước khi click**.
  Spec row C ("hình ảnh huy hiệu nhận được") + test case `4bbf0b67` ("Open the modal
  immediately after receiving a badge... correct badge image is displayed inside the box")
  mô tả state **sau khi click**, mà state đó **không có frame render riêng** → tiêu đề
  `MỞ SECRET BOX THÀNH CÔNG` thuộc state này. Câu hướng dẫn "Click vào box để **tiếp tục**
  mở" cũng chỉ có nghĩa khi đã mở ít nhất một hộp.
  **Nhãn: INFERRED.** Không bịa giá trị nào — cả hai chuỗi đều lấy verbatim từ MCP. Implement
  hai state, mỗi state một tiêu đề. Nếu khách chốt khác thì sửa đúng một hằng số.

### Phạm vi — chỉ `/kudos`, KHÔNG chạm `/profile`

- Q: Modal mở từ đâu? Hai nút "Mở Secret Box" đang disabled ở cả `/kudos` và `/profile`.
  → A: **Chỉ `/kudos`.** Lý do là dữ liệu, không phải sở thích:
  - `/kudos` đã có đường ống stats thật: `page.tsx:73` gọi `getKudosStats` → `KudosStatList`
    render số thật, nút đã có `data-testid="kudos-open-gift"` sẵn (`kudos-stat-list.tsx:112`),
    và docstring dòng 11 chỉ thẳng tên frame này là thứ đang chặn nó.
  - `/profile` thì `ProfileStatisticsCard` **không nhận prop stats nào cả**
    (`profile-screen.tsx:83` truyền đúng `copy` + `isSelf`), render số `0` hardcode
    (`profile-statistics-card.tsx:50`). Muốn bật nút ở đây phải dựng thêm cả đường ống stats
    cho profile **và** viết lại 2 contract row đã ship: `profile.spec.ts:40` C6 (mỗi dòng
    giá trị `0`) + `:41` C7 (nút disabled **trong MỌI trường hợp**). Đó là feature thứ hai.
  → Nút `/profile` giữ `disabled`, ghi vào nợ lại. C6/C7 không bị chạm.
- Q: Contract `/kudos` nào phải đổi? → A: đúng một — `kudos.spec.ts:745-747` đang assert
  `openGift` visible **và** `toBeDisabled()`. Assertion này lật. `kudos.spec.ts:43` C09
  (ẩn danh → 0 stat row, không có `kudos-open-gift`) **giữ nguyên**, vì `KudosStatList`
  trả `null` khi `stats === null`.

### Quyền và số liệu

- Q: Ai được mở? → A: `KudosStatList` đã trả `null` cho khách ẩn danh → nút không tồn tại,
  thoả test case `e6a59553` + `1c266552` không cần thêm guard client. Người đăng nhập mà
  `secretBoxUnopened === 0` → nút **visible + disabled** (giữ pattern `title` sẵn có), nên
  modal không mở được ở 0 → thoả `84a5ba82` case 4.
- Q: Số hộp chưa mở tính thế nào? → A: `floor(sum(kudos.heart_count WHERE sender_id = me)/5)
  − count(openings)`. Chiều tim **về NGƯỜI GỬI**, không phải người nhận — không phải suy
  diễn: `src/dal/kudos-stats.ts:19-25` đã ghi rõ quy tắc này và dẫn nguồn một
  `clarifications.md` trước đã chốt, khớp copy `messages/vi.json:145` ("Cứ mỗi 5 lượt ❤️,
  bạn sẽ được mở 1 Secret Box").
- Q: `secretBoxOpened`/`secretBoxUnopened` hiện là gì? → A: hardcode `0` tại
  `kudos/page.tsx:146-147` kèm comment giải thích. Phase này thay bằng số thật.

### Kỹ thuật — nơi đặt tính ngẫu nhiên

- Q: Random huy hiệu chạy ở đâu? → A: **Postgres function `SECURITY DEFINER` + `SET
  search_path`**, không phải server action. Test case `5cc072ad` và `2e7bec78` yêu cầu số hộp
  và ảnh badge luôn lấy từ backend, sửa client phải bị bỏ qua → logic rút thăm không được
  nằm nơi client chạm tới. Chống double-click bằng `pg_advisory_xact_lock` theo user, và
  **kiểm lại entitlement trong cùng transaction** trước khi ghi.
  Đây là `.rpc()` **đầu tiên** của repo (grep `src/` không có cái nào) — pattern mới, nhưng
  theo đúng tiền lệ ghi-có-thẩm-quyền duy nhất đang có là trigger `sync_kudo_heart_count`
  của migration `0007`.
- Q: Lưu gì? → A: một bảng `secret_box_openings(user_id, badge_key, opened_at)`, migration
  `0011`. Không thêm cột counter: counter phải đồng bộ với trigger heart_count của `0007`
  → rủi ro lệch; bảng log thì `opened` = `count(*)`, không bao giờ lệch, và đúng thứ
  `BadgeCollection` (`badge-collection.tsx:9-14`) sẽ cần sau này.
- Q: Tỷ lệ? → A: verbatim spec row C: Stay Gold 30%, Flow to Horizon 25%, Touch of Light 20%,
  Beyond the Boundary 10%, Revival 10%, Root Further 5% (tổng 100).
- Q: Trùng huy hiệu? → A: **Cho trùng.** Spec row C: "Mỗi lần mở quà chỉ nhận được duy nhất
  1 huy hiệu ngẫu nhiên" — không có chữ nào về chống trùng, và tỷ lệ cố định 100% ngụ ý rút
  độc lập mỗi lần. Không tự thêm luật dedupe.

### Visual state sau khi click

- Q: Ảnh hộp đã mở lấy đâu? → A: **Không tồn tại.** Không frame nào có asset hộp-đã-mở.
  Quyết định: state reveal = giữ layer `MM_MEDIA_hiệu ứng box quà` + đặt badge PNG **đúng
  kích thước gốc 64×64**, căn giữa trên bục, KHÔNG upscale. Upscale 64px lên ~200px trong
  modal 557px sẽ vỡ nét, mà test case `56da7ec8` đòi "no overlap or **detail loss**" —
  upscale chính là detail loss. Đây là lựa chọn duy nhất không phải bịa asset.
- Q: State 0 hộp trong modal đang mở? → A: spec row B + test case `d9d6e01a`: ẩn dòng hướng
  dẫn; spec row C + `2a8a63de`: disable click vào box. Counter hiện `00`.

### Test policy

- Q: Policy nào? → A: **`e2e-red-first`.** Auto-select theo luật: modal open/close + click →
  reveal là state transition, không phải hover/focus/responsive. Runner có thật
  (`playwright test`, `package.json:18`); đã verify lệnh lọc 1 file chạy đúng:
  `pnpm run test:e2e tests/e2e/<file>.spec.ts` → "Total: 22 tests in 1 file". Không dùng
  `--no-test`. Web-only nên không vướng luật chặn mobile.

## Unresolved Questions

1. Tiêu đề hai state là INFERRED (xem trên). Nếu khách nói modal chỉ có MỘT tiêu đề thì phải
   chốt là chuỗi nào — sửa 1 hằng số, không ảnh hưởng kiến trúc.
2. Nút `/profile` vẫn disabled sau PR này. Cần quyết định có làm đường ống stats cho profile
   (kéo theo viết lại C6/C7) hay bỏ hẳn nút đó khỏi design.
3. Huy hiệu nhận được chưa phản chiếu vào `BadgeCollection` của `/profile` (6 slot đang là
   ảnh tĩnh). Bảng `0011` đã đủ dữ liệu để làm, nhưng ngoài scope PR này.
