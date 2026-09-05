import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Framework is declared explicitly rather than left to `storybook init`'s
 * auto-detect: for a Turbopack-first Next 16 App Router project with no custom
 * webpack config, which framework the scaffolder picks was not verifiable, and
 * guessing wrong means a silent rebuild on the other bundler.
 *
 * `@storybook/nextjs-vite` (not the webpack `@storybook/nextjs`): this repo has
 * no custom webpack config to preserve, and the Vite variant is the one with
 * real-world Next 16 confirmation. It handles `next/image` and
 * `next/font/google` with no configuration, which matters here — the login
 * tree uses both.
 */
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
    "../app/**/*.stories.@(ts|tsx)",
  ],
  // Registering the addon here is what starts the MSW service worker — see the
  // note in preview.tsx about `initialize()` not existing in v3.
  addons: ["msw-storybook-addon"],
  // Next.js serves `public/` automatically at runtime; Storybook does NOT.
  // Without this, `/login/keyvisual.png`, the logos and `mockServiceWorker.js`
  // all 404 inside stories.
  staticDirs: ["../public"],
};

export default config;
