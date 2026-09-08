import Image from "next/image";

export type KudosSunnerOption = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
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
 * No design node covers this dropdown — both candidate frames
 * (`QIMJNgFb8K`/`zJzaC9GgXt`) carry no node style data
 * (clarifications.md § "Frame phụ trợ"). Shape (rounded, `overflow-hidden`,
 * `shadow-lg`, row padding, hover/focus-visible states) is copied verbatim
 * from `kudos-filter-menu.tsx`'s dropdown panel — the closest in-repo
 * listbox precedent. Its COLOR is deliberately NOT copied verbatim: that
 * panel is themed for the dark `/kudos` page background
 * (`bg-[#0B0F12]`/`text-white`), but this listbox sits inside the compose
 * dialog's cream panel (`#FFF8E1`) — reusing a black panel there would be a
 * visibly broken import, not a faithful shape borrow. Colors instead reuse
 * tokens this SAME design already establishes for the dialog itself
 * (`#998C5F` border, `login-button-text` / `#00101a` ink), which is more
 * faithful to "don't guess" than blindly copying an unrelated dark theme.
 */
export function KudosSunnerOptions({
  label,
  options,
  loading = false,
  loadingLabel,
  emptyLabel,
  onSelect,
  listboxTestId = "kudos-recipient-options",
  optionTestId = "kudos-recipient-option",
}: KudosSunnerOptionsProps) {
  return (
    <div
      role="listbox"
      aria-label={label}
      aria-busy={loading}
      data-testid={listboxTestId}
      className="animate-login-menu-in absolute top-full left-0 z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded border border-[#998C5F] bg-[#FFF8E1] shadow-lg"
    >
      {loading ? (
        <p className="px-4 py-3 font-montserrat text-sm font-bold text-login-button-text">
          {loadingLabel}
        </p>
      ) : options.length === 0 ? (
        <p className="px-4 py-3 font-montserrat text-sm font-bold text-login-button-text">
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
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left font-montserrat text-sm font-bold whitespace-nowrap text-login-button-text outline-none hover:bg-login-button/20 focus-visible:bg-login-button/20"
          >
            {option.avatarUrl ? (
              <Image
                src={option.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full border border-[#998C5F] object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#998C5F] bg-[#EEEEEE] text-xs">
                {option.fullName.charAt(0).toUpperCase()}
              </span>
            )}
            <span>{option.fullName}</span>
          </button>
        ))
      )}
    </div>
  );
}
