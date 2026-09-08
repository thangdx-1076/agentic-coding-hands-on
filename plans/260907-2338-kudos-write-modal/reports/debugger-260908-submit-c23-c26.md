# Debug Report — Kudos Compose "Gửi" (Submit) C23–C26

**Date**: 2026-09-08
**Scope**: Why C23–C26 fail in `tests/e2e/kudos-compose.spec.ts` (`@auth @local-db`)

## TL;DR

The backend and UI **work correctly**. `createKudo` succeeds, the dialog closes,
Storage upload succeeds, and the feed re-renders with the new kudo — all
confirmed with direct DB queries and a throwaway diagnostic Playwright script
(deleted after use, never committed). All 4 rival hypotheses in the brief
(hook not wired / `revalidatePath` not refreshing the list / RLS-FK rejecting
the insert / Storage upload failing) are **eliminated** with hard evidence
below.

The actual failures are **two independent defects in the test file itself**
(`tests/e2e/kudos-compose.spec.ts`, which I was told not to edit):

1. **C23 only** — line 880 is a non-retrying assertion racing an inherently
   async submit.
2. **C23/C24/C25/C26 all four** — `page.locator("[data-testid=kudos-card]")`
   is not scoped to the feed section, so `.first()` always resolves to a
   pre-existing **highlight-carousel** card, never the just-submitted feed
   card. The project's own sibling spec (`kudos.spec.ts:460`) already uses the
   correct scoped form.

I made **one minimal, justified app-side fix** (F007, root cause provably
there): added `data-testid="kudos-image-strip"` to
`kudos-image-strip.tsx`, because C24's current locator
(`[data-testid=kudos-image-strip] img`) already expects it and the component
never had it. This fix alone cannot turn C24 green because defect #2 still
picks the wrong card — see "Remaining spec-side issues" below.

**Note on file drift**: `tests/e2e/kudos-compose.spec.ts` visibly changed
mid-investigation (its C24 image locator went from bare `img` to
`[data-testid=kudos-image-strip] img` between two of my reads, mtime moved to
03:38 during my session) — something else (likely a parallel tester pass) is
actively iterating on this same file. My findings below reflect the file's
**current** content, re-read immediately before the final run.

## Evidence chain

### 1. `createKudo` succeeds — DB has the rows

```sql
SELECT id, hashtags, image_urls, is_anonymous, anonymous_name, created_at
FROM public.kudos ORDER BY created_at DESC LIMIT 5;
```
Rows exist for every prior C23–C26-shaped run, e.g.:
- `is_anonymous=t, anonymous_name='Secret Admirer'` (C25's payload) — inserted successfully.
- `image_urls={http://127.0.0.1:55321/storage/v1/object/public/kudo-images/<uid>/<file>.jpg, ...png}` (C24's payload) — full storage paths present.

Storage confirms the uploads themselves landed:
```sql
SELECT bucket_id, name, created_at FROM storage.objects WHERE bucket_id='kudo-images' ORDER BY created_at DESC;
```
returns the matching `.jpg`/`.png` objects at the same timestamps as the `kudos.image_urls` entries.
→ **Hypotheses (c) RLS/FK rejection and (d) Storage upload failure: ELIMINATED.**

### 2. The dialog really does close — just not synchronously

Ran C23 alone with `--trace on`. Trace network log (`0-trace.network`) shows
two Server Action POSTs to `/kudos`:
- 1st (`text/plain`, single `next-action`): the recipient search, 200 OK.
- 2nd (`multipart/form-data`, `next-action`): the actual `createKudo` call,
  started at wall-clock `20:38:31.801Z`.

`psql` shows the row for that exact run inserted at `20:38:31.871015+00` —
**70ms** after the request started.

Trace action log (`0-trace.trace`) shows the click resolves at monotonic
`6100.735`, and the test's `dialog.evaluate(...)` call (internally a
`waitForSelector` titled `"Evaluate"`) resolves at `6105.047` — **~4ms**
later, finding `<dialog open="" ...>` still open. The check runs ~4ms after
the click; the real round trip takes 70–170ms. The test loses the race every
time — this is deterministic, not flaky.

I then wrote (and deleted) a throwaway spec,
`tests/e2e/_debug-c23-timing.spec.ts`, reproducing C23's exact steps and
polling `dialog.open` every 50ms for up to 5s after clicking Submit. Result
across two independent runs:
```
CLICK_DONE 34-45 ms after start
DIALOG_CLOSED_AFTER_MS 156-168
```
The dialog reliably closes ~150-170ms after the click — it is not stuck, it
is just asynchronous (network I/O). → **Hypothesis (a) hook/`onSubmitted`
not wired: ELIMINATED.** Code confirms this too:
`kudos-compose-launcher.tsx:66-70` wires
`useKudosComposeForm({ onSubmitted: () => dialog.close() })`, and
`use-kudos-compose-form.ts:138-145` calls `onSubmitted?.()` right after
`result.ok`.

### 3. The feed DOES refresh with the new kudo (no full reload)

Same diagnostic script, after the dialog closed, read both:
- `page.locator("[data-testid=kudos-card]").first()` → an existing
  **highlight** card ("Đỗ hoàng Hiệp…", `data-variant="highlight"`).
- `page.locator("[data-testid=kudos-card][data-variant=feed]").first()` →
  **"Test User…AWARD Good work #Award #TeamWork"** — the kudo just submitted.

Verified this isn't a full page reload masking the result: set
`window.__marker = true` before submit, confirmed it **survived** after
submit (`WINDOW_MARKER_SURVIVED: true`), while `framenavigated` still fired
(same-document/soft navigation from Next.js's automatic
post-Server-Action refresh, not a hard reload). → **Hypothesis (b)
`revalidatePath` not refreshing the client list: ELIMINATED.** The
`createKudo` action's `revalidatePath(ROUTES.KUDOS)`
(`create-kudo.ts:160`) works exactly as intended.

## Root cause (two, both in the test file)

### Defect 1 — C23's dialog-close check is a non-retrying assertion racing async I/O

`tests/e2e/kudos-compose.spec.ts:879-882`:
```ts
// Dialog should close
expect(await dialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(
  false,
);
```
`Locator.evaluate()` runs once, with no retry — unlike a Playwright web-first
assertion (`expect(locator).toHaveAttribute(...)`). Two tests earlier, C20
(line 715) gets this right: `await expect(dialog).toHaveAttribute("open", "")`
is a retrying assertion, correctly used because that path is synchronous
(client-side validation blocks the request entirely — `submit()` in
`use-kudos-compose-form.ts:132-136` returns early with no `createKudo` call).
C23's path is NOT synchronous — it requires a real network round trip
(`startTransition(async () => { await createKudo(...) })`,
`use-kudos-compose-form.ts:138-145`), and Playwright's `click()` does not
wait for that fetch (confirmed in the trace: "waiting for scheduled
navigations to finish" resolves in <1ms — Next.js Server Actions use
`fetch`, not a real navigation, when JS is enabled, so Playwright has
nothing to wait on).

**No application-side fix is possible without breaking C19/C20.** Those
tests require the dialog to stay OPEN when validation/submission fails
(`kudos-compose-form-rules.ts` + `use-kudos-compose-dialog.ts:66-73`), which
means the app must wait for the server's answer before deciding whether to
close — an optimistic/synchronous close would violate C19/C20's contract.
The correct fix is on the test side: mirror C20's own idiom, e.g.
`await expect(dialog).not.toHaveAttribute("open", "")` (or
`await expect(dialog).toBeHidden()`), which will pass in ~150ms without any
app change.

### Defect 2 — `[data-testid=kudos-card]` is not scoped, so `.first()` always hits the highlight carousel

`kudos-card.tsx:60-61` gives BOTH highlight and feed cards the identical
`data-testid="kudos-card"` (differentiated only by `data-variant`).
`kudos-screen.tsx` renders `KudosHighlightCarousel` **before** `KudosFeed`
(explicit, protected document-order contract — see its own docblock: "Document
order matches `tests/e2e/kudos.spec.ts` C10: header → banner → compose pill →
highlight … → feed+sidebar row"). The highlight carousel is sorted by
`heart_count` (`kudos-client.tsx` comment) — a brand-new kudo (`heart_count=0`)
never displaces it. So `page.locator("[data-testid=kudos-card]").first()`
**always** resolves to a pre-existing highlight card, never the new
submission, regardless of whether the feed refreshed correctly (it does —
see evidence §3).

This is a known, already-solved pattern in this codebase:
- `kudos-highlight-carousel.tsx:43` documents scoping consumers with
  `[data-testid=kudos-card][data-variant=highlight]`.
- The sibling spec `tests/e2e/kudos.spec.ts:459-461` already does the mirror
  image correctly: `page.locator("[data-testid=kudos-feed] [data-testid=kudos-card]")`.

`kudos-compose.spec.ts` simply omitted this scoping in 4 places:
- Line 885 (C23): `const cards = page.locator("[data-testid=kudos-card]");`
- Line 947 (C24): same.
- Line 1032 (C25): same.
- Line 1080 (C26): same.

Direct reproduction (same diagnostic script) shows the two locators
disagreeing on the exact same page state:
```
FIRST_CARD_TEXT       "Đỗ hoàng Hiệp…IDOL GIỚI TRẺ…"       (data-variant=highlight, stale seed data)
FIRST_FEED_CARD_TEXT  "Test User…AWARD Good work #Award #TeamWork"  (data-variant=feed, the real new kudo)
```
This single defect explains all 4 reported symptoms:
- **C23**: `toContainText("Award")` would fail on the highlight card's text
  (no "Award" in it) even once Defect 1 above is fixed.
- **C24**: `firstCard` = the highlight card, which never renders
  `KudosImageStrip` at all (`kudos-card.tsx:114`, `variant === "feed"` only)
  → `[data-testid=kudos-image-strip] img` legitimately finds 0 elements.
  (An earlier version of this locator used bare `img`, which matched the
  highlight card's sender/receiver tier-badge `<Image>`s from
  `kudos-card-person.tsx:117-122` — e.g. `/standards/new-hero.png` — exactly
  the symptom string in the brief. The locator was tightened mid-session by
  someone else to `[data-testid=kudos-image-strip] img`, which is the right
  direction but still resolves to the wrong card.)
- **C25**: highlight card shows the real seeded sender ("Đỗ hoàng Hiệp"), not
  "Secret Admirer".
- **C26**: highlight card's seeded content has no `**` markdown, so no
  `<strong>` renders.

**No application-side fix is possible** without either removing the
highlight carousel or reordering it after the feed — both would break
`kudos.spec.ts` C10/C11 (explicit, tested document-order and highlight-count
contracts) and the MoMorph frame layout. The fix is 4 one-line locator scope
changes in the test file.

## Fix applied (F007, minimal, root-cause justified)

`src/app/(public)/kudos/_components/kudos-image-strip.tsx`:
```diff
   return (
-    <div className="flex w-full flex-row items-center gap-4">
+    <div
+      data-testid="kudos-image-strip"
+      className="flex w-full flex-row items-center gap-4"
+    >
```
Justification: C24's current locator (`[data-testid=kudos-image-strip] img`)
already assumes this testid exists; it never did. This is the correct,
durable way to disambiguate the uploaded-photo strip from the sender/receiver
tier-badge images inside the same card (both are `<Image>` from
`next/image`) — independent of and necessary alongside the Defect 2 fix
above. No unit test or story references this component's DOM structure
(`grep` for `KudosImageStrip` across `*.test.ts(x)` returned nothing);
`pnpm lint --max-warnings 0` and `pnpm format:check` both pass clean on it.
This fix alone does not turn C24 green — Defect 2 (wrong card entirely) still
blocks it.

I did not touch `kudos-card.tsx`, `kudos-card-person.tsx`, `kudos-client.tsx`,
or `kudos-screen.tsx` — no root cause was provably there (their behavior is
correct and required by other passing tests).

## Result

`tests/e2e/kudos-compose.spec.ts` full run (sequential, matching the
project's default config): **23 passed / 4 failed** — same 4 rows
(C23, C24, C25, C26), unchanged in count from before my fix, but C24's
failure signature narrowed from "wrong image entirely" to "correct locator,
wrong card" — confirming Defect 2 is now the sole remaining blocker for
C24/C25/C26, and Defect 1 + Defect 2 together for C23.

Both defects require editing `tests/e2e/kudos-compose.spec.ts`, which I was
told not to touch. Recommended fixes for the tester (all in that file):

| Line(s) | Current | Suggested |
|---|---|---|
| 880-882 | `expect(await dialog.evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);` | `await expect(dialog).not.toHaveAttribute("open", "");` (mirrors C20's own idiom at line 715) |
| 885 | `page.locator("[data-testid=kudos-card]")` | `page.locator("[data-testid=kudos-feed] [data-testid=kudos-card]")` (mirrors `kudos.spec.ts:460`) |
| 947 | same | same |
| 1032 | same | same |
| 1080 | same | same |

No unit-test gate impact — the only source change was the one-line testid
addition above (no logic change, 100% branch coverage unaffected, confirmed
no test exercises this file's markup).

## Unresolved / for orchestrator

- `tests/e2e/kudos-compose.spec.ts` was being edited by another process
  during my investigation (C24's locator changed between two of my reads).
  Whoever owns that pass should apply the table above for C23/C25/C26 too —
  same root cause, same fix shape.
- Everything else in Track A/B for this feature (`createKudo`, Storage
  upload, `revalidatePath`, dialog wiring, feed refresh) is confirmed
  correct by direct evidence; no further backend work is needed for
  C23-C26 specifically.

**Status:** DONE_WITH_CONCERNS
**Summary:** Root cause is NOT an app bug — `createKudo` succeeds, the dialog closes (~150ms after click), Storage uploads land, and the feed refreshes with the new kudo (all verified via DB queries + a throwaway diagnostic script). C23 fails on a non-retrying assertion racing that async round trip; C23/C24/C25/C26 all fail because the unscoped `[data-testid=kudos-card]` locator always grabs a pre-existing highlight-carousel card instead of the new feed card (the sibling `kudos.spec.ts` already scopes this correctly). Applied one minimal, justified F007 fix (`data-testid="kudos-image-strip"`) that the current test already expects; full-file result stayed 23 passed / 4 failed since both remaining defects live in the test file I was told not to edit.
**Concerns/Blockers:** C23-C26 cannot go green without editing `tests/e2e/kudos-compose.spec.ts` (lines 880-882, 885, 947, 1032, 1080) — routing needed to the tester. Flag the concurrent edit-in-progress on that file to avoid clobbering another agent's work.
