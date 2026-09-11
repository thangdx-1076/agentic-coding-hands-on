"use client";

import Image from "next/image";
import { useRef, type RefObject } from "react";

import { useAnchoredPopover } from "../_hooks/use-anchored-popover";

export type KudosSunnerOption = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  /** Third line of the row. Nullable — only seeded Sunners carry one, so a
   * real sign-in renders the row without it rather than with a blank slot. */
  department: string | null;
};

export type KudosSunnerOptionsProps = {
  /** Accessible name for the listbox — mirrors `kudos-filter-menu.tsx`'s
   * `aria-label={label}` convention. Callers pass the field's own visible
   * label (e.g. `copy.recipientLabel`). */
  label: string;
  options: KudosSunnerOption[];
  loading?: boolean;
  loadingLabel: string;
  emptyLabel: string;
  onSelect: (option: KudosSunnerOption) => void;
  /** The control this panel hangs under — the combobox box for the recipient
   * field, the textarea for `@`-mentions. */
  anchorRef: RefObject<HTMLElement | null>;
  /** `data-testid` for the listbox container. Defaults to the recipient
   * field's contract id; phase-10 reuses this same component for the `@`-
   * mention suggestions (C27) by passing `"kudos-mention-options"`. */
  listboxTestId?: string;
  /** `data-testid` for each option button — same reuse story as
   * `listboxTestId`, default `"kudos-recipient-option"`, phase-10 passes
   * `"kudos-mention-option"`. */
  optionTestId?: string;
};

/**
 * Sunner search-result dropdown (mm:B.2 `mms_B.2_Search`'s result list —
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 * Feeds phase-09's recipient field; `searchSunners` (clarifications.md §
 * "Nguồn dữ liệu người nhận") supplies `options`.
 *
 * Neither candidate design frame (`QIMJNgFb8K`/`zJzaC9GgXt`) carries node
 * style data (clarifications.md § "Frame phụ trợ"), so the panel follows the
 * reviewed reference screenshot of "Dropdown list người nhận muốn gửi lời
 * chúc": a DARK panel — same `#00070C` ground and `#998C5F` border as the
 * hashtag dropdown on this very screen (`1002:13102`, real node data) — with
 * each row drawn as avatar + white name + the Sunner's department beneath in
 * grey.
 *
 * That dark treatment REPLACES an earlier cream panel (`#FFF8E1`) which had
 * reasoned that a light dialog should not host a dark listbox. The reference
 * screenshot settles it the other way, and consistently: both dropdowns in
 * this dialog are dark panels over the cream form.
 *
 * Placement is `fixed`, via `useAnchoredPopover` — an `absolute` panel is
 * clipped by the compose dialog's scroll container, which at eight results
 * would cut the list off with no way to reach the rest. See that hook's doc.
 */
export function KudosSunnerOptions({
  label,
  options,
  loading = false,
  loadingLabel,
  emptyLabel,
  onSelect,
  anchorRef,
  listboxTestId = "kudos-recipient-options",
  optionTestId = "kudos-recipient-option",
}: KudosSunnerOptionsProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const position = useAnchoredPopover({
    anchorRef,
    panelRef,
    width: "anchor",
    deps: [options.length, loading],
  });

  return (
    <div
      ref={panelRef}
      role="listbox"
      aria-label={label}
      aria-busy={loading}
      data-testid={listboxTestId}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.anchorWidth,
        maxHeight: position?.maxHeight,
        // Held invisible until the first measurement lands, rather than
        // flashing at 0,0 for one frame.
        visibility: position ? "visible" : "hidden",
      }}
      className="animate-login-menu-in fixed z-50 flex flex-col overflow-y-auto rounded-lg border border-[#998C5F] bg-[#00070C] p-1.5 shadow-lg"
    >
      {loading ? (
        <p className="px-4 py-3 font-montserrat text-sm font-bold text-white/70">
          {loadingLabel}
        </p>
      ) : options.length === 0 ? (
        <p className="px-4 py-3 font-montserrat text-sm font-bold text-white/70">
          {emptyLabel}
        </p>
      ) : (
        options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="option"
            data-testid={optionTestId}
            aria-selected={false}
            onClick={() => onSelect(option)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-4 py-2 text-left outline-none hover:bg-white/10 focus-visible:bg-white/10"
          >
            {option.avatarUrl ? (
              <Image
                src={option.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 font-montserrat text-sm font-bold text-white">
                {option.fullName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-white">
                {option.fullName}
              </span>
              {option.department ? (
                <span className="font-montserrat text-xs leading-4 font-bold tracking-[0.5px] text-white/60">
                  {option.department}
                </span>
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
