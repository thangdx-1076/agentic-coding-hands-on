# Reviewer — Ship Pipeline Step 7 (Inspect)

**Branch:** `refactor/login-extract-hooks` vs `origin/main` (94a720b) — 5 commits, +4675/-559, 53 files
**Scope:** whole-branch pre-landing pass, read-only. Prior single-commit reviews, lint/typecheck/test/SunLint/licenseal runs are already established and NOT re-run here.

## Assessment

Clean branch. Both extractions correctly implement the 3-layer split the new skill mandates, the skill's own hard rules (destructure-at-call-site, no `RefObject` escaping a hook, pure logic in `lib/`, no `useEffect` in components) are honored in every file the skill names, and the regenerated docs match the code exactly at every line citation checked (function/line ranges, test counts, coverage numbers, action tables). No stray debug code, no disabled tests, no secrets, no accidental artifacts. One Warning worth fixing before merge; everything else is Suggestion-level or a note.

## Critical

None.

## Warning

**W1 — `signInWithGoogle`'s `next` param is interpolated into the OAuth `redirectTo` URL with no encoding or validation, and the safety is documentation-only.**
`lib/auth/sign-in-with-google.ts:48`: `` redirectTo: `${origin}/auth/callback?next=${next}` ``. The doc comment (lines 12-18) correctly warns that `next` "must be internal, decided by code, never taken directly from user input," and points at `lib/supabase/next-path.ts`'s `safeNextPath` as the pattern to reuse if that ever changes — but nothing in the function *enforces* that. Today it's safe only because the sole caller (`app/login/login-client.tsx:20` `NEXT_PATH = "/todo"`) passes a hardcoded literal. This is an exported `lib/` function — exactly the "public contract surface" this inspection was asked to weigh — and a future caller has no compiler/runtime guard stopping it from passing a user-influenced value straight through, unencoded. A value containing `&`, `#`, or `%` would also silently corrupt the query string rather than fail loudly, since there's no `encodeURIComponent`.
- Mitigating factor: the *receiving* side (`app/auth/callback/route.ts` → `safeNextPath`) already rejects anything that isn't a same-origin root-relative path, so even a future careless caller can't achieve an actual open redirect through this path alone — the blast radius is a broken redirect, not a live exploit, as things stand.
- Fix: either `encodeURIComponent(next)` inline, or accept `next` as `ReturnType<typeof safeNextPath>` / re-run it through the same validator before interpolating, so the contract is enforced by types/code rather than a comment. Either is a few lines and has test coverage already in place to extend (`lib/auth/sign-in-with-google.test.ts`).

## Suggestion

**S1 — Inconsistent handler memoization inside `useMenuKeyboardNav`.**
`registerRoot`/`registerButton` are wrapped in `useCallback` (hooks/use-menu-keyboard-nav.ts:56-63) specifically for ref-identity stability, per the doc comment — but `handleButtonClick`, `handleButtonKeyDown`, `handleMenuKeyDown`, `close`, `registerItem` are plain function declarations recreated every render (lines 65-141). Harmless today (they're attached to native DOM elements, not memoized children), and if React Compiler is active it auto-memoizes this anyway — but worth a one-line comment on *why* the split, or leveling it, so a future reader doesn't wonder if it's an oversight.

**S2 — Skill's central claim (React Compiler enforces the destructure/no-RefObject rules via `eslint-plugin-react-hooks`) couldn't be independently confirmed.** `eslint.config.mjs` has no explicit `react-compiler` plugin entry and `next.config.ts` doesn't set `reactCompiler: true`; the enforcement, if any, would come bundled inside `eslint-config-next`'s `core-web-vitals` preset. Not asserting the claim is wrong — `pnpm lint` is independently confirmed clean per the task brief — just flagging that the skill states this as a hard mechanical guarantee ("Đây là lỗi thật của `pnpm lint`, đã gặp khi refactor `LanguageSelector`") and I couldn't verify the enforcement mechanism itself from config alone. Worth a quick `pnpm eslint --print-config hooks/use-menu-keyboard-nav.ts | grep react-hooks` the next time this skill's claim needs re-justifying.

**S3 — Machine-generated pipeline state files committed alongside the docs regen.** `plans/260905-1447-rebuild-spec-core/artifacts/**/.pending`, `.../flows/.completed`, `.../flows-complete.flag`, `.../fs7-complete.flag` are 0-byte or near-empty marker files from the `rebuild-spec` tool's own gate-tracking. Consistent with this project's existing convention of versioning `plans/` (including artifacts), so not flagging as a problem — just noting it in case a future cleanup pass wants to gitignore the ephemeral flag/marker files specifically while keeping the actual spec content.

## Whole-branch checks (item 1 — recent-commits-in-isolation blind spot)

- No inconsistency found between the two extractions: both follow the same shape (named-object return, destructured at call site, ref callbacks not `RefObject`s, pure math in `lib/`).
- No duplication introduced across `hooks/use-login-actions.ts` and `hooks/use-menu-keyboard-nav.ts` — different concerns (transition/server-action vs. DOM keyboard nav), no repeated logic block.
- `.gitignore` un-ignore verified narrow: `git check-ignore` confirms only `separate-hook-logic-from-components/` is un-ignored; `devops/`, `search-docs/`, `takumi-flow/`, `think-sequential/`, `.venv/` remain ignored as before.

## Skill compliance (item 2)

Checked `hooks/use-login-actions.ts`, `hooks/use-menu-keyboard-nav.ts`, `app/login/login-client.tsx`, `components/login/language-selector.tsx` against `.claude/skills/separate-hook-logic-from-components/SKILL.md`'s hard rules:
- Destructure-at-call-site: both call sites (`login-client.tsx:33-34`, `language-selector.tsx:26-35`) destructure immediately. Compliant.
- No `RefObject` returned: both hooks return ref *callbacks* (`registerRoot`, `registerButton`, `registerItem`), refs themselves never leave the hook. Compliant.
- Pure logic in `lib/`: `lib/ui/roving-index.ts` and `lib/auth/sign-in-with-google.ts` have zero React imports, take all DOM/browser values as parameters instead of reading `window` directly. Compliant.
- No `useEffect` in components: confirmed absent from both `.tsx` files (moved into the hooks). Compliant.
- The skill's own worked example (`components/login/language-selector.tsx`) matches the actual shipped file almost verbatim — the skill isn't a case of "day-one self-violation."

## Public/contract surface (item 3)

- `lib/ui/roving-index.ts` (`lastIndex`, `nextIndex`, `prevIndex`): small, pure, stable, well-tested (6 edge cases including empty-list and negative-index). No concerns.
- `hooks/use-login-actions.ts`: `LoginActions.isPending` is intentionally shared between login and locale-switch transitions (documented as behavior-preserving, `BR-005` in the regenerated spec) — a real implicit coupling a future maintainer could trip on, but it's called out in three places (hook doc comment, technical-spec.md, journal), so it's a known and recorded trade-off, not a silent trap.
- `lib/auth/sign-in-with-google.ts`: see W1 above — the one contract point that's under-enforced relative to how loudly its own doc comment warns about it.
- `hooks/use-menu-keyboard-nav.ts`: `itemCount` assumed static per component lifetime is explicitly documented as a known limitation with the exact fix path spelled out for a future dynamic-list caller. Fine as shipped for the single current caller.

## Security (item 4)

Covered under W1. No other findings — the actual open-redirect gate (`safeNextPath`) is untouched by this branch and still does its job on the receiving end; error messages are never surfaced raw to the client in either the old or new code path.

## Docs half of the diff (item 5)

Spot-checked `docs/vi/generated/{api-map,behavior-logic,entities,screen-flow}.md`, `docs/vi/system/architecture.md`, and both `F001`/`F002` `technical-spec.md` files against the actual source:
- Every line-range citation checked resolved to the claimed content (`hooks/use-login-actions.ts:42-57`, `lib/auth/sign-in-with-google.ts:39-55`, `components/login/language-selector.tsx:26-102`, `hooks/use-menu-keyboard-nav.ts:58-171`, `lib/ui/roving-index.ts:10-24`, `components/login/google-login-button.tsx:21-53,28-33` — the last file is unchanged by this branch and the doc still cites it correctly).
- Test counts (34→50), coverage numbers (55.55%→63.87%), and the new files list in `architecture.md` match `git diff --stat` and the new `*.test.ts` files added.
- BR-005 (shared transition side effect) is documented consistently across the hook's own comment, the technical-spec, and the journal entry — no contradiction found.
- Nothing that needed a citation-by-citation re-verification of the underlying business rules turned up a mismatch (that pass was already done by the feature-spec gate per the task brief; I only checked for new contradictions this branch's code changes could have introduced).

## Anything that shouldn't ship (item 6)

Checked for stray `console.log`/`debugger`, TODO/FIXME markers, `.only`/`.skip` in tests, secret-shaped strings, and `.env`/`.pem`/`.key`/`.log` files added — none found. The two `plans/reports/tester-*.md` files and `plans/260905-1447-rebuild-spec-core/artifacts/**` additions are evidence artifacts from earlier pipeline stages, consistent with this project's own convention of committing `plans/` (see S3 for a minor tidiness note, not a blocker).

## Actions In Order

1. Fix W1 in `lib/auth/sign-in-with-google.ts` (`encodeURIComponent(next)` or reuse `safeNextPath`-style validation) before merge — low effort, existing test file already covers the redirectTo-shape assertion and just needs the new expected value.
2. Optional: address S1/S2/S3 whenever convenient; none block landing.

## Numbers

- Files reviewed in depth: `hooks/use-login-actions.ts`, `hooks/use-menu-keyboard-nav.ts`, `lib/auth/sign-in-with-google.ts` (+test), `lib/ui/roving-index.ts` (+test), `app/login/login-client.tsx`, `components/login/language-selector.tsx`, `components/login/google-login-button.tsx` (unchanged, cross-checked), `.claude/skills/separate-hook-logic-from-components/SKILL.md`, `.gitignore`, plus spot-checks across ~7 docs files.
- Lines changed: +4675/-559 across 53 files (per branch stat); code (non-docs, non-plans) portion ≈ 468 lines across the 6 touched/added source files.
- Critical: 0 · Warning: 1 · Suggestion: 3

## Still Unresolved

None from this pass. W1 is the only actionable item before merge.
