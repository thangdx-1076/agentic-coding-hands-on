# Phase 03 decisions — `kudos.composeModal` copy

Recorded per phase-03's step 4 instruction and CLAUDE.md § "Quyết định thay tôi". None of
these reopen a clarifications.md decision; they fill gaps clarifications.md already flagged
as having no design node.

## anonymousNamePlaceholder / anonymousNameLabel

**Chosen**: `"Tên ẩn danh"` (vi) / `"Anonymous name"` (en), used as BOTH keys' value.

**Why**: spec item G gives no placeholder text (frame `p9vFVBE_tc` "Ẩn danh" is
design-in-progress with no node data — clarifications.md § "Frame phụ trợ"). Followed the
plan's own instruction to reuse `kudos-hero-search-pill.tsx`'s pattern, where a field with no
separate label text uses the same string for both `aria-label`/visible label and `placeholder`
(`kudos-hero-search-pill.tsx:34-40`). Priority (b) "khớp pattern đã có trong repo".

## recipientEmpty / recipientLoading

**Chosen**: `"Không tìm thấy Sunner phù hợp"` / `"Đang tìm kiếm…"` (vi); `"No matching Sunner
found"` / `"Searching…"` (en).

**Why**: the recipient-suggestion dropdown frames (`QIMJNgFb8K`, `zJzaC9GgXt`) carry no node
data at all (clarifications.md § "Frame phụ trợ" — "không có số đo nào"). No e2e assertion
pins either string (checked `tests/e2e/kudos-compose.spec.ts` C21). Tone matches existing
`kudos.sidebar.emptyBoard` ("Chưa có dữ liệu") and `kudos.spotlight.searchPlaceholder`
("Tìm kiếm"). Priority (c) "ít file thay đổi nhất" — plain, generic copy, easy to swap once a
real design lands for that frame.

## hashtagPickerLabel, hashtagRemove, imageRemove (interpolated aria-label templates)

**Chosen**: `hashtagPickerLabel: "Chọn hashtag"`; `hashtagRemove: "Xóa hashtag {tag}"`;
`imageRemove: "Xóa ảnh {index}"` (and EN equivalents).

**Why**: no design node gives accessible names for the picker listbox or the per-chip/
per-thumbnail remove buttons. `{tag}`/`{index}` interpolation follows the repo's existing
precedent for parameterized a11y strings (`kudos-copy.ts`'s `heartLabel: "{count} lượt tim"`,
consumed via `.replace()` in `kudos-heart-button.tsx:58`) — Track A phases (11/12) do the same
`.replace()` when rendering each chip/thumbnail's remove button.

## submitting (Submit-button in-flight label)

**Chosen**: `"Đang gửi…"` / `"Sending…"`.

**Why**: functional-spec.md § 4 (H) only says "show loading", no literal string. No e2e
assertion checks this text. Kept the same em-dash-free ellipsis style as the other invented
loading string above for consistency within this one file.

## unauthenticatedHint — added beyond phase-03's locked key list

**Chosen**: added `unauthenticatedHint: "Vui lòng đăng nhập để gửi Kudo."` (verbatim from
functional-spec.md § 9's edge-case table for FR-102/FR-601), even though phase-03's own
Architecture Notes section lists a closed key set that does not include it.

**Why**: this file is exclusively owned by phase 03 — no later phase (13's launcher/pill
wiring is the natural consumer) can add a key here without violating file ownership. The
orchestrator's task brief for this phase explicitly required covering "the unauthenticated
hint" as a hard constraint. Adding one extra key+value now costs nothing (pure type/const,
no test obligation) and avoids blocking phase 13 later. No existing Track A phase reads this
file yet, so nothing breaks by extending the shape.

## toolbar aria-labels (bold/italic/strike/number/link/quote)

**Chosen**: `"In đậm"`, `"In nghiêng"`, `"Gạch ngang"`, `"Đánh số"`, `"Chèn liên kết"`,
`"Trích dẫn"` (vi); `"Bold"`, `"Italic"`, `"Strikethrough"`, `"Numbered list"`, `"Insert
link"`, `"Quote"` (en).

**Why**: spec items C.1-C.6 only give the visible glyph (`B`, `I`, `S`, icon, icon, icon) —
no separate accessible-name text. Extracted the functional verb from each item's own
`description` field (per phase-03 step 1: "lấy `description`/`character` thật"), e.g. C.1's
description says "bật/tắt **in đậm**" → `"In đậm"`.

## Fix (post-review) — errorImageInvalid missing the substring C17 asserts

**Reported by**: coordinator, after phase-03 handoff. `tests/e2e/kudos-compose.spec.ts` C17
(ID-55) does:

```ts
const errorMsg = dialog
  .locator("[data-testid=kudos-field-error]")
  .filter({ hasText: /định dạng|format/ });
```

— a plain (non-`i`-flag) regex, so it needs the lowercase substring `định dạng` (vi) or
`format` (en) verbatim inside whatever text `errorImageInvalid` renders. The original value —
functional-spec.md § 9's verbatim edge-case text, `"Chỉ nhận file .jpg hoặc .png, tối đa 5
ảnh."` — contains neither, so C17 would never pass even though the correct error is shown.

**Changed** `errorImageInvalid` in `messages/vi.json`, `messages/en.json`, and
`kudos-compose-copy.ts`'s `defaultKudosComposeCopy` (kept in sync, all three identical) from:

- vi: `"Chỉ nhận file .jpg hoặc .png, tối đa 5 ảnh."`
- en: `"Only .jpg or .png files are allowed, up to 5 images."`

to:

- vi: `"Sai định dạng file — chỉ nhận .jpg hoặc .png, tối đa 5 ảnh."`
- en: `"Invalid file format — only .jpg or .png, up to 5 images."`

**Why this exact phrasing, not the coordinator's literal suggestion**: the coordinator's
suggested vi string opened with capitalized `"Định dạng file không hợp lệ — …"`. The regex has
no `i` flag, and Vietnamese `Đ` (U+0110, sentence-initial capital) and `đ` (U+0111, the regex's
first character) are different code points — a leading-capital `"Định"` does NOT match
`/định dạng/`. Reworded so `"định dạng"` sits mid-sentence (`"Sai định dạng file — …"`), where
only the true first word (`"Sai"`) is capitalized, keeping the lowercase `đ` the regex needs
while still reading as a natural Vietnamese sentence. Kept the spec's original file-type/count
guidance (`.jpg`/`.png`, tối đa 5 ảnh) as the sentence's second half rather than dropping it.
The `định dạng` substring itself was extracted with a Python script reading
`tests/e2e/kudos-compose.spec.ts` line 609 directly (not retyped), to rule out an NFC/NFD
Unicode-normalization mismatch; a follow-up script confirmed byte-for-byte equality between
`messages/vi.json`, `messages/en.json`, and the `.ts` default, and confirmed both strings match
`/định dạng|format/`. Verified: `pnpm exec vitest run src/lib/i18n/messages-parity.test.ts`
(2/2 pass), `pnpm lint --max-warnings 0` (clean), `pnpm format:check` (clean).
