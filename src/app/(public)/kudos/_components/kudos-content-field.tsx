"use client";

import { useRef } from "react";

import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import type { FormatKind } from "./kudos-format-toolbar";
import { KudosFormatToolbar } from "./kudos-format-toolbar";
import type { KudosSunnerOption } from "./kudos-sunner-options";
import { KudosSunnerOptions } from "./kudos-sunner-options";

const CONTROL_ID = "kudos-content-textarea";
const FIELD_NAME = "content";

export type KudosContentFieldCopy = Pick<
  KudosComposeCopy,
  | "contentLabel"
  | "contentPlaceholder"
  | "contentHint"
  | "standardsLink"
  | "toolbar"
  | "recipientEmpty"
  | "recipientLoading"
>;

export type KudosContentFieldProps = {
  copy: KudosContentFieldCopy;
  value: string;
  onChange: (value: string) => void;
  /** Ref callback (not a `RefObject`) — phase-07's hook reads
   * `selectionStart`/`selectionEnd` off the real node and writes the
   * selection range back there, never in this presentational component. */
  registerTextarea: (node: HTMLTextAreaElement | null) => void;
  onFormat: (kind: FormatKind) => void;
  error?: string | null;
  mentionOpen?: boolean;
  mentionOptions?: KudosSunnerOption[];
  mentionLoading?: boolean;
  onMentionSelect?: (option: KudosSunnerOption) => void;
};

/**
 * mm:I520:11647;520:9875 ("Nhập kudo") — format toolbar (C) + content
 * textarea (D) + mention hint (D.1)
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 *
 * A plain `<textarea>`, not a content-editable region/rich editor — the frame
 * draws a textarea, and formatting shows up on the kudo card after submit,
 * not inline while typing (clarifications.md § "Toolbar định dạng"). No
 * character counter: D.1's `maxLength` column is empty and the frame draws
 * only the one hint line (clarifications.md § "Bộ đếm ký tự"; C11 asserts
 * `kudos-content-counter` does not exist).
 *
 * Composes `KudosFormatToolbar` internally (rather than leaving the dialog
 * to place it as a sibling) so the toolbar row and textarea share one
 * visual border box exactly like the two Figma frames stack with zero gap
 * between them — the toolbar rounds its own top-left/top-right corners, the
 * textarea rounds its own bottom corners (see each component's border
 * classes); no extra wrapper `<div>` carries a border of its own.
 *
 * Deliberately does NOT use `KudosComposeField` (unlike the recipient/title
 * fields), even though this phase's own architecture notes said to: node D
 * (`I520:11647;520:9886`) has no sibling label node anywhere in its tree —
 * `get_design_item_image` on D crops to just the bordered textarea, and its
 * parent "Nhập nội dung" has exactly two children (toolbar C, textarea D),
 * no label. Design is the authority (Critical Rule 1) over the architecture
 * note, so wrapping in the shared shell here would render a "Nội dung" label
 * the frame never draws. `copy.contentLabel` still exists for the
 * `aria-label` below; the error paragraph duplicates `KudosComposeField`'s
 * exact markup/classes so `[data-field="content"]` (C20) and the visual
 * error style stay consistent with every other field.
 *
 * The `@`-mention list reuses phase-08's `KudosSunnerOptions` with
 * `listboxTestId="kudos-mention-options"` / `optionTestId="kudos-mention-option"`
 * (C27) — same shape as the recipient dropdown, different trigger. This
 * component only renders it when `mentionOpen`; detecting the `@` trigger
 * and computing when to open it lives in phase-07's hook.
 */
export function KudosContentField({
  copy,
  value,
  onChange,
  registerTextarea,
  onFormat,
  error = null,
  mentionOpen = false,
  mentionOptions = [],
  mentionLoading = false,
  onMentionSelect,
}: KudosContentFieldProps) {
  const errorId = `${FIELD_NAME}-error`;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col">
        {/* mm:I520:11647;520:9877 */}
        <KudosFormatToolbar
          copy={copy.toolbar}
          standardsLabel={copy.standardsLink}
          onFormat={onFormat}
        />
        <div className="relative w-full">
          {/* mm:I520:11647;520:9886 */}
          <textarea
            id={CONTROL_ID}
            data-testid={CONTROL_ID}
            ref={(node) => {
              // Two consumers for one node: the compose form needs it for
              // formatting/caret work (`registerTextarea`), and the mention
              // list anchors its floating panel to it.
              textareaRef.current = node;
              registerTextarea(node);
            }}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={copy.contentPlaceholder}
            aria-label={copy.contentLabel}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`h-[200px] min-h-[120px] w-full resize-none overflow-y-auto rounded-b-lg border bg-white pl-6 font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-login-button-text placeholder:text-[#999999] ${
              error ? "border-[#FF8A80]" : "border-[#998C5F]"
            }`}
          />
          {mentionOpen ? (
            <KudosSunnerOptions
              anchorRef={textareaRef}
              label={copy.contentLabel}
              options={mentionOptions}
              loading={mentionLoading}
              loadingLabel={copy.recipientLoading}
              emptyLabel={copy.recipientEmpty}
              onSelect={(option) => onMentionSelect?.(option)}
              listboxTestId="kudos-mention-options"
              optionTestId="kudos-mention-option"
            />
          ) : null}
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          id={errorId}
          data-testid="kudos-field-error"
          data-field={FIELD_NAME}
          className="font-montserrat text-sm leading-5 font-bold text-[#FF8A80]"
        >
          {error}
        </p>
      ) : null}
      {/* mm:I520:11647;520:9887 (D.1) */}
      <p
        data-testid="kudos-content-hint"
        className="font-montserrat text-base leading-6 font-bold tracking-[0.5px] text-login-button-text"
      >
        {copy.contentHint}
      </p>
    </div>
  );
}
