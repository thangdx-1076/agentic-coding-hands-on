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

## Follow-up fix — `images.remotePatterns` for Supabase Storage (P0, post-review)

`next/image` (`kudos-image-strip.tsx`, F007, not touched) throws a synchronous
"Invalid src prop ... hostname ... is not configured under images" error at
**render time**, crashing `/kudos`, the moment a kudo carries a Storage image URL —
this blocked e2e C23–C26. Fixed by adding `images.remotePatterns` to `next.config.ts`,
derived from `NEXT_PUBLIC_SUPABASE_URL` at config-load time.

**Doc pointer correction**: the coordinator's pointer,
`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md`,
covers custom **image loaders** (Akamai/Cloudinary/Imgix/etc.), not `remotePatterns` — it
never mentions the field. The actual `remotePatterns` reference in this Next version's
bundled docs is `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
(§ `#remotepatterns`, lines 533–611). Relied on:
- Line 550-560 (object form): `{ protocol, hostname, port, pathname, search }`.
- Line 563: unmatched protocol/hostname/port/path → `400 Bad Request` (confirms this is a
  hard allow-list, not advisory).
- Line 589: omitting a field implies wildcard `**` for it — not used here; every field this
  fix sets is explicit.

Cross-checked the literal field types against
`node_modules/next/dist/shared/lib/image-config.d.ts:24-51` since the prose doc doesn't
state them: `protocol?: 'http' | 'https'` (literal union — `new URL(...).protocol` returns
`"http:"`/`"https:"` WITH the trailing colon, so it must be sliced and validated, not
assigned as-is), `hostname: string` (required), `port?: string` (literal port or `""` for
none — `URL.port` already returns `""` when the URL has no explicit port, so no extra
guard needed there), `pathname?: string`.

**Exact config block added** (`next.config.ts`):
```ts
type SupabaseImageRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

function supabaseImagesRemotePattern(): SupabaseImageRemotePattern | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(supabaseUrl);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") {
      return null;
    }

    return {
      protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabaseImagesPattern = supabaseImagesRemotePattern();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "28mb" }, // unchanged
  },
  images: {
    remotePatterns: supabaseImagesPattern ? [supabaseImagesPattern] : [],
  },
};
```

Derived the `SupabaseImageRemotePattern` element type from `NextConfig["images"]`
itself rather than importing `next/dist/shared/lib/image-config`'s `RemotePattern` —
keeps the file coupled to the public `NextConfig` contract, not an internal path that
can move between Next versions. `pathname` is pinned to
`/storage/v1/object/public/**` (exactly what `getPublicUrl` in
`upload-kudo-images.ts` produces), not a bare `**`, so this doesn't open every path on
the Supabase host to the image optimizer. Guarded per the coordinator's spec: a missing
env var, a `new URL()` throw, or a non-`http`/`https` protocol all return `null` →
`remotePatterns: []` → config load never throws.

**Investigated, deliberately NOT added — `images.dangerouslyAllowLocalIP`**: Next 16
also hard-blocks the image-optimizer route from fetching upstream images whose hostname
resolves to a private/loopback IP (`node_modules/next/dist/server/image-optimizer.js:921-941`,
gated by this exact flag, default `false`) — `127.0.0.1` (local Supabase) would trip
this independently of `remotePatterns`. Did not add it because
`KudosImageStrip` (`kudos-image-strip.tsx:30-36`) does not set `unoptimized` on its
`<Image>`, yet e2e C24 asserts the rendered `<img src>` **literally contains**
`/storage/v1/object/public/kudo-images/` (unencoded) — the default optimizer loader
would instead rewrite `src` to `/_next/image?url=<percent-encoded>&w=...&q=...`, which
cannot contain that literal unencoded substring. That mismatch means C24 has a second,
separate problem in a file I don't own; adding `dangerouslyAllowLocalIP` would touch
a security-relevant flag beyond the scope given ("Fix in next.config.ts only: add
images.remotePatterns...") without being confirmed necessary yet. Flagging for the
coordinator to route to whichever phase/tester owns `kudos-image-strip.tsx` or the
C24 spec — not fixed here.

## Follow-up #2 — `images.dangerouslyAllowLocalIP`, gated to loopback/private only

Coordinator decision: keep `next/image` optimization ON for Storage images (5 MiB
uploads resized to a 160px thumbnail strip; F007 already relies on `next/image`
everywhere) — no `unoptimized` switch in `kudos-image-strip.tsx`, and C24's
literal-substring assertion is being fixed on the spec/tester side instead (decode the
optimizer URL). That reopens the local-IP guard flagged in Follow-up #1: the image
optimizer route refuses to fetch an upstream image whose hostname resolves to a
private/loopback IP unless `images.dangerouslyAllowLocalIP` is `true`, independently of
`remotePatterns`.

**Key + type**, confirmed against `node_modules/next/dist/shared/lib/
image-config.d.ts:83-86`:
```ts
/** @see [Dangerously Allow Local IP](https://nextjs.org/docs/api-reference/next/image#dangerously-allow-local-ip) */
dangerouslyAllowLocalIP: boolean;
```
in `ImageConfigComplete`; since `ImageConfig = Partial<ImageConfigComplete>`
(`image-config.d.ts:108`) it is `dangerouslyAllowLocalIP?: boolean` on `NextConfig["images"]`
— exact key name, no alternate spelling in this version.

**Doc citation**, `node_modules/next/dist/docs/01-app/03-api-reference/02-components/
image.md:896-920` (`#### \`dangerouslyAllowLocalIP\``):
- Line 898: "you may want to allow optimizing images from local IP addresses on the
  same network. This is not recommended for most users because it could allow
  malicious users to access content on your internal network."
- Line 900: "By default, the value is false."
- Line 920: "Only enable once you understand the SSRF risk."

Runtime enforcement point (not in the prose doc, found by grep):
`node_modules/next/dist/server/image-optimizer.js:921-941`,
`fetchExternalImage(href, dangerouslyAllowLocalIP, ...)` — rejects with an error log
("hostname resolved to private IP... use images.dangerouslyAllowLocalIP = true to
continue") unless the flag is `true`. This is a check on the *resolved* IP, separate
from and in addition to `remotePatterns`'s hostname/pathname allow-list.

**Gating implemented, matching the coordinator's exact list** (`isLoopbackOrPrivateHostname`
in `next.config.ts`): `127.0.0.1`, `localhost`, `::1`, `10.0.0.0/8`
(`/^10\./`), `172.16.0.0/12` (`/^172\.(1[6-9]|2\d|3[01])\./`, correctly bounding the
second octet to 16–31), `192.168.0.0/16` (`/^192\.168\./`). Reuses the SAME parsed `URL`
instance already built for `remotePatterns` — no second `new URL()` call,
`resolveSupabaseImagesConfig()` now returns both fields from one parse. A public/hosted
Supabase hostname (anything not matching the list) leaves `dangerouslyAllowLocalIP:
false` — commented in the config as an explicit SSRF-surface warning, per the
coordinator's instruction. All three failure guards (missing env var, `new URL()`
throw, non-`http`/`https` protocol) now return one shared `empty` value
(`{ remotePatterns: [], dangerouslyAllowLocalIP: false }`) instead of `null`.

**File size**: 151 lines total (was 90 before this change) — still comfortably under
the 200-line cap.

### Gates
- `pnpm lint --max-warnings 0` (whole repo) — clean.
- `pnpm exec eslint next.config.ts` (scoped) — clean.
- `pnpm exec prettier --check next.config.ts` (scoped) — clean.
- Build/typecheck/commit intentionally skipped, per instruction.
