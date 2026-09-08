# Secret Box Modal — Backend/Data Research

Scope: server-authoritative badge draw + counter, given real schema. Read-only research.

## Q1 — Exact schema shape today

**EXTRACTED** `public.kudos` (0006:20-29): `sender_id uuid NOT NULL REFERENCES users`, `receiver_id uuid NOT NULL REFERENCES users`, `heart_count integer NOT NULL DEFAULT 0` (denormalized). `sender_id` = who wrote the kudo, `receiver_id` = who it's about.

**EXTRACTED** `public.kudo_hearts` (0007:39-46): `kudo_id`, `user_id` (the hearter), `special boolean`, `UNIQUE(kudo_id, user_id)`. A row here is NOT a per-user total — it's "user X hearted kudo Y".

**EXTRACTED** `kudo_hearts`'s AFTER INSERT/DELETE trigger `sync_kudo_heart_count` (0007:99-119) is the ONLY writer of `kudos.heart_count`; it credits the affected kudo's own row, `CASE WHEN special THEN 2 ELSE 1`.

**EXTRACTED** `src/dal/kudos-stats.ts:19-25,67-99` already answers "count hearts on kudos a user SENT": `hearts = sum(heart_count) WHERE sender_id = viewerId`. Its own doc comment: *"hearts is NOT sum(heart_count) WHERE receiver_id... a heart credits the kudo's SENDER, not its receiver"*, citing `clarifications.md § "Lượt tim cộng vào tài khoản NGƯỜI GỬI hay NGƯỜI NHẬN"` and the 0007 migration comment (0007:30-37) that this exact ambiguity was already litigated and resolved sender-side.

So: **yes**, you can count hearts on kudos the user sent — `getKudosStats` already does it, tested (`kudos-stats.test.ts`).

## Q2 — Entitlement SQL expression

**EXTRACTED** copy (`messages/vi.json:145`): *"Mỗi lời Kudos bạn gửi... nhận về những lượt ❤️... Cứ mỗi 5 lượt ❤️, bạn sẽ được mở 1 Secret Box."* — hearts earned on kudos **you sent**, matching Q1's sender-side resolution exactly. **NOT AMBIGUOUS** — copy + migration comment + existing DAL all agree: sender-side.

Exact SQL:
```sql
SELECT floor(COALESCE(SUM(k.heart_count), 0) / 5)::int AS entitlement
FROM public.kudos k
WHERE k.sender_id = :user_id;
```
`unopened = entitlement - (SELECT count(*) FROM secret_box_openings WHERE user_id = :user_id)`.

## Q3 — Persistence design: openings-log vs stored counter

**INFERRED**, ranked:

| | Openings-log `(user_id, badge_key, opened_at)` | Stored counter column |
|---|---|---|
| Drift risk | Low — unopened is *always* a live recomputation from `kudos.heart_count` (ground truth), can never desync | High — a counter must be kept in sync by a NEW trigger cascading off `sync_kudo_heart_count`'s own UPDATE on `kudos.heart_count` (trigger-on-trigger), the exact "cascading complexity" the 0007 author avoided by keeping `heart_count` itself a plain denorm column with ONE writer |
| Files touched | 1 new migration | 1 new migration + edit to 0007's trigger (touching a file the repo comments say not to reference from unrelated code, AD-2 precedent) |
| Also gives you | Free audit log + "which badges owned" for `BadgeCollection`'s `unlockedSlugs` (already exists, `badge-collection.tsx:9-14`) | Nothing extra — badges-owned would need a *second* table anyway |

**Recommendation: openings-log.** Fewer files, no coupling to an existing trigger, and it's the same table `BadgeCollection` needs to unlock slots — a counter column would still require this table.

Migration `0011_secret_box.sql` (mirrors 0007's shape — comment header, `ENABLE`+`FORCE ROW LEVEL SECURITY`, `REVOKE ALL` before `GRANT`, `SET search_path` on the function):

```sql
CREATE TABLE IF NOT EXISTS public.secret_box_openings (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_key  text        NOT NULL CHECK (badge_key IN (
                              'stay-gold','flow-to-horizon','touch-of-light',
                              'beyond-the-boundary','revival','root-further')),
    opened_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secret_box_openings_user_id
    ON public.secret_box_openings (user_id);

ALTER TABLE public.secret_box_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_box_openings FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON public.secret_box_openings FROM anon, PUBLIC, authenticated;

DROP POLICY IF EXISTS secret_box_openings_select_own ON public.secret_box_openings;
CREATE POLICY secret_box_openings_select_own ON public.secret_box_openings
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.secret_box_openings TO authenticated;
-- No INSERT grant to authenticated — only open_secret_box() (SECURITY DEFINER) writes.
```
`badge_key` values chosen to match the asset stems already shipped in `profile-copy.ts:87-92` (`badge-stay-gold.png` etc.) — reuse, don't invent a second naming scheme.

## Q4 — Where the weighted pick must live + atomicity

**INFERRED, high confidence.** Must be a Postgres `SECURITY DEFINER` function (RPC), not a Next.js server action computing the pick and then writing rows. Reasons, all grounded in repo precedent:
- Every write path that must be authoritative already does it this way: `sync_kudo_heart_count` (0007:99-119, trigger not RPC but same principle) and the `kudos_cards`/`profile_cards` views (0005, 0006/0009) all run `SECURITY DEFINER` specifically so Postgres — not app code — is the enforcement boundary.
- **EXTRACTED**: no `.rpc(` call exists anywhere in `src/` today (`grep -rn "\.rpc(" src --include="*.ts"` → empty) — this is a genuinely new pattern for the repo, but the existing `SECURITY DEFINER` function precedent (0002 `handle_new_user`, 0007 `sync_kudo_heart_count`) is the template to follow, including `SET search_path = public, pg_temp` (privilege-escalation guard both cite).
- A server action calling this RPC only ever sees `{badge_key, unopened}` back — it cannot pass in a badge, cannot see other users' entitlement, and a direct authenticated REST call to the RPC is exactly as safe as calling it via the action (same boundary `toggleKudoHeart` relies on for `kudo_hearts`).

Sketch:
```sql
CREATE OR REPLACE FUNCTION public.open_secret_box()
RETURNS TABLE (badge_key text, unopened int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entitlement int; v_opened int; v_badge text; v_roll numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  -- Serializes concurrent calls for the SAME user across sessions/tabs —
  -- there is no natural row to SELECT...FOR UPDATE on before the first
  -- opening exists, so an advisory xact lock (auto-released at commit/
  -- rollback) is the standard Postgres answer to this exact shape of race.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT floor(COALESCE(SUM(k.heart_count), 0) / 5)::int INTO v_entitlement
    FROM public.kudos k WHERE k.sender_id = v_user_id;
  SELECT count(*)::int INTO v_opened
    FROM public.secret_box_openings WHERE user_id = v_user_id;

  IF v_opened >= v_entitlement THEN
    RAISE EXCEPTION 'no_boxes_left' USING ERRCODE = 'P0001';
  END IF;

  v_roll := random() * 100;
  v_badge := CASE WHEN v_roll < 30 THEN 'stay-gold'
                  WHEN v_roll < 55 THEN 'flow-to-horizon'
                  WHEN v_roll < 75 THEN 'touch-of-light'
                  WHEN v_roll < 85 THEN 'beyond-the-boundary'
                  WHEN v_roll < 95 THEN 'revival'
                  ELSE 'root-further' END;

  INSERT INTO public.secret_box_openings (user_id, badge_key) VALUES (v_user_id, v_badge);
  RETURN QUERY SELECT v_badge, (v_entitlement - v_opened - 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_secret_box() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.open_secret_box() FROM anon, PUBLIC;
```
Double-click race: both calls hit the advisory lock; the loser blocks until the winner commits, then re-reads `v_opened` (now incremented) and correctly raises `no_boxes_left` if entitlement is exhausted. No client-visible retry needed — the server action just surfaces the RAISE as an error toast.

## Q5 — Conventions the new migration/DAL must not break

**EXTRACTED** `toggle-kudo-heart.ts:134-138`: *"createClient() carries no Database generic (see server.ts)... data.heart_count is any at the type level"* — **no Supabase types are generated/committed** in this repo (confirmed: no `database.types.ts`/`supabase.types.ts` file exists anywhere outside `node_modules`; no `gen types`/`db:types` script in `package.json`). Every DAL narrows the client to a hand-written minimal type (`KudosStatsClient`, `KudoHeartsClient` shapes) and boundary-checks raw values through `unknown` before trusting them as `number`/`string` — the new `openSecretBox` DAL function must follow the same hand-typed-narrow-client + `unknown`-boundary-check pattern, not assume `.rpc()` returns a typed shape. `pnpm typecheck` has nothing to break here since there's no generated type to drift from — but there's also no compiler safety net, so runtime shape-checking on the RPC's returned `{badge_key, unopened}` is load-bearing, same as `readHeartCount`'s pattern.

## Recommendation summary (ranked)

1. **Entitlement**: `floor(sum(heart_count WHERE sender_id=viewer)/5)` — settled, not ambiguous, matches existing `getKudosStats` code + copy text.
2. **Persistence**: one `secret_box_openings` log table (migration `0011`) — lower drift risk and file count than a stored counter, and doubles as the badge-unlock source `BadgeCollection` already has a prop for.
3. **Draw + write**: one `SECURITY DEFINER` Postgres function `open_secret_box()`, `pg_advisory_xact_lock` for the double-click race — matches the repo's only existing authoritative-write precedent (0007's trigger), not a server-action-side pick.
4. **DAL**: hand-typed narrow client wrapper around `.rpc("open_secret_box")`, boundary-check the returned row through `unknown`, fail CLOSED (like `toggleKudoHeart`, not like the read-only board DALs) since a silent failure here must not show a fake badge.

## Unresolved

- No functional/technical spec file for Secret Box exists yet (`FUN_006/FUN_007` are explicitly deferred stubs in `F006_ProfilePage/functional-spec.md:24,314`) — this report infers behavior from `messages/vi.json` copy + `kudos-stats.ts` precedent alone; a product-facing spec doc doesn't exist to cross-check against.
- Badge display metadata (name/rarity copy per badge for the reveal modal) lives in `messages/vi.json:146-164` under `standards.secretBoxSection.badges.*` — not re-verified here whether `en.json` mirrors the same 6 keys.
