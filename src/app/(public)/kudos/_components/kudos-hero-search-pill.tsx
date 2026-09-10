"use client";

import type { KeyboardEvent, SVGProps } from "react";

import type { KudosSunnerOption } from "./kudos-sunner-options";
import { KudosSunnerOptions } from "./kudos-sunner-options";

export type KudosHeroSearchPillProps = {
  placeholder: string;
  ariaLabel: string;
  /** Search text — owned by `useHeroProfileSearch` in the wrapper
   * (`kudos-hero-profile-search.tsx`), never by this component. */
  query: string;
  onQueryChange: (value: string) => void;
  maxLength: number;
  options: KudosSunnerOption[];
  loading: boolean;
  isOpen: boolean;
  /** Shown in place of the result rows while a search is in flight. */
  loadingLabel: string;
  /** Shown when a settled search matched nothing — the wrapper swaps in the
   * sign-in hint here for an anonymous visitor, so this component never has
   * to know who is looking. */
  emptyLabel: string;
  onSelect: (option: KudosSunnerOption) => void;
  /** `Escape` — hides the dropdown, keeps the typed text. */
  onDismiss: () => void;
  /** `Enter` — opens the first result. */
  onSubmit: () => void;
};

const LISTBOX_ID = "kudos-hero-search-listbox";

/**
 * Sunner-profile search pill in the KV band (mm:2940:13450 `Tìm kiếm sunner`,
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ).
 *
 * Sibling of the compose pill inside `mm:2940:13448 Button chuc nang`
 * (1440×72 at y 408–480): compose is 738 wide at x 144–882, this one is
 * 381 wide at x 914–1295, so the two sit 32px apart on the same row.
 * Both are the SAME Figma component (`componentId 186:2757`), which is why
 * the border/background/radius below match `kudos-compose-pill.tsx` exactly.
 *
 * The placeholder comes from the node's `character`, not its `itemName` —
 * this instance's `itemName` is a stale `"Awards Information Navigation
 * Links"` left over from the component it was copied from, the same trap
 * F005 D003 already recorded. `character` is `"Tìm kiếm profile Sunner"`.
 *
 * Was `readOnly` when the band was first built (no Figma frame covered the
 * result list, so nothing was wired) — which shipped a search box that
 * silently swallowed every keystroke. It is now a real combobox over the
 * SAME `searchSunners` source the compose dialog's recipient field uses, and
 * picking a result opens `/profile?id=` (the route already resolves another
 * Sunner's card through `parseProfileId`). The dropdown itself reuses
 * `KudosSunnerOptions` — the design has no node for it here either, exactly
 * as with the recipient field's own list.
 *
 * Still presentational: `query`/`options`/`isOpen` and every callback come
 * from `useHeroProfileSearch` via `kudos-hero-profile-search.tsx`. Unlike
 * `kudos-compose-pill.tsx` this input keeps its native `textbox` role (it
 * really does accept typing now), so `aria-expanded` sits on a `combobox`
 * role, which WAI-ARIA does allow it on.
 *
 * No `onBlur` close: `KudosSunnerOptions`'s rows are `<button>`s, and a blur
 * handler would fire on their `mousedown` and unmount the row before its
 * `click` ever lands. `Escape` (and picking a result) is what closes it.
 */
export function KudosHeroSearchPill({
  placeholder,
  ariaLabel,
  query,
  onQueryChange,
  maxLength,
  options,
  loading,
  isOpen,
  loadingLabel,
  emptyLabel,
  onSelect,
  onDismiss,
  onSubmit,
}: KudosHeroSearchPillProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      onDismiss();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    // mm:2940:13450
    <div
      data-testid="kudos-hero-search-pill"
      className="relative flex w-full max-w-[381px] items-center gap-2 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.10)] px-4 py-6"
    >
      {/* mm:I2940:13450;186:2758 — gap 16px between icon and label */}
      <div className="flex flex-1 items-center gap-4">
        {/* mm:I2940:13450;186:2759 MM_MEDIA_Search, 24×24 */}
        <IconSearch
          data-testid="kudos-hero-search-icon"
          aria-hidden="true"
          className="h-6 w-6 shrink-0 text-white"
        />
        {/* mm:I2940:13450;186:2760 */}
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          value={query}
          maxLength={maxLength}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-testid="kudos-hero-search-input"
          className="w-full bg-transparent font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white placeholder:text-white focus:outline-none"
        />
      </div>
      {isOpen ? (
        <div id={LISTBOX_ID}>
          <KudosSunnerOptions
            label={ariaLabel}
            options={options}
            loading={loading}
            loadingLabel={loadingLabel}
            emptyLabel={emptyLabel}
            onSelect={onSelect}
            listboxTestId="kudos-hero-search-options"
            optionTestId="kudos-hero-search-option"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * `MM_MEDIA_Search` inlined with `fill="currentColor"` per code-rules §2a,
 * matching how `kudos-compose-pill.tsx` inlines `MM_MEDIA_Pen`.
 */
function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-9 7a9 9 0 1 1 16.03 5.62l3.68 3.67a1 1 0 0 1-1.42 1.42l-3.67-3.68A9 9 0 0 1 2 11Z"
        fill="currentColor"
      />
    </svg>
  );
}
