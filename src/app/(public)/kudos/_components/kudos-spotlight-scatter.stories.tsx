import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosSpotlightScatter } from "./kudos-spotlight-scatter";

/** Real receiver names, kept from the design's own scatter content per
 * clarifications.md § Spotlight — NOT invented fixture data. */
const sevenNames = [
  "Đỗ hoàng Hiệp",
  "Dương thúy An",
  "Mai phương Thúy",
  "Lê Kiều Trang",
  "Nguyễn Văn Quy",
  "Nguyễn Bá Chức",
  "Nguyễn Hoàng Linh",
];

const meta = {
  title: "Kudos/KudosSpotlightScatter",
  component: KudosSpotlightScatter,
  decorators: [
    (Story) => (
      <div className="relative h-[548px] w-[1157px] overflow-hidden rounded-[47px] border border-[#998C5F] bg-[#00101a]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KudosSpotlightScatter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fewer real names than design slots (106) → the 3 real names cycle
 * (`names[index % names.length]`) to cover all 106 slots, matching the
 * design's own word-cloud density rather than leaving most of the card
 * empty. */
export const ThreeReceivers: Story = {
  args: {
    names: sevenNames.slice(0, 3),
    matched: new Set(),
    emptyMessage: "Chưa có Sunner nào được ghi nhận.",
  },
};

/** All 7 real mock names, matching the design's own repeated-name pool. */
export const SevenReceivers: Story = {
  args: {
    names: sevenNames,
    matched: new Set(),
    emptyMessage: "Chưa có Sunner nào được ghi nhận.",
  },
};

/** Search matched "Đỗ hoàng Hiệp" — that name's span carries `data-matched`
 * and the coral highlight (C21); no other span does. */
export const SearchMatched: Story = {
  args: {
    names: sevenNames,
    matched: new Set(["Đỗ hoàng Hiệp"]),
    emptyMessage: "Chưa có Sunner nào được ghi nhận.",
  },
};

/** No real receivers → empty-state message, not an empty box (TC loading/
 * empty state). */
export const Empty: Story = {
  args: {
    names: [],
    matched: new Set(),
    emptyMessage: "Chưa có Sunner nào được ghi nhận.",
  },
};
