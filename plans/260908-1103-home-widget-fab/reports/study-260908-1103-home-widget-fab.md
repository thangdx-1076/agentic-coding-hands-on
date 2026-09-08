# Study — Floating Action Button (Widget Button trạng thái mở)

Branch `feat/home-widget-fab` ← `origin/main` (4e13209). Baseline: typecheck 0, unit 536/536.

## Kết luận một dòng

FAB **đã có** trong repo ở trạng thái thu gọn. Việc thật = thay menu **suy diễn** bằng
trạng thái mở **có design**, trên homepage. Đây là revision của F003, không phải feature mới.

## Bằng chứng

| Điều | Bằng chứng |
|---|---|
| Hai frame là 2 variant của 1 component set | `componentSetId: 214:3916` ở cả hai; `214:3908` thu gọn / `214:3909` mở rộng |
| Instance thật chỉ có trên homepage | `query_component("Widget Button")` trên `MaZUn5xHXZ` (Live board) → 0 match thật, chỉ fuzzy "Button". Trên `i87tDx10uM` → `5022:15169` `mms_6_Widget Button` |
| Pill thu gọn đã dựng đúng | `widget-button.tsx:44-52` — 106×64, `rounded-full`, `bg-login-button`, shadow `0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287`, pencil + `/` + logo Sun* |
| Menu hiện tại là suy diễn | `widget-button.tsx:21` *"INFERRED ... user override pending"*; `plans/260906-0042-homepage-saa-page/clarifications.md:51` *"user override được"* |
| Spec F003 đã mở sẵn quyết định này | `docs/vi/features/F003_Homepage/functional-spec.md` § 3, **D001** = "Nội dung thật của menu widget hành động nhanh" |
| Test case MoMorph rỗng | `get_frame_test_cases` cả 2 frame → `{"test_cases":[]}` |

## Điểm tích hợp

```
home-screen.tsx:105        → <WidgetButton kudosLabel awardsLabel buttonLabel />
  widget-button.tsx        → pill (đúng) + dropdown tối #0B0F12 (suy diễn, phải thay)
    useMenuKeyboardNav     → src/hooks/use-menu-keyboard-nav.ts, itemCount: 2, dùng lại nguyên
home-copy.ts:58,146        → type + default cho `widget.{label,kudosItem,awardsItem}`
page.tsx:124-127           → t("widget.*")
messages/{vi,en}.json      → home.widget.*
```

## Ràng buộc phải giữ

`tests/e2e/home.spec.ts` `[TC ID-35]` (dòng ~304-338) đang xanh và assert 5 hành vi:
click trigger mở → click trigger lần 2 đóng → click ra ngoài đóng → Escape đóng **và
trả focus về trigger** → Enter mở. Design cho thấy pill **biến thành** nút × đỏ, tức
pill mất đi khi mở.

→ Cách hoà giải (không nới lỏng test nào): **morph một `<button>` duy nhất**, giữ
`aria-label="Hành động nhanh"` cố định, `aria-expanded` toggle. Cả 5 hành vi giữ nguyên.

**Bẫy React identity:** trạng thái đóng render `[trigger]`, mở render `[menu, trigger]`.
Nếu viết `open ? <>{menu}{trigger}</> : trigger` thì React unmount/remount trigger →
`registerButton` mất node → Escape không trả được focus → TC ID-35 đỏ. Phải viết
`{open && menu}` rồi `{trigger}` trong cùng một children array để slot của trigger cố
định, hoặc gắn `key` cho trigger.

## Tài sản dùng lại (không tạo icon mới)

- `IconPencil` — docstring của chính nó đã nêu use case này: *"Widget Button's 'quick
  actions' trigger (mm:I5022:15169;214:3839;186:1763)"*
- `IconClose` = `MM_MEDIA_Close` `214:3851` `currentColor`, đang ở
  `kudos-compose-icons.tsx` → promote lên `src/app/_components/icons/` (consumer thứ 2
  ở route-group khác, theo scope ladder)
- Logo Sun* 24×24 — SVG inline đã nằm sẵn trong `widget-button.tsx` → trích ra
  `icon-sun-logo.tsx`, đồng thời gỡ ~90 dòng khỏi file đang sát cap 200

## Số đo (node data, không đoán)

Container `313:9140` 214×224 · flex-col · gap 20 · items flex-end · neo cùng điểm
phải/dưới với pill (`endY: 904` cả hai frame).

| Nút | Node | Kích thước | Style | Nội dung | Đích |
|---|---|---|---|---|---|
| Thể lệ | `I313:9140;214:3799` | 149×64 | p16 gap8 r4 `rgba(255,234,158,1)` | logo Sun* 24 + "Thể lệ" | `/standards` |
| Viết KUDOS | `I313:9140;214:3732` | 214×64 | idem | pencil 24 + "Viết KUDOS" | `/kudos` |
| Huỷ | `I313:9140;214:3827` | 56×56 | r100 `rgba(212,39,29,1)` | close 24 trắng | đóng panel |

Text: Montserrat 700 · 24px/32px · ls 0 · `rgba(0,16,26,1)`.
Width 149 của "Thể lệ" là slack text-box Figma (16+108+16 = 140) → dùng width nội tại.
Options **không** có shadow lúc nghỉ (chỉ pill có); shadow chỉ ở hover theo spec CSV.

## Câu hỏi chưa giải

- Test case MoMorph rỗng cả 2 frame → e2e viết từ spec. Có ghi ngược lên MoMorph không?
- `_hphd32jN2` vẫn `design_status: in_progress` dù có node data và repo đã dựng theo nó.
