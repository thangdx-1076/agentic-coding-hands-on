import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudoMarkdownText } from "./kudo-markdown-text";

const meta = {
  title: "Kudos/KudoMarkdownText",
  component: KudoMarkdownText,
} satisfies Meta<typeof KudoMarkdownText>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No marker at all — must read identically to a plain text node (F007's
 * `kudos-card.tsx` regression contract, seed data has no marker). */
export const PlainText: Story = {
  args: { text: "Cảm ơn bạn rất nhiều vì đã hỗ trợ dự án!" },
};

export const Bold: Story = {
  args: { text: "Cảm ơn **sự chăm chỉ** của bạn" },
};

export const Italic: Story = {
  args: { text: "Cảm ơn *sự chăm chỉ* của bạn" },
};

export const Strike: Story = {
  args: { text: "~~Không~~ Có, bạn làm rất tốt" },
};

/** Two consecutive `"1. "` lines group into one `<ol>` with two `<li>`s —
 * `groupListItems` folds the `lineBreak` between them rather than leaving a
 * stray `<br>` between two `<li>`s. */
export const NumberedList: Story = {
  args: { text: "1. Luôn đúng deadline\n1. Chủ động hỗ trợ đồng đội" },
};

export const Quote: Story = {
  args: { text: "> Một câu nói truyền cảm hứng" },
};

export const Link: Story = {
  args: { text: "Xem thêm tại [trang chuẩn mực](https://example.com)" },
};

/** An unmatched `**`/unsafe-scheme link degrades to literal text — the
 * parser's own fallback, never a thrown error. */
export const UnmatchedMarker: Story = {
  args: {
    text: "Marker lẻ **chưa đóng và [link](javascript:alert(1)) không an toàn",
  },
};

/** A plain `\n` (no list/quote prefix) becomes a `<br>` — a deliberate part
 * of the markdown-subset contract (BR-005), distinct from the old plain-text
 * card content, which had no markers and no embedded newlines. */
export const MultiLine: Story = {
  args: { text: "Cảm ơn bạn đã hỗ trợ dự án.\nChúc bạn luôn thành công!" },
};

/** Bold + link + a numbered list together, in one content string. */
export const Combined: Story = {
  args: {
    text: "**Cảm ơn** vì đã giúp team:\n1. Review code nhanh\n1. Hướng dẫn tận tình\nXem thêm [tại đây](https://example.com)",
  },
};
