# Data-layer scout — write-kudo (create-kudo) feature

No applicable skill activated (this is repo archaeology, not external tech
research or library-doc lookup) — proceeded with Grep/Read directly. No
`.codegraph/` at repo root either.

## 1. Kudos schema

**`public.kudos`** — `supabase/migrations/0006_kudos.sql:20-29`
| col | type | null | default |
|---|---|---|---|
| id | uuid PK | no | `gen_random_uuid()` |
| sender_id | uuid FK→users(id) ON DELETE CASCADE | no | — |
| receiver_id | uuid FK→users(id) ON DELETE CASCADE | no | — |
| content | text | no | — |
| hashtags | text[] | no | `'{}'` |
| image_urls | text[] | no | `'{}'` (comment: up to 5, UI-enforced, no CHECK — `0006_kudos.sql:33`) |
| heart_count | integer | no | `0` (trigger-maintained only, 0007) |
| created_at | timestamptz | no | `now()` |

Indexes: `idx_kudos_heart_count_created_at (heart_count DESC, created_at DESC)`, `idx_kudos_created_at (created_at DESC)`, `idx_kudos_hashtags_gin USING gin(hashtags)` — `0006_kudos.sql:48-56`.

RLS (`0006_kudos.sql:58-75`): `FORCE ROW LEVEL SECURITY`. Only policy: `kudos_select_all` — `FOR SELECT TO anon, authenticated USING (true)`. **No INSERT/UPDATE/DELETE policy exists.** `REVOKE ALL … GRANT SELECT` only. Comment at `0006_kudos.sql:16-18` states explicitly: *"No INSERT/UPDATE/DELETE policy on `kudos` at all. F007 is entirely read-only; the 'Viết Kudo' compose dialog … adds its own write policy when THEY are built, not here."*

Columns present: sender_id ✓, receiver_id ✓, content ✓, hashtags ✓, image_urls ✓, created_at ✓. **Anonymous flag: not present. Anonymous display name: not present.** No `is_anonymous`/`anon_name` column anywhere in 0006-0008.

`public.users.department` added `0006_kudos.sql:40` (nullable text, ALTER on existing table).

**`public.kudo_hearts`** (0007, heart-toggle, not directly relevant to write-kudo but adjacent) — `id uuid PK`, `kudo_id FK→kudos`, `user_id FK→users`, `special boolean default false`, `created_at`, `UNIQUE(kudo_id,user_id)`. RLS: SELECT all; INSERT own-row + sender-guard (`user_id <> kudos.sender_id`); DELETE own-row. Trigger `sync_kudo_heart_count` (SECURITY DEFINER) is the only writer of `kudos.heart_count`.

**`public.kudos_cards`** view (`0006_kudos.sql:82-101`) — `SECURITY DEFINER` (`security_invoker=false`), joins kudos+users(sender)+users(receiver), exposes id/content/hashtags/image_urls/heart_count/created_at + per-side id/full_name/avatar_url/department/kudos_received. `GRANT SELECT` to anon+authenticated only; **not updatable** (join view) — cannot be used as an INSERT target.

**`public.users`** (0001) — id PK (=auth.users.id), email, full_name, avatar_url, locale (vi/en), role (member/admin), created_at, updated_at, +department (0006). RLS: own-row SELECT/UPDATE only (`auth.uid()=id`); column-grant restricts UPDATE to full_name/avatar_url/locale/updated_at (`0001:55-59`). **A signed-in Sunner cannot SELECT another Sunner's `public.users` row directly** — only through `profile_cards`/`kudos_cards` views.

## 2. Insert path today: none

`src/dal/kudos.ts` and `src/dal/kudos-cards-query.ts` are **read-only** — `selectCards` only ever does `.select(...)` with `.contains/.eq/.lt/.order/.limit` (`src/dal/kudos-cards-query.ts:94-127`), no `.insert(`. Grepped `src/dal/` and `src/app/**/_actions/` for `.insert(` — the only hit is `kudo_hearts` insert in `toggle-kudo-heart.ts:89` (hearts, not kudos). **No create/insert-kudo DAL function exists anywhere in `src/`.**

Existing DAL surface (all in `src/dal/`, all `import "server-only"`, all take an **injected** client — never construct one):
- `getKudosBoard(client: KudosClient, options): Promise<KudosBoard>` — `src/dal/kudos.ts:92`
- `selectCards(client: KudosClient, filters): Promise<CardRow[]>` — `src/dal/kudos-cards-query.ts:94`
- `getViewerHeartedKudoIds(client: KudoHeartsClient, userId, kudoIds): Promise<Set<string>>` — `src/dal/kudo-hearts.ts:46`
- `getCurrentUser(): Promise<User|null>` — `src/dal/auth.ts:16`, uses `@/lib/supabase/server` internally (only DAL fn that constructs its own client)
- `getUserRole(client: UsersRoleClient, userId): Promise<UserRole>` — `src/dal/users.ts:51`
- `getProfileCard(client: ProfileCardsClient, id): Promise<ProfileCard|null>` — `src/dal/profile-cards.ts:74`

Client-factory adapters (`*-client.ts`, e.g. `src/dal/kudos-client.ts:57 toKudosClient(supabase: ServerSupabaseClient): KudosClient`) narrow the real `@supabase/ssr` server client down to the minimal shape each DAL fn touches — `ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>` where `createClient` is `@/lib/supabase/server`. **Only the server (`@supabase/ssr` cookie-based) client variant is used anywhere in `src/`.** Grepped for `service_role`/`SERVICE_ROLE`/`serviceRole` across `src/` — zero hits. **No service-role client exists in this codebase.**

Client factories live at `src/lib/supabase/`:
- `server.ts` — `createClient()` async, `createServerClient` from `@supabase/ssr`, cookie-based, used by Server Components/Actions.
- `client.ts` — presumably browser client (not read this pass, name implies `createClient` for Client Components).
- `proxy-client.ts` — `createProxyClient(request, response)` used only inside `src/proxy.ts`.

## 3. Mutation precedent: `toggle-kudo-heart.ts`

`src/app/(public)/kudos/_actions/toggle-kudo-heart.ts` (full pattern, 147 lines):
- `"use server"` — line 1, file-top (only directive in file).
- Input validation: **manual, not zod** — `typeof kudoId !== "string" || kudoId.trim() === ""` (line 39). Confirmed **zero zod usage** anywhere in `src/` (`grep -rl "zod" src` → empty) and no `"zod"` dep in `package.json`.
- Auth check: re-derives caller server-side via `createClient()` + `supabase.auth.getUser()` (lines 44-51) — **never trusts a client-supplied identity**. Returns `{ok:false, reason:"unauthenticated"}` if no user.
- Error return shape: discriminated union `{ok:true,...} | {ok:false, reason: "unauthenticated"|"error"}` (lines 11-13) — no thrown errors escape the exported function; everything wrapped in one outer `try/catch` returning `{ok:false, reason:"error"}` (lines 43,58-60).
- Enforcement lives in Postgres (RLS WITH CHECK + UNIQUE), the action only reads the outcome back — explicit design comment lines 17-24.
- Revalidation: `revalidatePath(ROUTES.KUDOS)` (line 56) — only on the write path; the read-only `loadMoreKudos` (`load-more-kudos.ts`) explicitly does **not** revalidate (comment lines 20-26: would wipe client-appended pages).
- Test: `toggle-kudo-heart.test.ts` alongside, same dir. Mocks the whole `@/lib/supabase/server` module (`vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))`, line 15) and `next/cache`'s `revalidatePath`. Builds a hand-rolled stub object matching only the exact chained calls the action makes (`stubSupabase()` helper, lines 36-90) — no supabase test-double library used.

## 4. Auth

- `getCurrentUser(): Promise<User|null>` — `src/dal/auth.ts:16-27`. Wraps `createClient()` (`@/lib/supabase/server`) + `supabase.auth.getUser()`. **Fails open to `null`** on any error (line 24-26) — never throws, never redirects itself.
- Protected-route enforcement: `src/app/(protected)/layout.tsx:19-29` — calls `getCurrentUser()`, `redirect(ROUTES.LOGIN)` (from `next/navigation`) if `!user`. This is the **sole authoritative gate**.
- `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, confirmed by file existing at `src/proxy.ts` and its own doc-comment line 19) is only an **optimistic pre-check**: redirects `!authed && protectedPath → /login` and `authed && /login → /`, via `createProxyClient` + `auth.getUser()` (lines 34-56, 86-96). `config.matcher` (lines 138-140) is a literal whitelist: `/`, `/login`, `/todo/:path*`, `/awards`, `/standards`, `/profile`. **`/kudos` is not in this matcher** — the public kudos board runs no proxy-level auth check at all today.
- No separate `middleware.ts` exists (`find … -iname middleware.ts` → empty); this repo's non-standard Next version uses `proxy.ts` per `AGENTS.md`'s warning.

## 5. People + hashtag sources

- **No dedicated "list Sunners" DAL exists.** `src/dal/users.ts` only exports `getUserRole` (single id → role). `src/dal/profile-cards.ts`'s `getProfileCard` is single-id lookup (`id,full_name,avatar_url` via `profile_cards` view), not a list/search. Grepped every exported DAL function (`grep "export async function\|export function" src/dal/*.ts`) — none return a collection of users. **A recipient-picker for "Viết Kudo" has no existing DAL source to reuse; it needs a new function.**
- **Hashtag vocabulary**: not a separate table — `getKudosBoard` derives it by reading the unfiltered `kudos_cards` view and `dedupe(totalsRows.flatMap(row => toArray(row.hashtags)))` (`src/dal/kudos.ts:132`). This is a **derived read from existing kudos content**, not a vocabulary table a compose form could pull suggestions from as-is.
- Display columns available via `kudos_cards`/`profile_cards`: `full_name`, `avatar_url`, `department` (kudos_cards only; profile_cards has no department) — `0006_kudos.sql:88-91`, `0005_profile_cards_view.sql:53-57`.

## 6. Storage

`supabase/config.toml:109-120`: `[storage] enabled = true`, `file_size_limit = "50MiB"`, but `[storage.buckets.images]` and every bucket-config block are **commented out** (lines 114-120). **No bucket is actually configured.** Grepped `src/` for any file/image-upload code — none exists (only the toggle-heart/kudos read DALs touch Supabase; no `.storage.` call anywhere in `src/dal` or `src/app`).

Images rendered on today's kudos feed come from a **static public asset**: `public/kudos/sample-image.png`, referenced directly as literal URL strings in the seed migration's `image_urls` array (`0008_kudos_demo_seed.sql:118`: `ARRAY['/kudos/sample-image.png', '/kudos/sample-image.png']`). Seed-migration comment (`0008:37-44`) confirms: *"Attachment image URLs have no readable source … Avatar URLs are left NULL rather than invented — no equivalent real asset exists."* **A real upload path (Storage bucket + upload code) does not exist and must be built new if the compose screen needs image attachment.**

## 7. Content rendering

`src/app/(public)/kudos/_components/kudos-card.tsx:99-104`:
```tsx
<div data-testid="kudos-card-content" className="...">
  {card.content}
</div>
```
**Plain text interpolation** — no `dangerouslySetInnerHTML`, no markdown renderer anywhere in this component or its imports (`kudos-card-person.tsx`, `kudos-hashtag-list.tsx`, `kudos-image-strip.tsx` not grepped for markdown but none imported). **Rich-text markup will NOT round-trip** — any markdown/HTML typed in a compose textarea renders as literal escaped text on the card, not formatted.

## 8. Seed data

`supabase/migrations/0008_kudos_demo_seed.sql`. One full row (`:110-120`):
```sql
INSERT INTO public.kudos (id, sender_id, receiver_id, content, hashtags, image_urls, created_at)
VALUES (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-...0001', -- Đỗ hoàng Hiệp (sender)
    'a0000000-...0002', -- Dương thúy An (receiver)
    $kudo$Cảm ơn người em bình thường nhưng phi thường :D ...$kudo$,
    ARRAY['IDOL GIỚI TRẺ', 'Dedicated', 'Inspring'],
    ARRAY['/kudos/sample-image.png', '/kudos/sample-image.png'],
    '2025-10-30 22:00:00+07'::timestamptz
);
```
`heart_count` is never set directly in seed data — always backfilled via `kudo_hearts` inserts + trigger (0008 comment lines 35-36). Note: `hashtags[0]` (`'IDOL GIỚI TRẺ'`) is treated as the "featured tag" by `kudos-card.tsx:55` (`card.hashtags[0]`) — **array order is semantically load-bearing**, not just storage order.

## Constraints this puts on the write-kudo plan

1. **RLS blocks writes today** — `kudos` has zero INSERT policy (0006). A new migration adding `kudos_insert_own` (`WITH CHECK sender_id = auth.uid()`, mirroring `kudo_hearts_insert_own`'s pattern in 0007) is mandatory before any Server Action can insert, exactly as `0006`'s own comment anticipates.
2. **No anonymous-kudo column exists.** If the MoMorph screen's "Viết Kudo" needs an anonymous-sender toggle/display-name, that is a new column + migration, not something already modeled.
3. **No image upload path exists at all** — no Storage bucket configured, no upload code anywhere. If the compose screen supports image attachment, Storage bucket setup + new upload code is net-new work, not a pattern to copy.
4. **No recipient-picker data source exists** — needs a new DAL read (list/search Sunners), not a call to reuse.
5. **Content is plain text** — no markdown/rich-text round-trip; a compose textarea's newlines/formatting will render as literal text unless a renderer is added to `kudos-card.tsx` too (out of this scout's scope but a real coupling).
6. **Validation pattern is manual, not zod** — repo has zero zod dependency; follow `toggle-kudo-heart.ts`'s inline `typeof`/`trim()` style for consistency, or introduce zod as a new dependency (a decision to flag, not assume).
7. **Client variant**: only the `@supabase/ssr` server (cookie) client is used anywhere; there is no service-role client to reach for. A create-kudo action should follow `toggleKudoHeart`'s exact shape: `createClient()` → `auth.getUser()` → fail closed on any error → `revalidatePath(ROUTES.KUDOS)` on success.
8. **`/kudos` has no proxy-level auth gate** (`src/proxy.ts` matcher excludes it) — an unauthenticated compose attempt must be caught by the Server Action's own `auth.getUser()` check (same as `toggleKudoHeart`), not by route-level middleware.

## Open questions (not answerable from code — for product/plan)

- Does "Viết Kudo" require an anonymous-sender mode? (No schema support today — needs a Q&A decision + migration.)
- Does the compose screen need image upload, or do seeded/static URLs suffice for this iteration? (Storage is a real net-new subsystem if yes.)
- Is the hashtag input free-text or must it match the existing derived vocabulary? (No hashtag table exists to validate against.)
- Recipient picker: search-as-you-type across all Sunners, or a bounded list? Determines whether the new DAL read needs pagination/search filtering.
