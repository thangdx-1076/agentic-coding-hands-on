# Clarifications — Floating Action Button (Widget Button trạng thái mở)

MoMorph refs:
- FAB thu gọn: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2 (`313:9137`, design `in_progress`, spec `done`)
- FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h (`313:9139`, design `done`, spec `done`)
- Instance thật trên trang: Homepage SAA `i87tDx10uM`, node `5022:15169` (`mms_6_Widget Button`)
- testPolicy: `e2e-red-first`

Hai frame là **hai variant của cùng một component set** Figma (`214:3916`):
`214:3908` = thu gọn, `214:3909` = mở rộng. Không phải hai component riêng.

## Session 260908

### Phát hiện nền — việc này là revision, không phải feature mới

- Q: FAB này đã có trong repo chưa? → A: **Có.** `src/app/(public)/(home)/_components/widget-button.tsx`
  đã dựng đúng pixel trạng thái **thu gọn** (`_hphd32jN2`): pill 106×64, `rounded-full`,
  `bg-login-button`, shadow `0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287`, nội dung
  `IconPencil` + `/` + logo Sun* inline SVG. Việc còn lại **chỉ là trạng thái mở**.
- Q: Menu đang mở hiện tại là gì? → A: Dropdown tối `#0B0F12` với 2 item "Sun* Kudos"
  (`/kudos`) + "Award Information" (`/awards`) — **INFERRED**, không có design. Plan
  homepage ghi rõ: *"menu 2 item suy ra từ 2 icon (INFERRED, user override được)"*
  (`plans/260906-0042-homepage-saa-page/clarifications.md:51`), và docstring
  `widget-button.tsx:21` ghi *"user override pending"*. **Hai frame này chính là
  cái override đó.**
- Q: Vậy cấp F010? → A: **Không — revision của F003 (Homepage).** Cùng actor, cùng
  screen `SCR003_Home`, widget đã là bộ phận của F003; chỉ thay nội dung suy diễn
  bằng nội dung có design. Theo tiền lệ Addlink Box = revision F009 (260908-0919).

### Phạm vi

- Q: FAB lên những trang nào? → A: **Chỉ homepage.** `query_component` trên
  `MaZUn5xHXZ` (Live board) không có instance Widget Button nào — chỉ homepage
  `i87tDx10uM` có (`5022:15169`). Không suy diễn thêm trang. YAGNI.
- Q: "Viết KUDOS" từ homepage đi đâu? → A: `/kudos` (`<Link>`), theo đúng tiền lệ
  `standards-footer-actions.tsx:80` — nút "Viết KUDOS" vàng ở /standards cũng chỉ
  link sang `/kudos`. **Không** mở dialog compose F009: dialog sống trong
  `KudosComposeLauncher` bên trong `/kudos`, không tới được từ homepage.
- Q: "Thể lệ" đi đâu? → A: `ROUTES.STANDARDS` = `/standards` (F005).
- Q: Item "Award Information" hiện có thì sao? → A: **Bỏ.** Design chỉ vẽ 2 option
  (Thể lệ, Viết KUDOS). Nav header đã có link Awards nên không mất đường đi.

### Hợp đồng thị giác (số đo từ node data, không đoán)

- Container mở rộng `313:9140`: `214×224`, flex column, `gap: 20px`,
  `align-items: flex-end`. Neo phải/dưới cùng điểm với pill thu gọn
  (cả hai `endY: 904`; `right: 19px` theo `313:9138`).
- `A_Button thể lệ` `I313:9140;214:3799`: `149×64`, `padding: 16px`, `gap: 8px`,
  `border-radius: 4px`, `background: rgba(255,234,158,1)`; nội dung
  `MM_MEDIA_LOGO 24×24` (logo Sun*, `214:3752`) + text "Thể lệ".
- `B_Button viết kudos` `I313:9140;214:3732`: `214×64`, cùng padding/gap/radius/màu;
  nội dung `MM_MEDIA_Pen 24×24` (`214:3812`) + text "Viết KUDOS".
- `C_Button huỷ` `I313:9140;214:3827`: `56×56`, `border-radius: 100px`,
  `background: rgba(212,39,29,1)`, icon `MM_MEDIA_Close 24×24` (`214:3851`) trắng.
- Text cả 2 option: Montserrat 700, `24px/32px`, `letter-spacing: 0`,
  màu `rgba(0,16,26,1)` (= `text-login-button-text`).
- Q: Width `149px` của "Thể lệ" có hardcode? → A: **Không.** `padding 16` + content
  frame `108px` = 140, lệch 9px so với 149 — đó là slack của text box trong Figma
  (text node 76px nhưng glyph "Thể lệ" hẹp hơn). Dùng width nội tại, giữ padding 16
  hai bên như design intent. "Viết KUDOS" thì 16+182+16 = 214 khớp đúng.
- Q: Shadow cho 2 option? → A: Node data **không có** shadow trên option button —
  chỉ pill thu gọn có. Spec ghi "hover: tăng nhẹ shadow" → shadow chỉ ở hover.

### Hành vi

- Q: Pill có còn hiện khi mở? → A: **Không.** Ảnh frame mở rộng không có pill; nút ×
  đỏ nằm đúng chỗ pill (cùng `endY: 904`, mép phải 1302 vs 1297). Pill **biến thành ×**.
- Q: Vậy làm sao giữ `home.spec.ts` TC ID-35 xanh (test hiện có: click trigger lần 2
  để đóng, Escape trả focus về trigger)? → A: **Morph một `<button>` duy nhất** — cùng
  DOM node, đổi nội dung + style pill↔×, `aria-expanded` toggle, và **giữ
  `aria-label="Hành động nhanh"` cố định** ở cả hai trạng thái. Giữ nguyên cả 4 hành vi
  test đang assert (click toggle, click ngoài, Escape + focus về trigger, Enter mở).
  Không sửa test hiện có, không nới lỏng assertion.
- Q: `role="menu"` giữ hay đổi? → A: **Giữ.** Hai option đều là điều hướng → `menuitem`
  vẫn đúng semantics, và `useMenuKeyboardNav` (đang dùng, `itemCount: 2`) không đổi.
  Nút × là control đóng, **không** phải `menuitem` — đứng ngoài `[role="menu"]`.
- Q: Click × làm gì? → A: Đóng panel, trả focus về trigger — cùng đường ra như Escape.
- Q: Nút × có `aria-label="Hủy"` riêng không? → A: **Không.** × **chính là** trigger ở
  trạng thái mở, nên accessible name giữ nguyên `"Hành động nhanh"`, state do
  `aria-expanded` mang. Đây là ràng buộc chịu lực: `home.spec.ts` TC ID-35 click
  `button[aria-label="Hành động nhanh"]` **lần thứ hai lúc menu đang mở** để đóng —
  đổi label sang "Hủy" (hoặc ẩn pill rồi thêm nút × riêng) làm click đó trượt vào
  element ẩn/không tồn tại → test đang xanh sẽ đỏ. Kết quả render vẫn khớp design
  100%: đúng một nút tròn đỏ 56×56 nằm đúng chỗ pill (cả hai frame `endY: 904`).
  Copy `cancelLabel` vẫn giữ trong `home.widget` cho `title`/`aria-hidden` của icon,
  nhưng **không** làm accessible name của nút.
- Q: Bẫy React identity khi morph? → A: đóng render `[trigger]`, mở render
  `[menu, trigger]`. Phải viết `{open && menu}` rồi `{trigger}` trong **cùng một
  children array** để slot của trigger cố định (hoặc gắn `key`). Viết
  `open ? <>{menu}{trigger}</> : trigger` sẽ unmount/remount trigger →
  `registerButton` mất node → Escape không trả được focus → TC ID-35 đỏ.
- Q: Panel dùng `absolute bottom-full` như menu cũ? → A: **Không.** Design là flex
  column trong luồng: `flex flex-col items-end gap-5` (gap 20px) trong wrapper
  `fixed right-6 bottom-6` đang có. × ở cuối (neo cố định), 2 option mọc lên trên.
- Q: Animation vào? → A: dùng lại `animate-login-menu-in` đang có (180ms, đã tôn trọng
  `prefers-reduced-motion`). Không thêm keyframe mới — YAGNI.

### Copy & i18n

- Q: Key copy nào? → A: `home.widget` trong `messages/{vi,en}.json`:
  giữ `label`; **bỏ** `kudosItem`/`awardsItem`; **thêm** `standardsItem` ("Thể lệ" /
  "Rules" — khớp `standards.title` en đã có), `writeKudosItem` ("Viết KUDOS" / **"Write KUDOS"**),
  `cancelLabel` ("Hủy" / "Cancel").
- **Sửa 260908-1200 (lỗi của orchestrator):** ban đầu tôi dặn `writeKudosItem` giữ "Viết KUDOS" ở
  **cả hai** locale, viện dẫn `standards-footer-actions.tsx` mà **không kiểm giá trị `en`** của nó.
  Kiểm lại: repo dịch hẳn — `standards.footer.writeKudos` en = `"Write KUDOS"`,
  `profile.stats.writeKudos` en = `"Write Kudos"`, `kudos.compose.ariaLabel` en = `"Write Kudos"`.
  Để "Viết KUDOS" trong `en.json` là bug người dùng thấy được. Đã sửa → `"Write KUDOS"`.
  E2E không ảnh hưởng: locale mặc định `vi` (`DEFAULT_LOCALE`, cookie `NEXT_LOCALE`) nên
  assertion `toContainText("Viết KUDOS")` vẫn đúng.
- Không test nào assert "Sun* Kudos"/"Award Information" trong ngữ cảnh widget
  (đã grep `src/` + `tests/`) → đổi copy an toàn. Chỉ 3 chỗ tham chiếu key:
  `page.tsx:125-126`, `home-screen.tsx:106-107`, `widget-button.stories.tsx:11-12`.

### DRY — không tạo asset/icon mới

- `IconPencil` (`src/app/_components/icons/icon-pencil.tsx`) — docstring của nó đã
  nêu đúng use case này: *"Widget Button's 'quick actions' trigger
  (mm:I5022:15169;214:3839;186:1763)"*. Dùng lại.
- `IconClose` (`src/app/(public)/kudos/_components/kudos-compose-icons.tsx`) là
  `MM_MEDIA_Close` `214:3851` `currentColor` — **đúng component design cần**, nhưng
  đang nằm trong route-group `kudos`. Consumer thứ 2 ở route-group khác →
  promote lên `src/app/_components/icons/icon-close.tsx` theo scope ladder
  (`nextjs-route-colocation-architecture`), `kudos-compose-icons.tsx` re-export.
- Logo Sun* 24×24: SVG inline đã có sẵn **ngay trong** `widget-button.tsx` (pill thu
  gọn). Trích thành `icon-sun-logo.tsx` để nút "Thể lệ" dùng lại, không copy path data.

### Test policy

- Q: `visual-contract` hay `e2e-red-first`? → A: **`e2e-red-first`** — có state
  transition (mở/đóng panel), điều hướng, focus management. Runner đã có
  (`@playwright/test`, `tests/e2e/`). RED chạy song song với Spec, không đợi blueprint
  (tiền lệ 260908-0919).
- `E2E_PORT=3100` cho mọi lệnh e2e. Port 3000 là dev server project khác — **không kill**.

## Unresolved Questions

- Test case MoMorph cho cả 2 frame đều **rỗng** (`get_frame_test_cases` → `[]`).
  E2E phải viết từ spec + design. Có ghi test case ngược lên MoMorph không?
- Frame thu gọn `_hphd32jN2` vẫn `design_status: in_progress` dù đã có node data và
  repo đã dựng theo nó từ phase homepage. Có cần đánh `done` trên MoMorph không?
