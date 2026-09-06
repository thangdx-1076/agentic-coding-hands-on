import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AwardCard } from "./award-card";
import { defaultHomeCopy } from "./home-copy";

const meta = {
  component: AwardCard,
  args: {
    detailLabel: defaultHomeCopy.kudos.detailLabel,
  },
  decorators: [
    (Story) => (
      <div style={{ background: "#00101A", padding: "32px", maxWidth: 336 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AwardCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Card mẫu (mm:2167:9075 "mms_C2.1_Top Talent Award") — 5 card còn lại
 * trong `AwardsSection` dùng chung component này, chỉ khác `item`.
 */
export const Default: Story = {
  args: {
    item: defaultHomeCopy.awards.items[0],
  },
};

/**
 * Mô tả dài hơn 2 dòng để chứng minh `line-clamp-2` (clarifications.md
 * § Nội dung tĩnh, C2.1.3) thực sự cắt bớt thay vì đẩy layout giãn ra.
 */
export const LongDescription: Story = {
  args: {
    item: {
      ...defaultHomeCopy.awards.items[2],
      description:
        "Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá, luôn đồng hành cùng đội nhóm vượt qua mọi thử thách trong suốt vòng đời dự án để mang lại giá trị tốt nhất cho khách hàng.",
    },
  },
};
