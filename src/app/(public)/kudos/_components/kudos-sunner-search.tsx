import type { SVGProps } from "react";

export type KudosSunnerSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
  canSubmit: boolean;
  placeholder: string;
  submitLabel: string;
};

/** Spec § 13 Configuration — `SUNNER_SEARCH_MAX_LENGTH` (BR-010), mirrored
 * here as the literal HTML attribute so C06 can read `inputValue().length`
 * straight off the DOM without relying on the hook already truncating
 * `query` before it gets here. */
const SUNNER_SEARCH_MAX_LENGTH = 100;

/**
 * mm:B.7.3_Tìm kiếm sunner (`2940:14833`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ) — the
 * Spotlight "tìm Sunner" pill. Purely presentational: `query`/`onQueryChange`
 * come from `useSpotlightSearch` in the parent (`kudos-spotlight.tsx`), which
 * already recomputes the scatter's `matched` set on every keystroke
 * (clarifications.md § D002) — there is no separate submit action to wire,
 * so the magnifying-glass button stays a `disabled`-when-empty affordance
 * (C05) rather than an `onClick` handler with somewhere to navigate to.
 */
export function KudosSunnerSearch({
  query,
  onQueryChange,
  canSubmit,
  placeholder,
  submitLabel,
}: KudosSunnerSearchProps) {
  return (
    // mm:2940:14833
    <div className="flex h-[39px] w-[219px] items-center gap-1.5 rounded-full border border-[#998C5F] bg-login-button/10 px-2.5 py-4">
      {/* mm:I2940:14833;186:2759 MM_MEDIA_Search */}
      <button
        type="button"
        disabled={!canSubmit}
        aria-label={submitLabel}
        data-testid="kudos-sunner-search-submit"
        className="shrink-0 border-0 bg-transparent p-0 text-white disabled:opacity-50"
      >
        <IconSearch aria-hidden="true" className="h-4 w-4" />
      </button>
      {/* mm:I2940:14833;186:2760 */}
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        maxLength={SUNNER_SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid="kudos-sunner-search"
        className="w-full min-w-0 bg-transparent font-montserrat text-[11px] leading-4 font-medium tracking-[0.1px] text-white placeholder:text-white focus:outline-none"
      />
    </div>
  );
}

/** `MM_MEDIA_Search` (`I2940:14833;186:2759`), reused from the real export
 * at `public/kudos/icon-search.svg` (asset-dimensions.md), inlined +
 * `currentColor` per code-rules 2a so it inherits the button's `text-white`
 * — rendered here at the design's 16px Spotlight size, not the 24px
 * input-pill size the same source SVG is also used at elsewhere. */
function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.5 3C11.2239 3 12.8772 3.68482 14.0962 4.90381C15.3152 6.12279 16 7.77609 16 9.5C16 11.11 15.41 12.59 14.44 13.73L14.71 14H15.5L20.5 19L19 20.5L14 15.5V14.71L13.73 14.44C12.59 15.41 11.11 16 9.5 16C7.77609 16 6.12279 15.3152 4.90381 14.0962C3.68482 12.8772 3 11.2239 3 9.5C3 7.77609 3.68482 6.12279 4.90381 4.90381C6.12279 3.68482 7.77609 3 9.5 3ZM9.5 5C7 5 5 7 5 9.5C5 12 7 14 9.5 14C12 14 14 12 14 9.5C14 7 12 5 9.5 5Z"
        fill="currentColor"
      />
    </svg>
  );
}
