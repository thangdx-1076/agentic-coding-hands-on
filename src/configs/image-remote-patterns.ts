import type { NextConfig } from "next";

/**
 * `images.remotePatterns` resolution for `next.config.ts`.
 *
 * `next/image` throws a synchronous "Invalid src prop ... hostname ... is
 * not configured under images" error at RENDER time for any `src` whose
 * origin isn't listed in `images.remotePatterns` — a data-driven crash of
 * the whole page, not a broken-image placeholder. Every remote origin the
 * app can ever hand to `next/image` must therefore be enumerated here.
 *
 * Extracted out of `next.config.ts` so this list is unit-testable: the
 * config file itself is loaded by Next, never by vitest, so nothing could
 * assert on it in place. `image-remote-patterns.test.ts` checks each
 * pattern with Next's own `hasRemoteMatch` matcher.
 *
 * The app has exactly TWO remote image origins:
 *  1. Supabase Storage public objects (kudo attachments) — host derived
 *     from `NEXT_PUBLIC_SUPABASE_URL`, see `resolveImagesRemoteConfig`.
 *  2. The OAuth provider's avatar CDN — see `OAUTH_AVATAR_PATTERNS`.
 */

/**
 * Element type of `images.remotePatterns` for THIS Next version, derived
 * from `NextConfig` itself rather than importing an internal
 * `next/dist/shared/lib/image-config` type — keeps this module coupled to
 * the public `NextConfig` contract, not an implementation path that can
 * move between versions.
 */
export type ImageRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

export type ImagesRemoteConfig = {
  remotePatterns: ImageRemotePattern[];
  dangerouslyAllowLocalIP: boolean;
};

/**
 * Google's avatar CDN. `public.users.avatar_url` is written verbatim from
 * the Google identity's `raw_user_meta_data ->> 'avatar_url'` by
 * `supabase/migrations/0002_handle_new_user_trigger.sql`, and Google
 * serves those from `lh3.googleusercontent.com`. Every avatar render site
 * reads that column — `kudos-sunner-options.tsx` (Sunner search results),
 * `kudos-card-person.tsx` (card sender/receiver), `kudos-leaderboard.tsx`
 * (via `build-gift-recipient-items.ts`) and `profile-hero.tsx` — so
 * without this entry the FIRST kudo or search hit belonging to a real
 * Google account crashes the page it renders on.
 *
 * Google is the only provider `signInWithOAuth` is ever called with
 * (`src/api/auth.ts`, `provider: "google"`), and nothing in `src/` issues
 * an `avatar_url` UPDATE — so this list covers every URL the app itself
 * can produce. Adding a second OAuth provider MUST add its avatar host
 * here in the same commit.
 *
 * It is NOT a guarantee about the column's contents. `0001_users_table.sql`
 * grants `UPDATE (avatar_url)` on the own row to `authenticated`, so a
 * Sunner can PATCH an arbitrary string in through PostgREST with no app
 * code involved, and a viewer of that row would then hit this same
 * render-time throw. Widening the allowlist is the wrong answer to that
 * (it is what keeps the image optimizer from fetching arbitrary hosts);
 * the shapes that would actually contain it are a DB `CHECK` on the
 * column or an `error.tsx` boundary on the affected routes — neither
 * exists yet, and both are deliberately out of this fix's scope.
 *
 * Two `pathname`s, not a bare `**`: Google issues avatars under `/a/`
 * (current) and `/a-/` (legacy, still live on older accounts). Scoping to
 * those two keeps every other `lh3.googleusercontent.com` path — Photos,
 * Drive thumbnails, arbitrary user content — out of our image optimizer.
 *
 * `search` is deliberately left unset (any query string allowed): the
 * size suffix Google appends (`=s96-c`) is part of the PATH, but its URLs
 * have carried query parameters across revisions and a `search: ""` here
 * would turn a future one back into a render-time crash.
 */
export const OAUTH_AVATAR_PATTERNS: ImageRemotePattern[] = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/a/**",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/a-/**",
  },
];

/** Loopback/private ranges the LOCAL Supabase instance (dev/CI) can bind
 * to: `127.0.0.1`, `localhost`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`,
 * `192.168.0.0/16`. A hostname NOT matching any of these is treated as a
 * public/hosted Supabase project.
 *
 * Brackets are stripped first because `URL.hostname` keeps them on an
 * IPv6 literal — `new URL("http://[::1]:55321").hostname` is `"[::1]"`,
 * so a bare `=== "::1"` comparison silently never matches and the local
 * instance gets treated as a public host. */
function isLoopbackOrPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  if (/^10\./.test(host)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return true;
  }
  return /^192\.168\./.test(host);
}

/**
 * Supabase Storage pattern + its `dangerouslyAllowLocalIP` verdict, or
 * `null` when `NEXT_PUBLIC_SUPABASE_URL` is missing/unparseable/served
 * over a scheme `RemotePattern.protocol`'s `'http' | 'https'` union does
 * not accept. Guarded end to end because `next.config.ts` must never
 * crash config load over a bad env var — the app already fails loudly
 * elsewhere (Supabase client construction) when that happens.
 *
 * `pathname` is scoped to the one path `getPublicUrl` ever produces
 * (`upload-kudo-images.ts`) — `/storage/v1/object/public/**` — not a bare
 * `**`, so this does not open every possible path on that host.
 */
function resolveSupabasePattern(supabaseUrl: string | undefined): {
  pattern: ImageRemotePattern;
  isLocal: boolean;
} | null {
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
      pattern: {
        protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/**",
      },
      isLocal: isLoopbackOrPrivateHostname(url.hostname),
    };
  } catch {
    return null;
  }
}

/**
 * `dangerouslyAllowLocalIP` (`node_modules/next/dist/shared/lib/
 * image-config.d.ts:86`, default `false` per `node_modules/next/dist/
 * docs/01-app/03-api-reference/02-components/image.md:896-920` — "this
 * could allow malicious users to access content on your internal
 * network... Only enable once you understand the SSRF risk"): the image
 * OPTIMIZER route independently refuses to fetch upstream images whose
 * hostname resolves to a private/loopback IP unless this is `true`,
 * regardless of `remotePatterns` (`node_modules/next/dist/server/
 * image-optimizer.js:921-941`). It is `true` ONLY when the parsed
 * Supabase hostname is loopback/private (the local instance) — a
 * public/hosted Supabase hostname leaves it `false`, because enabling it
 * there would let the image optimizer be used as an SSRF proxy against
 * whatever that host's DNS actually resolves to. The OAuth avatar
 * patterns never influence this flag: their host is public by definition.
 *
 * Avatar patterns are unconditional — a missing/broken
 * `NEXT_PUBLIC_SUPABASE_URL` must not also take avatars down.
 */
export function resolveImagesRemoteConfig(
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): ImagesRemoteConfig {
  const supabase = resolveSupabasePattern(supabaseUrl);

  return {
    remotePatterns: [
      ...(supabase ? [supabase.pattern] : []),
      ...OAUTH_AVATAR_PATTERNS,
    ],
    dangerouslyAllowLocalIP: supabase?.isLocal ?? false,
  };
}
