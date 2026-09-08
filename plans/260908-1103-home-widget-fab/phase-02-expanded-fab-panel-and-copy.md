# Phase 02 — Panel mở rộng + copy i18n (Track A)

```
## MoMorph refs:
- FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
- FAB thu gọn: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/_hphd32jN2
- Instance thật: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM (node 5022:15169)
- Clarifications: plans/260908-1103-home-widget-fab/clarifications.md
- testPolicy: e2e-red-first
```

**test_policy: e2e-red-first** — RED đã có, đã xác thực, **không được sửa test để lấy xanh**.

## Context Links

- [`plan.md`](./plan.md) · [`clarifications.md`](./clarifications.md) (**authoritative**, mọi
  quyết định design/hành vi đã chốt ở đó — không mở lại)
- [`reports/tester-260908-1103-red-evidence.md`](./reports/tester-260908-1103-red-evidence.md) — locator contract
- [`reports/study-260908-1103-home-widget-fab.md`](./reports/study-260908-1103-home-widget-fab.md) — số đo node
- [`spec/F003_Homepage/screens/SCR003_Home/spec.md`](./spec/F003_Homepage/screens/SCR003_Home/spec.md) R8/E19-E22
- Skills: `separate-hook-logic-from-components` (destructure tại call site, không giữ object hook),
  `nextjs-route-colocation-architecture`, `write-unit-tests-and-storybook-stories`
- Test contract: `tests/e2e/home-widget-fab.spec.ts`, `tests/e2e/home.spec.ts` — **read-only**

## Overview

- **Priority:** P1 · **Status:** completed · **Effort:** 2h · **Depends on:** phase 01
- Thay dropdown tối suy diễn bằng panel có design, cho trigger morph pill↔×, và đổi lớp copy
  `home.widget` (bỏ 2 key, thêm 3 key) đồng loạt qua 5 call site.
- **Evidence:** `reports/momorph-ui-260908-1146-fab-expanded.md` § Phase 02 (8 files edited,
  `widget-button.tsx` 151 lines < 200, all traps fixed, 4/5 e2e passed — the 1 failure was a bug in
  the RED test file itself (`.right` does not exist on `boundingBox()`), authored earlier this
  session by the tester, NOT pre-existing; fixed by the tester in phase 03).

## Key Insights — ba bẫy chịu lực

### Bẫy 1 · React identity khi morph

Đóng render `[trigger]`, mở render `[menu, trigger]`. Viết:

```tsx
<div ref={registerRoot} className="flex flex-col items-end gap-5">
  {open && ( /* [role="menu"] */ )}
  {/* trigger LUÔN là phần tử thứ hai của cùng children array này */}
  <button ref={registerButton} …>…</button>
</div>
```

Viết `open ? <>{menu}{trigger}</> : trigger` là **sai**: React unmount/remount `<button>` →
`registerButton` nhận `null` rồi node mới → `close()` gọi `buttonRef.current?.focus()` trên node
đã chết → Escape không trả focus → `home.spec.ts` **TC ID-35 đỏ** (test đang xanh).
Slot cố định (hoặc `key` trên trigger) là điều kiện đủ.

### Bẫy 2 · `buttonCount === 1` của TC eaecd588

**Bẫy này đã được chữa TRONG TEST, không phải trong trang.** Bản đầu của TC eaecd588 viết:

```ts
const widgetContainer = page.locator("div").filter({ has: widgetTrigger });
expect(await widgetContainer.locator("button").count()).toBe(1);
```

`page.locator("div").filter({has})` khớp **mọi div tổ tiên** của trigger nên phép đếm cộng dồn
qua các div đó. Div gốc `home-screen.tsx:81` bọc cả `SiteHeader` — trong đó `LanguageSelector`
là một `<button>` — nên đếm ra **2** dù FAB dựng đúng 100% (đã đo thật).

Orchestrator **bác** phương án restructure `home-screen.tsx` thành fragment: div gốc đang mang
`${montserrat.variable}` + `${montserratAlternates.variable}`, dời widget ra là mất kế thừa font
→ phải import `next/font` vào client component → ba thay đổi cấu trúc trên trang đã ship & review,
tất cả chỉ để lách một locator sai. Locator sai thì sửa locator.

TC eaecd588 nay dùng:

```ts
const widgetContainer = page.getByTestId("home-widget-fab");
expect(await widgetContainer.locator("button").count()).toBe(1);
```

**Việc duy nhất phase này phải làm cho bẫy 2:** thêm `data-testid="home-widget-fab"` vào wrapper
`fixed` đã có sẵn trong `widget-button.tsx:44`:

```tsx
<div data-testid="home-widget-fab" className="fixed right-6 bottom-6 z-30">
```

Đúng convention repo (`kudos-toast`, `kudos-card`, `kudos-banner`…).

**KHÔNG làm:** không fragment, không sửa cấu trúc `home-screen.tsx` ngoài đổi tên prop, không
import `montserrat` vào `widget-button.tsx`. Widget vẫn nằm trong div gốc nên `font-montserrat`
kế thừa biến CSS như hiện tại — concern "client component import `next/font`" do đó không tồn tại.

### Bẫy 3 · `hover:scale-105` phá phép đo box

`boundingBox()` tính cả transform. Đo thật: pill `106×64` với `hover:scale-105` settled cho
`111.3×67.2`. Sau `widgetTrigger.click()` con chuột **vẫn nằm trên trigger**, nên assertion cuối
của TC eaecd588 (`|w-106| <= 2` sau khi đóng) đọc `111.3` → đỏ. Cùng lý do, trạng thái × 56×56 khi hover
đo ra `58.8` → sát/vượt biên ±2, flaky.

Chữa: bỏ `hover:scale-105` và `transition-transform` khỏi trigger, thay hover bằng
`hover:shadow-[0_6px_10px_0_rgba(0,0,0,0.3)]` (không đổi hình học) và
`transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none`.
**Không** transition width/height/transform ở bất kỳ đâu trên trigger hay option — mọi phép đo
±2px của test sẽ đọc trúng khung giữa đường transition. Đây là ngoại lệ duy nhất so với ràng
buộc "không restyle pill thu gọn": pixel **lúc nghỉ** không đổi, chỉ hiệu ứng hover đổi.

*(Đã kiểm an toàn: keyframe `login-menu-in` ở `globals.css:41-50` chỉ animate `opacity` +
`translateY(-4px)` — không scale → không ảnh hưởng phép đo `height` 64px của 2 option.)*

## Requirements

Functional (mỗi dòng map thẳng tới một assertion):

| # | Yêu cầu | Test |
|---|---|---|
| R1 | Trigger giữ `aria-label="Hành động nhanh"` (`home.widget.label`) **cố định** ở cả 2 trạng thái; `aria-expanded` mang trạng thái | TC ID-54, TC eaecd588, home TC35 |
| R2 | Đóng: pill 106×64. Mở: 56×56 tròn, `bg-[#D4271D]`, chứa `IconClose` trắng 24×24 | TC eaecd588 (±2px) |
| R3 | Mở thì nội dung pill (kể cả text `/`) **không render** — không phải ẩn bằng class | TC ID-54, TC eaecd588 (`not.toContainText("/")` đọc `textContent`, text `sr-only`/`hidden` vẫn tính) |
| R4 | `[role="menu"]` chứa đúng 2 `a[role="menuitem"]`: `href="/standards"` chữ "Thể lệ" (trên), `href="/kudos"` chữ "Viết KUDOS" (dưới) | TC ID-54, TC c4b65775, TC 3b6565d3, TC e0451b6d |
| R5 | Mỗi option cao 64px | TC ID-54 (±2px) |
| R6 | Không còn `a[href="/awards"]` và chữ "Award Information" trong menu | TC ID-54, TC e0451b6d |
| R7 | Trong `[role="menu"]` không có `<button>` nào; trong cụm widget chỉ có **1** `<button>` | TC eaecd588 |
| R8 | Click trigger lần 2 / click ngoài / Escape / chọn option đều đóng; Escape trả focus về trigger | home TC30-35, TC eaecd588, TC e0451b6d |
| R9 | Panel neo phải/dưới cùng điểm với pill, `right > 0.8 × viewport width` | TC ID-54 |

Non-functional:
- `widget-button.tsx` < 200 dòng sau khi xong.
- `useMenuKeyboardNav` dùng nguyên trạng, `itemCount: 2`; **không** fork, **không** sửa
  `src/hooks/use-menu-keyboard-nav.ts` (test unit của nó phải vẫn xanh không sửa).
- Destructure hook tại call site (đang đúng, giữ nguyên) — giữ object sẽ bung ~10 lỗi
  `react-hooks/refs`.
- `messages/vi.json` và `messages/en.json` đổi **đồng thời**: `src/lib/i18n/messages-parity.test.ts`
  là cổng chặn.

## Architecture

### Hợp đồng thị giác (số từ node data, không đoán)

| Phần | Node | Số đo | Class chỉ định |
|---|---|---|---|
| Cột dọc | `313:9140` | flex column, `gap: 20`, `align-items: flex-end` | `flex flex-col items-end gap-5` |
| Option | `I313:9140;214:3799` / `;214:3732` | h64, padding 16, gap 8, radius 4, `#FFEA9E`, text `#00101A` Montserrat 700 24/32, ls 0 | `flex h-16 items-center gap-2 rounded bg-login-button p-4 font-montserrat text-2xl leading-8 font-bold text-login-button-text` |
| Icon option | `214:3752` / `214:3812` | 24×24 | `flex h-6 w-6 shrink-0 items-center justify-center` bọc `IconSunLogo` / `IconPencil className="h-6 w-6 shrink-0"` |
| × (trigger lúc mở) | `I313:9140;214:3827` | 56×56, radius 100, `#D4271D`, close 24 trắng | `flex h-14 w-14 items-center justify-center rounded-full bg-[#D4271D] text-white` |
| Pill (lúc đóng) | `I5022:15169;214:3839` | 106×64 | giữ nguyên `h-16 w-[106px] … rounded-full bg-login-button … shadow-[0_4px_4px_0_rgba(0,0,0,0.25),0_0_6px_0_#FAE287]` |

- **KHÔNG hardcode 149px** cho "Thể lệ": 149 là slack text-box Figma (16+108+16 = 140). Dùng
  width nội tại + `p-4`. "Viết KUDOS" 16+182+16 = 214 tự khớp.
- Option **không** có shadow lúc nghỉ (chỉ pill có). Hover mới thêm
  `hover:shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]` (spec CSV: "hover: tăng nhẹ shadow").
- `rounded` = 4px, đúng utility đang dùng ở `widget-button.tsx:150` và `site-header.tsx:100`.
- × lúc mở **không** kế thừa shadow của pill (node data không có) → class shadow phải nằm ở
  nhánh pill, không ở base.
- Panel giữ `animate-login-menu-in` đang có (180ms, đã tôn trọng `prefers-reduced-motion`).
  Không thêm keyframe mới — YAGNI.
- Bỏ hẳn `absolute right-0 bottom-full mb-2 w-48 bg-[#0B0F12]`: panel là flex column trong luồng.

### Cây DOM đích

```
<div data-testid="home-widget-fab" class="fixed right-6 bottom-6 z-30">  ← wrapper
  <div ref=registerRoot class="flex flex-col items-end gap-5">         ← root click-outside
    {open && <div role="menu" tabIndex={-1} onKeyDown={handleMenuKeyDown}
                  class="animate-login-menu-in flex flex-col items-end gap-5">
                <Link ref=registerItem(0) href={ROUTES.STANDARDS} role="menuitem" …>
                  <IconSunLogo/> {standardsLabel}
                <Link ref=registerItem(1) href={ROUTES.KUDOS} role="menuitem" …>
                  <IconPencil/> {writeKudosLabel}
             </div>}
    <button ref=registerButton aria-label={buttonLabel} aria-haspopup="menu"
            aria-expanded={open} title={open ? cancelLabel : undefined}>
      {open ? <IconClose aria-hidden="true" class="h-6 w-6"/> : <pill content/>}
    </button>
  </div>
</div>
```

Tổng chiều cao khi mở = 64 + 20 + 64 + 20 + 56 = **224** = đúng `313:9140`. ✔

### Props & copy — 5 call site đổi đồng loạt

`WidgetButtonProps`: `{ kudosLabel, awardsLabel, buttonLabel }` →
`{ standardsLabel, writeKudosLabel, buttonLabel, cancelLabel }`.

| File | Đổi |
|---|---|
| `messages/vi.json:100-104` | bỏ `kudosItem`/`awardsItem`; thêm `standardsItem: "Thể lệ"`, `writeKudosItem: "Viết KUDOS"`, `cancelLabel: "Hủy"`; giữ `label` |
| `messages/en.json:100-104` | y hệt: `standardsItem: "Rules"`, `writeKudosItem: "Viết KUDOS"` (giữ nguyên tiếng Việt như `standards-footer-actions`), `cancelLabel: "Cancel"` |
| `(home)/_shared/home-copy.ts:58-62` | type `widget` → 4 field mới |
| `(home)/_shared/home-copy.ts:146-152` | default: `label` giữ, 3 key mới, xoá docstring "INFERRED / user override pending" |
| `(home)/page.tsx:123-127` | `t("widget.standardsItem")`, `t("widget.writeKudosItem")`, `t("widget.cancelLabel")` |
| `(home)/_components/home-screen.tsx:105-109` | **chỉ** đổi tên 3 prop — KHÔNG restructure |
| `(home)/_components/widget-button.stories.tsx:10-14` | args mới |

`cancelLabel` dùng làm `title` của trigger lúc mở (tooltip), **không** làm accessible name —
`aria-label` thắng `title` trong thuật toán tính tên, nên R1 vẫn giữ. Đây là điểm clarifications
§ Hành vi chốt và là điểm spec draft ghi sai (xem `plan.md` § Decisions).

## Related Code Files

Sửa:
- `src/app/(public)/(home)/_components/widget-button.tsx` (177 dòng → mục tiêu < 200: xoá ~72 dòng
  SVG inline, thêm ~55 dòng panel/morph)
- `src/app/(public)/(home)/_components/home-screen.tsx`
- `src/app/(public)/(home)/_components/widget-button.stories.tsx`
- `src/app/(public)/(home)/_shared/home-copy.ts`
- `src/app/(public)/(home)/page.tsx`
- `messages/vi.json`, `messages/en.json`

Đọc (không sửa): `src/hooks/use-menu-keyboard-nav.ts`, `src/constants/routes.ts`,
`src/styles/globals.css`, `src/app/_components/site-header.tsx`,
`src/app/(public)/standards/_components/standards-footer-actions.tsx` (tiền lệ nút vàng),
`src/app/_components/language-selector/language-selector.tsx` (pattern menu), 2 file test e2e.

**File ownership (phase này sở hữu độc quyền):** 7 file "Sửa" ở trên.
**Tuyệt đối không chạm:** `tests/**`, `src/hooks/use-menu-keyboard-nav.ts`,
`src/app/_components/icons/**` (phase 01 sở hữu), `src/styles/globals.css`, `docs/**`.

## Implementation Steps

1. Lớp copy trước (dễ kiểm, chặn bằng test parity): `messages/vi.json` + `messages/en.json` →
   `home-copy.ts` (type + default) → `page.tsx`. Chạy `pnpm test:unit` — parity test phải xanh.
2. `widget-button.tsx` — đổi `WidgetButtonProps` sang 4 prop mới.
3. `widget-button.tsx` — thay SVG inline (dòng 69-140) bằng `<IconSunLogo />` **không truyền
   `className`**, bọc trong `<span className="flex h-6 w-6 shrink-0 items-center justify-center">`
   **giữ nguyên**: default `width="20" height="19"` của component chính là số đang render, nên
   pill lúc nghỉ không lệch pixel nào. Sau bước này grep path data phải chỉ còn 1 file.
4. `widget-button.tsx` — tách 2 hằng class mức module (`TRIGGER_PILL_CLASS`,
   `TRIGGER_CANCEL_CLASS`, `OPTION_CLASS`) để JSX gọn và file dưới cap; áp bẫy 3 (bỏ
   hover-transform, không transition hình học).
5. `widget-button.tsx` — dựng cột dọc + panel theo cây DOM đích, áp bẫy 1 (children array cố định).
   `registerItem(0)` = "Thể lệ", `registerItem(1)` = "Viết KUDOS"; `onClick={() => close(false)}`
   trên cả 2 Link (điều hướng rồi, không cần trả focus).
6. `widget-button.tsx` — nhánh nội dung trigger: `{open ? <IconClose …/> : <pill content/>}`,
   `title={open ? cancelLabel : undefined}`. Cập nhật docstring: xoá "INFERRED … user override
   pending", ghi 2 node design + lý do một-button-morph (dẫn `home.spec.ts` TC ID-35).
7. `home-screen.tsx` — **chỉ** đổi 3 prop truyền vào `<WidgetButton>` (`standardsLabel`,
   `writeKudosLabel`, `cancelLabel`). Không fragment, không đụng div gốc, không đụng font var.
8. `widget-button.stories.tsx` — args mới. Story `Open` giữ nguyên cách mở bằng `play` (click
   thật) — `open` là state nội bộ của hook, không nhận qua props.
9. `pnpm lint && pnpm typecheck` → `pnpm test:unit` → `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts`
   → `E2E_PORT=3100 npx playwright test tests/e2e/home.spec.ts`.

## Todo List

- [ ] `messages/vi.json` + `messages/en.json` (bỏ 2, thêm 3, đồng thời)
- [ ] `home-copy.ts` type + default
- [ ] `page.tsx` 3 lời gọi `t()`
- [ ] `widget-button.tsx` props → 4 prop mới
- [ ] `widget-button.tsx` SVG inline → `IconSunLogo` (khử trùng path data)
- [ ] `widget-button.tsx` hằng class + bỏ hover-transform (bẫy 3)
- [ ] `widget-button.tsx` cột dọc + panel 2 option (bẫy 1)
- [ ] `widget-button.tsx` nhánh nội dung trigger pill↔× + `title`
- [ ] `widget-button.tsx` docstring bỏ "INFERRED"
- [ ] `home-screen.tsx` đổi tên 3 prop (KHÔNG restructure)
- [ ] `data-testid="home-widget-fab"` trên wrapper `fixed` của `widget-button.tsx` (bẫy 2)
- [ ] `widget-button.stories.tsx` args mới
- [ ] lint · typecheck · unit · 2 suite e2e

## Success Criteria

Đo được, không cảm tính:

- `E2E_PORT=3100 npx playwright test tests/e2e/home-widget-fab.spec.ts` → **exit 0, 5/5 passed**,
  cùng file test **không đổi một byte** (`git diff --stat tests/` rỗng).
- `E2E_PORT=3100 npx playwright test tests/e2e/home.spec.ts` → 27/27 (baseline giữ; nếu test
  countdown còn đỏ thì phải đỏ **y hệt** trước khi làm, có log đối chiếu).
- `pnpm typecheck` 0 lỗi · `pnpm lint` 0 lỗi · `pnpm test:unit` 536/536 · `pnpm format:check` xanh.
- `wc -l src/app/(public)/(home)/_components/widget-button.tsx` < 200.
- `grep -rn "M5.26498 6.93036" src` → đúng **1** file (`icon-sun-logo.tsx`).
- `grep -rn "kudosItem\|awardsItem" src messages` → **rỗng**.
- `grep -rn "aria-label=\"Hủy\"\|cancelLabel}" src/app/\(public\)/\(home\)` → không có
  `aria-label={cancelLabel}` ở đâu cả (chỉ `title=`).
- `pnpm build` xanh (bắt được cả trường hợp dự phòng font ở bẫy 2).

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Đối phó |
|---|---|---|---|
| Viết ternary bọc fragment → TC ID-35 đỏ | **Cao** | **Cao** | Bẫy 1; đọc `home.spec.ts:324-332` trước khi viết JSX |
| Quên `data-testid="home-widget-fab"` → TC eaecd588 đỏ ở `buttonCount` dù UI đúng, dễ chẩn sai thành "morph chưa xong" | **Cao** | Trung bình | Bẫy 2; nếu TC eaecd588 CHỈ đỏ ở `buttonCount` thì thiếu testid, không phải thiếu morph |
| Giữ `hover:scale-105` → TC eaecd588 đỏ ở assertion cuối, flaky | **Cao** | Trung bình | Bẫy 3; không transition hình học |
| Thêm `transition` cho morph "cho mượt" → phép đo ±2px flaky | Trung bình | Trung bình | Ghi rõ cấm; chỉ transition màu/shadow |
| Ẩn text `/` bằng `hidden`/`sr-only` thay vì không render → TC ID-54 vẫn đỏ | Trung bình | Trung bình | R3: `toContainText` đọc `textContent` |
| Hardcode 149px cho "Thể lệ" | Trung bình | Thấp | Width nội tại + `p-4`; clarifications § Hợp đồng thị giác |
| Đổi 1 locale, quên locale kia | Trung bình | Thấp | `messages-parity.test.ts` chặn ở `pnpm test:unit` |
| `widget-button.tsx` vượt 200 dòng | Trung bình | Thấp | Hằng class mức module; nếu > 190, tách `widget-button-options.tsx` (nhận `activeIndex`, `registerItem`, `close`, 2 label) |

## Rollback

Toàn bộ phase nằm trên `feat/home-widget-fab`, 7 file, không migration, không state ngoài
client. `git checkout -- <7 file>` là hoàn tác đủ. Không có bước nào cần dữ liệu quay đầu, không
có hợp đồng API nào bị phá, không ảnh hưởng người dùng đã đăng nhập.
Trường hợp panel lỗi nặng lúc đã merge: revert commit của phase 02 để lại pill thu gọn hoạt động
(pill và hook không đổi hợp đồng), FAB chỉ mất trạng thái mở.

## Security Considerations

- Không auth, không authorization, không dữ liệu người dùng, không network call. Widget hiện với
  cả khách ẩn danh — đúng spec (`SCR003_Home` E19 "Always").
- 2 đích điều hướng là route nội bộ hằng số (`ROUTES.STANDARDS`, `ROUTES.KUDOS`), không nhận URL
  từ input → không có bề mặt open-redirect.
- Copy đi qua next-intl, render dạng text node → không XSS, không `dangerouslySetInnerHTML`.

## Next Steps

Phase 03 chạy cổng kiểm chứng đầy đủ + bằng chứng thị giác qua Playwright MCP. Bàn giao cho
`tester`: `redCommand`, `redExitCode: 1`, `redFailure` (TC ID-54 `/` không ẩn, TC eaecd588 width 106≠56,
TC c4b65775/TC e0451b6d thiếu `a[href="/standards"]`) để đối chiếu RED→GREEN trên **đúng** lệnh đó.
