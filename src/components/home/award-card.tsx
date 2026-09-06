import Image from "next/image";

import { IconUpRight } from "./icons/icon-up-right";
import type { AwardItem } from "./home-copy";

/**
 * Per-slug decorative name graphic (asset-only, not in `home-copy.ts` — see
 * plan.md § Assets). Small watermark-style overlay stamped on top of the
 * shared `Award_BG.png` ring; `aria-hidden` because the real accessible
 * title is the visible `<h3>` rendered below it. Each graphic's own
 * `width`/`height` come from its real intrinsic size (`momorph/media-nodes.json`
 * `MM_MEDIA_*` entries) — they differ per name (e.g. MVP is 116×52, Top
 * Project Leader is 232×64) — passing one shared 221×35 pair for all of
 * them mismatched the real file's aspect ratio and triggered Next.js'
 * "width or height modified, but not the other" console warning.
 */
const AWARD_NAME_GRAPHIC: Record<
  string,
  { src: string; width: number; height: number }
> = {
  "top-talent": { src: "/home/Top_Talent.png", width: 222, height: 36 },
  "top-project": { src: "/home/Top_Project.png", width: 232, height: 35 },
  "top-project-leader": {
    src: "/home/Top_Project_Leader.png",
    width: 232,
    height: 64,
  },
  "best-manager": { src: "/home/Best_Manager.png", width: 232, height: 30 },
  "signature-2025-creator": {
    src: "/home/Signature_2025_Creator.png",
    width: 232,
    height: 54,
  },
  mvp: { src: "/home/MVP.png", width: 116, height: 52 },
};

export type AwardCardProps = {
  item: AwardItem;
  detailLabel: string;
};

/**
 * One tile in the 6-card award grid (mm:2167:9075 "mms_C2.1_Top Talent
 * Award" — cards `2167:9076..9081` share this exact template, only content
 * + the per-slug name graphic differ, see `get_node` cross-check in the
 * task brief). Per clarifications.md § Route & điều hướng, card slugs link
 * to `/awards#<slug>`.
 *
 * Thumbnail + title share ONE `<a>` (E2E contract requires image+title in
 * the same anchor); "Chi tiết" is a SEPARATE anchor with a distinct
 * `aria-label` per card (`"<detailLabel> <title>"`) — 6 identical "Chi
 * tiết" links would collide under strict-mode/a11y tooling.
 *
 * Colors below are read from the file's `Color` variable collection
 * (`--Details-Text-Primary-1 #FFEA9E` gold, `--Details-Text-Secondary-1
 * #FFFFFF` white, `--Details-Text-Secondary-2 #999999` gray) rather than
 * the raw per-node `get_node` fill, because MoMorph's style extraction
 * returns an unreliable flat default for TEXT nodes nested this deep
 * inside a component instance (title/description both echoed
 * `backgroundColor: rgba(255,255,255,1)` — contradicted by
 * `data/preview.png`, which clearly renders the title white and the
 * description muted gray). Border/shadow/radius on the picture wrapper
 * come straight from `get_node` on `I2167:9075;214:1019` /
 * `I2167:9075;214:1019;81:2442` (code-rules 2b — wrapper radius matches
 * the `Award_BG.png` asset's own 24px radius).
 */
export function AwardCard({ item, detailLabel }: AwardCardProps) {
  const href = `/awards#${item.slug}`;
  const nameGraphic = AWARD_NAME_GRAPHIC[item.slug];

  return (
    // mm:2167:9075
    <article className="flex flex-col items-start gap-1">
      <a
        href={href}
        className="group flex w-full flex-col items-start gap-6 rounded-2xl transition-transform duration-200 ease-out motion-reduce:transition-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
      >
        {/* mm:I2167:9075;214:1019 */}
        <div className="relative aspect-square w-full mix-blend-screen overflow-hidden rounded-3xl border border-[#FFEA9E] shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] transition-shadow duration-200 group-hover:shadow-[0_4px_10px_rgba(0,0,0,0.35),0_0_16px_#FAE287]">
          {/* mm:I2167:9075;214:1019;81:2442 */}
          <Image
            src={item.image}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 336px, 50vw"
            className="object-cover"
          />
          {/* mm:I2167:9075;214:1019;214:666;10:951 */}
          {nameGraphic ? (
            // Sized wrapper + `fill`: the intrinsic ratio comes from the
            // per-slug PNG dimensions, so the graphic scales with the card at
            // 65% width without `width`/`height` attributes — which is what
            // kept tripping Next's dev-only "width or height modified" check
            // whenever a scaled height rounded back to the intrinsic value.
            <div
              className="absolute top-1/2 left-1/2 w-[65%] -translate-x-1/2 -translate-y-1/2"
              style={{
                aspectRatio: `${nameGraphic.width} / ${nameGraphic.height}`,
              }}
            >
              <Image
                src={nameGraphic.src}
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 1024px) 220px, 33vw"
                className="object-contain"
              />
            </div>
          ) : null}
        </div>
        {/* mm:I2167:9075;214:1021 */}
        <h3 className="font-montserrat text-2xl leading-8 font-normal text-white">
          {item.title}
        </h3>
      </a>
      {/* mm:I2167:9075;214:1022 */}
      <p className="font-montserrat line-clamp-2 text-base leading-6 tracking-[0.5px] text-[#999999]">
        {item.description}
      </p>
      {/* mm:I2167:9075;214:1023 */}
      <a
        href={href}
        aria-label={`${detailLabel} ${item.title}`}
        className="mt-3 inline-flex items-center gap-1 rounded py-4 font-montserrat text-base leading-6 font-medium tracking-[0.15px] text-[#FFEA9E] transition-colors duration-200 ease-out motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background"
      >
        {detailLabel}
        <IconUpRight aria-hidden="true" />
      </a>
    </article>
  );
}
