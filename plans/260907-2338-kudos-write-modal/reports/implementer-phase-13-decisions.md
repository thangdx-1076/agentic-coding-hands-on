# Phase 13 — decisions

## Files touched

Created:
- `_components/kudos-compose-form.tsx` (200 lines)
- `_components/kudos-compose-body.tsx` (114 lines)
- `_components/kudos-compose-launcher.tsx` (167 lines)
- `_components/kudos-keyvisual-band.tsx` (53 lines)

Modified:
- `_components/kudos-compose-pill.tsx` (+ its `.stories.tsx`) — `onActivate`/`dialogOpen` props, `role="button"` (see Deviation 3)
- `_components/kudos-screen.tsx` (188 lines) — extracted the KV band, added one `compose: { isSignedIn, hashtagVocabulary }` prop
- `_components/kudos-client.tsx` (191 lines) — builds the `compose` object from `viewerId`/`board.filters.hashtags`
- `_shared/build-kudos-copy.ts` (176 lines) — added `composeModal: KudosComposeCopy`

**Not modified**: `page.tsx` — see Deviation 1. No `.ts` file was added (only `.tsx`), so the coverage allowlist is untouched; `pnpm test:unit:coverage` stays 100%/100%/100%/100% (61 files, 490 tests).

## Final `compose` prop shape

Split across two carriers, both driven from `page.tsx`'s existing `viewerId`/`board` — no new server round-trip:

```ts
// KudosScreenProps.compose (kudos-screen.tsx)
{ isSignedIn: boolean; hashtagVocabulary: string[] }

// KudosKeyvisualBandProps (kudos-keyvisual-band.tsx)
{
  copy: Pick<KudosPageCopy, "banner" | "compose" | "heroSearch" | "composeModal">;
  isSignedIn: boolean;
  hashtagVocabulary: string[];
}

// KudosComposeLauncherProps (kudos-compose-launcher.tsx)
{
  copy: KudosComposeCopy;       // = KudosPageCopy["composeModal"]
  pillPlaceholder: string;      // = KudosPageCopy["compose"].placeholder
  pillAriaLabel: string;        // = KudosPageCopy["compose"].ariaLabel
  isSignedIn: boolean;
  hashtagVocabulary: string[];
}
```

`copy.composeModal` (the full `KudosComposeCopy`) rides inside the *existing* `copy: KudosPageCopy` prop `KudosClient`→`KudosScreen` already thread — it did not need a second prop, since `build-kudos-copy.ts` now emits it as one more leaf. Only `isSignedIn`/`hashtagVocabulary` needed a genuinely new carrier, hence the two-field `compose` object on `KudosScreenProps` (AD-7's "one prop object, not six").

## C-row pass/fail (dev loop, `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts`)

**15/27 passing**: C02–C13, C15, C16, C18 all green on first try (dialog shell, DOM order, toolbar bold, standards link, hashtag add/remove, image upload/remove/hide, anonymous toggle).

**12/27 failing** — root-caused below. None trace to a file phase 13 owns; each is backed by direct evidence (a scoped debug spec + a temporary console.log pass through `use-sunner-suggest.ts`, both reverted — the file is now byte-identical to what phase 07 delivered, confirmed via `git status` showing it as the same untracked new-file, and re-run of lint/format/coverage/storybook/F007-regression all green after reverting).

| C-row | Symptom | Root cause | Owning phase | Fix (not applied — out of my file ownership) |
|---|---|---|---|---|
| C01 | `/login`'s `[data-testid=kudos-compose-dialog]` — `.not.toHaveAttribute("open","")` times out at 5s with "element(s) not found" | `router.push(ROUTES.LOGIN)` (correct, matches `use-standards-close.ts` precedent) does a genuine Next App Router client-side navigation, which fully unmounts `/kudos`'s tree — the dialog node simply does not exist on `/login`. Playwright's `toHaveAttribute`/`.not.toHaveAttribute` require the element to be attached to evaluate the attribute; "0 matches" is reported as a failure, not a vacuous pass, after the full 5s poll. | test authorship (`tests/e2e/kudos-compose.spec.ts`, read-only) | Assert `dialog` `toHaveCount(0)` (or drop the assertion) on the `/login` page instead of `.not.toHaveAttribute` on a non-existent node |
| C19, C20 | `submitBtn.click()` hangs for the full 30s ("element is not enabled") | AD-1 renders `Gửi` with `aria-disabled="true"` (never native `disabled`) precisely so a real click still runs validation. Playwright 1.62.1's `.click()` actionability "enabled" check calls the injected `getAriaDisabled()` helper, which reads `aria-disabled` the same as the native attribute — confirmed by reading `node_modules/playwright-core/lib/coreBundle.js`'s `elementState("enabled")` branch. A plain `.click()` therefore can never fire while `aria-disabled="true"`, which for C19/C20 is permanently true (the draft is deliberately invalid). | `_components/kudos-compose-footer.tsx` (phase 08) × Playwright's own semantics — a plan-level (AD-1) / tooling conflict, not a single file's bug | Either the test uses `.click({ force: true })` for this one button, or the footer swaps to a technique Playwright's default actionability accepts (e.g. don't gate on `aria-disabled` at all, keep only the visual/opacity cue) |
| C21, C27 | Recipient dropdown / `@`-mention dropdown show "Đang tìm kiếm…" forever, `[data-testid=kudos-recipient-option]` / `kudos-mention-option]` never appear even though the debounced `searchSunners` call resolves with real seeded rows | `_hooks/use-sunner-suggest.ts`'s `isMountedRef` is `useRef(true)` and is set to `false` in the mount-effect's cleanup, but is **never reset back to `true`** in the mount body. React's dev-only Strict Mode (on by default under `next dev`, which is what `playwright.config.ts`'s `webServer.command` runs) double-invokes every effect once at first mount (mount→cleanup→mount), which flips the ref to `false` permanently — `.then()`/`.catch()`'s `isMountedRef.current && sequenceRef.current === requestId` guard then silently drops every subsequent `setOptions`/`setSettledQuery` call for the rest of the page's life. Invisible in a production build (Strict Mode's double-invoke is dev-only); fully live under e2e. Confirmed with an instrumented copy of the hook: `search resolved … mounted= false seq= 3 reqId= 3` → `SKIPPED setOptions due to guard`. | `_hooks/use-sunner-suggest.ts` (phase 07) | `useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, [])` — add the missing "set true on (re)mount" line |
| C14 | 6th-hashtag attempt never shows "Tối đa 5 hashtag" (no Enter is pressed for the 6th tag — the test expects the message the instant `+ Hashtag` is re-opened at the cap) | `kudos-hashtag-field.tsx`'s own doc comment defines the contract as `limitReached = hashtags.length >= 5` (a plain length check). The actual hook, `_hooks/use-kudos-compose-attachments.ts`'s `useKudosComposeHashtags`, instead only flips `limitReached` true as a side effect of *attempting* a 6th `addHashtag()` call inside `addHashtagToList` — never as a passive function of the current count. Since C14 never calls `addHashtag` for the 6th tag (no Enter press), the flag never flips under the hook's real semantics. | `_hooks/use-kudos-compose-attachments.ts` (phase 07) — contract mismatch against phase 08's own doc comment | Derive `limitReached` as `hashtags.length >= MAX_HASHTAG_CHIPS` directly (drop the "attempted add" mechanism) |
| C17 | `.txt` upload does surface *a* field error, but the test's `.filter({ hasText: /định dạng|format/ })` never matches it | `_shared/kudos-compose-copy.ts`'s `errorImageInvalid` string is `"Chỉ nhận file .jpg hoặc .png, tối đa 5 ảnh."` — it contains neither "định dạng" nor "format", so the *correct* error IS rendered (`data-field="images"`, `kudos-field-error"`), it just never matches the test's substring filter. | `_shared/kudos-compose-copy.ts` (phase 03) content vs. test-authored regex | Add "định dạng"/"format" wording to `errorImageInvalid`, or the test broadens its filter |
| C22–C26 | `aria-disabled` never clears / `submitBtn.click()` hangs | Cascades from the C21 bug: these all conditionally select a recipient (`if ((await options.count()) > 0) { await options.first().click(); }`) — since the dropdown never has options, `recipientId` stays empty, `validateKudoDraft` keeps `recipientId: "required"`, `canSubmit` stays `false`, `aria-disabled` stays `"true"` forever, and any click on `Gửi` re-hits the same Playwright-vs-`aria-disabled` conflict as C19/C20. Fixing the `isMountedRef` bug above should clear C22–C26 on its own (once a real recipient can be selected, `canSubmit` becomes `true` and `aria-disabled` is *removed*, not left `"true"`, so Playwright's `.click()` then works normally for these rows). | (same as C21) | (same as C21) |

None of the above required — or would have been fixable by — a change to a file in this phase's ownership; each was isolated to a specific out-of-scope file (or the read-only spec's own navigation/timing assumption) with a git-status check confirming phase 13 left no stray diff anywhere outside its owned set.

## Deviations from the task brief, and why

1. **`page.tsx` needed NO changes.** The brief's "pass composeModal copy, `isSignedIn`, and the two Server Actions (`createKudo`, `searchSunners`) down to `KudosClient` → `compose` prop" assumed a prop-drilled action pattern, but phase 06/07 already built `use-kudos-compose-form.ts` (`import { createKudo } from "../_actions/create-kudo"`) and `use-sunner-suggest.ts` (`import { searchSunners } from "../_actions/search-sunners"`) to import both Server Actions **directly** at module scope — `useKudosComposeForm({ copy, onSubmitted })` and `useSunnerSuggest(query, { enabled })` have no action-prop parameter to receive them through. Next.js allows a `"use server"` export to be imported straight into a client component (no boundary violation), so there is nothing to thread — adding unused `createKudoAction`/`searchSunnersAction` props through 4 component layers just to drop them on the floor would violate YAGNI and the "small, typed, exactly what's needed" interface gate. `composeModal` copy and `isSignedIn` similarly turned out not to need a NEW page.tsx-level thread: `composeModal` rides the pre-existing `copy: KudosPageCopy` prop once `build-kudos-copy.ts` added the leaf, and `isSignedIn` is computed in `kudos-client.tsx` from the `viewerId` prop `page.tsx` already passes.
2. **`build-kudos-copy.ts` maps `composeModal` via one `tKudos.raw("composeModal") as KudosComposeCopy`, not 30 individual `tKudos("composeModal.X")` calls.** Two of those leaves (`hashtagRemove: "Xóa hashtag {tag}"`, `imageRemove: "Xóa ảnh {index}"`) are manual `{token}` templates the caller `.replace()`s later — resolving them through next-intl's normal interpolation would throw `FORMATTING_ERROR` for the "missing" variable, the exact failure mode `card.heartLabel` right above already documents and avoids with `.raw()`. Doing the same for the other 28 static leaves in one `.raw()` call kept the file under 200 lines (a field-by-field mapping ran to 209) and is the same idiom already established in this file, just applied to the whole namespace instead of one field.
3. **`kudos-compose-pill.tsx`'s input carries `role="button"`, not left as the implicit `textbox` role.** Adding `aria-expanded` to a bare `<input>` (implicit role `textbox`) is an invalid ARIA combination — `jsx-a11y/role-supports-aria-props` failed the lint gate on it. `role="button"` (the same role `notification-bell.tsx`'s real `<button>` carries) supports both `aria-expanded` and `aria-haspopup`, and honestly reflects what the control now does (never accepts typed input). `readonly`/`placeholder`/testid/icon are all unchanged — F007's C03 stayed green.
4. **`kudos-compose-launcher.tsx`'s `dialog`/`form` mutual callbacks route through a `useRef` (`formResetRef`) instead of two plain hoisted function declarations.** The originally-planned "hoisted function, mutual forward reference is safe because neither runs until a later user action" approach failed `pnpm lint` outright: `react-hooks/immutability` (the React Compiler's ESLint rule) flags `form` being referenced inside `useKudosComposeDialog(...)`'s argument before `form`'s own `useKudosComposeForm(...)` call appears in source order, regardless of the callback's actual invocation timing. Swapping the declaration order only moves the same problem to the other hook (the dependency is genuinely mutual — `useKudosComposeDialog`'s `onClose` needs `form.reset`, `useKudosComposeForm`'s `onSubmitted` needs `dialog.close`, and one of the two calls unavoidably comes first). The `formResetRef` indirection removes the forward reference entirely: `dialog` reads `formResetRef.current()` (the ref is declared above it), `form`'s `onSubmitted` reads `dialog.close()` directly (`dialog` is already declared on the previous line), and a `useEffect` — placed textually after `form` exists — keeps the ref in sync every render.

## Gates run (all green after the `use-sunner-suggest.ts` revert)

- `pnpm lint --max-warnings 0` — clean.
- `pnpm format:check` — clean (one file needed `prettier --write` after creation).
- `pnpm test:unit:coverage` — 61 files, 490 tests, 100%/100%/100%/100% (no new `.ts` added, only `.tsx`).
- `pnpm build-storybook` — succeeds (`storybook-static/` built, no errors; only the pre-existing "chunks > 500kB" advisory, unrelated to this phase).
- `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos.spec.ts` (F007 regression) — 28 passed, 1 skipped (pre-existing skip), **byte-for-byte unedited** spec file, C03/C10 both still green.
- `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` (dev loop only, read-only spec, official GREEN belongs to phase 15) — **15/27 passing**, 12 failing, all 12 root-caused above to out-of-scope files/the spec's own assumptions.
- Did **not** run `pnpm build`/`pnpm typecheck` per the assignment (orchestrator's job); relied on the IDE-diagnostics hook after every edit (zero outstanding errors) plus `pnpm lint`'s `recommendedTypeChecked` type-aware rules, which caught 0 type errors.
- `grep -rn "useTranslations" "src/app/(public)/kudos/_components/"` — empty, confirmed.
- `wc -l` on every file in this phase's `file_ownership` — all ≤200 (`kudos-compose-form.tsx` 200, `kudos-screen.tsx` 188, `kudos-client.tsx` 191, `build-kudos-copy.ts` 176, `kudos-compose-launcher.tsx` 167, `kudos-compose-body.tsx` 114, `kudos-compose-pill.tsx` 103, `kudos-keyvisual-band.tsx` 53).

## Note on debugging method

Root-causing C14/C17/C19-C27 required instrumenting `_hooks/use-sunner-suggest.ts` with temporary `console.log`s and a scoped copy of the E2E spec (`tests/e2e/zzz-debug-recipient.spec.ts`, never part of the deliverable) to get a real browser's render/effect sequence — both were fully reverted before finishing; `use-sunner-suggest.ts` was rewritten back to the exact content read at the start of this task (it is an untracked new file with no git history to `checkout` from, so the revert was manual, verified line-by-line against the original read). No phase-07/08/03-owned file carries any trace of this investigation in its final state.
