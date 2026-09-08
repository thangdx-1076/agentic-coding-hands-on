import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Server Actions default to a 1MB request body (Next 16.3.4 bundled docs,
 * `node_modules/next/dist/docs/01-app/03-api-reference/05-config/
 * 01-next-config-js/serverActions.md`), which every "Viết Kudo" submit
 * carrying attachments would exceed. `createKudo`
 * (`src/app/(public)/kudos/_actions/create-kudo.ts`) caps each image at 5
 * MiB (`MAX_KUDO_IMAGE_BYTES`, phase 04's `validate-kudo-images.ts`) on
 * both client and server, so 5 files tops out at ~26.2MB of raw file
 * bytes; `28mb` leaves headroom for the `multipart/form-data` boundary and
 * field-metadata overhead the docs call out (they suggest 10-20KB, this
 * leaves far more). This is a ceiling, not a target — it does not by
 * itself validate anything.
 */

/**
 * Element type of `images.remotePatterns` for THIS Next version, derived
 * from `NextConfig` itself rather than importing an internal
 * `next/dist/shared/lib/image-config` type — keeps this file coupled to
 * the public `NextConfig` contract, not an implementation path that can
 * move between versions.
 */
type SupabaseImageRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

/**
 * `next/image` throws a synchronous "Invalid src prop ... hostname ... is
 * not configured under images" error at RENDER time for any `src` whose
 * origin isn't listed in `images.remotePatterns` — this is what crashed
 * `/kudos` the moment a kudo carried a Supabase Storage image URL
 * (`kudos-image-strip.tsx`, F007 — not owned/edited here). Optimization
 * stays ON for these images on purpose (uploads up to 5 MiB, resized down
 * to a 160px thumbnail strip; F007 already relies on `next/image` for
 * every other image) — this is NOT a switch to `unoptimized`.
 *
 * Both `remotePatterns` and `dangerouslyAllowLocalIP` below are derived
 * from `NEXT_PUBLIC_SUPABASE_URL` (the same env var
 * `src/lib/supabase/server.ts`/`client.ts` already read) instead of a
 * hardcoded host, so local (`http://127.0.0.1:55321`) and a hosted
 * Supabase project both work without a second edit to this file.
 */

/** Loopback/private ranges the LOCAL Supabase instance (dev/CI) can bind
 * to: `127.0.0.1`, `localhost`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`,
 * `192.168.0.0/16` — exactly the set the coordinator asked for, no wider.
 * A hostname NOT matching any of these is treated as a public/hosted
 * Supabase project. */
function isLoopbackOrPrivateHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return true;
  }
  if (/^10\./.test(hostname)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return true;
  }
  return /^192\.168\./.test(hostname);
}

type SupabaseImagesConfig = {
  remotePatterns: SupabaseImageRemotePattern[];
  dangerouslyAllowLocalIP: boolean;
};

/**
 * `remotePatterns`: `pathname` is scoped to the one path `getPublicUrl`
 * ever produces (`upload-kudo-images.ts`) — `/storage/v1/object/public/**`
 * — not a bare `**`, so this does not open every possible path on that
 * host.
 *
 * `dangerouslyAllowLocalIP` (`node_modules/next/dist/shared/lib/
 * image-config.d.ts:86`, `dangerouslyAllowLocalIP: boolean`, default
 * `false` per `node_modules/next/dist/docs/01-app/03-api-reference/
 * 02-components/image.md:896-920` — "this could allow malicious users to
 * access content on your internal network... Only enable once you
 * understand the SSRF risk"): the image OPTIMIZER route independently
 * refuses to fetch upstream images whose hostname resolves to a private/
 * loopback IP unless this is `true`, regardless of `remotePatterns`
 * (`node_modules/next/dist/server/image-optimizer.js:921-941`). Set to
 * `true` ONLY when the parsed hostname is loopback/private (the local
 * Supabase instance) — a public/hosted Supabase hostname leaves this
 * `false`, because enabling it there would let the image optimizer be
 * used as an SSRF proxy against whatever that public host's DNS actually
 * resolves to.
 *
 * Guarded end to end: a missing or unparseable env var, or a scheme other
 * than the `'http' | 'https'` literal union `RemotePattern.protocol`
 * accepts (`image-config.d.ts:24-34`), returns the all-`false`/empty
 * default instead of throwing — `next.config.ts` must never crash config
 * load over a bad/missing env var; the app already fails loudly elsewhere
 * (Supabase client construction) when that happens.
 */
function resolveSupabaseImagesConfig(): SupabaseImagesConfig {
  const empty: SupabaseImagesConfig = {
    remotePatterns: [],
    dangerouslyAllowLocalIP: false,
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return empty;
  }

  try {
    const url = new URL(supabaseUrl);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") {
      return empty;
    }

    return {
      remotePatterns: [
        {
          protocol,
          hostname: url.hostname,
          port: url.port,
          pathname: "/storage/v1/object/public/**",
        },
      ],
      dangerouslyAllowLocalIP: isLoopbackOrPrivateHostname(url.hostname),
    };
  } catch {
    return empty;
  }
}

const supabaseImagesConfig = resolveSupabaseImagesConfig();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "28mb",
    },
  },
  images: {
    remotePatterns: supabaseImagesConfig.remotePatterns,
    dangerouslyAllowLocalIP: supabaseImagesConfig.dangerouslyAllowLocalIP,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
