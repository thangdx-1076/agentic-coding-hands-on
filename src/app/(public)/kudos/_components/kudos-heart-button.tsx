"use client";

import type { SVGProps } from "react";

export type KudosHeartButtonProps = {
  hearted: boolean;
  disabled?: boolean;
  /** Required by the caller whenever `disabled` is `true` (C22: anonymous
   * viewers must see a `title` inviting sign-in; BR-002 for a self-sent
   * kudo has no dedicated copy string yet). This component never invents
   * one — the 3 states (`hearted`/`disabled`/`title`) are all decided by
   * the caller, never inferred here (phase-07 Key Insight). */
  title?: string;
  count: number;
  /** `KudosCopy.heartLabel` template, e.g. `"{count} lượt tim"` — used ONLY
   * for `aria-label`; the visible count stays a plain integer (C25 parses
   * it with `parseInt`). */
  heartLabel: string;
  onToggle?: () => void;
};

/**
 * mm:C.4.1_Hearts (`I3127:21871;256:5175`) / B.4.4 "Hearts"
 * (`I2940:13465;335:9462`) — count then icon, in that DOM order (matches
 * the frame's child order). Inlined with `currentColor` (code-rules 2a) so
 * the two states can each carry their own color.
 *
 * Hearted/red is a confirmed design value: `query_component("Heart")`
 * across the whole frame (`get_node` on `I3127:21871;256:5171` and every
 * other `MM_MEDIA_Heart` instance, 7 total across both highlight and feed
 * cards) returns the SAME `componentId: 256:5162` everywhere, whose
 * exported path fill is `#D4271D` — that is a real, confirmed value.
 *
 * KHÔNG CÓ TRONG DESIGN: the "chưa tim" gray state has no second component,
 * no variant, and no override anywhere in this MoMorph file — every
 * instance in the file is the same red component. `#999999` below is this
 * screen's existing "secondary/muted" text color
 * (`--Details-Text-Secondary-2`, already used for `kudos-card-time` and
 * `kudos-card-person`'s department label), reused here as the closest
 * defensible placeholder — NOT a value read off the heart icon itself.
 * Flagged for design confirmation (see phase-07 report's Concerns).
 */
export function KudosHeartButton({
  hearted,
  disabled = false,
  title,
  count,
  heartLabel,
  onToggle,
}: KudosHeartButtonProps) {
  return (
    <button
      type="button"
      data-testid="kudos-card-heart"
      data-hearted={hearted}
      disabled={disabled}
      title={disabled ? title : undefined}
      aria-label={heartLabel.replace("{count}", String(count))}
      onClick={onToggle}
      className="flex items-center gap-1 border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        data-testid="kudos-card-heart-count"
        className="font-montserrat text-2xl font-bold text-login-button-text"
      >
        {count}
      </span>
      <IconHeart
        aria-hidden="true"
        className={`h-8 w-8 ${hearted ? "text-[#D4271D]" : "text-[#999999]"}`}
      />
    </button>
  );
}

/**
 * `MM_MEDIA_Heart` (`I3127:21871;256:5171`) inlined with `currentColor`
 * (code-rules 2a) — the exported `public/kudos/icon-heart.svg` bakes the
 * confirmed red fill (`#D4271D`) into the file itself, which would make the
 * "chưa tim" gray state impossible to express with `<img>`/CSS filters
 * without approximating a color the design never specifies. See the
 * `KudosHeartButton` doc comment above for what is confirmed vs. inferred.
 */
function IconHeart(props: SVGProps<SVGSVGElement>) {
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
        d="M12.3364 21.1076L10.8864 19.7876C5.73643 15.1176 2.33643 12.0276 2.33643 8.25757C2.33643 5.16757 4.75643 2.75757 7.83643 2.75757C9.57643 2.75757 11.2464 3.56757 12.3364 4.83757C13.4264 3.56757 15.0964 2.75757 16.8364 2.75757C19.9164 2.75757 22.3364 5.16757 22.3364 8.25757C22.3364 12.0276 18.9364 15.1176 13.7864 19.7876L12.3364 21.1076Z"
        fill="currentColor"
      />
    </svg>
  );
}
