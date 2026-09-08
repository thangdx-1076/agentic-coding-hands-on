# Phase 03 — Secret Box dialog (presentational) handoff

**Mode note:** the outer prompt said `mode: screen`, but this phase file's own
shape (disjoint `ownedFiles`, explicit "DO NOT TOUCH" list, "STOP and report"
instruction for anything crossing into phase 05's integration seam) matches
`section` mode's contract, not `screen` mode's. Per prior project memory on
this exact mismatch shape, I followed the phase file: wrote only the owned
files, never invoked `Agent`. Flagging as a concern, not a blocker.

## Node → element mapping

| Node | Element |
|---|---|
| `1466:7676` frame | `<dialog data-testid="secret-box-dialog">` |
| `1466:7677` title row | wrapper `<div className="relative flex ...">` |
| `1466:7678` (A) title | `<h2 id="secret-box-title" data-testid="secret-box-title">` |
| `1466:7679` `MM_MEDIA_Close` | reused `IconClose` (`_components/icons/icon-close.tsx`, same componentId `214:3851`) in `<button data-testid="secret-box-close">` |
| `1466:7680`/`7688` dividers | `<div className="h-px w-full bg-login-divider">` (color = `--color-login-divider` exact match) |
| `1466:7681`→`7683` (B) instruction | `<p data-testid="secret-box-instruction">`, shown only when `canOpen` |
| `1466:7684` (C) box | `<button data-testid="secret-box-box">` |
| `1466:7686` box artwork | `next/image` `fill` layer inside the button |
| `1466:7685` sparkle effect | CSS `background` layer, position/size copied verbatim from the node's own reported Figma-fill crop (`-102.944px -102.487px / 138.527% 138.527%`) |
| `1466:7687` "about link" | **skipped** — empty frame, 0 children, no asset, invisible in the rendered frame image |
| revealed badge (no node) | `<Image data-testid="secret-box-badge">` centered via a flex wrapper, **zero transform classes on the `<Image>` itself** (Bẫy 1) |
| `1466:7689`→`7692`/`7693` (D) counter | `<p data-testid="secret-box-label">` + `<span data-testid="secret-box-counter">` |

Title/color/typography read from `get_node`: title `#FFEA9E` = `--color-login-button`
exact match; counter number same color; dividers `#2E3940` = `--color-login-divider`
exact match; container bg `#00101A` = `--color-login-background` exact match.
Container width 651.5px → confirmed against the downloaded frame reference PNG
(652×823 actual) in `design/secret-box-frame-reference.png`.

## Asset coverage — all 3 media nodes accounted for

- `1466:7679` Close (19×19) → **reused** existing `public/standards/close.svg`
  via the shared `IconClose` component (no new download, per instruction).
- `1466:7686` box-closed (558.5×558.5) → downloaded via `get_media_files`.
  The presigned URL served an **SVG wrapper around a base64-embedded 1000×1000
  PNG** (a Figma image-fill export quirk), not a flat raster — extracted the
  embedded PNG with a one-off `python3` script (not committed) and saved as
  `public/standards/secret-box-closed.png` (1000×1000, downscaled to 557px by
  `next/image`, no upscale).
- `1466:7685` sparkle (reported 546.5×546.5) → downloaded raster is actually
  463×449 (the node's Figma fill uses `background-size:138.527%` to cover its
  546.5 box from that smaller source — confirmed by the node's own reported
  `background` CSS string). Saved as-is to `public/standards/secret-box-sparkle.png`
  and rendered via that exact reported CSS rule, not stretched arbitrarily.

## Prop contract handed to phase 05

`SecretBoxDialog` props: `registerDialog`, `copy` (`titleUnopened`,
`titleRevealed`, `instruction`, `label`, `close` — all via props, **zero**
`next-intl`/`messages` import, verified by grep), `state: "unopened"|"revealed"`
(controls **only** the title text), `unopenedCount`, `awardedBadgeKey: BadgeKey|null`,
`canOpen`, `busy`, `onOpenBox`, `onClose`, `onCancel`.

`useSecretBoxDialog()` → `{ open, close, registerDialog, onCancel }` (mirrors
`use-kudos-compose-dialog.ts`; added `onCancel` beyond the phase file's literal
3-field note because the component's `onCancel` prop needs a `SyntheticEvent`
handler to wire to the native `<dialog>` — same shape `use-kudos-compose-dialog.ts`
already establishes).

**S13 mount contract (critical):** this component does NOT decide whether to
mount. `canOpen`/`instruction`-visibility both key off `canOpen` directly (not
`busy`), so during an in-flight `onOpenBox` request `busy` alone disables the
box without hiding the instruction or unmounting anything. Phase 05 must:
1. Mount `<SecretBoxDialog>` only when the **server-rendered** unopened count
   at page-load time is `> 0` — never based on this hook's internal state.
2. Never let a click-driven count drop to 0 cause unmount (S07/S09/S10 keep
   using the same `secret-box-box`/`secret-box-badge` locators after reveal) —
   only the initial mount decision reads server data; post-mount, this
   component keeps rendering regardless of live count.
3. Wire `onCancel={hookControls.onCancel}` and `onClose={hookControls.close}`
   separately — they are the same underlying action but two distinct props.

## Not built (owned by other phases)

- No RPC call, no Supabase client, no `messages/*.json` keys — all out of
  this file's ownership (phases 02/04/05).
- No integration into `page.tsx`/`kudos-stat-list.tsx` — phase 05's seam.
- Did not attempt `pnpm run test:e2e` — dialog isn't wired up yet; RED stays
  red for the right reason (missing integration, not a coding defect here).

## Checks run

- `pnpm typecheck` → exit 0, no output.
- `pnpm lint` → exit 0; 3 pre-existing warnings in the read-only
  `tests/e2e/secret-box.spec.ts` (not touched), 0 errors.
- `pnpm exec vitest run` on the 2 new test files → 28/28 passed
  (`use-secret-box-dialog.test.ts` 8, `secret-box-badge-asset.test.ts` 20).
- `wc -l` on every new file: 193 / 75 / 87 / 146 / 81 / 68 — all < 200.
- `git diff --name-only` (tracked files): only `plans/action-items.md`, a
  pre-existing modification from an earlier triage step, not touched by me.
- Did not attempt `pnpm run build` (memory: this hook blocks subagent builds
  in this repo) — orchestrator should run it.

**Status:** DONE_WITH_CONCERNS
**Concern:** the `mode: screen` vs. effective `section`-shaped execution
discrepancy noted above — no functional impact, flagged for the orchestrator's
awareness only.
