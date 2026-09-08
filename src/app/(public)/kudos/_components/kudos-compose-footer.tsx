import type { SVGProps } from "react";

import { IconClose } from "./kudos-compose-icons";

export type KudosComposeFooterProps = {
  cancelLabel: string;
  submitLabel: string;
  submittingLabel: string;
  /** Whether the 4 required fields (Người nhận, Danh hiệu, Nội dung,
   * Hashtag — clarifications.md § "Hai node có trong design nhưng KHÔNG có
   * trong spec") currently all validate. Drives the visual/`aria-disabled`
   * state only; the click handler still always fires (AD-1). */
  canSubmit: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

/**
 * mm:I520:11647;520:9905 (H) footer — Hủy (H.1) + Gửi (H.2)
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 * Both buttons render TEXT then ICON, matching the actual node child order
 * (`get_node` on H.1/H.2's children) rather than the CSV's generic
 * `icon_text` `buttonType` label.
 *
 * AD-1 (plan.md § "Quyết định chốt"): `Gửi` uses `aria-disabled`, NEVER the
 * `disabled` attribute — FR-402/DEC-002/ID-56 require clicking a disabled
 * `Gửi` to still surface per-field errors, which a real `disabled` button
 * can never do (it swallows the click entirely). `onSubmit` is therefore
 * always wired, unconditionally.
 *
 * The `submitting` spinner reuses `google-login-button.tsx`'s exact pattern
 * (`animate-spin` ring, same `login-button`/`login-button-text` tokens) —
 * no design node covers a loading state for `Gửi`, and this is the only
 * spinner precedent in the repo.
 */
export function KudosComposeFooter({
  cancelLabel,
  submitLabel,
  submittingLabel,
  canSubmit,
  submitting = false,
  onCancel,
  onSubmit,
}: KudosComposeFooterProps) {
  const disabled = submitting || !canSubmit;

  return (
    // mm:I520:11647;520:9905
    <div className="flex w-full shrink-0 items-start justify-start gap-6">
      {/* mm:I520:11647;520:9906 (H.1) */}
      <button
        type="button"
        data-testid="kudos-compose-cancel"
        onClick={onCancel}
        className="flex items-center gap-2 self-stretch rounded border border-[#998C5F] bg-login-button/10 px-10 py-4 font-montserrat text-base font-bold tracking-[0.15px] text-login-button-text transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-login-button/20 focus-visible:ring-2 focus-visible:ring-login-button-text focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E1] focus-visible:outline-none"
      >
        <span>{cancelLabel}</span>
        {/* mm:I520:11647;520:9906;186:2761 MM_MEDIA_Close */}
        <IconClose aria-hidden="true" className="h-6 w-6 shrink-0" />
      </button>

      {/* mm:I520:11647;520:9907 (H.2) */}
      <button
        type="button"
        data-testid="kudos-compose-submit"
        aria-disabled={disabled ? "true" : undefined}
        aria-busy={submitting}
        onClick={onSubmit}
        className="flex flex-1 items-center justify-center gap-2 self-stretch rounded-lg bg-login-button p-4 font-montserrat text-[22px] leading-7 font-bold text-login-button-text transition-opacity duration-200 ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-login-button-text focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E1] focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
      >
        <span>{submitting ? submittingLabel : submitLabel}</span>
        {submitting ? (
          <span
            aria-hidden="true"
            className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-login-button-text/30 border-t-login-button-text"
          />
        ) : (
          // mm:I520:11647;520:9907;186:1766 MM_MEDIA_Send
          <IconSend aria-hidden="true" className="h-6 w-6 shrink-0" />
        )}
      </button>
    </div>
  );
}

/** `MM_MEDIA_Send` inlined with `currentColor` — same path data as
 * `kudos-card.tsx`'s local `IconSend` (same Figma component, `178:1020`
 * set), duplicated rather than imported per that file's own precedent (no
 * shared `icons/` directory in this phase's ownership). */
function IconSend(props: SVGProps<SVGSVGElement>) {
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
        d="M2.9043 20.4797V4.47974L21.9043 12.4797M4.9043 17.4797L16.7543 12.4797L4.9043 7.47974V10.9797L10.9043 12.4797L4.9043 13.9797M4.9043 17.4797V7.47974V13.9797V17.4797Z"
        fill="currentColor"
      />
    </svg>
  );
}
