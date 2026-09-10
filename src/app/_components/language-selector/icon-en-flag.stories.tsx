import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconEnFlag } from "./icon-en-flag";

const meta = {
  component: IconEnFlag,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconEnFlag>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Cờ Anh dùng cho tuỳ chọn `EN` trong bộ chọn ngôn ngữ (MoMorph `hUyaaugye2`
 * row A.2), đặt trên nền tối `#00101A` giống ngữ cảnh thật trong header —
 * cùng khung với [`icon-vn-flag.stories.tsx`](./icon-vn-flag.stories.tsx) để
 * hai lá cờ so được cạnh nhau.
 *
 * Trước phase 06 chỉ có cờ Việt Nam trong repo, nên trigger hiện cờ Việt Nam
 * cả khi đang ở locale `EN`. Story này tồn tại để lá cờ thứ hai có chỗ soi
 * bằng mắt: các đường chéo được vẽ đối xứng qua tâm (giản lược cho cỡ 20×15px)
 * chứ không lệch theo đúng phép huy hiệu.
 */
export const Default: Story = {
  args: {},
};
