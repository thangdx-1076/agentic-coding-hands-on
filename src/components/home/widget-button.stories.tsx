import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { WidgetButton } from "./widget-button";
import { defaultHomeCopy } from "./home-copy";

const meta = {
  component: WidgetButton,
  args: {
    kudosLabel: defaultHomeCopy.widget.kudosItem,
    awardsLabel: defaultHomeCopy.widget.awardsItem,
    buttonLabel: defaultHomeCopy.widget.label,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: "relative",
          minHeight: "220px",
          background: "#00101A",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WidgetButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Nút widget "hành động nhanh" ở trạng thái đóng, cố định góc dưới bên phải
 * (mm:5022:15169).
 */
export const Default: Story = {};

/**
 * Trạng thái menu đang mở — mở bằng `play` (click thật) chứ không bằng prop,
 * theo đúng pattern của `language-selector.stories.tsx` `Open` story: `open`
 * là state nội bộ của `useMenuKeyboardNav`, không nhận qua props.
 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    await expect(canvas.getByRole("menu")).toBeInTheDocument();
  },
};
