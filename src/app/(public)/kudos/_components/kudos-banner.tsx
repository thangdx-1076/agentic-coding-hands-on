export type KudosBannerProps = {
  title: string;
  logoAlt: string;
};

/**
 * KV banner (mm:2940:13437 `mms_A_KV Kudos`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 * Readonly per spec A — no interactive children.
 *
 * `MM_MEDIA_KV Background` (`I2940:13432;2167:5141`, real export
 * `kv-background.png`, Figma's own `aspect-ratio: 45/16` reused verbatim
 * below) is a shared full-bleed backdrop that in the design sits BEHIND both
 * this banner and the separate compose pill (A.1, `kudos-compose-pill.tsx`)
 * — but file ownership splits those into two leaf components, so each only
 * renders its own slice. C02 requires exactly ONE `<img>` inside
 * `[data-testid=kudos-banner]` (the logo) — the KV artwork MUST be a CSS
 * background, never an `<img>`/`next/image`, unlike every other full-bleed
 * background in this repo (`KeyvisualBackground`, `KudosSection`), which is
 * why this component deliberately does not follow that `next/image fill`
 * precedent.
 *
 * Content (title + logo) is vertically centered in the artwork band —
 * the source frame's own absolute Y offset is relative to a Figma mock
 * header this repo doesn't share, so centering is the most faithful choice
 * derivable without guessing a pixel offset.
 */
export function KudosBanner({ title, logoAlt }: KudosBannerProps) {
  return (
    // mm:2940:13437
    <section
      data-testid="kudos-banner"
      className="relative flex aspect-[45/16] w-full items-center bg-cover bg-center"
      style={{ backgroundImage: "url(/kudos/kv-background.png)" }}
    >
      <div className="flex w-full flex-col gap-2.5 px-6 sm:px-12 lg:px-36">
        {/* mm:2940:13439 */}
        <h1 className="font-montserrat text-[36px] leading-[44px] font-bold text-login-button">
          {title}
        </h1>
        {/* mm:2940:13440 MM_MEDIA_Kudos logo — single asset, do not recurse
            into the Figma group's internal text/mark layers (code-rules §2).
            Plain `<img>` on purpose: `next.config.ts` has no
            `images.dangerouslyAllowSVG` entry (not owned by this phase), so
            `next/image` would reject this `.svg` source. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kudos/kudos-logo.svg"
          alt={logoAlt}
          width={593}
          height={106}
          className="h-auto w-full max-w-[593px]"
        />
      </div>
    </section>
  );
}
