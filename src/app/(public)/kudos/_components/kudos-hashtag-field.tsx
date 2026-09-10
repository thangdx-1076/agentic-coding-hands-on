"use client";

import type { SVGProps } from "react";

import { KudosComposeField } from "./kudos-compose-field";
import { KudosHashtagPicker } from "./kudos-hashtag-picker";

export type KudosHashtagFieldProps = {
  hashtags: string[];
  suggestions: string[];
  pickerOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onPickerOpenChange: (open: boolean) => void;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  /** `hashtags.length >= 5`, computed by the phase-07 hook. Drives
   * `aria-disabled` on the add button and the picker's row-disable
   * affordance — NOT the message (that's `limitRejected`); 5 chips alone
   * is a success state, never hides the button (ID-16/C14). */
  limitReached: boolean;
  /** True only while a 6th add attempt was actually rejected (phase-07
   * hook); clears again on a successful add or a chip removal. Defaults to
   * `false` so existing callers/stories that never pass it keep the
   * correct (no-message-at-5) behaviour. Drives `maxMessage` — do NOT
   * derive the message from `limitReached` (ID-16/17/C14). */
  limitRejected?: boolean;
  /** Submit-time validation error (e.g. required-empty), takes priority
   * over `maxMessage` when both would otherwise apply. */
  error?: string | null;
  label: string;
  addLabel: string;
  limitNote: string;
  pickerLabel: string;
  /** `"Xóa hashtag {tag}"` — `{tag}` interpolated per chip. */
  removeLabelTemplate: string;
  /** `errorHashtagMax`, rendered via `error` when `limitReached` is true
   * and no explicit `error` overrides it. */
  maxMessage: string;
};

const CONTROL_ID = "kudos-hashtag-add-button";

/**
 * mm:I520:11647;520:9890 "mms_E_Frame 536"
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2) —
 * label + `*` are `KudosComposeField`'s job (phase-08, not rebuilt here);
 * this renders `mms_E.2_Tag Group` (`;662:8595`): chip row, the
 * "+ Hashtag" button (`;662:8911`, `MM_MEDIA_Plus` `;662:8911;186:2759`,
 * border `#998C5F`/bg `#FFF`/radius 8/height 48, text 11px/700/`#999`), and
 * the "Tối đa 5" note.
 *
 * That Button INSTANCE's own `character` bakes BOTH lines into one TEXT
 * node ("Hashtag\nTối đa 5  ") — phase-03's copy contract already split
 * that into two independent strings (`addLabel`/`limitNote`, shared with
 * the Image section F's identical button), so this renders them as two
 * separate elements instead of re-deriving Vietnamese text here.
 *
 * No design node shows an ADDED chip — this frame's Tag Group holds only
 * the trigger button (0 hashtags in the mockup). Mirrors
 * `kudos-hashtag-list.tsx`'s `#tag` red text run (`text-[#D4271D]`); the
 * remove control borrows the ONE close badge this same screen DOES draw —
 * `MM_MEDIA_Close Tiny` (`;662:9197;662:9287;186:1420`, used on the image
 * thumbnails F.2-F.5): a 20x20 `#D4271D` circle around a white ~17x17 X,
 * per that node's parent "Button" instance styles (`get_node_context`).
 *
 * Clicking "+ Hashtag" always sets `pickerOpen` true (never toggles) —
 * C13/C14 click it once per loop iteration expecting the picker to stay
 * open/reachable every time, which a toggle would break on the 2nd click.
 */
export function KudosHashtagField({
  hashtags,
  suggestions,
  pickerOpen,
  query,
  onQueryChange,
  onPickerOpenChange,
  onAdd,
  onRemove,
  limitReached,
  limitRejected = false,
  error = null,
  label,
  addLabel,
  limitNote,
  pickerLabel,
  removeLabelTemplate,
  maxMessage,
}: KudosHashtagFieldProps) {
  const effectiveError = error ?? (limitRejected ? maxMessage : null);

  return (
    <KudosComposeField
      label={label}
      controlId={CONTROL_ID}
      fieldName="hashtags"
      required
      error={effectiveError}
      labelWidth={108}
    >
      {/* mm:I520:11647;662:8595 */}
      <div className="relative flex w-full flex-wrap items-center gap-2">
        {hashtags.map((tag, index) => (
          <div
            key={`${tag}-${index}`}
            data-testid="kudos-hashtag-chip"
            className="flex shrink-0 items-center gap-1 font-montserrat text-base font-bold tracking-[0.5px] text-[#D4271D]"
          >
            #{tag}
            <button
              type="button"
              data-testid="kudos-hashtag-remove"
              aria-label={removeLabelTemplate.replace("{tag}", tag)}
              onClick={() => onRemove(tag)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4271D] text-white"
            >
              {/* mm:I520:11647;662:9197;662:9287;186:1420 MM_MEDIA_Close Tiny */}
              <IconCloseTiny aria-hidden="true" className="h-[17px] w-[17px]" />
            </button>
          </div>
        ))}
        {/* mm:I520:11647;662:8911 */}
        <button
          id={CONTROL_ID}
          type="button"
          data-testid="kudos-hashtag-add"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-disabled={limitReached ? "true" : undefined}
          aria-describedby={effectiveError ? "hashtags-error" : undefined}
          onClick={() => onPickerOpenChange(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1 font-montserrat text-[11px] leading-4 font-bold tracking-[0.5px] text-[#999] aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
        >
          <span>{addLabel}</span>
          {/* mm:I520:11647;662:8911;186:2759 MM_MEDIA_Plus */}
          <IconPlus aria-hidden="true" className="h-6 w-6 shrink-0" />
        </button>
        {/* mm:I520:11647;662:8911;186:2760 (limitNote half of the same text node) */}
        <span className="shrink-0 font-montserrat text-[11px] leading-4 font-bold tracking-[0.5px] text-[#999]">
          {limitNote}
        </span>
        {pickerOpen ? (
          <KudosHashtagPicker
            suggestions={suggestions}
            hashtags={hashtags}
            limitReached={limitReached}
            query={query}
            onQueryChange={onQueryChange}
            onAdd={onAdd}
            onRemove={onRemove}
            onClose={() => onPickerOpenChange(false)}
            label={pickerLabel}
          />
        ) : null}
      </div>
    </KudosComposeField>
  );
}

/** `MM_MEDIA_Plus` inlined + `currentColor` (code-rules §2a) — ships baked
 * `fill="white"`, invisible on this button's own white background;
 * inherits the button's `text-[#999]`. */
function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
    </svg>
  );
}

/** `MM_MEDIA_Close Tiny` inlined + `currentColor` — its own baked
 * `fill="white"` is visually correct as-is (white glyph on the `#D4271D`
 * circle), kept via `currentColor` + the wrapping button's `text-white`
 * per code-rules §2a rather than a hardcoded `fill`. */
function IconCloseTiny(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.49187 4.09701L6.33854 5.94367V6.43034H5.85187L4.00521 4.58367L2.15854 6.43034H1.67188V5.94367L3.51854 4.09701L1.67188 2.25034V1.76367H2.15854L4.00521 3.61034L5.85187 1.76367H6.33854V2.25034L4.49187 4.09701Z"
        fill="currentColor"
      />
    </svg>
  );
}
