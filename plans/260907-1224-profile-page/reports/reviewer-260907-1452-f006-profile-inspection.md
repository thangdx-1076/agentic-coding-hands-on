# F006_ProfilePage — Pre-PR Review

## Review Summary

### Scope
- Files reviewed: full diff `origin/main...HEAD` (60 files, 919+/39-) plus uncommitted
  `tests/e2e/profile.spec.ts`, `_components/**` (10 files), `_shared/profile-copy.ts`,
  `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `playwright.config.ts`,
  `tests/e2e/helpers/sign-in.ts`. Read plan.md, technical-spec.md, clarifications.md first.
- Lines: ~919 insertions / 39 deletions across 60 files (committed) + the uncommitted set above.
- Depth: full — every file in "What to review" opened; import-rewrite diffs verified with
  `git diff -M` to confirm rename vs. content change; migration 0001/0005 cross-checked;
  CI workflow's `--grep-invert` claim verified against `.github/workflows/ci.yml`.

### Assessment
Ready to open as a PR. No critical findings. One real test-strength gap (C10) and a couple
of low-cost suggestions. The security-sensitive surface (migration 0005) is the best-argued
piece of SQL in this diff — every REVOKE/GRANT choice is justified in comments and holds up
under adversarial reading.

---

### Critical
None found.

### High
None found.

### Medium

**M1 — `[C10]` does not exercise the interaction its own contract describes.**
`tests/e2e/profile.spec.ts:352-361`. The DOM-contract table (technical-spec.md § 4.5, and the
spec comment block at the top of this file) states C10 as "Chọn 1 chiều → hiển thị đúng copy
rỗng tương ứng" (select a direction → the correspondingly-selected empty copy appears). The
implemented test never opens the dropdown and never clicks an option — it just asserts that
*some* text matching `/chưa có|không có|trống|empty/i` is visible in the default (`received`)
state. `KudosDirectionSelect` (`src/app/(protected)/profile/_components/kudos-direction-select.tsx:55-58`)
does correctly wire `copy[EMPTY_KEY[selected]]` to `useState`, so the feature itself works —
but nothing in the suite would catch a regression where switching to "Đã gửi" fails to swap
the copy (e.g., a future edit that hardcodes `EMPTY_KEY.received`). This is exactly the class
of "weakened to reach green" test the task flagged C12/C16 as historical instances of; C10
looks like a third one that wasn't caught in that pass.
**Fix:** click the combobox, select the "sent" option, assert `copy.emptySent` text appears
and `copy.emptyReceived` does not (mirror the click sequence already used in C9a/C9b):
```ts
await combobox.click();
await page.getByRole("option", { name: /Đã gửi/ }).click();
await expect(page.locator("text=Bạn chưa có Kudos nào được gửi.")).toBeVisible();
```

### Low

**L1 — Two independent Supabase reads in `page.tsx` run sequentially where they could run concurrently.**
`src/app/(protected)/profile/page.tsx:90-101`. `getProfileCard(...)` and
`getUserRole(...)` both depend only on already-resolved values (`targetId` and `viewer.id`
respectively) — neither depends on the other's result. They currently `await` back to back,
adding one full round-trip of latency per request. `Promise.all([...])` would cut it. Minor —
matches the existing sequential-round-trip precedent this file's own comment cites for
`TodoPage`/`AwardsClient`, so this is a suggestion, not a regression.

**L2 — `hero.fallbackName` and the two Kudos empty-state strings are marked "chưa xác nhận"
(unconfirmed) in the spec** (technical-spec.md § 4.3, § 5.2) but were shipped as committed
copy anyway (`messages/vi.json`/`en.json`). Reasonable call under the CLAUDE.md decision rule
("chosen option matching existing repo pattern"), and it's honestly logged as an open item in
clarifications.md — flagging only so it doesn't silently become "confirmed" copy in a future
reader's mind. No action needed before merge.

---

## Adversarial Read — Item by Item

### 1. `supabase/migrations/0005_profile_cards_view.sql` — the auth boundary
Verified sound. Specific answers to the questions posed:

- **Column list closed against future `users` columns?** Yes — `SELECT id, full_name,
  avatar_url FROM public.users` is an explicit list, not `*`. A future column added to
  `users` (e.g., `department`) does not propagate through this view; someone would have to
  edit this migration (or a new one) to re-expose it. This is the correct shape.
- **Is REVOKE-then-GRANT sufficient, or is a grant path left open?**
  - `service_role`: not touched by the REVOKE, but that's correct, not an oversight —
    `service_role` in Supabase carries superuser-equivalent DB privileges and bypasses grant
    checks entirely; it was never gated by table ACLs in the first place, so there's nothing
    to revoke.
  - `postgres`/migration-runner role: owns the view (BYPASSRLS), naturally has full access;
    expected and required for the SECURITY DEFINER mechanism to work at all.
  - Column-level grants: `REVOKE ALL ON public.profile_cards FROM …` revokes at the table
    (view) level, which subsumes any column-level grant on the same object — there is no
    column-level default-privilege path that survives a table-level `REVOKE ALL`.
  - Default privileges applying on a **later** re-create: this is the one real subtlety, and
    the migration protects against it *unconditionally* — the `REVOKE`/`GRANT` statements are
    not conditional on "first creation", they run every time this file executes. So even if
    `ALTER DEFAULT PRIVILEGES` re-applies its `anon`/`authenticated` grants after a future
    `CREATE OR REPLACE`, the very next two statements in the *same migration file* immediately
    revoke and re-grant correctly. Nothing depends on ordering across migrations.
- **Does `CREATE OR REPLACE VIEW` preserve or reset grants on re-run — is re-applying this
  migration safe?** `CREATE OR REPLACE VIEW` in Postgres preserves the existing view's ACL
  entries (grants aren't reset by a replace) — but it doesn't matter here either way, because
  this migration doesn't rely on that behavior: it explicitly re-issues `REVOKE ALL` +
  `GRANT SELECT` unconditionally after the `CREATE OR REPLACE`, every single time the file
  runs. Re-applying is safe and idempotent by construction, not by accident. One real Postgres
  constraint worth noting for whoever writes migration 0006+ against this view: `CREATE OR
  REPLACE VIEW` cannot remove or reorder existing output columns, only append new ones at the
  end — a future edit that needs to *change* (not just add) this view's shape will need
  `DROP VIEW` + `CREATE VIEW`, which drops and re-establishes grants from scratch (the same
  unconditional REVOKE/GRANT pattern still saves that case).
- Postgres 17 is configured (`supabase/config.toml:36`), well past the PG15 minimum for the
  `security_invoker` reloption used here — no version-compatibility gap.

**Verdict: no gap found.** The comment block in the migration itself already anticipates and
answers every question I tried to raise against it — genuinely well-defended SQL.

### 2. `page.tsx` — route resolution and self/other branch
The switch on `parseProfileId`'s 4-variant union is exhaustive with a `default: notFound()`
fallback as a compile-time trap if the union ever grows. `notFound()`/`redirect()` are typed
`never`, so the missing `break` statements after those two cases are not a fallthrough bug —
control never reaches the next case.

No path renders a partial page on a DB miss: `getProfileCard` fails open to `null` on error,
missing row, or thrown exception (`src/dal/profile-cards.ts:85-96`), and `page.tsx:94-96`
turns any `null` into `notFound()` unconditionally — a transient network blip and a genuine
404 are indistinguishable to the caller, which is a documented, deliberate choice (§ 5.2 D011)
rather than an oversight.

Single `getProfileCard` call for both self/other: correct, not a conflation — the view has no
`email`/`role`/`locale` columns to leak differently between the two branches, so one read
genuinely serves both (DRY, matches D011's own reasoning).

Data reaching the client: `viewer.email` is passed to `ProfileClient` — but this is always the
*viewer's own* email (for the account-menu header), never the target profile's. `role` is
collapsed to a boolean (`role === "admin"`) before it reaches props. The target profile's raw
id is not rendered visibly (only `fullName`/`avatarUrl` render); it appears only in the URL
query string the caller already supplied and, as documented in C16's own test comment, in the
RSC flight payload — an accepted, pre-existing consequence of `public.users.id === auth.users.id`
that the task already flagged as judged-acceptable.

### 3. `parse-profile-id.ts`
Regex is anchored both ends, no `g` flag (avoids `lastIndex` statefulness), case-insensitive
match then explicit `.toLowerCase()` normalization before the self-comparison and before
returning the `"other"` id. Branch order (shape-check before self-compare before DB query) is
enforced by the code, not just documented. The discriminated union (`self` | `canonical` |
`other` | `reject`) covers every input the type signature admits
(`string | string[] | undefined`); the exhaustive test file
(`parse-profile-id.test.ts`) explicitly covers the anchor edges (prefix/suffix injection),
case-insensitivity, single-element arrays (still an array, not `[0]`), and regex-statelessness
across repeated calls. No gap found.

### 4. `src/proxy.ts` — the widened guard
`PROTECTED_ROUTES = [ROUTES.TODO, ROUTES.PROFILE]`, tested via
`.some((route) => pathname.startsWith(route))`. This looks like a prefix-matching hazard in
isolation (a hypothetical future `/profile-settings` route would incorrectly match
`startsWith("/profile")`), **but it isn't reachable in practice**: `config.matcher` is a
literal, non-wildcard `"/profile"` entry (`proxy.ts:139`), and Next only invokes this proxy
function for paths matching an entry in `matcher`. A literal matcher entry with no `:path*`
suffix matches the exact path only, so `proxy()` never even runs for `/profile-settings` —
the `startsWith` check only ever sees exactly `/profile` for this route (it does need
`startsWith` for `/todo/:path*`, which is a real wildcard match). `config.matcher` is
confirmed still a literal array (required for Next's static analysis at build time, per the
existing comment at `proxy.ts:133-136`) — not silently converted to a computed expression.
No gap found.

### 5. Phase-02 chrome promotion (31 files)
Verified with `git diff -M` (rename detection) rather than trusting the stat summary at face
value, since a plain `git diff` against the new paths alone renders them as "new file" (no old
side to diff against) and can hide a smuggled change. Every file with nonzero diffstat
(`icon-pencil.tsx`, `use-select-locale.ts`, `use-select-locale.test.ts`, and the ~15
`(public)/**` consumers) is a pure relative-import-path fix (one more `../` to reach the new
common ancestor `src/app/`) — no logic, JSX, or test-assertion changes. `vitest.config.ts` has
zero diff against `origin/main` (no stale path config). Grepped remaining `(public)/**` files
for `_components`/`_shared`/`_hooks`/`_utils` imports still resolving to *sibling* files that
correctly still live under `(public)/(home)/`, `(public)/awards/`, `(public)/login/` (their own
route-local files, e.g. `home-copy.ts`, `use-countdown.ts`) — none of these are stale
references to the deleted `(public)/_*` directories. `ls src/app/(public)/{_components,_shared,_hooks,_utils}`
confirms `_components`/`_hooks`/`_utils` are fully emptied (deleted), and `_shared` retains only
`award-name-graphics.ts`, which was never in phase 02's promotion glob (it's Homepage-award-card
-specific, not shared chrome) — not a leftover, a correctly-scoped survivor. No `.stories.tsx`
or colocated test was dropped in the move (every renamed source file has its story/test
sibling renamed alongside it in the diffstat). No gap found.

### 6. `tests/e2e/profile.spec.ts` honesty pass
Read all 22 tests looking for anything unfalsifiable or scoped so loosely it can't fail.

- **C12/C16** (the two flagged as previously vacuous): now solid. C12 asserts a real
  `response?.status() === 404` (was previously presumably checking something unobservable).
  C16 asserts the other user's real fixture email string is absent from `page.content()` and
  the raw UUID is absent from `main`'s *visible* `innerText` — correctly scoped to the visible
  region rather than the full HTML (which legitimately contains the id in the RSC payload, and
  the test comment explains why that's not a leak worth failing on).
- **C10**: see Medium finding M1 above — this is the one real remaining weak spot.
- Everything else (C1-C9, C11, C13-C15, C17, C18) makes an assertion that a plausible
  regression would actually break: exact counts (`toHaveCount(1)`/`toHaveCount(6)`/`toHaveCount(0)`),
  `toHaveAttribute("disabled")`, exact label text matches, `waitForURL` + exact pathname/search
  checks. C11's "attempt a click on a disabled button, expect it to time out" is slightly
  unusual (relies on Playwright's disabled-element click timeout as the assertion mechanism)
  but is wrapped in its own `try/catch` specifically so the *expected* timeout doesn't fail the
  test, and the real assertions (`toBeDisabled()`, `dialogs` count 0 before and after) still
  carry the actual falsifiable weight — not vacuous, just a slightly indirect setup.

---

### Known and accepted (per task) — evaluated, not challenged
- Kudos domain deferral, department/tier/stars omission, and `?id=` carrying an auth-equal
  uuid: all reviewed above in the relevant sections: the reasoning holds, nothing to add.
- 21/22 `@auth`-tagged, 1 CI-safe (`C17`): confirmed directly against
  `.github/workflows/ci.yml:205-230` — the `--grep-invert "@auth|@local-db"` filter and the
  explanatory step summary text are exactly as described.

---

## Done Well
- Migration 0005's inline comments pre-empt essentially every adversarial question a reviewer
  would ask (idempotency, the `security_invoker` linter false-positive, the auto-updatable-view
  write-escalation path) — this is the standard the rest of the repo's SQL should be held to.
- `parse-profile-id.ts` and its test file are a model of a pure-decision function kept
  separate from its side-effecting caller specifically so it can hit 100% branch coverage
  without mocking `next/navigation` — a clean application of the DAL/decision-separation
  pattern already established by `awards.ts`/`users-role-client.ts`.
- The DAL fail-open contract (`getProfileCard` → `null` → caller's `notFound()`) is consistent
  with the two existing precedents (`getAwards`, `getUserRole`) and the file's own docstring
  explains *why* this one fails to `null` rather than `[]`, rather than leaving it as an
  unexplained deviation.
- Phase-02's chrome promotion is a genuinely disciplined pure-move — verified with rename
  detection, not just trusted from the diffstat.

## Actions In Order
1. Strengthen `[C10]` in `tests/e2e/profile.spec.ts:352-361` to actually click through a
   direction change and assert the copy swaps (see fix under M1). Not release-blocking, but
   cheap to fix now while the file is fresh in mind, and it closes the last vacuous-assertion
   gap the task specifically asked to hunt for.
2. Optional: `Promise.all` the `getProfileCard`/`getUserRole` reads in `page.tsx` for one
   fewer serial round-trip (L1). Cosmetic performance win, not correctness.

## Numbers
(Reported by the task as personally verified; not independently re-executed in this read-only
review — Bash access here was used for `git diff`/`grep`/file reads only, not for running the
build/test suite.)
- 22/22 profile e2e passing (`E2E_PORT=3100`), 81 passed / 3 skipped regression suite
- 175 unit tests, 100% coverage on the allowlisted `.ts` files
- `lint --max-warnings 0` exit 0, `format:check` clean, `typecheck` clean, `build` green with
  `/profile` in the route table

## Still Unresolved
- M1 (C10 weak assertion) — recommend fixing before opening the PR, but does not block it;
  everything else this test file verifies is genuinely falsifiable.
- Department/Hero tier/hoa-thị stars and the two "chưa xác nhận" copy strings remain open
  product questions already logged in clarifications.md — no new information from this
  review changes that status.

**Status:** DONE_WITH_CONCERNS
**Summary:** No critical or high-severity findings; migration 0005's security boundary and the
phase-02 file-move both survive adversarial reading intact. One medium finding (C10 doesn't
exercise the direction-switch interaction it claims to verify) should be fixed before or
shortly after opening the PR.
**Score:** 8.5/10
**Critical findings:** 0
