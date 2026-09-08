import type { KudosPageCopy } from "../_shared/build-kudos-copy";

import { KudosBanner } from "./kudos-banner";
import { KudosComposeLauncher } from "./kudos-compose-launcher";
import { KudosHeroSearchPill } from "./kudos-hero-search-pill";

export type KudosKeyvisualBandProps = {
  copy: Pick<
    KudosPageCopy,
    "banner" | "compose" | "heroSearch" | "composeModal"
  >;
  isSignedIn: boolean;
  hashtagVocabulary: string[];
};

/**
 * Banner + compose pill + hero-search pill, extracted out of
 * `kudos-screen.tsx` (AD-7) so that file has room for the compose launcher
 * without crossing the 200-line cap. Carries over that file's own overlay
 * comment verbatim: `mm:2940:13448 "Button chuc nang"` is a 1440×72 row at
 * y 408–480, i.e. INSIDE the 512-tall keyvisual band (mm:2940:13432), not
 * below it — overlaying it here rather than leaving it in normal flow is
 * what puts both pills on the artwork the way the frame draws them.
 *
 * DOM order stays banner → pills → highlight (F007's C10), unchanged by
 * this extraction — `kudos-screen.tsx` renders this component in exactly
 * the same position the inline `<div className="relative w-full">` block
 * used to occupy.
 */
export function KudosKeyvisualBand({
  copy,
  isSignedIn,
  hashtagVocabulary,
}: KudosKeyvisualBandProps) {
  return (
    <div className="relative w-full">
      <KudosBanner title={copy.banner.title} logoAlt={copy.banner.logoAlt} />
      <div className="absolute inset-x-0 bottom-[6.25%] flex w-full flex-col items-stretch gap-8 px-6 sm:px-12 lg:flex-row lg:items-center lg:px-36">
        <KudosComposeLauncher
          copy={copy.composeModal}
          pillPlaceholder={copy.compose.placeholder}
          pillAriaLabel={copy.compose.ariaLabel}
          isSignedIn={isSignedIn}
          hashtagVocabulary={hashtagVocabulary}
        />
        <KudosHeroSearchPill
          placeholder={copy.heroSearch.placeholder}
          ariaLabel={copy.heroSearch.ariaLabel}
        />
      </div>
    </div>
  );
}
