---
status: draft
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
boundary (`StandardsClient`) chỉ để gắn `handleClose` (`router.back()` + fallback). **Không** đọc
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
Handler nằm trong `StandardsClient` (đã có `useRouter()` sẵn ở đó — không cần thêm client leaf
riêng, KISS):

```ts
"use client";
function handleClose(router: AppRouterInstance) {
  // BR-003: ưu tiên router.back(); chỉ fallback khi thực sự không có lịch sử
  // điều hướng (direct-load / tab mới) — window.history.length === 1 nghĩa là
  // entry đầu tiên của tab, không có "trang trước" để quay lại.
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(ROUTES.HOME);
  }
}
```

**Request** · không có
**BE** · không có
**Rule**
- **BR-003 — Luôn ưu tiên `router.back()`; chỉ fallback `ROUTES.HOME` khi không có lịch sử.**
- **BR-005 — Không có điều kiện `disabled` nào cho nút này (TC GUI_003/FUN_005 out-of-scope).**
**Result** · read-only, không ghi DB. Điều hướng nội-app (`router.back()`) hoặc tới `/` (`push`).
**Source:** `src/app/(public)/standards/_components/standards-client.tsx`

### 3.3 A3 — Nút "Viết KUDOS"

— *(điều hướng thuần, không JS)* → `` <Link href="/kudos"> ``
`FR-201` `FR-202` `FR-204` · `SCR005_Standards` · `US003`

**Who** · Bất kỳ khách truy cập nào đang xem `/standards`
**FE** · `next/link` với `href="/kudos"`, style primary vàng + icon bút (tái dùng
`public/home/Pen.svg` nguyên trạng — clarifications.md xác nhận trùng với `assets/pen.svg` của
design, không thêm bản thứ 2, DRY). Đây là action thứ **5** trỏ `/kudos` trên site (sau
`site-header.tsx:70`, `site-footer.tsx:67`, `kudos-section.tsx:63`, `widget-button.tsx:154`) —
implement bằng `<Link>` như 4 chỗ kia, không phải `<button onClick>`, vì không có logic JS nào
trước khi điều hướng (khác nút "Đóng").
**Request** · không có
**BE** · không có
**Rule**
- **BR-004 — Luôn trỏ `/kudos`, không ẩn/disable dù đích chưa tồn tại.**
- **BR-005 — Không có điều kiện `disabled` nào cho nút này.**
**Result** · read-only, không ghi DB. Điều hướng `/kudos` (404 tới khi route đó được xây, RISK-01).
**Source:** `src/app/(public)/standards/_components/standards-screen.tsx`

### 3.4 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A2 | Direct-load `/standards` (không có lịch sử điều hướng trong tab) | `window.history.length <= 1` → `router.push(ROUTES.HOME)` thay vì `router.back()` |
| A3 | `/kudos` chưa tồn tại (TC FUN_004) | Link vẫn render `href="/kudos"`, điều hướng thật trả 404 — E2E chỉ assert `href`/điều hướng, không assert nội dung trang đích |
| A1 | Nội dung Thể lệ vừa khít khung (TC FUN_002) | Panel không tạo overflow/scrollbar — CSS `overflow-y: auto` tự nhiên không kích hoạt khi content ngắn hơn container |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File | Status |
|---|---|---|---|---|
| `StandardsPage` (Server Component) | Entry point `/standards`, đọc locale, dựng `copy` | A1 | `src/app/(public)/standards/page.tsx` | planned |
| `StandardsClient` | Client boundary — owns `handleClose` (`useRouter`) | A1, A2 | `src/app/(public)/standards/_components/standards-client.tsx` | planned |
| `StandardsScreen` | Presentational root — tiêu đề, 3 section, footer 2 nút | A1, A2, A3 | `src/app/(public)/standards/_components/standards-screen.tsx` | planned |
| `HeroBadgeTierRow` | 1 dòng tier (badge ảnh + điều kiện + mô tả) — 4 lần trong section 1 | A1 | `src/app/(public)/standards/_components/hero-badge-tier-row.tsx` | planned |
| `SecretBoxBadge` | 1 ô badge (ảnh + caption text) — 6 lần trong section 2, lưới 3 cột | A1 | `src/app/(public)/standards/_components/secret-box-badge.tsx` | planned |
| `StandardsCopy` / `defaultStandardsCopy` | Content contract — tiêu đề, 3 section (heading/intro/tiers/badges/closing/body), nhãn 2 nút footer | A1 | `src/app/(public)/standards/_shared/standards-copy.ts` | planned |

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
(giống cách `sampleAwards` không dịch tên "Top Talent"). "ROOT FUTHER" giữ nguyên chính tả thiếu
chữ "R" ở cả 2 locale (FR-003).

### 4.4 Assets

Copy `plans/260907-0935-standards-rules-page/assets/*` sang `public/standards/` (11 file — xem
bảng đầy đủ + nguồn từng file ở `clarifications.md` § Assets):

| File đích | Dùng cho |
|---|---|
| `new-hero.png`, `rising-hero.png`, `super-hero.png`, `legend-hero.png` | 4 tier badge, section 1 |
| `badge-revival.png`, `badge-touch-of-light.png`, `badge-stay-gold.png`, `badge-flow-to-horizon.png`, `badge-beyond-the-boundary.png`, `badge-root-further.png` | 6 icon badge, section 2 |
| `close.svg` | icon nút "Đóng" |

**KHÔNG copy `pen.svg`** — clarifications.md xác nhận trùng `public/home/Pen.svg` đã có; nút
"Viết KUDOS" import thẳng từ đó (DRY, tránh 2 bản asset giống hệt).

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

**Kết quả Delivery:** để trống — điền bởi `tester` (`e2e-red-first`: RED trước code bằng
`pnpm test:e2e` trên spec mới trong `tests/e2e/`, GREEN + visual validation sau khi implement).

### 5.2 Assumptions & Unresolved Questions

- *(§ 1, § 4.1)* Giả định "không tái dùng SiteHeader/SiteFooter" dựa trên `specs.csv` (2 item),
  `test-cases.csv` (9 TC, không TC nào chạm header/footer), và crop `data/preview.png` — CHƯA
  verify trực tiếp bằng `get_frame` toàn bộ node tree lúc code (agent viết spec này không có
  quyền gọi lại MoMorph API); nếu Track A phát hiện ngược lại, đây là điểm cần dừng lại xác nhận
  trước khi thêm chrome vào, không tự ý mở rộng scope.
- *(§ 4.3)* Tên khoá i18n cụ thể (`standards.heroSection.tiers.newHero.*` v.v.) là ĐỀ XUẤT, không
  phải hợp đồng cứng — implementer có thể đặt tên khác miễn nội dung hiển thị đúng verbatim.
- *(§ 3.2)* `window.history.length > 1` là heuristic phổ biến cho "có lịch sử điều hướng trong
  tab", không phải API đảm bảo 100% chính xác ở mọi trình duyệt (vd SSR/prerender edge case) —
  chấp nhận được vì đây đúng là điều clarifications.md yêu cầu ("không có history (direct-load /
  tab mới)"), không có API chuẩn nào tốt hơn trong Next.js App Router hiện tại.
- RISK-02 (bản dịch EN chưa review) và DEBT-01 (disabled state không implement) — xem
  functional-spec.md § 11.

### 5.3 Source References

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1 | 1 | `StandardsPage` | `src/app/(public)/standards/page.tsx` | Entry point `/standards` |
| A1 | 2 | `StandardsClient`, `StandardsScreen` | `_components/standards-client.tsx`, `_components/standards-screen.tsx` | Client boundary + render 3 section/footer |
| A1 | 3 | `HeroBadgeTierRow`, `SecretBoxBadge` | `_components/hero-badge-tier-row.tsx`, `_components/secret-box-badge.tsx` | Render lặp 4 tier / 6 badge |
| A2 | 4 | `handleClose` | `_components/standards-client.tsx` | `router.back()` + fallback `ROUTES.HOME` |
| A3 | 5 | `<Link href="/kudos">` | `_components/standards-screen.tsx` | Điều hướng Viết KUDOS |

#### Data Flow

```text
GET /standards -> StandardsPage [đọc locale cookie] -> buildCopy(getTranslations("standards"))
  -> StandardsClient -> StandardsScreen render tiêu đề + 3 section + footer 2 nút
client: click "Đóng" -> handleClose(router) -> router.back() hoặc router.push(ROUTES.HOME)
client: click "Viết KUDOS" -> <Link href="/kudos"> -> điều hướng trình duyệt thuần
```

### 5.4 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| F004_AwardSystemPage (pattern tham chiếu) | [technical-spec.md](../F004_AwardSystemPage/technical-spec.md) | Server Component → buildCopy → Client pattern, `/kudos` link precedent | [x] |
| Screens | [SCR005_Standards/spec.md](../../SCR005_Standards/spec.md) | SCR005_Standards | [x] |
| Clarifications | [clarifications.md](../../../clarifications.md) | Toàn bộ quyết định route/nội dung/disabled scope | [x] |
