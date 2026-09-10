# Audit — "Viết Kudos" compose flow vs MoMorph specs

- fileKey `9ypp4enmFmdK3YAFJLIu6C` · testPolicy `e2e-red-first` · audit-only (no src/ change)
- Design data pulled verbatim to `../momorph/`:
  - `specs-ihQ26W78P2.csv` (26 rows) · `test-cases-ihQ26W78P2.csv` (57 rows) · `frame-ihQ26W78P2.md`
  - `specs-p9zO-c4a4x.csv` (10 rows) · `test-cases-p9zO-c4a4x.NOTE.txt` (**0 test cases**) · `frame-p9zO-c4a4x.md`
  - `specs-OyDLDuSGEa.csv` (10 rows) · `test-cases-OyDLDuSGEa.csv` (25 rows) · `frame-OyDLDuSGEa.md`
  - `specs-J3-4YFIpMM.csv` (4 rows) · `test-cases-J3-4YFIpMM.csv` (19 rows) · `frame-J3-4YFIpMM.md`
- `pnpm test:unit --run "src/app/(public)/kudos"` → **31 files / 360 tests passed**, exit 0.
- Prior clarifications treated as settled (not re-litigated): `plans/260907-2338-kudos-write-modal/clarifications.md`,
  `plans/260908-0919-kudos-addlink-box/clarifications.md`, `plans/260908-1337-secret-box-modal/clarifications.md`.

---

## Screen ihQ26W78P2 — "Viết Kudo" (compose dialog)

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **GAP** | Structure/copy/tokens match: A → `kudos-compose-dialog.tsx:96-102` (32/40 bold centered); B/B.1/B.2 → `kudos-recipient-field.tsx:83-104` (border `#998C5F`, radius 8, placeholder "Tìm kiếm" `messages/vi.json` `composeModal.recipientPlaceholder`); C/C.1-C.6 → `kudos-format-toolbar.tsx:56-71` (6 buttons); D/D.1 → `kudos-content-field.tsx:100-143`; E/E.1/E.2 → `kudos-hashtag-field.tsx:94-133`; F/F.1-F.5 → `kudos-image-field.tsx:96-152` (button unmounted at 5, `:79`+`:125`); G → `kudos-anonymous-field.tsx:80-91`; H/H.1/H.2 → `kudos-compose-footer.tsx:50-83`. **Missing**: row B.2 `description` states "Error: Khi rỗng hiển thị **viền đỏ** và thông báo" — no compose field ever renders a red border (grep for `FF8A80`/`border-red` in `kudos-recipient-field.tsx`, `kudos-title-field.tsx`, `kudos-content-field.tsx`, `kudos-compose-field.tsx`, `kudos-anonymous-field.tsx` → 0 border hits; only the error `<p>` is red, `kudos-compose-field.tsx:108-118`). Also 3 of the 4 measured label widths in `kudos-compose-field.tsx:42-46` are unused (only hashtag passes `labelWidth={108}`, `kudos-hashtag-field.tsx:91`). |
| Logic | **GAP** | See field-rule table. Two real rule mismatches: hashtag `tooMany` message fires at 5 chips, not on the 6th add (`kudos-hashtag-field.tsx:82` + `use-kudos-compose-attachments.ts:54`); toolbar rows C.1-C.6 all state "Áp dụng **hoặc loại bỏ**" but `insert-markdown-marker.ts:79-81`/`:33-49` only ever apply. Rule ORDER is correct where the spec states one: all required fields report independently and simultaneously (`validate-kudo-draft.ts:66-91`, matching ID-56); images run format → size → count so a malformed 6th file reports `invalidType` not `tooMany` (`validate-kudo-images.ts:73-87`). |
| Test coverage | **GAP** | 51/57 TC rows reach a real test; 3 unmapped (ID-9, ID-23, ID-24), 1 weak (ID-17/ID-53 via `[C14]`), 1 divergent (ID-30). No vacuous tests: every `test()` in `tests/e2e/kudos-compose.spec.ts` has ≥1 `expect` (min 1 = `[C14]`), no empty `catch` anywhere in the kudos tree. |

## Screen p9zO-c4a4x — "Dropdown list hashtag"

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **PASS** | Panel + rows → `kudos-hashtag-picker.tsx:110-145`: dark `#00070C`, border `#998C5F`, radius 8, `p-1.5`, fixed `w-[318px]`; selected row highlight `bg-login-button/20` (row A/B/C "nền tối"), unselected no highlight + `hover:bg-white/5` (row D "hover làm nổi bật nền nhẹ"); check icon 24×24 rendered only when selected, layout stable (`:139-141`, rows A.2/B.2/C.2). `#`-prefix per row A.1 → `:138`. |
| Logic | **GAP** | Rows A.1/B.1/C.1/D `validationNote` = "Condition: Số hashtag đã chọn >= 5 Error: Không cho phép chọn thêm hashtag mới (**disable các mục chưa chọn**)" / row D "Item bị disable — không phản hồi click". `kudos-hashtag-picker.tsx:128-142` renders every row as an always-enabled `<button>` with no `disabled`/`aria-disabled` and no `limitReached` prop at all; the add is only silently swallowed downstream (`kudos-compose-form-rules.ts:90-92`). Toggle-on-click itself is correct (`:100-106`, row A `transitionNote`). |
| Test coverage | **UNVERIFIABLE** | `download_test_cases("p9zO-c4a4x")` → `{"status":"empty","test_case_count":0}`. No MoMorph rows exist to map. Indirect coverage only: `[C12]`/`[C13]`/`[C14]` in `tests/e2e/kudos-compose.spec.ts:431,467,499`. |

## Screen OyDLDuSGEa — "Addlink Box"

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **PASS** (with 2 recorded deviations) | A → `kudos-link-dialog.tsx:94-100`; B/B.1/B.2 → `:103-131`; C/C.1/C.2 → `:138-168`; D/D.1/D.2 → `:171-195` (Hủy bordered + `IconClose`, Lưu `bg-login-button` + `IconLink`). Focus ring per B.2 "Focus: Hiện viền nổi" → `:37`. Error border IS implemented here (`:117-119`, `:153-155`). Deviations already settled in `plans/260908-0919-kudos-addlink-box/clarifications.md:28` (title left-aligned per node `textAlign: left`, beating TC e669b7ef) and `:42-43` (no responsive, no sticky footer). |
| Logic | **PASS** | Every stated rule matches — see field-rule table. Spec C.2 `maxLength=2046` is an acknowledged transcription error in the CSV; row C + TC aad5791a say 2048 and the code uses 2048 (`validate-link-draft.ts:37`, decision recorded at `clarifications.md:32`). |
| Test coverage | **GAP** | 14/25 rows mapped to `tests/e2e/kudos-link-dialog.spec.ts` + `validate-link-draft.test.ts` (21 unit tests). 11 rows are pure GUI geometry/browser-matrix rows with no assertion anywhere (see matrix). |

## Screen J3-4YFIpMM — "Open secret box - chưa mở"

| criterion | verdict | evidence |
|---|---|---|
| UI fidelity | **PASS** | A → `secret-box-dialog.tsx:97-103` (25/32 bold, centered, `text-login-button`); B → `:123-130` (hidden when nothing left, per row B "Nếu số secretbox chưa mở bằng 0 thì ẩn dòng này"); C → `:135-174` (sparkle + closed-box artwork + badge at untouched 64×64, `secret-box-badge-asset.ts:42`); D → `:183-196` (label small/white + number large/bold/`text-login-button`, zero-padded to `04` shape by `:51-53`). Close X (row A "đóng modal bằng nút 'X'") → `:105-113`. |
| Logic | **PASS** (1 minor) | Draw weights in `supabase/migrations/0011_secret_box.sql:161-169` are byte-exact to row C: `<30` stay-gold (30%), `<55` flow-to-horizon (25%), `<75` touch-of-light (20%), `<85` beyond-the-boundary (10%), `<95` revival (10%), else root-further (5%). One badge per opening (single `INSERT`, `:173-175`). Click disabled at 0 → `secret-box-dialog.tsx:138` + `secret-box-launcher.tsx:118`. Count is server-authoritative (`secret-box-launcher.tsx:82-83`, never decremented locally). Minor: `busy` is folded into `canOpen` at `secret-box-launcher.tsx:118`, so the row-B instruction line also disappears mid-request — contradicting `secret-box-dialog.tsx:44-46`'s own contract ("affects only the box's `disabled`, never instruction visibility"). |
| Test coverage | **GAP** | 13/19 rows mapped to `tests/e2e/secret-box.spec.ts` (S01-S13, S15) + `secret-box-badge-asset.test.ts`. 4 rows have no test at all (d566fbeb, 5cc072ad, 2e7bec78, 43badf5d); 2 partially (1f381999 centering/responsive, ce44f5ed counts 4/max). |

---

## Field-rule table — compose form (screen ihQ26W78P2)

| field | spec rule (CSV col=value) | code rule (path:line) | match? |
|---|---|---|---|
| Người nhận (B.2) | `required=true`, `dataType=string`, `minLength`/`maxLength`/`format`/`defaultValue` empty; `validationNote`="Trường bắt buộc / Chọn người nhận từ danh sách (autocomplete) / Tối thiểu 1 ký tự" | required non-blank `validate-kudo-draft.ts:69-71`; value can only be set by picking an option (`use-sunner-suggest.ts:155-159` → `kudos-compose-draft.ts:68`); search min 1 char `use-sunner-suggest.ts:27`+`src/dal/sunner-search.ts:112-114` | **yes** |
| Người nhận — "must select a valid existing Sunner" (B `description`) | validation stated in row B | client-side guaranteed by construction; server only checks non-blank (`create-kudo.ts:116-123`) — a forged `recipientId` hits the FK and returns `reason:"error"` → generic `errorFormIncomplete` (`kudos-compose-form-rules.ts:145`), never a recipient field error | **partial** (gap 9) |
| Người nhận — error presentation (B.2) | "Khi rỗng hiển thị **viền đỏ** và thông báo" | message only, no border change (`kudos-compose-field.tsx:108-118`, `kudos-recipient-field.tsx:83`) | **no** (gap 1) |
| Danh hiệu / `title` | **no CSV row** (node `I520:11647;1688:10448` carries a real `*`) | required non-blank `validate-kudo-draft.ts:72-74`; stored as `hashtags[0]` `create-kudo.ts:149` | **n/a** — agreed 4th required field, `260907-2338/clarifications.md:26-35,64-75` |
| Nội dung (D) | `required=true`, `dataType=string`, no `minLength`/`maxLength`; `validationNote`="Cho phép '@' + tên để nhắc đồng nghiệp / Bắt buộc" | required non-blank `validate-kudo-draft.ts:75-77`; no length cap on the textarea (`kudos-content-field.tsx:100-111`); `@`-mention `kudos-compose-form-rules.ts:151-165` | **yes** |
| Nội dung counter (D.1) | `maxLength` empty; Display lists only the hint line | hint only, no counter (`kudos-content-field.tsx:138-143`) | **yes** — decision `260907-2338/clarifications.md:112-115` |
| Hashtag (E / E.2) | `required=true`, `dataType=string`; `validationNote`="Tối thiểu 1 tag. Tối đa 5 hashtag / Trường bắt buộc" | `<1` → `required`, `>5` → `tooMany` (`validate-kudo-draft.ts:79-84`, `MAX_HASHTAGS=5` `:40`); add blocked at 5 `kudos-compose-form-rules.ts:90-92`; trim + dedupe before counting `:87` and `validate-kudo-draft.ts:53-59` | **yes** on the rule |
| Hashtag — when the max message shows | row E: cap is 5 (5 is legal); ID-16 expects success at 5, ID-17/ID-53 expect the message only when a 6th is attempted | `effectiveError = error ?? (limitReached ? maxMessage : null)` with `limitReached = length >= 5` (`kudos-hashtag-field.tsx:82`, `use-kudos-compose-attachments.ts:54`) → error visible at exactly 5 valid chips | **no** (gap 2) |
| Hashtag rule order | only one code possible per state | `<1` checked before `>5` (`validate-kudo-draft.ts:80-84`); explicit submit `error` wins over `maxMessage` (`kudos-hashtag-field.tsx:82`) | **yes** |
| Image (F) | `required=false`; `validationNote`="Tối đa 5 ảnh"; F.5: "Nếu đã 5 ảnh: ẩn" | not required (`validate-kudo-draft.ts` has no images branch); `MAX_KUDO_IMAGES=5` `validate-kudo-images.ts:35`; button unmounted at 5 `kudos-image-field.tsx:79,125` | **yes** |
| Image — accepted types | CSV states no type rule; ID-21/22 accept `.jpg`/`.png`, ID-23/24/55 reject `.pdf`/`.mp4`/`.txt` | MIME ∈ {image/jpeg,image/png} **and** extension ∈ {.jpg,.jpeg,.png} (`validate-kudo-images.ts:42-57`); input `accept="image/png,image/jpeg"` `kudos-image-field.tsx:147` | **yes** vs TCs |
| Image — size cap | **not in the CSV** | 5 MiB/file (`validate-kudo-images.ts:40`) — AD-4 decision, `260907-2338/clarifications.md:171-179` | **n/a** |
| Image — rejection message | ID-23/24/55 expect "lỗi định dạng file không hợp lệ" | one message for all 3 reasons: `errorImageInvalid` = "Sai định dạng file — chỉ nhận .jpg hoặc .png, tối đa 5 ảnh." (`messages/vi.json`), wired at `use-kudos-compose-attachments.ts:125` — wrong wording for a `tooLarge` rejection | **partial** (gap 10) |
| Gửi ẩn danh (G) | `dataType=boolean`, `required=false`, `defaultValue` empty; "Bật: Hiển thị text field điền tên ẩn danh" | `useState(false)` `use-kudos-compose-form.ts:63`; name input mounted only while checked `kudos-anonymous-field.tsx:93-113`; unchecking clears the typed name `use-kudos-compose-form.ts:99-106` | **yes** |
| Tên ẩn danh | **no CSV row** (frame `p9vFVBE_tc` has no node data) | required when `isAnonymous` (`validate-kudo-draft.ts:86-88`) | **n/a** — D001 decision, `260907-2338/clarifications.md:181-188` |
| `Gửi` (H.2) | "Disable khi các trường bắt buộc (Người nhận, nội dung, hashtag) chưa điền đủ" | `aria-disabled` (never `disabled`) driven by all 4 required fields + conditional anonymousName (`kudos-compose-footer.tsx:46,67`; `use-kudos-compose-form.ts:91`); click always fires so errors can surface (`:69`, ID-56) | **yes**, superset (4 fields) — deliberate, `clarifications.md:31-35` |
| `Gửi` (H) — userAction/transition | "validate form và gửi dữ liệu, show loading, đóng modal khi thành công" | no request for an invalid draft (`use-kudos-compose-form.ts:132-136`); spinner + `aria-busy` (`kudos-compose-footer.tsx:73-81`); close on success via `onSubmitted` (`use-kudos-compose-form.ts:143` → `kudos-compose-launcher.tsx:69`) | **yes** |
| `Hủy` (H.1) | "Đóng modal và bỏ mọi thay đổi, không gửi dữ liệu; State: luôn enabled" | `dialog.close()` → `onClose` → `form.reset()` (`kudos-compose-launcher.tsx:66`, `use-kudos-compose-form.ts:112-125`); no `disabled` attribute (`kudos-compose-footer.tsx:52-56`) | **yes** |
| Escape / close | not in the CSV (native `<dialog>` behaviour) | `onCancel` → same `close()` path (`use-kudos-compose-dialog.ts:75-77`) | **n/a** |
| Toolbar C.1-C.6 | `buttonType=toggle` (C.1); every row: "Áp dụng **hoặc loại bỏ** định dạng" | apply-only: wrap always re-wraps (`insert-markdown-marker.ts:33-49`), line prefixes no-op on a second click instead of removing (`:79-81`) | **no** (gap 4) |
| Toolbar C.4 number / C.6 quote scope | ID-30: select multi-line text → numbered list | prefixes only the line containing `selectionStart` (`insert-markdown-marker.ts:63-90`) | **no** (gap 5) |

### Field-rule table — Add link dialog (screen OyDLDuSGEa)

| field | spec rule (CSV col=value) | code rule (path:line) | match? |
|---|---|---|---|
| Text (B / B.2) | `required=true`, `dataType=string`, `minLength=1`, `maxLength=100`, `validationNote`="Độ dài 1-100 ký tự / Trường bắt buộc / Không chỉ gồm khoảng trắng" | trim → empty ⇒ `errorRequired`; trimmed length >100 ⇒ `errorTextTooLong` (`validate-link-draft.ts:46-57`) | **yes** |
| Text rule order | required before length (TC 3912184e vs 7d85997d) | required checked first (`validate-link-draft.ts:48-55`) | **yes** |
| Link (C) | `required=true`, `dataType=string`, `format=url`, `minLength=5`, `maxLength=2048`, `validationNote`="Định dạng URL hợp lệ (http/https) / Độ dài 5-2048 ký tự / Trường bắt buộc" | trim → empty ⇒ `errorRequired`; length <5 or >2048 ⇒ `errorUrlLength`; `new URL()` throw ⇒ `errorUrlInvalid`; protocol ∉ {http:,https:} ⇒ `errorUrlInvalid` (`validate-link-draft.ts:70-91`) | **yes** |
| Link rule order | TC aad5791a: `"www"` (4 chars) ⇒ length error, **not** format error | length gate runs before `new URL()` (`validate-link-draft.ts:75-84`) | **yes** |
| Link — validate trigger | row C: "Blur: Kiểm tra định dạng URL"; D.2: validate on Lưu | blur validates format only when non-empty (`use-kudos-link-dialog.ts:124-127`); Lưu validates both fields (`:129-134`) | **yes** |
| C.2 (duplicate row) | `minLength=5`, `maxLength=2046` | 2048 used | **no**, but CSV row C.2 is a known transcription error; `clarifications.md:32` resolves to 2048 |
| Lưu (D.2) | "Validate các trường; nếu hợp lệ lưu và đóng; nếu lỗi hiển thị thông báo" | never `aria-disabled` (`kudos-link-dialog.tsx:185-189`); invalid ⇒ errors + dialog stays open (`use-kudos-link-dialog.ts:131-134`); valid ⇒ close + insert markdown (`kudos-compose-link-dialog.tsx:68-79`) | **yes** |
| Hủy (D.1) / Escape | "Đóng modal và hủy thay đổi" | `close()` resets both fields + errors, textarea untouched (`use-kudos-link-dialog.ts:82-92`); Escape stops propagation so the parent dialog survives (`kudos-compose-link-dialog.tsx:63-66`) | **yes** |
| B.1 label click focuses input | TC 8100906c | `<label htmlFor="kudos-link-text-input">` (`kudos-link-dialog.tsx:104-106`) | **yes** |
| C.1 label "Không tương tác" | row C.1 `description`; TC 96b032e1 "non-interactive" | rendered as `<label htmlFor>` ⇒ clicking it focuses the URL input (`kudos-link-dialog.tsx:139-141`) | **no** (gap 7) |

---

## Gaps

1. **severity: major** — Compose fields never show the red border the spec and docs both require.
   Spec `specs-ihQ26W78P2.csv` row **B.2** ("Error: Khi rỗng hiển thị viền đỏ và thông báo"), TC **ID-7** and **ID-50** (both High), plus `docs/vi/features/F009_KudosCompose/functional-spec.md:93` (FR-402), `:215`, `technical-spec.md:169` (DEC-002), `:262`, `docs/vi/screens/SCR008_KudosCompose/spec.md:132`. Code: `src/app/(public)/kudos/_components/kudos-compose-field.tsx:108-118` renders only the red `<p>`; `kudos-recipient-field.tsx:83`, `kudos-title-field.tsx:75`, `kudos-content-field.tsx:110`, `kudos-anonymous-field.tsx:110` all hard-code `border-[#998C5F]` with no error variant.
   *Fix:* mirror the pattern the link dialog already uses (`kudos-link-dialog.tsx:117-119`): swap the border token to `#FF8A80` when the field's `error` is set.

2. **severity: major** — Hashtag "Tối đa 5 hashtag." is displayed at 5 chips instead of when a 6th is attempted.
   Spec row **E**/`E.2` `validationNote` treats 5 as legal; TC **ID-16** expects "5 hashtag được thêm thành công" (no error), TC **ID-17**/**ID-53** expect the message only on the 6th attempt. Code: `kudos-hashtag-field.tsx:82` (`error ?? (limitReached ? maxMessage : null)`) with `limitReached = hashtags.length >= MAX_HASHTAG_CHIPS` (`_hooks/use-kudos-compose-attachments.ts:54`). Knock-on: `tests/e2e/kudos-compose.spec.ts:499` `[C14]` asserts only that the message is visible, which is already true before the 6th add — the test cannot distinguish "blocked" from "not blocked" and never asserts the chip count stays 5.
   *Fix:* keep `limitReached` for `aria-disabled`, but surface `maxMessage` from a separate "a 6th add was rejected" flag (`addHashtagToList`'s `limitReached` return, `kudos-compose-form-rules.ts:90-92`), and add `expect(chips).toHaveCount(5)` to `[C14]`.

3. **severity: major** — Hashtag dropdown rows are not disabled once 5 are selected.
   Spec `specs-p9zO-c4a4x.csv` rows **A.1**, **B.1**, **C.1**, **D** all state `validationNote` "Số hashtag đã chọn >= 5 … disable các mục chưa chọn" / "Item bị disable — không phản hồi click", and row D's `transitionNote` repeats it. Code: `kudos-hashtag-picker.tsx:128-142` renders every row as an unconditionally enabled `<button>`; the component receives no cap/`limitReached` prop (`:5-21`), so nothing to gate on.
   *Fix:* pass `limitReached` down from `kudos-hashtag-field.tsx:135-144` and set `disabled`/`aria-disabled` on rows where `!isSelected && limitReached`.

4. **severity: minor** — Format toolbar applies but never removes formatting.
   Spec rows **C.1**–**C.6** each say "Áp dụng **hoặc loại bỏ** định dạng", and C.1's `buttonType` is literally `toggle`. Code: `_utils/insert-markdown-marker.ts:33-49` always re-wraps, and `:79-81` returns the value unchanged when the prefix is already present instead of stripping it. Not covered by any test (ID-27..32 only assert apply).
   *Fix:* in `wrapSelection`, detect an already-wrapped selection and strip the markers; in `insertLinePrefix`, remove the prefix on the already-prefixed branch.

5. **severity: minor** — Number/quote prefix only the caret's line, not a multi-line selection.
   TC **ID-30** selects multi-line text and expects a numbered list. Code: `_utils/insert-markdown-marker.ts:63-90` ("always the line containing `selectionStart`, never a multi-line selection"); unit test `_utils/insert-markdown-marker.test.ts:90` pins the single-line behaviour.
   *Fix:* iterate lines from `selectionStart` to `selectionEnd` in `insertLinePrefix` and prefix each, then widen the returned selection.

6. **severity: minor** — Add-link 'Link'/'Text' labels are focus-transferring, but row C.1 declares the Link label non-interactive.
   Spec row **C.1** `description` ("Interaction: Không tương tác, chỉ để thông tin") and TC **96b032e1**. Code: `kudos-link-dialog.tsx:139-141` uses `<label htmlFor="kudos-link-url-input">`. (Row B.1 *wants* this behaviour, so the two rows disagree; only C is affected.)
   *Fix:* keep the `<label>` for the accessible name but drop `htmlFor` on the URL row and give the input an `aria-labelledby` instead — or accept and record the deviation, since a11y arguably beats row C.1 here.

7. **severity: minor** — Secret Box instruction line disappears while the open request is in flight.
   Spec `specs-J3-4YFIpMM.csv` row **B** ties visibility to one condition only ("Nếu số secretbox chưa mở bằng 0 thì ẩn dòng này"); TC **d9d6e01a** likewise. Code: `secret-box-dialog.tsx:123` gates the line on `canOpen`, and `secret-box-launcher.tsx:118` passes `canOpen={live > 0 && !busy}` — folding the transient `busy` into it, contradicting `secret-box-dialog.tsx:44-46`'s own prop contract.
   *Fix:* pass `canOpen={live > 0}` and let the existing `busy` prop alone drive the box's `disabled` (`secret-box-dialog.tsx:138` already does `!canOpen || busy`).

8. **severity: minor** — A forged/stale `recipientId` produces a generic form error, not a recipient field error.
   Spec row **B** `description`: "Validation: must select a valid existing Sunner". Code: `_actions/create-kudo.ts:116-123` only checks non-blank; a non-existent id reaches `.insert` (`:144-153`), trips the FK, and maps to `reason:"error"` → `copy.errorFormIncomplete` (`_hooks/kudos-compose-form-rules.ts:145`).
   *Fix:* look the id up through `searchSunners`/`profile_cards` (or map the FK violation code) and return `fieldErrors.recipientId = "required"`.

9. **severity: minor** — One image error message covers three different rejection reasons.
   `validate-kudo-images.ts:20` distinguishes `invalidType`/`tooMany`/`tooLarge`, but `use-kudos-compose-attachments.ts:112,125` renders the single string `errorImageInvalid` = "Sai định dạng file — chỉ nhận .jpg hoặc .png, tối đa 5 ảnh." — wrong wording for a >5 MiB `.jpg`. (Size is not a CSV rule; this is an AD-4 addition.)
   *Fix:* add `errorImageTooLarge` to `messages/{vi,en}.json` and select on `reason` in `intakeImageFiles`'s result.

10. **severity: minor** — Compose text inputs kill the focus indicator with no replacement.
    `kudos-recipient-field.tsx:97`, `kudos-title-field.tsx:75`, `kudos-content-field.tsx:110`, `kudos-hashtag-picker.tsx:121` all set `focus:outline-none` and add nothing back; the buttons (`kudos-compose-footer.tsx:56,70`) and the link-dialog inputs (`kudos-link-dialog.tsx:37`) do add a ring. No CSV row states a focus style for these fields, so this is an a11y regression rather than a spec mismatch.
    *Fix:* append the same `focus-visible:ring-2 focus-visible:ring-login-button-text` used in `kudos-link-dialog.tsx:37`.

11. **severity: minor** — Three of the four measured label widths in the shared field shell are never passed.
    `kudos-compose-field.tsx:42-46` records 146 (Recipient), 139 (Danh hiệu), 108 (Hashtag), 74 (Image), but only `kudos-hashtag-field.tsx:91` passes `labelWidth`; `kudos-recipient-field.tsx:73-79`, `kudos-title-field.tsx:53-59`, `kudos-image-field.tsx:90-95` omit it, so those label columns are content-sized instead of the frame's measured widths (spec row **B** Display: "Layout: title (left) + search input (right, flex-grow)").
    *Fix:* pass `labelWidth={146|139|74}` at those three call sites.

12. **severity: minor** — Test gaps against MoMorph rows with no mapped assertion at all:
    compose **ID-9** (`"@ # $"` search input), **ID-23** (`.pdf`), **ID-24** (`.mp4`); secret box **d566fbeb** (badge distribution), **5cc072ad** (client-side counter tampering ignored), **2e7bec78** (badge URL tampering), **43badf5d** (invalid badge data); Add link's 11 GUI-geometry/browser-matrix rows.
    *Fix:* extend `_utils/validate-kudo-images.test.ts` with `.pdf`/`.mp4` cases and `_actions/search-sunners.test.ts` with a punctuation query (cheap, no e2e); leave the statistical/geometry rows recorded as out of scope rather than faking them.

13. **severity: minor** — Stale doc comments now contradict the code they describe.
    `kudos-recipient-field.tsx:46-50`, `kudos-title-field.tsx:36-41` and `kudos-anonymous-field.tsx:29-31` all state that `KudosComposeField` "stacks label above children", flagging it as an unfixed deviation from spec row B's side-by-side layout — but `kudos-compose-field.tsx:85` now defaults `layout = "row"` and `:120-129` renders label beside control. The deviation is fixed; only the comments still claim otherwise.
    *Fix:* delete those three stale paragraphs.

---

## TC coverage matrix

### ihQ26W78P2 — "Viết Kudo" (57 rows)

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| ID-0 | authed user opens modal | e2e `[C03]` `tests/e2e/kudos-compose.spec.ts:170` | covered |
| ID-1 | unauthenticated blocked | e2e `[C01]` `:94`, `[C02]` `:115` | covered |
| ID-2 | navigate via pill | e2e `[C03]` `:170` | covered |
| ID-3 | overall layout order | e2e `[C04]` `:190` | covered |
| ID-4 | recipient placeholder | e2e `[C05]` `:234` | covered |
| ID-5 | textarea placeholder | e2e `[C05]` `:234` | covered |
| ID-6 | checkbox default unchecked | e2e `[C05]` `:234` | covered |
| ID-7 | recipient required → red border + error | e2e `[C20]` `:730`; unit `validate-kudo-draft.test.ts:22` | partial — no red border asserted (gap 1) |
| ID-8 | autocomplete "Nguyễn" | e2e `[C21]` `:824` | covered |
| ID-9 | `"@ # $"` query | — | **gap** |
| ID-10 | leading/trailing spaces trimmed | unit `_actions/search-sunners.test.ts` "đã trim query" | covered |
| ID-11 | content required | e2e `[C20]` `:730`; unit `validate-kudo-draft.test.ts:22` | covered |
| ID-12 | mention list on `@` | e2e `[C27]` `:1173`; unit `kudos-compose-form-rules.test.ts:185-201` | covered |
| ID-13 | pick a mention | e2e `[C27]` `:1173`; unit `:207-223` | covered |
| ID-14 | hashtag required | e2e `[C20]` `:730`; unit `validate-kudo-draft.test.ts:22` | covered |
| ID-15 | 1 tag → submit succeeds | e2e `[C22]` `:853`, `[C23]` `:895` | covered |
| ID-16 | 5 tags accepted | unit `validate-kudo-draft.test.ts:73`; e2e `[C14]` `:499` | partial — `[C14]` asserts an error at 5 (gap 2) |
| ID-17 | 6th tag blocked + message | e2e `[C14]` `:499`; unit `kudos-compose-form-rules.test.ts:95` | weak — `[C14]` has 1 assertion that is already true at 5 chips |
| ID-18 | 3 images uploaded | e2e `[C15]` `:531` | covered |
| ID-19 | 5 images → add hidden | e2e `[C16]` `:580` | covered |
| ID-20 | 6th image rejected | unit `validate-kudo-images.test.ts:88` | covered |
| ID-21 | `.jpg` accepted | e2e `[C15]` `:531`; unit `validate-kudo-images.test.ts:26` | covered |
| ID-22 | `.png` accepted | e2e `[C15]` `:531`; unit `:64` | covered |
| ID-23 | `.pdf` rejected | — (only `.txt` tested) | **gap** |
| ID-24 | `.mp4` rejected | — | **gap** |
| ID-25 | suggestions appear while typing | e2e `[C21]` `:824` | covered |
| ID-26 | select option → field filled, dropdown closes | e2e `[C21]` `:824` | covered |
| ID-27 | Bold | e2e `[C09]` `:364`; unit `insert-markdown-marker.test.ts:6` | covered |
| ID-28 | Italic | unit `insert-markdown-marker.test.ts:16` | covered |
| ID-29 | Strike | unit `:26` | covered |
| ID-30 | Number list over multi-line selection | unit `:46`, `:90` (single line only) | **divergent** (gap 5) |
| ID-31 | Insert link | e2e `[L01]`-`[L08]` `tests/e2e/kudos-link-dialog.spec.ts`; unit `:100` | covered |
| ID-32 | Quote | unit `:68` | covered |
| ID-33 | Mention `@Nguyen` | e2e `[C27]` `:1173` | covered |
| ID-34 | add "TeamWork" chip | e2e `[C12]` `:431` | covered |
| ID-35 | 3 separate chips | e2e `[C13]` `:467` | covered |
| ID-36 | remove a chip | e2e `[C13]` `:467` | covered |
| ID-37 | add 1 image via picker | e2e `[C15]` `:531` | covered |
| ID-38 | add button hidden after the 5th | e2e `[C16]` `:580` | covered |
| ID-39 | remove the 2nd of 3 images | e2e `[C16]` `:580` (removes 1 of 5) | partial |
| ID-40 | remove at 5 → button returns | e2e `[C16]` `:580` | covered |
| ID-41 | checkbox on | e2e `[C18]` `:648` | covered |
| ID-42 | checkbox off | e2e `[C18]` `:648` | covered |
| ID-43 | name field appears | e2e `[C18]` `:648` | covered |
| ID-44 | name field removed | e2e `[C18]` `:648` | covered |
| ID-45 | Hủy closes, nothing saved | e2e `[C08]` `:337`, `[C07]` `:308` | covered |
| ID-46 | submit full form + 2 images | e2e `[C24]` `:944` | covered |
| ID-47 | submit with 1 tag, no image | e2e `[C23]` `:895` | covered |
| ID-48 | Gửi disabled when empty | e2e `[C05]` `:234` | covered |
| ID-49 | Gửi enabled when valid | e2e `[C22]` `:853`; unit `validate-kudo-draft.test.ts:58` | covered |
| ID-50 | recipient empty error | e2e `[C20]` `:730` | partial — no red border (gap 1) |
| ID-51 | content empty error | e2e `[C20]` `:730` | covered |
| ID-52 | hashtag empty error | e2e `[C20]` `:730` | covered |
| ID-53 | 6th hashtag exceed error | e2e `[C14]` `:499` | weak (see ID-17) |
| ID-54 | 6th image blocked | e2e `[C16]` `:580`; unit `validate-kudo-images.test.ts:88` | covered |
| ID-55 | `.txt` rejected | e2e `[C17]` `:619`; unit `:39` | covered |
| ID-56 | all required empty → all errors, no submit | e2e `[C20]` `:730`; unit `validate-kudo-draft.test.ts:22` | covered |

### p9zO-c4a4x — "Dropdown list hashtag"

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| *(none)* | MoMorph holds 0 test cases for this screen | indirect: `[C12]`/`[C13]`/`[C14]` | **unverifiable** |

### OyDLDuSGEa — "Addlink Box" (25 rows)

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| 70006b13 | access by auth state | inherited compose gate `[C01]` | partial — agreed, `260908-0919/clarifications.md:41` |
| 1a55a427 | only one modal instance | `showModal()` no-op `use-kudos-link-dialog.ts:105-107` | partial — no explicit test |
| 2efb76ce | centered/responsive/multi-browser | — | **gap** — agreed out of scope `clarifications.md:42` |
| e669b7ef | title top-center | e2e `[L01]` `tests/e2e/kudos-link-dialog.spec.ts:112` | **divergent** — left-aligned by design decision `clarifications.md:28` |
| 24d2a229 | Text input 672×56, white bg | — | gap (visual only) |
| a98b51d4 | Text label left of input | — | gap (visual only) |
| 28793eb6 | Link input 672×56 | — | gap (visual only) |
| 96b032e1 | Link label left + non-interactive | — | **divergent** (gap 6) |
| abddef4b | button group anchored on scroll | — | gap — agreed N/A `clarifications.md:43` |
| b13a3dcc | Hủy bordered + X icon | — | gap (visual only) |
| 096b9346 | Lưu large yellow + link icon | — | gap (visual only) |
| 7d5ff602 | Text empty by default | e2e `[L01]` `:112`, `[L10]` `:488` | covered |
| 57a9b74f | Link empty by default | e2e `[L01]` `:112`, `[L10]` `:488` | covered |
| f0c0e8f1 | focus highlights Text border | implemented `kudos-link-dialog.tsx:37` | partial — not asserted |
| 8100906c | Text label click focuses input | implemented `kudos-link-dialog.tsx:104` | partial — not asserted |
| 48467d34 | Hủy / double-click / ESC close | e2e `[L02]` `:156`, `[L03]` `:195` | partial — double-click untested |
| 13c491cb | Lưu valid → save + close | e2e `[L08]` `:401` | covered |
| 3912184e | Text required | e2e `[L04]` `:235`; unit `validate-link-draft.test.ts:16` | covered |
| adb699ca | Text whitespace-only | e2e `[L05]` `:267`; unit `:22` | covered |
| 7d85997d | Text 1-100 chars | e2e `[L06]` `:304`; unit `:28,:38` | covered |
| 97dc4028 | Link required | e2e `[L04]` `:235`; unit `:45` | covered |
| db2ca333 | Link URL format | e2e `[L07]` `:357`; unit `:67,:75,:81` | covered |
| aad5791a | Link 5-2048 chars | e2e `[L07]` `:357`; unit `:51,:57,:61` | covered |
| e5632ac7 | prevent save, show per-field errors | e2e `[L04]` `:235` | covered |
| ef4d0413 | close on successful save | e2e `[L08]` `:401` | covered |

### J3-4YFIpMM — "Open secret box - chưa mở" (19 rows)

| TC_ID | objective (short) | covered by | status |
|---|---|---|---|
| 84a5ba82 | only entitled logged-in users | e2e `[S13]` `tests/e2e/secret-box.spec.ts:525`, `[S15]` `:561` | covered |
| 1f381999 | title centered, responsive | e2e `[S03]` `:287` (text only) | partial |
| d9d6e01a | instruction display condition | e2e `[S04]` `:302`, `[S10]` `:414` | covered |
| dd842531 | box image centered/proportional | e2e `[S06]` `:334` (visibility only) | partial |
| 56da7ec8 | each badge type renders distinctly | e2e `[S07]` `:348`; unit `secret-box-badge-asset.test.ts` (all 6 files exist) | partial |
| 3a8ac6b5 | counter label + number styling, non-interactive | e2e `[S05]` `:316` | partial |
| 632c600b | close button top-right, always visible | e2e `[S11]` `:440` (click only) | partial |
| a0cd2f27 | exact revealed title string | e2e `[S09]` `:396` | covered |
| a891383a | exact instruction string | e2e `[S04]` `:302` | covered |
| 4bbf0b67 | badge shown right after opening | e2e `[S07]` `:348` | covered |
| ce44f5ed | counter values 0 / 1 / 4 / max | e2e `[S05]` `:316` (1), `[S10]` `:414` (0) | partial — 4/max untested, `padCount` has no unit test |
| 7c3c912f | click → badge, count-1, refresh | e2e `[S07]` `:348`, `[S08]` `:371` | covered |
| 2a8a63de | click disabled at 0 | e2e `[S10]` `:414` | covered |
| 982ae7f9 | X closes modal | e2e `[S11]` `:440`, `[S12]` `:456` | covered |
| d566fbeb | badge probability distribution | — | **gap** |
| 96fb45e8 | counter always from backend | e2e `[S08]` `:371`; `secret-box-launcher.tsx:82-83` | covered |
| 43badf5d | invalid badge data → fallback image | — | **gap** — code fails closed instead (`src/dal/secret-box.ts:141-145`), per phase-03 security decision |
| 5cc072ad | client-side counter tampering ignored | — | **gap** |
| 2e7bec78 | badge URL tampering blocked | — | **gap** |

Vacuous-test scan: 0 tests with 0 assertions across `kudos-compose.spec.ts` (min 1), `kudos-link-dialog.spec.ts` (min 2), `secret-box.spec.ts` (min 1); no empty `catch` / `.catch(() => {})` anywhere under `src/app/(public)/kudos` or those three specs. `[C14]` is the one *weak* test (1 assertion that cannot fail the behaviour it claims to cover) — see gap 2. `secret-box.spec.ts` has an S14 numbering gap (S01-S13, S15) with no missing behaviour attached.

---

## Unverifiable items

1. **Test coverage for `p9zO-c4a4x`** — MoMorph returns `test_case_count: 0`; there are no rows to map. Recorded in `../momorph/test-cases-p9zO-c4a4x.NOTE.txt`.
2. **Pixel geometry in general** — `get_frame`/`get_node` were not re-run for measurements in this audit; every dimension quoted above comes from a CSV `description` field or from a `mm:` comment already in the code. Where the CSV states a number (672×56 for the link inputs, 24×24 for the check icon, 514×56 for the recipient search, 318px picker width) the code agrees; where it does not, no value was inferred.
3. **Compose dialog responsiveness** — no CSV row on any of the 4 screens states a breakpoint or a mobile size. `kudos-compose-dialog.tsx:93` (`w-[752px]`), `kudos-link-dialog.tsx:91` (`w-[752px]`) and `secret-box-dialog.tsx:92` (`w-163`) are all fixed-width. Secret-box TCs 1f381999/dd842531 mention "desktop and mobile" but state no target values, so conformance cannot be judged from the specs.
4. **Hover states** (`p9zO` rows A/B/C/D: "hover làm nổi bật nền nhẹ") — `kudos-hashtag-picker.tsx:136` applies `hover:bg-white/5` for unselected rows but nothing for selected ones; the CSV gives no hover colour, so whether `white/5` is the intended intensity is unverifiable.
5. **Badge distribution in practice** — the SQL thresholds match the spec exactly, but no run of `open_secret_box()` was executed (no local DB session in this audit), so TC d566fbeb's empirical 100-draw check remains unverified.
6. **Rendered visual comparison** — no Playwright/screenshot capture was performed (e2e is orchestrator-owned in this session), so every UI-fidelity verdict is source-level, not pixel-level.
