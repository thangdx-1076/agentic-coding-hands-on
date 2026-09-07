import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { buildStandardsCopy } from "./_shared/build-standards-copy";
import { StandardsClient } from "./_components/standards-client";

export const metadata: Metadata = {
  title: "Thể lệ",
};

/**
 * `/standards` public route entry point (mm:3204:6051, FR-001/FR-002,
 * clarifications.md § Session bổ sung).
 *
 * PUBLIC by design, like `/awards`: no auth guard — an anonymous visitor
 * renders the exact same markup. Unlike `/awards`, content is static i18n
 * copy only (BR-004) — no session/database read of any kind. There is no
 * I/O here that can fail, so — also unlike `/awards` — this page has no
 * fail-open branch: `getTranslations` reads a JSON bundle bundled at
 * build time, never a network call.
 */
export default async function StandardsPage() {
  const t = await getTranslations("standards");

  const copy = buildStandardsCopy(t);

  return <StandardsClient copy={copy} />;
}
