import type { SVGProps } from "react";

import { formatKudoTime } from "../_utils/format-kudo-time";
import { defaultKudosCopy, type KudosCopy } from "../_shared/kudos-copy";

import { KudoMarkdownText } from "./kudo-markdown-text";
import { KudosCardActions } from "./kudos-card-actions";
import { KudosCardPerson } from "./kudos-card-person";
import { KudosFeaturedHashtag, KudosHashtagList } from "./kudos-hashtag-list";
import { KudosImageStrip } from "./kudos-image-strip";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

export type KudosCardVariant = "highlight" | "feed";

export type KudosCardProps = {
  card: KudosCardModel;
  variant: KudosCardVariant;
  hearted: boolean;
  heartDisabled?: boolean;
  heartTitle?: string;
  /** Renders `data-sender-id="self"` for C26's own-kudo selector — decided
   * by the caller (session data), never inferred here (no I/O § scope). */
  isOwnKudo?: boolean;
  copy?: KudosCopy;
  onToggleHeart?: () => void;
  onSelectHashtag?: (tag: string) => void;
  onCopyLink?: () => void;
};

const LINE_CLAMP: Record<KudosCardVariant, string> = {
  highlight: "line-clamp-3",
  feed: "line-clamp-5",
};

/**
 * mm:B.3_KUDO - Highlight (`2940:13465`) / C.3_KUDO Post (`3127:21871`).
 * ONE shared card — `variant` only swaps `maxLines` (BR-005, § 4.4) and
 * whether the image strip renders. Splitting this into two components would
 * fork highlight/feed apart on the very next edit (phase-07 Key Insight).
 * No I/O: every value the card needs (hearted state, viewer identity,
 * callbacks) arrives via props from the caller (phase 09/11/13).
 */
export function KudosCard({
  card,
  variant,
  hearted,
  heartDisabled = false,
  heartTitle,
  isOwnKudo = false,
  copy = defaultKudosCopy,
  onToggleHeart,
  onSelectHashtag,
  onCopyLink,
}: KudosCardProps) {
  const featuredTag = card.hashtags[0];

  return (
    <div
      data-testid="kudos-card"
      data-variant={variant}
      // `card.sender.id` is `null` for an anonymous kudo (AD-2); React omits
      // a `null` attribute entirely rather than rendering the literal string
      // "null", so this expression needs no extra branch for that case.
      data-sender-id={isOwnKudo ? "self" : card.sender.id}
      className={`flex w-full flex-col gap-4 rounded-2xl bg-[#FFF8E1] ${
        variant === "highlight"
          ? "border-4 border-login-button p-6 pb-4"
          : "rounded-3xl p-10 pb-4"
      }`}
    >
      {/* mm:Frame 482/Info user — sender, mũi tên, receiver */}
      <div className="flex w-full flex-row items-start justify-between gap-6">
        <KudosCardPerson person={card.sender} personRole="sender" />
        {/* mm:B.3.4_Icon mũi tên / C.3.2_Icon sent (MM_MEDIA_Send, 32x32) */}
        <IconSend
          aria-hidden="true"
          className="mt-4 h-8 w-8 shrink-0 text-login-button-text"
        />
        <KudosCardPerson person={card.receiver} personRole="receiver" />
      </div>

      <div className="h-px w-full bg-login-button" />

      <div className="flex w-full flex-col gap-4">
        {/* mm:B.4.1_Thời gian đăng / C.3.4_Time — HH:mm - MM/DD/YYYY */}
        <p
          data-testid="kudos-card-time"
          className="font-montserrat text-base font-bold tracking-[0.5px] text-[#999999]"
        >
          {formatKudoTime(card.createdAt)}
        </p>

        {featuredTag ? (
          <KudosFeaturedHashtag
            tag={featuredTag}
            showIcon={variant === "feed"}
            onSelect={onSelectHashtag}
          />
        ) : null}

        {/* mm:B.4.2_Nội dung / C.3.5_Content — 3 (highlight) or 5 (feed) lines.
         * Renders the markdown-subset a toolbar marker (`**`/`*`/`~~`/`1. `/
         * `> `/`[text](url)`) may produce (BR-005, clarifications.md §
         * toolbar) — plain content with no marker renders identically to the
         * old `{card.content}` text node. */}
        <div
          data-testid="kudos-card-content"
          className={`w-full rounded-xl border border-login-button/60 bg-login-button/40 px-6 py-4 font-montserrat text-xl leading-8 font-bold text-justify text-login-button-text ${LINE_CLAMP[variant]}`}
        >
          <KudoMarkdownText text={card.content} />
        </div>

        {variant === "feed" ? (
          <KudosImageStrip imageUrls={card.imageUrls} />
        ) : null}

        <KudosHashtagList hashtags={card.hashtags} onSelect={onSelectHashtag} />
      </div>

      <div className="h-px w-full bg-login-button" />

      <KudosCardActions
        hearted={hearted}
        heartDisabled={heartDisabled}
        heartTitle={heartTitle}
        heartCount={card.heartCount}
        onToggleHeart={onToggleHeart}
        onCopyLink={onCopyLink}
        copy={copy}
        showDetail={variant === "highlight"}
      />
    </div>
  );
}

/**
 * `MM_MEDIA_Send` (`I3127:21871;256:5147` / `I2940:13465;335:9445`) inlined
 * with `currentColor` (code-rules 2a) — `public/kudos/icon-send-arrow.svg`
 * ships with a baked `fill="white"` that renders invisible on this card's
 * cream background; `--Details-Text-Primary-2`/`login-button-text`
 * (`#00101a`) is the dark ink color every other text element on this card
 * already uses. Used once here, so it stays local rather than a shared
 * icon file (file ownership doesn't include an `icons/` directory).
 */
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
