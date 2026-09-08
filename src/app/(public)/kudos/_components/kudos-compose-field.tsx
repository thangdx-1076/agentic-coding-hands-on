import type { ReactNode } from "react";

export type KudosComposeFieldLayout = "row" | "stack";

export type KudosComposeFieldProps = {
  label: string;
  /**
   * The DOM `id` of the caller's own focusable control (rendered inside
   * `children`). Required so the visible `<label>` this shell renders can be
   * genuinely associated (`htmlFor`) — this shell cannot reach into an
   * opaque `children` subtree to add attributes itself, and C06 asserts a
   * real `<label>` element exists, so an unassociated one isn't an option
   * (`jsx-a11y/label-has-associated-control`).
   */
  controlId: string;
  /**
   * `data-field` value for the error paragraph AND, combined with the
   * `-error` suffix, the id the caller's own control must set as its
   * `aria-describedby` when `error` is set (matches the DOM contract's
   * `recipient|title|content|hashtags|anonymousName|images` vocabulary).
   */
  fieldName: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
  /**
   * `"row"` (default) — label sits beside the control in a fixed-width
   * column, matching the frame's actual layout for Người nhận
   * (`I520:11647;520:9871`, `alignItems: center`), Danh hiệu
   * (`I520:11647;1688:10448`), and Hashtag/Image
   * (`I520:11647;520:9890`/`520:9896`) — all 4 rows measure `gap: 16px`
   * between label and control (`get_node` on each row). `"stack"` is the
   * shell's original behaviour (label above, full-width) — matches the
   * Content section (`I520:11647;520:9874`), which has no left label at
   * all; toolbar + textarea span the full row width.
   */
  layout?: KudosComposeFieldLayout;
  /**
   * Label-column MIN width in px, used only when `layout="row"`. Each row
   * measures differently — 146 for Recipient (`mms_B.1_Title`, `520:9872`),
   * 139 for Danh hiệu (`1688:10436`), 108 for Hashtag (`mms_E.1_Title`,
   * `520:9891`), 74 for Image (`mms_F.1_Title`, `520:9897`) — so this is a
   * per-instance prop, not a constant baked into the shell. Applied as
   * `min-width`, not `width`: some measured values (Hashtag's 108) are
   * narrower than `label + " *"` at this typography, and the frame renders
   * every label on one line — a hard `width` would clip/wrap it (visual
   * evidence `05-validation-errors.png`), so the column grows past
   * `labelWidth` when the text itself is wider, combined with
   * `whitespace-nowrap` below. Omit for a content-sized column (`shrink-0`,
   * no minimum).
   */
  labelWidth?: number;
};

const LABEL_CLASS =
  "font-montserrat text-[22px] leading-7 font-bold text-login-button-text";

/**
 * Shared label + required-marker + error shell for every field in the Kudos
 * compose form. No design node covers the error state — frame `5c7PkAibyD`
 * ("Viết KUDO - Lỗi chưa điền đủ thông tin") is design `in_progress` with no
 * node data (clarifications.md § "Frame phụ trợ"). Follows
 * `login-error-alert.tsx`'s pattern instead: `role="alert"`, the same red
 * (`#FF8A80`), renders nothing when there's no error. `aria-invalid` /
 * `aria-describedby` have no prior precedent in this repo (scout report §2)
 * — this phase establishes it via the `controlId`/`fieldName` id contract
 * above, since those attributes belong on the caller's own control, not on
 * anything this shell renders itself.
 *
 * Label typography (22px/700, line-height 28px) and the required asterisk's
 * red (`#CF1322`) are both measured off the actual `*`/text nodes shared by
 * every label instance (`…;416:5534`/`…;416:5547` under each row's `Title`
 * component, `componentId 416:5550`) — not the ink color the shell used to
 * inherit.
 */
export function KudosComposeField({
  label,
  controlId,
  fieldName,
  required = false,
  error = null,
  children,
  layout = "row",
  labelWidth,
}: KudosComposeFieldProps) {
  const errorId = `${fieldName}-error`;

  const labelEl = (
    <label
      htmlFor={controlId}
      style={
        layout === "row" && labelWidth !== undefined
          ? { minWidth: `${labelWidth}px` }
          : undefined
      }
      className={`${LABEL_CLASS} whitespace-nowrap ${layout === "row" ? "shrink-0" : ""}`}
    >
      {label}
      {required ? (
        <span aria-hidden="true" className="text-[#CF1322]">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );

  const errorEl = error ? (
    <p
      role="alert"
      id={errorId}
      data-testid="kudos-field-error"
      data-field={fieldName}
      className="font-montserrat text-sm leading-5 font-bold text-[#FF8A80]"
    >
      {error}
    </p>
  ) : null;

  if (layout === "row") {
    return (
      <div className="flex w-full items-start gap-4">
        {labelEl}
        <div className="flex flex-1 flex-col gap-2">
          {children}
          {errorEl}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {labelEl}
      {children}
      {errorEl}
    </div>
  );
}
