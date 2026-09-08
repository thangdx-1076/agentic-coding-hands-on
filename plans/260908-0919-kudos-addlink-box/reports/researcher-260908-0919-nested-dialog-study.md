# Nested `<dialog>` (Addlink Box in Viết Kudo) — technical verification

2026-09-08. 6 questions, verified against HTML/CSS spec text, MDN, React docs, Chromium bug tracker, and an empirical Node 24 check. No code touched.

## 1. Escape closes only topmost (B), A stays open

HTML spec: "A `Document` is blocked by a modal dialog *subject* if *subject* is the **topmost** dialog element in document's [top layer](https://drafts.csswg.org/css-position-4/#document-top-layer)." The close-request algorithm explicitly reads "Request to close *topmostDialog*'s close watcher with false" — Escape resolves to the CloseWatcher belonging to the topmost entry in the top layer, i.e. B. A is untouched (no `cancel`/`close` fires on A).
Confirmed independently by MDN's dialog page framing ("only the topmost modal blocks interaction … pressing Esc … affects only that dialog") and by the whatwg/html issue tracker (#11230, #9373) which discusses close-watcher/top-layer interplay assuming exactly this per-topmost-entry model.
**Verdict: confirmed, high confidence.** Sources: [HTML spec interactive-elements](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element), [MDN dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [whatwg/html#11230](https://github.com/whatwg/html/issues/11230).

## 2. Focus returns to the toolbar button in A

Spec's dialog close steps: "Set *subject*'s previously focused element…If *subject*'s previously focused element is not null: …run the focusing steps for element" (captured at `showModal()` time, restored on `close()`). Since A stays in the top layer while B is open, and A is an *ancestor* of B (not a descendant of the topmost entry), the "blocked by modal dialog" inert rule marks everything **except B's inclusive descendants** inert — meaning A's toolbar button IS inert while B is open. It becomes focusable again the moment B is removed from the top layer, which happens before the spec's focus-restore step runs in the close algorithm — so restoration lands correctly on a live, connected, now-non-inert element.
**Known Chromium quirks**: real, but they cluster around a different failure mode — the previously-focused element being **removed from the DOM or made unfocusable by other means** while the child dialog is open (not the "ancestor dialog" case here). Multiple independent write-ups confirm restore silently no-ops/falls back to `<body>` in that situation. Our case (button stays mounted, dialog A itself never unmounts) doesn't hit that path, but this is exactly the kind of edge case that "trust the spec text" doesn't fully cover — recommend a real Playwright assertion (`toBeFocused()` on the toolbar Link button after `B.close()`), not just an ARIA read.
Sources: [HTML spec §dialog close steps](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element), [restore-focus gist by Sam Thorogood (ex-Chrome team)](https://gist.github.com/samthor/babe9fad4a65625b301ba482dad284d1), [Accessible Data Interfaces — nested modal focus restoration](https://www.accessible-data-interfaces.com/core-aria-keyboard-navigation-for-data-uis/keyboard-focus-trapping-navigation/restoring-focus-after-closing-complex-modals/).

## 3. B's `::backdrop` stacks above A (top layer, not DOM order)

Top layer is a flat, insertion-ordered list independent of DOM tree position (CSS Position 4 spec, referenced directly by the HTML spec's "blocked by modal dialog" definition). `showModal()` appends the element to the *end* of that list; B is appended after A, so B (and its `::backdrop`) paints above A regardless of B being a DOM descendant of A. This is the entire point of the top layer primitive — normal stacking-context/z-index rules do not apply across top-layer entries.
**Verdict: confirmed.** Sources: [CSS Position 4 — top layer](https://drafts.csswg.org/css-position-4/#document-top-layer), [MDN dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## 4. React 19 `onCancel` — supported, and the `open`-attribute rule holds for B too

React's own common-components reference lists `onCancel`/`onCancelCapture` and `onClose`/`onCloseCapture` on `<dialog>` as first-class synthetic `Event` handlers, explicitly noting they **bubble in React** (native `cancel`/`close` don't bubble at all) — a deliberate React normalization, not a gap.
The repo's existing comment in `kudos-compose-dialog.tsx` (never render `open` as a JSX attribute; only `.showModal()`/`.close()` may touch it) is a general React+`<dialog>` fact, not specific to nesting depth — it applies identically to the new `kudos-link-dialog.tsx`. No new gotcha from nesting: React re-rendering the outer tree (state changes in A) while B is imperatively open does not touch B's `open` attribute as long as the same discipline (no `open` prop) is followed there too.
Sources: [react.dev — common components (dialog props)](https://react.dev/reference/react-dom/components/common), repo file `src/app/(public)/kudos/_components/kudos-compose-dialog.tsx:29-42` (existing documented rationale, reused as-is for B).

## 5. `selectionStart`/`selectionEnd` across blur — preserved by spec; snapshot still worth keeping

Per the WHATWG text-field-selection APIs and MDN, `selectionStart`/`selectionEnd` are plain IDL attributes on the element — losing focus does not spec-mandate clearing them; only the *visual* `::selection` highlight depends on focus.
However, Chromium has shipped real bugs in exactly this area: [codereview.chromium.org/2878613002 "Fix incorrect selectionStart/selectionEnd values after blur"](https://codereview.chromium.org/2878613002) and [chromium issue 526516 "`<textarea>` selectionStart always returns 0 in focus event"](https://groups.google.com/a/chromium.org/g/chromium-bugs/c/I03Jjv22e8s) show the values are not always reliably read back around focus-transition timing.
**Recommendation: keep the snapshot-at-open + `setSelectionRange` restore-before-`applyFormat`.** It costs nothing, and it's defense against a documented (if narrow) class of Chromium timing bugs rather than superstition — do not remove it as "redundant with the spec."

## 6. URL validation — `new URL(value)` + protocol allowlist is sufficient; empirically verified

Ran on Node v24.14.1 (matches repo's Node 24):
```
"http://a"          => OK  http:  (valid — single-label host accepted)
"https://a.co"       => OK  https:
"http://a:80"        => OK  http:
"javascript:alert(1)"=> OK  javascript:  <- parses fine, protocol check is what rejects it
"http://exa mple.com"=> THROW Invalid URL (space in host)
```
`new URL()` alone is **not** enough — it happily parses `javascript:`, `data:`, `file:`, etc. — the `protocol ∈ {http:, https:}` check already decided in `clarifications.md` is load-bearing, not optional. `http://a` (single-label host, no TLD) **is accepted** by the WHATWG URL parser and there is no additional host-shape rule in the spec to reject it (no TLD requirement, no minimum label count) — treating it as valid is correct and matches "don't invent extra rules beyond the spec." Same constructor/behavior applies in jsdom (Vitest's default DOM) since jsdom's `URL` is the `whatwg-url` reference implementation.
**Verdict: confirmed sufficient and safe, as already decided.** Sources: [WHATWG URL Standard](https://url.spec.whatwg.org/), [jsdom/whatwg-url](https://github.com/jsdom/whatwg-url), empirical Node 24 run (this session).

## Ranked recommendations

1. **(6) URL check** — ship `new URL(trim(value))` + `protocol ∈ {http:, https:}` exactly as decided; no extra host-shape rule. Highest confidence (spec + empirical).
2. **(1) Escape scoping** — no code needed; native behavior already does the right thing (only B's `cancel` fires). Just assert it in the new e2e spec.
3. **(4) onCancel support** — no gotcha; reuse the existing `KudosComposeDialog` pattern verbatim for `kudos-link-dialog.tsx`.
4. **(3) backdrop stacking** — no code needed; trust top layer. Visual regression test (screenshot) is the practical guard, not code.
5. **(5) selection snapshot** — keep the already-decided snapshot/restore step; treat it as a defensive-but-justified line, not dead code.
6. **(2) focus restore** — no code needed for the happy path, but add an explicit Playwright `toBeFocused()` assertion on the toolbar Link button post-`close()`, since this is the one point where multiple sources describe real (if narrow) implementation quirks.

## Risks for implementer

- Focus-restore assertion (point 2) is the one spot where "spec says X" and "Chromium sometimes does Y" have both been documented — verify with a live Playwright test, don't assume from spec text alone.
- If a future change ever makes the toolbar button conditionally unmount/disable while B is open, focus restoration silently breaks (documented failure mode) — keep the button always-mounted-and-enabled while B is open.
- `javascript:`/`data:` schemes parse successfully via `new URL()` — anyone touching this validator later must not drop the protocol allowlist thinking `new URL()` alone is "already validating."

No unresolved questions — all 6 points reached a confirmed verdict.
