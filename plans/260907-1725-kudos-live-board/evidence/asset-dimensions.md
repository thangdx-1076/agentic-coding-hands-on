# Asset dimensions & provenance — F007 Kudos Live board

> Rewritten in the `polish` pass. Phase 02 drew 5 icons by hand (`icon-chevron-right.svg`,
> `icon-search.svg`, `icon-heart.svg`, `icon-send-arrow.svg`, `icon-gift.svg`) because that
> session had no MoMorph MCP tool access — a violation of "NEVER guess visual values". This
> revision replaces every hand-drawn file with a real `get_media_files` export, verifies every
> reused-asset claim from the original doc against the live design (one claim was wrong — see
> below), and records the real measured size of every file that now lives in `public/kudos/`.
>
> Source: `mcp__momorph__list_media_nodes(screenId="MaZUn5xHXZ")` (74 nodes) +
> `mcp__momorph__get_media_files(screenId="MaZUn5xHXZ")` for signed S3 URLs, downloaded with
> `curl` immediately (URLs expire after 600s). Sizes verified locally with
> `sips -g pixelWidth -g pixelHeight` (PNG) and by reading each SVG's `viewBox`/`width`/`height`.

## New real assets in `public/kudos/`

| File | Node id | Node name | Design size (MoMorph metadata) | Real file size | Used at |
|---|---|---|---|---|---|
| `kv-background.png` | `I2940:13432;2167:5141` | `MM_MEDIA_KV Background` | 1440×512 | **1440×512 px** (exact match) | Banner full-bleed background artwork |
| `kudos-logo.svg` | `2940:13440` | `MM_MEDIA_Kudos logo` | 593×104 | **593×106** (`viewBox="0 0 593 106"`) — 2px taller than the reported bounding box, same pattern seen on the hero badges below; not a guess, the exported file itself declares 106 | "SAA 2025 KUDOS" wordmark, banner A |
| `icon-pen.svg` | `I2940:13449;186:2759` | `MM_MEDIA_Pen` | 24×24 (compose) / 32×32 (hashtag) | **24×24 viewBox** (vector, scales cleanly to both render sizes) | Compose-kudos input icon (24px) + hashtag row icon (32px) |
| `icon-search.svg` | `I2940:13450;186:2759` | `MM_MEDIA_Search` | 24×24 (input) / 16×16 (spotlight) | **24×24 viewBox** | Input-pill search icon (24px) + Spotlight Sunner search box B.7.3 (16px) |
| `icon-arrow-left.svg` | `I2940:13470;186:1420` | `MM_MEDIA_Left` | 60×60 (carousel B.2.1) / 28×28 (slide-nav B.5.1) | **24×24 viewBox** | Carousel "prev" (rendered 60px) + slide-nav "prev" (rendered 28px) |
| `icon-arrow-right.svg` | `I2940:13468;186:1420` | `MM_MEDIA_Right` | 60×60 (carousel B.2.2) / 28×28 (slide-nav B.5.3) | **24×24 viewBox** | Carousel "next" (rendered 60px) + slide-nav "next" (rendered 28px) |
| `icon-send-arrow.svg` | `I3127:21871;256:5147` | `MM_MEDIA_Send` | 32×32 | **24×24 viewBox** (rendered at 32px by its parent frame) | Sender→receiver connector icon on every Kudos card |
| `icon-link.svg` | `I3127:21871;256:5216;186:1441` | `MM_MEDIA_Link` | 24×24 | **24×24 viewBox** (exact) | "Copy Link" button on every Kudos card |
| `icon-heart.svg` | `I3127:21871;256:5171` | `MM_MEDIA_Heart` | 32×32 | **24×24 viewBox** (rendered at 32px by its parent frame) | Heart/like button on every Kudos card |
| `icon-gift.svg` | `I2940:13497;186:1766` | `MM_MEDIA_Open Gift` | 24×24 | **24×24 viewBox** (exact) | Sidebar "Mở quà" button |
| `avatar-sender.png` | `I3127:21871;256:4858;256:4734` (+ 3 more `256:4858` cards) | `MM_MEDIA_Avatar` | 64×64 | **64×64 px** (exact) | Sender avatar, "Thông tin người gửi" (C.3.1) |
| `avatar-receiver.png` | `I3127:21871;256:4860;256:4734` (+ 3 more `256:4860` cards) | `MM_MEDIA_Avatar` | 64×64 | **64×64 px** (exact) | Receiver avatar, "Thông tin người nhận" (C.3.3) |
| `avatar-gift-recipient.png` | `I2940:13516;256:7460` (+ 4 more `D.3.x`) | `MM_MEDIA_Avatar` | 64×64 | **64×64 px** (exact) | Sidebar "Sunner nhận quà" list (D.3.2–D.3.6) |
| `sample-image.png` | `I3127:21871;256:5177;513:8436` (+ 4 more `513:8436`) | `MM_MEDIA_Sample Image` | 88×88 | **88×88 px** (exact) | Attached-photo thumbnail on every Kudos card |

`avatar-sender.png` and `avatar-receiver.png` are two genuinely different source hashes
(`b7a4539382becdcc995fc02b49eca375.png` vs `c5d2f914e0f015e96f8d904382add9c2.png`) confirmed
across all 4 highlight cards (`I3127:21871/22053/22375/22439`) — same person per slot, not a
random per-card placeholder. `sample-image.png` is one hash (`f4c11e1a2184ee01b622def7781bc11c.png`)
reused identically across all 5 attachment slots.

## Corrected: files phase 02 hand-drew, now replaced with real MoMorph exports

| File | Phase 02 (hand-drawn) | Now (real export) | What changed |
|---|---|---|---|
| `icon-search.svg` | 427 bytes, generic Material "search" glyph, assumed single 24×24 use | 551 bytes, real `MM_MEDIA_Search` path, `viewBox 0 0 24 24` | Content replaced; also corrects the phase 02 doc, which only knew about the 24px input-pill use — the same icon is reused at 16px in Spotlight Sunner (B.7.3) |
| `icon-heart.svg` | 318 bytes, generic Material "favorite" glyph, doc assumed 24×24 render | 468 bytes, real `MM_MEDIA_Heart` path, `viewBox 0 0 24 24`, rendered **32×32** | Content replaced; render size corrected from an assumed 24px to the design's actual 32px (parent frame `C.4.1_Hearts` is 32px tall) |
| `icon-send-arrow.svg` | 154 bytes, generic filled-triangle placeholder, doc assumed 24×24 | 293 bytes, real `MM_MEDIA_Send` path, `viewBox 0 0 24 24`, rendered **32×32** | Content replaced; render size corrected the same way as the heart icon |
| `icon-gift.svg` | 682 bytes, generic Material "card_giftcard" glyph | 1324 bytes, real `MM_MEDIA_Open Gift` path, `viewBox 0 0 24 24` | Content replaced; render size (24px) was already correct in phase 02's guess |
| `icon-chevron-right.svg` | 189 bytes, single generic chevron meant to be CSS-mirrored (`scale-x-[-1]`) for both prev/next | **Deleted.** Replaced by two real, independently-exported files: `icon-arrow-left.svg` (190 bytes) and `icon-arrow-right.svg` (241 bytes) | Figma exports genuinely distinct left/right vector paths for `MM_MEDIA_Left` / `MM_MEDIA_Right` — they are not mirror images of one glyph, so a single mirrored icon would have been visually wrong at the stroke level even though the phase 02 guess "looked" like a chevron |
| `banner-artwork.png` | 590×295 px, a crop of the flattened full-page screenshot (`(850,100)-(1440,395)`), explicitly flagged by phase 02 as a stand-in "if pixel-perfect full-bleed coverage is needed, re-export node `2940:13437`" | **Deleted.** Replaced by `kv-background.png`, the full 1440×512 clean export of `MM_MEDIA_KV Background` (`I2940:13432;2167:5141`) | Full-bleed real export now exists, so the partial crop workaround is no longer needed. Visually confirmed both show the same wave/ribbon artwork — the old file was a zoomed sub-region of the same graphic, not a different design element |

## Reuse existing assets — verified against the real MoMorph export (do NOT duplicate into `public/kudos/`)

| Design element | Existing asset | Verification | Notes |
|---|---|---|---|
| Down chevron (`MM_MEDIA_Down`, `I2940:13459;186:2761` / `I2940:13460;186:2761`) | `/login/Down.svg` | **Confirmed byte-for-byte identical** — downloaded the real export (`16a26295c5091eb8607e987935b0fad1.svg`) and diffed its markup against `/login/Down.svg`: same `viewBox="0 0 24 24"`, same single path `M7 10L12 15L17 10H7Z`, same `fill="white"` | Phase 02's reuse claim was correct. No change. |
| "Legend Hero" tier badge (`MM_MEDIA_Legend Hero`) | `/standards/legend-hero.png` | **Confirmed byte-for-byte identical** — `md5` of the real export (`3119132135098936f4d4fbbb08a52b6d.png`) matches `/standards/legend-hero.png` exactly | Real raster is **110×20 px**, not the 109×19 the MoMorph node-metadata API reports for the *design* bounding box — every hero badge shows this same ±1px export/metadata gap, it is not a phase 02 error. |
| "Rising Hero" tier badge (`MM_MEDIA_Rising Hero`) | `/standards/rising-hero.png` | **Confirmed byte-for-byte identical** — `md5` of the real export (`8a3abdd576e66e6abf9501df2dc59540.png`) matches | Real raster **110×20 px**, same ±1px gap as above. |
| "Super Hero" tier badge (`MM_MEDIA_Super Hero`) | `/standards/super-hero.png` | **Confirmed byte-for-byte identical** — `md5` of the real export (`ddc86cd73d399d64cbd41ed68b602990.png`) matches | Real raster **109×19 px**, exact match to node metadata this time. |
| "New Hero"/base tier badge (`MM_MEDIA_New Hero`, `I3127:21871;256:4858;3106:17694`) | `/standards/new-hero.png` | **No export exists** — `get_media_files` returns `null` for this node (file never uploaded to Figma's export cloud) | Per orchestrator instruction, kept as the only real fallback. Its real size is **126×22 px**, which does not match the design's reported 109×19 — this is a known, documented gap (reusing the closest real asset, not inventing one), not a guess. |
| Header logo (`MM_MEDIA_Logo`, `I2940:13433;178:1033;178:1030`, inside a 52×48 `LOGO` instance) | `/home/Logo.png` | **Confirmed byte-for-byte identical** — `md5` of the real export (`b1e72bf604326f7af02ce0e47ef0a638.png`) matches `/home/Logo.png` exactly, both 52×48 px | Same shared Sun* logo already rendered by `site-header.tsx`/`site-footer.tsx` on every other page (`src="/home/Logo.png"`). No new asset needed. |
| Footer logo (`MM_MEDIA_Logo`, `I2940:13522;342:1408;178:1030`, inside a 69×64 `LOGO` instance) | `/home/Logo.png` | **Visually confirmed same artwork** (Sun* asterisk mark), exported at a different raster size (69×64 vs 52×48) because Figma rasterizes at the instance's larger render scale — MD5 differs (different pixel dimensions) but the graphic is identical | Same conclusion as the header logo: reuse `/home/Logo.png`, no new file. |

**Corrected from the previous revision of this doc** — phase 02 claimed
`/home/Logo_Kudos.svg` (364×74 viewBox) was "the exact same graphics" as the "SAA 2025 KUDOS"
banner lockup and told Track A to reuse it. That claim was checked against the real
`MM_MEDIA_Kudos logo` export (node `2940:13440`) and is **wrong**: the design's actual logo
group is 593×104 (593×106 as exported), a completely different aspect ratio (5.70 vs 4.92) and
different path geometry from `/home/Logo_Kudos.svg`. The real logo is now downloaded to
`public/kudos/kudos-logo.svg` — use that file, not `/home/Logo_Kudos.svg`, for the banner lockup.
`/home/Logo_Kudos.svg` remains valid for whatever screen originally owns it; it was never the
Kudos board's asset.

`profile.stats.rows.*` / `profile.stats.openSecretBox` (messages/*.json) i18n-string reuse notes
from the previous revision are unaffected by this pass and still apply — see phase 02 / phase 12
for the copy-key mapping.

## Deferred / explicitly not built (unchanged from phase 02)

- Fire-streak "×2" badge next to "Số tim bạn nhận được" (special-day +2 hearts rule) — deferred
  per clarifications § "Quy tắc tim (C.4.1)"; no asset added.
- Dialog/lightbox/hover-preview frames (Viết Kudo, Secret Box, Xem chi tiết, hover avatar,
  ảnh full) — deferred per clarifications § "Phạm vi F007"; no assets added for them.

## Colors sampled (for reference, not enforced)

- Page/base background behind the banner: `rgb(0,16,26)` (~`#00101A`) — likely already the
  existing `login-background` design token used elsewhere in the codebase; confirm before adding
  a new color.
