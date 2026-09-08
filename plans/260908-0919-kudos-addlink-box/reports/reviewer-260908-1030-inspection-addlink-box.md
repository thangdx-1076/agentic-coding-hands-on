# Master's Inspection — Addlink Box (kudos-link-dialog)

**Plan:** `plans/260908-0919-kudos-addlink-box` · **Branch:** `feat/kudos-addlink-box` · **Base:** `origin/main` (6e8aa44)
**Scope:** uncommitted working tree — new nested `<dialog>` "Thêm đường dẫn" replacing `window.prompt` on the Viết Kudo toolbar's Link button.

## Verdict

**SEALED** · score 8/10 · criticalCount 0 · contractStatus OK · riskGate.touchesSensitiveArea false

## What I verified myself (not just read from evidence)

- `pnpm typecheck` → exit 0, 0 errors
- `pnpm lint --max-warnings 0` → exit 0, 0 warnings
- `pnpm format:check` → exit 0, clean
- `pnpm test:unit:coverage` → 63 files / 534 tests passed, **100%** statements/branches/functions/lines
- `grep -rn "window.prompt" src/` → zero matches
- `grep -n "\bany\b"` on the 4 core new files → zero real usages (only prose)
- Read every touched/new source file line-by-line (not just diffs): `kudos-link-dialog.tsx`, `kudos-compose-link-dialog.tsx`, `use-kudos-link-dialog.ts` (+test), `validate-link-draft.ts` (+test), `kudos-compose-icons.tsx`, `insert-markdown-marker.ts` (+test), `use-kudos-compose-content.ts`, `kudos-compose-form.tsx`, `kudos-format-toolbar.tsx`/`kudos-compose-footer.tsx` (icon-import diff only), `kudos-compose-copy.ts`, `messages/{vi,en}.json`, `parse-kudo-markdown.ts`/`kudo-markdown-text.tsx` (the existing renderer, to check the injection hunt), `build-kudos-copy.ts` (the raw-cast site), `tests/e2e/kudos-link-dialog.spec.ts`.
- Did **not** re-run Playwright or `pnpm build`/`build-storybook` per task constraint — relied on `evidence/{red,green}-evidence.md` + `temper-results.json` for those, cross-checked against the actual implementation logic (they're internally consistent).

## Acceptance criteria — all 9 covered

See `inspection-verdict.json`'s `acceptanceCovered[]` for the itemized proof per criterion (RED→GREEN, dialog wiring, Escape/Hủy scoping, validation blocking, valid-save insertion + selection restore, F009 regression, unit coverage, Storybook+build gates, i18n parity). Nothing was left unproven.

## Findings

### Medium — pre-existing markdown-parser paren/bracket truncation (Defer)
`parse-kudo-markdown.ts:45` (`tryParseLink`) closes a `[text](url)` construct at the **first** `)` / `]` it sees. A real http(s) URL containing a literal `)` — e.g. `https://en.wikipedia.org/wiki/Foo_(bar)`, a very ordinary URL shape — gets its href silently truncated, with the tail leaking as visible plain text. Same gap for link text containing `]`/`(`.

I traced several deliberate injection attempts (crafting `linkText` with embedded `](javascript:...)` sequences) by hand through the actual parser logic to see if this could be escalated into an XSS/scheme bypass — it can't: `isSafeLinkUrl`'s `startsWith("http://"/"https://")` anchors to wherever `](` lands, so a substring that starts with `javascript:` always stays `javascript:`-prefixed no matter how the trailing parens are cut, and gets rejected. So this is a **correctness bug, not a security hole** — worth fixing eventually (track bracket/paren depth), but it's in a file this PR never touches, predates it (the old `window.prompt` path fed the same parser), and isn't required by any acceptance criterion. Deferred, not blocking.

### Low — case-sensitive scheme check vs. case-normalizing validator (Accept)
`validate-link-draft.ts` validates protocol via `new URL(x).protocol`, which normalizes casing (`HTTP://` → `http:` passes). But the hook stores/inserts the **raw** trimmed string, and the renderer's `isSafeLinkUrl`/`isSafeHref` do a case-sensitive `startsWith`. Net effect: an uppercase-scheme URL validates in the dialog, then silently fails to render as a link later. Fails safe, not exploitable, just an inconsistency. Low priority.

### Low — evidence doc doesn't match shipped code (Accept)
`evidence/green-evidence.md`'s "React Event Bubbling Fix" section claims **both Save and Cancel buttons** call `stopPropagation()` in their `onClick`. The actual code only calls `stopPropagation()` once, on the nested dialog's `onCancel` (Escape/native-cancel) handler in `kudos-compose-link-dialog.tsx:63-66` — which is in fact the *correct* and *sufficient* fix (React's synthetic `onCancel` bubbles, unlike native `cancel`, and the outer `KudosComposeDialog` also listens on `onCancel`). Button clicks never needed `stopPropagation` since both buttons are `type="button"` and the outer `<form onSubmit>` already unconditionally calls `preventDefault()`. Functionally harmless, but the evidence narrative is inaccurate and should be corrected so it doesn't mislead a future reader about where the real risk lived.

### Low — 1 line over the 200-line file cap (Reject, trivial)
`kudos-link-dialog.tsx` is 201 lines. Not worth splitting for one line.

## Things done well
- The nested-dialog research (`researcher-260908-0919-nested-dialog-study.md`) paid off directly — the `stopPropagation` fix targets exactly the mechanism (React synthetic `onCancel` bubbling) the research flagged, not a guess.
- Selection-snapshot-at-open + restore-before-`applyFormat` is correctly implemented and tested for the collapsed-selection, null-selectionStart, and re-open-after-cancel cases.
- URL scheme allowlist (`http:`/`https:` only, checked via `new URL()`) is correctly load-bearing at both the validator and the renderer, and I couldn't construct a bypass despite trying several bracket-confusion angles.
- i18n parity (vi/en) is exact, and the pre-existing `tKudos.raw("composeModal") as KudosComposeCopy` cast in `build-kudos-copy.ts` stays safe against the widened type without needing a touch.
- The orchestrator's own correction of the tester's mis-scored F007 run (recorded honestly in `green-evidence.md`'s addendum) is good practice — a real regression risk (stale DB rows) was caught and fixed rather than rubber-stamped.

## Actions in order
1. (Optional, future) Fix `parse-kudo-markdown.ts`'s paren/bracket-depth handling for URLs/text containing `)`/`]`.
2. (Optional) Normalize URL casing before insertion, or make the renderer's scheme check case-insensitive.
3. (Optional) Correct `green-evidence.md`'s bubbling-fix description to match the actual code.

## Numbers
- Type coverage: clean (`tsc --noEmit` 0 errors)
- Test coverage: 100% statements/branches/functions/lines (534/534 tests)
- Lint findings: 0

## Still unresolved
- None blocking. The two Defer/Accept findings above are pre-existing/low-severity and don't gate this ship.
