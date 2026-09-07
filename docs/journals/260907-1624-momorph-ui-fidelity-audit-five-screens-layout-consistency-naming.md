---
title: "MoMorph UI fidelity audit — 5 screens (Login, Home, Awards, Standards, Profile) vs design frame geometry, 3 defects caught, 2 findings retracted, 1 deliberate defer, reuseExistingServer trap"
date: 2026-09-07
time: "16:24 → 17:48"
tags: [momorph, visual-contract, playwright, ui-fidelity, geometry, design-frame, consistency]
severity: medium
---

# Tóm tắt

Kiểm toàn bộ 5 design frame (`Login`, `Home`, `Awards`, `Standards`, `Profile`) so sánh MoMorph node geometry vs code render. 8 file thay, +43/−29, 3 defect fix, 2 finding retract, 1 defer confirm, 175 unit + 103 e2e pass / 3 skip, lint/format/typecheck/build clean, reviewer 9/10. `/todo` F001 scaffold không design frame nên out scope. Core ghi chép: layout bug mà visual contract xanh vì DOM assertion chỉ kiểm presence không kiểm geometry; "consistency" document bị base trên source cũ không match thực tế; node `itemName` là designer layer label, `character` là content thật. Hai finding retract khi kiểm lại: lazy-load ảnh không missing, hero BG layer khác.

---

## Defect 1 — Layout trong `flex flex-col` mà design yêu cầu hàng ngang (badge + condition)

### Vấn đề

`hero-badge-tier-row.tsx`: badge + condition text nằm `flex flex-col` → stack dọc, mỗi tier ≈102px. Design frame 3204:6161 là 400×**72px**, badge 3204:6163 (x 947–1073, y 260–282) + condition 3204:6162 (x 1081–1397, y 260–280) → **cùng dải y (260–282), cách nhau 8px ngang**.

Hậu quả: mỗi tier chiếm quá cao, Secret Box 6 icon grid bị đẩy ra khỏi viewport. Nhìn thiếu, nhưng visual contract C4 (`standards.spec.ts`) chỉ assert 4 condition string EXIST, không quan tâm vị trí → test xanh suốt.

### Sửa

Đổi `flex flex-col` → `flex flex-row items-center gap-2` + nesting khác. Tier height tuột về 56px. Grid hiện trong fold.

### Bài học — presence assertion ≠ fidelity

Contract "condition string nằm trong DOM" không bao gồm "nằm ở vị trí nào". Geometry verify yêu cầu so sánh tọa độ frame vs `getBoundingClientRect()`, hoặc cao độ row/grid. Đơn DOM assertion chịu chi thế này.

---

## Defect 2 — Caption "consistency" comment dựa trên source cũ, không match thực tế

### Vấn đề

`/awards` caption đã viết lowercase với code comment:
```typescript
// Match homepage — single phrase, one spelling
```

Kiểm 3 design node:
- Home `2167:9070`: `character = "Award Information"` (lowercase)
- Awards `313:8454`: `character = "Award Information"` (capitalized `A`)
- Profile `362:5085`: `character = "Award Information"` (capitalized)

Ngoài lỗi: home lowercase, profile capitalized — site đã inconsistent. Nhưng comment logic không phát hiện. Sửa: Awards thay Capitalized, rewrite comment: "Mỗi screen theo design node riêng (không ép consistency sai)".

### Bài học — document claim cần re-check source

Commit history chứa lý do, nhưng không phải evidence. Nếu document nói "match X", re-open X (design frame, spec node) để xác nhận. Một commit cũ có thể nói sai.

---

## Defect 3 — Node `itemName` (designer layer) vs `character` (thật content) — Awards nav label

### Vấn đề

Nav label ship "Awards Information" → sai. Kiểm Figma node:
- `itemName`: "Awards Information Navigation Links" (component default, designer's label)
- `character`: "Award Information" (thực nội dung)

Mộc: `docs/vi/features/F005/functional-spec.md` D003 đã ghi sẵn: "itemName là component default, không phải real content". Còn code không đọc / không áp dụng.

Sửa: render `character`, không `itemName`.

### Bài học — ghi trong doc không enforce

Spec viết "dùng character field, đừng itemName" mà dev không bắt buộc đọc hoặc nhớ. CI linting không check (không có schema type nào track MoMorph node). Cách: tester visual pass scan node field không match, hoặc CI linter plug vào design export JSON.

---

## Finding 1 Retracted — 3 award ring graphic blank → lazy-load chưa settle

### Kịch bản

Full-page capture: 6 award rings, 3 trong số đó blank (HTTP 200 header nhưng `complete:false, naturalWidth:0`).

Tưởng missing asset → file 404 hoặc CDN timeout.

### Thực tế

```typescript
await page.goto("/awards");
const images = await page.locator("img").all();
// Lúc capture: images.length=6, 3 complete=false
// Sau scroll: images.length=6, 6 complete=true
```

Lazy-load là feature, không bug. Lỗi audit: capture lúc chưa scroll. **Fix process, không fix code:** Scroll page trước capture, assert `document.images.every(i => i.complete && i.naturalWidth > 0)`, rồi mới snapshot.

### Bài học — lazy load không observable trong screenshot

Capture DOM = capture "tại thời điểm này". Lazy asset nó không load nếu chưa scroll. Không phải browser lỗi. Playwright E2E nên scroll trước screenshot, hoặc disable lazy-load lúc test ở browser context.

---

## Finding 2 Retracted — Header missing bell icon → screenshot anon, design frame authed

### Kịch bản

Screenshot: header bell icon không thấy. Tưởng CSS `display:none` quên gỡ.

### Thực tế

`site-header.tsx:77`: bell chỉ render nếu `viewer.isSignedIn`. Capture vào đó anonymous, design frame lúc vẽ authed state.

Kiểm:
```typescript
page.context().cookies().then(cs => console.log(cs.map(c => c.name)))
// Lúc capture: [] (không auth)
```

Không phải bug, phải state mismatch.

### Bài học — screenshot=state snapshot

So sánh screenshot vs design chỉ valid khi app state match design state (authed/anon, locale, viewport). Đơn hình ảnh không nói được context. Expect text hay visual → tự document state setup.

---

## Defer Confirm — Hero keyvisual band height mơ hồ

`/awards` hero band thấp hơn design, nhưng page height cũng khác (design 6410px vs actual 5648px). Content volume khác → không clear là background-height bug hay natural consequence.

Patch nó (adjust `height` hoặc `object-position`) có nguy hiểm breaking `/home` hay `/profile` ở same `KeyvisualBackground` component. Ghi vào action-items: "Design xác nhận expected height — nếu thực short content thì OK, nếu bg bị cắt thì patch".

**Quyết định:** defer, không đoán. Tôi không có quyền sửa component shared chỉ vì điểm ảnh mơ hồ.

---

## Process gotcha — reuseExistingServer dính server cũ

Lúc chạy Playwright visual pass, config có `reuseExistingServer: !process.env.CI`. Dev server ở :3000 từ project khác (saa-app hoặc khác) → Playwright không start server mới, dùng lại cái cũ.

Kết quả: 6 screenshot PNG byte-identical (không thể xảy ra cho 2 app khác). Capture sai app.

**Fix:** Playwright config `E2E_PORT` env:
```typescript
baseURL: `http://localhost:${process.env.E2E_PORT || 3000}`
```

Gọi `E2E_PORT=3100 pnpm test:e2e` → Playwright force port mới.

Bài học gắt: `reuseExistingServer` là footgun local khi có nhiều dev server. Spec đã ghi (từ earlier entry), nhưng trap lại. Kiến thức này _vào docstring_ hoặc _thành CI check_ nếu không.

---

## Kết quả

| Command | Kết quả |
|---------|---------|
| `pnpm test:e2e` (all) | 103 pass, 3 skip ✓ |
| `pnpm test:unit:coverage` | 175 tests, 100% ✓ |
| `pnpm lint --max-warnings 0` | exit 0 ✓ |
| `pnpm format:check` | exit 0 ✓ |
| `pnpm typecheck` | exit 0 ✓ |
| `pnpm build` | exit 0 ✓ |
| Reviewer audit | 9/10 ✓ |

8 file thay: `hero-badge-tier-row.tsx`, `awards-page.tsx`, `site-nav.tsx`, `page.tsx` (awards + home), vi/features/F005/index.md, `.gitignore`, plus 2 non-code.

---

## Quyết định ghi lại

1. **Geometry verify**: Visual contract presence assertion + frame coordinate cross-check. "Exists" ≠ "positioned right".
2. **Consistency = pattern not proof**: Comment claim cần re-verify source mỗi lần. Commit message không phải evidence.
3. **Node field priority**: `character` (content) before `itemName` (layer label). Doc said nên CI enforce.
4. **State match**: Screenshot so sánh design chỉ valid khi app state = design state (auth, locale, scroll). Lazy-load là feature.
5. **Defer when mơ hồ**: 1 pixel khác có thể volume khác, không defect. Phải design confirm.
6. **reuseExistingServer gotcha**: Local multiple servers → nó dính cũ. Force `E2E_PORT` override hoặc CI luôn.

---

## Còn mở

1. **Hero keyvisual height** — Design xác nhận `/awards` expected height vs actual volume
2. **3 copy string unreviewed** — `profile.hero.fallbackName`, `profile.kudos.empty{Received,Sent}` design so sánh lại
3. **Visual baseline automation** — Pixel-diff CI chưa có (hiện eyeball + screenshot)
4. **Lazy-load E2E practice** — Scroll + image ready assertion nên standard ở test setup

---

**Evidence**: Branch `fix/momorph-ui-fidelity`; all 5 screen nodes cross-checked geometry; 8 commits; `pnpm test:e2e` 103/106, `pnpm test:unit` 175 @100%; typecheck/lint/build clean; reviewer 9/10 unblocked.

**Status:** DONE
**Summary:** UI fidelity audit 5 MoMorph screens complete. 3 defects fixed (layout flex-col→row, Awards caption consistency retract, nav label itemName→character), 2 findings retracted (lazy-load + auth state mismatch), 1 defer confirmed (hero height needs design input). 103 e2e / 175 unit passed; lint/format/typecheck/build clean; reviewer 9/10. Lessons: geometry verify, document claim re-check, field priority, state match, defer when mơ hồ, reuseExistingServer gotcha.
**Concerns:** None blocking. Deferred: hero height design confirm, copy review, visual baseline CI. 

**Journal path:** `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/docs/journals/260907-1624-momorph-ui-fidelity-audit-five-screens-layout-consistency-naming.md`
