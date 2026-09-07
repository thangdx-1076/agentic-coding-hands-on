---
status: draft
authored_by: takumi
created: 2026-09-07
---

# Feature List — draft (greenfield subset cho SCR007)

**Project**: agentic-coding-hands-on
**Nguồn**: MoMorph screen `MaZUn5xHXZ` — "Sun* Kudos - Live board" (64 spec item, 41 test case)
**Phạm vi**: đúng một screen mới (SCR007) và những gì screen đó cần để chạy thật. Không đụng F001–F006.

**F-code note**: F007/F008 dưới đây là **provisional** — mã thật được cấp ở bước promote
(implement-start). F001–F006 trong `docs/vi/_canonical-fcodes.json` giữ nguyên, không renumber.

## Feature Hierarchy

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F007_KudosLiveBoard | Bảng Kudos trực tiếp (`/kudos`) | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F008_KudosHeartReaction | Thả tim cho Kudos | mixed | TypeScript | agentic-coding-hands-on | P1 |

## Feature Details

### F007: Bảng Kudos trực tiếp (`/kudos`)

**Type**: mixed
**Description**: Sunner mở `/kudos` và đọc được toàn bộ đời sống lời cảm ơn của sự kiện trong
một trang: banner ghi nhận, carousel HIGHLIGHT 5 kudo nhiều tim nhất, bảng Spotlight điểm tên
người nhận kèm tổng số kudo, feed ALL KUDOS cuộn vô hạn, và sidebar thống kê cá nhân cộng hai
bảng xếp hạng. Bộ lọc Hashtag và Phòng ban thu hẹp đồng thời cả carousel lẫn feed. Trang mở cho
cả người chưa đăng nhập.

**Vì sao đây là MỘT outcome**: mọi bề mặt trong screen phục vụ đúng một ý định — *nhìn thấy ai
đã cảm ơn ai trong sự kiện này*. Carousel, Spotlight và feed là ba lát cắt của cùng một tập dữ
liệu (`kudos`), khác nhau ở thứ tự và mức tổng hợp chứ không ở mục đích; bộ lọc chỉ thu hẹp tập
đó. Sidebar là cùng dữ liệu soi từ góc "của tôi". Tách bất kỳ mảnh nào thành F### riêng sẽ tạo
ra một Feature không có ý định độc lập của chính nó.

**Related**: SCR007_KudosLiveBoard · ROUTE `/kudos` · MODEL `Kudo`, `KudoCard` (view)

**Ngoài phạm vi** (cần frame chưa tồn tại — xem `clarifications.md`): dialog Viết Kudo
(`ihQ26W78P2`) · dialog Secret Box (`J3-4YFIpMM`) · trang chi tiết kudo (`onDIohs2bS`) · hover
preview profile (`Bf5XiTE7AO`) · lightbox ảnh · pan/zoom Spotlight.

### F008: Thả tim cho Kudos

**Type**: mixed
**Description**: Sunner đã đăng nhập bấm trái tim trên một kudo để bày tỏ đồng tình. Lượt tim
được ghi vào DB, số tim trên thẻ đổi ngay, và tài khoản **người gửi** kudo được cộng tim tương
ứng. Bỏ tim thu hồi đúng số đã cộng.

**Vì sao đây là outcome RIÊNG, không gộp vào F007**: đối chiếu đúng phép thử mà
`docs/vi/generated/feature-list.md` đã áp cho F001 (một sub-behavior chỉ enforce trạng thái do
feature khác tạo ra thì KHÔNG được tách). Thả tim vượt phép thử đó ở ba điểm: nó là **ghi**, có
bảng riêng và ba business rule riêng (một lượt/người/kudo · người gửi bị chặn tự thả tim · bỏ
tim thu hồi đúng số); nó có **actor hẹp hơn** F007 (bắt buộc đăng nhập, trong khi F007 mở cho
anonymous); và nó thay đổi số dư của **một người thứ ba** (người gửi), nuôi tiếp hệ hoa thị /
Hero tier chứ không chỉ đổi cái đang hiển thị. Đó là một ý định người dùng độc lập, không phải
hệ quả của việc đọc bảng.

**Related**: SCR007_KudosLiveBoard · MODEL `KudoHeart`

**Ngoài phạm vi**: quy tắc "+2 tim trong ngày đặc biệt do admin cấu hình" — không có màn admin,
không có bảng config, không dựng được precondition của test case. Cột đánh dấu vẫn được tạo sẵn
trong migration để lần sau không phải migrate lại.
