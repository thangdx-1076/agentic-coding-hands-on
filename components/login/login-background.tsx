import Image from "next/image";

/**
 * Full-bleed hero image + gradient overlays behind the header/content
 * (mm:662:14388, mm:662:14392, mm:662:14390). Purely decorative.
 *
 * `public/login/keyvisual.png` is the 2× export of the Figma node
 * 662:14389 (1441×1022 → 2882×2044): the Figma crop/offset is already
 * baked into the bitmap, so it is drawn at 100% of the frame with
 * `object-cover`. next/image serves it optimized (WebP/AVIF, responsive
 * sizes) instead of the 9 MB source.
 */
export function LoginBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-login-background"
    >
      {/* mm:662:14388 */}
      <div className="absolute inset-0">
        {/* mm:662:14389 */}
        <Image
          src="/login/keyvisual.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      {/* mm:662:14392 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #00101A 0%, #00101A 25.41%, rgba(0, 16, 26, 0) 100%)",
        }}
      />
      {/* mm:662:14390 */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(0deg, #00101A 22.48%, rgba(0, 19, 32, 0) 51.74%)",
        }}
      />
    </div>
  );
}
