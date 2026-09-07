---
phase: 04
feature: F006
track: B
status: completed
priority: P1
effort: 1h
owner: implementer
file_ownership:
  [
    "src/constants/routes.ts",
    "src/proxy.ts",
    "messages/vi.json",
    "messages/en.json",
    "public/profile/**",
  ]
---

# Phase 04 — Nền: route, proxy, i18n `profile`, assets

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`, 1440×4660, bg `#00101A`)
  - hero keyvisual `I1210:12622;2167:5140` · 6 badge slot `362:5066`-`362:5071` (artwork `I{slotId};3053:10046`) · nút Secret Box `362:5082`
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F006_ProfilePage/technical-spec.md` § 4.1 (route registry + 2 thay đổi `proxy.ts`), § 4.3 (khoá i18n), § 4.4 (assets)
- `spec/system/permissions.md` § "[F006 draft]" — `proxy.ts` là optimistic pre-check, gate thật vẫn là `(protected)/layout.tsx`
- `src/proxy.ts:36` — `isProtectedPage` hiện là `pathname.startsWith(ROUTES.TODO)` đơn lẻ
- `src/proxy.ts:119-122` — comment giải thích vì sao `config.matcher` phải là literal array
- `src/lib/i18n/messages-parity.test.ts` — gate parity vi/en
- `plans/260907-0935-standards-rules-page/phase-02-route-i18n-assets-foundation.md` — khuôn phase nền của F005

## Overview

**Priority**: P1 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Đặt xong mọi thứ `/profile` cần trước khi có UI — hằng route, 2 thay đổi `proxy.ts`, namespace i18n `profile` ở cả 2 locale, và asset thật export từ MoMorph.

## Out of scope

- **Không** tạo `page.tsx` — route vẫn 404 sau phase này, đúng chủ đích (RED của phase 01 phải giữ nguyên màu).
- **Không** sửa `(protected)/layout.tsx` — gate không đổi, `/profile` chỉ gia nhập nhóm đã có.
- **Không** sửa `src/app/_components/**` (phase 02 sở hữu) hay `ci.yml`.
- **Không** thêm biến môi trường mới.

## Key Insights

- **`config.matcher` phải giữ literal array.** Next static-analyze `matcher` tại build time và **không** eval được hằng import — comment `proxy.ts:119-122` đã ghi. Thêm `"/profile"` dưới dạng chuỗi, đừng "dọn dẹp" thành `ROUTES.PROFILE`.
- **`isProtectedPage` widen chứ không thêm nhánh `if` thứ 2.** Hiện là `pathname.startsWith(ROUTES.TODO)`. Đổi thành so khớp theo danh sách `[ROUTES.TODO, ROUTES.PROFILE].some(p => pathname.startsWith(p))` — một biểu thức, mọi route protected tương lai chỉ thêm 1 phần tử. DRY, và không sinh ra 2 đường redirect khác nhau.
- **`proxy.ts` KHÔNG phải gate.** Nó là optimistic pre-check; `(protected)/layout.tsx` mới là điểm thực thi. Đừng viết thêm logic đọc `?id=` hay kiểm quyền ở đây — chỗ đó không có thẩm quyền.
- **Parity vi/en là gate cứng, không phải lời khuyên.** `messages-parity.test.ts` so cả tập khoá **hai chiều** và cả **số lượng khoá**. Mọi khoá `profile.*` phải có ở cả 2 file, kể cả khi bản EN chỉ là bản dịch thô.
- **5 nhãn statistics là verbatim ĐÃ XÁC NHẬN, giữ nguyên dấu `:` cuối.** `Số Kudos bạn nhận được:` (`362:5076`), `Số Kudos bạn đã gửi:` (`362:5077`), `Số tim bạn nhận được:` (`362:5078`), `Số Secret Box bạn đã mở:` (`362:5080`), `Số Secret Box chưa mở:` (`362:5081`). Copy-paste, đừng gõ tay.
- **2 khoá copy CHƯA xác nhận với design**: `profile.kudos.emptyReceived` / `emptySent`, và `profile.hero.fallbackName`. `get_frame`/`download_specs` không mang chúng. Xác nhận lại bằng MCP trước khi khoá tên key; **không xác nhận được thì chốt đề xuất và ghi 1 dòng vào `plans/action-items.md` § Decisions**, đừng dừng cả plan vì 2 chuỗi.
- **`fallbackName` là load-bearing cho test, không phải chuỗi phụ.** User fixture của phase 01 vẫn có thể rơi vào `full_name` NULL nếu email đã tồn tại từ trước → hero rơi về fallback → C2 đỏ vì chuỗi sai. Chốt giá trị sớm và nói cho phase 01 biết.
- **Asset lấy bằng node id, không đoán tên file.** Chạy `get_frame_image`/`get_design_item_image` theo từng id ở § 4.4; đo kích thước nội tại bằng `sips -g pixelWidth -g pixelHeight` và ghi lại — `/awards` từng dính cảnh báo `next/image` "width or height modified" vì gõ tay cặp w/h.
- **Bài học caption của F005**: MoMorph có thể rasterize chữ vào ảnh. 6 badge slot của màn này phải là **artwork thuần**; nếu ảnh export có chữ nướng sẵn thì crop bỏ, vì tiêu đề bộ sưu tập là DOM text (C4/C5).
- **Cân nhắc tái dùng icon sẵn có** cho "Viết Kudo" (`IconPencil` đã ở `src/app/_components/icons/` sau phase 02) thay vì thêm asset thứ n — chỉ export asset riêng nếu `get_frame_image` cho thấy design dùng artwork khác hẳn.

## Requirements

- `ROUTES.PROFILE = "/profile"` trong `src/constants/routes.ts`, `as const` giữ nguyên.
- `src/proxy.ts`: `config.matcher` có thêm literal `"/profile"`; `isProtectedPage` so khớp theo danh sách `[ROUTES.TODO, ROUTES.PROFILE]`.
- `messages/{vi,en}.json` có namespace `profile` với shape đúng `ProfileCopy` (§ 4.3 technical-spec), khoá giống hệt nhau ở 2 file.
- `public/profile/**` chứa asset thật + bảng kích thước nội tại ghi lại (trong `evidence/` hoặc comment của phase 05).
- `/profile` **vẫn 404** sau phase này.

## Architecture

```text
src/constants/routes.ts
  ROUTES = { HOME, LOGIN, TODO, AUTH_CALLBACK, AWARDS, STANDARDS, PROFILE: "/profile" }

src/proxy.ts   (2 thay đổi, không hơn)
  isProtectedPage = [ROUTES.TODO, ROUTES.PROFILE].some(p => pathname.startsWith(p))
  config.matcher = ["/", "/login", "/todo/:path*", "/awards", "/standards", "/profile"]

messages/{vi,en}.json → "profile": {
  hero:   { fallbackName }                                    ← CHƯA xác nhận
  badges: { headingSelf, headingOther }                       ← XÁC NHẬN (GUI_003)
  stats:  { rows: { received, sent, hearts, secretBoxOpened, secretBoxLeft },
            openSecretBox, writeKudos }                       ← 5 nhãn XÁC NHẬN
  kudos:  { receivedLabel, sentLabel, emptyReceived, emptySent }  ← 2 empty CHƯA xác nhận
}

public/profile/
  hero-keyvisual.<ext>        ← I1210:12622;2167:5140
  badge-slot-1..6.<ext>       ← I{362:5066..5071};3053:10046, artwork thuần, không chữ nướng
```

## Related Code Files

**Create**: `public/profile/**` (hero keyvisual + 6 badge artwork)
**Modify**: `src/constants/routes.ts`, `src/proxy.ts`, `messages/vi.json`, `messages/en.json`
**Delete**: —
**Chỉ đọc**: `tests/e2e/profile.spec.ts` (nguồn chuỗi verbatim phải khớp), `spec/F006_ProfilePage/technical-spec.md` § 4.3/§ 4.4

## Implementation Steps

1. `routes.ts`: thêm `PROFILE: "/profile"`.
2. `proxy.ts`: widen `isProtectedPage`; thêm `"/profile"` vào literal matcher. Cập nhật comment khối `config.matcher` — nó đang khẳng định "`isProtectedPage` … only ever tests `ROUTES.TODO`", câu đó sẽ thành sai.
3. Chốt shape khoá `profile.*`; đối chiếu **từng chuỗi verbatim** với `tests/e2e/profile.spec.ts` (C5, C6, C9). Lệch 1 ký tự = phase 08 đỏ.
4. Xác nhận lại 3 chuỗi chưa chốt (`hero.fallbackName`, `kudos.emptyReceived`, `kudos.emptySent`) qua `get_frame`/`download_specs`. Không có dữ liệu → chốt đề xuất + ghi 1 dòng `plans/action-items.md` § Decisions + báo lại giá trị `fallbackName` cho phase 01.
5. Thêm namespace vào **cả** `vi.json` và `en.json`; chạy `pnpm test:unit` xác nhận `messages-parity.test.ts` xanh.
6. Export asset theo node id ở § 4.4. Kiểm từng ảnh: **không có chữ nướng sẵn**; có thì crop về khung artwork.
7. Đo kích thước nội tại (`sips -g pixelWidth -g pixelHeight public/profile/*`) và ghi bảng vào `evidence/asset-dimensions.md` — phase 05 đọc bảng này, không đo lại, không gõ tay.
8. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`.
9. Xác nhận `/profile` vẫn 404: `pnpm test:e2e tests/e2e/profile.spec.ts --grep-invert @auth` vẫn đỏ ở C17? **Không** — C17 (anonymous → `/login`) sẽ **chuyển sang XANH** ngay sau phase này, vì `proxy.ts` đã redirect. Ghi nhận đó là tiến bộ hợp lệ, không phải test hỏng.

## Todo List

- [ ] `ROUTES.PROFILE`
- [ ] `proxy.ts` — widen `isProtectedPage` theo danh sách
- [ ] `proxy.ts` — `"/profile"` vào literal matcher + sửa comment đã lỗi thời
- [ ] Chốt shape `profile.*`, đối chiếu verbatim với `profile.spec.ts`
- [ ] Xác nhận 3 chuỗi còn hở; không có thì chốt + ghi `action-items.md`
- [ ] Báo `fallbackName` đã chốt cho phase 01/08
- [ ] Khoá vào **cả** `vi.json` và `en.json`, parity test xanh
- [ ] Export asset theo node id, kiểm không có chữ nướng sẵn
- [ ] `evidence/asset-dimensions.md` — bảng w/h đo bằng `sips`
- [ ] Gate: lint · format · build · typecheck
- [ ] Xác nhận C17 chuyển xanh, phần `@auth` vẫn đỏ

## Success Criteria

- `pnpm test:unit` xanh, đặc biệt `messages-parity.test.ts` (cả 2 assertion: tập khoá + số lượng).
- `pnpm build` + `pnpm typecheck` + `pnpm lint --max-warnings 0` + `pnpm format:check` xanh.
- e2e: C17 **xanh**; toàn bộ describe `@auth` **vẫn đỏ** (chưa có UI) — RED của phase 01 chưa bị làm giả.
- `grep -c "ROUTES.PROFILE" src/proxy.ts` ≥ 1 **và** `grep '"/profile"' src/proxy.ts` khớp trong `config.matcher` (chứng minh không thay literal bằng hằng).
- `evidence/asset-dimensions.md` liệt kê đủ 7 asset kèm w/h thật.
- 4 spec e2e cũ (`home`, `awards`, `standards`, `login`) không đổi kết quả.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Thay literal `"/profile"` bằng `ROUTES.PROFILE` trong `config.matcher` | **Cao** (trông như dọn dẹp đúng) | Cao — matcher chết câm, proxy không chạy cho `/profile` | Comment `proxy.ts:119-122` + success criteria grep 2 dạng |
| Thêm khoá vào `vi.json` mà quên `en.json` | **Cao** | Trung bình — CI đỏ ở parity test | Bước 5 chạy `pnpm test:unit` ngay tại phase |
| Chuỗi verbatim lệch 1 ký tự so với spec e2e (dấu `:` cuối, dấu cách) | **Cao** | Cao — phase 08 đỏ, tưởng lỗi UI | Copy-paste từ `profile.spec.ts`, không gõ tay; bước 3 đối chiếu từng chuỗi |
| Gõ tay w/h ảnh → cảnh báo `next/image` "width or height modified" | Trung bình | Thấp–Trung bình | `evidence/asset-dimensions.md` là nguồn duy nhất cho phase 05 |
| Asset badge có caption nướng sẵn (bài học F005) | Trung bình | Trung bình — chữ in 2 lần | Bước 6 kiểm từng ảnh, crop nếu có |
| Viết thêm logic `?id=` vào `proxy.ts` | Thấp | Cao — 2 nơi phân giải, lệch nhau | Out of scope ghi rõ: proxy là pre-check, không có thẩm quyền |
| `fallbackName` chốt muộn → phase 01 assert nhầm chuỗi | Trung bình | Trung bình | Bước 4 báo ngược lại phase 01/08 |
| Comment `config.matcher` để nguyên → tài liệu nói dối về `isProtectedPage` | **Cao** | Thấp–Trung bình | Bước 2 sửa comment là một phần của thay đổi |

## Security Considerations

- `proxy.ts` giữ đúng vai trò optimistic: `(protected)/layout.tsx` vẫn là gate authoritative duy nhất — không thêm quyết định phân quyền nào ở tầng proxy.
- Không thêm route nào vào matcher ngoài `/profile`; matcher vẫn là whitelist, không phải negative-lookahead.
- Asset trong `public/profile/**` là ảnh tĩnh của design, không chứa dữ liệu người dùng.
- Không secret, không biến môi trường mới.

## Next Steps

Mở khoá phase 05 (Track A cần asset + shape khoá i18n) và phase 06 (cần `ROUTES.PROFILE`). Chạy song song được với phase 02 và 03.
