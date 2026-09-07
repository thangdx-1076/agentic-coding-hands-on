---
phase: 02
feature: F005
track: B
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/constants/routes.ts",
    "src/proxy.ts",
    "messages/vi.json",
    "messages/en.json",
    "public/standards/**",
    "src/app/(public)/_components/site-footer.tsx",
    "src/app/(public)/_components/icons/icon-pencil.tsx",
    "src/app/(public)/_components/icons/icon-pencil.stories.tsx",
    "src/app/(public)/(home)/_components/icons/icon-pencil.tsx",
    "src/app/(public)/(home)/_components/icons/icon-pencil.stories.tsx",
    "src/app/(public)/(home)/_components/widget-button.tsx",
  ]
---

# Phase 02 — Nền: route, footer, proxy, i18n, assets, icon pen

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (frame `3204:6051`)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `clarifications.md` § Assets (bảng 12 file + nguồn từng file), § Nội dung panel, § Copy EN
- `spec/F005_StandardsRulesPage/technical-spec.md` § 4.3 (i18n keys), § 4.4 (assets)
- `data/preview.png` — nội dung vi verbatim
- `src/constants/routes.ts`, `src/proxy.ts:120` (comment giải thích vì sao matcher là literal array)
- `src/lib/i18n/messages-parity.test.ts` — gate: khoá phải khớp 1-1 giữa 2 locale
- Kết quả phase 01: `tests/e2e/standards.spec.ts` (đọc để biết chuỗi nào bị assert)

## Overview

**Priority**: P2 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Dựng toàn bộ phần "nền" mà UI sẽ tiêu thụ — hằng route, link footer, proxy matcher, namespace i18n `standards` (vi + en), 11 asset trong `public/standards/`, và icon pen dùng chung.

## Out of scope

- Không viết component nào (phase 04), không viết `page.tsx` (phase 05), không viết hook (phase 03).
- Không sửa test nào — `tests/e2e/**` do `tester` sở hữu.
- Không đổi DOM/class của `site-footer.tsx`: chỉ đổi **1 literal** `href="/standards"` → `href={ROUTES.STANDARDS}`.

## Key Insights

- **Đổi footer là refactor DOM-neutral.** `site-footer.tsx:74` đang hardcode `href="/standards"`. Sau đổi, HTML render ra **y hệt** → `home.spec.ts`/`awards.spec.ts` không được đỏ. Nếu đỏ, nguyên nhân nằm chỗ khác, đừng sửa test.
- **`proxy.ts` matcher phải là literal array**, không được viết `ROUTES.STANDARDS` vào đó — Next phân tích tĩnh `config.matcher` lúc build và không đánh giá được hằng import (`src/proxy.ts:120-128` đã ghi rõ). Thêm `"/standards"` cùng lý do đã thêm `"/awards"`: chuẩn hoá cookie locale + refresh session cho một trang công khai. **Không** thêm vào `isProtectedPage`.
- **Icon pen — deviation có lý do, đọc kỹ trước khi làm khác.** `public/home/Pen.svg` là `fill="white"`; nút "Viết KUDOS" nền vàng primary → trắng trên vàng là vô hình. `(home)/_components/icons/icon-pencil.tsx` đã là **đúng path đó** với `fill="currentColor"` và đang chạy trên nền vàng của `widget-button`. Theo scope ladder (`nextjs-route-colocation-architecture` rule 2), có consumer thứ hai ở segment anh em → **leo lên `(public)/_components/icons/`**. Import ngang từ `standards/` sang `(home)/` là lỗi review, và chép lại path là nhân bản. Không thêm `public/standards/pen.svg`.
- **Promote = di chuyển, không viết lại.** `git mv` cả `icon-pencil.tsx` và `icon-pencil.stories.tsx`, sửa đúng 1 dòng import trong `widget-button.tsx`, sửa import path trong story. Cập nhật comment mm-ref trong file: bổ sung `I3204:6094;186:1763` (cùng component `186:1763`, khác instance).
- **11 asset, KHÔNG có pen.** Thư mục `plans/260907-0935-standards-rules-page/assets/` chứa đúng 11 file (10 PNG + `close.svg`). `close.svg` là `fill="white"` → đúng màu cho nút outlined trên nền tối, copy nguyên trạng và render bằng `next/image` ở phase 04.
- **Kích thước nội tại phải chính xác** (tránh cảnh báo "width or height modified" của Next, đúng cái bẫy `/awards` đã dính): `new-hero` 126×22 · `rising-hero` 110×20 · `super-hero` 109×19 · `legend-hero` 110×20 · `badge-revival` 80×88 · `badge-stay-gold` 80×88 · `badge-touch-of-light` 80×104 · `badge-flow-to-horizon` 80×104 · `badge-beyond-the-boundary` 80×104 · `badge-root-further` 80×104 · `close.svg` 24×24. Xác nhận lại bằng `sips -g pixelWidth -g pixelHeight` sau khi copy, đừng tin bảng.
- **Ký tự phải giữ nguyên trong JSON**: en-dash `–` trong `10–20` và trong 2 câu mô tả (`bắt đầu – những`, `huyền thoại – người`); emoji `❤️` ở `secretBoxSection.intro` và `nationKudosSection.body`. 6 caption badge giữ uppercase, **không dịch**, giống hệt ở cả 2 locale — đây là tên riêng của icon.
- **Nội dung là `character`, không phải `itemName`.** Tên layer của TEXT node không nhất thiết bằng nội dung. Ba chỗ lệch trên màn này: `I3204:6088;737:20392` tên layer `ROOT FUTHER` (thiếu R) nhưng `character` = **`ROOT FURTHER`** → dùng `ROOT FURTHER`; `I3204:6093;186:2760` → `Đóng`; `I3204:6094;186:1568` → `Viết KUDOS` (hai cái sau mang tên component mặc định "Awards Information Navigation Links"). Mọi string còn lại name == character. Khi kéo thêm chuỗi từ MoMorph ở bước 6, **luôn đọc `character`**, đừng lấy tên node.
- **Trim `\n` cuối.** `3204:6078` (secretBox intro) và `3204:6091` (nation body) có `character` dư một `\n` ở cuối — cắt trước khi ghi vào JSON, nếu không assert `toContainText` vẫn qua nhưng chuỗi trong repo bẩn.
- **EN lấy từ MoMorph, không tự dịch.** `list_file_localizations` (target_lang `en`). Đã xác nhận sẵn: `Thể lệ`→`Rules`, `Viết KUDOS`→`Write KUDOS`, `KUDOS QUỐC DÂN`→`NATION KUDOS`, section 1 heading→`KUDOS Receiver: Hero badge for positive influence`, `Có 1-4 người gửi Kudos cho bạn`→`1-4 people send you Kudos`. Chuỗi nào MoMorph **không** có entry → dùng bản máy dịch của MoMorph và ghi 1 dòng vào `plans/action-items.md` § "Tôi cần làm" cho người review (`is_reviewed: false`). Ngoại lệ duy nhất được suy luận: `Đóng` → `Close` (nhãn UI chuẩn, D003).
- **6 caption badge KHÔNG dịch** — giữ nguyên uppercase ở cả `vi.json` và `en.json`.

## Requirements

- `ROUTES.STANDARDS = "/standards"` (`as const` giữ nguyên, để `href={ROUTES.STANDARDS}` thoả typed routes).
- `site-footer.tsx:74` dùng hằng đó; giữ nguyên comment `{/* mm:I5001:14800;1161:9487 */}` và toàn bộ className.
- `config.matcher` = `["/", "/login", "/todo/:path*", "/awards", "/standards"]`.
- Namespace `standards` tồn tại trong **cả** `messages/vi.json` và `messages/en.json`, khoá khớp 1-1.
- `public/standards/` chứa đúng 11 file, tên giữ nguyên như trong `assets/`.
- `(public)/_components/icons/icon-pencil.tsx` + story tồn tại; bản ở `(home)/` bị xoá; `widget-button.tsx` import đường dẫn mới.

### Shape khoá i18n (chốt — phase 05 `buildCopy` đọc đúng những khoá này)

```text
standards.title
standards.heroSection.heading | .intro
standards.heroSection.tiers.{newHero,risingHero,superHero,legendHero}.{alt,condition,description}
standards.secretBoxSection.heading | .intro | .closing
standards.secretBoxSection.badges.{revival,touchOfLight,stayGold,flowToHorizon,beyondTheBoundary,rootFurther}.caption
standards.nationKudosSection.heading | .body
standards.footer.close | .writeKudos
```

### Nội dung vi verbatim (nguồn: node tree `3204:6051` + `data/preview.png`)

| Khoá | Giá trị |
|---|---|
| `title` | `Thể lệ` |
| `heroSection.heading` | `NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC` |
| `heroSection.intro` | `Dựa trên số lượng đồng đội gửi trao Kudos, bạn sẽ sở hữu Huy hiệu Hero tương ứng, được hiển thị trực tiếp cạnh tên profile` |
| `tiers.newHero` | alt `New Hero` · cond `Có 1-4 người gửi Kudos cho bạn` · desc `Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn.` |
| `tiers.risingHero` | alt `Rising Hero` · cond `Có 5-9 người gửi Kudos cho bạn` · desc `Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình.` |
| `tiers.superHero` | alt `Super Hero` · cond `Có 10–20 người gửi Kudos cho bạn` · desc `Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến.` |
| `tiers.legendHero` | alt `Legend Hero` · cond `Có hơn 20 người gửi Kudos cho bạn` · desc `Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình.` |
| `secretBoxSection.heading` | `NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN` |
| `secretBoxSection.intro` | `Mỗi lời Kudos bạn gửi sẽ được đăng tải trên hệ thống và nhận về những lượt ❤️ từ cộng đồng Sunner. Cứ mỗi 5 lượt ❤️, bạn sẽ được mở 1 Secret Box, với cơ hội nhận về một trong 6 icon độc quyền của SAA.` |
| `badges.*.caption` | `REVIVAL` · `TOUCH OF LIGHT` · `STAY GOLD` · `FLOW TO HORIZON` · `BEYOND THE BOUNDARY` · `ROOT FURTHER` *(character, không phải tên layer)* |
| `secretBoxSection.closing` | `Những Sunner thu thập trọn bộ 6 icon sẽ nhận về một phần quà bí ẩn từ SAA 2025.` |
| `nationKudosSection.heading` | `KUDOS QUỐC DÂN` |
| `nationKudosSection.body` | `5 Kudos nhận về nhiều ❤️ nhất toàn Sun* sẽ chính thức trở thành Kudos Quốc Dân và được trao phần quà đặc biệt từ SAA 2025: Root Further.` |
| `footer.close` / `footer.writeKudos` | `Đóng` / `Viết KUDOS` |

**Đối chiếu bắt buộc**: mọi chuỗi bị `tests/e2e/standards.spec.ts` assert phải khớp **từng ký tự**. Sau khi ghi JSON, chạy `grep -c "ROOT FURTHER" messages/vi.json messages/en.json` (phải là 1 mỗi file), `grep "ROOT FUTHER" messages/` (phải **rỗng** — đó là tên layer, không phải nội dung) và `grep "10–20" messages/vi.json` (en-dash, không phải hyphen).

## Architecture

```text
src/constants/routes.ts        + STANDARDS: "/standards"
src/proxy.ts                   matcher += "/standards"   (literal, KHÔNG dùng ROUTES.*)
(public)/_components/site-footer.tsx:74   href="/standards" → href={ROUTES.STANDARDS}

(public)/_components/icons/icon-pencil.tsx      ← git mv từ (home)/_components/icons/
       ↑ widget-button.tsx (consumer cũ)   ↑ standards-footer-actions.tsx (consumer mới, phase 04)

messages/vi.json  + "standards": { … }     ┐ khoá khớp 1-1
messages/en.json  + "standards": { … }     ┘ (messages-parity.test.ts)

plans/…/assets/*  ──cp──▶  public/standards/*   (11 file, tên giữ nguyên)
```

## Related Code Files

**Create**: `public/standards/` (11 file), `src/app/(public)/_components/icons/icon-pencil.tsx`, `…/icon-pencil.stories.tsx` *(qua `git mv`)*
**Modify**: `src/constants/routes.ts`, `src/proxy.ts`, `src/app/(public)/_components/site-footer.tsx`, `src/app/(public)/(home)/_components/widget-button.tsx`, `messages/vi.json`, `messages/en.json`
**Delete**: `src/app/(public)/(home)/_components/icons/icon-pencil.tsx`, `…/icon-pencil.stories.tsx` *(đích của `git mv`)*

## Implementation Steps

1. `src/constants/routes.ts`: thêm `STANDARDS: "/standards"` ngay sau `AWARDS`.
2. `site-footer.tsx`: import `ROUTES` (kiểm tra đã import chưa), đổi đúng 1 literal ở dòng 74. Không chạm className/comment.
3. `src/proxy.ts`: thêm `"/standards"` vào `config.matcher`; bổ sung 1 câu vào comment ngay trên `config` nói `/standards` vào đây cùng lý do `/awards`.
4. `mkdir -p public/standards && cp plans/260907-0935-standards-rules-page/assets/* public/standards/`; xác nhận `ls public/standards | wc -l` = 11; đo lại kích thước 10 PNG bằng `sips`, đối chiếu bảng ở Key Insights, sửa bảng nếu lệch (bảng phục vụ phase 04).
5. `git mv "src/app/(public)/(home)/_components/icons/icon-pencil.tsx" "src/app/(public)/_components/icons/icon-pencil.tsx"` và tương tự cho `.stories.tsx`; sửa import trong story (`./icon-pencil` giữ nguyên) và trong `widget-button.tsx` (`./icons/icon-pencil` → `../../_components/icons/icon-pencil`); bổ sung mm-ref `I3204:6094;186:1763` vào comment của component.
6. Kéo bản EN từ MoMorph `list_file_localizations` (target_lang `en`) cho từng chuỗi; chuỗi nào không có entry → ghi vào `plans/action-items.md`.
7. Ghi `standards` vào `messages/vi.json` rồi `messages/en.json` theo đúng shape khoá ở trên. Copy-paste chuỗi vi từ bảng, không gõ tay.
8. `pnpm test:unit:coverage` — `messages-parity.test.ts` phải xanh (khoá khớp 1-1, coverage không đổi vì phase này không thêm `.ts` nào vào allowlist).
9. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.
10. `lsof -ti:3000 | xargs -r kill -9` rồi `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/awards.spec.ts` — regression: đổi footer + promote icon không được làm đỏ gì. (`awards.spec.ts` nhóm `@local-db` cần Supabase; nếu không bật, chạy `--grep-invert "@auth|@local-db"`.)

## Todo List

- [ ] `ROUTES.STANDARDS`
- [ ] `site-footer.tsx:74` dùng hằng, DOM không đổi
- [ ] `proxy.ts` matcher + comment
- [ ] 11 asset trong `public/standards/`, kích thước đã đo lại
- [ ] `git mv` `IconPencil` lên `(public)/_components/icons/` + sửa import `widget-button.tsx`
- [ ] EN kéo từ MoMorph, chuỗi thiếu → `action-items.md`
- [ ] `standards` vào `vi.json` + `en.json`, khoá khớp 1-1
- [ ] `grep` xác nhận `ROOT FURTHER` (và `ROOT FUTHER` rỗng), `10–20` (en-dash), `❤️` ×2, không `\n` thừa cuối chuỗi
- [ ] Gate: lint · format · unit+coverage · build · typecheck · storybook
- [ ] Regression e2e `home` + `awards` vẫn xanh

## Success Criteria

- `grep -n "STANDARDS" src/constants/routes.ts src/app/\(public\)/_components/site-footer.tsx` cho ra cả 2 chỗ; không còn literal `"/standards"` trong `src/**` ngoài `proxy.ts`.
- `ls public/standards | wc -l` = 11; không có `pen.svg`.
- `node -e 'const v=require("./messages/vi.json"),e=require("./messages/en.json");console.log(Object.keys(v.standards).length===Object.keys(e.standards).length)'` → `true`; `messages-parity.test.ts` xanh.
- `rg "ROOT FUTHER" messages/` không ra kết quả nào (`FUTHER` là tên layer, nội dung thật là `ROOT FURTHER`).
- `(home)/_components/icons/icon-pencil.tsx` không còn tồn tại; `pnpm build-storybook` vẫn xanh (story đi theo).
- Toàn bộ gate ở bước 9 xanh; `home.spec.ts` + nhóm CI-safe của `awards.spec.ts` vẫn xanh.
- Không file nào ngoài `file_ownership` bị chạm.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Gõ hyphen `-` thay en-dash `–` trong `10–20` | **Cao** | Cao — C4 đỏ, nhìn bằng mắt không ra | Copy-paste từ bảng; `grep "10–20"` ở bước 7 |
| Chép `ROOT FUTHER` từ tên layer thay vì `character` | **Cao** | Cao — C5 đỏ | `rg "ROOT FUTHER" messages/` phải rỗng; luôn đọc `character` |
| Để nguyên `\n` cuối 2 đoạn `3204:6078` / `3204:6091` | Trung bình | Thấp | Trim khi ghi JSON; kiểm chuỗi không kết thúc bằng `\n` |
| Emoji ❤️ bị escape thành `❤` khi ghi JSON | Trung bình | Trung bình — assert `❤️` trượt | Ghi UTF-8 trực tiếp; `grep "❤️" messages/vi.json` phải ra 2 dòng |
| Viết `ROUTES.STANDARDS` vào `config.matcher` | Trung bình | Cao — build fail hoặc proxy im lặng không chạy | Comment sẵn trong `proxy.ts:120`; giữ literal |
| Promote `IconPencil` làm đỏ `build-storybook` (story trỏ path cũ) | Trung bình | Thấp | `git mv` cả cặp file; bước 9 chạy `build-storybook` |
| Thêm `public/standards/pen.svg` cho "đủ 12 file" | Trung bình | Thấp — asset chết, nhân bản | Bảng asset chốt 11 file; Success Criteria kiểm `wc -l` |
| Kích thước PNG trong bảng lệch thật | Trung bình | Thấp — cảnh báo `next/image` ở phase 04 | Bước 4 đo lại bằng `sips`, sửa bảng thay vì để phase 04 đoán |
| EN thiếu chuỗi → khoá lệch → parity đỏ | Trung bình | Trung bình | Ghi đủ khoá cho cả 2 locale ngay trong 1 lượt; chuỗi chưa duyệt vẫn ghi + báo action-items |

## Security Considerations

- Không secret, không biến môi trường mới (functional-spec § 13).
- `proxy.ts` chỉ thêm 1 path công khai vào matcher — **không** thêm vào `isProtectedPage`, không đổi nhánh redirect nào; guard `/todo` giữ nguyên.
- Asset copy từ thư mục plan là ảnh tĩnh của design, không chứa dữ liệu người dùng.
- Nội dung i18n render bằng text node thường ở phase 04 — không `dangerouslySetInnerHTML` dù chuỗi do ta tự ghi.

## Next Steps

Mở khoá phase 04 (Track A cần asset + icon pen). Phase 03 chạy song song, không phụ thuộc phase này. Phase 05 sẽ đọc đúng shape khoá i18n chốt ở đây.
