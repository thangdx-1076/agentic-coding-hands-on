import Image from "next/image";

import { KeyvisualBackground } from "../../_components/keyvisual-background";
import { SiteHeader } from "../../_components/site-header";
import { SiteFooter } from "../../_components/site-footer";
import { KudosSection } from "../../_components/kudos-section";
import type { SiteViewer } from "../../_shared/site-chrome";
import { defaultAwardsCopy, type AwardsCopy } from "../_shared/awards-copy";

import { AwardCategoryNav } from "./award-category-nav";
import { AwardSection } from "./award-section";
import { AwardsEmptyState } from "./awards-empty-state";

import type { Award } from "@/dal/awards";
import { montserrat, montserratAlternates } from "@/styles/fonts";

export type AwardsScreenProps = {
  /** Ordered by `sort_order` (`getAwards()`, `src/dal/awards.ts`). Empty ⇒ fail-open empty-state. */
  awards: Award[];
  copy?: AwardsCopy;
  locale?: "vi" | "en";
  viewer?: SiteViewer | null;
  unreadCount?: number;
  onSelectLocale?: (locale: "vi" | "en") => void;
  logoutAction?: () => void | Promise<void>;
};

/**
 * Root composition of the "Hệ thống giải" screen (mm:313:8436,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD).
 * Presentational only — phase 06's `page.tsx`/`awards-client.tsx` fetch
 * `awards` via `getAwards()` and wire `viewer`/locale/server actions; this
 * component never touches Supabase (security note in phase-05 plan).
 *
 * Document order mirrors the E2E DOM contract (`tests/e2e/awards.spec.ts`):
 * `<header>` → caption + `<h1>` → `<nav>` (only when `awards` is non-empty) →
 * 6 `<section id>` → Kudos block → `<footer>`. `KudosSection` is reused
 * as-is (same Figma component instance as the homepage's).
 */
export function AwardsScreen({
  awards,
  copy = defaultAwardsCopy,
  locale = "vi",
  viewer = null,
  unreadCount = 0,
  onSelectLocale,
  logoutAction,
}: AwardsScreenProps) {
  const languageLabel = locale === "en" ? "EN" : "VN";
  const hasAwards = awards.length > 0;
  const navItems = awards.map(({ slug, title }) => ({ slug, title }));

  return (
    // mm:313:8436
    <div
      className={`${montserrat.variable} ${montserratAlternates.variable} relative isolate flex min-h-screen w-full flex-col overflow-x-hidden bg-login-background`}
    >
      <KeyvisualBackground />
      {/* mm:313:8440 */}
      <SiteHeader
        copy={copy}
        languageLabel={languageLabel}
        viewer={viewer}
        unreadCount={unreadCount}
        onSelectLocale={onSelectLocale}
        logoutAction={logoutAction}
      />
      <main className="relative z-10 mx-auto flex w-full max-w-[1224px] flex-1 flex-col gap-20 px-6 py-16 sm:px-8 lg:px-0 lg:py-24">
        {/* mm:313:8451 */}
        <div className="mx-auto flex w-full max-w-[1152px] justify-start">
          {/* mm:2789:12915 — reuses the same asset as the Homepage hero
              (`(home)/_components/hero-section.tsx:49`); intrinsic 338×150
              (aspect 169/75) kept as the `width`/`height` attrs so Next
              doesn't warn "width or height modified, but not the other",
              while the className scales the rendered size down for narrow
              viewports. Decorative — the accessible heading is the `<h1>`
              in the title block below it. */}
          <Image
            src="/home/Root_Further_Logo.png"
            alt=""
            aria-hidden="true"
            width={338}
            height={150}
            className="h-auto w-[169px] sm:w-[254px] lg:w-[338px]"
          />
        </div>
        {/* mm:313:8453 */}
        <div className="mx-auto flex w-full max-w-[1152px] flex-col items-center gap-4 text-center">
          {/* mm:313:8454 */}
          <p className="font-montserrat text-2xl leading-8 font-bold text-white">
            {copy.caption}
          </p>
          {/* mm:313:8455 */}
          <div className="h-px w-full bg-login-divider" />
          {/* mm:313:8457 */}
          <h1 className="font-montserrat text-3xl leading-9 font-bold tracking-[-0.25px] text-login-button sm:text-5xl sm:leading-[56px] lg:text-[57px] lg:leading-[64px]">
            {copy.heading}
          </h1>
        </div>

        {/* mm:313:8458 */}
        {hasAwards ? (
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
            <AwardCategoryNav items={navItems} ariaLabel={copy.navAriaLabel} />
            {/* mm:313:8466 */}
            <div className="flex w-full flex-col divide-y divide-login-divider">
              {awards.map((award, index) => (
                <AwardSection
                  key={award.slug}
                  award={award}
                  reversed={index % 2 === 1}
                  copy={copy}
                />
              ))}
            </div>
          </div>
        ) : (
          <AwardsEmptyState message={copy.empty} />
        )}

        <KudosSection copy={copy} />
      </main>
      <SiteFooter copy={copy} />
    </div>
  );
}
