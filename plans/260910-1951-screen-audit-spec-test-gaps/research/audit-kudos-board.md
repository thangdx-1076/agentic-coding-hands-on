# Audit — Sun* Kudos Live Board (SCR007 / F007 + F008)

- fileKey `9ypp4enmFmdK3YAFJLIu6C`
- Screens: `MaZUn5xHXZ` (64 specs / 41 TC) · `JWpsISMAaM` (4 specs / **0 TC**) · `WXK5AYB_rG` (4 specs / **0 TC**)
- All three frames: `spec_status=done`, `dev_status=none`, **`screen_overview: null`** — no screen-level behaviour narrative exists upstream.
- Artifacts (verbatim): `../momorph/frame-*.md`, `../momorph/specs-*.csv`, `../momorph/test-cases-*.csv`
- Prior agreed scope: `plans/260907-1725-kudos-live-board/clarifications.md` — **never mentions `JWpsISMAaM` or `WXK5AYB_rG`**. Both dropdown frames were built from the parent screen's rows B.1.1/B.1.2 only; their own 8 spec rows were never read. That is the root of GAP-01…GAP-04 and GAP-08.
- `pnpm test:unit` → **83 files / 808 tests, all green** (run 2026-09-10 20:05). No vacuous tests found: 0 zero-assertion `it(`/`test(` blocks, 0 real empty catches across the 26 kudos unit specs + `tests/e2e/kudos.spec.ts` (the one `catch(() => {})` hit at `tests/e2e/kudos.spec.ts:687` is inside a comment).

## Verdict per sub-feature

| sub-feature | UI | Logic | Tests | evidence |
|---|---|---|---|---|
| 1. Highlight Kudos (top 5 by hearts) | PASS | **PASS** | PASS | `src/dal/kudos-cards-query.ts:113-118` `.order("heart_count",{ascending:false}).order("created_at",…)`; `src/dal/kudos.ts:68` `HIGHLIGHT_LIMIT=5`; index `supabase/migrations/0006_kudos.sql:48`. Card/nav/counter per B.2–B.5: `kudos-highlight-carousel.tsx:79-133`, `kudos-carousel-nav.tsx:56-145`, `kudos-slide-counter.tsx:15-24`. Tests: e2e C11/C12, `use-carousel-index.test.ts` (5), `kudos.test.ts:336` |
| 2. Spotlight Boards | **GAP** | **GAP** | GAP | Total is `totalsRows.length` (`src/dal/kudos.ts:130`) over an **unlimited, unordered** read → capped by `max_rows = 1000` (`supabase/config.toml:18`) ⇒ GAP-05. No pan/zoom (B.7.2), no node tooltip/click (B.7 "Hover…Click node"), no loading state (`kudos-spotlight.tsx:99-102`) ⇒ GAP-11/GAP-12. Scatter + search PASS: `kudos-spotlight-scatter.tsx`, `use-spotlight-search.ts:29-52`, e2e C20/C21 |
| 3. Recent kudos list (ALL KUDOS) | PASS | PASS | PASS | `kudos-feed.tsx:66-156` (header C.1, list C.2, cards C.3–C.7, sentinel, spinner); keyset cursor `kudos-cards-query.ts:110-112` + `kudos.ts:125-128`; `load-more-kudos.ts:43-61`. Tests: e2e C18/C19, `use-infinite-feed.test.ts` (7), `load-more-kudos.test.ts` (8) |
| 4. Filter by hashtag + department | **GAP** | **GAP** | PASS | Options come from distinct values **present in existing kudos** (`kudos.ts:134-139`), not the design's fixed vocabularies — `JWpsISMAaM` row A names **13** hashtags, `WXK5AYB_rG` row A names **~50** departments ⇒ GAP-01. Same 1000-row cap poisons the option lists ⇒ GAP-05. Dropdown panel + option styling diverge from the real design nodes ⇒ GAP-03/GAP-04/GAP-08. Combination is AND and both keys survive: `use-kudos-filters.ts:24-36`, `kudos-cards-query.ts:104-109`. Tests: e2e C14/C15/C16/C17, `use-kudos-filters.test.ts` (10) |
| 5. General statistics (D.1) | PASS | PASS | PASS | 5 rows + divider + button: `kudos-stat-list.tsx:50-98` — matches frame `2940:13490`'s 7 children (5 stat rows / divider / button), `gap:16px` → `gap-4`. Row D.1's prose "6 dòng số liệu" is a spec-data defect, see UNVERIFIABLE-3. `getKudosStats` (`src/dal/kudos-stats.ts:112-140`). Tests: e2e C09/C27, `kudos-stats.test.ts` (13) |
| 6. Top 10 most-recent gift recipients (D.3) | **GAP** | **GAP** | **GAP** | `giftRecipients={[]}` hardcoded at `src/app/(public)/kudos/_components/kudos-client.tsx:189`. The board renders `Chưa có dữ liệu` **unconditionally**, forever. `kudos-leaderboard.tsx:14-16` justifies this with "neither a rank-tracking nor a gift ledger exists yet" — that is **stale since migration `0011`** ⇒ GAP-06. Only the empty branch (`kudos-leaderboard.tsx:50-53`) is ever exercised: e2e C08 |
| 7. Like / Heart Kudos (C.4.1) | PASS | PASS (minus GAP-09) | PASS (e2e for BR-002 is `fixme`) | Server-authoritative toggle `_actions/toggle-kudo-heart.ts:32-61`; one-per-user by `UNIQUE(kudo_id,user_id)` + 23505 re-read (`toggle-kudo-heart.ts:96-98`, `0007_kudo_hearts.sql:45`); sender-guard in RLS `WITH CHECK` (`0007_kudo_hearts.sql:78-83`); count credited to sender ±1/±2 by `OLD.special`/`NEW.special` (`0007:106-119`); count reaches BOTH surfaces (`kudos-client.tsx:120-137`, `kudos-feed.tsx:119-123`). Tests: e2e C22/C25, `toggle-kudo-heart.test.ts` (12), `use-kudos-hearts.test.ts` (8), `kudos-card-state.test.ts` (6) |

## Gaps

Ordered by severity.

1. **critical** — `severity: critical` · Sub-feature 6 is a permanent empty state. `giftRecipients={[]}` and `rankUps={[]}` are literals at `src/app/(public)/kudos/_components/kudos-client.tsx:188-189`; nothing ever populates D.3. Spec `MaZUn5xHXZ` rows D / D.3 / D.3.1–D.3.6, TC `6b1e2359` (leaderboard profile click) and half of TC `0952e2f0` are unreachable.
   *Fix:* add a `recent_gift_recipients` SECURITY DEFINER view (like `kudos_cards`) over `secret_box_openings` → `users`, `ORDER BY opened_at DESC LIMIT 10`, read it in `page.tsx` and pass it to `KudosClient` as `giftRecipients`.

2. **critical** — `severity: critical` · The gift ledger already exists; the code comment says it does not. `supabase/migrations/0011_secret_box.sql:68-77` created `secret_box_openings (user_id, badge_key, opened_at)` — exactly "who received which gift, when". `src/app/(public)/kudos/_components/kudos-leaderboard.tsx:14-16` still asserts "neither a rank-tracking nor a gift ledger exists yet (FR-213/BR-012/C08)". Its RLS is own-rows-only (`0011:101-105`), so a public board needs the definer view from GAP-01, not a policy change.
   *Fix:* delete the stale justification in `kudos-leaderboard.tsx:14-16` and land GAP-01's view rather than leaving `Chưa có dữ liệu` presented as an honest result.

3. **critical** — `severity: critical` · `spotlightTotal` and both filter option lists are silently capped at 1000 rows. `src/dal/kudos.ts:103` issues `selectCards(client, {})` with **no `limit` and no `order`**, then `kudos.ts:130` counts it with `.length` and `kudos.ts:134-139` derives `filters.hashtags`/`filters.departments` from the same rows. `supabase/config.toml:18` sets `max_rows = 1000`, so past 1000 kudos the Spotlight header (spec B.7.1, "tổng số KUDOS của hệ thống được query từ DB") freezes at `1000 KUDOS` and the dropdowns show whichever unordered 1000 rows PostgREST happened to return. e2e C20 cannot catch it — the seed is far under 1000.
   *Fix:* replace the totals read with `.select("*", { count: "exact", head: true })` for the count, and derive the filter vocabularies from GAP-04's fixed lists instead of from row data.

4. **major** — `severity: major` · Filter vocabularies do not match the design. Spec `JWpsISMAaM` row A (`itemId 563:8026`) enumerates 13 hashtags ("Toàn diện … Quản lý xuất sắc"); spec `WXK5AYB_rG` row A (`563:8027`) enumerates ~50 departments ("CTO SPD FCOV CEVC1 CEVC2 …"). Neither list exists anywhere in the repo (`grep -rn "Wasshoi\|Toàn diện" src/ supabase/` → 0 hits in app code). Options are instead computed from existing rows at `src/dal/kudos.ts:134-139`, so an unused hashtag or an empty department can never be filtered.
   *Fix:* add `src/constants/kudos-vocabulary.ts` with both verbatim lists and feed `KudosFilterBar` from it, keeping the row-derived lists only for the compose picker.

5. **major** — `severity: major` · The dropdown panel's own design values are unimplemented. Real node `563:8026` / `563:8027`: `background #00070C`, `border 1px solid #998C5F`, `border-radius 8px`, `padding 6px`, panel height `348px`. Code at `src/app/(public)/kudos/_components/kudos-filter-menu.tsx:104` renders `rounded bg-[#0B0F12] shadow-lg` — wrong background, no border, 4px radius, no padding.
   *Fix:* set `rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5` on that container.

6. **major** — `severity: major` · No scroll container on the dropdown, and no selected-option styling. Spec `JWpsISMAaM` row A: "Scroll: danh sách cuộn khi vượt quá chiều cao"; `WXK5AYB_rG` row A pins the panel at `101x348px`. `kudos-filter-menu.tsx:104` has `overflow-hidden` and **no `max-height`**, so ~50 departments render as one unbounded, unscrollable column. Rows A.1/A.3 also require a `Selected` state (real node `I563:8026;525:13508` carries `backgroundColor rgba(255,234,158,0.10)` and the label carries `text-shadow: 0 4px 4px rgba(0,0,0,.25), 0 0 6px #FAE287`); `kudos-filter-menu.tsx:117` only sets `aria-selected` plus a `hover:bg-white/10`, so the active option is visually indistinguishable.
   *Fix:* add `max-h-[348px] overflow-y-auto` to the listbox and give the option `aria-selected` branch `bg-[rgba(255,234,158,0.10)]` + the design's text-shadow.

7. **major** — `severity: major` · Dropdown option typography and label text diverge. Real option node: `height 56px`, `padding 16px`, `border-radius 4px`, label Montserrat 700 **16px/24px**, `letter-spacing 0.5px`, `text-align center`, label text `#Dedicated` (with the `#`). Code (`kudos-filter-menu.tsx:117`) uses `px-4 py-2 text-sm … text-left` and renders `{option}` bare, so the hashtag menu reads `Dedicated` while the cards read `#Dedicated` (`kudos-hashtag-list.tsx:43`).
   *Fix:* `flex h-14 items-center rounded px-4 text-center font-montserrat text-base leading-6 tracking-[0.5px]`, and prefix `#` for the hashtag menu only.

8. **major** — `severity: major` · The heart button is not disabled while a toggle is in flight. Spec C.4/B.4.4: "toggle like, cập nhật số (tăng/giảm) và trạng thái active/**disabled tạm thời**". `use-kudos-hearts.ts:59-60` silently drops the second click and `kudos-heart-button.tsx:52-60` exposes no pending state, so on a slow connection the button looks inert and the user's second intent is discarded with no feedback (the hook's own comment at `use-kudos-hearts.ts:36-46` acknowledges this).
   *Fix:* expose the in-flight set from `useKudosHearts` and OR it into `heartDisabled` in `deriveKudosCardState`.

9. **major** — `severity: major` · An anonymous kudo's own sender can click the heart on their own kudo. `kudos-card-state.ts:36` computes `isOwnKudo` from `card.sender.id === viewerId`, but `sender_id` is `NULL` for an anonymous kudo (`0009_kudos_write_anonymity.sql`, documented at `kudos-cards-query.ts:24-27`), so `isOwnKudo` is `false` and the button stays enabled. The RLS `WITH CHECK` (`0007:82`) still rejects the write, so the click produces `{ok:false}` and no visible change — a dead button, not a data bug.
   *Fix:* have the view expose an `is_own` boolean (or a masked-but-comparable sender key) so the anonymous-self case can be disabled in the UI too.

10. **minor** — `severity: minor` · `loadMoreKudos` issues 3 queries to use 1. `load-more-kudos.ts:52-59` calls `getKudosBoard`, which always runs the unfiltered totals read *and* the highlight read (`kudos.ts:102-117`) before returning only `board.feed`. Every infinite-scroll page therefore re-scans up to 1000 rows of `kudos_cards` twice for nothing.
    *Fix:* export a `getKudosFeedPage` from `src/dal/kudos.ts` that calls `selectCards(..., { sort: "feed" })` alone.

11. **minor** — `severity: minor` · Spotlight has no loading state. TC `d035e3b8` step 1 expects a loading indicator; `/kudos` renders server-side with no Suspense boundary around `KudosSpotlight` (`kudos-screen.tsx:141-146`), so the state is unreachable by design.
    *Fix:* either wrap the section in `<Suspense>` with a skeleton, or record the TC as N/A for a fully server-rendered board.

12. **minor** — `severity: minor` · Pan/zoom (B.7.2) and spotlight node interaction (B.7) render nothing. `kudos-spotlight.tsx:99-102` documents the omission and `clarifications.md` § Spotlight pre-agrees it (`B.7.2` is an empty frame). TCs `cac4b7a3` and `33ca8f8a` stay unmapped.
    *Fix:* none in code — carry both TCs as deferred in the TC sheet so they stop reading as untested.

13. **minor** — `severity: minor` · "Xem chi tiết" / card-content click / image lightbox render inert. `kudos-card-actions.tsx:70-78` renders a permanently `disabled` button; `kudos-image-strip.tsx` has no `onClick`. Pre-agreed (`clarifications.md` table rows B.3/C.3.5 and C.3.6), and e2e C24 asserts the non-navigation. TCs `31693bb7`, `8c0d1781`, `f9b68ffa` unmapped.
    *Fix:* none now — blocked on frames `onDIohs2bS` / no frame for C.3.6.

14. **minor** — `severity: minor` · Sidebar button label diverges from the spec. Spec D.1.8 and TC `43b54c29` name the button `Mở quà`; `messages/vi.json` `kudos.sidebar.openGift` is `"Mở Secret Box 🎁"`.
    *Fix:* decide once — either restore `Mở quà` in both locales or amend spec D.1.8 upstream.

15. **minor** — `severity: minor` · `openGiftDisabledTitle` is misleading. `messages/vi.json` → `"Tính năng đang được phát triển"`, but the feature IS built (`secret-box-launcher.tsx:62-126`); the button is disabled purely because `secretBoxUnopened === 0` (`secret-box-launcher.tsx:69,97`).
    *Fix:* change the string to the real reason (e.g. "Chưa đủ tim để mở Secret Box").

16. **minor** — `severity: minor` · The `+2 hearts on an admin-configured special day` rule (spec C.4.1, `databaseNote`, TC `31936b72`) is inert. `kudo_hearts.special` exists and the trigger honours it (`0007:108,113`) but nothing ever sets it `true` — pre-agreed in `clarifications.md`.
    *Fix:* none now; TC `31936b72` has no constructible precondition until an admin surface exists.

17. **minor** — `severity: minor` · TC `9e689933`'s error affordances are absent. Steps 2/3 expect an error on the 101st character and a required message on empty submit; `kudos-sunner-search.tsx:52` truncates via `maxLength` and `:39` disables the button, showing no message. Pre-agreed in `clarifications.md` § "Chưa giải quyết".
    *Fix:* none now — design draws neither message.

18. **minor** — `severity: minor` · e2e coverage of BR-002 (sender cannot heart own kudo) does not execute. `tests/e2e/kudos.spec.ts:739` is `test.fixme(...)`. The rule itself is covered at the unit level (`kudos-card-state.test.ts:57`, `use-kudos-hearts.test.ts:45`) and at the DB level, so this is a coverage-shape gap, not a behaviour gap.
    *Fix:* now that the compose dialog ships (`kudos-compose.spec.ts` C23 creates a real kudo), un-`fixme` C26 and seed an own-kudo through it.

## TC coverage matrix

`MaZUn5xHXZ` — 41 rows. `JWpsISMAaM` and `WXK5AYB_rG` contribute **0 rows** (`download_test_cases` → `status: empty`), so their 8 spec rows carry no test contract at all.

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| 0952e2f0 | click avatar/name → profile (card + sidebar) | e2e C28 (card); sidebar half unreachable (GAP-01) | PARTIAL |
| 31693bb7 | View Details / content / spotlight node → detail page | — (e2e C24 asserts the opposite) | GAP (deferred) |
| 71b3ef43 | unauthenticated → login redirect | e2e C29 | COVERED |
| 40d4ba26 | banner visible, logo + title, non-interactive | e2e C02 | COVERED |
| 0578e8ef | compose pill shape + pencil icon | e2e C03 | COVERED |
| 06b76e80 | highlight header/filters/carousel alignment | e2e C04, C10 (order only) | PARTIAL |
| b03a3b4e | filter buttons aligned; active/inactive switch | e2e C04, C14, C15 (`data-active` never asserted) | PARTIAL |
| 0929bc39 | Hashtag button visible/not obscured | e2e C04 | PARTIAL |
| 7b029a3b | Phòng ban button visible/not obscured | e2e C04 | PARTIAL |
| 86092c3a | 5 slides, arrows disabled at ends, faded neighbours | e2e C11, C12 (faded/non-interactive not asserted) | PARTIAL |
| 67c21a05 | highlight card fields present | e2e C13 | COVERED |
| 1ce82447 | Sunner search bar + icon + placeholder | e2e C05 | COVERED |
| ddf67e52 | word cloud, total, pan/zoom + search, loading/empty | e2e C20, C21 (pan/zoom + loading absent) | PARTIAL |
| 9dfda316 | feed list + sidebar, infinite scroll, empty | e2e C07, C18, C19 | COVERED |
| f92dc686 | feed card fields incl. gallery | e2e C13 (highlight variant only) | PARTIAL |
| 99ade8e6 | sidebar headers/labels/separators/leaderboards | e2e C08, C09, C27 | COVERED |
| b35d40c1 | compose placeholder verbatim | e2e C03 | COVERED |
| d3877e54 | search placeholder verbatim | e2e C05, `kudos.spec.ts` C05 | COVERED |
| f183a3e4 | empty compose → submit blocked | e2e `kudos-compose.spec.ts` C05, C20; `use-kudos-compose-form.test.ts` | COVERED |
| 9e689933 | search 100/101/empty | e2e C05, C06; `use-spotlight-search.test.ts:54,66` (no error strings) | PARTIAL |
| ca8f60b3 | submit → kudo saved + appears in feed | e2e `kudos-compose.spec.ts` C23; `create-kudo.test.ts` | COVERED |
| 926d92a5 | empty feed → `Hiện tại chưa có Kudos nào.` | e2e C07 | COVERED |
| d662780b | empty leaderboard → `Chưa có dữ liệu` | e2e C08 | COVERED (only reachable state) |
| 63645b03 | sender cannot like own kudo | `kudos-card-state.test.ts:57`, `use-kudos-hearts.test.ts:45`, RLS `0007:82`; e2e C26 is `fixme` | PARTIAL |
| 91e102ba | one like per user per kudo | `toggle-kudo-heart.test.ts:154`, `use-kudos-hearts.test.ts:121`, `UNIQUE` `0007:45` | COVERED |
| 31936b72 | special day → +2 hearts | — (`special` column inert) | GAP (deferred) |
| 43b54c29 | `Mở quà` opens Secret Box dialog | e2e `secret-box.spec.ts` S01, S02; `use-secret-box-dialog.test.ts` | COVERED |
| d035e3b8 | spotlight loading / empty / interactive | `kudos-spotlight-scatter` empty branch only | PARTIAL |
| 0e56cacb | hashtag dropdown open → filter → clear | e2e C14; `use-kudos-filters.test.ts:104,117` | COVERED |
| 159fed13 | department dropdown open → filter → clear | e2e C15; `use-kudos-filters.test.ts:104,117` | COVERED |
| d01729d4 | click hashtag on card → filter | e2e C16; `use-kudos-filters.test.ts:133` | COVERED |
| 81446f61 | carousel arrows + disabled at ends | e2e C12; `use-carousel-index.test.ts:29` | COVERED |
| 7a7ec63e | heart toggle updates icon + count | e2e C25; `use-kudos-hearts.test.ts:60` | COVERED |
| 0adfd7ce | Copy Link → clipboard + toast | e2e C23 | COVERED |
| 8c0d1781 | View Details → detail page | — (e2e C24 asserts non-navigation) | GAP (deferred) |
| 2cd77a0c | sender avatar/name → profile | e2e C28 | COVERED |
| 630f42a3 | receiver avatar/name → profile | e2e C28 | COVERED |
| cac4b7a3 | pan/zoom toggle | — | GAP (deferred) |
| 33ca8f8a | spotlight node hover tooltip + click → detail | — | GAP |
| f9b68ffa | image thumbnail → full-size | — | GAP (deferred) |
| 6b1e2359 | leaderboard avatar/name → profile, hover preview | — (leaderboard always empty, GAP-01) | GAP |

Totals: 20 COVERED · 12 PARTIAL · 9 GAP (6 of them pre-agreed deferrals).

## Unverifiable

1. **Filter combination semantics (AND vs OR).** Neither `MaZUn5xHXZ` B.1/B.1.1/B.1.2 nor either dropdown frame states what happens when hashtag *and* department are both set. Code applies both (`kudos-cards-query.ts:104-109` → AND) and e2e C14/C15 each test one filter alone. Reasonable, but the design says nothing — do not treat the AND as spec-backed.
2. **Dropdown hover colour.** Specs A.2 ("hover: nền sáng nhẹ") and `WXK5AYB_rG` A.1 ("hover: hiển thị hiệu ứng nổi nhẹ") name no value, and the frames carry no hover variant node. Code uses `hover:bg-white/10` (`kudos-filter-menu.tsx:117`); the design's own selected fill is `rgba(255,234,158,0.10)`, so `white/10` is a guess, not a read value. Flag for design confirmation rather than "wrong".
3. **Spec row D.1 says "6 dòng số liệu"; the frame draws 5.** Frame `2940:13490` has exactly 7 children — `2940:13491`, `13492`, `3241:14882`, `13494` (divider), `13495`, `13496`, `13497` (button) = 5 stat rows. Itemised spec rows agree (D.1.2/D.1.3/D.1.4/D.1.6/D.1.7). Code renders 5 (`kudos-stat-list.tsx:57-63`) and e2e C27 asserts 5. The "6" is a spec-prose defect; upstream row D.1 wants correcting.
4. **Spec row A's banner title is stale.** Row A's `description` and TC `40d4ba26` both quote `Hệ thống ghi nhận lời cảm ơn`, but the real TEXT node `2940:13439` has `character: "Hệ thống ghi nhận và cảm ơn"` (Montserrat 700, 36px/44px, `#FFEA9E`) — which is what `messages/vi.json:214` and e2e C02 use. The **code is right**; the spec prose and the TC are wrong. Note that `plans/260907-1725-kudos-live-board/phase-01-…md:48` and `evidence/red-evidence.md:52` recorded the RED contract with the *spec* string and it was later changed to match the implementation — justified here by the node data, but the upstream MoMorph row and TC still need fixing so the next audit does not re-open it.
5. **Sidebar row D.1.4 label vs. the credited account.** D.1.4 reads "Số tim bạn nhận được" while C.4.1 credits the kudo's **sender**; `kudos-stats.ts:127` sums `heart_count` over the viewer's *sent* kudos. Settled in `clarifications.md` § "Lượt tim cộng vào tài khoản NGƯỜI GỬI" (TC wins the design's self-contradiction) and already flagged for product in `plans/action-items.md` — not re-litigated here, but the label remains factually odd.
6. **"Số hoa thị" rendering.** B.3.2/B.3.6 describe 1/2/3 asterisks at 10/20/50 received kudos. `kudos-card-person.tsx:34-62` renders four hero-tier PNGs (New/Rising/Super/Legend) via `starTier()`, i.e. a badge is shown even below the first threshold. The thresholds are right (`star-tier.ts:15-17`); whether the badge artwork *is* the "hoa thị" element, and what the sub-10 state should be, is not stated in any row read here.
7. **Visual fidelity beyond the values quoted above.** No browser evidence was captured in this pass (read-only, no dev server owned here). Every UI claim in this report is grounded in a MoMorph node style or a CSV row plus a code line — spacing/colour claims not backed by one of those are deliberately absent, not silently approximated.
