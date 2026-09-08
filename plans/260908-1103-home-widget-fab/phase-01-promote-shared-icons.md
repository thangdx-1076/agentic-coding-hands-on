# Phase 01 — Promote/trích 2 icon dùng chung

## Context Links

- [`plan.md`](./plan.md) · [`clarifications.md`](./clarifications.md) § DRY — không tạo asset/icon mới
- [`reports/study-260908-1103-home-widget-fab.md`](./reports/study-260908-1103-home-widget-fab.md) § Tài sản dùng lại
- [`spec/F003_Homepage/technical-spec.md`](./spec/F003_Homepage/technical-spec.md) dòng 152-155, 205-206
- Skills: `nextjs-route-colocation-architecture` (§ Rules 2 "scope ladder", § Rules 3 "direction"),
  `write-unit-tests-and-storybook-stories` (§ "common component" boundary → icon = common → story bắt buộc)

## Overview

- **Priority:** P2 · **Status:** completed · **Effort:** 45m
- Đưa 2 icon mà panel mở rộng cần lên `src/app/_components/icons/`: `IconClose` (promote từ
  route-group `kudos`) và `IconSunLogo` (trích từ SVG inline trong pill). Phase này **không**
  chạm `widget-button.tsx` — để ownership disjoint với phase 02.
- **Evidence:** `reports/momorph-ui-260908-1146-fab-expanded.md` § Phase 01 (4 files created,
  1 file edited, all success criteria met: grep, wc, lint, unit 536/536).

## Key Insights

- **Scope ladder, không phải sở thích.** `IconClose` hiện ở
  `src/app/(public)/kudos/_components/kudos-compose-icons.tsx`. Consumer thứ 3 (widget) nằm ở
  route-group khác → theo scope ladder file phải leo lên `src/app/_components/icons/`, đúng
  tiền lệ `icon-pencil.tsx` (docstring của nó đã ghi lại lần leo trước).
- **Direction rule cấm `@/app/**/_*`.** Shim re-export phải dùng đường dẫn tương đối
  `../../../_components/icons/icon-close`, giống `widget-button.tsx:5`.
- **`IconSunLogo` là bản copy path data trong phase này, không phải bản trích.** Xoá SVG inline
  khỏi `widget-button.tsx` thuộc phase 02 (file đó do phase 02 sở hữu). Nên hết phase 01 path
  data tồn tại 2 chỗ — trạng thái tạm, phase 02 phải khử. Done-criteria của phase 02 có bước
  grep để chứng minh đã khử.
- **Gradient id trùng là vô hại ở đây** nhưng cần biết: SVG logo mang `id="paint0_linear_14788_4887"`
  / `paint1_...`. Panel mở và pill thu gọn không bao giờ render đồng thời (mở thì nội dung pill
  unmount), nên tại mọi thời điểm chỉ có 1 instance. Giữ id tĩnh; nếu về sau có state render cả
  hai, đổi sang `useId()`.

## Requirements

Functional:
- `src/app/_components/icons/icon-close.tsx` export `IconClose(props: SVGProps<SVGSVGElement>)`,
  nội dung SVG **byte-identical** với bản đang ở `kudos-compose-icons.tsx:39-55`.
- `src/app/_components/icons/icon-sun-logo.tsx` export `IconSunLogo(props: SVGProps<SVGSVGElement>)`,
  path/gradient data **byte-identical** với SVG inline ở `widget-button.tsx:69-140`, giữ nguyên
  `width="20" height="19" viewBox="0 0 20 19"` làm default và spread `{...props}` sau, để
  `className` ghi đè được.
- `kudos-compose-icons.tsx` re-export `IconClose` từ vị trí mới → `kudos-link-dialog.tsx` và
  `kudos-compose-footer.tsx` **không phải sửa một dòng nào**.

Non-functional:
- Mỗi icon mới có `*.stories.tsx` bên cạnh, theo đúng khuôn `icon-pencil.stories.tsx`
  (decorator nền `#00101A`, chữ trắng, `padding: 16px`).
- Mọi file ≤ 200 dòng. `kudos-compose-icons.tsx` giảm từ 67 → ~46 dòng.
- Không thêm asset mới vào `public/` (icon là inline `currentColor`, không dùng file SVG).

## Architecture

```
src/app/_components/icons/
├── icon-close.tsx        (mới)  ← định nghĩa thật, currentColor, 24×24
├── icon-close.stories.tsx (mới)
├── icon-sun-logo.tsx     (mới)  ← logo Sun* 20×19 trong viewBox 0 0 20 19
└── icon-sun-logo.stories.tsx (mới)

src/app/(public)/kudos/_components/kudos-compose-icons.tsx
└── export { IconClose } from "../../../_components/icons/icon-close";   ← shim tương thích
    (icon() shell + IconLink giữ nguyên tại chỗ — chỉ 1 route-group dùng)
```

Data flow: không có. Đây là 4 file presentational thuần, nhận `SVGProps` và trả `<svg>`.

## Related Code Files

Tạo:
- `src/app/_components/icons/icon-close.tsx`
- `src/app/_components/icons/icon-close.stories.tsx`
- `src/app/_components/icons/icon-sun-logo.tsx`
- `src/app/_components/icons/icon-sun-logo.stories.tsx`

Sửa:
- `src/app/(public)/kudos/_components/kudos-compose-icons.tsx` — xoá thân `IconClose`, thay bằng
  re-export; giữ `icon()` và `IconLink`; cập nhật docstring đầu file (nêu consumer thứ 3 + lý do leo).

Đọc để tham chiếu (không sửa):
- `src/app/_components/icons/icon-pencil.tsx`, `icon-pencil.stories.tsx` — khuôn mẫu
- `src/app/(public)/(home)/_components/widget-button.tsx:69-140` — nguồn path data logo
- `src/app/(public)/kudos/_components/kudos-link-dialog.tsx:181`,
  `kudos-compose-footer.tsx:60` — 2 call site phải tiếp tục chạy nguyên trạng

**File ownership (phase này sở hữu độc quyền):**
`src/app/_components/icons/icon-close*`, `src/app/_components/icons/icon-sun-logo*`,
`src/app/(public)/kudos/_components/kudos-compose-icons.tsx`.
**Tuyệt đối không chạm:** `widget-button.tsx`, `home-screen.tsx`, `messages/*`, `home-copy.ts`,
`tests/**`.

## Implementation Steps

1. Tạo `icon-close.tsx`: copy nguyên hàm `IconClose` từ `kudos-compose-icons.tsx:39-55`, viết
   docstring nêu 3 consumer (`kudos-compose-footer`, `kudos-link-dialog`, `widget-button`) và
   ghi lý do leo bậc theo scope ladder — đúng giọng docstring `icon-pencil.tsx`.
2. Tạo `icon-sun-logo.tsx`: copy nguyên block `<svg>` ở `widget-button.tsx:69-140` (5 `<path>` +
   `<defs>` 2 `linearGradient`), bọc thành component, `{...props}` đặt **sau** các attribute mặc
   định. Docstring nêu node `214:3752` (option "Thể lệ") và `186:1766;214:3762` (pill), cùng ghi
   chú gradient id tĩnh.
3. Sửa `kudos-compose-icons.tsx`: xoá thân `IconClose`, thêm dòng re-export tương đối, sửa
   docstring `MM_MEDIA_Close` thành ghi chú "đã promote, giữ lại re-export để 2 call site trong
   route-group này không phải đổi import".
4. Viết 2 story theo khuôn `icon-pencil.stories.tsx`.
5. `pnpm lint && pnpm typecheck`.
6. `pnpm test:unit` (phải vẫn 536/536 — không file `.tsx` nào nằm trong allowlist coverage, nên
   phase này không thêm test unit nào; đó là thiết kế, không phải thiếu sót).

## Todo List

- [ ] `icon-close.tsx` + docstring 3 consumer
- [ ] `icon-close.stories.tsx`
- [ ] `icon-sun-logo.tsx` + ghi chú gradient id
- [ ] `icon-sun-logo.stories.tsx`
- [ ] `kudos-compose-icons.tsx` → re-export + docstring
- [ ] `pnpm lint`, `pnpm typecheck` xanh
- [ ] `pnpm test:unit` 536/536

## Success Criteria

- `grep -rn "IconClose" src` cho thấy đúng **một** định nghĩa (`icon-close.tsx`) và một re-export.
- `kudos-link-dialog.tsx` + `kudos-compose-footer.tsx` **diff rỗng**.
- `wc -l` mọi file mới/sửa < 200.
- `pnpm typecheck` 0 lỗi; `pnpm lint` 0 lỗi; `pnpm test:unit` 536/536.
- `pnpm build-storybook` không lỗi (2 story mới render được).

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Đối phó |
|---|---|---|---|
| Shim re-export bị coi là "file trung gian vô nghĩa" khi review | Trung bình | Thấp | Docstring nói rõ đây là lớp tương thích theo clarifications § DRY; 2 call site giữ nguyên là mục đích |
| Copy path data sai một ký tự → icon méo | Thấp | Trung bình | Copy nguyên block, không gõ lại; story là bằng chứng thị giác |
| Đường dẫn `@/app/**/_*` bị dùng thay đường dẫn tương đối | Trung bình | Thấp | Direction rule của skill colocation; `widget-button.tsx:5` là mẫu sẵn |
| Phase 02 quên khử path data trùng | Trung bình | Trung bình | Bước grep nằm trong Success Criteria của phase 02, không phải lời nhắc |

## Rollback

`git checkout -- src/app/(public)/kudos/_components/kudos-compose-icons.tsx` và xoá 4 file mới.
Không có consumer nào ngoài shim, nên hoàn tác là cục bộ và không lan.

## Security Considerations

Không. 4 file SVG tĩnh, không input, không dữ liệu người dùng, không `dangerouslySetInnerHTML`.

## Next Steps

Phase 02 dùng `IconClose` cho trạng thái ×, `IconSunLogo` cho option "Thể lệ" **và** thay SVG
inline trong pill bằng `IconSunLogo` để khử trùng lặp.
