# Asset dimensions & provenance — F007 Kudos Live board (phase 02)

Source frame: `https://momorph.ai/api/images/9ypp4enmFmdK3YAFJLIu6C/2940:13431/4a8b157edc6227ef6fe0b3ba3f01a91a.png`
(full page export, 1440 × 5862 px, saved at `plans/260907-1725-kudos-live-board/momorph/frame-image.png`).
All pixel coordinates below are measured against this export (1x, matches a 1440px desktop viewport).

## Reuse existing assets — do NOT duplicate into `public/kudos/`

Visual comparison against the frame confirmed these already-downloaded assets are the exact
same graphics reused by this screen. Track A should reference them at their existing path.

| Design element | Existing asset | Real size | Notes |
|---|---|---|---|
| Banner logo lockup ("SAA 2025 KUDOS", mm:2940:13437 sub-element) | `/home/Logo_Kudos.svg` | 364×74 (viewBox) | Byte-identical wordmark, confirmed via rendered thumbnail diff against the banner crop. Use as the ONE `<img alt="SAA 2025 KUDOS">` required by e2e C02 — do not add a second `<img>` in `[data-testid=kudos-banner]` or C02's `toHaveCount(1)` fails. |
| Hashtag/Phòng ban dropdown chevron (mm:2940:13459/13460) | `/login/Down.svg` | 24×24 | Simple down chevron, `fill="white"`; rotate/recolor as needed per dropdown open state. |
| "Legend Hero" tier badge | `/standards/legend-hero.png` | — | Same badge pill shown next to sender/receiver name on every Kudos card. |
| "Rising Hero" tier badge | `/standards/rising-hero.png` | — | ditto |
| "Super Hero" tier badge | `/standards/super-hero.png` | — | ditto |
| "New Hero"/base tier badge | `/standards/new-hero.png` | — | ditto — pick per user's hoa-thị tier per spec B.3.2 logic (phase 07/09/11 own this mapping) |

`profile.stats.rows.*` / `profile.stats.openSecretBox` (messages/*.json) already carry the exact
same 5 sidebar stat labels and "Mở/Open Secret Box 🎁" button text pixel-for-pixel matching this
screen's sidebar (D block). Per clarifications.md ("kudos namespace chỉ chứa leaf riêng của
board"), phase 02 still adds independent `kudos.sidebar.*` keys with the same literal values
instead of cross-reading the `profile` namespace, so the two screens don't couple through
translation keys. Logged as a decision in `plans/action-items.md`.

## New assets added to `public/kudos/`

| File | Real size | Source region (frame px) | Intended use |
|---|---|---|---|
| `banner-artwork.png` | 590×295 px | crop `(850,100)-(1440,395)` | Decorative swirl artwork only — crop deliberately avoids the title text, logo lockup, and the compose/search pill rows so nothing is baked in twice. Use as a CSS `background-image` (e.g. `background-position: right top; background-repeat: no-repeat` on the banner `<section>`), **not** an `<img>` tag — e2e C02 asserts exactly one `<img>` inside `[data-testid=kudos-banner]` (the logo). This is a partial (right-side only) crop from the flattened page screenshot; if pixel-perfect full-bleed coverage is needed, re-export node `2940:13437` directly from MoMorph during Track A implementation. |
| `icon-chevron-right.svg` | 24×24 viewBox | — (hand-drawn, standard glyph) | Carousel prev/next buttons (mm:2940:13470/13468). Design renders these as thin circular icon buttons; mirror horizontally (`scale-x-[-1]`) for "prev". |
| `icon-search.svg` | 24×24 viewBox | — | Spotlight Sunner search input icon (mm:2940:14833, kính lúp). |
| `icon-heart.svg` | 24×24 viewBox | — | Card heart/like button (mm:I3127:21871;256:5175). Single `currentColor` path — toggle color (gray inactive / red active) via CSS, no separate filled/outline asset needed. |
| `icon-send-arrow.svg` | 24×24 viewBox | — | Sender→receiver arrow on every card (mm:B.3.4 / I3127:21871 area). Simple filled triangle, matches the design's paper-plane-style connector. |
| `icon-gift.svg` | 24×24 viewBox | — | Sidebar "Mở Secret Box" button (mm:2940:13497). Design itself renders a colorful gift emoji glyph (🎁) glued to the text — the copy already embeds it literally (`kudos.sidebar.openGift` = "Mở Secret Box 🎁", matching the existing `profile.stats.openSecretBox` precedent). This SVG is provided as a fallback/alternative if phase 12 prefers a vector icon over the emoji glyph; not required if the emoji-in-text approach is kept. |

All five icons are hand-authored (no MCP vector export available in this session) using standard,
widely-recognized glyph shapes (Material Design "chevron_right", "search", "favorite",
"play_arrow", "card_giftcard") matched against the visual crops taken from the frame export —
they are not invented data, just generic pictograms redrawn to the repo's existing icon
convention (single path, `viewBox="0 0 24 24"`, `fill="currentColor"`). `momorph-implement-design`
(Track A) has direct MoMorph MCP access during phases 07–12 and should replace any of these with
a pixel-exact vector export if closer fidelity is needed — nothing here blocks that swap.

## Deferred / explicitly not built

- Fire-streak "×2" badge next to "Số tim bạn nhận được" (special-day +2 hearts rule) — deferred
  per clarifications § "Quy tắc tim (C.4.1)"; no asset added.
- Dialog/lightbox/hover-preview frames (Viết Kudo, Secret Box, Xem chi tiết, hover avatar,
  ảnh full) — deferred per clarifications § "Phạm vi F007"; no assets added for them.

## Colors sampled (for reference, not enforced)

- Page/base background behind the banner: `rgb(0,16,26)` (~`#00101A`) — likely already the
  existing `login-background` design token used elsewhere in the codebase; confirm before adding
  a new color.
