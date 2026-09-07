# Clarifications — Màn hình "Hệ thống giải" (MoMorph zFYDgyj_pD)

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
Frame: `Hệ thống giải` · node `313:8436` · 23 specs · 15 test cases

## Session 2026-09-06

Người dùng đã uỷ quyền quyết định (CLAUDE.md § "Quyết định thay tôi, đừng hỏi").
Mỗi dòng dưới là một quyết định đã chốt, không hỏi lại.

- Q: Route nào — test case ghi `/he-thong-giai`, repo đã link `/awards`? → A: **`/awards`**.
  Repo đã có 6 link trỏ `/awards` + `/awards#<slug>` (header nav, footer, CTA, widget, 6 award
  card) và 5 assertion E2E trong `tests/e2e/home.spec.ts`. `docs/vi/features/F003_Homepage/functional-spec.md`
  ghi rõ `/awards` là trang đích chưa implement. Chọn `/he-thong-giai` phải sửa 8 file và phá 5
  assertion đang xanh, đổi lại không được gì. Slug anchor phải khớp `top-talent`,
  `top-project`, `top-project-leader`, `best-manager`, `signature-2025-creator`, `mvp`.

- Q: `/awards` có gác đăng nhập không — TC ID-0/ID-1 đòi redirect về `/login`? → A: **PUBLIC,
  không gác**. `docs/vi/system/permissions.md:54` đã ghi quyết định 2026-09-06: nội dung giới
  thiệu sự kiện ("giải thưởng, đếm ngược, thông tin sự kiện") là công khai cho mọi nhân viên kể
  cả chưa đăng nhập; `/` đã bỏ route-guard vì lý do đó. `/awards` là ĐÚNG loại nội dung ấy và
  được link từ header/footer công khai của `/` — gác nó lại sẽ đá khách chưa đăng nhập sang
  `/login` ngay từ nav của một trang công khai. TC ID-0 vẫn thoả (người đã đăng nhập xem được).
  TC ID-1 bị **superseded** bởi quyết định kiến trúc đã ghi; ghi nợ để chủ spec xác nhận.

- Q: "sử dụng supabase local" nghĩa là gì cho màn hình read-only này? → A: **Nội dung 6 giải
  đọc từ bảng mới trong Supabase local `saa-app`** (127.0.0.1:55321), qua một DAL server-side
  theo đúng khuôn `src/dal/users.ts` (client hẹp được inject, `server-only`). Chrome tĩnh
  (heading, nhãn, footer) vẫn nằm ở `messages/*.json` như `/`. Nguồn sự thật của nội dung giải
  là DB, không nhân bản sang JSON.

- Q: Supabase fail thì trang hiển thị gì? → A: **fail-open như `/`**, không 500. Không có dữ
  liệu → render empty-state trong khung trang (hero/nav/footer vẫn còn), không phá layout. Cùng
  triết lý `getViewer()` ở `src/app/(public)/(home)/page.tsx`.

- Q: Nav trái hoạt động thế nào? → A: click → smooth scroll tới section + set active; đồng thời
  **scroll-spy bằng IntersectionObserver** để active bám theo vị trí cuộn. Tôn trọng
  `prefers-reduced-motion` (đổi sang jump, không smooth). Logic tách khỏi component thành hook
  riêng theo skill `separate-hook-logic-from-components`.

- Q: Layout 6 khối giải? → A: **xen kẽ** — ảnh trái/nội dung phải cho khối 1, 3, 5; nội dung
  trái/ảnh phải cho khối 2, 4, 6 (đọc từ ảnh frame). Dưới `lg` xếp dọc, ảnh luôn trên.

- Q: Nav trái trên mobile? → A: dưới `lg` biến thành thanh chip cuộn ngang dính dưới header;
  từ `lg` là sidebar sticky. Design chỉ vẽ desktop — đây là suy diễn responsive bắt buộc.

- Q: Ảnh giải (336×336) lấy đâu? → A: **tái dùng asset sẵn có** — `/home/Award_BG.png` (vòng
  vàng) + PNG tên giải theo slug (`/home/Top_Talent.png`, …) đúng cách `award-card.tsx` đang
  ghép. `list_media_nodes` không trả MM_MEDIA cho `Picture-Award` (nó là vector Figma), nên
  không có file để tải; ghép asset là đường duy nhất và cho ra đúng hình.

- Q: Icon mới? → A: 3 icon 24px chưa có — `Target` (đầu mục nav + tiêu đề giải), `Diamond`
  ("Số lượng giải thưởng"), `License` ("Giá trị giải thưởng"). Viết thành inline SVG component
  theo khuôn `_components/icons/icon-*.tsx`, không tải PNG.

- Q: Nút "Chi tiết" của khối Kudos trỏ đâu — `/kudos` chưa tồn tại (TC ID-12/ID-14)? → A: giữ
  `href="/kudos"` cho khớp `/`; không xây `/kudos` trong phiên này. TC ID-12 không thoả được,
  ghi nợ. `KudosSection` tái dùng nguyên trạng (cùng component instance Figma).

- Q: Signature 2025 có hai giá trị giải (cá nhân 5tr / tập thể 8tr)? → A: model giá trị giải là
  **danh sách** `{ amount, note }[]`, không phải một chuỗi — 5 giải kia có 1 phần tử, Signature
  có 2.

## Test policy

`e2e-red-first`. Test case chứa hành vi tương tác thật (nav click → scroll + đổi active state,
button click → điều hướng) → luật 3 của `momorph-development.md` chọn chính sách này. Runner có
sẵn và thật: `@playwright/test` 1.62.1, `pnpm test:e2e`, `testDir: ./tests/e2e`.

## Unresolved / ghi nợ

- TC ID-1 (chưa đăng nhập → `/login`) cố ý KHÔNG implement; chủ spec cần xác nhận `/awards`
  công khai hay không.
- TC ID-12/ID-14 (nút "Chi tiết" mở trang Sun* Kudos) không thoả được — `/kudos` chưa tồn tại.
- Bản dịch EN cho nội dung 6 giải: nguồn MoMorph chỉ có tiếng Việt.

## Đính chính 2026-09-06 (sau khi spec draft xong)

- Q: Spec draft kết luận "4/6 thẻ giải thiếu nội dung trong design" (D001/RISK-02) — đúng không?
  → A: **Sai, đã bác bỏ.** Bốn node đó là component instance; `query_by_type(TEXT)` trả text mặc
  định của component chứ không phải override. `get_design_item_image` từng thẻ cho thấy cả 6 thẻ
  đều có tiêu đề + mô tả riêng. Bằng chứng đối chiếu: Top Project — text node ghi `10/Đơn vị`,
  ảnh render và specs CSV đều ghi `02/Tập thể`. Thứ tự tin cậy cho màn hình này:
  **ảnh render > specs CSV > text node**. Nội dung thật của cả 6 giải nằm ở
  `spec/award-seed-content.md` — file đó thắng phần `§ Seed data` của technical-spec.
  Không seed placeholder, không mượn text từ `home-copy.ts`.
