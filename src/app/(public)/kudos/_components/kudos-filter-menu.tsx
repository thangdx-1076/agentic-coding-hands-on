"use client";

import { IconDown } from "../../../_components/language-selector/icon-down";

import { useMenuKeyboardNav } from "@/hooks/use-menu-keyboard-nav";

export type KudosFilterState = {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClear: () => void;
};

export type KudosFilterMenuProps = KudosFilterState & {
  testId: string;
  optionTestId: string;
  /**
   * Display-only prefix for option labels (e.g. `"#"` for the hashtag menu).
   * The Figma node text itself bakes the `#` in (`563:8026` children read
   * `#Dedicated`/`#Inspring`, verified via `get_node`), so the label prefix
   * mirrors the design's own content — it never touches `data-value`, which
   * `tests/e2e/kudos.spec.ts` C14/C15 select by.
   */
  labelPrefix?: string;
};

const TRIGGER_BASE =
  "flex items-center gap-2 rounded border p-4 font-montserrat text-base leading-6 font-bold tracking-[0.15px] transition-colors duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background";
const TRIGGER_INACTIVE =
  "border-[#998C5F] bg-[rgba(255,234,158,0.10)] text-white hover:bg-[rgba(255,234,158,0.18)]";
const TRIGGER_ACTIVE =
  "border-login-button bg-[rgba(255,234,158,0.18)] text-login-button";

/**
 * Shared dropdown trigger for B.1.1 (`Hashtag`) and B.1.2 (`Phòng ban`) —
 * both are the same Figma component instance (`186:2757`/`186:1426`), only
 * the label/option list differ (DRY, phase-08 Todo). Same open/close
 * behavior (Escape, click-outside, roving tabindex) as `KudosDirectionSelect`
 * — reuses the exact same `useMenuKeyboardNav` hook.
 *
 * The filter VALUE is not local state (AD-4) — it lives wherever the caller
 * keeps `searchParams`. This component only owns the menu's open/closed UI
 * state; `selected` is always a prop.
 *
 * Clearing: the Figma node tree draws no separate "clear" row for this
 * control — only the label and its options. So re-selecting the
 * already-active option clears it (`onClear` fires instead of `onSelect`
 * when the clicked value matches `selected`). That satisfies "clearing the
 * filter displays all Kudos" (test cases for B.1.1/B.1.2, step 3) without
 * inventing a UI element the design doesn't show.
 */
export function KudosFilterMenu({
  label,
  options,
  selected,
  onSelect,
  onClear,
  testId,
  optionTestId,
  labelPrefix,
}: KudosFilterMenuProps) {
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: options.length });

  function handleOptionClick(value: string) {
    if (value === selected) {
      onClear();
    } else {
      onSelect(value);
    }
    close();
  }

  const isActive = selected !== null;

  return (
    // mm:2940:13459 (Hashtag) / mm:2940:13460 (Phòng ban)
    <div ref={registerRoot} className="relative">
      <button
        ref={registerButton}
        type="button"
        data-testid={testId}
        data-active={isActive}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        className={`${TRIGGER_BASE} ${isActive ? TRIGGER_ACTIVE : TRIGGER_INACTIVE}`}
      >
        {/* mm:I...;186:2760 */}
        <span>{selected ?? label}</span>
        {/* mm:I...;186:2761 MM_MEDIA_Down */}
        <IconDown
          className={`h-6 w-6 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="animate-login-menu-in absolute top-full left-0 z-30 mt-1 max-h-87 min-w-full overflow-y-auto rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-lg"
        >
          {options.map((option, index) => (
            <button
              key={option}
              ref={registerItem(index)}
              type="button"
              role="option"
              data-testid={optionTestId}
              data-value={option}
              aria-selected={selected === option}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => handleOptionClick(option)}
              className="flex h-14 w-full cursor-pointer scroll-my-1 items-center justify-center rounded px-4 text-center font-montserrat text-base leading-6 font-bold tracking-[0.5px] whitespace-nowrap text-white outline-none hover:bg-white/10 focus-visible:bg-white/10 aria-selected:bg-[rgba(255,234,158,0.10)] aria-selected:[text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287]"
            >
              {labelPrefix ? `${labelPrefix}${option}` : option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
