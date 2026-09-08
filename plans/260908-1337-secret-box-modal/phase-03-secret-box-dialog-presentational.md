---
feature: F000
phase: 03
title: "Track A — SecretBoxDialog trình bày + hook + 2 asset MoMorph"
status: pending
priority: P1
effort: 3h
track: A
test_policy: e2e-red-first
agent: momorph-ui-implementer
depends_on: []
owns:
  - src/app/(public)/kudos/_components/secret-box-dialog.tsx
  - src/app/(public)/kudos/_components/secret-box-dialog.stories.tsx
  - src/app/(public)/kudos/_hooks/use-secret-box-dialog.ts
  - src/app/(public)/kudos/_hooks/use-secret-box-dialog.test.ts
  - src/app/(public)/kudos/_utils/secret-box-badge-asset.ts
  - src/app/(public)/kudos/_utils/secret-box-badge-asset.test.ts
  - public/standards/secret-box-closed.png
  - public/standards/secret-box-sparkle.png
---

# Phase 03 — Track A: `SecretBoxDialog` trình bày + hook + asset

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Node asset: 1466:7686 (box chưa mở 558×558) · 1466:7685 (hiệu ứng 546×546) · 1466:7679 (Close 19×19, ĐÃ CÓ ở public/standards/close.svg)
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

**test_policy: e2e-red-first.** RED đã có (`tests/e2e/secret-box.spec.ts`), **read-only**. Phase
này KHÔNG chạy e2e để lấy xanh — S02–S12 chỉ xanh sau phase 05 khi launcher được nối. Không sửa,
không skip, không viết thêm file test e2e nào.

## Context Links

- [`plan.md`](./plan.md) § Decisions D-P02, D-P04
- [`clarifications.md`](./clarifications.md) § "Xung đột copy tiêu đề", § "Visual state sau khi click"
- [`reports/researcher-260908-1337-secret-box-frontend.md`](./reports/researcher-260908-1337-secret-box-frontend.md) § Q1 (pattern `<dialog>`), Q5 (reduced-motion)
- [`spec/secret-box-modal/technical-spec.md`](./spec/secret-box-modal/technical-spec.md) § 3.1 A2/A4, § 4.1, § 4.3 SM-001
- Test contract (**read-only**): `tests/e2e/secret-box.spec.ts` docstring dòng 35-44 = danh sách testid duy nhất
- Tiền lệ code: `kudos-compose-dialog.tsx:29-42,50-68,79-108` · `use-kudos-compose-dialog.ts:66-89` ·
  `kudos-link-dialog.tsx:70-197` · `secret-box-badge.tsx` (`(public)/standards`) · `src/styles/globals.css:41-56`
- Skills: `separate-hook-logic-from-components`, `nextjs-route-colocation-architecture`,
  `write-unit-tests-and-storybook-stories`

## Overview

- **Priority:** P1 · **Status:** pending · **Effort:** 3h · **Depends on:** —
- Component **thuần trình bày**: nhận `copy`/`unopenedCount`/`state`/`awardedBadgeKey`/`canOpen`/
  `busy` + 3 callback làm props, render 2 state (chưa mở / đã mở), 0 state machine, 0 fetch.
- Hook `useSecretBoxDialog` sở hữu vòng đời `showModal()`/`close()` + scroll lock.
- Codes: FR-201, FR-204, FR-205, FR-401, BR-004, SM-001, DEC-002, DEC-003, US001, US003.
- Ánh xạ e2e: S03, S04, S05, S06, S07, S09, S10 (phần hiển thị), S11, S12 — **xanh ở phase 05**.

## Key Insights — bốn bẫy chịu lực, tất cả đo được từ test

### Bẫy 1 · S07 đo `boundingBox()` ≤ 65px → cấm mọi transform trên badge

```ts
const bbox = await badge.boundingBox();
expect(bbox?.width).toBeLessThanOrEqual(65);
```

`boundingBox()` trả **bounding box sau transform**. Một `hover:scale-105` hay animation `scale`
trên chính phần tử `data-testid="secret-box-badge"` sẽ phồng số đo và làm S07 đỏ, kể cả khi
`width={64}`. Đặt `data-testid="secret-box-badge"` **trên đúng `<Image>`**, `width={64}
height={64}`, không class transform/scale, không `sizes` co giãn. Hiệu ứng sparkle chạy trên
**layer nền riêng**, không phải trên badge.

### Bẫy 2 · S10 đọc computed style của `secret-box-box`

```ts
const isClickable = pointerEvents !== "none" && cursor !== "not-allowed";
expect(isClickable).toBe(false);
```

Khi `canOpen === false`, phần tử `secret-box-box` phải **vẫn tồn tại và vẫn visible**, nhưng
computed style phải có `pointer-events: none` **hoặc** `cursor: not-allowed`. Lưu ý: `<button
disabled>` trong Chromium cho `cursor: default`, **không** `not-allowed` → chỉ đặt `disabled` là
KHÔNG đủ. Bắt buộc thêm class tường minh, ví dụ `disabled:cursor-not-allowed` (hoặc
`pointer-events-none`). Đồng thời **không unmount** box sau reveal — S07/S09/S10 tiếp tục dùng
locator đó.

### Bẫy 3 · `open` attribute và `<dialog>` (kudos-compose-dialog.tsx:29-42)

Component **không bao giờ** render attribute `open`, không giữ `useState`/`useEffect` cho việc
mở/đóng. React commit `open` ở render time, thắng guard `if (!node.open) showModal()` của hook →
dialog chỉ "open" chứ không "show-modal"-ed → mất backdrop, mất focus trap, **mất Escape** → S12 đỏ.
Chỉ hook gọi `.showModal()`/`.close()` qua **ref callback** (`registerDialog`), không `RefObject`.

### Bẫy 4 · class `<dialog>` phải giữ đúng 2 hằng số

`m-auto ... open:flex backdrop:bg-login-background/80`: `open:flex` (không phải `flex` trần) để
`display:none` của UA còn nguyên khi đóng — S11/S12 dùng `not.toBeVisible()`, và S13 dùng
`toHaveCount(0)`; `m-auto` để chống reset `margin:0` của Tailwind Preflight, cho `dialog:modal
{margin:auto}` của UA thắng.

### Ghi thêm · state 0 hộp trong modal đang mở

`unopenedCount === 0` → ẩn hẳn `secret-box-instruction` (S10 dùng `not.toBeVisible()`; render
`null` hoặc `hidden` đều đạt) và `canOpen = false`. Counter hiển thị `00` (2 chữ số, theo
clarifications) — `parseInt("00") === 0` nên S08 vẫn đúng; `secret-box-counter` chỉ chứa **số**,
nhãn nằm ở `secret-box-label` riêng.

## Requirements

- **FN (FR-201):** state chưa mở render tiêu đề `KHÁM PHÁ SECRET BOX CỦA BẠN`, dòng hướng dẫn
  `Click vào box để tiếp tục mở`, artwork box chưa mở, nhãn `Secretbox chưa mở` + số.
- **FN (FR-204, DEC-003):** state đã mở render tiêu đề `MỞ SECRET BOX THÀNH CÔNG` + badge 64×64 gốc,
  **không upscale** (BR-004: không tồn tại asset hộp-đã-mở, giữ layer hiệu ứng + badge nguyên cỡ).
- **FN (FR-205, DEC-002):** `unopenedCount === 0` → ẩn hướng dẫn, box hết bấm được, badge vừa nhận
  vẫn hiện nguyên.
- **FN (FR-401):** nút X (`secret-box-close`) gọi `onClose`; `onCancel` của `<dialog>` (Escape) đi
  cùng một đường ra. Không có backdrop-click-to-close (repo không có ở đâu).
- **NFN:** mọi chuỗi qua props (`copy`), component **không** import `messages`/`next-intl` →
  giữ được tư cách "common component" nên **bắt buộc có story** (pattern `KudosLinkDialogCopy`).
- **NFN:** mỗi file < 200 dòng. Nếu `secret-box-dialog.tsx` vượt, tách theo trục **state**:
  `secret-box-unopened-panel.tsx` + `secret-box-reveal-panel.tsx` (mỗi file 1 state, cùng
  `_components/`, cũng có story) — **không** tách theo trục "helper ngẫu nhiên".
- **NFN:** hook có unit test bắt buộc (`_hooks/use-*.ts` → `use-*.test.ts`, vitest jsdom).
  Util thuần cũng có test (path trong allowlist coverage).
- **NFN:** animation sparkle theo 2 lớp đã có: `motion-reduce:transition-none` cho transition, và
  `@keyframes` + `@utility` với `@media (prefers-reduced-motion: reduce){animation:none}` **lồng
  trong** `@utility` (`globals.css:41-56`) — không viết `@keyframes` trần + media query rời.

## Architecture

```
SecretBoxDialog (client, presentational)
  props: { registerDialog, copy, state: "unopened"|"revealed",
           unopenedCount, awardedBadgeKey: BadgeKey|null,
           canOpen, busy, onOpenBox, onClose, onCancel }
  render:
    <dialog ref={registerDialog} onCancel={onCancel}
            aria-labelledby="secret-box-title" data-testid="secret-box-dialog"
            className="m-auto ... open:flex backdrop:bg-login-background/80">
      <h2 id="secret-box-title" data-testid="secret-box-title">
        {state === "revealed" ? copy.titleRevealed : copy.titleUnopened}
      </h2>
      <button data-testid="secret-box-close" onClick={onClose}>close.svg</button>
      {canOpen && <p data-testid="secret-box-instruction">{copy.instruction}</p>}
      <button data-testid="secret-box-box" disabled={!canOpen || busy}
              onClick={onOpenBox}
              className="... disabled:cursor-not-allowed">
        <Image src="/standards/secret-box-sparkle.png" …/>        ← layer hiệu ứng (nền)
        <Image src="/standards/secret-box-closed.png" …/>         ← 558×558 artwork
        {awardedBadgeKey && (
          <Image data-testid="secret-box-badge" width={64} height={64}
                 src={badgeAsset(awardedBadgeKey)} …/>            ← KHÔNG transform
        )}
      </button>
      <p data-testid="secret-box-label">{copy.label}</p>
      <span data-testid="secret-box-counter">{pad2(unopenedCount)}</span>
    </dialog>

useSecretBoxDialog()  →  { registerDialog, open, close }
  ref callback giữ node; open() = if(!node.open) node.showModal(); close() = node.close()
  effect scroll lock: lưu document.body.style.overflow cũ, set "hidden", restore ở cleanup
  (copy nguyên effect của use-kudos-compose-dialog.ts:79-89 — dialog này KHÔNG lồng nhau nên
   phải có lock riêng, khác use-kudos-link-dialog.ts)

secretBoxBadgeAsset(badgeKey)  →  { asset: `/standards/badge-${badgeKey}.png`, size: 64 }
  BadgeKey = "stay-gold"|"flow-to-horizon"|"touch-of-light"
           |"beyond-the-boundary"|"revival"|"root-further"   (khớp CHECK của 0011)
```

**Dòng dữ liệu:** phase 03 không có dữ liệu vào ra. `state`/`unopenedCount`/`awardedBadgeKey` đến
từ launcher (phase 05); launcher lấy `unopened` từ RPC (phase 04). Component không tự tính gì.

## Related Code Files

**Create:**
- `src/app/(public)/kudos/_components/secret-box-dialog.tsx` (+ `.stories.tsx`)
- `src/app/(public)/kudos/_hooks/use-secret-box-dialog.ts` (+ `.test.ts`)
- `src/app/(public)/kudos/_utils/secret-box-badge-asset.ts` (+ `.test.ts`) — thư mục `_utils/` mới
  trong segment này (tiền lệ `src/app/_utils/`)
- `public/standards/secret-box-closed.png` (node `1466:7686`, 558×558)
- `public/standards/secret-box-sparkle.png` (node `1466:7685`, 546×546)
- *(chỉ nếu vượt 200 dòng)* `secret-box-unopened-panel.tsx` + `secret-box-reveal-panel.tsx` (+ story mỗi file)

**Read for context:** `kudos-compose-dialog.tsx`, `use-kudos-compose-dialog.ts`,
`kudos-link-dialog.tsx`, `(public)/standards/_components/secret-box-badge.tsx`,
`src/styles/globals.css:41-56`, `tests/e2e/secret-box.spec.ts` (read-only)

**KHÔNG chạm:** `kudos-stat-list.tsx`, `page.tsx`, `messages/*.json`, `build-kudos-copy.ts`,
`(public)/standards/**`, `tests/**`, `src/dal/**`, `supabase/**`.

## Implementation Steps

1. Tải 2 asset MoMorph qua MCP (`1466:7686`, `1466:7685`) vào `public/standards/`. **Không** tải
   `1466:7679` — `public/standards/close.svg` đã có, dùng lại.
2. `secret-box-badge-asset.ts`: type `BadgeKey` (6 giá trị kebab, **khớp `CHECK` của 0011**) + hàm
   trả `{ asset, size: 64 }`. Test: cả 6 key ra đúng path **và** `fs.existsSync` từng file trong
   `public/standards/` (bắt lỗi typo stem ngay ở unit test, không đợi e2e).
3. `use-secret-box-dialog.ts`: ref callback + `open`/`close` + effect scroll lock (copy verbatim
   effect của `use-kudos-compose-dialog.ts:79-89`). Test jsdom: `registerDialog(null)` an toàn;
   `open()` gọi `showModal` đúng 1 lần khi `node.open === false`; `close()` gọi `close`;
   `body.style.overflow` được restore về giá trị cũ khi unmount.
4. `secret-box-dialog.tsx` theo Architecture. Đối chiếu **từng** testid với docstring dòng 35-44
   của spec e2e — 9 testid, kebab-case, không thêm không bớt.
5. Xử lý 4 bẫy: `open:flex` + `m-auto`; không transform trên badge; `disabled:cursor-not-allowed`
   trên box; `aria-labelledby` trỏ `<h2 id>`.
6. Story: 3 case tối thiểu — `unopened` (count 1), `revealed` (count 0, 1 badge cụ thể),
   `revealedWithBoxesLeft` (count > 0). Fixture copy **verbatim** từ clarifications, không bịa.
7. Sparkle animation theo lớp `@keyframes` + `@utility` + reduced-motion lồng trong (globals.css).
   Nếu chỉ cần transition tĩnh thì `motion-reduce:transition-none` là đủ — YAGNI, đừng thêm keyframe
   nếu design không đòi.
8. `pnpm typecheck && pnpm lint && pnpm test:unit`. Storybook build/smoke theo lệnh repo.
9. Đo tay: `wc -l` từng file mới < 200.

## Todo List

- [ ] Tải 2 asset MoMorph vào `public/standards/`, đúng kích thước gốc (558×558, 546×546)
- [ ] Dùng lại `public/standards/close.svg`, KHÔNG tải asset Close mới
- [ ] `secret-box-badge-asset.ts` + test (6 key + `fs.existsSync` từng PNG)
- [ ] `use-secret-box-dialog.ts` + test (showModal guard, close, scroll lock restore, `null` ref)
- [ ] `secret-box-dialog.tsx` — đúng 9 testid theo docstring e2e
- [ ] Không attribute `open`, không `useState` mở/đóng, ref **callback**
- [ ] `open:flex` + `m-auto` + `backdrop:bg-login-background/80`
- [ ] `secret-box-badge` trên đúng `<Image>`, 64×64, **không class transform**
- [ ] `secret-box-box` khi `!canOpen`: vẫn visible, `disabled:cursor-not-allowed`, không unmount
- [ ] `secret-box-instruction` ẩn khi count 0 · `secret-box-counter` chỉ chứa số (`00`)
- [ ] `aria-labelledby` trỏ `<h2 id="secret-box-title">`
- [ ] Story ≥ 3 case, copy verbatim từ clarifications
- [ ] Reduced-motion theo pattern `globals.css:41-56`
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` xanh
- [ ] Mọi file mới < 200 dòng (nếu vượt: tách theo state, mỗi panel 1 file + story)
- [ ] Xác nhận `git diff --name-only` không có file nào ngoài `owns`

## Success Criteria

- 9 testid tồn tại đúng tên, khớp 1-1 docstring `tests/e2e/secret-box.spec.ts:35-44`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` **exit 0**; hook + util test cùng xanh.
- Storybook: 3 story render được, state đã mở hiện badge, state chưa mở hiện artwork + hướng dẫn.
- Bằng chứng đo trong Storybook (Playwright MCP): `getBoundingClientRect().width` của
  `secret-box-badge` = **64** (không 65+, không 200) ở cả trạng thái nghỉ và hover.
- `getComputedStyle(secret-box-box)` khi `canOpen=false` cho `cursor: not-allowed` **hoặc**
  `pointer-events: none`; phần tử vẫn `visible`.
- Coverage: `pnpm test:unit:coverage` không tụt dưới ngưỡng cho `_hooks/` và `_utils/`.
- Không có file nào trong `git diff --name-only` ngoài danh sách `owns` của phase.
- **S13 và S15 vẫn PASS** (`pnpm run test:e2e tests/e2e/secret-box.spec.ts` — phase này chưa nối
  launcher nên dialog vẫn không có trong DOM, S13 `toHaveCount(0)` không bị ảnh hưởng).

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| Thêm hover/animation `scale` trên badge → S07 đỏ vì `boundingBox` phồng | **High** | High | Bẫy 1 ghi rõ; Success Criteria đo `getBoundingClientRect().width === 64` ở cả trạng thái hover trong Storybook, không đợi e2e |
| Chỉ đặt `disabled` cho box, không class cursor → S10 đỏ (Chromium cho `cursor: default`) | **High** | High | Bẫy 2 + Todo bắt buộc `disabled:cursor-not-allowed`; Success Criteria đo `getComputedStyle` |
| Component tự giữ `useState` cho open/close hoặc render `open` → mất Escape → S12 đỏ | Med | High | Bẫy 3 + tiền lệ `kudos-compose-dialog.tsx:29-42`; test hook phủ guard `showModal` |
| Unmount `secret-box-box` sau reveal → S07/S09/S10 mất locator | Med | High | Todo ghi "không unmount"; story `revealed` phải vẫn render box |
| Component import copy trực tiếp → mất tư cách common → story không bắt buộc → mất lớp bảo vệ visual | Med | Med | Props-only là NFN cứng; reviewer kiểm `grep -n "next-intl\|messages" secret-box-dialog.tsx` phải rỗng |
| Upscale badge lên ~200px cho "đẹp" | Med | High | BR-004 + test case `56da7ec8` ("no detail loss"); upscale 64→200 chính là detail loss |
| `secret-box-dialog.tsx` vượt 200 dòng (2 state + 3 layer ảnh) | **High** | Med | Kế hoạch tách đã định trước: theo state, 2 panel + story mỗi panel. Quyết ngay khi chạm 180 dòng, không chờ |
| Tải sai asset (crop cả caption như bẫy badge cũ ở `standards-copy.ts:82-92`) | Med | Med | Tải đúng node id đã ghi; verify kích thước bằng `file public/standards/secret-box-*.png` = 558×558 / 546×546 |
| Sparkle keyframe không tôn trọng reduced-motion | Low | Med | Pattern `globals.css:41-56` — media query **lồng trong** `@utility`, không phải rule rời |

## Security Considerations

- Component không nhận và không render HTML thô; mọi chuỗi là text node (không `dangerouslySetInnerHTML`).
- `awardedBadgeKey` được **hẹp về union 6 giá trị** trước khi ghép vào path ảnh → không thể dựng
  path tuỳ ý từ giá trị server trả về. Giá trị lạ → không render badge (fail closed), không render
  `<Image src>` rỗng.
- Không đọc/ghi `localStorage`, không log dữ liệu người dùng.
- `aria-labelledby` + native `<dialog>` giữ focus trap của UA — không tự dựng focus trap.

## Next Steps

- Bàn cho **phase 05**: interface props của `SecretBoxDialog` + `registerDialog`/`open`/`close`
  của hook + type `BadgeKey`. Đây là contract tích hợp duy nhất Track A xuất ra.
- Song song được với phase 01, 02, 04 (ownership rời nhau).
- **Rollback:** xoá 8 file mới (chưa file nào được import ở đâu cho tới phase 05) → tree về trạng
  thái trước, e2e không đổi kết quả.
