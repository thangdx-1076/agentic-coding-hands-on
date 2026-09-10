import { IconDown } from "../../../_components/language-selector/icon-down";
import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeField } from "./kudos-compose-field";
import type { KudosSunnerOption } from "./kudos-sunner-options";
import { KudosSunnerOptions } from "./kudos-sunner-options";

export type KudosRecipientFieldProps = {
  copy: KudosComposeCopy;
  error?: string | null;
  /** Current search text — also holds the selected Sunner's `fullName` once
   * `onSelect` fires, since `use-sunner-suggest` (phase 07) is expected to
   * set `query` to the picked option's name. No separate `selected` prop:
   * editing the text away from that name is this field's own "deselect"
   * affordance (re-opens a fresh search). */
  query: string;
  onQueryChange: (value: string) => void;
  options: KudosSunnerOption[];
  isLoading?: boolean;
  isOpen: boolean;
  onSelect: (option: KudosSunnerOption) => void;
};

const CONTROL_ID = "kudos-recipient-input";
const FIELD_NAME = "recipient";
const LISTBOX_ID = "kudos-recipient-options-listbox";

/**
 * mm:I520:11647;520:9871 "mms_B_Chọn người nhận"
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2) —
 * label `mms_B.1_Title` (mm:I520:11647;520:9872, "Người nhận" + required
 * `*`) beside search input `mms_B.2_Search` (mm:I520:11647;520:9873,
 * placeholder "Tìm kiếm", border `#998C5F`, radius 8px, 56px tall,
 * Montserrat 16px/700 `#999999` placeholder — measured via `get_node`) with
 * a `MM_MEDIA_Down` arrow icon (mm:I520:11647;520:9873;186:2761, 24×24,
 * sampled ink color `#00101a` off the reference screenshot at (1033,188) —
 * the exported SVG itself carries `fill="white"`, an instance-color override
 * `get_media_file` doesn't reflect). Reuses this repo's existing
 * `IconDown` (`src/app/_components/language-selector/icon-down.tsx`, same
 * path data, already the down-chevron convention in `kudos-filter-menu.tsx`)
 * instead of re-inlining the SVG a second time (code-rules §5, DRY).
 *
 * Figma models the label + input as a SINGLE ROW inside a 672px section
 * (flex row, 16px gap — measured via `get_node` on `520:9871`).
 * `KudosComposeField` (phase 08, not owned by this phase) always stacks
 * `label` above `children` in a column; reusing it per this phase's
 * contract means the field renders label-then-input instead of the design's
 * side-by-side row. Not fixed here — `kudos-compose-field.tsx` is out of
 * this phase's file ownership; flagged as a concern in the phase report
 * rather than guessed away or silently "corrected" in someone else's file.
 *
 * No design node covers the dropdown result list itself — `KudosSunnerOptions`
 * (phase 08) owns that shape entirely; this field only decides where it
 * mounts and which id it exposes for `aria-controls` (wrapping the shared
 * listbox in an owned `<div id>` since `KudosSunnerOptionsProps` has no `id`
 * slot to set directly on its own listbox node).
 *
 * Purely presentational: `query`/`options`/`isLoading`/`isOpen`/`onSelect`
 * arrive from phase 07's `use-sunner-suggest` hook via phase 13's wiring —
 * this file owns no state, no debounce, no Sunner-lookup DAL call of its own.
 */
export function KudosRecipientField({
  copy,
  error = null,
  query,
  onQueryChange,
  options,
  isLoading = false,
  isOpen,
  onSelect,
}: KudosRecipientFieldProps) {
  return (
    <KudosComposeField
      label={copy.recipientLabel}
      controlId={CONTROL_ID}
      fieldName={FIELD_NAME}
      required
      error={error}
    >
      {/* mm:I520:11647;520:9871 */}
      <div data-testid="kudos-recipient-field" className="relative w-full">
        {/* mm:I520:11647;520:9873 mms_B.2_Search */}
        <div
          className={`flex w-full items-center justify-between rounded-lg border bg-white px-6 py-4 ${
            error ? "border-[#FF8A80]" : "border-[#998C5F]"
          }`}
        >
          <input
            id={CONTROL_ID}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${FIELD_NAME}-error` : undefined}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.recipientPlaceholder}
            data-testid={CONTROL_ID}
            className="min-w-0 flex-1 bg-transparent font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-login-button-text placeholder:text-[#999999] focus:outline-none"
          />
          {/* mm:I520:11647;520:9873;186:2761 MM_MEDIA_Down */}
          <IconDown
            aria-hidden="true"
            className="h-6 w-6 shrink-0 text-login-button-text"
          />
        </div>
        {isOpen ? (
          <div id={LISTBOX_ID}>
            <KudosSunnerOptions
              label={copy.recipientLabel}
              options={options}
              loading={isLoading}
              loadingLabel={copy.recipientLoading}
              emptyLabel={copy.recipientEmpty}
              onSelect={onSelect}
            />
          </div>
        ) : null}
      </div>
    </KudosComposeField>
  );
}
