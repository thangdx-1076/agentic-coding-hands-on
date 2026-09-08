---
title: "Homepage Widget Button FAB (F003 revision) — three RED cycles, test bugs vs code bugs, locator trap, React identity survived"
date: 2026-09-08
time: "11:03 → 12:22"
tags: [momorph, feature-F003-revision, e2e-red-first, test-bugs, locator-traps, react-identity, evidence-gate-schema]
severity: medium
---

# Tóm tắt

F003 (Homepage) revision: pill thu gọn 106×64 ("quick actions" FAB) đã đúng; task là thay menu suy diễn (2 item không design) bằng panel được design (Thể lệ → /standards, Viết KUDOS → /kudos, trigger morph pill↔× đỏ 56×56). Đặc điểm: tester viết RED test file nhưng test file chứa **3 lỗi độc lập** — không lỗi code mà lỗi **test**. Đầu tiên là strict-mode violation ở locator, tiếp theo là container filter khớp mọi tổ tiên (không phải widget), cuối cùng là `.right` không tồn tại trên `boundingBox()` (API misuse). Mỗi lỗi một RED cycle đặc hiệu: riêng TC ID-36 fail ở line 50, TC37 fail ở line 155, TC36 lại fail ở line 109 lần này. Cùng lúc tôi sửa `en.json` sai (để "Viết KUDOS" tiếng Việt thay vì "Write KUDOS"), nhớ đó là tôi chứ không phải tester — lỗi của orchestrator khi ghi chỉ thị mà không kiểm lại. Cổng kiểm chứng RED→GREEN ghi danh tất cả 3 lỗi test đó (**tester fix**, không code), và 5/5 e2e PASS. Reviewer 9/10, 0 critical. **Bài học cắt xuất:** khi RED tệ hại, hãy đọc **vì sao** nó đỏ (trace line number), không chỉ "test fail" — mỗi RED không nhất thiết là code chưa xong. File lớn nhất `widget-button.tsx` 151 dòng (cap 200). Evidence gate SEALED first try (schema tường minh hơn lần trước).

---

## Bẫy 1: Strict-mode violation, locator khớp cả wrapper span

**Triệu chứng**: TC36 báo RED tại dòng 50, assertion `locator("span").filter({ hasText: "/" }).toBeHidden()`.

```ts
Error: expect(locator).toBeHidden() failed
// Line 50: strict-mode violated — multiple span match
```

Nguyên nhân: `locator("span").filter({ hasText: "/" })` vừa khớp wrapper span (chứa pill content) vừa khớp span con chứa `/` text. Filter tạo ambiguity → playwright reject.

Vá: Tester sẽ viết `locator('span:has-text("/") >> nth=1')` hoặc thêm role/data-testid để scope. **Lỗi test, không lỗi code.**

---

## Bẫy 2: Container locator quét mọi div tổ tiên

**Triệu chứng**: TC37 RED tại `expect(await widgetContainer.locator("button").count()).toBe(1)`.

```ts
const widgetContainer = page.locator("div").filter({ has: widgetTrigger });
expect(await widgetContainer.locator("button").count()).toBe(1);
// → đếm ra 2 thay vì 1
```

Nguyên nhân: `page.locator("div").filter({has: trigger})` khớp **mọi div tổ tiên** của trigger. Div gốc `home-screen.tsx` bọc cả `SiteHeader` → `LanguageSelector` chứa một `<button>`. Orchestrator đo thực: nút trigger 1 + nút language selector 1 = 2 tổng.

Bẫy: Phương án "fix" ban đầu (của orchestrator) là restructure `home-screen.tsx` thành fragment → `<WidgetButton>` thành sibling → mất `montserrat.variable` font inheritance → phải import `next/font` vào client component → **3 thay đổi cấu trúc trên trang đã ship & review**, toàn để lách một locator sai.

Vá thực tế (mà orchestrator rồi chấp nhận): thêm `data-testid="home-widget-fab"` vào wrapper `fixed` → locator thay đổi thành `page.getByTestId("home-widget-fab")`. **Lỗi test (locator strategy), không phải lỗi code.**

Bài học cắt: bất cứ khi test yêu cầu restructure code, nghi ngay — test hay code sai? Ở đây là test.

---

## Bẫy 3: API misuse — `boundingBox().right` không tồn tại

**Triệu chứng**: TC36 fail lần thứ ba, tại dòng 109, `expect(menuBox!.right).toBeGreaterThan(...)`.

```ts
Error: TypeError: Cannot read property 'right' of undefined
```

Nguyên nhân: Playwright `boundingBox()` trả `{x, y, width, height}`, **không có `.right`**. Tester viết sai API.

Vá: `expect(menuBox!.x + menuBox!.width).toBeGreaterThan(...)` (right edge = x + width).

**Cái này là lỗi test thuần túy** — TypeScript lẽ ra phát hiện được ngay khi `pnpm typecheck`, nhưng file test được ghi vào projects diff mà không bắt buộc typecheck trước khi gửi (lỗi quy trình, không tester lỗi). Orchestrator `pnpm typecheck` bắt được: `error TS2339: Property 'right' does not exist`.

---

## Sự thật khác: Tôi sửa copy sai

**Triệu chứng**: Tôi dặn tester để "Viết KUDOS" **tiếng Việt** trong **cả hai locale** `vi.json` + `en.json`, viện dẫn tiền lệ `standards-footer-actions.tsx`.

**Gốc rễ của lỗi**: Tôi **không kiểm giá trị `en`** của file đó. Thực tế:
- `standards.footer.writeKudos` → en = **`"Write KUDOS"`**
- `profile.stats.writeKudos` → en = `"Write Kudos"` (khác)
- `kudos.compose.ariaLabel` → en = `"Write Kudos"`

Để tiếng Việt "Viết KUDOS" trong `messages/en.json` là **lỗi người dùng thấy được**.

**Sửa**: `writeKudosItem` → en = `"Write KUDOS"` (viết hoa như tiền lệ gần nhất).

Bài học: khi viện dẫn tiền lệ, **phải đọc tiền lệ**, không nhớ nó. Orchestrator ghi chỉ thị mà không verify là lỗi.

---

## Ba lỗi test, ba RED cycle riêng biệt

| Lỗi | TC | Dòng | Assertion | Root cause | Vá |
|---|---|---|---|---|---|
| Bẫy 1 | TC36 | 50 | strict-mode `span.filter({hasText: "/"})` | locator ambiguous | scope span chính xác, bỏ filter |
| Bẫy 2 | TC37 | 155 | `page.locator("div").filter({has: trigger})` count | div tổ tiên + language button | dùng `data-testid` |
| Bẫy 3 | TC36 | 109 | `menuBox!.right` | API misuse | dùng `menuBox!.x + menuBox!.width` |

Mỗi cái riêng: không cái nào trigger cái khác, không cái nào dùng chung root cause. Nếu tester không fix bẫy 1, ta sẽ không thấy bẫy 2. Nếu không fix 2, sẽ không reach 3.

---

## Điều đặc biệt: Bẫy 2 là lúc tôi gần nhất sụp đổ

Orchestrator (tôi) xem TC37 RED ở `buttonCount !== 1` rồi đề xuất: **fragment `home-screen.tsx`**.

Đó sẽ là:
- Div gốc mất → font variable mất
- Phải import `montserrat` vào client component `widget-button.tsx` (phản pattern)
- `<WidgetButton>` từ child thành sibling
- Toàn bộ **cấu trúc cây thay đổi** trên trang đã ship & review

Ba thay đổi cấu trúc, **toàn để lách một cái sai locator.**

May mà: tester (bạn) chỉ ra rõ là "sai locator" chứ không phải "sai code" → tôi quay lại đọc test file → thấy `page.locator("div").filter({...})` khớp quá rộng → **bác phương án fragment, fix test đó**.

Nếu không có cái "may mà" đó (tester nói sai locator), tôi sẽ commit cấu trúc lệch vào main. Bài học: **tester không chỉ run test, phải đọc test** — điều gì fail và tại sao, không "test fail → code sai".

---

## Nhân cờ cấu trúc đó, `widget-button.tsx` cho phép React identity survive

Orchestrator lúc đó sợ: `{open && menu}` + `{trigger}` cùng array → React remount trigger khi `open` toggle? → `registerButton` mất node → Escape không trả focus → home.spec TC ID-35 đỏ?

Kiểm lại:
```tsx
<div ref={registerRoot} className="...">
  {open && <div role="menu">...</div>}
  <button ref={registerButton}>...</button>
</div>
```

**React array reconciliation**: `open=false` → children = `[<button>]` (index 0); `open=true` → children = `[<div role="menu">, <button>]` (index 1). Cùng type + cùng position đối xứng → React giữ fiber + DOM node của button. `registerButton` không null, Escape vẫn trả focus. **Không bị remount.**

Sợ hõi không cần. Tiền lệ (Kudos compose) cũng pattern này → home.spec TC35 đã xanh, nên chắc ăn.

---

## Sự thật phía sau các con số: Orchestrator đo thực

Planner (bạn ở phase 02) không chỉ đọc code, mà **đo thực**:
- `buttonCount` = 2 bằng Playwright probe
- Pill size ở `hover:scale-105` = `111.3×67.2` (thay vì 106×64) bằng `boundingBox()`
- Nút × 56×56 khi hover = `58.8×58.8` (sát/vượt ±2px lên flaky)

Những số đó là sự thật, không phải suy diễn. Fix `hover:scale-105` → `hover:shadow-[...]` (không geometry) là cách duy nhất giữ phép đo ±2px không flaky.

---

## Lỗi của doc-writer (không phải tester, không phải code)

Phase 04 là "reconcile spec + docs". Spec draft ghi sai (nút × là button riêng với `aria-label="Hủy"`), clarifications ghi đúng (một button morph, `aria-label` cố định). Doc-writer sửa spec draft theo clarifications nhưng **bỏ sót cập nhật `technical-spec.md:124`**, vẫn nói × là button riêng.

Reviewer bắt được: "70 dòng từ D001 này, lại nói D001 chính là X → tình trạng xung đột". Doc-writer ghi rõ là "machine-owned section, regenerate-only" nên đó là sự cẩn thận của generator, không phải doc-writer lỏng lẻo.

Gửi lại với ghi chú, doc-writer: "Đã đọc guardrail, nó cản tay edit, nhưng ở đây tôi nên cập nhật thủ công vì là thay đổi quyết định công khai". Tìm ra 2 lỗi nữa ở cùng chỗ, fix toàn bộ. Append ở `action-items.md` rằng quyết định D001 đã được phục hồi trong spec.

---

## Evidence gate schema, lần này clear ngay

Orchestrator học từ session Addlink Box (260908-1040): evidence gate **không phải content check, là schema check**. 6 key trong `study-context.json`, structure của `temper-results.json`, verbatim echo của criterion trong `inspection-verdict.md`.

Session này: setup đúng từ đầu → SEALED first try. Không reshape lần 2.

---

## Công nợ: append-only decision log cần superseding entry

`plans/action-items.md` là append-only per CLAUDE.md rule. Orchestrator ở 1125 viết: "restructure `home-screen.tsx`, font var thay đổi — **bắt buộc**".

Phase 02 bác quyết định đó, fix bằng `data-testid` thay vì fragment.

**Vấn đề**: decision log ghi "restructure bắt buộc" nhưng không ghi "bác → dùng testid thay thế". Nếu người đọc chỉ see entry 1125, sẽ thực thi sai quyết định.

**Vá**: append entry mới ở 1200 (thời điểm fix): "Bẫy 2 fixed via `data-testid`, không fragment — entry 1125 superseded."

---

## Thống kê

| Metric | Value |
|--------|-------|
| Files created | 4 (icon-close, icon-sun-logo + stories) |
| Files edited | 9 |
| `widget-button.tsx` lines | 151 (cap 200) |
| E2E tests created | 5 (TC 36-40) |
| E2E tests RED → GREEN | 5/5 (tester fixed 3 test bugs) |
| Unit tests passed | 536/536 |
| Baseline regression (`home.spec.ts`) | 0 (27/27 still pass) |
| Reviewer score | 9/10 |
| Critical findings | 0 |
| Medium findings | 1 (action-items.md stale entry) |
| Evidence gate | SEALED (first try) |

---

**Evidence**:
- Clarifications: `plans/260908-1103-home-widget-fab/clarifications.md` (nơi ghi quyết định chốt, override spec draft)
- Study: `reports/study-260908-1103-home-widget-fab.md` (đo thực số liệu)
- RED: `reports/tester-260908-1103-red-evidence.md` (5 test, 4 failed; 3 fail = test bugs)
- GREEN: `reports/tester-260908-1200-green-evidence.md` (tester fixed 3 test bugs + 1 orchestrator en.json sai)
- UI impl: `reports/momorph-ui-260908-1146-fab-expanded.md` (traps handled, verification)
- Reviewer: `reports/reviewer-260908-1204-fab-expanded.md` (9/10, no critical, stale decision flag)

**Status:** DONE
**Summary:** F003 revision shipped: inferred menu → designed panel (Thể lệ, Viết KUDOS, × morph). 5/5 e2e GREEN after tester fixed 3 independent test bugs (locator ambiguous, container filter too wide, `.right` API misuse) + orchestrator corrected copy (en.json). Reviewer 9/10 no critical. React identity strategy survived. Evidence gate SEALED first try. Three RED cycles each exposed a **test bug, not code bug** — reading line numbers and root cause matters more than "test fail".
**Concerns:** `plans/action-items.md` contains stale, reversed decision (1125 entry on restructure `home-screen.tsx` marked "bắt buộc") that was superseded by fixing the test locator instead. Append a corrective entry before merge to avoid future misreading.

