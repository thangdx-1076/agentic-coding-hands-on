---
feature: F000
phase: 05
title: "Tích hợp — launcher, số thật ở page.tsx, copy i18n, lật contract kudos.spec"
status: completed
priority: P1
effort: 2h
test_policy: e2e-red-first
depends_on: [01, 03, 04]
owns:
  - src/app/(public)/kudos/_components/secret-box-launcher.tsx
  - src/app/(public)/kudos/_components/kudos-stat-list.tsx
  - src/app/(public)/kudos/_components/kudos-stat-list.stories.tsx
  - src/app/(public)/kudos/page.tsx
  - src/app/(public)/kudos/_shared/build-kudos-copy.ts
  - messages/vi.json
  - messages/en.json
  - tests/e2e/kudos.spec.ts
---

# Phase 05 — Tích hợp: launcher, số thật, copy, lật contract

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

**test_policy: e2e-red-first.** Đây là phase làm S01–S12 chuyển xanh. `tests/e2e/secret-box.spec.ts`
**read-only tuyệt đối** ở phase này (phase 01 đã sửa fixture xong). Sửa duy nhất được phép trong
`tests/`: `tests/e2e/kudos.spec.ts:745-747`.

## Context Links

- [`plan.md`](./plan.md) § Decisions D-P03, D-P04
- [`phase-03-...md`](./phase-03-secret-box-dialog-presentational.md) § Architecture — props contract
- [`phase-04-...md`](./phase-04-secret-box-dal-and-server-action.md) § Architecture — `KudosStatsSummary` + action
- [`clarifications.md`](./clarifications.md) § "Phạm vi — chỉ `/kudos`", § "Quyền và số liệu"
- [`spec/secret-box-modal/technical-spec.md`](./spec/secret-box-modal/technical-spec.md) § 3.1 A1/A2/A3/A4, § 4.3 SM-001
- Tiền lệ: `kudos-compose-launcher.tsx:56-175` (composition root: hook + trigger + dialog cùng chỗ)
- Test contract: `tests/e2e/secret-box.spec.ts` (read-only), `tests/e2e/kudos.spec.ts:745-747` (được sửa)

## Overview

- **Priority:** P1 · **Status:** pending · **Effort:** 2h · **Depends on:** 01, 03, 04
- Seam duy nhất giữa Track A và Track B: `SecretBoxLauncher` (mới) giữ state machine SM-001, gọi
  action, dựng props cho `SecretBoxDialog`; `KudosStatList` nhường chỗ nút cho launcher;
  `page.tsx` bỏ 2 số cứng; copy mới vào `messages/*.json` + `build-kudos-copy.ts`;
  `kudos.spec.ts:745-747` lật sang contract enabled.
- Codes: FR-002, FR-101, FR-202, FR-203, FR-205, FR-602, DEC-001, DEC-002, DEC-003, SM-001, US001–US003.
- Ánh xạ e2e: **S01–S12 phải chuyển xanh**; **S13, S15 phải vẫn xanh**.

## Key Insights — điều kiện thắng/thua của cả suite nằm ở đây

### 1 · S13 đòi `<dialog>` KHÔNG có trong DOM khi `unopened === 0`

```ts
const modal = page.locator("[data-testid=secret-box-dialog]");
await expect(modal).toHaveCount(0);        // S13, đang PASS
```

`toHaveCount(0)` ≠ `not.toBeVisible()`. Một `<dialog>` đóng vẫn **có count 1**. Vậy launcher phải
**mount có điều kiện**:

```tsx
const initialUnopened = stats.secretBoxUnopened;      // số từ SERVER, render đầu
// nút: luôn render, disabled khi initialUnopened === 0
// <dialog>: chỉ render khi initialUnopened > 0
```

Điều kiện phải dựa trên **số server render đầu**, KHÔNG phải live count. Nếu dùng live count thì
sau khi mở hộp cuối (S10) count về 0 → dialog unmount giữa luồng → S07/S09/S10 vỡ. Mount một lần
rồi giữ.

### 2 · S11/S12 chỉ đòi `not.toBeVisible()` → giữ dialog trong DOM sau khi đóng là đúng

Đóng bằng `.close()` để UA đặt `display:none` (kết hợp `open:flex` của phase 03). **Không**
unmount dialog khi đóng.

### 3 · Không thêm prop mới xuyên `kudos-client.tsx` (198 dòng) / `kudos-screen.tsx` (188 dòng)

Trần file 200 dòng. Đường đi hợp lệ, cả hai đều **không** thêm prop:
- copy mới → thêm field vào `KudosStatListCopy` (object đã đi xuyên `KudosSidebarCopy` → `KudosPageCopy`)
- số đếm → đã có trong `stats: KudosStats`
- action → launcher `import` trực tiếp từ module `"use server"` (tiền lệ `logout.ts`, `set-locale.ts`)

### 4 · `kudos-stat-list.tsx` là component trình bày, không được nuốt logic

Chuyển toàn bộ markup nút + `IconOpenGift` sang `secret-box-launcher.tsx`, `KudosStatList` chỉ
render `<SecretBoxLauncher stats={stats} copy={copy} />` ở đúng vị trí `mm:2940:13497`.
`kudos-stat-list.tsx` **giảm** dòng; `secret-box-launcher.tsx` giữ state + icon.

### 5 · S15 (ẩn danh) không được vỡ

`KudosStatList` trả `null` khi `stats === null` — **giữ nguyên guard đó ở dòng đầu hàm**, đặt
`<SecretBoxLauncher>` **sau** guard. Ẩn danh ⇒ không nút, không dialog, không stat row (FR-602, C09).

## Requirements

- **FN (FR-002):** `page.tsx` không còn `secretBoxOpened: 0` / `secretBoxUnopened: 0`; cả hai lấy
  từ `getKudosStats`.
- **FN (DEC-001):** `unopened === 0` ⇒ nút visible + `disabled`, giữ `title` sẵn có; `> 0` ⇒ enabled.
- **FN (SM-001):** launcher giữ 3 state `Closed`/`Unopened`/`Revealed`; live count từ `unopened`
  của RPC, không tự trừ ở client.
- **FN (DEC-002):** live count `=== 0` ⇒ `canOpen = false` (ẩn hướng dẫn, box hết bấm).
- **FN:** lỗi `no_boxes_left`/lỗi khác ⇒ hiện thông báo lỗi, **không** hiện badge giả
  (copy: "Có lỗi khi mở Secret Box, vui lòng thử lại" — functional-spec § 9).
- **FN:** chống double-click phía client: `busy` khoá nút trong lúc chờ (lớp thứ hai; lớp thật là
  advisory lock của `0011`).
- **FN:** `tests/e2e/kudos.spec.ts:745-747` — bỏ `toBeDisabled()`, assert contract mới; giữ
  `toHaveCount(5)` cho stat row và `toBeVisible()` cho nút.
- **NFN:** 6 key copy mới ở **cả** `vi.json` và `en.json` (đã verify parity 6 badge key sẵn có —
  giữ parity). Chuỗi vi **verbatim** từ clarifications, không bịa.
- **NFN:** mọi file chạm phải < 200 dòng sau khi sửa.

## Architecture

```
page.tsx (Server Component)
  buildViewerStats(): { received, sent, hearts, secretBoxOpened, secretBoxUnopened }
        ▲ 2 field cuối lấy từ getKudosStats (phase 04), bỏ 2 dòng cứng 146-147
  → KudosClient → KudosScreen → KudosSidebar → KudosStatList   (KHÔNG prop mới ở 3 chặng giữa)

KudosStatList (trình bày)
  if (!stats) return null;                       ← giữ nguyên, S15/C09
  5 stat row (secretBoxOpened/Unopened giờ là số thật)
  <SecretBoxLauncher stats={stats} copy={copy} /> ← thay chỗ markup nút cũ

SecretBoxLauncher ("use client", composition root)
  import { openSecretBoxAction } from "../_actions/open-secret-box";   ← "use server"
  const { registerDialog, open, close } = useSecretBoxDialog();        ← phase 03
  const [live, setLive]   = useState(stats.secretBoxUnopened);
  const [badge, setBadge] = useState<BadgeKey | null>(null);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canMount = stats.secretBoxUnopened > 0;    ← SỐ SERVER, quyết định mount (S13)

  <button data-testid="kudos-open-gift" disabled={!canMount}
          title={copy.openGiftDisabledTitle ?? DEFAULT} onClick={open}>
    <IconOpenGift/> {copy.openGift}
  </button>

  {canMount && (
    <SecretBoxDialog registerDialog={registerDialog}
      state={badge ? "revealed" : "unopened"}
      unopenedCount={live} awardedBadgeKey={badge}
      canOpen={live > 0 && !busy} busy={busy} error={error}
      copy={copy.secretBox} onOpenBox={handleOpen}
      onClose={close} onCancel={close} />
  )}

  handleOpen: setBusy(true) → openSecretBoxAction()
    ok    ⇒ setBadge(res.badgeKey); setLive(res.unopened)   ← số từ SERVER, không tự trừ
    !ok   ⇒ setError(copy.secretBox.error)                  ← không set badge
    finally setBusy(false)
```

**Copy mới** (`kudos.secretBox.*` trong `messages/*.json`, vào `KudosStatListCopy.secretBox`):
`titleUnopened`, `titleRevealed`, `instruction`, `label`, `close`, `error`.

## Related Code Files

**Create:** `src/app/(public)/kudos/_components/secret-box-launcher.tsx`

**Modify:**
- `src/app/(public)/kudos/_components/kudos-stat-list.tsx` — bỏ markup nút + `IconOpenGift` (dời
  sang launcher), render `<SecretBoxLauncher>`, mở rộng `KudosStatListCopy` với `secretBox`, sửa
  docstring dòng 3-13 (không còn "no gift system exists yet")
- `src/app/(public)/kudos/_components/kudos-stat-list.stories.tsx` — thêm case `unopened > 0`
- `src/app/(public)/kudos/page.tsx` — dòng 146-147 + docstring `buildViewerStats` (122-133)
- `src/app/(public)/kudos/_shared/build-kudos-copy.ts` — map 6 key mới
- `messages/vi.json`, `messages/en.json` — thêm `kudos.secretBox.*`
- `tests/e2e/kudos.spec.ts` — **chỉ** dòng 745-747

**KHOÁ (không được chạm):** `tests/e2e/secret-box.spec.ts`, `tests/e2e/profile.spec.ts`,
`src/app/(protected)/profile/**`, `kudos-client.tsx`, `kudos-screen.tsx`, `kudos-sidebar.tsx`,
`src/dal/**`, `supabase/**`, `_components/secret-box-dialog.tsx`, `_hooks/use-secret-box-dialog.ts`

## Implementation Steps

1. Xác nhận 01, 03, 04 đã xong: `pnpm typecheck` xanh, hook/util/DAL test xanh, `0011` applied.
2. Thêm `kudos.secretBox.*` (6 key) vào `messages/vi.json` **và** `messages/en.json`. Chuỗi vi lấy
   verbatim từ clarifications: `KHÁM PHÁ SECRET BOX CỦA BẠN`, `MỞ SECRET BOX THÀNH CÔNG`,
   `Click vào box để tiếp tục mở`, `Secretbox chưa mở`, `Đóng`,
   `Có lỗi khi mở Secret Box, vui lòng thử lại`.
3. Map 6 key trong `build-kudos-copy.ts` vào `KudosStatListCopy.secretBox`.
4. Tạo `secret-box-launcher.tsx` theo Architecture. Dời `IconOpenGift` + markup nút từ
   `kudos-stat-list.tsx` sang (không nhân bản class).
5. `kudos-stat-list.tsx`: guard `!stats` giữ nguyên **ở dòng đầu**, thay markup nút bằng
   `<SecretBoxLauncher>`, mở rộng type copy, sửa docstring.
6. `page.tsx`: `secretBoxOpened`/`secretBoxUnopened` lấy từ `getKudosStats`; sửa docstring
   `buildViewerStats` (bỏ "no gift system exists yet (AD-8)", ghi nguồn số mới + lý do fail-open).
7. Thêm story case cho `kudos-stat-list.stories.tsx` (`unopened > 0`).
8. `pnpm typecheck && pnpm lint && pnpm test:unit`.
9. `wc -l` mọi file chạm — tất cả < 200. Nếu launcher vượt, tách toast/thông báo lỗi ra
   `secret-box-error-note.tsx`.
10. Chạy `pnpm run test:e2e tests/e2e/secret-box.spec.ts` → **kỳ vọng 14 passed, exit 0**. Từng
    test đỏ còn lại: đọc lại 5 Key Insights trước khi sửa bất cứ gì; **cấm** sửa file spec đó.
11. Lật `kudos.spec.ts:745-747`, chạy `pnpm run test:e2e tests/e2e/kudos.spec.ts` → xanh.
12. Chạy `pnpm run test:e2e tests/e2e/profile.spec.ts` → xanh, C6/C7 **không đổi một ký tự nào**.

## Todo List

- [ ] 6 key copy vào **cả** `vi.json` và `en.json`, chuỗi vi verbatim
- [ ] Map copy trong `build-kudos-copy.ts`
- [ ] `secret-box-launcher.tsx` — `"use client"`, import action trực tiếp, state SM-001
- [ ] `canMount` dựa trên **số server render đầu**, không live count (S13)
- [ ] Dialog **không** unmount khi đóng và **không** unmount khi live count về 0
- [ ] Dời `IconOpenGift` + markup nút sang launcher, không nhân bản class
- [ ] `kudos-stat-list.tsx` giữ guard `!stats` ở dòng đầu (S15/C09)
- [ ] `page.tsx` bỏ 2 dòng cứng 146-147 + sửa docstring
- [ ] `busy` khoá nút lúc chờ; lỗi ⇒ thông báo, **không** badge giả
- [ ] Live count lấy từ `unopened` của RPC, client **không** tự trừ
- [ ] Story `kudos-stat-list` thêm case `unopened > 0`
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` xanh
- [ ] `wc -l` mọi file chạm < 200
- [ ] `secret-box.spec.ts` → **14 passed, exit 0**, KHÔNG sửa file spec
- [ ] Lật `kudos.spec.ts:745-747` → suite `kudos.spec.ts` xanh
- [ ] `profile.spec.ts` xanh, `git diff tests/e2e/profile.spec.ts` **rỗng**
- [ ] `git diff tests/e2e/secret-box.spec.ts` **rỗng** (so với sau phase 01)

## Success Criteria

- `pnpm run test:e2e tests/e2e/secret-box.spec.ts` → **exit 0, 14 passed** (S01–S13, S15).
- `pnpm run test:e2e tests/e2e/kudos.spec.ts` → exit 0. C09 (dòng 43) **không sửa** vẫn xanh.
- `pnpm run test:e2e tests/e2e/profile.spec.ts` → exit 0; `git diff --name-only` **không** chứa
  `tests/e2e/profile.spec.ts`.
- `git diff tests/e2e/secret-box.spec.ts` (so với commit của phase 01) → **rỗng**.
- `git diff tests/e2e/kudos.spec.ts` chỉ chạm vùng 745-747; `grep -c "toBeDisabled" ` trong test
  C27 = 0.
- `grep -n "secretBoxOpened: 0\|secretBoxUnopened: 0" src/app/\(public\)/kudos/page.tsx` → **rỗng**.
- `wc -l` : `kudos-client.tsx` và `kudos-screen.tsx` **không đổi** (0 dòng thêm); mọi file chạm < 200.
- Chứng cứ DB sau khi bấm box tay trên `/kudos`:
  `select badge_key, count(*) from public.secret_box_openings where user_id = '<viewer>' group by 1;`
  → đúng số lần đã bấm, `badge_key` hợp lệ.
- Chứng cứ chống giả mạo (FR-601): sửa `live` count trong React DevTools rồi bấm box → dòng ghi
  thêm vẫn bị `no_boxes_left` chặn khi hết entitlement.
- `pnpm typecheck && pnpm lint && pnpm test:unit` exit 0.

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| Render `<dialog>` vô điều kiện ⇒ **S13 (đang xanh) vỡ** vì `toHaveCount(0)` | **High** | **Critical** | Key Insight 1 + Todo + Success Criteria đòi 14/14. Mount có điều kiện theo số server |
| Điều kiện mount dùng **live** count ⇒ dialog unmount sau hộp cuối ⇒ S07/S09/S10 vỡ | **High** | High | Key Insight 1 nói rõ "số server render đầu"; biến tên `canMount` tách khỏi `live` |
| Thêm prop mới ⇒ `kudos-client.tsx` (198) hoặc `kudos-screen.tsx` (188) vượt 200 | **High** | Med | D-P03 + Success Criteria: 2 file đó phải 0 dòng thay đổi |
| Client tự trừ count thay vì dùng `unopened` của RPC ⇒ lệch khi đua/đa tab | Med | High | Todo tường minh; S08 poll số thật, sai sẽ đỏ |
| Đặt `<SecretBoxLauncher>` **trước** guard `!stats` ⇒ ẩn danh thấy nút ⇒ **S15 + C09 vỡ** | Med | **Critical** | Key Insight 5; Success Criteria đòi cả `secret-box.spec.ts` S15 và `kudos.spec.ts` C09 xanh |
| "Cứu" test đỏ bằng cách sửa `secret-box.spec.ts` | Med | **Critical** | `git diff` của file đó phải **rỗng**; đọc lại 5 Key Insights trước khi sửa bất cứ gì |
| Chạm `/profile` để "làm cho nhất quán" ⇒ C6/C7 vỡ | Low | High | FR-101 + Non-Scope; Success Criteria đòi diff `profile.spec.ts` rỗng |
| Thiếu key ở `en.json` ⇒ next-intl throw ở locale en | Med | Med | Todo đòi cả 2 file; verify bằng script so key giữa 2 JSON |
| Lỗi RPC hiện badge giả cho "UX mượt" | Low | High | FR-601 + functional-spec § 9; nhánh `!ok` **không** set badge |
| Dev server cũ giữ `:3000` ⇒ e2e đo code cũ, tưởng đỏ/xanh sai | Med | High | Kiểm process giữ `:3000` trước khi chạy; **không** kill cửa port bừa. Next 16 từ chối instance thứ hai cùng directory nên chỉ có 1 server hợp lệ |

## Security Considerations

- Ẩn danh: không nút, không dialog, không action reachable (FR-602). Guard `!stats` là **duy nhất**
  và phải ở dòng đầu.
- Số đếm + badge luôn từ server; client state chỉ **hiển thị**. Sửa DevTools không đổi được dữ liệu
  đã ghi (FR-601, test case `5cc072ad`/`2e7bec78`) — có bước verify tay trong Success Criteria.
- Không đưa `viewerId` hay bất kỳ id nào vào props của dialog (không cần, và không nên có trong
  DOM client).
- `busy` chống double-submit ở client là **tiện dụng**, không phải bảo mật — lớp thật là
  `pg_advisory_xact_lock` của `0011`.
- `/profile` vẫn `disabled` ⇒ không mở thêm bề mặt tấn công nào ngoài `/kudos`.

## Next Steps

- Bàn cho **phase 06**: chạy full suite + đồng bộ docs + ghi evidence.
- **Rollback:** revert phase 05 đưa `/kudos` về nút disabled; `0011` (phase 02) và DAL (phase 04)
  có thể ở lại vô hại — bảng không ai đọc, hàm không ai gọi. Nhưng `page.tsx` ↔ `kudos-stats.ts` là
  **một cặp**: revert 04 thì phải revert 05 cùng lúc, không revert lẻ.
