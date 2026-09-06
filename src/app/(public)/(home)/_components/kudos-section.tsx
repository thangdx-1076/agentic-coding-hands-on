import Image from "next/image";

import { defaultHomeCopy, type HomeCopy } from "../_shared/home-copy";

import { IconUpRight } from "./icons/icon-up-right";

export type KudosSectionProps = {
  copy?: HomeCopy;
};

/**
 * "Sun* Kudos" promo section (mm:3390:10349 `mms_D1_Sunkudos`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM).
 * Full-bleed `Kudos_Background.png` behind a content block; the "Sun* Kudos"
 * `<h2>` here is the ONE heading named that way on the whole page (award
 * cards use a different "Chi tiết <title>" aria-label, see clarifications.md
 * § Route & điều hướng, so the two never collide).
 */
export function KudosSection({ copy = defaultHomeCopy }: KudosSectionProps) {
  const { kudos } = copy;

  return (
    /* mm:3390:10349 */
    <section className="mx-auto w-full max-w-[1120px]">
      {/* mm:I3390:10349;313:8415 */}
      <div className="relative aspect-[1120/500] w-full overflow-hidden rounded-2xl bg-[#0F0F0F]">
        {/* mm:I3390:10349;313:8416 */}
        <Image
          src="/home/Kudos_Background.png"
          alt=""
          fill
          sizes="(min-width: 1120px) 1120px, 100vw"
          className="object-cover"
        />

        {/* mm:I3390:10349;313:8419 */}
        <div className="relative flex h-full w-full max-w-[457px] flex-col justify-center gap-8 p-8 sm:p-12">
          {/* mm:I3390:10349;313:8420 */}
          <div className="flex flex-col gap-4">
            {/* mm:I3390:10349;313:8421 */}
            <p className="font-montserrat text-2xl leading-8 font-bold text-white">
              {kudos.label}
            </p>
            {/* mm:I3390:10349;313:8422 */}
            <h2 className="font-montserrat text-[57px] leading-[64px] font-bold tracking-[-0.25px] text-login-button">
              {kudos.heading}
            </h2>
            {/* mm:I3390:10349;313:8423 */}
            <p className="font-montserrat max-w-[457px] text-justify text-base leading-6 font-bold tracking-[0.5px] whitespace-pre-line text-white">
              {kudos.description}
            </p>
          </div>

          {/* mm:I3390:10349;313:8424 */}
          <div>
            {/* mm:I3390:10349;313:8426 */}
            <a
              href="/kudos"
              aria-label={`Chi tiết ${kudos.heading}`}
              className="inline-flex items-center gap-2 rounded bg-login-button p-4 text-login-button-text transition-colors duration-200 ease-out hover:bg-login-button/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
            >
              {/* mm:I3390:10349;313:8426;186:1935 */}
              {/* mm:I3390:10349;313:8426;186:1568 */}
              <span className="font-montserrat text-base leading-6 font-bold tracking-[0.15px]">
                {kudos.detailLabel}
              </span>
              {/* mm:I3390:10349;313:8426;186:1766 */}
              <IconUpRight className="h-6 w-6 shrink-0" />
            </a>
          </div>
        </div>

        {/* mm:I3390:10349;329:2948 */}
        <Image
          src="/home/Logo_Kudos.svg"
          alt=""
          width={364}
          height={74}
          unoptimized
          className="pointer-events-none absolute right-6 bottom-6 hidden h-auto w-40 sm:block lg:w-auto"
        />
      </div>
    </section>
  );
}
