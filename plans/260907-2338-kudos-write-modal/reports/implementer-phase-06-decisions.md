# Phase 06 — decisions

## `bodySizeLimit` doc finding (AD-4 confirmation)

Opened `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`
before touching `next.config.ts`, as required. Confirmed:

- Key is `experimental.serverActions.bodySizeLimit` — exactly what AD-4 assumed, no
  alternate/renamed key in this Next version.
- Default is 1MB. Accepts a byte count or any `bytes`-supported string (`'500kb'`, `'3mb'`).
- "The limit applies to the raw HTTP request body, including the bytes that
  `multipart/form-data` adds for boundaries, part headers, and field metadata... an
  additional 10–20 KB is a reasonable rule of thumb" for uploads close to the configured
  value.

Value set: `"28mb"` (5 files × 5 MiB ≈ 26.2 MB raw file bytes + multipart overhead
headroom), matching AD-4 exactly. No deviation.

## FormData field names (contract for phase 07/13's client call site)

`createKudo(formData: FormData)`:

- `recipientId` — string
- `title` — string ("Danh hiệu", becomes `hashtags[0]`)
- `content` — string
- `hashtags` — repeated string field, the chip values only (`hashtags[1..5]` in the DB
  row) — does **not** include the title
- `isAnonymous` — `"true"` to opt in; any other value (including absent) is `false`
- `anonymousName` — string, required server-side only when `isAnonymous === "true"`
- `images` — repeated `File` field, 0..5 entries

Documented verbatim as a JSDoc block at the top of `create-kudo.ts`.

## Deviations from phase-06-action-create-kudo-upload.md, and why

1. **Return-type reasons**: the phase file specifies
   `reason: "unauthenticated" | "invalid"` with an `errors?` field. The orchestrator's
   task message explicitly specified a different, more granular shape —
   `reason: "unauthenticated" | "validation" | "upload" | "error"` with `fieldErrors?` —
   so phase 07/13's hook can distinguish an upload failure from a generic
   insert/network failure and show a different message for each. Implemented the
   task message's shape (`CreateKudoResult`), which is a strict superset of what the
   phase file's acceptance criteria require (unauthenticated / invalid-now-called-
   validation / generic error are all still present; `"upload"` is additive). Recorded
   here since the plan file itself was not edited.
2. **`kudoId` generation**: rather than `.insert(...).select("id").single()` and
   runtime-narrowing the returned `id` (mirroring `toggle-kudo-heart.ts`'s
   `heart_count` narrowing), `createKudo` generates `kudoId = crypto.randomUUID()` in
   the action and inserts it explicitly (`kudos.id` has no non-null constraint beyond
   its `DEFAULT gen_random_uuid()`, so an explicit value is accepted). This avoids an
   extra round trip and an extra unknown-narrowing branch, matching the same
   "generate the id, don't read it back" pattern already used for image Storage
   paths in `upload-kudo-images.ts`.
3. **Upload failure vs. insert failure both need cleanup (AD-5), but only upload
   failure has `uploadKudoImages` do it internally.** An insert failure happens
   *after* a successful `uploadKudoImages` call, so `create-kudo.ts` itself calls the
   exported `removeKudoImages` helper post-insert-failure with the already-known
   `uploaded.uploadedPaths`. `removeKudoImages` is exported from
   `upload-kudo-images.ts` specifically so both call sites (internal, on a
   mid-upload failure; and `create-kudo.ts`, on a post-upload insert failure) share
   one cleanup implementation instead of two.
4. **`toKudoStorageClient` shim** (`upload-kudo-images.ts`): added a narrow
   `KudoStorageClient` type plus a `toKudoStorageClient(supabase)` adapter, mirroring
   `src/dal/sunner-search-client.ts`'s `toSunnerSearchClient` — re-issuing each
   Storage call through explicitly typed arrows rather than passing the real
   `@supabase/ssr` client straight through. Not called out in the phase file, but
   the same "keep the type comparison shallow, let the test stub a narrow surface"
   reasoning that file's own header comment gives applies identically to
   `.storage.from(bucket).upload/getPublicUrl/remove`.

No other deviations. File ownership, validation reuse (AD-8), upload-before-insert
ordering (AD-5), and the `hashtags = [title, ...chips]` assembly (BR-001) all follow
the phase file and `plan.md`/`clarifications.md` literally.
