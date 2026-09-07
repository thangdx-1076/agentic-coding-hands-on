"use client";

import type { SVGProps } from "react";

export type KudosHashtagListProps = {
  hashtags: string[];
  onSelect?: (tag: string) => void;
};

const MAX_HASHTAGS = 5;

/**
 * mm:B.4.3_Hashtag (`I2940:13465;335:9458`) / C.3.7_Hash tag
 * (`I3127:21871;256:5158`) — the design renders every tag as ONE continuous
 * text run ("#Dedicated #Inspring #Dedicated..."), but C14/C16/BR-004
 * require each tag to be individually clickable, so this splits that run
 * into one `<button>` per tag styled with no visible button chrome (reads as
 * plain inline text, matching the frame). Capped at 5 (BR-006); a literal
 * "..." marks truncation — CSS `text-overflow: ellipsis` only clips a single
 * element's own overflow, not a row of sibling buttons.
 */
export function KudosHashtagList({
  hashtags,
  onSelect,
}: KudosHashtagListProps) {
  const visible = hashtags.slice(0, MAX_HASHTAGS);
  const truncated = hashtags.length > MAX_HASHTAGS;

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-row flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap">
      {visible.map((tag, index) => (
        <button
          key={`${tag}-${index}`}
          type="button"
          data-testid="kudos-hashtag"
          onClick={() => onSelect?.(tag)}
          className="shrink-0 border-0 bg-transparent p-0 font-montserrat text-base font-bold tracking-[0.5px] text-[#D4271D]"
        >
          #{tag}
        </button>
      ))}
      {truncated ? (
        <span className="shrink-0 font-montserrat text-base font-bold text-[#D4271D]">
          ...
        </span>
      ) : null}
    </div>
  );
}

export type KudosFeaturedHashtagProps = {
  tag: string;
  showIcon?: boolean;
  onSelect?: (tag: string) => void;
};

/**
 * mm:D.4_hashtag (`I3127:21871;2234:33038`) — one prominent tag row between
 * the timestamp and the content box, present in BOTH the feed
 * (`3127:21871`) and highlight (`I2940:13465;1810:19718`) node trees; only
 * the feed instance carries the `MM_MEDIA_Pen` child, so `showIcon` is
 * caller-controlled rather than inferred from a variant string here.
 * `KudosCard` has no separate "topic" field to draw from
 * (`src/dal/kudos.ts`'s `KudosCard` type), so this reads `hashtags[0]` —
 * same click-to-filter behavior the spec text for D.4 describes.
 */
export function KudosFeaturedHashtag({
  tag,
  showIcon = false,
  onSelect,
}: KudosFeaturedHashtagProps) {
  return (
    <button
      type="button"
      data-testid="kudos-hashtag"
      onClick={() => onSelect?.(tag)}
      className="flex w-full items-center justify-center gap-2 border-0 bg-transparent p-0 font-montserrat text-base font-bold tracking-[0.5px] text-login-button-text"
    >
      <span>{tag.toUpperCase()}</span>
      {showIcon ? (
        <IconPen aria-hidden="true" className="h-8 w-8 shrink-0" />
      ) : null}
    </button>
  );
}

/**
 * `MM_MEDIA_Pen` (`I3127:21871;2234:33040`) inlined with `currentColor`
 * (code-rules 2a) — `public/kudos/icon-pen.svg` ships with a baked
 * `fill="white"`, invisible against this card's cream background; inherits
 * `text-login-button-text` from the parent button. Used once in this file
 * (`kudos-compose-pill.tsx` inlines the same path independently — a
 * different segment/phase, not importable here per the `_shared`/private
 * folder ESLint boundary).
 */
function IconPen(props: SVGProps<SVGSVGElement>) {
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
        d="M20.8067 6.72951C21.1967 6.33951 21.1967 5.68951 20.8067 5.31951L18.4667 2.97951C18.0967 2.58951 17.4467 2.58951 17.0567 2.97951L15.2167 4.80951L18.9667 8.55951M3.09668 16.9395V20.6895H6.84668L17.9067 9.61951L14.1567 5.86951L3.09668 16.9395Z"
        fill="currentColor"
      />
    </svg>
  );
}
