import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { mswLoader } from "msw-storybook-addon/csf3";

import { handlers } from "../src/mocks/handlers";
import viMessages from "../messages/vi.json";
import "../src/styles/globals.css";

/**
 * MSW wiring, verified against the INSTALLED msw-storybook-addon@3.0.0 rather
 * than its docs — the two disagree. In v3.0.0 the export map is:
 *   "."        -> default export only (the addon, registered in main.ts)
 *   "./csf3"   -> `mswLoader` ONLY
 *   "./preview"-> `createPreviewAnnotations` (the newer CSF-Next style)
 *
 * There is no `initialize()` anywhere in the package — older snippets that
 * import one do not compile against v3. Worker startup is folded into
 * `mswLoader`, which is a FACTORY, not a loader: its type is
 * `(setup?: SetupFunction) => LoaderFunction`. So it must be CALLED here.
 * Passing the bare function instead is a type error (TS2322), which is how
 * this was caught.
 *
 * Handlers are set globally here so every story shares ONE mock definition
 * (`mocks/handlers.ts`, the same module vitest reads). A story that needs a
 * different response overrides just that endpoint via its own
 * `parameters.msw.handlers` — it should never re-declare the whole set.
 */
const preview: Preview = {
  loaders: [mswLoader()],
  parameters: {
    msw: { handlers },
    nextjs: { appDirectory: true },
  },
  decorators: [
    // next-intl has no framework-level support in Storybook: components calling
    // `useTranslations` throw without a provider above them. `vi` matches the
    // app's own DEFAULT_LOCALE, so stories render the same copy the app does.
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
