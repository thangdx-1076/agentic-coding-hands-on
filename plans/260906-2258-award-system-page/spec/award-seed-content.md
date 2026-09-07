# Seed content — 6 hạng mục giải (nguồn sự thật DUY NHẤT)

**File này thắng mọi nguồn khác.** Nếu `F004_AwardSystemPage/technical-spec.md § Seed data`
mâu thuẫn với file này, dùng file này.

## Vì sao cần đính chính

Lượt spec đầu kết luận "4/6 thẻ giải không có nội dung riêng — design thiếu content". Kết luận
đó **sai**. Bốn node `313:8468` / `313:8469` / `313:8470` / `313:8510` là **component instance**,
và `query_by_type(TEXT)` của MoMorph trả về text **mặc định của component**, không phải override
của instance. Ba nguồn độc lập bác bỏ nó:

1. `get_design_item_image` render từng thẻ → mỗi thẻ có tiêu đề + đoạn mô tả riêng, khác nhau rõ.
2. `get_frame_image` toàn màn hình → cùng kết quả.
3. `download_specs` CSV → số lượng/giá trị giải khớp ảnh, lệch với text node.

Ví dụ chứng minh: Top Project — text node ghi `10 / Đơn vị`, còn ảnh **và** specs CSV đều ghi
`02 / Tập thể`. Text node là dữ liệu cũ, ảnh render là sự thật.

**Suy ra:** với màn hình này, thứ tự tin cậy là **ảnh render > specs CSV > text node**. Không
seed bất cứ chữ nào lấy từ `query_by_type(TEXT)` cho 4 thẻ instance nói trên.

## Số lượng và giá trị giải

| slug | title | qty | unit | prize |
|---|---|---|---|---|
| `top-talent` | Top Talent | 10 | Cá nhân | 7.000.000 VNĐ — *cho mỗi giải thưởng* |
| `top-project` | Top Project | 02 | Tập thể | 15.000.000 VNĐ — *cho mỗi giải thưởng* |
| `top-project-leader` | Top Project Leader | 03 | Cá nhân | 7.000.000 VNĐ — *cho mỗi giải thưởng* |
| `best-manager` | Best Manager | 01 | Cá nhân | 10.000.000 VNĐ — *(không có dòng chú)* |
| `signature-2025-creator` | Signature 2025 - Creator | 01 | Cá nhân hoặc tập thể | 5.000.000 VNĐ — *cho giải cá nhân* **và** 8.000.000 VNĐ — *cho giải tập thể* |
| `mvp` | MVP (Most Valuable Person) | 01 | Cá nhân | 15.000.000 VNĐ — *(không có dòng chú)* |

Thứ tự hiển thị = thứ tự bảng trên (`sort_order` 1…6). Chỉ Signature có 2 phần tử prize; 5 giải
còn lại có 1.

## Mô tả (tiếng Việt, chép nguyên văn từ design)

Giữ nguyên dấu gạch ngang `–`, nháy cong `“ ”`, và dấu `*` trong "Sun*". Chỗ đánh dấu
`[xuống dòng kép]` là ngắt đoạn thật trong design → lưu thành `\n\n`.

### top-talent
Giải thưởng Top Talent vinh danh những cá nhân xuất sắc toàn diện – những người không ngừng khẳng định năng lực chuyên môn vững vàng, hiệu suất công việc vượt trội, luôn mang lại giá trị vượt kỳ vọng, được đánh giá cao bởi khách hàng và đồng đội. Với tinh thần sẵn sàng nhận mọi nhiệm vụ tổ chức giao phó, họ luôn là nguồn cảm hứng, thúc đẩy động lực và tạo ảnh hưởng tích cực đến cả tập thể.

### top-project
Giải thưởng Top Project vinh danh các tập thể dự án xuất sắc với kết quả kinh doanh vượt kỳ vọng, hiệu quả vận hành tối ưu và tinh thần làm việc tận tâm. Đây là các dự án có độ phức tạp kỹ thuật cao, hiệu quả tối ưu hóa nguồn lực và chi phí tốt, đề xuất các ý tưởng có giá trị cho khách hàng, đem lại lợi nhuận vượt trội và nhận được phản hồi tích cực từ khách hàng. Các thành viên tuân thủ nghiêm ngặt các tiêu chuẩn phát triển nội bộ trong phát triển dự án, tạo nên một hình mẫu về sự xuất sắc và chuyên nghiệp.

### top-project-leader
Giải thưởng Top Project Leader vinh danh những nhà quản lý dự án xuất sắc – những người hội tụ năng lực quản lý vững vàng, khả năng truyền cảm hứng mạnh mẽ, và tư duy “Aim High – Be Agile” trong mọi bài toán và bối cảnh. Dưới sự dẫn dắt của họ, các thành viên không chỉ cùng nhau vượt qua thử thách và đạt được mục tiêu đề ra, mà còn giữ vững ngọn lửa nhiệt huyết, tinh thần Wasshoi, và trưởng thành để trở thành phiên bản tinh hoa – hạnh phúc hơn của chính mình.

### best-manager
Giải thưởng Best Manager vinh danh những nhà lãnh đạo tiêu biểu – người đã dẫn dắt đội ngũ của mình tạo ra kết quả vượt kỳ vọng, tác động nổi bật đến hiệu quả kinh doanh và sự phát triển bền vững của tổ chức. Dưới sự lãnh đạo của họ, đội ngũ luôn chinh phục và làm chủ mọi mục tiêu bằng năng lực đa nhiệm, khả năng phối hợp hiệu quả, và tư duy ứng dụng công nghệ linh hoạt trong kỷ nguyên số. Họ truyền cảm hứng để tập thể trở nên tự tin tràn đầy năng lượng, sẵn sàng đón nhận, thậm chí dẫn dắt tạo ra những thay đổi có tính cách mạng.

### signature-2025-creator
Giải thưởng Signature vinh danh cá nhân hoặc tập thể thể hiện tinh thần đặc trưng mà Sun* hướng tới trong từng thời kỳ.

[xuống dòng kép]

Trong năm 2025, giải thưởng Signature vinh danh Creator - cá nhân/tập thể mang tư duy chủ động và nhạy bén, luôn nhìn thấy cơ hội trong thách thức và tiên phong trong hành động. Họ là những người nhạy bén với vấn đề, nhanh chóng nhận diện và đưa ra những giải pháp thực tiễn, mang lại giá trị rõ rệt cho dự án, khách hàng hoặc tổ chức. Với tư duy kiến tạo và tinh thần “Creator” đặc trưng của Sun*, họ không chỉ phản ứng tích cực trước sự thay đổi mà còn chủ động tạo ra cải tiến, góp phần định hình chuẩn mực mới cho cách mà người Sun* tạo giá trị.

### mvp
Giải thưởng MVP vinh danh cá nhân xuất sắc nhất năm – gương mặt tiêu biểu đại diện cho toàn bộ tập thể Sun*. Họ là người đã thể hiện năng lực vượt trội, tinh thần cống hiến bền bỉ, và tầm ảnh hưởng sâu rộng, để lại dấu ấn mạnh mẽ trong hành trình của Sun* suốt năm qua.

[xuống dòng kép]

Không chỉ nổi bật bởi hiệu suất và kết quả công việc, họ còn là nguồn cảm hứng lan tỏa – thông qua suy nghĩ, hành động và ảnh hưởng tích cực của mình đối với tập thể. MVP là người hội tụ đầy đủ phẩm chất của người Sun* ưu tú, đồng thời mang trên mình trọng trách lớn lao: trở thành hình mẫu đại diện cho con người và tinh thần Sun*, góp phần dẫn dắt tập thể vươn tới những đỉnh cao mới.

## Ảnh giải

Không có file MM_MEDIA cho vòng tròn vàng (`list_media_nodes` không trả node nào cho
`Picture-Award` — nó là vector Figma). Ghép lại bằng asset đã có, đúng cách
`src/app/(public)/(home)/_components/award-card.tsx:20-38` đang làm:
`/home/Award_BG.png` (nền vòng) + PNG tên giải theo slug.

| slug | PNG tên giải | w × h |
|---|---|---|
| `top-talent` | `/home/Top_Talent.png` | 222 × 36 |
| `top-project` | `/home/Top_Project.png` | 232 × 35 |
| `top-project-leader` | `/home/Top_Project_Leader.png` | 232 × 64 |
| `best-manager` | `/home/Best_Manager.png` | 232 × 30 |
| `signature-2025-creator` | `/home/Signature_2025_Creator.png` | 232 × 54 |
| `mvp` | `/home/MVP.png` | 116 × 52 |

Kích thước lấy từ `award-card.tsx` — chúng là kích thước nội tại thật của từng file, khác nhau
theo tên giải. Truyền sai cặp w/h sẽ kích hoạt cảnh báo "width or height modified" của Next.

## EN

MoMorph chỉ có tiếng Việt. Không tự dịch. Seed chỉ `locale = 'vi'`; nếu `en` được yêu cầu sau
này thì đó là việc của phiên khác (đã ghi nợ ở `clarifications.md § Unresolved`).
