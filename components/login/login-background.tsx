/**
 * Full-bleed hero image + gradient overlays behind the header/content
 * (mm:662:14388, mm:662:14392, mm:662:14390). Purely decorative.
 *
 * Node 662:14389's bitmap could not be fetched from MoMorph (Figma API
 * 500). Renders against the #00101A base + the two literal gradients until
 * the design exports `public/login/keyvisual.png` (see clarifications.md).
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
        <div
          className="absolute inset-0"
          style={{
            background:
              "url(/login/keyvisual.png) -440px -217.975px / 159.763% 133.371% no-repeat",
          }}
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
