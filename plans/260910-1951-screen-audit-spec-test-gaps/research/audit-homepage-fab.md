# Audit — Homepage SAA + Floating Action Button vs MoMorph specs

Date: 2026-09-10 · READ-ONLY audit (no `src/`, `tests/`, `docs/` edits)
fileKey `9ypp4enmFmdK3YAFJLIu6C` · testPolicy `e2e-red-first`
Design data saved verbatim under `../momorph/`.

| screen | screenId | specs | test cases |
|---|---|---|---|
| Homepage SAA | `i87tDx10uM` | 46 | 62 |
| FAB expanded ("chức năng 2") | `Sv7DFwBw1h` | 3 | **0** (`status: empty`) |
| FAB collapsed | `_hphd32jN2` | 3 | **0** (`status: empty`) |

`screen_overview` is `null` on all three frames — no screen-level prose exists; behaviour was judged from `description` / `userAction` columns only.

Verification base: `pnpm test:unit` → **83 files / 808 tests passed** (exit 0). `pnpm test:e2e` and `pnpm build` not run (per brief).

---

## Screen: Homepage SAA (`i87tDx10uM`)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP** | Structure matches spec row-for-row (3.5 hero → A1 header → B1 countdown → B2 event → B3 CTA → B4 Root Further → C1/C2 awards → D1/D2 kudos → 6 widget → 7 footer), each node annotated `mm:*` in code. 4 real deviations: header logo **52×48** at `src/app/_components/site-header.tsx:63-66` vs A1.1 + TC ID-8 "64x60px"; C1's third line ("Các hạng mục sẽ được trao giải theo TOP những người xuất sắc nhất.") absent — `src/app/(public)/(home)/_components/awards-section.tsx:35-49` renders caption + divider + heading only, string exists nowhere in `src/` or `messages/`; nav label "Award Information" singular at `src/app/_shared/site-chrome.ts:69` + `messages/{vi,en}.json` `home.nav.awardsInfo` vs A1.3/7.3 "Awards Information"; footer links carry hover only, no active state (`src/app/_components/site-footer.tsx:52-78`) vs row 7 "Hover/active/normal state: tương tự các item ở header". Everything else confirmed: A1 sticky (`site-header.tsx:51`), A1.6/A1.8 40×40 (`notification-bell.tsx:123`, `account-menu.tsx:56`), 7.1 logo 69×64 (`site-footer.tsx:41-46`), A1.2 gold+underline selected (`nav-link.tsx:42`), A1.3 hover bg (`nav-link.tsx:43`), B2 label/value split + wrap (`event-info.tsx:25-52`), B3 filled vs outlined (`cta-buttons.tsx:40,55`), C2.1.3 2-line clamp (`award-card.tsx:89`), C2 2-col/3-col (`awards-section.tsx:51`), 3.5 BG cover + dark scrim (`keyvisual-background.tsx:28-46`) |
| Logic | **GAP** | Countdown target is env-configured ISO-8601 per B1 — `page.tsx:151-162` reads `EVENT_START_AT`, validates via `src/utils/countdown.ts:13-20`, warns once on a malformed-but-present value, degrades to `null`; `use-countdown.ts:52-62` renders `00/00/00` with `showComingSoon: true` on `null` and `showComingSoon: !reached` otherwise, so B1/B1.2/B1.3 "khi về 0: ẩn Coming soon, giữ 00" holds (`remaining()` clamps at 0, `countdown.ts:35`). Zero-padding B1.3 via `pad2` (`countdown.ts:49-51`). CTA destinations B3.1→`/awards`, B3.2→`/kudos` (`cta-buttons.tsx:31-32`). C2/C2.1.x hash nav `/awards#<slug>` on both anchors (`award-card.tsx:38,44,94`). D2.1→`/kudos` (`kudos-section.tsx:63`). A1.1/A1.2 click-while-active → scroll-top (`logo-link.tsx:30-35`, `nav-link.tsx:27-32`). A1.7 VN/EN only (`language-selector.tsx:16-19`). A1.8 Profile/Sign out (+Admin Dashboard when `isAdmin`) (`account-menu.tsx:36,81-111`). Gap: nav label copy contradicts the spec text the code's own comment cites (`site-chrome.ts:67-69`) |
| Test coverage | **GAP** | 41 of 62 TC rows land on a real assertion; **9 uncovered**, **10 partial**, **2 test-id mislabels**, **1 effectively vacuous test**. See matrix + gaps below |

## Screen: FAB collapsed (`_hphd32jN2`)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP (minor)** | Item A pill = gold `rounded-full`, pencil left + `/` + Sun* logo right, `h-16 w-[106px]` (`widget-button.tsx:22`, `:126-146`) — homepage row 6 says "105x64px", CSV row A says inner group "41x32px" vs code `h-8 w-[42px]` (`widget-button.tsx:133`). Both 1px; `plans/260908-1103-home-widget-fab/clarifications.md:17,45-56` records 106×64 read off node data, so the CSV prose is the rounded value. A.1/A.2 icons present and correct |
| Logic | **PASS** | Item A `userAction: on_click` → "Mở 2 option chọn xem thể lệ hoặc viết kudos": `handleButtonClick` opens a 2-item `[role="menu"]` (`widget-button.tsx:69,76-113,122`). `hover: Bóng nhẹ` → `hover:shadow-[0_6px_10px_...]` (`:22`) |
| Test coverage | **UNVERIFIABLE / covered by minted ids** | Frame returns 0 test cases, so no TC row can be mapped. Collapsed geometry is asserted anyway: `home-widget-fab.spec.ts:149-153,195-201` (106×64, `aria-expanded=false`, `/` visible) |

## Screen: FAB expanded (`Sv7DFwBw1h`)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP (minor)** | Item A "Thể lệ": logo-left + label, `h-16` 64px, `p-4`, `gap-2`, `rounded` 4px, `bg-login-button` = `#FFEA9E` (`globals.css:19`) — `widget-button.tsx:28,85-98`. Width 149px deliberately intrinsic, resolved in `clarifications.md:57-60` — not re-litigated. Item B "Viết KUDOS" same class, pencil icon (`:100-111`). Item C "Hủy": `h-14 w-14` = 56×56, `rounded-full`, `bg-[#D4271D]`, white `×` (`:24-25,128`) — but spec C says "có shadow nhẹ" and the class carries **no rest shadow**, only `hover:shadow` (`:25`) |
| Logic | **PASS** | A `on_click` → `/standards` (`ROUTES.STANDARDS`, `:87`), B `on_click` → `/kudos` (`:102`), both `close(false)` on click (`:90,105`). C closes the panel and returns focus — it *is* the trigger morphed (`:115-124`), a load-bearing choice recorded in `clarifications.md:78-86` to keep TC ID-35 green. Order A-above-B matches the frame's flex-end column |
| Test coverage | **PASS (no upstream rows)** | 0 TC rows upstream. 5 tests with minted 8-hex ids cover it: `home-widget-fab.spec.ts:56` (ID-54, both hrefs + 64px heights + no `/awards` item), `:135` (morph 106×64↔56×56, exactly 1 button in the container, focus return), `:204` / `:244` (real navigation, not just href), `:269` (open/close idempotence). No vacuous blocks — 17/19/1/1/8 `expect` calls; the two 1-assertion tests are deliberate single-fact navigation proofs documented at `:222-241` |

---

## Gaps

1. **severity: major** — nav label ships "Award Information" (singular) while spec A1.3/7.3 and TC ID-21/23 say "Awards Information"; the code comment at `src/app/_shared/site-chrome.ts:67-68` states the plural wins as content acceptance and then sets the singular on `:69`. Same value in `messages/vi.json` + `messages/en.json` `home.nav.awardsInfo`. No test asserts the nav link's text, so nothing catches it. → set all three to "Awards Information" and add a text assertion to the ID-21 test.
2. **severity: major** — TC ID-3 test is effectively vacuous: `tests/e2e/home.spec.ts:459-470` clicks the header "About SAA 2025" link and its only assertion is `expect(page.url()).toContain("/")`, true of every URL. → assert `new URL(page.url()).pathname === "/"` plus the scroll position, mirroring the ID-2 test.
3. **severity: major** — TC ID-21 (click "Awards Information" in header → `/awards`) and TC ID-22 (click "Sun* Kudos" → `/kudos`) have **no test at all**; `home.spec.ts:340-366` only checks the *footer* copies are visible. → add two clicks asserting `toHaveURL(/\/awards/)` and `/\/kudos/`.
4. **severity: major** — spec C1's third line "Các hạng mục sẽ được trao giải theo TOP những người xuất sắc nhất." is not rendered anywhere; `src/app/(public)/(home)/_components/awards-section.tsx:35-49` emits caption + divider + heading only and the string is absent from `messages/{vi,en}.json`. → add a `home.awards.description` key and a `<p>` under the `<h2>`.
5. **severity: major** — header logo renders 52×48 (`src/app/_components/site-header.tsx:63-66`, `width={52} height={48} className="h-12 w-[52px]"`) against spec A1.1 and TC ID-8 "64x60px"; the ID-8 test (`home.spec.ts:43-50`) asserts visibility and `y < 100` but never the box, so it passes regardless. → set 64×60 and assert `boundingBox()` in the ID-8 test.
6. **severity: minor** — TC ID-2/ID-18 ("from any page → homepage, scrolled to top") never leaves the homepage: `home.spec.ts:440-442` navigates to `/awards` then immediately re-`goto("/")` under a stale comment claiming `/awards` 404s (it is a real route since phase-02). The off-page premise is untested. → drop the fallback `goto` and click the logo from `/awards`.
7. **severity: minor** — two test-id mislabels make covered rows look covered that aren't: `home.spec.ts:116` is titled `[TC ID-24, ID-39]` but ID-24 is the language-menu toggle, not the countdown; `home.spec.ts:572` is titled `[TC ID-4]` but ID-4 is the footer nav link, not logout. → retitle to `[TC ID-39, ID-40]` and mint an 8-hex id for logout, per the convention documented at `home-widget-fab.spec.ts:30-49`.
8. **severity: minor** — TC ID-34 (Space opens the widget menu) is claimed in the title at `home.spec.ts:303` but only Enter is pressed (`:336`). → add `await widgetButton.press(" ")`.
9. **severity: minor** — TC ID-47/ID-48 (click card **image** / card **title**) are claimed at `home.spec.ts:261` but the test only asserts the separate "Chi tiết" anchor's href (`:278-284`); the image+title anchor's own `href` (`award-card.tsx:44-45`) is never asserted. → assert both anchors per card.
10. **severity: minor** — TC ID-19 (footer logo click → homepage + scroll top) uncovered: `home.spec.ts:345-348` only asserts the footer `img` is visible. → click the footer `LogoLink` and assert `scrollY < 50`.
11. **severity: minor** — TC ID-58 ("only VN and EN options displayed") uncovered — no test counts the language menu's `[role="menuitem"]` children. → `await expect(menu.locator('[role="menuitem"]')).toHaveCount(2)`.
12. **severity: minor** — TC ID-55 (footer links *navigate*) partial: `home.spec.ts:354-361` asserts hrefs and visibility, never a click. → click each and assert URL, the way `home-widget-fab.spec.ts:241` does.
13. **severity: minor** — spec item C ("Nút hủy") says "có shadow nhẹ" but the × has no rest shadow, only `hover:shadow` (`src/app/(public)/(home)/_components/widget-button.tsx:24-25`). Note `clarifications.md:61-62` resolved *the two option buttons* to hover-only shadow; it did not cover the × itself. → add the pill's `shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]` at rest.
14. **severity: minor** — footer nav links have no active state (`src/app/_components/site-footer.tsx:52-78` use plain `<Link>`, no `aria-current`, no gold/underline) against spec row 7 "Hover/active/normal state: tương tự các item ở header". `clarifications.md:73` describes the footer as plain links but never answers the active-state question. → either reuse `NavLink` in the footer or record the deviation as a decision.
15. **severity: minor** — TC ID-46 (CTA hover styling) and TC ID-51 (award-card hover lift) uncovered; both are implemented (`cta-buttons.tsx:40,55`; `award-card.tsx:46,49`) but no test or visual capture pins them. → assert the computed style after `hover()`, or accept as visual-only and record it.
16. **severity: minor** — TC ID-60 (invalid `EVENT_START_AT` → fallback, no crash) partial: the pure layers are covered (`src/utils/countdown.test.ts:24`, `src/app/(public)/_hooks/use-countdown.test.ts:67`) but `page.tsx:151-162`'s warn-and-degrade path is never exercised at the page level. Same for TC ID-56/ID-57 — the e2e clock tests consume the fixed `playwright.config.ts:68` value rather than varying it. → one e2e project (or a page-level unit test) with a deliberately malformed value.
17. **severity: minor** — widget pill is `w-[106px]` (`widget-button.tsx:22`) vs homepage spec row 6 "105x64px", and the collapsed inner group is `h-8 w-[42px]` (`:133`) vs `_hphd32jN2` row A "41x32px". Both 1px, and `clarifications.md:17,45-56` records 106×64 from node data as authoritative. → leave as-is; flagged only so the CSV/code delta is on record.
18. **severity: minor** — TC ID-7 (whole-screen structural layout) has no single owning test; it is only implied across ID-8/12/15/17/54. → optionally one landmark-order assertion, or map ID-7 explicitly to the existing set.
19. **severity: minor** — TC ID-62 (award card with a missing hashtag → navigate without auto-scroll) is unreachable: all 6 slugs are non-empty literals in `src/app/(public)/(home)/_shared/home-copy.ts:100-143`. → mark N/A upstream rather than leaving it as an open row.
20. **severity: minor** — TC ID-59 (no broken links, via a Chrome extension) is not automatable as written and has no equivalent. → mark N/A or replace with a link-crawl check.

---

## TC coverage matrix — Homepage SAA (`i87tDx10uM`), 62 rows

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| ID-0 | anon can load `/` | home.spec.ts:33 (h1 assert) | covered |
| ID-1 | authed sees bell + account | home.spec.ts:501; anon variant :74 | covered |
| ID-2 | logo click from any page → `/` + top | home.spec.ts:437 | partial (never off-homepage; 1 tautological assert) |
| ID-3 | header nav from any page | home.spec.ts:459 | **vacuous** (only `toContain("/")`)|
| ID-4 | footer nav link → `/` + top | — (`:572` mislabels ID-4 as logout) | **gap** |
| ID-5 | admin sees Admin Dashboard | home.spec.ts:624 | covered |
| ID-6 | member has no Admin option | home.spec.ts:541 | covered |
| ID-7 | overall structural layout | implied by ID-8/12/15/17/54 | partial |
| ID-8 | header logo 64×60 + alt | home.spec.ts:43 | partial (size not asserted; code 52×48) |
| ID-9 | active nav link styling | home.spec.ts:52 | covered |
| ID-10 | language button shows VN | home.spec.ts:64 | covered |
| ID-11 | bell 40×40 + badge if unread | home.spec.ts:501; notifications.spec.ts:290 | partial (40×40 not asserted) |
| ID-12 | 3 countdown units, 2 digits | home.spec.ts:87 | covered |
| ID-13 | "Coming soon" visible pre-event | home.spec.ts:87 | covered |
| ID-14 | event info content | home.spec.ts:148 | covered |
| ID-15 | 3-col award grid desktop | home.spec.ts:184 | covered |
| ID-16 | 2-col award grid tablet/mobile | home.spec.ts:222 | covered |
| ID-17 | footer logo/links/copyright | home.spec.ts:340 | covered |
| ID-18 | header logo click navigates | home.spec.ts:437 | partial (same as ID-2) |
| ID-19 | footer logo click navigates | — | **gap** |
| ID-20 | click About SAA in header | home.spec.ts:459 | partial (vacuous assert) |
| ID-21 | click Awards Information → `/awards` | — | **gap** |
| ID-22 | click Sun* Kudos → `/kudos` | — | **gap** |
| ID-23 | nav link hover highlight | — | **gap** |
| ID-24 | language menu opens VN/EN | home.spec.ts:368 (opens); `:116` mislabels ID-24 | partial |
| ID-25 | switch to EN | home.spec.ts:368 | covered |
| ID-26 | switch back to VN | home.spec.ts:368 | covered |
| ID-27 | notification panel opens | home.spec.ts:519; notifications.spec.ts | covered |
| ID-28 | red badge when unread | notifications.spec.ts:290 (TC-004), :339 (9+) | covered |
| ID-29 | no badge when all read | home.spec.ts:519 | covered |
| ID-30 | dropdown opens on click | home.spec.ts:303 | covered |
| ID-31 | second click closes | home.spec.ts:303 | covered |
| ID-32 | outside click closes | home.spec.ts:303 | covered |
| ID-33 | Enter opens | home.spec.ts:336 | covered |
| ID-34 | Space opens | — (title claims it; only Enter pressed) | **gap** |
| ID-35 | Esc closes + focus return | home.spec.ts:329-332 | covered |
| ID-36 | account menu Profile/Sign out | home.spec.ts:541 | covered |
| ID-37 | admin adds Admin Dashboard | home.spec.ts:624 | covered |
| ID-38 | member: 2 options only | home.spec.ts:541 | covered |
| ID-39 | countdown auto-decrement | home.spec.ts:116 (clock fastForward) | covered |
| ID-40 | leading-zero format | countdown.test.ts:85-95; home.spec.ts:138 ("01") | covered |
| ID-41 | zero state 00 00 00 | home.spec.ts:408 | covered |
| ID-42 | "Coming soon" hidden post-event | home.spec.ts:424 | covered |
| ID-43 | "Coming soon" shown pre-event | home.spec.ts:418 | covered |
| ID-44 | ABOUT AWARDS → `/awards` | home.spec.ts:164 | covered |
| ID-45 | ABOUT KUDOS → `/kudos` | home.spec.ts:174 | covered |
| ID-46 | CTA hover styling | — | **gap** |
| ID-47 | click card image → hash | home.spec.ts:261 (Chi tiết anchor only) | partial |
| ID-48 | click card title → hash | home.spec.ts:261 (Chi tiết anchor only) | partial |
| ID-49 | click "Chi tiết" → hash | home.spec.ts:261 | covered |
| ID-50 | all 6 cards navigate | home.spec.ts:261 | covered |
| ID-51 | card hover lift | — | **gap** |
| ID-52 | hash scrolls to section | awards.spec.ts:325, :347 | covered |
| ID-53 | Kudos "Chi tiết" → `/kudos` | home.spec.ts:288 | covered |
| ID-54 | widget opens quick-action menu | home-widget-fab.spec.ts:56 | covered |
| ID-55 | footer links navigate | home.spec.ts:354-361 (href only) | partial |
| ID-56 | countdown from env var | countdown.test.ts:28; playwright.config.ts:68 | partial |
| ID-57 | valid ISO-8601 target | countdown.test.ts:28; home.spec.ts:116/408 | partial |
| ID-58 | only VN/EN options | — | **gap** |
| ID-59 | no broken links | — | **gap** (not automatable as written) |
| ID-60 | invalid datetime fallback | countdown.test.ts:24; use-countdown.test.ts:67 | partial (page-level path untested) |
| ID-62 | card with missing hashtag | — | **gap** (unreachable: slugs hardcoded) |

Totals: 41 covered · 10 partial · 9 gaps · 1 vacuous · 2 mislabels.
(ID-61 does not exist upstream — the CSV jumps ID-60 → ID-62.)

### FAB screens
Both `Sv7DFwBw1h` and `_hphd32jN2` return `test_case_count: 0`, so there is no TC matrix to build. Coverage is via 5 minted-slug tests in `tests/e2e/home-widget-fab.spec.ts` (`ID-54`, `eaecd588`, `c4b65775`, `3b6565d3`, `e0451b6d`) — none vacuous. The open question recorded at `clarifications.md:138-139` ("write the test cases back up to MoMorph?") is still open.

---

## Unverifiable items

1. **Countdown digit typeface.** `countdown-tiles.tsx:40` sets `fontFamily: '"Digital Numbers", monospace'` with the font not loaded, documented as deferred at `:20-24`. The specs CSV states no font for B1.3.x — cannot judge against design data. Requires `list_frame_styles` / `get_node`, out of scope here.
2. **All colors, radii, blur, letter-spacing.** The 22-column specs CSV carries prose `description` only — no hex, no numeric typography. Values like `#FFEA9E`, `#999999`, `#2E3940`, `#D4271D`, `0.5px` border, `16.64px` blur are cited in code as coming from `get_node` / the file's `Color` variable collection (see `award-card.tsx:24-35`, `countdown-tiles.tsx:10-25`). Not judged — the CSV does not state them. "nền vàng nhạt" (Sv7DFwBw1h row A) vs the code's `#FFEA9E` is the one place prose and code could differ; unresolvable from the CSV.
3. **Real event date.** `.env.local` sets `EVENT_START_AT=2026-12-26T18:30:00+07:00`; `playwright.config.ts:68` overrides to `2099-12-31T18:30:00+07:00`. Spec B1 only requires "env-configurable ISO-8601" (satisfied) and TC ID-57's `2025-12-31T18:30:00+07:00` is test data, not the production date. Whether 2026-12-26 is the correct event date is a business fact no design artifact states — needs a human.
4. **C2 mobile column count — CSV contradicts itself.** Row `C2` (no itemId) says "Mobile và Tablet: Grid 2 cột; Desktop: grid 3 cột"; row `C2` (itemId `5005:14974`) says "2-column (tablet), 1-column (mobile)". TC ID-16 says 2-column for tablet *and* mobile. Code follows 2-col (`awards-section.tsx:51`), matching the majority and the recorded decision at `awards-section.tsx:16-23`. Not re-litigated.
5. **Header language label 'VI' vs 'VN' — CSV contradicts itself.** Row `A1` (no itemId) says "'VI' (chuyển ngôn ngữ)"; row `A1.7`, the `A1` instance row, and TC ID-10 all say "VN". Code ships "VN" (`lib/i18n/locale.ts` `LOCALE_LABEL`, asserted at `home.spec.ts:71`) — the majority reading.
6. **Footer copyright "vè" typo.** Spec row 7 and TC ID-17 both read "Bản quyền thuộc vè Sun* © 2025"; code ships "về" via the reused `login.footer` key. Already resolved as a design typo at `plans/260906-0042-homepage-saa-page/clarifications.md:48` — not a gap.
7. **Responsive / hover / focus rendering.** Every "Responsive: co lại hoặc xếp chồng" and hover/focus clause was judged from Tailwind breakpoint classes in source, not from a rendered browser. No Playwright MCP capture was taken (visual validation is the `tester`'s lane under this policy), so responsive fidelity is source-level only.
8. **`pnpm test:e2e` not executed** (dev server owned by the orchestrator) and `pnpm build` blocked by hook. E2E coverage claims above are read off the spec files, not off a green run. `pnpm test:unit` was run: 808/808 pass.
