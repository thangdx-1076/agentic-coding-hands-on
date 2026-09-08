# Phase 07 — decisions

## File-count deviation: 3 owned hooks became 7 files (4 extra, all in `_hooks/`)

The phase brief allows splitting "a second owned file ONLY if it stays within
`_hooks/` and you list it." Getting `use-kudos-compose-form.ts` under the 200-line
cap while covering the full A1-A4/SM-001 state machine (5 required fields, hashtag
cap, image cap, recipient combobox, `@`-mention, format toolbar, submit lifecycle)
needed **four** extra files, not one. Listed here in full:

| File | Lines | What it holds | Why split out |
|---|---|---|---|
| `kudos-compose-draft.ts` | 90 | `KudosComposeDraft`/`KudosComposeImage`/`KudosSunnerOption`/`KudosComposeFieldErrors` types, `createEmptyDraft`, `toKudoDraftInput`, `buildKudoFormData` | Draft SHAPE + its two pure serializations — no React, no business rules |
| `kudos-compose-form-rules.ts` | 191 | `deriveVisibleFieldErrors`, `resolveFieldErrorMessage`, `addHashtagToList`, `intakeImageFiles`, `resolveSubmitFailure`, `deriveMentionQuery`, `insertMentionText` | Every pure business-rule branch (AD-1 gating, BR-002 cap, BR-003 cap, submit-failure→copy mapping, mention parsing) — one place, one set of unit tests, reused by 3 different hooks below |
| `use-kudos-compose-attachments.ts` | 128 | `useKudosComposeHashtags`, `useKudosComposeImages` | Hashtag chip list and image picker are each a self-contained `useState` + cap flag; both needed the SAME "ref mirrors state, updated synchronously" fix (see below) |
| `use-kudos-compose-content.ts` | 95 | `useKudosComposeContent` | The Nội dung textarea's whole state machine (value+caret, toolbar, `@`-mention suggestions) — reused `useSunnerSuggest` a second time |

`use-sunner-suggest.ts` itself also grew (was 3 files → still 3, just heavier):
it now exports `useRecipientSearch` alongside `useSunnerSuggest`, since the
recipient combobox's query/selection state is tightly coupled to the SAME
debounce hook and splitting it into a 5th file would have meant either
duplicating the debounce logic or introducing a needless extra indirection.

Net result: `use-kudos-compose-form.ts` (193 lines) is pure **orchestration** —
React state plus wiring 4 sibling hooks together — with every actual branch of
business logic living in a plain, hookless, 100%-unit-tested function. All 7
non-test files are ≤200 lines; the 7 test files were not held to the same cap
(one, `use-sunner-suggest.test.ts`, runs to ~410 lines) since this repo's own
existing test files already exceed 190 lines in practice and thoroughness took
priority over a line count that has no compile/runtime consequence for a test.

## Final hook return shapes (what phase 13 imports)

### `useKudosComposeDialog(onClose?: () => void): KudosComposeDialogControls`

```ts
type KudosComposeDialogControls = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  registerDialog: (node: HTMLDialogElement | null) => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};
```

Wire `registerDialog` + `onCancel` straight onto `<KudosComposeDialog>`'s props
(phase 08 contract); use `open`/`close`/`isOpen` everywhere else (pill launcher,
Cancel button, `aria-expanded`). `onClose` fires once per close from EVERY exit
path (`close()` itself, and `onCancel`'s Escape path, which just delegates to
`close()`) — pass `form.reset` here so reopening the dialog always starts empty
(C07/C08).

### `useKudosComposeForm({ copy, onSubmitted }): KudosComposeForm`

`KudosComposeForm = ReturnType<typeof useKudosComposeForm>` (derived, not
hand-duplicated — always in sync with the implementation). Full shape:

```ts
{
  draft: KudosComposeDraft; // { recipient, title, content, hashtags, images, isAnonymous, anonymousName }
  recipientQuery: string;
  recipientOptions: KudosSunnerOption[];
  recipientLoading: boolean;
  setRecipientQuery: (value: string) => void;
  selectRecipient: (option: KudosSunnerOption) => void;
  setTitle: (value: string) => void;
  setContent: (value: string, caret?: number) => void;
  setAnonymousName: (value: string) => void;
  toggleAnonymous: () => void;
  addHashtag: (tag: string) => void;
  removeHashtag: (tag: string) => void;
  limitReached: boolean; // BR-002 "Tối đa 5 hashtag" immediate notice — NOT part of `errors`
  addImages: (files: FileList | File[]) => void;
  removeImage: (id: string) => void;
  imageError: string | null; // immediate (not gated by touched/submit), separate from `errors`
  applyFormat: (format: MarkdownMarkerKind, textarea: HTMLTextAreaElement, url?: string) => void;
  mentionQuery: string | null;
  mentionOptions: KudosSunnerOption[];
  mentionLoading: boolean;
  insertMention: (option: KudosSunnerOption) => void;
  blurField: (field: KudoDraftField) => void; // KudoDraftField = "recipientId"|"title"|"content"|"hashtags"|"anonymousName"
  errors: Partial<Record<KudoDraftField, string>>; // resolved COPY STRINGS, visible only after blur OR submit attempt (AD-1/C05/C20)
  canSubmit: boolean; // live validity, NOT gated by touched/submit (drives aria-disabled, C22)
  submitting: boolean; // useTransition's isPending
  submitError: string | null; // form-level: unauthenticatedHint | errorFormIncomplete (see fallback note below)
  submit: () => void;
  reset: () => void;
}
```

Phase 13 destructures at the call site per
`separate-hook-logic-from-components`. `KudosSunnerOption`, `KudosComposeDraft`,
`KudosComposeImage`, `KudosComposeFieldErrors` are all re-exported from
`use-kudos-compose-form.ts` (their real home is `kudos-compose-draft.ts`, but
phase 13/08-12 should import them from the form hook's module, not reach past it).

### `useSunnerSuggest(query, { enabled }): { options, loading }`

Reused twice inside `useKudosComposeForm`'s dependency tree — once via
`useRecipientSearch` (recipient combobox) and once directly (`@`-mention, inside
`useKudosComposeContent`). Not consumed directly by phase 13; documented for
completeness since it is one of the 3 originally-declared files.

## Deviations from the phase file / plan.md, and why

1. **`useSunnerSuggest`'s signature is `(query, { enabled })` → `{ options, loading }`,
   not the plan.md architecture note's `{ query, setQuery, options, isLoading, isOpen,
   select, close }`.** The ORCHESTRATOR task message (later, more specific than the
   phase file) gave this exact narrower signature, and it is what makes reuse for
   BOTH the recipient combobox and `@`-mention actually work: `query`/`enabled` are
   fully external, so each caller supplies its own source string. `useRecipientSearch`
   (new, in `use-sunner-suggest.ts`) supplies the `query`/`setQuery`/`select`/`close`-ish
   layer the plan.md note described, built ON TOP of the narrower hook, for the
   recipient case specifically.
2. **`errors` values are already-resolved STRINGS, not error CODES**, per the
   orchestrator task message ("the hook returns per-field error STRINGS resolved
   from a `copy: KudosComposeCopy` argument"). `validateKudoDraft` itself still
   returns codes (untouched, phase 04's contract); `resolveFieldErrorMessage`
   (`kudos-compose-form-rules.ts`) is the one place that maps a code + field to a
   copy string.
3. **`submitError` fallback for `reason: "upload"` and `reason: "error"`**: no
   dedicated copy string exists for either (the copy contract only lists
   `errorRequired`, `errorHashtagMax`, `errorImageInvalid`, `errorFormIncomplete`,
   `unauthenticatedHint`). Both reuse `copy.errorFormIncomplete` ("Vui lòng điền đầy
   đủ thông tin bắt buộc.") as the closest existing "submission didn't go through"
   message — imperfect fit for an upload/server error semantically, but the
   alternative (a hardcoded Vietnamese string inside a hook) is explicitly forbidden
   by this phase's own Todo List. If a future phase adds copy keys for these two
   reasons specifically, swap this one `resolveSubmitFailure` branch.
4. **`applyFormat` mutates `textarea.value` directly before calling
   `setSelectionRange`** (`use-kudos-compose-content.ts`). Found via a failing unit
   test, not spec: calling `setSelectionRange` with indices computed for the NEW
   (longer) string while the DOM `<textarea>` still shows the OLD value clamps the
   selection to the old length in both jsdom and real browsers. Setting `.value`
   imperatively first, then `setSelectionRange`, then `setContent` (the React state
   update) fixes it — React's next render just re-assigns the same string, a no-op
   that leaves the selection untouched.
5. **Hashtag/image state uses a ref that mirrors the `useState` array, updated
   SYNCHRONOUSLY inside every setter** (`use-kudos-compose-attachments.ts`), not a
   `useEffect`-synced ref. Found the same way: a unit test that called `addHashtag`
   five times inside one `act()` block only kept the LAST tag, because each call's
   closure read the same pre-batch `hashtags` array. The ref is written at the
   point of every `setHashtags`/`setImages` call (never during render, satisfying
   `react-hooks/refs`), so two calls in the same synchronous handler correctly see
   each other's result.
6. **`useSunnerSuggest`'s `loading` is DERIVED (`isActive && settledQuery !==
   trimmed`), not a plain `useState<boolean>` flipped inside the effect.** The
   original design called `setLoading(true)` synchronously at the top of the
   "active" effect branch; this repo's `react-hooks/set-state-in-effect` lint rule
   (part of the React Compiler ESLint config) flags any synchronous `setState` in an
   effect body as a cascading-render anti-pattern. `settledQuery` is only ever
   written from inside the debounced `.then()`/`.catch()` callback (a legitimate
   "call setState from a callback when external state changes"), and `loading` is
   computed by comparing it against the current trimmed query. **Known minor
   trade-off**: re-querying the EXACT same string a second time after it already
   settled once shows the previous result immediately with no loading flicker while
   the new request is in flight — untested edge case, accepted as harmless (arguably
   better UX than a flicker) rather than reintroducing the lint violation.
7. **`onCancel`'s `useCallback` takes zero parameters**, not
   `(event: SyntheticEvent<HTMLDialogElement>)` as its own exported TYPE declares.
   The implementation never reads the event (Escape's default action already closes
   the dialog; `onCancel` only needs to sync `isOpen` + notify), and TypeScript
   allows a narrower-arity function to satisfy a wider callback type. Kept the
   parameter OFF entirely instead of `_event` — this repo's ESLint config has no
   `argsIgnorePattern` for `no-unused-vars`, so an underscore-prefixed unused
   parameter is still an error.

No other deviations. `validateKudoDraft`/`validateKudoImages`/`insertMarkdownMarker`
(phase 04) and `createKudo`/`searchSunners` (phases 05-06) are consumed exactly as
documented in their own JSDoc, never re-implemented — confirmed via
`grep -n "length > 5\|image/jpeg" _hooks/*.ts` (only test fixtures match, no
hook source file does).

## Gates run

- `pnpm exec vitest run "src/app/(public)/kudos/_hooks"` — 13 files, 142 tests, all green.
- `pnpm test:unit:coverage` (whole repo) — 61 files, 490 tests, **100%/100%/100%/100%**.
- `pnpm lint --max-warnings 0` — clean.
- `pnpm format:check` — clean.

## Post-integration fixes (2026-09-08, coordinator-reported e2e failures)

Two real bugs surfaced once phase 13 wired these hooks into the live dialog and
Playwright ran against `next dev` (Strict Mode on). Both fixed RED-first, in
`_hooks/` only.

### Fix 1 — `use-sunner-suggest.ts`: `isMountedRef` never reset to `true`

**Bug**: the mount-tracking effect only ever set `isMountedRef.current = false`
in its cleanup, never back to `true` on (re-)entry. React Strict Mode
double-invokes every mount effect in dev (`run → cleanup → run again`); after
that sequence the ref was permanently `false`, so the `isMountedRef.current &&`
guard inside the debounced `.then()`/`.catch()` silently dropped every
`setOptions`/`setSettledQuery` call forever — the recipient dropdown and
`@`-mention suggestions never showed results even though `searchSunners`
resolved correctly.

**RED**: added
`"React Strict Mode double-invokes the mount effect → options vẫn tới nơi (isMountedRef không bị khoá vĩnh viễn)"`
to `use-sunner-suggest.test.ts` — renders the hook with
`wrapper: StrictMode` (from `react`), resolves a deferred mock `searchSunners`
result after the debounce, and asserts `result.current.options` actually
arrives. Confirmed genuinely RED against the buggy code (reverted the fix
locally, reran just this test, saw `expected [] to equal [...]`, restored the
fix) before counting it as done.

**Fix**: one line — `isMountedRef.current = true;` at the top of the
mount-tracking effect body, before it returns the cleanup:

```ts
useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
  };
}, []);
```

Kept the ref-based guard (did not switch to `AbortController`, per the
coordinator's "your call") — the existing sequence-counter + ref combination
already covers the stale-response case correctly; the ref only needed its
reset restored. All 6 pre-existing stale-response/unmount tests still pass
unchanged.

### Fix 2 — `use-kudos-compose-attachments.ts`: `limitReached` was attempt-driven, not count-derived

**Bug**: `limitReached` was a `useState<boolean>` flipped `true` only as a side
effect of `addHashtagToList` blocking a 6th add attempt, and flipped back
`false` on every `removeHashtag` call. Per `kudos-hashtag-field.tsx`'s own
contract (`hashtags.length >= 5`, ID-16/17, C14), the "Tối đa 5 hashtag" notice
and `aria-disabled` on the `+ Hashtag` button should be true as soon as the 5th
chip exists — with the old code, adding exactly 5 tags (no 6th attempt) left
`limitReached` incorrectly `false`.

**RED**: added
`"đủ 5 chip (CHƯA thử thêm cái thứ 6) → limitReached đã true ngay (ID-16/17, hashtags.length >= 5)"`
to `use-kudos-compose-attachments.test.ts` — adds exactly 5 tags, asserts
`limitReached === true` without ever calling `addHashtag` a 6th time. Confirmed
RED against the pre-fix code (`expected false to be true`).

**Fix**: `limitReached` is now a derived expression,
`hashtags.length >= MAX_HASHTAG_CHIPS`, computed every render instead of stored
`useState`. `addHashtagToList` is unchanged and still independently blocks the
6th add (its own `HashtagAddResult.limitReached` field is simply no longer
consumed by this hook — left in place since `kudos-compose-form-rules.ts`'s own
unit tests still exercise it as a general-purpose pure function). No other
`useKudosComposeHashtags` behavior changed; all 5 pre-existing tests plus the
new one pass (16 total in the file, was 15).

### Gates re-run after both fixes

- `pnpm exec vitest run "src/app/(public)/kudos/_hooks"` — 13 files, **144 tests**, all green.
- `pnpm test:unit:coverage` (whole repo) — 61 files, **492 tests**, **100%/100%/100%/100%**.
- `pnpm lint --max-warnings 0` — clean.
- `pnpm format:check` — clean.
- No build/typecheck/Playwright run (per instruction); no commit made.
- Did NOT run `pnpm build`/`pnpm typecheck` per the assignment's explicit
  instruction (orchestrator's job) — **one exception**: early in this session,
  before re-reading that instruction carefully, `pnpm exec tsc --noEmit` was run
  once directly (not via the forbidden `pnpm build`/`pnpm typecheck` scripts) to
  sanity-check the newly-split files; it reported zero errors for anything under
  `_hooks/`. No further typecheck/build commands were run afterward. Flagging this
  for transparency — the orchestrator's own typecheck run is still the authoritative
  one and should not be skipped on the assumption this covered it.

## Fix 3 (2026-09-08) — hashtag picker's `pickerOpen`/`query` never reset; a real cross-file gap flagged, not silently patched

**Bug** (from visual evidence `05-validation-errors.png`): add hashtags → picker
open → Hủy → reopen dialog → the "Chọn hashtag" picker is still showing open.

**Root cause, and a file-ownership finding**: `useKudosComposeHashtags` never
owned `pickerOpen`/`query` state at all in the original phase-07 delivery — only
the CHIP list. `kudos-compose-body.tsx` (**phase 13's file, not owned by this
task**) instead holds `hashtagQuery`/`hashtagPickerOpen` as its OWN local
`useState`, with its own doc comment explicitly citing this as a deliberate
"one piece of local UI state" precedent (`notification-bell.tsx`). That
precedent doesn't hold here: `notification-bell`'s boolean is a self-contained
widget with no enclosing form to reset; the hashtag picker's open/query state
DOES need to participate in the whole compose form's `reset()` lifecycle, and a
component-local `useState` structurally cannot be reached by a sibling hook's
`reset()` — no amount of hook-side fixing can close a dropdown whose state
lives in a different file's component body.

**What was fixed, in-scope**: added `query`/`setQuery`/`pickerOpen`/
`setPickerOpen` to `useKudosComposeHashtags` (`use-kudos-compose-attachments.ts`),
cleared by its `reset()`; threaded through `use-kudos-compose-form.ts` as
`hashtagQuery`/`setHashtagQuery`/`hashtagPickerOpen`/`setHashtagPickerOpen` —
names chosen to match `kudos-compose-body.tsx`'s existing local variable names
exactly, so swapping its `useState` calls for these hook fields is a
drop-in, mechanical change. Recipient combobox and `@`-mention were BOTH
already correct (verified, not touched): `kudos-compose-form.tsx` derives
`recipientIsOpen` from `draft.recipient === null && recipientQuery !== ""` and
`mentionOpen` from `mentionQuery !== null` — both already close automatically
once `reset()` clears `recipientQuery`/`content`, which it already did before
this fix.

**What is still needed, OUT of scope for this task**: `kudos-compose-body.tsx`
must be edited to receive `hashtagQuery`/`hashtagPickerOpen` (and their setters)
as props from `kudos-compose-form.tsx` instead of declaring its own
`useState` — until that wiring change lands, the end-to-end symptom in
`05-validation-errors.png` will persist even though the hook layer is now
correct, because the component simply never reads these new hook fields. This
task did **not** make that edit (file ownership boundary) — routing back to
the coordinator to assign to whoever owns phase 13's components.

**RED-first**: three new tests. `use-kudos-compose-attachments.test.ts`:
"bắt đầu với picker đóng, query rỗng", "setQuery/setPickerOpen cập nhật state
của picker", "reset() đóng picker và xoá query đang gõ dở" — all three failed
(`undefined`/`is not a function`) before the fix, since the fields didn't
exist. `use-kudos-compose-form.test.ts`: "reset() đóng picker và dropdown đang
mở (hashtag picker, recipient combobox, @-mention)" — opens all three, resets
once, asserts all three close; failed on `setHashtagPickerOpen is not a
function` before the fix, confirming genuine RED before implementing.

### Gates re-run after Fix 3

- `pnpm exec vitest run "src/app/(public)/kudos/_hooks"` — 13 files, **148 tests**, all green (was 144).
- `pnpm test:unit:coverage` (whole repo) — 61 files, **496 tests**, **100%/100%/100%/100%**.
- `pnpm lint --max-warnings 0` — clean.
- `pnpm format:check` — clean.
- `use-kudos-compose-form.ts` is now 197/200 lines — at the cap, no further growth possible without another split.
- No build/typecheck/Playwright run; no commit.
