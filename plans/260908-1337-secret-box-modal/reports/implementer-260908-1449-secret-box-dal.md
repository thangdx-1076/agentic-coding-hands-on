# Implementer report — Phase 04 (Track B): secret-box DAL + kudos-stats + server action

**Status: DONE**

## Files touched
- `src/dal/secret-box.ts` (new, 157 lines)
- `src/dal/secret-box.test.ts` (new, 11 tests)
- `src/dal/secret-box-client.ts` (new, 25 lines)
- `src/dal/secret-box-client.test.ts` (new, 1 test)
- `src/dal/kudos-stats.ts` (modified, 121 → 192 lines, under the 200-line guideline)
- `src/dal/kudos-stats.test.ts` (modified, 7 → 13 tests)
- `src/dal/kudos-stats-client.ts` — **not touched**: `pnpm typecheck` stayed green without any
  change (the shim's untyped arrow functions absorbed the widened unions structurally, exactly
  as the phase file predicted).
- `src/app/(public)/kudos/_actions/open-secret-box.ts` (new, 38 lines)
- `src/app/(public)/kudos/_actions/open-secret-box.test.ts` (new, 7 tests)

## API handed to phase 05

```ts
// src/dal/kudos-stats.ts — additive, backward-compatible
export type KudosStatsSummary = {
  received: number; sent: number; hearts: number;
  secretBoxOpened: number; secretBoxUnopened: number; // NEW
};
export function getKudosStats(client, viewerId): Promise<KudosStatsSummary>;

// src/app/(public)/kudos/_actions/open-secret-box.ts
export type OpenSecretBoxResult =
  | { ok: true; badgeKey: SecretBoxBadgeKey; unopened: number }
  | { ok: false; reason: "no_boxes_left" | "unauthenticated" | "unknown" };
export function openSecretBoxAction(): Promise<OpenSecretBoxResult>; // no params

// src/dal/secret-box.ts
export const SECRET_BOX_BADGE_KEYS = [...] as const; // 6 kebab keys
export type SecretBoxBadgeKey = (typeof SECRET_BOX_BADGE_KEYS)[number];
```

`page.tsx:141` destructures `{ received, sent, hearts }` from `getKudosStats` — adding two
required fields to the returned object is a pure extension (destructuring, not an object
literal, so no excess-property check applies); `pnpm typecheck` confirms `page.tsx` compiles
untouched. Phase 05 swaps its own hardcoded `secretBoxOpened: 0, secretBoxUnopened: 0` for the
two new fields on the `stats` object already returned by `getKudosStats`.

`openSecretBox` (the DAL, in `secret-box.ts`) only ever resolves `{ok:false}` for the two named
Postgres exceptions; every other failure (malformed RPC shape, unrecognized Postgres error)
throws. `openSecretBoxAction`'s own `try/catch` is the only place that downgrades any thrown
error to `{ok:false, reason:"unknown"}` — this three-way union lives on the action, not the DAL.

## Real RPC response (captured live, not assumed)

Created two throwaway users via GoTrue signup, inserted one `kudos` row (sender=A,
`heart_count=5` → entitlement 1), called the RPC via PostgREST with A's real access token:

```
$ curl -X POST http://127.0.0.1:55321/rest/v1/rpc/open_secret_box -H "apikey: <anon>" -H "Authorization: Bearer <A's JWT>"
[{"badge_key":"touch-of-light","unopened":0}]      HTTP 200   ← array of one row, confirms parseOpeningRow's array path
$ (same call again)
{"code":"P0001","details":null,"hint":null,"message":"no_boxes_left"}   HTTP 400   ← confirms extractErrorMessage's message-matching
```

`select user_id, badge_key from secret_box_openings` showed exactly the one row, `user_id` =
viewer A, `badge_key = "touch-of-light"` (one of the 6). Cleaned up: `delete from auth.users
where id in (A, B)` — cascades through `public.users` → `kudos` → `secret_box_openings`.
Re-verified all three tables show 0 matching rows afterward. No `supabase db reset` used; no
host `psql` (used `docker exec supabase_db_saa-app psql`).

## Checks
- Typecheck: clean (`pnpm typecheck` / `npx tsc --noEmit`).
- Lint: clean (`pnpm lint` scoped to the 8 touched files).
- Format: clean (`pnpm format:check` scoped to the 8 touched files).
- Unit tests: **588 passing, 0 failing**, full suite (68 files). New: 11 (`secret-box.test.ts`)
  + 1 (`secret-box-client.test.ts`) + 13 (`kudos-stats.test.ts`, was 7) + 7
  (`open-secret-box.test.ts`) = 32 tests added/changed.
- Coverage: **100%** lines/statements/branches/functions repo-wide (`pnpm test:unit:coverage`
  passes its 100% global threshold — two extra test cases were needed to close two branches my
  first pass missed: a malformed `heart_count` row in `kudos-stats.ts`, and a real `Error`
  instance with an unrecognized message + a `message`-less error object in `secret-box.ts`).
- E2E regression (`E2E_PORT=3100 npx playwright test tests/e2e/secret-box.spec.ts`, :3000 was
  held by a stale server): **S13 + S15 PASS** (unchanged), **S01–S12 still RED** as expected —
  `page.tsx`'s button stays hardcoded `disabled`/`unopened:0` until phase 05 wires it up.

## `as unknown as` grep — one intentional, precedent-matched exception
`grep -n "as unknown as" src/dal/secret-box*.ts src/dal/kudos-stats*.ts` is **not** fully empty:
`secret-box-client.test.ts:13` casts a fake `{ rpc }` object to the shim's real parameter type
(`Parameters<typeof toSecretBoxClient>[0]`, i.e. the full `@supabase/ssr` server client type).
This exactly mirrors the pre-existing `kudos-stats-client.test.ts:13` (`{ from } as unknown as
ShimInput`) and `kudo-hearts-client.test.ts` — the real SDK client type is too large to
structurally satisfy with a plain stub, so every shim test in this repo already needs this cast.
The comment-only hits in `kudos-stats-client.ts:19` (pre-existing, untouched) and my own
`kudos-stats.test.ts` (a comment that used to *contain* the string — reworded to stop
false-positiving on the grep) are not real usages. I judged the shim-test cast as in-scope-but-
acceptable rather than reaching into an unowned file to change the established pattern; flagging
this explicitly rather than silently claiming the literal grep passes.

## Acceptance Criteria
- [x] `getKudosStats` returns real `secretBoxOpened`/`secretBoxUnopened`, never negative.
- [x] `openSecretBox(client)` — typed union, fail-closed throw on shape mismatch.
- [x] `openSecretBoxAction()` — zero params, three-way result union.
- [x] Narrow client + shim pattern, no `as unknown as` in production logic.
- [x] `secretBoxUnopened` clamped via `Math.max(0, …)`.
- [x] All 4 `.ts` files unit-tested; coverage 100%.
- [x] Every file < 200 lines.
- [x] `head -1 open-secret-box.ts` = `"use server";`; `revalidatePath` grep in that file is empty
      (only appears inside a doc comment explaining why it's absent).
- [x] Real psql/RPC evidence captured and cleaned up.
- [x] S13 + S15 still PASS; S01–S12 unchanged red.
- [x] `git diff`/`git status` shows only owned files touched; `tests/**`, `page.tsx`,
      `kudos-stat-list.tsx`, `supabase/**` untouched by me.

## Issues / deviations
None blocking. The one documented deviation is the `as unknown as` grep note above — a
pre-existing repo pattern, not a new shortcut.

**Status:** DONE
