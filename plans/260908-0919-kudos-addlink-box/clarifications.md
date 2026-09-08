# Clarifications — Addlink Box (dialog "Thêm đường dẫn" cho toolbar Viết Kudo)

- MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa (`1002:12917`, instance `1002:12682`)
- Spec: 10 row (A, B, B.1, B.2, C, C.1, C.2, D, D.1, D.2) · Test case: 25 · design done · spec done
- Cha: F009_KudosCompose / SCR008 — nút `Link` trong `kudos-format-toolbar.tsx` hiện gọi `window.prompt` (`kudos-compose-form.tsx:120`)
- Ảnh frame: `plans/260908-0919-kudos-addlink-box/evidence/visual/00-frame-reference.png` (tải từ `get_frame_image`)

## Giá trị visual (từ node, không đoán)

| Node | Giá trị |
|---|---|
| Panel `1002:12682` | 752×388, bg `#FFF8E1`, radius 24, padding 40, column gap 32 |
| A `…12500` "Thêm đường dẫn" | Montserrat 32/40 bold, `#00101A`, **textAlign left**, w 672 |
| B / C row | flex row, gap 16, h 56, items-center |
| B.1 "Nội dung" · C.1 "URL" | Montserrat 22/28 bold `#00101A` |
| B.2 / C.2 text box | flex-1, h 56, border 1px `#998C5F`, bg `#FFF`, radius 8, padding 16/24 |
| C.2 con `IC` `178:1020` | 24px, không có asset `MM_MEDIA_*`, ảnh frame không hiện → **không render** |
| D row | gap 24, h 60 |
| D.1 Hủy | border `#998C5F`, bg `rgba(255,234,158,.10)`, radius 4, padding 16/40, gap 8, text 16/24 bold tracking .15, icon `MM_MEDIA_Close` 24 |
| D.2 Lưu | flex-1 (502), h 60, bg `#FFEA9E`, radius 8, padding 16, text 22/28 bold, icon `MM_MEDIA_Link` 24 |

D.1/D.2 trùng 1:1 với class Cancel/Submit của `kudos-compose-footer.tsx` (F009).

## Session 2026-09-08

- Q: Frame này là feature mới (F010) hay mở rộng F009? → A: **Mở rộng F009_KudosCompose.** Cùng actor, cùng outcome "gửi kudo"; Addlink Box chỉ thay `window.prompt` của nút Link. Không cấp F###/SCR### mới. Cập nhật `docs/vi/features/F009_KudosCompose/*` + `docs/vi/screens/SCR008_KudosCompose/spec.md`.
- Q: Dựng modal bằng gì? → A: `<dialog>` native **lồng trong** dialog Viết Kudo, mở bằng `showModal()` qua hook riêng `use-kudos-link-dialog.ts`; component không render attribute `open` (đúng bài học F009). Escape đóng dialog trên cùng (link), dialog Viết Kudo giữ nguyên.
- Q: Tiêu đề căn giữa (TC e669b7ef) hay căn trái (node)? → A: **Căn trái** theo node `textAlign: left`, w 672. Design thắng TC.
- Q: Chữ label "Text"/"Link" (spec) hay "Nội dung"/"URL" (design)? → A: Theo design: vi `Nội dung` / `URL`, tiêu đề `Thêm đường dẫn`; en `Text` / `URL`, `Add link`. Nút: `Hủy` / `Lưu` (en `Cancel` / `Save`).
- Q: Icon `IC` trong ô URL? → A: Không render — cùng lý do ô Danh hiệu F009 (instance không mang asset, ảnh frame không có icon).
- Q: Validate khi nào? → A: Khi bấm **Lưu** validate cả 2 trường; ô URL validate thêm khi **blur** (spec C). Lỗi hiện dưới từng ô theo pattern `KudosComposeField` (14px bold `#FF8A80`, `role="alert"`). Không có frame lỗi → dùng pattern repo, audit lại khi design bổ sung.
- Q: Rule validate? → A: **Nội dung**: `trim()` 1–100 ký tự, bắt buộc. **URL**: `trim()` 5–2048 ký tự, `new URL()` parse được và `protocol ∈ {http:, https:}` — khớp whitelist scheme của `kudo-markdown-text.tsx`. Spec C.2 ghi max 2046 là lỗi chép; lấy 2048 theo row C + TC aad5791a.
- Q: Copy lỗi và namespace? → A: Dùng lại `composeModal.errorRequired` "Không được để trống."; thêm dưới `kudos.composeModal.linkDialog.*`: `title`, `textLabel`, `urlLabel`, `cancel`, `save`, `errorTextTooLong` "Tối đa 100 ký tự.", `errorUrlInvalid` "URL không hợp lệ — chỉ nhận http hoặc https.", `errorUrlLength` "URL phải từ 5 đến 2048 ký tự." Type `KudosComposeCopy.linkDialog`. Parity vi/en.
- Q: Ô Nội dung có prefill? → A: **Có** — prefill bằng text đang bôi đen trong textarea lúc bấm nút Link; không bôi đen → rỗng (vẫn đúng TC "empty by default" 7d5ff602 vì TC không có selection). Không prefill thì `[text](url)` ghi đè mất vùng chọn.
- Q: Chèn markdown thế nào? → A: Mở rộng `insertMarkdownMarker`: `insertLink` nhận thêm `linkText?` — có thì thay vùng chọn bằng `[linkText](url)`, caret đặt sau `)`; không có giữ hành vi cũ (selection hoặc placeholder `text`). Hook link-dialog **snapshot `selectionStart/End` lúc mở** và `setSelectionRange` lại trước khi gọi `applyFormat` (focus đã rời textarea khi dialog mở).
- Q: Sau Lưu / Hủy / Escape? → A: Đóng dialog link, reset 2 trường + lỗi. Lưu hợp lệ → chèn markdown vào textarea. Hủy/Escape → textarea không đổi. Không lưu draft.
- Q: Nút Lưu có disabled khi thiếu? → A: **Không** — luôn bấm được, bấm mới validate (TC e5632ac7 "Click Lưu → error displays"). Khác nút Gửi của F009 (`aria-disabled`).
- Q: Tái dùng `KudosComposeFooter`? → A: **Không** — testid `kudos-compose-cancel/submit` lồng trong dialog cha làm lệch locator e2e F009 (C04/C08). Component mới `kudos-link-dialog.tsx`, class button chép từ footer. Icon `IconClose`/`IconLink` hiện là `const` cục bộ trong footer/toolbar → extract sang `kudos-compose-icons.tsx` và import lại ở cả 3 nơi (DRY).
- Q: Testid hợp đồng? → A: `kudos-link-dialog`, `kudos-link-title`, `kudos-link-text-input`, `kudos-link-url-input`, `kudos-link-text-error`, `kudos-link-url-error`, `kudos-link-cancel`, `kudos-link-save`. Trigger: `[data-testid=kudos-format-button][data-format=link]` (đã có).
- Q: Test policy? → A: **e2e-red-first** — modal open/close + validation là behavior. File **mới** `tests/e2e/kudos-link-dialog.spec.ts`, describe `@auth` (Supabase local + `createTestSession` như F009), **không sửa** `kudos-compose.spec.ts`. Mọi lệnh `E2E_PORT=3100`.
- Q: TC access control (70006b13, 1a55a427)? → A: Kế thừa F009 C01 — chưa đăng nhập không mở được dialog Viết Kudo nên không tới nút Link. Không thêm gate. "Chỉ một instance" đảm bảo bởi `showModal()` no-op khi đã `open`.
- Q: TC responsive / nhiều browser (2efb76ce)? → A: Panel `w-[752px]` cố định như dialog cha; không làm responsive thêm (F009 cũng không). Chỉ chạy Chromium theo playwright.config hiện tại.
- Q: TC "button group anchored on scroll" (abddef4b)? → A: Nội dung cố định 2 hàng, panel 388px không scroll → không cần sticky.
- Q: Tài liệu hệ thống (architecture/permissions)? → A: Không chạm — chỉ UI + util thuần trong `(public)/kudos`. Forward-draft N/A.
- Q: Spec language? → A: `vi` — kế thừa `primary_lang` (docs/vi/ đã tồn tại).
