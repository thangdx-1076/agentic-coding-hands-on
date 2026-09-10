---
title: "Kudos Hero Profile Search (F-patch) — three search surfaces, only one broken; infrastructure existed, wiring was missing; weak RED → strong RED by reading the code"
date: 2026-09-10
time: "17:28 → 17:47"
tags: [feature-patch, bug-fix, e2e-red-first, infrastructure-reuse, test-RED-proof, typescript-prevention]
severity: medium
---

# Tóm tắt

User báo: "tính năng tìm kiếm profile sunner khác chưa hoạt động đúng" (`/kudos` hero band có ô search placeholder "Tìm kiếm profile Sunner" nhưng gõ vào không có gì xảy ra). Khám phá: app có **3 ô search**, chỉ 1 cái sập. Cái sập là pill hero ngoài cùng — render `readOnly`, không state, không handler. Docblock cùng file ghi lý do lúc ship: "design chưa có frame cho danh sách kết quả, nên wiring handler sẽ no-op hoặc điều hướng tới cái không tồn tại". **Nhưng** toàn bộ hạ tầng để chạy nó **đã tồn tại sẵn**: Server Action `searchSunners`, hook debounce `useSunnerSuggest`, dropdown `KudosSunnerOptions`, route `/profile?id=` + resolver, không cần viết layer mới. **RED proof kỳ lạ nhất**: viết test với selector mới `[data-testid=kudos-hero-search-input]` + chạy trên code cũ = RED nhưng vì selector không tồn tại, không phải vì bug thực. Phải retarget vào container pre-existing `[data-testid=kudos-hero-search-pill] input` thì RED mới chứng minh đúng lỗi ("không thể gõ vào"). **Phòng chống regression**: đổi props thành required (query, onQueryChange, options, isOpen, onSelect, onDismiss, onSubmit) — TypeScript không cho render thành ô chết nữa. **7 gate all exit 0**: typecheck, eslint --max-warnings 0, prettier, unit 808 test 100% coverage, e2e kudos 31 pass, profile 22 pass, next build, storybook build. Reviewer SEALED 9/10, 0 finding. **No e2e contract từ trước** (grep hero-search = 0 hit) — lỗi này chờ contract được viết.

---

## Sao chẩn đoán không hiển nhiên?

App có ba search-ish surface nhưng không ai báo "nên sửa cái nào":

| Surface | UI tên | Trạng thái | Để làm gì |
|---|---|---|---|
| **Hero pill** (KV band) | "Tìm kiếm profile Sunner" | 🔴 chết (readOnly) | Mở profile Sunner **khác** |
| **Spotlight** (highlight scatter) | "Tìm kiếm" (top-right) | 🟢 hoạt động | Lọc tên **trên scatter, không** mở profile |
| **Compose dialog** (người nhận) | Combobox recipient field | 🟢 hoạt động | Chọn người nhận kudo, **không** mở profile |

Đó là bề ngoài. Đề bài user chỉ nói "tính năng tìm kiếm profile sunner khác", không nói ở đâu. Phần chẩn đoán (debugger) đọc placeholder text ("Tìm kiếm profile Sunner") rồi grep cả app, thấy **chỉ có ô pill hero** mang nhãn đó → đó là cái sập.

---

## Cái kỳ lạ: có sẵn docblock giải thích sao nó chết

File `src/app/(public)/kudos/_components/kudos-hero-search-pill.tsx` dòng 23–27 (bản cũ):

```typescript
/**
 * Readonly like the compose pill: the Sunner-profile search this opens has
 * no Figma frame in this file, so wiring a handler would either no-op or
 * navigate somewhere that does not exist. Distinct from the Spotlight's own
 * search (kudos-sunner-search.tsx, mm:2940:14833), which filters the
 * scatter that is already on screen and IS wired.
 */
```

**Thực tế là đó là một quyết định lịch sử** — khi mở UI đầu tiên, MoMorph screen không có frame cho danh sách kết quả, nên implement mới không có cơ sở design → để nguyên đơn. **Nhưng người dùng thấy ô search, nên gõ vào nó** (UX như vậy là: ô nhận input, thường sẽ làm gì đó). Lỗi không phải ở code, mà ở **contract**: ô nào nhìn như input thì phải nhận input.

---

## Hạ tầng toàn bộ tồn tại sẵn, chỉ thiếu wiring

Để chạy hero search:

- **Server Action `searchSunners`** (`_actions/search-sunners.ts`) → query DB `profile_cards` (RLS `authenticated`), cap 128, return `SunnerSuggestion[]`. ✅ Đã có, dùng chung ở combobox người nhận.
- **Hook `useSunnerSuggest`** (`_hooks/use-sunner-suggest.ts`) — debounce query, tránh stale response (sequence ref), chỉ gọi khi logged in. ✅ Đã có, lấy tư combobox người nhận.
- **Component `KudosSunnerOptions`** (`_components/kudos-sunner-options.tsx`) — dropdown hiển thị `SunnerSuggestion[]`, testid tham số hoá để tái dùng. ✅ Đã có, combobox người nhận dùng rồi.
- **Route `/profile?id=`** → `parseProfileId()` resolver (5 branch: self/reject/canonical/other). ✅ Đã có, link từ card person + leaderboard dùng đúng rồi.

**Scope FIX**:
- `_hooks/use-hero-profile-search.ts` (mới, 100+ dòng) — query cap, gọi `useSunnerSuggest`, mở/đóng dropdown, Enter mở kết quả đầu, select → push `/profile?id=`
- `_hooks/use-hero-profile-search.test.ts` (mới, 10 test) → cover 100%
- `_components/kudos-hero-profile-search.tsx` (mới, wrapper) — client component giữ state, map `SunnerSuggestion` → `KudosSunnerOption`, pass callback vào pill
- `_components/kudos-hero-search-pill.tsx` (sửa) — bỏ `readOnly`, props trở thành **required** (query, onQueryChange, options, isOpen, onSelect, onDismiss, onSubmit)
- `_components/kudos-keyvisual-band.tsx` (sửa) — render wrapper, truyền `isSignedIn`
- `_shared/build-kudos-copy.ts` (sửa) — thêm type `KudosHeroSearchCopy`, 3 key: loading, empty, signInHint
- `messages/{vi,en}.json` (sửa) — i18n copy
- `_components/kudos-hero-search-pill.stories.tsx` (sửa) — 4 story (default, results, loading, anonymous)
- `tests/e2e/kudos.spec.ts` (sửa) — C30, C31, C32

Không có Server Action mới, không có migration, không có schema change. Pure wiring.

---

## RED proof gặp trap, rồi thoát ra

### Lần 1: Weak RED (selector mới không tồn tại)

Tester viết contract C30 như sau:

```typescript
const input = page.locator("[data-testid=kudos-hero-search-input]");
await expect(input).toBeVisible();
await expect(input).not.toHaveAttribute("readonly", /.*/);
```

Chạy trên code HEAD (bản cũ, pill vẫn readOnly): **RED** — selector không tồn tại nên `locator` resolve về `<no elements>`, `.toBeVisible()` fail.

**Vấn đề**: RED xảy ra vì selector tìm không ra, không phải vì bug thực (input là readonly). Nếu chỉ thay cái selector thôi, mà bỏ qua fix code, sẽ bị nhầm lẫn **"test fail = selector không match"** vs. **"test fail = bug thực tế"**.

### Lần 2: Retarget → Strong RED (container pre-existing, input property failed)

Reviewer / orchestrator phát hiện → điều chỉnh C30 lại:

```typescript
// Container tồn tại cả ở bản lỗi lẫn fix
const input = page.locator("[data-testid=kudos-hero-search-pill] input");
await expect(input).toBeVisible();
await expect(input).not.toHaveAttribute("readonly", /.*/);  // ← RED ở đây
```

Chạy trên code HEAD (pill readOnly): **RED** vì `readonly` attribute thật sự tồn tại. Đó mới là chứng minh thực.

### Verification: revert code, giữ test → RED still fire

Để chắc chắn contract không vacuous, revert `kudos-hero-search-pill.tsx` + `kudos-hero-profile-search.tsx` về HEAD (undo fix), chạy lại C30/C31:

```
C30 ✘ Error: expect(locator).not.toHaveAttribute("readonly", /.*/])
      → <input readonly type="text" .../>
C31 ✘ Test timeout: dropdown [data-testid=kudos-hero-search-options] không tồn tại
```

RED vẫn đúng. Sau đó apply code mới lại → C30/C31/C32 xanh. **Đó** mới là proof.

---

## Phòng chống regex

| Lớp | Cách |
|---|---|
| **TypeScript** | Props pill giờ **bắt buộc**: `query: string`, `onQueryChange: (v: string) => void`, `options: KudosSunnerOption[]`, `isOpen: boolean`, `loadingLabel: string`, `emptyLabel: string`, `onSelect`, `onDismiss`, `onSubmit`. Nếu ai try render `<KudosHeroSearchPill placeholder="..." ariaLabel="..." />` (quên hết callback), typecheck sẽ fail. Không sao quên lại. |
| **e2e contract** | C30 assert input không readonly + nhận chữ. C31 anonymous case → hiện gợi ý đăng nhập (RLS guard thực). C32 logged-in → chọn result → `/profile?id=<uuid>` + profile render. |
| **Unit coverage** | 10 test trong `use-hero-profile-search.test.ts`, 100% coverage. Đặc biệt cover stale-response guard (sequence ref) từ `useSunnerSuggest` mà reuse từ combobox. |
| **Silent failure** | `/kudos` public route, `searchSunners` return `[]` nếu khách chưa login (RLS check server-side). Hook wrapper kiểm `isSignedIn`, swap `emptyLabel` → gợi ý đăng nhập thay vì "không tìm thấy". User ẩn danh sẽ hiểu "tôi phải login" chứ không hiểu "không có Sunner tên này". |

---

## Đáng chú ý

**Design gap**: MoMorph chưa có frame riêng cho dropdown của hero pill (giống y như combobox người nhận). Đang mượn nguyên `KudosSunnerOptions` (màu kem, layout trùng). Sau này nếu có frame thì chỉ cần custom lại combobox thôi, hook không đổi.

**Không có e2e coverage từ trước**: `grep hero-search tests/` = 0 hit trước fix. Lỗi này sống sót vì **không có test yêu cầu nó hoạt động**. Bây giờ có C30/C31/C32.

**Cú fall back ngôn ngữ**: `messages/en.json` vẫn giữ placeholder tiếng Việt "Tìm kiếm profile Sunner" (copy paste lỗi từ lúc build UI). Không sửa trong PR này vì scope là "fix functionality", không phải "hoàn chỉnh i18n". Để nợ lại.

---

## 7 gate all exit 0

| Command | Status | Note |
|---|---|---|
| `pnpm run typecheck` | ✅ 0 | No error |
| `pnpm lint --max-warnings 0` | ✅ 0 | Note: `pnpm run lint -- --max-warnings 0` (with `--`) fails because eslint reads `--max-warnings` as a file path; must use bare `--max-warnings 0` |
| `npx prettier --check .` | ✅ 0 | |
| `pnpm run test:unit:coverage` | ✅ 0 | 83 file, 808 test, coverage 100% (unit includes use-hero-profile-search + pill + wrapper) |
| `pnpm run test:e2e tests/e2e/kudos.spec.ts` | ✅ 0 | 31 pass, 1 skip (pre-existing C03 defer) |
| `pnpm run build` | ✅ 0 | Next production build, no error |
| `pnpm run build-storybook` | ✅ 0 | Storybook build + 4 new story |

**Companion suites** (cạnh `/kudos`):
- `pnpm run test:e2e tests/e2e/profile.spec.ts` — 22 pass (unchanged, `/profile?id=` resolves correctly)
- Live manual: `/kudos` page load, hero pill dropdown no longer readonly ✅, type "Nguyễn" → suggestions appear ✅, click one → navigate to `/profile?id=<uuid>` ✅, profile page render ✅

**Reviewer**: SEALED, score 9/10 (medium). `contractStatus: OK`. Zero finding.

---

## Bài học mõi

**Contract quan trọng hơn implementation.** Pill từng readOnly và không ai phát hiện vì **không có contract nói phải gõ được**. Cẩn thận: "không có test bắt lỗi" ≠ "lỗi không tồn tại"; nó chỉ có nghĩa "chưa ai định nghĩa hành vi kỳ vọng". Khi có ô input mà không có e2e contract "input phải nhận typing", nó yên tĩnh chết được hàng tháng.

**RED proof = selector mà trỏ tới hành vi lỗi, không phải selector mà tìm code mới.** Weak RED là "cái selector mới không tồn tại". Strong RED là "cái pre-existing lại chứng minh đúng bug (readonly)". Khi viết test trước, phải đặt selector trỏ vào **cái existing** và nếu fix không update DOM shape, selector sẽ vẫn tìm ra lỗi cũ.

**Reuse tốt hơn dựng lớp mới.** Toàn bộ hạ tầng (Server Action, hook, dropdown, navigation) đã work, chỉ thiếu wiring. Tester thường nói "viết thêm code mới", nhưng ở đây code mới chỉ là wrapper + hook — core logic không.

**TypeScript required props = regression firewall.** Thay vì dựa vào "ai nhớ gọi callback", code yêu cầu nó phải có. Không tồn tại "quên handler nữa" — build fail thôi.

---

## Artifacts

- Plans: `plans/reports/260910-1728-hero-sunner-profile-search/` (diagnosis)
- Fix report: `plans/reports/260910-1747-hero-sunner-profile-search-fix.md`
- Evidence: study-context.json, temper-results.json, inspection-verdict.json (all in diagnosis folder)
- Source: `src/app/(public)/kudos/_hooks/use-hero-profile-search.ts` (hook mới), `src/app/(public)/kudos/_components/kudos-hero-profile-search.tsx` (wrapper)
- Test: `tests/e2e/kudos.spec.ts` C30/C31/C32 (126 dòng thêm)

---

**Status:** DONE
**Summary:** Hero profile search pill fixed (3 search surfaces, only the hero pill broken because it was readOnly with no state/handler). All infra existed (`searchSunners` SA, `useSunnerSuggest` hook, `KudosSunnerOptions` dropdown, `/profile?id=` navigation); only wiring was missing. RED proof had weak start (new selector didn't exist on old code) but retargeted to pre-existing container to prove real bug (input is readonly). TypeScript-required props prevent regression. 7/7 gates exit 0 (typecheck/lint/unit 100%/e2e 31 pass/build/storybook green). Reviewer SEALED 9/10. No prior e2e contract (grep hero-search = 0 before fix).
**Concerns:** Design has no frame for hero-search dropdown (reusing KudosSunnerOptions shape; will adjust if Figma frame added). English i18n placeholder still Vietnamese ("Tìm kiếm profile Sunner") — left for a future pass. No landing detection (user mistake can enter 200+ chars before cap, test verified but cap is safety, not feedback).
