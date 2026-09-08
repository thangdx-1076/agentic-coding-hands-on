"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";

import { IconClose } from "../../../_components/icons/icon-close";
import {
  secretBoxBadgeAsset,
  secretBoxBadgeAssetLabel,
  SECRET_BOX_BADGE_ASSET_SIZE,
  type BadgeKey,
} from "../_utils/secret-box-badge-asset";

export type SecretBoxDialogCopy = {
  /** mm:1466:7678 (A) — unopened-state title, verbatim from the rendered
   * frame ("KHÁM PHÁ SECRET BOX CỦA BẠN"). */
  titleUnopened: string;
  /** mm:1466:7678 (A) — revealed state, verbatim from spec row A + all 19
   * test cases ("MỞ SECRET BOX THÀNH CÔNG"); no frame renders this state
   * (clarifications.md § "Xung đột copy tiêu đề"). */
  titleRevealed: string;
  /** mm:1466:7681 (B) — "Click vào box để tiếp tục mở". */
  instruction: string;
  /** mm:1466:7690 (D, label half) — "Secretbox chưa mở". */
  label: string;
  /** Accessible name for the icon-only X button (no visible text). */
  close: string;
};

export type SecretBoxDialogProps = {
  /** Ref callback for the `<dialog>` node — `useSecretBoxDialog` reads it
   * to call `showModal()`/`close()`. This component owns no ref itself. */
  registerDialog: (node: HTMLDialogElement | null) => void;
  copy: SecretBoxDialogCopy;
  /** Selects `copy.titleUnopened`/`titleRevealed` only — everything else
   * below is driven by `canOpen`/`unopenedCount`/`awardedBadgeKey`. */
  state: "unopened" | "revealed";
  unopenedCount: number;
  /** `null` until a box has been opened this session. */
  awardedBadgeKey: BadgeKey | null;
  /** Server-derived `unopenedCount > 0` — independent of `busy`. */
  canOpen: boolean;
  /** Transient in-flight lock; affects only the box's `disabled`, never
   * instruction visibility. */
  busy: boolean;
  onOpenBox: () => void;
  onClose: () => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

function padCount(count: number): string {
  return String(Math.max(count, 0)).padStart(2, "0");
}

/**
 * mm:1466:7676 "Open secret box- chưa mở" frame
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM).
 *
 * Same `<dialog>` lifecycle contract as `kudos-compose-dialog.tsx`: no
 * `useState`/`useEffect`/`showModal()` here, no `open` attribute ever
 * rendered — only `useSecretBoxDialog` touches `.showModal()`/`.close()`.
 * `open:flex` + `m-auto` guard the same 2 traps documented in full there
 * (UA `display:none` vs an unconditional `flex`; Preflight's `margin:0` vs
 * `dialog:modal`'s own `margin:auto`) — not repeated here (200-line budget).
 *
 * The 2 title states share ALL other markup: the box, its 3 image layers,
 * the instruction line, and the counter are driven directly by `canOpen`/
 * `unopenedCount`/`awardedBadgeKey`, not by `state` (e.g. "revealed" with
 * boxes remaining still shows the instruction and a clickable box). A
 * state-split into 2 panel files would duplicate that shared conditional
 * logic in both, so this stays one component instead.
 */
export function SecretBoxDialog({
  registerDialog,
  copy,
  state,
  unopenedCount,
  awardedBadgeKey,
  canOpen,
  busy,
  onOpenBox,
  onClose,
  onCancel,
}: SecretBoxDialogProps) {
  return (
    // mm:1466:7676
    <dialog
      ref={registerDialog}
      data-testid="secret-box-dialog"
      aria-labelledby="secret-box-title"
      onCancel={onCancel}
      className="m-auto w-163 flex-col items-center gap-5.5 rounded-[13px] bg-login-background px-3.25 py-6 open:flex backdrop:bg-login-background/80"
    >
      {/* mm:1466:7677 */}
      <div className="relative flex w-full shrink-0 items-center">
        {/* mm:1466:7678 (A) */}
        <h2
          id="secret-box-title"
          data-testid="secret-box-title"
          className="w-full text-center font-montserrat text-[25px] leading-8 font-bold text-login-button"
        >
          {state === "revealed" ? copy.titleRevealed : copy.titleUnopened}
        </h2>
        {/* mm:1466:7679 MM_MEDIA_Close (same instance as IconClose, 214:3851) */}
        <button
          type="button"
          data-testid="secret-box-close"
          aria-label={copy.close}
          onClick={onClose}
          className="absolute top-1/2 right-0 h-4.75 w-4.75 shrink-0 -translate-y-1/2 text-white transition-opacity duration-200 ease-out motion-reduce:transition-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-login-button focus-visible:outline-none"
        >
          <IconClose className="h-4.75 w-4.75" aria-hidden="true" />
        </button>
      </div>

      {/* mm:1466:7680 */}
      <div
        aria-hidden="true"
        className="h-px w-full shrink-0 bg-login-divider"
      />

      {/* mm:1466:7681 (B) — hidden entirely when nothing is left to open. */}
      {canOpen && (
        <p
          data-testid="secret-box-instruction"
          className="shrink-0 text-center font-montserrat text-[13px] leading-4.75 font-bold tracking-[0.4px] text-white"
        >
          {copy.instruction}
        </p>
      )}

      {/* mm:1466:7684 (C) — child "about link" (1466:7687) intentionally
          skipped: empty frame, no children, no MM_MEDIA_* asset, invisible
          in the rendered frame image. */}
      <button
        type="button"
        data-testid="secret-box-box"
        disabled={!canOpen || busy}
        onClick={onOpenBox}
        className="relative h-139.25 w-139.25 shrink-0 disabled:cursor-not-allowed"
      >
        {/* mm:1466:7685 — background position/size copied verbatim from
            the node's own Figma fill crop, not guessed. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "url(/standards/secret-box-sparkle.png) -102.944px -102.487px / 138.527% 138.527% no-repeat",
          }}
        />
        {/* mm:1466:7686 MM_MEDIA_box quà chưa mở */}
        <Image
          src="/standards/secret-box-closed.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="557px"
          className="object-cover"
        />
        {/* No MM_MEDIA_* node exists for the revealed state (BR-004) — the
            badge is the only reveal artwork, at its untouched 64×64. */}
        {awardedBadgeKey && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Image
              data-testid="secret-box-badge"
              src={secretBoxBadgeAsset(awardedBadgeKey).asset}
              alt={secretBoxBadgeAssetLabel(awardedBadgeKey)}
              width={SECRET_BOX_BADGE_ASSET_SIZE}
              height={SECRET_BOX_BADGE_ASSET_SIZE}
            />
          </div>
        )}
      </button>

      {/* mm:1466:7688 */}
      <div
        aria-hidden="true"
        className="h-px w-full shrink-0 bg-login-divider"
      />

      {/* mm:1466:7689 (D) */}
      <div className="flex shrink-0 items-center gap-1.5">
        <p
          data-testid="secret-box-label"
          className="font-montserrat text-[13px] leading-4.75 font-bold tracking-[0.4px] text-white"
        >
          {copy.label}
        </p>
        <span
          data-testid="secret-box-counter"
          className="font-montserrat text-[29px] leading-8.75 font-bold text-login-button"
        >
          {padCount(unopenedCount)}
        </span>
      </div>
    </dialog>
  );
}
