import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { resolveImagesRemoteConfig } from "./src/configs/image-remote-patterns";

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
 * Image `remotePatterns`/`dangerouslyAllowLocalIP` live in
 * `src/configs/image-remote-patterns.ts` — every remote origin the app
 * hands to `next/image` (Supabase Storage objects AND the Google OAuth
 * avatar CDN), with the SSRF reasoning behind the local-IP flag. They sit
 * there rather than inline here so `image-remote-patterns.test.ts` can
 * assert them against Next's own `hasRemoteMatch` matcher; nothing can
 * unit-test a config file Next alone loads. Add a new remote image origin
 * THERE, not here.
 */
const imagesRemoteConfig = resolveImagesRemoteConfig();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "28mb",
    },
  },
  images: {
    remotePatterns: imagesRemoteConfig.remotePatterns,
    dangerouslyAllowLocalIP: imagesRemoteConfig.dangerouslyAllowLocalIP,
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
