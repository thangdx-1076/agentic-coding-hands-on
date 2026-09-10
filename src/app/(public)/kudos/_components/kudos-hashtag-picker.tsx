"use client";

import type { KeyboardEvent, SVGProps } from "react";

export type KudosHashtagPickerProps = {
  /** Vocabulary the caller already computed (`/kudos` page's
   * `filters.hashtags`, clarifications.md § "Hashtag là free-text..."). Not
   * queried or filtered here — this list is rendered as-is. */
  suggestions: string[];
  /** Currently-added tags — marks which suggestion rows render the "đã
   * chọn" (selected) state. */
  hashtags: string[];
  /** `hashtags.length >= 5` (phase-07 hook, via `kudos-hashtag-field.tsx`).
   * When true, every row that is NOT already selected is disabled and does
   * not respond to click — an already-selected row stays clickable so the
   * user can still unselect it (`momorph/specs-p9zO-c4a4x.csv` rows
   * A.1/B.1/C.1/D). */
  limitReached: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  onClose: () => void;
  /** Accessible name for both the free-text input and the listbox
   * (`copy.hashtagPickerLabel`). */
  label: string;
};

/**
 * mm:1002:13013 "Dropdown list hashtag"
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x) —
 * clarifications.md § "Frame phụ trợ": the ONE dropdown frame in this modal
 * with real node data. Panel `1002:13102`: dark `#00070C`
 * (`--Details-Container-2`), border `#998C5F` (`--Details-Border`), radius
 * 8, 6px padding, fixed 318px width. Rows `mms_A/B/C_Hashtag đã chọn`
 * highlight `bg-login-button/20` — the design's literal
 * `rgba(255,234,158,0.2)` IS `--color-login-button` (`src/styles/
 * globals.css:19`) at 20% — vs `mms_D_Hashtag chưa chọn` (no highlight).
 * Row text ("#High-perorming", "#BE PROFESSIONAL", ...) is read verbatim
 * off this frame's own nodes (`query_section` on `1002:13013`), not typed
 * from memory.
 *
 * Also https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
 * (the field this dropdown belongs to).
 *
 * The free-text `<input>` has NO design node — US002 "hoặc nhập tay" needs
 * one, but the frame draws only the row list, same gap class as the two
 * "Frame phụ trợ" dropdowns with no node data. Styled to this SAME dark
 * panel's own tokens (not `kudos-sunner-options.tsx`'s light palette — that
 * component's own doc comment explains why colors don't transplant across
 * this file's light/dark split).
 *
 * `mms_X.2_icon đã chọn` (componentId `1002:13201`) has no exportable
 * asset: its name doesn't contain `mm_media_` (code-rules §2 media
 * detection), it has no row in `get_media_files`, and the `get_figma_image`
 * fallback failed both ways (`svg` unsupported by this call site's schema,
 * `png` returned a 500). Substituted with a standard checkmark glyph at the
 * node's own verified 24x24 size — the size and highlighted-row context
 * are real MCP data, only this one internal vector path is a stand-in.
 *
 * Keyboard: NOT `use-menu-keyboard-nav` (`_hooks`, may not be edited) — that
 * hook owns its OWN internal `open` boolean with no controlled-prop escape
 * hatch, and `pickerOpen`/`query` here are owned by phase-07's hook (resets
 * alongside every other compose field on dialog close/Escape). Plain
 * handlers, no local component state at all (Todo: this component never
 * calls React's own state hook) — every option row is natively
 * `Tab`-reachable in DOM order rather than a custom roving-tabindex
 * pointer; Enter in the input commits the typed query, Escape (input or a
 * row) calls `onClose`.
 */
export function KudosHashtagPicker({
  suggestions,
  hashtags,
  limitReached,
  query,
  onQueryChange,
  onAdd,
  onRemove,
  onClose,
  label,
}: KudosHashtagPickerProps) {
  function commitQuery() {
    const tag = query.trim();
    if (tag.length > 0) {
      onAdd(tag);
      onQueryChange("");
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitQuery();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  function handleOptionClick(
    tag: string,
    isSelected: boolean,
    disabled: boolean,
  ) {
    if (disabled) return;
    if (isSelected) {
      onRemove(tag);
    } else {
      onAdd(tag);
    }
  }

  return (
    // mm:1002:13102
    <div
      data-testid="kudos-hashtag-picker"
      className="absolute top-full left-0 z-30 mt-1 flex w-[318px] flex-col items-start gap-1 rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5"
    >
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
        aria-label={label}
        placeholder={label}
        className="w-full min-w-0 rounded px-2.5 py-2 font-montserrat text-sm font-bold text-white placeholder:text-white/60 focus:outline-none"
      />
      <div role="listbox" aria-label={label} className="flex w-full flex-col">
        {suggestions.map((tag) => {
          const isSelected = hashtags.includes(tag);
          const disabled = !isSelected && limitReached;
          return (
            // mm:1002:13185 (đã chọn) / mm:1002:13104 (chưa chọn)
            <button
              key={tag}
              type="button"
              role="option"
              data-testid="kudos-hashtag-option"
              aria-selected={isSelected}
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => handleOptionClick(tag, isSelected, disabled)}
              onKeyDown={handleOptionKeyDown}
              className={`flex h-10 w-full shrink-0 items-center gap-0.5 rounded-sm px-4 text-left font-montserrat text-base font-bold tracking-[0.15px] text-white outline-none ${isSelected ? "bg-login-button/20" : disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/5"}`}
            >
              <span className="flex-1 truncate">#{tag}</span>
              {isSelected ? (
                <IconCheck aria-hidden="true" className="h-6 w-6 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** mm:1002:13204 "icon đã chọn" — see header comment: no exportable asset,
 * standard checkmark glyph substituted at the node's real 24x24 size. */
function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
        fill="currentColor"
      />
    </svg>
  );
}
