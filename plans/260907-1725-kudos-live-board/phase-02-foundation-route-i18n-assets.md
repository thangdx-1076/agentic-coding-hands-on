---
phase: 02
feature: F007
track: B
status: pending
priority: P0
test_policy: e2e-red-first
effort: 0.75h
owner: implementer
file_ownership:
  [
    "src/constants/routes.ts",
    "messages/vi.json",
    "messages/en.json",
    "public/kudos/**",
  ]
---

# Phase 02 — Nền: route constant, i18n namespace `kudos`, assets

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
  - banner `mms_A_KV Kudos` `2940:13437` (logo SAA 2025 KUDOS) · icon bút trong `mms_A.1` `2940:13449`
  - icon chevron `2940:13470`/`2940:13468` · icon kính lúp `2940:14833` · icon tim `I3127:21871;256:5175` · icon mũi tên gửi→nhận `I2940:13465;335:9444`
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `phase-01-red-e2e-kudos-contract.md` § Requirements — mọi chuỗi phải khớp từng ký tự
- `messages/vi.json` / `messages/en.json` — 6 namespace hiện có: `login, todo, home, awards, standards, profile`
- `src/app/(public)/awards/page.tsx:76-105` — `buildCopy` đọc namespace `home` cho chrome, namespace riêng cho leaf
- `tests/unit/.../messages-parity.test.ts` — assert hai bundle giống hệt nhau về cấu trúc

## Overview

**Priority**: P0 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Đặt sẵn 3 thứ mà 6 phase Track A cùng cần — hằng số route, namespace `kudos` trong cả hai bundle messages, và ảnh/icon tải về từ design.

## Out of scope

- **Không** viết lại 5 điểm liên kết đang hardcode `href="/kudos"` (AD-6) — `site-header.tsx:70`, `site-footer.tsx:67`, `kudos-section.tsx:63`, `widget-button.tsx:154`, `/standards`. Chúng thuộc F003–F005 và e2e của chúng assert đúng chuỗi đó.
- **Không** đụng `src/proxy.ts` — `/kudos` public, `PROTECTED_ROUTES` giữ nguyên `[TODO, PROFILE]`.
- **Không** tạo file `.tsx` nào.

## Key Insights

- **`messages-parity.test.ts` là cửa cứng**: mọi khoá `kudos.*` phải có mặt ở **cả hai** `vi.json` và `en.json`, cùng hình dạng. Thêm bên `vi` mà quên `en` là đỏ ngay.
- **Bốn chuỗi giữ nguyên tiếng Việt kể cả trong bundle `en`** (clarifications § "Chuỗi giữ nguyên tiếng Việt"): `Hiện tại chưa có Kudos nào.`, `Chưa có dữ liệu`, placeholder `Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?`, `Tìm kiếm`. Chúng là hợp đồng của TC, không phải nội dung dịch được. Toast `Link copied — ready to share!` vốn là tiếng Anh trong design → giống nhau cả hai bên.
- **Chrome không lặp lại**: nav/header/footer/account đọc namespace `home`, đúng cách `awards/page.tsx` đang làm. Namespace `kudos` chỉ chứa leaf riêng của board.

## Architecture

```text
messages/{vi,en}.json  --(next-intl getTranslations)-->  build-kudos-copy.ts (phase 13)
                                                              |
src/app/(public)/kudos/_shared/kudos-copy.ts (phase 07)  <-----+  type + default tĩnh
                                                              |
                                                              v  props
                                                        KudosScreen
```

## Related Code Files

**Sửa**: `src/constants/routes.ts` (thêm 1 dòng), `messages/vi.json`, `messages/en.json`
**Tạo**: `public/kudos/` — logo banner + icon không có sẵn trong `src/app/_components/icons/`

## Implementation Steps

1. `src/constants/routes.ts`: thêm `KUDOS: "/kudos",` sau `STANDARDS`. Giữ `as const`.
2. Khảo sát `src/app/_components/icons/` trước khi tải bất cứ icon nào — chevron/kính lúp/tim có thể đã có; tái dùng thay vì nhân bản (DRY).
3. Tải ảnh frame về để đối chiếu: `curl -sL "$(cat plans/260907-1725-kudos-live-board/momorph/frame-image-url.txt)" -o plans/260907-1725-kudos-live-board/momorph/frame-image.png`, rồi mở bằng Read.
4. Xuất/tải asset còn thiếu vào `public/kudos/` (kebab-case). Ghi kích thước thật vào `plans/260907-1725-kudos-live-board/evidence/asset-dimensions.md` để Track A đặt `width`/`height` cho `next/image` mà không phải đoán.
5. Thêm namespace `kudos` vào `messages/vi.json` — nhóm khoá theo vùng design để phase Track A tra nhanh:
   `banner.{title,logoAlt}` · `compose.{placeholder,ariaLabel}` · `highlight.{eyebrow,heading,filterHashtag,filterDepartment,prev,next,counter}` · `spotlight.{eyebrow,heading,totalSuffix,searchPlaceholder,searchSubmit}` · `feed.{eyebrow,heading,empty,detail,copyLink,copiedToast,heartLabel,signInToHeart}` · `sidebar.{received,sent,hearts,boxOpened,boxUnopened,openGift,rankBoard,giftBoard,emptyBoard}`
6. Chép y hệt cấu trúc sang `messages/en.json`; dịch phần dịch được, **giữ nguyên** 4 chuỗi hợp đồng ở § Key Insights.
7. `pnpm test:unit` (parity) → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`.

## Todo List

- [ ] `ROUTES.KUDOS` thêm vào `src/constants/routes.ts`
- [ ] Kiểm kê `_components/icons/` trước, chỉ tải icon còn thiếu
- [ ] Tải `frame-image.png`, đọc bằng Read để lấy giá trị thị giác thật
- [ ] `public/kudos/**` + `evidence/asset-dimensions.md`
- [ ] Namespace `kudos` vào `vi.json` với đúng cấu trúc bước 5
- [ ] Namespace `kudos` vào `en.json`, giữ nguyên 4 chuỗi hợp đồng
- [ ] `pnpm test:unit` xanh (messages parity)
- [ ] lint / format:check / build / typecheck xanh

## Success Criteria

- `messages-parity.test.ts` xanh với namespace `kudos` mới.
- `grep -c "Hiện tại chưa có Kudos nào." messages/en.json` trả `1` — chuỗi hợp đồng KHÔNG bị dịch.
- `ROUTES.KUDOS` typecheck được ở vị trí `href={ROUTES.KUDOS}` (literal type, không widen `string`).
- `pnpm build` xanh; `/kudos` vẫn 404 (chưa có `page.tsx` — đúng như mong đợi ở phase này).

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Dịch nhầm 4 chuỗi hợp đồng sang tiếng Anh | Cao | Cao — C07/C08 không bao giờ GREEN | Success Criteria có `grep -c` làm cửa cứng |
| Cấu trúc khoá `kudos.*` lệch giữa 2 bundle | Trung bình | Trung bình — đỏ ngay ở unit test | Chép nguyên khối rồi mới sửa giá trị, không gõ lại từ đầu |
| Nhân bản icon đã có trong `_components/icons/` | Trung bình | Thấp — nợ DRY | Bước 2 bắt kiểm kê trước khi tải |

## Security Considerations

Không có bề mặt bảo mật mới: chỉ hằng số, chuỗi tĩnh và asset tĩnh. `public/**` phục vụ công khai — không đặt gì ngoài ảnh/icon của design.

## Next Steps

Mở khoá phase 07, 08, 12 (Track A cần copy + asset) và phase 13 (cần `ROUTES.KUDOS`).
