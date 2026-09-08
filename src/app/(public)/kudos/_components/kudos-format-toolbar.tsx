import type { SVGProps } from "react";

import { ROUTES } from "@/constants/routes";

export type FormatKind =
  "bold" | "italic" | "strike" | "number" | "link" | "quote";

export type KudosFormatToolbarProps = {
  /** `toolbar.*` slice of `KudosComposeCopy` — one `aria-label` per button
   * (mm:I520:11647;520:9881..662:10647, C.1-C.6). */
  copy: Record<FormatKind, string>;
  /** mm:I520:11647;3053:11621 — "Tiêu chuẩn cộng đồng" link text. */
  standardsLabel: string;
  onFormat: (kind: FormatKind) => void;
};

/**
 * mm:I520:11647;520:9877 (`mms_C_Chức năng`) — the format toolbar row above
 * the content textarea
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 *
 * Presentational only: emits `onFormat(kind)` and nothing else. The marker
 * string math lives in phase-04's marker-insertion utility and the selection
 * read/write in phase-07's hook — deliberately out of scope here
 * (clarifications.md § "Toolbar định dạng"), so `FormatKind` is declared
 * locally rather than imported from that phase's `_utils` file.
 *
 * The last cell, "Tiêu chuẩn cộng đồng" (`I520:11647;3053:11619`), has NO
 * row in the spec CSV — every node in this file shares the same garbage
 * `itemName` ("Awards Information Navigation Links"), so its real text only
 * surfaces via the node's own `character` field (clarifications.md § "Hai
 * node có trong design nhưng KHÔNG có trong spec"). Targets `/standards` in
 * the same tab — no design covers a new-tab target.
 *
 * Every button is `type="button"`: this toolbar sits inside the compose
 * `<form>` and none of the six may trigger a submit.
 *
 * Icon fills ship baked as `fill="white"` in Figma's export (invisible on
 * this row's white/cream background) — swapped to `currentColor` and
 * colored via `text-login-button-text` (`#00101A`) to match the dark ink
 * icons visible in `momorph/frame-image.png` (code-rules § 2a).
 */
export function KudosFormatToolbar({
  copy,
  standardsLabel,
  onFormat,
}: KudosFormatToolbarProps) {
  return (
    // mm:I520:11647;520:9877
    <div
      data-testid="kudos-format-toolbar"
      className="flex h-10 w-full flex-row items-center justify-end"
    >
      {FORMAT_BUTTONS.map(({ kind, Icon }, index) => (
        // mm:{toolbar button instance per kind}
        <button
          key={kind}
          type="button"
          data-testid="kudos-format-button"
          data-format={kind}
          aria-label={copy[kind]}
          onClick={() => onFormat(kind)}
          className={`flex h-10 w-14 shrink-0 items-center justify-center border border-[#998C5F] bg-transparent text-login-button-text transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-login-button/10 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-login-button-text focus-visible:outline-none ${
            index === 0 ? "rounded-tl-lg" : ""
          }`}
        >
          <Icon aria-hidden="true" className="h-6 w-6" />
        </button>
      ))}
      {/* mm:I520:11647;3053:11619 (not in the spec CSV — see doc comment) */}
      <a
        href={ROUTES.STANDARDS}
        data-testid="kudos-standards-link"
        className="flex h-10 flex-1 items-center justify-end rounded-tr-lg border border-[#998C5F] bg-transparent px-4 font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-[#E46060] underline"
      >
        {standardsLabel}
      </a>
    </div>
  );
}

/** Every `MM_MEDIA_*` toolbar icon shares this exact SVG shell (24x24,
 * single `currentColor` path) — factored once instead of repeated 6 times
 * (code-rules § 5). Each icon's raw Figma export bakes `fill="white"`
 * (invisible on this row's background); `path` here is that same `d` data
 * with `currentColor` substituted (code-rules § 2a). */
function icon(path: string) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path d={path} fill="currentColor" />
      </svg>
    );
  };
}

/** `MM_MEDIA_Bold` (`I520:11647;520:9881;186:1420`). */
const IconBold = icon(
  "M13.5 15.5H10V12.5H13.5C13.8978 12.5 14.2794 12.658 14.5607 12.9393C14.842 13.2206 15 13.6022 15 14C15 14.3978 14.842 14.7794 14.5607 15.0607C14.2794 15.342 13.8978 15.5 13.5 15.5ZM10 6.5H13C13.3978 6.5 13.7794 6.65804 14.0607 6.93934C14.342 7.22064 14.5 7.60218 14.5 8C14.5 8.39782 14.342 8.77936 14.0607 9.06066C13.7794 9.34196 13.3978 9.5 13 9.5H10M15.6 10.79C16.57 10.11 17.25 9 17.25 8C17.25 5.74 15.5 4 13.25 4H7V18H14.04C16.14 18 17.75 16.3 17.75 14.21C17.75 12.69 16.89 11.39 15.6 10.79Z",
);

/** `MM_MEDIA_Italic` (`I520:11647;662:11119;186:1420`). */
const IconItalic = icon(
  "M10 4V7H12.21L8.79 15H6V18H14V15H11.79L15.21 7H18V4H10Z",
);

/** `MM_MEDIA_Strikethrough` (`I520:11647;662:11213;186:1420`). */
const IconStrike = icon(
  "M7.62432 9.37769C6.42432 7.07769 8.12432 4.37769 10.5243 3.87769C13.6243 2.87769 18.1243 4.27769 18.0243 8.07769H15.0243C15.0243 7.77769 14.9243 7.47769 14.9243 7.27769C14.7243 6.67769 14.3243 6.37769 13.7243 6.17769C12.9243 5.87769 11.6243 5.97769 10.9243 6.47769C9.42432 7.77769 10.8243 9.07769 12.4243 9.57769H7.82432C7.72432 9.47769 7.72432 9.37769 7.62432 9.37769ZM21.4243 12.5777V10.5777H3.42432V12.5777H13.0243C13.2243 12.6777 13.4243 12.6777 13.6243 12.7777C14.2243 13.0777 14.7243 13.2777 14.9243 13.8777C15.0243 14.2777 15.1243 14.7777 14.9243 15.1777C14.7243 15.6777 14.3243 15.8777 13.8243 16.0777C12.0243 16.5777 9.82432 15.8777 9.92432 13.6777H6.92432C6.82432 16.2777 9.02432 18.0777 11.4243 18.3777C15.2243 19.1777 19.7243 16.7777 17.7243 12.4777L21.4243 12.5777Z",
);

/** `MM_MEDIA_Number List` (`I520:11647;662:10376;186:1420`). */
const IconNumberList = icon(
  "M7 13V11H21V13H7ZM7 19V17H21V19H7ZM7 7V5H21V7H7ZM3 8V5H2V4H4V8H3ZM2 17V16H5V20H2V19H4V18.5H3V17.5H4V17H2ZM4.25 10C4.44891 10 4.63968 10.079 4.78033 10.2197C4.92098 10.3603 5 10.5511 5 10.75C5 10.95 4.92 11.14 4.79 11.27L3.12 13H5V14H2V13.08L4 11H2V10H4.25Z",
);

/** `MM_MEDIA_Link` (`I520:11647;662:10507;186:1420`). */
const IconLink = icon(
  "M10.9619 13.1547C11.3719 13.5447 11.3719 14.1847 10.9619 14.5747C10.5719 14.9647 9.93189 14.9647 9.54189 14.5747C7.5919 12.6247 7.5919 9.4547 9.54189 7.5047L13.0819 3.9647C15.0319 2.0147 18.2019 2.0147 20.1519 3.9647C22.1019 5.9147 22.1019 9.0847 20.1519 11.0347L18.6619 12.5247C18.6719 11.7047 18.5419 10.8847 18.2619 10.1047L18.7319 9.6247C19.9119 8.4547 19.9119 6.5547 18.7319 5.3847C17.5619 4.2047 15.6619 4.2047 14.4919 5.3847L10.9619 8.9147C9.7819 10.0847 9.7819 11.9847 10.9619 13.1547ZM13.7819 8.9147C14.1719 8.5247 14.8119 8.5247 15.2019 8.9147C17.1519 10.8647 17.1519 14.0347 15.2019 15.9847L11.6619 19.5247C9.71189 21.4747 6.54189 21.4747 4.59189 19.5247C2.64189 17.5747 2.64189 14.4047 4.59189 12.4547L6.08189 10.9647C6.07189 11.7847 6.20189 12.6047 6.48189 13.3947L6.01189 13.8647C4.83189 15.0347 4.83189 16.9347 6.01189 18.1047C7.18189 19.2847 9.08189 19.2847 10.2519 18.1047L13.7819 14.5747C14.9619 13.4047 14.9619 11.5047 13.7819 10.3347C13.3719 9.9447 13.3719 9.3047 13.7819 8.9147Z",
);

/** `MM_MEDIA_Quote` (`I520:11647;662:10647;186:1420`). */
const IconQuote = icon(
  "M12.9999 6V14H14.8799L12.8799 18H18.6199L20.9999 13.24V6M14.9999 8H18.9999V12.76L17.3799 16H16.1199L18.1199 12H14.9999M2.99988 6V14H4.87988L2.87988 18H8.61988L10.9999 13.24V6M4.99988 8H8.99988V12.76L7.37988 16H6.11988L8.11988 12H4.99988V8Z",
);

const FORMAT_BUTTONS: {
  kind: FormatKind;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
}[] = [
  { kind: "bold", Icon: IconBold },
  { kind: "italic", Icon: IconItalic },
  { kind: "strike", Icon: IconStrike },
  { kind: "number", Icon: IconNumberList },
  { kind: "link", Icon: IconLink },
  { kind: "quote", Icon: IconQuote },
];
