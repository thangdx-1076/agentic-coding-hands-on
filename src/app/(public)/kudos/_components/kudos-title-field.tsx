import type { KudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeField } from "./kudos-compose-field";

export type KudosTitleFieldProps = {
  copy: KudosComposeCopy;
  error?: string | null;
  value: string;
  onValueChange: (value: string) => void;
};

const CONTROL_ID = "kudos-title-input";
const FIELD_NAME = "title";

/**
 * mm:I520:11647;1688:10448 "Frame 552" — the "Danh hiệu" section
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2). This
 * node has **no row in the spec CSV and no test case among the 57 downloaded
 * cases**, but its label carries a real `*` child node — design is the
 * authority (clarifications.md § "Hai node có trong design nhưng KHÔNG có
 * trong spec"), so this is the compose form's 4th required field and C06 is
 * the sole binding contract for it.
 *
 * Label `Title` instance (mm:I520:11647;1688:10436, "Danh hiệu"). Input
 * `Button` instance (mm:I520:11647;1688:10437, placeholder "Dành tặng một
 * danh hiệu cho đồng đội", Montserrat 16px/700 `#999999`, border `#998C5F`,
 * radius 8px, 56px tall — same box styling as the recipient search input).
 * Its "IC" child instance shares the recipient field's icon component id but
 * carries no `MM_MEDIA_*` asset name and is absent from `list_media_nodes`;
 * the reference screenshot (`get_frame_image`) confirms this box renders as
 * a plain text input with no dropdown arrow, so no icon is rendered here.
 * Hint text node (mm:I520:11647;1688:10447, Montserrat 16px/700 `#999999`,
 * two literal lines: "Ví dụ: Người truyền động lực cho tôi." / "Danh hiệu sẽ
 * hiển thị làm tiêu đề Kudos của bạn." — verbatim, not translated).
 *
 * Figma models the label + input as a single row and the hint below it,
 * spanning a 672px section (measured via `get_node`). `KudosComposeField`
 * (phase 08, not owned by this phase) stacks label above `children` — same
 * deviation as `kudos-recipient-field.tsx` — so this renders label-above-
 * input instead of side-by-side. Flagged as a concern in the phase report,
 * not fixed here (outside this phase's file ownership).
 *
 * Purely presentational: `value`/`onValueChange` arrive from phase 07/13's
 * form state — this file owns no state.
 */
export function KudosTitleField({
  copy,
  error = null,
  value,
  onValueChange,
}: KudosTitleFieldProps) {
  return (
    <KudosComposeField
      label={copy.titleLabel}
      controlId={CONTROL_ID}
      fieldName={FIELD_NAME}
      required
      error={error}
    >
      {/* mm:I520:11647;1688:10448 */}
      <div
        data-testid="kudos-title-field"
        className="flex w-full flex-col gap-2"
      >
        {/* mm:I520:11647;1688:10437 */}
        <input
          id={CONTROL_ID}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={copy.titlePlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${FIELD_NAME}-error` : undefined}
          data-testid={CONTROL_ID}
          className="w-full rounded-lg border border-[#998C5F] bg-white px-6 py-4 font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-login-button-text placeholder:text-[#999999] focus:outline-none"
        />
        {/* mm:I520:11647;1688:10447 */}
        <p
          data-testid="kudos-title-hint"
          className="font-montserrat text-base leading-6 font-bold tracking-[0.15px] text-[#999999]"
        >
          <span>{copy.titleHintExample}</span>
          <br />
          <span>{copy.titleHintUsage}</span>
        </p>
      </div>
    </KudosComposeField>
  );
}
