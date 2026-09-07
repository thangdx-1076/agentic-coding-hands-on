---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
fcode: F005
---

# F005_StandardsRulesPage

**Priority**: P2
**Type**: ui
**Generated**: 2026-09-07

**See also:** [`functional-spec.md`](./functional-spec.md) — tổng quan, Open Decisions, FR/BR
one-liner, screens, user stories, scenarios, edge cases cho độc giả BA/QA.

**How to read this file:** § 2 bảng chỉ mục. § 3 chi tiết action. § 4 content contract/DOM/asset.
§ 5 verification + nguồn.

## 1. Technical Overview

Trang công khai mới `/standards` (`src/app/(public)/standards/page.tsx`) — 1 Server Component
đọc nội dung Thể lệ tĩnh từ i18n namespace `standards` (`messages/{vi,en}.json`), cộng 1 client
boundary (`StandardsClient`) chỉ để gắn hook `useStandardsClose` (`handleClose`: `router.back()` +
fallback qua Navigation API `window.navigation.canGoBack`). **Không** đọc
Supabase, không DAL, không migration — khác hẳn F004_AwardSystemPage. **Không** dùng lại
`SiteHeader`/`SiteFooter`: design (`get_frame` `3204:6051`, 1440×1796) chỉ vẽ 1 panel phải màn
hình trên nền `#00101A`, không có header/nav/footer chrome nào trong node tree hay trong
`specs.csv` (chỉ 2 item: `A_Nội dung thể lệ`, `B_Button` footer) — xác nhận thêm bởi
`data/preview.png` (không có logo/nav ở đỉnh khung). Chỉ 1 capability (`CAP-01`), 3 action,
không action nào ghi DB.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A1** | `StandardsPage` (Server Component) → `StandardsClient` → `StandardsScreen` | `GET` `/standards` | FR-001, FR-002, FR-003, FR-101, FR-102, FR-103, FR-104, FR-301, FR-302, BR-001, BR-002, US001 | — *(read-only)* | § 3.1 |
| **A2** | Nút "Đóng" (`handleClose`, client-only, no BE) | — *(click, không HTTP)* | FR-201, FR-202, FR-203, BR-003, BR-005, US002 | — *(read-only)* | § 3.2 |
| **A3** | Nút "Viết KUDOS" (`<Link href="/kudos">`, no JS) | — *(click, điều hướng thuần)* | FR-201, FR-202, FR-204, BR-004, BR-005, US003 | — *(read-only)* | § 3.3 |

## 3. Actions

### 3.1 CAP-01 — Render trang `/standards` (đọc nội dung Thể lệ tĩnh)

`GET` `/standards` → `` `StandardsPage` ``
`FR-001` `FR-002` `FR-003` `FR-101` `FR-102` `FR-103` `FR-104` `FR-301` `FR-302` · `SCR005_Standards`
· `US001`

**Who** · Bất kỳ khách truy cập nào — Anonymous hoặc Authenticated, không qua guard nào (giống
`/`, `/awards`; khác `/todo`).
**FE** · `src/app/(public)/standards/page.tsx` đọc locale (`getLocale()` + `normalizeLocale`,
cùng hàm dùng ở F004) và dựng `copy` (hàm `buildCopy` cục bộ, đọc `getTranslations("standards")`)
— KHÔNG cần đọc `viewer`/session vì trang không cá nhân hoá theo trạng thái đăng nhập và không có
header nào cần render bell/account. Giao `copy` cho `StandardsClient` (client boundary — chỉ vì
`handleClose` cần `useRouter()`, một hook client-only). `StandardsClient` render `StandardsScreen`
(presentational, `_components/standards-screen.tsx`): tiêu đề "Thể lệ", `<section>` × 3
(`HeroBadgeSection`, `SecretBoxSection`, `NationKudosSection`), footer 2 nút.
**Request** · không tham số — chỉ `NEXT_LOCALE` cookie (qua `getLocale()`, giống F003/F004)
**BE** · không có — nội dung 100% tĩnh, không DAL/Supabase nào được gọi từ action này (FR-002).
**Rule**
- **BR-001 — Không guard đăng nhập nào áp dụng cho `/standards`.**
- **BR-002 — Nội dung không đọc bảng nào, không cá nhân hoá theo actor/role; chỉ locale quyết
  định bản dịch.**
**Result** · read-only. Props xuống `StandardsScreen`: `copy: StandardsCopy`, `locale`.
**Source:** `src/app/(public)/standards/page.tsx` → `_components/standards-client.tsx` →
`_components/standards-screen.tsx`

---

### 3.2 A2 — Nút "Đóng"

— *(client, không HTTP)* → `` handleClose ``
`FR-201` `FR-202` `FR-203` · `SCR005_Standards` · `US002`

**Who** · Bất kỳ khách truy cập nào đang xem `/standards`
**FE** · `<button>` thật (không phải `<a>`, vì cần chạy JS trước khi điều hướng), style
secondary/outlined + icon `close.svg` (copy từ `assets/close.svg` sang `public/standards/`).
Handler tách vào hook riêng `useStandardsClose` (`_hooks/use-standards-close.ts`), gọi từ
`StandardsClient` — không phải inline trong `StandardsClient` như bản draft ban đầu ước tính.

*(Cập nhật 2026-09-07, sau khi đối chiếu code đã ship — thay cho cơ chế `window.history.length`
mà spec draft ban đầu đề xuất.)* `window.history.length` bị LOẠI bỏ khi implement: đo thực tế
(Chromium/Playwright) cho kết quả **mâu thuẫn** — direct `page.goto("/standards")` cho
`history.length === 2` (artifact `about:blank` của Playwright), còn điều hướng in-app từ `/` qua
`<Link>` cho `history.length === 3` — không có ngưỡng cố định nào tách được 2 trường hợp.
`document.referrer` cũng bị loại vì luôn `""` ở cả 2 kịch bản (Next `<Link>` là SPA transition,
không phải cross-document navigation). Cơ chế THẬT dùng `window.navigation.canGoBack` (Navigation
API, Chromium-only — Firefox/Safari không implement, `?.` fallback về nhánh an toàn):

```ts
// src/app/(public)/standards/_hooks/use-standards-close.ts
export function useStandardsClose(): StandardsClose {
  const router = useRouter();

  const handleClose = useCallback(() => {
    const { navigation } = window as NavigationApiWindow;
    if (navigation?.canGoBack) {
      router.back();
      return;
    }
    router.push(ROUTES.HOME);
  }, [router]);

  return { handleClose };
}
```

**Request** · không có
**BE** · không có
**Rule**
- **BR-003 — Luôn ưu tiên `router.back()`; chỉ fallback `ROUTES.HOME` khi không có lịch sử.** Điều
  kiện thật: `window.navigation?.canGoBack === true` → `back()`; `false`/`undefined` (API vắng mặt
  ở Firefox/Safari) → `push(ROUTES.HOME)` — không bao giờ đoán `back()` khi không chắc.
- **BR-005 — Không có điều kiện `disabled` nào cho nút này (TC GUI_003/FUN_005 out-of-scope).**
**Result** · read-only, không ghi DB. Điều hướng nội-app (`router.back()`) hoặc tới `/` (`push`).
**Source:** `src/app/(public)/standards/_hooks/use-standards-close.ts` (`useStandardsClose`), gọi
từ `src/app/(public)/standards/_components/standards-client.tsx`

### 3.3 A3 — Nút "Viết KUDOS"

— *(điều hướng thuần, không JS)* → `` <Link href="/kudos"> ``
`FR-201` `FR-202` `FR-204` · `SCR005_Standards` · `US003`

**Who** · Bất kỳ khách truy cập nào đang xem `/standards`
**FE** · `next/link` với `href="/kudos"`, style primary vàng + icon bút. **Khác với đề xuất ban
đầu** (dự kiến import thẳng `public/home/Pen.svg`): `public/home/Pen.svg` là `fill="white"`, vô
hình trên nền nút vàng, nên implement dùng lại component `IconPencil` (`fill="currentColor"`,
`(public)/_components/icons/icon-pencil.tsx`) — đã được `WidgetButton` (`/`) dùng từ trước, nay
climb scope-ladder lên `(public)/_components/` để `/standards` dùng chung (DRY, không tạo bản SVG
thứ 2, xem `docs/vi/system/architecture.md`). Đây là action thứ **5** trỏ `/kudos` trên site (sau
`site-header.tsx:70`, `site-footer.tsx:67`, `kudos-section.tsx:63`, `widget-button.tsx:154`) —
implement bằng `<Link>` như 4 chỗ kia, không phải `<button onClick>`, vì không có logic JS nào
trước khi điều hướng (khác nút "Đóng").
**Request** · không có
**BE** · không có
**Rule**
- **BR-004 — Luôn trỏ `/kudos`, không ẩn/disable dù đích chưa tồn tại.**
- **BR-005 — Không có điều kiện `disabled` nào cho nút này.**
**Result** · read-only, không ghi DB. Điều hướng `/kudos` (404 tới khi route đó được xây, RISK-01).
**Source:** `src/app/(public)/standards/_components/standards-footer-actions.tsx`

### 3.4 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A2 | Direct-load `/standards` (không có lịch sử điều hướng trong tab) | `window.navigation?.canGoBack` là `false`/`undefined` → `router.push(ROUTES.HOME)` thay vì `router.back()` |
| A3 | `/kudos` chưa tồn tại (TC FUN_004) | Link vẫn render `href="/kudos"`, điều hướng thật trả 404 — E2E chỉ assert `href`/điều hướng, không assert nội dung trang đích |
| A1 | Nội dung Thể lệ vừa khít khung (TC FUN_002) | Panel không tạo overflow/scrollbar — CSS `overflow-y: auto` tự nhiên không kích hoạt khi content ngắn hơn container |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File | Status |
|---|---|---|---|---|
| `StandardsPage` (Server Component) | Entry point `/standards`, đọc locale, dựng `copy` qua `buildStandardsCopy` | A1 | `src/app/(public)/standards/page.tsx` | implemented |
| `StandardsClient` | Client boundary — gọi `useStandardsClose()` để lấy `handleClose` | A1, A2 | `src/app/(public)/standards/_components/standards-client.tsx` | implemented |
| `useStandardsClose` | Hook sở hữu logic "Đóng" — `window.navigation.canGoBack` + fallback (§ 3.2) | A2 | `src/app/(public)/standards/_hooks/use-standards-close.ts` | implemented |
| `StandardsScreen` | Presentational root — tiêu đề, 3 section, footer 2 nút | A1, A2, A3 | `src/app/(public)/standards/_components/standards-screen.tsx` | implemented |
| `StandardsFooterActions` | Footer 2 nút ("Đóng" + "Viết KUDOS") — tách riêng khỏi `StandardsScreen` | A2, A3 | `src/app/(public)/standards/_components/standards-footer-actions.tsx` | implemented |
| `HeroBadgeTierRow` | 1 dòng tier (badge ảnh + điều kiện + mô tả) — 4 lần trong section 1 | A1 | `src/app/(public)/standards/_components/hero-badge-tier-row.tsx` | implemented |
| `SecretBoxBadge` | 1 ô badge (ảnh + caption text) — 6 lần trong section 2, lưới 3 cột | A1 | `src/app/(public)/standards/_components/secret-box-badge.tsx` | implemented |
| `StandardsCopy` (type) + `sampleStandardsCopy` | Content contract — tiêu đề, 3 section (heading/intro/tiers/badges/closing/body), nhãn 2 nút footer. **Tên thật khác đề xuất ban đầu**: không có `defaultStandardsCopy` — export thật là `sampleStandardsCopy` | A1 | `src/app/(public)/standards/_shared/standards-copy.ts` | implemented |
| `buildStandardsCopy` | Hàm dựng `StandardsCopy` từ `getTranslations("standards")` — tách riêng khỏi `standards-copy.ts` (khác đề xuất ban đầu gộp chung 1 file) | A1 | `src/app/(public)/standards/_shared/build-standards-copy.ts` | implemented |

**Vì sao KHÔNG tái dùng `SiteHeader`/`SiteFooter`/`getViewer`:** không có bằng chứng nào trong
`specs.csv` (chỉ 2 item, không item nào mô tả header/footer), `test-cases.csv` (không TC nào
assert logo/nav/bell/account), hay `data/preview.png` (khung nhìn thấy bắt đầu ngay bằng tiêu đề
"Thể lệ", không có thanh header phía trên) — cho thấy trang này chỉ render đúng panel, khác hẳn
`/awards` (F004) vốn có bằng chứng rõ ràng dùng chung chrome. Nếu implementer phát hiện thêm bằng
chứng khác lúc code (vd. `get_frame` trả thêm layer ẩn), đây là điểm cần xác nhận lại trước khi
thêm `SiteHeader`/`SiteFooter` vào — không suy diễn thêm ở spec draft này.

**Route registry:** thêm `STANDARDS: "/standards"` vào `ROUTES` (`src/constants/routes.ts`) —
cùng pattern `AWARDS` đã có, dùng làm đích fallback của A2 (không hardcode chuỗi `"/standards"`
hay `"/"` rải rác).

### 4.2 Content Model (không phải DB entity)

`StandardsCopy` là 1 object tĩnh dựng từ i18n, KHÔNG phải bảng Supabase — không có `MODEL###`
nào phát sinh (khác `Award` của F004, vốn có bảng thật). Cấu trúc đề xuất:

```ts
export type HeroBadgeTier = {
  slug: "new-hero" | "rising-hero" | "super-hero" | "legend-hero";
  badgeAsset: string;   // vd "/standards/new-hero.png"
  condition: string;    // vd "Có 1-4 người gửi Kudos cho bạn"
  description: string;
};

export type SecretBoxBadge = {
  slug: "revival" | "touch-of-light" | "stay-gold"
      | "flow-to-horizon" | "beyond-the-boundary" | "root-further";
  badgeAsset: string;    // vd "/standards/badge-revival.png"
  caption: string;       // TEXT node thật, KHÔNG nướng vào ảnh (FR-103)
};

export type StandardsCopy = {
  title: string;                 // "Thể lệ"
  heroSection: {
    heading: string;
    intro: string;
    tiers: HeroBadgeTier[];       // đúng 4, thứ tự cố định
  };
  secretBoxSection: {
    heading: string;
    intro: string;                // chứa ❤️
    badges: SecretBoxBadge[];      // đúng 6, thứ tự cố định (3 cột × 2 hàng)
    closing: string;
  };
  nationKudosSection: {
    heading: string;              // "KUDOS QUỐC DÂN"
    body: string;                 // chứa ❤️
  };
  footer: {
    closeLabel: string;           // "Đóng" / "Close" — D003
    writeKudosLabel: string;      // "Viết KUDOS" / "Write KUDOS"
  };
};
```

`tiers`/`badges` là mảng **tĩnh cứng trong `standards-copy.ts`** (không fetch, không props từ đâu
khác) — 4 tier và 6 badge không đổi theo actor/locale (chỉ label/mô tả đổi qua i18n, cấu trúc
danh sách thì cố định); khai báo trực tiếp resolve từ `getTranslations` theo key tương ứng, tương
tự cách `home-copy.ts` build `AwardsCopy` từ nhiều namespace.

### 4.3 i18n Keys — namespace `standards` (`messages/{vi,en}.json`)

Đề xuất shape khoá (implementer xác nhận cuối cùng, có thể đặt tên khác miễn giữ đúng nội dung
verbatim ở § panel content của task/clarifications.md):

```
standards.title                          "Thể lệ"
standards.heroSection.heading            "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC"
standards.heroSection.intro              "Dựa trên số lượng đồng đội gửi trao Kudos, ..."
standards.heroSection.tiers.newHero.condition     "Có 1-4 người gửi Kudos cho bạn"
standards.heroSection.tiers.newHero.description   "Hành trình lan tỏa điều tốt đẹp bắt đầu..."
standards.heroSection.tiers.risingHero.*
standards.heroSection.tiers.superHero.*           (condition giữ en-dash "10–20")
standards.heroSection.tiers.legendHero.*
standards.secretBoxSection.heading        "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN"
standards.secretBoxSection.intro          "Mỗi lời Kudos bạn gửi... ❤️..." (giữ emoji)
standards.secretBoxSection.closing        "Những Sunner thu thập trọn bộ 6 icon..."
standards.nationKudosSection.heading      "KUDOS QUỐC DÂN"
standards.nationKudosSection.body         "5 Kudos nhận về nhiều ❤️ nhất..." (giữ emoji)
standards.footer.close                    "Đóng" / "Close"
standards.footer.writeKudos               "Viết KUDOS" / "Write KUDOS"
```

6 caption badge ("REVIVAL", "TOUCH OF LIGHT", ...) là chuỗi hiển thị nguyên văn (UPPERCASE theo
design), KHÔNG dịch nghĩa sang tiếng Việt — giữ y hệt cả 2 locale vì đây là tên riêng của icon
(giống cách `sampleAwards` không dịch tên "Top Talent"). Caption thứ 6 là **"ROOT FURTHER"** (đủ
chữ R) ở cả 2 locale (FR-003) — layer MoMorph tên "ROOT FUTHER" (thiếu R) nhưng `character` của
node mới là nội dung thật; xác nhận lại với code đã ship (`standards-copy.ts:163`,
`messages/{vi,en}.json`) dùng đúng "ROOT FURTHER". *(Sửa 2026-09-07: spec draft ban đầu ghi nhầm
theo tên layer.)*

### 4.4 Assets

Copy `plans/260907-0935-standards-rules-page/assets/*` sang `public/standards/` (11 file — xem
bảng đầy đủ + nguồn từng file ở `clarifications.md` § Assets):

| File đích | Dùng cho |
|---|---|
| `new-hero.png`, `rising-hero.png`, `super-hero.png`, `legend-hero.png` | 4 tier badge, section 1 |
| `badge-revival.png`, `badge-touch-of-light.png`, `badge-stay-gold.png`, `badge-flow-to-horizon.png`, `badge-beyond-the-boundary.png`, `badge-root-further.png` | 6 icon badge, section 2 |
| `close.svg` | icon nút "Đóng" |

**KHÔNG copy `pen.svg` như một file asset** — `public/home/Pen.svg` là `fill="white"`, vô hình
trên nền nút vàng của "Viết KUDOS", nên implement dùng lại component `IconPencil`
(`fill="currentColor"`, đã climb lên `(public)/_components/icons/icon-pencil.tsx`) thay vì thêm
1 file SVG thứ 2 (DRY — xem `docs/vi/system/architecture.md` § Cập nhật F005). *(Sửa 2026-09-07:
spec draft ban đầu ước tính sai — nghĩ sẽ tái dùng thẳng file asset, thực tế tái dùng component đã
promote.)*

### 4.5 DOM / a11y Contract (authoritative — E2E viết đúng theo đây)

- `<h1>` text `Thể lệ` (duy nhất 1 h1 trên trang — trang không có chrome nào khác cần h1 riêng).
- 3 `<section>` với `<h2>`: `NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC`,
  `NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN`, `KUDOS QUỐC DÂN`.
  Container panel bọc cả 3 `<section>` có `overflow-y: auto` (FR-301/302).
- Section 1: đúng 4 khối tier (mỗi khối = `<img alt="{tên tier}">` + dòng điều kiện text + đoạn
  mô tả text), thứ tự New → Rising → Super → Legend.
- Section 2: đúng 6 ô badge (mỗi ô = `<img alt="">` decorative + `<p>{CAPTION}</p>` text thật,
  KHÔNG alt-text thay caption — caption phải là DOM text để E2E assert được), lưới 3 cột.
- Section 3: 1 đoạn `<p>` chứa emoji ❤️ nguyên văn.
- Footer: `<button>` "Đóng" (icon X + text) và `<a href="/kudos">` "Viết KUDOS" (icon bút + text,
  style button nhưng semantics là link — điều hướng thuần, không JS).
- Cả 2 nút không có `disabled` attribute nào trong markup (BR-005 — không state đó tồn tại).

## 5. Verification & Technical Notes

### 5.1 Technical Verification (checklist cho tester khi implement)

- **SC-001** *(A1)* `/standards` trả nội dung thành công cho cả Anonymous và Authenticated,
  không redirect (covers FR-001)
- **SC-002** *(A1)* Đủ 3 section + 4 tier + 6 badge đúng thứ tự, đúng nội dung verbatim (covers
  FR-101, FR-102, FR-103, FR-104, TC GUI_001)
- **SC-003** *(A1)* Không có network call nào tới Supabase (network tab trống) — xác nhận FR-002
- **SC-004** *(A2)* Click "Đóng" có lịch sử → `router.back()` đúng trang trước; không có lịch sử
  → điều hướng `/` (covers FR-203, TC FUN_003, 2 nhánh)
- **SC-005** *(A3)* Click "Viết KUDOS" → điều hướng `/kudos` (covers FR-204, TC FUN_004)
- **SC-006** *(A1)* Panel cuộn đúng khi nội dung dài hơn khung; không cuộn giả khi vừa khung
  (covers FR-301/FR-302, TC FUN_001/FUN_002)

**Kết quả Delivery:** RED (`pnpm test:e2e tests/e2e/standards.spec.ts --reporter=list`, exit 1,
13/14 fail vì 404 — chưa có route) → GREEN sau implement (cùng command, exit 0, 14/14 PASS, xem
`plans/260907-0935-standards-rules-page/evidence/green-e2e-standards.txt`). Tất cả SC-001…SC-006
PASS. Visual validation 3 breakpoint (1440/768/375): không mismatch.

### 5.2 Assumptions & Unresolved Questions

- *(§ 1, § 4.1)* **XÁC NHẬN 2026-09-07** — giả định "không tái dùng SiteHeader/SiteFooter" đúng:
  `src/app/(public)/standards/page.tsx` không import `SiteHeader`/`SiteFooter`; E2E `[C2]`
  (`tests/e2e/standards.spec.ts:60`) assert `page.locator("header")`/`("footer")` count `0` và
  PASS. Không còn là giả định chưa kiểm chứng.
- *(§ 4.3)* Tên khoá i18n cụ thể (`standards.heroSection.tiers.newHero.*` v.v.) là ĐỀ XUẤT, không
  phải hợp đồng cứng — implementer có thể đặt tên khác miễn nội dung hiển thị đúng verbatim.
- *(§ 3.2)* **ĐÃ THAY ĐỔI khi implement** — `window.history.length > 1` (heuristic spec draft đề
  xuất ban đầu) bị loại bỏ vì cho kết quả mâu thuẫn khi đo thực tế (xem § 3.2). Cơ chế thật dùng
  `window.navigation?.canGoBack` (Navigation API), không phải `history.length`. Đây KHÔNG còn là
  một giả định mở — đã chốt bằng code + `_hooks/use-standards-close.test.ts`.
- RISK-02 (bản dịch EN chưa review) và DEBT-01 (disabled state không implement) — xem
  functional-spec.md § 11.

### 5.3 Source References

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1 | 1 | `StandardsPage` | `src/app/(public)/standards/page.tsx` | Entry point `/standards` |
| A1 | 2 | `buildStandardsCopy` | `_shared/build-standards-copy.ts` | Dựng `StandardsCopy` từ `getTranslations("standards")` |
| A1 | 3 | `StandardsClient`, `StandardsScreen` | `_components/standards-client.tsx`, `_components/standards-screen.tsx` | Client boundary + render 3 section/footer |
| A1 | 4 | `HeroBadgeTierRow`, `SecretBoxBadge` | `_components/hero-badge-tier-row.tsx`, `_components/secret-box-badge.tsx` | Render lặp 4 tier / 6 badge |
| A2 | 5 | `useStandardsClose` (`handleClose`) | `_hooks/use-standards-close.ts` | `window.navigation.canGoBack` → `router.back()`; else fallback `ROUTES.HOME` |
| A3 | 6 | `<Link href="/kudos">` | `_components/standards-footer-actions.tsx` | Điều hướng Viết KUDOS |

#### Data Flow

```text
GET /standards -> StandardsPage [đọc locale cookie] -> buildStandardsCopy(getTranslations("standards"))
  -> StandardsClient -> StandardsScreen render tiêu đề + 3 section + footer 2 nút
client: click "Đóng" -> useStandardsClose().handleClose() -> window.navigation?.canGoBack
  ? router.back() : router.push(ROUTES.HOME)
client: click "Viết KUDOS" -> <Link href="/kudos"> -> điều hướng trình duyệt thuần
```

### 5.4 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| F004_AwardSystemPage (pattern tham chiếu) | [technical-spec.md](../F004_AwardSystemPage/technical-spec.md) | Server Component → buildCopy → Client pattern, `/kudos` link precedent | [x] |
| Screens | [SCR005_Standards/spec.md](../../SCR005_Standards/spec.md) | SCR005_Standards | [x] |
| Clarifications | [clarifications.md](../../../clarifications.md) | Toàn bộ quyết định route/nội dung/disabled scope | [x] |
