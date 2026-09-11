"use client";

import { useRef, type SVGProps } from "react";

import { KudosComposeField } from "./kudos-compose-field";
import { IconClose } from "./kudos-compose-icons";
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
 * elements. Both sit INSIDE the button, stacked to the right of the plus
 * icon, because that is what `Frame 483` draws: icon at x=529, text at
 * x=557 (`query_section` on `;662:8911`). An earlier pass put the icon
 * after the label and left `limitNote` outside the button entirely, which
 * `kudos-image-field.tsx` — the SAME Figma component (`186:2757`) — never
 * did; the two are now consistent.
 *
 * Neither `addLabel` nor `imageAdd` carries a leading "+" any more: the
 * design's text nodes read exactly "Hashtag" and "Image"
 * (`;662:8911;186:2760` / `;662:9133;186:2760`), and the plus is the
 * `MM_MEDIA_Plus` icon. Keeping it in the string too rendered two.
 *
 * No design node shows an ADDED chip: this frame's Tag Group holds only the
 * trigger button (0 hashtags in the mockup), and neither "Hastag group"
 * (`zOkcd82aJ4`) nor the filled-error frame (`5c7PkAibyD`) carries node
 * styles, so MCP has nothing to read. The chip therefore follows the
 * reviewed reference screenshot of the filled modal: the SAME pill the
 * "+ Hashtag" button beside it already is — white ground, `#998C5F` border,
 * 8px radius — with dark text rather than a bare coloured text run.
 *
 * It is deliberately NOT `kudos-hashtag-list.tsx`'s red `#tag` run
 * (`text-[#D4271D]`): that styles a tag printed on a published CARD, whereas
 * this is an editable token in a form, and the red reads as an error next to
 * the field's real red validation message.
 *
 * The remove control is `MM_MEDIA_Close` (`214:3851`) — the plain dark X,
 * no badge — via the shared `IconClose` this repo already inlines for it
 * (`_components/icons/icon-close.tsx`, code-rules §5 DRY).
 *
 * NOT `MM_MEDIA_Close Tiny`'s red disc (`;662:9197;662:9287;186:1420`),
 * which an earlier pass borrowed from the image thumbnails F.2-F.5. That
 * badge belongs to a thumbnail: it has to stay legible on top of an
 * arbitrary photo, which is exactly why it carries its own filled circle.
 * A chip supplies its own white ground, so the disc buys nothing there and
 * reads as a second red alarm beside the field's red validation text.
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
  // Handed to the picker as its placement anchor — the panel hangs under
  // THIS field's trigger, which a document-wide selector could not guarantee.
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <KudosComposeField
      label={label}
      controlId={CONTROL_ID}
      fieldName="hashtags"
      required
      error={effectiveError}
      labelWidth={108}
    >
      {/* mm:I520:11647;662:8595 — `data-testid` is not for tests here: it is
          the boundary `KudosHashtagPicker`'s outside-click dismissal treats as
          "inside". Chips, their remove buttons, the "+ Hashtag" trigger and
          the panel are one control, so pressing any of them must not dismiss
          the panel out from under the press. */}
      <div
        data-testid="kudos-hashtag-field"
        className="relative flex w-full flex-wrap items-center gap-2"
      >
        {hashtags.map((tag, index) => (
          <div
            key={`${tag}-${index}`}
            data-testid="kudos-hashtag-chip"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-3 py-2 font-montserrat text-sm font-bold tracking-[0.5px] text-[#333]"
          >
            #{tag}
            <button
              type="button"
              data-testid="kudos-hashtag-remove"
              aria-label={removeLabelTemplate.replace("{tag}", tag)}
              onClick={() => onRemove(tag)}
              className="flex shrink-0 cursor-pointer items-center justify-center text-[#333] outline-none"
            >
              {/* mm:214:3851 MM_MEDIA_Close */}
              <IconClose aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        ))}
        {/* mm:I520:11647;662:8911 */}
        <button
          id={CONTROL_ID}
          ref={addButtonRef}
          type="button"
          data-testid="kudos-hashtag-add"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-disabled={limitReached ? "true" : undefined}
          aria-describedby={effectiveError ? "hashtags-error" : undefined}
          onClick={() => onPickerOpenChange(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1 text-[#999] aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
        >
          {/* mm:I520:11647;662:8911;186:2759 MM_MEDIA_Plus */}
          <IconPlus aria-hidden="true" className="h-6 w-6 shrink-0" />
          {/* mm:I520:11647;662:8911;186:2760 — ONE text node in Figma
              ("Hashtag\nTối đa 5  "), two copy strings here, stacked to the
              icon's right exactly as `Frame 483` lays them out. */}
          <span className="flex flex-col items-start font-montserrat text-[11px] leading-4 font-bold tracking-[0.5px]">
            <span>{addLabel}</span>
            <span>{limitNote}</span>
          </span>
        </button>
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
            anchorRef={addButtonRef}
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
