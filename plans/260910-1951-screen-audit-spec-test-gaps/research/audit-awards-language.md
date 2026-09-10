# Audit — Award System page + Language Switch vs MoMorph specs

Date 2026-09-10 · read-only audit, no `src/` change.
fileKey `9ypp4enmFmdK3YAFJLIu6C` · testPolicy `e2e-red-first` (audit only, nothing implemented).

Authoritative data pulled verbatim into `../momorph/`:

| screen | frame | specs | test cases |
|---|---|---|---|
| `zFYDgyj_pD` Hệ thống giải | `frame-zFYDgyj_pD.md` | `specs-zFYDgyj_pD.csv` (23 rows) | `test-cases-zFYDgyj_pD.csv` (15 rows ID-0..ID-14) |
| `hUyaaugye2` Dropdown-ngôn ngữ | `frame-hUyaaugye2.md` | `specs-hUyaaugye2.csv` (3 rows A, A.1, A.2) | **0 rows** — `download_test_cases` → `status:empty` (`test-cases-hUyaaugye2.EMPTY.txt`) |

Baseline: `pnpm test:unit` → 83 files / 808 tests passed. No vacuous test found in the
audited files (assert counts: `awards.spec.ts` 13 tests/40 asserts, `use-award-category-nav.test.ts`
10/18, `scroll-spy.test.ts` 6/6, `home.spec.ts` 27/81, `login.spec.ts` 30/74). The single
`.catch(() => {})` at `tests/e2e/login.spec.ts:263` is a deliberate fire-and-forget click in an
OAuth test that still asserts afterwards — not vacuous.

---

## Screen `zFYDgyj_pD` — Hệ thống giải (`/awards`)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP** | 20/23 rows map to code. Caption typography contradicts row `A`; desktop active indicator contradicts rows `C`/`C.1`; hero alt text contradicts row `3`; rows `3.2`/`7.4` carry no describable content. |
| Logic | **PASS** | Row `B`/`C` transitionNote (smooth scroll + active) `_hooks/use-award-category-nav.ts:113-126`; reduced-motion `:117-119`; click-beats-observer lock `:114,123-126`; invalid-slug guard `:109-111`; row `D2.1` → `/kudos` `_components/awards-screen.tsx:118` (route now exists at `src/app/(public)/kudos/page.tsx`); fail-open `src/dal/awards.ts:1-13`. |
| Test coverage | **GAP** | 10/15 TC mapped. ID-2, ID-10, ID-12, ID-14 unmapped; ID-1 superseded by a recorded decision. ID-4 and ID-13 map to tests that assert less than the TC states. |

Rows that do map cleanly: `3` hero (`awards-screen.tsx:56,75-82`), `A` heading gold
(`:93-95`), `B` container (`:99-113`), `C`+`C.1..C.6` six nav items (`award-category-nav.tsx:63-83`,
data-driven from `getAwards`), `C.1` leading icon (`:78`), `D.1.1` 336×336 image
(`award-section.tsx:48`), `D.1`/`D.1.2` and `D.2`..`D.6` one shared template
(`award-section.tsx:36-153`), `D1`/`D2`/`D2.1` Kudos block (`awards-screen.tsx:118`).

---

## Feature `hUyaaugye2` — Dropdown chọn ngôn ngữ

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP** | Row `A.2` demands a UK flag on the EN option — no such icon exists anywhere (`grep -rl 'UkFlag\|GbFlag\|EnFlag'` over `src/` → no match). Menu items render label text only, no flag (`language-selector.tsx:95`), against rows `A.1`/`A.2`. Button flag is hardcoded `IconVnFlag` (`:62`) so EN shows the Vietnam flag. No selected-item styling, against row `A.1`. |
| Logic | **GAP** | Locale set vi/en matches spec (`lib/i18n/locale.ts:9`, `language-selector.tsx:16-19`); open/close and select-then-close correct (`use-menu-keyboard-nav.ts:120-126`, `language-selector.tsx:39-42`); cookie persistence correct (`_actions/set-locale.ts:26-34`). But `messages/en.json` still holds 7 Vietnamese values, so "cập nhật ngôn ngữ giao diện" (row `A.2`) is only partly true. |
| Test coverage | **UNVERIFIABLE → GAP** | The screen has **zero** MoMorph test cases, so no TC_ID matrix can be built for it. No `tests/e2e/language-switch.spec.ts` (confirmed absent). No unit test beside `language-selector.tsx`. Real behaviour is covered only incidentally by other screens' TCs, and cookie persistence across a reload is asserted nowhere. |

Incidental coverage that does exist: `tests/e2e/home.spec.ts:368` `[TC ID-25, ID-26]` switches
EN↔VN and asserts copy + button label; `tests/e2e/login.spec.ts:133` menu opens with VN+EN items;
`tests/e2e/login.spec.ts:355-575` ~10 keyboard-nav cases; `tests/e2e/standards.spec.ts:375` C13
`NEXT_LOCALE=en`; `tests/e2e/awards.spec.ts:367` REG EN locale renders content. Unit:
`src/app/_actions/set-locale.test.ts` (4 tests, incl. path-traversal normalization),
`src/lib/i18n/locale.test.ts` (8), `src/lib/i18n/messages-parity.test.ts` (2),
`src/app/_hooks/use-select-locale.test.ts`, `src/utils/a11y/roving-index.test.ts` (10).

---

## Gaps

### 1. `severity: major` — EN locale shows the Vietnam flag
Spec `hUyaaugye2` row `A` ("Selected: … cờ Việt Nam + 'VN'") and row `A.2` ("Icon: cờ Anh (bên
trái)") require the flag to track the locale. `src/app/_components/language-selector/language-selector.tsx:62`
renders `<IconVnFlag />` unconditionally, so `label="EN"` yields a Vietnam flag next to "EN".
No UK/GB flag component exists in `src/` at all. `language-selector.stories.tsx:43-47`
(`English` story) pins the wrong visual, and `docs/vi/features/F002_LanguageSwitch/functional-spec.md:94`
codifies it as intended ("hiển thị cờ Việt Nam + nhãn 'VN' hoặc 'EN'").
**Fix:** add `icon-uk-flag.tsx` beside `icon-vn-flag.tsx` and pick the icon from the locale
instead of hardcoding, then correct the story and the F002 line.

### 2. `severity: major` — dropdown options render no flag icon
Rows `A.1` ("Hiển thị: - Cờ: icon - Mã: 'VN'") and `A.2` ("Icon: cờ Anh (bên trái)") both put a
flag inside each option. `language-selector.tsx:85-97` renders `{option.label}` only.
**Fix:** render the per-locale flag icon before the label inside the `menuitem` button.

### 3. `severity: major` — no selected state on the open menu
Row `A.1`: "selected có nền khác để phân biệt". Every item in `language-selector.tsx:93` gets an
identical `className`, and there is no `aria-checked`/`aria-current`, so neither sighted nor
assistive users can tell which locale is active while the menu is open.
**Fix:** pass the active locale in, use `role="menuitemradio"` + `aria-checked`, and give the
checked item a distinct background.

### 4. `severity: major` — `messages/en.json` is not fully translated
Row `A.2` promises "cập nhật ngôn ngữ giao diện". 7 leaf values in `messages/en.json` still hold
Vietnamese: `kudos.banner.title`, `kudos.compose.placeholder`, `kudos.heroSearch.placeholder`,
`kudos.heroSearch.ariaLabel`, `kudos.spotlight.searchPlaceholder`, `kudos.feed.empty`,
`kudos.sidebar.emptyBoard`. `src/lib/i18n/messages-parity.test.ts` only compares key sets
(193/193) so it passes regardless.
**Fix:** translate those 7 values, and extend the parity test to fail when an `en.json` value
carries Vietnamese diacritics.

### 5. `severity: major` — locale persistence never verified in a browser
The spec's whole point is that the choice sticks. `set-locale.ts:30-34` is only proven by a
mocked unit test (`set-locale.test.ts:27-38`); no e2e test reloads the page after switching
(`grep -n "page.reload" tests/e2e/*.ts` → only `notifications.spec.ts:581`, unrelated).
`home.spec.ts:368-405` switches and asserts immediately, in-session.
**Fix:** add `tests/e2e/language-switch.spec.ts` that switches to EN, reloads, and asserts both
the `NEXT_LOCALE` cookie (value, `maxAge` 31536000, `sameSite` lax) and that EN copy survives.

### 6. `severity: major` — caption typography contradicts spec row `A`
Row `A`: subtitle "Sun* annual awards 2025" is "(small; muted text)"; TC ID-4 repeats it
("hiển thị nhỏ và nhạt"). `awards-screen.tsx:87-89` renders it `text-2xl leading-8 font-bold
text-white` — 24px, bold, full-white. `awards.spec.ts:23-35` asserts only that the string is
visible, so the deviation is invisible to the suite.
**Fix:** drop the caption to a small muted token (e.g. `text-sm text-white/60`) and assert the
computed size/colour, or get row `A` amended if the render image disagrees with the CSV.

### 7. `severity: minor` — desktop active indicator is a left border, not an underline
Row `C` transitionNote and row `C.1`..`C.6` say "gold color + underline"; TC ID-9 expects
"màu vàng và underline". `award-category-nav.tsx:19-20` gives `border-b` (underline) below `lg`
but `lg:border-b-0 lg:border-l-2` from `lg` — the desktop breakpoint the design actually draws
has no underline. Not covered by `plans/260906-2258-award-system-page/clarifications.md`.
**Fix:** keep the gold underline at `lg` as well, or record the left-rail choice as a decision.

### 8. `severity: minor` — active nav item has no hover feedback
TC ID-10 expects every menu item to highlight on hover. `award-category-nav.tsx:21-22` puts
`hover:bg-white/10` on `LINK_INACTIVE` only; `LINK_ACTIVE` (`:19-20`) has no hover rule, so the
currently-active category stops responding to the pointer.
**Fix:** move `hover:bg-white/10` into `LINK_BASE`.

### 9. `severity: minor` — Top Talent quantity unit diverges from the CSV
Row `D.1`/`D.1.2` state "Số lượng giải thưởng: 10 Đơn vị" and TC ID-6 repeats "Top Talent
(10 Đơn vị, …)". `supabase/migrations/0003_awards_table.sql:64` seeds `'10', 'Cá nhân'`, matching
`plans/260906-2258-award-system-page/spec/award-seed-content.md:27`, which was derived from the
render image under the agreed trust order (render > CSV > text node, clarifications § Đính chính).
The other five awards agree with the CSV.
**Fix:** reconcile on MoMorph — amend row `D.1`/`D.1.2` and TC ID-6 to "Cá nhân"; do not change
the seed.

### 10. `severity: minor` — hero alt text not applied
Row `3` asks for alt text "Keyvisual Sun* Annual Award 2025". `awards-screen.tsx:76-78` sets
`alt=""` + `aria-hidden="true"`. (The same row also calls the banner "Decorative only", so the
CSV contradicts itself; the code picked the decorative reading.)
**Fix:** settle row `3` on MoMorph, then match it in one place.

### 11. `severity: minor` — dropdown option box misses the specified size
Row `A.2`: "Kích thước: 110x56px". The trigger is `h-14 w-[108px]` (56px tall, 108 not 110 wide,
`language-selector.tsx:47`); each option is `px-4 py-2` (`:93`) ≈ 40px tall, inside a
`min-w-[108px]` menu (`:83`).
**Fix:** set the option height to 56px and the width to 110px, or amend row `A.2` if 108 is the
deliberate 4px-grid value.

### 12. `severity: minor` — row `A` "nền xám đậm" not implemented on the trigger
Row `A` describes the selected area as "nền xám đậm" (dark grey background). The trigger has no
resting background — only `hover:bg-white/10` (`language-selector.tsx:57`). The menu's
"nền đen" is honoured (`bg-[#0B0F12]`, `:83`).
**Fix:** give the trigger the dark-grey resting fill from the design.

### 13. `severity: minor` — TC ID-2 has no click-through test
ID-2 requires opening the main menu and clicking "Hệ thống giải". `site-header.tsx:73` renders
`<NavLink href="/awards">`, and `home.spec.ts:164-171` / `:354` assert only `href` attributes on
the CTA and footer links; nothing clicks the header nav item through to `/awards`.
**Fix:** one test that clicks the header nav link and asserts the `/awards` `h1`.

### 14. `severity: minor` — TC ID-12 / ID-14 still recorded as impossible
Both were deferred because `/kudos` did not exist (clarifications § Unresolved). It exists now
(`src/app/(public)/kudos/page.tsx`), so ID-12 is testable and only ID-14's error path remains
open. `awards.spec.ts:37-51` asserts the link is visible but never clicks it.
**Fix:** click "Chi tiết" and assert `/kudos` loads; then close out that debt line.

### 15. `severity: minor` — ID-13 test does not exercise the invalid-section path
ID-13's objective is clicking a nav item for a nonexistent section. `awards.spec.ts:53-69` only
collects `pageerror` during a plain load. The real guard is
`use-award-category-nav.ts:109-111`, covered at unit level
(`use-award-category-nav.test.ts:226` "slug không hợp lệ … không throw") but never end-to-end.
**Fix:** point the ID-13 e2e test at the unit test as its evidence, or drive a bad hash in-browser.

---

## TC coverage matrix — `zFYDgyj_pD`

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| ID-0 | Authenticated user opens the page | `tests/e2e/awards.spec.ts:9` | covered (as anonymous — page is public) |
| ID-1 | Unauthenticated → redirect to login | — | superseded by decision (clarifications § Route; `docs/vi/system/permissions.md:54`) |
| ID-2 | Reach page from main menu | — | **gap** (gap 13) |
| ID-3 | Overall layout / document order | `awards.spec.ts:165` | covered |
| ID-4 | Title + caption format | `awards.spec.ts:23` | weak — text only, not "nhỏ và nhạt" (gap 6) |
| ID-5 | Menu lists 6 items in order | `awards.spec.ts:206` | covered |
| ID-6 | All 6 awards' content | `awards.spec.ts:234` | covered (unit text differs, gap 9) |
| ID-7 | Award image 336×336 | `awards.spec.ts:296` | covered (2 layers, `toHaveCount(2)` — corrected per clarifications) |
| ID-8 | Sun* Kudos banner | `awards.spec.ts:37` | covered |
| ID-9 | Click each of 6 nav items → scroll + active | `awards.spec.ts:319` | partial — 4/6 items, asserts viewport only, no gold/underline |
| ID-10 | Hover highlights a menu item | — | **gap** (gap 8) |
| ID-11 | Exactly one active item after click | `awards.spec.ts:341` | partial — 3/6 items |
| ID-12 | "Chi tiết" opens Sun* Kudos | — | **gap** (gap 14) |
| ID-13 | Invalid section → no JS error | `awards.spec.ts:53` (load only) + `use-award-category-nav.test.ts:226` (unit) | weak (gap 15) |
| ID-14 | Failed navigation → friendly error | — | **gap** (gap 14) |

## TC coverage matrix — `hUyaaugye2`

No matrix can be produced: the frame has **0** test cases on MoMorph while
`spec_status = done`. This is itself the finding — see Unverifiable item 1.

---

## Unverifiable

1. **`hUyaaugye2` TC mapping.** `download_test_cases` returned `status:empty`,
   `test_case_count:0`, so criterion 3 has no authoritative rows to map. The frame also carries
   `screen_overview: null` and `dev_status: "none"` (`frame-hUyaaugye2.md`) — consistent with the
   briefing that no plan in this repo ever referenced it. Ask the spec owner to upload test cases
   before this feature can be signed off.
2. **Exact colours, type scale and spacing.** Neither specs CSV states a hex value, font size,
   weight or padding — only prose ("nền xám đậm", "small; muted", "large; gold", "cờ Anh"). Every
   verdict above is therefore about presence/absence and relative treatment, not measured values.
   Gaps 6, 7, 11 and 12 are raised on prose the CSV does state; anything finer needs
   `get_design_item_image` or the Figma nodes.
3. **Responsive behaviour.** Only row `3` mentions responsiveness ("scale to cover and
   center-crop"). The mobile chip-bar nav and the stacked award layout are recorded inferences
   (clarifications § "Nav trái trên mobile", § "Layout 6 khối giải"), not design data — they
   cannot be judged against a spec that does not exist.
4. **Live DB content.** Award text is read from Supabase (`src/dal/awards.ts`), so the rendered
   values were audited against `supabase/migrations/0003_awards_table.sql` +
   `0004_awards_en_seed.sql`, not a running instance. `pnpm test:e2e` was out of scope for this
   audit (orchestrator owns the dev server).
5. **Row `7.4`** of `specs-zFYDgyj_pD.csv` has an empty `itemId`, `itemName` and `description` —
   nothing to audit. **Row `3.2`** (`313:8466`, "Danh sách nội dung giải thưởng") carries a name
   but no description; the awards list container it names is present at `awards-screen.tsx:103`.
