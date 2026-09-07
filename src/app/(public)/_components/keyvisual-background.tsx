import Image from "next/image";

/**
 * Full-bleed hero background: the keyvisual photo (mm:2167:9027
 * mms_3.5_Keyvisual / mm:2167:9028, Figma 1512×1392) plus the dark
 * readability gradient scrim on top of it (mm:2167:9029 Cover, Figma
 * 1512×1480 — 88px taller than the photo so the scrim fades smoothly into
 * the page's own `bg-login-background` just past the photo's bottom edge).
 * Purely decorative (`alt=""`) — the accessible page content is
 * `HeroSection`'s `<h1>` logo, rendered above this layer by the page
 * composition, which places both as siblings pinned to the top of the page.
 *
 * `HomeScreen`'s root MUST carry `isolate` (new stacking context) for this
 * component's `-z-10` layer to resolve correctly: `position: relative` with
 * `z-index: auto` does NOT create a stacking context, so without `isolate`
 * this negative-z-index band escapes to the nearest ancestor context and
 * paints BEHIND the root's own opaque `bg-login-background` instead of
 * above it (bug found live: image loaded, `naturalWidth` 1134, but
 * invisible).
 */
export function KeyvisualBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10"
    >
      {/* mm:2167:9027 */}
      <div className="relative aspect-[1512/1392] w-full overflow-hidden">
        {/* mm:2167:9028 */}
        <Image
          src="/home/Keyvisual_BG.png"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>
      {/* mm:2167:9029 */}
      <div
        className="absolute inset-x-0 top-0 aspect-[1512/1480]"
        style={{
          background:
            "linear-gradient(12deg, #00101A 23.7%, rgba(0, 18, 29, 0.46) 38.34%, rgba(0, 19, 32, 0.00) 48.92%)",
        }}
      />
    </div>
  );
}
