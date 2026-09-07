# Clarifications — Profile bản thân (SCR006 / F006)

- Screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb
  (file "SAA 2025 - Internal Live Coding", frame `362:5037`, 1440×4660, bg `#00101A`)
- fileKey: `9ypp4enmFmdK3YAFJLIu6C` · screenId: `3FoIx6ALVb`
- Specs: 28 items (`download_specs`) · Test cases: 30 (`download_test_cases`)
- testPolicy: **`e2e-red-first`** — the screen carries route resolution, a direction
  dropdown, a 404 branch and empty-state transitions. Behavioral, not presentational.
- Runner: `@playwright/test` present (`playwright.config.ts`, `pnpm test:e2e`) → strict E2E viable.
- spec_lang: `vi` (inherited — `docs/vi/` per-lang layout already exists)

## Session 260907-1224

### The governing finding

The 30 test cases were authored against a **Kudos subsystem that does not exist in this
repo**. They reference, as if already built: a `/kudos` live board,
`app/kudos/use-board-interactions.ts` → `openProfile`, a keyset-cursor card feed, a
"Viết Kudo" modal, a heart server action, `kudos_no_self`, anonymous senders, hashtags,
attachments, and `locales/{vi,en}/profile.json`.

What migrations `0001`–`0004` and `src/` actually provide:

| Assumed by TCs | Reality |
|---|---|
| `kudos` table, hearts, anonymous senders | absent — only `users`, `awards` |
| `/kudos` board + card mapper + keyset cursor | absent — no route, no components |
| "Viết Kudo" modal | absent |
| `profiles.department`, Hero tier, hoa-thị stars, counters | absent — `users` has `id, email, full_name, avatar_url, locale, role` |
| `locales/{vi,en}/profile.json` | repo uses next-intl `messages/{vi,en}.json` |
| `proxy.ts` `PUBLIC_ROUTES` | `src/proxy.ts` exists but gates by `ROUTES.TODO` prefix, no such list |
| Secret Box | already deferred **by the spec itself** (GUI_005) |

- Q: Build the whole Kudos subsystem first, or ship `/profile` against the system that
  exists? → **A: Ship `/profile` against what exists.** Kudos-dependent surfaces render
  honest empty/deferred states, exactly the way the spec already treats Secret Box
  ("the honest rendering of a deferred feature rather than invented numbers"). Repo
  precedent: `/standards` already ships an `<a href="/kudos">` whose own DOM contract
  records that the target 404s (`tests/e2e/standards.spec.ts` C12). Building the Kudos
  domain is F007+ work, not "implement màn hình profile".
  **Why:** fewest files changed (CLAUDE.md decision rule c) and it invents no data.

### Decisions taken

- Q: Route placement? → **A: `src/app/(protected)/profile/page.tsx`.** ACC_001 requires
  a redirect to `/login` for anonymous visitors; `(protected)/layout.tsx` is already the
  authoritative session gate. Add `/profile` to `ROUTES` and to `proxy.ts`'s literal
  matcher, and widen `isProtectedPage` beyond the `ROUTES.TODO` prefix test.
- Q: `?id=` reads another user's row, but `users` RLS is `users_select_own`
  (`auth.uid() = id`) — a second Sunner's row is unreadable. → **A: migration `0005`
  adds a SECURITY DEFINER view `public.profile_cards` exposing only
  `(id, full_name, avatar_url)`, granted to `authenticated`.** A plain permissive RLS
  policy would expose `email` and `role`; column-level `GRANT SELECT` would break
  `getUserRole`'s own-row `role` read. A definer view is also the idiom the spec itself
  names for the sent feed. Satisfies SEC_004 (no email, no auth id) by construction.
- Q: Malformed `?id=` → **A: shape-check against a canonical UUID regex before any
  query**, then `notFound()`. Prevents Postgres `22P02` surfacing as a 500 (FUN_004).
- Q: Repeated `?id=a&id=b` → **A: `notFound()`.** Next's `searchParams` yields `string[]`
  for a repeated key; treat non-string as a rejection rather than picking `[0]` (FUN_005).
- Q: Empty `?id=` → **A: self view** (FUN_005 step 1).
- Q: `?id=` equal to the viewer → **A: canonicalize to the self view** (FUN_002).
- Q: Department / Hero tier / hoa-thị stars have no column. → **A: omit those lines.**
  GUI_009 already specifies exactly this rendering for a sparse profile (no department
  line, no tier badge, no stars) — so the deferred state is a state the spec defines,
  not an invention.
- Q: Statistics card values? → **A: all five rows render `0`, "Mở Secret Box" disabled.**
  GUI_005 already mandates `0` + disabled for the two Secret Box rows; the three Kudos
  rows take the same treatment for the same reason.
- Q: Write-Kudo bar on another's profile (FUN_006/007)? → **A: render the bar in the
  statistics-card slot, disabled**, with no modal wired. The slot-level self/other branch
  (FUN_006, FUN_008) is implemented and testable now; the modal it would open is
  Kudos-domain work.
- Q: KUDOS feed? → **A: dropdown + empty state only.** Self profile offers both
  directions with `(0)` counts (FUN_009); another's profile offers Received only
  (SEC_001 — the anonymous-sent leak is closed by removing the surface, and removing it
  is free while the feed is empty). Received/sent empty copy per FUN_012.
- Q: i18n? → **A: new `profile` key in `messages/{vi,en}.json`**, covered by the existing
  `src/lib/i18n/messages-parity.test.ts`.
- Q: Badge collection? → **A: 6 slots, all greyed, driven by an always-empty unlocked
  list** (GUI_002) with the first-person/neutral heading split (GUI_003). Fully
  implementable today — no deferral.

### Test-case disposition

Implementable now (18): ACC_001, ACC_002, FUN_001, FUN_002, FUN_003, FUN_004, FUN_005,
FUN_008, FUN_009 (counts 0), FUN_011, FUN_012, GUI_001 (minus dept/tier/stars),
GUI_002, GUI_003, GUI_004 (values 0), GUI_005, GUI_008, GUI_009, SEC_001 (surface
removal), SEC_004.

Deferred to the Kudos domain (F007+), 10: FUN_006 (modal), FUN_007, FUN_010, FUN_013,
FUN_014, FUN_015, GUI_006, GUI_007, SEC_002, SEC_003.

### Unresolved questions

- Department / Hero tier / hoa-thị stars need columns on `users` (or a roster table)
  before the hero can render them. Product call: are they Sun*-HR-sourced or app-derived?
- `Sun* Kudos` header nav item currently points nowhere; it and the profile avatar menu
  will want `/profile` once this ships.
