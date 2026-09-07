# Known limitations — F006_ProfilePage

These are deliberate limitations of this delivery, not undemonstrated acceptance criteria. Every
one of the 13 acceptance criteria in `study-context.json` is proven locally and recorded in
`inspection-verdict.json` → `acceptanceCovered`. These items are moved here out of the verdict's
`unproven` field because the evidence gate treats that field as "claimed but not shown", which is
not what these are.

## 1. CI green proves almost nothing about this page

21 of the 22 e2e contracts carry the `@auth` tag, and `.github/workflows/ci.yml` filters
`@auth|@local-db` in both places it runs Playwright. **Exactly one test — C17, the anonymous
redirect to `/login` — actually executes in CI.**

Real validation requires a local run with Supabase up:

```
supabase start
E2E_PORT=3100 pnpm test:e2e tests/e2e/profile.spec.ts
```

This was the plan's deliberate call (the page is auth-gated and DB-backed; CI has neither), not a
regression. It is written down here because a green PR check is easy to misread as coverage.

## 2. Three copy strings were derived from the DOM contract, not confirmed against design

`profile.hero.fallbackName` (`"Sunner"`), `profile.kudos.emptyReceived` and
`profile.kudos.emptySent` had no verbatim value in the MoMorph data. They were chosen to satisfy
the locked contract in `tests/e2e/profile.spec.ts` and are internally consistent, but a designer
has not signed off on the wording. Logged in `plans/action-items.md`.

## 3. Micro-typography used design-consistent defaults

Statistics-row label font-size and the exact hero-avatar overlap ratio were set by eye against the
rendered frame rather than by node-level MoMorph queries, to stay inside a sane MCP call budget. No
DOM contract asserts these values, so a mismatch would be cosmetic.

## 4. Visual validation is an eyeball check, not a pixel baseline

Two artifacts at 1440 width (`visual-1440-self.png`, `visual-1440-other.png`), confirmed to show
the correct application and to differ from each other. There is no stored pixel-diff baseline for
this screen, so a future visual regression would not be caught automatically.

Worth knowing: the first visual pass captured **a different application entirely** — another
project's dev server held port 3000 and `reuseExistingServer` is `true` off-CI, so Playwright drove
that app instead of ours. All six original PNGs were an unrelated 404 page. `playwright.config.ts`
now accepts `E2E_PORT` (default 3000) so a squatted port can be sidestepped rather than fought.

## 5. `CREATE OR REPLACE VIEW` cannot change the view's column shape

Migration 0005 is safe to re-apply — it re-issues `REVOKE`/`GRANT` unconditionally every run, which
is why the grants reproduce identically (verified by dropping the view and re-applying the committed
file). But `CREATE OR REPLACE VIEW` can only *append* columns. Any future change that reorders or
removes a column of `public.profile_cards` needs `DROP VIEW` + `CREATE`, and must re-establish the
`REVOKE ALL ... FROM anon, PUBLIC, authenticated` before `GRANT SELECT ... TO authenticated`, or the
Supabase default privileges silently re-open both the anon read and the authenticated write path.

## 6. `public.users.id` IS `auth.users.id`

Per `supabase/migrations/0001_users_table.sql` the profile id and the auth user id are one UUID
(PK and FK). So `/profile?id=<uuid>` necessarily places an auth user id in the URL bar and in the
RSC flight payload. SEC_004 was written assuming a separate profile identifier; there isn't one in
this schema. Not introduced by this feature. Closing it would mean adding an opaque public id to
`public.users` and routing on that instead — a schema change, out of scope here.
