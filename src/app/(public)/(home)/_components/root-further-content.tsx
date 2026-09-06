import Image from "next/image";

import type { HomeCopy } from "../_shared/home-copy";

export type RootFurtherContentProps = {
  copy: HomeCopy;
};

/**
 * "Root Further" copy section (mm:3204:10152 "Frame 486"). The giant
 * ghosted "ROOT"/"FURTHER" watermark (mm:3204:10153 "Group 434") is a
 * decorative background layer that bleeds above the section's own top
 * edge in the design (`get_node_context` on `3204:10153`: absolute
 * position starts 18px above `Frame 486`'s own top, horizontally centered
 * — `(1152 - 290) / 2 === 431`, matching the measured offset exactly), so
 * it's rendered `absolute`/`aria-hidden` ahead of the real text.
 *
 * `<h2 className="sr-only">` carries the section's accessible name — NOT
 * an `<h1>`, the page's only `<h1>` is the hero logo owned by another
 * section. The 3 paragraphs are `copy.rootFurther.paragraphs[0..2]`
 * (main description / English proverb quote / second description);
 * `whitespace-pre-line` preserves each paragraph's internal `\n` breaks.
 * Font metrics + white text color come from `get_node` on `3204:10156`,
 * `3204:10161`, `3204:10162` (white on the page's dark `#00101A`
 * background per `--Details-Text-Secondary-1` in the file's `Color`
 * variable collection).
 */
export function RootFurtherContent({ copy }: RootFurtherContentProps) {
  return (
    // mm:3204:10152
    <section className="relative mx-auto flex w-full max-w-[1152px] flex-col items-center gap-8 px-6 py-10 sm:px-8 sm:py-14 lg:px-0 lg:py-[120px]">
      {/* mm:3204:10153 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-18px] left-1/2 h-[134px] w-[290px] -translate-x-1/2 select-none"
      >
        {/* mm:3204:10155 */}
        <Image
          src="/home/Root_Text.png"
          alt=""
          width={189}
          height={67}
          className="absolute top-0 left-[51px] h-auto w-[189px] object-contain"
        />
        {/* mm:3204:10154 */}
        <Image
          src="/home/Further_Text.png"
          alt=""
          width={290}
          height={67}
          className="absolute top-[67px] left-0 h-auto w-full object-contain"
        />
      </div>
      {/* mm:5001:14827 */}
      <div className="relative flex w-full flex-col gap-8">
        {/* Visually-hidden accessible heading for this section. */}
        <h2 className="sr-only">{copy.rootFurther.heading}</h2>
        {/* mm:3204:10156 */}
        <p className="font-montserrat text-2xl leading-8 font-bold whitespace-pre-line text-justify text-white">
          {copy.rootFurther.paragraphs[0]}
        </p>
        {/* mm:3204:10161 */}
        <p className="font-montserrat text-xl leading-8 font-bold whitespace-pre-line text-center text-white">
          {copy.rootFurther.paragraphs[1]}
        </p>
        {/* mm:3204:10162 */}
        <p className="font-montserrat text-2xl leading-8 font-bold whitespace-pre-line text-justify text-white">
          {copy.rootFurther.paragraphs[2]}
        </p>
      </div>
    </section>
  );
}
