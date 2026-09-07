# Clarifications — Sun* Kudos Live board (SCR007 / F007)

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
  (file "SAA 2025 - Internal Live Coding", frame `2940:13431`)
- fileKey: `9ypp4enmFmdK3YAFJLIu6C` · screenId: `MaZUn5xHXZ`
- Specs: 64 items → `momorph/specs-MaZUn5xHXZ.csv`
- Test cases: 41 (3 ACCESSING / 16 GUI / 22 FUNCTION) → `momorph/test-cases-MaZUn5xHXZ.csv`
- Frame image: `momorph/frame-image-url.txt`
- testPolicy: **`e2e-red-first`** — carousel prev/next + disabled ở hai đầu, filter đổi cả hai
  section, toggle tim, infinite scroll, empty state. Toàn state transition, không phải
  presentational. Runner `@playwright/test` đã có (`playwright.config.ts`, `pnpm test:e2e`).
- spec_lang: `vi` (kế thừa `primary_lang` trong `docs/vi/.rebuild-state.json`)
- F-code: **F007** · Screen code: **SCR007** (F001–F006 / SCR001–SCR006 đã dùng)

## Session 260907-1725

### Phát hiện chi phối toàn bộ phạm vi

Frame này **không phải một màn** — nó là điểm vào của cả Kudos domain. 64 spec item kéo theo
**5 frame khác chưa hề tồn tại trong repo**:

| Spec item | Hành vi | Frame đích | Trạng thái |
|---|---|---|---|
| A.1 `Button ghi nhận` | click → dialog gửi kudo | `ihQ26W78P2` Viết Kudo | chưa build |
| D.1.8 `Mở quà` | click → dialog Secret Box | `J3-4YFIpMM` + 8 frame state | chưa build |
| B.3 / C.3.5 `Xem chi tiết` | → trang chi tiết kudo | `onDIohs2bS` View Kudo | chưa build |
| B.3.1/B.3.2 hover avatar | → preview profile | `Bf5XiTE7AO` Hover Avatar | chưa build |
| C.3.6 `Image đính kèm` | click → ảnh full | không có frame | chưa có design |

Gộp tất cả vào một lần chạy là vỡ. Precedent trong repo đã có sẵn: F006 chốt "ship `/profile`
against the system that exists", F005 chốt bỏ 2 TC trạng thái `disabled` không thể chạm tới là
YAGNI. Áp cùng nguyên tắc.

### Quyết định

- Q: `/kudos` là public hay protected? → **A: public — `src/app/(public)/kudos/`.**
  TC `Check access condition/Authentication required` ghi precondition nguyên văn
  *"User is unauthenticated but can view Kudos UI"*, và chỉ đòi redirect khi người dùng
  **bấm vào profile hoặc detail**. Khớp với 5 link `/kudos` đang hiện công khai ở header,
  footer, `KudosSection`, widget và `/standards`.
  **Why:** TC nói thẳng; đặt vào `(protected)` sẽ làm 5 link công khai đó dẫn tới trang login.

- Q: Phạm vi F007 tới đâu? → **A: build trọn cấu trúc board + mọi tương tác nằm HOÀN TOÀN
  trong màn này; hoãn mọi thứ cần một frame chưa tồn tại.**
  - **Trong phạm vi**: banner A + ô nhập A.1 (render, chưa mở dialog) · carousel HIGHLIGHT B
    (top 5 theo tim, prev/next, disabled hai đầu, pagination `x/5`) · filter Hashtag +
    Phòng ban đổi cả hai section · Spotlight B.7 (scatter tên + tổng `N KUDOS` + ô tìm Sunner) ·
    feed ALL KUDOS C (infinite scroll, card, hashtag, ảnh thumbnail) · toggle tim + Copy Link
    + toast · sidebar D (5 chỉ số + 2 leaderboard) · 2 empty state nguyên văn
    `Hiện tại chưa có Kudos nào.` và `Chưa có dữ liệu`.
  - **Hoãn** (render trạng thái thật thà, không bịa): dialog Viết Kudo · dialog Secret Box ·
    trang chi tiết kudo · hover preview profile · lightbox ảnh.
  **Why:** rule (b) khớp pattern repo — đúng cách F006 xử lý bề mặt phụ thuộc Kudos.

- Q: Spotlight B.7 — viz pan/zoom thật hay layout tĩnh? → **A: scatter tĩnh dựng từ dữ liệu
  thật; hoãn pan/zoom và click-node.**
  Cây frame cho thấy design vẽ Spotlight bằng **~120 TEXT node tĩnh** của đúng 8 cái tên lặp
  lại (`Đỗ hoàng Hiệp`, `Dương thúy An`, `Mai phương Thúy`, `Lê Kiều Trang`, `Nguyễn Văn Quy`,
  `Nguyễn Bá Chức`, `Nguyễn Hoàng Linh`) — không có canvas, không có node data. Nút
  `B.7.2_Pan zoom` là một FRAME rỗng.
  Tổng `388 KUDOS` (`3007:17482`) query từ DB theo spec, nên số đó là thật; layout thì tĩnh.
  Click node → trang chi tiết = hoãn cùng lý do với `Xem chi tiết`.
  **Why:** rule (c) ít file nhất, và dựng canvas pan/zoom cho một thiết kế vốn là text tĩnh là
  bịa thêm hành vi design không mô tả.

- Q: "Live board" có nghĩa là Supabase Realtime? → **A: không. Server render + revalidate.**
  Repo chưa có một ví dụ Realtime nào (researcher-01 xác nhận), không TC nào đòi cập nhật
  không cần reload, và tên frame là nhãn design chứ không phải yêu cầu kỹ thuật.
  **Why:** rule (c); thêm Realtime là thêm một hạ tầng mới không TC nào kiểm chứng được.

- Q: Nguồn `Phòng ban` cho filter B.1.2? → **A: thêm cột `department text` (nullable) vào
  `users` trong migration `0006` và seed cho user demo.**
  F006 đã ghi RISK-02: `users` chỉ có `id, email, full_name, avatar_url, locale, role` — không
  có department. Design hiển thị `CEVC10`. Không có cột thì filter Phòng ban không thể thật.
  **Why:** cột nullable không phá trigger auth đang tạo row; rẻ hơn hẳn việc dựng bảng
  `departments` riêng mà chưa TC nào cần.

- Q: Quy tắc tim (C.4.1) hiện thực tới đâu? → **A: làm 3 quy tắc kiểm chứng được, hoãn quy tắc
  thứ 4.**
  - Làm: mỗi người 1 lượt tim / 1 kudo · người gửi bị disable nút tim trên kudo của chính mình ·
    bỏ tim thu hồi đúng số đã cộng.
  - Hoãn: **+2 tim trong "ngày đặc biệt do admin cấu hình"** — không tồn tại màn admin, không
    có bảng config, không có cách nào dựng được precondition của TC đó.
  **Why:** đúng tiền lệ F005 — trạng thái không có điều kiện runtime nào kích hoạt được thì
  implement là YAGNI. Cột `special` trên bảng tim vẫn để sẵn để lần sau không phải migrate lại.

- Q: Người chưa đăng nhập bấm tim? → **A: nút tim render nhưng disabled kèm `title` mời đăng
  nhập.** TC access-control chỉ đòi redirect/prompt cho profile và detail, không nhắc tim.
  **Why:** ít file nhất, và không làm anonymous bấm vào một server action chắc chắn fail.

- Q: Dữ liệu mock lấy từ đâu? → **A: nguyên văn từ Figma** — tên người, nội dung lời cảm ơn,
  hashtag, mốc thời gian `10:00 - 10/30/2025`, các con số sidebar. Seed vào migration.
  **Why:** luật MoMorph "Use Figma design content as mock data source. Do NOT invent data."

- Q: Copy văn bản đặt ở đâu? → **A: `_shared/kudos-copy.ts` giữ type + default tĩnh, giá trị
  thật ở `messages/{vi,en}.json` namespace `kudos`.** Chrome dùng chung vẫn đọc namespace `home`.
  **Why:** đúng ranh giới researcher-01 mô tả, và ESLint chặn cứng import chéo `_shared`.

- Q: Chuỗi giữ nguyên tiếng Việt kể cả bản EN? → **A: các chuỗi TC assert nguyên văn
  (`Hiện tại chưa có Kudos nào.`, `Chưa có dữ liệu`, placeholder `Hôm nay, bạn muốn gửi lời cảm
  ơn và ghi nhận đến ai?`, `Tìm kiếm`) là hợp đồng của TC — bản `vi` chép đúng từng ký tự.**
  Toast `Link copied — ready to share!` là tiếng Anh trong chính design, giữ nguyên ở cả hai.
  **Why:** TC content thắng khi xung đột — quy tắc kế thừa từ F004/F005.

### Chưa giải quyết (không chặn F007)

- Ô tìm Sunner B.7.3: TC đòi 101 ký tự bị *reject kèm error*, và tìm rỗng bị *chặn kèm required
  message*. Design không vẽ cả hai thông báo đó. Sẽ dùng `maxLength=100` (chặn nhập ký tự 101,
  đúng `maxLength` trong spec CSV) + disable nút tìm khi rỗng — hành vi tương đương mà không bịa
  ra chuỗi lỗi design không có.
- Số hoa thị (1/2/3 hoa thị ↔ 10/20/50 kudos nhận được) mô tả ở B.3.2/B.3.6: tính được từ
  `COUNT(kudos)` nên sẽ tính thật. Tooltip mô tả 3 mức thì hoãn cùng nhóm hover preview.

### Bổ sung trong lúc viết spec (260907-1759)

- Q: Lượt tim cộng vào tài khoản NGƯỜI GỬI hay NGƯỜI NHẬN kudo? Design tự mâu thuẫn.
  → **A: người GỬI.**
  Nguyên văn item `C.4.1` (`I3127:21871;256:5175`) chứa cả hai:
  - cộng → *"tài khoản **gửi** lời cảm ơn (tài khoản gửi kudo tương ứng) sẽ được cộng 1 tim"*
    và *"tài khoản **gửi** kudos sẽ được cộng 2 tim"*
  - thu hồi → *"Số tim trên tài khoản **nhận** kudos sẽ bị thu hồi"*, `databaseNote` cũng ghi
    *"thu hồi đúng số tim đã cộng cho người **nhận** kudo"*
  Thu hồi theo định nghĩa phải trỏ đúng tài khoản đã được cộng, nên một trong hai vế là lỗi
  soạn thảo chứ không phải hai quy tắc khác nhau. Phân xử bằng test case — luật kế thừa từ
  F004/F005 là **TC thắng khi xung đột**: TC `Check business logic / Like on special day` ghi
  *"the **sender's** account receives +2 hearts for each like"*. Cộng cho người gửi, thu hồi
  cũng từ người gửi.
  **Why:** 2/2 câu cộng tim + TC đều nói người gửi; chỉ vế thu hồi nói người nhận.
  ⚠ Đây là quy tắc thưởng, cần product xác nhận lại — đã ghi vào `plans/action-items.md`.

- Q: Bảng lượt tim nằm trong migration nào? → **A: tách `0007_kudo_hearts.sql`, không gộp vào
  `0006_kudos.sql`.** F007 sở hữu `0006`, F008 sở hữu `0007` — hai phase song song không dùng
  chung file nào. Ràng buộc FK vẫn đúng vì `0007` chạy sau `0006`.
  **Why:** luật file ownership của plan — phase song song không được chạm cùng file.

- Q: (D001) Sidebar 5 chỉ số cá nhân hiển thị sao cho người chưa đăng nhập?
  → **A: ẩn hẳn khối 5 chỉ số + nút "Mở quà"; giữ 2 bảng xếp hạng.**
  Hiện `0` cho người ẩn danh là nói dối — nó đọc thành "bạn có 0 kudos" chứ không phải "bạn chưa
  đăng nhập". Hai bảng xếp hạng là dữ liệu công khai, không thuộc về người xem, nên giữ.
  **Why:** không phải dựng thêm trạng thái mới nào, và không bịa số.

- Q: (D002) Ô tìm Sunner B.7.3 làm gì khi Spotlight là scatter tĩnh?
  → **A: lọc/làm nổi bật tên khớp ngay trong scatter đang hiển thị, không điều hướng.**
  **Why:** click-node và trang chi tiết đã hoãn; giữ tìm kiếm trong đúng phạm vi dữ liệu đang
  hiện là thay đổi nhỏ nhất mà vẫn thoả TC placeholder `Tìm kiếm` và giới hạn 100 ký tự.

### Đảo quyết định sau khi so ảnh thật (260907-2152)

- Q: Spotlight có ít tên hơn số slot thì làm gì? → **A: LẶP tên thật cho kín cả 106 slot.**
  **Đảo ngược** dòng ghi trước đó ở mục Spotlight và `phase-10` ("không đủ tên thì lặp lại bố cục
  ít vị trí hơn, không độn tên giả").
  Lý do đảo: quyết định cũ được rút ra từ việc đọc **cây node**, còn đây là kết luận từ việc so
  **ảnh render với ảnh design**. Design vẽ đúng **8 tên lặp lại ~106 lần** để phủ kín hộp. Đổ 8
  tên vào 8 slot đầu làm hộp trống 80% — nhìn như hỏng.
  Quan trọng: lặp tên THẬT không phải là "độn tên giả". Điều cũ cấm là bịa ra người không tồn
  tại; điều mới làm là hiển thị lại đúng những người có thật, y như design.
  **Why:** ảnh design là bằng chứng mạnh hơn cây node khi hai thứ dẫn tới kết luận khác nhau.

- Q: Ticker góc dưới trái là 6 tin khác nhau? → **A: KHÔNG — là MỘT câu, lặp ở 6 vị trí.**
  6 node `3004:15995`–`15999` + `2940:14230` mang **cùng một chuỗi**, chỉ khác `top`/`opacity`:
  đó là một animation cuộn-mờ bị đóng băng trong Figma, không phải 6 sự kiện. Render đúng một
  câu thật (kudo mới nhất) lặp ở 6 vị trí kèm độ mờ tương ứng.

- Q: Artwork nền của Spotlight? → **A: CHƯA CÓ — không phải bỏ qua, mà là chưa lấy được.**
  3 rectangle `2940:14178` / `2940:14181` / `2940:14173` không mang tiền tố `MM_MEDIA_` nên
  không nằm trong media map. `get_figma_image` trả **HTTP 500 kể cả với node media đã biết chắc
  tồn tại** → lỗi dịch vụ tạm thời. Đã KHÔNG vẽ gradient thay thế.
  **Cần thử lại ở phiên sau** — đã ghi vào `action-items.md`.
