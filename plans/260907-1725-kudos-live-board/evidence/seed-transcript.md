# Evidence transcript — migration `0008_kudos_demo_seed.sql`

Nguồn ảnh: `plans/260907-1725-kudos-live-board/momorph/frame-image.png` (1440×5862,
đọc bằng `Read`, sau đó crop bằng PIL để đọc rõ từng vùng ở độ phân giải gốc).
Nguồn CSV: `plans/260907-1725-kudos-live-board/momorph/specs-MaZUn5xHXZ.csv`
(parse bằng python `csv.DictReader`).

Mỗi dòng dưới đây: **giá trị đã chép** | **nguồn** | ghi chú.

## 1. Tên 8 Sunner (Spotlight scatter `mms_B.7_Spotlight` 2940:14174 + D.3.2 2940:13516)

Đã chốt sẵn trong `clarifications.md` § "Spotlight B.7", đối chiếu lại bằng crop
`frame-image.png` vùng y=1500..2220 (crop `spotlight_board.png`, phóng 2×) — đúng
7 tên lặp lại trong scatter, cộng tên thứ 8 ở sidebar D.3.2.

| Tên | Nguồn |
|---|---|
| Đỗ hoàng Hiệp | scatter, nhiều node, vd toạ độ hiển thị (crop) hàng trên cùng bên trái |
| Dương thúy An | scatter, nhiều node |
| Mai phương Thúy | scatter, nhiều node |
| Lê Kiều Trang | scatter, nhiều node |
| Nguyễn Văn Quy | scatter, nhiều node (in đậm ở vài vị trí) |
| Nguyễn Bá Chức | scatter, nhiều node; cũng xuất hiện trong ticker "08:30PM Nguyễn Bá Chức đã nhận được một Kudos mới" |
| Nguyễn Hoàng Linh | scatter, 1 node tô màu đỏ nổi bật ở giữa khung |
| Huỳnh Dương Xuân | item `D.3.2` (`2940:13516`), spec CSV `description`: "Tên: 'Huỳnh Dương Xuân'" — xác nhận lại bằng crop `sidebar_stats.png`, khối "10 SUNNER NHẬN QUÀ MỚI NHẤT" |

Không dùng "Huỳnh Dương Xuân Nhật" (tên người gửi trong mock-up thẻ kudos,
xem mục 3) làm 1 trong 8 Sunner — đó là placeholder lặp lại giống hệt trên
MỌI thẻ, không phải một trong 8 cá nhân của Spotlight.

## 2. Tổng "388 KUDOS" (`mms_B.7.1_388 KUDOS` 3007:17482)

Đọc được: `388 KUDOS` — nguồn: crop `spotlight_board.png`, dòng tiêu đề giữa khung.
**Không seed số này**: spec CSV item B.7.1 + FR-208 ghi rõ "388 là tổng số KUDOS
của hệ thống được **query từ DB**" — đây là số minh hoạ tại thời điểm thiết kế,
không phải hằng số cần chép. `spotlightTotal` trong `getKudosBoard` tự tính từ
`count(*)` các hàng `kudos`, nên số seed thật (12) là số sẽ hiển thị.

## 3. Nội dung 1 thẻ Kudos (`mms_C.3_KUDO Post` 3127:21871, và Highlight `B.2.3`/`B.4.2`)

Đọc từ crop `allkudos_card1.png` (vùng y=2500..3080, phóng 2×) — thẻ đầu tiên của
section "ALL KUDOS", đối chiếu thêm với `allkudos_card2.png` (thẻ 2) và
`highlight_carousel.png` (Highlight carousel, slide 2/5): **cả 4 thẻ quan sát được
hiển thị NGUYÊN VĂN cùng một nội dung** (thẻ Figma dùng lại đúng 1 placeholder
cho mọi instance) — tự nó là bằng chứng đây là dữ liệu mẫu lặp, không phải 12+
nội dung khác nhau có thật trong design.

Nội dung (chép nguyên văn, kèm dấu "..." vì chính design cắt ở đây — không đọc
được phần sau dấu "..."):

> Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn
> của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực
> hơn nữa trong công việc. <3 và cuộc sống...

Đối chiếu chéo: `src/app/(public)/kudos/_components/kudos-card.stories.tsx`
(`baseCard.content`, viết bởi Track A độc lập cùng phase) chép **y hệt** chuỗi
trên — xác nhận không có sai lệch phiên âm.

Tiêu đề phụ "IDOL GIỚI TRẺ" phía trên khung nội dung: đọc được trên mọi thẻ.
Không có cột `title`/`topic` trong bảng `kudos` (migration `0006`) nên không
seed như một field riêng; theo CSV item `D.4` (`I3127:21871;2234:33038`,
`nameTrans`: "Tag 'IDOL GIỚI TRẺ'") và cách `KudosFeaturedHashtag` đọc
`hashtags[0]` (`kudos-card.tsx:55`), giá trị này được seed là **phần tử đầu
tiên của mảng `hashtags`** — đúng quy ước Track A đã dựng.

Sender/receiver hiển thị trên mock-up thẻ: "Huỳnh Dương Xuân Nhật" (CEVC10,
badge đổi giữa "New Hero"/"Rising Hero" mỗi thẻ) → "Huỳnh Dương Xuân" (CEVC10,
"Legend Hero"). Đây cũng là placeholder lặp y hệt trên mọi thẻ quan sát được
(2 tên cố định, không phải cặp gửi/nhận thật cho từng thẻ) — **không** dùng làm
sender/receiver thật cho 12 hàng seed; 8 Sunner ở mục 1 mới là danh tính seed
cho `users`/`kudos.sender_id`/`kudos.receiver_id`, đúng theo chỉ đạo của
orchestrator.

## 4. Hashtag (`mms_B.4.3`/`mms_C.3.7_Hash tag`)

Đọc được trên mọi thẻ quan sát: `#Dedicated #Inspring #Dedicated #Inspring
#Dedicated #Inspring...` (crop `highlight_carousel.png`, `allkudos_card1.png`,
`allkudos_card2.png`) — 2 hashtag phân biệt duy nhất đọc được:
`Dedicated`, `Inspring` (giữ nguyên lỗi chính tả "Inspring", **không** sửa
thành "Inspiring" — đúng luật "chép nguyên văn"). Cộng `IDOL GIỚI TRẺ` (mục 3)
= 3 giá trị hashtag phân biệt có nguồn thật, seed dùng tổ hợp con của 3 giá trị
này cho 12 hàng `kudos` — không hàng nào dùng hashtag ngoài 3 giá trị trên.
Lưu trữ không kèm dấu `#` (khớp quy ước đã có trong repo:
`src/app/(public)/kudos/_components/kudos-hashtag-list.stories.tsx`,
`src/dal/kudos.test.ts`).

## 5. Mốc thời gian (`mms_C.3.4_Time` / `mms_B.4.1`)

Đọc được: `10:00 - 10/30/2025`, format `HH:mm - MM/DD/YYYY` — nguồn: crop
`allkudos_card1.png` và `highlight_carousel.png`, mọi thẻ đều hiện đúng chuỗi
này (một mốc thời gian placeholder duy nhất, lặp lại). Giữ 1 hàng seed
(`kudo #5`, người nhận `Nguyễn Bá Chức`) đúng mốc `2025-10-30 10:00:00+07` để
khớp literal. 11 hàng còn lại dùng các mốc khác (cùng ngày 29–30/10/2025, cách
nhau vài giờ) để feed có thứ tự `created_at` phân biệt cho phân trang/cursor —
`created_at` không nằm trong danh sách cấm bịa (tên/nội dung/hashtag) vì đây là
trường hệ thống, không phải nội dung thiết kế.

## 6. Phòng ban (`mms_C.3.3_Thông tin người nhận` I3127:21871;256:4860)

Đọc được: `CEVC10` — nguồn: crop `allkudos_card1.png`, dòng dưới tên người
nhận/gửi. Đây là **giá trị ví dụ duy nhất** xuất hiện trong toàn bộ frame (mọi
thẻ quan sát được đều hiện đúng `CEVC10`, không có thẻ nào khác). Spec CSV item
`B.1.2` (`mms_B.1.2_Button Phong ban`) ghi rõ: "Danh sách phòng ban sẽ được
**truy vấn từ cơ sở dữ liệu**" — tức phòng ban là dữ liệu vận hành (như
`spotlightTotal`), không phải chuỗi nội dung cố định phải chép y nguyên.

**Quyết định** (vì `phòng ban` không nằm trong danh sách "tuyệt đối không bịa"
mà orchestrator liệt kê — chỉ tên/lời cảm ơn/hashtag — và vì yêu cầu dữ liệu
đòi ≥2 phòng ban phân biệt cho dropdown filter, điều không thể đạt được chỉ với
1 giá trị literal `CEVC10`): dùng `CEVC10` cho 5/8 Sunner (đa số, khớp giá trị
literal), thêm `CEVC20` cho 3/8 Sunner còn lại — **theo đúng pattern đã có sẵn
trong repo** (`src/dal/kudos.test.ts:108` đã dùng `CEVC20` làm phòng ban thứ
hai để test filter; `kudos-filter-bar.stories.tsx` cũng đã tự thêm `CDIV02` cho
cùng mục đích ở một phase song song khác). Chọn theo CLAUDE.md § "Quyết định
thay tôi": rule (b) — khớp pattern đã có trong repo.

## 7. Số tim / heart_count

**Không seed heart_count trực tiếp.** Giá trị "1.000" hiện trên mọi thẻ mock-up
(crop `highlight_carousel.png`, `allkudos_card2.png`) là placeholder lặp lại
giống hệt content/hashtag/department — không phải số tim thật của từng thẻ.
Trigger `sync_kudo_heart_count` (migration `0007`) tính từ số hàng
`kudo_hearts` thật được insert — xem phân bổ ở SQL, top-5 heart_count phân biệt
đôi một: 7, 6, 5, 4, 3 (hàng thứ 6 = 2, tách bạch khỏi hàng thứ 5 = 3).

## 8. Ảnh đính kèm (`mms_C.3.6_Image đính kèm`)

Design hiện 5 ảnh thu nhỏ (stock photo văn phòng) trên mọi thẻ, nhưng đây là
pixel nhúng trong frame — **không đọc được URL ảnh gốc** → `KHÔNG ĐỌC ĐƯỢC`.

**Sửa lại (260907, sau lần seed đầu tiên):** lần seed đầu dùng URL placeholder
`https://example.com/kudos/demo-attachment-*.jpg`, buộc phải thêm
`images.remotePatterns` vào `next.config.ts` chỉ để `next/image` không crash
trên một domain giả — đổi production config cho dữ liệu test là sai hướng.
Repo đã có sẵn asset THẬT cho đúng node này:
`public/kudos/sample-image.png` (88×88, export MoMorph `MM_MEDIA_Sample
Image`, node `I3127:21871;256:5177;513:8436` — cùng node C.3.6 mô tả), cũng
là ảnh `kudos-card.stories.tsx` đã dùng làm `imageUrls` mẫu. Seed dùng đường
dẫn local `/kudos/sample-image.png` cho `kudo #1` (2 phần tử mảng, không cần
`images.remotePatterns` vì đây là asset cục bộ trong `public/`) — trung thành
với design hơn (asset thật thay vì URL bịa) và không đụng tới config
production.

## 9. Avatar

**Không đọc được URL avatar thật** (ảnh nhúng, không có URL) → để `NULL` cho cả
8 Sunner — trung thực hơn là bịa một URL không tồn tại.
