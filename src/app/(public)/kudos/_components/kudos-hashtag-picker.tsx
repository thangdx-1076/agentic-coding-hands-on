"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
  type SVGProps,
} from "react";

import { useAnchoredPopover } from "../_hooks/use-anchored-popover";

/** The whole Hashtag field (`kudos-hashtag-field.tsx`) — chips and their
 * remove buttons, the "+ Hashtag" trigger, the limit note, and this panel.
 * A pointer landing anywhere in it does NOT count as "outside".
 *
 * Not just the trigger, which is the narrower boundary you would reach for
 * first: the chip remove buttons live in this wrapper but outside the panel,
 * so closing on their `pointerdown` re-rendered the field before the press
 * became a `click` and the removal was silently dropped (C13). Excluding the
 * trigger matters too — it unconditionally re-opens the picker, so closing
 * first would tear the panel down and rebuild it, losing the typed query, on
 * a click meant to be a no-op. */
const FIELD_SELECTOR = "[data-testid=kudos-hashtag-field]";

/** Panel width `1002:13102` draws, as a number so placement can keep the
 * panel inside the viewport's right edge. */
const PANEL_WIDTH = 318;

export type KudosHashtagPickerProps = {
  /** Vocabulary the caller already computed — `buildHashtagSuggestions`
   * (`_utils`): the Sun* master list merged with `/kudos`'s own
   * `filters.hashtags` (clarifications.md § "Hashtag là free-text..."). Not
   * queried, deduped or filtered here — this list is rendered as-is. */
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
  /** The "+ Hashtag" button this panel hangs under. A ref, not a DOM query:
   * the panel must anchor to ITS OWN field's trigger. */
  anchorRef: RefObject<HTMLButtonElement | null>;
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
 * handlers, no local component state — every option row is natively
 * `Tab`-reachable in DOM order rather than a custom roving-tabindex
 * pointer; Enter in the input commits the typed query, Escape (input or a
 * row) calls `onClose`.
 *
 * Placement and dismissal are both this component's own job, NOT the
 * caller's. It renders as a `fixed` popover anchored to the "+ Hashtag"
 * button so it floats OVER the form rather than being clipped by (or
 * stretching) the dialog's scroll container — see the placement effect. A
 * click outside the field closes it, which is the only mouse-driven way out:
 * the trigger re-opens rather than toggles, and the design draws no close
 * button on the panel.
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
  anchorRef,
  label,
}: KudosHashtagPickerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Floats over the form instead of living in its layout — the shared hook's
  // own doc explains why `fixed` is the only positioning that survives the
  // dialog's scroll container. `hashtags.length` is a real dependency, not
  // padding: adding or removing a chip re-wraps the field's flex row and
  // MOVES the trigger, often onto the next line, so a panel placed against
  // the old position ends up detached from its anchor.
  const position = useAnchoredPopover({
    anchorRef,
    panelRef,
    width: PANEL_WIDTH,
    deps: [suggestions.length, hashtags.length],
  });

  // Dismissal. Selecting a tag deliberately leaves the panel open (C13/C14 add
  // several in a row), so without this listener a mouse-only user had NO way
  // out at all: the trigger re-opens rather than toggles, and the panel draws
  // no close control of its own. Escape was the sole escape hatch, and only
  // while focus still sat inside the picker — click anywhere else first and
  // Escape reaches the native `<dialog>` instead, whose `cancel` handler
  // (`use-kudos-compose-dialog.ts:75`) closes the whole compose modal and
  // resets the draft. `pointerdown`, not `click`, so the panel is gone before
  // the press can move focus or land on whatever sat underneath it — which is
  // also why `FIELD_SELECTOR`, not the panel alone, defines "inside".
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(FIELD_SELECTOR) !== null
      ) {
        return;
      }
      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  /** Enter in the free-text input commits the typed tag AND dismisses — the
   * query is consumed and blanked, so nothing is left in the input to act on,
   * and the panel would otherwise sit over the Image and "gửi ẩn danh"
   * controls directly beneath the Hashtag field. Clicking a suggestion ROW
   * deliberately does NOT close: those rows carry a selected/checkmark state
   * and are meant to be toggled several at a time (C13/C14). */
  function commitQuery() {
    const tag = query.trim();
    if (tag.length > 0) {
      onAdd(tag);
      onQueryChange("");
      onClose();
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
      ref={panelRef}
      data-testid="kudos-hashtag-picker"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        maxHeight: position?.maxHeight,
        // First paint happens before `place()` has measured, so the panel is
        // held invisible for that one frame rather than flashing at 0,0.
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-50 flex w-[318px] flex-col items-start gap-1 overflow-hidden rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-lg"
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
      {/* The list scrolls; the search input above it stays pinned. The design
          frame draws a fixed 8-row panel, but the real list is the master
          vocabulary plus every tag past kudos used
          (`buildHashtagSuggestions`) and so has no upper bound. No fixed cap
          here — placement measures the room actually available and sets the
          panel's `maxHeight`, so the list uses whatever is left over. */}
      <div
        role="listbox"
        aria-label={label}
        className="flex w-full min-h-0 flex-1 flex-col overflow-y-auto"
      >
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
